/**
 * Bot WhatsApp (Baileys) + sesión en MongoDB Atlas
 * Solo envía desde el panel (/send). Sin auto-respuestas.
 */
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const pino = require("pino");
const QRCode = require("qrcode");
const qrcodeTerminal = require("qrcode-terminal");
const { Boom } = require("@hapi/boom");
const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");

const mongoAuth = require("./mongoAuth");
const { useMongoAuthState, clearMongoAuthState } = mongoAuth;

// Opcionales (si Render tiene mongoAuth viejo, no tumbar el proceso)
const rememberSentMessage =
  typeof mongoAuth.rememberSentMessage === "function"
    ? mongoAuth.rememberSentMessage
    : async () => {};
const loadSentMessage =
  typeof mongoAuth.loadSentMessage === "function"
    ? mongoAuth.loadSentMessage
    : async () => undefined;

const MONGO_URI = process.env.MONGO_URI;
const PORT = Number(process.env.PORT || 3001);
const SESSION_ID = process.env.WA_SESSION_ID || "default";
const BOT_BUILD = "2026-09-17-send-ready-v11";

const logger = pino({ level: process.env.LOG_LEVEL || "error" });
const baileysLogger = logger.child({ module: "baileys" });

if (!MONGO_URI) {
  console.error("❌ Falta MONGO_URI en .env");
  process.exit(1);
}

let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 15;
let isConnecting = false;
let shuttingDown = false;
let reconnectTimer = null;
let connectedAt = 0;
/** Tras open, esperar pending notifications (o este tope) antes de enviar. */
const SEND_READY_FALLBACK_MS = 2_500;
/** Cuánto puede esperar /send a que la sesión quede lista (Vercel ~60s max). */
const SEND_WAIT_READY_MS = 12_000;

let latestQr = null;
let latestQrAt = null;
let waStatus = "starting";
/** true cuando open + (pending notifications o fallback). */
let sendReady = false;
let sendReadyTimer = null;

const recentMessages = new Map();
const MAX_RECENT = 200;

function rememberMessage(id, message, remoteJid) {
  if (!id || !message) return;
  recentMessages.set(id, message);
  if (recentMessages.size > MAX_RECENT) {
    const first = recentMessages.keys().next().value;
    recentMessages.delete(first);
  }
  void rememberSentMessage(SESSION_ID, id, message, remoteJid);
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function clearSendReadyTimer() {
  if (sendReadyTimer) {
    clearTimeout(sendReadyTimer);
    sendReadyTimer = null;
  }
}

function markSendNotReady() {
  sendReady = false;
  clearSendReadyTimer();
}

function markSendReady(reason) {
  if (sendReady) return;
  sendReady = true;
  clearSendReadyTimer();
  console.log(`✅ Listo para enviar (${reason}). Build`, BOT_BUILD);
}

function scheduleSendReadyFallback() {
  clearSendReadyTimer();
  sendReadyTimer = setTimeout(() => {
    sendReadyTimer = null;
    if (sock?.user && waStatus === "connected") {
      markSendReady("fallback");
    }
  }, SEND_READY_FALLBACK_MS);
}

function scheduleReconnect(delayMs) {
  clearReconnectTimer();
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!shuttingDown) startWhatsApp();
  }, delayMs);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilSendReady(timeoutMs = SEND_WAIT_READY_MS) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (shuttingDown) return false;
    if (sock?.user && waStatus === "connected" && sendReady) return true;
    await sleep(400);
  }
  return Boolean(sock?.user && waStatus === "connected" && sendReady);
}

async function endSocketQuietly() {
  const prev = sock;
  sock = null;
  markSendNotReady();
  connectedAt = 0;
  if (!prev) return;
  try {
    prev.ev?.removeAllListeners?.();
  } catch {
    // ignore
  }
  try {
    prev.end?.(undefined);
  } catch {
    // ignore
  }
}

async function connectMongo() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15_000,
  });
  console.log("✅ MongoDB Atlas conectado");
}

