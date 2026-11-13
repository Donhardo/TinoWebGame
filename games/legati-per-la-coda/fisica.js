/*
 * Legati per la Coda: fisica (sul piano x-y, senza Three.js, si usa anche da node).
 * x verso destra (0 = centro della parete, muri a ±5), y verso l'alto (0 = cima
 * dell'isola di partenza), 1 unità = 1 metro.
 *
 * Una regola sola per tasto: premuto = si tiene, lasciato = si lascia.
 * - Chi tiene (stato 'presa') è fermo e fa da perno.
 * - Chi non tiene ed è appeso al filo dondola da solo, ogni volta più in alto
 *   (`dondolo`: il filo fa da asta, l'ampiezza cresce fino a DONDOLO.ampiezza).
 * - Premendo il tasto di chi dondola o cade, si aggrappa al primo appiglio che tocca
 *   (pioli e sbarre; se lo tocca già, subito).
 * - Se nessuno dei due tiene, cadono tutti e due (il filo li tiene insieme).
 * - Sull'isola di partenza si saltella da soli (premendo, si prende la prima sbarra
 *   appena la si tocca). Se l'altro tiene in alto, chi è sull'isola si lascia penzolare.
 */
export const FISICA = {
  passo: 1 / 240,
  g: 22,
  largo: 10,                       // tra i due muri
  presa: 0.32,                     // quanto lontano si arriva ad aggrapparsi
  filo: 2.3,                       // lunghezza del filo
  saltello: { vy: 11.2, ogni: 1.1, prima: 0.6 },
  rimbalzo: 0.92,                  // contro i muri di cuscini e l'isola mentre si dondola
  strattone: 5,                    // velocità oltre la quale il filo dà uno strattone
  vmax: 20,
};

export const DONDOLO = {
  spinta: 4.5,                     // accelerazione lungo il giro (m/s²)
  partenza: 1.3,                   // velocità (rad/s) con cui parte quando il filo si tende da fermo
  ampiezza: 2.8,                   // angolo massimo dal basso (rad, ~160°)
};

export const CORPI = {
  tino: { r: 0.46, m: 1, alto: 1.3 },
  gino: { r: 0.36, m: 0.75, alto: 0.95 },
};

export function nuovoMondo(parete) {
  const m = { t: 0, parete, corpi: [], eventi: [] };
  const T = nuovoCorpo('tino', -0.8, CORPI.tino.r);
  const G = nuovoCorpo('gino', 0.8, CORPI.gino.r);
  T.stato = 'terra'; G.stato = 'terra';
  G.tTerra = -0.55;   // non saltellano insieme
  m.corpi.push(T, G);
  return m;
}

function nuovoCorpo(chi, x, y) {
  const c = CORPI[chi];
  return {
    chi, r: c.r, m: c.m, x, y, vx: 0, vy: 0, verso: 1,
    stato: 'libero', presa: null, premuto: false, pronto: false,
    dondolo: false, th: 0, om: 0, tTerra: 0, tStato: 0,
  };
}

export const centro = (a) => (a.tipo === 'sbarra' ? (a.x1 + a.x2) / 2 : a.x);
export const altro = (m, c) => (m.corpi[0] === c ? m.corpi[1] : m.corpi[0]);
const evento = (m, tipo, c, info) => m.eventi.push({ tipo, chi: c ? c.chi : null, info });

export function copiaMondo(m) {
  return { t: m.t, parete: m.parete, eventi: [], corpi: m.corpi.map((c) => ({ ...c, presa: c.presa ? { ...c.presa } : null })) };
}

/* ---------------------------------------------------------------- appigli */
/* Distanza dal centro del corpo all'appiglio (bordo). */
export function distanza(c, a) {
  if (a.tipo === 'piolo') return Math.hypot(c.x - a.x, c.y - a.y) - a.r;
  if (a.tipo === 'sbarra') {
    const x = Math.max(a.x1, Math.min(a.x2, c.x));
    return Math.hypot(c.x - x, c.y - a.y) - a.r;
  }
  return Infinity;
}

/* Quanto in alto è il perno: l'appiglio a cui si tiene l'altro (-Infinity se non tiene). */
export function perno(o) {
  return o.stato === 'presa' ? o.presa.cosa.y : -Infinity;
}

/* L'appiglio a portata di mano (se ce n'è più d'uno, il più alto), o null. Se l'altro
 * tiene, conta solo quello che sta più in alto del suo: si sale sempre. */
export function aPortata(m, c) {
  let best = null;
  const min = perno(altro(m, c)) + 0.3;
  for (const a of m.parete.appigli) {
    if (a.isola || a.y <= min || Math.abs(a.y - c.y) > 4) continue;
    if (distanza(c, a) < c.r + FISICA.presa && (!best || a.y > best.y)) best = a;
  }
  return best;
}

