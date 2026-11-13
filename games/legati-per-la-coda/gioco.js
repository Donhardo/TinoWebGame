/*
 * Legati per la Coda: Tino e Gino, legati da un filo di lana elastico, salgono una
 * parete infinita. Uno si aggrappa e fa da ancora, l'altro salta, dondola e si lancia.
 *
 * File: fisica.js (corpi, filo, presa e salto, sul piano), parete.js (appigli
 * generati a caso), questo (scena 3D con Three.js, telecamera, comandi, pannelli).
 * Three.js è quello di Tino Golf (../tino-golf/three.module.min.js).
 */
import * as THREE from '../tino-golf/three.module.min.js';
import { FISICA, CORPI, nuovoMondo, premi, passo, aPortata, distanza } from './fisica.js';
import { nuovaParete, generaFino, pota } from './parete.js';

const ASSETS = '../../assets/';
const PREFISSO = 'legati-per-la-coda:';

/* Quanto si vede della parete (in metri, sul piano dei personaggi). */
const VISTA = { largo: 9.8, alto: 14, distanza: 22, sopra: 1.2 };
/* La telecamera sale con chi sale e scende poco: sotto il bordo basso si perde. */
const CAMERA = { segui: 3.2, scende: 3, sotto: 7.4, anticipo: 1.4 };
const PALETTE = {
  spazio: '#cdeedd', nebbia: '#cdeedd',
  prato: '#8fdca0', lati: '#fff1d6', fondo: '#f6d9b0',
  piolo: '#ff9db0', pioloRighe: '#fff4f6',
  cuscini: ['#bfe9d0', '#d7f3c4'],
  filo: '#e8545e',
  isole: ['#a8e3bb', '#c4ecd0', '#b6e6c6'], alberi: ['#7fcf95', '#9bd98a', '#f4b6c2'], nuvole: '#ffffff',
};

/* ---------------------------------------------------------------- salvataggi */
function leggi(k, d) {
  try { const v = localStorage.getItem(PREFISSO + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
}
function scrivi(k, v) {
  if (stato.test) return;
  try { localStorage.setItem(PREFISSO + k, JSON.stringify(v)); } catch (e) { /* niente */ }
}

/* ---------------------------------------------------------------- stato */
const stato = {
  test: false,
  fase: 'menu',       // menu, gioco, pausa, fine
  mondo: null,
  parete: null,
  seme: 1,
  t: 0,
  resto: 0,
  cam: { y: 3, max: 3 },
  altezza: 0,
  record: leggi('record', 0),
  salite: leggi('salite', 0),
  aiuti: 0,
  finita: 0,
  statistiche: { prese: 0, lasciate: 0, strattoni: 0 },
};

/* ---------------------------------------------------------------- pagina */
const $ = (s) => document.querySelector(s);
const palco = $('#palco');
const tela = $('#campo');
const pannello = $('#pannello');
const dito = matchMedia('(pointer: coarse)').matches;
if (dito) document.body.classList.add('dito');

/* ---------------------------------------------------------------- Three.js */
const renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dito ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scena = new THREE.Scene();
scena.background = new THREE.Color(PALETTE.spazio);
scena.fog = new THREE.Fog(PALETTE.nebbia, 26, 60);
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 120);
scena.add(new THREE.HemisphereLight('#ffffff', '#b9d6c4', 1.55));
const sole = new THREE.DirectionalLight('#fff6e8', 1.7);
sole.castShadow = true;
sole.shadow.mapSize.set(dito ? 1024 : 2048, dito ? 1024 : 2048);
sole.shadow.camera.left = -8; sole.shadow.camera.right = 8;
sole.shadow.camera.top = 11; sole.shadow.camera.bottom = -11;
sole.shadow.camera.near = 1; sole.shadow.camera.far = 40;
sole.shadow.bias = -0.0005;
sole.shadow.normalBias = 0.03;
sole.shadow.radius = 4;
scena.add(sole);
scena.add(sole.target);

function adatta() {
  const w = palco.clientWidth, h = palco.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // il campo visivo che fa stare in vista almeno VISTA.largo × VISTA.alto
  const alto = Math.max(VISTA.alto, VISTA.largo / camera.aspect);
  camera.fov = (2 * Math.atan(alto / 2 / VISTA.distanza) * 180) / Math.PI;
  camera.updateProjectionMatrix();
  $('#gira').classList.toggle('nascosto', !(dito && w > h * 1.15));
  if (dito && w > h * 1.15 && stato.fase === 'gioco') pausa();
}
window.addEventListener('resize', adatta);

/* ---------------------------------------------------------------- materiali e forme */
const mat = (colore, o = {}) => new THREE.MeshStandardMaterial({ color: colore, roughness: 0.78, ...o });
const MAT = {
  prato: mat(PALETTE.prato),
  lati: mat(PALETTE.lati),
  fondo: mat(PALETTE.fondo),
  piolo: mat(PALETTE.piolo, { roughness: 0.5 }),
  righe: mat(PALETTE.pioloRighe, { roughness: 0.5 }),
  cuscini: PALETTE.cuscini.map((c) => mat(c, { roughness: 0.9 })),
  isole: PALETTE.isole.map((c) => mat(c)),
  alberi: PALETTE.alberi.map((c) => mat(c)),
  tronco: mat('#c9a27a'),
  nuvola: mat(PALETTE.nuvole, { roughness: 1 }),
  fiori: ['#ffffff', '#ffe066', '#f7a8c4', '#c7b3ff'].map((c) => mat(c)),
};

function rettangoloTondo(w, h, r) {
  const s = new THREE.Shape();
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}
const cacheGeo = new Map();
function cuscino(w, h, d, smusso) {
  const k = `${w.toFixed(2)}:${h.toFixed(2)}:${d}:${smusso}`;
  if (cacheGeo.has(k)) return cacheGeo.get(k);
  const g = new THREE.ExtrudeGeometry(rettangoloTondo(w - smusso * 2, h - smusso * 2, h * 0.4), {
    depth: d - smusso * 2, bevelEnabled: true, bevelThickness: smusso, bevelSize: smusso, bevelSegments: 4, curveSegments: 8,
  });
  g.translate(0, 0, -(d - smusso * 2) / 2);
  cacheGeo.set(k, g);
  return g;
}

const geoSfera = new THREE.SphereGeometry(1, 20, 14);

/* ---------------------------------------------------------------- appigli */
const appigliMesh = new Map();   // id → gruppo

const COLORI_SBARRE = ['#ffb4a2', '#a8d8ff', '#ffd98a', '#c9b6ff', '#9fe3c0'];
const matSbarre = COLORI_SBARRE.map((c) => mat(c, { roughness: 0.45 }));
function meshSbarra(a) {
  const g = new THREE.Group();
  const w = a.x2 - a.x1;
  const m = matSbarre[a.id % matSbarre.length];
  const asta = new THREE.Mesh(new THREE.CapsuleGeometry(a.r, w, 6, 14).rotateZ(Math.PI / 2), m);
  asta.castShadow = true; asta.receiveShadow = true;
  g.add(asta);
  // due pomelli ai capi e due sostegni che la tengono alla parete, dietro
  for (const x of [-w / 2, w / 2]) {
    const pomo = new THREE.Mesh(geoSfera, MAT.righe);
    pomo.scale.setScalar(a.r * 1.5);
    pomo.position.x = x;
    pomo.castShadow = true;
    const sost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8).rotateX(Math.PI / 2), MAT.righe);
    sost.position.set(x * 0.8, 0, -0.65);
    g.add(pomo, sost);
  }
  g.position.set((a.x1 + a.x2) / 2, a.y, 0);
  return g;
}

