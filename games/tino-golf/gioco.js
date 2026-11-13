/*
 * Tino Golf: minigolf in 3D in un mondo giocattolo morbido.
 * Tino (e Gino) tirano una pallina-ghianda lungo buche fatte di blocchi
 * arrotondati, con dossi, girandole, trappoline, anelli magici e ascensori.
 *
 * File: motore.js (fisica), campi.js (le buche), costruisci.js (scena 3D),
 * ia.js (il computer), suoni.js (suoni e musica), questo (partita, telecamera,
 * comandi, personaggi, pannelli).
 */
import * as THREE from './three.module.min.js';
import { FISICA, creaMondo, nuovaPalla, tira, passo, copiaPalla, supporto, dirDa, angDa, strada } from './motore.js';
import { CAMPI, NOVITA } from './campi.js';
import { costruisci, decorazioni, PALETTE, texturaOmbra } from './costruisci.js';
import { cercaTiro, sbaglia, aspettaAscensore, muove } from './ia.js';
import { suoni, audio, sblocca, aggiornaVolumi, rotola, avviaMusica } from './suoni.js';

const ASSETS = '../../assets/';
const PREFISSO = 'tino-golf:';
const MAX_COLPI = 8;
const R = FISICA.R;

const CAMERA = {
  distanza: 6.6, min: 2.6, max: 16, alzo: 0.56, alzoMin: 0.16, alzoMax: 1.38,
  segui: 4.5, giro: 3, fovOrizzontale: 64,
};
const TELA = { pixelMax: 2, pixelTelefono: 1.5 };

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
  fase: 'menu',         // menu, intro, mira, rotola, esito, attesa, pausa, fine
  modo: 'demo',         // demo, avventura, cpu, due
  buca: 0,
  mondo: null,
  palla: null,
  giocatori: [],
  turno: 0,
  t: 0,
  timer: 0,
  dopo: null,
  faseInPausa: null,
  mira: { ang: 0, pot: 0.4, trascina: null, tastiera: false, visibile: false },
  ia: null,
  sbloccati: Math.max(1, Math.min(CAMPI.length, leggi('sbloccati', 1))),
  stelle: leggi('stelle', []),
  migliori: leggi('migliori', []),
  viste: leggi('novita', []),
  statistiche: { tiri: 0 },
};
audio.muto = leggi('muto', false);
audio.musicaSpenta = leggi('musica-spenta', false);

/* ---------------------------------------------------------------- pagina */
const $ = (s) => document.querySelector(s);
const palco = $('#palco');
const tela = $('#campo');
const pannello = $('#pannello');
const dito = matchMedia('(pointer: coarse)').matches;

/* ---------------------------------------------------------------- Three.js */
const renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dito ? TELA.pixelTelefono : TELA.pixelMax));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
const cielo = new THREE.HemisphereLight('#ffffff', '#b9c9c0', 1.5);
scena.add(cielo);
const sole = new THREE.DirectionalLight('#fff6e8', 1.9);
sole.castShadow = true;
sole.shadow.mapSize.set(dito ? 1024 : 2048, dito ? 1024 : 2048);
sole.shadow.bias = -0.0004;
sole.shadow.normalBias = 0.03;
sole.shadow.radius = 4;
scena.add(sole);
scena.add(sole.target);

let gruppoBuca = null, gruppoDeco = null;

/* ---------------------------------------------------------------- pallina */
function texturaGhianda(scura) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const corpo = scura ? ['#e98a5e', '#c9603b'] : ['#e8b26a', '#c98a3c'];
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, corpo[0]); gr.addColorStop(1, corpo[1]);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  // cappello
  g.fillStyle = scura ? '#7b3d26' : '#7a4a22';
  g.fillRect(0, 0, 256, 50);
  g.strokeStyle = 'rgba(255,220,170,0.35)'; g.lineWidth = 2;
  for (let x = -128; x < 256; x += 14) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 50, 50); g.stroke(); g.beginPath(); g.moveTo(x + 50, 0); g.lineTo(x, 50); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 48, 256, 5);
  // riflesso
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.ellipse(70, 80, 18, 8, 0, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function nuovaPallina(scura) {
  const g = new THREE.Group();
  const sfera = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 18), new THREE.MeshStandardMaterial({ map: texturaGhianda(scura), roughness: 0.55 }));
  sfera.castShadow = true;
  const punta = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.06, 8), new THREE.MeshStandardMaterial({ color: '#5a3518' }));
  punta.position.y = R + 0.02;
  sfera.add(punta);
  g.add(sfera);
  g.userData.sfera = sfera;
  scena.add(g);
  return g;
}
const pallineVis = { tino: nuovaPallina(false), gino: nuovaPallina(true) };
for (const v of Object.values(pallineVis)) {
  const velo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 20, 14), new THREE.MeshStandardMaterial({ color: '#ffb52a', roughness: 0.05, transparent: true, opacity: 0.6 }));
  velo.visible = false;
  v.add(velo);
  v.userData.velo = velo;
}

// anello che dice "trascina da qui"
const anelloMira = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false }));
anelloMira.rotation.x = -Math.PI / 2;
scena.add(anelloMira);

// freccia della mira
const freccia = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.06, 0); s.lineTo(0.06, 0); s.lineTo(0.06, -0.75); s.lineTo(0.16, -0.75); s.lineTo(0, -1); s.lineTo(-0.16, -0.75); s.lineTo(-0.06, -0.75); s.closePath();
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateX(-Math.PI / 2);
  // ShapeGeometry è nel piano xy: dopo la rotazione y→-z, quindi la punta va verso +z; la giriamo
  geo.rotateY(Math.PI);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  m.renderOrder = 2;
  scena.add(m);
  return m;
})();
const puntini = [];
for (let i = 0; i < 16; i++) {
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }));
  scena.add(p); puntini.push(p);
}

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
const ombraTex = texturaOmbra();

function nuovoPersonaggio(chi) {
  const alto = chi === 'tino' ? 1.05 : 0.72;
  const largo = chi === 'tino' ? alto * (376 / 512) : alto * (381 / 470);
  const radice = new THREE.Group();
  const perno = new THREE.Group();     // si gira verso la telecamera
  const corpo = new THREE.Group();     // saltelli, schiacciamenti, rotazioni
  const geo = new THREE.PlaneGeometry(largo, alto);
  geo.translate(0, alto / 2, 0);
  const mat = new THREE.MeshBasicMaterial({ map: chi === 'tino' ? FACCE.normale : FACCE.gino, transparent: true, alphaTest: 0.08 });
  const foto = new THREE.Mesh(geo, mat);
  foto.renderOrder = 1;
  corpo.add(foto);
  perno.add(corpo);
  radice.add(perno);
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(largo * 1.1, largo * 0.6), new THREE.MeshBasicMaterial({ map: ombraTex, transparent: true, depthWrite: false }));
  ombra.rotation.x = -Math.PI / 2;
  ombra.position.y = 0.012;
  radice.add(ombra);
  // la mazza
  const mazza = new THREE.Group();
  const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 8), new THREE.MeshStandardMaterial({ color: '#f4f0e8', roughness: 0.4 }));
  const testa = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.18, 4, 10), new THREE.MeshStandardMaterial({ color: chi === 'tino' ? '#ff8e7c' : '#7cb8ff', roughness: 0.5 }));
  testa.rotation.z = Math.PI / 2;
  testa.castShadow = true;
  mazza.add(asta); mazza.add(testa);
  scena.add(mazza);
  scena.add(radice);
  return {
    chi, radice, perno, corpo, foto, mat, ombra, mazza, asta, testa, alto, largo,
    pos: new THREE.Vector3(), da: new THREE.Vector3(), a: new THREE.Vector3(),
    salto: 0, saltoDur: 0, faccia: 'normale', faccia2: null, finoFaccia: 0,
    anim: null, animT: 0, swing: 0, impugna: false,
  };
}
const PERS = { tino: nuovoPersonaggio('tino'), gino: nuovoPersonaggio('gino') };

function faccia(p, f, durata = 0) {
  if (p.chi !== 'tino') return;
  if (durata > 0) { p.faccia2 = f; p.finoFaccia = stato.t + durata; } else p.faccia = f;
}
function animazione(p, tipo) { p.anim = tipo; p.animT = 0; }

/* ---------------------------------------------------------------- telecamera */
const cam = {
  yaw: 0, pitch: CAMERA.alzo, dist: CAMERA.distanza,
  yawObj: 0, pitchObj: CAMERA.alzo, distObj: CAMERA.distanza,
  bersaglio: new THREE.Vector3(), bersaglioObj: new THREE.Vector3(),
  manuale: false, vista: false, intro: null,
};

