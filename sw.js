// Funciona sin conexión: la app se guarda al instalarse y se actualiza cuando hay red.
// Al cambiar CUALQUIER archivo, sube VERSION para que los móviles descarguen la nueva.
const VERSION = 'geografia-v1';
const APP = ['./', 'index.html', 'estilo.css', 'app.js', 'mapa.js', 'datos.js', 'datos-mapa.js', 'tajogaite.jpg',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Primero la copia guardada (abre al instante, también sin cobertura) y, a la vez, se descarga la nueva
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const guardada = await cache.match(req, { ignoreSearch: true });
    const red = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
    if (guardada) { e.waitUntil(red.catch(() => {})); return guardada; }
    return red.catch(() => cache.match('index.html'));
  }));
});
