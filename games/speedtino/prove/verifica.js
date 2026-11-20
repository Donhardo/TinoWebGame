/*
 * Speedtino: verifica delle stanze con un giocatore simulato.
 * Ricerca a fascio: i comandi cambiano solo ogni `tratto` secondi (0,1 s), quindi
 * una stanza superata qui si supera anche con riflessi umani buoni.
 *
 *   node games/speedtino/prove/verifica.js            tutte le stanze
 *   node games/speedtino/prove/verifica.js camino     una stanza
 *   opzioni: --fascio 3000  --tratto 0.1  --pg gino (tino, gino, matteo)
 *            --salva (scrive soluzioni.js, per il personaggio scelto)
 */
'use strict';
const path = require('path');
const fs = require('fs');
const F = require('../fisica.js');
const { STANZE } = require('../stanze.js');

const arg = process.argv.slice(2);
const opz = (n, d) => { const i = arg.indexOf('--' + n); return i >= 0 ? Number(arg[i + 1]) : d; };
const FASCIO = opz('fascio', 3000);
const TRATTO = opz('tratto', 0.1);
const DT = 1 / 120;
const PASSI = Math.round(TRATTO / DT);
const MAX_TEMPO = opz('tempo', 14);
const salva = arg.includes('--salva');
const iPg = arg.indexOf('--pg');
const PG = iPg >= 0 ? arg[iPg + 1] : 'tino';
if (!F.PERSONAGGI[PG]) throw new Error('personaggio sconosciuto: ' + PG);
const scelte = arg.filter((a, i) => !a.startsWith('--') && isNaN(Number(a)) && arg[i - 1] !== '--pg');

const PISTA = { id: 'pista', righe: Array.from({ length: 22 }, (_, i) => (i >= 17 ? '#' : '.').repeat(16)) };

// distanza (in quadretti) dall'uscita su tutte le caselle libere: guida la ricerca
function mappaDistanze(m, st) {
  const W = m.larghezza, H = F.RIGHE + 4, D = new Float32Array(W * H).fill(Infinity);
  const coda = [];
  const libera = (c, r) => {
    const k = F.casella(m, c, r - 4);
    return !F.solida(k) && !'^v<>*'.includes(k);
  };
  const fine = st.x0 + st.larga;
  for (let r = 0; r < H; r++) for (let c = fine; c < W; c++) if (libera(c, r)) { D[r * W + c] = 0; coda.push(r * W + c); }
  for (let i = 0; i < coda.length; i++) {
    const v = coda[i], c = v % W, r = (v / W) | 0;
    for (const [dc, dr, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nc >= W || nr < 0 || nr >= H || !libera(nc, nr)) continue;
      const n = nr * W + nc;
      if (D[n] > D[v] + w) { D[n] = D[v] + w; coda.push(n); }
    }
  }
  return (x, y) => {
    const c = Math.floor(x / F.T), r = Math.floor(y / F.T) + 4;
    if (c < 0 || c >= W || r < 0 || r >= H) return 999;
    return D[r * W + c];
  };
}

const AZIONI_LIBERO = [];
for (const sx of [-1, 0, 1]) for (const salto of [0, 1]) for (const gancio of [0, 1]) AZIONI_LIBERO.push({ sx, salto, gancio, su: 0, giu: 0 });
const AZIONI_APPESO = [];
for (const sx of [-1, 0, 1]) {
  for (const [su, giu] of [[0, 0], [1, 0], [0, 1]]) AZIONI_APPESO.push({ sx, salto: 0, gancio: 1, su, giu });
  AZIONI_APPESO.push({ sx, salto: 0, gancio: 0, su: 0, giu: 0 });
  AZIONI_APPESO.push({ sx, salto: 1, gancio: 1, su: 0, giu: 0 });
}

