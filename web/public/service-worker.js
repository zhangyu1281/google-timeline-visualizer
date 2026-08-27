const CACHE_NAME = 'timeline-visualizer-web-v6';

const PRECACHE = [
  './',
  './index.html',
  './faq.html',
  './privacy.html',
  './terms.html',
  './about.html',
  './how-to-export.html',
  './how-to-export-iphone.html',
  './how-to-export-android.html',
  './favicon.ico',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './logo-mark.svg',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './apple-touch-icon.svg',
  './og-image.png',
  './og-export.png',
  './og-export-iphone.png',
  './og-export-android.png',
  './demo-hero.mp4',
  './demo-poster.jpg',
  './site.css',
  './manifest.webmanifest',
  './sample-timeline.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses — payment status polling must always hit the network.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response.ok || response.type === 'opaque') return response;
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    }).catch(() => caches.match('./index.html')),
  );
});
