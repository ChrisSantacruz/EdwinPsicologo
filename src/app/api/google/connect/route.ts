import { redirect } from "next/navigation";
import { getGoogleAuthUrl } from "@/lib/calendar";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  // Abre Google ya sugiriendo el correo del consultorio (psicatriz@gmail.com)
  const url = getGoogleAuthUrl(auth.admin.email);
  if (!url) redirect("/admin/ajustes");
  redirect(url);
}