function adatta() {
  const w = palco.clientWidth, h = palco.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const hf = (CAMERA.fovOrizzontale * Math.PI) / 180;
  let vf = (2 * Math.atan(Math.tan(hf / 2) / camera.aspect) * 180) / Math.PI;
  camera.fov = Math.max(44, Math.min(84, vf));
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', adatta);

function limiti(m) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxY = 0;
  for (const b of m.blocchi) {
    minX = Math.min(minX, b.minX); maxX = Math.max(maxX, b.maxX);
    minZ = Math.min(minZ, b.minZ); maxZ = Math.max(maxZ, b.maxZ);
    maxY = Math.max(maxY, b.asc ? b.asc.su : b.h + Math.abs(b.gx) * 20 + Math.abs(b.gz) * 20);
  }
  return { minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, maxY };
}

function vistaAlto() {
  const L = limiti(stato.mondo);
  const grande = Math.max(L.maxX - L.minX, (L.maxZ - L.minZ) * Math.min(1.4, camera.aspect));
  return {
    bersaglio: new THREE.Vector3(L.cx, 0.4, L.cz),
    dist: Math.max(8, grande * 0.95 / Math.min(1, camera.aspect) + 2),
    pitch: 1.12,
  };
}

/* Verso dove guardare: il punto dopo, lungo la strada per la buca. */
function direzioneConsigliata(m, b) {
  let best = Infinity, punto = null;
  const C = m.catena;
  for (let i = 0; i < C.length; i++) {
    const s = C[i];
    if (s.salto) continue;
    const sx = s.bx - s.ax, sz = s.bz - s.az, l2 = sx * sx + sz * sz;
    let u = l2 > 0 ? ((b.x - s.ax) * sx + (b.z - s.az) * sz) / l2 : 0;
    u = Math.max(0, Math.min(1, u));
    const d = Math.hypot(b.x - s.ax - sx * u, b.z - s.az - sz * u) + Math.abs(b.y - (s.ay + (s.by - s.ay) * u)) * 4;
    if (d < best) { best = d; punto = [s.bx, s.bz]; if (Math.hypot(b.x - s.bx, b.z - s.bz) < 1 && C[i + 1] && !C[i + 1].salto) punto = [C[i + 1].bx, C[i + 1].bz]; }
  }
  const B = m.buca;
  if (Math.hypot(B.x - b.x, B.z - b.z) < 3.5 && Math.abs(B.y - b.y) < 0.2) punto = [B.x, B.z];
  if (!punto) punto = [B.x, B.z];
  return angDa(punto[0] - b.x, punto[1] - b.z);
}

/* ---------------------------------------------------------------- partita */
const PERS_GIOCATORI = {
  avventura: [{ nome: 'Tino', pers: 'tino', cpu: false }],
  cpu: [{ nome: 'Tino', pers: 'tino', cpu: false }, { nome: 'Gino', pers: 'gino', cpu: true }],
  due: [{ nome: 'Tino', pers: 'tino', cpu: false }, { nome: 'Gino', pers: 'gino', cpu: false }],
  demo: [{ nome: 'Gino', pers: 'gino', cpu: true }],
};

function iniziaPartita(modo, buca = 0) {
  stato.modo = modo;
  stato.giocatori = PERS_GIOCATORI[modo].map((g) => ({ ...g, punti: [] }));
  audio.silenzio = modo === 'demo';
  aggiornaVolumi();
  caricaBuca(buca);
}

function giocatore() { return stato.giocatori[stato.turno]; }

function caricaBuca(n) {
  stato.buca = n;
  const campo = CAMPI[n];
  stato.mondo = creaMondo(campo);
  if (gruppoBuca) { scena.remove(gruppoBuca); libera(gruppoBuca); }
  if (gruppoDeco) { scena.remove(gruppoDeco); libera(gruppoDeco); }
  gruppoBuca = costruisci(stato.mondo, n + 1);
  gruppoDeco = decorazioni(stato.mondo, n + 1);
  scena.add(gruppoBuca); scena.add(gruppoDeco);
  const pal = PALETTE[campo.palette] || PALETTE.menta;
  scena.background = new THREE.Color(pal.spazio);
  scena.fog = new THREE.Fog(pal.spazio, 26, 75);
  cielo.groundColor = new THREE.Color(pal.spazio).lerp(new THREE.Color(pal.lati), 0.35);
  document.body.style.background = pal.spazio;
  $('.barra').style.background = new THREE.Color(pal.lati).lerp(new THREE.Color('#2f4f4f'), 0.25).getStyle();
  // ombre: la luce copre tutta la buca
  const L = limiti(stato.mondo);
  const grande = Math.max(L.maxX - L.minX, L.maxZ - L.minZ) / 2 + 3;
  sole.position.set(L.cx - 6, 14, L.cz + 8);
  sole.target.position.set(L.cx, 0, L.cz);
  const sc = sole.shadow.camera;
  sc.left = -grande; sc.right = grande; sc.top = grande; sc.bottom = -grande; sc.near = 1; sc.far = 40;
  sc.updateProjectionMatrix();
  stato.turno = 0;
  for (const g of stato.giocatori) g.colpi = 0;
  stato.t = 0;
  iniziaTurno(true);
}

function libera(o) {
  o.traverse((x) => {
    if (x.geometry) x.geometry.dispose();
    if (x.material) for (const m of [].concat(x.material)) { if (m.map && m.map !== ombraTex) m.map.dispose(); m.dispose(); }
  });
}

function iniziaTurno(primo) {
  const m = stato.mondo, g = giocatore();
  const [x, z] = m.campo.tee;
  stato.palla = nuovaPalla(m, x, z, stato.t);
  g.colpi = 0;
  stato.ia = null;
  stato.mira.trascina = null;
  stato.mira.ang = direzioneConsigliata(m, stato.palla);
  stato.mira.pot = 0.4;
  cam.manuale = false;
  cam.vista = false;
  $('#btn-vista').classList.remove('attivo');
  // personaggi: chi tira va alla pallina, l'altro aspetta vicino alla bandiera
  const chi = PERS[g.pers], altro = PERS[g.pers === 'tino' ? 'gino' : 'tino'];
  posaGolfista(chi, true);
  posaTifoso(altro);
  for (const p of [chi, altro]) { p.faccia = 'normale'; p.faccia2 = null; p.anim = null; }
  pallineVis.tino.visible = g.pers === 'tino';
  pallineVis.gino.visible = g.pers === 'gino';
  for (const v of Object.values(pallineVis)) { v.userData.sfera.scale.setScalar(1); v.userData.affonda = 0; v.userData.tele = -9; }
  aggiornaHud();
  if (primo && stato.modo !== 'demo' && !stato.test) {
    // giro di presentazione dalla bandiera alla partenza
    const B = m.buca;
    cam.intro = {
      t: 0, dur: 2.6,
      da: { b: new THREE.Vector3(B.x, B.y + 0.3, B.z), yaw: stato.mira.ang + 0.9, pitch: 0.75, dist: 7 },
      a: { b: new THREE.Vector3(x, stato.palla.y + 0.25, z), yaw: stato.mira.ang, pitch: CAMERA.alzo, dist: CAMERA.distanza },
    };
    stato.fase = 'intro';
    const campo = m.campo;
    messaggio(`Buca ${stato.buca + 1}`, `${campo.nome} · par ${campo.par}`, 2.3);
  } else {
    cam.intro = null;
    cam.bersaglio.set(x, stato.palla.y + 0.25, z);
    cam.yaw = cam.yawObj = stato.mira.ang;
    cam.pitch = cam.pitchObj = CAMERA.alzo;
    cam.dist = cam.distObj = CAMERA.distanza;
    stato.fase = 'mira';
    if (!primo && stato.giocatori.length > 1) messaggio(`Tocca a ${g.nome}`, '', 1.4);
  }
  aggiornaHud();
  aiuto();
}

function posaGolfista(p, subito) {
  const b = stato.palla;
  const d = dirDa(stato.mira.ang);
  const sx = d.z, sz = -d.x; // a sinistra del tiro
  const dist = p.chi === 'tino' ? 0.62 : 0.48;
  const tx = b.x + sx * dist - d.x * 0.12, tz = b.z + sz * dist - d.z * 0.12;
  const s = supporto(stato.mondo, tx, tz, b.y + 0.5, stato.t);
  const y = s ? s.h : b.y;
  p.a.set(tx, y, tz);
  if (subito || p.pos.distanceTo(p.a) < 0.05) { p.pos.copy(p.a); p.salto = 0; }
  else if (p.salto <= 0) { p.da.copy(p.pos); p.salto = 0.0001; p.saltoDur = Math.min(0.9, 0.35 + p.pos.distanceTo(p.a) * 0.08); }
  p.impugna = true;
}

