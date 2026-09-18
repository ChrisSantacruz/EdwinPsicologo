/**
 * Bot WhatsApp (Baileys) — solo envío desde el panel.
 * Login: código de emparejamiento (sin QR).
 * Sin historial / sin auto-respuestas.
 */
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");

const mongoAuth = require("./mongoAuth");
const { useMongoAuthState, clearMongoAuthState } = mongoAuth;

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
/** Número a vincular, solo dígitos con país. Ej: 573005116999 */
const PAIRING_PHONE = (process.env.WA_PAIRING_PHONE || "573005116999").replace(/\D/g, "");
const BOT_BUILD = "2026-09-18-paircode-edwin-v4";

const logger = pino({ level: process.env.LOG_LEVEL || "error" });
const baileysLogger = logger.child({ module: "baileys" });

if (!MONGO_URI) {
  console.error("❌ Falta MONGO_URI");
  process.exit(1);
}

let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 12;
let isConnecting = false;
let shuttingDown = false;
let reconnectTimer = null;

let waStatus = "starting";
let sendReady = false;
let sendReadyTimer = null;
let pairingCode = null;
let pairingRequested = false;

const recentMessages = new Map();
const MAX_RECENT = 80;
const SEND_READY_MS = 2_000;
const SEND_WAIT_MS = 12_000;

async function rememberMessage(id, message, remoteJid) {
  if (!id || !message) return;
  recentMessages.set(id, message);
  if (remoteJid) recentMessages.set(`${remoteJid}::${id}`, message);
  while (recentMessages.size > MAX_RECENT * 2) {
    recentMessages.delete(recentMessages.keys().next().value);
  }
  await rememberSentMessage(SESSION_ID, id, message, remoteJid);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
  console.log(`✅ Listo para enviar (${reason}) · ${BOT_BUILD}`);
}

function scheduleSendReadyFallback() {
  clearSendReadyTimer();
  sendReadyTimer = setTimeout(() => {
    sendReadyTimer = null;
    if (sock?.user && waStatus === "connected") markSendReady("fallback");
  }, SEND_READY_MS);
}

function scheduleReconnect(delayMs) {
  clearReconnectTimer();
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!shuttingDown) void startWhatsApp();
  }, delayMs);
}

async function waitUntilSendReady(timeoutMs = SEND_WAIT_MS) {
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

async function requestPairingIfNeeded() {
  if (!sock || pairingRequested || sock.authState?.creds?.registered) return;
  if (!PAIRING_PHONE) {
    console.error("❌ Falta WA_PAIRING_PHONE (ej. 573005116999)");
    waStatus = "error";
    return;
  }
  pairingRequested = true;
  try {
    const code = await sock.requestPairingCode(PAIRING_PHONE);
    pairingCode = String(code || "").replace(/[^0-9A-Z]/gi, "");
    waStatus = "waiting_pairing";
    console.log(`\n======= CÓDIGO DE VÍNCULO =======\n${pairingCode}\nWhatsApp → Dispositivos vinculados → Vincular con número\n`);
  } catch (err) {
    pairingRequested = false;
    console.error("requestPairingCode:", err.message);
    waStatus = "error";
  }
}

async function connectMongo() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15_000 });
  console.log("✅ MongoDB conectado");
}

