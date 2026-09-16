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
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function registerPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  const keyRes = await fetch("/api/admin/push-subscribe", { credentials: "include" });
  if (!keyRes.ok) return false;
  const { publicKey } = (await keyRes.json()) as { publicKey: string | null };
  if (!publicKey) return false;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const save = await fetch("/api/admin/push-subscribe", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });
  return save.ok;
}

export function NotificationWatcher() {
  const router = useRouter();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [pushReady, setPushReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const knownIds = useRef(new Set<string>());
  const ready = useRef(false);

  useEffect(() => {
    if (!canNotify()) return;
    setPermission(Notification.permission);
    try {
      if (sessionStorage.getItem("edwin_notif_banner_dismissed") === "1") {
        setDismissed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (permission !== "granted") return;
    let cancelled = false;
    void (async () => {
      try {
        const ok = await registerPushSubscription();
        if (!cancelled) setPushReady(ok);
      } catch {
        if (!cancelled) setPushReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [permission]);

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
          if (canNotify() && Notification.permission === "granted" && !pushReady) {
            try {
              const n = new Notification(item.title, {
                body: item.body,
                tag: item.id,
                icon: "/icons/icon.png",
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
  }, [router, pushReady]);

  async function enable() {
    if (!canNotify()) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      try {
        const ok = await registerPushSubscription();
        setPushReady(ok);
      } catch {
        setPushReady(false);
      }
    }
  }

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem("edwin_notif_banner_dismissed", "1");
    } catch {
      // ignore
    }
  }

  if (dismissed) return null;
  if (permission === "granted" && pushReady) return null;

  const iosHint = isIos() && !isStandalone();
  const title =
    permission === "granted" && !pushReady
      ? "Casi listo · avisos en tu celular"
      : "Alertas en tu celular";
  const body =
    permission === "granted" && !pushReady
      ? "Toca para registrar las alertas en este dispositivo (aunque cierres la app)."
      : iosHint
        ? "En Safari: Compartir → Agregar a pantalla de inicio. Abre la app desde el ícono y activa las alertas."
        : "Actívalas para que te avise cuando un paciente pague o falte confirmar.";

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-burgundy/15 bg-gradient-to-r from-burgundy/[0.07] to-white px-4 py-3 shadow-sm">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="text-xs leading-relaxed text-muted">{body}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canNotify() ? (
            <button
              type="button"
              onClick={() => void enable()}
              className="ios-btn ios-btn-primary text-sm"
            >
              {permission === "granted" ? "Registrar alertas" : "Activar alertas"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="ios-btn ios-btn-ghost text-sm"
            aria-label="Cerrar"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