function posaTifoso(p) {
  const m = stato.mondo, B = m.buca;
  p.impugna = false;
  const prove = [[0.95, 0.55], [-0.95, 0.55], [0.95, -0.55], [-0.95, -0.55], [0.6, 0.9], [-0.6, 0.9], [0, 1.0]];
  for (const [ox, oz] of prove) {
    const x = B.x + ox, z = B.z + oz;
    const s = supporto(m, x, z, B.y + 0.3, 0);
    if (s && Math.abs(s.h - B.y) < 0.05 && !m.zone.some((zn) => ((x - zn.x) / zn.rx) ** 2 + ((z - zn.z) / zn.rz) ** 2 < 1.3)) {
      p.pos.set(x, s.h, z); p.a.copy(p.pos); p.salto = 0;
      return;
    }
  }
  p.pos.set(B.x + 0.7, B.y, B.z + 0.4); p.a.copy(p.pos);
}

function tiro(ang, pot) {
  const b = stato.palla, g = giocatore();
  if (stato.fase !== 'mira') return;
  stato.mira.ang = ang;
  stato.mira.pot = pot;
  stato.tiroDa = { x: b.x, y: b.y, z: b.z };
  tira(b, ang, pot);
  g.colpi++;
  stato.statistiche.tiri++;
  stato.fase = 'rotola';
  stato.timer = 0;
  stato.mira.trascina = null;
  const p = PERS[g.pers];
  p.swing = 1;
  suoni.colpo(pot);
  faccia(p, 'normale');
  cam.manuale = false;
  aggiornaHud();
  aiuto();
}

const NOMI_ESITO = (colpi, par) => {
  if (colpi === 1) return 'Al primo colpo!';
  const d = colpi - par;
  if (d <= -2) return 'Fantastico!';
  if (d === -1) return 'Sotto il par!';
  if (d === 0) return 'Par!';
  if (d === 1) return 'Un colpo in più';
  return `${d} colpi in più`;
};
const stelleDi = (colpi, par) => (colpi <= par ? 3 : colpi === par + 1 ? 2 : 1);

/* Eventi della fisica: suoni ed effetti. */
function ev(tipo, info) {
  const t = stato.t;
  switch (tipo) {
    case 'sponda': suoni.sponda(info.v); break;
    case 'bordo': suoni.bordo(info.v); break;
    case 'palo': suoni.palo(info.v); break;
    case 'fungo': {
      suoni.fungo();
      for (const p of stato.mondo.pali) if (p.t === 'fungo' && Math.hypot(p.x - info.x, p.z - info.z) < p.r + 0.3) p.colpo = t;
      break;
    }
    case 'labbro': suoni.labbro(); break;
    case 'buca': suoni.buca(); break;
    case 'acqua': suoni.acqua(); scintille(info.x, info.y, info.z, '#bfeaff', 18, 2.5); break;
    case 'tele': {
      suoni.tele();
      scintille(info.da.x, info.da.y + 0.1, info.da.z, '#ffffff', 12, 1.6);
      const v = pallaVis(); v.userData.tele = t;
      break;
    }
    case 'molla': suoni.molla(); if (info.o.vis) info.o.vis.colpo = t; break;
    case 'presa': suoni.presa(); messaggio('Presa!', 'la campana tiene la pallina', 1.2); faccia(PERS.tino, 'arrabbiato', 1.5); break;
    case 'miele': suoni.miele(); scintille(info.x, info.y, info.z, '#ffb52a', 10, 1.2); break;
    case 'sputa': suoni.sputa(); break;
    case 'campana': suoni.palo(info.v); break;
    case 'atterra': suoni.atterra(info.v); break;
    case 'rimbalzo': suoni.atterra(info.v); break;
    case 'fuori': suoni.fuori(); break;
  }
}

function pallaVis() { return pallineVis[giocatore().pers]; }

/* Un passo di fisica (anche le cose che si muovono). */
function passoFisica() {
  const b = stato.palla;
  passo(stato.mondo, b, stato.fase === 'rotola' ? ev : null);
  stato.t = b.t;
  if (stato.fase === 'rotola') {
    stato.timer += FISICA.dt;
    if (b.esito) { finisciTiro(b.esito); return; }
    if (b.fermo) {
      stato.fermoDa = (stato.fermoDa || 0) + FISICA.dt;
      if (stato.fermoDa > 0.25) finisciTiro(null);
    } else stato.fermoDa = 0;
    if (stato.timer > FISICA.durataMax + 6) { b.vx = b.vz = 0; finisciTiro(null); }
  } else if (b.presa < 0 && !b.fermo && stato.fase === 'mira') {
    // qualcosa ha spostato la pallina ferma (girandola, ascensore): torna a rotolare
    stato.fase = 'rotola'; stato.timer = 0; stato.fermoDa = 0;
  }
}

function finisciTiro(esito) {
  const g = giocatore(), b = stato.palla, p = PERS[g.pers];
  const altro = PERS[g.pers === 'tino' ? 'gino' : 'tino'];
  const campo = stato.mondo.campo;
  stato.fermoDa = 0;
  if (esito === 'buca') {
    stato.fase = 'esito';
    const nome = NOMI_ESITO(g.colpi, campo.par);
    messaggio(nome, g.colpi === 1 ? '' : `${g.colpi} colpi`, 1.9);
    suoni.premio(stelleDi(g.colpi, campo.par));
    const v = pallaVis(); v.userData.affonda = stato.t;
    coriandoli(b.x, b.y, b.z);
    animazione(p, 'saltello'); animazione(altro, g.colpi <= campo.par ? 'saltello' : null);
    if (gruppoBuca.userData.asta) gruppoBuca.userData.asta.userData.salta = stato.t;
    dopo(2.0, () => fineBucaGiocatore(g.colpi));
    return;
  }
  if (esito === 'fuori' || esito === 'acqua') {
    g.colpi++;
    stato.fase = 'esito';
    messaggio(esito === 'acqua' ? 'Nel laghetto!' : 'Giù di sotto!', '+1 colpo, si riparte da dove avevi tirato', 1.6);
    faccia(p, 'ferito', 1.6);
    if (p.chi === 'gino') animazione(p, 'trema');
    animazione(altro, altro.chi === 'gino' ? 'trema' : null);
    if (altro.chi === 'tino') faccia(altro, 'arrabbiato', 1.5);
    const v = pallaVis(); if (esito === 'acqua') v.userData.affonda = stato.t;
    aggiornaHud();
    dopo(1.5, () => {
      if (g.colpi >= MAX_COLPI) { bastaCosi(); return; }
      const nb = nuovaPalla(stato.mondo, b.da.x, b.da.z, stato.t);
      stato.palla = nb;
      v.userData.affonda = 0; v.userData.sfera.scale.setScalar(1);
      prontoAlTiro();
    });
    return;
  }
  // fermo
  if (g.colpi >= MAX_COLPI) { bastaCosi(); return; }
  if (b.miele) { messaggio('Appiccicata!', 'nel miele il prossimo tiro ha metà forza', 1.8); if (p.chi === 'tino') faccia(p, 'arrabbiato', 1.8); else animazione(p, 'trema'); }
  prontoAlTiro();
}

function bastaCosi() {
  const g = giocatore();
  stato.fase = 'esito';
  g.colpi = MAX_COLPI;
  messaggio('Basta così!', `${MAX_COLPI} colpi`, 1.6);
  faccia(PERS.tino, g.pers === 'tino' ? 'ko' : 'normale', 2);
  if (g.pers === 'gino') animazione(PERS.gino, 'cade');
  suoni.peccato();
  dopo(1.8, () => fineBucaGiocatore(MAX_COLPI));
}

function prontoAlTiro() {
  const b = stato.palla;
  stato.fase = 'mira';
  stato.ia = null;
  if (!cam.manuale && !cam.vista) cam.yawObj = direzioneConsigliata(stato.mondo, b);
  stato.mira.ang = direzioneConsigliata(stato.mondo, b);
  stato.mira.pot = Math.min(0.6, Math.max(0.12, strada(stato.mondo, b.x, b.y, b.z) / 16));
  const p = PERS[giocatore().pers];
  posaGolfista(p, false);
  // tiro decisivo: Tino si concentra
  const B = stato.mondo.buca;
  if (p.chi === 'tino' && Math.hypot(B.x - b.x, B.z - b.z) < 2.2 && Math.abs(B.y - b.y) < 0.1) faccia(p, 'arrabbiato');
  else if (p.chi === 'tino') faccia(p, 'normale');
  aggiornaHud();
  aiuto();
}

