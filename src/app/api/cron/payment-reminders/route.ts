import { NextResponse } from "next/server";
import { nudgePaymentReminders } from "@/lib/payment-reminders";

/** Cada ~10 min (Vercel Pro) o cron-job.org en Hobby. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await nudgePaymentReminders();
  return NextResponse.json({ ok: true, ...result });
}
