import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { NotificationWatcher } from "@/components/notification-watcher";
import { prisma } from "@/lib/db";
import { notificationsEnabled } from "@/lib/notifications-flag";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const notifsOn = notificationsEnabled();
  const unread = notifsOn
    ? await prisma.notification.count({ where: { read: false } })
    : 0;

  return (
    <div className="min-h-full">
      <AdminNav name={auth.admin.name} unread={unread} />
      {notifsOn ? <NotificationWatcher /> : null}
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
