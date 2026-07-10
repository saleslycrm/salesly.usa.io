/* Salesly service worker — makes the app load offline / in dead zones.
   Design goals (deliberately conservative to avoid "stuck cache" bugs):
   - Cache the app shell so it opens with no signal.
   - NETWORK-FIRST for navigations/same-origin files, so a redeploy is picked up
     as soon as there's signal; cache is only the fallback when offline.
   - NEVER cache cross-origin requests (map tiles, Google Apps Script sync,
     fonts) — those must always go to the network so maps and sync behave
     exactly as before. The SW simply ignores them.
   - Bump CACHE_VERSION whenever you want to force-refresh the cached shell. */
const CACHE_VERSION = 'salesly-v36';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GET requests. Everything else (map tiles, Google
  // Apps Script sync, fonts, POSTs) goes straight to the network untouched.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first: try the live version, fall back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Update the cached copy in the background for next offline load.
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match('./index.html'))
      )
  );
});
