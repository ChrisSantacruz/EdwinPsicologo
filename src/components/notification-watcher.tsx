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
  const knownIds = useRef(new Set<string>());
  const ready = useRef(false);

  useEffect(() => {
    if (!canNotify()) return;
    setPermission(Notification.permission);
  }, []);

  // Si ya hay permiso, registrar Push al dispositivo (iPhone PWA)
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
          // Fallback local solo si el panel está abierto; el Push real llega al iPhone vía SW
          if (canNotify() && Notification.permission === "granted" && !pushReady) {
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

  if (permission === "granted" && pushReady) return null;
  if (permission === "granted" && !pushReady) {
    // Ya dio permiso; reintentar registro Push
    return (
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-burgundy/15 bg-gradient-to-r from-burgundy/[0.07] to-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Casi listo · aviso en el iPhone</p>
            <p className="text-xs leading-relaxed text-muted">
              Toca otra vez para registrar las alertas en tu teléfono (aunque cierres la app).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void enable()}
            className="ios-btn ios-btn-primary shrink-0 text-sm"
          >
            Registrar en el iPhone
          </button>
        </div>
      </div>
    );
  }

  const iosHint = isIos() && !isStandalone();

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-burgundy/15 bg-gradient-to-r from-burgundy/[0.07] to-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Alertas en tu iPhone</p>
          <p className="text-xs leading-relaxed text-muted">
            {iosHint
              ? "En Safari: Compartir → Agregar a pantalla de inicio. Abre la app desde el ícono y activa las alertas. Así te llegan aunque no estés en el panel."
              : "Actívalas para que te avise en el teléfono cuando un paciente pague o falte confirmar."}
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