function fineBucaGiocatore(colpi) {
  const g = giocatore();
  g.punti[stato.buca] = colpi;
  rotola(0);
  if (stato.modo === 'demo') {
    caricaBuca((stato.buca + 1) % CAMPI.length);
    return;
  }
  if (stato.turno + 1 < stato.giocatori.length) {
    stato.turno++;
    iniziaTurno(false);
    return;
  }
  // tutti hanno finito la buca
  const campo = stato.mondo.campo;
  if (stato.modo === 'avventura') {
    const n = stato.buca;
    const st = stelleDi(colpi, campo.par);
    const nuovaStella = st > (stato.stelle[n] || 0);
    stato.stelle[n] = Math.max(stato.stelle[n] || 0, st);
    const record = !stato.migliori[n] || colpi < stato.migliori[n];
    if (record) stato.migliori[n] = colpi;
    if (n + 1 < CAMPI.length && stato.sbloccati < n + 2) stato.sbloccati = n + 2;
    scrivi('stelle', stato.stelle); scrivi('migliori', stato.migliori); scrivi('sbloccati', stato.sbloccati);
    stato.fase = 'fine';
    if (!stato.test) mostraPannello(pannelloFineBuca(colpi, st, record && colpi < MAX_COLPI, nuovaStella));
    return;
  }
  stato.fase = 'fine';
  if (!stato.test) mostraPannello(stato.buca + 1 < CAMPI.length ? pannelloCartellino(false) : pannelloCartellino(true));
}

function dopo(s, f) { stato.dopo = { t: s, f }; }

/* ---------------------------------------------------------------- computer */
function pensaIA(budgetMs) {
  const g = giocatore(), b = stato.palla;
  if (!g.cpu || stato.fase !== 'mira') return;
  if (aspettaAscensore(stato.mondo, b)) { stato.ia = null; return; }
  if (!stato.ia) {
    stato.iaAnticipo = stato.iaAnticipo || 1.1;
    const anticipo = Math.round(stato.iaAnticipo / FISICA.dt) * FISICA.dt;
    const base = copiaPalla(b);
    base.t = b.t + anticipo;
    stato.ia = { base, gen: cercaTiro(stato.mondo, base, 20, stato.modo === 'demo' ? 'bravo' : 'gino'), tiro: null, quando: 0, inizio: performance.now(), mostra: 0 };
  }
  const ia = stato.ia;
  if (!ia.tiro) {
    const fine = performance.now() + budgetMs;
    while (performance.now() < fine) {
      const x = ia.gen.next();
      if (x.done) {
        ia.tiro = stato.modo === 'demo' ? sbaglia(x.value, 'bravo') : sbaglia(x.value, 'gino');
        ia.quando = ia.base.t + ia.tiro.rit;
        // se niente si muove, il momento del tiro non conta: si tira appena pronto (dopo una breve pausa)
        if (!muove(stato.mondo)) ia.quando = Math.max(b.t + 0.5, Math.min(ia.quando, b.t + 0.5));
        break;
      }
    }
    if (!ia.tiro) return;
  }
  if (muove(stato.mondo) && b.t > ia.quando + 1e-6) { stato.ia = null; stato.iaAnticipo = Math.min(6, (stato.iaAnticipo || 1.1) * 1.8); } // troppo tardi: si ripensa con più tempo
}

function aggiornaIA() {
  const ia = stato.ia, b = stato.palla;
  if (!ia || !ia.tiro || stato.fase !== 'mira') return;
  // mostra la mira che si gira verso il tiro scelto
  const k = Math.min(1, ia.mostra);
  const diff = Math.atan2(Math.sin(ia.tiro.ang - stato.mira.ang), Math.cos(ia.tiro.ang - stato.mira.ang));
  stato.mira.ang += diff * Math.min(1, 0.12 + k * 0.3);
  stato.mira.pot += (ia.tiro.pot - stato.mira.pot) * 0.15;
  if (Math.abs(b.t - ia.quando) < FISICA.dt / 2 || (!muove(stato.mondo) && b.t >= ia.quando)) tiro(ia.tiro.ang, ia.tiro.pot);
}

/* ---------------------------------------------------------------- comandi */
const puntatori = new Map();
let gesto = null; // { tipo: 'mira' | 'gira' | 'pizzica', ... }

function umanoPronto() {
  const g = giocatore();
  return stato.fase === 'mira' && g && !g.cpu && stato.palla.fermo && stato.modo !== 'demo';
}

function schermoPalla() {
  const b = stato.palla;
  const v = new THREE.Vector3(b.x, b.y + R, b.z).project(camera);
  return { x: (v.x * 0.5 + 0.5) * palco.clientWidth, y: (-v.y * 0.5 + 0.5) * palco.clientHeight };
}

function lunghezzaMax() {
  return Math.max(120, Math.min(270, Math.min(palco.clientWidth, palco.clientHeight) * 0.34));
}

function miraDaTrascina(tr) {
  const dx = tr.x - tr.x0, dy = tr.y - tr.y0;
  const l = Math.hypot(dx, dy);
  const pot = Math.min(1, l / lunghezzaMax());
  if (l < 4) return null;
  const yaw = cam.yaw;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const wx = rx * -dx + fx * dy, wz = rz * -dx + fz * dy;
  return { ang: angDa(wx, wz), pot };
}

tela.addEventListener('contextmenu', (e) => e.preventDefault());
tela.addEventListener('pointerdown', (e) => {
  sblocca(); avviaMusica();
  try { tela.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
  puntatori.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (stato.fase === 'intro') { saltaIntro(); return; }
  if (puntatori.size === 2) {
    const [a, b] = [...puntatori.values()];
    if (gesto && gesto.tipo === 'mira') annullaMira();
    gesto = { tipo: 'pizzica', d0: Math.hypot(a.x - b.x, a.y - b.y), dist0: cam.distObj, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, yaw0: cam.yawObj, pitch0: cam.pitchObj };
    return;
  }
  if (puntatori.size > 2) return;
  const sp = umanoPronto() ? schermoPalla() : null;
  const vicino = sp && Math.hypot(e.offsetX - sp.x, e.offsetY - sp.y) < Math.max(80, Math.min(palco.clientWidth, palco.clientHeight) * 0.15);
  if (e.button === 0 && vicino) {
    gesto = { tipo: 'mira' };
    stato.mira.trascina = { x0: e.offsetX, y0: e.offsetY, x: e.offsetX, y: e.offsetY };
    stato.mira.tastiera = false;
    tela.classList.add('mira');
  } else {
    gesto = { tipo: 'gira', x: e.offsetX, y: e.offsetY, mosso: 0 };
    tela.classList.add('gira');
  }
});
tela.addEventListener('pointermove', (e) => {
  if (!puntatori.has(e.pointerId)) return;
  puntatori.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (!gesto) return;
  if (gesto.tipo === 'mira') {
    const tr = stato.mira.trascina;
    tr.x = e.offsetX; tr.y = e.offsetY;
    const mi = miraDaTrascina(tr);
    if (mi) { stato.mira.ang = mi.ang; stato.mira.pot = mi.pot; }
  } else if (gesto.tipo === 'gira') {
    const dx = e.offsetX - gesto.x, dy = e.offsetY - gesto.y;
    gesto.x = e.offsetX; gesto.y = e.offsetY;
    gesto.mosso += Math.abs(dx) + Math.abs(dy);
    giraCamera(dx, dy);
  } else if (gesto.tipo === 'pizzica' && puntatori.size >= 2) {
    const [a, b] = [...puntatori.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    cam.distObj = Math.max(CAMERA.min, Math.min(CAMERA.max, (gesto.dist0 * gesto.d0) / Math.max(20, d)));
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    giraCamera(mx - gesto.mx, my - gesto.my);
    gesto.mx = mx; gesto.my = my;
  }
});
function fineGesto(e) {
  puntatori.delete(e.pointerId);
  if (!gesto) return;
  if (gesto.tipo === 'mira') {
    const tr = stato.mira.trascina;
    const mi = tr && miraDaTrascina(tr);
    stato.mira.trascina = null;
    tela.classList.remove('mira');
    if (mi && mi.pot >= 0.03 && umanoPronto() && e.type !== 'pointercancel') tiro(mi.ang, mi.pot);
    gesto = null;
  } else if (puntatori.size === 0) {
    gesto = null;
    tela.classList.remove('gira');
  }
}
tela.addEventListener('pointerup', fineGesto);
tela.addEventListener('pointercancel', fineGesto);
tela.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.distObj = Math.max(CAMERA.min, Math.min(CAMERA.max, cam.distObj * Math.exp(e.deltaY * 0.0012)));
}, { passive: false });

function annullaMira() { stato.mira.trascina = null; tela.classList.remove('mira'); }

function giraCamera(dx, dy) {
  if (cam.vista) { cam.vista = false; $('#btn-vista').classList.remove('attivo'); cam.distObj = CAMERA.distanza; }
  cam.yawObj -= dx * 0.008;
  cam.pitchObj = Math.max(CAMERA.alzoMin, Math.min(CAMERA.alzoMax, cam.pitchObj + dy * 0.006));
  cam.manuale = true;
}

function saltaIntro() {
  if (stato.fase !== 'intro') return;
  cam.intro = null;
  const b = stato.palla;
  cam.bersaglio.set(b.x, b.y + 0.25, b.z);
  cam.yaw = cam.yawObj = stato.mira.ang;
  cam.pitch = cam.pitchObj = CAMERA.alzo;
  cam.dist = cam.distObj = CAMERA.distanza;
  stato.fase = 'mira';
  aiuto();
}

