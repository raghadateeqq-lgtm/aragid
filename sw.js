/* ============================================================
   ARAGID — SERVICE WORKER v2
   Cache-first for assets, network-first for HTML
   ============================================================ */

const CACHE_NAME = 'aragid-v2.0.0';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/01-tokens.css',
  './css/02-components.css',
  './css/03-screens.css',
  './css/04-features.css',
  './css/05-premium.css',
  './js/app.js',
  './js/core.js',
  './js/svg-defs.js',
  './js/data-wisdom.js',
  './js/data-protocols.js',
  './js/data-patterns.js',
  './js/mood-system.js',
  './js/insights-engine.js',
  './js/share-card.js',
  './js/views-home.js',
  './js/views-nada.js',
  './js/views-write.js',
  './js/views-garden.js',
  './js/views-emdr.js',
  './js/views-letters.js',
  './js/views-other.js',
  './js/views-rescue.js',
  './js/views-pricing.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => Promise.allSettled(
        ASSETS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(err =>
          console.warn('[SW] failed to cache:', u, err.message)
        ))
      ))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] install failed:', err))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isHTML = req.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// Allow page to message SW to skip waiting (for updates)
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
