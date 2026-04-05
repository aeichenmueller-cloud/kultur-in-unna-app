const CACHE_NAME = 'unna-app-cache-v14';
const urlsToCache = [
  './', './index.html', './style.css', './app.js', './manifest.json',
  './gastronomie.json', './vereine.json', './uebernachtungen.json', './mobilitaet.json',
  './icon-192.png', './icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(cacheNames => {
    return Promise.all(cacheNames.map(cacheName => {
      if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
    }));
  }));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});