function meshIsola(a) {
  const g = new THREE.Group();
  const w = a.x2 - a.x1 + 1.2;
  const corpo = new THREE.Mesh(cuscino(w, 1.4, 3.2, 0.3), MAT.lati);
  corpo.position.y = -0.7;
  corpo.receiveShadow = true;
  const erba = new THREE.Mesh(cuscino(w + 0.1, 0.3, 3.3, 0.12), MAT.prato);
  erba.position.y = -0.1;
  erba.receiveShadow = true;
  const sotto = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), MAT.fondo);
  sotto.scale.set(w / 2, 1.3, 1.5);
  sotto.position.y = -1.4;
  g.add(corpo, erba, sotto);
  // fiorellini e due alberelli tondi
  const caso = rng(7);
  for (let i = 0; i < 22; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), MAT.fiori[i % 4]);
    f.position.set(-w / 2 + 0.4 + caso() * (w - 0.8), 0.05, -1.4 + caso() * 1.0);
    g.add(f);
  }
  for (const [x, z, s] of [[-3.2, -1.2, 1], [3.1, -1.25, 0.8]]) g.add(alberello(x, 0, z, s, 0));
  g.position.set(0, a.y, 0);
  return g;
}

function alberello(x, y, z, s, k) {
  const g = new THREE.Group();
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.11 * s, 0.6 * s, 8), MAT.tronco);
  tronco.position.y = 0.3 * s;
  const chioma = new THREE.Mesh(new THREE.SphereGeometry(0.45 * s, 16, 12), MAT.alberi[k % MAT.alberi.length]);
  chioma.position.y = 0.8 * s;
  chioma.castShadow = true;
  g.add(tronco, chioma);
  g.position.set(x, y, z);
  return g;
}

const geoPiolo = new THREE.CapsuleGeometry(0.24, 0.9, 6, 16).rotateX(Math.PI / 2);
const geoRiga = new THREE.TorusGeometry(0.242, 0.035, 6, 20);
function meshPiolo(a) {
  const g = new THREE.Group();
  const p = new THREE.Mesh(geoPiolo, MAT.piolo);
  p.castShadow = true; p.receiveShadow = true;
  g.add(p);
  for (const z of [-0.3, 0, 0.3]) {
    const r = new THREE.Mesh(geoRiga, MAT.righe);
    r.position.z = z;
    g.add(r);
  }
  // il sostegno che lo tiene alla parete, dietro
  const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8).rotateX(Math.PI / 2), MAT.righe);
  asta.position.z = -0.9;
  g.add(asta);
  g.position.set(a.x, a.y, 0);
  return g;
}

