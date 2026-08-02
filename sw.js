const CACHE_PREFIX = 'seki-family-trip-';
const CACHE = CACHE_PREFIX + 'v21';
const APP_SHELL = [
  './',
  './index.html',
  './assets/css/style.css?v=21',
  './assets/js/app.js?v=21',
  './assets/images/hero-ine.jpg',
  './assets/images/bbq-course.jpg',
  './assets/images/miyama.jpg',
  './assets/images/destinations/tomari-beach.jpg',
  './assets/images/destinations/kasamatsu.jpg',
  './assets/images/destinations/motoise-kono.jpg',
  './assets/images/destinations/hanamomiji.jpg',
  './assets/images/home/villa-hotdog.jpg',
  './assets/images/menu/camembert.jpg',
  './assets/images/menu/garlic-shrimp.jpg',
  './assets/images/menu/beef-tongue.jpg',
  './assets/images/menu/sirloin.jpg',
  './assets/images/menu/harami.jpg',
  './assets/images/menu/pork-belly.jpg',
  './assets/images/menu/chicken.jpg',
  './assets/images/menu/vegetables.jpg',
  './assets/images/menu/seafood.jpg',
  './assets/images/menu/sausages.jpg',
  './assets/images/menu/grilled-rice-ball.jpg',
  './assets/images/menu/yakisoba.jpg',
  './assets/images/shot-samples/wide.jpg',
  './assets/images/shot-samples/close.jpg',
  './assets/images/shot-samples/motion.jpg',
  './assets/images/shot-samples/vertical.jpg',
  './manifest.webmanifest',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put('./index.html', copy)));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
