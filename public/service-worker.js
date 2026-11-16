/* global self, caches */
const CACHE_NAME = 'easytutor-v2';
const SHELL_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.ico'
];

// Routes that should be cached for offline use (app shell + all navigation routes).
// Expo Router generates these at build time; we cache any same-origin navigation
// request so the PWA works offline for every route after first visit.
const isNavigationRequest = (request) =>
  request.mode === 'navigate' ||
  (request.method === 'GET' &&
    new URL(request.url).origin === self.location.origin &&
    request.headers.get('accept')?.includes('text/html'));

// Install: precache the app shell so the PWA loads offline and passes the
// installability check (served over HTTPS + manifest + service worker).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
});

// Activate: clean up old caches, claim clients, enable navigation preload.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      ),
      self.clients.claim(),
      self.registration.navigationPreload
        ? self.registration.navigationPreload.enable()
        : Promise.resolve(),
    ])
  );
});

// Fetch: network-first with cache fallback for navigation routes; cache-first
// for static assets. Every visited route gets cached so offline PWA launch
// works for any route, not just the root.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests and non-same-origin requests.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation routes: network-first, cache the result for offline.
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Static assets: cache-first, network revalidate.
  event.respondWith(
    caches.match(request).then((cached) =>
      fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached)
    )
  );
});