async function startWhatsApp() {
  if (isConnecting || shuttingDown) return;
  isConnecting = true;
  waStatus = "connecting";
  clearReconnectTimer();

  try {
    await endSocketQuietly();

    const { state, saveCreds } = await useMongoAuthState(SESSION_ID);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📦 Baileys WA v${version.join(".")} (latest: ${isLatest})`);

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      logger: baileysLogger,
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      // props/blocklist ayudan a estabilizar la sesión tras el QR
      fireInitQueries: true,
      shouldSyncHistoryMessage: () => false,
      generateHighQualityLinkPreview: false,
      keepAliveIntervalMs: 25_000,
      connectTimeoutMs: 90_000,
      defaultQueryTimeoutMs: 90_000,
      retryRequestDelayMs: 750,
      maxMsgRetryCount: 5,
      getMessage: async (key) => {
        if (!key?.id) return undefined;
        const cached = recentMessages.get(key.id);
        if (cached) return cached;
        try {
          return await loadSentMessage(SESSION_ID, key.id);
        } catch {
          return undefined;
        }
      },
    });

    sock.ev.on("creds.update", async () => {
      try {
        await saveCreds();
      } catch (err) {
        console.error("❌ Error guardando creds:", err.message);
      }
    });

    sock.ev.on("messages.upsert", ({ messages }) => {
      for (const msg of messages) {
        if (msg?.key?.fromMe && msg.key.id && msg.message) {
          rememberMessage(msg.key.id, msg.message, msg.key.remoteJid);
        }
      }
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr, receivedPendingNotifications } =
        update;

      if (qr) {
        latestQr = qr;
        latestQrAt = new Date();
        waStatus = "waiting_qr";
        markSendNotReady();
        console.log("\n======= ESCANEA EL QR =======");
        console.log("Abre /qr en el navegador\n");
        try {
          qrcodeTerminal.generate(qr, { small: true });
        } catch {
          // ignore
        }
      }

      if (connection === "open") {
        reconnectAttempts = 0;
        isConnecting = false;
        latestQr = null;
        connectedAt = Date.now();
        waStatus = "connected";
        markSendNotReady();
        scheduleSendReadyFallback();
        console.log("✅ WhatsApp conectado. Build", BOT_BUILD);
        try {
          await sock.sendPresenceUpdate("available");
        } catch {
          // ignore
        }
      }

      // Sesión usable para enviar (Baileys ya procesó notificaciones iniciales)
      if (receivedPendingNotifications && sock?.user && waStatus === "connected") {
        markSendReady("pending_notifications");
      }

      if (connection === "close") {
        isConnecting = false;
        waStatus = "disconnected";
        markSendNotReady();
        connectedAt = 0;

        const statusCode =
          lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output?.statusCode
            : lastDisconnect?.error?.output?.statusCode;

        const loggedOut =
          statusCode === DisconnectReason.loggedOut ||
          statusCode === DisconnectReason.forbidden;

        console.warn(`⚠️ Conexión cerrada. code=${statusCode} loggedOut=${loggedOut}`);
        await endSocketQuietly();

        if (loggedOut) {
          latestQr = null;
          try {
            await clearMongoAuthState(SESSION_ID);
          } catch (err) {
            console.error("clearMongoAuthState:", err.message);
          }
          reconnectAttempts = 0;
          scheduleReconnect(2000);
          return;
        }

        if (shuttingDown) return;

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error("❌ Máximo de reintentos alcanzado.");
          return;
        }

        reconnectAttempts += 1;
        const delay = Math.min(1000 * 1.6 ** reconnectAttempts, 60_000);
        console.log(`🔄 Reconectando en ${Math.round(delay)}ms…`);
        scheduleReconnect(delay);
      }
    });
  } catch (err) {
    isConnecting = false;
    waStatus = "error";
    markSendNotReady();
    console.error("❌ Error iniciando WhatsApp:", err);
    await endSocketQuietly();
    if (!shuttingDown && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts += 1;
      scheduleReconnect(Math.min(3000 * reconnectAttempts, 30_000));
    }
  }
}

async function main() {
  const app = express();
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      ok: true,
      service: "edwin-whatsapp-bot",
      build: BOT_BUILD,
      autoReply: false,
      allowBotSend: true,
      whatsapp: waStatus,
      connected: Boolean(sock?.user),
      sendReady: Boolean(sock?.user && sendReady),
      sessionId: SESSION_ID,
      qrPage: "/qr",
      hasPendingQr: Boolean(latestQr),
    });
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true, build: BOT_BUILD, autoReply: false });
  });

  app.post("/logout", async (req, res) => {
    const expected = process.env.BOT_SECRET?.trim();
    if (!expected) {
      return res.status(503).json({ ok: false, error: "BOT_SECRET no configurado" });
    }
    const provided =
      req.headers["x-bot-secret"] ||
      req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
      req.body?.secret;
    if (provided !== expected) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    try {
      latestQr = null;
      latestQrAt = null;
      waStatus = "logging_out";
      markSendNotReady();
      clearReconnectTimer();

      if (sock) {
        try {
          await Promise.race([
            sock.logout(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("logout_timeout")), 8_000),
            ),
          ]);
        } catch {
          try {
            sock.end?.(undefined);
          } catch {
            // ignore
          }
        }
        sock = null;
      }

      try {
        await clearMongoAuthState(SESSION_ID);
      } catch (err) {
        console.error("clearMongoAuthState:", err.message);
      }

      reconnectAttempts = 0;
      isConnecting = false;
      waStatus = "waiting_qr";
      scheduleReconnect(1500);

      return res.json({
        ok: true,
        message: "Sesión limpiada. En unos segundos aparecerá un QR nuevo.",
      });
    } catch (err) {
      console.error("/logout:", err.message);
      sock = null;
      isConnecting = false;
      waStatus = "waiting_qr";
      await clearMongoAuthState(SESSION_ID).catch(() => {});
      scheduleReconnect(2000);
      return res.json({
        ok: true,
        message: "Sesión reiniciada. Espera el QR nuevo.",
      });
    }
  });

  app.get("/qr.png", async (_req, res) => {
    if (sock?.user) return res.status(404).send("already_connected");
    if (!latestQr) return res.status(404).send("waiting");
    try {
      const png = await QRCode.toBuffer(latestQr, {
        type: "png",
        width: 400,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      res.set("Cache-Control", "no-store");
      return res.type("png").send(png);
    } catch (err) {
      console.error("qr.png:", err.message);
      return res.status(500).send("error");
    }
  });

  app.post("/send", async (req, res) => {
    const expected = process.env.BOT_SECRET?.trim();
    if (!expected) {
      return res.status(503).json({ ok: false, error: "BOT_SECRET no configurado en Render" });
    }

    const provided =
      req.headers["x-bot-secret"] ||
      req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
      req.body?.secret;

    if (provided !== expected) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    // Tras QR / hibernate: esperar a que la sesión esté lista en vez de fallar al toque
    if (!sock?.user || waStatus !== "connected" || !sendReady) {
      const ready = await waitUntilSendReady(SEND_WAIT_READY_MS);
      if (!ready || !sock?.user || waStatus !== "connected") {
        return res.status(503).json({
          ok: false,
          error: "whatsapp_not_connected",
          status: waStatus,
          sendReady,
        });
      }
    }

    const toRaw = String(req.body?.to ?? "").trim();
    const text = String(req.body?.text ?? "").trim();
    if (!toRaw || !text) {
      return res.status(400).json({ ok: false, error: "Faltan to o text" });
    }

    let digits = toRaw.replace(/\D/g, "");
    if (digits.length === 10) digits = `57${digits}`;
    let jid = `${digits}@s.whatsapp.net`;

    try {
      let checked;
      try {
        checked = await sock.onWhatsApp(digits);
      } catch (err) {
        console.error("onWhatsApp:", err.message);
      }
      if (checked?.[0]?.exists && checked[0].jid) {
        jid = checked[0].jid;
      }

      let sent;
      let lastErr;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          sent = await sock.sendMessage(jid, { text, linkPreview: null });
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          console.error(`Error /send intento ${attempt}:`, err.message);
          if (attempt < 3) await sleep(1200 * attempt);
        }
      }

      if (!sent) {
        return res.status(500).json({
          ok: false,
          error: lastErr?.message || "send_failed",
          hint: "Usa Abrir WhatsApp en el panel.",
        });
      }

      const mid = sent?.key?.id;
      rememberMessage(mid, sent?.message ?? { conversation: text }, jid);
      console.log(`📤 Enviado a ${jid} id=${mid}`);
      return res.json({ ok: true, messageId: mid ?? "sent", to: jid });
    } catch (err) {
      console.error("Error /send:", err.message);
      return res.status(500).json({
        ok: false,
        error: err.message || "send_failed",
        hint: "Usa Abrir WhatsApp en el panel.",
      });
    }
  });

  app.get("/qr", async (_req, res) => {
    if (sock?.user) {
      return res
        .status(200)
        .type("html")
        .send(`<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>WhatsApp conectado</title>
<style>body{font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px;text-align:center}.ok{color:#1f7a4c;font-weight:700}</style></head>
<body><h1 class="ok">✅ WhatsApp conectado</h1><p>Build ${BOT_BUILD}</p></body></html>`);
    }

    if (!latestQr) {
      return res
        .status(200)
        .type("html")
        .send(`<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta http-equiv="refresh" content="3"/><title>Esperando QR</title>
<style>body{font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px;text-align:center;color:#333}</style></head>
<body><h1>Esperando QR…</h1><p>Estado: <strong>${waStatus}</strong></p></body></html>`);
    }

    try {
      const dataUrl = await QRCode.toDataURL(latestQr, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      return res
        .status(200)
        .type("html")
        .send(`<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta http-equiv="refresh" content="15"/><title>Escanear WhatsApp</title>
<style>body{font-family:system-ui;max-width:420px;margin:32px auto;padding:0 16px;text-align:center}img{width:100%;max-width:360px;border-radius:16px;border:1px solid #ddd}</style></head>
<body><h1>Escanea este QR</h1><p>WhatsApp → Dispositivos vinculados</p><img src="${dataUrl}" alt="QR"/></body></html>`);
    } catch (err) {
      console.error("QR html:", err.message);
      return res.status(500).send("No se pudo generar el QR");
    }
  });

  app.listen(PORT, () => {
    console.log(`🌐 HTTP listo en puerto ${PORT}`);
    console.log(`🏷  Build ${BOT_BUILD}`);
  });

  try {
    await connectMongo();
  } catch (err) {
    console.error("❌ MongoDB:", err.message);
    process.exit(1);
  }

  await startWhatsApp();
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("Apagando…");
  clearReconnectTimer();
  try {
    sock?.end?.(undefined);
  } catch {
    // ignore
  }
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});

main();
