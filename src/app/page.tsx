import { redirect } from "next/navigation";
import { getValidSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getValidSession();
  redirect(session ? "/admin" : "/admin/login");
}