const tasti = new Set();
window.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input, textarea')) return;
  sblocca(); avviaMusica();
  const k = e.code;
  if (k === 'KeyP' || k === 'Escape') { e.preventDefault(); if (stato.fase === 'pausa') riprendi(); else pausa(); return; }
  if (k === 'KeyM') { cambiaAudio(); return; }
  if (k === 'KeyN') { cambiaMusica(); return; }
  if (pannelloAperto()) return;
  if (k === 'KeyV') { cambiaVista(); return; }
  if (stato.fase === 'intro' && (k === 'Space' || k === 'Enter')) { e.preventDefault(); saltaIntro(); return; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(k)) e.preventDefault();
  if ((k === 'Space' || k === 'Enter') && umanoPronto() && stato.mira.tastiera) { tiro(stato.mira.ang, stato.mira.pot); return; }
  if ((k === 'Space' || k === 'Enter') && umanoPronto()) { stato.mira.tastiera = true; return; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k) && umanoPronto()) {
    if (!stato.mira.tastiera) { stato.mira.tastiera = true; cam.manuale = false; }
  }
  tasti.add(k);
});
window.addEventListener('keyup', (e) => tasti.delete(e.code));
window.addEventListener('blur', () => tasti.clear());

function tastiera(dt) {
  if (!umanoPronto()) return;
  const fino = tasti.has('ShiftLeft') || tasti.has('ShiftRight') ? 0.25 : 1;
  if (tasti.has('ArrowLeft')) stato.mira.ang += 1.1 * fino * dt;
  if (tasti.has('ArrowRight')) stato.mira.ang -= 1.1 * fino * dt;
  if (tasti.has('ArrowUp')) stato.mira.pot = Math.min(1, stato.mira.pot + 0.5 * fino * dt);
  if (tasti.has('ArrowDown')) stato.mira.pot = Math.max(0.03, stato.mira.pot - 0.5 * fino * dt);
  if (stato.mira.tastiera && !cam.manuale && !cam.vista) cam.yawObj = stato.mira.ang;
  if (tasti.has('KeyA') || tasti.has('KeyQ')) giraCamera(-260 * dt, 0);
  if (tasti.has('KeyD') || tasti.has('KeyE')) giraCamera(260 * dt, 0);
  if (tasti.has('KeyW')) cam.distObj = Math.max(CAMERA.min, cam.distObj - 5 * dt);
  if (tasti.has('KeyS')) cam.distObj = Math.min(CAMERA.max, cam.distObj + 5 * dt);
}

function cambiaVista() {
  if (!stato.mondo || stato.fase === 'menu') return;
  cam.vista = !cam.vista;
  $('#btn-vista').classList.toggle('attivo', cam.vista);
  if (!cam.vista) { cam.distObj = CAMERA.distanza; cam.pitchObj = CAMERA.alzo; }
}

/* ---------------------------------------------------------------- animazione */
let ultimo = performance.now(), accumulo = 0;
const tmp = new THREE.Vector3();

function aggiorna(dt) {
  dt = Math.min(dt, 0.1);
  if (stato.fase === 'pausa' || !stato.mondo) return;
  tastiera(dt);
  if (stato.dopo) {
    stato.dopo.t -= dt;
    if (stato.dopo.t <= 0) { const f = stato.dopo.f; stato.dopo = null; f(); }
  }
  if (!stato.mondo) return;
  accumulo += dt;
  let n = 0;
  while (accumulo >= FISICA.dt && n < 24) {
    if (stato.fase !== 'esito' && stato.fase !== 'fine') {
      aggiornaIA();
      passoFisica();
    } else {
      stato.t += FISICA.dt;
      stato.palla.t = stato.t;
    }
    accumulo -= FISICA.dt; n++;
  }
  if (n === 24) accumulo = 0;
  if (stato.fase === 'mira' && giocatore().cpu) pensaIA(stato.test ? 1e9 : 10);
  if (stato.fase === 'mira' && stato.ia && stato.ia.tiro) stato.ia.mostra += dt;
}

function disegna(dt) {
  if (!stato.mondo) { renderer.render(scena, camera); return; }
  const t = stato.t;
  gruppoBuca.userData.aggiorna(t);
  gruppoDeco.userData.aggiorna(t);
  const b = stato.palla;
  // pallina
  const v = pallaVis();
  const ud = v.userData;
  const prima = v.position.clone();
  let yv = b.y + R;
  if (ud.affonda) {
    const u = Math.min(1, (t - ud.affonda) / 0.35);
    yv -= u * 0.3;
    ud.sfera.scale.setScalar(1 - u * 0.4);
  }
  v.position.set(b.x, yv, b.z);
  const mosso = tmp.copy(v.position).sub(prima);
  mosso.y = 0;
  const dist = mosso.length();
  if (dist > 1e-5 && dist < 2) {
    const asse = new THREE.Vector3(mosso.z, 0, -mosso.x).normalize();
    ud.sfera.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(asse, dist / R));
  }
  if (t - ud.tele < 0.3) ud.sfera.scale.setScalar(Math.max(0.05, (t - ud.tele) / 0.3));
  else if (!ud.affonda) ud.sfera.scale.setScalar(1);
  ud.velo.visible = !!b.miele;
  const vel = stato.fase === 'rotola' && !b.aria ? Math.hypot(b.vx, b.vz) : 0;
  rotola(vel);

  // bandiera che salta quando la pallina entra
  const asta = gruppoBuca.userData.asta;
  if (asta) {
    const u = t - (asta.userData.salta || -9);
    asta.position.y = stato.mondo.buca.y + (u >= 0 && u < 0.8 ? Math.sin((u / 0.8) * Math.PI) * 0.5 : 0);
    // si scosta quando la pallina è vicina e lenta
    const d = Math.hypot(b.x - stato.mondo.buca.x, b.z - stato.mondo.buca.z);
    asta.visible = d > 2.2 || stato.fase === 'esito' || Math.abs(b.y - stato.mondo.buca.y) > 0.3;
  }
  // funghi che rimbalzano
  for (const p of stato.mondo.pali) {
    if (!p.vis) continue;
    const u = t - (p.colpo || -9);
    const k = u < 0.4 ? Math.sin(u * 30) * Math.exp(-u * 8) * 0.25 : 0;
    p.vis.scale.set(1 + k, 1 - k, 1 + k);
  }

  aggiornaPersonaggi(dt);
  aggiornaMira();
  aggiornaCamera(dt);
  aggiornaParticelle(dt);
  renderer.render(scena, camera);
}

function aggiornaPersonaggi(dt) {
  const t = stato.t;
  const g = giocatore();
  for (const p of Object.values(PERS)) {
    // salto verso la pallina
    if (p.salto > 0) {
      p.salto += dt / p.saltoDur;
      const u = Math.min(1, p.salto);
      p.pos.lerpVectors(p.da, p.a, u);
      p.pos.y += Math.sin(u * Math.PI) * (0.35 + p.da.distanceTo(p.a) * 0.05);
      if (u >= 1) { p.salto = 0; p.pos.copy(p.a); animazione(p, 'atterra'); }
    } else if (p.impugna && stato.fase === 'mira' && p === PERS[g.pers]) {
      // segue la mira girando attorno alla pallina
      const b = stato.palla, d = dirDa(stato.mira.ang);
      const sx = d.z, sz = -d.x, dist = p.chi === 'tino' ? 0.62 : 0.48;
      const tx = b.x + sx * dist - d.x * 0.12, tz = b.z + sz * dist - d.z * 0.12;
      const s = supporto(stato.mondo, tx, tz, b.y + 0.5, t);
      p.a.set(tx, s ? s.h : b.y, tz);
      p.pos.lerp(p.a, 1 - Math.exp(-dt * 12));
    } else if (p.impugna && stato.palla && p === PERS[g.pers]) {
      // l'ascensore porta su anche chi aspetta
      const s = supporto(stato.mondo, p.pos.x, p.pos.z, p.pos.y + 0.3, t);
      if (s) p.pos.y = s.h;
    }
    p.radice.position.copy(p.pos);
    p.perno.rotation.y = cam.yaw;
    // faccia
    let f = p.faccia;
    if (p.faccia2 && t < p.finoFaccia) f = p.faccia2; else p.faccia2 = null;
    if (p.chi === 'tino' && p.mat.map !== FACCE[f]) { p.mat.map = FACCE[f]; p.mat.needsUpdate = true; }
    // animazioni con le sole trasformazioni
    p.animT += dt;
    const c = p.corpo;
    c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.scale.set(1, 1, 1);
    const respiro = Math.sin(t * 2.4 + (p.chi === 'tino' ? 0 : 1.3)) * 0.02;
    c.scale.set(1 - respiro * 0.5, 1 + respiro, 1);
    if (p.anim === 'saltello') {
      const u = (p.animT % 0.55) / 0.55;
      c.position.y = Math.sin(u * Math.PI) * 0.28;
      c.scale.set(1 + (u < 0.1 ? 0.12 : 0), 1 - (u < 0.1 ? 0.12 : 0), 1);
      if (p.animT > 2.2) p.anim = null;
    } else if (p.anim === 'trema') {
      c.position.x = Math.sin(p.animT * 70) * 0.04 * Math.max(0, 1 - p.animT / 0.8);
      c.rotation.z = Math.sin(p.animT * 50) * 0.08 * Math.max(0, 1 - p.animT / 0.8);
      if (p.animT > 0.8) p.anim = null;
    } else if (p.anim === 'cade') {
      const u = Math.min(1, p.animT / 0.5);
      c.rotation.z = -u * 1.45;
      c.position.x = u * p.alto * 0.35;
    } else if (p.anim === 'atterra') {
      const u = p.animT / 0.25;
      if (u < 1) c.scale.set(1 + 0.15 * (1 - u), 1 - 0.15 * (1 - u), 1); else p.anim = null;
    } else if (p.chi === 'gino' && !p.impugna) {
      c.position.y = Math.abs(Math.sin(t * 2.6)) * 0.06;
      c.rotation.z = Math.sin(t * 1.3) * 0.06;
    }
    // inclinazione mentre tira
    if (p.swing > 0) { p.swing = Math.max(0, p.swing - dt * 2.5); c.rotation.z += Math.sin(p.swing * Math.PI) * 0.12; }
    // mazza
    posaMazza(p, dt);
  }
}

