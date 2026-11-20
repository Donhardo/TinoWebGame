/*
 * Speedtino: il gioco (disegno in stile Amiga, telecamera, morti e ripartenza,
 * comandi, pannelli, partita dimostrativa). La fisica è in fisica.js, le stanze
 * in stanze.js, i suoni in suoni.js.
 */
(() => {
  'use strict';
  const F = window.SpeedtinoFisica;
  const { STANZE, TAPPE, STANZE_PER_TAPPA } = window.SpeedtinoStanze;
  const SOLUZIONI = window.SpeedtinoSoluzioni || {};
  const TRATTO = window.SpeedtinoTratto || 0.1;
  const A = window.SpeedtinoSuoni;
  const { T, CORPO } = F;

  const H = 180;               // altezza dello schermo logico
  let W = 320;                 // larghezza: da 320 a 400 secondo lo schermo
  const DT = 1 / 120;
  const PX_METRO = 16;
  const RINASCITA = 0.55;      // secondi tra la morte e la ripartenza

  // ---------- salvataggi ----------
  const PREF = 'speedtino:';
  const leggi = (k, d) => { try { const v = localStorage.getItem(PREF + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  const scrivi = (k, v) => { try { localStorage.setItem(PREF + k, JSON.stringify(v)); } catch (e) { /* niente */ } };

  // ---------- palette delle tappe (al massimo 32 colori l'una) ----------
  // oro (pioli), rosso e i personaggi sono uguali in tutte le tappe
  const COMUNI = { oro: ['#7a4a00', '#ffd23c', '#fff3b0'], rosso: '#e0303a' };
  const PALETTE = {
    bosco: {
      cielo: ['#0b0a3a', '#1a1a6e', '#2c3a9e', '#4a5fc8', '#7a6fd0', '#b85fb8', '#e8689a', '#ff8a6a', '#ffb45a', '#ffd88a'],
      monti: ['#3a1f5e', '#5a2f7a'], alberi: ['#1a1240', '#2a1d5a'], forma: 'alberi',
      terra: ['#1c0d07', '#2a140c', '#4a2414', '#6e3a1c'],
      erba: ['#2f6e2a', '#5aa83a', '#9be05a'],
      mattoni: ['#5e2412', '#93451f', '#c86a3a'],
      punte: ['#ffffff', '#c8d0e8', '#7880a8', '#3a3f62'],
      stelle: { col: '#ffffff', n: 26, alto: 30 }, astro: 'tramonto',
      musica: [0, 150]
    },
    grotte: {
      cielo: ['#04030c', '#08061a', '#0d0a28', '#130f38', '#1a1448', '#221a58', '#2b2068', '#352878', '#3f3088', '#4a3898'],
      monti: ['#1a1440', '#2a2060'], alberi: ['#0f2a48', '#2a7ab0'], forma: 'cristalli',
      soffitto: ['#0a0818', '#1a1440'],
      terra: ['#07070f', '#14142a', '#2a2a48', '#44446a'],
      erba: ['#0e5a5a', '#1aa8a0', '#7af0e0'],
      mattoni: ['#1e2448', '#34407a', '#5a6ab0'],
      punte: ['#ffffff', '#b0f0ff', '#5ab0d0', '#1e4a6a'],
      stelle: { col: '#7af0e0', n: 34, alto: 150, brilla: true }, astro: null,
      musica: [-2, 146]
    },
    deserto: {
      cielo: ['#1a4a8a', '#2a6aa8', '#3a8ac0', '#5aa8d0', '#7ac0d8', '#9ad0d8', '#b8e0d8', '#d8ecd0', '#f0e8b8', '#ffe0a0'],
      monti: ['#c8783a', '#e8a05a'], alberi: ['#8a4a2a', '#c0784a'], forma: 'colonne',
      terra: ['#3a1a0a', '#7a4a1a', '#b8783a', '#e0a860'],
      erba: ['#c8903a', '#f0c060', '#fff0a0'],
      mattoni: ['#7a3a1a', '#b86a2a', '#e8a050'],
      punte: ['#5a2020', '#8a3030', '#c04a3a', '#3a1010'],
      stelle: null, astro: 'sole',
      musica: [3, 156]
    },
    cime: {
      cielo: ['#02030a', '#050818', '#0a1028', '#0f1838', '#142048', '#1a2a5a', '#22346a', '#2c407a', '#384c88', '#465a96'],
      monti: ['#1a2440', '#d0e0f0'], cimaMonti: 6, alberi: ['#081420', '#12283a'], forma: 'pini',
      terra: ['#05060c', '#101420', '#262c40', '#3e4660'],
      erba: ['#7a90b8', '#c8d8f0', '#ffffff'],
      mattoni: ['#2a5a8a', '#4a8ac0', '#a0d8f8'],
      punte: ['#ffffff', '#c8d0e8', '#7880a8', '#3a3f62'],
      stelle: { col: '#ffffff', n: 60, alto: 90, brilla: true }, astro: 'luna',
      musica: [5, 160]
    }
  };
  for (const [id, P] of Object.entries(PALETTE)) Object.assign(P, COMUNI, { id });
  let PAL = PALETTE.bosco;     // la palette con cui si sta disegnando
  const tappaDi = n => TAPPE[n % TAPPE.length];
  const paletteDi = n => PALETTE[tappaDi(n).id];

  // ---------- Tino a pixel (dai bozzetti, versione B1) ----------
  const COLORI = {
    O: '#e8763a', o: '#a9471f', C: '#f6d6a8', K: '#1b0f0c', T: '#5e2412', t: '#93451f',
    R: '#e0303a', Y: '#ffd23c', M: '#e83ab8', W: '#ffffff', D: '#3a1408', V: '#6cc04a', P: '#9b4ad8',
    r: '#8e1a22', m: '#a41f7e', p: '#5e2690',
    G: '#c8935a', g: '#8a5a2e', N: '#6a2a22', H: '#5c3418'
  };
  const TINO = {
    gambe: [10, 12, 15, 17], coloreGambe: 'o',
    righe: [
      '..DDDD..............',
      '.DTTtTD.............',
      'DTtTTTTD............',
      'DTTTtTTD............',
      'DtTTTtTTD..O.....O..',
      '.DTTtTTTDOOOOOOOOOO.',
      '.DTtTTTTDOOOOOOKOKO.',
      '..DTTtTTDOOOOOOKOKOO',
      '...DTTtDKYKWKVKWKYKO',
      '...DTtTDOORCCMCCPOO.',
      '....DTTDOOrCCmCCpOO.',
      '.....DD.oOOCCCCCOOo.'
    ]
  };
  function preparaSprite(def) {
    const h = def.righe.length, w = def.righe[0].length;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    const pix = [];
    def.righe.forEach((r, y) => {
      for (let x = 0; x < w; x++) {
        const k = r[x];
        if (k === '.') continue;
        c.fillStyle = COLORI[k]; c.fillRect(x, y, 1, 1);
        pix.push({ x, y, col: COLORI[k] });
      }
    });
    return { cv, w, h, gambe: def.gambe, coloreGambe: COLORI[def.coloreGambe], pix };
  }
  // Gino (dai bozzetti): molto più grande di Tino
  const GINO = {
    gambe: [8, 9, 15, 16], coloreGambe: 'H',
    righe: [
      '.......GG........GG.....',
      '......GGGG......GGGG....',
      '......GGGGGGGGGGGGGG....',
      '.....GGGGGGGGGGGGGGGG...',
      '....gGGGGGGGGGGGGGGGGG..',
      '....gGGGGGGGGGGGGGGGGG..',
      '....gGGGGGGGGGGGGGGGGG..',
      '....gGGGGGGGGKGGGGKGGG..',
      '....gGGGGGGGGKGGGGKGGG..',
      '....gGGGGGGGGGGGGGGGGG..',
      '....gGGGGGGGGCCNNCCCCG..',
      '....gGGGGGGGCCCNNCCCCC..',
      '....gGGGGGGGCCCCCCCCCC..',
      '....gGGGGGGGCCCWWCCCCC..',
      '.....GGGGGGGGCCWWCCCC...',
      '.....GGGGGGGGGCWWCCCG...',
      '.....gGGGGGGGGGWWGGGG...',
      '.....gGGGGGGGGGGGGGGG...',
      '.....gGGGGGCCCHHHGGGG...',
      '.....gGGGGCCCCHHHCHHH...',
      '.g...gGGGCCCCCCHCCHHH...',
      '.g...gGGGCCCCCCCCCCHG...',
      'g....gGGGCCCCCCCCCCGG...',
      'g....gGGGCCCCCCCCCCGG...',
      'g....gGGGCCCCCCCCCCGG...',
      '.g...gGGGCCCCCCCCCCGG...',
      '.g...gGGGGCCCCCCCCGG....',
      '..ggg..ggggCCCCCCgg.....'
    ]
  };
  const SPR_TINO = preparaSprite(TINO);
  const SPR_GINO = preparaSprite(GINO);

  // ---------- tela ----------
  const tela = document.getElementById('campo');
  const ctx = tela.getContext('2d');
  const palco = document.getElementById('palco');
  let scala = 1;

  function adatta() {
    const r = palco.getBoundingClientRect();
    const aw = Math.max(100, r.width), ah = Math.max(100, r.height);
    W = Math.max(320, Math.min(400, Math.round(H * aw / ah / 2) * 2));
    scala = Math.min(aw / W, ah / H);
    if (scala >= 2 && Math.floor(scala) / scala > 0.88) scala = Math.floor(scala);
    tela.width = W; tela.height = H;
    tela.style.width = Math.floor(W * scala) + 'px';
    tela.style.height = Math.floor(H * scala) + 'px';
    ctx.imageSmoothingEnabled = false;
    preparaSfondo();
  }

  // ---------- sfondo di ogni tappa (cielo a fasce, monti, bosco) ----------
  const sfondi = new Map();
  const LARGO_STRISCIA = 640;
  function preparaSfondo() { sfondi.clear(); }
  function sfondoDi(P) {
    if (sfondi.has(P.id)) return sfondi.get(P.id);
    const cielo = document.createElement('canvas'); cielo.width = W; cielo.height = H;
    const c = cielo.getContext('2d');
    const fascia = 13, C = P.cielo;
    for (let y = 0; y < H; y++) {
      const f = y / fascia, i = Math.min(C.length - 1, Math.floor(f)), fr = f - i;
      for (let x = 0; x < W; x++) {
        const dopo = (fr > 0.6 && (x + y) % 2 === 0) || fr > 0.85;
        c.fillStyle = C[Math.min(C.length - 1, i + (dopo ? 1 : 0))];
        c.fillRect(x, y, 1, 1);
      }
    }
    const stelle = [];
    if (P.stelle) {
      for (let i = 0; i < P.stelle.n; i++) {
        const x = (i * 97 + 13 + (i * i) % 7) % W, y = (i * 53 + (i % 3) * 11) % P.stelle.alto;
        if (P.stelle.brilla && i % 3 === 0) stelle.push({ x, y, f: i * 0.7 });
        else { c.fillStyle = P.stelle.col; c.fillRect(x, y, 1, 1); }
      }
    }
    if (P.astro === 'tramonto') {
      // sole che tramonta, a righe
      const sx = Math.round(W * 0.7), sy = 118;
      for (let y = -16; y <= 16; y++) for (let x = -16; x <= 16; x++) {
        const d = x * x + y * y;
        if (d > 256) continue;
        if (y > 2 && (y % 4 === 0 || (y > 8 && y % 3 === 0))) continue;
        c.fillStyle = d > 180 ? '#ffb45a' : '#fff3b0';
        c.fillRect(sx + x, sy + y, 1, 1);
      }
    } else if (P.astro === 'sole') {
      // sole alto del deserto con l'alone a retino
      const sx = Math.round(W * 0.76), sy = 34;
      for (let y = -22; y <= 22; y++) for (let x = -22; x <= 22; x++) {
        const d = x * x + y * y;
        if (d > 484) continue;
        if (d > 220) { if ((x + y) % 2 === 0) { c.fillStyle = '#fff0c0'; c.fillRect(sx + x, sy + y, 1, 1); } continue; }
        c.fillStyle = d > 150 ? '#ffe070' : '#fffbe0';
        c.fillRect(sx + x, sy + y, 1, 1);
      }
    } else if (P.astro === 'luna') {
      // falce di luna
      const sx = Math.round(W * 0.78), sy = 34;
      for (let y = -11; y <= 11; y++) for (let x = -11; x <= 11; x++) {
        if (x * x + y * y > 121 || (x - 5) * (x - 5) + (y + 3) * (y + 3) < 90) continue;
        c.fillStyle = x < -6 ? '#c8d8f0' : '#fffbe0';
        c.fillRect(sx + x, sy + y, 1, 1);
      }
    }
    const sf = {
      cielo, stelle,
      monti: striscia(P.monti, P.forma === 'colonne' ? 64 : 74, P.forma === 'colonne' ? [[10, 2, 0.8], [5, 3, 2.2]] : [[16, 2, 0.3], [9, 5, 1.7], [4, 11, 0.2]], 4, null, P.cimaMonti || 2),
      bosco: striscia(P.alberi, P.forma === 'colonne' ? 26 : 40, [[6, 3, 2.1], [3, 7, 0.4]], 5, P.forma, 2),
      soffitto: P.soffitto ? striscia(P.soffitto, 18, [[6, 3, 1.1], [3, 9, 0.5]], 4, 'cristalli', 2) : null
    };
    sfondi.set(P.id, sf);
    return sf;
  }
  function striscia(colori, base, onde, blocco, forma, cima) {
    const cv = document.createElement('canvas'); cv.width = LARGO_STRISCIA; cv.height = H;
    const c = cv.getContext('2d');
    for (let x = 0; x < LARGO_STRISCIA; x += blocco) {
      let h = base;
      onde.forEach(([a, k, f]) => { h += a * Math.sin((x / LARGO_STRISCIA) * Math.PI * 2 * k + f); });
      h = Math.round(h / 2) * 2;
      c.fillStyle = colori[0]; c.fillRect(x, H - h, blocco, h);
      c.fillStyle = colori[1]; c.fillRect(x, H - h, blocco, cima);
      if (cima > 2) { c.fillStyle = colori[0]; for (let k = 0; k < blocco; k += 2) c.fillRect(x + k, H - h + cima - 1 - ((x + k) % 3), 1, 2); }
      const b = x / blocco;
      if (forma === 'alberi' && b % 3 === 0) {
        const alto = 12 + ((x * 7) % 9);
        for (let k = 0; k < alto; k++) {
          const lw = Math.max(1, Math.floor((alto - k) / 2.2));
          c.fillStyle = colori[k % 4 === 0 ? 1 : 0];
          c.fillRect(x + 2 - lw, H - h - k, lw * 2 + 1, 1);
        }
      } else if (forma === 'pini' && b % 3 === 0) {
        const alto = 16 + ((x * 7) % 12);
        for (let k = 0; k < alto; k++) {
          const lw = Math.floor((alto - k) / 3) + ((alto - k) % 5 < 2 ? 1 : 0);
          c.fillStyle = colori[k % 5 === 4 ? 1 : 0];
          c.fillRect(x + 2 - lw, H - h - k, lw * 2 + 1, 1);
        }
      } else if (forma === 'cristalli' && b % 4 === 1) {
        const alto = 8 + ((x * 13) % 15);
        for (let k = 0; k < alto; k++) {
          const lw = Math.floor((alto - k) / 4);
          c.fillStyle = colori[0]; c.fillRect(x + 2 - lw, H - h - k, lw * 2 + 1, 1);
          c.fillStyle = colori[1]; c.fillRect(x + 2 - lw, H - h - k, 1, 1);
        }
      } else if (forma === 'colonne' && b % 9 === 0) {
        // rovine: colonne intere e spezzate
        const alto = (b % 2 ? 34 : 18) + ((x * 7) % 9);
        c.fillStyle = colori[0]; c.fillRect(x, H - h - alto, 7, alto);
        c.fillStyle = colori[1]; c.fillRect(x + 1, H - h - alto, 1, alto); c.fillRect(x + 4, H - h - alto, 1, alto);
        if (b % 2) { c.fillStyle = colori[0]; c.fillRect(x - 2, H - h - alto - 3, 11, 3); c.fillStyle = colori[1]; c.fillRect(x - 2, H - h - alto - 3, 11, 1); }
        else { c.fillStyle = colori[0]; c.fillRect(x + 5, H - h - alto - 3, 2, 3); }
      }
    }
    return cv;
  }
  function strato(cv, vel, capovolto) {
    const off = ((stato.cam * vel) % LARGO_STRISCIA + LARGO_STRISCIA) % LARGO_STRISCIA;
    for (let x = -off; x < W; x += LARGO_STRISCIA) {
      if (capovolto) { ctx.save(); ctx.scale(1, -1); ctx.drawImage(cv, Math.round(x), -H); ctx.restore(); }
      else ctx.drawImage(cv, Math.round(x), 0);
    }
  }
  function disegnaSfondo(P) {
    const sf = sfondoDi(P);
    ctx.drawImage(sf.cielo, 0, 0);
    for (const q of sf.stelle) {
      const v = Math.sin(stato.tempo * 3 + q.f);
      if (v < -0.3) continue;
      ctx.fillStyle = P.stelle.col; ctx.fillRect(q.x, q.y, 1, 1);
      if (v > 0.8) { ctx.fillRect(q.x - 1, q.y, 3, 1); ctx.fillRect(q.x, q.y - 1, 1, 3); }
    }
    if (sf.soffitto) strato(sf.soffitto, 0.2, true);
    strato(sf.monti, 0.12);
    strato(sf.bosco, 0.35);
  }

  // ---------- caselle disegnate una volta (8 × 8) ----------
  const cacheCaselle = new Map();
  function hash(c, r) { let h = (c * 374761393 + r * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; }
  function casellaTerra(su, sx, dx, giu, v) {
    const chiave = PAL.id + 't' + su + sx + dx + giu + v;
    if (cacheCaselle.has(chiave)) return cacheCaselle.get(chiave);
    const cv = document.createElement('canvas'); cv.width = T; cv.height = T;
    const c = cv.getContext('2d');
    const [nero, scuro, medio, chiaro] = PAL.terra;
    c.fillStyle = medio; c.fillRect(0, 0, T, T);
    // grana a retino
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const h = hash(x + v * 17, y + v * 31) % 23;
      if (h === 0) { c.fillStyle = chiaro; c.fillRect(x, y, 1, 1); }
      else if (h < 4 || (y > 4 && (x + y) % 2 === 0 && h < 9)) { c.fillStyle = scuro; c.fillRect(x, y, 1, 1); }
    }
    if (v === 2) { c.fillStyle = PAL.punte[2]; c.fillRect(2, 3, 3, 2); c.fillStyle = PAL.punte[1]; c.fillRect(2, 3, 2, 1); }
    if (sx) { c.fillStyle = nero; c.fillRect(0, 0, 1, T); c.fillStyle = scuro; c.fillRect(1, 0, 1, T); }
    if (dx) { c.fillStyle = nero; c.fillRect(T - 1, 0, 1, T); }
    if (giu) { c.fillStyle = nero; c.fillRect(0, T - 1, T, 1); c.fillStyle = scuro; c.fillRect(0, T - 2, T, 1); }
    if (su) {
      const [es, em, ec] = PAL.erba;
      c.fillStyle = em; c.fillRect(0, 0, T, 3);
      c.fillStyle = ec; c.fillRect(0, 0, T, 1);
      c.fillStyle = es;
      for (let x = 0; x < T; x++) if ((x + v) % 3 !== 0) c.fillRect(x, 3, 1, 1);
      if (v === 1) { c.fillStyle = ec; c.fillRect(5, 0, 1, 1); c.fillRect(2, 0, 1, 1); }
    }
    cacheCaselle.set(chiave, cv);
    return cv;
  }
  function casellaMattoni(su, v) {
    const chiave = PAL.id + 'm' + su + v;
    if (cacheCaselle.has(chiave)) return cacheCaselle.get(chiave);
    const cv = document.createElement('canvas'); cv.width = T; cv.height = T;
    const c = cv.getContext('2d');
    const [scuro, medio, chiaro] = PAL.mattoni;
    c.fillStyle = scuro; c.fillRect(0, 0, T, T);
    c.fillStyle = medio;
    const sh = v % 2 ? 4 : 0;
    c.fillRect(0, 0, T, 3); c.fillRect(0, 4, T, 3);
    c.fillStyle = scuro; c.fillRect((sh + 3) % T, 0, 1, 3); c.fillRect((sh + 7) % T, 4, 1, 3);
    c.fillStyle = chiaro; c.fillRect(0, 0, 3, 1); c.fillRect(4, 4, 3, 1);
    if (su) { c.fillStyle = PAL.erba[1]; c.fillRect(0, 0, T, 1); }
    cacheCaselle.set(chiave, cv);
    return cv;
  }
  function casellaPunte(k) {
    const chiave = PAL.id + 'p' + k;
    if (cacheCaselle.has(chiave)) return cacheCaselle.get(chiave);
    const cv = document.createElement('canvas'); cv.width = T; cv.height = T;
    const c = cv.getContext('2d');
    const [b, cc, m, s] = PAL.punte;
    // due punte per casella, disegnate verso l'alto e poi girate
    const punta = (x0) => {
      for (let k2 = 0; k2 < 4; k2++) {
        const hw = k2 >> 1;
        c.fillStyle = k2 === 0 ? b : (k2 < 2 ? cc : m);
        c.fillRect(x0 + 1 - hw, 4 + k2, hw * 2 + 1, 1);
      }
      c.fillStyle = s; c.fillRect(x0 + 1 + 1, 6, 1, 2);
    };
    punta(0); punta(4);
    if (k === '^') { cacheCaselle.set(chiave, cv); return cv; }
    const g = document.createElement('canvas'); g.width = T; g.height = T;
    const gc = g.getContext('2d');
    gc.translate(T / 2, T / 2);
    gc.rotate({ v: Math.PI, '>': Math.PI / 2, '<': -Math.PI / 2 }[k]);
    gc.drawImage(cv, -T / 2, -T / 2);
    cacheCaselle.set(chiave, g);
    return g;
  }

  // ---------- stato ----------
  const stato = {
    modo: 'menu',        // menu | gioco | pausa
    demo: true,
    m: null, p: null,
    cam: 0, scossa: 0, lampo: 0,
    stanzeFatte: 0, ultime: [],
    cp: 0,               // stanza dell'ultimo punto sicuro
    morti: 0, metri: 0, ghiande: 0,
    record: leggi('record', 0), mortiTotali: leggi('morti-totali', 0),
    recordSuonato: false,
    rinascita: 0, particelle: [], polvere: [],
    tempo: 0, tempoCorsa: 0,
    avviso: null,        // { testo, t }
    vistaStanza: -1,
    gen: { tappa: 0, n: 0 },   // generatore: tappa e stanze già messe nella tappa
    inizioTappa: [0],          // x (pixel) dove comincia ogni tappa
    tappa: 0,                  // tappa in cui si trova Tino
    tappaMorti: 0, tappaTempo: 0,
    liberati: leggi('gino-liberato', 0), tappaMax: leggi('tappa-max', 0),
    dem: null, test: false
  };

  function nuovaCorsa(demo) {
    stato.demo = demo;
    stato.m = F.nuovoMondo();
    stato.stanzeFatte = 0; stato.ultime = [];
    stato.gen = { tappa: 0, n: 0 }; stato.inizioTappa = [0];
    stato.tappa = 0; stato.tappaMorti = 0; stato.tappaTempo = 0;
    musicaTappa(0);
    aggiungiStanza();
    while (stato.m.larghezza * T < 900) aggiungiStanza();
    const s0 = stato.m.stanze[0];
    stato.p = F.nuovoGiocatore(s0.spawn.x, s0.spawn.y);
    stato.cp = 0; stato.morti = 0; stato.metri = 0; stato.ghiande = 0;
    stato.cam = 0; stato.rinascita = 0; stato.particelle = []; stato.polvere = [];
    stato.tempoCorsa = 0; stato.recordSuonato = false; stato.vistaStanza = 0;
    stato.dem = demo ? { stanza: 0, passo: 0, prima: { salto: 0, gancio: 0 } } : null;
    if (demo) preparaDemoStanza(0);
    tasti.premutoSalto = false; tasti.premutoGancio = false;
  }

  function scegliStanza() {
    const g = stato.gen;
    if (stato.stanzeFatte === 0) return STANZE.find(s => s.id === 'via');
    if (g.n >= STANZE_PER_TAPPA) return STANZE.find(s => s.id === 'gabbia');
    // il livello sale nel corso della tappa; dal secondo giro tutto è più difficile
    const giro = Math.floor(g.tappa / TAPPE.length), liv = tappaDi(g.tappa).livelli;
    const lo = Math.min(5, liv[0] + giro * 2), hi = Math.min(5, liv[1] + giro * 2);
    const max = Math.min(hi, lo + Math.floor(g.n / 2));
    let cand = STANZE.filter(s => s.livello >= 1 && s.livello <= max && !stato.ultime.includes(s.id));
    if (!cand.length) cand = STANZE.filter(s => s.livello >= 1 && s.livello <= max);
    const peso = s => (s.livello === max ? 4 : s.livello === max - 1 ? 2 : s.livello >= lo - 1 ? 1 : 0.25);
    let tot = cand.reduce((a, s) => a + peso(s), 0), r = Math.random() * tot;
    for (const s of cand) { r -= peso(s); if (r <= 0) return s; }
    return cand[cand.length - 1];
  }
  function aggiungiStanza() {
    const def = scegliStanza();
    const st = F.aggiungiStanza(stato.m, def, def.id);
    st.tappa = stato.gen.tappa;
    if (def.id === 'gabbia') {
      stato.gen.tappa++; stato.gen.n = 0;
      stato.inizioTappa.push((st.x0 + st.larga) * T);
    } else {
      stato.gen.n++;
      stato.ultime.push(def.id);
      if (stato.ultime.length > 4) stato.ultime.shift();
    }
    stato.stanzeFatte++;
  }
  function musicaTappa(n) {
    const [semi, bpm] = paletteDi(n).musica;
    A.tappa(semi, bpm + Math.floor(n / TAPPE.length) * 6);
  }
  const nomeTappa = n => 'TAPPA ' + (n + 1);
  const tempoTesto = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const stanzaDi = x => stato.m.colonne[Math.max(0, Math.min(stato.m.colonne.length - 1, Math.floor(x / T)))];

  // ---------- comandi ----------
  const tasti = { sx: 0, dx: 0, su: false, giu: false, salto: false, gancio: false, premutoSalto: false, premutoGancio: false, suSalta: false, ordine: 0 };
  const TASTI_SALTO = ['Space', 'KeyZ', 'KeyK'];
  const TASTI_GANCIO = ['KeyX', 'KeyJ', 'ShiftLeft', 'ShiftRight', 'KeyL'];
  function premi(azione, giu) {
    if (azione === 'sx' || azione === 'dx') { tasti[azione] = giu ? ++tasti.ordine : 0; return; }
    if (azione === 'su') {
      // ↑ salta quando Tino non è appeso, altrimenti accorcia la corda
      if (giu && !tasti.su && stato.p && !stato.p.gancio) { tasti.premutoSalto = true; tasti.suSalta = true; }
      if (!giu) tasti.suSalta = false;
      tasti.su = giu; return;
    }
    if (azione === 'giu') { tasti.giu = giu; return; }
    if (azione === 'salto') { if (giu && !tasti.salto) tasti.premutoSalto = true; tasti.salto = giu; return; }
    if (azione === 'gancio') { if (giu && !tasti.gancio) tasti.premutoGancio = true; tasti.gancio = giu; }
  }
  function comandi() {
    const sx = tasti.sx || tasti.dx ? (tasti.dx > tasti.sx ? 1 : -1) : 0;
    const k = {
      sx, su: tasti.su, giu: tasti.giu,
      salto: tasti.salto || tasti.suSalta, saltoPremuto: tasti.premutoSalto,
      gancio: tasti.gancio, gancioPremuto: tasti.premutoGancio
    };
    tasti.premutoSalto = false; tasti.premutoGancio = false;
    return k;
  }

  addEventListener('keydown', e => {
    if (e.repeat && !['ArrowLeft', 'ArrowRight'].includes(e.code)) { if (stato.modo === 'gioco') e.preventDefault(); return; }
    A.avvia();
    if (e.code === 'KeyP' || e.code === 'Escape') { if (stato.modo === 'gioco') pausa(); else if (stato.modo === 'pausa') riprendi(); e.preventDefault(); return; }
    if (e.code === 'KeyM') { cambiaMuto(); return; }
    if (e.code === 'KeyN') { cambiaMusica(); return; }
    if (e.code === 'KeyR' && stato.modo === 'gioco' && !stato.p.morto) { muori('ripartenza'); return; }
    if (stato.modo === 'menu' && (e.code === 'Enter' || e.code === 'Space') && !e.target.closest('button')) { gioca(); e.preventDefault(); return; }
    const a = azioneDi(e.code);
    if (a) { premi(a, true); if (stato.modo === 'gioco') e.preventDefault(); }
  });
  addEventListener('keyup', e => { const a = azioneDi(e.code); if (a) premi(a, false); });
  addEventListener('blur', () => { lasciaTutto(); if (stato.modo === 'gioco') pausa(); });
  function azioneDi(code) {
    if (code === 'ArrowLeft' || code === 'KeyA') return 'sx';
    if (code === 'ArrowRight' || code === 'KeyD') return 'dx';
    if (code === 'ArrowUp' || code === 'KeyW') return 'su';
    if (code === 'ArrowDown' || code === 'KeyS') return 'giu';
    if (TASTI_SALTO.includes(code)) return 'salto';
    if (TASTI_GANCIO.includes(code)) return 'gancio';
    return null;
  }
  function lasciaTutto() { for (const a of ['sx', 'dx', 'su', 'giu', 'salto', 'gancio']) premi(a, false); }

  // comandi touch: ogni dito è sul pulsante che tocca (anche scivolando da uno all'altro)
  const touch = document.getElementById('touch');
  const dita = new Map();
  function pulsanteSotto(x, y) {
    const el = document.elementFromPoint(x, y);
    return el && el.closest ? el.closest('[data-azione]') : null;
  }
  function aggiornaDita() {
    const attive = new Set([...dita.values()].filter(Boolean).map(b => b.dataset.azione));
    for (const b of touch.querySelectorAll('[data-azione]')) {
      const a = b.dataset.azione, on = attive.has(a);
      b.classList.toggle('premuto', on);
      const ora = a === 'sx' || a === 'dx' ? tasti[a] > 0 : a === 'su' ? tasti.su : tasti[a];
      if (on !== !!ora) premi(a, on);
    }
  }
  touch.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    e.preventDefault(); A.avvia();
    document.body.classList.add('con-dita');
    dita.set(e.pointerId, pulsanteSotto(e.clientX, e.clientY));
    aggiornaDita();
  });
  addEventListener('pointermove', e => { if (dita.has(e.pointerId)) { dita.set(e.pointerId, pulsanteSotto(e.clientX, e.clientY)); aggiornaDita(); } });
  const togliDito = e => { if (dita.delete(e.pointerId)) aggiornaDita(); };
  addEventListener('pointerup', togliDito);
  addEventListener('pointercancel', togliDito);
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('con-dita');

  // ---------- partita dimostrativa (le soluzioni del giocatore simulato) ----------
  const AZIONI_DEMO = {};
  for (const [id, s] of Object.entries(SOLUZIONI)) {
    AZIONI_DEMO[id] = s.split(' ').map(t => ({ sx: +t[0] - 1, salto: +t[1], gancio: +t[2], su: +t[3], giu: +t[4] }));
  }
  const PASSI_TRATTO = Math.round(TRATTO / DT);
  function preparaDemoStanza(i) {
    const st = stato.m.stanze[i];
    stato.p = F.nuovoGiocatore(st.spawn.x, st.spawn.y);
    for (let k = 0; k < 3; k++) F.passo(stato.m, stato.p, { sx: 0 }, DT);
    stato.dem = { stanza: i, passo: 0, prima: { salto: 0, gancio: 0 } };
  }
  function comandiDemo() {
    const d = stato.dem, st = stato.m.stanze[d.stanza];
    const az = AZIONI_DEMO[st.id] || [];
    const n = Math.floor(d.passo / PASSI_TRATTO), primo = d.passo % PASSI_TRATTO === 0;
    const a = az[n] || { sx: 1, salto: 0, gancio: 0, su: 0, giu: 0 };
    const k = {
      sx: a.sx, su: !!a.su, giu: !!a.giu, salto: !!a.salto, gancio: !!a.gancio,
      saltoPremuto: primo && a.salto && !d.prima.salto, gancioPremuto: primo && a.gancio && !d.prima.gancio
    };
    if (d.passo % PASSI_TRATTO === PASSI_TRATTO - 1) d.prima = a;
    d.passo++;
    return k;
  }

  // ---------- passo del gioco ----------
  function passo(dt) {
    stato.tempo += dt;
    const m = stato.m, p = stato.p;
    // le stanze nascono davanti alla telecamera
    while (m.larghezza * T < stato.cam + W * 2.5) aggiungiStanza();

    if (p.morto) {
      stato.rinascita -= dt;
      if (stato.rinascita <= 0) rinasci();
    } else {
      const k = stato.demo ? comandiDemo() : comandi();
      const prima = { aTerra: p.aTerra, gancio: p.gancio, muro: p.muro, vy: p.vy, vx: p.vx, x: p.x, y: p.y };
      F.passo(m, p, k, dt);
      if (!stato.demo) { stato.tempoCorsa += dt; stato.tappaTempo += dt; }
      effettiDelPasso(prima, k);
      if (p.morto) muori(p.causa);
      else {
        // punto sicuro: la stanza in cui Tino tocca terra
        const s = stanzaDi(p.x + CORPO.w / 2);
        if (p.aTerra && s > stato.cp) {
          stato.cp = s;
          if (stato.demo) preparaDemoStanza(s);
          else if (m.stanze[s].tappa > stato.tappa) entraInTappa(m.stanze[s].tappa);
          else if (!stato.avviso || stato.avviso.t < 0.5) { A.effetto('stanza'); stato.avviso = { testo: m.stanze[s].def.nome.toUpperCase(), t: 1.6 }; }
        }
        controllaGabbie();
        stato.metri = Math.max(stato.metri, Math.floor(p.x / PX_METRO));
        if (!stato.demo && stato.metri > stato.record) {
          if (!stato.recordSuonato && stato.record > 20) { A.effetto('record'); stato.avviso = { testo: 'NUOVO RECORD!', t: 1.4 }; }
          stato.recordSuonato = true;
          stato.record = stato.metri;
        }
        raccogliGhiande();
      }
    }
    // telecamera con una zona morta: Tino resta tra il 28% e il 42% dello schermo;
    // se si ferma la telecamera sta ferma (niente rinculo)
    const c = F.centro(stato.p);
    let obiettivo = stato.cam;
    if (c.x - stato.cam > W * 0.42) obiettivo = c.x - W * 0.42;
    else if (c.x - stato.cam < W * 0.28) obiettivo = c.x - W * 0.28;
    obiettivo = Math.max(0, obiettivo);
    stato.cam += (obiettivo - stato.cam) * Math.min(1, dt * (p.morto ? 3 : 12));
    stato.scossa = Math.max(0, stato.scossa - dt);
    if (stato.avviso && (stato.avviso.t -= dt) <= 0) stato.avviso = null;
    aggiornaParticelle(dt);
  }

  function effettiDelPasso(prima, k) {
    const p = stato.p;
    if (stato.demo) return;
    if (!prima.gancio && p.gancio) A.effetto('rampino');
    if (k.gancioPremuto && !p.gancio) A.effetto('mancato');
    if (prima.gancio && !p.gancio) A.effetto('stacca');
    if (prima.aTerra && !p.aTerra && p.vy < -100) { A.effetto('salto'); polvere(p.x + CORPO.w / 2, p.y + CORPO.h, 3); }
    if (!prima.aTerra && prima.muro && p.vy < -100 && !p.gancio) { A.effetto('parete'); polvere(p.x + (prima.muro > 0 ? CORPO.w : 0), p.y + 5, 3); }
    if (!prima.aTerra && p.aTerra && prima.vy > 150) { A.effetto('atterra'); polvere(p.x + CORPO.w / 2, p.y + CORPO.h, 4); }
    if (p.muro && !p.aTerra && p.vy > 40 && Math.random() < 0.25) polvere(p.x + (p.muro > 0 ? CORPO.w : 0), p.y + 2, 1);
  }

  // ---------- tappe e gabbia di Gino ----------
  function entraInTappa(n) {
    stato.tappa = n;
    stato.tappaMorti = 0; stato.tappaTempo = 0;
    musicaTappa(n);
    if (n > stato.tappaMax) { stato.tappaMax = n; scrivi('tappa-max', n); }
    const giro = Math.floor(n / TAPPE.length);
    stato.avviso = { testo: nomeTappa(n), sotto: tappaDi(n).nome.toUpperCase() + (giro ? ' · GIRO ' + (giro + 1) : ''), t: 2.4 };
    A.effetto('stanza');
  }
  // Tino tocca la gabbia: si rompe e Gino esce
  function controllaGabbie() {
    const p = stato.p;
    for (const g of stato.m.gabbie) {
      if (g.aperta >= 0 || p.morto) continue;
      if (p.x + CORPO.w < g.x - 1 || p.x > g.x + 40) continue;
      g.aperta = stato.tempo;
      rompiGabbia(g);
      if (stato.demo) continue;
      A.effetto('gabbia'); A.effetto('liberato');
      stato.liberati++; scrivi('gino-liberato', stato.liberati);
      stato.avviso = { testo: 'GINO LIBERO!', sotto: 'TAPPA IN ' + tempoTesto(stato.tappaTempo) + ' · MORTI ' + stato.tappaMorti, t: 2.8 };
      stato.scossa = 0.15;
    }
  }
  // disegno della gabbia su una tela a parte (serve anche per i pezzi quando si rompe)
  const GABBIA = { w: 40, h: 46 };
  let telaGabbia = null;
  function preparaGabbia() {
    const cv = document.createElement('canvas'); cv.width = GABBIA.w; cv.height = GABBIA.h;
    const c = cv.getContext('2d');
    const { w, h } = GABBIA;
    const ferro = ['#22222e', '#55576a', '#9aa0b8', '#e0e4f0'];
    // anello e cupola
    c.fillStyle = ferro[0]; c.fillRect(w / 2 - 3, 0, 6, 5);
    c.fillStyle = ferro[2]; c.fillRect(w / 2 - 2, 1, 4, 1); c.fillRect(w / 2 - 2, 1, 1, 3);
    for (let y = 5; y < 11; y++) {
      const lw = Math.round(Math.sqrt(1 - ((11 - y) / 6.5) ** 2) * (w / 2 - 1));
      c.fillStyle = ferro[0]; c.fillRect(w / 2 - lw - 1, y, lw * 2 + 2, 1);
      c.fillStyle = y < 7 ? ferro[3] : ferro[2]; c.fillRect(w / 2 - lw, y, lw * 2, 1);
    }
    // sbarre
    for (let x = 1; x < w - 1; x += 5) {
      c.fillStyle = ferro[0]; c.fillRect(x, 11, 3, h - 15);
      c.fillStyle = ferro[2]; c.fillRect(x + 1, 11, 1, h - 15);
    }
    // anelli in alto e in basso
    for (const y of [10, h - 5]) {
      c.fillStyle = ferro[0]; c.fillRect(0, y, w, 4);
      c.fillStyle = ferro[1]; c.fillRect(1, y + 1, w - 2, 2);
      c.fillStyle = ferro[3]; c.fillRect(1, y + 1, w - 2, 1);
    }
    // lucchetto
    const lx = 2, ly = 24;
    c.fillStyle = '#22222e'; c.fillRect(lx, ly, 9, 9); c.fillRect(lx + 1, ly - 4, 7, 5);
    c.fillStyle = '#9aa0b8'; c.fillRect(lx + 2, ly - 3, 5, 1); c.fillRect(lx + 2, ly - 3, 1, 3); c.fillRect(lx + 6, ly - 3, 1, 3);
    c.fillStyle = '#ffd23c'; c.fillRect(lx + 1, ly + 1, 7, 7);
    c.fillStyle = '#fff3b0'; c.fillRect(lx + 1, ly + 1, 7, 1);
    c.fillStyle = '#7a4a00'; c.fillRect(lx + 4, ly + 3, 1, 3);
    telaGabbia = cv;
    return cv;
  }
  function rompiGabbia(g) {
    const cv = telaGabbia || preparaGabbia();
    const d = cv.getContext('2d').getImageData(0, 0, GABBIA.w, GABBIA.h).data;
    const x0 = g.x - 2, y0 = g.y - GABBIA.h;
    for (let y = 0; y < GABBIA.h; y += 1) for (let x = 0; x < GABBIA.w; x += 1) {
      const i = (y * GABBIA.w + x) * 4;
      if (!d[i + 3] || (x + y) % 2) continue;
      const dx = x - GABBIA.w / 2;
      stato.particelle.push({ x: x0 + x, y: y0 + y, vx: dx * 9 + (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 180, col: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`, vita: 0.6 + Math.random() * 0.6, g: 650 });
    }
  }
  // dov'è Gino: dentro la gabbia, poi un saltello fuori, poi un saltone via verso destra
  const BATTUTE = {
    prima: ['AIUTO PAPÀ!', 'MI HANNO RIPRESO!', 'ANCORA IO, PAPÀ!', 'PAPÀ, SBRIGATI!'],
    dopo: ['GRAZIE PAPÀ!', 'CORRO AVANTI!', 'CI VEDIAMO DOPO!', 'SEI IL MIGLIORE!']
  };
  function posGino(g) {
    const base = { x: g.x + 18, y: g.y - 4, fumetto: null, verso: 1, salto: false, trema: 0, visibile: true };
    const p = stato.p, battuta = (stato.m.stanze[g.stanza].tappa) % 4;
    if (g.aperta < 0) {
      const vicino = Math.abs(p.x - g.x) < 170 && !p.morto;
      if (vicino) { base.fumetto = BATTUTE.prima[battuta]; base.trema = 1; base.verso = -1; }
      return base;
    }
    const a = stato.tempo - g.aperta;
    if (a < 0.25) { base.verso = -1; return base; }
    if (a < 0.75) {
      const f = (a - 0.25) / 0.5;
      return Object.assign(base, { x: base.x + 46 * f, y: g.y - 4 * (1 - f) - 26 * Math.sin(Math.PI * f), salto: true });
    }
    if (a < 2.4) {
      const hop = Math.abs(Math.sin((a - 0.75) * 7)) * 4;
      return Object.assign(base, { x: base.x + 46, y: g.y - hop, verso: -1, fumetto: BATTUTE.dopo[battuta] });
    }
    const t = a - 2.4;
    const y = g.y - 330 * t + 260 * t * t, x = base.x + 46 + 150 * t;
    if (y < -40 && t > 0.5) base.visibile = false;
    return Object.assign(base, { x, y, salto: true });
  }

  function raccogliGhiande() {
    const c = F.centro(stato.p);
    for (const g of stato.m.ghiande) {
      if (g.presa || Math.abs(g.x - c.x) > 9 || Math.abs(g.y - c.y) > 10) continue;
      g.presa = true;
      if (stato.demo) continue;
      stato.ghiande++;
      A.effetto('ghianda');
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        stato.particelle.push({ x: g.x, y: g.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, col: i % 2 ? PAL.oro[1] : PAL.oro[2], vita: 0.35, g: 0 });
      }
    }
  }

  function muori(causa) {
    const p = stato.p;
    p.morto = true; p.causa = causa;
    stato.rinascita = RINASCITA;
    if (!stato.demo) {
      stato.morti++; stato.mortiTotali++; stato.tappaMorti++;
      scrivi('morti-totali', stato.mortiTotali);
      scrivi('record', stato.record);
      A.effetto('morte');
      stato.scossa = 0.25; stato.lampo = 0.12;
    }
    // Tino va in pezzi: un pixel per pixel dello sprite
    const s = SPR_TINO, c = F.centro(p);
    const x0 = c.x - s.w / 2, y0 = p.y + CORPO.h - s.h - 1;
    for (const q of s.pix) {
      const fx = p.verso > 0 ? q.x : s.w - 1 - q.x;
      stato.particelle.push({ x: x0 + fx, y: y0 + q.y, vx: (Math.random() - 0.5) * 220 + p.vx * 0.3, vy: -60 - Math.random() * 200, col: q.col, vita: 0.7 + Math.random() * 0.5, g: 700 });
    }
    for (let i = 0; i < 16; i++) stato.particelle.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 240, col: PAL.rosso, vita: 0.5 + Math.random() * 0.3, g: 700 });
  }

  function rinasci() {
    if (stato.demo) {
      // nella dimostrazione si passa alla stanza dopo
      const i = Math.min(stato.m.stanze.length - 1, stato.cp + 1);
      stato.cp = i;
      preparaDemoStanza(i);
      return;
    }
    const st = stato.m.stanze[stato.cp];
    stato.p = F.nuovoGiocatore(st.spawn.x, st.spawn.y);
    A.effetto('rinasce');
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      stato.particelle.push({ x: st.spawn.x + 5 + Math.cos(a) * 14, y: st.spawn.y + 5 + Math.sin(a) * 14, vx: -Math.cos(a) * 50, vy: -Math.sin(a) * 50, col: '#ffffff', vita: 0.25, g: 0 });
    }
  }

  function polvere(x, y, n) {
    for (let i = 0; i < n; i++) stato.polvere.push({ x: x + (Math.random() - 0.5) * 6, y, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 25, vita: 0.3 + Math.random() * 0.2 });
  }
  function aggiornaParticelle(dt) {
    for (const q of stato.particelle) {
      q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vita -= dt;
      if (q.g && q.y > 200) q.vita = 0;
    }
    stato.particelle = stato.particelle.filter(q => q.vita > 0);
    for (const q of stato.polvere) { q.x += q.vx * dt; q.y += q.vy * dt; q.vita -= dt; }
    stato.polvere = stato.polvere.filter(q => q.vita > 0);
  }

  // ---------- disegno ----------
  function disegna() {
    const sc = stato.scossa > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
    ctx.save();
    disegnaCielo();
    ctx.translate(sc, 0);
    const cam = Math.round(stato.cam);
    disegnaCaselle(cam);
    disegnaBandierine(cam);
    disegnaGabbie(cam);
    disegnaOggetti(cam);
    disegnaTino(cam);
    disegnaFumetti(cam);
    for (const q of stato.polvere) { ctx.fillStyle = q.vita > 0.2 ? '#f6d6a8' : '#93451f'; ctx.fillRect(Math.round(q.x - cam), Math.round(q.y), 1, 1); }
    for (const q of stato.particelle) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x - cam), Math.round(q.y), 1, 1); }
    ctx.restore();
    if (stato.modo !== 'menu') hud();
    if (stato.lampo > 0) { ctx.fillStyle = 'rgba(224,48,58,0.35)'; ctx.fillRect(0, 0, W, H); stato.lampo -= 1 / 60; }
  }

  // cielo della tappa inquadrata; vicino al confine tra due tappe sfuma da una all'altra
  function disegnaCielo() {
    const centro = stato.cam + W / 2;
    let n = 0;
    while (n + 1 < stato.inizioTappa.length && stato.inizioTappa[n + 1] <= centro) n++;
    for (const b of [n, n + 1]) {
      const xb = stato.inizioTappa[b];
      if (b < 1 || xb === undefined || Math.abs(centro - xb) >= 160) continue;
      const f = Math.round((0.5 + (centro - xb) / 320) * 8) / 8;
      disegnaSfondo(paletteDi(b - 1));
      if (f > 0) { ctx.globalAlpha = f; disegnaSfondo(paletteDi(b)); ctx.globalAlpha = 1; }
      return;
    }
    disegnaSfondo(paletteDi(n));
  }

  function disegnaGabbie(cam) {
    const cv = telaGabbia || preparaGabbia();
    for (const g of stato.m.gabbie) {
      if (g.x - cam < -120 || g.x - cam > W + 60) continue;
      const pg = posGino(g);
      if (pg.visibile) disegnaGino(pg, cam);
      if (g.aperta < 0) ctx.drawImage(cv, Math.round(g.x - 2 - cam), g.y - GABBIA.h);
      else {
        // resta la base, un po' storta
        ctx.fillStyle = '#22222e'; ctx.fillRect(Math.round(g.x - 2 - cam), g.y - 4, GABBIA.w, 4);
        ctx.fillStyle = '#55576a'; ctx.fillRect(Math.round(g.x - 1 - cam), g.y - 3, GABBIA.w - 2, 2);
      }
    }
  }
  function disegnaGino(pg, cam) {
    const s = SPR_GINO;
    const tr = pg.trema && Math.floor(stato.tempo * 30) % 2 ? 1 : 0;
    ctx.save();
    ctx.translate(Math.round(pg.x - cam) + tr, Math.round(pg.y));
    if (pg.verso < 0) ctx.scale(-1, 1);
    const ox = -Math.floor(s.w / 2) - 2, oy = -(s.h + 2);
    ctx.fillStyle = s.coloreGambe;
    s.gambe.forEach(lx => ctx.fillRect(ox + lx, oy + s.h, 2, pg.salto ? 1 : 2));
    ctx.drawImage(s.cv, ox, oy);
    ctx.restore();
  }
  function disegnaFumetti(cam) {
    for (const g of stato.m.gabbie) {
      if (g.x - cam < -120 || g.x - cam > W + 60) continue;
      const pg = posGino(g);
      if (pg.fumetto && pg.visibile) fumetto(pg.fumetto, pg.x - cam, pg.y - SPR_GINO.h - 8);
    }
  }
  function fumetto(t, x, y) {
    ctx.font = '8px "Press Start 2P", monospace';
    // il font a pixel non ha la À maiuscola: si scrive A e l'accento si disegna a mano
    const accenti = [];
    for (let i = 0; i < t.length; i++) if (t[i] === 'À') accenti.push(i);
    t = t.replace(/À/g, 'A');
    const w = Math.ceil(ctx.measureText(t).width) + 8, h = 16;
    const bx = Math.round(Math.max(2, Math.min(W - w - 2, x - w / 2))), by = Math.round(y - h);
    ctx.fillStyle = '#000000'; ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, w, h);
    const px = Math.round(Math.max(bx + 3, Math.min(bx + w - 6, x)));
    ctx.fillStyle = '#000000'; ctx.fillRect(px - 1, by + h, 5, 2); ctx.fillRect(px, by + h + 2, 3, 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(px, by + h, 3, 2); ctx.fillRect(px + 1, by + h + 2, 1, 1);
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = '#1b0f0c'; ctx.fillText(t, bx + 4, by + 5);
    for (const i of accenti) {
      const ax = Math.round(bx + 4 + ctx.measureText(t.slice(0, i)).width) + 2;
      ctx.fillRect(ax, by + 1, 2, 1); ctx.fillRect(ax + 1, by + 2, 2, 1); ctx.fillRect(ax + 2, by + 3, 2, 1);
    }
  }

  function disegnaCaselle(cam) {
    const m = stato.m;
    const c0 = Math.max(0, Math.floor(cam / T)), c1 = Math.min(m.larghezza - 1, Math.floor((cam + W) / T) + 1);
    const sol = (c, r) => (c < 0 ? true : r >= F.RIGHE ? F.solida(F.casella(m, c, F.RIGHE - 1)) : r < 0 ? false : F.solida(F.casella(m, c, r)));
    for (let c = c0; c <= c1; c++) {
      const x = c * T - cam;
      PAL = paletteDi(m.stanze[m.colonne[c]].tappa);
      for (let r = 0; r < F.RIGHE; r++) {
        const k = F.casella(m, c, r);
        const y = r * T;
        if (k === '#') {
          const v = hash(c, r) % 7 === 0 ? 2 : hash(c, r) % 3 === 0 ? 1 : 0;
          ctx.drawImage(casellaTerra(!sol(c, r - 1) ? 1 : 0, !sol(c - 1, r) ? 1 : 0, !sol(c + 1, r) ? 1 : 0, !sol(c, r + 1) ? 1 : 0, v), x, y);
        } else if (k === '%') ctx.drawImage(casellaMattoni(!sol(c, r - 1) ? 1 : 0, r), x, y);
        else if (k === '^' || k === 'v' || k === '<' || k === '>') ctx.drawImage(casellaPunte(k), x, y);
      }
      // sotto la stanza la terra continua fino al bordo
      if (F.solida(F.casella(m, c, F.RIGHE - 1))) { ctx.fillStyle = PAL.terra[1]; ctx.fillRect(x, F.RIGHE * T, T, H - F.RIGHE * T); }
    }
  }

  function disegnaBandierine(cam) {
    // all'inizio di ogni stanza una torcia: accesa se è stata raggiunta
    for (let i = 1; i < stato.m.stanze.length; i++) {
      const st = stato.m.stanze[i];
      const x = st.x0 * T + 3 - cam;
      if (x < -10 || x > W + 10) continue;
      const y = F.PAVIMENTO * T;
      ctx.fillStyle = '#5e2412'; ctx.fillRect(x, y - 12, 2, 12);
      ctx.fillStyle = '#93451f'; ctx.fillRect(x, y - 12, 1, 12);
      if (i <= stato.cp) {
        const f = Math.floor(stato.tempo * 10 + i) % 3;
        ctx.fillStyle = PAL.oro[1]; ctx.fillRect(x - 1, y - 16, 4, 4);
        ctx.fillStyle = PAL.rosso; ctx.fillRect(x - 1 + (f === 1 ? 1 : 0), y - 18 - (f === 2 ? 1 : 0), 3, 2);
        ctx.fillStyle = PAL.oro[2]; ctx.fillRect(x, y - 15, 2, 2);
      } else {
        ctx.fillStyle = PAL.punte[3]; ctx.fillRect(x - 1, y - 14, 4, 2);
      }
    }
  }

  function disegnaOggetti(cam) {
    const m = stato.m, p = stato.p;
    const bers = !p.morto && !p.gancio ? F.bersaglio(m, p) : null;
    for (const q of m.pioli) {
      const x = Math.round(q.x - cam), y = Math.round(q.y);
      if (x < -8 || x > W + 8) continue;
      ctx.fillStyle = PAL.oro[0]; ctx.fillRect(x - 3, y - 3, 7, 7);
      ctx.fillStyle = PAL.oro[1]; ctx.fillRect(x - 2, y - 2, 5, 5);
      ctx.fillStyle = PAL.oro[0]; ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = PAL.oro[2]; ctx.fillRect(x - 2, y - 2, 2, 1);
      if (q === bers && !stato.demo) {
        // il piolo a cui si aggancerebbe il rampino
        const d = 6 + (Math.floor(stato.tempo * 8) % 2);
        ctx.fillStyle = '#ffffff';
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          ctx.fillRect(x + sx * d - (sx > 0 ? 1 : 0), y + sy * d - (sy > 0 ? 0 : 0), 2, 1);
          ctx.fillRect(x + sx * d - (sx > 0 ? 0 : 0), y + sy * d - (sy > 0 ? 1 : 0), 1, 2);
        }
      }
    }
    for (const s of m.seghe) {
      const x = Math.round(s.x - cam), y = Math.round(s.y);
      if (x < -12 || x > W + 12) continue;
      PAL = paletteDi(m.stanze[s.stanza].tappa);
      sega(x, y);
    }
    for (const g of m.ghiande) {
      if (g.presa) continue;
      const x = Math.round(g.x - cam), y = Math.round(g.y + Math.sin(stato.tempo * 4 + g.x) * 1.5);
      if (x < -8 || x > W + 8) continue;
      ctx.fillStyle = '#3a1408'; ctx.fillRect(x - 2, y - 4, 5, 3);
      ctx.fillStyle = '#93451f'; ctx.fillRect(x - 2, y - 3, 5, 1);
      ctx.fillStyle = '#5e2412'; ctx.fillRect(x, y - 5, 1, 1);
      ctx.fillStyle = '#e8763a'; ctx.fillRect(x - 2, y - 1, 5, 3);
      ctx.fillStyle = '#c86a3a'; ctx.fillRect(x - 1, y + 2, 3, 1);
      ctx.fillStyle = '#ffd88a'; ctx.fillRect(x - 1, y - 1, 1, 1);
    }
  }

  function sega(cx, cy) {
    const r = 7, a0 = stato.tempo * 10;
    ctx.fillStyle = PAL.punte[3];
    for (let a = 0; a < 10; a++) {
      const an = a / 10 * Math.PI * 2 + a0;
      ctx.fillRect(Math.round(cx + Math.cos(an) * r) - 1, Math.round(cy + Math.sin(an) * r) - 1, 2, 2);
    }
    for (let yy = -r + 1; yy < r; yy++) for (let xx = -r + 1; xx < r; xx++) {
      const d = xx * xx + yy * yy;
      if (d >= (r - 1) * (r - 1)) continue;
      const spicchio = Math.floor(((Math.atan2(yy, xx) + a0) / (Math.PI / 3)) % 2 + 2) % 2;
      ctx.fillStyle = d > (r - 3) * (r - 3) ? PAL.punte[2] : d < 3 ? PAL.rosso : (spicchio ? PAL.punte[1] : PAL.punte[0]);
      ctx.fillRect(cx + xx, cy + yy, 1, 1);
    }
  }

  function lineaPixel(x0, y0, x1, y1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy, n = 0;
    for (let k = 0; k < 400; k++) {
      ctx.fillStyle = (n++ % 3 === 2) ? '#93451f' : '#f6d6a8';
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }

  function disegnaTino(cam) {
    const p = stato.p;
    if (p.morto) return;
    const s = SPR_TINO, c = F.centro(p);
    const cx = c.x - cam;
    // tiro mancato: la corda scatta avanti e torna
    if (p.mancato > 0 && !p.gancio) {
      const f = 1 - Math.abs(p.mancato - 0.08) / 0.08;
      lineaPixel(cx, c.y - 2, cx + p.verso * 30 * f, c.y - 2 - 30 * f);
    }
    let stato2 = 'fermo', ang = 0;
    if (p.gancio) {
      lineaPixel(p.gancio.x - cam, p.gancio.y, cx, c.y);
      stato2 = 'appeso';
      ang = Math.atan2(p.gancio.x - c.x, -(p.gancio.y - c.y)) * 0.6;
    } else if (!p.aTerra) stato2 = p.muro && p.vy > 0 ? 'parete' : 'salta';
    else if (Math.abs(p.vx) > 20) stato2 = 'corre';
    let verso = p.verso;
    if (stato2 === 'parete') verso = -p.muro;
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(p.y + CORPO.h));
    if (ang) { ctx.translate(0, -6); ctx.rotate(ang); ctx.translate(0, 6); }
    if (verso < 0) ctx.scale(-1, 1);
    const ox = -Math.floor(s.w / 2) - 2;
    let oy = -(s.h + 2);
    const bob = stato2 === 'fermo' && (stato.tempo % 1.2) < 0.6 ? 1 : 0;
    const pas = Math.floor(stato.tempo * 16) % 2;
    // stiramento nei salti
    if (stato2 === 'salta' && p.vy < -150) { ctx.scale(0.9, 1.12); }
    ctx.fillStyle = s.coloreGambe;
    s.gambe.forEach((lx, i) => {
      let lun = 2;
      if (stato2 === 'corre' && i % 2 === pas) lun = 1;
      if (stato2 === 'salta') lun = 1;
      if (stato2 === 'appeso' || stato2 === 'parete') lun = 2 + ((i + pas) % 2);
      ctx.fillRect(ox + lx, oy + s.h + bob, 1, lun - bob);
    });
    ctx.drawImage(s.cv, ox, oy + bob);
    ctx.restore();
  }

  function testo(t, x, y, al, col = '#ffffff', ombra = '#000000') {
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = al;
    ctx.fillStyle = ombra; ctx.fillText(t, x + 1, y + 1);
    ctx.fillStyle = col; ctx.fillText(t, x, y);
  }
  function hud() {
    testo('MORTI ' + String(stato.morti).padStart(3, '0'), 5, 5, 'left', stato.lampo > 0 ? PAL.rosso : '#ffffff');
    testo(String(stato.metri).padStart(4, '0') + ' M', W - 5, 5, 'right');
    testo('REC ' + String(stato.record).padStart(4, '0'), W - 5, 15, 'right', '#ffd88a');
    if (stato.ghiande) {
      const x = 7, y = 18;
      ctx.fillStyle = '#3a1408'; ctx.fillRect(x - 2, y, 5, 3);
      ctx.fillStyle = '#e8763a'; ctx.fillRect(x - 2, y + 3, 5, 3);
      testo('' + stato.ghiande, 13, 16, 'left', '#ffd23c');
    }
    if (stato.avviso) {
      const a = stato.avviso;
      if (a.t > 0.3 || Math.floor(a.t * 20) % 2) {
        testo(a.testo, Math.round(W / 2), 28, 'center', '#ffd23c');
        if (a.sotto) testo(a.sotto, Math.round(W / 2), 40, 'center', '#ffffff');
      }
    }
    // stanze della tappa: quadratini e la gabbia in fondo
    const st = stato.m.stanze[stato.cp], prima = stato.m.stanze.findIndex(s => s.tappa === st.tappa);
    const k = stato.cp - prima, n = STANZE_PER_TAPPA + 1;
    const x0 = Math.round(W / 2 - (n * 6) / 2);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 6, ultimo = i === n - 1;
      ctx.fillStyle = '#000000'; ctx.fillRect(x, 6, 5, 5);
      ctx.fillStyle = i <= k ? (ultimo ? '#ffffff' : '#ffd23c') : (ultimo ? '#9aa0b8' : '#3a3f62');
      if (ultimo) { ctx.fillRect(x, 5, 4, 5); ctx.fillStyle = '#000000'; ctx.fillRect(x + 1, 6, 1, 4); ctx.fillRect(x + 3 - 1, 6, 1, 4); }
      else ctx.fillRect(x, 5, 4, 4);
    }
  }

  // ---------- pannelli ----------
  const pannello = document.getElementById('pannello');
  function mostraPannello(html) { pannello.innerHTML = '<div class="riquadro">' + html + '</div>'; pannello.classList.add('visibile'); }
  function nascondiPannello() { pannello.classList.remove('visibile'); pannello.innerHTML = ''; }
  const COMANDI = `
    <div class="comandi-testo">
      <p><b>← →</b> corri · <b>Spazio</b> salta (tieni premuto per saltare più in alto; vicino a un muro salti dalla parete)</p>
      <p><b>X</b> o <b>Maiusc</b> rampino: si aggancia da solo al piolo d'oro indicato. Tienilo premuto per restare appeso; <b>← →</b> danno lo slancio, <b>↑ ↓</b> accorciano e allungano la corda, <b>Spazio</b> ti stacca con un salto.</p>
      <p><b>R</b> ricomincia la stanza · <b>P</b> pausa · <b>M</b> suoni · <b>N</b> musica</p>
    </div>`;

  function pannelloMenu() {
    stato.modo = 'menu';
    A.musica('menu');
    mostraPannello(`
      <h1 class="titolo">SPEEDTINO</h1>
      <div class="copper" aria-hidden="true"></div>
      <p class="sotto">Corri, aggancia, dondola, salta. Gino è chiuso in una gabbia alla fine di ogni tappa: vai a liberarlo! Morirai tantissimo, ma si riparte subito.</p>
      <p class="numeri">Record <b>${stato.record} m</b> · Morti in tutto <b>${stato.mortiTotali}</b>${stato.liberati ? ` · Gino liberato <b>${stato.liberati}</b> ${stato.liberati === 1 ? 'volta' : 'volte'}` : ''}</p>
      <div class="scelte"><button class="tasto-amiga" id="b-gioca" type="button">GIOCA</button></div>
      ${COMANDI}
      <p class="piccolo">Sul telefono: ◀ ▶ a sinistra, SALTA e RAMPINO a destra, ▲ ▼ per la corda.</p>`);
    document.getElementById('b-gioca').addEventListener('click', gioca);
    if (!stato.demo || !stato.m) nuovaCorsa(true);
  }
  function gioca() {
    A.avvia();
    nascondiPannello();
    nuovaCorsa(false);
    stato.modo = 'gioco';
    A.musica('gioco');
    stato.avviso = { testo: 'VIA!', t: 1.2 };
  }
  function pausa() {
    if (stato.modo !== 'gioco') return;
    stato.modo = 'pausa';
    lasciaTutto();
    scrivi('record', stato.record);
    mostraPannello(`
      <h2>PAUSA</h2>
      <p class="numeri">${nomeTappa(stato.tappa)} · ${tappaDi(stato.tappa).nome}</p>
      <p class="numeri">${stato.metri} m · morti ${stato.morti} · ghiande ${stato.ghiande}</p>
      <div class="scelte">
        <button class="tasto-amiga" id="b-riprendi" type="button">RIPRENDI</button>
        <button class="tasto-amiga secondario" id="b-ricomincia" type="button">DA CAPO</button>
        <button class="tasto-amiga secondario" id="b-menu" type="button">MENU</button>
      </div>
      ${COMANDI}`);
    document.getElementById('b-riprendi').addEventListener('click', riprendi);
    document.getElementById('b-ricomincia').addEventListener('click', gioca);
    document.getElementById('b-menu').addEventListener('click', () => { scrivi('record', stato.record); stato.demo = false; pannelloMenu(); });
  }
  function riprendi() {
    if (stato.modo !== 'pausa') return;
    nascondiPannello();
    stato.modo = 'gioco';
    A.avvia();
  }

  // barra in alto
  let muto = leggi('muto', false), musicaSpenta = leggi('musica-spenta', false);
  function aggiornaBarra() {
    document.body.classList.toggle('muto', muto);
    document.body.classList.toggle('senza-musica', musicaSpenta);
    A.muto(muto); A.musicaSpenta(musicaSpenta);
  }
  function cambiaMuto() { muto = !muto; scrivi('muto', muto); aggiornaBarra(); }
  function cambiaMusica() { musicaSpenta = !musicaSpenta; scrivi('musica-spenta', musicaSpenta); aggiornaBarra(); }
  document.getElementById('btn-audio').addEventListener('click', e => { e.currentTarget.blur(); A.avvia(); cambiaMuto(); });
  document.getElementById('btn-musica').addEventListener('click', e => { e.currentTarget.blur(); A.avvia(); cambiaMusica(); });
  document.getElementById('btn-pausa').addEventListener('click', e => { e.currentTarget.blur(); if (stato.modo === 'gioco') pausa(); else if (stato.modo === 'pausa') riprendi(); });
  aggiornaBarra();

  // telefono in verticale: si gioca solo in orizzontale
  const verticale = matchMedia('(orientation: portrait) and (pointer: coarse)');
  function controllaVerso() {
    document.body.classList.toggle('verticale', verticale.matches);
    if (verticale.matches && stato.modo === 'gioco') pausa();
  }
  verticale.addEventListener ? verticale.addEventListener('change', controllaVerso) : verticale.addListener(controllaVerso);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (stato.modo === 'gioco') pausa(); A.pausa(true); } else A.pausa(false);
  });

  // ---------- ciclo ----------
  let primaT = performance.now(), accum = 0;
  function ciclo(ora) {
    const dt = Math.min(0.1, (ora - primaT) / 1000); primaT = ora;
    if (!stato.test) {
      if (stato.modo === 'gioco' || stato.modo === 'menu') {
        accum += dt;
        while (accum >= DT) { passo(DT); accum -= DT; }
      } else accum = 0;
      disegna();
    }
    requestAnimationFrame(ciclo);
  }

  addEventListener('resize', adatta);
  adatta();
  controllaVerso();
  pannelloMenu();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => disegna());
  requestAnimationFrame(ciclo);

  // ---------- prove automatiche ----------
  window.speedtino = {
    get stato() { return stato; }, F, STANZE, TAPPE, PALETTE, nuovaCorsa, passo, premi, disegna, gioca, pausa, muori
  };
})();
