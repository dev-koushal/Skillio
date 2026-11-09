const CACHE_NAME = "skillio-shell-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/skillio.png",
  "/manifest.json"
];

// Install: cache minimal app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Stale-while-revalidate for static assets only. NEVER cache API, video, or auth endpoints.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Security guard: Bypass SW cache completely for sensitive endpoints
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/video/") ||
    url.pathname.includes("/stream") ||
    url.pathname.includes("/orders") ||
    url.pathname.includes("/razorpay") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // Handle static assets with Network-first falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return null;
        });
      })
  );
});

