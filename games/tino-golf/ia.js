/*
 * Tino Golf: il computer (Gino). Prova davvero i tiri con la stessa fisica del
 * gioco (simula), sceglie quello che lascia meno strada alla buca, poi sbaglia
 * apposta un poco (errore su angolo e potenza).
 * cercaTiro è un generatore: il gioco lo fa avanzare un po' a ogni fotogramma.
 */
import { simula, strada, copiaPalla, supporto, nuovaPalla, passo, FISICA } from './motore.js';

export const IA = {
  passoAngolo: (3 * Math.PI) / 180,
  potenze: [0.08, 0.13, 0.18, 0.23, 0.29, 0.35, 0.42, 0.5, 0.58, 0.67, 0.77, 0.88, 1],
  ritardi: [0, 0.5, 1, 1.5, 2, 2.5, 3],
  settori: 4,
  // errore di Gino (deviazione standard)
  livelli: {
    gino: { angolo: (2.6 * Math.PI) / 180, potenza: 0.07 },
    bravo: { angolo: (0.6 * Math.PI) / 180, potenza: 0.015 },
    perfetto: { angolo: 0, potenza: 0 },
  },
};

/* Colpi che restano (stima): 0 se è in buca. */
const stima = (d) => 1 + d / 5;
function voto(m, b0, r) {
  if (r.esito === 'buca') return 0;
  if (r.esito === 'fuori' || r.esito === 'acqua') return 1 + stima(strada(m, b0.x, b0.y, b0.z));
  return stima(strada(m, r.x, r.y, r.z)) + (r.miele ? 0.4 : 0);
}

export const muove = (m) => m.girandole.length > 0 || m.campane.length > 0 || m.blocchi.some((b) => b.asc);

/* La pallina sta su un ascensore che non è in cima? Allora si aspetta. */
export function aspettaAscensore(m, b) {
  const s = supporto(m, b.x, b.z, b.y, b.t);
  if (!s || !s.b.asc) return false;
  const a = s.b.asc;
  return Math.abs(s.h - a.su) > 0.01;
}

export function* cercaTiro(m, b, budget = 400, livello = 'gino') {
  let conto = 0;
  const prova = (ang, pot, rit) => {
    const bb = copiaPalla(b);
    bb.t += rit;
    const r = simula(m, bb, ang, pot);
    return { ang, pot, rit, v: voto(m, b, r) };
  };
  const tutti = [];
  // 1) giro completo, senza aspettare
  const nA = Math.round((2 * Math.PI) / IA.passoAngolo);
  for (let i = 0; i < nA; i++) {
    const ang = i * IA.passoAngolo;
    for (const pot of IA.potenze) {
      tutti.push(prova(ang, pot, 0));
      if (++conto % budget === 0) yield;
    }
  }
  tutti.sort((a, c) => a.v - c.v);
  const scelti = [];
  for (const c of tutti) {
    if (scelti.length >= IA.settori) break;
    if (scelti.every((s) => Math.abs(Math.atan2(Math.sin(s.ang - c.ang), Math.cos(s.ang - c.ang))) > 0.2)) scelti.push(c);
  }
  // 2) con le cose che si muovono, si prova anche ad aspettare
  if (muove(m)) {
    for (const s of scelti) {
      for (const rit of IA.ritardi) {
        if (rit === 0) continue;
        for (let da = -3; da <= 3; da++) {
          for (const pot of IA.potenze) {
            tutti.push(prova(s.ang + da * IA.passoAngolo, pot, rit));
            if (++conto % budget === 0) yield;
          }
        }
      }
    }
  }
  tutti.sort((a, c) => a.v - c.v);
  // 3) rifinitura attorno ai migliori
  const candidati = [];
  for (const c of tutti) {
    if (candidati.length >= 3) break;
    if (candidati.every((s) => s.rit !== c.rit || Math.abs(s.ang - c.ang) > 0.08 || Math.abs(s.pot - c.pot) > 0.1)) candidati.push(c);
  }
  const fini = [];
  for (const base of candidati) {
    for (let da = -4; da <= 4; da++) {
      for (let dp = -4; dp <= 4; dp++) {
        const ang = base.ang + (da * IA.passoAngolo) / 4;
        const pot = Math.max(0.03, Math.min(1, base.pot + dp * 0.015));
        fini.push(prova(ang, pot, base.rit));
        if (++conto % budget === 0) yield;
      }
    }
  }
  fini.sort((a, c) => a.v - c.v);
  // 4) tra i tiri buoni, quello che sopporta meglio i propri errori
  const L = IA.livelli[livello] || IA.livelli.gino;
  const sa = Math.max(L.angolo, (1.2 * Math.PI) / 180), sp = Math.max(L.potenza, 0.04);
  const scosse = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]];
  let migliore = fini[0], mv = Infinity;
  const finali = [];
  for (const c of fini.concat(tutti.slice(0, 6))) {
    if (finali.length >= 10) break;
    if (finali.every((s) => s.rit !== c.rit || Math.abs(s.ang - c.ang) > 0.015 || Math.abs(s.pot - c.pot) > 0.03)) finali.push(c);
  }
  for (const c of finali) {
    let somma = 0;
    for (const [ea, ep] of scosse) {
      somma += prova(c.ang + ea * sa, Math.max(0.03, Math.min(1, c.pot * (1 + ep * sp))), c.rit).v;
      if (++conto % budget === 0) yield;
    }
    const media = somma / scosse.length;
    if (media < mv) { mv = media; migliore = c; }
  }
  return { ang: migliore.ang, pot: migliore.pot, rit: migliore.rit, v: mv };
}

function gauss(rnd) {
  const u = Math.max(1e-9, rnd()), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function sbaglia(tiro, livello, rnd = Math.random) {
  const L = IA.livelli[livello] || IA.livelli.gino;
  return {
    ...tiro,
    ang: tiro.ang + gauss(rnd) * L.angolo,
    pot: Math.max(0.03, Math.min(1, tiro.pot * (1 + gauss(rnd) * L.potenza))),
  };
}

/* Gioca una buca intera senza grafica (per le prove). */
export function giocaBuca(m, livello = 'gino', rnd = Math.random, max = 8) {
  let b = nuovaPalla(m, m.campo.tee[0], m.campo.tee[1], 0);
  let colpi = 0;
  const storia = [];
  while (colpi < max) {
    while (aspettaAscensore(m, b)) { passo(m, b, null); }
    const gen = cercaTiro(m, b, 1e9, livello);
    let x = gen.next();
    while (!x.done) x = gen.next();
    const t = sbaglia(x.value, livello, rnd);
    for (let k = 0; k < Math.round(t.rit / FISICA.dt); k++) passo(m, b, null);
    const r = simula(m, b, t.ang, t.pot);
    colpi++;
    storia.push(r.esito || 'fermo');
    if (r.esito === 'buca') break;
    if (r.esito === 'fuori' || r.esito === 'acqua') {
      colpi++;
      const nb = nuovaPalla(m, r.da.x, r.da.z, r.t);
      b = nb;
    } else {
      b = r;
      b.esito = null;
    }
  }
  return { colpi: Math.min(colpi, max), storia };
}
