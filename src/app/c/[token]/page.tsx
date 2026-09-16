import { redirect } from "next/navigation";

/** Compatibilidad con links viejos /c/... → /cita/... */
export default async function LegacyConfirmRedirect({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/cita/${token}`);
}
