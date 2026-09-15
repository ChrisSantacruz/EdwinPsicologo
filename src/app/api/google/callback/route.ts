import { redirect } from "next/navigation";
import { saveGoogleTokens } from "@/lib/calendar";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    redirect("/admin/ajustes?google=error");
  }

  try {
    await saveGoogleTokens(code);
    redirect("/admin/ajustes?google=connected");
  } catch (err) {
    console.error(err);
    redirect("/admin/ajustes?google=error");
  }
}
