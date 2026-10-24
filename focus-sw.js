/* FOCUS: Service Worker. Zuerst das Netz (immer die neueste Version), ohne Netz die gespeicherte.
   Er fasst nur FOCUS-Dateien an; alles andere im Hub läuft unverändert am Netz vorbei. */
const CACHE = 'focus-offline-1';
const BASIS = new URL(self.registration.scope).pathname;
const MEINE = /^(focus\/(index\.html)?|focus-v[\w.\-]+\.html|focus-manifest\.webmanifest|focus-icon-\d+\.png)$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Die Seite meldet, was sie für den Offline-Betrieb braucht (der Dateiname der App ändert sich mit jeder Version).
self.addEventListener('message', e => {
  const urls = (e.data && e.data.cache) || [];
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(urls.map(u =>
    fetch(u, { cache: 'reload' }).then(r => r.ok ? c.put(u, r) : null).catch(() => null)))));
});

function mitZeitlimit(p, ms) { return new Promise((ok, nein) => { const t = setTimeout(() => nein(new Error('zeit')), ms); p.then(v => { clearTimeout(t); ok(v); }, f => { clearTimeout(t); nein(f); }); }); }

async function netzZuerst(req, rel) {
  const cache = await caches.open(CACHE);
  try {
    const r = await mitZeitlimit(fetch(req), 4000);   // lahmes Netz: nach 4 Sekunden die gespeicherte Fassung
    if (r && r.ok) {
      cache.put(req, r.clone());
      if (/^focus-v/.test(rel)) {   // alte App-Versionen aus dem Speicher werfen
        (await cache.keys()).forEach(k => { if (/\/focus-v[^/]*\.html$/.test(k.url) && k.url !== req.url) cache.delete(k); });
      }
    }
    return r;
  } catch (_) {
    const alt = await cache.match(req, { ignoreSearch: true });
    if (alt) return alt;
    throw _;
  }
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin || u.pathname.indexOf(BASIS) !== 0) return;
  const rel = u.pathname.slice(BASIS.length);
  if (!MEINE.test(rel)) return;
  e.respondWith(netzZuerst(r, rel));
});