function posaMazza(p, dt) {
  const g = giocatore();
  const mio = p === PERS[g.pers];
  p.mazza.visible = p.impugna && mio && (stato.fase === 'mira' || stato.fase === 'rotola' || stato.fase === 'intro');
  if (!p.mazza.visible) return;
  const b = stato.palla;
  const d = dirDa(stato.mira.ang);
  const sx = d.z, sz = -d.x;
  const mano = new THREE.Vector3(p.pos.x - sx * 0.12, p.pos.y + p.alto * (p.chi === 'tino' ? 0.45 : 0.4), p.pos.z - sz * 0.12);
  // la testa sta dietro la pallina; mirando si tira indietro con la potenza
  let indietro = 0.16, base = b;
  if (stato.fase === 'mira' && (stato.mira.trascina || stato.mira.tastiera || (g.cpu && stato.ia && stato.ia.tiro))) indietro += stato.mira.pot * 0.55;
  if (stato.fase === 'rotola' && stato.tiroDa) {
    base = stato.tiroDa;
    const u = 1 - p.swing;
    indietro = 0.16 - Math.min(1, u * 3) * 0.45;
    if (stato.timer > 1.0) { p.mazza.visible = false; return; }
  }
  const testa = new THREE.Vector3(base.x - d.x * indietro, base.y + 0.05, base.z - d.z * indietro);
  const asse = new THREE.Vector3().subVectors(mano, testa);
  const l = asse.length();
  p.asta.scale.set(1, l, 1);
  p.asta.position.copy(testa).addScaledVector(asse, 0.5);
  p.asta.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), asse.normalize());
  p.testa.position.copy(testa);
  p.testa.rotation.set(0, 0, 0);
  p.testa.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(sx, 0, sz));
}

let ultimaTraccia = null;
function aggiornaMira() {
  const g = giocatore();
  const pronto = stato.fase === 'mira' && stato.palla.fermo;
  const mostra = pronto && (stato.mira.trascina || stato.mira.tastiera || (g.cpu && stato.ia && stato.ia.tiro && stato.modo !== 'demo'));
  const b = stato.palla;
  anelloMira.visible = pronto && !g.cpu && !stato.mira.trascina;
  if (anelloMira.visible) {
    anelloMira.position.set(b.x, b.y + 0.015, b.z);
    const s = 1 + Math.sin(stato.t * 4) * 0.12;
    anelloMira.scale.set(s, s, s);
  }
  const pot = stato.mira.pot;
  const pb = $('#potenza');
  pb.classList.toggle('nascosto', !mostra);
  if (mostra) pb.firstElementChild.style.width = `${Math.round(pot * 100)}%`;
  freccia.visible = !!mostra;
  if (!mostra) { for (const p of puntini) p.visible = false; ultimaTraccia = null; return; }
  freccia.position.set(b.x, b.y + 0.03, b.z);
  freccia.rotation.y = stato.mira.ang;
  const lung = 0.45 + pot * 1.5;
  freccia.scale.set(1, 1, lung);
  const col = new THREE.Color().setHSL(0.33 - pot * 0.33, 0.85, 0.6);
  freccia.material.color.copy(col);
  // traccia: solo l'inizio del tiro
  const chiave = `${stato.mira.ang.toFixed(3)}|${pot.toFixed(3)}|${b.x.toFixed(2)}|${b.z.toFixed(2)}`;
  if (chiave !== ultimaTraccia) {
    ultimaTraccia = chiave;
    const c = copiaPalla(b);
    tira(c, stato.mira.ang, pot);
    let k = 0, i = 0;
    const passi = Math.round(0.6 / FISICA.dt);
    for (; i < passi && k < puntini.length; i++) {
      passo(stato.mondo, c, null);
      if (c.esito) break;
      if (i % 5 === 4) { puntini[k].position.set(c.x, c.y + R * 0.6, c.z); puntini[k].visible = true; k++; }
    }
    for (; k < puntini.length; k++) puntini[k].visible = false;
  }
  puntini.forEach((p, i) => { p.material.opacity = 0.85 * (1 - i / puntini.length); });
}

function aggiornaCamera(dt) {
  const b = stato.palla;
  if (cam.intro) {
    const I = cam.intro;
    I.t += dt;
    const u = Math.min(1, I.t / I.dur), s = u * u * (3 - 2 * u);
    cam.bersaglio.lerpVectors(I.da.b, I.a.b, s);
    cam.yaw = I.da.yaw + (I.a.yaw - I.da.yaw) * s;
    cam.pitch = I.da.pitch + (I.a.pitch - I.da.pitch) * s;
    cam.dist = I.da.dist + (I.a.dist - I.da.dist) * s;
    cam.yawObj = cam.yaw; cam.pitchObj = cam.pitch; cam.distObj = cam.dist;
    if (u >= 1) { cam.intro = null; if (stato.fase === 'intro') { stato.fase = 'mira'; aiuto(); } }
  } else {
    if (cam.vista) {
      const V = vistaAlto();
      cam.bersaglioObj.copy(V.bersaglio);
      cam.distObj = V.dist; cam.pitchObj = V.pitch;
    } else {
      cam.bersaglioObj.set(b.x, b.y + 0.25, b.z);
      if (stato.fase === 'menu' || stato.modo === 'demo') {
        cam.yawObj += dt * 0.08;
      }
    }
    const k = 1 - Math.exp(-dt * CAMERA.segui);
    cam.bersaglio.lerp(cam.bersaglioObj, k);
    const kg = 1 - Math.exp(-dt * CAMERA.giro);
    const dy = Math.atan2(Math.sin(cam.yawObj - cam.yaw), Math.cos(cam.yawObj - cam.yaw));
    cam.yaw += dy * kg;
    cam.pitch += (cam.pitchObj - cam.pitch) * kg;
    cam.dist += (cam.distObj - cam.dist) * kg;
  }
  const cp = Math.cos(cam.pitch);
  camera.position.set(
    cam.bersaglio.x + Math.sin(cam.yaw) * cp * cam.dist,
    cam.bersaglio.y + Math.sin(cam.pitch) * cam.dist,
    cam.bersaglio.z + Math.cos(cam.yaw) * cp * cam.dist,
  );
  camera.lookAt(cam.bersaglio.x, cam.bersaglio.y + 0.15, cam.bersaglio.z);
}

