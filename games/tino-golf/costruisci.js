/*
 * Tino Golf: dai dati di una buca alla scena 3D (Three.js).
 * Stile "mondo giocattolo morbido": tutto arrotondato, colori pastello, luce
 * morbida, spazio infinito a tinta unita. Restituisce il gruppo della buca e
 * una funzione aggiorna(t) per le cose che si muovono.
 */
import * as THREE from './three.module.min.js';
import { FISICA, cima, altAscensore, altCampana, angGirandola } from './motore.js';

export const PALETTE = {
  menta: {
    nome: 'Menta', spazio: '#d6f2e4', prato: '#8fdcaa', lati: '#5fbf8d', sponda: '#fff3da',
    accento: '#ff8e7c', bandiera: '#ff6f6f', deco: ['#ffd0dc', '#fff0a6', '#bfe4ff', '#ffffff'],
  },
  pesca: {
    nome: 'Pesca', spazio: '#ffe5d4', prato: '#a9dd8c', lati: '#f2a47c', sponda: '#fff8ec',
    accento: '#ff7096', bandiera: '#ff5f8a', deco: ['#ffc2a8', '#fff3b0', '#ffd6e6', '#ffffff'],
  },
  lilla: {
    nome: 'Lilla', spazio: '#ece3ff', prato: '#b8a8f2', lati: '#8d78d8', sponda: '#fffaf0',
    accento: '#ffc94d', bandiera: '#ffb02e', deco: ['#d9c9ff', '#ffe1f3', '#c9f0ff', '#ffffff'],
  },
  azzurro: {
    nome: 'Cielo', spazio: '#d9f0ff', prato: '#94dccd', lati: '#6ab0e6', sponda: '#ffffff',
    accento: '#ffa64d', bandiera: '#ff8a3d', deco: ['#ffffff', '#cfe9ff', '#fff2b8', '#ffd9e8'],
  },
};

const R = FISICA.R;
const RS = FISICA.sponda.r;

