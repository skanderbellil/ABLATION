/* ABLATION service worker — app-shell cache, cache-first for assets.
   Bump VERSION on each release so stale shells do not persist. */
const VERSION = 'v1.0.0';
const CACHE = 'ablation-' + VERSION;

// Registration scope ends with '/', so './' resolves to the app base
// both locally ('/') and on GitHub Pages ('/ABLATION/').
const BASE = new URL('./', self.registration.scope).pathname;

const SHELL = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.webmanifest',
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png',
  BASE + 'icons/icon-maskable-512.png',
  BASE + 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('ablation-') && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations fall back to the cached shell so the app opens offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(BASE + 'index.html', copy));
          return res;
        })
        .catch(() =>
          caches
            .match(BASE + 'index.html')
            .then((hit) => hit || Response.error())
        )
    );
    return;
  }

  // Cache-first for same-origin assets; hashed filenames make this safe.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
