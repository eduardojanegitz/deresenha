// Service worker do DeResenha: só cuida dos avisos (notificação push) do Modo Sala.
// Não guarda páginas em cache: o app continua sempre buscando a versão mais nova.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "DeResenha", body: "A partida começou!", url: "/", tag: "deresenha" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Quem já está olhando a sala ouve o alerta pela própria página: não precisa de notificação.
      const watching = windows.some((c) => c.focused && c.visibilityState === "visible" && new URL(c.url).pathname === data.url);
      if (watching) return;
      await self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.tag,
        renotify: true,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [180, 80, 180],
        data: { url: data.url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((c) => new URL(c.url).pathname === url);
      if (open) return open.focus();
      return self.clients.openWindow(url);
    })(),
  );
});
