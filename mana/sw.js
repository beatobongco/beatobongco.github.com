const CACHE = 'mana-counter-f060b0abbe2b';
const ASSETS = ['./', 'index.html', 'style.css', 'state.js', 'press.js', 'app.js', 'manifest.webmanifest', 'assets/mana.woff2', 'assets/eclipse.svg', 'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/OFL.txt', 'assets/MANA-README.md', 'mana-counter.html'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('mana-counter-') && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(event.request, { ignoreSearch: true });
    if (saved) return saved;
    try { return await fetch(event.request); }
    catch { if (event.request.mode === 'navigate') return (await cache.match('index.html')); throw new Error('Unavailable offline'); }
  })());
});
