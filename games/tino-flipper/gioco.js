/*
 * Tino Flipper
 * Flipper al neon, senza storia: bumper, fionde, rampa, orbita con lo spinner,
 * bersagli che cadono, la Tana (buca) per bloccare le ghiande e partire col
 * multiball, Gino al centro come bersaglio, corsie T-I-N-O per il moltiplicatore
 * del bonus, combo che moltiplicano il campo e sei scenari che cambiano colori,
 * sfondo e regole per 35 secondi.
 *
 * Tavolo logico 600 × 1040 (il corridoio di lancio è a destra, x 540-580).
 * Sugli schermi larghi accanto al tavolo ci sono due pannelli disegnati nel
 * canvas (display a sinistra, Tino a destra).
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------- costanti
  const W = 600, H = 1040;
  const R = 12;                       // raggio della ghianda
  const LATO = 260;                   // larghezza dei pannelli laterali (schermi larghi)
  const CX = 280;                     // centro del campo (senza il corridoio di lancio)

  const FISICA = {
    gravita: 1650,       // px/s² lungo il tavolo
    passo: 1 / 960,      // passo della simulazione
    velMax: 3300,
    attrito: 0.04,       // frazione di velocità persa al secondo (rotolamento)
    pareti: 0.42,        // rimbalzo sulle pareti
    gomme: 0.7,          // rimbalzo su gomme e paletti
  };
  const FLIPPER = {
    lungo: 92, r1: 14, r2: 7,
    riposo: 0.52, su: -0.47,          // angolo sotto/sopra l'orizzontale (rad)
    velSu: 30, velGiu: 17,            // rad/s
    e: 0.25,                          // rimbalzo sulla gomma del flipper
    sx: [178, 905], dx: [382, 905],
  };
  const LANCIO = { min: 850, max: 2950, pieno: 1.05, auto: 0.72 };
  const BUMPER = { spinta: 980, raggio: 27 };
  const FIONDA = { spinta: 820, soglia: 140 };
  const SALVA = { inizio: 9, multiball: 14, minimo: 5 };
  const TILT = { colpo: 1, cala: 0.55, avviso: 1.7, tilt: 2.75 };

  // Punti di base (moltiplicati dal campo: combo e scenari).
  const PUNTI = {
    bumper: 1000, fionda: 110, corsia: 5000, corsieTutte: 25000, corsiaInterna: 1000,
    bersaglio: 3000, bersagliTutti: 25000, gino: 7500, spinner: 300, rampa: 20000,
    rampaInPiu: 5000, orbita: 15000, tana: 10000, skill: 50000, combo: 10000,
    jackpot: 150000, jackpotInPiu: 50000, superJackpot: 500000, kickback: 2500,
    corsiaEsterna: 5000,
  };

  // Scenari: si accendono colpendo Gino e partono nella Tana. Ognuno ha i suoi
  // colori (tema), il suo sfondo e una regola per 35 secondi.
  const SCENARI = [
    { id: 'disco', nome: 'Disco nel bosco', durata: 35, testo: 'I bumper valgono 10.000! 25 colpi per la palla stroboscopica.' },
    { id: 'pioggia', nome: 'Pioggia di ghiande', durata: 35, testo: 'Raccogli le ghiande d\'oro sparse sul tavolo!' },
    { id: 'lucciole', nome: 'Caccia alle lucciole', durata: 35, testo: 'Colpisci il tiro dove si posa la lucciola!' },
    { id: 'tempesta', nome: 'Temporale', durata: 35, testo: 'Rampa e orbita raddoppiano a ogni colpo!' },
    { id: 'luna', nome: 'Luna park', durata: 35, testo: 'Tutto il tavolo vale il triplo!' },
  ];
  const FESTA = { id: 'festa', nome: 'Gran festa di Gino', durata: 45, testo: 'Quattro ghiande in campo: ogni tiro è un jackpot!' };

  const TEMI = {
    notte: { nome: 'Notte nel bosco', fondo: ['#0b0420', '#1a0939', '#2a0f52'], neon: '#39f0ff', neon2: '#ff4fd8', luce: '#ffe14d' },
    disco: { nome: 'Disco nel bosco', fondo: ['#15011f', '#2c0540', '#45085c'], neon: '#ff3df2', neon2: '#ffe600', luce: '#39f0ff' },
    pioggia: { nome: 'Pioggia di ghiande', fondo: ['#140a02', '#2b1606', '#45250b'], neon: '#ffb627', neon2: '#ff5e1a', luce: '#fff27a' },
    lucciole: { nome: 'Caccia alle lucciole', fondo: ['#02120f', '#05241c', '#0a3a2b'], neon: '#7dff5a', neon2: '#d4ff3a', luce: '#fffb8a' },
    tempesta: { nome: 'Temporale', fondo: ['#04070e', '#0c1424', '#172239'], neon: '#7fb2ff', neon2: '#e8f4ff', luce: '#ffe14d' },
    luna: { nome: 'Luna park', fondo: ['#0a031f', '#1b0a45', '#2b1062'], neon: '#ff4a5a', neon2: '#ffd23f', luce: '#7dfcff' },
    festa: { nome: 'Gran festa', fondo: ['#12021c', '#22063a', '#36094f'], neon: '#ff6ad5', neon2: '#7dfcff', luce: '#fffb8a' },
  };

  const ASSETS = '../../assets/';
  const immagini = {
    normale: carica(ASSETS + 'tino/tino-normale.png'),
    arrabbiato: carica(ASSETS + 'tino/tino-arrabbiato.png'),
    ferito: carica(ASSETS + 'tino/tino-ferito.png'),
    ko: carica(ASSETS + 'tino/tino-ko.png'),
    gino: carica(ASSETS + 'gino/gino.png'),
  };
  function carica(src) {
    const img = new Image();
    img.src = src;
    return img;
  }
  const pronta = (img) => img && img.complete && img.naturalWidth > 0;

  // ---------------------------------------------------------------- utilità
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const casuale = (a, b) => a + Math.random() * (b - a);
  const scegli = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const numero = (n) => Math.round(n).toLocaleString('it-IT');

  function leggi(chiave, predefinito) {
    try {
      const v = localStorage.getItem('tino-flipper:' + chiave);
      return v === null ? predefinito : JSON.parse(v);
    } catch (e) {
      return predefinito;
    }
  }
  function scrivi(chiave, valore) {
    try { localStorage.setItem('tino-flipper:' + chiave, JSON.stringify(valore)); } catch (e) { /* niente */ }
  }

  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  const $ = (s) => document.querySelector(s);
  const canvas = $('#campo');
  const ctx = canvas.getContext('2d');
  const palco = $('#palco');
  const pannello = $('#pannello');
  const elPunti = $('#punti');
  const elPalle = $('#palle');

  // ================================================================ tavolo
  // Pareti: spezzate di segmenti. r = raggio di collisione (oltre alla ghianda),
  // e = rimbalzo, tipo = come si disegna.
  const segmenti = [];
  const cerchi = [];
  function parete(punti, o = {}) {
    for (let i = 0; i < punti.length - 1; i++) {
      segmento(punti[i][0], punti[i][1], punti[i + 1][0], punti[i + 1][1], o);
    }
  }
  function segmento(ax, ay, bx, by, o = {}) {
    const s = {
      ax, ay, bx, by, r: o.r ?? 2, e: o.e ?? FISICA.pareti, tipo: o.tipo || 'muro',
      id: o.id || null, spinta: o.spinta || 0, unaVia: o.unaVia || null, attivo: o.attivo || null,
    };
    s.dx = bx - ax; s.dy = by - ay;
    s.L2 = s.dx * s.dx + s.dy * s.dy || 1;
    const m = s.r + R + 4;
    s.x0 = Math.min(ax, bx) - m; s.x1 = Math.max(ax, bx) + m;
    s.y0 = Math.min(ay, by) - m; s.y1 = Math.max(ay, by) + m;
    segmenti.push(s);
    return s;
  }
  function cerchio(x, y, r, o = {}) {
    const c = { x, y, r, e: o.e ?? FISICA.gomme, tipo: o.tipo || 'paletto', id: o.id || null, spinta: o.spinta || 0, attivo: o.attivo || null };
    cerchi.push(c);
    return c;
  }
  function arco(cx, cy, r, a0, a1, n) {
    const p = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return p;
  }
  const specchio = (punti) => punti.map(([x, y]) => [2 * CX - x, y]);

  // Volta in cima: semicerchio di centro (300, 300) e raggio 280.
  const VOLTA = arco(300, 300, 280, Math.PI, 2 * Math.PI, 48);
  // Sporgenze ai lati (spingono verso il campo le ghiande che scendono lungo le pareti)
  const SPORGENZA_SX = [[20, 540], [58, 598], [58, 650], [20, 700]];
  // la guida finisce sul prolungamento della superficie del flipper a riposo (se finiva
  // sul perno, la ghianda restava ferma sul gradino)
  const GUIDA_SX = [[66, 712], [66, 845], [170, 884]];
  const FIONDA_SX = [[108, 735], [108, 816], [152, 838]];

  parete([[20, 1060], [20, 700]]);
  parete(SPORGENZA_SX);
  parete([[20, 540], [20, 300]]);
  parete(VOLTA);
  parete([[580, 300], [580, 1060]]);
  // corridoio di lancio
  parete([[540, 1060], [540, 700]]);
  parete(specchio(SPORGENZA_SX).reverse());
  parete([[540, 540], [540, 304]]);
  cerchio(540, 304, 4, { e: FISICA.pareti, tipo: 'muro' });
  // cancelletto in cima al corridoio: si passa solo salendo
  segmento(542, 300, 578, 300, { tipo: 'cancello', unaVia: [0, -1], r: 2 });
  // fondo del corridoio (lo stantuffo)
  segmento(540, 1013, 580, 1013, { tipo: 'stantuffo', e: 0.15 });
  // orbita sinistra
  parete([[70, 330], [70, 520]], { tipo: 'muro' });
  cerchio(70, 330, 5, { tipo: 'muro', e: FISICA.pareti });
  cerchio(70, 520, 7, { tipo: 'paletto' });
  // guide delle corsie interne
  parete(GUIDA_SX);
  parete(specchio(GUIDA_SX));
  cerchio(66, 712, 5, { tipo: 'paletto' });
  cerchio(494, 712, 5, { tipo: 'paletto' });
  // fionde
  function fionda(p, lato) {
    const [a, b, c] = p;
    segmento(a[0], a[1], b[0], b[1], { tipo: 'muro', e: 0.3 });
    segmento(b[0], b[1], c[0], c[1], { tipo: 'muro', e: 0.3 });
    segmento(a[0], a[1], c[0], c[1], { tipo: 'fionda', id: 'fionda-' + lato, spinta: FIONDA.spinta, e: 0.55, r: 4 });
    cerchio(a[0], a[1], 6, { tipo: 'paletto' });
    cerchio(c[0], c[1], 6, { tipo: 'paletto' });
  }
  fionda(FIONDA_SX, 'sx');
  fionda(specchio(FIONDA_SX), 'dx');

  // corsie T-I-N-O in cima
  const CORSIE = [210, 270, 330, 390];
  for (const x of [180, 240, 300, 360, 420]) {
    segmento(x, 120, x, 166, { tipo: 'paletto', r: 4, e: 0.5 });
  }
  const LETTERE = ['T', 'I', 'N', 'O'];

  // bumper
  const BUMPERS = [
    { x: 232, y: 248 }, { x: 352, y: 248 }, { x: 292, y: 336 },
  ].map((b, i) => Object.assign(b, { c: cerchio(b.x, b.y, BUMPER.raggio, { tipo: 'bumper', id: 'bumper', spinta: BUMPER.spinta }), lampo: 0, i }));

  // Gino al centro
  const GINO = { x: CX, y: 482, r: 36, trema: 0, salto: 0, giro: 0 };
  GINO.c = cerchio(GINO.x, GINO.y, GINO.r, { tipo: 'gino', id: 'gino', spinta: 260, e: 0.6 });

  // bersagli che cadono
  const BERSAGLI = [244, 280, 316].map((x, i) => {
    const b = { x, y: 612, giu: false, lampo: 0, i };
    b.s = segmento(x - 14, 612, x + 14, 612, { tipo: 'bersaglio', id: 'bersaglio', r: 6, e: 0.35, attivo: () => !b.giu });
    b.s.bersaglio = b;
    return b;
  });

  // la Tana: buca con la conca aperta in basso a destra
  const TANA = { x: 115, y: 405, presa: 18 };
  const ARCO_TANA = [Math.PI * 0.69, Math.PI * 2];
  parete(arco(TANA.x, TANA.y, 26, ARCO_TANA[0], ARCO_TANA[1], 12), { tipo: 'tana', e: 0.25, r: 3 });
  // tettuccio sopra la Tana: senza, la ghianda si incastrava tra la cupola e la parete dell'orbita
  const TETTO_TANA = [[70, 336], [146, 378]];
  parete(TETTO_TANA, { tipo: 'muro' });

  // entrata della rampa (a destra) e percorso sopraelevato
  const BOCCA = [[398, 476], [430, 360], [490, 370], [474, 488]];
  parete([BOCCA[0], BOCCA[1]], { tipo: 'rampa' });
  parete([BOCCA[3], BOCCA[2]], { tipo: 'rampa' });
  parete([BOCCA[1], BOCCA[2]], { tipo: 'rampa', e: 0.2 });
  cerchio(...BOCCA[0], 6, { tipo: 'paletto' });
  cerchio(...BOCCA[3], 6, { tipo: 'paletto' });
  const xBocca = (a, b, y) => a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
  const RAMPA = preparaPercorso([
    [460, 372], [460, 300], [458, 240], [450, 160], [404, 96], [300, 72], [204, 88],
    [164, 140], [158, 250], [158, 560], [140, 638], [104, 686], [84, 716],
  ]);
  function preparaPercorso(p) {
    const tratti = [];
    let lung = 0;
    for (let i = 0; i < p.length - 1; i++) {
      const dx = p[i + 1][0] - p[i][0], dy = p[i + 1][1] - p[i][1];
      const l = Math.hypot(dx, dy);
      tratti.push({ x: p[i][0], y: p[i][1], dx: dx / l, dy: dy / l, l, da: lung });
      lung += l;
    }
    return { punti: p, tratti, lung };
  }
  function puntoPercorso(per, s) {
    for (const t of per.tratti) {
      if (s <= t.da + t.l) {
        const k = s - t.da;
        return { x: t.x + t.dx * k, y: t.y + t.dy * k, dx: t.dx, dy: t.dy };
      }
    }
    const t = per.tratti[per.tratti.length - 1];
    return { x: t.x + t.dx * t.l, y: t.y + t.dy * t.l, dx: t.dx, dy: t.dy };
  }

  // Sensori: linee orizzontali (y, da x0 a x1) che la ghianda attraversa.
  const SENSORI = [
    ...CORSIE.map((x, i) => ({ id: 'corsia', i, x0: x - 28, x1: x + 28, y: 150 })),
    { id: 'spinner', x0: 20, x1: 70, y: 440 },
    { id: 'orbita', x0: 20, x1: 70, y: 400 },
    { id: 'esterna', lato: 'sx', x0: 20, x1: 64, y: 880 },
    { id: 'esterna', lato: 'dx', x0: 496, x1: 540, y: 880 },
    { id: 'interna', lato: 'sx', x0: 68, x1: 106, y: 790 },
    { id: 'interna', lato: 'dx', x0: 454, x1: 492, y: 790 },
  ];
  const SPINNER = { x: 45, y: 440, ang: 0, vel: 0 };

  // flipper
  function nuovoFlipper(lato) {
    const [px, py] = lato === 'sx' ? FLIPPER.sx : FLIPPER.dx;
    return { lato, px, py, a: FLIPPER.riposo, w: 0, premuto: false, verso: lato === 'sx' ? 1 : -1 };
  }
  const flipper = { sx: nuovoFlipper('sx'), dx: nuovoFlipper('dx') };

  // ================================================================ stato
  const stato = {
    test: false,         // prove automatiche: niente suoni, pannelli e avanzamento da solo
    iaGioca: false,      // nelle prove il giocatore simulato gioca anche la partita vera
    modo: 'demo',        // 'demo' | 'gioco'
    fase: 'gioco',       // 'gioco' | 'bonus' | 'pausa' | 'finita'
    pausaDa: null,
    punti: 0,
    palla: 1,            // numero della palla in gioco
    palleTotali: 3,
    palle: [],
    lancio: { carica: 0, premuto: false, attesa: false, auto: 0 },
    salva: 0,            // secondi di "ancora una" rimasti
    salvaPronto: false,  // il conto parte quando la ghianda esce dal corridoio
    corsie: [false, false, false, false],
    bonusMolt: 1,
    skill: { corsia: 0, attivo: false, t: 0 },
    moltCampo: 1, moltT: 0,
    combo: { n: 0, t: 0 },
    tana: { coda: [], blocco: 0, bloccate: 0, scenarioAcceso: false, extraAccesa: false, timer: 0 },
    ginoColpi: 0,
    multiball: false,
    jackpot: { valore: PUNTI.jackpot, fatti: 0, superAcceso: false, doppio: false },
    scenario: null,      // { id, t, durata, conto, ... }
    scenariFatti: [],    // id degli scenari finiti in questo giro
    giro: 0,             // giri completi (dopo la festa): il tavolo si fa più veloce
    tema: 'notte',
    kickback: true, spinGiri: 0,
    rampe: 0, prossimaExtra: 8, palleExtra: 0,
    tilt: 0, tiltato: false,
    contatori: null,     // per il bonus di fine palla
    bonus: null,         // conto del bonus mostrato a fine palla
    ferme: 0,
    scossa: 0, flash: 0,
    messaggi: [],
    scritte: [],
    particelle: [],
    oggetti: [],         // ghiande d'oro dello scenario "pioggia"
    lucciola: null,
    tino: { faccia: 'normale', t: 0, salto: 0, trema: 0 },
    tempo: 0,
    statistiche: { palle: 0, durata: 0, perse: 0, salvate: 0, fuori: 0, ferme: 0 },
  };
  let muto = leggi('muto', false);
  let musicaSpenta = leggi('musica-spenta', false);
  let classifica = leggi('classifica', []);
  let ultimaPosizione = -1;
  const record = () => (classifica.length ? classifica[0].punti : 0);

  const tema = () => TEMI[stato.tema];
  const gravita = () => FISICA.gravita * (1 + 0.06 * Math.min(stato.giro, 4));
  const inCampo = () => stato.palle.filter((p) => p.stato !== 'tana');

  // ================================================================ fisica
  function nuovaPalla(x, y, vx = 0, vy = 0) {
    const p = { x, y, vx, vy, px: x, py: y, rot: Math.random() * 6, stato: 'campo', rampa: 0, rampaV: 0, scia: [], ferma: 0, nuova: true };
    stato.palle.push(p);
    return p;
  }

  function angoloFlipper(f) { return f.a; }
  function puntaFlipper(f) {
    const a = angoloFlipper(f);
    return [f.px + Math.cos(a) * FLIPPER.lungo * f.verso, f.py + Math.sin(a) * FLIPPER.lungo];
  }

  function muoviFlipper(f, h, ora = orologio) {
    // colpo programmato dal giocatore simulato, al passo di fisica giusto
    if (f.prog) {
      f.premuto = ora >= f.prog.da && ora < f.prog.a;
      if (ora >= f.prog.a) f.prog = null;
    }
    const attivo = f.premuto && !stato.tiltato;
    const meta = attivo ? FLIPPER.su : FLIPPER.riposo;
    const vel = attivo ? FLIPPER.velSu : FLIPPER.velGiu;
    const prima = f.a;
    if (f.a > meta) f.a = Math.max(meta, f.a - vel * h);
    else if (f.a < meta) f.a = Math.min(meta, f.a + vel * h);
    f.w = (f.a - prima) / h;
  }

  function urtaFlipper(p, f) {
    const a = f.a;
    const ux = Math.cos(a) * f.verso, uy = Math.sin(a);
    const L = FLIPPER.lungo;
    const rx = p.x - f.px, ry = p.y - f.py;
    let t = (rx * ux + ry * uy) / L;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = f.px + ux * L * t, cy = f.py + uy * L * t;
    const rr = FLIPPER.r1 + (FLIPPER.r2 - FLIPPER.r1) * t + R;
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
      const k = (1 + FLIPPER.e) * vn;
      p.vx = rvx - k * nx + sx;
      p.vy = rvy - k * ny + sy;
      if (-vn > 900 && Math.abs(f.w) > 1 && !simulando) suoni.colpo(Math.min(1, -vn / 2500));
    }
  }

  function urtaSegmento(p, s) {
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
    rimbalza(p, nx, ny, s);
  }

  function urtaCerchio(p, c) {
    if (c.attivo && !c.attivo()) return;
    let nx = p.x - c.x, ny = p.y - c.y;
    const rr = c.r + R;
    const d2 = nx * nx + ny * ny;
    if (d2 >= rr * rr) return;
    const d = Math.sqrt(d2) || 0.001;
    nx /= d; ny /= d;
    p.x = c.x + nx * rr; p.y = c.y + ny * rr;
    rimbalza(p, nx, ny, c);
  }

  function rimbalza(p, nx, ny, o) {
    const vn = p.vx * nx + p.vy * ny;
    if (vn >= 0 && !o.spinta) return;
    if (vn < 0) {
      p.vx -= (1 + o.e) * vn * nx;
      p.vy -= (1 + o.e) * vn * ny;
    }
    if (simulando) {
      if (o.spinta && !(o.tipo === 'fionda' && -vn < FIONDA.soglia)) {
        const vn2 = p.vx * nx + p.vy * ny;
        if (vn2 < o.spinta) { p.vx += (o.spinta - vn2) * nx; p.vy += (o.spinta - vn2) * ny; }
      }
      return;
    }
    if (o.spinta && !stato.tiltato) {
      if (o.tipo === 'fionda' && -vn < FIONDA.soglia) return;
      if (o.attesa && stato.tempo - o.attesa < 0.06) return;
      o.attesa = stato.tempo;
      let spinta = o.spinta;
      if (o.tipo === 'fionda') {
        // le fionde vere non spingono mai due volte uguale (e così non c'è un
        // ping-pong infinito da una fionda all'altra)
        spinta *= casuale(0.82, 1.04);
        const a = casuale(-0.12, 0.12), c = Math.cos(a), s = Math.sin(a);
        [nx, ny] = [nx * c - ny * s, nx * s + ny * c];
      }
      const vn2 = p.vx * nx + p.vy * ny;
      if (vn2 < spinta) {
        p.vx += (spinta - vn2) * nx;
        p.vy += (spinta - vn2) * ny;
      }
      colpito(o, p, -vn);
    } else if (vn < 0 && o.id) {
      colpito(o, p, -vn);
    } else if (vn < -350) {
      suoni.parete(Math.min(1, -vn / 2000));
    }
  }

  function urtaPalle(a, b) {
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
      if (-rel > 300) suoni.clic();
    }
  }

  let simulando = false;
  let orologio = 0;     // tempo della fisica (avanza di un passo alla volta)

  function passoFisica(h) {
    orologio += h;
    muoviFlipper(flipper.sx, h);
    muoviFlipper(flipper.dx, h);
    const g = gravita();
    const palle = stato.palle;
    for (const p of palle) {
      if (p.stato !== 'campo') continue;
      p.px = p.x; p.py = p.y;
      p.vy += g * h;
      const k = 1 - FISICA.attrito * h;
      p.vx *= k; p.vy *= k;
      const v2 = p.vx * p.vx + p.vy * p.vy;
      if (v2 > FISICA.velMax * FISICA.velMax) {
        const f = FISICA.velMax / Math.sqrt(v2);
        p.vx *= f; p.vy *= f;
      }
      p.x += p.vx * h;
      p.y += p.vy * h;
      for (const s of segmenti) urtaSegmento(p, s);
      for (const c of cerchi) urtaCerchio(p, c);
      urtaFlipper(p, flipper.sx);
      urtaFlipper(p, flipper.dx);
      sensori(p);
    }
    for (let i = 0; i < palle.length; i++) {
      if (palle[i].stato !== 'campo') continue;
      for (let j = i + 1; j < palle.length; j++) {
        if (palle[j].stato === 'campo') urtaPalle(palle[i], palle[j]);
      }
    }
  }

  function sensori(p) {
    for (const s of SENSORI) {
      if (p.x < s.x0 || p.x > s.x1) continue;
      const prima = p.py - s.y, dopo = p.y - s.y;
      if ((prima < 0) === (dopo < 0)) continue;
      attraversa(s, p, dopo < 0 ? 'su' : 'giu');
    }
    // Tana
    const dx = p.x - TANA.x, dy = p.y - TANA.y;
    if (dx * dx + dy * dy < TANA.presa * TANA.presa && !(p.fuoriTana > stato.tempo)) entraTana(p);
    // entrata della rampa: dentro il canale, salendo abbastanza veloce
    if (p.y < 410 && p.y > 362 && p.vy < -260 && p.x > xBocca(BOCCA[0], BOCCA[1], p.y) && p.x < xBocca(BOCCA[3], BOCCA[2], p.y)) entraRampa(p);
    // ghiande d'oro (pioggia)
    for (const o of stato.oggetti) {
      if (!o.preso && Math.hypot(p.x - o.x, p.y - o.y) < R + 14) prendiOggetto(o);
    }
  }

  // ================================================================ regole
  function nuoviContatori() {
    return { bumper: 0, corsie: 0, rampe: 0, orbite: 0, bersagli: 0, gino: 0, scenari: 0, spinner: 0 };
  }

  function moltiplicatore() {
    let m = stato.moltT > 0 ? stato.moltCampo : 1;
    if (stato.scenario && stato.scenario.id === 'luna') m *= 3;
    return Math.min(m, 6);
  }

  function aggiungiPunti(n, x, y, colore) {
    const v = Math.round(n * moltiplicatore() / 10) * 10;
    if (stato.modo === 'gioco' && !stato.tiltato) stato.punti += v;
    if (x !== undefined) scritta(x, y, '+' + numero(v), colore);
    return v;
  }

  function scritta(x, y, testo, colore, grande = false) {
    stato.scritte.push({ x, y, testo, colore: colore || '#fff', t: 0, durata: grande ? 1.4 : 0.9, grande });
    if (stato.scritte.length > 24) stato.scritte.shift();
  }

  // Messaggio grande al centro del tavolo (e nel display)
  function messaggio(testo, sotto = '', durata = 1.8, colore = null) {
    stato.messaggi.push({ testo, sotto, durata, t: 0, colore });
    if (stato.messaggi.length > 3) stato.messaggi.shift();
  }

  function faccia(f, durata = 1.5) {
    stato.tino.faccia = f;
    stato.tino.t = durata;
  }
  function festa() {
    stato.tino.salto = 1.2;
    GINO.salto = 1;
  }

  function scintille(x, y, colore, n = 10, vel = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = casuale(0.3, 1) * vel;
      stato.particelle.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, durata: casuale(0.3, 0.7), colore, r: casuale(1.5, 3.2) });
    }
    if (stato.particelle.length > 260) stato.particelle.splice(0, stato.particelle.length - 260);
  }

  function colpoGrosso(intensita = 1) {
    stato.scossa = Math.max(stato.scossa, 0.25 * intensita);
  }

  // Tiri principali: contano per le combo e per la lucciola
  function tiro(nome, x, y) {
    const c = stato.combo;
    c.n = c.t > 0 ? c.n + 1 : 1;
    c.t = 3.6;
    if (c.n >= 2) {
      aggiungiPunti(PUNTI.combo * c.n, x, y - 24, tema().neon2);
      messaggio(`Combo ×${c.n}!`, '', 1.1);
      suoni.combo(c.n);
      if (c.n === 3 || c.n === 5 || c.n === 7) {
        const m = c.n === 3 ? 2 : c.n === 5 ? 3 : 4;
        if (m >= stato.moltCampo || stato.moltT <= 0) {
          stato.moltCampo = m;
          stato.moltT = 20;
          messaggio(`Campo ×${m}`, 'per 20 secondi', 1.8);
          suoni.molt();
          festa();
        }
      }
    }
    // lucciola
    const l = stato.lucciola;
    if (stato.scenario && stato.scenario.id === 'lucciole' && l && l.tiro === nome) {
      stato.scenario.conto++;
      const v = aggiungiPunti(75000 * stato.scenario.conto, x, y - 44, '#fffb8a');
      messaggio('Lucciola presa!', '+' + numero(v), 1.5);
      suoni.lucciola();
      scintille(x, y, '#fffb8a', 30, 380);
      nuovaLucciola();
      if (stato.scenario.conto === 4) obiettivoScenario('Tutte le lucciole!', 250000);
    }
    // festa: ogni tiro è un jackpot
    if (stato.scenario && stato.scenario.id === 'festa') {
      const v = aggiungiPunti(100000, x, y - 44, '#fffb8a');
      messaggio('JACKPOT!', '+' + numero(v), 1.1);
      suoni.jackpot();
      stato.flash = 0.5;
    }
  }

  function colpito(o, p, forza) {
    const t = tema();
    switch (o.tipo) {
      case 'bumper': {
        const b = BUMPERS.find((x) => x.c === o);
        b.lampo = 1;
        stato.contatori.bumper++;
        const disco = stato.scenario && stato.scenario.id === 'disco';
        aggiungiPunti(disco ? 10000 : PUNTI.bumper, b.x, b.y - 34, disco ? t.neon2 : '#fff');
        scintille(p.x, p.y, t.neon2, 8, 300);
        suoni.bumper(b.i);
        if (disco) {
          stato.scenario.conto++;
          if (stato.scenario.conto === 25) obiettivoScenario('Palla stroboscopica!', 150000);
        }
        break;
      }
      case 'fionda':
        stato.lampoFionda = stato.lampoFionda || {};
        stato.lampoFionda[o.id] = 1;
        aggiungiPunti(stato.scenario && stato.scenario.id === 'disco' ? 5000 : PUNTI.fionda);
        scintille(p.x, p.y, t.neon, 6, 240);
        suoni.fionda();
        break;
      case 'gino': {
        if (forza < 120) return;
        GINO.trema = 0.5;
        stato.contatori.gino++;
        aggiungiPunti(PUNTI.gino, GINO.x, GINO.y - 50, t.neon2);
        scintille(p.x, p.y, '#ffd28a', 12, 320);
        suoni.gino();
        if (stato.multiball && stato.jackpot.superAcceso) {
          const v = aggiungiPunti(PUNTI.superJackpot, GINO.x, GINO.y - 80, '#fffb8a');
          stato.jackpot.superAcceso = false;
          stato.jackpot.fatti = 0;
          messaggio('SUPER JACKPOT!', '+' + numero(v), 2.6);
          suoni.superJackpot();
          stato.flash = 1;
          colpoGrosso(1.5);
          festa();
          faccia('normale', 2);
        } else if (!stato.tana.scenarioAcceso && !stato.scenario) {
          stato.ginoColpi++;
          const serve = ginoServe();
          if (stato.ginoColpi >= serve) {
            stato.ginoColpi = 0;
            stato.tana.scenarioAcceso = true;
            const prossimo = prossimoScenario();
            messaggio('Scenario acceso!', `Nella Tana: ${prossimo.nome}`, 2);
            suoni.acceso();
          } else {
            scritta(GINO.x, GINO.y + 60, `${stato.ginoColpi}/${serve}`, t.neon);
          }
        }
        tiro('gino', GINO.x, GINO.y);
        break;
      }
      case 'bersaglio': {
        const b = o.bersaglio;
        if (b.giu) return;
        b.giu = true;
        b.lampo = 1;
        stato.contatori.bersagli++;
        aggiungiPunti(PUNTI.bersaglio, b.x, b.y - 18);
        suoni.bersaglio();
        scintille(b.x, b.y, t.neon, 10, 220);
        if (stato.scenario && stato.scenario.id === 'lucciole' && stato.lucciola && stato.lucciola.tiro === 'bersagli') tiro('bersagli', b.x, b.y);
        if (BERSAGLI.every((x) => x.giu)) tuttiGiu();
        break;
      }
      default: break;
    }
  }

  function ginoServe() {
    return Math.min(3 + stato.scenariFatti.length + stato.giro, 7);
  }

  function tuttiGiu() {
    aggiungiPunti(PUNTI.bersagliTutti, CX, 640, tema().neon);
    stato.bersagliT = 1.2;    // si rialzano dopo un attimo
    if (stato.multiball) {
      stato.jackpot.doppio = true;
      messaggio('Jackpot doppio!', 'Prendi la rampa', 1.8);
    } else if (stato.tana.blocco < 1) {
      stato.tana.blocco = 1;
      messaggio('Tana aperta!', `Blocca la ghianda ${stato.tana.bloccate + 1}`, 1.8);
    } else {
      messaggio('Bersagli giù!', '', 1.2);
    }
    suoni.acceso();
  }

  function rialzaBersagli() {
    for (const b of BERSAGLI) b.giu = false;
    stato.bersagliT = 0;
    suoni.rialza();
  }

  function attraversa(s, p, verso) {
    const t = tema();
    switch (s.id) {
      case 'corsia': {
        if (verso !== 'giu') return;
        const i = s.i;
        stato.contatori.corsie++;
        if (stato.skill.attivo) {
          stato.skill.attivo = false;
          if (stato.skill.corsia === i) {
            const v = aggiungiPunti(PUNTI.skill, CORSIE[i], 190, '#fffb8a');
            messaggio('Tiro da maestro!', '+' + numero(v), 2);
            suoni.skill();
            festa();
          }
        }
        if (stato.scenario && stato.scenario.id === 'lucciole' && stato.lucciola && stato.lucciola.tiro === 'corsie') tiro('corsie', CORSIE[i], 150);
        if (!stato.corsie[i]) {
          stato.corsie[i] = true;
          aggiungiPunti(PUNTI.corsia, CORSIE[i], 190, t.neon);
          suoni.corsia(i);
          if (stato.corsie.every(Boolean)) {
            stato.corsie = [false, false, false, false];
            stato.bonusMolt = Math.min(stato.bonusMolt + 1, 6);
            aggiungiPunti(PUNTI.corsieTutte, CX, 210, t.neon2);
            messaggio('T·I·N·O!', `Bonus ×${stato.bonusMolt}`, 1.8);
            suoni.tino();
            stato.lampoCorsie = 1;
          }
        } else {
          aggiungiPunti(500);
          suoni.clic();
        }
        break;
      }
      case 'spinner': {
        SPINNER.vel = Math.min(26, Math.abs(p.vy) / 90 + SPINNER.vel * 0.3);
        break;
      }
      case 'orbita':
        if (verso !== 'su' || p.vy > -700) return;
        stato.contatori.orbite++;
        if (stato.scenario && stato.scenario.id === 'tempesta') {
          const v = aggiungiPunti(stato.scenario.valore, 45, 360, t.neon2);
          messaggio('Fulmine!', '+' + numero(v), 1.2);
          stato.scenario.valore = Math.min(stato.scenario.valore * 2, 480000);
          stato.lampo = 0.35;
          suoni.tuono();
        } else {
          aggiungiPunti(PUNTI.orbita, 60, 360, t.neon);
        }
        suoni.orbita();
        tiro('orbita', 45, 380);
        break;
      case 'esterna':
        if (verso !== 'giu') return;
        if (s.lato === 'sx' && stato.kickback && !stato.tiltato) {
          p.vx = 0; p.vy = -2100;
          p.x = 42;
          stato.kickback = false;
          stato.spinGiri = 0;
          aggiungiPunti(PUNTI.kickback, 42, 820, t.neon);
          messaggio('Rimbalzo!', 'Si riaccende con lo spinner', 1.4);
          suoni.kickback();
          colpoGrosso(0.6);
        } else {
          aggiungiPunti(PUNTI.corsiaEsterna);
          faccia('ferito', 1.4);
          suoni.esterna();
        }
        break;
      case 'interna':
        if (verso !== 'giu') return;
        aggiungiPunti(PUNTI.corsiaInterna);
        suoni.clic();
        break;
      default: break;
    }
  }

  function entraRampa(p) {
    p.stato = 'rampa';
    p.rampa = 0;
    p.rampaV = clamp(Math.hypot(p.vx, p.vy), 900, 1500);
    suoni.rampa();
  }

  function esciRampa(p) {
    const fine = puntoPercorso(RAMPA, RAMPA.lung);
    p.stato = 'campo';
    p.x = fine.x; p.y = fine.y;
    p.vx = fine.dx * 360; p.vy = fine.dy * 360;
    p.px = p.x; p.py = p.y;
    const t = tema();
    stato.rampe++;
    stato.contatori.rampe++;
    const x = 460, y = 420;
    if (stato.scenario && stato.scenario.id === 'tempesta') {
      const v = aggiungiPunti(stato.scenario.valore, x, y, t.neon2);
      messaggio('Fulmine!', '+' + numero(v), 1.2);
      stato.scenario.valore = Math.min(stato.scenario.valore * 2, 480000);
      stato.lampo = 0.35;
      suoni.tuono();
    } else {
      aggiungiPunti(PUNTI.rampa + PUNTI.rampaInPiu * Math.min(stato.combo.t > 0 ? stato.combo.n : 0, 6), x, y, t.neon);
    }
    if (stato.multiball) {
      const j = stato.jackpot;
      const valore = j.valore * (j.doppio ? 2 : 1);
      const v = aggiungiPunti(valore, x, y - 40, '#fffb8a');
      j.doppio = false;
      j.valore += PUNTI.jackpotInPiu;
      j.fatti++;
      messaggio('JACKPOT!', '+' + numero(v), 2);
      suoni.jackpot();
      stato.flash = 0.7;
      colpoGrosso(1);
      festa();
      if (j.fatti >= 3 && !j.superAcceso) {
        j.superAcceso = true;
        messaggio('Super jackpot acceso!', 'Colpisci Gino!', 2.2);
      }
    }
    if (stato.rampe >= stato.prossimaExtra && !stato.tana.extraAccesa) {
      stato.tana.extraAccesa = true;
      stato.prossimaExtra += 12;
      messaggio('Palla extra accesa!', 'Prendila nella Tana', 2);
      suoni.acceso();
    }
    suoni.fineRampa();
    tiro('rampa', x, y);
  }

  function entraTana(p) {
    if (p.stato !== 'campo') return;
    p.stato = 'tana';
    p.x = TANA.x; p.y = TANA.y; p.vx = 0; p.vy = 0;
    const tana = stato.tana;
    suoni.tana();
    aggiungiPunti(PUNTI.tana, TANA.x + 30, TANA.y - 30, tema().neon);
    tiro('tana', TANA.x, TANA.y);
    let attesa = 0.7;
    // palla extra
    if (tana.extraAccesa) {
      tana.extraAccesa = false;
      stato.palleExtra++;
      messaggio('Palla extra!', 'Una ghianda in più', 2.2);
      suoni.extra();
      festa();
      attesa = 1.4;
    }
    // scenario
    if (tana.scenarioAcceso && !stato.scenario) {
      tana.scenarioAcceso = false;
      avviaScenario(prossimoScenario());
      attesa = 1.8;
    }
    // blocco e multiball
    if (tana.blocco > 0 && !stato.multiball) {
      tana.blocco = 0;
      tana.bloccate++;
      rialzaBersagli();
      if (tana.bloccate >= 3) {
        tana.bloccate = 0;
        avviaMultiball(3, p);
        return;
      }
      messaggio(`Ghianda ${tana.bloccate} nella Tana!`, tana.bloccate === 2 ? 'Ancora una per il multiball' : 'Abbatti i bersagli per la prossima', 2);
      suoni.blocco();
      // la ghianda resta nella tana: ne arriva una nuova nel corridoio
      stato.palle.splice(stato.palle.indexOf(p), 1);
      inCanna(false, 0.9);
      return;
    }
    tana.coda.push({ p, t: attesa });
  }

  function sputaTana(p) {
    p.stato = 'campo';
    const a = casuale(0.95, 1.15);
    const v = casuale(760, 880);
    p.x = TANA.x + Math.cos(a) * 18; p.y = TANA.y + Math.sin(a) * 18;
    p.px = p.x; p.py = p.y;
    p.fuoriTana = stato.tempo + 0.4;
    p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
    suoni.sputa();
    scintille(p.x, p.y, tema().neon2, 12, 250);
  }

  function avviaMultiball(n, palla) {
    stato.multiball = true;
    stato.jackpot.valore = PUNTI.jackpot + 50000 * stato.giro;
    stato.jackpot.fatti = 0;
    stato.jackpot.superAcceso = false;
    messaggio('MULTIBALL!', 'Jackpot sulla rampa', 2.4);
    suoni.multiball();
    stato.flash = 0.8;
    colpoGrosso(1.2);
    festa();
    stato.salva = Math.max(stato.salva, SALVA.multiball);
    // la ghianda che è entrata esce per prima, poi le altre
    stato.tana.coda.push({ p: palla, t: 0.9 });
    for (let i = 1; i < n; i++) {
      const q = nuovaPalla(TANA.x, TANA.y);
      q.stato = 'tana';
      stato.tana.coda.push({ p: q, t: 0.9 + i * 0.55 });
    }
  }

  function prossimoScenario() {
    const resto = SCENARI.filter((s) => !stato.scenariFatti.includes(s.id));
    return resto.length ? resto[0] : FESTA;
  }

  function avviaScenario(def) {
    const sc = { id: def.id, nome: def.nome, t: def.durata, durata: def.durata, conto: 0, valore: 30000 };
    stato.scenario = sc;
    stato.tema = def.id;
    aggiornaColori();
    messaggio(def.nome, def.testo, 3.2);
    suoni.scenario();
    stato.flash = 0.6;
    festa();
    stato.contatori.scenari++;
    if (def.id === 'pioggia') {
      stato.oggetti = [];
      for (let i = 0; i < 5; i++) nuovoOggetto();
    }
    if (def.id === 'lucciole') nuovaLucciola();
    if (def.id === 'festa') {
      // quattro ghiande in campo
      stato.multiball = true;
      stato.jackpot.fatti = 0;
      stato.salva = Math.max(stato.salva, 15);
      const quante = Math.max(0, 4 - stato.palle.length);
      for (let i = 0; i < quante; i++) {
        const q = nuovaPalla(TANA.x, TANA.y);
        q.stato = 'tana';
        stato.tana.coda.push({ p: q, t: 1.6 + i * 0.5 });
      }
    }
  }

  function fineScenario(completo) {
    const sc = stato.scenario;
    if (!sc) return;
    stato.scenario = null;
    stato.oggetti = [];
    stato.lucciola = null;
    stato.tema = 'notte';
    aggiornaColori();
    if (sc.id === 'festa') {
      stato.scenariFatti = [];
      stato.giro++;
      messaggio('Che festa!', 'Si ricomincia: il tavolo va più veloce', 2.6);
      suoni.vittoria();
      festa();
    } else {
      stato.scenariFatti.push(sc.id);
      messaggio(`${sc.nome}: finito`, completo ? '' : 'Colpisci Gino per il prossimo', 1.8);
      suoni.fineScenario();
      if (stato.scenariFatti.length === SCENARI.length) {
        messaggio('Tutti gli scenari!', 'Colpisci Gino per la gran festa', 2.4);
      }
    }
  }

  function obiettivoScenario(testo, valore) {
    const v = aggiungiPunti(valore, CX, 560, '#fffb8a');
    messaggio(testo, '+' + numero(v), 2.2);
    suoni.jackpot();
    stato.flash = 0.6;
    festa();
  }

  // Pioggia di ghiande: ghiande d'oro in punti raggiungibili
  const POSTI_OGGETTI = [
    [150, 250], [300, 180], [420, 300], [200, 400], [370, 420], [130, 560], [430, 580],
    [200, 700], [360, 700], [280, 790], [45, 470], [300, 410], [230, 540], [330, 540],
  ];
  function nuovoOggetto() {
    const liberi = POSTI_OGGETTI.filter(([x, y]) => !stato.oggetti.some((o) => !o.preso && o.x === x && o.y === y));
    const [x, y] = scegli(liberi);
    stato.oggetti.push({ x, y, preso: false, t: 0 });
  }
  function prendiOggetto(o) {
    o.preso = true;
    const sc = stato.scenario;
    if (!sc) return;
    sc.conto++;
    aggiungiPunti(25000, o.x, o.y - 20, '#fff27a');
    scintille(o.x, o.y, '#ffd23f', 18, 300);
    suoni.moneta(sc.conto);
    stato.oggetti = stato.oggetti.filter((x) => !x.preso);
    nuovoOggetto();
    if (sc.conto === 10) obiettivoScenario('Raccolto d\'oro!', 200000);
  }

  // Caccia alle lucciole
  const TIRI = {
    rampa: { x: 448, y: 500, nome: 'rampa' },
    orbita: { x: 60, y: 600, nome: 'orbita' },
    tana: { x: 150, y: 450, nome: 'Tana' },
    gino: { x: CX, y: 420, nome: 'Gino' },
    corsie: { x: 300, y: 190, nome: 'corsie' },
    bersagli: { x: CX, y: 650, nome: 'bersagli' },
  };
  function nuovaLucciola() {
    const prima = stato.lucciola && stato.lucciola.tiro;
    const tiri = Object.keys(TIRI).filter((k) => k !== prima);
    const k = scegli(tiri);
    stato.lucciola = { tiro: k, x: TIRI[k].x, y: TIRI[k].y, t: 0 };
  }

  // ---------------------------------------------------------------- palle
  // Mette una ghianda nel corridoio di lancio. auto = parte da sola (palla salvata).
  function inCanna(auto = false, ritardo = 0) {
    stato.lancio.attesa = true;
    stato.lancio.ritardo = ritardo;
    stato.lancio.auto = auto ? 0.7 + ritardo : 0;
    stato.lancio.carica = 0;
    stato.lancio.palla = null;
  }

  function mettiInCanna() {
    const p = nuovaPalla(560, 1000);
    p.stato = 'canna';
    stato.lancio.palla = p;
  }

  function lancia(forza) {
    const L = stato.lancio;
    const p = L.palla;
    if (!p) return;
    p.stato = 'campo';
    p.x = 560; p.y = 1000;
    p.vy = -(LANCIO.min + (LANCIO.max - LANCIO.min) * forza) * casuale(0.985, 1.015);
    p.vx = 0;
    L.palla = null;
    L.attesa = false;
    L.carica = 0;
    L.premuto = false;
    stato.salvaPronto = true;
    stato.skill.scade = 4;
    suoni.lancio(forza);
    suoni.fineCarica();
  }

  function pallaPersa(p) {
    stato.palle.splice(stato.palle.indexOf(p), 1);
    stato.statistiche.perse++;
    if (stato.modo === 'demo') {
      if (!stato.palle.length && !stato.lancio.attesa) inCanna(true, 0.4);
      return;
    }
    if (stato.tiltato) {
      if (!stato.palle.length) fineBiglia();
      return;
    }
    if (stato.salva > 0) {
      stato.statistiche.salvate++;
      messaggio('Salvata!', 'Ecco un\'altra ghianda', 1.4);
      suoni.salvata();
      if (stato.multiball) {
        const q = nuovaPalla(TANA.x, TANA.y);
        q.stato = 'tana';
        stato.tana.coda.push({ p: q, t: 0.5 });
      } else {
        inCanna(true, 0.3);
      }
      return;
    }
    const restano = stato.palle.length + (stato.lancio.attesa ? 1 : 0);
    if (stato.multiball && restano <= 1) {
      stato.multiball = false;
      stato.jackpot.superAcceso = false;
      if (stato.scenario && stato.scenario.id === 'festa') fineScenario(true);
      messaggio('Fine del multiball', '', 1.4);
    }
    if (restano === 0) {
      faccia('arrabbiato', 2.2);
      suoni.persa();
      fineBiglia();
    }
  }

  function fineBiglia() {
    if (stato.scenario) fineScenario(false);
    stato.multiball = false;
    stato.moltT = 0;
    stato.combo = { n: 0, t: 0 };
    const c = stato.contatori;
    const righe = [
      ['Bumper', c.bumper, 100], ['Corsie', c.corsie, 1000], ['Rampe', c.rampe, 4000],
      ['Orbite', c.orbite, 3000], ['Bersagli', c.bersagli, 1000], ['Gino', c.gino, 2500],
      ['Scenari', c.scenari, 25000],
    ].filter((r) => r[1] > 0);
    const somma = righe.reduce((s, r) => s + r[1] * r[2], 0);
    const totale = stato.tiltato ? 0 : somma * stato.bonusMolt;
    stato.bonus = { righe, molt: stato.bonusMolt, totale, contato: 0, t: 0, tilt: stato.tiltato };
    stato.fase = 'bonus';
    stato.statistiche.durata += stato.tempo - (stato.inizioPalla || 0);
  }

  function prossimaPalla() {
    stato.punti += stato.bonus.totale - stato.bonus.contato;
    stato.bonus = null;
    stato.tiltato = false;
    stato.tilt = 0;
    stato.bonusMolt = 1;
    if (stato.palleExtra > 0) {
      stato.palleExtra--;
      messaggio('Ancora la stessa palla!', 'Palla extra', 2);
    } else {
      stato.palla++;
    }
    if (stato.palla > stato.palleTotali) {
      fineGioco();
      return;
    }
    iniziaPalla();
  }

  function iniziaPalla() {
    stato.fase = 'gioco';
    stato.contatori = nuoviContatori();
    stato.salva = 0;
    stato.salvaPronto = false;
    stato.skill = { corsia: Math.floor(Math.random() * 4), attivo: true, t: 0 };
    stato.inizioPalla = stato.tempo;
    stato.statistiche.palle++;
    inCanna(stato.modo === 'demo' || stato.iaGioca);
    if (stato.modo === 'gioco') {
      messaggio(`Palla ${stato.palla}`, touch ? 'Tieni premuto e lascia per lanciare' : 'Tieni premuto ↓ o Spazio, poi lascia', 2.2);
      faccia(stato.palla === stato.palleTotali && !stato.palleExtra ? 'arrabbiato' : 'normale', 2);
    }
    aggiornaTabellone();
  }

  function iniziaPartita(modo = 'gioco') {
    stato.modo = modo;
    stato.punti = 0;
    stato.palla = 1;
    stato.palle = [];
    stato.corsie = [false, false, false, false];
    stato.bonusMolt = 1;
    stato.moltCampo = 1; stato.moltT = 0;
    stato.combo = { n: 0, t: 0 };
    stato.tana = { coda: [], blocco: 0, bloccate: 0, scenarioAcceso: false, extraAccesa: false };
    stato.ginoColpi = 0;
    stato.multiball = false;
    stato.jackpot = { valore: PUNTI.jackpot, fatti: 0, superAcceso: false, doppio: false };
    stato.scenario = null;
    stato.scenariFatti = [];
    stato.giro = 0;
    stato.tema = 'notte';
    stato.kickback = true; stato.spinGiri = 0;
    stato.rampe = 0; stato.prossimaExtra = 8; stato.palleExtra = 0;
    stato.tilt = 0; stato.tiltato = false;
    stato.messaggi = []; stato.scritte = []; stato.particelle = []; stato.oggetti = [];
    stato.lucciola = null;
    stato.bonus = null;
    stato.statistiche = { palle: 0, durata: 0, perse: 0, salvate: 0, fuori: 0, ferme: 0 };
    rialzaBersagli();
    aggiornaColori();
    flipper.sx.premuto = flipper.dx.premuto = false;
    ultimaPosizione = -1;
    iniziaPalla();
    if (modo === 'gioco') {
      nascondiPannello();
      suoni.via();
    }
  }

  function fineGioco() {
    stato.fase = 'finita';
    faccia('ko', 99);
    suoni.sconfitta();
    const voce = { punti: stato.punti, data: new Date().toLocaleDateString('it-IT') };
    const lista = classifica.concat([voce]).sort((a, b) => b.punti - a.punti).slice(0, 5);
    ultimaPosizione = lista.indexOf(voce);
    if (!stato.test) {
      classifica = lista;
      scrivi('classifica', classifica);
    }
    aggiornaTabellone();
    mostraPannello(pannelloFine());
  }

  function pausa() {
    if (stato.modo !== 'gioco' || stato.fase === 'pausa' || stato.fase === 'finita') return;
    stato.pausaDa = stato.fase;
    stato.fase = 'pausa';
    flipper.sx.premuto = flipper.dx.premuto = false;
    stato.lancio.premuto = false;
    suoni.fineCarica();
    mostraPannello(pannelloPausa());
  }
  function riprendi() {
    if (stato.fase !== 'pausa') return;
    stato.fase = stato.pausaDa || 'gioco';
    nascondiPannello();
  }
  function vaiAlMenu() {
    iniziaPartita('demo');
    mostraPannello(pannelloMenu());
  }

  // Scossone (tilt)
  function scossone() {
    if (stato.tiltato || stato.fase !== 'gioco') return;
    if (!stato.palle.some((p) => p.stato === 'campo')) return;
    for (const p of stato.palle) {
      if (p.stato !== 'campo') continue;
      p.vx += casuale(-160, 160);
      p.vy -= casuale(180, 300);
    }
    stato.scossa = Math.max(stato.scossa, 0.18);
    suoni.scossone();
    if (stato.modo !== 'gioco') return;
    stato.tilt += TILT.colpo;
    if (stato.tilt >= TILT.tilt) {
      stato.tiltato = true;
      flipper.sx.premuto = flipper.dx.premuto = false;
      messaggio('TILT!', 'Hai scosso troppo il tavolo', 3, '#ff4a5a');
      faccia('ferito', 3);
      suoni.tilt();
      stato.salva = 0;
      if (stato.scenario) fineScenario(false);
    } else if (stato.tilt >= TILT.avviso) {
      messaggio('Attento!', 'Ancora uno e va in tilt', 1.4, '#ffb627');
      faccia('arrabbiato', 1.5);
      suoni.avviso();
    }
  }

  // ---------------------------------------------------------------- aggiornamento
  let accumulo = 0;
  function aggiorna(dt) {
    stato.tempo += dt;
    aggiornaEffetti(dt);
    if (stato.fase === 'pausa' || stato.fase === 'finita') return;
    if (stato.fase === 'bonus') {
      aggiornaBonus(dt);
      // le ghiande continuano a muoversi (tilt) finché non escono
    }
    if (stato.modo === 'demo' || stato.iaGioca) pilotaIA(dt);

    // flipper e lancio
    const L = stato.lancio;
    if (L.attesa) {
      if (L.ritardo > 0) {
        L.ritardo -= dt;
        if (L.ritardo <= 0 && !L.palla) mettiInCanna();
      } else if (!L.palla) {
        mettiInCanna();
      }
      if (L.palla) {
        if (stato.skill.attivo && !stato.skill.fermo) {
          stato.skill.t += dt;
          if (stato.skill.t > 0.55) { stato.skill.t = 0; stato.skill.corsia = (stato.skill.corsia + 1) % 4; }
        }
        if ((stato.modo === 'demo' || stato.iaGioca) && L.auto <= 0 && !L.premuto) L.auto = 0.5;
        if (L.auto > 0) {
          L.auto -= dt;
          if (L.auto <= 0) lancia(stato.modo === 'demo' || stato.iaGioca ? casuale(0.6, 0.95) : LANCIO.auto);
        } else if (L.premuto) {
          L.carica = Math.min(1, L.carica + dt / LANCIO.pieno);
          suoni.carica(L.carica);
        }
      }
    }

    if (!L.palla && stato.skill.attivo && stato.skill.scade !== undefined) {
      stato.skill.scade -= dt;
      if (stato.skill.scade <= 0) stato.skill.attivo = false;
    }

    accumulo = Math.min(accumulo + dt, 0.06);
    while (accumulo >= FISICA.passo) {
      passoFisica(FISICA.passo);
      accumulo -= FISICA.passo;
    }

    for (const p of [...stato.palle]) {
      if (p.stato === 'rampa') {
        p.rampa += p.rampaV * dt;
        const q = puntoPercorso(RAMPA, p.rampa);
        p.x = q.x; p.y = q.y;
        // sale piano, scende veloce
        p.rampaV = clamp(p.rampaV + (q.dy < 0 ? -500 : 900) * dt, 650, 1500);
        if (p.rampa >= RAMPA.lung) esciRampa(p);
      }
      if (p.stato === 'campo') {
        p.rot += (p.vx * 0.9 + p.vy * 0.3) * dt / R;
        if (p.y > H + 30 || p.x < -40 || p.x > W + 40 || p.y < -40) {
          if (p.y < H) stato.statistiche.fuori++;
          pallaPersa(p);
          continue;
        }
        // la ghianda è tornata giù nel corridoio: di nuovo in canna
        if (p.x > 542 && p.y > 960 && Math.abs(p.vy) < 200) {
          p.stato = 'canna';
          p.x = 560; p.y = 1000; p.vx = p.vy = 0;
          stato.lancio.attesa = true;
          stato.lancio.palla = p;
          stato.lancio.ritardo = 0;
          stato.lancio.auto = stato.modo === 'demo' || stato.iaGioca ? 0.5 : stato.lancio.auto;
        }
        // il conto di "salvata" parte quando la ghianda entra in campo
        if (stato.salvaPronto && p.x < 538 && p.y > 300) {
          stato.salvaPronto = false;
          if (stato.salva <= 0) stato.salva = Math.max(SALVA.minimo, SALVA.inizio - stato.giro);
        }
        // ghianda ferma (incastrata)
        if (p.vx * p.vx + p.vy * p.vy < 40 * 40) p.ferma += dt;
        else p.ferma = 0;
        if (p.ferma > 3) {
          p.ferma = 0;
          p.vx += casuale(-200, 200); p.vy -= 400;
          stato.statistiche.ferme++;
          if (stato.test) (stato.statistiche.dove = stato.statistiche.dove || []).push([Math.round(p.x), Math.round(p.y)]);
          if (stato.modo === 'gioco') messaggio('Ghianda incastrata', 'Uno scossone gratis', 1.2);
        }
        p.scia.push(p.x, p.y);
        if (p.scia.length > 16) p.scia.splice(0, 2);
      } else {
        p.scia.length = 0;
      }
    }

    // la Tana sputa le ghiande una alla volta
    const coda = stato.tana.coda;
    if (coda.length) {
      coda[0].t -= dt;
      if (coda[0].t <= 0) {
        const { p } = coda.shift();
        if (stato.palle.includes(p)) sputaTana(p);
        if (coda.length) coda[0].t = Math.max(coda[0].t, 0.5);
      }
    }

    // tempi
    if (stato.salva > 0 && !stato.salvaPronto) stato.salva = Math.max(0, stato.salva - dt);
    if (stato.moltT > 0) stato.moltT -= dt;
    if (stato.combo.t > 0) stato.combo.t -= dt;
    stato.tilt = Math.max(0, stato.tilt - TILT.cala * dt);
    if (stato.bersagliT > 0) {
      stato.bersagliT -= dt;
      if (stato.bersagliT <= 0 && (stato.tana.blocco === 0 || stato.multiball)) rialzaBersagli();
      else if (stato.bersagliT <= 0) stato.bersagliT = 0.0001;   // restano giù finché la tana è aperta
    }
    // spinner
    if (SPINNER.vel > 0) {
      const prima = Math.floor(SPINNER.ang / Math.PI);
      SPINNER.ang += SPINNER.vel * Math.PI * 2 * dt;
      SPINNER.vel = Math.max(0, SPINNER.vel - 7 * dt);
      const dopo = Math.floor(SPINNER.ang / Math.PI);
      for (let i = prima; i < dopo; i++) {
        const luna = stato.scenario && stato.scenario.id === 'luna';
        aggiungiPunti(luna ? 1000 : PUNTI.spinner);
        if (stato.contatori) stato.contatori.spinner++;
        suoni.spinner();
        stato.spinGiri++;
        if (!stato.kickback && stato.spinGiri >= 30 + 10 * stato.giro) {
          stato.kickback = true;
          messaggio('Rimbalzo acceso!', '', 1.2);
          suoni.acceso();
        }
      }
    }
    // scenario
    const sc = stato.scenario;
    if (sc) {
      sc.t -= dt;
      if (sc.id === 'lucciole' && stato.lucciola) stato.lucciola.t += dt;
      if (sc.t <= 0 && sc.id !== 'festa') fineScenario(true);
      if (sc.id === 'festa' && sc.t <= 0 && !stato.multiball) fineScenario(true);
    }
    // flipper e palla di riserva nel demo
    aggiornaTabellone();
  }

  function aggiornaBonus(dt) {
    const b = stato.bonus;
    if (!b) return;
    b.t += dt;
    if (stato.palle.length) return;    // aspetta che la ghianda tiltata esca
    if (b.t > 1 && b.contato < b.totale) {
      const passo = Math.max(1000, Math.round(b.totale / 1.6 * dt));
      const prima = b.contato;
      b.contato = Math.min(b.totale, b.contato + passo);
      stato.punti += b.contato - prima;
      if (Math.floor(b.t * 14) !== Math.floor((b.t - dt) * 14)) suoni.tic();
    }
    if (b.t > 1 && b.contato >= b.totale) {
      b.fine = (b.fine || 0) + dt;
      if (b.fine > 1.4) prossimaPalla();
    }
  }

  function aggiornaEffetti(dt) {
    for (const b of BUMPERS) b.lampo = Math.max(0, b.lampo - dt * 4);
    for (const b of BERSAGLI) b.lampo = Math.max(0, b.lampo - dt * 3);
    if (stato.lampoFionda) for (const k in stato.lampoFionda) stato.lampoFionda[k] = Math.max(0, stato.lampoFionda[k] - dt * 5);
    stato.lampoCorsie = Math.max(0, (stato.lampoCorsie || 0) - dt);
    GINO.trema = Math.max(0, GINO.trema - dt);
    GINO.salto = Math.max(0, GINO.salto - dt);
    stato.scossa = Math.max(0, stato.scossa - dt);
    stato.flash = Math.max(0, stato.flash - dt * 1.6);
    stato.lampo = Math.max(0, (stato.lampo || 0) - dt);
    for (const s of stato.scritte) { s.t += dt; s.y -= 40 * dt; }
    stato.scritte = stato.scritte.filter((s) => s.t < s.durata);
    if (stato.messaggi.length) {
      const m = stato.messaggi[0];
      m.t += dt;
      if (m.t > m.durata) stato.messaggi.shift();
    }
    for (const q of stato.particelle) {
      q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt;
      q.vx *= 1 - 2.5 * dt; q.vy *= 1 - 2.5 * dt;
    }
    stato.particelle = stato.particelle.filter((q) => q.t < q.durata);
    const t = stato.tino;
    if (t.t > 0) { t.t -= dt; if (t.t <= 0) t.faccia = 'normale'; }
    t.salto = Math.max(0, t.salto - dt);
  }

  // Giocatore simulato: partita dimostrativa (e prove). Quando la ghianda
  // arriva sui flipper prova diversi istanti per battere con la stessa fisica
  // del gioco (provaColpo) e sceglie quello che la manda dove vuole.
  // errore: secondi di imprecisione; bravura: probabilità di mirare davvero.
  const IA = { errore: 0.004, bravura: 0.9, tiene: 0.2, passi: 14, passoRitardo: 0.02 };
  // sul telefono meno prove per decisione (la partita dimostrativa non deve scattare)
  const IA_LEGGERA = { passi: 8, passoRitardo: 0.035 };
  const ia = { sx: { pausa: 0, pensa: 0 }, dx: { pausa: 0, pensa: 0 }, mira: null };

  function provaColpo(p, lato, ritardo, durata = 1) {
    const q = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, px: p.x, py: p.y };
    const fl = { sx: { ...flipper.sx }, dx: { ...flipper.dx } };
    for (const l of ['sx', 'dx']) if (fl[l].prog) fl[l].prog = { da: fl[l].prog.da - orologio, a: fl[l].prog.a - orologio };
    fl[lato].prog = { da: ritardo, a: ritardo + IA.tiene };
    const h = FISICA.passo;
    const g = gravita();
    const k = 1 - FISICA.attrito * h;
    let t = 0, esito = null, minY = q.y;
    simulando = true;
    try {
      while (t < durata && !esito) {
        t += h;
        muoviFlipper(fl.sx, h, t);
        muoviFlipper(fl.dx, h, t);
        q.px = q.x; q.py = q.y;
        q.vy += g * h;
        q.vx *= k; q.vy *= k;
        q.x += q.vx * h; q.y += q.vy * h;
        for (const s of segmenti) urtaSegmento(q, s);
        for (const c of cerchi) urtaCerchio(q, c);
        urtaFlipper(q, fl.sx);
        urtaFlipper(q, fl.dx);
        minY = Math.min(minY, q.y);
        if (q.y < 410 && q.y > 362 && q.vy < -260 && q.x > xBocca(BOCCA[0], BOCCA[1], q.y) && q.x < xBocca(BOCCA[3], BOCCA[2], q.y)) esito = 'rampa';
        else if (Math.hypot(q.x - TANA.x, q.y - TANA.y) < TANA.presa) esito = 'tana';
        else if (q.x < 70 && q.py >= 400 && q.y < 400 && q.vy < -700) esito = 'orbita';
        else if (Math.hypot(q.x - GINO.x, q.y - GINO.y) < GINO.r + R + 2) esito = 'gino';
        else if (q.y < 172 && q.x > 180 && q.x < 420) esito = 'corsie';
        else if (q.y > 600 && q.y < 626 && q.x > 226 && q.x < 334 && BERSAGLI.some((b) => !b.giu && Math.abs(b.x - q.x) < 22)) esito = 'bersagli';
        else if (q.y > 985 || (q.y > 880 && (q.x < 64 || q.x > 496))) esito = 'persa';
      }
    } finally {
      simulando = false;
    }
    if (!esito) esito = minY < p.y - 250 ? 'su' : 'niente';
    return esito;
  }

  function desiderati() {
    const lista = [];
    const sc = stato.scenario;
    if (sc && sc.id === 'lucciole' && stato.lucciola) lista.push(stato.lucciola.tiro);
    if (stato.multiball) lista.push(stato.jackpot.superAcceso ? 'gino' : 'rampa');
    if (!stato.multiball && (stato.tana.blocco > 0 || stato.tana.scenarioAcceso || stato.tana.extraAccesa)) lista.push('tana');
    if (sc && sc.id === 'tempesta') lista.push('rampa', 'orbita');
    if (!stato.tana.scenarioAcceso && !sc) lista.push(BERSAGLI.every((b) => b.giu) ? 'gino' : 'bersagli');
    if (stato.combo.t > 0) lista.push('rampa', 'orbita', 'tana', 'gino');
    lista.push(ia.mira || 'rampa');
    return lista;
  }
  const VALORE = { rampa: 5, tana: 5, orbita: 4, gino: 4, corsie: 3, bersagli: 3, su: 2, niente: 1, persa: 0 };

  function pilotaIA(dt) {
    for (const lato of ['sx', 'dx']) {
      const f = flipper[lato];
      const s = ia[lato];
      if (f.prog) continue;                        // colpo in corso
      if (s.pausa > 0) { s.pausa -= dt; continue; }
      // c'è una ghianda che sta arrivando su questo flipper?
      const p = stato.palle.find((q) => q.stato === 'campo' && q.y > 740 && q.y < 960 && q.vy > -150
        && (lato === 'sx' ? q.x < CX + 4 : q.x > CX - 4) && q.x > 60 && q.x < 500);
      if (!p) continue;
      if (s.pensa > 0) { s.pensa -= dt; continue; }
      s.pensa = 0.03;
      const voglio = Math.random() < IA.bravura ? desiderati() : [];
      let meglio = null;
      const prove = touch && !stato.test ? IA_LEGGERA : IA;
      for (let i = 0; i < prove.passi; i++) {
        const r = i * prove.passoRitardo;
        const esito = provaColpo(p, lato, r);
        const pos = voglio.indexOf(esito);
        const punteggio = pos >= 0 ? 100 - pos * 10 : VALORE[esito];
        if (!meglio || punteggio > meglio.punteggio) meglio = { r, esito, punteggio };
      }
      // se non c'è niente di meglio che lasciarla rotolare, aspetta e riprova
      if (meglio.punteggio <= VALORE.niente && provaColpo(p, lato, 9, 0.35) !== 'persa') continue;
      if (meglio.r > 0.08 && meglio.punteggio < 50) continue;   // decide più avanti
      const da = orologio + Math.max(0, meglio.r + casuale(-IA.errore, IA.errore));
      f.prog = { da, a: da + IA.tiene };
      s.pausa = meglio.r + IA.tiene + 0.08;
      s.esito = meglio.esito;
      if (Math.random() < 0.15) ia.mira = scegli(['rampa', 'orbita', 'tana', 'gino']);
    }
  }

  // ================================================================ input
  const tasti = new Set();
  const SINISTRA = ['ArrowLeft', 'KeyZ', 'KeyA', 'ShiftLeft'];
  const DESTRA = ['ArrowRight', 'Slash', 'KeyD', 'ShiftRight', 'KeyL'];
  const LANCIA = ['ArrowDown', 'Space', 'KeyS', 'Enter'];
  const SCUOTI = ['ArrowUp', 'KeyW', 'KeyT'];

  function premiFlipper(lato, giu) {
    if (stato.modo !== 'gioco' || stato.fase === 'pausa' || stato.fase === 'finita') return;
    const f = flipper[lato];
    if (giu && !f.premuto) {
      if (!stato.tiltato) suoni.flipper();
      // le corsie accese girano
      if (stato.lancio.palla && stato.skill.attivo) {
        stato.skill.corsia = (stato.skill.corsia + (lato === 'sx' ? 3 : 1)) % 4;
        stato.skill.t = 0;
      } else if (!stato.tiltato) {
        const c = stato.corsie;
        stato.corsie = lato === 'sx' ? [c[1], c[2], c[3], c[0]] : [c[3], c[0], c[1], c[2]];
      }
    }
    f.premuto = giu;
    f.prog = null;
  }
  function premiLancio(giu) {
    if (stato.modo !== 'gioco' || stato.fase !== 'gioco') return;
    const L = stato.lancio;
    if (giu) {
      if (L.palla && L.auto <= 0) L.premuto = true;
    } else if (L.premuto) {
      L.premuto = false;
      if (L.palla && L.auto <= 0) lancia(L.carica);
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const gioco = !pannelloAperto();
    if (gioco && [...SINISTRA, ...DESTRA, ...LANCIA, ...SCUOTI].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (stato.fase === 'pausa') riprendi();
      else pausa();
      return;
    }
    if (e.code === 'KeyM') { cambiaAudio(); return; }
    if (e.code === 'KeyN') { cambiaMusica(); return; }
    if (!gioco) return;
    if (SINISTRA.includes(e.code)) premiFlipper('sx', true);
    if (DESTRA.includes(e.code)) premiFlipper('dx', true);
    if (LANCIA.includes(e.code)) premiLancio(true);
    if (SCUOTI.includes(e.code)) scossone();
  });
  window.addEventListener('keyup', (e) => {
    if (SINISTRA.includes(e.code) && !SINISTRA.some((k) => k !== e.code && tasti.has(k))) premiFlipper('sx', false);
    if (DESTRA.includes(e.code) && !DESTRA.some((k) => k !== e.code && tasti.has(k))) premiFlipper('dx', false);
    if (LANCIA.includes(e.code)) premiLancio(false);
    tasti.delete(e.code);
  });
  window.addEventListener('keydown', (e) => tasti.add(e.code), true);
  window.addEventListener('blur', () => { tasti.clear(); pausa(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pausa(); });

  // Mouse e dita: metà sinistra = flipper sinistro, metà destra = destro. Con la
  // ghianda nel corridoio (e nessuna in campo) si tiene premuto per caricare.
  // Una strisciata veloce verso l'alto è lo scossone.
  const dita = new Map();
  function latoDi(e) {
    const r = canvas.getBoundingClientRect();
    return e.clientX - r.left < r.width / 2 ? 'sx' : 'dx';
  }
  function soloInCanna() {
    return stato.lancio.palla && stato.lancio.auto <= 0 && !stato.palle.some((p) => p.stato === 'campo' || p.stato === 'rampa');
  }
  function aggiornaDita() {
    let sx = false, dx = false;
    for (const d of dita.values()) {
      if (d.ruolo === 'sx') sx = true;
      if (d.ruolo === 'dx') dx = true;
    }
    if (flipper.sx.premuto !== sx) premiFlipper('sx', sx);
    if (flipper.dx.premuto !== dx) premiFlipper('dx', dx);
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (stato.modo !== 'gioco' || stato.fase !== 'gioco') return;
    e.preventDefault();
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    let ruolo;
    if (soloInCanna()) ruolo = 'lancio';
    else if (e.pointerType === 'mouse') ruolo = e.button === 0 ? 'sx' : e.button === 2 ? 'dx' : 'lancio';
    else ruolo = latoDi(e);
    dita.set(e.pointerId, { ruolo, y: e.clientY, t: performance.now() });
    if (ruolo === 'lancio') premiLancio(true);
    aggiornaDita();
  });
  canvas.addEventListener('pointermove', (e) => {
    const d = dita.get(e.pointerId);
    if (!d || e.pointerType === 'mouse') return;
    if (d.y - e.clientY > 70 && performance.now() - d.t < 260 && !d.scosso) {
      d.scosso = true;
      scossone();
    }
  });
  function fineDito(e) {
    const d = dita.get(e.pointerId);
    if (!d) return;
    dita.delete(e.pointerId);
    if (d.ruolo === 'lancio') premiLancio(false);
    aggiornaDita();
  }
  canvas.addEventListener('pointerup', fineDito);
  canvas.addEventListener('pointercancel', fineDito);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // tasto destro sul mouse: il pointerdown arriva con button 2
  canvas.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });

  // ================================================================ AUDIO
  let audio = null, uscita = null, bufferRumore = null;
  function contesto() {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      const comp = audio.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 5;
      comp.attack.value = 0.003; comp.release.value = 0.25;
      comp.connect(audio.destination);
      uscita = audio.createGain();
      uscita.gain.value = 0.9;
      uscita.connect(comp);
      bufferRumore = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
      const d = bufferRumore.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  const puoSuonare = () => !muto && !stato.test && stato.modo !== 'demo' && audio && audio.state === 'running';

  function tono(f, d, o = {}) {
    const c = audio;
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
    nodo.connect(uscita);
    osc.start(t);
    osc.stop(t + d + 0.05);
  }
  function rumore(d, o = {}) {
    const c = audio;
    const t = c.currentTime + (o.rit || 0);
    const s = c.createBufferSource();
    s.buffer = bufferRumore;
    const fl = c.createBiquadFilter();
    fl.type = o.tipo || 'lowpass';
    fl.Q.value = o.q || 0.8;
    fl.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + d);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.08, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl).connect(g).connect(uscita);
    s.start(t, Math.random() * 1.5);
    s.stop(t + d + 0.05);
  }
  const note = (lista, passo, o) => lista.forEach((f, i) => tono(f, o.d || passo * 1.6, { ...o, rit: i * passo }));

  // Suono continuo della carica del lancio
  let caricaOsc = null;
  const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];
  let ultimoClic = 0;
  const EFFETTI = {
    flipper() {
      rumore(0.05, { tipo: 'bandpass', f: 1400, q: 1.5, vol: 0.12 });
      tono(95, 0.07, { tipo: 'square', f2: 60, vol: 0.06, filtro: 600 });
    },
    colpo: (k) => tono(150, 0.06, { tipo: 'triangle', f2: 80, vol: 0.05 + 0.08 * k }),
    parete: (k) => tono(220, 0.04, { tipo: 'triangle', f2: 160, vol: 0.02 + 0.05 * k }),
    clic() {
      const ora = audio.currentTime;
      if (ora - ultimoClic < 0.03) return;
      ultimoClic = ora;
      tono(1800, 0.03, { tipo: 'square', vol: 0.015, filtro: 4000 });
    },
    bumper(i) {
      const f = [392, 494, 587][i % 3];
      tono(f, 0.14, { tipo: 'square', f2: f * 1.6, scivola: 0.05, vol: 0.05, filtro: 3000 });
      tono(f * 0.5, 0.12, { tipo: 'sine', vol: 0.12 });
      rumore(0.05, { tipo: 'highpass', f: 3500, vol: 0.06 });
    },
    fionda() {
      rumore(0.06, { tipo: 'bandpass', f: 900, q: 1, vol: 0.12 });
      tono(260, 0.08, { tipo: 'square', f2: 520, vol: 0.04, filtro: 2000 });
    },
    gino() {
      tono(660, 0.12, { tipo: 'triangle', f2: 990, vol: 0.08 });
      tono(990, 0.1, { tipo: 'sine', f2: 1480, vol: 0.05, rit: 0.06 });
    },
    bersaglio() {
      tono(180, 0.12, { tipo: 'square', f2: 90, vol: 0.06, filtro: 1200 });
      rumore(0.08, { f: 1500, vol: 0.08 });
    },
    rialza: () => note([330, 440], 0.05, { tipo: 'square', vol: 0.025, filtro: 2000, d: 0.08 }),
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
    fineRampa: () => note([523, 659, 784, 1047], 0.05, { tipo: 'triangle', vol: 0.06, d: 0.12 }),
    tana() {
      tono(300, 0.25, { tipo: 'sine', f2: 90, vol: 0.18 });
      rumore(0.15, { f: 600, vol: 0.08 });
    },
    sputa() {
      tono(80, 0.15, { tipo: 'sine', f2: 200, vol: 0.2 });
      rumore(0.12, { tipo: 'bandpass', f: 1200, vol: 0.1 });
    },
    blocco: () => note([392, 523, 659, 784], 0.09, { tipo: 'square', vol: 0.04, filtro: 2400, d: 0.14 }),
    kickback() {
      tono(70, 0.25, { tipo: 'sine', f2: 220, vol: 0.25 });
      rumore(0.2, { f: 2000, f2: 400, vol: 0.12 });
    },
    esterna: () => tono(330, 0.35, { tipo: 'sawtooth', f2: 160, vol: 0.04, filtro: 1500 }),
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
      note([1047, 1319, 1568, 2093, 1568, 2093, 2637], 0.08, { tipo: 'triangle', vol: 0.06, d: 0.2, rit: 0 });
    },
    multiball() {
      for (let i = 0; i < 4; i++) {
        tono(440, 0.18, { tipo: 'sawtooth', f2: 880, vol: 0.04, filtro: 3000, rit: i * 0.22 });
      }
      note([523, 659, 784, 1047], 0.08, { tipo: 'square', vol: 0.04, filtro: 3500, d: 0.2 });
    },
    scenario() {
      note([392, 494, 587, 784, 988], 0.08, { tipo: 'triangle', vol: 0.07, d: 0.2 });
      rumore(0.8, { tipo: 'bandpass', f: 300, f2: 4000, q: 1, vol: 0.05 });
    },
    fineScenario: () => note([784, 659, 523], 0.1, { tipo: 'triangle', vol: 0.06, d: 0.18 }),
    lucciola: () => note([1568, 2093, 2637], 0.05, { tipo: 'sine', vol: 0.06, d: 0.15 }),
    moneta: (n) => { tono(PENTA[n % 8 + 2], 0.08, { tipo: 'square', vol: 0.035, filtro: 4000 }); tono(PENTA[n % 8 + 4], 0.18, { tipo: 'square', vol: 0.035, filtro: 4000, rit: 0.07 }); },
    tuono() {
      rumore(0.9, { f: 900, f2: 80, vol: 0.25 });
      tono(60, 0.6, { tipo: 'sine', f2: 35, vol: 0.2 });
    },
    extra: () => note([523, 659, 784, 1047, 1319], 0.1, { tipo: 'triangle', vol: 0.08, d: 0.22 }),
    salvata: () => note([659, 880, 1319], 0.07, { tipo: 'triangle', vol: 0.06, d: 0.14 }),
    persa() {
      tono(440, 0.9, { tipo: 'sawtooth', f2: 70, vol: 0.06, filtro: 1500 });
      rumore(0.4, { f: 800, f2: 150, vol: 0.06, rit: 0.2 });
    },
    scossone: () => { tono(55, 0.15, { tipo: 'sine', vol: 0.25 }); rumore(0.12, { f: 400, vol: 0.12 }); },
    avviso: () => note([880, 660], 0.12, { tipo: 'square', vol: 0.04, filtro: 2500, d: 0.12 }),
    tilt() {
      tono(110, 1.2, { tipo: 'sawtooth', vol: 0.07, filtro: 900 });
      tono(116, 1.2, { tipo: 'sawtooth', vol: 0.07, filtro: 900 });
    },
    tic: () => tono(1320, 0.03, { tipo: 'square', vol: 0.02, filtro: 4000 }),
    lancio(k) {
      rumore(0.2 + 0.2 * k, { tipo: 'bandpass', f: 500, f2: 3000, q: 1, vol: 0.06 + 0.06 * k });
      tono(90, 0.12, { tipo: 'sine', f2: 50, vol: 0.2 });
    },
    carica(k) {
      if (!caricaOsc) {
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.type = 'triangle';
        g.gain.value = 0.035;
        o.connect(g).connect(uscita);
        o.start();
        caricaOsc = { o, g };
      }
      caricaOsc.o.frequency.setTargetAtTime(160 + 500 * k, audio.currentTime, 0.03);
    },
    fineCarica() {
      if (!caricaOsc) return;
      const { o, g } = caricaOsc;
      caricaOsc = null;
      g.gain.setTargetAtTime(0.0001, audio.currentTime, 0.02);
      o.stop(audio.currentTime + 0.1);
    },
    via: () => note([523, 659, 784], 0.08, { tipo: 'triangle', vol: 0.06, d: 0.14 }),
    vittoria: () => note([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.09, { tipo: 'triangle', vol: 0.07, d: 0.18 }),
    sconfitta: () => note([392, 330, 262, 196], 0.17, { tipo: 'sawtooth', vol: 0.04, filtro: 1500, d: 0.24 }),
  };
  const suoni = new Proxy(EFFETTI, {
    get: (o, k) => (...a) => {
      if (k === 'fineCarica') { if (audio) { try { o[k](...a); } catch (e) { /* niente */ } } return; }
      if (puoSuonare()) { try { o[k](...a); } catch (e) { /* niente */ } }
    },
  });

  // ---------------------------------------------------------------- musica
  // Synthwave in La minore, tutta Web Audio: basso a ottavi, cassa dritta,
  // arpeggi e melodia a onda quadra dietro un filtro. Il ritmo e il colore
  // cambiano con lo scenario e col multiball.
  const MUSICA = { volume: 0.26, anticipo: 0.2 };
  const NOTA = (n) => {
    const m = /^([A-G])(#?)(\d)$/.exec(n);
    return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  };
  const BRANO = [
    ['A2', 'm', 'E5 - - A5 - - C6 - B5 - A5 - E5 - - -'],
    ['F2', 'M', 'F5 - - A5 - - C6 - D6 - C6 - A5 - - -'],
    ['C3', 'M', 'G5 - - C6 - - E6 - D6 - C6 - G5 - - -'],
    ['G2', 'M', 'B5 - - D6 - - G6 - F#6 - D6 - B5 - - -'],
    ['A2', 'm', 'E6 - D6 - C6 - B5 - A5 - - - C6 - B5 -'],
    ['F2', 'M', 'A5 - C6 - F6 - E6 - C6 - - - A5 - - -'],
    ['D3', 'm', 'F5 - A5 - D6 - F6 - E6 - D6 - A5 - - -'],
    ['E3', '7', 'G#5 - B5 - E6 - - - D6 - B5 - G#5 - - -'],
  ].map(([radice, tipo, mel]) => ({
    radice: NOTA(radice),
    accordo: { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 10] }[tipo],
    melodia: mel.split(' ').map((n) => (n === '-' ? null : NOTA(n))),
  }));
  const STILI = {
    menu: { bpm: 100, cassa: 'mezza', arpeggio: false, onda: 'square', filtro: 1400 },
    notte: { bpm: 120, cassa: 'dritta', arpeggio: true, onda: 'square', filtro: 2200 },
    disco: { bpm: 126, cassa: 'dritta', arpeggio: true, onda: 'sawtooth', filtro: 3200, aperto: true },
    pioggia: { bpm: 118, cassa: 'dritta', arpeggio: true, onda: 'triangle', filtro: 3000 },
    lucciole: { bpm: 112, cassa: 'mezza', arpeggio: true, onda: 'sine', filtro: 2600 },
    tempesta: { bpm: 132, cassa: 'dritta', arpeggio: true, onda: 'sawtooth', filtro: 1800 },
    luna: { bpm: 128, cassa: 'dritta', arpeggio: true, onda: 'square', filtro: 3400, aperto: true },
    festa: { bpm: 138, cassa: 'dritta', arpeggio: true, onda: 'sawtooth', filtro: 4200, aperto: true },
  };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const musica = { passo: 0, prossimo: 0, suona: false, uscita: null, filtro: null };

  function inPartita() {
    return stato.modo === 'gioco' && ['gioco', 'bonus', 'pausa'].includes(stato.fase);
  }
  function suonaMusica() {
    return !!audio && audio.state === 'running' && !muto && !musicaSpenta && !stato.test
      && stato.fase !== 'pausa' && !document.hidden;
  }
  function preparaMusica() {
    if (musica.uscita) return;
    musica.uscita = audio.createGain();
    musica.uscita.gain.value = 0;
    musica.uscita.connect(uscita);
    musica.filtro = audio.createBiquadFilter();
    musica.filtro.type = 'lowpass';
    musica.filtro.frequency.value = 1600;
    musica.filtro.Q.value = 3;
    musica.filtro.connect(musica.uscita);
  }
  function notaMusica(t, tipo, f, vol, dur, verso = musica.uscita, fFine = null, tFine = 0.03) {
    const o = audio.createOscillator();
    const g = audio.createGain();
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
    const s = audio.createBufferSource();
    s.buffer = bufferRumore;
    const f = audio.createBiquadFilter();
    f.type = tipoFiltro; f.frequency.value = freq;
    const g = audio.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(musica.uscita);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.02);
  }
  function stileMusica() {
    if (!inPartita()) return STILI.menu;
    if (stato.scenario) return STILI[stato.scenario.id];
    if (stato.multiball) return STILI.festa;
    return STILI.notte;
  }
  function passoMusica(n, t, st, durata) {
    const battuta = BRANO[Math.floor(n / 16) % BRANO.length];
    const i = n % 16;
    const acc = battuta.accordo.map((x) => battuta.radice + 24 + x);
    // basso a ottavi che salta d'ottava
    if (i % 2 === 0) {
      const m = battuta.radice + (i % 4 === 2 ? 12 : 0);
      notaMusica(t, 'sawtooth', hz(m), 0.09, durata * 1.6, musica.filtro);
      notaMusica(t, 'sine', hz(m), 0.22, durata * 1.6);
    }
    if (st.arpeggio) notaMusica(t, 'square', hz(acc[i % 3] + 12 + (i % 6 === 5 ? 12 : 0)), 0.025, durata * 0.9, musica.filtro);
    const mel = battuta.melodia[i];
    if (mel !== null) {
      const lunga = battuta.melodia.slice(i + 1).findIndex((x) => x !== null);
      const dur = durata * Math.min(4, lunga < 0 ? 4 : lunga + 1) * 0.9;
      notaMusica(t, st.onda, hz(mel), 0.05, dur, musica.filtro);
      notaMusica(t, 'triangle', hz(mel - 12), 0.04, dur * 0.8, musica.filtro);
    }
    const cassa = st.cassa === 'dritta' ? i % 4 === 0 : i === 0 || i === 8;
    if (cassa) notaMusica(t, 'sine', 150, 0.5, 0.18, musica.uscita, 42, 0.12);
    if (st !== STILI.menu && (i === 4 || i === 12)) rumoreMusica(t, 0.16, 0.14, 'bandpass', 1900);
    if (st !== STILI.menu && i % 2 === (st.aperto ? 0 : 1)) rumoreMusica(t, st.aperto && i % 4 === 2 ? 0.08 : 0.04, st.aperto && i % 4 === 2 ? 0.12 : 0.03, 'highpass', 7500);
  }
  function aggiornaMusica() {
    if (!audio) return;
    const on = suonaMusica();
    const t = audio.currentTime;
    if (on !== musica.suona) {
      musica.suona = on;
      if (on) { preparaMusica(); musica.prossimo = t + 0.08; }
      if (musica.uscita) {
        musica.uscita.gain.cancelScheduledValues(t);
        musica.uscita.gain.setTargetAtTime(on ? MUSICA.volume : 0, t, on ? 0.15 : 0.04);
      }
    }
    if (!on) return;
    const st = stileMusica();
    musica.filtro.frequency.setTargetAtTime(st.filtro, t, 0.3);
    if (musica.prossimo < t) musica.prossimo = t + 0.03;
    const durata = 60 / st.bpm / 4;
    while (musica.prossimo < t + MUSICA.anticipo) {
      try { passoMusica(musica.passo, musica.prossimo, st, durata); } catch (e) { musica.errore = e; }
      musica.prossimo += durata;
      musica.passo = (musica.passo + 1) % (16 * BRANO.length);
    }
  }
  setInterval(aggiornaMusica, 50);
  document.addEventListener('visibilitychange', aggiornaMusica);
  function sbloccaAudio() {
    if (stato.test) return;
    try { contesto(); } catch (e) { return; }
    aggiornaMusica();
  }
  window.addEventListener('pointerdown', sbloccaAudio, true);
  window.addEventListener('keydown', sbloccaAudio, true);

  function cambiaAudio() {
    muto = !muto;
    scrivi('muto', muto);
    document.body.classList.toggle('muto', muto);
    if (muto) suoni.fineCarica();
    aggiornaMusica();
  }
  function cambiaMusica() {
    musicaSpenta = !musicaSpenta;
    scrivi('musica-spenta', musicaSpenta);
    document.body.classList.toggle('senza-musica', musicaSpenta);
    aggiornaMusica();
  }

  // ================================================================ DISEGNO

  let scala = 1, dpr = 1, lato = 0, larghezza = W;
  function ridimensiona() {
    const r = palco.getBoundingClientRect();
    const aw = Math.max(100, r.width - 12);
    const ah = Math.max(100, r.height - 12);
    // pannelli ai lati se c'è spazio
    const largo = aw / ah > (W + 2 * LATO) / H * 0.82;
    lato = largo ? LATO : 0;
    larghezza = W + 2 * lato;
    scala = Math.min(aw / larghezza, ah / H);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = Math.round(larghezza * scala) + 'px';
    canvas.style.height = Math.round(H * scala) + 'px';
    canvas.width = Math.round(larghezza * scala * dpr);
    canvas.height = Math.round(H * scala * dpr);
    strati.chiave = '';
    if (touch && r.width > r.height && window.innerHeight <= 520) pausa();
  }
  new ResizeObserver(ridimensiona).observe(palco);

  function aggiornaColori() {
    const t = tema();
    document.documentElement.style.setProperty('--neon', t.neon);
    document.documentElement.style.setProperty('--neon2', t.neon2);
    strati.chiave = '';
  }

  // Strati disegnati una volta: sfondo del tema e pareti al neon.
  const strati = { chiave: '', fondo: null, pareti: null, rampa: null, vecchio: null, sfuma: 0 };
  function nuovaTela() {
    const c = document.createElement('canvas');
    c.width = Math.round(W * scala * dpr);
    c.height = Math.round(H * scala * dpr);
    const g = c.getContext('2d');
    g.setTransform(scala * dpr, 0, 0, scala * dpr, 0, 0);
    return [c, g];
  }
  function preparaStrati() {
    const chiave = stato.tema + '|' + scala + '|' + dpr;
    if (strati.chiave === chiave) return;
    if (strati.fondo && strati.chiave.split('|')[1] === String(scala)) {
      strati.vecchio = { fondo: strati.fondo, pareti: strati.pareti, rampa: strati.rampa };
      strati.sfuma = 1;
    } else {
      strati.vecchio = null;
    }
    strati.chiave = chiave;
    const [cf, gf] = nuovaTela();
    disegnaFondoStatico(gf, stato.tema);
    const [cp, gp] = nuovaTela();
    disegnaPareti(gp, tema());
    const [cr, gr] = nuovaTela();
    disegnaPistaRampa(gr, tema());
    strati.fondo = cf;
    strati.pareti = cp;
    strati.rampa = cr;
  }

  // stelle e decorazioni fisse (posizioni a caso, ma sempre le stesse)
  let semeDeco = 7;
  const rnd = () => { semeDeco = (semeDeco * 16807) % 2147483647; return semeDeco / 2147483647; };
  const STELLE = Array.from({ length: 70 }, () => ({ x: rnd() * W, y: rnd() * H, r: 0.6 + rnd() * 1.6, f: rnd() * 6 }));
  const DECO = Array.from({ length: 40 }, () => ({ x: rnd() * W, y: rnd() * H, v: 0.5 + rnd(), f: rnd() * 6, s: 0.6 + rnd() * 0.8 }));

  function formaTavolo(g) {
    g.beginPath();
    g.moveTo(20, H);
    g.lineTo(20, 300);
    g.arc(300, 300, 280, Math.PI, 2 * Math.PI);
    g.lineTo(580, H);
    g.closePath();
  }

  function disegnaFondoStatico(g, id) {
    const t = TEMI[id];
    g.fillStyle = '#05020c';
    g.fillRect(0, 0, W, H);
    g.save();
    formaTavolo(g);
    g.clip();
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, t.fondo[0]);
    gr.addColorStop(0.55, t.fondo[1]);
    gr.addColorStop(1, t.fondo[2]);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    // griglia prospettica in basso (synthwave)
    g.strokeStyle = hexA(t.neon, 0.09);
    g.lineWidth = 1.5;
    for (let i = 0; i <= 14; i++) {
      const y = 640 + Math.pow(i / 14, 1.8) * 400;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }
    for (let i = -10; i <= 10; i++) {
      g.beginPath(); g.moveTo(CX + i * 18, 640); g.lineTo(CX + i * 110, H); g.stroke();
    }
    // disegno del tema
    switch (id) {
      case 'notte': {
        // luna e alberi
        const lg = g.createRadialGradient(300, 560, 10, 300, 560, 180);
        lg.addColorStop(0, hexA(t.neon2, 0.22)); lg.addColorStop(1, hexA(t.neon2, 0));
        g.fillStyle = lg; g.fillRect(100, 380, 400, 360);
        g.fillStyle = hexA('#000000', 0.35);
        for (const [x, s] of [[40, 1.1], [120, 0.8], [470, 1], [540, 0.85], [210, 0.6], [390, 0.65]]) abete(g, x, 1040, s);
        break;
      }
      case 'disco': {
        g.fillStyle = hexA(t.neon, 0.06);
        for (let x = 0; x < W; x += 40) for (let y = 640; y < H; y += 40) if (((x + y) / 40) % 2 === 0) g.fillRect(x, y, 40, 40);
        break;
      }
      case 'pioggia': {
        g.fillStyle = hexA('#000000', 0.25);
        for (const [x, s] of [[60, 1.2], [520, 1.1], [300, 1.6]]) quercia(g, x, 1040, s);
        break;
      }
      case 'lucciole': {
        g.fillStyle = hexA('#000000', 0.4);
        for (let x = -20; x < W; x += 46) erba(g, x, 1040, 60 + (x * 37) % 50);
        break;
      }
      case 'tempesta': {
        g.fillStyle = hexA('#9fb7ff', 0.07);
        for (const [x, y, s] of [[120, 160, 1.4], [420, 260, 1.1], [260, 420, 1.6], [80, 640, 1], [480, 560, 1.2]]) nuvola(g, x, y, s);
        break;
      }
      case 'luna': {
        g.strokeStyle = hexA(t.neon2, 0.12);
        g.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          g.fillStyle = hexA(i % 2 ? t.neon : t.neon2, 0.05);
          g.beginPath(); g.moveTo(CX, -60);
          g.arc(CX, -60, 1300, Math.PI * (0.25 + i * 0.05), Math.PI * (0.25 + (i + 1) * 0.05));
          g.closePath(); g.fill();
        }
        break;
      }
      default: break;
    }
    // scritta grande in mezzo al campo
    g.save();
    g.translate(CX, 760);
    g.font = '700 64px Fredoka, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = hexA(t.neon2, 0.08);
    g.fillText('TINO', 0, 0);
    g.restore();
    g.restore();
  }
  function abete(g, x, y, s) {
    g.beginPath();
    g.moveTo(x, y - 260 * s);
    g.lineTo(x + 70 * s, y);
    g.lineTo(x - 70 * s, y);
    g.closePath();
    g.fill();
  }
  function quercia(g, x, y, s) {
    g.fillRect(x - 14 * s, y - 160 * s, 28 * s, 160 * s);
    for (const [dx, dy, r] of [[0, -220, 90], [-70, -170, 60], [70, -170, 60], [-40, -260, 55], [45, -260, 55]]) {
      g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill();
    }
  }
  function erba(g, x, y, h) {
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 10, y - h * 0.6, x + 24, y - h);
    g.quadraticCurveTo(x + 18, y - h * 0.5, x + 30, y);
    g.fill();
  }
  function nuvola(g, x, y, s) {
    for (const [dx, dy, r] of [[0, 0, 40], [35, 8, 32], [-35, 10, 30], [10, -20, 30]]) {
      g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill();
    }
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function schiarisci(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.round(c + (255 - c) * k);
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  // linea al neon: alone largo, poi linea piena, poi anima chiara
  function neon(g, disegna, colore, spessore = 4) {
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.shadowColor = colore;
    g.shadowBlur = 16;
    g.strokeStyle = hexA(colore, 0.5);
    g.lineWidth = spessore + 5;
    disegna(); g.stroke();
    g.shadowBlur = 6;
    g.strokeStyle = colore;
    g.lineWidth = spessore;
    disegna(); g.stroke();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.lineWidth = Math.max(1, spessore * 0.32);
    disegna(); g.stroke();
    g.restore();
  }
  // come neon(), ma senza shadowBlur (costoso): per le cose ridisegnate a ogni fotogramma
  function neonVeloce(g, disegna, colore, spessore = 4) {
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = hexA(colore, 0.18);
    g.lineWidth = spessore + 9;
    disegna(); g.stroke();
    g.strokeStyle = hexA(colore, 0.4);
    g.lineWidth = spessore + 4;
    g.stroke();
    g.strokeStyle = colore;
    g.lineWidth = spessore;
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.lineWidth = Math.max(1, spessore * 0.32);
    g.stroke();
    g.restore();
  }
  function linea(g, punti) {
    return () => {
      g.beginPath();
      g.moveTo(punti[0][0], punti[0][1]);
      for (let i = 1; i < punti.length; i++) g.lineTo(punti[i][0], punti[i][1]);
    };
  }

  function disegnaPareti(g, t) {
    // bordo esterno del tavolo
    g.save();
    g.fillStyle = '#05020c';
    g.beginPath();
    g.rect(0, 0, W, H);
    g.moveTo(20, H);
    g.lineTo(20, 300);
    g.arc(300, 300, 280, Math.PI, 2 * Math.PI);
    g.lineTo(580, H);
    g.closePath();
    g.fill('evenodd');
    g.restore();
    neon(g, () => { g.beginPath(); g.moveTo(20, H); g.lineTo(20, 300); g.arc(300, 300, 280, Math.PI, 2 * Math.PI); g.lineTo(580, H); }, t.neon, 5);
    // sporgenze piene
    for (const p of [SPORGENZA_SX, specchio(SPORGENZA_SX)]) {
      g.save();
      g.fillStyle = hexA(t.neon, 0.14);
      g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      g.restore();
    }
    // corridoio di lancio
    neon(g, linea(g, [[540, 1040], [540, 700], ...specchio(SPORGENZA_SX).reverse().slice(1), [540, 304]]), t.neon, 4);
    neon(g, linea(g, [[20, 1040], [20, 700], ...SPORGENZA_SX.slice().reverse().slice(1), [20, 300]]), t.neon, 5);
    // orbita e Tana
    neon(g, linea(g, [[70, 330], [70, 520]]), t.neon, 5);
    const tana = arco(TANA.x, TANA.y, 26, ARCO_TANA[0], ARCO_TANA[1], 16);
    neon(g, linea(g, tana), t.neon2, 4);
    neon(g, linea(g, TETTO_TANA), t.neon, 3);
    // guide delle corsie interne
    neon(g, linea(g, GUIDA_SX), t.neon, 4);
    neon(g, linea(g, specchio(GUIDA_SX)), t.neon, 4);
    // corsie in cima
    for (const x of [180, 240, 300, 360, 420]) neon(g, linea(g, [[x, 120], [x, 166]]), t.neon, 4);
    // entrata della rampa
    neon(g, linea(g, BOCCA), t.neon2, 4);
    // fionde (sagoma: la gomma si disegna a parte perché lampeggia)
    for (const p of [FIONDA_SX, specchio(FIONDA_SX)]) {
      g.save();
      g.fillStyle = hexA(t.neon, 0.12);
      g.beginPath(); g.moveTo(...p[0]); g.lineTo(...p[1]); g.lineTo(...p[2]); g.closePath(); g.fill();
      g.restore();
      neon(g, linea(g, [p[0], p[1], p[2]]), t.neon, 3);
    }
    // grembiule in fondo (sotto i flipper)
    g.save();
    g.fillStyle = '#120826';
    g.beginPath();
    g.moveTo(20, 1040); g.lineTo(20, 960); g.lineTo(150, 990); g.lineTo(150, 1040);
    g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(540, 1040); g.lineTo(540, 960); g.lineTo(410, 990); g.lineTo(410, 1040);
    g.closePath(); g.fill();
    g.restore();
    neon(g, linea(g, [[20, 960], [150, 990], [150, 1040]]), t.neon2, 3);
    neon(g, linea(g, [[540, 960], [410, 990], [410, 1040]]), t.neon2, 3);
    // corridoio: fondo più scuro
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(542, 300, 36, 740);
    g.restore();
  }

  // Sprite della ghianda (palla): corpo lucido e cappello, disegnati una volta
  const spriteGhianda = (() => {
    const c = document.createElement('canvas');
    const k = 4;
    c.width = c.height = R * 2 * k + 8;
    const g = c.getContext('2d');
    g.scale(k, k);
    const m = R + 1;
    // corpo
    const gr = g.createRadialGradient(m - 4, m - 4, 1, m, m, R);
    gr.addColorStop(0, '#fff3dc');
    gr.addColorStop(0.25, '#f2b56a');
    gr.addColorStop(0.75, '#b06a2a');
    gr.addColorStop(1, '#6b3a12');
    g.fillStyle = gr;
    g.beginPath(); g.arc(m, m, R, 0, Math.PI * 2); g.fill();
    // cappello (metà alta) a scaglie
    g.save();
    g.beginPath(); g.arc(m, m, R, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#6e4a24';
    g.beginPath(); g.ellipse(m, m - R * 0.55, R * 1.05, R * 0.62, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(40,20,5,0.55)';
    g.lineWidth = 0.6;
    for (let i = -3; i <= 3; i++) {
      g.beginPath(); g.moveTo(m + i * 3.4 - 3, m - R); g.lineTo(m + i * 3.4 + 3, m - R * 0.05); g.stroke();
      g.beginPath(); g.moveTo(m + i * 3.4 + 3, m - R); g.lineTo(m + i * 3.4 - 3, m - R * 0.05); g.stroke();
    }
    g.restore();
    // picciolo
    g.strokeStyle = '#4a2c10';
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(m, m - R * 0.95); g.lineTo(m + 1.5, m - R - 0.8); g.stroke();
    return { c, k, m };
  })();

  function disegnaGhianda(g, x, y, rot, s = 1) {
    const sp = spriteGhianda;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(s / sp.k, s / sp.k);
    g.drawImage(sp.c, -sp.m * sp.k, -sp.m * sp.k);
    g.restore();
    // riflesso fisso (la luce viene dall'alto)
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.ellipse(x - 4 * s, y - 5 * s, 3.4 * s, 2.2 * s, -0.6, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  // alone luminoso pre-disegnato (si usa con 'lighter')
  const aloni = {};
  function alone(colore) {
    if (!aloni[colore]) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, hexA(colore, 0.9));
      gr.addColorStop(0.25, hexA(colore, 0.45));
      gr.addColorStop(1, hexA(colore, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
      aloni[colore] = c;
    }
    return aloni[colore];
  }
  function luce(g, x, y, r, colore, a = 1) {
    if (a <= 0) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = Math.min(1, a);
    g.drawImage(alone(colore), x - r, y - r, r * 2, r * 2);
    g.restore();
  }

  // Lampade (inserti) sul campo
  function lampada(g, x, y, r, colore, accesa, testo = '', forma = 'tondo', ang = 0) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.beginPath();
    if (forma === 'freccia') {
      g.moveTo(0, -r * 1.3); g.lineTo(r, r * 0.7); g.lineTo(0, r * 0.25); g.lineTo(-r, r * 0.7); g.closePath();
    } else if (forma === 'pillola') {
      g.arc(-r * 1.6, 0, r, Math.PI / 2, Math.PI * 1.5);
      g.arc(r * 1.6, 0, r, -Math.PI / 2, Math.PI / 2);
      g.closePath();
    } else {
      g.arc(0, 0, r, 0, Math.PI * 2);
    }
    g.fillStyle = accesa ? colore : hexA(colore, 0.16);
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = hexA(colore, accesa ? 1 : 0.45);
    g.stroke();
    if (testo) {
      g.rotate(-ang);
      g.fillStyle = accesa ? '#1a0630' : hexA('#ffffff', 0.45);
      g.font = `700 ${Math.round(r * (forma === 'pillola' ? 0.95 : testo.length > 2 ? 0.75 : 1.1))}px Fredoka, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(testo, 0, 1);
    }
    g.restore();
    if (accesa) luce(g, x, y, r * (forma === 'pillola' ? 4.5 : 3), colore, 0.7);
  }

  const lampeggia = (vel = 4) => Math.sin(stato.tempo * vel * Math.PI) > 0;

  function disegna(ora) {
    preparaStrati();
    ctx.setTransform(scala * dpr, 0, 0, scala * dpr, 0, 0);
    ctx.fillStyle = '#05020c';
    ctx.fillRect(0, 0, larghezza, H);
    if (lato) disegnaPannelli();
    ctx.save();
    ctx.translate(lato, 0);
    // scossa dello schermo
    if (stato.scossa > 0) {
      const k = stato.scossa * 22;
      ctx.translate(casuale(-k, k), casuale(-k, k));
    }
    ctx.drawImage(strati.fondo, 0, 0, W, H);
    if (strati.vecchio && strati.sfuma > 0) {
      ctx.globalAlpha = strati.sfuma;
      ctx.drawImage(strati.vecchio.fondo, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    disegnaFondoVivo(ctx, ora);
    disegnaLampade(ctx);
    ctx.drawImage(strati.pareti, 0, 0, W, H);
    if (strati.vecchio && strati.sfuma > 0) {
      ctx.globalAlpha = strati.sfuma;
      ctx.drawImage(strati.vecchio.pareti, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    disegnaFionde(ctx);
    disegnaBersagli(ctx);
    disegnaBumper(ctx);
    disegnaGino(ctx);
    disegnaSpinner(ctx);
    disegnaCancello(ctx);
    disegnaOggetti(ctx);
    disegnaPalle(ctx, false);
    disegnaFlipper(ctx);
    disegnaLancio(ctx);
    disegnaRampa(ctx);
    disegnaPalle(ctx, true);
    disegnaGrembiule(ctx);
    disegnaParticelle(ctx);
    disegnaScritte(ctx);
    if (strati.sfuma > 0) strati.sfuma = Math.max(0, strati.sfuma - 1 / 40);
    if (!lato) disegnaInfoTavolo(ctx);
    disegnaMessaggio(ctx);
    if (stato.fase === 'bonus') disegnaBonus(ctx);
    if (stato.flash > 0) {
      ctx.fillStyle = hexA('#ffffff', stato.flash * 0.35);
      ctx.fillRect(0, 0, W, H);
    }
    if (stato.lampo > 0 && Math.random() < 0.7) {
      ctx.fillStyle = hexA('#dfe9ff', stato.lampo * 0.5);
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function disegnaFondoVivo(g, ora) {
    const t = tema();
    const id = stato.tema;
    g.save();
    formaTavolo(g);
    g.clip();
    if (id === 'notte' || id === 'luna' || id === 'festa') {
      for (const s of STELLE) {
        const a = 0.35 + 0.35 * Math.sin(ora * 2 + s.f);
        g.fillStyle = `rgba(255,255,255,${a})`;
        g.fillRect(s.x, s.y, s.r, s.r);
      }
    }
    if (id === 'disco') {
      // fasci di luce che girano dalla palla stroboscopica
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const a = ora * 0.9 + i * Math.PI / 3;
        g.fillStyle = hexA(i % 2 ? t.neon : t.neon2, 0.07);
        g.beginPath();
        g.moveTo(300, 60);
        g.arc(300, 60, 1200, a, a + 0.18);
        g.closePath();
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#c8c8d8';
      g.beginPath(); g.arc(300, 60, 18, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 8; i++) {
        const a = ora * 3 + i;
        g.fillRect(300 + Math.cos(a) * 11 - 2, 60 + Math.sin(a * 1.3) * 11 - 2, 4, 4);
      }
    }
    if (id === 'pioggia') {
      g.globalAlpha = 0.18;
      for (const d of DECO) {
        const y = (d.y + ora * 90 * d.v) % (H + 40) - 20;
        disegnaGhianda(g, d.x, y, ora * d.v + d.f, d.s);
      }
      g.globalAlpha = 1;
    }
    if (id === 'lucciole') {
      for (const d of DECO) {
        const x = d.x + Math.sin(ora * 0.7 * d.v + d.f) * 30;
        const y = d.y + Math.cos(ora * 0.5 * d.v + d.f) * 24;
        const a = 0.3 + 0.7 * Math.max(0, Math.sin(ora * 2 * d.v + d.f));
        luce(g, x, y, 14, t.luce, a * 0.6);
      }
    }
    if (id === 'tempesta') {
      g.strokeStyle = 'rgba(170,200,255,0.18)';
      g.lineWidth = 1.2;
      g.beginPath();
      for (const d of DECO) {
        const y = (d.y + ora * 900 * d.v) % (H + 60) - 30;
        g.moveTo(d.x, y); g.lineTo(d.x - 6, y + 22);
      }
      g.stroke();
      if (stato.lampo > 0) {
        g.strokeStyle = 'rgba(240,248,255,0.9)';
        g.lineWidth = 3;
        g.beginPath();
        let x = 100 + (Math.floor(ora * 7) * 97) % 400, y = 20;
        g.moveTo(x, y);
        while (y < 700) { x += casuale(-40, 40); y += casuale(40, 80); g.lineTo(x, y); }
        g.stroke();
      }
    }
    if (id === 'luna') {
      // ruota panoramica
      g.save();
      g.translate(CX, 600);
      g.rotate(ora * 0.25);
      g.strokeStyle = hexA(t.neon2, 0.2);
      g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, 220, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 220, Math.sin(a) * 220); g.stroke();
        luce(g, Math.cos(a) * 220, Math.sin(a) * 220, 14, i % 2 ? t.neon : t.neon2, 0.5 + 0.5 * Math.sin(ora * 4 + i));
      }
      g.restore();
    }
    if (id === 'festa') {
      for (const d of DECO) {
        const y = (d.y + ora * 140 * d.v) % (H + 40) - 20;
        g.fillStyle = `hsl(${(d.f * 60 + ora * 80) % 360},90%,60%)`;
        g.save();
        g.translate(d.x + Math.sin(ora * 2 + d.f) * 14, y);
        g.rotate(ora * 3 * d.v);
        g.fillRect(-4, -2, 8, 4);
        g.restore();
      }
    }
    g.restore();
  }

  function disegnaLampade(g) {
    const t = tema();
    // lettere T-I-N-O
    CORSIE.forEach((x, i) => {
      const skill = stato.skill.attivo && stato.skill.corsia === i && stato.modo === 'gioco';
      const accesa = stato.corsie[i] || (skill && lampeggia(6)) || (stato.lampoCorsie > 0 && lampeggia(10));
      lampada(g, x, 196, 11, skill ? '#fffb8a' : t.luce, accesa, LETTERE[i]);
    });
    // moltiplicatore del bonus
    for (let m = 2; m <= 6; m++) {
      const x = CX + (m - 4) * 34;
      lampada(g, x, 840, 12, t.neon2, stato.bonusMolt >= m, m + '×');
    }
    // ancora una (palla salvata)
    const salva = stato.salva > 0 || stato.salvaPronto;
    lampada(g, CX, 922, 11, '#7dff8a', salva && (stato.salva > 2 || stato.salvaPronto || lampeggia(8)), 'ANCORA', 'pillola');
    // scenari: sei lampade in arco sopra Gino
    const lista = [...SCENARI, FESTA];
    lista.forEach((s, i) => {
      const a = Math.PI * (1.15 + i * 0.14);
      const x = GINO.x + Math.cos(a) * 72, y = GINO.y + Math.sin(a) * 72 + 6;
      const fatto = stato.scenariFatti.includes(s.id);
      const ora = stato.scenario && stato.scenario.id === s.id;
      const prossimo = stato.tana.scenarioAcceso && prossimoScenario().id === s.id;
      lampada(g, x, y, 7, TEMI[s.id].neon, fatto || (ora && lampeggia(3)) || (prossimo && lampeggia(5)));
    });
    // colpi su Gino che mancano allo scenario
    const serve = ginoServe();
    for (let i = 0; i < serve; i++) {
      const x = GINO.x + (i - (serve - 1) / 2) * 16;
      lampada(g, x, 560, 5, t.neon2, stato.tana.scenarioAcceso || i < stato.ginoColpi || (stato.multiball && stato.jackpot.superAcceso && lampeggia(6)));
    }
    // frecce dei tiri
    const tana = stato.tana;
    const multi = stato.multiball;
    const luc = stato.lucciola && stato.scenario && stato.scenario.id === 'lucciole' ? stato.lucciola.tiro : null;
    const festa = stato.scenario && stato.scenario.id === 'festa';
    const tempesta = stato.scenario && stato.scenario.id === 'tempesta';
    lampada(g, 448, 520, 13, multi ? '#fffb8a' : t.neon2, (multi && lampeggia(6)) || luc === 'rampa' || festa || tempesta, multi ? 'J' : '', 'freccia', 0.42);
    lampada(g, 82, 600, 12, t.neon, luc === 'orbita' || festa || tempesta || (stato.combo.t > 0 && lampeggia(3)), '', 'freccia', -0.55);
    const tanaAccesa = tana.blocco > 0 || tana.scenarioAcceso || tana.extraAccesa || luc === 'tana' || festa;
    lampada(g, 160, 466, 13, tana.extraAccesa ? '#7dff8a' : t.neon2, tanaAccesa && lampeggia(tana.scenarioAcceso ? 3 : 5), '', 'freccia', -0.68);
    // lampade dei blocchi vicino alla Tana
    for (let i = 0; i < 2; i++) lampada(g, 150 + i * 18, 370 - i * 12, 6, t.luce, tana.bloccate > i || (tana.blocco > 0 && tana.bloccate === i && lampeggia(6)));
    // palla extra e rimbalzo
    lampada(g, 196, 440, 8, '#7dff8a', tana.extraAccesa, 'E');
    lampada(g, 43, 920, 10, t.luce, stato.kickback, '↑');
    // moltiplicatore del campo
    const molt = moltiplicatore();
    if (molt > 1) lampada(g, CX, 712, 16, '#fffb8a', stato.moltT > 3 || lampeggia(6), molt + '×');
    // lucciola
    if (luc) {
      const l = stato.lucciola;
      const x = l.x + Math.sin(stato.tempo * 3) * 8, y = l.y + Math.cos(stato.tempo * 2.3) * 6;
      luce(g, x, y, 36, '#fffb8a', 0.6 + 0.4 * Math.sin(stato.tempo * 9));
      g.fillStyle = '#fffbd0';
      g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
    }
  }

  function disegnaFionde(g) {
    const t = tema();
    for (const [p, id] of [[FIONDA_SX, 'fionda-sx'], [specchio(FIONDA_SX), 'fionda-dx']]) {
      const k = (stato.lampoFionda && stato.lampoFionda[id]) || 0;
      const a = p[0], c = p[2];
      // la gomma si piega quando scatta
      const mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2;
      const nx = (c[1] - a[1]), ny = -(c[0] - a[0]);
      const l = Math.hypot(nx, ny);
      const dir = id === 'fionda-sx' ? 1 : -1;
      const piega = k * 7 * dir;
      const px = mx + nx / l * piega * -1, py = my + ny / l * piega * -1;
      neonVeloce(g, () => { g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(px, py, c[0], c[1]); }, k > 0.1 ? '#ffffff' : t.neon2, 5);
      if (k > 0) luce(g, mx, my, 50, t.neon2, k);
    }
  }

  function disegnaBersagli(g) {
    const t = tema();
    const colori = [t.neon2, t.luce, t.neon];
    for (const b of BERSAGLI) {
      g.save();
      g.translate(b.x, b.y);
      if (b.giu) {
        g.strokeStyle = hexA(colori[b.i], 0.35);
        g.lineWidth = 2;
        g.strokeRect(-14, -3, 28, 6);
      } else {
        g.fillStyle = b.lampo > 0 ? '#fff' : colori[b.i];
        g.fillRect(-14, -7, 28, 14);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(-14, 2, 28, 5);
        // ghiandina disegnata sopra
        g.fillStyle = '#4a2c10';
        g.beginPath(); g.ellipse(0, -2, 5, 3, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#8a4f1e';
        g.beginPath(); g.ellipse(0, -1, 4, 4.5, 0, 0, Math.PI); g.fill();
      }
      g.restore();
      if (!b.giu) luce(g, b.x, b.y, 26, colori[b.i], 0.5 + b.lampo);
    }
  }

  function disegnaBumper(g) {
    const t = tema();
    const disco = stato.scenario && stato.scenario.id === 'disco';
    for (const b of BUMPERS) {
      const k = b.lampo;
      const r = BUMPER.raggio;
      const col = disco ? [t.neon, t.neon2, t.luce][(b.i + Math.floor(stato.tempo * 4)) % 3] : t.neon2;
      luce(g, b.x, b.y, r * 2.4, col, 0.35 + k * 0.8);
      // gonna
      g.fillStyle = '#1a0b33';
      g.beginPath(); g.arc(b.x, b.y, r + 2, 0, Math.PI * 2); g.fill();
      neonVeloce(g, () => { g.beginPath(); g.arc(b.x, b.y, r, 0, Math.PI * 2); }, col, 3.5);
      // cappello a fungo
      const rc = r * (0.7 - k * 0.08);
      const gr = g.createRadialGradient(b.x - 5, b.y - 6, 2, b.x, b.y, rc);
      gr.addColorStop(0, k > 0.2 ? '#ffffff' : schiarisci(col, 0.6));
      gr.addColorStop(1, k > 0.2 ? col : hexA(col, 0.55));
      g.fillStyle = gr;
      g.beginPath(); g.arc(b.x, b.y, rc, 0, Math.PI * 2); g.fill();
      // puntini del fungo
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 5; i++) {
        const a = i * 1.256 + b.i;
        g.beginPath(); g.arc(b.x + Math.cos(a) * rc * 0.55, b.y + Math.sin(a) * rc * 0.55, 2.3, 0, Math.PI * 2); g.fill();
      }
      if (k > 0) {
        g.strokeStyle = hexA('#ffffff', k);
        g.lineWidth = 2;
        g.beginPath(); g.arc(b.x, b.y, r + (1 - k) * 22, 0, Math.PI * 2); g.stroke();
      }
    }
  }

  function disegnaGino(g) {
    const t = tema();
    const k = GINO.trema;
    luce(g, GINO.x, GINO.y, 70, t.neon2, 0.35 + k);
    g.fillStyle = '#1a0b33';
    g.beginPath(); g.arc(GINO.x, GINO.y, GINO.r, 0, Math.PI * 2); g.fill();
    neonVeloce(g, () => { g.beginPath(); g.arc(GINO.x, GINO.y, GINO.r, 0, Math.PI * 2); }, stato.tana.scenarioAcceso && lampeggia(3) ? t.luce : t.neon2, 4);
    const img = immagini.gino;
    if (pronta(img)) {
      const h = 62;
      const w = h * img.naturalWidth / img.naturalHeight;
      g.save();
      g.translate(GINO.x + (k > 0 ? Math.sin(stato.tempo * 70) * 4 * k / 0.5 : 0), GINO.y + 4);
      if (GINO.salto > 0) {
        const s = Math.sin(GINO.salto * Math.PI * 2);
        g.translate(0, -Math.abs(s) * 10);
        g.scale(1 - s * 0.06, 1 + s * 0.06);
      }
      if (stato.fase === 'finita' || (stato.fase === 'bonus' && !stato.palle.length)) g.rotate(0.5);
      g.beginPath(); g.arc(0, -4, GINO.r - 3, 0, Math.PI * 2); g.clip();
      g.drawImage(img, -w / 2, -h / 2 - 2, w, h);
      g.restore();
    }
  }

  function disegnaSpinner(g) {
    const t = tema();
    const s = Math.cos(SPINNER.ang);
    g.save();
    g.translate(SPINNER.x, SPINNER.y);
    g.fillStyle = hexA(t.luce, 0.25 + 0.6 * Math.abs(s));
    g.strokeStyle = t.luce;
    g.lineWidth = 1.5;
    g.beginPath();
    g.rect(-22, -6 * s - 1, 44, 12 * s + 2);
    g.fill(); g.stroke();
    g.restore();
    g.strokeStyle = hexA(t.luce, 0.6);
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(22, SPINNER.y); g.lineTo(68, SPINNER.y); g.stroke();
  }

  function disegnaCancello(g) {
    const t = tema();
    const aperto = stato.palle.some((p) => p.x > 540 && p.y > 270 && p.y < 330 && p.vy < 0);
    g.save();
    g.strokeStyle = t.neon;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(542, 300);
    g.lineTo(aperto ? 548 : 578, aperto ? 270 : 300);
    g.stroke();
    g.restore();
  }

  function disegnaOggetti(g) {
    for (const o of stato.oggetti) {
      if (o.preso) continue;
      const b = Math.sin(stato.tempo * 4 + o.x) * 3;
      luce(g, o.x, o.y + b, 30, '#ffd23f', 0.6);
      g.save();
      g.globalCompositeOperation = 'source-over';
      disegnaGhianda(g, o.x, o.y + b, Math.sin(stato.tempo * 2 + o.y) * 0.3, 1.1);
      g.globalCompositeOperation = 'color';
      g.fillStyle = 'rgba(255,200,40,0.8)';
      g.beginPath(); g.arc(o.x, o.y + b, 13, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }

  function disegnaPalle(g, inRampa) {
    const t = tema();
    for (const p of stato.palle) {
      if ((p.stato === 'rampa') !== inRampa) continue;
      if (p.stato === 'tana') {
        luce(g, TANA.x, TANA.y, 40, t.neon2, 0.6 + 0.4 * Math.sin(stato.tempo * 12));
        continue;
      }
      // scia luminosa
      if (p.scia.length > 4) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.lineCap = 'round';
        for (let i = 2; i < p.scia.length; i += 2) {
          const a = i / p.scia.length;
          g.strokeStyle = hexA(stato.multiball ? t.luce : t.neon, a * 0.35);
          g.lineWidth = R * 1.6 * a;
          g.beginPath();
          g.moveTo(p.scia[i - 2], p.scia[i - 1]);
          g.lineTo(p.scia[i], p.scia[i + 1]);
          g.stroke();
        }
        g.restore();
      }
      const s = inRampa ? 1.18 : 1;
      if (inRampa) {
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.beginPath(); g.arc(p.x + 8, p.y + 10, R, 0, Math.PI * 2); g.fill();
      } else {
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.beginPath(); g.arc(p.x + 3, p.y + 4, R, 0, Math.PI * 2); g.fill();
      }
      disegnaGhianda(g, p.x, p.y + (p.stato === 'canna' ? p.giu || 0 : 0), p.rot, s);
    }
  }

  function disegnaFlipper(g) {
    const t = tema();
    for (const f of [flipper.sx, flipper.dx]) {
      const [tx, ty] = puntaFlipper(f);
      const a = Math.atan2(ty - f.py, tx - f.px);
      const L = FLIPPER.lungo;
      g.save();
      g.translate(f.px, f.py);
      g.rotate(a);
      const forma = () => {
        g.beginPath();
        g.arc(0, 0, FLIPPER.r1, Math.PI / 2, Math.PI * 1.5);
        g.lineTo(L, -FLIPPER.r2);
        g.arc(L, 0, FLIPPER.r2, -Math.PI / 2, Math.PI / 2);
        g.closePath();
      };
      forma();
      g.strokeStyle = hexA(t.neon, f.premuto ? 0.45 : 0.25);
      g.lineWidth = 12;
      g.stroke();
      const gr = g.createLinearGradient(0, -FLIPPER.r1, 0, FLIPPER.r1);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(1, '#bfc6e0');
      g.fillStyle = gr;
      g.fill();
      g.lineWidth = 3.5;
      g.strokeStyle = stato.tiltato ? '#555' : t.neon2;
      forma(); g.stroke();
      g.fillStyle = hexA(t.neon, 0.9);
      g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }

  function disegnaLancio(g) {
    const t = tema();
    const L = stato.lancio;
    const tira = L.palla ? L.carica * 46 : 0;
    // molla
    g.save();
    g.strokeStyle = hexA(t.neon, 0.8);
    g.lineWidth = 2;
    g.beginPath();
    const y0 = 1013 + tira, y1 = 1040;
    for (let i = 0; i <= 8; i++) {
      const y = y0 + (y1 - y0) * i / 8;
      g.lineTo(560 + (i % 2 ? 10 : -10), y);
    }
    g.stroke();
    g.fillStyle = t.neon2;
    g.fillRect(546, y0 - 2, 28, 6);
    g.restore();
    if (L.palla && L.carica > 0) {
      g.fillStyle = hexA(t.neon2, 0.3);
      g.fillRect(546, 1036 - 300 * L.carica, 28, 300 * L.carica);
    }
    if (L.palla) L.palla.giu = tira;     // la ghianda scende con lo stantuffo (solo nel disegno)
  }

  function disegnaPistaRampa(g, t) {
    const p = RAMPA.punti;
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // pista trasparente
    g.strokeStyle = hexA(t.neon2, 0.12);
    g.lineWidth = 34;
    g.beginPath(); g.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
    g.stroke();
    g.restore();
    // binari
    const binario = (k) => {
      const out = [];
      for (let i = 0; i < p.length; i++) {
        const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const l = Math.hypot(dx, dy) || 1;
        out.push([p[i][0] - dy / l * k, p[i][1] + dx / l * k]);
      }
      return out;
    };
    g.globalAlpha = 0.85;
    neon(g, linea(g, binario(17)), t.neon2, 2.5);
    neon(g, linea(g, binario(-17)), t.neon2, 2.5);
    g.globalAlpha = 1;
  }

  function disegnaRampa(g) {
    const t = tema();
    g.drawImage(strati.rampa, 0, 0, W, H);
    if (strati.vecchio && strati.sfuma > 0) {
      g.globalAlpha = strati.sfuma;
      g.drawImage(strati.vecchio.rampa, 0, 0, W, H);
      g.globalAlpha = 1;
    }
    // frecce che scorrono sulla rampa
    const lung = RAMPA.lung;
    g.fillStyle = hexA(t.neon2, 0.35);
    for (let s = (stato.tempo * 120) % 70; s < lung - 20; s += 70) {
      const q = puntoPercorso(RAMPA, s);
      g.save();
      g.translate(q.x, q.y);
      g.rotate(Math.atan2(q.dy, q.dx));
      g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -6); g.lineTo(-4, 6); g.closePath(); g.fill();
      g.restore();
    }
  }

  function disegnaGrembiule(g) {
    const t = tema();
    // Tino sul grembiule a sinistra
    const tino = stato.tino;
    const f = stato.fase === 'finita' ? 'ko' : tino.faccia;
    const img = immagini[f] || immagini.normale;
    if (pronta(img)) {
      const h = f === 'ko' ? 50 : 84;
      const w = h * img.naturalWidth / img.naturalHeight;
      g.save();
      g.translate(88, 1036);
      if (tino.salto > 0) {
        const s = Math.sin(tino.salto * Math.PI * 2.5);
        g.translate(0, -Math.abs(s) * 14);
        g.scale(1 + s * 0.05, 1 - s * 0.05);
      } else if (f === 'ferito') {
        g.translate(Math.sin(stato.tempo * 50) * 2, 0);
      } else {
        g.rotate(Math.sin(stato.tempo * 2) * 0.03);
      }
      g.drawImage(img, -w / 2, -h, w, h);
      g.restore();
    }
    // a destra: palla e bonus
    g.save();
    g.textAlign = 'center';
    g.fillStyle = t.neon;
    g.font = '700 15px Fredoka, sans-serif';
    if (stato.modo === 'gioco') {
      g.fillText(`PALLA ${Math.min(stato.palla, stato.palleTotali)}`, 476, 1014);
      g.fillStyle = hexA('#ffffff', 0.6);
      g.font = '600 12px Fredoka, sans-serif';
      g.fillText(stato.palleExtra ? `+${stato.palleExtra} extra` : `bonus ×${stato.bonusMolt}`, 476, 1031);
    } else {
      g.fillText('DEMO', 476, 1020);
    }
    g.restore();
  }

  function disegnaParticelle(g) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const q of stato.particelle) {
      const a = 1 - q.t / q.durata;
      g.fillStyle = hexA(q.colore, a);
      g.beginPath(); g.arc(q.x, q.y, q.r * a + 0.5, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  function disegnaScritte(g) {
    g.save();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const s of stato.scritte) {
      const a = 1 - Math.pow(s.t / s.durata, 2);
      g.globalAlpha = a;
      g.font = `700 ${s.grande ? 26 : 16}px Fredoka, sans-serif`;
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(10,3,25,0.8)';
      g.strokeText(s.testo, s.x, s.y);
      g.fillStyle = s.colore;
      g.fillText(s.testo, s.x, s.y);
    }
    g.restore();
  }

  function testoNeon(g, testo, x, y, size, colore) {
    g.save();
    g.font = `700 ${size}px Fredoka, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.shadowColor = colore;
    g.shadowBlur = 18;
    g.lineWidth = size * 0.16;
    g.strokeStyle = colore;
    g.strokeText(testo, x, y);
    g.shadowBlur = 0;
    g.fillStyle = '#fff';
    g.fillText(testo, x, y);
    g.restore();
  }
  function adatta(g, testo, size, max) {
    g.font = `700 ${size}px Fredoka, sans-serif`;
    const w = g.measureText(testo).width;
    return w > max ? size * max / w : size;
  }

  function disegnaMessaggio(g) {
    const m = stato.messaggi[0];
    if (!m) return;
    const t = tema();
    const entra = Math.min(1, m.t / 0.18);
    const esce = Math.min(1, (m.durata - m.t) / 0.3);
    const k = Math.max(0, Math.min(entra, esce));
    const s = 0.6 + 0.4 * (1 - Math.pow(1 - entra, 3)) + (m.t < 0.25 ? Math.sin(m.t / 0.25 * Math.PI) * 0.12 : 0);
    g.save();
    g.globalAlpha = k;
    g.fillStyle = 'rgba(8,2,22,0.55)';
    g.beginPath();
    g.roundRect ? g.roundRect(60, 652, 440, m.sotto ? 102 : 74, 18) : g.rect(60, 652, 440, m.sotto ? 102 : 74);
    g.fill();
    g.translate(CX, 690);
    g.scale(s, s);
    const size = adatta(g, m.testo, 46, 400);
    testoNeon(g, m.testo, 0, 0, size, m.colore || t.neon2);
    if (m.sotto) {
      g.font = `600 ${adatta(g, m.sotto, 19, 410)}px Fredoka, sans-serif`;
      g.textAlign = 'center';
      g.fillStyle = t.neon;
      g.fillText(m.sotto, 0, 42);
    }
    g.restore();
  }

  function disegnaBonus(g) {
    const b = stato.bonus;
    if (!b || stato.palle.length) return;
    const t = tema();
    g.save();
    g.fillStyle = 'rgba(8,2,22,0.8)';
    g.fillRect(70, 300, 420, 340);
    g.strokeStyle = t.neon;
    g.lineWidth = 2;
    g.strokeRect(70, 300, 420, 340);
    testoNeon(g, b.tilt ? 'TILT' : 'Bonus', CX, 340, 38, b.tilt ? '#ff4a5a' : t.neon2);
    g.font = '600 18px Fredoka, sans-serif';
    g.textBaseline = 'middle';
    b.righe.forEach((r, i) => {
      g.fillStyle = '#fff';
      g.textAlign = 'left';
      g.fillText(`${r[0]} × ${r[1]}`, 110, 390 + i * 26);
      g.textAlign = 'right';
      g.fillText(numero(r[1] * r[2]), 450, 390 + i * 26);
    });
    g.textAlign = 'center';
    g.fillStyle = t.neon;
    g.font = '700 22px Fredoka, sans-serif';
    g.fillText(`× ${b.molt} = ${numero(b.contato)}`, CX, 600);
    g.restore();
  }

  // Info sul tavolo quando mancano i pannelli laterali (telefono)
  function disegnaInfoTavolo(g) {
    const sc = stato.scenario;
    const t = tema();
    if (sc) {
      g.save();
      g.fillStyle = 'rgba(8,2,22,0.6)';
      g.fillRect(120, 26, 360, 30);
      const k = sc.id === 'festa' ? 1 : clamp(sc.t / sc.durata, 0, 1);
      g.fillStyle = hexA(t.neon, 0.5);
      g.fillRect(120, 52, 360 * k, 4);
      g.font = '700 16px Fredoka, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff';
      g.fillText(`${sc.nome}${sc.id !== 'festa' ? ' · ' + Math.ceil(sc.t) + ' s' : ''}`, 300, 40);
      g.restore();
    }
  }

  // Display a sinistra (schermi larghi)
  function disegnaDisplay(g, x, y, w, h) {
    const t = tema();
    g.save();
    g.translate(x, y);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0d0524'); gr.addColorStop(1, '#170838');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    // titolo
    testoNeon(g, 'TINO', w / 2, 60, 54, t.neon2);
    testoNeon(g, 'FLIPPER', w / 2, 112, 36, t.neon);
    // schermo a puntini con i punti
    g.fillStyle = '#120400';
    g.fillRect(16, 160, w - 32, 120);
    g.strokeStyle = hexA(t.neon, 0.6);
    g.lineWidth = 2;
    g.strokeRect(16, 160, w - 32, 120);
    g.font = '600 15px Fredoka, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ff9a3c';
    g.fillText(stato.modo === 'gioco' ? `PALLA ${Math.min(stato.palla, stato.palleTotali)} DI ${stato.palleTotali}${stato.palleExtra ? ' +' + stato.palleExtra : ''}` : 'PARTITA DIMOSTRATIVA', w / 2, 184);
    const testo = numero(stato.modo === 'gioco' ? stato.punti : record());
    g.font = `700 ${adatta(g, testo, 44, w - 50)}px Fredoka, sans-serif`;
    g.shadowColor = '#ff7a00';
    g.shadowBlur = 14;
    g.fillStyle = '#ffb04a';
    g.fillText(testo, w / 2, 232);
    g.shadowBlur = 0;
    // retino a puntini sopra lo schermo
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let yy = 162; yy < 278; yy += 3) g.fillRect(18, yy, w - 36, 1);
    if (stato.modo !== 'gioco') {
      g.font = '600 13px Fredoka, sans-serif';
      g.fillStyle = '#ff9a3c';
      g.fillText('RECORD', w / 2, 266);
    }
    // righe di stato
    let yy = 320;
    const riga = (etichetta, valore, colore = '#fff', acceso = true) => {
      g.textAlign = 'left';
      g.font = '600 16px Fredoka, sans-serif';
      g.fillStyle = hexA('#ffffff', 0.6);
      g.fillText(etichetta, 24, yy);
      g.textAlign = 'right';
      g.font = '700 18px Fredoka, sans-serif';
      g.fillStyle = acceso ? colore : hexA('#ffffff', 0.35);
      g.fillText(valore, w - 24, yy);
      yy += 32;
    };
    const molt = moltiplicatore();
    riga('Bonus', `×${stato.bonusMolt}`, t.neon2, stato.bonusMolt > 1);
    riga('Campo', molt > 1 ? `×${molt}${stato.moltT > 0 ? ' · ' + Math.ceil(stato.moltT) + ' s' : ''}` : '×1', '#fffb8a', molt > 1);
    riga('Combo', stato.combo.t > 0 && stato.combo.n > 1 ? `×${stato.combo.n}` : '—', t.neon, stato.combo.t > 0 && stato.combo.n > 1);
    riga('Tana', stato.multiball ? 'multiball!' : `${'●'.repeat(stato.tana.bloccate)}${'○'.repeat(3 - stato.tana.bloccate)}`, t.luce, stato.multiball || stato.tana.bloccate > 0);
    riga('Jackpot', numero(stato.jackpot.valore * (stato.jackpot.doppio ? 2 : 1)), '#fffb8a', stato.multiball);
    riga('Rimbalzo', stato.kickback ? 'acceso' : 'spento', t.luce, stato.kickback);
    riga('Rampe', String(stato.rampe), t.neon2, stato.rampe > 0);
    // scenario in corso
    yy += 10;
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(16, yy - 18, w - 32, 128);
    g.textAlign = 'center';
    const sc = stato.scenario;
    if (sc) {
      g.font = `700 ${adatta(g, sc.nome, 20, w - 50)}px Fredoka, sans-serif`;
      g.fillStyle = t.neon;
      g.fillText(sc.nome, w / 2, yy + 4);
      const k = sc.id === 'festa' ? 1 : clamp(sc.t / sc.durata, 0, 1);
      g.fillStyle = hexA(t.neon, 0.25);
      g.fillRect(30, yy + 24, w - 60, 10);
      g.fillStyle = t.neon;
      g.fillRect(30, yy + 24, (w - 60) * k, 10);
      g.font = '600 14px Fredoka, sans-serif';
      g.fillStyle = '#fff';
      const def = [...SCENARI, FESTA].find((s) => s.id === sc.id);
      testoACapo(g, def.testo, w / 2, yy + 56, w - 50, 18);
    } else {
      g.font = '700 17px Fredoka, sans-serif';
      g.fillStyle = hexA('#ffffff', 0.7);
      g.fillText('Prossimo scenario', w / 2, yy + 4);
      g.fillStyle = TEMI[prossimoScenario().id].neon;
      g.font = `700 ${adatta(g, prossimoScenario().nome, 20, w - 50)}px Fredoka, sans-serif`;
      g.fillText(prossimoScenario().nome, w / 2, yy + 32);
      g.font = '600 14px Fredoka, sans-serif';
      g.fillStyle = '#fff';
      g.fillText(stato.tana.scenarioAcceso ? 'Acceso: tira nella Tana!' : `Colpisci Gino: ${stato.ginoColpi}/${ginoServe()}`, w / 2, yy + 64);
    }
    // scenari fatti
    yy += 150;
    const lista = [...SCENARI, FESTA];
    lista.forEach((s, i) => {
      const cx = 30 + i * (w - 60) / (lista.length - 1);
      const fatto = stato.scenariFatti.includes(s.id) || (sc && sc.id === s.id);
      g.fillStyle = fatto ? TEMI[s.id].neon : hexA(TEMI[s.id].neon, 0.18);
      g.beginPath(); g.arc(cx, yy, 11, 0, Math.PI * 2); g.fill();
      if (fatto) luce(g, cx, yy, 26, TEMI[s.id].neon, 0.6);
    });
    g.font = '600 13px Fredoka, sans-serif';
    g.fillStyle = hexA('#ffffff', 0.55);
    g.textAlign = 'center';
    g.fillText(stato.giro ? `Giro ${stato.giro + 1}` : 'Scenari', w / 2, yy + 28);
    // record
    g.font = '600 15px Fredoka, sans-serif';
    g.fillStyle = hexA('#ffffff', 0.6);
    g.fillText(`Record: ${numero(record())}`, w / 2, h - 30);
    g.restore();
  }

  // I pannelli laterali si ridisegnano su tele a parte solo ogni tre fotogrammi
  const pannelli = { tele: null, chiave: '', conta: 0 };
  function disegnaPannelli() {
    const chiave = lato + '|' + scala + '|' + dpr;
    if (pannelli.chiave !== chiave) {
      pannelli.chiave = chiave;
      pannelli.tele = [0, 1].map(() => {
        const c = document.createElement('canvas');
        c.width = Math.round(lato * scala * dpr);
        c.height = Math.round(H * scala * dpr);
        return c;
      });
      pannelli.conta = 0;
    }
    if (pannelli.conta++ % 3 === 0) {
      pannelli.tele.forEach((c, i) => {
        const g = c.getContext('2d');
        g.setTransform(scala * dpr, 0, 0, scala * dpr, 0, 0);
        if (i === 0) disegnaDisplay(g, 0, 0, lato, H);
        else disegnaPannelloTino(g, 0, 0, lato, H);
      });
    }
    ctx.drawImage(pannelli.tele[0], 0, 0, lato, H);
    ctx.drawImage(pannelli.tele[1], lato + W, 0, lato, H);
  }

  function testoACapo(g, testo, x, y, max, alto) {
    const parole = testo.split(' ');
    let riga = '';
    for (const p of parole) {
      const prova = riga ? riga + ' ' + p : p;
      if (g.measureText(prova).width > max && riga) {
        g.fillText(riga, x, y);
        riga = p;
        y += alto;
      } else {
        riga = prova;
      }
    }
    if (riga) g.fillText(riga, x, y);
  }

  // Pannello a destra: Tino grande che fa il tifo
  function disegnaPannelloTino(g, x, y, w, h) {
    const t = tema();
    g.save();
    g.translate(x, y);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0d0524'); gr.addColorStop(1, '#170838');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    // faretto
    luce(g, w / 2, 470, 200, t.neon2, 0.35);
    // palco
    g.fillStyle = hexA(t.neon, 0.12);
    g.beginPath(); g.ellipse(w / 2, 600, 100, 22, 0, 0, Math.PI * 2); g.fill();
    neon(g, () => { g.beginPath(); g.ellipse(w / 2, 600, 100, 22, 0, 0, Math.PI * 2); }, t.neon, 2.5);
    const tino = stato.tino;
    const f = stato.fase === 'finita' ? 'ko' : tino.faccia;
    const img = immagini[f] || immagini.normale;
    if (pronta(img)) {
      const hh = f === 'ko' ? 140 : 250;
      const ww = hh * img.naturalWidth / img.naturalHeight;
      g.save();
      g.translate(w / 2, 604);
      if (tino.salto > 0) {
        const s = Math.sin(tino.salto * Math.PI * 2.5);
        g.translate(0, -Math.abs(s) * 30);
        g.scale(1 + s * 0.05, 1 - s * 0.05);
      } else if (f === 'ferito') {
        g.translate(Math.sin(stato.tempo * 50) * 3, 0);
      } else {
        // segue la ghianda con un'oscillazione
        const p = stato.palle.find((q) => q.stato === 'campo');
        const k = p ? (p.x - CX) / 300 : Math.sin(stato.tempo);
        g.rotate(k * 0.06);
      }
      g.drawImage(img, -ww / 2, -hh, ww, hh);
      g.restore();
    }
    // fumetto
    const frasi = {
      normale: stato.multiball ? 'Che baraonda!' : stato.scenario ? 'Che spettacolo!' : 'Forza, colpisci Gino!',
      arrabbiato: stato.tilt >= TILT.avviso ? 'Piano col tavolo!' : 'Uffa, ghianda persa!',
      ferito: stato.tiltato ? 'Ahia, il tilt!' : 'Ahi, corsia esterna!',
      ko: 'Partita finita!',
    };
    const frase = tino.salto > 0 ? 'Evviva!' : frasi[f] || '';
    if (frase && stato.modo === 'gioco') {
      g.font = '700 18px Fredoka, sans-serif';
      const fw = Math.min(w - 30, g.measureText(frase).width + 30);
      g.fillStyle = '#fff';
      g.beginPath();
      g.roundRect ? g.roundRect(w / 2 - fw / 2, 250, fw, 44, 16) : g.rect(w / 2 - fw / 2, 250, fw, 44);
      g.fill();
      g.beginPath(); g.moveTo(w / 2 - 8, 292); g.lineTo(w / 2 + 6, 310); g.lineTo(w / 2 + 12, 292); g.fill();
      g.fillStyle = '#2a0f52';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(frase, w / 2, 273);
    }
    // comandi
    g.textAlign = 'center';
    g.font = '600 14px Fredoka, sans-serif';
    g.fillStyle = hexA('#ffffff', 0.6);
    const righe = touch
      ? ['Tocca a sinistra e a destra', 'per i flipper', 'Striscia in su: scossone']
      : ['← → o Z /  flipper', '↓ o Spazio  lancio', '↑  scossone · P pausa'];
    righe.forEach((r, i) => g.fillText(r, w / 2, 680 + i * 22));
    // Gino che saltella in basso
    const gi = immagini.gino;
    if (pronta(gi)) {
      const hh = 70, ww = hh * gi.naturalWidth / gi.naturalHeight;
      g.save();
      g.translate(w / 2, h - 60);
      const s = GINO.salto > 0 ? Math.abs(Math.sin(GINO.salto * Math.PI * 3)) * 20 : 0;
      g.translate(0, -s);
      g.rotate(GINO.trema > 0 ? Math.sin(stato.tempo * 60) * 0.1 : Math.sin(stato.tempo * 1.5) * 0.08);
      g.drawImage(gi, -ww / 2, -hh / 2, ww, hh);
      g.restore();
    }
    g.restore();
  }

  // ================================================================ pannelli HTML
  function pannelloAperto() { return pannello.classList.contains('visibile'); }
  function mostraPannello(html) {
    if (stato.test) return;
    pannello.innerHTML = html;
    pannello.classList.add('visibile');
    const primo = pannello.querySelector('[data-primo]') || pannello.querySelector('button');
    if (primo && !touch) primo.focus({ preventScroll: true });
  }
  function nascondiPannello() {
    pannello.classList.remove('visibile');
    pannello.innerHTML = '';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  const img = (nome, classe = '') => {
    const src = nome === 'gino' ? ASSETS + 'gino/gino.png' : ASSETS + 'tino/tino-' + nome + '.png';
    return `<img src="${src}" alt="${nome === 'gino' ? 'Gino' : 'Tino'}" class="${classe}">`;
  };

  function testoComandi() {
    if (touch) {
      return `<div class="comandi">
        <p>Tocca la <b>metà sinistra</b> o la <b>metà destra</b> dello schermo per i flipper (anche tutti e due insieme).</p>
        <p>Con la ghianda nel corridoio: <b>tieni premuto</b> e lascia per lanciarla. Una <b>strisciata veloce in su</b> scuote il tavolo (non troppo: tilt!).</p>
      </div>`;
    }
    return `<div class="comandi">
      <p>Flipper: <kbd>←</kbd> <kbd>→</kbd> (oppure <kbd>Z</kbd> <kbd>/</kbd>, <kbd>A</kbd> <kbd>D</kbd>, i due <kbd>Maiusc</kbd>), o tasto sinistro e destro del mouse.</p>
      <p>Lancio: tieni premuto <kbd>↓</kbd> o <kbd>Spazio</kbd> e lascia. Scossone: <kbd>↑</kbd> (non troppo: tilt!).</p>
      <p><kbd>P</kbd> pausa · <kbd>M</kbd> suoni · <kbd>N</kbd> musica</p>
    </div>`;
  }
  function guida() {
    return `<div class="guida">
      <span><b>Corsie T·I·N·O</b>: accendile tutte per il bonus ×2… ×6. I flipper spostano le lettere.</span>
      <span><b>Gino</b>: colpiscilo per accendere uno scenario, poi tira nella <b>Tana</b>.</span>
      <span><b>Bersagli</b>: abbattili tutti e tre per aprire la Tana. Tre ghiande nella Tana = <b>multiball</b>!</span>
      <span><b>Jackpot</b>: nel multiball prendi la <b>rampa</b>; dopo tre, il super jackpot è su Gino.</span>
      <span><b>Combo</b>: rampa, orbita, Tana e Gino uno dopo l'altro: campo ×2 e ×3.</span>
      <span><b>Scenari</b>: sei, ognuno coi suoi colori e le sue regole. L'ultimo è la gran festa di Gino!</span>
    </div>`;
  }
  function tabellaClassifica() {
    if (!classifica.length) return '';
    return `<table class="classifica">${classifica.map((c, i) => `<tr class="${i === ultimaPosizione ? 'nuovo' : ''}"><td>${i + 1}.</td><td>${numero(c.punti)}</td><td>${c.data}</td></tr>`).join('')}</table>`;
  }

  function pannelloMenu() {
    return `<div class="riquadro">
      <div class="ritratti">${img('normale', 'salta')}${img('gino', 'oscilla')}</div>
      <h1>Tino Flipper</h1>
      <p class="sotto">Notte al neon nel bosco</p>
      <p>Bumper, rampe, multiball e jackpot: tieni in gioco la ghianda più che puoi!</p>
      <div class="scelte">
        <button class="bottone" data-azione="gioca" data-primo>Gioca</button>
      </div>
      ${classifica.length ? '<h3>I migliori punteggi</h3>' + tabellaClassifica() : ''}
      <h3>Come si gioca</h3>
      ${guida()}
      ${testoComandi()}
    </div>`;
  }
  function pannelloPausa() {
    return `<div class="riquadro">
      <div class="ritratti">${img('normale')}</div>
      <h2>Pausa</h2>
      <p>${numero(stato.punti)} punti · palla ${stato.palla} di ${stato.palleTotali}</p>
      <div class="scelte">
        <button class="bottone" data-azione="riprendi" data-primo>Continua</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
      ${testoComandi()}
    </div>`;
  }
  function pannelloFine() {
    const nuovo = ultimaPosizione === 0;
    return `<div class="riquadro">
      <div class="ritratti">${img('ko')}${img('gino', 'caduto')}</div>
      <h2>${nuovo ? 'Nuovo record!' : 'Partita finita'}</h2>
      <p><b>${numero(stato.punti)}</b> punti</p>
      ${ultimaPosizione >= 0 ? tabellaClassifica() : `<p class="record">Record: ${numero(record())}</p>`}
      <div class="scelte">
        <button class="bottone" data-azione="gioca" data-primo>Ancora una!</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  pannello.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-azione]');
    if (!btn) return;
    switch (btn.dataset.azione) {
      case 'gioca': iniziaPartita('gioco'); break;
      case 'riprendi': riprendi(); break;
      case 'menu': vaiAlMenu(); break;
      default: break;
    }
  });
  $('#btn-pausa').addEventListener('click', (e) => {
    e.currentTarget.blur();
    if (stato.fase === 'pausa') riprendi();
    else pausa();
  });
  $('#btn-audio').addEventListener('click', (e) => { e.currentTarget.blur(); cambiaAudio(); });
  $('#btn-musica').addEventListener('click', (e) => { e.currentTarget.blur(); cambiaMusica(); });

  let ultimoTabellone = '';
  function aggiornaTabellone() {
    const punti = stato.modo === 'gioco' ? numero(stato.punti) : numero(record());
    const palle = stato.modo === 'gioco' ? Math.max(0, stato.palleTotali - stato.palla + (stato.fase === 'finita' ? 0 : 1)) : 0;
    const chiave = punti + '|' + palle + '|' + stato.palleExtra;
    if (chiave === ultimoTabellone) return;
    ultimoTabellone = chiave;
    elPunti.textContent = punti;
    elPalle.innerHTML = '<i></i>'.repeat(palle) + (stato.palleExtra ? `<span class="piu">+${stato.palleExtra}</span>` : '');
  }

  // ================================================================ avvio
  document.body.classList.toggle('muto', muto);
  document.body.classList.toggle('senza-musica', musicaSpenta);
  ridimensiona();
  vaiAlMenu();

  let ultimo = performance.now();
  function ciclo(ora) {
    const dt = clamp((ora - ultimo) / 1000, 0, 0.05);
    ultimo = ora;
    if (!stato.test) aggiorna(dt);
    disegna(ora / 1000);
    requestAnimationFrame(ciclo);
  }
  requestAnimationFrame(ciclo);

  // per le prove automatiche
  window.tinoFlipper = {
    stato, iniziaPartita, aggiorna, lancia, premiFlipper, premiLancio, scossone, pilotaIA, provaColpo, ia,
    avviaScenario, avviaMultiball, flipper, segmenti, cerchi, nuovaPalla,
    FISICA, FLIPPER, LANCIO, PUNTI, SCENARI, FESTA, IA, TEMI, BUMPERS, BERSAGLI, GINO, TANA, RAMPA,
    costanti: { W, H, R, CX },
  };
})();
