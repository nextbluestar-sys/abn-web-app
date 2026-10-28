const CACHE_NAME = "abn-shell-v4-20261028-1";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20261025-9",
  "./app.js?v=20261025-9",
  "./portals.js?v=20261025-9",
  "./config.js",
  "./marketplace-plus.js?v=20261025-9",
  "./marketplace-plus.css?v=20261025-9",
  "./public-site.js?v=20261025-9",
  "./manifest.webmanifest",
  "./mobile-role.js",
  "./assets/abn-logo.svg"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).catch(error => {
    // Do not block installation if a third-party asset or a newly added file is temporarily unavailable.
    console.warn("ABN shell cache incomplete; network loading will still work.", error);
  }));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("abn-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html"))));
});
