self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('finance-store').then((cache) => cache.addAll(['/','/styles.css','/app.js','/manifest.json','/icon-192x192.png','/icon-512x512.png']))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});