/* Generatore a seme per le decorazioni. */
export function rng(seme) {
  let s = seme >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function forma(p, rc = 0.34) {
  // Shape nel piano (x, -z), con gli spigoli arrotondati
  const n = p.length;
  const sh = new THREE.Shape();
  const P = (i) => p[(i + n) % n];
  for (let i = 0; i < n; i++) {
    const a = P(i - 1), q = P(i), c = P(i + 1);
    const la = Math.hypot(a[0] - q[0], a[1] - q[1]), lc = Math.hypot(c[0] - q[0], c[1] - q[1]);
    const r = Math.min(rc, la * 0.45, lc * 0.45);
    const p1 = [q[0] + ((a[0] - q[0]) / la) * r, q[1] + ((a[1] - q[1]) / la) * r];
    const p2 = [q[0] + ((c[0] - q[0]) / lc) * r, q[1] + ((c[1] - q[1]) / lc) * r];
    if (i === 0) sh.moveTo(p1[0], -p1[1]); else sh.lineTo(p1[0], -p1[1]);
    sh.quadraticCurveTo(q[0], -q[1], p2[0], -p2[1]);
  }
  sh.closePath();
  return sh;
}

/* Prisma morbido: contorno p, dal fondo y0 alla cima (funzione topAt o numero). */
function prisma(p, y0, top, rc = 0.34, smusso = 0.13) {
  const hRef = typeof top === 'number' ? top : Math.max(...p.map(([x, z]) => top(x, z)));
  const alto = Math.max(0.05, hRef - y0 - 2 * smusso);
  const g = new THREE.ExtrudeGeometry(forma(p, rc), {
    depth: alto, bevelEnabled: true, bevelThickness: smusso, bevelSize: smusso, bevelOffset: -smusso,
    bevelSegments: 4, curveSegments: 8, steps: 1,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + smusso, 0);
  if (typeof top !== 'number') {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const f = (y - y0) / (hRef - y0);
      pos.setY(i, y0 + f * (top(x, z) - y0));
    }
    g.computeVertexNormals();
  }
  return g;
}

function mat(colore, opz = {}) {
  return new THREE.MeshStandardMaterial({ color: colore, roughness: 0.82, metalness: 0, ...opz });
}

function tubo(punti, chiusa, y, r, materiale) {
  const v = punti.map(([x, z]) => new THREE.Vector3(x, y(x, z), z));
  if (chiusa) v.pop();
  const curva = new THREE.CatmullRomCurve3(v, chiusa, 'centripetal');
  let lung = 0;
  for (let i = 1; i < v.length; i++) lung += v[i].distanceTo(v[i - 1]);
  const g = new THREE.TubeGeometry(curva, Math.max(8, Math.ceil(lung * 8)), r, 12, chiusa);
  const gruppo = new THREE.Group();
  const mesh = new THREE.Mesh(g, materiale);
  mesh.castShadow = true; mesh.receiveShadow = true;
  gruppo.add(mesh);
  if (!chiusa) {
    const sfera = new THREE.SphereGeometry(r, 16, 12);
    for (const q of [v[0], v[v.length - 1]]) {
      const s = new THREE.Mesh(sfera, materiale);
      s.position.copy(q); s.castShadow = true;
      gruppo.add(s);
    }
  }
  return gruppo;
}

function texturaTela(w, h, disegna) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  disegna(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

let cacheTex = null;
function texture() {
  if (cacheTex) return cacheTex;
  cacheTex = {
    vortice: texturaTela(128, 128, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.6, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 5; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        for (let s = 0; s <= 30; s++) {
          const a = (k * 2 * Math.PI) / 3 + s * 0.16, r = 6 + s * 1.7;
          const x = w / 2 + Math.cos(a) * r, y = w / 2 + Math.sin(a) * r;
          if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }
    }),
    ombra: texturaTela(64, 64, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(40,40,60,0.5)');
      gr.addColorStop(1, 'rgba(40,40,60,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }),
    sabbia: texturaTela(128, 128, (g, w) => {
      g.fillStyle = '#f6dfa8'; g.fillRect(0, 0, w, w);
      const r = rng(7);
      for (let i = 0; i < 260; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(205,160,90,0.45)' : 'rgba(255,248,220,0.7)';
        g.beginPath(); g.arc(r() * w, r() * w, 1 + r() * 1.6, 0, 7); g.fill();
      }
    }),
  };
  cacheTex.sabbia.wrapS = cacheTex.sabbia.wrapT = THREE.RepeatWrapping;
  return cacheTex;
}

export function texturaOmbra() { return texture().ombra; }

function bandiera(numero, colore) {
  const tex = texturaTela(128, 96, (g, w, h) => {
    g.fillStyle = colore;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h * 0.5); g.lineTo(0, h); g.closePath(); g.fill();
    g.fillStyle = '#fff';
    g.font = '700 46px Fredoka, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(numero), w * 0.33, h * 0.52);
  });
  const geo = new THREE.PlaneGeometry(0.62, 0.46, 8, 1);
  geo.translate(0.31, 0, 0);
  const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, roughness: 0.9, alphaTest: 0.2 });
  const mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = true;
  return mesh;
}

