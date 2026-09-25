// TypeRider hors-ligne : réseau d'abord (toujours la dernière version en ligne),
// copie en cache pour pouvoir jouer sans connexion une fois le jeu ouvert une première fois.
const CACHE = 'typerider-v1';
const FILES = ['./', 'index.html', 'style.css', 'game.js', 'vehicles.js', 'vfx.js', 'favicon.svg',
  'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'build/icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
