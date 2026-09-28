// Minimal Service Worker for PWA installability
const CACHE_NAME = 'pgw-tester-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all network requests directly
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