function verifica(def) {
  const m = F.nuovoMondo();
  const st = F.aggiungiStanza(m, def, def.id);
  F.aggiungiStanza(m, PISTA, 'pista');
  const dist = mappaDistanze(m, st);
  const fine = (st.x0 + st.larga) * F.T + 6;
  const p0 = F.nuovoGiocatore(st.spawn.x, st.spawn.piedi, PG);
  for (let i = 0; i < 3; i++) F.passo(m, p0, { sx: 0 }, DT);
  let fascio = [{ p: p0, salto: 0, gancio: 0, strada: [] }];
  let visti = 0;
  for (let t = 0; t < MAX_TEMPO / TRATTO; t++) {
    const nuovi = new Map();
    for (const n of fascio) {
      const azioni = n.p.gancio ? AZIONI_APPESO : AZIONI_LIBERO;
      for (const a of azioni) {
        const p = F.copia(n.p);
        for (let i = 0; i < PASSI; i++) {
          F.passo(m, p, {
            sx: a.sx, su: a.su, giu: a.giu, salto: !!a.salto, gancio: !!a.gancio,
            saltoPremuto: i === 0 && a.salto && !n.salto,
            gancioPremuto: i === 0 && a.gancio && !n.gancio
          }, DT);
          if (p.morto) break;
        }
        visti++;
        if (p.morto) continue;
        const strada = n.strada.concat([a]);
        if (p.x > fine && p.aTerra) return { ok: true, tempo: (t + 1) * TRATTO, strada, visti };
        const g = p.gancio ? Math.round(p.gancio.x) + ':' + Math.round(p.gancio.L / 6) : '-';
        const chiave = [Math.round(p.x / 3), Math.round(p.y / 3), Math.round(p.vx / 30), Math.round(p.vy / 30), g, a.salto, a.gancio].join(',');
        const voto = dist(p.x + p.w / 2, p.y + p.h / 2) - p.x * 0.001;
        const vecchio = nuovi.get(chiave);
        if (!vecchio || vecchio.voto > voto) nuovi.set(chiave, { p, salto: a.salto, gancio: a.gancio, strada, voto });
      }
    }
    fascio = [...nuovi.values()].sort((a, b) => a.voto - b.voto).slice(0, FASCIO);
    if (!fascio.length) return { ok: false, tempo: t * TRATTO, motivo: 'tutti morti', visti };
  }
  const meglio = fascio[0];
  return { ok: false, tempo: MAX_TEMPO, motivo: 'non arriva (x ' + Math.round(meglio.p.x - st.x0 * F.T) + ' su ' + st.larga * F.T + ')', visti };
}

// ripete la strada e la disegna sulla stanza (numeri = decimi di secondo, + = appeso)
function traccia(def, strada) {
  const m = F.nuovoMondo();
  const st = F.aggiungiStanza(m, def, def.id);
  F.aggiungiStanza(m, PISTA, 'pista');
  const righe = def.righe.map(r => r.split(''));
  const p = F.nuovoGiocatore(st.spawn.x, st.spawn.piedi, PG);
  for (let i = 0; i < 3; i++) F.passo(m, p, { sx: 0 }, DT);
  let prima = { salto: 0, gancio: 0 };
  strada.forEach((a, n) => {
    for (let i = 0; i < PASSI; i++) {
      F.passo(m, p, { sx: a.sx, su: a.su, giu: a.giu, salto: !!a.salto, gancio: !!a.gancio,
        saltoPremuto: i === 0 && a.salto && !prima.salto, gancioPremuto: i === 0 && a.gancio && !prima.gancio }, DT);
      const c = Math.floor((p.x + p.w / 2) / F.T), r = Math.floor((p.y + p.h / 2) / F.T);
      if (righe[r] && righe[r][c] === '.') righe[r][c] = p.gancio ? '+' : String(n % 10);
    }
    prima = a;
  });
  console.log(righe.map(r => r.join('')).join('\n'));
}

const soluzioni = {};
for (const def of STANZE) {
  if (scelte.length && !scelte.includes(def.id)) continue;
  const t0 = Date.now();
  const r = verifica(def);
  const s = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(PG.padEnd(7) + (r.ok ? 'OK   ' : 'NO   ') + def.id.padEnd(16) + ' liv ' + def.livello + '  ' +
    (r.ok ? r.tempo.toFixed(1) + ' s di gioco' : r.motivo) + '  (' + s + ' s, ' + r.visti + ' prove)');
  if (r.ok && arg.includes('--traccia')) traccia(def, r.strada);
  if (r.ok) soluzioni[def.id] = r.strada.map(a => '' + (a.sx + 1) + a.salto + a.gancio + a.su + a.giu).join(' ');
}
if (salva) {
  const file = path.join(__dirname, '..', 'soluzioni.js');
  let vecchie = {};
  try { vecchie = require(file).SOLUZIONI; } catch (e) { /* niente */ }
  if (!vecchie.tino) vecchie = { tino: vecchie };   // file di prima: solo Tino
  vecchie[PG] = Object.assign(vecchie[PG] || {}, soluzioni);
  fs.writeFileSync(file, '/* Speedtino: soluzioni delle stanze trovate da prove/verifica.js (per personaggio; tratti di ' + TRATTO +
    ' s; per ogni tratto: direzione 0-2, salto, rampino, su, giù). Servono alla partita dimostrativa. */\n' +
    '(function (radice) {\n  const SOLUZIONI = ' + JSON.stringify(vecchie, null, 2).replace(/\n/g, '\n  ') + ';\n' +
    "  if (typeof module !== 'undefined' && module.exports) module.exports = { SOLUZIONI, TRATTO: " + TRATTO + " };\n" +
    '  else { radice.SpeedtinoSoluzioni = SOLUZIONI; radice.SpeedtinoTratto = ' + TRATTO + '; }\n})(this);\n');
  console.log('scritto', file);
}
