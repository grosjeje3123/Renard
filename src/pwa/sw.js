// Renard : service worker. Garde l'application sur la tablette pour qu'elle s'ouvre sans réseau.
// Il ne parle qu'à l'adresse qui l'héberge, uniquement pour récupérer les fichiers de l'application (jamais de données).
const VERSION = '__VERSION__';
const CACHE = `renard-${VERSION}`;
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', ...__VOIX_FILES__];

self.addEventListener('install', (e) => {
  // « reload » : on veut les fichiers du serveur, pas une copie périmée du cache HTTP.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('renard-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Les lecteurs audio (iPad surtout) demandent des morceaux de fichier (Range) : on répond 206 depuis la copie gardée.
async function morceau(req, res) {
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if (!m || !res) return res;
  const buf = await res.arrayBuffer(), size = buf.byteLength;
  let start = m[1] ? parseInt(m[1], 10) : 0, end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
  if (!m[1] && m[2]) { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
  return new Response(buf.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) } });
}

// Le cache répond tout de suite (démarrage instantané, même hors connexion) ; le réseau met la copie à jour pour la prochaine ouverture.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await cache.match('index.html') : undefined);
    if (cached && req.headers.has('range')) return morceau(req, cached);
    const fresh = fetch(req).then((r) => { if (r.status === 200) cache.put(req, r.clone()); return r; }).catch(() => undefined);
    if (cached) { e.waitUntil(fresh); return cached; }
    return (await fresh) || new Response('Renard n’a pas pu démarrer : ouvrez-le une première fois avec une connexion.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  })());
});