function aggiornaAppigli() {
  const p = stato.parete;
  generaFino(p, stato.cam.y + 18);
  pota(p, stato.cam.y - 26);
  const vivi = new Set();
  for (const a of p.appigli) {
    vivi.add(a.id);
    if (appigliMesh.has(a.id)) continue;
    const m = a.isola ? meshIsola(a) : a.tipo === 'piolo' ? meshPiolo(a) : meshSbarra(a);
    scena.add(m);
    appigliMesh.set(a.id, m);
  }
  for (const [id, m] of appigliMesh) if (!vivi.has(id)) { scena.remove(m); appigliMesh.delete(id); }
}

function svuotaAppigli() {
  for (const m of appigliMesh.values()) scena.remove(m);
  appigliMesh.clear();
}

/* ---------------------------------------------------------------- muri di cuscini */
const PASSO_CUSCINO = 1.5;
const geoCuscinoMuro = new THREE.CapsuleGeometry(0.5, 0.6, 6, 14);
const cusciniMuro = [];
for (let i = 0; i < 26; i++) {
  for (const lato of [-1, 1]) {
    const m = new THREE.Mesh(geoCuscinoMuro, MAT.cuscini[0]);
    m.scale.set(1, 1, 1.5);
    m.receiveShadow = true;
    m.userData.lato = lato;
    scena.add(m);
    cusciniMuro.push(m);
  }
}
function aggiornaMuri() {
  const base = Math.floor((stato.cam.y - 16) / PASSO_CUSCINO);
  cusciniMuro.forEach((m, i) => {
    const k = base + (i >> 1);
    m.position.set(m.userData.lato * (FISICA.largo / 2 + 0.5), k * PASSO_CUSCINO + 0.75, 0);
    m.material = MAT.cuscini[((k % 2) + 2) % 2];
  });
}

/* ---------------------------------------------------------------- lontano: isolette e nuvole */
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
const TRATTO = 12;
const lontani = new Map();   // tratto → gruppo
function tratto(k) {
  const caso = rng(1000 + k * 7919 + stato.seme * 31);
  const g = new THREE.Group();
  const n = 3 + Math.floor(caso() * 2);
  for (let i = 0; i < n; i++) {
    const lato = i % 2 ? 1 : -1;
    const x = lato * (8 + caso() * 12), y = k * TRATTO + caso() * TRATTO, z = -10 - caso() * 22;
    if (caso() < 0.6) {
      // isoletta tonda con un alberello
      const s = 0.8 + caso() * 1.4;
      const isola = new THREE.Group();
      const sopra = new THREE.Mesh(geoSfera, MAT.isole[Math.floor(caso() * 3)]);
      sopra.scale.set(1.4 * s, 0.35 * s, 1.1 * s);
      const sotto = new THREE.Mesh(geoSfera, MAT.fondo);
      sotto.scale.set(1.2 * s, 0.9 * s, 0.95 * s);
      sotto.position.y = -0.35 * s;
      isola.add(sotto, sopra);
      if (caso() < 0.8) isola.add(alberello(0.2 * s, 0.2 * s, 0, 0.9 * s, Math.floor(caso() * 3)));
      isola.position.set(x, y, z);
      isola.userData.ondeggia = caso() * 6;
      g.add(isola);
    } else {
      const nuvola = new THREE.Group();
      const m = 3 + Math.floor(caso() * 3);
      for (let j = 0; j < m; j++) {
        const b = new THREE.Mesh(geoSfera, MAT.nuvola);
        const r = 0.6 + caso() * 0.7;
        b.scale.set(r, r * 0.8, r * 0.8);
        b.position.set(j * 0.8 - m * 0.4, caso() * 0.3, caso() * 0.4);
        nuvola.add(b);
      }
      nuvola.position.set(x, y, z);
      nuvola.userData.ondeggia = caso() * 6;
      g.add(nuvola);
    }
  }
  return g;
}
function aggiornaLontani() {
  const k0 = Math.floor((stato.cam.y - 22) / TRATTO), k1 = Math.floor((stato.cam.y + 26) / TRATTO);
  for (let k = k0; k <= k1; k++) if (!lontani.has(k)) { const g = tratto(k); scena.add(g); lontani.set(k, g); }
  for (const [k, g] of lontani) if (k < k0 - 1 || k > k1 + 1) { scena.remove(g); lontani.delete(k); }
  for (const g of lontani.values()) for (const o of g.children) o.position.x += Math.sin(stato.t * 0.3 + o.userData.ondeggia) * 0.002;
}
function svuotaLontani() { for (const g of lontani.values()) scena.remove(g); lontani.clear(); }

