// Offline-Speicher der App (Service Worker).
// Die App lädt alle Dateien aus offline.json einmal in den Cache „ola-dateien“ (siehe syncOffline in index.html).
// Danach kommt alles aus dem Cache, auch ohne Netz. Seite, Medienliste und Tonverzeichnis werden zuerst
// aus dem Netz geholt (damit Neues ankommt) und nur ohne Netz aus dem Cache genommen.
const CACHE = 'ola-dateien';
const FRESH = new Set(['', 'index.html', 'media.json', 'offline.json', 'audio/manifest.json', 'audio/manifest.js']);
const scope = () => self.registration.scope;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.href.startsWith(scope())) return;
  const rel = decodeURIComponent(url.pathname.slice(new URL(scope()).pathname.length));
  if (rel === 'sw.js') return;
  const key = scope() + (rel || 'index.html');
  if (rel === '__sw') { e.respondWith(new Response('2')); return; } // Kennung: dieser Service Worker lässt Aktualisierungen durch
  // ausdrücklich neu angefordert (syncOffline holt geänderte Dateien): direkt ins Netz, nie die alte Fassung aus dem Speicher
  if (req.cache === 'reload' && req.mode !== 'navigate' && !req.headers.get('range')) return;
  e.respondWith(FRESH.has(rel) ? networkFirst(req, key) : cacheFirst(req, key));
});

async function networkFirst(req, key) {
  const c = await caches.open(CACHE);
  try {
    const res = await Promise.race([fetch(req, { cache: 'no-cache' }), new Promise((_, no) => setTimeout(no, 4000))]);
    if (res.ok) c.put(key, res.clone());
    return res;
  } catch (e) {
    return (await c.match(key)) || new Response('Offline und noch nicht gespeichert.', { status: 503 });
  }
}

async function cacheFirst(req, key) {
  const hit = await caches.match(key, { cacheName: CACHE });
  const range = req.headers.get('range');
  if (hit) return range ? partial(hit, range) : hit;
  // noch nicht gespeichert: aus dem Netz (Videos fragen in Stücken, die speichert erst syncOffline am Stück)
  return fetch(req);
}

// Safari spielt Videos nur mit Antworten auf Byte-Bereiche (206) ab
async function partial(res, range) {
  const buf = await res.arrayBuffer(), len = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? +m[1] : Math.max(0, len - (+m[2] || 0)), end = m[1] && m[2] ? Math.min(+m[2], len - 1) : len - 1;
  if (start >= len) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${len}` } });
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
    'Content-Range': `bytes ${start}-${end}/${len}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}
