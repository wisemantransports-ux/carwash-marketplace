self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('cwm-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/icon.svg',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});