function sullIsola(m, c) {
  return c.y - c.r <= 0.02 && Math.abs(c.x) <= FISICA.largo / 2;
}

function aggrappa(m, c, a) {
  c.stato = 'presa';
  c.presa = { cosa: a };
  c.dondolo = false;
  c.pronto = false;
  c.vx = 0; c.vy = 0;
  c.tStato = m.t;
  // si avvicina un poco all'appiglio (resta dalla parte da cui è arrivato)
  if (a.tipo !== 'isola') {
    const px = a.tipo === 'sbarra' ? Math.max(a.x1, Math.min(a.x2, c.x)) : a.x;
    const dx = c.x - px, dy = c.y - a.y, d = Math.hypot(dx, dy) || 1;
    const dd = a.r + c.r * 0.55;
    if (d > dd) { c.x = px + (dx / d) * dd; c.y = a.y + (dy / d) * dd; }
  }
  evento(m, 'presa', c, a.tipo);
  // chi era appeso all'altro continua a dondolare attorno al nuovo perno
  const o = altro(m, c);
  if (o.stato === 'libero') o.dondolo = false;
}

/* ---------------------------------------------------------------- comandi */
export function premi(m, i, giu) {
  const c = m.corpi[i];
  if (giu === c.premuto) return;
  c.premuto = giu;
  if (giu) {
    if (c.stato === 'presa') return;
    const a = c.stato === 'libero' ? aPortata(m, c) : null;
    if (a) aggrappa(m, c, a); else c.pronto = true;
    return;
  }
  c.pronto = false;
  if (c.stato !== 'presa') return;
  c.presa = null;
  c.tStato = m.t;
  c.stato = 'libero';
  evento(m, 'lascia', c);
  // chi dondolava attorno a lui adesso vola via con la velocità che aveva
  const o = altro(m, c);
  if (o.dondolo) o.dondolo = false;
}

/* Quanto è teso il filo (0 = lento, 1 = alla lunghezza piena). */
export function tensione(m) {
  const [a, b] = m.corpi;
  return Math.min(1, Math.hypot(b.x - a.x, b.y - a.y) / FISICA.filo);
}

/* ---------------------------------------------------------------- passo */
export function aggiorna(m, dt) {
  const n = Math.max(1, Math.round(dt / FISICA.passo));
  for (let i = 0; i < n; i++) passo(m, FISICA.passo);
}

export function passo(m, dt) {
  m.t += dt;
  for (const c of m.corpi) muovi(m, c, dt);
  limitaFilo(m);
}

function muovi(m, c, dt) {
  if (c.stato === 'presa') return;
  const o = altro(m, c);
  if (c.stato === 'terra') return saltella(m, c, o);
  if (c.dondolo) {
    if (o.stato !== 'presa') { c.dondolo = false; }
    else { dondola(m, c, o, dt); return prova(m, c); }
  }
  // volo libero
  c.vy -= FISICA.g * dt;
  const v = Math.hypot(c.vx, c.vy);
  if (v > FISICA.vmax) { c.vx *= FISICA.vmax / v; c.vy *= FISICA.vmax / v; }
  c.x += c.vx * dt; c.y += c.vy * dt;
  if (Math.abs(c.vx) > 0.5) c.verso = Math.sign(c.vx);
  const L = FISICA.largo / 2;
  if (c.x - c.r < -L) { c.x = -L + c.r; c.vx = Math.abs(c.vx) * FISICA.rimbalzo; evento(m, 'cuscino', c); }
  if (c.x + c.r > L) { c.x = L - c.r; c.vx = -Math.abs(c.vx) * FISICA.rimbalzo; evento(m, 'cuscino', c); }
  if (c.vy < 0 && sullIsola(m, c)) {
    c.y = c.r; c.vy = 0; c.vx = 0;
    c.stato = 'terra'; c.tTerra = m.t;
    evento(m, 'atterra', c);
    return;
  }
  // il filo si tende con l'altro aggrappato: comincia il dondolo
  if (o.stato === 'presa') {
    const dx = c.x - o.x, dy = c.y - o.y, d = Math.hypot(dx, dy);
    if (d >= FISICA.filo) {
      const th = Math.atan2(dx, -dy);
      const tx = Math.cos(th), ty = Math.sin(th);
      const vt = c.vx * tx + c.vy * ty;
      const vr = c.vx * Math.sin(th) - c.vy * Math.cos(th);
      if (vr > FISICA.strattone) evento(m, 'strattone', c, vr);
      c.dondolo = true; c.th = th; c.om = vt / FISICA.filo;
      // da fermo parte con una piccola spinta, verso l'appiglio dopo
      if (Math.abs(c.om) < DONDOLO.partenza) c.om = DONDOLO.partenza * versoSpinta(m, c, o);
      aggiornaDondolo(m, c, o, 0);
    }
  }
  prova(m, c);
}

