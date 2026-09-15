# Bot WhatsApp (Baileys) + MongoDB Atlas

Servicio **separado** del panel Next.js. La sesión de WhatsApp vive en Atlas (`WhatsAppAuth`), no en disco (ideal para Render free).

## 1. Local

```bash
cd whatsapp-bot
cp .env.example .env
# MONGO_URI=mongodb+srv://...
npm install
npm run test:mongo   # verifica Atlas + auth
npm start            # imprime QR en consola
```

1. WhatsApp → **Dispositivos vinculados** → escanear QR  
2. Ctrl+C → `npm start` otra vez → **sin QR**  
3. Escríbele `hola` al número → responde el bot  

Atlas → Network Access → `0.0.0.0/0`

## 2. Deploy en Render

1. Repo en GitHub (sin `.env`; solo env vars en Render)  
2. **New → Blueprint** con `render.yaml`, o Web Service manual:
   - Root Directory: `whatsapp-bot`
   - Build: `npm install`
   - Start: `npm start`
   - Health Check: `/health`
3. Environment:
   - `MONGO_URI` = tu cadena Atlas (con nombre de DB, ej. `/edwin_whatsapp`)
   - `WA_SESSION_ID=default`
   - `LOG_LEVEL=info`
4. Deploy → abre **Logs** → escanea el QR la primera vez  
5. Reinicia el servicio → debe conectar **sin QR**

URL de health: `https://TU-SERVICIO.onrender.com/health`

## 3. Notas Render free

| Situación | Qué pasa |
|-----------|----------|
| Sleep ~15 min sin tráfico | WhatsApp se desconecta |
| Alguien pega `/health` o llega request | Servicio despierta y **reconecta con sesión Mongo** |
| Cierras sesión en el celular | Se borra auth en Atlas y pide QR nuevo |

Tip: un cron externo (cron-job.org) pegando `/health` cada 10 min reduce el sleep.

## 4. Seguridad

- Nunca subas `.env` al repo  
- Si pegaste la URI en un chat, **rota el password** en Atlas → Database Access  
- Usa usuario con permisos solo a la DB del bot  

## 5. Relación con el panel de citas

El panel Next.js (`edwin-citas`) sigue separado. Más adelante se puede llamar a este bot por HTTP/cola para enviar confirmaciones. Hoy el bot demuestra sesión estable + auto-reply `hola`.
