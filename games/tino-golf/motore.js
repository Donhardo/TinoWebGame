/*
 * Tino Golf: motore della pallina.
 * Nessuna dipendenza (niente Three.js): lo usano il gioco, il computer (Gino)
 * e le prove automatiche, quindi danno tutti lo stesso risultato.
 *
 * Coordinate: x verso destra, z verso chi guarda (le buche vanno verso -z),
 * y verso l'alto. 1 unità ≈ un passo di Tino. La y della pallina è il punto in
 * cui tocca terra (il centro è y + R).
 *
 * Il campo è fatto di "blocchi": prismi con un contorno (poligono), un fondo e
 * una cima piana, inclinata (rampa) o che sale e scende (ascensore). I lati di
 * un blocco fanno da muro per chi sta più in basso; dove non c'è un blocco sotto
 * la pallina cade. Le sponde sono tubi morbidi lungo i bordi.
 */

export const FISICA = {
  dt: 1 / 120,
  g: 9.8,
  rotolo: 5 / 7,          // una palla che rotola accelera sui pendii 5/7 di un corpo che scivola
  R: 0.13,                // raggio della pallina
  attrito: { erba: 0.11, legno: 0.09, sabbia: 0.62, miele: 4.5 },
  viscoso: 0.11,          // frenata proporzionale alla velocità
  gradino: 0.07,          // salto di quota che si supera da soli
  vmax: 8.6,              // velocità del tiro più forte
  fermo: 0.055,           // sotto questa velocità la pallina si ferma (se il pendio lo permette)
  sponda: { r: 0.17, rimbalzo: 0.7 },
  bordo: 0.5,             // rimbalzo contro il lato di un blocco
  palo: 0.72,
  fungo: { rimbalzo: 1.0, spinta: 1.4 },
  buca: { r: 0.24, vmax: 2.7, attira: 2.4, alone: 0.2 },
  atterra: { rimbalzo: 0.35, soglia: 2.0, frena: 0.9 },
  tele: { r: 0.3, minimo: 1.8, pausa: 0.5 },
  molla: { r: 0.4 },
  campana: { chiusa: 0.28, alta: 0.9, chiude: 0.2, apre: 0.4, sputa: 3.2 },
  durataMax: 24,
};

const F = FISICA;

/* ---------- utilità ---------- */

export const dirDa = (a) => ({ x: -Math.sin(a), z: -Math.cos(a) });
export const angDa = (x, z) => Math.atan2(-x, -z);

