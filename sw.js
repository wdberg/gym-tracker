/* Service worker: makes the app work offline and auto-update.
 * Bump CACHE_VERSION (and APP_VERSION in index.html) whenever you release changes —
 * the deploy workflow also stamps a unique build id below so every push triggers an update. */
const CACHE_VERSION = 'v2.1.1';
const BUILD_ID = '__BUILD_ID__';
const CACHE = `gym-tracker-${CACHE_VERSION}-${BUILD_ID}`;
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon.svg', 'vendor/supabase.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Network first (so you always get the newest version when online), falling back to cache offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html'))),
  );
});