async function startWhatsApp() {
  if (isConnecting || shuttingDown) return;
  isConnecting = true;
  waStatus = "connecting";
  pairingCode = null;
  pairingRequested = false;
  clearReconnectTimer();

  try {
    await endSocketQuietly();

    const { state, saveCreds } = await useMongoAuthState(SESSION_ID);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      logger: baileysLogger,
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      // No traer historial al reconectar
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      // Menos queries de arranque (contactos, blocklist, etc.)
      fireInitQueries: false,
      generateHighQualityLinkPreview: false,
      keepAliveIntervalMs: 30_000,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      getMessage: async (key) => {
        if (!key?.id) return undefined;
        const byJid = key.remoteJid
          ? recentMessages.get(`${key.remoteJid}::${key.id}`)
          : undefined;
        if (byJid) return byJid;
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
        console.error("saveCreds:", err.message);
      }
    });

    // Solo eco de lo que ENVIAMOS (reintento del celular). Ignora chats entrantes.
    sock.ev.on("messages.upsert", ({ messages, type }) => {
      if (type === "append") return; // historial/offline — no procesar
      for (const msg of messages) {
        if (msg?.key?.fromMe && msg.key.id && msg.message) {
          void rememberMessage(msg.key.id, msg.message, msg.key.remoteJid);
        }
      }
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr, receivedPendingNotifications } = update;

      // El evento `qr` también dispara en modo código — ahí pedimos el pairing code
      if (qr && !sock?.authState?.creds?.registered) {
        waStatus = "waiting_pairing";
        markSendNotReady();
        void requestPairingIfNeeded();
      }

      if (connection === "open") {
        reconnectAttempts = 0;
        isConnecting = false;
        pairingCode = null;
        pairingRequested = false;
        waStatus = "connected";
        markSendNotReady();
        scheduleSendReadyFallback();
        console.log("✅ WhatsApp conectado ·", BOT_BUILD);
      }

      if (receivedPendingNotifications && sock?.user && waStatus === "connected") {
        markSendReady("pending_notifications");
      }

      if (connection === "close") {
        isConnecting = false;
        waStatus = "disconnected";
        markSendNotReady();
        pairingCode = null;
        pairingRequested = false;

        const statusCode =
          lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output?.statusCode
            : lastDisconnect?.error?.output?.statusCode;

        const loggedOut =
          statusCode === DisconnectReason.loggedOut ||
          statusCode === DisconnectReason.forbidden;

        console.warn(`⚠️ Cerrado code=${statusCode} loggedOut=${loggedOut}`);
        await endSocketQuietly();

        if (loggedOut) {
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
        if (reconnectAttempts >= MAX_RECONNECT) {
          console.error("❌ Máximo de reintentos");
          return;
        }
        reconnectAttempts += 1;
        const delay = Math.min(1000 * 1.6 ** reconnectAttempts, 45_000);
        console.log(`🔄 Reconexion en ${Math.round(delay)}ms`);
        scheduleReconnect(delay);
      }
    });
  } catch (err) {
    isConnecting = false;
    waStatus = "error";
    markSendNotReady();
    console.error("❌ startWhatsApp:", err);
    await endSocketQuietly();
    if (!shuttingDown && reconnectAttempts < MAX_RECONNECT) {
      reconnectAttempts += 1;
      scheduleReconnect(Math.min(3000 * reconnectAttempts, 30_000));
    }
  }
}

function publicStatus() {
  return {
    ok: true,
    service: "edwin-whatsapp-bot",
    build: BOT_BUILD,
    autoReply: false,
    allowBotSend: true,
    whatsapp: waStatus,
    connected: Boolean(sock?.user),
    sendReady: Boolean(sock?.user && sendReady),
    sessionId: SESSION_ID,
    pairingPhone: PAIRING_PHONE ? `…${PAIRING_PHONE.slice(-4)}` : null,
    pairingCode: sock?.user ? null : pairingCode,
    hasPendingPairing: Boolean(pairingCode) && !sock?.user,
    // compat panel viejo
    hasPendingQr: false,
  };
}

async function main() {
  const app = express();
  app.use(express.json());

  app.get("/", (_req, res) => res.json(publicStatus()));
  app.get("/health", (_req, res) =>
    res.json({ ok: true, build: BOT_BUILD, autoReply: false }),
  );

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
      pairingCode = null;
      pairingRequested = false;
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

      await clearMongoAuthState(SESSION_ID).catch(() => {});
      reconnectAttempts = 0;
      isConnecting = false;
      waStatus = "waiting_pairing";
      scheduleReconnect(1500);

      return res.json({
        ok: true,
        message: "Sesión limpia. En unos segundos verás un código nuevo.",
      });
    } catch (err) {
      console.error("/logout:", err.message);
      sock = null;
      isConnecting = false;
      waStatus = "waiting_pairing";
      await clearMongoAuthState(SESSION_ID).catch(() => {});
      scheduleReconnect(2000);
      return res.json({
        ok: true,
        message: "Sesión reiniciada. Espera el código nuevo.",
      });
    }
  });

  app.post("/send", async (req, res) => {
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

    if (!sock?.user || waStatus !== "connected" || !sendReady) {
      const ready = await waitUntilSendReady(SEND_WAIT_MS);
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
      try {
        const checked = await sock.onWhatsApp(digits);
        if (checked?.[0]?.exists && checked[0].jid) jid = checked[0].jid;
      } catch {
        // ignore
      }

      try {
        if (typeof sock.assertSessions === "function") {
          await sock.assertSessions([jid], true);
        }
      } catch {
        // ignore
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
          console.error(`send intento ${attempt}:`, err.message);
          if (attempt < 3) await sleep(1000 * attempt);
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
      await rememberMessage(mid, sent?.message ?? { conversation: text }, jid);
      await sleep(600);
      console.log(`📤 ${jid} id=${mid}`);
      return res.json({ ok: true, messageId: mid ?? "sent", to: jid });
    } catch (err) {
      console.error("/send:", err.message);
      return res.status(500).json({
        ok: false,
        error: err.message || "send_failed",
        hint: "Usa Abrir WhatsApp en el panel.",
      });
    }
  });

  app.listen(PORT, () => {
    console.log(`🌐 Puerto ${PORT} · ${BOT_BUILD}`);
    if (!PAIRING_PHONE) console.warn("⚠️ Configura WA_PAIRING_PHONE=573005116999 en Render");
  });

  await connectMongo();
  await startWhatsApp();
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
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
