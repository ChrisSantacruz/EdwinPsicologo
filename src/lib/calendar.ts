import "server-only";
import { google } from "googleapis";
import { prisma } from "./db";
import { getAppUrl } from "./app-url";
import { TZ } from "./time";

function getRedirectUri() {
  // Prioriza GOOGLE_REDIRECT_URI (exacta en Google Cloud) para evitar redirect_uri_mismatch
  // aunque APP_URL venga vacío en Vercel.
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return `${getAppUrl()}/api/google/callback`;
}

function oauthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = getRedirectUri();

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleRedirectUri() {
  return getRedirectUri();
}

export function getGoogleAuthUrl() {
  const client = oauthClient();
  if (!client) return null;

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  });
}

export async function saveGoogleTokens(code: string) {
  const client = oauthClient();
  if (!client) throw new Error("Google OAuth no configurado");

  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("No se recibieron tokens de Google. Revoca acceso y vuelve a conectar.");
  }

  await prisma.googleToken.upsert({
    where: { id: "default" },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    create: {
      id: "default",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });
}

async function getAuthedClient() {
  const client = oauthClient();
  if (!client) return null;

  const stored = await prisma.googleToken.findUnique({ where: { id: "default" } });
  if (!stored) return null;

  client.setCredentials({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
    expiry_date: stored.expiryDate?.getTime(),
  });

  client.on("tokens", async (tokens) => {
    if (!tokens.access_token) return;
    await prisma.googleToken.update({
      where: { id: "default" },
      data: {
        accessToken: tokens.access_token,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
  });

  return client;
}

export async function isGoogleConnected() {
  const token = await prisma.googleToken.findUnique({ where: { id: "default" } });
  return Boolean(token?.refreshToken);
}

type CalendarAppointment = {
  id: string;
  patientName: string;
  patientPhone: string;
  scheduledAt: Date;
  price: number;
  status: string;
  serviceName: string;
  address: string;
  neighborhood: string;
  googleEventId?: string | null;
};

export async function upsertCalendarEvent(appt: CalendarAppointment) {
  const auth = await getAuthedClient();
  if (!auth) return null;

  const calendar = google.calendar({ version: "v3", auth });
  const start = new Date(appt.scheduledAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const summary =
    appt.status === "CONFIRMED"
      ? `Cita · ${appt.patientName}`
      : `Por confirmar · ${appt.patientName}`;

  const description = [
    `${appt.serviceName} con ${appt.patientName}.`,
    ``,
    `📱 ${appt.patientPhone}`,
    `📍 ${appt.address}`,
    `🏙️ ${appt.neighborhood}`,
    ``,
    `Un espacio de acompañamiento. Prepárate con calma.`,
  ].join("\n");

  const body = {
    summary,
    description,
    location: `${appt.address}, ${appt.neighborhood}`,
    start: {
      dateTime: start.toISOString(),
      timeZone: TZ,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: TZ,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "popup", minutes: 15 },
      ],
    },
  };

  if (appt.googleEventId) {
    const updated = await calendar.events.update({
      calendarId: "primary",
      eventId: appt.googleEventId,
      requestBody: body,
    });
    return updated.data.id ?? appt.googleEventId;
  }

  const created = await calendar.events.insert({
    calendarId: "primary",
    requestBody: body,
  });
  return created.data.id ?? null;
}