/* ---------------------------------------------------------------- particelle */
const particelle = [];
const geoCoriandolo = new THREE.PlaneGeometry(0.07, 0.11);
const geoScintilla = new THREE.SphereGeometry(0.04, 6, 4);
function coriandoli(x, y, z) {
  const colori = ['#ff6f91', '#ffd34d', '#6fd17a', '#5aa9ff', '#c58cff', '#ffffff'];
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Mesh(geoCoriandolo, new THREE.MeshBasicMaterial({ color: colori[i % colori.length], side: THREE.DoubleSide }));
    const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 2;
    m.position.set(x, y + 0.2, z);
    m.userData = { vx: Math.cos(a) * v, vy: 3 + Math.random() * 3, vz: Math.sin(a) * v, vita: 2.2, giro: (Math.random() - 0.5) * 18, cade: 0.9 };
    scena.add(m); particelle.push(m);
  }
}
function scintille(x, y, z, colore, n, forza) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geoScintilla, new THREE.MeshBasicMaterial({ color: colore, transparent: true }));
    const a = Math.random() * Math.PI * 2, v = Math.random() * forza;
    m.position.set(x, y + 0.1, z);
    m.userData = { vx: Math.cos(a) * v, vy: 1 + Math.random() * forza, vz: Math.sin(a) * v, vita: 0.8, giro: 0, cade: 1 };
    scena.add(m); particelle.push(m);
  }
}
function aggiornaParticelle(dt) {
  for (let i = particelle.length - 1; i >= 0; i--) {
    const m = particelle[i], u = m.userData;
    u.vita -= dt;
    if (u.vita <= 0) { scena.remove(m); m.material.dispose(); particelle.splice(i, 1); continue; }
    u.vy -= 9.8 * u.cade * dt * (u.giro ? 0.35 : 1);
    if (u.giro) { u.vx *= 0.98; u.vz *= 0.98; u.vy = Math.max(u.vy, -1.2); m.rotation.x += u.giro * dt; m.rotation.y += u.giro * 0.7 * dt; }
    m.position.x += u.vx * dt; m.position.y += u.vy * dt; m.position.z += u.vz * dt;
    if (m.material.transparent) m.material.opacity = Math.min(1, u.vita * 2);
  }
}

/* ---------------------------------------------------------------- HUD */
let timerMessaggio = 0;
function messaggio(testo, sotto = '', durata = 1.5) {
  if (stato.test || stato.modo === 'demo') return;
  const el = $('#messaggio');
  el.innerHTML = `${testo}${sotto ? `<small>${sotto}</small>` : ''}`;
  el.classList.add('visibile');
  clearTimeout(timerMessaggio);
  timerMessaggio = setTimeout(() => el.classList.remove('visibile'), durata * 1000);
}

function aggiornaHud() {
  const campo = CAMPI[stato.buca];
  const demo = stato.modo === 'demo';
  $('#info-buca').innerHTML = demo ? 'Tino Golf' : `Buca <b>${stato.buca + 1}</b> di ${CAMPI.length} · par ${campo.par}`;
  const g = giocatore();
  const tu = $('#turno');
  tu.classList.toggle('nascosto', demo || !g);
  if (g && !demo) {
    const img = g.pers === 'tino' ? 'tino/tino-normale.png' : 'gino/gino.png';
    tu.innerHTML = `<img src="${ASSETS}${img}" alt="">${g.nome}${g.cpu ? ' (computer)' : ''} <small>· colpo ${Math.min(MAX_COLPI, g.colpi + (stato.fase === 'rotola' || stato.fase === 'esito' ? 0 : 1))}</small>`;
  }
  const pu = $('#punteggi');
  const multi = stato.giocatori.length > 1 && !demo;
  pu.classList.toggle('nascosto', !multi);
  if (multi) {
    pu.innerHTML = stato.giocatori.map((x, i) => {
      const tot = x.punti.reduce((a, c) => a + (c || 0), 0) + (i === stato.turno ? x.colpi : 0);
      const img = x.pers === 'tino' ? 'tino/tino-normale.png' : 'gino/gino.png';
      const diff = x.punti.reduce((a, c, k) => a + (c || 0) - CAMPI[k].par, 0);
      const cls = diff < 0 ? 'sotto' : diff > 0 ? 'sopra' : '';
      return `<div><img src="${ASSETS}${img}" alt="">${x.nome}<b class="${cls}">${tot}</b></div>`;
    }).join('');
  }
}

function aiuto() {
  const el = $('#aiuto');
  const g = giocatore();
  let testo = '';
  if (stato.fase === 'mira' && g && !g.cpu && stato.modo !== 'demo' && stato.statistiche.tiri < 3 && stato.buca === 0) {
    testo = dito ? 'Trascina indietro dalla pallina e lascia · con un dito altrove giri la vista'
      : 'Trascina indietro dalla pallina e lascia · trascina altrove per girare la vista · oppure ← → ↑ ↓ e Spazio';
  } else if (stato.fase === 'mira' && g && !g.cpu && stato.palla && stato.palla.miele) testo = 'La pallina è nel miele: questo tiro ha metà forza';
  else if (stato.fase === 'mira' && g && g.cpu && stato.modo !== 'demo') testo = 'Gino ci pensa…';
  el.textContent = testo;
  el.classList.toggle('nascosto', !testo);
}

/* ---------------------------------------------------------------- pannelli */
function pannelloAperto() { return pannello.classList.contains('visibile'); }
function mostraPannello(html) {
  pannello.innerHTML = html;
  pannello.classList.add('visibile');
  const primo = pannello.querySelector('[data-primo]') || pannello.querySelector('button');
  if (primo && !dito) primo.focus({ preventScroll: true });
}
function chiudiPannello() { pannello.classList.remove('visibile'); pannello.innerHTML = ''; }

const ritratto = (cls = '', clsG = '') => `<div class="ritratti"><img class="${cls}" src="${ASSETS}tino/tino-normale.png" alt="Tino"><img class="gino ${clsG}" src="${ASSETS}gino/gino.png" alt="Gino"></div>`;

function pannelloMenu() {
  const stelle = stato.stelle.reduce((a, c) => a + (c || 0), 0);
  return `<div class="riquadro">
    ${ritratto('', 'salta')}
    <h1>Tino Golf</h1>
    <p>Minigolf in un mondo morbido: dossi, girandole, laghetti, miele, anelli magici e ascensori.</p>
    <div class="scelte">
      <button class="bottone" data-azione="avventura" data-primo>Avventura</button>
      <button class="bottone secondario" data-azione="cpu">Contro Gino</button>
      <button class="bottone secondario" data-azione="due">In due</button>
    </div>
    <p class="dettagli">${stelle ? `Stelle raccolte: ${stelle} su ${CAMPI.length * 3}` : `${CAMPI.length} buche`}</p>
    <div class="comandi">
      <p><b>Come si gioca</b></p>
      <ul>
        <li>Trascina <b>all'indietro partendo dalla pallina</b> e lascia: più lungo, più forte.</li>
        <li>${dito ? 'Trascina altrove per girare la vista; con due dita avvicini e allontani.' : 'Trascina altrove (o col tasto destro) per girare la vista; con la rotella avvicini e allontani.'}</li>
        ${dito ? '' : '<li>Con la tastiera: <kbd>←</kbd> <kbd>→</kbd> mira, <kbd>↑</kbd> <kbd>↓</kbd> potenza, <kbd>Spazio</kbd> tira; <kbd>A</kbd> <kbd>D</kbd> girano la vista.</li>'}
        <li>${dito ? "L'occhio" : "<kbd>V</kbd> o l'occhio"} in alto: tutta la buca dall'alto. Al massimo ${MAX_COLPI} colpi a buca.</li>
      </ul>
    </div>
  </div>`;
}

function pannelloBuche() {
  const schede = CAMPI.map((c, i) => {
    const pal = PALETTE[c.palette] || PALETTE.menta;
    const aperta = i < stato.sbloccati;
    const st = stato.stelle[i] || 0;
    return `<button class="buca-scheda" style="--colore:${pal.prato}" data-buca="${i}" ${aperta ? '' : 'disabled'}>
      <b>Buca ${i + 1} · par ${c.par}</b><span>${aperta ? c.nome : '???'}</span>
      <i>${'★'.repeat(st)}${'☆'.repeat(3 - st)}${stato.migliori[i] ? ` · ${stato.migliori[i]} colpi` : ''}</i></button>`;
  }).join('');
  return `<div class="riquadro">
    <h2>Avventura</h2>
    <p class="dettagli">Finisci una buca per aprire quella dopo. Tre stelle al par o meglio.</p>
    <div class="buche">${schede}</div>
    <div class="scelte"><button class="bottone secondario" data-azione="menu">Indietro</button></div>
  </div>`;
}

function pannelloNovita(id) {
  const N = NOVITA[id];
  return `<div class="riquadro">
    ${ritratto('oscilla')}
    <h2>${N.titolo}</h2>
    <div class="novita-testo">${N.testo.map((t) => `<p>${t}</p>`).join('')}</div>
    <div class="scelte"><button class="bottone" data-azione="via" data-primo>Via!</button></div>
  </div>`;
}

