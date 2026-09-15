/**
 * Prueba de conexión Atlas + lectura/escritura del adaptador mongoAuth
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { useMongoAuthState, clearMongoAuthState, WhatsAppAuth } = require("../mongoAuth");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("Falta MONGO_URI");

  console.log("Conectando a Atlas…");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  console.log("✅ Conectado:", mongoose.connection.name);

  const sessionId = "probe-test";
  const { state, saveCreds } = await useMongoAuthState(sessionId);

  await saveCreds();
  const count = await WhatsAppAuth.countDocuments({
    _id: { $regex: `^baileys:${sessionId}:` },
  });
  console.log("✅ Creds escritas. Docs en WhatsAppAuth para probe-test:", count);
  console.log("   registrationId:", state.creds?.registrationId);

  await clearMongoAuthState(sessionId);
  const after = await WhatsAppAuth.countDocuments({
    _id: { $regex: `^baileys:${sessionId}:` },
  });
  console.log("✅ Limpieza OK. Docs restantes probe-test:", after);

  await mongoose.disconnect();
  console.log("✅ Prueba Mongo/auth OK");
}

main().catch(async (err) => {
  console.error("❌ Falló:", err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
