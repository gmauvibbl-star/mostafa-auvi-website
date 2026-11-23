const CACHE_NAME = 'mostafa-auvi-v44';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// কোনো ক্যাশ ব্যবহার না করে সবসময় নেটওয়ার্ক থেকে নতুন ফাইল আনবে।
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request));
});
