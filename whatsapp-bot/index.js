/**
 * Bot WhatsApp (Baileys) + sesión en MongoDB Atlas
 * Pensado para Render free: el disco se borra, Atlas no.
 */
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
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
        console.log("\n======= ESCANEA ESTE QR (WhatsApp → Dispositivos vinculados) =======\n");
        console.log("QR string (backup):", qr);
        qrcode.generate(qr, { small: true });
        console.log("\n===================================================================\n");
      }

      if (connection === "open") {
        reconnectAttempts = 0;
        isConnecting = false;
        console.log("✅ WhatsApp conectado. Sesión persistida en MongoDB Atlas.");
        try {
          await sock.sendPresenceUpdate("available");
        } catch {
          // ignore
        }
      }

      if (connection === "close") {
        isConnecting = false;
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
          try {
            await clearMongoAuthState(SESSION_ID);
          } catch (err) {
            console.error("No se pudo limpiar auth:", err.message);
          }
          reconnectAttempts = 0;
          // Un nuevo start pedirá QR limpio
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
          if (!jid || jid.endsWith("@g.us")) continue; // ignora grupos en demo

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
      whatsapp: sock?.user ? "connected" : "starting_or_waiting_qr",
      sessionId: SESSION_ID,
    });
  });

  app.get("/health", (_req, res) => {
    res.status(200).send("ok");
  });

  app.listen(PORT, () => {
    console.log(`🌐 HTTP listo en puerto ${PORT} (Render healthcheck)`);
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
