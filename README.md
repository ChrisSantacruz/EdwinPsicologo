# Edwin Citas — Sistema de confirmación

Panel web para **Edwin Mideros Meza** + portal del paciente, con look de su flyer (burgundy, sello, consultorio).

## Arranque

```bash
npm install
npm run db:setup
npm run dev
```

- App: http://localhost:3000  
- Login: `edwin@mideros.ps` / `edwin2026`  
- Manual: http://localhost:3000/manual  

## Incluye

- Crear / editar / reprogramar / cancelar citas  
- WhatsApp: Cloud API (Meta) + fallback wa.me  
- Efectivo / Nequi + alertas en panel  
- Contactos + CSV + historial  
- Sedes y servicios  
- Export CSV  
- Zona horaria Bogotá  
- PWA + manual  
- Google Calendar (recordatorios de Edwin)  

## WhatsApp — recomendación

Usa **WhatsApp Cloud API** (oficial). No Evolution/Baileys en deploy serverless: necesitan VPS, QR y se banean.

Variables: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, opcional `WHATSAPP_TEMPLATE_NAME`.

## Pendiente (infra)

- Secretos de producción, `APP_URL`, Postgres, OAuth Calendar, deploy  
