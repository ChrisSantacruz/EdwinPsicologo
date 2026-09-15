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

function fixFileName(file) {
  return String(file).replace(/\//g, "__").replace(/:/g, "-");
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
              data[id] = value;
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

module.exports = {
  useMongoAuthState,
  clearMongoAuthState,
  WhatsAppAuth,
};