/* ---------------------------------------------------------------- personaggi */
const caricatore = new THREE.TextureLoader();
function carica(file) {
  const t = caricatore.load(ASSETS + file);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const FACCE = {
  normale: carica('tino/tino-normale.png'),
  arrabbiato: carica('tino/tino-arrabbiato.png'),
  ferito: carica('tino/tino-ferito.png'),
  ko: carica('tino/tino-ko.png'),
  gino: carica('gino/gino.png'),
};

/* coda: dove si lega il filo, in frazioni della foto (da sinistra, dal basso) */
const CODA = { tino: [0.2, 0.5], gino: [0.5, 0.12] };

function nuovoPersonaggio(chi) {
  const alto = CORPI[chi].alto;
  const largo = chi === 'tino' ? alto * (376 / 512) : alto * (381 / 470);
  const radice = new THREE.Group();
  const corpo = new THREE.Group();     // saltelli, schiacciamenti, rotazioni
  const geo = new THREE.PlaneGeometry(largo, alto);
  geo.translate(0, alto / 2, 0);
  const m = new THREE.MeshBasicMaterial({ map: chi === 'tino' ? FACCE.normale : FACCE.gino, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
  const foto = new THREE.Mesh(geo, m);
  foto.castShadow = true;
  foto.renderOrder = 2;
  corpo.add(foto);
  // alone quando si tiene (si aggrappa o è pronto ad aggrapparsi)
  const alone = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.74, 32), new THREE.MeshBasicMaterial({ color: '#fff3a6', transparent: true, opacity: 0, depthWrite: false }));
  alone.position.z = -0.05;
  radice.add(alone);
  radice.add(corpo);
  scena.add(radice);
  return {
    chi, radice, corpo, foto, mat: m, alone, alto, largo,
    faccia: 'normale', fino: 0, faccia2: null,
    anim: null, animT: 0, inclina: 0, specchio: 1,
  };
}
const PERS = [nuovoPersonaggio('tino'), nuovoPersonaggio('gino')];
PERS[0].radice.position.z = 0.15;
PERS[1].radice.position.z = 0.3;

function faccia(p, f, durata) {
  if (p.chi !== 'tino') return;
  if (durata) { p.faccia2 = f; p.fino = stato.t + durata; } else p.faccia = f;
}
function animazione(p, tipo) { p.anim = tipo; p.animT = 0; }

/* Il punto della coda nel mondo. */
function puntoCoda(i) {
  const c = stato.mondo.corpi[i], p = PERS[i];
  const [fx, fy] = CODA[p.chi];
  const s = p.specchio;
  return new THREE.Vector3(c.x + (fx - 0.5) * p.largo * s, c.y - c.r + fy * p.alto, p.radice.position.z - 0.08);
}

function aggiornaPersonaggi(dt) {
  const m = stato.mondo;
  m.corpi.forEach((c, i) => {
    const o = m.corpi[1 - i];
    const p = PERS[i];
    p.animT += dt;
    // specchiatura: Tino guarda a destra nella foto, Gino è di fronte
    if (p.chi === 'tino') p.specchio += ((c.verso >= 0 ? 1 : -1) - p.specchio) * Math.min(1, dt * 14);
    let sx = 1, sy = 1, ry = 0, rot = 0;
    const tiene = c.stato === 'presa' || c.pronto;
    if (c.stato === 'terra') {
      // sull'isola: respira e aspetta
      sy = 1 + Math.sin(stato.t * 3 + i) * 0.02;
    } else if (c.dondolo) {
      // appeso: la testa guarda verso il perno
      rot = Math.max(-1.3, Math.min(1.3, c.th * 0.75));
    } else if (c.stato === 'libero') {
      rot = Math.max(-0.5, Math.min(0.5, -c.vx * 0.04));
      const v = Math.min(1, Math.abs(c.vy) / 14);
      sy = 1 + v * 0.1; sx = 1 - v * 0.07;
    } else {
      // aggrappato: tiene stretto, si piega un poco verso chi dondola
      if (o.dondolo) rot = Math.max(-0.25, Math.min(0.25, (o.x - c.x) * -0.06));
      sy = 0.95; sx = 1.04;
    }
    if (p.anim) {
      const k = p.animT;
      if (p.anim === 'atterra') { const a = Math.max(0, 1 - k / 0.25); sy *= 1 - 0.25 * a; sx *= 1 + 0.2 * a; if (k > 0.25) p.anim = null; }
      else if (p.anim === 'trema') { rot += Math.sin(k * 60) * 0.18 * Math.max(0, 1 - k / 0.5); if (k > 0.5) p.anim = null; }
      else if (p.anim === 'saltello') { ry += Math.sin(Math.min(1, k / 0.4) * Math.PI) * 0.25; if (k > 0.4) p.anim = null; }
      else if (p.anim === 'caduta') { rot += Math.min(1, k / 0.6) * 1.6 * (i ? -1 : 1); }
    }
    p.inclina += (rot - p.inclina) * Math.min(1, dt * 12);
    p.radice.position.x = c.x;
    p.radice.position.y = c.y - c.r + ry;
    p.corpo.rotation.z = p.inclina;
    p.corpo.scale.set(sx * (p.chi === 'tino' ? p.specchio : 1), sy, 1);
    // alone di presa
    const al = p.alone.material;
    const obj = c.stato === 'presa' ? 0.85 : c.pronto ? 0.35 + 0.25 * Math.sin(stato.t * 18) : 0;
    al.opacity += (obj - al.opacity) * Math.min(1, dt * 16);
    p.alone.position.set(0, c.r, -0.05);
    p.alone.scale.setScalar((c.r + 0.25) / 0.7 * (1 + 0.04 * Math.sin(stato.t * 6)));
    // faccia di Tino
    if (p.chi === 'tino') {
      let f = p.faccia;
      if (stato.fase === 'fine') f = 'ko';
      else if (p.faccia2 && stato.t < p.fino) f = p.faccia2;
      else if (c.stato === 'presa' && o.dondolo && Math.abs(o.om) > 1.6) f = 'arrabbiato';
      if (p.mat.map !== FACCE[f]) { p.mat.map = FACCE[f]; p.mat.needsUpdate = true; }
    }
  });
}

/* ---------------------------------------------------------------- appigli a portata */
/* Un anello che si accende sull'appiglio che chi non tiene può prendere adesso: giallo se
 * è più in alto del perno (premi!), bianco tenue se no. */
const segni = [0, 1].map(() => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 28), new THREE.MeshBasicMaterial({ color: '#ffe14d', transparent: true, opacity: 0, depthWrite: false }));
  m.renderOrder = 3;
  scena.add(m);
  return m;
});
const ora = [false, false];
const ANTICIPO = 0.9;   // l'anello si accende un po' prima, così si fa in tempo a premere
/* L'appiglio più in alto del perno più vicino a chi non tiene, con la sua distanza. */
function prossimo(m, c, o) {
  let best = null, bd = Infinity;
  const perno = pernoDi(o);
  for (const a of m.parete.appigli) {
    if (a.isola || a.y <= perno + 0.3 || Math.abs(a.y - c.y) > 5) continue;
    const d = distanza(c, a);
    if (d < bd) { bd = d; best = a; }
  }
  return best ? { a: best, d: bd - c.r - FISICA.presa } : null;
}
function aggiornaSegni(dt) {
  const m = stato.mondo;
  m.corpi.forEach((c, i) => {
    const o = m.corpi[1 - i];
    const p = c.stato === 'libero' && o.stato !== 'libero' ? prossimo(m, c, o) : null;
    const vicino = !!p && p.d < ANTICIPO, preso = !!p && p.d < 0;
    ora[i] = vicino && stato.fase === 'gioco';
    const seg = segni[i];
    if (p) {
      const a = p.a;
      const x = a.tipo === 'sbarra' ? Math.max(a.x1, Math.min(a.x2, c.x)) : a.x;
      seg.position.set(x, a.y, 0.35);
      seg.material.color.set(preso ? '#ffe14d' : '#fff6c2');
    }
    const obj = vicino ? (preso ? 1 : 0.55 * (1 - p.d / ANTICIPO) + 0.2) : 0;
    seg.material.opacity += (obj - seg.material.opacity) * Math.min(1, dt * 20);
    seg.scale.setScalar((preso ? 1.15 : 1) + 0.1 * Math.sin(stato.t * 14));
  });
  $('.tasto-tino').classList.toggle('ora', ora[0]);
  $('.tasto-gino').classList.toggle('ora', ora[1]);
}

