// Preprost service worker — omogoča delovanje brez interneta.
const CACHE = 'redovalnica-v1';
const FILES = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Google Fonts in zunanje vire pustimo omrežju; lokalne strežemo iz predpomnilnika.
  if (url.startsWith('https://fonts.')) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      // sproti dodaj v cache (za slike ipd.)
      const copy = res.clone();
      caches.open(CACHE).then(c => { try { c.put(e.request, copy); } catch(_){} });
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
