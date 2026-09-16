/**
 * Bot WhatsApp (Baileys) + sesión en MongoDB Atlas
 * Pensado para Render free: el disco se borra, Atlas no.
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

const { useMongoAuthState, clearMongoAuthState } = require("./mongoAuth");

const MONGO_URI = process.env.MONGO_URI;
const PORT = Number(process.env.PORT || 3001);
const SESSION_ID = process.env.WA_SESSION_ID || "default";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

if (!MONGO_URI) {
  console.error("❌ Falta MONGO_URI en .env");
  process.exit(1);
}

let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 15;
let isConnecting = false;
let shuttingDown = false;

/** Último QR pendiente de escanear (para /qr en el navegador). */
let latestQr = null;
let latestQrAt = null;
let waStatus = "starting";

async function connectMongo() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log("✅ MongoDB Atlas conectado");
}

async function startWhatsApp() {
  if (isConnecting || shuttingDown) return;
  isConnecting = true;
  waStatus = "connecting";

  try {
    const { state, saveCreds } = await useMongoAuthState(SESSION_ID);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📦 Baileys WA v${version.join(".")} (latest: ${isLatest})`);

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      keepAliveIntervalMs: 25_000,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      getMessage: async () => undefined,
    });

    sock.ev.on("creds.update", async () => {
      try {
        await saveCreds();
      } catch (err) {
        console.error("❌ Error guardando creds en Mongo:", err.message);
      }
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        latestQr = qr;
        latestQrAt = new Date();
        waStatus = "waiting_qr";
        console.log("\n======= ESCANEA EL QR EN EL NAVEGADOR =======");
        console.log("Abre: https://TU-SERVICIO.onrender.com/qr");
        console.log("(El QR ASCII de abajo a veces no se ve en Render Logs)\n");
        try {
          qrcodeTerminal.generate(qr, { small: true });
        } catch {
          // ignore
        }
        console.log("\n============================================\n");
      }

      if (connection === "open") {
        reconnectAttempts = 0;
        isConnecting = false;
        latestQr = null;
        waStatus = "connected";
        console.log("✅ WhatsApp conectado. Sesión persistida en MongoDB Atlas.");
        try {
          await sock.sendPresenceUpdate("available");
        } catch {
          // ignore
        }
      }

      if (connection === "close") {
        isConnecting = false;
        waStatus = "disconnected";
        const statusCode =
          lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output?.statusCode
            : lastDisconnect?.error?.output?.statusCode;

        const loggedOut =
          statusCode === DisconnectReason.loggedOut ||
          statusCode === DisconnectReason.forbidden;

        console.warn(`⚠️ Conexión cerrada. code=${statusCode} loggedOut=${loggedOut}`);

        if (loggedOut) {
          console.warn(
            "🚪 Sesión cerrada desde el móvil. Limpiando auth en Atlas para forzar QR nuevo…",
          );
          latestQr = null;
          try {
            await clearMongoAuthState(SESSION_ID);
          } catch (err) {
            console.error("No se pudo limpiar auth:", err.message);
          }
          reconnectAttempts = 0;
          setTimeout(() => {
            if (!shuttingDown) startWhatsApp();
          }, 2000);
          return;
        }

        if (shuttingDown) return;

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error("❌ Máximo de reintentos alcanzado. Revisar logs / reiniciar servicio.");
          return;
        }

        reconnectAttempts += 1;
        const delay = Math.min(1000 * 1.6 ** reconnectAttempts, 60_000);
        console.log(`🔄 Reconectando en ${Math.round(delay)}ms (intento ${reconnectAttempts})…`);
        setTimeout(() => {
          if (!shuttingDown) startWhatsApp();
        }, delay);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        try {
          if (msg.key.fromMe) continue;
          const jid = msg.key.remoteJid;
          if (!jid || jid.endsWith("@g.us")) continue;

          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            "";

          const normalized = text.trim().toLowerCase();
          if (!normalized) continue;

          console.log(`📩 ${jid}: ${text}`);

          if (normalized === "hola" || normalized.startsWith("hola ")) {
            await sock.sendMessage(jid, {
              text: "¡Hola! Soy el bot de Edwin Mideros. Pronto te ayudaré con tus citas 😊",
            });
          }
        } catch (err) {
          console.error("Error en messages.upsert:", err.message);
        }
      }
    });
  } catch (err) {
    isConnecting = false;
    waStatus = "error";
    console.error("❌ Error iniciando WhatsApp:", err);
    if (!shuttingDown && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts += 1;
      const delay = Math.min(3000 * reconnectAttempts, 30_000);
      setTimeout(() => startWhatsApp(), delay);
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
      whatsapp: waStatus,
      connected: Boolean(sock?.user),
      sessionId: SESSION_ID,
      qrPage: "/qr",
      hasPendingQr: Boolean(latestQr),
    });
  });

  app.get("/health", (_req, res) => {
    res.status(200).send("ok");
  });

  /** PNG del QR para mostrar en el panel (edwinmideros.site/admin/whatsapp). */
  app.get("/qr.png", async (_req, res) => {
    if (sock?.user) {
      return res.status(404).send("already_connected");
    }
    if (!latestQr) {
      return res.status(404).send("waiting");
    }
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

  /**
   * Enviar mensaje desde el panel (Vercel).
   * Header: x-bot-secret: BOT_SECRET
   * Body: { to: "3008468223", text: "..." }
   */
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

    if (!sock?.user || waStatus !== "connected") {
      return res.status(503).json({
        ok: false,
        error: "whatsapp_not_connected",
        status: waStatus,
      });
    }

    const toRaw = String(req.body?.to ?? "").trim();
    const text = String(req.body?.text ?? "").trim();
    if (!toRaw || !text) {
      return res.status(400).json({ ok: false, error: "Faltan to o text" });
    }

    let digits = toRaw.replace(/\D/g, "");
    if (digits.length === 10) digits = `57${digits}`;
    const jid = `${digits}@s.whatsapp.net`;

    try {
      const sent = await sock.sendMessage(jid, { text });
      console.log(`📤 Enviado a ${jid}`);
      return res.json({
        ok: true,
        messageId: sent?.key?.id ?? "sent",
        to: jid,
      });
    } catch (err) {
      console.error("Error /send:", err.message);
      return res.status(500).json({ ok: false, error: err.message || "send_failed" });
    }
  });

  /** Página para escanear el QR desde el celular (Render Logs no muestran bien el ASCII). */
  app.get("/qr", async (_req, res) => {
    if (sock?.user) {
      return res
        .status(200)
        .type("html")
        .send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>WhatsApp conectado</title>
<style>body{font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px;text-align:center}
.ok{color:#1f7a4c;font-weight:700}</style></head>
<body>
  <h1 class="ok">✅ WhatsApp conectado</h1>
  <p>Sesión activa en MongoDB Atlas. Ya no hace falta escanear QR.</p>
  <p><small>Usuario: ${sock.user.id || sock.user.name || "ok"}</small></p>
</body></html>`);
    }

    if (!latestQr) {
      return res
        .status(200)
        .type("html")
        .send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="refresh" content="3"/>
<title>Esperando QR</title>
<style>body{font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px;text-align:center;color:#333}
.muted{color:#666}</style></head>
<body>
  <h1>Esperando QR…</h1>
  <p class="muted">Estado: <strong>${waStatus}</strong></p>
  <p class="muted">Esta página se actualiza sola cada 3s. Si no aparece, reinicia el servicio en Render y vuelve a abrir /qr.</p>
</body></html>`);
    }

    try {
      const dataUrl = await QRCode.toDataURL(latestQr, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      const ageSec = latestQrAt
        ? Math.round((Date.now() - latestQrAt.getTime()) / 1000)
        : 0;

      return res
        .status(200)
        .type("html")
        .send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="refresh" content="15"/>
<title>Escanear WhatsApp</title>
<style>
body{font-family:system-ui;max-width:420px;margin:32px auto;padding:0 16px;text-align:center;color:#1a1a1a}
img{width:100%;max-width:360px;height:auto;border-radius:16px;border:1px solid #ddd}
.muted{color:#666;font-size:14px;line-height:1.45}
ol{text-align:left;color:#444}
</style></head>
<body>
  <h1>Escanea este QR</h1>
  <p class="muted">WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
  <img src="${dataUrl}" alt="QR WhatsApp"/>
  <p class="muted">Generado hace ${ageSec}s · la página se refresca cada 15s (el QR caduca).</p>
  <ol>
    <li>Abre WhatsApp en el celular <strong>3008468223</strong></li>
    <li>Ajustes → Dispositivos vinculados</li>
    <li>Escanea el código de arriba</li>
  </ol>
</body></html>`);
    } catch (err) {
      console.error("Error generando QR image:", err.message);
      return res.status(500).send("No se pudo generar el QR");
    }
  });

  app.listen(PORT, () => {
    console.log(`🌐 HTTP listo en puerto ${PORT}`);
    console.log("📱 Escanea el QR en: /qr");
  });

  try {
    await connectMongo();
  } catch (err) {
    console.error("❌ No se pudo conectar a MongoDB Atlas:", err.message);
    console.error(
      "Revisa MONGO_URI y Network Access (0.0.0.0/0) en Atlas.",
    );
    process.exit(1);
  }

  await startWhatsApp();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("Apagando (SIGTERM/SIGINT)…");
  try {
    sock?.end?.(undefined);
  } catch {
    // ignore
  }
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}

process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});

main();