function pannelloFineBuca(colpi, st, record, nuovaStella) {
  const campo = CAMPI[stato.buca];
  const ultima = stato.buca + 1 >= CAMPI.length;
  const ko = colpi >= MAX_COLPI;
  const tino = ko ? 'tino-ko.png' : 'tino-normale.png';
  return `<div class="riquadro">
    <div class="ritratti"><img class="${ko ? '' : 'salta'}" src="${ASSETS}tino/${tino}" alt="Tino"><img class="gino ${ko ? 'oscilla' : 'salta'}" src="${ASSETS}gino/gino.png" alt="Gino"></div>
    <h2>${campo.nome}</h2>
    <div class="risultato">${ko ? 'Basta così!' : NOMI_ESITO(colpi, campo.par)}</div>
    <div class="stelle">${'★'.repeat(st)}<span class="vuota">${'★'.repeat(3 - st)}</span></div>
    <p class="dettagli">${colpi} colpi · par ${campo.par}${record ? ' · il tuo migliore!' : ''}${nuovaStella && st === 3 ? ' · tre stelle!' : ''}</p>
    ${ultima ? '<p>Hai finito tutte le buche del prototipo! Le altre arriveranno presto.</p>' : ''}
    <div class="scelte">
      ${ultima ? '' : '<button class="bottone" data-azione="prossima" data-primo>Buca dopo</button>'}
      <button class="bottone ${ultima ? '' : 'secondario'}" data-azione="riprova" ${ultima ? 'data-primo' : ''}>Riprova</button>
      <button class="bottone secondario" data-azione="buche">Buche</button>
    </div>
  </div>`;
}

function pannelloCartellino(finale) {
  const G = stato.giocatori;
  const n = stato.buca + 1;
  const tot = G.map((g) => g.punti.slice(0, n).reduce((a, c) => a + (c || 0), 0));
  const minimo = Math.min(...tot);
  const righe = G.map((g, i) => `<tr><td><img src="${ASSETS}${g.pers === 'tino' ? 'tino/tino-normale.png' : 'gino/gino.png'}" alt=""> ${g.nome}</td>${CAMPI.slice(0, n).map((c, k) => {
    const v = g.punti[k];
    const best = Math.min(...G.map((x) => x.punti[k]));
    return `<td class="${v === best && G.length > 1 ? 'meglio' : ''}">${v}</td>`;
  }).join('')}<td class="tot">${tot[i]}</td></tr>`).join('');
  const intest = `<tr><th></th>${CAMPI.slice(0, n).map((c, k) => `<th>${k + 1}</th>`).join('')}<th>Tot</th></tr><tr><td>Par</td>${CAMPI.slice(0, n).map((c) => `<td>${c.par}</td>`).join('')}<td class="tot">${CAMPI.slice(0, n).reduce((a, c) => a + c.par, 0)}</td></tr>`;
  let titolo = `Dopo la buca ${n}`, sotto = '', tinoImg = 'tino-normale.png', clsT = '', clsG = '';
  if (finale) {
    const vincitori = G.filter((g, i) => tot[i] === minimo);
    if (vincitori.length > 1) { titolo = 'Pari!'; sotto = 'Stessi colpi: una bella sfida.'; clsT = 'salta'; clsG = 'salta'; }
    else if (vincitori[0].pers === 'tino') { titolo = 'Vince Tino!'; sotto = stato.modo === 'cpu' ? 'Hai battuto Gino!' : ''; clsT = 'salta'; clsG = 'caduto'; }
    else { titolo = 'Vince Gino!'; sotto = stato.modo === 'cpu' ? 'Gino ti ha battuto: riprova!' : ''; tinoImg = 'tino-ko.png'; clsG = 'salta'; }
  }
  return `<div class="riquadro">
    <div class="ritratti"><img class="${clsT}" src="${ASSETS}tino/${tinoImg}" alt="Tino"><img class="gino ${clsG}" src="${ASSETS}gino/gino.png" alt="Gino"></div>
    <h2>${titolo}</h2>
    ${sotto ? `<p>${sotto}</p>` : ''}
    <div class="scorri"><table class="cartellino">${intest}${righe}</table></div>
    <div class="scelte">
      ${finale ? '<button class="bottone" data-azione="ancora" data-primo>Un\'altra partita</button>' : '<button class="bottone" data-azione="prossima" data-primo>Buca dopo</button>'}
      <button class="bottone secondario" data-azione="menu">Menu</button>
    </div>
  </div>`;
}

function pannelloPausa() {
  return `<div class="riquadro">
    ${ritratto()}
    <h2>Pausa</h2>
    <div class="scelte">
      <button class="bottone" data-azione="riprendi" data-primo>Riprendi</button>
      <button class="bottone secondario" data-azione="ricomincia">Ricomincia la buca</button>
      <button class="bottone secondario" data-azione="menu">Menu</button>
    </div>
  </div>`;
}

let azioneDopoNovita = null;
function conNovita(n, f) {
  const id = CAMPI[n].novita;
  if (id && NOVITA[id] && !stato.viste.includes(id) && !stato.test) {
    stato.viste.push(id); scrivi('novita', stato.viste);
    azioneDopoNovita = f;
    mostraPannello(pannelloNovita(id));
    return;
  }
  chiudiPannello();
  f();
}

pannello.addEventListener('click', (e) => {
  const el = e.target.closest('button');
  if (!el) return;
  sblocca(); avviaMusica();
  suoni.clic();
  const a = el.dataset.azione;
  if (el.dataset.buca !== undefined) {
    const n = +el.dataset.buca;
    conNovita(n, () => iniziaPartita('avventura', n));
    return;
  }
  if (a === 'avventura' || a === 'buche') { mostraPannello(pannelloBuche()); if (stato.modo !== 'demo') iniziaPartita('demo', 0); }
  else if (a === 'cpu' || a === 'due') conNovita(0, () => iniziaPartita(a, 0));
  else if (a === 'via') { chiudiPannello(); const f = azioneDopoNovita; azioneDopoNovita = null; if (f) f(); }
  else if (a === 'prossima') {
    const n = stato.buca + 1;
    if (stato.modo === 'avventura') conNovita(n, () => iniziaPartita('avventura', n));
    else conNovita(n, () => { stato.turno = 0; caricaBuca(n); });
  } else if (a === 'riprova') { chiudiPannello(); iniziaPartita('avventura', stato.buca); }
  else if (a === 'ancora') { const m = stato.modo; conNovita(0, () => iniziaPartita(m, 0)); }
  else if (a === 'riprendi') riprendi();
  else if (a === 'ricomincia') { chiudiPannello(); stato.fase = 'mira'; ricominciaBuca(); }
  else if (a === 'menu') menu();
});

function ricominciaBuca() {
  for (const g of stato.giocatori) g.punti.length = Math.min(g.punti.length, stato.buca);
  caricaBuca(stato.buca);
}

function menu() {
  iniziaPartita('demo', 0);
  stato.fase = 'mira';
  mostraPannello(pannelloMenu());
}

function pausa() {
  if (stato.modo === 'demo' || stato.fase === 'pausa' || stato.fase === 'fine' || pannelloAperto()) return;
  stato.faseInPausa = stato.fase;
  stato.fase = 'pausa';
  aggiornaVolumi(true);
  mostraPannello(pannelloPausa());
}
function riprendi() {
  if (stato.fase !== 'pausa') return;
  stato.fase = stato.faseInPausa || 'mira';
  aggiornaVolumi();
  chiudiPannello();
  ultimo = performance.now();
}

function cambiaAudio() {
  audio.muto = !audio.muto;
  scrivi('muto', audio.muto);
  document.body.classList.toggle('muto', audio.muto);
  aggiornaVolumi(stato.fase === 'pausa');
}
function cambiaMusica() {
  audio.musicaSpenta = !audio.musicaSpenta;
  scrivi('musica-spenta', audio.musicaSpenta);
  document.body.classList.toggle('senza-musica', audio.musicaSpenta);
  aggiornaVolumi(stato.fase === 'pausa');
}
document.body.classList.toggle('muto', audio.muto);
document.body.classList.toggle('senza-musica', audio.musicaSpenta);
$('#btn-audio').addEventListener('click', () => { sblocca(); cambiaAudio(); });
$('#btn-musica').addEventListener('click', () => { sblocca(); avviaMusica(); cambiaMusica(); });
$('#btn-pausa').addEventListener('click', () => (stato.fase === 'pausa' ? riprendi() : pausa()));
$('#btn-vista').addEventListener('click', cambiaVista);
document.addEventListener('visibilitychange', () => { if (document.hidden) pausa(); });

/* ---------------------------------------------------------------- ciclo */
function ciclo(ora) {
  const dt = Math.min(0.1, (ora - ultimo) / 1000);
  ultimo = ora;
  aggiorna(dt);
  disegna(dt);
  requestAnimationFrame(ciclo);
}

/* ---------------------------------------------------------------- prove */
window.tinoGolf = {
  get stato() { return stato; },
  CAMPI, FISICA, PALETTE, cam,
  iniziaPartita, caricaBuca, aggiorna, tiro, cambiaVista, direzioneConsigliata, strada, schermoPalla,
  simula: (ang, pot) => import('./motore.js').then((M) => M.simula(stato.mondo, stato.palla, ang, pot)),
};

async function avvio() {
  adatta();
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* niente */ }
  if (new URLSearchParams(location.search).has('prova')) { stato.test = true; return; }
  menu();
  requestAnimationFrame((t) => { ultimo = t; ciclo(t); });
}
avvio();
