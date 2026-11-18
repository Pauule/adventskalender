'use strict';

// Bump the version whenever the app shell or puzzle content changes.
const PREFIX = 'emma-advent-' + self.registration.scope + '-';
const CACHE = PREFIX + 'pwa-v1';
const HOME = new URL('./', self.registration.scope).href;
const FILES = [
  './', 'index.html', 'style.css', 'app.js', 'raetsel.js', 'pwa.js',
  'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'icon-maskable.png', 'stern.svg', 'winter.svg', 'sternsuche.svg', 'finale.svg'
].map(file => new URL(file, HOME).href);
const INDEX = new URL('index.html', HOME).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    FILES.map(url => new Request(url, {cache: 'reload'}))
  )));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const clean = url.origin + url.pathname;
  const shellNavigation = request.mode === 'navigate' && (clean === HOME || clean === INDEX);
  if (!shellNavigation && !FILES.includes(request.url)) return;
  event.respondWith((async () => {
    try {
      const cache = await caches.open(CACHE);
      const response = await cache.match(shellNavigation ? HOME : request);
      if (response) return response;
    } catch {
      // Fall back to a normal online request when storage is unavailable.
    }
    return fetch(request);
  })());
});
