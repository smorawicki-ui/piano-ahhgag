/**
 * Piano ahhgag - Service Worker v3
 * - App shell: NETWORK FIRST (siempre busca la versión más nueva)
 * - Audio samples: CACHE FIRST (no cambian, se guardan offline)
 */

const SW_VERSION   = 'piano-ahhgag-v3';
const SAMPLE_CACHE = 'piano-ahhgag-samples-v1';

// Archivos de la app que se intentan actualizar SIEMPRE desde la red
const SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
];

// ---- INSTALL: pre-cache shell ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SW_VERSION)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())   // activa el nuevo SW de inmediato
  );
});

// ---- ACTIVATE: limpia versiones viejas ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== SW_VERSION && k !== SAMPLE_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())  // toma control de todas las pestañas
  );
});

// ---- FETCH ----
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // AUDIO SAMPLES → cache-first (no cambian nunca)
  if (url.hostname === 'gleitz.github.io') {
    event.respondWith(
      caches.open(SAMPLE_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // APP SHELL → network-first: siempre intenta la red, cae a caché si falla
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(SW_VERSION);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        // Sin red → sirve desde caché
        const cached = await caches.match(event.request);
        return cached || new Response('Sin conexión', { status: 503 });
      }
    })()
  );
});
