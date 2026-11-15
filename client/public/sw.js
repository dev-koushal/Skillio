const CACHE_NAME = "skillio-shell-v3";
const STATIC_ASSETS = [
  "/skillio.png",
  "/manifest.json"
];

// Install: cache only non-HTML static assets and activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up ALL older caches immediately and claim clients
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

// Message listener to trigger immediate skip waiting if signaled
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch: NEVER cache API, video, auth, HTML, or navigation requests.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Security guard: Bypass SW cache completely for sensitive endpoints, video streams, and tokens
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/video/") ||
    url.pathname.includes("/playback") ||
    url.pathname.includes("/stream") ||
    url.pathname.includes("/orders") ||
    url.pathname.includes("/razorpay") ||
    url.hostname.includes("mediadelivery.net") ||
    url.hostname.includes("b-cdn.net") ||
    url.hostname.includes("bunnycdn.com") ||
    url.hostname.includes("res.cloudinary.com") ||
    url.searchParams.has("token") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // Navigation requests and HTML files: ALWAYS go to network first
  if (event.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets (CSS/JS/images) with network-first falling back to cache
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
      .catch(() => caches.match(event.request))
  );
});