/* Se il tasto è premuto, si aggrappa appena tocca un appiglio. */
function prova(m, c) {
  if (!c.pronto) return;
  const a = aPortata(m, c);
  if (a) aggrappa(m, c, a);
}

/* Sull'isola chi non tiene saltella; se l'altro tiene in alto, si lascia penzolare. */
function saltella(m, c, o) {
  c.vx = 0; c.vy = 0; c.y = c.r;
  const S = FISICA.saltello;
  if (m.t - c.tTerra < S.prima) return;
  const appeso = o.stato === 'presa' && o.y > c.y + 0.5;
  if (appeso || m.t - c.tTerra >= S.ogni) {
    c.stato = 'libero';
    c.vy = S.vy;
    c.vx = appeso ? Math.sign(o.x - c.x || 1) * 1.2 : 0;
    c.tTerra = m.t;
    evento(m, 'saltello', c);
  }
}

/* Il dondolo: un pendolo che si spinge da solo fino all'ampiezza massima. */
function dondola(m, c, o, dt) {
  const L = FISICA.filo, g = FISICA.g, D = DONDOLO;
  const Emax = g * L * (1 - Math.cos(D.ampiezza));
  const E = 0.5 * (L * c.om) ** 2 + g * L * (1 - Math.cos(c.th));
  let a = -(g / L) * Math.sin(c.th);
  if (E < Emax) {
    let dir = Math.sign(c.om);
    if (Math.abs(c.om) < 0.05) dir = versoSpinta(m, c, o);
    a += (D.spinta / L) * dir;
  } else if (E > Emax * 1.03) a -= c.om * 0.6;     // oltre il massimo si calma
  c.om += a * dt;
  c.th += c.om * dt;
  aggiornaDondolo(m, c, o, dt);
  // muri e isola fermano il dondolo e lo rimandano indietro
  const Lm = FISICA.largo / 2;
  const muro = c.x - c.r < -Lm || c.x + c.r > Lm;
  if (muro || (c.y - c.r < 0 && Math.abs(c.x) <= Lm)) {
    c.th -= c.om * dt;
    c.om = -c.om * FISICA.rimbalzo;
    aggiornaDondolo(m, c, o, dt);
    evento(m, 'cuscino', c);
  }
}

/* Da fermo si comincia a dondolare verso l'appiglio più alto vicino, o verso il centro. */
function versoSpinta(m, c, o) {
  let best = null;
  for (const a of m.parete.appigli) {
    if (a.isola || a.y <= o.y + 0.3 || a.y > o.y + 4) continue;
    if (!best || a.y < best.y) best = a;
  }
  const x = best ? centro(best) : 0;
  return Math.sign(x - c.x) || (c.x > 0 ? -1 : 1);
}

export function aggiornaDondolo(m, c, o) {
  const L = FISICA.filo;
  c.x = o.x + L * Math.sin(c.th);
  c.y = o.y - L * Math.cos(c.th);
  c.vx = L * c.om * Math.cos(c.th);
  c.vy = L * c.om * Math.sin(c.th);
  if (Math.abs(c.vx) > 0.5) c.verso = Math.sign(c.vx);
}

/* Tra due corpi liberi (o uno libero e uno a terra) il filo non si allunga. */
function limitaFilo(m) {
  const [A, B] = m.corpi;
  if (A.dondolo || B.dondolo) return;
  const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
  if (d <= FISICA.filo) return;
  const la = A.stato === 'libero', lb = B.stato === 'libero';
  if (!la && !lb) return;
  const wa = la ? (lb ? B.m / (A.m + B.m) : 1) : 0;
  const wb = lb ? (la ? A.m / (A.m + B.m) : 1) : 0;
  const nx = dx / d, ny = dy / d, ecc = d - FISICA.filo;
  A.x += nx * ecc * wa; A.y += ny * ecc * wa;
  B.x -= nx * ecc * wb; B.y -= ny * ecc * wb;
  const vrel = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
  if (vrel > 0) {
    A.vx += nx * vrel * wa; A.vy += ny * vrel * wa;
    B.vx -= nx * vrel * wb; B.vy -= ny * vrel * wb;
    if (vrel > FISICA.strattone) evento(m, 'strattone', wa > wb ? A : B, vrel);
  }
}
