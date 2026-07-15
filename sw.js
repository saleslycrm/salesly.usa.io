/* sw.js — DISABLED.
 *
 * This service worker previously cached the app and served a stale copy on the
 * first home-screen launch, which broke the login prompt (it only appeared after
 * a close-and-reopen). This version does the opposite: it unregisters itself and
 * deletes every cache, so the app always loads fresh from the network — exactly
 * like it does in a normal desktop browser tab.
 *
 * Safe to leave in the repo permanently. It is a no-op that also self-cleans.
 */
self.addEventListener('install', (e) => {
  // Take over immediately instead of waiting.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Delete all caches this SW (or a previous version) created.
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) {}
    // Stop controlling any open pages, then unregister self.
    try { await self.clients.claim(); } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
  })());
});

// Never intercept requests — always let them go straight to the network.
// (No fetch handler = browser default = network fetch, no caching.)
