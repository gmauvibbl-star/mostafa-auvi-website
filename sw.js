const CACHE_NAME = 'mostafa-auvi-v15';
const ASSETS = [
  './',
  './index.html',
  './index-en.html',
  './journal.html',
  './posts.html',
  './read.html',
  './about.html',
  './about-en.html',
  './subscribe.html',
  './subscribe-en.html',
  './dashboard.html',
  './manifest.json',
  './chandradwip-landscape.webp',
  './assets/img/author-hero.jpg',
  './assets/js/main.js',
  './assets/js/auth.js',
  './assets/css/tokens.css',
  './assets/css/base.css',
  './assets/css/layout.css',
  './assets/css/components.css',
  './assets/css/responsive.css',
  './assets/css/explore.css',
  './assets/css/header-new.css',
  './assets/css/hero.css',
  './assets/css/auth.css'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Network-first for navigation requests (HTML pages) — always get the latest version.
  // This prevents the old design from showing up on first visit.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Stale-while-revalidate for static assets (CSS, JS, images, fonts).
  // Return cached immediately for speed, update cache in background.
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
