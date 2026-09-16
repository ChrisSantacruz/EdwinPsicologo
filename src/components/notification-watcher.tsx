"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "edwin_notif_cursor";
const POLL_MS = 8_000;

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

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
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

        if (!ready.current) {
          for (const item of data.items) knownIds.current.add(item.id);
          ready.current = true;
          return;
        }

        const fresh = data.items.filter((item) => !knownIds.current.has(item.id));
        for (const item of fresh) {
          knownIds.current.add(item.id);
          if (canNotify() && Notification.permission === "granted") {
            try {
              const n = new Notification(item.title, {
                body: item.body,
                tag: item.id,
                icon: "/icons/icon.svg",
                requireInteraction: true,
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
            } catch {
              // iOS a veces bloquea si no es PWA
            }
          }
        }

        if (fresh.length > 0) {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate?.(40);
            } catch {
              // ignore
            }
          }
          router.refresh();
        }
      } catch {
        // silencioso
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

  if (permission === "granted") return null;

  const iosHint = isIos() && !isStandalone();

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-burgundy/15 bg-gradient-to-r from-burgundy/[0.07] to-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Alertas en tu iPhone</p>
          <p className="text-xs leading-relaxed text-muted">
            {iosHint
              ? "En Safari: Compartir → Agregar a pantalla de inicio. Luego abre la app y activa las alertas."
              : "Actívalas para que salte un aviso cuando un paciente confirme."}
          </p>
        </div>
        {canNotify() ? (
          <button
            type="button"
            onClick={() => void enable()}
            className="ios-btn ios-btn-primary shrink-0 text-sm"
          >
            Activar alertas
          </button>
        ) : null}
      </div>
    </div>
  );
}
