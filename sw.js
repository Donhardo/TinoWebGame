/*
 * Service worker del sito: serve solo perché il telefono lo installi come app
 * (schermo intero, icona nella Home). Non mette niente da parte: ogni pagina e
 * ogni file arriva sempre dalla rete, così si vede sempre l'ultima versione.
 * Senza rete, al posto della pagina compare un avviso.
 * Versione: 10 novembre 2026.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Senza rete</title><body style="font-family:sans-serif;background:#fff8ec;color:#3b2a1a;text-align:center;padding:3em 1em">' +
    '<h1>Niente rete</h1><p>I giochi di Tino hanno bisogno di internet. Riprova quando sei collegato.</p></body>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
