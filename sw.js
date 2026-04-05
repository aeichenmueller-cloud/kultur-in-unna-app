const CACHE_NAME = 'unna-app-cache-v2';

// Diese Dateien werden für die Offline-Nutzung gespeichert
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './gastronomie.json',
  './vereine.json',
  './uebernachtungen.json',
  './icon-192.png',
  './icon-512.png'
];

// Installation: Dateien in den Cache laden
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache wird befüllt...');
        return cache.addAll(urlsToCache);
      })
  );
});

// Aktivierung: Alte Caches (z.B. v1) löschen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Alter Cache gelöscht:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Strategie: Erst im Cache suchen, sonst Netzwerk nutzen
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache-Treffer: Datei zurückgeben
        if (response) {
          return response;
        }
        // Kein Treffer: Im Internet suchen
        return fetch(event.request);
      })
  );
});