/* ---------------------------------------------------------------- filo di lana */
function texturaLana() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = PALETTE.filo; g.fillRect(0, 0, 128, 32);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 5;
  for (let x = -32; x < 160; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 24, 32); g.stroke(); }
  g.strokeStyle = 'rgba(120,20,40,0.25)'; g.lineWidth = 2;
  for (let x = -32; x < 160; x += 16) { g.beginPath(); g.moveTo(x + 8, 0); g.lineTo(x + 32, 32); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  return t;
}
const matFilo = new THREE.MeshStandardMaterial({ map: texturaLana(), roughness: 0.95 });
let meshFilo = null;
const curvaFilo = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
function aggiornaFilo() {
  const a = puntoCoda(0), b = puntoCoda(1);
  const d = a.distanceTo(b);
  const L = FISICA.filo;
  const pancia = d < L ? 0.55 * Math.sqrt(L * L - d * d) : 0;
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y -= pancia;
  mid.z -= 0.05;
  curvaFilo.v0.copy(a); curvaFilo.v1.copy(mid); curvaFilo.v2.copy(b);
  const raggio = 0.07;
  if (meshFilo) { scena.remove(meshFilo); meshFilo.geometry.dispose(); }
  meshFilo = new THREE.Mesh(new THREE.TubeGeometry(curvaFilo, 28, raggio, 7, false), matFilo);
  meshFilo.castShadow = true;
  matFilo.map.repeat.set(Math.max(1, d * 2.5), 1);
  scena.add(meshFilo);
}

/* ---------------------------------------------------------------- partita */
function nuovaSalita(fase = 'gioco') {
  stato.seme = (Math.random() * 1e9) | 0;
  stato.parete = nuovaParete(stato.seme);
  generaFino(stato.parete, 20);
  stato.mondo = nuovoMondo(stato.parete);
  stato.cam = { y: 4, max: 4 };
  stato.altezza = 0;
  stato.resto = 0;
  stato.finita = 0;
  stato.fase = fase;
  stato.statistiche = { prese: 0, lasciate: 0, strattoni: 0 };
  svuotaAppigli();
  svuotaLontani();
  for (const p of PERS) { p.anim = null; p.faccia = 'normale'; p.faccia2 = null; }
  rilasciaTutto();
  aggiornaAppigli();
  aggiornaTasti();
  if (fase === 'gioco') {
    stato.aiuti = 0;
    mostraAiuto(0);
  } else nascondiAiuto();
}

