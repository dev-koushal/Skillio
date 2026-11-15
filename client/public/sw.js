// Skillio Service Worker: Self-cleanup, Cache Invalidation and Client Auto-Refresh
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.clients.matchAll({ type: "window", includeUncontrolled: true });
    }).then((clients) => {
      for (const client of clients) {
        try {
          client.navigate(client.url);
        } catch (err) {}
      }
    })
  );
});

// All fetch requests pass straight through to network
self.addEventListener("fetch", (event) => {
  return;
});

