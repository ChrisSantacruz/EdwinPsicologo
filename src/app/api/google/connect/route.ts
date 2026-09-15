import { redirect } from "next/navigation";
import { getGoogleAuthUrl } from "@/lib/calendar";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const url = getGoogleAuthUrl();
  if (!url) redirect("/admin/ajustes");
  redirect(url);
}
