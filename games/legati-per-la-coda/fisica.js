/*
 * Legati per la Coda: fisica (sul piano x-y, senza Three.js, si usa anche da node).
 * x verso destra (0 = centro della parete), y verso l'alto (0 = cima dell'isola di
 * partenza), 1 unità = 1 metro. Due corpi tondi (Tino e Gino) legati da un filo
 * elastico: oltre la lunghezza di riposo tira, oltre la lunghezza massima non cede.
 *
 * Stati di un corpo: 'terra' (appoggiato su una mensola: cammina da solo avanti e
 * indietro), 'presa' (aggrappato: fermo, fa da ancora), 'aria'.
 * Comando (un tasto a testa): premere = si aggrappa a ciò che tocca (se non tocca
 * niente si aggrappa appena tocca qualcosa); lasciare = si stacca (col filo teso e
 * l'altro aggrappato parte come da una fionda); tocco breve da appoggiato o
 * aggrappato = salto; tocco breve in aria = spinta (fa dondolare, poche per volo).
 */
export const FISICA = {
  passo: 1 / 240,
  g: 22,
  largo: 8,                      // tra i due muri
  tocco: 0.2,                    // sotto questa durata la pressione è un tocco
  presa: 0.08,                   // tolleranza per "tocca"
  cammina: 1.1,                  // passo dei personaggi sulle mensole
  attrito: 9,                    // quanto in fretta si torna al passo
  trascina: 5,                   // oltre questa spinta del filo si viene trascinati
  salto: { vy: 10.8, vx: 2.4, muro: 3.4, piolo: 0.9, tiraSu: 1.1 },
  filo: { riposo: 2.8, max: 4.6, k: 30, smorza: 1.5, strattone: 5 },
  fionda: { soglia: 0.25, base: 8, perStira: 10, max: 19 },
  spinta: { v: 2.6, pausa: 0.3, max: 3, libera: 1.6 },
  rimbalzo: { muro: 0.45, piolo: 0.3 },
  aria: 0.08,                    // attrito dell'aria (per secondo)
  vmax: 20,
};

export const CORPI = {
  tino: { r: 0.46, m: 1, alto: 1.3 },
  gino: { r: 0.36, m: 0.75, alto: 0.95 },
};

export function nuovoMondo(parete) {
  const isola = parete.appigli[0];
  const m = { t: 0, parete, corpi: [], eventi: [] };
  m.corpi.push(nuovoCorpo('tino', -0.9, isola, 1));
  m.corpi.push(nuovoCorpo('gino', 0.9, isola, -1));
  return m;
}

function nuovoCorpo(chi, x, su, verso) {
  const c = CORPI[chi];
  return {
    chi, r: c.r, m: c.m, x, y: su.y + c.r, vx: 0, vy: 0, verso,
    stato: 'terra', su, presa: null,
    premuto: false, tPremuto: 0, premutoDa: null, pronto: false,
    spinte: 0, tSpinta: -9, tStato: 0, ax: 0, ay: 0, ignora: null, fineIgnora: 0,
  };
}

export function copiaMondo(m) {
  return {
    t: m.t, parete: m.parete, eventi: [],
    corpi: m.corpi.map((c) => ({ ...c, presa: c.presa ? { ...c.presa } : null })),
  };
}

const evento = (m, tipo, c, info) => m.eventi.push({ tipo, chi: c ? c.chi : null, info });

/* ---------------------------------------------------------------- contatti */
function vicini(m, c, margine = 3) {
  const out = [];
  for (const a of m.parete.appigli) if (Math.abs(a.y - c.y) < margine + (a.spess || 0)) out.push(a);
  return out;
}
const MURO_SX = { tipo: 'muro', lato: -1 };
const MURO_DX = { tipo: 'muro', lato: 1 };

