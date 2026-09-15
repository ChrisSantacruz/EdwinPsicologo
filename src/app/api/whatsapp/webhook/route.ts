import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Webhook Meta WhatsApp Cloud API.
 * GET = verificación | POST = mensajes entrantes (abre ventana 24h).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verify = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token && verify && token === verify && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      entry?: {
        changes?: {
          value?: {
            messages?: { from: string; type: string; text?: { body: string } }[];
            contacts?: { profile?: { name?: string }; wa_id?: string }[];
          };
        }[];
      }[];
    };

    const change = body.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    const contactName = change?.contacts?.[0]?.profile?.name;

    if (message?.from) {
      const from = message.from;
      const text = message.text?.body ?? `(${message.type})`;
      await prisma.notification.create({
        data: {
          title: `WhatsApp de ${contactName ?? from}`,
          body: text.slice(0, 280),
        },
      });
    }
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
  }

  // Meta exige 200 rápido
  return NextResponse.json({ ok: true });
}
