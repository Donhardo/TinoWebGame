/*
 * Legati per la Coda: la parete, generata a caso salendo (senza Three.js).
 * Una catena di appigli "sicuri" (mensole e pioli) mai più lontani di quanto si
 * arriva con un salto, più qualche appiglio in più di lato. La difficoltà cresce
 * con l'altezza (tabella CURVE: punti [metri, valore], lineari tra un punto e l'altro).
 */
import { FISICA } from './fisica.js';

export const CURVE = {
  salto: [[0, 1.55], [30, 1.85], [120, 2.1], [300, 2.2]],     // dislivello massimo tra due sicuri
  largo: [[0, 3.4], [40, 2.6], [150, 1.8], [400, 1.4]],      // larghezza delle mensole
  dx: [[0, 1.1], [40, 1.8], [150, 2.4], [400, 2.6]],         // spostamento di lato massimo
  pioli: [[0, 0], [15, 0.12], [100, 0.3], [300, 0.4]],       // quanti sicuri sono pioli
  extra: [[0, 0.6], [100, 0.45], [300, 0.3]],                // appigli in più
};

export function curva(punti, h) {
  if (h <= punti[0][0]) return punti[0][1];
  for (let i = 1; i < punti.length; i++) {
    const [h1, v1] = punti[i];
    if (h <= h1) {
      const [h0, v0] = punti[i - 1];
      return v0 + ((v1 - v0) * (h - h0)) / (h1 - h0);
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

export function nuovaParete(seme = 1) {
  const L = FISICA.largo / 2;
  const isola = { id: 0, tipo: 'mensola', isola: true, x1: -L, x2: L, y: 0, spess: 2.2, sicuro: true };
  const p = { seme, caso: rng(seme), appigli: [isola], cima: 0, ultimo: isola, n: 1 };
  return p;
}

const centro = (a) => (a.tipo === 'mensola' ? (a.x1 + a.x2) / 2 : a.x);

/* Genera appigli finché la cima non arriva ad almeno y. */
export function generaFino(p, y) {
  const L = FISICA.largo / 2;
  const caso = p.caso;
  while (p.cima < y) {
    const prec = p.ultimo;
    const h = prec.y;
    const gapMax = curva(CURVE.salto, h) - (prec.tipo === 'piolo' ? 0.25 : 0);
    const gap = gapMax * (0.72 + 0.28 * caso());
    const ny = prec.y + gap;
    const dxMax = curva(CURVE.dx, h);
    const piolo = caso() < curva(CURVE.pioli, h) && prec.tipo !== 'piolo';
    let a;
    // centro del nuovo: vicino al precedente, dentro i muri
    const cPrec = prec.isola ? (caso() - 0.5) * 3 : centro(prec);
    let cx = cPrec + (caso() * 2 - 1) * dxMax;
    if (piolo) {
      cx = cPrec + (caso() * 2 - 1) * Math.min(dxMax, 1.6);
      cx = Math.max(-L + 0.9, Math.min(L - 0.9, cx));
      a = { id: p.n++, tipo: 'piolo', x: cx, y: ny, r: 0.26, sicuro: true };
    } else {
      const w = curva(CURVE.largo, h) * (0.85 + 0.3 * caso());
      // dopo un piolo il bordo più vicino della mensola non è troppo di lato
      if (prec.tipo === 'piolo') cx = Math.max(prec.x - w / 2 - 1.2, Math.min(prec.x + w / 2 + 1.2, cx));
      cx = Math.max(-L + w / 2, Math.min(L - w / 2, cx));
      a = { id: p.n++, tipo: 'mensola', x1: cx - w / 2, x2: cx + w / 2, y: ny, spess: 0.5, sicuro: true };
    }
    p.appigli.push(a);
    // un appiglio in più, dall'altra parte, a metà strada
    if (caso() < curva(CURVE.extra, h) && !prec.isola) {
      const lato = cx > 0 ? -1 : 1;
      const ex = lato * (1.6 + caso() * (L - 2.2));
      const ey = (prec.y + ny) / 2 + (caso() - 0.5) * 0.6;
      if (Math.abs(ex - cx) > 2.4 && Math.abs(ex - centro(prec)) > 2.4) {
        if (caso() < 0.5) p.appigli.push({ id: p.n++, tipo: 'piolo', x: ex, y: ey, r: 0.26 });
        else {
          const w = 1 + caso() * 0.8;
          const x1 = Math.max(-L, Math.min(L - w, ex - w / 2));
          p.appigli.push({ id: p.n++, tipo: 'mensola', x1, x2: x1 + w, y: ey, spess: 0.45 });
        }
      }
    }
    p.ultimo = a;
    p.cima = ny;
  }
  p.appigli.sort((a, b) => a.y - b.y);
}

/* Toglie gli appigli ormai troppo in basso. */
export function pota(p, yMin) {
  p.appigli = p.appigli.filter((a) => a.y >= yMin || a === p.ultimo);
}