/* La prima cosa che il corpo tocca (o null). */
export function contatto(m, c) {
  const tol = FISICA.presa, L = FISICA.largo / 2;
  if (c.stato === 'terra' && c.su) return c.su;
  if (c.x - c.r <= -L + tol) return MURO_SX;
  if (c.x + c.r >= L - tol) return MURO_DX;
  for (const a of vicini(m, c)) {
    if (a.tipo === 'mensola') {
      if (c.x >= a.x1 - c.r * 0.7 && c.x <= a.x2 + c.r * 0.7 && c.y <= a.y + c.r + tol && c.y >= a.y - a.spess - c.r - tol) return a;
    } else if (a.tipo === 'piolo') {
      if (Math.hypot(c.x - a.x, c.y - a.y) <= c.r + a.r + tol) return a;
    }
  }
  return null;
}

function aggrappa(m, c, s) {
  c.stato = 'presa';
  c.presa = { cosa: s };
  c.su = null;
  c.vx = 0; c.vy = 0;
  c.pronto = false;
  c.spinte = 0;
  c.tStato = m.t;
  if (s.tipo === 'mensola' && c.y > s.y) c.y = s.y + c.r;
  if (s.tipo === 'piolo') {
    const d = Math.hypot(c.x - s.x, c.y - s.y) || 1;
    c.x = s.x + ((c.x - s.x) / d) * (s.r + c.r);
    c.y = s.y + ((c.y - s.y) / d) * (s.r + c.r);
  }
  if (s.tipo === 'muro') c.x = s.lato * (FISICA.largo / 2 - c.r);
  evento(m, 'presa', c, s.tipo);
}

function appoggia(m, c, s, vCaduta) {
  c.stato = 'terra';
  c.su = s;
  c.y = s.y + c.r;
  c.vy = 0;
  c.spinte = 0;
  c.tStato = m.t;
  evento(m, 'atterra', c, vCaduta);
}

/* ---------------------------------------------------------------- comandi */
export function premi(m, i, giu) {
  const c = m.corpi[i];
  if (giu === c.premuto) return;
  c.premuto = giu;
  if (giu) {
    c.tPremuto = m.t;
    c.premutoDa = c.stato;
    const s = contatto(m, c);
    if (s) aggrappa(m, c, s); else c.pronto = true;
    return;
  }
  const breve = m.t - c.tPremuto < FISICA.tocco;
  c.pronto = false;
  if (c.stato === 'presa') {
    const s = c.presa.cosa;
    stacca(m, c, s);
    if (breve) salta(m, c, s);
    else fionda(m, c);
  } else if (breve && c.stato === 'aria') spinta(m, c);
}

function stacca(m, c, s) {
  c.presa = null;
  c.tStato = m.t;
  if (s.tipo === 'mensola' && Math.abs(c.y - (s.y + c.r)) < 0.01) { c.stato = 'terra'; c.su = s; }
  else c.stato = 'aria';
}

function salta(m, c, s) {
  const S = FISICA.salto;
  c.stato = 'aria'; c.su = null;
  c.spinte = 0;
  if (s.tipo === 'muro') { c.vx = -s.lato * S.muro; c.vy = S.vy * 0.92; c.verso = -s.lato; }
  else if (s.tipo === 'piolo') {
    // ci si tira su e si salta oltre il piolo: per un attimo non lo si urta
    c.vx = c.verso * S.vx * S.piolo; c.vy = S.vy * S.tiraSu;
    c.ignora = s; c.fineIgnora = m.t + 0.35;
  }
  else { c.vx = c.verso * S.vx; c.vy = S.vy; }
  evento(m, 'salto', c, s.tipo);
}

function fionda(m, c) {
  const o = altro(m, c);
  const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy);
  const F = FISICA.fionda;
  const s = d - FISICA.filo.riposo;
  if (o.stato !== 'presa' || s < F.soglia) return;
  const v = Math.min(F.max, F.base + F.perStira * s);
  c.stato = 'aria'; c.su = null;
  c.vx = (dx / d) * v; c.vy = (dy / d) * v;
  c.spinte = 0;
  evento(m, 'fionda', c, s);
}