/* Costruisce la buca n (da 1) del mondo m. */
export function costruisci(m, n) {
  const campo = m.campo;
  const pal = PALETTE[campo.palette] || PALETTE.menta;
  const T = texture();
  const gruppo = new THREE.Group();
  const animati = [];
  const mPrato = mat(pal.prato, { roughness: 0.92 });
  const mLati = mat(pal.lati, { roughness: 0.85 });
  const mSponda = mat(pal.sponda, { roughness: 0.55 });
  const mAccento = mat(pal.accento, { roughness: 0.6 });

  // blocchi
  for (const b of m.blocchi) {
    if (b.asc) {
      const a = b.asc;
      const piatt = new THREE.Group();
      const g = prisma(b.p, -0.32, 0, 0.3, 0.1);
      const slab = new THREE.Mesh(g, [mPrato, mAccento]);
      slab.castShadow = true; slab.receiveShadow = true;
      piatt.add(slab);
      for (const c of b.catene || []) piatt.add(tubo(c.punti, c.chiusa, () => RS, RS, mSponda));
      // colonna a fisarmonica sotto
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
      const colonna = new THREE.Group();
      const anello = new THREE.TorusGeometry(0.42, 0.13, 10, 24);
      const mAn = mat(pal.sponda, { roughness: 0.5 });
      const anelli = [];
      for (let k = 0; k < 7; k++) {
        const t = new THREE.Mesh(anello, mAn);
        t.rotation.x = Math.PI / 2; t.castShadow = true;
        colonna.add(t); anelli.push(t);
      }
      colonna.position.set(cx, 0, cz);
      gruppo.add(colonna);
      gruppo.add(piatt);
      animati.push((t) => {
        const h = altAscensore(a, t);
        piatt.position.y = h;
        const basso = b.base + 0.2, alto = h - 0.3;
        anelli.forEach((an, k) => { an.position.y = basso + ((alto - basso) * (k + 0.5)) / anelli.length; });
      });
      continue;
    }
    const topAt = b.gx || b.gz ? (x, z) => cima(b, x, z, 0) : b.h;
    const g = prisma(b.p, b.base, topAt);
    const mesh = new THREE.Mesh(g, [mPrato, mLati]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    gruppo.add(mesh);
    for (const c of b.catene || []) gruppo.add(tubo(c.punti, c.chiusa, (x, z) => cima(b, x, z, 0) + RS, RS, mSponda));
  }

  // zone
  for (const z of m.zone) {
    const disco = new THREE.CircleGeometry(1, 40);
    disco.rotateX(-Math.PI / 2);
    let materiale, sopra = 0.012;
    if (z.t === 'sabbia') materiale = new THREE.MeshStandardMaterial({ map: T.sabbia, roughness: 1 });
    else if (z.t === 'miele') materiale = mat('#f3a21b', { roughness: 0.12, metalness: 0.05, emissive: '#8a4b00', emissiveIntensity: 0.25 });
    else materiale = mat('#7ccdf2', { roughness: 0.15, transparent: true, opacity: 0.92 });
    const mesh = new THREE.Mesh(disco, materiale);
    mesh.scale.set(z.rx, 1, z.rz);
    mesh.position.set(z.x, z.y + sopra, z.z);
    mesh.receiveShadow = true;
    gruppo.add(mesh);
    // bordino morbido
    const bordo = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 48), z.t === 'acqua' ? mat('#e9f8ff') : z.t === 'miele' ? mat('#ffd36a', { roughness: 0.3 }) : mat('#f9e8bd'));
    bordo.rotation.x = Math.PI / 2;
    bordo.scale.set(z.rx, z.rz, 1);
    bordo.position.set(z.x, z.y + 0.01, z.z);
    gruppo.add(bordo);
    if (z.t === 'acqua') {
      const onde = [];
      for (let k = 0; k < 3; k++) {
        const o = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 }));
        o.rotation.x = -Math.PI / 2;
        o.position.set(z.x, z.y + 0.02, z.z);
        gruppo.add(o); onde.push(o);
      }
      animati.push((t) => onde.forEach((o, k) => {
        const u = (t * 0.35 + k / 3) % 1;
        o.scale.set(z.rx * u, z.rz * u, 1);
        o.material.opacity = 0.5 * (1 - u);
      }));
    }
    if (z.t === 'miele') decoraMiele(gruppo, animati, z, materiale);
  }

  // buca e bandiera
  {
    const B = m.buca;
    const top = top0(m, B.x, B.z);
    const foro = new THREE.Mesh(new THREE.CircleGeometry(FISICA.buca.r, 32), new THREE.MeshBasicMaterial({ color: '#2b3a2f' }));
    foro.rotation.x = -Math.PI / 2;
    foro.position.set(B.x, top + 0.006, B.z);
    gruppo.add(foro);
    const orlo = new THREE.Mesh(new THREE.RingGeometry(FISICA.buca.r, FISICA.buca.r + 0.05, 32), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    orlo.rotation.x = -Math.PI / 2;
    orlo.position.set(B.x, top + 0.007, B.z);
    gruppo.add(orlo);
    const asta = new THREE.Group();
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 10), mat('#ffffff', { roughness: 0.4 }));
    palo.position.y = 0.7; palo.castShadow = true;
    asta.add(palo);
    const pomo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), mat(pal.accento));
    pomo.position.y = 1.42;
    asta.add(pomo);
    const fl = bandiera(n, pal.bandiera);
    fl.position.set(0.02, 1.15, 0);
    asta.add(fl);
    asta.position.set(B.x, top, B.z);
    gruppo.add(asta);
    animati.push((t) => {
      fl.rotation.y = Math.sin(t * 1.7) * 0.35 + 0.4;
      const pos = fl.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, Math.sin(t * 5 + x * 7) * 0.05 * x);
      }
      pos.needsUpdate = true;
    });
    gruppo.userData.asta = asta;
  }

  // pali e funghi
  for (const p of m.pali) {
    if (p.t === 'fungo') {
      const f = new THREE.Group();
      const gambo = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.55, p.r * 0.7, 0.32, 16), mat('#fff6e3'));
      gambo.position.y = 0.16; gambo.castShadow = true;
      f.add(gambo);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(p.r * 1.25, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(pal.accento, { roughness: 0.5 }));
      cap.scale.y = 0.75; cap.position.y = 0.3; cap.castShadow = true;
      f.add(cap);
      const pois = new THREE.SphereGeometry(p.r * 0.2, 10, 8);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2, el = k % 2 ? 0.55 : 0.95;
        const d = new THREE.Mesh(pois, mat('#ffffff'));
        const rr = p.r * 1.22;
        d.position.set(Math.cos(a) * rr * Math.sin(el), 0.3 + Math.cos(el) * rr * 0.75, Math.sin(a) * rr * Math.sin(el));
        d.scale.y = 0.5;
        f.add(d);
      }
      const top = new THREE.Mesh(pois, mat('#ffffff'));
      top.position.y = 0.3 + p.r * 0.93; top.scale.y = 0.5;
      f.add(top);
      f.position.set(p.x, p.y, p.z);
      gruppo.add(f);
      p.vis = f;
    } else {
      const f = new THREE.Group();
      const c = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, p.alto, 20), mSponda);
      c.position.y = p.alto / 2; c.castShadow = true;
      f.add(c);
      const s = new THREE.Mesh(new THREE.SphereGeometry(p.r, 20, 12), mAccento);
      s.position.y = p.alto; s.castShadow = true;
      f.add(s);
      f.position.set(p.x, p.y, p.z);
      gruppo.add(f);
      p.vis = f;
    }
  }

  // girandole
  for (const gi of m.girandole) {
    const g = new THREE.Group();
    const mozzo = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.42, 20), mSponda);
    mozzo.position.y = 0.21; mozzo.castShadow = true;
    g.add(mozzo);
    const fiore = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), mat('#ffe066'));
    fiore.position.y = 0.46; fiore.scale.y = 0.7;
    g.add(fiore);
    const rotore = new THREE.Group();
    const braccio = new THREE.CapsuleGeometry(gi.largo, gi.lungo - gi.largo, 6, 12);
    braccio.rotateZ(Math.PI / 2);
    braccio.translate(gi.lungo / 2, 0, 0);
    const colori = [pal.accento, pal.deco[0], pal.deco[2]];
    for (let k = 0; k < gi.bracci; k++) {
      const a = new THREE.Mesh(braccio, mat(colori[k % 3], { roughness: 0.55 }));
      a.rotation.y = -(k * 2 * Math.PI) / gi.bracci;
      a.position.y = R; a.castShadow = true;
      rotore.add(a);
      const petalo = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat('#ffffff'));
      petalo.position.set(Math.cos((k * 2 * Math.PI) / gi.bracci) * 0.2, 0.5, -Math.sin((k * 2 * Math.PI) / gi.bracci) * 0.2);
      petalo.scale.y = 0.5;
      rotore.add(petalo);
    }
    g.add(rotore);
    g.position.set(gi.x, gi.y, gi.z);
    gruppo.add(g);
    animati.push((t) => { rotore.rotation.y = -angGirandola(gi, t); });
  }

  // campane
  for (const c of m.campane) {
    const g = new THREE.Group();
    const cupola = new THREE.Mesh(new THREE.SphereGeometry(c.r + 0.04, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(pal.accento, { roughness: 0.45, side: THREE.DoubleSide }));
    cupola.scale.y = 0.9; cupola.castShadow = true;
    g.add(cupola);
    const bordo = new THREE.Mesh(new THREE.TorusGeometry(c.r + 0.04, 0.05, 8, 32), mSponda);
    bordo.rotation.x = Math.PI / 2;
    g.add(bordo);
    const manico = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mSponda);
    manico.position.y = (c.r + 0.04) * 0.9;
    g.add(manico);
    const molla = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3, 6), mat('#ffffff', { roughness: 0.3 }));
    molla.position.y = 1.5 + (c.r + 0.04) * 0.9;
    g.add(molla);
    g.position.set(c.x, c.y, c.z);
    gruppo.add(g);
    const ombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: T.ombra, transparent: true, depthWrite: false }));
    ombra.rotation.x = -Math.PI / 2;
    ombra.position.set(c.x, c.y + 0.015, c.z);
    gruppo.add(ombra);
    animati.push((t) => {
      const h = altCampana(c, t);
      g.position.y = c.y + h;
      const s = 1.6 * (c.r + 0.1) * (1.3 - h * 0.5);
      ombra.scale.set(s, s, 1);
      ombra.material.opacity = 1 - h * 0.6;
    });
  }

  // anelli magici
  const COLORI_TELE = { verde: '#4fd17a', arancio: '#ff9a3d', blu: '#4aa3ff', rosa: '#ff6fb5' };
  for (const tl of m.tele) {
    const col = COLORI_TELE[tl.colore] || tl.colore || '#4fd17a';
    for (const lato of ['a', 'b']) {
      const [x, z] = tl[lato];
      const y = lato === 'a' ? tl.ya : tl.yb;
      const g = new THREE.Group();
      const anello = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 12, 36), mat(col, { roughness: 0.35, emissive: col, emissiveIntensity: 0.25 }));
      anello.rotation.x = Math.PI / 2; anello.castShadow = true;
      anello.position.y = 0.05;
      g.add(anello);
      const disco = new THREE.Mesh(new THREE.CircleGeometry(0.36, 32), new THREE.MeshBasicMaterial({ map: T.vortice, color: col, transparent: true, opacity: lato === 'a' ? 0.95 : 0.55, depthWrite: false }));
      disco.rotation.x = -Math.PI / 2;
      disco.position.y = 0.02;
      g.add(disco);
      if (lato === 'b') {
        const freccia = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 3), mat(col, { emissive: col, emissiveIntensity: 0.3 }));
        freccia.rotation.x = -Math.PI / 2;
        const fr = new THREE.Group();
        fr.add(freccia);
        freccia.position.z = -0.62;
        fr.rotation.y = tl.dir;
        fr.position.y = 0.08;
        g.add(fr);
        animati.push((t) => { freccia.position.z = -0.6 - Math.abs(Math.sin(t * 3)) * 0.12; });
      } else {
        // scintille che girano
        const sc = new THREE.Group();
        for (let k = 0; k < 4; k++) {
          const s = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
          s.position.set(Math.cos((k * Math.PI) / 2) * 0.38, 0.14, Math.sin((k * Math.PI) / 2) * 0.38);
          sc.add(s);
        }
        g.add(sc);
        animati.push((t) => { sc.rotation.y = t * 2.2; sc.position.y = Math.sin(t * 3) * 0.04; });
      }
      animati.push((t) => { disco.rotation.z = t * (lato === 'a' ? 2.5 : -1.5); });
      g.position.set(x, y, z);
      gruppo.add(g);
    }
  }

  // molle
  for (const o of m.molle) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.06, 28), mSponda);
    base.position.y = 0.03;
    g.add(base);
    const spire = [];
    for (let s = 0; s <= 80; s++) {
      const a = s * 0.38;
      spire.push(new THREE.Vector3(Math.cos(a) * 0.26, 0.04 + s * 0.0022, Math.sin(a) * 0.26));
    }
    const molla = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spire), 160, 0.025, 6), mat('#c9d3dc', { metalness: 0.4, roughness: 0.3 }));
    g.add(molla);
    const cuscino = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 28), mat(pal.accento, { roughness: 0.5 }));
    cuscino.position.y = 0.23;
    g.add(cuscino);
    g.position.set(o.x, o.y - 0.18, o.z);
    gruppo.add(g);
    o.vis = { molla, cuscino, colpo: -9 };
    animati.push((t) => {
      const u = t - o.vis.colpo;
      const k = u >= 0 && u < 0.6 ? Math.sin(u * 20) * Math.exp(-u * 6) : 0;
      molla.scale.y = 1 + k * 0.8;
      cuscino.position.y = 0.23 + k * 0.18;
    });
  }

  gruppo.userData.aggiorna = (t) => { for (const f of animati) f(t); };
  return gruppo;
}

