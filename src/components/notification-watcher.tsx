"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "edwin_notif_cursor";
const POLL_MS = 20_000;

type NotifItem = {
  id: string;
  title: string;
  body: string;
  appointmentId: string | null;
  createdAt: string;
};

function canNotify() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function NotificationWatcher() {
  const router = useRouter();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const knownIds = useRef(new Set<string>());
  const ready = useRef(false);

  useEffect(() => {
    if (!canNotify()) return;
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!canNotify()) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const cursor =
          typeof window !== "undefined"
            ? localStorage.getItem(STORAGE_KEY)
            : null;
        const url = cursor
          ? `/api/notifications?after=${encodeURIComponent(cursor)}`
          : "/api/notifications";
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok || cancelled) return;

        const data = (await res.json()) as {
          unreadCount: number;
          latestAt?: string;
          items: NotifItem[];
        };

        if (data.latestAt) {
          localStorage.setItem(STORAGE_KEY, data.latestAt);
        }

        // Primera carga: solo registra IDs, no dispara alertas viejas
        if (!ready.current) {
          for (const item of data.items) knownIds.current.add(item.id);
          ready.current = true;
          return;
        }

        const fresh = data.items.filter((item) => !knownIds.current.has(item.id));
        for (const item of fresh) {
          knownIds.current.add(item.id);
          if (Notification.permission === "granted") {
            const n = new Notification(item.title, {
              body: item.body,
              tag: item.id,
              icon: "/icons/icon.svg",
            });
            n.onclick = () => {
              window.focus();
              if (item.appointmentId) {
                router.push(`/admin/citas/${item.appointmentId}`);
              } else {
                router.push("/admin");
              }
              n.close();
            };
          }
        }

        if (fresh.length > 0) {
          router.refresh();
        }
      } catch {
        // silencioso: red / sleep
      } finally {
        if (!cancelled) {
          timer = setTimeout(poll, POLL_MS);
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  async function enable() {
    if (!canNotify()) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  if (!canNotify() || permission === "granted") return null;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-burgundy/20 bg-burgundy/[0.04] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">Notificaciones del sitio</p>
          <p className="text-xs text-muted">
            Actívalas para ver alertas del navegador cuando un paciente confirme o elija Nequi.
          </p>
        </div>
        <button type="button" onClick={() => void enable()} className="ios-btn ios-btn-primary text-sm">
          Activar alertas
        </button>
      </div>
    </div>
  );
}
