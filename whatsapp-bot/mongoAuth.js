/**
 * Adaptador de autenticación Baileys → MongoDB Atlas
 * Equivalente a useMultiFileAuthState, pero persistiendo en la colección WhatsAppAuth.
 */
const mongoose = require("mongoose");
const {
  initAuthCreds,
  BufferJSON,
  proto,
} = require("@whiskeysockets/baileys");

const WhatsAppAuthSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    data: { type: String, required: true },
  },
  {
    collection: "WhatsAppAuth",
    versionKey: false,
  },
);

const WhatsAppAuth =
  mongoose.models.WhatsAppAuth ||
  mongoose.model("WhatsAppAuth", WhatsAppAuthSchema);

/** Mensajes propios para getMessage (reintentos de cifrado tras hibernate). */
const WhatsAppSentMessageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    sessionId: { type: String, required: true, index: true },
    remoteJid: { type: String },
    data: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 48 },
  },
  {
    collection: "WhatsAppSentMessages",
    versionKey: false,
  },
);

const WhatsAppSentMessage =
  mongoose.models.WhatsAppSentMessage ||
  mongoose.model("WhatsAppSentMessage", WhatsAppSentMessageSchema);

/** Lease: una sola instancia del bot puede reconectar la misma sesión. */
const WhatsAppLeaseSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    ownerId: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "WhatsAppLeases",
    versionKey: false,
  },
);

const WhatsAppLease =
  mongoose.models.WhatsAppLease ||
  mongoose.model("WhatsAppLease", WhatsAppLeaseSchema);

function fixFileName(file) {
  return String(file).replace(/\//g, "__").replace(/:/g, "-");
}

const LEASE_TTL_MS = 45_000;

async function acquireSessionLease(sessionId, ownerId) {
  const _id = `lease:${sessionId}`;
  const now = new Date();
  const staleBefore = new Date(now.getTime() - LEASE_TTL_MS);

  // 1) Renovar / reclamar si es nuestro o está vencido
  const claimed = await WhatsAppLease.findOneAndUpdate(
    {
      _id,
      $or: [{ ownerId }, { updatedAt: { $lte: staleBefore } }],
    },
    { $set: { ownerId, updatedAt: now } },
    { new: true },
  );
  if (claimed?.ownerId === ownerId) return true;

  // 2) Crear si no existe
  try {
    await WhatsAppLease.create({ _id, ownerId, updatedAt: now });
    return true;
  } catch {
    // 3) Carrera: otro lo creó; solo ganamos si ya venció
    const existing = await WhatsAppLease.findById(_id).lean();
    if (!existing) return false;
    if (existing.ownerId === ownerId) {
      await WhatsAppLease.updateOne({ _id, ownerId }, { $set: { updatedAt: now } });
      return true;
    }
    if (existing.updatedAt && new Date(existing.updatedAt) <= staleBefore) {
      const stolen = await WhatsAppLease.findOneAndUpdate(
        { _id, updatedAt: existing.updatedAt },
        { $set: { ownerId, updatedAt: now } },
        { new: true },
      );
      return stolen?.ownerId === ownerId;
    }
    return false;
  }
}

async function renewSessionLease(sessionId, ownerId) {
  const _id = `lease:${sessionId}`;
  const res = await WhatsAppLease.updateOne(
    { _id, ownerId },
    { $set: { updatedAt: new Date() } },
  );
  return res.matchedCount > 0;
}

async function releaseSessionLease(sessionId, ownerId) {
  const _id = `lease:${sessionId}`;
  await WhatsAppLease.deleteOne({ _id, ownerId }).catch(() => {});
}

async function rememberSentMessage(sessionId, messageId, message, remoteJid) {
  if (!messageId || !message) return;
  const _id = `${sessionId}:${messageId}`;
  const payload = JSON.stringify(message, BufferJSON.replacer);
  await WhatsAppSentMessage.findByIdAndUpdate(
    _id,
    {
      _id,
      sessionId,
      remoteJid: remoteJid || null,
      data: payload,
      createdAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).catch(() => {});
}

async function loadSentMessage(sessionId, messageId) {
  if (!messageId) return undefined;
  try {
    const doc = await WhatsAppSentMessage.findById(
      `${sessionId}:${messageId}`,
    ).lean();
    if (!doc?.data) return undefined;
    return JSON.parse(doc.data, BufferJSON.reviver);
  } catch {
    return undefined;
  }
}

/**
 * @returns {Promise<{ state: import('@whiskeysockets/baileys').AuthenticationState, saveCreds: () => Promise<void> }>}
 */
async function useMongoAuthState(sessionId = "default") {
  const prefix = `baileys:${sessionId}:`;

  const writeData = async (data, key) => {
    const _id = prefix + fixFileName(key);
    const payload = JSON.stringify(data, BufferJSON.replacer);
    await WhatsAppAuth.findByIdAndUpdate(
      _id,
      { _id, data: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  };

  const readData = async (key) => {
    try {
      const _id = prefix + fixFileName(key);
      const doc = await WhatsAppAuth.findById(_id).lean();
      if (!doc?.data) return null;
      return JSON.parse(doc.data, BufferJSON.reviver);
    } catch {
      return null;
    }
  };

  const removeData = async (key) => {
    try {
      const _id = prefix + fixFileName(key);
      await WhatsAppAuth.findByIdAndDelete(_id);
    } catch {
      // ignore
    }
  };

  const creds = (await readData("creds")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              // Igual que useMultiFileAuthState: no exponer null
              if (value) data[id] = value;
            }),
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category] || {})) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await writeData(creds, "creds");
    },
  };
}

/**
 * Borra toda la sesión (útil si cierras sesión desde el móvil y quieres un QR limpio).
 */
async function clearMongoAuthState(sessionId = "default") {
  const prefix = `baileys:${sessionId}:`;
  await WhatsAppAuth.deleteMany({ _id: { $regex: `^${prefix}` } });
}

/**
 * Limpia solo el estado de app-sync (versiones/claves) sin borrar creds/Signal.
 * Útil cuando Baileys entra en loop "failed to find key to decode patch".
 */
async function clearAppStateSyncState(sessionId = "default") {
  const prefix = `baileys:${sessionId}:`;
  await WhatsAppAuth.deleteMany({
    _id: {
      $regex: `^${prefix}app-state-sync-(key|version)-`,
    },
  });
}

module.exports = {
  useMongoAuthState,
  clearMongoAuthState,
  clearAppStateSyncState,
  WhatsAppAuth,
  WhatsAppSentMessage,
  acquireSessionLease,
  renewSessionLease,
  releaseSessionLease,
  rememberSentMessage,
  loadSentMessage,
};