function spinta(m, c) {
  const P = FISICA.spinta;
  if (c.spinte >= P.max || m.t - c.tSpinta < P.pausa) return;
  c.spinte++;
  c.tSpinta = m.t;
  const o = altro(m, c);
  const dx = c.x - o.x, dy = c.y - o.y, d = Math.hypot(dx, dy) || 1;
  if (o.stato === 'presa' && d > FISICA.filo.riposo * 0.9) {
    // dondolo: spinta lungo la tangente, nel verso in cui si sta andando
    let tx = -dy / d, ty = dx / d;
    const dir = Math.abs(c.vx * tx + c.vy * ty) > 0.4 ? Math.sign(c.vx * tx + c.vy * ty) : Math.sign(tx * c.verso) || 1;
    c.vx += tx * dir * P.v; c.vy += ty * dir * P.v;
  } else {
    c.vx += c.verso * P.libera;
    c.vy = Math.max(c.vy, 0) + P.libera;
  }
  evento(m, 'spinta', c);
}

export const altro = (m, c) => (m.corpi[0] === c ? m.corpi[1] : m.corpi[0]);

/* Quanto è teso il filo (0 = a riposo o lento). */
export function stiramento(m) {
  const [a, b] = m.corpi;
  return Math.max(0, Math.hypot(b.x - a.x, b.y - a.y) - FISICA.filo.riposo);
}

/* ---------------------------------------------------------------- passo */
export function aggiorna(m, dt) {
  const n = Math.max(1, Math.round(dt / FISICA.passo));
  for (let i = 0; i < n; i++) passo(m, FISICA.passo);
}

export function passo(m, dt) {
  m.t += dt;
  const [A, B] = m.corpi;
  const Fi = FISICA.filo;
  // forza del filo
  let dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1e-6;
  let nx = dx / d, ny = dy / d, F = 0;
  if (d > Fi.riposo) {
    const vrel = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
    F = Math.max(0, Fi.k * (d - Fi.riposo) + Fi.smorza * vrel);
  }
  A.ax = (F * nx) / A.m; A.ay = (F * ny) / A.m - FISICA.g;
  B.ax = (-F * nx) / B.m; B.ay = (-F * ny) / B.m - FISICA.g;
  for (const c of m.corpi) muovi(m, c, dt);
  limitaFilo(m);
}

function muovi(m, c, dt) {
  if (c.stato === 'presa') { c.vx = 0; c.vy = 0; return; }
  if (c.stato === 'terra') return cammina(m, c, dt);
  // in aria
  c.vx += c.ax * dt; c.vy += c.ay * dt;
  const k = 1 - FISICA.aria * dt;
  c.vx *= k; c.vy *= k;
  const v = Math.hypot(c.vx, c.vy);
  if (v > FISICA.vmax) { c.vx *= FISICA.vmax / v; c.vy *= FISICA.vmax / v; }
  if (Math.abs(c.vx) > 0.6) c.verso = Math.sign(c.vx);
  const yPrima = c.y;
  c.x += c.vx * dt; c.y += c.vy * dt;
  urti(m, c, yPrima);
}

function cammina(m, c, dt) {
  const s = c.su;
  const ropeX = c.ax, ropeY = c.ay + FISICA.g;
  if (c.ay > 0.5) { c.stato = 'aria'; c.su = null; c.vy = c.ay * dt; return; }
  const trascinato = Math.abs(ropeX) > FISICA.trascina;
  // il filo teso tira dall'altra parte: si gira verso l'altro
  if (ropeX * c.verso < -1.5 && !trascinato) c.verso = -c.verso;
  const tgt = c.verso * FISICA.cammina;
  c.vx += (FISICA.attrito * (tgt - c.vx) + (trascinato ? ropeX : 0)) * dt;
  c.vy = 0;
  c.x += c.vx * dt;
  const L = FISICA.largo / 2;
  const a = Math.max(s.x1, -L + c.r), b = Math.min(s.x2, L - c.r);
  if (!trascinato) {
    if (c.x < a + 0.12 && c.verso < 0) { c.x = Math.max(c.x, a + 0.12); c.verso = 1; }
    if (c.x > b - 0.12 && c.verso > 0) { c.x = Math.min(c.x, b - 0.12); c.verso = -1; }
  }
  c.x = Math.max(-L + c.r, Math.min(L - c.r, c.x));
  if (c.x < s.x1 - c.r * 0.5 || c.x > s.x2 + c.r * 0.5) {
    c.stato = 'aria'; c.su = null; c.tStato = m.t;
    evento(m, 'scivola', c);
  }
  void ropeY;
}