/* La pozza di miele: lucida e un po' gonfia, col vasetto rovesciato da cui cola,
 * bollicine e un'ape che ci gira sopra, così si capisce subito cos'è. */
function decoraMiele(gruppo, animati, z, materiale) {
  const lucido = new THREE.MeshStandardMaterial({ color: '#ffb52a', roughness: 0.06, metalness: 0.1, emissive: '#a65a00', emissiveIntensity: 0.3, transparent: true, opacity: 0.93 });
  // pozza gonfia
  const pozza = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), lucido);
  pozza.scale.set(z.rx * 0.97, 0.07, z.rz * 0.97);
  pozza.position.set(z.x, z.y + 0.005, z.z);
  pozza.receiveShadow = true;
  gruppo.add(pozza);
  // riflessi bianchi
  const mRiflesso = new THREE.MeshBasicMaterial({ color: '#fff6d8', transparent: true, opacity: 0.75 });
  for (const [dx, dz, s] of [[-0.35, -0.3, 0.16], [-0.1, -0.45, 0.08]]) {
    const r = new THREE.Mesh(new THREE.CircleGeometry(1, 20), mRiflesso);
    r.rotation.x = -Math.PI / 2;
    r.scale.set(s * z.rx * 2, s * z.rz * 1.2, 1);
    r.position.set(z.x + dx * z.rx, z.y + 0.08, z.z + dz * z.rz);
    gruppo.add(r);
  }
  // vasetto rovesciato sul bordo, verso la sponda più vicina al centro della pozza
  const vaso = new THREE.Group();
  const vetro = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.34, 20), new THREE.MeshStandardMaterial({ color: '#ffd27a', roughness: 0.15, transparent: true, opacity: 0.8 }));
  vetro.castShadow = true;
  vaso.add(vetro);
  const interno = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16), lucido);
  interno.position.y = -0.06;
  vaso.add(interno);
  const etichetta = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.12, 20, 1, true), mat('#fff3d6'));
  etichetta.position.y = -0.04;
  vaso.add(etichetta);
  // sdraiato in fondo alla pozza, con la bocca verso il centro
  vaso.rotation.x = Math.PI / 2;
  vaso.position.set(z.x + z.rx * 0.15, z.y + 0.17, z.z - z.rz * 1.0);
  gruppo.add(vaso);
  // il tappo caduto lì accanto
  const tappo = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 20), mat('#e8483f', { roughness: 0.5 }));
  tappo.position.set(z.x - z.rx * 0.75, z.y + 0.04, z.z - z.rz * 0.95);
  tappo.rotation.z = 0.15;
  tappo.castShadow = true;
  gruppo.add(tappo);
  // colata dal vasetto alla pozza
  const colata = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), lucido);
  colata.scale.set(0.17, 0.07, 0.3);
  colata.position.set(z.x + z.rx * 0.15, z.y + 0.04, z.z - z.rz * 0.72);
  gruppo.add(colata);
  // bollicine che si gonfiano e scoppiano
  const bolle = [];
  const r = rng(Math.round(z.x * 100 + z.z * 7) + 3);
  for (let k = 0; k < 4; k++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), lucido);
    const a = r() * Math.PI * 2, d = 0.2 + r() * 0.5;
    b.position.set(z.x + Math.cos(a) * z.rx * d, z.y + 0.06, z.z + Math.sin(a) * z.rz * d);
    b.userData.f = r();
    gruppo.add(b); bolle.push(b);
  }
  // l'ape
  const ape = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), mat('#ffd23f', { roughness: 0.5 }));
  corpo.scale.set(1.35, 1, 1);
  ape.add(corpo);
  for (const x of [-0.03, 0.05]) {
    const riga = new THREE.Mesh(new THREE.TorusGeometry(0.083, 0.018, 6, 16), mat('#3a2a1a'));
    riga.rotation.y = Math.PI / 2;
    riga.position.x = x;
    riga.scale.set(1, 0.98, 1);
    ape.add(riga);
  }
  const testa = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), mat('#3a2a1a'));
  testa.position.x = 0.13;
  ape.add(testa);
  const mAla = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const ali = [];
  for (const lato of [-1, 1]) {
    const ala = new THREE.Mesh(new THREE.CircleGeometry(0.08, 14), mAla);
    ala.scale.set(1, 0.6, 1);
    ala.position.set(0, 0.07, lato * 0.06);
    ala.rotation.x = -Math.PI / 2;
    ape.add(ala); ali.push([ala, lato]);
  }
  gruppo.add(ape);
  animati.push((t) => {
    const a = t * 1.3;
    ape.position.set(z.x + Math.cos(a) * z.rx * 0.8, z.y + 0.75 + Math.sin(t * 3.1) * 0.12, z.z + Math.sin(a) * z.rz * 0.8);
    ape.rotation.y = -a - Math.PI / 2 + Math.PI;
    for (const [ala, lato] of ali) ala.rotation.x = -Math.PI / 2 + lato * Math.sin(t * 60) * 0.6;
    for (const b of bolle) {
      const u = (t * 0.45 + b.userData.f) % 1;
      const s = u < 0.85 ? 0.3 + u : 0.01;
      b.scale.set(s, s * 0.8, s);
    }
  });
}

