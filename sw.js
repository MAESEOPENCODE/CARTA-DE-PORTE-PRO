const CACHE = 'porte-nacional-v3';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  // Cada archivo por separado: si uno falta (404) no se aborta toda la instalación
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // CDNs y Supabase: red directa

  // La página: red primero (así las actualizaciones llegan), caché si no hay conexión
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto de archivos propios (iconos, manifest): caché primero
  e.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
