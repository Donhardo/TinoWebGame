/*
 * Tino Flipper, motore comune (versione 2).
 *
 * Qui stanno le cose che servono a tutti i tavoli: la geometria (pareti,
 * paletti, flipper, sensori, buche, bocche delle rampe, percorsi), la fisica
 * della ghianda con gli elementi meccanici (bumper, fionde, bersagli che cadono
 * o spuntano, cartellini, palla prigioniera, magnete, disco che gira, giocattoli
 * che si muovono, cancelletti a una via), la simulazione per il giocatore
 * simulato, i suoni e la musica.
 *
 * Ogni tavolo (in tavoli/<nome>.js) costruisce il suo mondo con TF.nuovoMondo
 * e lo descrive a dati; gioco.js mette insieme partita, regole comuni,
 * telecamera, disegno e comandi.
 *
 * Due piani: 0 è il campo, 1 un mini campo rialzato. La ghianda urta solo
 * le cose del suo piano; rampe, tunnel ed espulsori sono percorsi: la ghianda
 * li segue e riesce dove finiscono.
 */
(() => {
  'use strict';
  const TF = window.TF = window.TF || {};
  TF.tavoli = TF.tavoli || {};

  const R = 12;                      // raggio della ghianda
  TF.R = R;

  const FISICA = {
    passo: 1 / 960,      // passo della simulazione
    velMax: 3300,
    attrito: 0.04,       // frazione di velocità persa al secondo (rotolamento)
    pareti: 0.42,        // rimbalzo sulle pareti
    gomme: 0.7,          // rimbalzo su gomme e paletti
    // attrito di Coulomb negli urti veri (non nei contatti di appoggio, che
    // altrimenti fermano la ghianda sulle superfici inclinate): la spinta
    // tangenziale è al massimo μ volte quella normale; la ghianda che picchia
    // di striscio perde un po' di velocità lungo la superficie e prende spin
    attritoPareti: 0.12, attritoGomme: 0.2, attritoFlipper: 0.25,
    urtoMinimo: 120,     // velocità normale minima perché l'urto conti come urto
    spinCala: 0.6,       // frazione di spin persa al secondo in volo
  };
  TF.FISICA = FISICA;
  const FLIPPER = {
    lungo: 92, r1: 14, r2: 7,
    riposo: 0.52, su: -0.47,          // angolo sotto/sopra l'orizzontale (rad)
    velSu: 30, velGiu: 17,            // rad/s
    e: 0.25,                          // rimbalzo sulla gomma del flipper
  };
  TF.FLIPPER = FLIPPER;
  const FIONDA = { soglia: 140 };

  // ---------------------------------------------------------------- utilità
  const U = TF.util = {
    clamp: (x, a, b) => Math.max(a, Math.min(b, x)),
    casuale: (a, b) => a + Math.random() * (b - a),
    scegli: (lista) => lista[Math.floor(Math.random() * lista.length)],
    numero: (n) => Math.round(n).toLocaleString('it-IT'),
    hexA(hex, a) {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
    },
    schiarisci(hex, k) {
      const n = parseInt(hex.slice(1), 16);
      const f = (c) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k));
      return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
    },
    // curva di Bézier cubica: n punti
    bezier(p0, p1, p2, p3, n = 16) {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        pts.push([
          u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ]);
      }
      return pts;
    },
    arco(cx, cy, r, a0, a1, n) {
      const p = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * i / n;
        p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      return p;
    },
    // unisce più spezzate (togliendo i punti doppi alle giunture)
    unisci(...liste) {
      const out = [];
      for (const l of liste) for (const p of l) {
        const u = out[out.length - 1];
        if (!u || Math.hypot(u[0] - p[0], u[1] - p[1]) > 0.5) out.push(p);
      }
      return out;
    },
  };
  const { clamp, casuale } = U;

  // ================================================================ mondo
  TF.nuovoMondo = function nuovoMondo(W, H) {
    const m = {
      W, H, R,
      segmenti: [[], []], cerchi: [[], []],
      flipper: [], sensori: [], prese: [], bocche: [], percorsi: {},
      prigioniere: [], magneti: [], dischi: [], mobili: [], zone: [],
      tempo: 0, tiltato: false, gravita: 1650, griglia: null,
      ev: null,                         // (tipo, oggetto, palla, info) → regole
    };

    // Segmento: r = raggio di collisione (oltre alla ghianda), e = rimbalzo.
    // o.attivo: funzione, se falsa il segmento non c'è (bersagli giù).
    // o.unaVia: [nx, ny] si passa solo andando in quella direzione.
    m.segmento = (ax, ay, bx, by, o = {}) => {
      const s = {
        ax, ay, bx, by, r: o.r ?? 2, e: o.e ?? FISICA.pareti, tipo: o.tipo || 'muro',
        id: o.id || null, spinta: o.spinta || 0, unaVia: o.unaVia || null, attivo: o.attivo || null,
        piano: o.piano || 0, esito: o.esito || null, dati: o.dati || null, soglia: o.soglia || 0,
      };
      s.dx = bx - ax; s.dy = by - ay;
      s.L2 = s.dx * s.dx + s.dy * s.dy || 1;
      const mm = s.r + R + 4;
      s.x0 = Math.min(ax, bx) - mm; s.x1 = Math.max(ax, bx) + mm;
      s.y0 = Math.min(ay, by) - mm; s.y1 = Math.max(ay, by) + mm;
      m.segmenti[s.piano].push(s);
      return s;
    };
    m.parete = (punti, o = {}) => {
      const lista = [];
      for (let i = 0; i < punti.length - 1; i++) {
        lista.push(m.segmento(punti[i][0], punti[i][1], punti[i + 1][0], punti[i + 1][1], o));
      }
      return lista;
    };
    m.cerchio = (x, y, r, o = {}) => {
      const c = {
        x, y, r, e: o.e ?? FISICA.gomme, tipo: o.tipo || 'paletto', id: o.id || null,
        spinta: o.spinta || 0, attivo: o.attivo || null, piano: o.piano || 0, esito: o.esito || null, dati: o.dati || null,
      };
      m.cerchi[c.piano].push(c);
      return c;
    };
    // Flipper: lato decide il tasto ('sx' o 'dx') e da che parte punta.
    m.nuovoFlipper = (o) => {
      const f = {
        id: o.id, lato: o.lato, piano: o.piano || 0, px: o.x, py: o.y,
        lungo: o.lungo || FLIPPER.lungo, r1: o.r1 || FLIPPER.r1, r2: o.r2 || FLIPPER.r2,
        riposo: o.riposo ?? FLIPPER.riposo, su: o.su ?? FLIPPER.su,
        velSu: o.velSu || FLIPPER.velSu, velGiu: o.velGiu || FLIPPER.velGiu, e: o.e ?? FLIPPER.e,
        verso: o.lato === 'sx' ? 1 : -1, zona: o.zona || null,
        a: 0, w: 0, premuto: false, prog: null,
      };
      f.a = f.riposo;
      m.flipper.push(f);
      return f;
    };
    // Sensore: linea che la ghianda attraversa. verso = direzione "avanti".
    m.sensore = (id, ax, ay, bx, by, o = {}) => {
      const s = { id, ax, ay, bx, by, verso: o.verso || null, piano: o.piano || 0, dati: o.dati || null, esito: o.esito || null };
      s.dx = bx - ax; s.dy = by - ay; s.L2 = s.dx * s.dx + s.dy * s.dy || 1;
      m.sensori.push(s);
      return s;
    };
    // Buca: la ghianda che ci passa sopra abbastanza piano ci cade dentro.
    m.presa = (id, x, y, r, o = {}) => {
      const p = { id, x, y, r, velMax: o.velMax || 1500, attivo: o.attivo || null, piano: o.piano || 0, esito: o.esito || id, dati: o.dati || null };
      m.prese.push(p);
      return p;
    };
    // Bocca di una rampa: linea che, passata in avanti abbastanza veloce,
    // porta la ghianda sul percorso.
    m.bocca = (id, ax, ay, bx, by, o = {}) => {
      const b = { id, ax, ay, bx, by, verso: o.verso, velMin: o.velMin || 500, percorso: o.percorso || id, piano: o.piano || 0, attivo: o.attivo || null, esito: o.esito || id };
      b.dx = bx - ax; b.dy = by - ay; b.L2 = b.dx * b.dx + b.dy * b.dy || 1;
      m.bocche.push(b);
      return b;
    };
    // Percorso: spezzata che la ghianda segue (rampe, tunnel, espulsori).
    // o.sotto: tunnel sotto il campo (la ghianda non si vede); o.piano: dove
    // riesce; o.uscita: velocità all'uscita; o.vel: velocità [min, max].
    m.percorso = (id, punti, o = {}) => {
      const tratti = [];
      let lung = 0;
      for (let i = 0; i < punti.length - 1; i++) {
        const dx = punti[i + 1][0] - punti[i][0], dy = punti[i + 1][1] - punti[i][1];
        const l = Math.hypot(dx, dy);
        if (l < 0.01) continue;
        tratti.push({ x: punti[i][0], y: punti[i][1], dx: dx / l, dy: dy / l, l, da: lung });
        lung += l;
      }
      const per = {
        id, punti, tratti, lung, sotto: !!o.sotto, piano: o.piano || 0, uscita: o.uscita ?? 360,
        vel: o.vel || [650, 1500], costante: o.costante || 0, tipo: o.tipo || 'rampa', alto: o.alto ?? 1,
      };
      m.percorsi[id] = per;
      return per;
    };
    // Palla prigioniera: corre su e giù in un corridoio verticale.
    m.prigioniera = (o) => {
      const c = { id: o.id, x: o.x, y: o.giu, giu: o.giu, su: o.su, vy: 0, r: R, piano: o.piano || 0, lampo: 0, arrivata: false };
      m.prigioniere.push(c);
      return c;
    };
    // Magnete: quando è attivo attira e ferma la ghianda.
    m.magnete = (o) => {
      const g = { id: o.id, x: o.x, y: o.y, r: o.r || 70, presa: o.presa || 16, forza: o.forza || 2600, attivo: false, palla: null, t: 0, piano: o.piano || 0 };
      m.magneti.push(g);
      return g;
    };
    // Disco che gira sul piano: trascina la ghianda che ci passa sopra.
    m.disco = (o) => {
      const d = { id: o.id, x: o.x, y: o.y, r: o.r, w: o.w || 4, presa: o.presa || 5, ang: 0, piano: o.piano || 0 };
      m.dischi.push(d);
      return d;
    };
    // Zona: un cerchio che non urta, ma sente la ghianda che ci passa sopra
    // (robivecchi da raccogliere, punti del campo da attraversare). Nelle prove
    // del giocatore simulato vale come esito.
    m.zona = (id, x, y, r, o = {}) => {
      const z = { id, x, y, r, piano: o.piano || 0, attivo: o.attivo || null, esito: o.esito || id, dati: o.dati || null };
      m.zone.push(z);
      return z;
    };
    // Giocattolo che si muove: un cerchio che le regole spostano.
    m.mobile = (o) => {
      const c = m.cerchio(o.x, o.y, o.r, { tipo: o.tipo || 'mobile', id: o.id, e: o.e ?? 0.55, attivo: o.attivo, piano: o.piano, esito: o.esito, dati: o.dati });
      c.vx = 0; c.vy = 0;
      m.mobili.push(c);
      return c;
    };

    m.punta = (f) => [f.px + Math.cos(f.a) * f.lungo * f.verso, f.py + Math.sin(f.a) * f.lungo];
    m.puntoPercorso = (per, s) => {
      for (const t of per.tratti) {
        if (s <= t.da + t.l) {
          const k = s - t.da;
          return { x: t.x + t.dx * k, y: t.y + t.dy * k, dx: t.dx, dy: t.dy };
        }
      }
      const t = per.tratti[per.tratti.length - 1];
      return { x: t.x + t.dx * t.l, y: t.y + t.dy * t.l, dx: t.dx, dy: t.dy };
    };
    return m;
  };

  // ================================================================ fisica
  // ora: tempo della fisica (per i colpi programmati del giocatore simulato).
  TF.muoviFlipper = function muoviFlipper(f, h, ora, tiltato) {
    if (f.prog) {
      f.premuto = ora >= f.prog.da && ora < f.prog.a;
      if (ora >= f.prog.a) f.prog = null;
    }
    const attivo = f.premuto && !tiltato;
    const meta = attivo ? f.su : f.riposo;
    const vel = attivo ? f.velSu : f.velGiu;
    const prima = f.a;
    if (f.a > meta) f.a = Math.max(meta, f.a - vel * h);
    else if (f.a < meta) f.a = Math.min(meta, f.a + vel * h);
    f.w = (f.a - prima) / h;
  };

  function urtaFlipper(m, p, f, sim) {
    if (f.piano !== p.piano) return;
    const a = f.a;
    const ux = Math.cos(a) * f.verso, uy = Math.sin(a);
    const L = f.lungo;
    const rx = p.x - f.px, ry = p.y - f.py;
    if (rx * rx + ry * ry > (L + f.r1 + R + 6) * (L + f.r1 + R + 6)) return;
    let t = (rx * ux + ry * uy) / L;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = f.px + ux * L * t, cy = f.py + uy * L * t;
    const rr = f.r1 + (f.r2 - f.r1) * t + R;
    let nx = p.x - cx, ny = p.y - cy;
    const d2 = nx * nx + ny * ny;
    if (d2 >= rr * rr) return;
    const d = Math.sqrt(d2) || 0.001;
    nx /= d; ny /= d;
    p.x = cx + nx * rr; p.y = cy + ny * rr;
    // velocità della superficie nel punto di contatto
    const s = L * t;
    const sx = -Math.sin(a) * f.verso * s * f.w;
    const sy = Math.cos(a) * s * f.w;
    const rvx = p.vx - sx, rvy = p.vy - sy;
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      const k = (1 + f.e) * vn;
      // attrito lungo la gomma del flipper (solo negli urti veri): la ghianda
      // rallenta lungo la superficie e rotola (spin = velocità tangenziale / raggio)
      const tx = -ny, ty = nx;
      const vt0 = rvx * tx + rvy * ty;
      const jt = vn < -FISICA.urtoMinimo ? Math.min(Math.abs(vt0), FISICA.attritoFlipper * -k) * Math.sign(vt0) : 0;
      const vt = vt0 - jt;
      p.vx = rvx - k * nx + sx - jt * tx;
      p.vy = rvy - k * ny + sy - jt * ty;
      if (!sim) {
        p.spin = vt / R;
        if (m.ev && -vn > 900 && Math.abs(f.w) > 1) m.ev('flipperColpo', f, p, -vn);
      }
    }
  }

  function urtaSegmento(m, p, s, sim) {
    if (p.x < s.x0 || p.x > s.x1 || p.y < s.y0 || p.y > s.y1) return;
    if (s.attivo && !s.attivo()) return;
    let t = ((p.x - s.ax) * s.dx + (p.y - s.ay) * s.dy) / s.L2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = s.ax + s.dx * t, cy = s.ay + s.dy * t;
    let nx = p.x - cx, ny = p.y - cy;
    const rr = s.r + R;
    const d2 = nx * nx + ny * ny;
    if (d2 >= rr * rr) return;
    if (s.unaVia) {
      // blocca solo chi sta dalla parte della normale e ci va contro
      if ((p.y - s.ay) * s.unaVia[1] + (p.x - s.ax) * s.unaVia[0] < 0) return;
      if (p.vx * s.unaVia[0] + p.vy * s.unaVia[1] > 0) return;
    }
    const d = Math.sqrt(d2) || 0.001;
    nx /= d; ny /= d;
    p.x = cx + nx * rr; p.y = cy + ny * rr;
    rimbalza(m, p, nx, ny, s, sim);
  }

  function urtaCerchio(m, p, c, sim) {
    if (c.attivo && !c.attivo()) return;
    let nx = p.x - c.x, ny = p.y - c.y;
    const rr = c.r + R;
    if (nx > rr || nx < -rr || ny > rr || ny < -rr) return;
    const d2 = nx * nx + ny * ny;
    if (d2 >= rr * rr) return;
    const d = Math.sqrt(d2) || 0.001;
    nx /= d; ny /= d;
    p.x = c.x + nx * rr; p.y = c.y + ny * rr;
    // i giocattoli che si muovono spingono la ghianda
    if (c.vx || c.vy) {
      const vn = c.vx * nx + c.vy * ny;
      if (vn > 0) { p.vx += vn * nx; p.vy += vn * ny; }
    }
    rimbalza(m, p, nx, ny, c, sim);
  }

  function rimbalza(m, p, nx, ny, o, sim) {
    const vn = p.vx * nx + p.vy * ny;
    if (vn >= 0 && !o.spinta) return;
    if (vn < 0) {
      p.vx -= (1 + o.e) * vn * nx;
      p.vy -= (1 + o.e) * vn * ny;
      // attrito lungo la superficie negli urti veri (e spin per il disegno)
      const tx = -ny, ty = nx;
      const vt = p.vx * tx + p.vy * ty;
      if (vn < -FISICA.urtoMinimo) {
        const mu = o.attrito ?? (o.tipo === 'muro' || o.tipo === 'stantuffo' ? FISICA.attritoPareti : FISICA.attritoGomme);
        const jt = Math.min(Math.abs(vt), mu * (1 + o.e) * -vn) * Math.sign(vt);
        p.vx -= jt * tx; p.vy -= jt * ty;
        if (!sim) p.spin = (vt - jt) / R;
      } else if (!sim) p.spin = vt / R;
    }
    if (sim) {
      if (o.spinta && !(o.tipo === 'fionda' && -vn < FIONDA.soglia)) {
        const vn2 = p.vx * nx + p.vy * ny;
        if (vn2 < o.spinta) { p.vx += (o.spinta - vn2) * nx; p.vy += (o.spinta - vn2) * ny; }
      }
      if (o.esito && -vn > (o.soglia || 60) && !p.esito) p.esito = o.esito;
      return;
    }
    if (o.spinta && !m.tiltato) {
      if (o.tipo === 'fionda' && -vn < FIONDA.soglia) return;
      if (o.attesa && m.tempo - o.attesa < 0.06) return;
      o.attesa = m.tempo;
      let spinta = o.spinta;
      if (o.tipo === 'fionda') {
        // le fionde vere non spingono mai due volte uguale (niente ping-pong infinito)
        spinta *= casuale(0.82, 1.04);
        const a = casuale(-0.12, 0.12), c = Math.cos(a), s = Math.sin(a);
        [nx, ny] = [nx * c - ny * s, nx * s + ny * c];
      }
      const vn2 = p.vx * nx + p.vy * ny;
      if (vn2 < spinta) {
        p.vx += (spinta - vn2) * nx;
        p.vy += (spinta - vn2) * ny;
      }
      if (m.ev) m.ev('colpo', o, p, -vn);
    } else if (vn < 0 && o.id) {
      if (m.ev) m.ev('colpo', o, p, -vn);
    } else if (vn < -350 && m.ev) {
      m.ev('parete', o, p, -vn);
    }
  }

  // Ghianda contro palla prigioniera: urto tra masse uguali, la prigioniera si
  // muove solo in verticale.
  function urtaPrigioniera(m, p, c, sim) {
    let nx = p.x - c.x, ny = p.y - c.y;
    const d2 = nx * nx + ny * ny;
    if (d2 >= 4 * R * R) return;
    const d = Math.sqrt(d2) || 0.001;
    nx /= d; ny /= d;
    p.x = c.x + nx * 2 * R; p.y = c.y + ny * 2 * R;
    const rel = p.vx * nx + (p.vy - c.vy) * ny;
    if (rel >= 0) return;
    const j = -(1 + 0.8) * rel / 2;
    p.vx += j * nx; p.vy += j * ny;
    if (sim) {
      if (-rel > 200 && !p.esito) p.esito = c.id;
      return;
    }
    c.vy -= j * ny * 1.3;
    if (m.ev && -rel > 150) m.ev('prigioniera', c, p, -rel);
  }

  function urtaPalle(m, a, b) {
    let nx = b.x - a.x, ny = b.y - a.y;
    const d2 = nx * nx + ny * ny;
    if (d2 >= 4 * R * R || d2 === 0) return;
    const d = Math.sqrt(d2);
    nx /= d; ny /= d;
    const pen = (2 * R - d) / 2;
    a.x -= nx * pen; a.y -= ny * pen;
    b.x += nx * pen; b.y += ny * pen;
    const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rel < 0) {
      const k = rel * 0.95;
      a.vx += k * nx; a.vy += k * ny;
      b.vx -= k * nx; b.vy -= k * ny;
      if (-rel > 300 && m.ev) m.ev('palle', null, a, -rel);
    }
  }

  // linea attraversata tra (px, py) e (x, y)? Restituisce +1 / -1 o 0.
  function attraversata(l, px, py, x, y) {
    const c0 = (px - l.ax) * l.dy - (py - l.ay) * l.dx;
    const c1 = (x - l.ax) * l.dy - (y - l.ay) * l.dx;
    if ((c0 < 0) === (c1 < 0)) return 0;
    // punto d'incrocio dentro il segmento?
    const t = ((x - l.ax) * l.dx + (y - l.ay) * l.dy) / l.L2;
    if (t < -0.02 || t > 1.02) return 0;
    return c1 < 0 ? 1 : -1;
  }

  // Griglia a fasce orizzontali: ogni fascia conosce le pareti e i paletti
  // che la toccano (così ogni passo guarda solo quelli vicini).
  const FASCIA = 100;
  function preparaGriglia(m) {
    m.griglia = [0, 1].map((piano) => {
      const n = Math.ceil((m.H + 200) / FASCIA);
      const fasce = Array.from({ length: n }, () => ({ segmenti: [], cerchi: [] }));
      for (const s of m.segmenti[piano]) {
        for (let i = Math.max(0, Math.floor(s.y0 / FASCIA)); i <= Math.min(n - 1, Math.floor(s.y1 / FASCIA)); i++) fasce[i].segmenti.push(s);
      }
      for (const c of m.cerchi[piano]) {
        const mm = c.r + R + 30;
        for (let i = Math.max(0, Math.floor((c.y - mm) / FASCIA)); i <= Math.min(n - 1, Math.floor((c.y + mm) / FASCIA)); i++) fasce[i].cerchi.push(c);
      }
      return fasce;
    });
  }

  // Un passo di una ghianda. sim = simulazione del giocatore simulato: niente
  // effetti, la prima cosa notevole finisce in p.esito.
  // Restituisce un oggetto { bocca } o { presa } quando la ghianda entra in
  // una rampa o cade in una buca (lo gestisce chi chiama).
  TF.passoPalla = function passoPalla(m, p, h, sim, flipper = m.flipper) {
    p.px = p.x; p.py = p.y;
    p.vy += m.gravita * h;
    const k = 1 - FISICA.attrito * h;
    p.vx *= k; p.vy *= k;
    if (p.spin) p.spin *= 1 - FISICA.spinCala * h;
    // disco che gira
    for (const d of m.dischi) {
      if (d.piano !== p.piano) continue;
      const dx = p.x - d.x, dy = p.y - d.y;
      if (dx * dx + dy * dy < d.r * d.r) {
        const tx = -dy * d.w, ty = dx * d.w;
        p.vx += (tx - p.vx) * d.presa * h * 0.35 + tx * 0.6 * h * d.presa;
        p.vy += (ty - p.vy) * d.presa * h * 0.35 + ty * 0.6 * h * d.presa;
        if (sim && !p.esito && dx * dx + dy * dy < 30 * 30 && d.esito) p.esito = d.esito;
      }
    }
    // magnete
    for (const g of m.magneti) {
      if (!g.attivo || g.palla || g.piano !== p.piano) continue;
      const dx = g.x - p.x, dy = g.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < g.r * g.r) {
        const d = Math.sqrt(d2) || 1;
        const f = g.forza * (1 - d / g.r);
        p.vx += dx / d * f * h; p.vy += dy / d * f * h;
        if (d < g.presa && p.vx * p.vx + p.vy * p.vy < 900 * 900) {
          if (sim) { if (!p.esito) p.esito = g.id; } else return { magnete: g };
        }
      }
    }
    const v2 = p.vx * p.vx + p.vy * p.vy;
    if (v2 > FISICA.velMax * FISICA.velMax) {
      const f = FISICA.velMax / Math.sqrt(v2);
      p.vx *= f; p.vy *= f;
    }
    p.x += p.vx * h;
    p.y += p.vy * h;
    if (!m.griglia) preparaGriglia(m);
    const fascia = m.griglia[p.piano][clamp(Math.floor(p.y / FASCIA), 0, m.griglia[p.piano].length - 1)];
    const segs = fascia.segmenti;
    for (let i = 0; i < segs.length; i++) urtaSegmento(m, p, segs[i], sim);
    const cer = fascia.cerchi;
    for (let i = 0; i < cer.length; i++) urtaCerchio(m, p, cer[i], sim);
    for (const f of flipper) urtaFlipper(m, p, f, sim);
    for (const c of m.prigioniere) if (c.piano === p.piano) urtaPrigioniera(m, p, c, sim);
    // sensori
    for (const s of m.sensori) {
      if (s.piano !== p.piano) continue;
      const v = attraversata(s, p.px, p.py, p.x, p.y);
      if (!v) continue;
      const avanti = s.verso ? (p.vx * s.verso[0] + p.vy * s.verso[1] > 0) : v > 0;
      if (sim) { if (s.esito && avanti && !p.esito) p.esito = s.esito; } else if (m.ev) m.ev('sensore', s, p, avanti);
    }
    // bocche delle rampe
    for (const b of m.bocche) {
      if (b.piano !== p.piano || (b.attivo && !b.attivo())) continue;
      if (!attraversata(b, p.px, p.py, p.x, p.y)) continue;
      const vv = p.vx * b.verso[0] + p.vy * b.verso[1];
      if (vv < b.velMin) continue;
      if (sim) { if (!p.esito) p.esito = b.esito; } else return { bocca: b, vel: vv };
    }
    // zone
    for (const z of m.zone) {
      if (z.piano !== p.piano || (z.attivo && !z.attivo())) continue;
      const dx = p.x - z.x, dy = p.y - z.y;
      if (dx * dx + dy * dy > z.r * z.r) continue;
      if (sim) { if (!p.esito) p.esito = z.esito; } else if (m.ev) m.ev('zona', z, p, 0);
    }
    // buche
    for (const q of m.prese) {
      if (q.piano !== p.piano || (q.attivo && !q.attivo())) continue;
      const dx = p.x - q.x, dy = p.y - q.y;
      if (dx * dx + dy * dy > q.r * q.r) continue;
      if (p.fuori && p.fuori.presa === q && m.tempo < p.fuori.t) continue;
      if (p.vx * p.vx + p.vy * p.vy > q.velMax * q.velMax) continue;
      if (sim) { if (!p.esito) p.esito = q.esito; } else return { presa: q };
    }
    return null;
  };

  TF.urtaPalle = urtaPalle;

  // Palle prigioniere: gravità, fine corsa e ritorno.
  TF.aggiornaPrigioniere = function aggiornaPrigioniere(m, h) {
    for (const c of m.prigioniere) {
      c.vy += m.gravita * h;
      c.vy *= 1 - 0.5 * h;
      c.y += c.vy * h;
      if (c.y > c.giu) {
        c.y = c.giu;
        c.vy = c.vy > 200 ? -c.vy * 0.25 : 0;
        c.arrivata = false;
      }
      if (c.y < c.su) {
        c.y = c.su;
        if (!c.arrivata && m.ev) m.ev('prigionieraCima', c, null, -c.vy);
        c.arrivata = true;
        c.vy = -c.vy * 0.35;
      }
    }
  };

  // Simula una ghianda (copia) con copie dei flipper, finché non succede
  // qualcosa (p.esito) o finisce il tempo. esitoExtra(q) aggiunge esiti del
  // tavolo (per esempio "persa" sotto i flipper).
  TF.simula = function simula(m, palla, flipCopie, durata, esitoExtra) {
    const q = { x: palla.x, y: palla.y, vx: palla.vx, vy: palla.vy, px: palla.x, py: palla.y, piano: palla.piano, esito: null };
    const h = FISICA.passo;
    let t = 0, minY = q.y;
    while (t < durata && !q.esito) {
      t += h;
      for (const f of flipCopie) TF.muoviFlipper(f, h, t, false);
      TF.passoPalla(m, q, h, true, flipCopie);
      if (q.y < minY) minY = q.y;
      if (!q.esito && esitoExtra) q.esito = esitoExtra(q);
    }
    return { esito: q.esito || (minY < palla.y - 250 ? 'su' : 'niente'), t, q };
  };

  // ================================================================ audio
  // Web Audio: effetti brevi (TF.audio.effetti) e un lettore di musica a
  // passi di sedicesimi, con il brano e gli stili dati dal tavolo.
  const A = TF.audio = { ctx: null, uscita: null, rumore: null, muto: false, abilitato: () => true };
  A.contesto = function contesto() {
    if (!A.ctx) {
      const c = A.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 5;
      comp.attack.value = 0.003; comp.release.value = 0.25;
      comp.connect(c.destination);
      A.uscita = c.createGain();
      A.uscita.gain.value = 0.9;
      A.uscita.connect(comp);
      A.rumore = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = A.rumore.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // riverbero del mobile: una risposta all'impulso breve generata nel
      // codice (rumore che si spegne in 0,45 s, un po' più scuro col tempo);
      // gli effetti ci mandano una piccola parte, così suonano "dentro" il flipper
      try {
        const n = Math.floor(c.sampleRate * 0.45);
        const ir = c.createBuffer(2, n, c.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const b = ir.getChannelData(ch);
          let filtro = 0;
          for (let i = 0; i < n; i++) {
            const t = i / n;
            filtro += ((Math.random() * 2 - 1) - filtro) * (0.55 - 0.35 * t);
            b[i] = filtro * Math.pow(1 - t, 2.2) * (i < 200 ? i / 200 : 1);
          }
        }
        const conv = c.createConvolver();
        conv.buffer = ir;
        A.mandata = c.createGain();
        A.mandata.gain.value = 0.16;
        A.uscita.connect(A.mandata);
        A.mandata.connect(conv);
        conv.connect(comp);
      } catch (e) { /* senza riverbero */ }
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return A.ctx;
  };
  function tono(f, d, o = {}) {
    const c = A.ctx;
    const t = c.currentTime + (o.rit || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.tipo || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.scivola || d));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.06, t + (o.attacco || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let nodo = osc.connect(g);
    if (o.filtro) {
      const fl = c.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = o.filtro;
      nodo = nodo.connect(fl);
    }
    nodo.connect(A.uscita);
    osc.start(t);
    osc.stop(t + d + 0.05);
  }
  function rumore(d, o = {}) {
    const c = A.ctx;
    const t = c.currentTime + (o.rit || 0);
    const s = c.createBufferSource();
    s.buffer = A.rumore;
    const fl = c.createBiquadFilter();
    fl.type = o.tipo || 'lowpass';
    fl.Q.value = o.q || 0.8;
    fl.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + d);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.08, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl).connect(g).connect(A.uscita);
    s.start(t, Math.random() * 1.5);
    s.stop(t + d + 0.05);
  }
  const note = (lista, passo, o) => lista.forEach((f, i) => tono(f, o.d || passo * 1.6, { ...o, rit: (o.rit || 0) + i * passo }));
  A.tono = tono; A.rumoreBreve = rumore; A.note = note;

  const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];
  let ultimoClic = 0, caricaOsc = null;
  const EFFETTI = A.effetti = {
    // il solenoide del flipper: scatto secco, con la botta della bobina
    flipper() {
      rumore(0.035, { tipo: 'highpass', f: 2500, vol: 0.1 });
      rumore(0.06, { tipo: 'bandpass', f: 1200, q: 1.5, vol: 0.12 });
      tono(95, 0.07, { tipo: 'square', f2: 60, vol: 0.06, filtro: 600 });
    },
    // il flipper che ricade: clack più morbido
    flipperGiu() {
      rumore(0.04, { tipo: 'bandpass', f: 900, q: 1.2, vol: 0.06 });
      tono(70, 0.05, { tipo: 'triangle', f2: 50, vol: 0.04 });
    },
    // il knocker: il colpo di legno dei flipper veri (palla extra, match)
    knocker() {
      rumore(0.05, { tipo: 'highpass', f: 1500, vol: 0.3 });
      rumore(0.12, { tipo: 'bandpass', f: 500, q: 1, vol: 0.2 });
      tono(180, 0.08, { tipo: 'triangle', f2: 55, vol: 0.3, scivola: 0.04 });
    },
    // lo scolo: la ghianda cade nella vaschetta e rotola fino in fondo
    scolo() {
      tono(110, 0.12, { tipo: 'triangle', f2: 60, vol: 0.18 });
      rumore(0.1, { f: 900, vol: 0.12 });
      rumore(0.5, { f: 500, f2: 180, vol: 0.06, rit: 0.1 });
      tono(90, 0.08, { tipo: 'triangle', f2: 55, vol: 0.08, rit: 0.32 });
    },
    colpo: (k) => tono(150, 0.06, { tipo: 'triangle', f2: 80, vol: 0.05 + 0.08 * k }),
    parete: (k) => tono(220, 0.04, { tipo: 'triangle', f2: 160, vol: 0.02 + 0.05 * k }),
    legno: (k) => { tono(320, 0.05, { tipo: 'triangle', f2: 240, vol: 0.03 + 0.06 * k }); rumore(0.03, { tipo: 'bandpass', f: 900, q: 2, vol: 0.04 * k + 0.02 }); },
    clic() {
      const ora = A.ctx.currentTime;
      if (ora - ultimoClic < 0.03) return;
      ultimoClic = ora;
      tono(1800, 0.03, { tipo: 'square', vol: 0.015, filtro: 4000 });
    },
    // i nodi (bumper): la botta del solenoide più la campanella di metallo
    // (due parziali inarmoniche, come una campana vera)
    bumper(i) {
      const f = [392, 494, 587][i % 3];
      tono(f, 0.14, { tipo: 'square', f2: f * 1.6, scivola: 0.05, vol: 0.045, filtro: 3000 });
      tono(f * 0.5, 0.12, { tipo: 'sine', vol: 0.12 });
      rumore(0.05, { tipo: 'highpass', f: 3500, vol: 0.06 });
      const c = [1568, 1760, 2093][i % 3];
      tono(c, 0.5, { tipo: 'sine', vol: 0.035, attacco: 0.002 });
      tono(c * 2.76, 0.28, { tipo: 'sine', vol: 0.014, attacco: 0.002 });
    },
    fionda() {
      rumore(0.06, { tipo: 'bandpass', f: 900, q: 1, vol: 0.12 });
      tono(260, 0.08, { tipo: 'square', f2: 520, vol: 0.04, filtro: 2000 });
    },
    bersaglio() {
      tono(180, 0.12, { tipo: 'square', f2: 90, vol: 0.06, filtro: 1200 });
      rumore(0.08, { f: 1500, vol: 0.08 });
    },
    sasso() {
      tono(120, 0.14, { tipo: 'triangle', f2: 60, vol: 0.12 });
      rumore(0.12, { tipo: 'bandpass', f: 700, q: 1.2, vol: 0.12 });
    },
    fisso: () => { tono(900, 0.06, { tipo: 'square', vol: 0.03, filtro: 2500 }); tono(1350, 0.08, { tipo: 'triangle', vol: 0.04, rit: 0.03 }); },
    rialza: () => note([330, 440], 0.05, { tipo: 'square', vol: 0.025, filtro: 2000, d: 0.08 }),
    spunta: () => { tono(140, 0.12, { tipo: 'square', f2: 280, vol: 0.05, filtro: 1500 }); rumore(0.1, { f: 800, vol: 0.06 }); },
    cartello: () => { rumore(0.1, { tipo: 'bandpass', f: 600, q: 2, vol: 0.12 }); tono(240, 0.1, { tipo: 'triangle', f2: 120, vol: 0.08 }); },
    corsia: (i) => tono(PENTA[4 + i], 0.18, { tipo: 'triangle', vol: 0.07 }),
    tino: () => note([784, 988, 1175, 1568], 0.07, { tipo: 'square', vol: 0.04, filtro: 3500, d: 0.15 }),
    spinner: () => tono(2400, 0.02, { tipo: 'square', vol: 0.012, filtro: 5000 }),
    orbita() {
      rumore(0.35, { tipo: 'bandpass', f: 600, f2: 2600, q: 1.5, vol: 0.06 });
      tono(440, 0.2, { tipo: 'sawtooth', f2: 880, vol: 0.03, filtro: 2500 });
    },
    rampa() {
      rumore(0.6, { tipo: 'bandpass', f: 400, f2: 2200, q: 2, vol: 0.05 });
      tono(220, 0.55, { tipo: 'sawtooth', f2: 660, vol: 0.03, filtro: 1800 });
    },
    filo() {
      rumore(0.7, { tipo: 'bandpass', f: 3000, f2: 5000, q: 6, vol: 0.04 });
      tono(1200, 0.6, { tipo: 'sine', f2: 1600, vol: 0.015 });
    },
    giro() {
      rumore(0.8, { tipo: 'bandpass', f: 300, f2: 3000, q: 3, vol: 0.07 });
      tono(200, 0.8, { tipo: 'sawtooth', f2: 900, vol: 0.035, filtro: 2200 });
    },
    fineRampa: () => note([523, 659, 784, 1047], 0.05, { tipo: 'triangle', vol: 0.06, d: 0.12 }),
    deviatore: () => { tono(600, 0.05, { tipo: 'square', vol: 0.03, filtro: 2500 }); rumore(0.05, { tipo: 'highpass', f: 2500, vol: 0.05 }); },
    buca() {
      tono(300, 0.25, { tipo: 'sine', f2: 90, vol: 0.18 });
      rumore(0.15, { f: 600, vol: 0.08 });
    },
    tunnel() {
      rumore(0.9, { f: 500, f2: 120, vol: 0.09 });
      tono(90, 0.9, { tipo: 'sine', f2: 60, vol: 0.12 });
    },
    sputa() {
      tono(80, 0.15, { tipo: 'sine', f2: 200, vol: 0.2 });
      rumore(0.12, { tipo: 'bandpass', f: 1200, vol: 0.1 });
    },
    pozzo() {
      tono(70, 0.25, { tipo: 'sine', f2: 260, vol: 0.24 });
      rumore(0.2, { tipo: 'bandpass', f: 400, f2: 2500, vol: 0.12 });
    },
    blocco: () => note([392, 523, 659, 784], 0.09, { tipo: 'square', vol: 0.04, filtro: 2400, d: 0.14 }),
    kickback() {
      tono(70, 0.25, { tipo: 'sine', f2: 220, vol: 0.25 });
      rumore(0.2, { f: 2000, f2: 400, vol: 0.12 });
    },
    palo: () => { tono(100, 0.18, { tipo: 'sine', f2: 300, vol: 0.18 }); rumore(0.1, { f: 900, vol: 0.08 }); },
    esterna: () => tono(330, 0.35, { tipo: 'sawtooth', f2: 160, vol: 0.04, filtro: 1500 }),
    magnete() {
      tono(110, 0.5, { tipo: 'sawtooth', vol: 0.03, filtro: 600 });
      tono(113, 0.5, { tipo: 'sawtooth', vol: 0.03, filtro: 600 });
    },
    lascia: () => tono(160, 0.2, { tipo: 'triangle', f2: 600, vol: 0.08 }),
    prigioniera: () => { tono(500, 0.06, { tipo: 'triangle', vol: 0.06 }); tono(700, 0.05, { tipo: 'triangle', vol: 0.04, rit: 0.02 }); },
    chiave: () => note([1047, 1319, 1568, 2093], 0.06, { tipo: 'triangle', vol: 0.07, d: 0.14 }),
    robivecchio() {
      note([1175, 1568, 1976, 2349, 2637], 0.07, { tipo: 'triangle', vol: 0.07, d: 0.18 });
      rumore(0.5, { tipo: 'highpass', f: 6000, vol: 0.03, rit: 0.15 });
    },
    impresa: () => note([659, 784, 988, 1319], 0.08, { tipo: 'square', vol: 0.04, filtro: 3500, d: 0.2 }),
    torcia() {
      rumore(0.5, { tipo: 'bandpass', f: 1500, f2: 400, q: 0.7, vol: 0.1 });
      tono(523, 0.2, { tipo: 'triangle', f2: 784, vol: 0.05 });
    },
    agente() {
      tono(260, 0.1, { tipo: 'square', f2: 180, vol: 0.05, filtro: 1500 });
      tono(160, 0.12, { tipo: 'sawtooth', f2: 110, vol: 0.04, filtro: 1200, rit: 0.06 });
    },
    stordito: () => note([880, 660, 880, 660, 440], 0.06, { tipo: 'square', vol: 0.035, filtro: 2500, d: 0.1 }),
    combo: (n) => note([PENTA[Math.min(n, 8)], PENTA[Math.min(n + 2, 10)]], 0.05, { tipo: 'square', vol: 0.04, filtro: 3500, d: 0.1 }),
    molt: () => note([523, 784, 1047, 1568], 0.06, { tipo: 'sawtooth', vol: 0.04, filtro: 3000, d: 0.14 }),
    acceso: () => note([880, 1175, 880, 1175], 0.07, { tipo: 'square', vol: 0.03, filtro: 3500, d: 0.08 }),
    skill() {
      note([523, 659, 784, 1047, 1319, 1568], 0.06, { tipo: 'triangle', vol: 0.07, d: 0.14 });
      rumore(0.4, { tipo: 'highpass', f: 6000, vol: 0.03, rit: 0.2 });
    },
    jackpot() {
      note([523, 659, 784, 1047, 784, 1047, 1319], 0.07, { tipo: 'square', vol: 0.05, filtro: 4000, d: 0.16 });
      tono(65, 0.5, { tipo: 'sine', f2: 40, vol: 0.25 });
      rumore(0.6, { tipo: 'highpass', f: 5000, vol: 0.04, rit: 0.1 });
    },
    superJackpot() {
      EFFETTI.jackpot();
      note([1047, 1319, 1568, 2093, 1568, 2093, 2637], 0.08, { tipo: 'triangle', vol: 0.06, d: 0.2 });
    },
    multiball() {
      for (let i = 0; i < 4; i++) tono(440, 0.18, { tipo: 'sawtooth', f2: 880, vol: 0.04, filtro: 3000, rit: i * 0.22 });
      note([523, 659, 784, 1047], 0.08, { tipo: 'square', vol: 0.04, filtro: 3500, d: 0.2 });
    },
    avventura() {
      note([392, 494, 587, 784, 988], 0.08, { tipo: 'triangle', vol: 0.07, d: 0.2 });
      rumore(0.8, { tipo: 'bandpass', f: 300, f2: 4000, q: 1, vol: 0.05 });
    },
    fineAvventura: () => note([784, 659, 523], 0.1, { tipo: 'triangle', vol: 0.06, d: 0.18 }),
    moneta: (n) => { tono(PENTA[n % 8 + 2], 0.08, { tipo: 'square', vol: 0.035, filtro: 4000 }); tono(PENTA[n % 8 + 4], 0.18, { tipo: 'square', vol: 0.035, filtro: 4000, rit: 0.07 }); },
    extra: () => { EFFETTI.knocker(); note([523, 659, 784, 1047, 1319], 0.1, { tipo: 'triangle', vol: 0.08, d: 0.22, rit: 0.12 }); },
    salvata: () => note([659, 880, 1319], 0.07, { tipo: 'triangle', vol: 0.06, d: 0.14 }),
    persa() {
      EFFETTI.scolo();
      tono(440, 0.9, { tipo: 'sawtooth', f2: 70, vol: 0.05, filtro: 1500, rit: 0.25 });
    },
    scossone: () => { tono(55, 0.15, { tipo: 'sine', vol: 0.25 }); rumore(0.12, { f: 400, vol: 0.12 }); },
    avviso: () => note([880, 660], 0.12, { tipo: 'square', vol: 0.04, filtro: 2500, d: 0.12 }),
    tilt() {
      // i flipper che cadono (clack) e il ronzio del tilt
      rumore(0.06, { tipo: 'bandpass', f: 800, q: 1, vol: 0.14 });
      tono(60, 0.08, { tipo: 'triangle', f2: 40, vol: 0.12 });
      tono(110, 1.2, { tipo: 'sawtooth', vol: 0.07, filtro: 900, rit: 0.08 });
      tono(116, 1.2, { tipo: 'sawtooth', vol: 0.07, filtro: 900, rit: 0.08 });
    },
    tic: () => tono(1320, 0.03, { tipo: 'square', vol: 0.02, filtro: 4000 }),
    // le campanelle dei flipper elettromeccanici: tre campane (0 acuta, 1
    // media, 2 grave) battute da un martelletto; parziali inarmoniche e coda lunga
    campanella(i = 0, k = 1) {
      const f = [1568, 1175, 784][i % 3];
      tono(f, 1.1, { tipo: 'sine', vol: 0.055 * k, attacco: 0.002 });
      tono(f * 2.76, 0.4, { tipo: 'sine', vol: 0.016 * k, attacco: 0.002 });
      tono(f * 5.4, 0.12, { tipo: 'sine', vol: 0.008 * k, attacco: 0.001 });
      rumore(0.012, { tipo: 'highpass', f: 4500, vol: 0.05 * k });
    },
    // la ghianda che salta e batte sul vetro: "tac" secco e acuto
    vetro(k = 1) {
      rumore(0.018, { tipo: 'highpass', f: 5000, vol: 0.09 * k });
      tono(2900, 0.03, { tipo: 'square', vol: 0.02 * k, filtro: 7000 });
      tono(1450, 0.09, { tipo: 'sine', f2: 1380, vol: 0.035 * k, attacco: 0.001 });
    },
    // ball search: scattano uno dopo l'altro i solenoidi del tavolo
    ricerca() {
      for (let i = 0; i < 6; i++) {
        rumore(0.04, { tipo: 'bandpass', f: 900 + 250 * (i % 3), q: 1.4, vol: 0.09, rit: i * 0.11 });
        tono(90 + 15 * (i % 2), 0.06, { tipo: 'square', f2: 55, vol: 0.05, filtro: 600, rit: i * 0.11 });
      }
    },
    // lo stantuffo: la molla che scatta (twang che sale) e la ghianda che parte
    lancio(k) {
      tono(60 + 40 * k, 0.16, { tipo: 'sawtooth', f2: 160 + 120 * k, vol: 0.05 + 0.04 * k, filtro: 900, scivola: 0.1 });
      rumore(0.03, { tipo: 'highpass', f: 2000, vol: 0.1 });
      rumore(0.2 + 0.2 * k, { tipo: 'bandpass', f: 500, f2: 3000, q: 1, vol: 0.06 + 0.06 * k });
      tono(90, 0.12, { tipo: 'sine', f2: 50, vol: 0.2 });
    },
    carica(k) {
      if (!caricaOsc) {
        const o = A.ctx.createOscillator();
        const g = A.ctx.createGain();
        o.type = 'triangle';
        g.gain.value = 0.035;
        o.connect(g).connect(A.uscita);
        o.start();
        caricaOsc = { o, g };
      }
      caricaOsc.o.frequency.setTargetAtTime(160 + 500 * k, A.ctx.currentTime, 0.03);
    },
    fineCarica() {
      if (!caricaOsc) return;
      const { o, g } = caricaOsc;
      caricaOsc = null;
      g.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.02);
      o.stop(A.ctx.currentTime + 0.1);
    },
    via: () => note([523, 659, 784], 0.08, { tipo: 'triangle', vol: 0.06, d: 0.14 }),
    vittoria: () => note([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.09, { tipo: 'triangle', vol: 0.07, d: 0.18 }),
    sconfitta: () => note([392, 330, 262, 196], 0.17, { tipo: 'sawtooth', vol: 0.04, filtro: 1500, d: 0.24 }),
  };
  // suoni.nome(...) suona solo se si può (non muto, non nelle prove, contesto attivo)
  A.suoni = new Proxy(EFFETTI, {
    get: (o, k) => (...a) => {
      if (k === 'fineCarica') { if (A.ctx) { try { o[k](...a); } catch (e) { /* niente */ } } return; }
      if (A.ctx && A.ctx.state === 'running' && !A.muto && A.abilitato() && o[k]) {
        try { o[k](...a); } catch (e) { /* niente */ }
      }
    },
  });

  // ---------------------------------------------------------------- suoni continui
  // Il rotolamento della ghianda: rumore filtrato che cresce con la velocità
  // (più grave sul legno delle rampe). gioco.js lo aggiorna a ogni fotogramma
  // con la velocità della ghianda più veloce in campo; con 0 si spegne.
  const CONT = A.continui = { rotola: null };
  A.rotola = function rotola(vel, rampa) {
    const on = vel > 60 && A.ctx && A.ctx.state === 'running' && !A.muto && A.abilitato();
    if (!CONT.rotola) {
      if (!on) return;
      const c = A.ctx;
      const s = c.createBufferSource();
      s.buffer = A.rumore; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.7; f.frequency.value = 300;
      const g = c.createGain(); g.gain.value = 0;
      s.connect(f).connect(g).connect(A.uscita);
      s.start();
      CONT.rotola = { s, f, g };
    }
    const r = CONT.rotola;
    const t = A.ctx.currentTime;
    const k = on ? Math.pow(Math.min(1, vel / 3000), 0.7) : 0;
    r.g.gain.setTargetAtTime(k * (rampa ? 0.075 : 0.05), t, 0.05);
    r.f.frequency.setTargetAtTime(rampa ? 180 + 300 * k : 250 + 1400 * k, t, 0.08);
  };

  // Il ronzio del mobile: il trasformatore a 50 Hz con le sue armoniche,
  // bassissimo, si sente solo nei silenzi (A.ronzio(acceso) a ogni fotogramma)
  A.ronzio = function ronzio(acceso) {
    const on = acceso && A.ctx && A.ctx.state === 'running' && !A.muto && A.abilitato();
    if (!CONT.ronzio) {
      if (!on) return;
      const c = A.ctx;
      const g = c.createGain(); g.gain.value = 0;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.5;
      f.connect(g).connect(A.uscita);
      const osc = [[50, 'sine', 1], [100, 'sine', 0.55], [150, 'triangle', 0.3], [100, 'sawtooth', 0.12]].map(([hz, tipo, v]) => {
        const o = c.createOscillator(); o.type = tipo; o.frequency.value = hz;
        const og = c.createGain(); og.gain.value = v;
        o.connect(og).connect(f);
        o.start();
        return o;
      });
      CONT.ronzio = { g, osc };
    }
    CONT.ronzio.g.gain.setTargetAtTime(on ? 0.011 : 0, A.ctx.currentTime, 0.25);
  };

  // ---------------------------------------------------------------- musica
  // brano: battute { radice, accordo, melodia }; stili: { bpm, cassa, arpeggio,
  // onda, filtro, aperto, basso }. A.musica.stile() dice quale stile suonare.
  const NOTA = (n) => {
    const mm = /^([A-G])(#|b?)(\d)$/.exec(n);
    return 12 * (+mm[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[mm[1]] + (mm[2] === '#' ? 1 : mm[2] === 'b' ? -1 : 0);
  };
  TF.brano = (righe) => righe.map(([radice, tipo, mel]) => ({
    radice: NOTA(radice),
    accordo: { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 10], m7: [0, 3, 10], sus: [0, 5, 7] }[tipo],
    melodia: mel.split(' ').map((n) => (n === '-' ? null : NOTA(n))),
  }));
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const M = A.musica = { brano: null, stile: () => null, volume: 0.26, spenta: false, passo: 0, prossimo: 0, suona: false, uscita: null, filtro: null };
  function nota(t, tipo, f, vol, dur, verso = M.uscita, fFine = null, tFine = 0.03) {
    const c = A.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f, t);
    if (fFine) o.frequency.exponentialRampToValueAtTime(fFine, t + tFine);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(verso);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function rumoreMusica(t, vol, dur, tipoFiltro, freq) {
    const c = A.ctx;
    const s = c.createBufferSource();
    s.buffer = A.rumore;
    const f = c.createBiquadFilter();
    f.type = tipoFiltro; f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(M.uscita);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.02);
  }
  function passoMusica(n, t, st, durata) {
    const brano = M.brano;
    const battuta = brano[Math.floor(n / 16) % brano.length];
    const i = n % 16;
    const acc = battuta.accordo.map((x) => battuta.radice + 24 + x);
    if (st.basso === 'saltellante' ? i % 4 === 0 || i % 4 === 3 : i % 2 === 0) {
      const mm = battuta.radice + (i % 8 === 4 ? 7 : i % 4 === 2 ? 12 : 0);
      nota(t, st.ondaBasso || 'sawtooth', hz(mm), 0.09, durata * 1.6, M.filtro);
      nota(t, 'sine', hz(mm), 0.22, durata * 1.6);
    }
    if (st.arpeggio) nota(t, st.ondaArpeggio || 'square', hz(acc[i % 3] + 12 + (i % 6 === 5 ? 12 : 0)), 0.025, durata * 0.9, M.filtro);
    const mel = battuta.melodia[i];
    if (mel !== null && st.melodia !== false) {
      const lunga = battuta.melodia.slice(i + 1).findIndex((x) => x !== null);
      const dur = durata * Math.min(4, lunga < 0 ? 4 : lunga + 1) * 0.9;
      nota(t, st.onda, hz(mel), 0.05, dur, M.filtro);
      nota(t, 'triangle', hz(mel - 12), 0.04, dur * 0.8, M.filtro);
    }
    const cassa = st.cassa === 'dritta' ? i % 4 === 0 : st.cassa === 'mezza' ? i === 0 || i === 8 : i === 0 || i === 6 || i === 10;
    if (cassa) nota(t, 'sine', 150, 0.5, 0.18, M.uscita, 42, 0.12);
    if (st.rullante !== false && (i === 4 || i === 12)) rumoreMusica(t, 0.16, 0.14, 'bandpass', 1900);
    if (st.charleston !== false && i % 2 === (st.aperto ? 0 : 1)) rumoreMusica(t, st.aperto && i % 4 === 2 ? 0.08 : 0.04, st.aperto && i % 4 === 2 ? 0.12 : 0.03, 'highpass', 7500);
    if (st.legnetti && (i % 4 === 2 || i === 15)) nota(t, 'triangle', i === 15 ? 1600 : 1200, 0.06, 0.04);
  }
  A.aggiornaMusica = function aggiornaMusica() {
    if (!A.ctx || !M.brano) return;
    const st = M.stile();
    const on = !!st && A.ctx.state === 'running' && !A.muto && !M.spenta && !document.hidden;
    const t = A.ctx.currentTime;
    if (on !== M.suona) {
      M.suona = on;
      if (on && !M.uscita) {
        M.uscita = A.ctx.createGain();
        M.uscita.gain.value = 0;
        M.uscita.connect(A.uscita);
        M.filtro = A.ctx.createBiquadFilter();
        M.filtro.type = 'lowpass';
        M.filtro.frequency.value = 1600;
        M.filtro.Q.value = 3;
        M.filtro.connect(M.uscita);
      }
      if (on) M.prossimo = t + 0.08;
      if (M.uscita) {
        M.uscita.gain.cancelScheduledValues(t);
        M.uscita.gain.setTargetAtTime(on ? M.volume : 0, t, on ? 0.15 : 0.04);
      }
    }
    if (!on) return;
    M.filtro.frequency.setTargetAtTime(st.filtro, t, 0.3);
    if (M.prossimo < t) M.prossimo = t + 0.03;
    const durata = 60 / st.bpm / 4;
    while (M.prossimo < t + 0.2) {
      try { passoMusica(M.passo, M.prossimo, st, durata); } catch (e) { M.errore = e; }
      M.prossimo += durata;
      M.passo = (M.passo + 1) % (16 * M.brano.length);
    }
  };
  setInterval(A.aggiornaMusica, 50);
  document.addEventListener('visibilitychange', A.aggiornaMusica);
})();
