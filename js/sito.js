/*
 * Script comune a tutte le pagine del sito.
 * - Registra il service worker (sw.js nella cartella principale), che serve al
 *   telefono per installare il sito come app ("Aggiungi alla schermata Home").
 * - Nelle pagine dei giochi aggiunge alla barra in alto il pulsante per lo
 *   schermo intero, dove il browser lo permette (non su iPhone: lì si usa la
 *   schermata Home) e se il sito non è già aperto come app a schermo intero.
 * Si include con un percorso relativo: la cartella principale si ricava dal
 * percorso di questo file.
 */
(() => {
  'use strict';
  const script = document.currentScript;
  const radice = new URL('../', script.src);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register(new URL('sw.js', radice), { scope: radice.href }).catch(() => {});
  }

  const el = document.documentElement;
  const richiedi = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!richiedi) return;
  const attuale = () => document.fullscreenElement || document.webkitFullscreenElement;
  const esci = () => (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  const giaApp = () => matchMedia('(display-mode: fullscreen)').matches && !attuale();

  function aggiungi() {
    const barra = document.querySelector('.barra-destra');
    if (!barra || giaApp()) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'barra-btn barra-schermo';
    b.setAttribute('aria-label', 'Schermo intero');
    b.title = 'Schermo intero';
    b.innerHTML =
      '<svg class="ico-apri" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<svg class="ico-chiudi" viewBox="0 0 24 24" aria-hidden="true" style="display:none"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const aggiornaIcona = () => {
      const dentro = !!attuale();
      b.querySelector('.ico-apri').style.display = dentro ? 'none' : '';
      b.querySelector('.ico-chiudi').style.display = dentro ? '' : 'none';
      b.title = dentro ? 'Esci dallo schermo intero' : 'Schermo intero';
      b.setAttribute('aria-label', b.title);
    };
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      b.blur();
      if (attuale()) esci();
      else {
        const p = richiedi.call(el, { navigationUI: 'hide' });
        if (p && p.catch) p.catch(() => {});
      }
    });
    // il tocco sul pulsante non deve arrivare al gioco (es. flipper o salto)
    for (const ev of ['pointerdown', 'touchstart', 'mousedown']) b.addEventListener(ev, (e) => e.stopPropagation());
    document.addEventListener('fullscreenchange', aggiornaIcona);
    document.addEventListener('webkitfullscreenchange', aggiornaIcona);
    barra.insertBefore(b, barra.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aggiungi);
  else aggiungi();
})();
