const CACHE_NAME = "brainboost-v1";

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/manifest.json",
];

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — SPA aware ────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET requests
  if (request.method !== "GET") return;

  // 2. Skip API calls — always go to network
  if (url.pathname.startsWith("/api/")) return;

  // 3. Skip browser extensions and non-http requests
  if (!url.protocol.startsWith("http")) return;

  // 4. Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Try network first
        const networkResponse = await fetch(request);

        // Cache successful responses for static assets only
        if (
          networkResponse.ok &&
          (url.pathname.endsWith(".js") ||
            url.pathname.endsWith(".css") ||
            url.pathname.endsWith(".png") ||
            url.pathname.endsWith(".svg") ||
            url.pathname.endsWith(".ico") ||
            url.pathname.endsWith(".json") ||
            url.pathname === "/" ||
            url.pathname === "/index.html")
        ) {
          cache.put(request, networkResponse.clone());
        }

        return networkResponse;

      } catch (err) {
        // Network failed — try cache
        const cached = await cache.match(request);
        if (cached) return cached;

        // ── KEY FIX: For SPA routes like /signup, /dashboard etc.
        // Fall back to /index.html so React Router can handle routing
        if (request.headers.get("accept")?.includes("text/html")) {
          const indexCache = await cache.match("/index.html");
          if (indexCache) return indexCache;

          // Last resort — fetch index.html fresh
          return fetch("/index.html");
        }

        // For non-HTML requests with no cache, return empty response
        return new Response("", { status: 408, statusText: "Offline" });
      }
    })
  );
});