function top0(m, x, z) {
  let h = -Infinity;
  for (const b of m.blocchi) {
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    h = Math.max(h, cima(b, x, z, 0));
  }
  return h === -Infinity ? 0 : h;
}

/* Decorazioni nello spazio: nuvolette, isolette con alberelli tondi, colline. */
export function decorazioni(m, seme) {
  const pal = PALETTE[m.campo.palette] || PALETTE.menta;
  const r = rng(seme * 977 + 13);
  const g = new THREE.Group();
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const b of m.blocchi) {
    minX = Math.min(minX, b.minX); maxX = Math.max(maxX, b.maxX);
    minZ = Math.min(minZ, b.minZ); maxZ = Math.max(maxZ, b.maxZ);
  }
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const fuori = (x, z, margine) => x < minX - margine || x > maxX + margine || z < minZ - margine || z > maxZ + margine;
  const sfera = new THREE.SphereGeometry(1, 24, 16);
  const mNuvola = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.92 });
  const nuvole = [];
  for (let i = 0; i < 11; i++) {
    let x, z;
    do { x = cx + (r() - 0.5) * 50; z = cz + (r() - 0.5) * 50; } while (!fuori(x, z, 7));
    const n = new THREE.Group();
    const k = 3 + Math.floor(r() * 3);
    for (let j = 0; j < k; j++) {
      const s = new THREE.Mesh(sfera, mNuvola);
      const sc = 0.5 + r() * 0.6;
      s.scale.set(sc, sc * 0.8, sc);
      s.position.set((j - k / 2) * 0.65, r() * 0.3, (r() - 0.5) * 0.5);
      n.add(s);
    }
    n.position.set(x, -1 + r() * 4, z);
    n.userData.v = 0.15 + r() * 0.25;
    n.userData.x0 = x;
    g.add(n); nuvole.push(n);
  }
  // isolette con alberelli
  const tronco = new THREE.CylinderGeometry(0.12, 0.16, 0.8, 10);
  for (let i = 0; i < 8; i++) {
    let x, z;
    do { x = cx + (r() - 0.5) * 34; z = cz + (r() - 0.5) * 34; } while (!fuori(x, z, 2.5));
    const isola = new THREE.Group();
    const rr = 0.8 + r() * 0.9;
    const terra = new THREE.Mesh(sfera, mat(pal.prato));
    terra.scale.set(rr, 0.35, rr);
    terra.receiveShadow = true;
    isola.add(terra);
    const sotto = new THREE.Mesh(sfera, mat(pal.lati));
    sotto.scale.set(rr * 0.9, rr * 0.7, rr * 0.9);
    sotto.position.y = -0.15;
    isola.add(sotto);
    const nAlberi = 1 + Math.floor(r() * 2);
    for (let j = 0; j < nAlberi; j++) {
      const a = new THREE.Group();
      const t = new THREE.Mesh(tronco, mat('#c99a6b'));
      t.position.y = 0.6;
      a.add(t);
      const chioma = new THREE.Mesh(sfera, mat(pal.deco[Math.floor(r() * 3)], { roughness: 0.9 }));
      const cs = 0.45 + r() * 0.3;
      chioma.scale.set(cs, cs * 1.1, cs);
      chioma.position.y = 1.1 + cs * 0.5;
      chioma.castShadow = true;
      a.add(chioma);
      a.position.set((j - (nAlberi - 1) / 2) * rr * 0.8, 0, (r() - 0.5) * rr * 0.6);
      isola.add(a);
    }
    isola.position.set(x, -2.5 + r() * 3, z);
    isola.userData.y0 = isola.position.y;
    isola.userData.f = r() * 6;
    g.add(isola);
    nuvole.push(isola);
  }
  // grandi colline morbide lontane, in basso
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r();
    const d = 24 + r() * 14;
    const c = new THREE.Mesh(sfera, mat(i % 2 ? pal.prato : pal.deco[i % 3], { roughness: 1 }));
    const s = 4 + r() * 5;
    c.scale.set(s, s * 0.6, s);
    c.position.set(cx + Math.cos(a) * d, -7 - r() * 3, cz + Math.sin(a) * d);
    g.add(c);
  }
  g.userData.aggiorna = (t) => {
    for (const n of nuvole) {
      if (n.userData.v) n.position.x = n.userData.x0 + Math.sin(t * n.userData.v * 0.3) * 1.5;
      else n.position.y = n.userData.y0 + Math.sin(t * 0.6 + n.userData.f) * 0.15;
    }
  };
  return g;
}
