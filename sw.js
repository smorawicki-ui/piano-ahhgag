/**
 * PianoChord - Service Worker
 * Caches audio samples and app shell for offline use
 */

const CACHE_NAME = 'pianochord-v1';
const SAMPLE_CACHE = 'pianochord-samples-v1';

// App shell files to cache immediately
const SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_FILES);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== SAMPLE_CACHE)
          .map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Audio samples -> use sample cache with network-first strategy
  if (url.hostname === 'gleitz.github.io' && url.pathname.includes('-mp3')) {
    event.respondWith(
      caches.open(SAMPLE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (e) {
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // App shell -> cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      });
    })
  );
});
