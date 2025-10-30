const CACHE_NAME = 'battah-system-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  // Note: We don't cache external scripts from cdns/gstatic as they are managed by the browser cache.
  // Add other local assets like images or icons here if needed.
  '/vite.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('push', event => {
    const data = event.data.json();
    const title = data.title || 'نظام بطاح';
    const options = {
        body: data.body,
        icon: '/vite.svg', // Replace with a proper app icon
        badge: '/vite.svg', // Replace with a proper badge icon
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});