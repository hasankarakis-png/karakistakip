// Karakış Takip: cache only public app shell. Never serve HTML as a JS/CSS/JSON fallback.
const CACHE = "takip-v4-safe";
const SHELL = ["./", "./index.html", "./styles.css", "./manifest.webmanifest"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("takip-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || req.mode === "navigate" && new URL(req.url).origin !== self.location.origin) return;
  const url = new URL(req.url);
  // Never cache Supabase, APIs, authentication, cross-origin resources, or user-generated responses.
  if (url.origin !== self.location.origin || /\/functions\/|\/rest\/|\/auth\/|\/storage\//.test(url.pathname)) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(async () => (await caches.match("./index.html")) || Response.error()));
    return;
  }
  // Cache only known, static asset extensions. No HTML fallback for missing scripts.
  if (!/\.(?:js|css|png|jpg|jpeg|svg|webp|ico|webmanifest|woff2?|json)$/i.test(url.pathname)) return;
  event.respondWith(fetch(req).then(response => {
    if (response.ok && response.type === "basic") {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)));
    }
    return response;
  }).catch(async () => (await caches.match(req)) || Response.error()));
});
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data.json(); } catch (_) {}
  const url = typeof data.url === "string" && /^\.\/(#[a-z]+)?$/.test(data.url) ? data.url : "./";
  event.waitUntil(self.registration.showNotification(data.title || "Karakış Takip", {
    body: data.body || "", icon: "icon-192.png", badge: "icon-192.png",
    tag: data.tag || undefined, data: { url }
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    for (const client of windows) {
      if ("focus" in client) {
        try { client.postMessage({ go: url }); } catch (_) {}
        return client.focus();
      }
    }
    return clients.openWindow(url);
  }));
});
