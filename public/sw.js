/* Service Worker — notificaciones al dispositivo (iPhone PWA / Android) */
self.addEventListener("push", (event) => {
  let data = { title: "Edwin Citas", body: "Tienes una novedad", url: "/admin", tag: "edwin" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: { url: data.url },
      requireInteraction: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