const TASTO = dito ? ['il dito a sinistra', 'il dito a destra'] : ['A', 'L'];
const AIUTI = [
  `Tieni premuto ${TASTO[0]}: Tino si aggrappa alla sbarra appena ci arriva saltellando`,
  'Chi non tiene dondola da solo. Quando arriva a una sbarra più in alto (anello giallo), tieni premuto il suo tasto',
  'Ora lascia il tasto dell\'altro: adesso dondola lui, sotto',
  'Così, uno alla volta: chi tiene fa da perno, l\'altro dondola e si aggrappa più su',
];
function mostraAiuto(i) {
  if (i >= AIUTI.length) return nascondiAiuto();
  stato.aiuti = i;
  const el = $('#aiuto');
  el.textContent = AIUTI[i];
  el.classList.remove('nascosto');
}
function nascondiAiuto() { $('#aiuto').classList.add('nascosto'); stato.aiuti = 99; }

function eventi() {
  const m = stato.mondo;
  for (const e of m.eventi) {
    const i = e.chi === 'tino' ? 0 : 1;
    const p = PERS[i];
    if (e.tipo === 'saltello') animazione(p, 'saltello');
    else if (e.tipo === 'atterra') animazione(p, 'atterra');
    else if (e.tipo === 'presa') { stato.statistiche.prese++; if (e.info !== 'isola') animazione(p, 'atterra'); }
    else if (e.tipo === 'lascia') stato.statistiche.lasciate++;
    else if (e.tipo === 'strattone') {
      stato.statistiche.strattoni++;
      if (p.chi === 'gino') animazione(p, 'trema'); else faccia(p, 'ferito', 0.7);
    }
  }
  m.eventi.length = 0;
  // gli aiuti dell'inizio vanno avanti da soli quando si fa la cosa giusta
  if (stato.fase === 'gioco' && stato.aiuti < AIUTI.length) {
    const [T, G] = m.corpi;
    const su = (c) => c.stato === 'presa';
    if (stato.aiuti === 0 && (su(T) || su(G))) mostraAiuto(1);
    else if (stato.aiuti === 1 && su(T) && su(G) && T.presa.cosa !== G.presa.cosa) mostraAiuto(2);
    else if (stato.aiuti === 2 && (T.stato === 'libero' || G.stato === 'libero')) mostraAiuto(3);
    else if (stato.aiuti === 3 && stato.altezza >= 8) nascondiAiuto();
  }
}

function aggiornaCamera(dt) {
  const [A, B] = stato.mondo.corpi;
  const alto = Math.max(A.y, B.y), medio = (A.y + B.y) / 2;
  const obj = Math.max(3.5, medio * 0.6 + alto * 0.4 + CAMERA.anticipo);
  const c = stato.cam;
  if (obj > c.y) c.y += (obj - c.y) * Math.min(1, dt * CAMERA.segui);
  else c.y += (Math.max(obj, c.max - CAMERA.scende) - c.y) * Math.min(1, dt * CAMERA.segui * 0.5);
  c.max = Math.max(c.max, c.y);
  camera.position.set(0, c.y + VISTA.sopra, VISTA.distanza);
  camera.lookAt(0, c.y, 0);
  sole.position.set(3, c.y + 12, 10);
  sole.target.position.set(0, c.y, 0);
}

function misuraAltezza() {
  const [A, B] = stato.mondo.corpi;
  const piedi = Math.min(A.y - A.r, B.y - B.r);
  stato.altezza = Math.max(stato.altezza, Math.floor(Math.max(0, piedi)));
  const limite = stato.cam.y - CAMERA.sotto;
  return A.y < limite && B.y < limite;
}
function controllaFine(dt) {
  if (stato.fase !== 'gioco') return;
  if (misuraAltezza()) {
    stato.finita += dt;
    if (stato.finita > 0.6) fine();
  } else stato.finita = 0;
}

function fine() {
  stato.fase = 'fine';
  rilasciaTutto();
  animazione(PERS[1], 'caduta');
  const record = stato.altezza > stato.record;
  if (record) { stato.record = stato.altezza; scrivi('record', stato.record); }
  stato.salite++;
  scrivi('salite', stato.salite);
  nascondiAiuto();
  if (!stato.test) setTimeout(() => mostraPannello(pannelloFine(record)), 700);
}

function aggiornaHud() {
  const el = $('#altezza');
  el.classList.toggle('nascosto', stato.fase === 'menu');
  el.querySelector('b').textContent = stato.altezza;
  el.querySelector('small').textContent = stato.record > 0 ? `record ${Math.max(stato.record, stato.altezza)} m` : '';
  $('#info').textContent = stato.fase === 'menu' ? 'Legati per la Coda' : `Salita · record ${Math.max(stato.record, stato.altezza)} m`;
  $('#tasti').classList.toggle('nascosto', stato.fase !== 'gioco');
}

/* ---------------------------------------------------------------- dimostrazione nel menu */
/* Nel menu Tino e Gino salgono da soli: chi dondola si aggrappa appena tocca un appiglio
 * più in alto del perno, poi l'altro lascia. Dopo ~25 m (o una caduta) si ricomincia. */
