const CACHE_NAME = "abn-shell-v3-20261025-4";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20261025-4",
  "./app.js?v=20261025-4",
  "./config.js",
  "./marketplace-plus.js?v=20261025-4",
  "./marketplace-plus.css?v=20261025-4",
  "./app-branding.js?v=20261025-4",
  "./app-branding.css?v=20261025-4",
  "./manifest.webmanifest"
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