function dentroPoligono(p, x, z) {
  let dentro = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const xi = p[i][0], zi = p[i][1], xj = p[j][0], zj = p[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

function areaSegno(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

const liscio = (u) => u * u * (3 - 2 * u);

/* ---------- elementi che si muovono (funzioni pure del tempo) ---------- */

export function altAscensore(a, t) {
  const T = 2 * (a.attesa + a.corsa);
  let u = (t + (a.fase || 0)) % T;
  if (u < 0) u += T;
  if (u < a.attesa) return a.giu;
  u -= a.attesa;
  if (u < a.corsa) return a.giu + (a.su - a.giu) * liscio(u / a.corsa);
  u -= a.corsa;
  if (u < a.attesa) return a.su;
  u -= a.attesa;
  return a.su + (a.giu - a.su) * liscio(u / a.corsa);
}

/* Altezza del bordo della campana sopra il prato: 0 = chiusa. */
export function altCampana(c, t) {
  const C = F.campana;
  let u = (t + (c.fase || 0)) % c.ciclo;
  if (u < 0) u += c.ciclo;
  const aperta = c.ciclo - c.giu - C.chiude - C.apre;
  if (u < aperta) return C.alta;
  u -= aperta;
  if (u < C.chiude) return C.alta * (1 - u / C.chiude) ** 2;
  u -= C.chiude;
  if (u < c.giu) return 0;
  u -= c.giu;
  return C.alta * liscio(u / C.apre);
}

export function angGirandola(g, t) {
  return (g.fase || 0) + g.vel * t;
}

/* ---------- costruzione del mondo ---------- */

function nuovoBlocco(d, i) {
  const p = d.p.map((q) => [q[0], q[1]]);
  const orario = areaSegno(p) < 0;
  const b = {
    i, p, d,
    mat: d.mat || 'erba',
    base: d.base,
    h: d.h || 0,
    gx: 0, gz: 0, cx: 0, cz: 0,
    asc: d.ascensore || null,
    lati: [],
    minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity,
  };
  if (d.rampa) {
    const [[x1, z1, h1], [x2, z2, h2]] = d.rampa;
    const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz;
    b.h = h1; b.cx = x1; b.cz = z1;
    b.gx = ((h2 - h1) * dx) / l2; b.gz = ((h2 - h1) * dz) / l2;
  }
  for (const [x, z] of p) {
    b.minX = Math.min(b.minX, x); b.maxX = Math.max(b.maxX, x);
    b.minZ = Math.min(b.minZ, z); b.maxZ = Math.max(b.maxZ, z);
  }
  for (let k = 0; k < p.length; k++) {
    const [ax, az] = p[k], [bx, bz] = p[(k + 1) % p.length];
    const lx = bx - ax, lz = bz - az, len = Math.hypot(lx, lz);
    // normale verso l'esterno
    let nx = lz / len, nz = -lx / len;
    if (orario) { nx = -nx; nz = -nz; }
    b.lati.push({ ax, az, bx, bz, nx, nz, len, aperto: (d.aperti || []).includes(k) });
  }
  if (b.base === undefined) b.base = Math.min(...p.map(([x, z]) => cima(b, x, z, 0))) - 0.7;
  return b;
}

export function cima(b, x, z, t) {
  if (b.asc) return altAscensore(b.asc, t);
  return b.h + b.gx * (x - b.cx) + b.gz * (z - b.cz);
}

/* Linea della sponda spostata verso l'interno del raggio del tubo. Restituisce
 * catene di punti [x, z] (una per ogni tratto di lati chiusi di fila). */
export function lineeSponde(b, r = F.sponda.r) {
  const L = b.lati, n = L.length;
  const linea = (l, off) => ({ px: l.ax - l.nx * off, pz: l.az - l.nz * off, dx: (l.bx - l.ax) / l.len, dz: (l.bz - l.az) / l.len });
  const incrocio = (A, B) => {
    const den = A.dx * B.dz - A.dz * B.dx;
    if (Math.abs(den) < 1e-9) return [B.px, B.pz];
    const s = ((B.px - A.px) * B.dz - (B.pz - A.pz) * B.dx) / den;
    return [A.px + A.dx * s, A.pz + A.dz * s];
  };
  // vertice k = inizio del lato k (fra il lato k-1 e il lato k)
  const vertice = (k) => {
    const prima = L[(k - 1 + n) % n], dopo = L[k];
    const A = linea(prima, prima.aperto ? 0 : r), B = linea(dopo, dopo.aperto ? 0 : r);
    return incrocio(A, B);
  };
  const catene = [];
  if (L.every((l) => !l.aperto)) {
    const c = [];
    for (let k = 0; k < n; k++) c.push(vertice(k));
    c.push(c[0]);
    catene.push({ punti: c, chiusa: true });
    return catene;
  }
  let k0 = L.findIndex((l) => l.aperto);
  for (let s = 1; s <= n; s++) {
    const k = (k0 + s) % n;
    if (L[k].aperto) continue;
    if (!L[(k - 1 + n) % n].aperto) continue; // non è l'inizio di un tratto
    const c = [vertice(k)];
    let j = k;
    while (!L[j].aperto) { j = (j + 1) % n; c.push(vertice(j)); if (j === k) break; }
    catene.push({ punti: c, chiusa: false });
  }
  return catene;
}

/* Spigoli arrotondati: campiona la catena con archi negli angoli. */
export function arrotonda(punti, chiusa, rc = 0.32, passi = 5) {
  const out = [];
  const n = punti.length;
  const fine = chiusa ? n - 1 : n;
  for (let i = 0; i < fine; i++) {
    const P = punti[i];
    const interno = chiusa || (i > 0 && i < n - 1);
    if (!interno) { out.push(P); continue; }
    const A = punti[(i - 1 + (chiusa ? n - 1 : n)) % (chiusa ? n - 1 : n)];
    const B = punti[(i + 1) % (chiusa ? n - 1 : n)];
    const la = Math.hypot(A[0] - P[0], A[1] - P[1]), lb = Math.hypot(B[0] - P[0], B[1] - P[1]);
    const r = Math.min(rc, la * 0.45, lb * 0.45);
    const p1 = [P[0] + ((A[0] - P[0]) / la) * r, P[1] + ((A[1] - P[1]) / la) * r];
    const p2 = [P[0] + ((B[0] - P[0]) / lb) * r, P[1] + ((B[1] - P[1]) / lb) * r];
    for (let s = 0; s <= passi; s++) {
      const u = s / passi, v = 1 - u;
      out.push([v * v * p1[0] + 2 * u * v * P[0] + u * u * p2[0], v * v * p1[1] + 2 * u * v * P[1] + u * u * p2[1]]);
    }
  }
  if (chiusa) out.push(out[0]);
  return out;
}

export function creaMondo(campo) {
  const m = {
    campo,
    blocchi: campo.blocchi.map(nuovoBlocco),
    sponde: [],
    pali: [],
    girandole: [],
    zone: [],
    campane: [],
    tele: [],
    molle: [],
    buca: null,
    fondo: 0,
    catena: [],
  };
  // sponde: segmenti dei tubi, con la quota presa dal blocco
  for (const b of m.blocchi) {
    if (b.d.sponde === false) continue;
    for (const c of lineeSponde(b)) {
      const pts = arrotonda(c.punti, c.chiusa);
      for (let k = 0; k + 1 < pts.length; k++) {
        const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
        if (Math.hypot(bx - ax, bz - az) < 1e-6) continue;
        m.sponde.push({
          b, ax, az, bx, bz,
          minX: Math.min(ax, bx) - 0.5, maxX: Math.max(ax, bx) + 0.5,
          minZ: Math.min(az, bz) - 0.5, maxZ: Math.max(az, bz) + 0.5,
        });
      }
      b.catene = b.catene || [];
      b.catene.push({ punti: pts, chiusa: c.chiusa });
    }
  }
  for (const o of campo.ostacoli || []) {
    if (o.t === 'palo' || o.t === 'fungo') {
      const s = supporto(m, o.x, o.z, 99, 0);
      m.pali.push({ ...o, y: s ? s.h : 0, alto: o.alto || 0.5, rimbalzo: o.t === 'fungo' ? F.fungo.rimbalzo : F.palo });
    } else if (o.t === 'girandola') {
      const s = supporto(m, o.x, o.z, 99, 0);
      m.girandole.push({ bracci: 3, lungo: 0.9, largo: 0.11, vel: 1.1, ...o, y: s ? s.h : 0 });
    }
  }
  for (const z of campo.zone || []) {
    const s = supporto(m, z.x, z.z, 99, 0);
    m.zone.push({ rz: z.rx, ...z, y: s ? s.h : 0 });
  }
  for (const c of campo.campane || []) {
    const s = supporto(m, c.x, c.z, 99, 0);
    m.campane.push({ r: 0.5, ciclo: 3.4, giu: 1.1, ...c, y: s ? s.h : 0 });
  }
  for (const t of campo.tele || []) {
    const sa = supporto(m, t.a[0], t.a[1], 99, 0), sb = supporto(m, t.b[0], t.b[1], 99, 0);
    m.tele.push({ ...t, ya: sa ? sa.h : 0, yb: sb ? sb.h : 0, d: dirDa(t.dir) });
  }
  for (const o of campo.molle || []) {
    const s = supporto(m, o.x, o.z, 99, 0);
    m.molle.push({ salto: 5.2, ...o, y: s ? s.h : 0 });
  }
  {
    const [x, z] = campo.buca;
    const s = supporto(m, x, z, 99, 0);
    m.buca = { x, z, y: s ? s.h : 0 };
  }
  m.fondo = Math.min(...m.blocchi.map((b) => b.base)) - 1.2;
  // catena per il computer: distanza che resta fino alla buca
  const C = campo.ia || [];
  let resto = 0;
  const seg = [];
  for (let i = C.length - 2; i >= 0; i--) {
    const [ax, ay, az] = C[i], [bx, by, bz] = C[i + 1];
    const salto = !!(C[i + 1][3] && C[i + 1][3].salto);
    const len = salto ? 0 : Math.hypot(bx - ax, (by - ay) * 4, bz - az);
    seg.unshift({ ax, ay, az, bx, by, bz, resto, salto });
    resto += len;
  }
  m.catena = seg;
  return m;
}

/* La cima più alta sotto la pallina, che si raggiunge da y (con il gradino). */
export function supporto(m, x, z, y, t) {
  let best = null, bh = -Infinity;
  for (const b of m.blocchi) {
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    if (!dentroPoligono(b.p, x, z)) continue;
    const h = cima(b, x, z, t);
    if (h <= y + F.gradino && h > bh) { bh = h; best = b; }
  }
  return best ? { h: bh, b: best } : null;
}

/* ---------- la pallina ---------- */

export function nuovaPalla(m, x, z, t = 0) {
  const s = supporto(m, x, z, 99, t);
  return {
    x, y: s ? s.h : 0, z, vx: 0, vy: 0, vz: 0, t,
    aria: false, fermo: true, esito: null,
    presa: -1, dirPresa: null, tc: 0, labbro: false,
    miele: false, da: { x, z }, sponde: 0, viaggio: 0,
  };
}

export function copiaPalla(b) {
  return { ...b, da: { ...b.da }, dirPresa: b.dirPresa ? { ...b.dirPresa } : null };
}

/* Tiro: angolo (vedi dirDa) e potenza 0..1. */
export function tira(b, ang, pot) {
  const v = F.vmax * Math.max(0, Math.min(1, pot)) * (b.miele ? 0.5 : 1);
  const d = dirDa(ang);
  b.vx = d.x * v; b.vz = d.z * v; b.vy = 0;
  b.fermo = false; b.esito = null; b.miele = false;
  b.da = { x: b.x, z: b.z };
  b.sponde = 0; b.viaggio = 0; b.labbro = false;
}

function urtaSegmento(b, ax, ay, az, bx, by, bz, r, e, ev, vxS = 0, vzS = 0) {
  const R = F.R;
  const sx = bx - ax, sz = bz - az, l2 = sx * sx + sz * sz;
  let u = l2 > 0 ? ((b.x - ax) * sx + (b.z - az) * sz) / l2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const qx = ax + sx * u, qz = az + sz * u, qy = ay + (by - ay) * u;
  const dx = b.x - qx, dz = b.z - qz, dy = b.y + R - qy;
  const d2 = dx * dx + dz * dz + dy * dy, lim = R + r;
  if (d2 >= lim * lim) return false;
  const d = Math.sqrt(d2) || 1e-6;
  let nx = dx / d, ny = dy / d, nz = dz / d;
  if (!b.aria) { // a terra l'urto è di lato
    const h = Math.hypot(nx, nz) || 1;
    nx /= h; nz /= h; ny = 0;
    if (Math.hypot(dx, dz) < 1e-6) { nx = 1; nz = 0; }
  }
  const pen = lim - d;
  b.x += nx * pen; b.z += nz * pen;
  if (b.aria) b.y += ny * pen;
  const rvx = b.vx - vxS, rvz = b.vz - vzS;
  const vn = rvx * nx + b.vy * ny + rvz * nz;
  if (vn < 0) {
    b.vx -= (1 + e) * vn * nx;
    b.vz -= (1 + e) * vn * nz;
    if (b.aria) b.vy -= (1 + e) * vn * ny;
    b.sponde++;
    if (ev && vn < -0.4) ev('sponda', { v: -vn, x: b.x, y: b.y, z: b.z });
  }
  return true;
}

function urtaCilindro(b, cx, cz, r, e, ev, tipo, spinta = 0) {
  const R = F.R;
  const dx = b.x - cx, dz = b.z - cz, d = Math.hypot(dx, dz), lim = r + R;
  if (d >= lim) return;
  const nx = d > 1e-6 ? dx / d : 1, nz = d > 1e-6 ? dz / d : 0;
  b.x = cx + nx * lim; b.z = cz + nz * lim;
  const vn = b.vx * nx + b.vz * nz;
  if (vn < 0) {
    b.vx -= (1 + e) * vn * nx; b.vz -= (1 + e) * vn * nz;
    if (spinta) { b.vx += nx * spinta; b.vz += nz * spinta; }
    b.sponde++;
    if (ev && vn < -0.3) ev(tipo, { v: -vn, x: b.x, y: b.y, z: b.z });
  }
}

/* Un passo di fisica. ev(tipo, info) riceve i fatti (suoni, effetti), oppure null. */
export function passo(m, b, ev) {
  const dt = F.dt, g = F.g, R = F.R;
  b.t += dt;
  const t = b.t;

  // trattenuta da una campana
  if (b.presa >= 0) {
    const c = m.campane[b.presa];
    if (altCampana(c, t) > F.campana.chiusa) {
      let dx = b.da.x - b.x, dz = b.da.z - b.z;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      b.vx = dx * F.campana.sputa; b.vz = dz * F.campana.sputa;
      b.presa = -1; b.fermo = false;
      if (ev) ev('sputa', { x: b.x, y: b.y, z: b.z });
    } else {
      b.vx = b.vz = b.vy = 0;
      return;
    }
  }

  const x0 = b.x, z0 = b.z;
  let s = supporto(m, b.x, b.z, b.y, t);
  if (!b.aria && (!s || s.h < b.y - 0.04)) b.aria = true;

  if (b.aria) {
    b.vy -= g * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    s = supporto(m, b.x, b.z, b.y, t);
    if (s && b.y <= s.h) {
      b.y = s.h;
      if (b.vy < -F.atterra.soglia) {
        b.vy = -b.vy * F.atterra.rimbalzo;
        b.vx *= F.atterra.frena; b.vz *= F.atterra.frena;
        b.y += 0.001;
        if (ev) ev('rimbalzo', { v: -b.vy, x: b.x, y: b.y, z: b.z });
      } else {
        if (ev && b.vy < -0.8) ev('atterra', { v: -b.vy, x: b.x, y: b.y, z: b.z });
        b.vy = 0; b.aria = false;
      }
    }
  } else {
    const blk = s.b;
    let gx = blk.gx, gz = blk.gz;
    if (blk.asc) { gx = 0; gz = 0; }
    let mat = blk.mat;
    let inMiele = false;
    for (const zn of m.zone) {
      if (Math.abs(zn.y - b.y) > 0.12) continue;
      const u = (b.x - zn.x) / zn.rx, w = (b.z - zn.z) / zn.rz;
      if (u * u + w * w < 1) {
        if (zn.t === 'acqua') { b.esito = 'acqua'; b.vx = b.vz = 0; if (ev) ev('acqua', { x: b.x, y: b.y, z: b.z }); return; }
        mat = zn.t;
        if (zn.t === 'miele') inMiele = true;
      }
    }
    const ax = -g * F.rotolo * gx, az = -g * F.rotolo * gz;
    const mu = F.attrito[mat] ?? F.attrito.erba;
    b.vx += ax * dt; b.vz += az * dt;
    let v = Math.hypot(b.vx, b.vz);
    const frena = (mu * g + F.viscoso * v) * dt;
    if (v <= frena) { b.vx = 0; b.vz = 0; v = 0; } else { b.vx *= (v - frena) / v; b.vz *= (v - frena) / v; v -= frena; }
    if (v < F.fermo && Math.hypot(ax, az) < mu * g * 1.05) { b.vx = 0; b.vz = 0; v = 0; }
    if (inMiele && !b.miele && ev) ev('miele', { x: b.x, y: b.y, z: b.z });
    b.miele = inMiele;
    const y0 = b.y;
    b.x += b.vx * dt; b.z += b.vz * dt;
    const s2 = supporto(m, b.x, b.z, b.y, t);
    if (s2) {
      if (s2.h < b.y - 0.04) { b.aria = true; b.vy = 0; }
      else { b.y = s2.h; b.vy = (b.y - y0) / dt; }
    } else { b.aria = true; }
    if (b.aria && b.vy > 0) b.vy = Math.max(0, b.vy);
  }

  // lati dei blocchi più alti (muri per chi sta sotto)
  for (const blk of m.blocchi) {
    if (b.x < blk.minX - 0.3 || b.x > blk.maxX + 0.3 || b.z < blk.minZ - 0.3 || b.z > blk.maxZ + 0.3) continue;
    if (b.y < blk.base - R) continue;
    for (const l of blk.lati) {
      const sx = l.bx - l.ax, sz = l.bz - l.az;
      let u = ((b.x - l.ax) * sx + (b.z - l.az) * sz) / (l.len * l.len);
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      const qx = l.ax + sx * u, qz = l.az + sz * u;
      const top = cima(blk, qx, qz, t);
      if (b.y >= top - F.gradino) continue;
      const dx = b.x - qx, dz = b.z - qz;
      if (dx * l.nx + dz * l.nz < -1e-4 && dentroPoligono(blk.p, b.x, b.z)) {
        // sopra una rampa che scende il bordo alto non è un muro
        if (!blk.asc) { if (b.y >= cima(blk, b.x, b.z, t) - F.gradino) continue; }
        // la cima scende sopra la pallina (ascensore): la pallina sale con lei
        else if (top - b.y < 0.25) { b.y = top; continue; }
      }
      const d = Math.hypot(dx, dz);
      if (d >= R) continue;
      let nx = l.nx, nz = l.nz;
      if (d > 1e-6 && u > 0 && u < 1) { nx = dx / d; nz = dz / d; }
      if (d > 1e-6 && (u === 0 || u === 1)) { nx = dx / d; nz = dz / d; }
      if (dx * l.nx + dz * l.nz < 0) { nx = l.nx; nz = l.nz; }
      const pen = R - (dx * nx + dz * nz);
      b.x += nx * pen; b.z += nz * pen;
      const vn = b.vx * nx + b.vz * nz;
      if (vn < 0) {
        b.vx -= (1 + F.bordo) * vn * nx; b.vz -= (1 + F.bordo) * vn * nz;
        b.sponde++;
        if (ev && vn < -0.4) ev('bordo', { v: -vn, x: b.x, y: b.y, z: b.z });
      }
    }
  }

  // sponde (tubi)
  const rs = F.sponda.r;
  for (const sp of m.sponde) {
    if (b.x < sp.minX || b.x > sp.maxX || b.z < sp.minZ || b.z > sp.maxZ) continue;
    const ya = cima(sp.b, sp.ax, sp.az, t) + rs, yb = cima(sp.b, sp.bx, sp.bz, t) + rs;
    if (b.y + R < Math.min(ya, yb) - 0.6 || b.y > Math.max(ya, yb) + 0.6) continue;
    urtaSegmento(b, sp.ax, ya, sp.az, sp.bx, yb, sp.bz, rs, F.sponda.rimbalzo, ev);
  }

  // pali e funghi
  for (const p of m.pali) {
    if (b.y > p.y + p.alto || b.y < p.y - 0.5) continue;
    urtaCilindro(b, p.x, p.z, p.r, p.rimbalzo, ev, p.t, p.t === 'fungo' ? F.fungo.spinta : 0);
  }

  // girandole
  for (const gi of m.girandole) {
    if (Math.abs(b.y - gi.y) > 0.4) continue;
    if (Math.hypot(b.x - gi.x, b.z - gi.z) > gi.lungo + gi.largo + R + 0.1) continue;
    urtaCilindro(b, gi.x, gi.z, 0.2, F.palo, ev, 'palo');
    const a0 = angGirandola(gi, t);
    for (let k = 0; k < gi.bracci; k++) {
      const a = a0 + (k * 2 * Math.PI) / gi.bracci;
      const ex = gi.x + Math.cos(a) * gi.lungo, ez = gi.z + Math.sin(a) * gi.lungo;
      // velocità del braccio nel punto più vicino
      const sx = ex - gi.x, sz = ez - gi.z;
      let u = ((b.x - gi.x) * sx + (b.z - gi.z) * sz) / (gi.lungo * gi.lungo);
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      const qx = gi.x + sx * u, qz = gi.z + sz * u;
      const vxS = -gi.vel * (qz - gi.z), vzS = gi.vel * (qx - gi.x);
      const aria = b.aria; b.aria = false;
      urtaSegmento(b, gi.x, gi.y + R, gi.z, ex, gi.y + R, ez, gi.largo, 0.6, ev, vxS, vzS);
      b.aria = aria;
    }
  }

  // campane
  for (let k = 0; k < m.campane.length; k++) {
    const c = m.campane[k];
    if (Math.abs(b.y - c.y) > 0.3) continue;
    const alt = altCampana(c, t);
    if (alt > F.campana.chiusa) continue;
    const d = Math.hypot(b.x - c.x, b.z - c.z);
    if (d < c.r - 0.04 && !b.aria) {
      b.presa = k; b.vx = b.vz = 0; b.fermo = false;
      if (ev) ev('presa', { x: b.x, y: b.y, z: b.z });
      return;
    }
    urtaCilindro(b, c.x, c.z, c.r, 0.55, ev, 'campana');
  }

  if (!b.aria) {
    // molle
    for (const o of m.molle) {
      if (Math.abs(b.y - o.y) > 0.1) continue;
      if (Math.hypot(b.x - o.x, b.z - o.z) < F.molla.r) {
        b.vy = o.salto; b.aria = true; b.y += 0.01;
        if (ev) ev('molla', { x: b.x, y: b.y, z: b.z, o });
        break;
      }
    }
    // anelli magici
    if (t > b.tc) {
      for (const tl of m.tele) {
        if (Math.abs(b.y - tl.ya) > 0.12) continue;
        if (Math.hypot(b.x - tl.a[0], b.z - tl.a[1]) < F.tele.r) {
          const v = Math.max(Math.hypot(b.vx, b.vz), F.tele.minimo);
          if (ev) ev('tele', { da: { x: b.x, y: b.y, z: b.z }, tl });
          b.x = tl.b[0] + tl.d.x * 0.05; b.z = tl.b[1] + tl.d.z * 0.05;
          const s3 = supporto(m, b.x, b.z, 99, t);
          b.y = s3 ? s3.h : tl.yb;
          b.vx = tl.d.x * v; b.vz = tl.d.z * v; b.vy = 0;
          b.tc = t + F.tele.pausa;
          break;
        }
      }
    }
    // buca
    const B = m.buca;
    if (Math.abs(b.y - B.y) < 0.1) {
      const dx = B.x - b.x, dz = B.z - b.z, d = Math.hypot(dx, dz);
      const v = Math.hypot(b.vx, b.vz);
      if (d < F.buca.r) {
        if (v < F.buca.vmax) {
          b.esito = 'buca'; b.vx = b.vz = 0;
          if (ev) ev('buca', { x: b.x, y: b.y, z: b.z });
          return;
        }
        if (!b.labbro) {
          b.labbro = true;
          const k = 0.8, ang = (dx * b.vz - dz * b.vx) > 0 ? -0.18 : 0.18;
          const c = Math.cos(ang), sn = Math.sin(ang);
          const vx = b.vx * c - b.vz * sn, vz = b.vx * sn + b.vz * c;
          b.vx = vx * k; b.vz = vz * k;
          if (ev) ev('labbro', { x: b.x, y: b.y, z: b.z });
        }
      } else {
        b.labbro = false;
        if (d < F.buca.r + F.buca.alone && v < F.buca.vmax * 1.4 && d > 1e-6) {
          b.vx += (dx / d) * F.buca.attira * dt; b.vz += (dz / d) * F.buca.attira * dt;
        }
      }
    }
  }

  b.viaggio += Math.hypot(b.x - x0, b.z - z0);
  b.fermo = !b.aria && b.vx === 0 && b.vz === 0 && b.presa < 0;
  if (b.y < m.fondo) {
    b.esito = 'fuori';
    if (ev) ev('fuori', { x: b.x, y: b.y, z: b.z });
  }
}

/* Simula un tiro fino a quando la pallina si ferma (o entra, o esce). */
export function simula(m, b0, ang, pot, maxT = F.durataMax) {
  const b = copiaPalla(b0);
  tira(b, ang, pot);
  const fine = b.t + maxT;
  let fermo = 0;
  while (b.t < fine) {
    passo(m, b, null);
    if (b.esito) break;
    if (b.fermo) { if (++fermo > 6) break; } else fermo = 0;
  }
  return b;
}

/* Quanta strada manca alla buca (per il computer). */
export function strada(m, x, y, z) {
  let best = Infinity;
  for (const s of m.catena) {
    if (s.salto) continue;
    const sx = s.bx - s.ax, sy = (s.by - s.ay) * 4, sz = s.bz - s.az;
    const l2 = sx * sx + sy * sy + sz * sz;
    let u = l2 > 0 ? ((x - s.ax) * sx + (y - s.ay) * 4 * sy + (z - s.az) * sz) / l2 : 0;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    const qx = s.ax + sx * u, qy = s.ay * 4 + sy * u, qz = s.az + sz * u;
    const lat = Math.hypot(x - qx, y * 4 - qy, z - qz);
    const tot = lat * 1.2 + Math.sqrt(l2) * (1 - u) + s.resto;
    if (tot < best) best = tot;
  }
  return best;
}