const demoStato = { lascia: null };
function pernoDi(o) { return o.stato === 'presa' ? o.presa.cosa.y : -99; }
function demo() {
  const m = stato.mondo;
  m.corpi.forEach((c, i) => {
    const o = m.corpi[1 - i];
    if (c.stato === 'presa') return;
    const a = aPortata(m, c);
    if (a && a.y > pernoDi(o) + 0.3 && !c.premuto) { premi(m, i, true); demoStato.lascia = { i: 1 - i, t: stato.t + 0.35 }; }
  });
  const l = demoStato.lascia;
  if (l && stato.t >= l.t) { if (m.corpi[1 - l.i].stato === 'presa') premi(m, l.i, false); demoStato.lascia = null; }
  if (stato.altezza > 25) nuovaSalita('menu');
}

/* ---------------------------------------------------------------- ciclo */
let prima = performance.now();
function ciclo(ora) {
  const dt = Math.min(0.05, (ora - prima) / 1000);
  prima = ora;
  if (!stato.test) aggiorna(dt);
  disegna(dt);
  requestAnimationFrame(ciclo);
}

function aggiorna(dt) {
  if (stato.fase === 'pausa') return;
  stato.t += dt;
  if (stato.fase === 'menu') { demo(); if (misuraAltezza()) nuovaSalita('menu'); }
  stato.resto += dt;
  while (stato.resto >= FISICA.passo) { passo(stato.mondo, FISICA.passo); stato.resto -= FISICA.passo; }
  eventi();
  controllaFine(dt);
  aggiornaCamera(dt);
  aggiornaAppigli();
}

function disegna(dt) {
  if (stato.fase !== 'pausa') {
    aggiornaPersonaggi(dt);
    aggiornaSegni(dt);
    aggiornaFilo();
    aggiornaMuri();
    aggiornaLontani();
  }
  aggiornaHud();
  renderer.render(scena, camera);
}

/* ---------------------------------------------------------------- comandi */
const tenuti = [new Set(), new Set()];   // chi tiene premuto il tasto di ognuno
function tieni(i, chi, giu) {
  const s = tenuti[i];
  const prima = s.size > 0;
  if (giu) s.add(chi); else s.delete(chi);
  const ora = s.size > 0;
  if (prima === ora || stato.fase !== 'gioco') return;
  premi(stato.mondo, i, ora);
  aggiornaTasti();
}
function rilasciaTutto() {
  tenuti.forEach((s) => s.clear());
  if (stato.mondo) stato.mondo.corpi.forEach((c, i) => premi(stato.mondo, i, false));
  aggiornaTasti();
}
function aggiornaTasti() {
  $('.tasto-tino').classList.toggle('premuto', tenuti[0].size > 0);
  $('.tasto-gino').classList.toggle('premuto', tenuti[1].size > 0);
}

const TASTI = { KeyA: 0, ShiftLeft: 0, KeyL: 1, ShiftRight: 1 };
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); return alternaPausa(); }
  if (pannelloAperto()) return;
  if (e.code in TASTI) { e.preventDefault(); if (!e.repeat) tieni(TASTI[e.code], e.code, true); }
});
window.addEventListener('keyup', (e) => {
  if (e.code in TASTI) { e.preventDefault(); tieni(TASTI[e.code], e.code, false); }
});
window.addEventListener('blur', () => { tenuti.forEach((x) => x.clear()); aggiornaTasti(); pausa(); });

const dita = new Map();   // pointerId → quale personaggio
palco.addEventListener('pointerdown', (e) => {
  if (pannelloAperto() || e.target.closest('.pannello')) return;
  if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
  e.preventDefault();
  const r = palco.getBoundingClientRect();
  const i = e.pointerType === 'mouse' && e.button === 2 ? 1 : e.clientX - r.left < r.width / 2 ? 0 : 1;
  dita.set(e.pointerId, i);
  try { palco.setPointerCapture(e.pointerId); } catch (er) { /* niente */ }
  tieni(i, 'p' + e.pointerId, true);
});
function lasciaDito(e) {
  if (!dita.has(e.pointerId)) return;
  tieni(dita.get(e.pointerId), 'p' + e.pointerId, false);
  dita.delete(e.pointerId);
}
palco.addEventListener('pointerup', lasciaDito);
palco.addEventListener('pointercancel', lasciaDito);
palco.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('visibilitychange', () => { if (document.hidden && stato.fase === 'gioco') pausa(); });
$('#btn-pausa').addEventListener('click', () => alternaPausa());

function pausa() {
  if (stato.fase !== 'gioco') return;
  stato.fase = 'pausa';
  mostraPannello(pannelloPausa());
}
function alternaPausa() {
  if (stato.fase === 'gioco') pausa();
  else if (stato.fase === 'pausa') riprendi();
}
function riprendi() {
  chiudiPannello();
  stato.fase = 'gioco';
  prima = performance.now();
  // i tasti lasciati durante la pausa contano adesso
  stato.mondo.corpi.forEach((c, i) => { if (c.premuto !== tenuti[i].size > 0) premi(stato.mondo, i, tenuti[i].size > 0); });
  aggiornaTasti();
}

/* ---------------------------------------------------------------- messaggi */
let timerMessaggio = 0;
function messaggio(testo, sotto = '') {
  const el = $('#messaggio');
  el.innerHTML = testo + (sotto ? `<small>${sotto}</small>` : '');
  el.classList.add('visibile');
  clearTimeout(timerMessaggio);
  timerMessaggio = setTimeout(() => el.classList.remove('visibile'), 1100);
}

