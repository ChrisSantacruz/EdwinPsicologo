# Bot WhatsApp (Baileys) — solo envío

Sesión en MongoDB Atlas. Login con **código de emparejamiento** (sin QR). No sincroniza historial ni auto-responde.

## Variables (Render)

| Variable | Ejemplo |
|----------|---------|
| `MONGO_URI` | `mongodb+srv://…/edwin_whatsapp` |
| `BOT_SECRET` | mismo que `WHATSAPP_BOT_SECRET` en Vercel |
| `WA_PAIRING_PHONE` | `573005116999` (país + número, solo dígitos) |
| `WA_SESSION_ID` | `default` |

## Vincular

1. Deploy → abre el panel **Admin → WhatsApp**
2. En el celular: Dispositivos vinculados → Vincular → **Vincular con número**
3. Escribe el código de 8 dígitos del panel

## Notas

- Render free se duerme; al despertar reconecta con sesión Mongo (sin pedir código de nuevo si la sesión sigue válida).
- Si WhatsApp cierra el vínculo en el celular, toca “Pedir código nuevo” en el panel.
