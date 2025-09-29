const CACHE_NAME = 'lababil-sales-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/admin-dashboard.html',
  '/css/style.css',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/main.js',
  '/js/firebase.js',
  '/image/lababil-logo.png',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }).catch(() => {
        // If offline and no cache, serve fallback
        return caches.match('/index.html');
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