/* ---------------------------------------------------------------- pannelli */
function pannelloAperto() { return pannello.classList.contains('visibile'); }
function mostraPannello(html) {
  pannello.innerHTML = html;
  pannello.classList.add('visibile');
  const primo = pannello.querySelector('[data-primo]') || pannello.querySelector('button');
  if (primo && !dito) primo.focus();
}
function chiudiPannello() { pannello.classList.remove('visibile'); pannello.innerHTML = ''; }

const FILO_SVG = '<svg viewBox="0 0 120 40" aria-hidden="true"><path d="M8 12 Q60 46 112 18" fill="none" stroke="#e8545e" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 9"/><path d="M8 12 Q60 46 112 18" fill="none" stroke="#e8545e" stroke-width="3" stroke-linecap="round"/></svg>';
const RITRATTI = (cls = 'salta') => `<div class="ritratti">${FILO_SVG}<img class="${cls}" src="${ASSETS}tino/${cls === 'caduto' ? 'tino-ko' : 'tino-normale'}.png" alt="Tino"><img class="gino ${cls} dopo" src="${ASSETS}gino/gino.png" alt="Gino"></div>`;

function comandiHtml() {
  const tasti = dito
    ? '<p><b>Un dito per personaggio</b>: metà sinistra dello schermo Tino, metà destra Gino.</p>'
    : '<p><b>Un tasto per personaggio</b>: <kbd>A</kbd> (o <kbd>Maiusc</kbd> sinistro) Tino, <kbd>L</kbd> (o <kbd>Maiusc</kbd> destro) Gino. In due: un tasto a testa. Col mouse: clic a sinistra Tino, a destra Gino.</p>';
  return `<div class="comandi">
    ${tasti}
    <ul>
      <li><b>Premuto</b> = si tiene. <b>Lasciato</b> = si lascia.</li>
      <li>Chi tiene fa da perno; l'altro, appeso al filo, <b>dondola da solo</b>, ogni volta più in alto.</li>
      <li>Quando chi dondola arriva a un appiglio più in alto (si accende un anello <span class="giallo">giallo</span> e il suo tasto lampeggia), premi il suo tasto: si aggrappa appena lo tocca.</li>
      <li>Poi lascia l'altro: adesso dondola lui. E così via, uno alla volta.</li>
      <li>Se lasciate tutti e due, cadete!</li>
    </ul>
    ${dito ? '' : '<p><kbd>P</kbd> o <kbd>Esc</kbd> pausa.</p>'}</div>`;
}

function pannelloMenu() {
  return `<div class="riquadro">
    ${RITRATTI()}
    <h1>Legati per la Coda</h1>
    <p>Tino e Gino sono legati da un filo di lana: salite insieme più in alto che potete! Uno tiene, l'altro dondola e si aggrappa più su.</p>
    ${stato.record ? `<p class="dettagli">Il vostro record: <b>${stato.record} m</b></p>` : ''}
    <div class="scelte"><button class="bottone" data-azione="gioca" data-primo>Si sale!</button></div>
    ${comandiHtml()}
  </div>`;
}

function pannelloPausa() {
  return `<div class="riquadro">
    <h2>Pausa</h2>
    <p class="dettagli">Siete a ${stato.altezza} m.</p>
    <div class="scelte">
      <button class="bottone" data-azione="riprendi" data-primo>Continua</button>
      <button class="bottone secondario" data-azione="ricomincia">Ricomincia</button>
      <button class="bottone secondario" data-azione="menu">Menu</button>
    </div>
    ${comandiHtml()}
  </div>`;
}

function pannelloFine(record) {
  const s = stato.statistiche;
  return `<div class="riquadro">
    ${RITRATTI('caduto')}
    <h2>${record ? 'Nuovo record!' : 'Che volo!'}</h2>
    <div class="risultato">${stato.altezza} m</div>
    <p class="dettagli">${record ? 'Mai così in alto!' : `Record: ${stato.record} m`}</p>
    <p class="dettagli">${s.prese} prese</p>
    <div class="scelte">
      <button class="bottone" data-azione="ricomincia" data-primo>Ancora!</button>
      <button class="bottone secondario" data-azione="menu">Menu</button>
    </div>
  </div>`;
}

pannello.addEventListener('click', (e) => {
  const b = e.target.closest('[data-azione]');
  if (!b) return;
  const a = b.dataset.azione;
  if (a === 'gioca' || a === 'ricomincia') { chiudiPannello(); nuovaSalita('gioco'); prima = performance.now(); }
  else if (a === 'riprendi') riprendi();
  else if (a === 'menu') { nuovaSalita('menu'); mostraPannello(pannelloMenu()); }
});

/* ---------------------------------------------------------------- avvio */
adatta();
nuovaSalita('menu');
aggiornaCamera(1);
mostraPannello(pannelloMenu());
requestAnimationFrame(ciclo);

/* ---------------------------------------------------------------- prove automatiche */
window.legatiPerLaCoda = {
  get stato() { return stato; },
  nuovaSalita, aggiorna, premi: (i, giu) => premi(stato.mondo, i, giu), tieni, aPortata, distanza,
  FISICA, CAMERA, VISTA,
};