function urti(m, c, yPrima) {
  const L = FISICA.largo / 2;
  // muri
  if (c.x - c.r < -L) {
    if (c.pronto) return aggrappa(m, c, MURO_SX);
    c.x = -L + c.r; c.vx = Math.abs(c.vx) * FISICA.rimbalzo.muro; evento(m, 'cuscino', c);
  } else if (c.x + c.r > L) {
    if (c.pronto) return aggrappa(m, c, MURO_DX);
    c.x = L - c.r; c.vx = -Math.abs(c.vx) * FISICA.rimbalzo.muro; evento(m, 'cuscino', c);
  }
  for (const a of vicini(m, c)) {
    if (a.tipo === 'mensola') {
      const dentroX = c.x >= a.x1 - c.r * 0.4 && c.x <= a.x2 + c.r * 0.4;
      if (c.vy <= 0 && dentroX && yPrima - c.r >= a.y - 0.03 && c.y - c.r < a.y) {
        if (c.pronto) { c.y = a.y + c.r; return aggrappa(m, c, a); }
        const v = -c.vy;
        return appoggia(m, c, a, v);
      }
      if (c.pronto && c.x >= a.x1 - c.r * 0.7 && c.x <= a.x2 + c.r * 0.7 && c.y < a.y + c.r && c.y > a.y - a.spess - c.r) return aggrappa(m, c, a);
    } else if (a.tipo === 'piolo') {
      if (a === c.ignora && m.t < c.fineIgnora) continue;
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), min = c.r + a.r;
      if (d < min) {
        if (c.pronto) return aggrappa(m, c, a);
        const nx = dx / (d || 1), ny = dy / (d || 1);
        c.x = a.x + nx * min; c.y = a.y + ny * min;
        const vn = c.vx * nx + c.vy * ny;
        if (vn < 0) { c.vx -= (1 + FISICA.rimbalzo.piolo) * vn * nx; c.vy -= (1 + FISICA.rimbalzo.piolo) * vn * ny; }
        if (-vn > 2) evento(m, 'piolo', c, -vn);
      }
    }
  }
}

/* Oltre la lunghezza massima il filo non cede: riporta i corpi e toglie la velocità
 * che li allontana (strattone). */
function limitaFilo(m) {
  const [A, B] = m.corpi;
  const max = FISICA.filo.max;
  const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
  if (d <= max) return;
  const nx = dx / d, ny = dy / d, ecc = d - max;
  const la = A.stato === 'aria', lb = B.stato === 'aria';
  const wa = la ? (lb ? B.m / (A.m + B.m) : 1) : 0;
  const wb = lb ? (la ? A.m / (A.m + B.m) : 1) : 0;
  if (wa + wb === 0) return;   // nessuno dei due in aria: il filo resta così
  A.x += nx * ecc * wa; A.y += ny * ecc * wa;
  B.x -= nx * ecc * wb; B.y -= ny * ecc * wb;
  const vrel = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
  if (vrel > 0) {
    A.vx += nx * vrel * wa; A.vy += ny * vrel * wa;
    B.vx -= nx * vrel * wb; B.vy -= ny * vrel * wb;
    if (vrel > FISICA.filo.strattone) evento(m, 'strattone', wa > wb ? A : B, vrel);
  }
}
