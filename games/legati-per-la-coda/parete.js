/*
 * Legati per la Coda: la parete, generata a caso salendo (senza Three.js).
 * Una catena di appigli "sicuri" (sbarre e pioli): ognuno si raggiunge dondolando
 * appesi al precedente. Ogni tanto un appiglio in più dall'altra parte. La difficoltà
 * cresce con l'altezza (tabella CURVE: punti [metri, valore], lineari tra un punto e
 * l'altro): appigli più alti rispetto al perno (bisogna aspettare un dondolo più
 * ampio), sbarre più corte e poi solo pioli.
 */
import { FISICA } from './fisica.js';

export const CURVE = {
  angolo: [[0, [0.95, 1.15]], [40, [0.8, 1.15]], [150, [0.68, 1.1]], [300, [0.62, 1.05]]],  // dalla verticale, rad
  distanza: [[0, [2.0, 2.4]], [150, [2.0, 2.6]]],                                         // dal precedente
  sbarra: [[0, 2.4], [30, 1.8], [100, 1.1], [200, 0.7]],                                  // lunghezza
  pioli: [[0, 0], [12, 0.15], [80, 0.45], [200, 0.7], [400, 0.85]],                         // quanti sono pioli
  extra: [[0, 0]],                                                                          // per ora nessuno
};

export function curva(punti, h) {
  const lin = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * k) : a + (b - a) * k);
  if (h <= punti[0][0]) return punti[0][1];
  for (let i = 1; i < punti.length; i++) {
    const [h1, v1] = punti[i];
    if (h <= h1) {
      const [h0, v0] = punti[i - 1];
      return lin(v0, v1, (h - h0) / (h1 - h0));
    }
  }
  return punti[punti.length - 1][1];
}

function rng(seme) {
  let a = seme >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const R_PIOLO = 0.24, R_SBARRA = 0.14;
const LIM = 2.3;   // gli appigli stanno lontani dai muri: dondolando non si sbatte

export function nuovaParete(seme = 1) {
  const L = FISICA.largo / 2;
  const isola = { id: 0, tipo: 'isola', isola: true, x1: -L, x2: L, y: 0 };
  const primo = { id: 1, tipo: 'sbarra', x1: -1.3, x2: 1.3, y: 3.45, r: R_SBARRA, sicuro: true };
  return { seme, caso: rng(seme), appigli: [isola, primo], cima: primo.y, ultimo: primo, n: 2, lato: seme % 2 ? -1 : 1 };
}

/* Il passo più lungo: dal punto del precedente più lontano al punto più vicino del nuovo. */
const MAX_PASSO = 2.55;
const estremi = (a) => (a.tipo === 'sbarra' ? [[a.x1, a.y], [a.x2, a.y]] : [[a.x, a.y]]);
function vicino(a, x, y) {
  const px = a.tipo === 'sbarra' ? Math.max(a.x1, Math.min(a.x2, x)) : a.x;
  return Math.hypot(px - x, a.y - y);
}
function lontano(prec, a) { return Math.max(...estremi(prec).map(([x, y]) => vicino(a, x, y))); }

export const centro = (a) => (a.tipo === 'sbarra' ? (a.x1 + a.x2) / 2 : a.x);

function nuovoAppiglio(p, tipo, x, y, lungo, sicuro) {
  if (tipo === 'piolo') return { id: p.n++, tipo, x, y, r: R_PIOLO, sicuro };
  const x1 = Math.max(-LIM, x - lungo / 2), x2 = Math.min(LIM, x + lungo / 2);
  return { id: p.n++, tipo, x1, x2, y, r: R_SBARRA, sicuro };
}

/* Genera appigli finché la cima non arriva ad almeno y. */
export function generaFino(p, y) {
  const caso = p.caso;
  while (p.cima < y) {
    const prec = p.ultimo;
    const h = prec.y;
    const [a0, a1] = curva(CURVE.angolo, h);
    const [d0, d1] = curva(CURVE.distanza, h);
    const ang = a0 + (a1 - a0) * caso();
    const dist = d0 + (d1 - d0) * caso();
    // di solito si va dall'altra parte; vicino ai muri per forza verso il centro
    const cx = centro(prec);
    let lato = caso() < 0.7 ? -p.lato : p.lato;
    if (cx + lato * dist * Math.sin(ang) > LIM || cx + lato * dist * Math.sin(ang) < -LIM) lato = -lato;
    // il punto della sbarra più vicino al perno è quello da raggiungere
    const px = cx + lato * dist * Math.sin(ang);
    const py = prec.y + dist * Math.cos(ang);
    const piolo = caso() < curva(CURVE.pioli, h);
    const lungo = curva(CURVE.sbarra, h) * (0.8 + 0.4 * caso());
    const xc = piolo ? px : px + lato * lungo * 0.4;
    let a = nuovoAppiglio(p, piolo ? 'piolo' : 'sbarra', Math.max(-LIM, Math.min(LIM, xc)), py, lungo, true);
    // da qualunque punto del precedente ci si arriva: se no lo si avvicina
    for (let k = 0; k < 8 && lontano(prec, a) > MAX_PASSO; k++) {
      const f = 0.88;
      const nx = cx + (centro(a) - cx) * f, ny = prec.y + (a.y - prec.y) * (0.94 + 0.06 * f);
      p.n--;
      a = nuovoAppiglio(p, a.tipo, nx, ny, a.tipo === 'sbarra' ? (a.x2 - a.x1) : 0, true);
    }
    p.appigli.push(a);
    p.lato = lato;
    // un appiglio in più, più in basso dall'altra parte: una scorciatoia che non serve
    if (caso() < curva(CURVE.extra, h)) {
      const ex = Math.max(-LIM, Math.min(LIM, cx - lato * (1.6 + caso() * 1.2)));
      const ey = prec.y + 0.8 + caso() * 1.2;
      if (Math.abs(ex - cx) > 1.2) p.appigli.push(nuovoAppiglio(p, caso() < 0.5 ? 'piolo' : 'sbarra', ex, ey, 1, false));
    }
    p.ultimo = a;
    p.cima = py;
  }
  p.appigli.sort((a, b) => a.y - b.y);
}

/* Toglie gli appigli ormai troppo in basso (l'isola resta). */
export function pota(p, yMin) {
  p.appigli = p.appigli.filter((a) => a.isola || a.y >= yMin || a === p.ultimo);
}
