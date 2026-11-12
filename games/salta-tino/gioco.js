/*
 * Salta, Tino!
 * Tino salta da solo di ramo in ramo su per la grande quercia: si sposta solo a
 * destra e a sinistra. Uscendo da un lato rientra dall'altro. Dalle radici al
 * tronco, alla chioma, al cielo e alle stelle: una salita senza fine.
 *
 * Coordinate del mondo: x verso destra (0..W, si richiude sui lati), h verso
 * l'alto (0 = terreno). 40 px = 1 metro.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------- tabelle
  const PX_M = 40;             // pixel per metro
  const W = 480;               // larghezza logica del campo

  const FISICA = {
    gravita: 1500,
    salto: 900,                // velocità del salto normale (~270 px)
    fungo: 1500,               // salto dal fungo (~750 px)
    velX: 430,                 // velocità orizzontale massima
    accel: 3200,               // quanto in fretta arriva alla velocità voluta
    cadutaMax: 1400,
    piede: 16,                 // mezza larghezza dei piedi per appoggiarsi
    salto_max: 230,            // distanza verticale massima tra due rami sicuri
  };

  const TINO = { alto: 80, largo: 38 };   // misure in gioco (la foto è 376 × 512)

  // Tappe della salita: si sfumano in SFUMA metri da una all'altra.
  const TAPPE = [
    { id: 'radici', da: 0, nome: 'Le radici', sotto: 'Si parte dal prato!', cielo: ['#8fd3f0', '#e0f4fb'] },
    { id: 'tronco', da: 90, nome: 'Il tronco', sotto: 'Su per la corteccia', cielo: ['#74c4e8', '#c8ebf6'] },
    { id: 'chioma', da: 280, nome: 'La chioma', sotto: 'Tra le foglie della quercia', cielo: ['#5fb7d6', '#d4efc4'] },
    { id: 'cielo', da: 600, nome: 'Il cielo', sotto: 'Di nuvola in nuvola', cielo: ['#3f9de0', '#b2e0f8'] },
    { id: 'stelle', da: 1100, nome: 'Le stelle', sotto: 'Più su non è mai arrivato nessuno!', cielo: ['#0f1a44', '#4a3f86'] },
  ];
  const SFUMA = 40;

  // Difficoltà: curve [metri, valore], lineari tra un punto e l'altro e ferme
  // dopo l'ultimo. I rami "sicuri" (non secchi) non sono mai più lontani di
  // FISICA.salto_max: e siccome uscendo da un lato si rientra dall'altro, ogni
  // punto del campo si raggiunge in un salto. La salita è sempre battibile.
  const CURVE = {
    passo: [[0, 80], [60, 105], [200, 140], [500, 170], [900, 190], [1500, 200]],
    largo: [[0, 112], [150, 96], [500, 82], [1000, 72], [1600, 64]],
    extra: [[0, 0.7], [150, 0.5], [500, 0.4], [1200, 0.35]],     // rami in più tra quelli sicuri
    secchi: [[0, 0], [30, 0.25], [250, 0.5], [700, 0.65], [1500, 0.75]], // dei rami in più, quanti secchi
    mobili: [[0, 0], [50, 0.08], [250, 0.22], [700, 0.35], [1500, 0.45]],
    velMobile: [[0, 50], [400, 85], [1000, 115], [1600, 135]],
    agenti: [[0, 0], [70, 0.05], [250, 0.09], [700, 0.13], [1500, 0.17]],
    timbro: [[0, 0], [200, 0], [260, 0.35], [800, 0.5]],          // degli agenti, quanti col timbro
    funghi: [[0, 0], [25, 0.05], [600, 0.04]],
    ghiande: [[0, 0.45], [600, 0.35]],
    potere: [[0, 70], [600, 110], [1500, 150]],                   // metri tra un potere e l'altro
    molle: [[0, 0], [70, 0], [90, 0.07], [580, 0.08]],            // rami sicuri a molla (non nel cielo)
    pigne: [[200, 15], [600, 13], [1500, 11]],                     // secondi tra una pigna e l'altra
    vento: [[600, 120], [1100, 150], [2000, 170]],                // forza delle raffiche (px/s)
    pausaVento: [[600, 11], [1100, 9], [2000, 7]],                // secondi di calma tra le raffiche
    capo: [[500, 165], [1500, 185], [3000, 205]],                 // velocità di salita dell'ispettore
  };

  // Pigne (nel cielo chicchi di grandine, tra le stelle stelle cadenti): prima un
  // avviso in cima allo schermo sopra Tino, poi cadono dritte.
  const PIGNA = { da: 200, avviso: 1.1, avvisoCielo: 1.4, gravita: 700, velMax: 520, raggio: 13, urto: 22 };

  // Ramo a molla: si piega e lancia Tino più in alto e un po' di lato. La spinta
  // di lato si somma alla posizione e si spegne piano (~100 px in tutto).
  const MOLLA = { salto: 1250, spinta: 220, smorza: 2.2 };

  // Raffiche nel cielo e tra le stelle: si sommano alla posizione di Tino (non
  // alla velocità, che il comando correggerebbe subito).
  const VENTO = { da: 620, avviso: 1.4, durata: [3, 4.5], salita: 0.6 };

  // L'ispettore capo sale dal basso su una pila di pratiche e insegue Tino per
  // un po': non si stordisce, va seminato salendo in fretta.
  const CAPO = {
    primo: 500, ogni: 500,     // metri
    durata: 14,                // secondi di inseguimento
    largo: 64, alto: 104,      // misure (la pila sotto è larga come lui)
    rincorsa: 520,             // velocità quando è troppo indietro
    distanza: 420,             // ...cioè con la testa più di tanto sotto l'altezza massima di Tino
    quota: 0.6,                // intanto Tino sta a questa altezza dello schermo (di solito 0,5)
    insegue: 95,               // velocità orizzontale verso Tino
    respinto: 170,             // quanto scivola giù se la bolla lo para
  };

  const AGENTE = {
    larg: 40, alto: 62,
    passo: 45,                 // velocità del retino sul ramo
    timbro: 2.6,               // secondi tra una bolletta e l'altra
    portata: 420,              // tira solo se Tino è a questa distanza
    bolletta: 330,             // velocità della bolletta
  };

  const POTERI = {
    elica: { nome: 'Cappello a elica', durata: 2.6, vel: 1050 },
    bolla: { nome: 'Bolla', durata: 18 },
    calamita: { nome: 'Calamita', durata: 10, raggio: 170 },
  };

  const ASSETS = '../../assets/';
  function carica(percorso) {
    const im = new Image();
    im.src = percorso;
    return im;
  }
  const immagini = {
    normale: carica(ASSETS + 'tino/tino-normale.png'),
    arrabbiato: carica(ASSETS + 'tino/tino-arrabbiato.png'),
    ferito: carica(ASSETS + 'tino/tino-ferito.png'),
    ko: carica(ASSETS + 'tino/tino-ko.png'),
    gino: carica(ASSETS + 'gino/gino.png'),
    retino: carica(ASSETS + 'agenti-tari/agente-retino.svg'),
    timbro: carica(ASSETS + 'agenti-tari/agente-timbro.svg'),
    capo: carica(ASSETS + 'agenti-tari/ispettore-capo.svg'),
    ghianda: carica('ghianda.svg'),
  };
  const pronta = (im) => im.complete && im.naturalWidth > 0;

  // ---------------------------------------------------------------- DOM
  const $ = (s) => document.querySelector(s);
  const canvas = $('#campo');
  const ctx = canvas.getContext('2d');
  const palco = $('#palco');
  const pannello = $('#pannello');
  const elMetri = $('#metri');
  const elRecord = $('#record');
  const elGhiande = $('#ghiande');

  // ---------------------------------------------------------------- utilità
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  // distanza orizzontale col campo che si richiude sui lati (da a verso b)
  const dx = (a, b) => { let d = b - a; d -= Math.round(d / W) * W; return d; };
  const giro = (x) => ((x % W) + W) % W;

  let semeCasuale = null;
  function casuale() {
    if (semeCasuale === null) return Math.random();
    semeCasuale = (semeCasuale + 0x6D2B79F5) | 0;
    let t = semeCasuale;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const tra = (a, b) => a + casuale() * (b - a);
  // un secondo generatore per i pericoli (pigne, vento, ispettore): così la
  // strada di rami resta la stessa per lo stesso seme, qualunque cosa succeda
  let semeRischi = null;
  function rischio() {
    if (semeRischi === null) return Math.random();
    semeRischi = (semeRischi + 0x6D2B79F5) | 0;
    let t = semeRischi;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const traR = (a, b) => a + rischio() * (b - a);
  function hash(n) {
    let t = (n * 374761393 + 668265263) | 0;
    t = Math.imul(t ^ (t >>> 13), 1274126177);
    return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
  }
  function curva(nome, m) {
    const c = CURVE[nome];
    if (m <= c[0][0]) return c[0][1];
    for (let i = 1; i < c.length; i++) {
      if (m <= c[i][0]) {
        const [m0, v0] = c[i - 1], [m1, v1] = c[i];
        return lerp(v0, v1, (m - m0) / (m1 - m0));
      }
    }
    return c[c.length - 1][1];
  }
  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  function mescola(colori, pesi) {
    const r = [0, 0, 0];
    colori.forEach((c, i) => { const v = rgb(c); for (let k = 0; k < 3; k++) r[k] += v[k] * pesi[i]; });
    return `rgb(${r.map(Math.round).join(',')})`;
  }

  function leggi(chiave, predefinito) {
    try {
      const v = localStorage.getItem('salta-tino:' + chiave);
      return v === null ? predefinito : JSON.parse(v);
    } catch (e) {
      return predefinito;
    }
  }
  function scrivi(chiave, valore) {
    try { localStorage.setItem('salta-tino:' + chiave, JSON.stringify(valore)); } catch (e) { /* niente */ }
  }

  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  // ---------------------------------------------------------------- stato
  const stato = {
    test: false,               // nelle prove il gioco non avanza da solo
    fase: 'menu',              // menu | gioco | cade | pausa | fine
    tempo: 0,
    tino: null,
    rami: [],
    agenti: [],
    bollette: [],
    ghiande: [],
    poteri: [],                // poteri da prendere sul campo
    pigne: [],                 // pigne (grandine, stelle cadenti) che cadono
    vento: null,               // { fase: calma | avviso | soffia, t, dir, forza, v }
    capo: null,                // l'ispettore capo quando insegue
    attivi: {},                // poteri in uso { id: secondi }
    particelle: [],
    messaggi: [],
    gen: null,
    cam: 0,                    // altezza del bordo basso dello schermo
    alto: 0,                   // altezza massima raggiunta (px)
    ghiandePrese: 0,
    tappa: 0,
    comando: 0,                // -1 sinistra, 1 destra (tasti, dito)
    inclina: null,             // inclinazione del telefono (-1..1) o null
    statistiche: null,
    risultato: null,
    fumetto: null,             // { testo, t }
  };
  let muto = leggi('muto', false);
  let musicaSpenta = leggi('musica-spenta', false);
  let record = leggi('record', 0);
  let recordGhiande = leggi('record-ghiande', 0);
  let salite = leggi('salite', 0);
  let comandi = leggi('comandi', 'dito'); // sul telefono: 'dito' o 'inclina'

  function nuovoTino() {
    return {
      x: W / 2, h: 0, vx: 0, vy: FISICA.salto * 0.8,
      verso: 1, schiaccia: 0, colpito: false, invulnerabile: 0, ultimoRamo: null, deriva: 0,
    };
  }

  // ---------------------------------------------------------------- generazione
  let idRamo = 0;
  function nuovoRamo(h, x, tipo, w) {
    const r = { id: ++idRamo, h, x: giro(x), x0: giro(x), w, tipo, rotto: false, caduta: 0, vel: 0, fase: 0, ampiezza: 0, fungo: null, mondo: tappaA(h / PX_M) };
    return r;
  }

  function nuovaGenerazione() {
    return { h: 0, sicuro: 0, xSicuro: W / 2, prossimoPotere: 45 * PX_M, ultimoPotere: null };
  }

  function generaFino(hFine) {
    const g = stato.gen;
    while (g.h < hFine) {
      const m = g.h / PX_M;
      // ramo sicuro dopo
      let passo = curva('passo', m) * tra(0.8, 1.12);
      const h = Math.min(g.sicuro + FISICA.salto_max, g.h + passo);
      const w = curva('largo', m) * tra(0.9, 1.1);
      // non troppo sotto il precedente in orizzontale, così si salta davvero
      let x = g.xSicuro + (casuale() < 0.5 ? -1 : 1) * tra(60, 220);
      const mobile = casuale() < curva('mobili', m);
      const r = nuovoRamo(h, x, mobile ? 'mobile' : 'ramo', w);
      if (mobile) {
        r.ampiezza = tra(50, 130);
        r.vel = curva('velMobile', m) / r.ampiezza; // rad/s
        r.fase = tra(0, Math.PI * 2);
      } else if (m > 20 && casuale() < curva('funghi', m)) {
        r.fungo = { dx: tra(-0.25, 0.25) * w, schiaccia: 0 };
      } else if (r.mondo < 3 && casuale() < curva('molle', m)) {
        r.tipo = 'molla';
        r.lato = casuale() < 0.5 ? -1 : 1;
        r.piega = 0;
      }
      stato.rami.push(r);
      // ghiande sopra il ramo
      if (casuale() < curva('ghiande', m)) {
        const n = casuale() < 0.3 ? 3 : 1;
        for (let i = 0; i < n; i++) stato.ghiande.push({ x: giro(r.x + (i - (n - 1) / 2) * 26), h: h + 34 + (n > 1 ? Math.abs(i - 1) * -8 + 8 : 0), presa: false, ramo: mobile ? r : null, dxr: (i - (n - 1) / 2) * 26 });
      }
      // potere sopra il ramo
      if (g.h >= g.prossimoPotere && !mobile && !r.fungo) {
        const scelte = ['elica', 'bolla', 'calamita'].filter((p) => p !== g.ultimoPotere);
        const id = scelte[Math.floor(casuale() * scelte.length)];
        g.ultimoPotere = id;
        stato.poteri.push({ id, x: r.x, h: h + 46, preso: false });
        g.prossimoPotere = g.h + curva('potere', m) * PX_M * tra(0.85, 1.2);
      }
      // rami in più tra il sicuro di prima e questo
      const gap = h - g.sicuro;
      if (gap > 70 && casuale() < curva('extra', m)) {
        const he = g.sicuro + gap * tra(0.35, 0.65);
        let xe = r.x + (casuale() < 0.5 ? -1 : 1) * tra(130, 220);
        if (casuale() < curva('agenti', m) && m > 60) {
          // un agente su un ramo largo, lontano dai due rami sicuri
          const lontano = Math.abs(dx(xe, g.xSicuro)) > 120 && Math.abs(dx(xe, r.x)) > 140;
          if (lontano) {
            const ra = nuovoRamo(he, xe, 'ramo', Math.max(110, w * 1.2));
            stato.rami.push(ra);
            const timbro = casuale() < curva('timbro', m);
            stato.agenti.push({ tipo: timbro ? 'timbro' : 'retino', ramo: ra, off: 0, verso: casuale() < 0.5 ? -1 : 1, ricarica: tra(1, AGENTE.timbro), stordito: false, h: he, x: ra.x, vy: 0, rot: 0, lancia: 0 });
          }
        } else {
          const secco = casuale() < curva('secchi', m);
          stato.rami.push(nuovoRamo(he, xe, secco ? 'secco' : 'ramo', w * tra(0.85, 1)));
        }
      }
      g.h = h;
      g.sicuro = h;
      g.xSicuro = r.x;
    }
  }

  function tappaA(m) {
    let t = 0;
    for (let i = 0; i < TAPPE.length; i++) if (m >= TAPPE[i].da) t = i;
    return t;
  }
  function pesiTappe(m) {
    const p = TAPPE.map(() => 0);
    const i = tappaA(m);
    const dentro = m - TAPPE[i].da;
    if (i > 0 && dentro < SFUMA) {
      const k = dentro / SFUMA;
      p[i] = k; p[i - 1] = 1 - k;
    } else p[i] = 1;
    return p;
  }

  // ---------------------------------------------------------------- audio
  let audio = null;
  let uscitaAudio = null;
  function contesto() {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      const comp = audio.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      comp.connect(audio.destination);
      uscitaAudio = comp;
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  function suono(freq, durata = 0.08, tipo = 'square', volume = 0.06, freqFine = null, ritardo = 0) {
    if (muto || stato.test || stato.fase === 'menu') return;
    try {
      contesto();
      const t = audio.currentTime + ritardo;
      const osc = audio.createOscillator();
      const g = audio.createGain();
      osc.type = tipo;
      osc.frequency.setValueAtTime(freq, t);
      if (freqFine) osc.frequency.exponentialRampToValueAtTime(freqFine, t + durata);
      g.gain.setValueAtTime(volume, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
      osc.connect(g).connect(uscitaAudio);
      osc.start(t);
      osc.stop(t + durata + 0.02);
    } catch (e) { /* audio non disponibile */ }
  }
  function fruscio(durata, volume, freq, tipo = 'bandpass', ritardo = 0) {
    if (muto || stato.test || stato.fase === 'menu') return;
    try {
      contesto();
      const t = audio.currentTime + ritardo;
      const buf = audio.createBuffer(1, Math.ceil(audio.sampleRate * durata), audio.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = audio.createBufferSource();
      s.buffer = buf;
      const f = audio.createBiquadFilter();
      f.type = tipo; f.frequency.value = freq;
      const g = audio.createGain();
      g.gain.value = volume;
      s.connect(f).connect(g).connect(uscitaAudio);
      s.start(t);
    } catch (e) { /* niente */ }
  }
  const suoni = {
    salto: (k) => suono(330 + k * 6, 0.13, 'triangle', 0.05, 620 + k * 10),
    fungo: () => { suono(180, 0.4, 'triangle', 0.07, 900); suono(360, 0.3, 'sine', 0.04, 1400, 0.04); },
    secco: () => { fruscio(0.18, 0.25, 1800); suono(260, 0.12, 'square', 0.025, 90); },
    nuvola: () => fruscio(0.3, 0.15, 900, 'lowpass'),
    ghianda: () => { suono(1050, 0.06, 'triangle', 0.045); suono(1570, 0.09, 'triangle', 0.04, null, 0.045); },
    pestone: () => { suono(220, 0.1, 'square', 0.05, 110); suono(660, 0.18, 'triangle', 0.05, 990, 0.05); },
    colpito: () => { suono(300, 0.5, 'sawtooth', 0.05, 70); fruscio(0.2, 0.15, 600); },
    bolla: () => suono(500, 0.25, 'sine', 0.05, 1200),
    scoppio: () => { fruscio(0.12, 0.3, 3000, 'highpass'); suono(900, 0.08, 'sine', 0.04, 300); },
    elica: () => [0, 1, 2, 3, 4, 5].forEach((i) => suono(420 + i * 70, 0.07, 'square', 0.02, 560 + i * 70, i * 0.06)),
    potere: () => [659, 880, 1175].forEach((f, i) => suono(f, 0.12, 'triangle', 0.055, null, i * 0.07)),
    bolletta: () => suono(800, 0.12, 'triangle', 0.03, 400),
    tappa: () => [523, 659, 784, 1046].forEach((f, i) => suono(f, 0.15, 'triangle', 0.06, null, i * 0.09)),
    record: () => [784, 988, 1175, 1568].forEach((f, i) => suono(f, 0.14, 'sine', 0.06, null, i * 0.08)),
    cade: () => suono(700, 1.1, 'triangle', 0.05, 120),
    molla: () => { suono(150, 0.35, 'triangle', 0.07, 700); suono(300, 0.25, 'sine', 0.03, 1100, 0.03); suono(520, 0.12, 'square', 0.015, 260, 0.12); },
    avviso: () => { suono(1320, 0.07, 'square', 0.025); suono(1320, 0.07, 'square', 0.025, null, 0.14); },
    pigna: (tipo) => tipo === 'stella'
      ? suono(1800, 0.6, 'sine', 0.035, 500)
      : tipo === 'grandine' ? fruscio(0.25, 0.12, 4000, 'highpass') : suono(900, 0.4, 'triangle', 0.03, 300),
    ventoAvviso: () => fruscio(1.2, 0.08, 600, 'lowpass'),
    vento: (d) => { fruscio(d, 0.22, 450, 'lowpass'); fruscio(d * 0.8, 0.07, 1400, 'bandpass', 0.2); },
    capo: () => [0, 1, 2].forEach((i) => { suono(620, 0.22, 'sawtooth', 0.035, 880, i * 0.45); suono(880, 0.2, 'sawtooth', 0.03, 620, i * 0.45 + 0.22); }),
    megafono: () => { suono(240, 0.18, 'sawtooth', 0.03, 200); suono(200, 0.22, 'sawtooth', 0.03, 170, 0.19); },
    seminato: () => [523, 784, 659, 1046].forEach((f, i) => suono(f, 0.14, 'triangle', 0.06, null, i * 0.1)),
  };

  // ---------------------------------------------------------------- musica
  // Musichetta allegra in Fa, tutta sintetizzata (come in Gino Volante): basso
  // saltellante, accordi a "pop", melodia a onda quadra dietro un filtro. Menu
  // calmo, in salita più veloce e più fitta a ogni tappa.
  const MUSICA = { bpm: [100, 120, 136], volume: 0.28, anticipo: 0.2 };
  const NOTA = (n) => {
    const m = /^([A-G])(#|b?)(\d)$/.exec(n);
    return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  };
  const BRANO = [
    ['F3', 'M', 'F5 - A5 - C6 - A5 - F5 - - - C5 - - -'],
    ['Bb2', 'M', 'D5 - F5 - Bb5 - - - A5 - G5 - F5 - - -'],
    ['C3', 'M', 'E5 - G5 - C6 - - - Bb5 - A5 - G5 - - -'],
    ['F3', 'M', 'A5 - G5 - F5 - C5 - F5 - - - - - - -'],
    ['D3', 'm', 'D5 - F5 - A5 - - - D6 - - - C6 - A5 -'],
    ['Bb2', 'M', 'Bb5 - A5 - G5 - F5 - D5 - F5 - - - - -'],
    ['G2', 'm', 'G5 - Bb5 - D6 - - - C6 - Bb5 - A5 - G5 -'],
    ['C3', '7', 'E5 - - - G5 - - - C6 - - - Bb5 - - -'],
  ].map(([radice, tipo, mel]) => ({
    radice: NOTA(radice),
    accordo: { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 10] }[tipo],
    melodia: mel.split(' ').map((n) => (n === '-' ? null : NOTA(n))),
  }));
  const BASSO = { 0: 0, 4: 7, 6: 12, 8: 0, 12: 7, 14: 12 };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const musica = { passo: 0, prossimo: 0, suona: false, uscita: null, filtro: null, rumore: null };

  function inGioco() { return stato.fase === 'gioco' || stato.fase === 'cade'; }
  function suonaMusica() {
    return !!audio && audio.state === 'running' && !muto && !musicaSpenta && !stato.test
      && stato.fase !== 'pausa' && !document.hidden;
  }
  function livelloMusica() {
    if (!inGioco()) return 0;
    return stato.tappa >= 3 ? 2 : 1;
  }
  function preparaMusica() {
    if (musica.uscita) return;
    const a = audio;
    musica.uscita = a.createGain();
    musica.uscita.gain.value = 0;
    musica.uscita.connect(uscitaAudio);
    musica.filtro = a.createBiquadFilter();
    musica.filtro.type = 'lowpass';
    musica.filtro.frequency.value = 1600;
    musica.filtro.connect(musica.uscita);
    const buf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    musica.rumore = buf;
  }
  function notaMusica(t, tipo, f, vol, dur, verso = musica.uscita, fFine = null, tFine = 0.03) {
    const a = audio;
    const o = a.createOscillator();
    const g = a.createGain();
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
    const a = audio;
    const s = a.createBufferSource();
    s.buffer = musica.rumore;
    const f = a.createBiquadFilter();
    f.type = tipoFiltro; f.frequency.value = freq;
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(musica.uscita);
    s.start(t, Math.random() * 0.3);
    s.stop(t + dur + 0.02);
  }
  const pop = (t, m, vol) => notaMusica(t, 'sine', hz(m) * 2.2, vol, 0.11, musica.uscita, hz(m), 0.025);

  function passoMusica(n, t, liv, durata) {
    const battuta = BRANO[Math.floor(n / 16) % BRANO.length];
    const i = n % 16;
    const acc = battuta.accordo.map((x) => battuta.radice + 24 + x);
    if (BASSO[i] !== undefined) {
      const m = battuta.radice - 12 + BASSO[i];
      notaMusica(t, 'triangle', hz(m), 0.3, durata * 1.6);
      notaMusica(t, 'square', hz(m), 0.04, durata * 0.9);
    }
    if (i % 4 === 2) pop(t, acc[(i >> 2) % 3] + 12, 0.15);
    if (liv === 2 && i % 2 === 1) pop(t, acc[(n >> 1) % 3] + 24, 0.06);
    const mel = battuta.melodia[i];
    if (mel !== null && liv > 0) {
      const lunga = battuta.melodia.slice(i + 1).findIndex((x) => x !== null);
      const dur = durata * Math.min(4, lunga < 0 ? 4 : lunga + 1) * 0.9;
      notaMusica(t, 'square', hz(mel), 0.08, dur, musica.filtro);
      notaMusica(t, 'triangle', hz(mel + 12), 0.035, dur * 0.6, musica.filtro);
    } else if (mel !== null && i % 4 === 0) {
      notaMusica(t, 'triangle', hz(mel), 0.07, durata * 2, musica.filtro);
    }
    if (liv >= 1 && (i === 0 || i === 8 || (liv === 2 && i === 10))) notaMusica(t, 'sine', 150, 0.5, 0.16, musica.uscita, 45, 0.12);
    if (liv === 0 && i === 0) notaMusica(t, 'sine', 120, 0.22, 0.12, musica.uscita, 50, 0.1);
    if (liv >= 1 && (i === 4 || i === 12)) rumoreMusica(t, liv === 2 ? 0.2 : 0.12, 0.1, 'bandpass', 1800);
    if (liv >= 1 && i % 2 === 0) rumoreMusica(t, liv === 2 ? 0.07 : 0.045, 0.035, 'highpass', 7000);
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
    const liv = livelloMusica();
    musica.filtro.frequency.setTargetAtTime(liv === 2 ? 3600 : liv === 1 ? 2400 : 1400, t, 0.3);
    if (musica.prossimo < t) musica.prossimo = t + 0.03;
    const bpm = liv === 0 ? MUSICA.bpm[0] : lerp(MUSICA.bpm[1], MUSICA.bpm[2], clamp(stato.tappa / 4, 0, 1));
    const durata = 60 / bpm / 4;
    while (musica.prossimo < t + MUSICA.anticipo) {
      try { passoMusica(musica.passo, musica.prossimo, liv, durata); } catch (e) { musica.errore = e; }
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

  // ---------------------------------------------------------------- schermo
  let scala = 1;
  let alt = 760;               // altezza logica dello schermo
  let girare = false;          // telefono in orizzontale: va girato

  function ridimensiona() {
    const r = palco.getBoundingClientRect();
    const aw = Math.max(100, r.width - 16);
    const ah = Math.max(100, r.height - 16);
    girare = touch && aw > ah * 1.1;
    alt = clamp(Math.round(W * ah / aw), 720, 1040);
    scala = Math.min(aw / W, ah / alt);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = Math.round(W * scala) + 'px';
    canvas.style.height = Math.round(alt * scala) + 'px';
    canvas.width = Math.round(W * scala * dpr);
    canvas.height = Math.round(alt * scala * dpr);
    ctx.setTransform(scala * dpr, 0, 0, scala * dpr, 0, 0);
    if (girare && stato.fase === 'gioco') pausa();
  }
  new ResizeObserver(ridimensiona).observe(palco);

  const sy = (h) => alt - (h - stato.cam);

  // ---------------------------------------------------------------- input
  const tasti = { sx: false, dx: false };
  function aggiornaComando() { stato.comando = (tasti.dx ? 1 : 0) - (tasti.sx ? 1 : 0); }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (stato.fase === 'pausa') riprendi();
      else if (inGioco()) pausa();
      return;
    }
    if (e.code === 'KeyM') { cambiaAudio(); return; }
    if (e.code === 'KeyN') { cambiaMusica(); return; }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { tasti.sx = true; aggiornaComando(); e.preventDefault(); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { tasti.dx = true; aggiornaComando(); e.preventDefault(); }
    if ((e.code === 'Space' || e.code === 'Enter') && !pannelloAperto() && stato.fase === 'fine') { e.preventDefault(); avvia(); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { tasti.sx = false; aggiornaComando(); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { tasti.dx = false; aggiornaComando(); }
  });
  window.addEventListener('blur', () => { tasti.sx = tasti.dx = false; aggiornaComando(); if (inGioco()) pausa(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && inGioco()) pausa(); });

  // dito (o mouse): tenere premuto sulla metà sinistra o destra del campo
  const dita = new Map();
  function aggiornaDita() {
    let v = 0;
    for (const lato of dita.values()) v += lato;
    stato.comando = clamp(v, -1, 1);
  }
  function latoDi(e) {
    const r = canvas.getBoundingClientRect();
    return e.clientX < r.left + r.width / 2 ? -1 : 1;
  }
  palco.addEventListener('pointerdown', (e) => {
    if (e.target !== canvas && e.target !== palco) return;
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    if (stato.fase === 'fine' && !pannelloAperto()) return;
    if (touch && comandi === 'inclina') return;
    dita.set(e.pointerId, latoDi(e));
    try { palco.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
    aggiornaDita();
  });
  palco.addEventListener('pointermove', (e) => {
    if (!dita.has(e.pointerId)) return;
    dita.set(e.pointerId, latoDi(e));
    aggiornaDita();
  });
  const lascia = (e) => { if (dita.delete(e.pointerId)) aggiornaDita(); };
  palco.addEventListener('pointerup', lascia);
  palco.addEventListener('pointercancel', lascia);
  palco.addEventListener('contextmenu', (e) => e.preventDefault());

  // inclinazione del telefono (in verticale: gamma, da -90 a 90 gradi)
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma === null || e.gamma === undefined) return;
    stato.inclina = clamp(e.gamma / 22, -1, 1);
  });
  function chiediInclinazione() {
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') {
      return D.requestPermission().then((r) => r === 'granted').catch(() => false);
    }
    return Promise.resolve(!!D);
  }

  // ---------------------------------------------------------------- flusso
  function avvia(seme = null) {
    semeCasuale = seme;
    semeRischi = seme === null ? null : (seme * 7919 + 13) | 0;
    idRamo = 0;
    stato.fase = 'gioco';
    stato.tempo = 0;
    stato.tino = nuovoTino();
    stato.rami = [];
    stato.agenti = [];
    stato.bollette = [];
    stato.ghiande = [];
    stato.poteri = [];
    stato.attivi = {};
    stato.particelle = [];
    stato.messaggi = [];
    azzeraPericoli();
    stato.cam = 0;
    stato.alto = 0;
    stato.ghiandePrese = 0;
    stato.tappa = 0;
    stato.risultato = null;
    stato.recordPassato = false;
    stato.statistiche = { salti: 0, pestoni: 0, colpi: 0, secchi: 0, poteri: 0, molle: 0, pigne: 0, raffiche: 0, capi: 0, seminati: 0, causa: null };
    stato.gen = nuovaGenerazione();
    // il prato: un ramo largo quanto il campo a h = 0
    const prato = nuovoRamo(0, W / 2, 'prato', W * 2);
    stato.rami.push(prato);
    generaFino(alt + 600);
    stato.fumetto = { testo: 'Forza papà!', t: 2.2 };
    messaggio(TAPPE[0].nome, TAPPE[0].sotto);
    nascondiPannello();
    aggiornaBarra();
  }

  function pausa() {
    if (!inGioco()) return;
    stato.faseDiPrima = stato.fase;
    stato.fase = 'pausa';
    tasti.sx = tasti.dx = false; dita.clear(); aggiornaComando();
    if (!stato.test) mostraPannello(pannelloPausa());
  }
  function riprendi() {
    if (stato.fase !== 'pausa' || girare) return;
    stato.fase = stato.faseDiPrima || 'gioco';
    nascondiPannello();
  }
  function vaiAlMenu() {
    stato.fase = 'menu';
    demo();
    mostraPannello(pannelloMenu());
  }

  // nel menu Tino salta da solo sul prato e su qualche ramo, come sfondo
  function demo() {
    semeCasuale = null;
    stato.tino = nuovoTino();
    stato.rami = [nuovoRamo(0, W / 2, 'prato', W * 2)];
    stato.agenti = []; stato.bollette = []; stato.ghiande = []; stato.poteri = [];
    stato.particelle = []; stato.messaggi = []; stato.attivi = {};
    azzeraPericoli();
    stato.cam = 0; stato.alto = 0; stato.tappa = 0; stato.fumetto = null;
    stato.gen = nuovaGenerazione();
    generaFino(alt + 200);
  }

  function azzeraPericoli() {
    stato.pigne = [];
    stato.prossimaPigna = 4;
    stato.vento = { fase: 'calma', t: 5, dir: 1, forza: 0, v: 0 };
    stato.capo = null;
    stato.prossimoCapo = CAPO.primo;
    stato.quota = 0.5;
  }

  function finisci() {
    stato.fase = 'fine';
    const metri = Math.floor(stato.alto / PX_M);
    const nuovo = metri > record;
    if (nuovo) { record = metri; scrivi('record', record); }
    if (stato.ghiandePrese > recordGhiande) { recordGhiande = stato.ghiandePrese; scrivi('record-ghiande', recordGhiande); }
    salite++; scrivi('salite', salite);
    stato.risultato = { metri, nuovo, ghiande: stato.ghiandePrese, tappa: stato.tappa, causa: stato.statistiche.causa };
    aggiornaBarra();
    if (!stato.test) setTimeout(() => { if (stato.fase === 'fine') mostraPannello(pannelloFine()); }, 500);
  }

  function messaggio(testo, sotto = '', durata = 2.2) {
    stato.messaggi = stato.messaggi.filter((m) => !m.grande);
    stato.messaggi.push({ testo, sotto, t: 0, durata, grande: true });
  }
  function scritta(testo, x, h, colore = '#fff') {
    stato.messaggi.push({ testo, x, h, t: 0, durata: 0.9, colore });
  }
  function scintille(x, h, colore, n = 10, forza = 220) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = forza * (0.4 + Math.random() * 0.8);
      stato.particelle.push({ x, h, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, durata: 0.5 + Math.random() * 0.3, colore, r: 2 + Math.random() * 2.5, foglia: false });
    }
  }
  function foglioline(x, h, n = 5) {
    for (let i = 0; i < n; i++) {
      stato.particelle.push({ x: x + (Math.random() - 0.5) * 40, h, vx: (Math.random() - 0.5) * 120, vy: 60 + Math.random() * 80, t: 0, durata: 0.9 + Math.random() * 0.5, colore: Math.random() < 0.5 ? '#6cbf4a' : '#8fd06a', r: 4, foglia: true, rot: Math.random() * 6 });
    }
  }

  // ---------------------------------------------------------------- aggiornamento
  function posRamo(r) {
    if (r.tipo !== 'mobile') return r.x;
    return giro(r.x0 + Math.sin(stato.tempo * r.vel + r.fase) * r.ampiezza);
  }

  function aggiorna(dt) {
    if (stato.fase === 'pausa') return;
    stato.tempo += dt;
    const T = stato.tino;
    const giocando = stato.fase === 'gioco' || stato.fase === 'cade';

    // rami mobili e rami che cadono
    for (const r of stato.rami) {
      if (r.tipo === 'mobile') r.x = posRamo(r);
      if (r.rotto) { r.caduta += dt; r.vy = (r.vy || 0) - FISICA.gravita * dt; r.h += r.vy * dt; }
      if (r.fungo && r.fungo.schiaccia > 0) r.fungo.schiaccia = Math.max(0, r.fungo.schiaccia - dt * 4);
    }

    // comando orizzontale
    let voluto = stato.comando;
    if (touch && comandi === 'inclina' && stato.inclina !== null && stato.fase !== 'menu') voluto = stato.inclina;
    if (stato.fase === 'menu') voluto = pilotaDemo();
    if (T.colpito) voluto = 0;
    const vObiettivo = voluto * FISICA.velX;
    const passoV = FISICA.accel * dt;
    T.vx += clamp(vObiettivo - T.vx, -passoV, passoV);
    if (Math.abs(voluto) > 0.15) T.verso = Math.sign(voluto);

    // poteri in uso
    for (const id of Object.keys(stato.attivi)) {
      stato.attivi[id] -= dt;
      if (stato.attivi[id] <= 0) {
        delete stato.attivi[id];
        if (id === 'elica') { T.vy = Math.max(T.vy, FISICA.salto * 0.6); T.invulnerabile = 0.6; }
      }
    }
    const hPrima = T.h;
    if (stato.attivi.elica) {
      T.vy = POTERI.elica.vel;
      if (Math.random() < 0.3) foglioline(T.x, T.h, 1);
    } else {
      T.vy = Math.max(-FISICA.cadutaMax, T.vy - FISICA.gravita * dt);
    }
    // spinta di lato del ramo a molla e vento: si sommano alla posizione
    if (T.deriva) {
      T.deriva *= Math.exp(-MOLLA.smorza * dt);
      if (Math.abs(T.deriva) < 5) T.deriva = 0;
    }
    T.x = giro(T.x + (T.vx + T.deriva + stato.vento.v) * dt);
    T.h += T.vy * dt;
    if (T.schiaccia > 0) T.schiaccia = Math.max(0, T.schiaccia - dt);
    if (T.invulnerabile > 0) T.invulnerabile -= dt;

    // appoggio sui rami: solo scendendo, se i piedi passano la cima
    if (T.vy < 0 && !T.colpito && stato.fase !== 'cade') {
      for (const r of stato.rami) {
        if (r.rotto) continue;
        if (hPrima < r.h - 0.5 || T.h > r.h) continue;
        if (Math.abs(dx(T.x, r.x)) > r.w / 2 + FISICA.piede) continue;
        atterra(r);
        break;
      }
    }

    if (giocando || stato.fase === 'menu') {
      // altezza raggiunta e telecamera
      if (!T.colpito && T.h > stato.alto) stato.alto = T.h;
      const vuole = T.h - alt * (stato.quota || 0.5);
      if (stato.fase !== 'cade' && vuole > stato.cam) stato.cam = vuole;
      if (stato.fase === 'menu') stato.cam = Math.max(0, Math.min(stato.cam, 1200));
      generaFino(stato.cam + alt + 600);
    }

    if (giocando) {
      const m = stato.alto / PX_M;
      const metri = Math.floor(m);
      // tappe
      const tp = tappaA(m);
      if (tp > stato.tappa) {
        stato.tappa = tp;
        messaggio(TAPPE[tp].nome, TAPPE[tp].sotto);
        suoni.tappa();
      }
      if (!stato.recordPassato && record > 20 && metri > record) {
        stato.recordPassato = true;
        scritta('Record!', T.x, T.h + 90, '#ffe066');
        suoni.record();
      }
      if (elMetri.textContent !== String(metri)) elMetri.textContent = metri;
    }

    aggiornaAgenti(dt);
    aggiornaRaccolta(dt);
    aggiornaPigne(dt);
    aggiornaVento(dt);
    aggiornaCapo(dt);
    for (const r of stato.rami) if (r.piega > 0) r.piega = Math.max(0, r.piega - dt * 3);

    // particelle e messaggi
    for (const p of stato.particelle) {
      p.t += dt;
      p.vy -= (p.g !== undefined ? p.g : p.foglia ? 120 : 600) * dt;
      if (p.foglia) { p.vx *= 1 - dt; p.rot += dt * 4; }
      p.x += p.vx * dt; p.h += p.vy * dt;
    }
    stato.particelle = stato.particelle.filter((p) => p.t < p.durata);
    for (const ms of stato.messaggi) ms.t += dt;
    stato.messaggi = stato.messaggi.filter((ms) => ms.t < ms.durata);
    if (stato.fumetto) { stato.fumetto.t -= dt; if (stato.fumetto.t <= 0) stato.fumetto = null; }

    // pulizia sotto lo schermo
    const sotto = stato.cam - 300;
    stato.rami = stato.rami.filter((r) => r.h > sotto || r.tipo === 'prato' && stato.cam < 400);
    stato.ghiande = stato.ghiande.filter((g) => g.h > sotto && !(g.presa && g.t > 0.4));
    stato.poteri = stato.poteri.filter((p) => p.h > sotto && !p.preso);
    stato.agenti = stato.agenti.filter((a) => a.h > sotto - 200);
    stato.bollette = stato.bollette.filter((b) => b.h > sotto && b.t < 6);

    // caduta fuori dallo schermo
    if (giocando && T.h < stato.cam - 90) {
      if (stato.fase === 'gioco') {
        stato.fase = 'cade';
        stato.statistiche.causa = stato.statistiche.causa || 'caduto';
        suoni.cade();
        stato.timerCade = 0;
      }
    }
    if (stato.fase === 'cade') {
      stato.timerCade += dt;
      if (stato.timerCade > 0.7) finisci();
    }
    if (stato.fase === 'menu' && T.h < stato.cam - 90) {
      demo();
    }
  }

  function atterra(r) {
    const T = stato.tino;
    T.h = r.h;
    T.schiaccia = 0.14;
    T.ultimoRamo = r;
    if (r.tipo === 'secco') {
      r.rotto = true;
      r.vy = 0;
      T.h = r.h - 0.01;
      T.vy = Math.min(T.vy, -60);
      if (r.mondo >= 3) suoni.nuvola(); else suoni.secco();
      foglioline(r.x, r.h, 4);
      if (stato.statistiche) stato.statistiche.secchi++;
      return;
    }
    let v = FISICA.salto;
    if (r.tipo === 'molla') {
      v = MOLLA.salto;
      r.piega = 1;
      T.deriva = r.lato * MOLLA.spinta;
      suoni.molla();
      foglioline(r.x + r.lato * r.w / 2, r.h, 3);
      if (stato.statistiche) stato.statistiche.molle++;
    } else if (r.fungo && Math.abs(dx(r.x + r.fungo.dx, T.x)) < 26) {
      v = FISICA.fungo;
      r.fungo.schiaccia = 1;
      suoni.fungo();
      scintille(T.x, T.h, '#ff6b5b', 8);
    } else {
      suoni.salto(Math.min(40, stato.alto / PX_M / 30));
    }
    T.vy = v;
    if (stato.statistiche) stato.statistiche.salti++;
  }

  function colpisci(causa) {
    const T = stato.tino;
    if (T.colpito || T.invulnerabile > 0 || stato.attivi.elica) return false;
    if (stato.attivi.bolla) {
      delete stato.attivi.bolla;
      T.invulnerabile = 1.2;
      suoni.scoppio();
      scintille(T.x, T.h + 36, '#bfe9ff', 14);
      scritta('Pop!', T.x, T.h + 80, '#bfe9ff');
      return true;
    }
    T.colpito = true;
    T.vy = Math.min(T.vy, 200);
    T.vx *= 0.3;
    if (stato.statistiche) { stato.statistiche.colpi++; stato.statistiche.causa = causa; }
    suoni.colpito();
    scintille(T.x, T.h + 36, '#ffe066', 12);
    return true;
  }

  function aggiornaAgenti(dt) {
    const T = stato.tino;
    for (const a of stato.agenti) {
      if (a.stordito) {
        a.vy -= FISICA.gravita * dt;
        a.h += a.vy * dt;
        a.rot += dt * 7 * a.verso;
        continue;
      }
      const r = a.ramo;
      a.h = r.h;
      if (r.rotto) { a.stordito = true; a.vy = 0; continue; }
      if (a.tipo === 'retino') {
        a.off += a.verso * AGENTE.passo * dt;
        const lim = r.w / 2 - AGENTE.larg / 2;
        if (Math.abs(a.off) > lim) { a.off = clamp(a.off, -lim, lim); a.verso *= -1; }
      } else {
        // il timbro guarda Tino e ogni tanto tira una bolletta verso di lui
        const d = dx(r.x, T.x);
        a.verso = d < 0 ? -1 : 1;
        a.lancia = Math.max(0, a.lancia - dt);
        a.ricarica -= dt;
        const vicino = Math.hypot(d, T.h - a.h) < AGENTE.portata;
        if (a.ricarica <= 0 && vicino && !T.colpito && stato.fase === 'gioco') {
          a.ricarica = AGENTE.timbro * tra(0.85, 1.15);
          a.lancia = 0.3;
          // bolletta a parabola verso dove è Tino adesso (leggera, con gravità bassa)
          const tVolo = 1.1;
          const g = 260;
          const vx = d / tVolo;
          const vy = (T.h + 30 - (a.h + 46)) / tVolo + 0.5 * g * tVolo;
          stato.bollette.push({ x: r.x, h: a.h + 46, vx: clamp(vx, -AGENTE.bolletta, AGENTE.bolletta), vy: clamp(vy, -AGENTE.bolletta, AGENTE.bolletta * 1.4), g, t: 0, rot: 0 });
          suoni.bolletta();
        }
      }
      a.x = giro(r.x + a.off);
      // contatto con Tino
      if (T.colpito || stato.fase !== 'gioco') continue;
      const ddx = Math.abs(dx(a.x, T.x));
      const sopra = T.h - a.h;
      if (ddx < AGENTE.larg / 2 + TINO.largo / 2 - 6 && sopra < AGENTE.alto - 4 && sopra > -TINO.alto + 8) {
        if (T.vy < 0 && sopra > AGENTE.alto * 0.45 || stato.attivi.elica) {
          // salto in testa: l'agente cade stordito
          a.stordito = true; a.vy = 300; a.rot = 0;
          T.vy = FISICA.salto * 1.05;
          T.h = Math.max(T.h, a.h + AGENTE.alto * 0.6);
          suoni.pestone();
          scintille(a.x, a.h + AGENTE.alto, '#ffe066', 12);
          scritta('Toh!', a.x, a.h + AGENTE.alto + 30, '#ffe066');
          prendiGhiande(3, a.x, a.h + AGENTE.alto);
          if (stato.statistiche) stato.statistiche.pestoni++;
        } else {
          colpisci('agente-' + a.tipo);
        }
      }
    }
    stato.agenti = stato.agenti.filter((a) => !a.stordito || a.h > stato.cam - 400);
    // bollette
    for (const b of stato.bollette) {
      b.t += dt;
      b.vy -= b.g * dt;
      b.x = giro(b.x + b.vx * dt);
      b.h += b.vy * dt;
      b.rot += dt * 6;
      if (!T.colpito && stato.fase === 'gioco' && Math.abs(dx(b.x, T.x)) < 22 && b.h > T.h - 6 && b.h < T.h + TINO.alto - 6) {
        if (colpisci('bolletta')) b.t = 99;
      }
    }
  }

  function prendiGhiande(n, x, h) {
    stato.ghiandePrese += n;
    aggiornaBarra();
    scritta('+' + n, x, h + 20, '#ffe066');
  }

  function aggiornaRaccolta(dt) {
    const T = stato.tino;
    const cx = T.x, ch = T.h + TINO.alto / 2;
    const calamita = !!stato.attivi.calamita;
    for (const g of stato.ghiande) {
      if (g.ramo) g.x = giro(g.ramo.x + g.dxr);
      if (g.presa) { g.t += dt; g.h += 160 * dt; continue; }
      if (T.colpito || stato.fase !== 'gioco') continue;
      const ddx = dx(g.x, cx), ddh = ch - g.h;
      const d = Math.hypot(ddx, ddh);
      if (calamita && d < POTERI.calamita.raggio) {
        g.ramo = null;
        const k = Math.min(1, dt * 9);
        g.x = giro(g.x + ddx * k); g.h += ddh * k;
      }
      if (d < 34) {
        g.presa = true; g.t = 0;
        stato.ghiandePrese++;
        aggiornaBarra();
        suoni.ghianda();
      }
    }
    for (const p of stato.poteri) {
      if (p.preso || T.colpito || stato.fase !== 'gioco') continue;
      if (Math.hypot(dx(p.x, cx), ch - p.h) < 38) {
        p.preso = true;
        stato.attivi[p.id] = POTERI[p.id].durata;
        if (stato.statistiche) stato.statistiche.poteri++;
        if (p.id === 'elica') suoni.elica(); else if (p.id === 'bolla') suoni.bolla(); else suoni.potere();
        scritta(POTERI[p.id].nome + '!', p.x, p.h + 40, '#fff');
        scintille(p.x, p.h, '#fff6a8', 12);
      }
    }
  }

  // ---------------------------------------------------------------- pericoli
  function tipoPigna() {
    const t = tappaA(stato.alto / PX_M);
    return t >= 4 ? 'stella' : t >= 3 ? 'grandine' : 'pigna';
  }

  function aggiornaPigne(dt) {
    const T = stato.tino;
    const m = stato.alto / PX_M;
    // mai insieme all'ispettore o al vento: un pericolo alla volta
    const calma = !stato.capo && stato.vento.fase === 'calma';
    if (stato.fase === 'gioco' && m >= PIGNA.da && calma && !T.colpito) {
      stato.prossimaPigna -= dt;
      if (stato.prossimaPigna <= 0) {
        stato.prossimaPigna = curva('pigne', m) * traR(0.8, 1.25);
        // cade dove è Tino, più o meno
        const x = giro(T.x + traR(-25, 25));
        const tipo = tipoPigna();
        const avviso = tipo === 'pigna' ? PIGNA.avviso : PIGNA.avvisoCielo;
        stato.pigne.push({ x, h: stato.cam + alt + 30, vx: 0, vy: 0, avviso, avviso0: avviso, tipo, rot: 0, colpito: false });
        suoni.avviso();
        if (stato.statistiche) stato.statistiche.pigne++;
      }
    }
    for (const p of stato.pigne) {
      if (p.avviso > 0) {
        p.avviso -= dt;
        p.h = stato.cam + alt + 30;
        if (p.avviso <= 0) { p.vy = -120; suoni.pigna(p.tipo); }
        continue;
      }
      p.vy = Math.max(-PIGNA.velMax, p.vy - PIGNA.gravita * dt);
      p.x = giro(p.x + p.vx * dt);
      p.h += p.vy * dt;
      p.rot += dt * (p.colpito ? 12 : 4);
      if (p.colpito || T.colpito || stato.fase !== 'gioco') continue;
      if (Math.abs(dx(p.x, T.x)) < PIGNA.urto
        && p.h > T.h - PIGNA.raggio + 4 && p.h < T.h + TINO.alto + PIGNA.raggio - 10) {
        if (colpisci(p.tipo)) { p.colpito = true; p.vy = 260; p.vx = (dx(T.x, p.x) < 0 ? -1 : 1) * 160; }
      }
    }
    stato.pigne = stato.pigne.filter((p) => p.avviso > 0 || p.h > stato.cam - 120);
  }

  function aggiornaVento(dt) {
    const V = stato.vento;
    const m = stato.alto / PX_M;
    const attivo = stato.fase === 'gioco' && m >= VENTO.da;
    if (!attivo) {
      V.v *= Math.exp(-4 * dt);
      if (V.fase === 'avviso' || stato.fase === 'menu') { V.fase = 'calma'; V.t = 4; V.v = 0; }
      if (V.fase === 'soffia' && stato.fase !== 'pausa') { V.t -= dt; if (V.t <= 0) V.fase = 'calma'; }
      return;
    }
    V.t -= dt;
    if (V.fase === 'calma') {
      if (V.t <= 0) {
        if (stato.capo || stato.pigne.some((p) => !p.colpito && p.h > stato.cam - 50)) V.t = 1.5;
        else {
          V.fase = 'avviso';
          V.t = VENTO.avviso;
          V.dir = rischio() < 0.5 ? -1 : 1;
          V.forza = curva('vento', m);
          suoni.ventoAvviso();
        }
      }
    } else if (V.fase === 'avviso') {
      if (V.t <= 0) {
        V.fase = 'soffia';
        V.durata = traR(VENTO.durata[0], VENTO.durata[1]);
        V.t = V.durata;
        suoni.vento(V.durata);
        if (stato.statistiche) stato.statistiche.raffiche++;
      }
    } else if (V.t <= 0) {
      V.fase = 'calma';
      V.t = curva('pausaVento', m) * traR(0.8, 1.25);
    }
    let k = 0;
    if (V.fase === 'soffia') k = clamp(Math.min((V.durata - V.t) / VENTO.salita, V.t / VENTO.salita), 0, 1);
    V.v = V.dir * V.forza * k;
    // strisce d'aria e foglie che volano: fanno vedere il vento
    if (Math.abs(V.v) > 30 && Math.random() < dt * 24) {
      const h = stato.cam + Math.random() * alt;
      const x = V.dir > 0 ? -20 : W + 20;
      if (Math.random() < 0.35) {
        stato.particelle.push({ x, h, vx: V.v * 1.8, vy: (Math.random() - 0.5) * 60, g: 0, t: 0, durata: 2.4, colore: stato.tappa >= 4 ? '#c9b8ff' : ['#6cbf4a', '#e0a84a', '#8fd06a'][Math.floor(Math.random() * 3)], r: 4, foglia: true, rot: Math.random() * 6 });
      } else {
        stato.particelle.push({ x, h, vx: V.v * (3 + Math.random() * 1.5), vy: 0, g: 0, t: 0, durata: 1.6, colore: stato.tappa >= 4 ? 'rgba(220, 210, 255, 0.8)' : 'rgba(70, 130, 190, 0.55)', r: 3, striscia: 50 + Math.random() * 50 });
      }
    }
  }

  function aggiornaCapo(dt) {
    const T = stato.tino;
    const m = stato.alto / PX_M;
    // la telecamera tiene Tino un po' più in alto quando c'è l'ispettore, così si vede
    const quota = stato.capo && stato.capo.fase === 'insegue' ? CAPO.quota : 0.5;
    stato.quota = stato.quota === undefined ? 0.5 : stato.quota + clamp(quota - stato.quota, -dt * 0.12, dt * 0.12);
    if (!stato.capo && stato.fase === 'gioco' && m >= stato.prossimoCapo && !T.colpito) {
      stato.prossimoCapo += CAPO.ogni;
      stato.capo = {
        x: giro(T.x + (rischio() < 0.5 ? -1 : 1) * traR(120, 200)),
        h: stato.cam - 260 - CAPO.alto, t: 0, fase: 'insegue', urla: 1.8, vel: 0,
      };
      stato.pigne = stato.pigne.filter((p) => p.avviso <= 0);
      if (stato.vento.fase === 'avviso') { stato.vento.fase = 'calma'; stato.vento.t = 3; }
      messaggio('L\'ispettore capo!', 'Scappa in alto, più in fretta che puoi!', 2.6);
      suoni.capo();
      if (stato.statistiche) stato.statistiche.capi++;
    }
    const C = stato.capo;
    if (!C) return;
    if (C.fase === 'insegue') {
      C.t += dt;
      const testa = C.h + CAPO.alto;
      // sotto lo schermo rincorre di corsa, poi sale alla sua velocità
      C.vel = testa < stato.alto - CAPO.distanza ? CAPO.rincorsa : curva('capo', m);
      if (stato.fase === 'gioco' || stato.fase === 'cade') C.h += C.vel * dt;
      const d = dx(C.x, T.x);
      C.x = giro(C.x + clamp(d, -CAPO.insegue * dt, CAPO.insegue * dt));
      C.urla -= dt;
      if (C.urla <= 0 && sy(testa) < alt + 10) {
        C.urla = 2.6;
        scritta('MULTA!', C.x, testa + 24, '#ff6b5b');
        suoni.megafono();
      }
      // preso?
      if (stato.fase === 'gioco' && !T.colpito
        && Math.abs(d) < CAPO.largo / 2 + TINO.largo / 2 - 8 && T.h < testa - 10) {
        const parato = !!stato.attivi.bolla;
        if (colpisci('capo') && parato) C.h -= CAPO.respinto;
      }
      if (C.t >= CAPO.durata && stato.fase === 'gioco' && !T.colpito) {
        C.fase = 'scende';
        messaggio('Seminato!', 'L\'ispettore torna giù a mani vuote', 2.2);
        prendiGhiande(10, T.x, T.h + TINO.alto + 20);
        suoni.seminato();
        if (stato.statistiche) stato.statistiche.seminati++;
      }
    } else {
      C.h -= 650 * dt;
      if (C.h + CAPO.alto < stato.cam - 300) stato.capo = null;
    }
  }

  // nel menu: Tino punta al ramo più alto vicino sopra di lui
  function pilotaDemo() {
    const T = stato.tino;
    if (T.vy > 0 && T.h < stato.cam + 60) return 0;
    let migliore = null;
    for (const r of stato.rami) {
      if (r.rotto || r.tipo === 'secco' || r.tipo === 'prato') continue;
      const apice = T.h + Math.max(0, T.vy) ** 2 / (2 * FISICA.gravita);
      if (r.h > apice - 20 || r.h < T.h - 40) continue;
      if (!migliore || r.h > migliore.h) migliore = r;
    }
    if (!migliore) return 0;
    const d = dx(T.x, migliore.x);
    return Math.abs(d) < 10 ? 0 : clamp(d / 60, -1, 1);
  }

  function aggiornaBarra() {
    elMetri.textContent = Math.floor(stato.alto / PX_M);
    elRecord.textContent = record > 0 ? `record ${record} m` : '';
    elGhiande.textContent = stato.ghiandePrese;
  }

  // ---------------------------------------------------------------- disegno
  function disegna() {
    const T = stato.tino;
    const m = stato.cam / PX_M;
    const pesi = pesiTappe(Math.max(0, (stato.cam + alt / 2) / PX_M));
    disegnaFondo(pesi);
    disegnaLineaRecord();
    // rami
    for (const r of stato.rami) {
      const y = sy(r.h);
      if (y < -40 || y > alt + 60) continue;
      disegnaRamo(r, y);
    }
    // ghiande e poteri
    for (const g of stato.ghiande) {
      const y = sy(g.h);
      if (y < -30 || y > alt + 30) continue;
      ctx.save();
      ctx.globalAlpha = g.presa ? Math.max(0, 1 - g.t / 0.4) : 1;
      const dondola = Math.sin(stato.tempo * 3 + g.x * 0.05) * 0.15;
      ripetiLati(g.x, 20, (x) => {
        ctx.save();
        ctx.translate(x, y + Math.sin(stato.tempo * 4 + g.h) * 2);
        ctx.rotate(dondola);
        if (pronta(immagini.ghianda)) ctx.drawImage(immagini.ghianda, -11, -13, 22, 26);
        ctx.restore();
      });
      ctx.restore();
    }
    for (const p of stato.poteri) {
      const y = sy(p.h);
      if (y < -40 || y > alt + 40) continue;
      ripetiLati(p.x, 30, (x) => disegnaPotere(p.id, x, y + Math.sin(stato.tempo * 3) * 4, 1));
    }
    // agenti e bollette
    for (const a of stato.agenti) disegnaAgente(a);
    for (const b of stato.bollette) disegnaBolletta(b);
    if (stato.capo) disegnaCapo(stato.capo);
    // Gino sul prato (solo all'inizio)
    disegnaGino();
    // Tino
    if (T) disegnaTino(T);
    for (const p of stato.pigne) disegnaPigna(p);
    // particelle
    for (const p of stato.particelle) {
      const y = sy(p.h);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.durata);
      ctx.fillStyle = p.colore;
      if (p.striscia) {
        ctx.strokeStyle = p.colore;
        ctx.lineWidth = p.r;
        ctx.lineCap = 'round';
        const d = Math.sign(p.vx) * p.striscia;
        ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x - d, y); ctx.stroke();
      } else if (p.foglia) {
        ctx.translate(p.x, y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(p.x, y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    disegnaAvvisi();
    disegnaMessaggi();
    if (inGioco() || stato.fase === 'fine') disegnaPoteriAttivi();
    if (girare) disegnaGira();
  }

  // disegna qualcosa vicino ai bordi anche dall'altra parte (il campo si richiude)
  function ripetiLati(x, mezzo, f) {
    f(x);
    if (x < mezzo) f(x + W);
    if (x > W - mezzo) f(x - W);
  }

  let fondoPagina = '';
  function disegnaFondo(pesi) {
    const top = mescola(TAPPE.map((t) => t.cielo[0]), pesi);
    const bot = mescola(TAPPE.map((t) => t.cielo[1]), pesi);
    // anche la pagina attorno al campo prende i colori della tappa
    const pag = `linear-gradient(${top}, ${bot})`;
    if (pag !== fondoPagina && Math.floor(stato.tempo * 10) % 3 === 0) { fondoPagina = pag; document.body.style.background = pag; }
    const gr = ctx.createLinearGradient(0, 0, 0, alt);
    gr.addColorStop(0, top); gr.addColorStop(1, bot);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, alt);
    const [pR, pT, pC, pCi, pS] = pesi;

    // stelle (molto lontane)
    if (pS > 0 || pCi > 0.5) {
      const a = pS + pCi * 0.15;
      const off = stato.cam * 0.08;
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 70; i++) {
        const x = hash(i * 7) * W;
        const y = ((hash(i * 13) * alt + off) % alt + alt) % alt;
        const r = 0.6 + hash(i * 19) * 1.6;
        ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(stato.tempo * 2 + i));
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (pS > 0) {
        // la luna
        ctx.globalAlpha = pS;
        ctx.fillStyle = '#fff6d0';
        ctx.beginPath();
        ctx.arc(W * 0.78, alt * 0.18, 34, 0, Math.PI * 2);
        ctx.arc(W * 0.78 + 14, alt * 0.18 - 8, 30, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // nuvole lontane
    const aNuv = pCi + pC * 0.5 + pT * 0.35 + pR * 0.4 + pS * 0.15;
    if (aNuv > 0) {
      ctx.fillStyle = '#fff';
      const passo = 260;
      const off = stato.cam * 0.25;
      const primo = Math.floor(off / passo) - 1;
      for (let k = primo; k < primo + alt / passo + 3; k++) {
        const y = alt - (k * passo - off);
        const x = hash(k * 17) * (W + 160) - 80;
        ctx.globalAlpha = aNuv * 0.55;
        nuvoletta(x, y, 50 + hash(k * 3) * 40);
      }
      ctx.globalAlpha = 1;
    }

    // il tronco della quercia, grande e dietro (scorre a metà della telecamera)
    const aTronco = pR + pT + pC * 0.7;
    if (aTronco > 0) {
      const off = stato.cam * 0.5;
      ctx.save();
      ctx.globalAlpha = aTronco * 0.8;
      const largo = 190;
      const x0 = W / 2 - largo / 2;
      const gt = ctx.createLinearGradient(x0, 0, x0 + largo, 0);
      gt.addColorStop(0, '#8a6a4c'); gt.addColorStop(0.35, '#b08a62'); gt.addColorStop(0.7, '#a07c56'); gt.addColorStop(1, '#7c5e42');
      ctx.fillStyle = gt;
      // il piede del tronco si allarga sul prato
      const yPrato = sy(0) - 4;
      ctx.beginPath();
      ctx.moveTo(x0, -10);
      ctx.lineTo(x0, Math.min(alt + 10, yPrato - 60));
      if (yPrato - 60 < alt + 10) {
        ctx.quadraticCurveTo(x0 - 10, yPrato - 10, x0 - 70, yPrato + 10);
        ctx.lineTo(x0 + largo + 70, yPrato + 10);
        ctx.quadraticCurveTo(x0 + largo + 10, yPrato - 10, x0 + largo, yPrato - 60);
      } else ctx.lineTo(x0 + largo, alt + 10);
      ctx.lineTo(x0 + largo, -10);
      ctx.closePath();
      ctx.fill();
      // venature della corteccia
      ctx.strokeStyle = 'rgba(70, 45, 22, 0.35)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const passo = 90;
      const primo = Math.floor(off / passo) - 1;
      for (let k = primo; k < primo + alt / passo + 3; k++) {
        const yb = alt - (k * passo - off);
        for (let j = 0; j < 4; j++) {
          const xx = x0 + 18 + j * 50 + (hash(k * 5 + j) - 0.5) * 26;
          const lungo = 40 + hash(k * 11 + j) * 50;
          ctx.beginPath();
          ctx.moveTo(xx, yb);
          ctx.bezierCurveTo(xx + 8, yb - lungo * 0.3, xx - 8, yb - lungo * 0.7, xx + 3, yb - lungo);
          ctx.stroke();
        }
        if (hash(k * 29) < 0.18) {
          // un buco nella corteccia
          const xx = x0 + 50 + hash(k * 31) * (largo - 100);
          ctx.fillStyle = 'rgba(60, 38, 18, 0.6)';
          ctx.beginPath(); ctx.ellipse(xx, yb - 30, 13, 18, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    // foglie della chioma, davanti al tronco ma dietro ai rami
    if (pC > 0 || pT > 0.3) {
      const a = pC + pT * 0.25;
      const off = stato.cam * 0.7;
      const passo = 70;
      const primo = Math.floor(off / passo) - 1;
      const verdi = ['#3f8f3a', '#4ea844', '#5fbf52', '#367a32'];
      for (let k = primo; k < primo + alt / passo + 3; k++) {
        const y = alt - (k * passo - off);
        for (let j = 0; j < 3; j++) {
          const sx = hash(k * 41 + j * 7);
          // più fitte ai lati, così il centro resta leggibile
          const x = sx < 0.5 ? sx * W * 0.5 : W - (sx - 0.5) * W * 0.5;
          const r = 28 + hash(k * 13 + j) * 30;
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillStyle = verdi[(k + j) & 3];
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.arc(x - r * 0.7, y + r * 0.3, r * 0.7, 0, Math.PI * 2);
          ctx.arc(x + r * 0.6, y + r * 0.4, r * 0.65, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 220, 0.18)';
          ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    // il prato in basso
    const yPrato = sy(0);
    if (yPrato < alt + 80) {
      ctx.fillStyle = '#6cbf4a';
      ctx.fillRect(0, yPrato, W, alt - yPrato + 10);
      ctx.fillStyle = '#58a83c';
      ctx.fillRect(0, yPrato + 26, W, alt - yPrato);
      // radici che affiorano
      ctx.strokeStyle = '#6b4424';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      for (const [x1, c, x2] of [[W / 2 - 110, -40, 30], [W / 2 + 110, 40, W - 30], [W / 2 - 60, -10, 120], [W / 2 + 60, 20, W - 140]]) {
        ctx.beginPath(); ctx.moveTo(x1, yPrato + 4); ctx.quadraticCurveTo((x1 + x2) / 2 + c, yPrato + 2, x2, yPrato + 22); ctx.stroke();
      }
      // fili d'erba e fiorellini
      for (let i = 0; i < 40; i++) {
        const x = hash(i * 3) * W;
        ctx.strokeStyle = '#3f8f2e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, yPrato + 2); ctx.lineTo(x + 3, yPrato - 7); ctx.stroke();
        if (i % 5 === 0) {
          ctx.fillStyle = ['#fff', '#ffe066', '#e8b6ff'][i % 3];
          ctx.beginPath(); ctx.arc(x + 6, yPrato + 12 + hash(i) * 20, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  function nuvoletta(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.arc(x - r * 0.6, y + r * 0.15, r * 0.4, 0, Math.PI * 2);
    ctx.arc(x + r * 0.6, y + r * 0.12, r * 0.42, 0, Math.PI * 2);
    ctx.arc(x + r * 0.2, y - r * 0.25, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  function disegnaLineaRecord() {
    if (record < 10 || stato.fase === 'menu') return;
    const y = sy(record * PX_M);
    if (y < 0 || y > alt) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 224, 102, 0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '600 15px Fredoka, sans-serif';
    ctx.fillStyle = 'rgba(60, 40, 0, 0.55)';
    ctx.fillText(`record ${record} m`, 11, y - 7);
    ctx.fillStyle = '#ffe066';
    ctx.fillText(`record ${record} m`, 10, y - 8);
    ctx.restore();
  }

  function disegnaRamo(r, y) {
    if (r.tipo === 'prato') return;
    ctx.save();
    if (r.rotto) {
      ctx.globalAlpha = Math.max(0, 1 - r.caduta * 1.6);
    }
    const nuvola = r.mondo >= 3;
    ripetiLati(r.x, r.w / 2 + 10, (x) => {
      ctx.save();
      ctx.translate(x, y);
      if (r.rotto) ctx.rotate((r.id % 2 ? 1 : -1) * r.caduta * 1.5);
      if (nuvola) disegnaNuvolaRamo(r);
      else if (r.tipo === 'mobile') disegnaFogliaRamo(r);
      else if (r.tipo === 'molla') disegnaMolla(r);
      else disegnaLegno(r);
      if (r.fungo) disegnaFungo(r);
      ctx.restore();
    });
    ctx.restore();
  }

  function disegnaLegno(r) {
    const w = r.w, secco = r.tipo === 'secco';
    const radice = r.mondo === 0;
    const spess = 14;
    ctx.fillStyle = secco ? '#c9b48e' : radice ? '#8a5530' : '#a8692f';
    ctx.strokeStyle = secco ? '#7a6648' : '#3e220c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 2);
    ctx.quadraticCurveTo(0, -3, w / 2, 1);
    ctx.quadraticCurveTo(w / 2 + 6, spess / 2, w / 2 - 2, spess - 1);
    ctx.quadraticCurveTo(0, spess + 3, -w / 2 + 2, spess);
    ctx.quadraticCurveTo(-w / 2 - 6, spess / 2, -w / 2, 2);
    ctx.fill(); ctx.stroke();
    // venatura
    ctx.strokeStyle = 'rgba(255, 230, 190, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 8, 5); ctx.lineTo(w / 2 - 12, 4); ctx.stroke();
    if (secco) {
      // crepe
      ctx.strokeStyle = '#4a3a24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, 0); ctx.lineTo(-1, 6); ctx.lineTo(-7, 10); ctx.lineTo(-2, spess);
      ctx.moveTo(w / 4, 1); ctx.lineTo(w / 4 + 4, 8);
      ctx.stroke();
    } else {
      // foglie sul ramo
      const verdi = ['#4ea844', '#6cbf4a', '#3f8f3a'];
      const n = radice ? 1 : 3;
      for (let i = 0; i < n; i++) {
        const fx = (hash(r.id * 7 + i) - 0.5) * (w - 20);
        ctx.fillStyle = verdi[i % 3];
        ctx.save();
        ctx.translate(fx, -1);
        ctx.rotate(-0.6 + hash(r.id + i * 3) * 1.2);
        ctx.beginPath(); ctx.ellipse(0, -6, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  }

  // ramo a molla: un ramo verde e flessibile col viticcio arricciato dalla parte
  // in cui lancia; quando Tino ci salta sopra si piega e poi vibra
  function disegnaMolla(r) {
    const w = r.w, L = r.lato, p = r.piega || 0;
    const piega = p > 0 ? 14 * p * Math.cos((1 - p) * Math.PI * 5) : 0;
    const spess = 11;
    ctx.fillStyle = '#9bcf55';
    ctx.strokeStyle = '#35601a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 1 - L * 4);
    ctx.quadraticCurveTo(0, piega * 2 - 1, w / 2, 1 + L * 4);
    ctx.quadraticCurveTo(w / 2 + 5, 1 + L * 4 + spess / 2, w / 2 - 2, spess + L * 4);
    ctx.quadraticCurveTo(0, piega * 2 + spess + 2, -w / 2 + 2, spess - L * 4);
    ctx.quadraticCurveTo(-w / 2 - 5, spess / 2 - L * 4, -w / 2, 1 - L * 4);
    ctx.fill(); ctx.stroke();
    // molla sotto il ramo
    ctx.strokeStyle = '#6b4424';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    const giu = spess + piega + 2;
    for (let i = 0; i <= 6; i++) {
      const x = (i % 2 ? 7 : -7);
      const y = giu + i * (16 - p * 6) / 6;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // viticcio arricciato dalla parte del lancio
    ctx.strokeStyle = '#35601a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const xe = L * (w / 2 - 4), ye = 1 + L * 4;
    ctx.moveTo(xe, ye);
    for (let a = 0; a < Math.PI * 3.2; a += 0.25) {
      const rr = 11 - a * 2.6;
      ctx.lineTo(xe + L * (6 + Math.sin(a) * rr), ye - 8 - (1 - Math.cos(a)) * rr * 0.9 + a);
    }
    ctx.stroke();
    // foglioline
    ctx.fillStyle = '#6cbf4a';
    for (const fx of [-0.25, 0.15]) {
      ctx.save();
      ctx.translate(fx * w, piega * (1 - Math.abs(fx) * 2) - 1);
      ctx.rotate(fx * 2);
      ctx.beginPath(); ctx.ellipse(0, -6, 4.5, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function disegnaFogliaRamo(r) {
    // una grande foglia che va avanti e indietro (ci si salta sopra)
    const w = r.w;
    ctx.fillStyle = '#5fbf52';
    ctx.strokeStyle = '#2f6b26';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 6, 6);
    ctx.quadraticCurveTo(-w / 4, -8, 0, -2);
    ctx.quadraticCurveTo(w / 4, -8, w / 2 + 6, 6);
    ctx.quadraticCurveTo(w / 4, 20, 0, 14);
    ctx.quadraticCurveTo(-w / 4, 20, -w / 2 - 6, 6);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(30, 80, 20, 0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-w / 2, 6); ctx.lineTo(w / 2, 6);
    for (let i = -2; i <= 2; i++) { ctx.moveTo(i * w / 6, 6); ctx.lineTo(i * w / 6 + 8, 0); }
    ctx.stroke();
  }

  function disegnaNuvolaRamo(r) {
    const w = r.w;
    const secca = r.tipo === 'secco';
    const notte = r.mondo >= 4;
    ctx.fillStyle = secca ? 'rgba(200, 205, 220, 0.75)' : r.tipo === 'mobile' ? (notte ? '#d8c8ff' : '#e9e0ff') : (notte ? '#e8ecff' : '#fff');
    ctx.strokeStyle = secca ? 'rgba(120, 130, 150, 0.8)' : notte ? '#8a90c0' : '#9cc8e6';
    ctx.lineWidth = 2;
    if (secca) ctx.setLineDash([5, 4]);
    ctx.beginPath();
    const n = Math.max(3, Math.round(w / 26));
    for (let i = 0; i < n; i++) {
      const cx = -w / 2 + 12 + i * (w - 24) / (n - 1);
      ctx.moveTo(cx + 15, 6);
      ctx.arc(cx, 6, 15 - (i % 2) * 3, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const cx = -w / 2 + 12 + i * (w - 24) / (n - 1);
      ctx.moveTo(cx + 13, 6);
      ctx.arc(cx, 6, 13 - (i % 2) * 3, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  function disegnaFungo(r) {
    const f = r.fungo;
    const s = 1 - f.schiaccia * 0.35;
    ctx.save();
    ctx.translate(f.dx, 0);
    ctx.scale(1 + f.schiaccia * 0.25, s);
    ctx.fillStyle = '#f3ead8';
    ctx.strokeStyle = '#6b4424';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-6, -16, 12, 16, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8483f';
    ctx.beginPath(); ctx.ellipse(0, -16, 20, 13, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    for (const [x, y, rr] of [[-9, -21, 3.5], [3, -25, 3], [11, -18, 2.6], [-2, -18, 2]]) {
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function disegnaPotere(id, x, y, scala = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scala, scala);
    // alone
    const al = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
    al.addColorStop(0, 'rgba(255, 250, 200, 0.9)'); al.addColorStop(1, 'rgba(255, 250, 200, 0)');
    ctx.fillStyle = al;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
    if (id === 'elica') disegnaElica(0, 6, 1, stato.tempo * 12);
    else if (id === 'bolla') {
      ctx.strokeStyle = 'rgba(120, 200, 255, 0.95)';
      ctx.fillStyle = 'rgba(190, 235, 255, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath(); ctx.ellipse(-6, -7, 5, 3, -0.6, 0, Math.PI * 2); ctx.fill();
    } else if (id === 'calamita') {
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#e8483f';
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(0, -2, 11, Math.PI, 0, true); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-11, -2); ctx.lineTo(-11, -12); ctx.moveTo(11, -2); ctx.lineTo(11, -12); ctx.stroke();
      ctx.strokeStyle = '#d9dde3';
      ctx.beginPath(); ctx.moveTo(-11, -12); ctx.lineTo(-11, -18); ctx.moveTo(11, -12); ctx.lineTo(11, -18); ctx.stroke();
    }
    ctx.restore();
  }

  // cappello a elica (accessorio, disegnato sopra la testa di Tino)
  function disegnaElica(x, y, s, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#f5c518';
    ctx.strokeStyle = '#7a4a22';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 9, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8483f';
    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.quadraticCurveTo(-6, -11, 0, -9); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4ea3e0';
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.quadraticCurveTo(6, -11, 0, -9); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a4a22';
    ctx.fillRect(-1.5, -16, 3, 8);
    const k = Math.cos(ang);
    ctx.fillStyle = '#4ea844';
    ctx.beginPath(); ctx.ellipse(0, -16, 18 * Math.abs(k) + 2, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function disegnaAgente(a) {
    const y = sy(a.h);
    if (y < -100 || y > alt + 100) return;
    const im = immagini[a.tipo];
    if (!pronta(im)) return;
    const h = AGENTE.alto + 10, w = h * 260 / 320;
    ripetiLati(a.x, w / 2, (x) => {
      ctx.save();
      ctx.translate(x, y);
      if (a.stordito) {
        ctx.translate(0, -h / 2);
        ctx.rotate(a.rot);
        ctx.translate(0, h / 2);
      } else {
        const passo = a.tipo === 'retino' ? Math.abs(Math.sin(stato.tempo * 8)) * 3 : 0;
        const lancio = a.lancia > 0 ? -0.12 * Math.sin(a.lancia / 0.3 * Math.PI) : 0;
        ctx.translate(0, -passo);
        ctx.rotate(lancio * a.verso + (a.tipo === 'retino' ? Math.sin(stato.tempo * 8) * 0.05 : 0));
      }
      ctx.drawImage(im, -w / 2, -h, w, h);
      ctx.restore();
    });
  }

  function disegnaBolletta(b) {
    const y = sy(b.h);
    ripetiLati(b.x, 14, (x) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(b.rot) * 0.5);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(-11, -14, 22, 28, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c0392b';
      ctx.font = '700 8px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TARI', 0, -4);
      ctx.fillStyle = '#999';
      ctx.fillRect(-7, 1, 14, 2); ctx.fillRect(-7, 6, 10, 2);
      ctx.restore();
    });
  }

  function disegnaPigna(p) {
    if (p.avviso > 0) return;
    const y = sy(p.h);
    if (y < -40 || y > alt + 40) return;
    ripetiLati(p.x, 20, (x) => {
      ctx.save();
      ctx.translate(x, y);
      if (p.tipo === 'stella') {
        // coda della stella cadente
        const gr = ctx.createLinearGradient(0, 0, 0, -70);
        gr.addColorStop(0, 'rgba(255, 236, 140, 0.8)'); gr.addColorStop(1, 'rgba(255, 236, 140, 0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(0, -75); ctx.lineTo(9, 0); ctx.fill();
        ctx.rotate(p.rot);
        ctx.fillStyle = '#ffe066';
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 5;
          const rr = i % 2 ? 6.5 : 15;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (p.tipo === 'grandine') {
        ctx.rotate(p.rot);
        ctx.fillStyle = '#e6f4ff';
        ctx.strokeStyle = '#7aa6c8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = i * Math.PI * 2 / 9;
          const rr = PIGNA.raggio * (0.85 + hash(i * 5) * 0.25);
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath(); ctx.ellipse(-4, -4, 4, 2.5, -0.6, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.rotate(Math.sin(p.rot) * 0.4 + Math.PI);
        // pigna: punta in basso, squame a file
        ctx.fillStyle = '#9a5f2c';
        ctx.strokeStyle = '#4a2a10';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, 0, 11, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#c0803f';
        for (let fila = 0; fila < 4; fila++) {
          const yy = -11 + fila * 7;
          const n = fila === 0 || fila === 3 ? 2 : 3;
          for (let i = 0; i < n; i++) {
            const xx = (i - (n - 1) / 2) * 7;
            ctx.beginPath(); ctx.moveTo(xx - 3.5, yy); ctx.quadraticCurveTo(xx, yy + 7, xx + 3.5, yy); ctx.closePath(); ctx.fill(); ctx.stroke();
          }
        }
        ctx.fillStyle = '#6b4424';
        ctx.fillRect(-1.5, -21, 3, 6);
      }
      ctx.restore();
    });
  }

  function disegnaCapo(C) {
    const testa = C.h + CAPO.alto;
    const yPiedi = sy(C.h);
    if (sy(testa) > alt + 10) return;
    const im = immagini.capo;
    // la pila di pratiche, dai piedi fino sotto lo schermo
    const colori = ['#f2e2b6', '#cfe3f5', '#f6c9d0', '#e9e4d8', '#d6efc4'];
    const spessore = 15;
    const quante = Math.min(80, Math.ceil((alt + 20 - yPiedi) / spessore) + 1);
    ripetiLati(C.x, CAPO.largo, (x) => {
      ctx.save();
      for (let i = 0; i < quante; i++) {
        const y = yPiedi + i * spessore;
        if (y > alt + 20) break;
        const off = (hash(i * 3 + 1) - 0.5) * 12;
        const larg = CAPO.largo + 6 + hash(i * 7) * 10;
        ctx.fillStyle = colori[i % colori.length];
        ctx.strokeStyle = '#6b5a3e';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(x - larg / 2 + off, y, larg, spessore - 1, 2); ctx.fill(); ctx.stroke();
        // fogli che spuntano e qualche timbro
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - larg / 2 + off + 5, y + 3, larg - 14, 2);
        if (hash(i * 11) < 0.25) {
          ctx.fillStyle = '#c0392b';
          ctx.font = '700 8px Fredoka, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('TARI', x + off + (hash(i) - 0.5) * 20, y + 12);
        }
      }
      if (pronta(im)) {
        const h = CAPO.alto + 12, w = h * 260 / 320;
        const ondeggia = C.fase === 'insegue' ? Math.sin(stato.tempo * 6) * 0.05 : 0.25;
        ctx.translate(x, yPiedi + 3);
        ctx.rotate(ondeggia);
        ctx.drawImage(im, -w / 2, -h, w, h);
      }
      ctx.restore();
    });
  }

  // avvisi: pigne che stanno per cadere, vento che arriva, ispettore sotto lo schermo
  function disegnaAvvisi() {
    const lampo = Math.floor(stato.tempo * 8) % 2 === 0;
    for (const p of stato.pigne) {
      if (p.avviso <= 0) continue;
      ripetiLati(p.x, 22, (x) => {
        ctx.save();
        ctx.globalAlpha = lampo ? 1 : 0.6;
        ctx.fillStyle = p.tipo === 'stella' ? '#ffe066' : '#ff6b5b';
        ctx.strokeStyle = '#4a1a10';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x - 15, 22); ctx.lineTo(x + 15, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '700 17px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', x, 41);
        // una riga sottile che scende: dove cadrà
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.moveTo(x, 56); ctx.lineTo(x, 56 + (1 - p.avviso / p.avviso0) * alt * 0.4); ctx.stroke();
        ctx.restore();
      });
    }
    const V = stato.vento;
    if (V && (V.fase === 'avviso' || V.fase === 'soffia') && inGioco()) {
      ctx.save();
      ctx.globalAlpha = V.fase === 'avviso' ? (lampo ? 1 : 0.45) : 0.55;
      ctx.font = '700 26px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(20, 40, 80, 0.75)';
      ctx.fillStyle = '#fff';
      const t = V.dir > 0 ? 'Vento ➜' : '⬅ Vento';
      ctx.strokeText(t, W / 2, 96);
      ctx.fillText(t, W / 2, 96);
      ctx.restore();
    }
    const C = stato.capo;
    if (C && C.fase === 'insegue' && sy(C.h + CAPO.alto) > alt - 4 && inGioco()) {
      ctx.save();
      ctx.globalAlpha = lampo ? 1 : 0.6;
      const x = clamp(C.x, 24, W - 24);
      ctx.fillStyle = '#ff6b5b';
      ctx.strokeStyle = '#4a1a10';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, alt - 46); ctx.lineTo(x - 15, alt - 18); ctx.lineTo(x + 15, alt - 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '700 17px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', x, alt - 23);
      ctx.restore();
    }
  }

  function disegnaGino() {
    if (!pronta(immagini.gino)) return;
    const y = sy(0);
    if (y > alt + 80) return;
    const h = 54, w = h * 381 / 470;
    const x = 70;
    let salta = 0, rot = 0;
    if (stato.fase === 'fine' || stato.fase === 'cade') { rot = Math.sin(stato.tempo * 14) * 0.08; }
    else salta = Math.abs(Math.sin(stato.tempo * 5)) * 12;
    ctx.save();
    ctx.translate(x, y - salta);
    ctx.rotate(rot);
    ctx.drawImage(immagini.gino, -w / 2, -h, w, h);
    ctx.restore();
    if (stato.fumetto) fumetto(stato.fumetto.testo, x + 10, y - h - salta - 12);
  }

  function fumetto(testo, x, y) {
    ctx.save();
    ctx.font = '600 17px Fredoka, sans-serif';
    const w = ctx.measureText(testo).width + 22;
    const bx = clamp(x - 20, 6, W - w - 6);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#7a4a22';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, y - 34, w, 30, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, y - 5); ctx.lineTo(x - 12, y + 8); ctx.lineTo(x + 4, y - 5); ctx.fill();
    ctx.fillStyle = '#3b2a1a';
    ctx.fillText(testo, bx + 11, y - 13);
    ctx.restore();
  }

  function disegnaTino(T) {
    let espr = 'normale';
    if (stato.fase === 'fine') espr = 'ko';
    else if (T.colpito) espr = 'ferito';
    else if (T.vy < -900 && !stato.attivi.elica) espr = 'arrabbiato';
    else if (stato.agenti.some((a) => !a.stordito && Math.abs(dx(a.x, T.x)) < 90 && Math.abs(a.h - T.h) < 110)) espr = 'arrabbiato';
    else if (stato.capo && stato.capo.fase === 'insegue' && T.h - (stato.capo.h + CAPO.alto) < 260) espr = 'arrabbiato';
    else if (stato.pigne.some((p) => p.avviso <= 0 && !p.colpito && Math.abs(dx(p.x, T.x)) < 60 && p.h > T.h && p.h - T.h < 320)) espr = 'arrabbiato';
    const im = immagini[espr];
    if (!pronta(im)) return;
    const y = sy(T.h);
    if (stato.fase === 'fine' && y > alt + 60) return;
    // misure: stessa altezza di Tino per tutte le espressioni (il ko è sdraiato)
    let h = TINO.alto, w = h * im.naturalWidth / im.naturalHeight;
    if (espr === 'ko') { w = TINO.alto * 1.2; h = w * im.naturalHeight / im.naturalWidth; }
    // schiacciamento all'atterraggio, allungamento in salita
    let sx = 1, syy = 1;
    if (T.schiaccia > 0) { const k = T.schiaccia / 0.14; sx = 1 + 0.18 * k; syy = 1 - 0.2 * k; }
    else if (T.vy > 400) { const k = Math.min(1, (T.vy - 400) / 600); sx = 1 - 0.06 * k; syy = 1 + 0.08 * k; }
    const lampeggia = T.invulnerabile > 0 && Math.floor(stato.tempo * 12) % 2 === 0;
    ripetiLati(T.x, w / 2 + 4, (x) => {
      ctx.save();
      ctx.translate(x, y);
      if (T.colpito) ctx.rotate(Math.sin(stato.tempo * 18) * 0.25);
      if (stato.attivi.elica) ctx.rotate(Math.sin(stato.tempo * 10) * 0.06);
      ctx.scale(sx * T.verso, syy);
      if (lampeggia) ctx.globalAlpha = 0.45;
      ctx.drawImage(im, -w / 2, -h, w, h);
      ctx.restore();
      if (stato.attivi.elica) disegnaElica(x + T.verso * 2, y - h * syy + 4, 1, stato.tempo * 30);
      if (stato.attivi.bolla) {
        ctx.save();
        const resta = stato.attivi.bolla;
        ctx.globalAlpha = resta < 2 && Math.floor(stato.tempo * 8) % 2 ? 0.3 : 0.85;
        ctx.strokeStyle = 'rgba(120, 200, 255, 0.95)';
        ctx.fillStyle = 'rgba(190, 235, 255, 0.22)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y - h / 2, h * 0.68, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath(); ctx.ellipse(x - h * 0.3, y - h * 0.8, 9, 5, -0.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      if (stato.attivi.calamita) {
        ctx.save();
        ctx.strokeStyle = 'rgba(232, 72, 63, 0.45)';
        ctx.lineWidth = 2;
        const k = (stato.tempo * 1.5) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(x, y - h / 2, 30 + k * 60, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    });
    if (T.colpito) {
      // stelline sulla testa
      for (let i = 0; i < 3; i++) {
        const a = stato.tempo * 6 + i * 2.1;
        ctx.fillStyle = '#ffe066';
        ctx.beginPath(); ctx.arc(T.x + Math.cos(a) * 20, y - h - 8 + Math.sin(a) * 6, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function disegnaMessaggi() {
    ctx.save();
    ctx.textAlign = 'center';
    for (const ms of stato.messaggi) {
      if (ms.grande) {
        const k = ms.t / ms.durata;
        const a = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
        ctx.globalAlpha = a;
        const y = alt * 0.3 - (1 - Math.min(1, k * 5)) * 20;
        ctx.font = '700 40px Fredoka, sans-serif';
        ctx.lineWidth = 7;
        ctx.strokeStyle = 'rgba(47, 30, 10, 0.75)';
        ctx.fillStyle = '#fff';
        ctx.strokeText(ms.testo, W / 2, y);
        ctx.fillText(ms.testo, W / 2, y);
        if (ms.sotto) {
          ctx.font = '600 19px Fredoka, sans-serif';
          ctx.lineWidth = 5;
          ctx.strokeText(ms.sotto, W / 2, y + 32);
          ctx.fillStyle = '#ffe9b0';
          ctx.fillText(ms.sotto, W / 2, y + 32);
        }
      } else {
        const k = ms.t / ms.durata;
        ctx.globalAlpha = 1 - k;
        const y = sy(ms.h) - k * 30;
        ctx.font = '700 20px Fredoka, sans-serif';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(47, 30, 10, 0.7)';
        ctx.fillStyle = ms.colore;
        const x = clamp(ms.x, 50, W - 50);
        ctx.strokeText(ms.testo, x, y);
        ctx.fillText(ms.testo, x, y);
      }
    }
    ctx.restore();
  }

  function disegnaPoteriAttivi() {
    let x = 30;
    for (const id of Object.keys(stato.attivi)) {
      const resta = stato.attivi[id] / POTERI[id].durata;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath(); ctx.arc(x, 32, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, 32, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * resta); ctx.stroke();
      ctx.restore();
      disegnaPotere(id, x, 32, 0.75);
      x += 52;
    }
  }

  function disegnaGira() {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 40, 16, 0.8)';
    ctx.fillRect(0, 0, W, alt);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '700 30px Fredoka, sans-serif';
    ctx.fillText('Gira il telefono', W / 2, alt / 2 - 10);
    ctx.font = '500 20px Fredoka, sans-serif';
    ctx.fillText('Salta, Tino! si gioca in verticale', W / 2, alt / 2 + 24);
    ctx.restore();
  }

  // ---------------------------------------------------------------- pannelli
  function pannelloAperto() { return pannello.classList.contains('visibile'); }
  function mostraPannello(html) {
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
    const alt = nome === 'gino' ? 'Gino' : 'Tino';
    return `<img src="${src}" alt="${alt}" class="${classe}">`;
  };

  function testoComandi() {
    const muovi = touch
      ? (comandi === 'inclina' ? '<b>inclina il telefono</b> a sinistra o a destra' : 'tieni il dito sulla <b>metà sinistra</b> o sulla <b>metà destra</b> dello schermo')
      : '<kbd>←</kbd> <kbd>→</kbd> (o <kbd>A</kbd> <kbd>D</kbd>), oppure tieni premuto il mouse su una metà del campo';
    return `<div class="comandi">
      <p>Tino salta da solo: tu lo sposti. Per muoverlo ${muovi}.</p>
      <ol>
        <li>Uscendo da un lato rientra dall'altro.</li>
        <li>I <b>rami secchi</b> e le <b>nuvole tratteggiate</b> si rompono: niente salto! Il <b>fungo</b> fa saltare altissimo.</li>
        <li>Il <b>ramo a molla</b> lancia più in alto e un po' di lato, dalla parte del viticcio.</li>
        <li>Gli <b>agenti della Tari</b> si stordiscono saltandoci in testa; toccarli di lato o prendere una bolletta fa cadere Tino.</li>
        <li>Se in cima compare un <b>!</b> sta per cadere una pigna: spostati. Nel cielo il <b>vento</b> spinge di lato.</li>
        <li>Ogni 500 m l'<b>ispettore capo</b> sale dal basso su una pila di pratiche: non si stordisce, va seminato salendo in fretta.</li>
        <li>Poteri: <b>cappello a elica</b> (vola su), <b>bolla</b> (para un colpo), <b>calamita</b> (attira le ghiande).</li>
      </ol>
      ${touch ? '' : '<p><kbd>P</kbd> pausa · <kbd>M</kbd> tutti i suoni · <kbd>N</kbd> solo la musica</p>'}
    </div>`;
  }

  function sceltaComandi() {
    if (!touch) return '';
    return `<div class="scelta-comandi">Comandi:
      <button class="scheda ${comandi === 'dito' ? 'attiva' : ''}" data-azione="dito">Dito</button>
      <button class="scheda ${comandi === 'inclina' ? 'attiva' : ''}" data-azione="inclina">Inclinazione</button>
    </div>${stato.avvisoInclina ? `<p class="nota">${stato.avvisoInclina}</p>` : ''}`;
  }

  function pannelloMenu() {
    const rec = record > 0 ? `<p class="record">Il tuo record: <b>${record} m</b>${recordGhiande ? ` · più ghiande in una salita: ${recordGhiande}` : ''}</p>` : '';
    return `<div class="riquadro">
      <div class="ritratti">${img('normale', 'salta')}${img('gino', 'gino salta')}</div>
      <h1>Salta, Tino!</h1>
      <p>Tino salta di ramo in ramo su per la grande quercia: dalle radici al tronco, tra le foglie della chioma, poi di nuvola in nuvola fino alle stelle. Quanto in alto arriverà?</p>
      ${rec}
      <div class="scelte">
        <button class="bottone" data-azione="gioca" data-primo>Gioca</button>
      </div>
      ${sceltaComandi()}
      ${testoComandi()}
    </div>`;
  }

  function pannelloPausa() {
    return `<div class="riquadro">
      <div class="ritratti">${img('normale')}${img('gino', 'gino')}</div>
      <h2>Pausa</h2>
      <div class="scelte">
        <button class="bottone" data-azione="riprendi" data-primo>Continua</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
      ${sceltaComandi()}
    </div>`;
  }

  function pannelloFine() {
    const r = stato.risultato;
    const dove = TAPPE[r.tappa].nome.toLowerCase();
    let titolo, testo, ritratti;
    if (r.nuovo && r.metri > 0) {
      titolo = 'Nuovo record!';
      testo = `Tino è arrivato più in alto che mai, fino ${dove === 'le stelle' ? 'alle stelle' : 'a ' + dove}! Gino fa il tifo da sotto.`;
      ritratti = `${img('normale', 'salta')}${img('gino', 'gino salta')}`;
    } else {
      const TITOLI = {
        bolletta: 'Una bolletta in faccia!', capo: 'Preso dall\'ispettore capo!',
        pigna: 'Una pigna in testa!', grandine: 'Un chicco di grandine!', stella: 'Una stella cadente!',
      };
      const TESTI = {
        caduto: 'Niente paura, è atterrato sul morbido. Si riparte?',
        capo: 'Quando arriva l\'ispettore non fermarti: sali più in fretta che puoi per 14 secondi.',
        pigna: 'Quando in cima compare il punto esclamativo, spostati: lì sta per cadere qualcosa.',
      };
      TESTI.grandine = TESTI.stella = TESTI.pigna;
      titolo = TITOLI[r.causa] || (r.causa && r.causa.startsWith('agente') ? 'Preso dalla Tari!' : 'Tino è caduto!');
      testo = TESTI[r.causa] || 'Ricorda: gli agenti si stordiscono saltandoci in testa.';
      ritratti = `${img('ko')}${img('gino', 'gino caduto')}`;
    }
    return `<div class="riquadro">
      <div class="ritratti">${ritratti}</div>
      <h2>${titolo}</h2>
      <div class="risultato">${r.metri} m</div>
      <p class="dettagli"><img src="ghianda.svg" alt="" class="ico-ghianda"> ${r.ghiande} ghiande · arrivato: ${TAPPE[r.tappa].nome.toLowerCase()} · record ${record} m</p>
      <p>${testo}</p>
      <div class="scelte">
        <button class="bottone" data-azione="gioca" data-primo>Ancora!</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  pannello.addEventListener('click', (e) => {
    const b = e.target.closest('[data-azione]');
    if (!b) return;
    const az = b.dataset.azione;
    if (az === 'gioca') avvia();
    else if (az === 'riprendi') riprendi();
    else if (az === 'menu') vaiAlMenu();
    else if (az === 'dito' || az === 'inclina') {
      const ridisegna = () => mostraPannello(stato.fase === 'pausa' ? pannelloPausa() : pannelloMenu());
      if (az === 'dito') { comandi = 'dito'; stato.avvisoInclina = ''; scrivi('comandi', comandi); ridisegna(); return; }
      chiediInclinazione().then((ok) => {
        if (ok) { comandi = 'inclina'; stato.avvisoInclina = ''; scrivi('comandi', comandi); }
        else stato.avvisoInclina = 'Questo telefono non lascia leggere l\'inclinazione: si gioca col dito.';
        ridisegna();
      });
    }
  });

  function cambiaAudio() {
    muto = !muto;
    scrivi('muto', muto);
    document.body.classList.toggle('muto', muto);
    aggiornaMusica();
  }
  function cambiaMusica() {
    musicaSpenta = !musicaSpenta;
    scrivi('musica-spenta', musicaSpenta);
    document.body.classList.toggle('senza-musica', musicaSpenta);
    aggiornaMusica();
  }
  $('#btn-pausa').addEventListener('click', (e) => {
    e.currentTarget.blur();
    if (stato.fase === 'pausa') riprendi(); else if (inGioco()) pausa();
  });
  $('#btn-audio').addEventListener('click', (e) => { e.currentTarget.blur(); cambiaAudio(); });
  $('#btn-musica').addEventListener('click', (e) => { e.currentTarget.blur(); cambiaMusica(); });

  // ---------------------------------------------------------------- avvio
  document.body.classList.toggle('muto', muto);
  document.body.classList.toggle('senza-musica', musicaSpenta);
  ridimensiona();
  aggiornaBarra();
  vaiAlMenu();

  let ultimo = performance.now();
  function ciclo(ora) {
    const dt = clamp((ora - ultimo) / 1000, 0, 0.05);
    ultimo = ora;
    if (!stato.test && !(girare && stato.fase !== 'menu')) {
      // passi piccoli: i rami sottili non si attraversano anche a scatti
      const n = Math.ceil(dt / (1 / 120));
      for (let i = 0; i < n; i++) aggiorna(dt / n);
    }
    disegna();
    requestAnimationFrame(ciclo);
  }
  requestAnimationFrame(ciclo);

  // utile per le prove automatiche
  window.saltaTino = {
    stato, avvia, aggiorna, finisci, curva, dx, posRamo, tappaA,
    premi: (v) => { stato.comando = clamp(v, -1, 1); },
    FISICA, TINO, TAPPE, CURVE, AGENTE, POTERI, PIGNA, MOLLA, VENTO, CAPO, PX_M, W,
    get alt() { return alt; },
  };
})();
