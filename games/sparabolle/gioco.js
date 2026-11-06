/*
 * Sparabolle
 * Tino spara bolle verso l'alto con la sua canna; Gino gli prepara la bolla
 * dopo. Tre o più bolle uguali che si toccano scoppiano, e quelle rimaste
 * staccate dal ramo cadono. Nell'avventura ogni tot tiri a vuoto il ramo
 * scende di una riga; nell'infinito e in due arrivano righe nuove dall'alto.
 *
 * Campo logico 480 × 780 per giocatore (in due: due campi affiancati, 1000 ×
 * 780). Bolle di raggio 20 su una griglia a nido d'ape di 11 colonne; il ramo
 * parte a y = 58 e le bolle non devono superare la linea dei fiori (13 righe).
 * La canna ha il perno a y = 640. Mondi e livelli sono in livelli.js.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------- costanti
  const FW = 480, FH = 780;      // un campo
  const SPAZIO = 40;             // tra i due campi, in due
  const MURO = 20;
  const D = 40, R = 20, RH = D * Math.sqrt(3) / 2;
  const COL = 11;
  const TOP0 = 58;               // cima della griglia (bordo del ramo) all'inizio
  const MAXR = 13;               // righe prima della linea dei fiori
  const LIMITE = TOP0 + (MAXR - 1) * RH + D;   // y della linea dei fiori
  const PERNO_Y = 640;

  const MONDI = window.SB_MONDI;
  const LIVELLI = window.SB_LIVELLI;

  // I sei tipi di bolla: colore della bolla e disegno dentro.
  const TIPI = [
    { id: 'ghianda', lettera: 'g', nome: 'ghianda', colore: '#e0953a' },
    { id: 'fragola', lettera: 'r', nome: 'fragolina', colore: '#e5484d' },
    { id: 'mirtillo', lettera: 'm', nome: 'mirtillo', colore: '#4a7ee8' },
    { id: 'fiore', lettera: 'f', nome: 'fiore giallo', colore: '#f2c623' },
    { id: 'violetta', lettera: 'v', nome: 'violetta', colore: '#a463dc' },
    { id: 'uvaspina', lettera: 'u', nome: 'uva spina', colore: '#5cbf47' },
  ];
  const LETTERA = Object.fromEntries(TIPI.map((t, i) => [t.lettera, i]));

  const TIRO = {
    velocita: 1300,      // px/s
    passo: 5,            // px per passo di simulazione (stesso per tiro, guida e computer)
    urto: 0.8,           // la bolla si ferma se passa a meno di urto × D da un'altra
    ricarica: 0.18,      // secondi tra un tiro e l'altro
  };
  const CANNA = {
    min: 10 * Math.PI / 180,     // angolo minimo sull'orizzontale
    ruota: 1.6,                  // rad/s con i tasti
    ruotaVeloce: 2.6,            // dopo mezzo secondo di tasto tenuto
    lunga: 64,
  };
  const PUNTI = {
    bolla: 10,           // ogni bolla che scoppia
    caduta: 20,          // ogni bolla che cade, × la catena (tiri di fila che fanno cadere)
    sponda: 50,          // per ogni rimbalzo sul muro di un tiro che fa scoppiare
    pulito: 1000,        // campo ripulito
    tiroRisparmiato: 100, // a fine livello, per ogni tiro sotto il par
  };
  const AIUTO = { dopo: 3, calo: 3 };   // dopo 3 sconfitte nello stesso livello
  // Infinito e due giocatori: ogni (secondi) arriva una riga nuova dall'alto.
  // [base, aumento per riga arrivata, limite]
  const INFINITO = {
    righe: 5, ogni: [12, -0.18, 4.5], colori: [[0, 4], [10, 5], [26, 6]],
    guida: 560, avviso: 2,
  };
  const DUE = {
    righe: 6, ogni: [15, -0.25, 6], colori: 5, guida: 560, avviso: 2,
    rigaOgni: 7,         // bolle d'attacco che fanno una riga nuova all'avversario
    pulito: 2,           // righe mandate all'avversario quando si ripulisce il campo
  };

  // Giocatori simulati (partita dimostrativa e prove automatiche).
  // errore: deviazione dell'angolo in gradi; mira: probabilità di scegliere il
  // tiro migliore (altrimenti uno a caso tra i primi cinque); scambia: probabilità
  // di usare lo scambio quando conviene; pensa: secondi prima di tirare.
  const IA = {
    principiante: { errore: 3.5, mira: 0.4, scambia: 0.15, pensa: 0.9 },
    medio: { errore: 2, mira: 0.7, scambia: 0.4, pensa: 0.7 },
    bravo: { errore: 0.7, mira: 0.95, scambia: 0.9, pensa: 0.5 },
  };

  const ASSETS = '../../assets/';
  const FONDALI = '../tino-bum/fondali/';
  const immagini = {
    normale: carica(ASSETS + 'tino/tino-normale.png'),
    arrabbiato: carica(ASSETS + 'tino/tino-arrabbiato.png'),
    ferito: carica(ASSETS + 'tino/tino-ferito.png'),
    ko: carica(ASSETS + 'tino/tino-ko.png'),
    gino: carica(ASSETS + 'gino/gino.png'),
  };
  const fondali = {};
  for (const m of MONDI) fondali[m.fondale] = carica(FONDALI + m.fondale + '.png');
  function carica(src) {
    const img = new Image();
    img.src = src;
    return img;
  }
  const pronta = (img) => img && img.complete && img.naturalWidth > 0;

  // ---------------------------------------------------------------- DOM
  const $ = (s) => document.querySelector(s);
  const canvas = $('#campo');
  const ctx = canvas.getContext('2d');
  const palco = $('#palco');
  const pannello = $('#pannello');
  const elPunti = $('#punti');
  const elInfo = $('#info');

  // ---------------------------------------------------------------- utilità
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const casuale = (a, b) => a + Math.random() * (b - a);
  const scegli = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const cresce = ([base, passo, limite], d) => {
    const v = base + passo * d;
    return passo >= 0 ? Math.min(limite, v) : Math.max(limite, v);
  };
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  function leggi(chiave, predefinito) {
    try {
      const v = localStorage.getItem('sparabolle:' + chiave);
      return v === null ? predefinito : JSON.parse(v);
    } catch (e) {
      return predefinito;
    }
  }
  function scrivi(chiave, valore) {
    try { localStorage.setItem('sparabolle:' + chiave, JSON.stringify(valore)); } catch (e) { /* niente */ }
  }

  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  // ---------------------------------------------------------------- stato
  const stato = {
    test: false,         // prove automatiche: niente suoni, niente pannelli, nessun avanzamento da solo
    modo: 'demo',        // 'demo' | 'avventura' | 'infinito' | 'due'
    fase: 'gioco',       // 'gioco' | 'pausa' | 'finita'
    livello: 0,
    aiuto: false,
    campi: [],
    particelle: [],
    scritte: [],
    fine: null,          // { t, esito } quando la partita è finita e si aspetta il pannello
    vittorie: [0, 0],    // in due, nella sessione
    perdite: {},         // sconfitte per livello (per l'aiuto)
  };
  let W = FW, H = FH;
  let muto = leggi('muto', false);
  let musicaSpenta = leggi('musica-spenta', false);
  let sbloccati = leggi('sbloccati', 1);
  let stelle = leggi('stelle', []);
  let recordInfinito = leggi('record-infinito', 0);

  const livello = () => LIVELLI[stato.livello];
  const mondo = () => MONDI[stato.modo === 'avventura' ? livello().mondo : 0];

  // ---------------------------------------------------------------- audio
  // Tutto sintetizzato con Web Audio (nessun file), come negli altri giochi.
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

  // pentatonica di Sol maggiore: a ogni bolla che scoppia nello stesso tiro la nota sale
  const SCALA = [392, 440, 494, 587, 659, 784, 880, 988, 1175, 1319, 1568, 1760, 1976, 2349];
  const EFFETTI = {
    tiro: () => { rumore(0.12, { tipo: 'bandpass', f: 900, f2: 2600, q: 1.1, vol: 0.06 }); tono(260, 0.1, { tipo: 'sine', f2: 520, vol: 0.05 }); },
    muro: () => tono(520, 0.04, { tipo: 'triangle', vol: 0.03 }),
    attacca: () => { tono(180, 0.08, { tipo: 'sine', f2: 120, vol: 0.12 }); rumore(0.04, { f: 1200, vol: 0.03 }); },
    scoppio(i) {
      const f = SCALA[Math.min(i, SCALA.length - 1)];
      tono(f, 0.09, { tipo: 'triangle', vol: 0.06, rit: i * 0.035 });
      tono(f * 2, 0.04, { tipo: 'sine', vol: 0.02, rit: i * 0.035 });
      rumore(0.05, { tipo: 'highpass', f: 3500, vol: 0.035, rit: i * 0.035 });
    },
    caduta(n) {
      rumore(0.35, { tipo: 'bandpass', f: 2200, f2: 500, q: 0.9, vol: 0.05 + Math.min(n, 12) * 0.006 });
      note([1568, 1319, 1175, 988], 0.05, { tipo: 'triangle', vol: 0.03, d: 0.08, rit: 0.05 });
    },
    scambia: () => { tono(700, 0.06, { tipo: 'sine', f2: 1000, vol: 0.04 }); tono(1000, 0.06, { tipo: 'sine', f2: 700, vol: 0.03, rit: 0.06 }); },
    avviso: () => { tono(300, 0.12, { tipo: 'square', vol: 0.025, filtro: 1200 }); },
    calo() {
      rumore(0.5, { tipo: 'bandpass', f: 400, f2: 160, q: 2, vol: 0.12 });
      tono(110, 0.35, { tipo: 'sawtooth', f2: 70, vol: 0.05, filtro: 600 });
    },
    riga: () => { rumore(0.3, { f: 900, f2: 300, vol: 0.08 }); tono(150, 0.2, { tipo: 'triangle', f2: 100, vol: 0.07 }); },
    attacco: () => note([880, 1175, 1568], 0.05, { tipo: 'square', vol: 0.025, filtro: 2600, d: 0.08 }),
    pulito: () => note([784, 988, 1175, 1568, 1976], 0.07, { tipo: 'triangle', vol: 0.06, d: 0.16 }),
    vinto: () => note([587, 784, 988, 1175, 988, 1175, 1568], 0.09, { tipo: 'triangle', vol: 0.07, d: 0.18 }),
    sconfitta: () => note([392, 330, 262, 196], 0.17, { tipo: 'sawtooth', vol: 0.04, filtro: 1500, d: 0.24 }),
  };
  const suoni = new Proxy(EFFETTI, {
    get: (o, k) => (...a) => { if (puoSuonare()) { try { o[k](...a); } catch (e) { /* niente */ } } },
  });

  // ---------------------------------------------------------------- musica
  // Musichetta in loop come negli altri giochi: basso saltellante, "pop" sugli
  // accordi, melodia a onda quadra. Menu calmo, partita più viva; quando le
  // bolle sono vicine ai fiori il filtro si apre e il charleston si fa fitto.
  const MUSICA = { bpm: [98, 120], volume: 0.26, anticipo: 0.2 };
  const NOTA = (n) => {
    const m = /^([A-G])(#?)(\d)$/.exec(n);
    return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  };
  const BRANO = [
    ['G2', 'M', 'B5 - D6 - B5 - G5 - A5 - B5 - D6 - - -'],
    ['C3', 'M', 'E6 - - C6 - - G5 - A5 - C6 - E6 - - -'],
    ['D3', 'M', 'F#6 - - D6 - - A5 - B5 - - - A5 - F#5 -'],
    ['G2', 'M', 'G5 - B5 - D6 - - - B5 - G5 - - - - -'],
    ['E3', 'm', 'E5 - G5 - B5 - E6 - D6 - B5 - G5 - - -'],
    ['C3', 'M', 'C6 - - E6 - - C6 - G5 - A5 - B5 - - -'],
    ['D3', 'M', 'A5 - F#5 - D5 - F#5 - A5 - B5 - C6 - - -'],
    ['D3', '7', 'D6 - - - C6 - - - B5 - - - A5 - F#5 -'],
  ].map(([radice, tipo, mel]) => ({
    radice: NOTA(radice),
    accordo: { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 10] }[tipo],
    melodia: mel.split(' ').map((n) => (n === '-' ? null : NOTA(n))),
  }));
  const BASSO = { 0: 0, 2: 12, 4: 7, 6: 12, 8: 0, 10: 7, 11: 10, 12: 12, 14: 7 };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const musica = { passo: 0, prossimo: 0, suona: false, uscita: null, filtro: null };

  function inPartita() {
    return stato.modo !== 'demo' && (stato.fase === 'gioco' || stato.fase === 'pausa') && !stato.fine;
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
  const pop = (t, m, vol) => notaMusica(t, 'sine', hz(m) * 2.2, vol, 0.11, musica.uscita, hz(m), 0.025);

  function passoMusica(n, t, liv, teso, durata) {
    const battuta = BRANO[Math.floor(n / 16) % BRANO.length];
    const i = n % 16;
    const acc = battuta.accordo.map((x) => battuta.radice + 24 + x);
    if (BASSO[i] !== undefined && (liv === 1 || i % 4 === 0)) {
      const m = battuta.radice - 12 + BASSO[i];
      notaMusica(t, 'triangle', hz(m), 0.3, durata * 1.5);
      notaMusica(t, 'square', hz(m), 0.04, durata * 0.8);
    }
    if (i % 4 === 2) pop(t, acc[(i >> 2) % 3] + 12, 0.15);
    if (teso && i % 2 === 1) pop(t, acc[(n >> 1) % 3] + 24, 0.06);
    const mel = battuta.melodia[i];
    if (mel !== null) {
      const lunga = battuta.melodia.slice(i + 1).findIndex((x) => x !== null);
      const dur = durata * Math.min(4, lunga < 0 ? 4 : lunga + 1) * 0.9;
      notaMusica(t, 'square', hz(mel), liv === 0 ? 0.055 : 0.075, dur, musica.filtro);
      notaMusica(t, 'triangle', hz(mel + 12), 0.03, dur * 0.6, musica.filtro);
    }
    if (liv === 1 && (i === 0 || i === 8 || i === 10)) notaMusica(t, 'sine', 150, 0.5, 0.16, musica.uscita, 45, 0.12);
    if (liv === 0 && i === 0) notaMusica(t, 'sine', 120, 0.22, 0.12, musica.uscita, 50, 0.1);
    if (liv === 1 && (i === 4 || i === 12)) rumoreMusica(t, 0.16, 0.12, 'bandpass', 1800);
    if (liv === 1 && i % 2 === 0 && (teso || i % 4 === 2)) rumoreMusica(t, teso ? 0.07 : 0.05, 0.035, 'highpass', 7000);
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
    const liv = inPartita() ? 1 : 0;
    const teso = liv === 1 && stato.campi.some((c) => c.stato === 'gioco' && pericolo(c) >= MAXR - 3);
    musica.filtro.frequency.setTargetAtTime(teso ? 3800 : liv ? 2400 : 1500, t, 0.3);
    if (musica.prossimo < t) musica.prossimo = t + 0.03;
    const durata = 60 / MUSICA.bpm[liv] / 4;
    while (musica.prossimo < t + MUSICA.anticipo) {
      try { passoMusica(musica.passo, musica.prossimo, liv, teso, durata); } catch (e) { musica.errore = e; }
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
  let scala = 1, dpr = 1;
  const vuoleOrizzontale = () => stato.modo === 'due';
  function ridimensiona(controlla = true) {
    W = stato.modo === 'due' ? FW * 2 + SPAZIO : FW;
    H = FH;
    document.body.classList.toggle('vuole-orizzontale', vuoleOrizzontale());
    $('#gira-testo').textContent = vuoleOrizzontale()
      ? 'In due il telefono va tenuto in orizzontale: giralo!'
      : 'Gira il telefono in verticale per giocare';
    const r = palco.getBoundingClientRect();
    const aw = Math.max(100, r.width - 16);
    const ah = Math.max(100, r.height - 16);
    scala = Math.min(aw / W, ah / H);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = Math.round(W * scala) + 'px';
    canvas.style.height = Math.round(H * scala) + 'px';
    canvas.width = Math.round(W * scala * dpr);
    canvas.height = Math.round(H * scala * dpr);
    ctx.setTransform(scala * dpr, 0, 0, scala * dpr, 0, 0);
    // telefono girato dalla parte sbagliata: compare l'invito a girarlo, quindi pausa
    if (controlla === true && touch && inPartita() && orientamentoSbagliato()) pausa();
  }
  function orientamentoSbagliato() {
    const orizzontale = window.innerWidth > window.innerHeight;
    if (vuoleOrizzontale()) return !orizzontale && window.innerWidth <= 820;
    return orizzontale && window.innerHeight <= 520;
  }
  new ResizeObserver(() => ridimensiona()).observe(palco);

  // ---------------------------------------------------------------- griglia
  // Ogni campo ha le sue righe; la riga r è "spostata" (10 bolle, mezza bolla a
  // destra) se (r + fase) è dispari. Quando arriva una riga nuova dall'alto la
  // fase si inverte, così le righe vecchie restano come erano.
  const spostata = (c, r) => ((r + c.fase) & 1) === 1;
  const colonne = (c, r) => (spostata(c, r) ? COL - 1 : COL);
  const valida = (c, r, k) => r >= 0 && k >= 0 && k < colonne(c, r);
  const cella = (c, r, k) => (c.righe[r] ? c.righe[r][k] || null : null);
  const cima = (c) => TOP0 + c.discese * RH;
  const cx = (c, r, k) => c.ox + MURO + R + k * D + (spostata(c, r) ? R : 0);
  const cy = (c, r, top = cima(c)) => top + R + r * RH;

  function vicini(c, r, k) {
    const v = [[r, k - 1], [r, k + 1]];
    const d = spostata(c, r) ? [k, k + 1] : [k - 1, k];
    for (const rr of [r - 1, r + 1]) for (const kk of d) v.push([rr, kk]);
    return v.filter(([a, b]) => valida(c, a, b));
  }

  function rigaVuota() { return new Array(COL).fill(null); }
  function metti(c, r, k, b) {
    while (c.righe.length <= r) c.righe.push(rigaVuota());
    c.righe[r][k] = b;
  }
  function* tutte(c) {
    for (let r = 0; r < c.righe.length; r++) {
      for (let k = 0; k < COL; k++) if (c.righe[r][k]) yield [r, k, c.righe[r][k]];
    }
  }
  function conta(c) {
    let n = 0;
    for (const _ of tutte(c)) n++;
    return n;
  }
  function tipiPresenti(c) {
    const s = new Set();
    for (const [, , b] of tutte(c)) s.add(b.t);
    return [...s];
  }
  // riga più bassa occupata, contando quanto è sceso il ramo
  function pericolo(c) {
    let m = -1;
    for (const [r] of tutte(c)) m = Math.max(m, r);
    return m < 0 ? -1 : m + c.discese;
  }

  function gruppo(c, r, k) {
    const t = cella(c, r, k).t;
    const visto = new Set([r * COL + k]);
    const coda = [[r, k]];
    const fuori = [];
    while (coda.length) {
      const [a, b] = coda.pop();
      fuori.push([a, b]);
      for (const [x, y] of vicini(c, a, b)) {
        const q = cella(c, x, y);
        if (q && q.t === t && !visto.has(x * COL + y)) { visto.add(x * COL + y); coda.push([x, y]); }
      }
    }
    return fuori;
  }
  // bolle non più attaccate al ramo (riga 0)
  function staccate(c) {
    const visto = new Set();
    const coda = [];
    for (let k = 0; k < COL; k++) if (cella(c, 0, k)) { visto.add(k); coda.push([0, k]); }
    while (coda.length) {
      const [a, b] = coda.pop();
      for (const [x, y] of vicini(c, a, b)) {
        if (cella(c, x, y) && !visto.has(x * COL + y)) { visto.add(x * COL + y); coda.push([x, y]); }
      }
    }
    const fuori = [];
    for (const [r, k] of tutte(c)) if (!visto.has(r * COL + k)) fuori.push([r, k]);
    return fuori;
  }

  // ---------------------------------------------------------------- traiettoria
  // Un passo di TIRO.passo px: rimbalza sui muri; true se la bolla si ferma.
  function passo(c, p, top) {
    p.x += p.dx * TIRO.passo;
    p.y += p.dy * TIRO.passo;
    const xmin = c.ox + MURO + R, xmax = c.ox + FW - MURO - R;
    if (p.x < xmin) { p.x = 2 * xmin - p.x; p.dx = -p.dx; p.rimbalzi++; p.muro = true; }
    if (p.x > xmax) { p.x = 2 * xmax - p.x; p.dx = -p.dx; p.rimbalzi++; p.muro = true; }
    if (p.y <= top + R) { p.y = top + R; return true; }
    const r0 = Math.floor((p.y - top - R) / RH);
    const lim = (D * TIRO.urto) ** 2;
    for (let r = Math.max(0, r0 - 1); r <= r0 + 2 && r < c.righe.length; r++) {
      const riga = c.righe[r];
      const y = top + R + r * RH;
      for (let k = 0; k < COL; k++) {
        if (!riga[k]) continue;
        const dx = cx(c, r, k) - p.x, dy = y - p.y;
        if (dx * dx + dy * dy < lim) return true;
      }
    }
    return false;
  }

  // dove si attacca una bolla ferma in (x, y): la casella libera più vicina,
  // attaccata al ramo o a un'altra bolla
  function trovaCella(c, x, y, top = cima(c)) {
    const rr = Math.round((y - top - R) / RH);
    let meglio = null, dm = Infinity;
    for (let r = Math.max(0, rr - 1); r <= rr + 1; r++) {
      for (let k = 0; k < colonne(c, r); k++) {
        if (cella(c, r, k)) continue;
        if (r > 0 && !vicini(c, r, k).some(([a, b]) => cella(c, a, b))) continue;
        const d = (cx(c, r, k) - x) ** 2 + (cy(c, r, top) - y) ** 2;
        if (d < dm) { dm = d; meglio = [r, k]; }
      }
    }
    if (!meglio) {
      // non dovrebbe succedere: la più vicina della prima riga
      let k = clamp(Math.round((x - c.ox - MURO - R - (spostata(c, 0) ? R : 0)) / D), 0, colonne(c, 0) - 1);
      while (cella(c, 0, k) && k > 0) k--;
      meglio = [0, k];
    }
    return meglio;
  }

  const perno = (c) => ({ x: c.ox + FW / 2, y: PERNO_Y });
  function simula(c, angolo, maxPassi = 2000) {
    const o = perno(c);
    const p = { x: o.x, y: o.y, dx: Math.cos(angolo), dy: -Math.sin(angolo), rimbalzi: 0 };
    const top = cima(c);
    const punti = [{ x: p.x, y: p.y }];
    let i = 0;
    for (; i < maxPassi; i++) {
      p.muro = false;
      const fermo = passo(c, p, top);
      if (p.muro) punti.push({ x: p.x, y: p.y });
      if (fermo) break;
    }
    punti.push({ x: p.x, y: p.y });
    return { punti, cella: trovaCella(c, p.x, p.y, top), rimbalzi: p.rimbalzi };
  }

  // ---------------------------------------------------------------- campi
  function nuovoCampo(i, ox, eroe) {
    return {
      i, ox, eroe,
      righe: [], fase: 0, discese: 0, topVis: TOP0, spinta: 0,
      angolo: Math.PI / 2, mira: null,
      colore: 0, prossimo: 0, scambioT: 0, caricaT: 0,
      tiro: null, ricarica: 0,
      aVuoto: 0, soglia: 8, guida: Infinity,
      punti: 0, tiri: 0, catena: 0, scoppiate: 0,
      stato: 'gioco', morteT: 0,
      timer: 0, ogni: 0, arrivate: 0, nColori: 4, avvisato: false,
      attacchi: 0,
      ia: null, iaT: 0, iaAngolo: null,
      eroeA: { faccia: null, facciaT: 0, tremaT: 0, saltoT: 0, caduta: 0, festa: false, inclina: 0 },
      aiutanteA: { tremaT: 0, saltoT: 0, caduta: 0, festa: false },
      tasti: null,   // { sx, dx, tira, scambia } in due
    };
  }

  function caricaRighe(c, righe) {
    c.righe = [];
    righe.forEach((s, r) => {
      const celle = s.replace(/\s+/g, '');
      metti(c, r, 0, null);
      for (let k = 0; k < celle.length && k < colonne(c, r); k++) {
        const t = LETTERA[celle[k]];
        if (t !== undefined) metti(c, r, k, { t, nuova: 0 });
      }
    });
  }

  function rigaCasuale(c, tipi) {
    const riga = rigaVuota();
    const n = colonne(c, 0);
    for (let k = 0; k < n; k++) {
      // a volte la stessa bolla di quella a sinistra o di quella sotto: gruppetti
      let t = scegli(tipi);
      if (k > 0 && Math.random() < 0.38) t = riga[k - 1].t;
      else if (Math.random() < 0.22) {
        const sotto = cella(c, 1, spostata(c, 0) ? k : Math.max(0, k - 1));
        if (sotto && tipi.includes(sotto.t)) t = sotto.t;
      }
      riga[k] = { t, nuova: 0.35 };
    }
    return riga;
  }
  // una riga nuova dall'alto (infinito, due giocatori, attacchi)
  function nuovaRiga(c, tipi) {
    c.fase ^= 1;
    c.righe.unshift(rigaVuota());
    // si genera dopo lo spostamento, così la parità della riga 0 è quella giusta
    const riga = rigaCasuale(c, tipi);
    c.righe[0] = riga;
    while (c.righe.length > MAXR + 2) c.righe.pop();
    c.spinta = -RH;
    c.arrivate++;
  }

  function nuovoColore(c) {
    const p = tipiPresenti(c);
    return p.length ? scegli(p) : c.colore;
  }
  // la bolla in canna e quella dopo sono sempre di un tipo ancora in campo
  function controllaColori(c) {
    const p = tipiPresenti(c);
    if (!p.length) return;
    if (!p.includes(c.colore)) c.colore = scegli(p);
    if (!p.includes(c.prossimo)) c.prossimo = scegli(p);
  }

  // ---------------------------------------------------------------- partite
  function preparaPartita(modo) {
    stato.modo = modo;
    stato.fase = 'gioco';
    stato.fine = null;
    stato.particelle = [];
    stato.scritte = [];
    ridimensiona(false);
  }
  function primeBolle(c) {
    c.colore = nuovoColore(c);
    c.prossimo = nuovoColore(c);
    c.caricaT = 0.3;
  }

  function iniziaAvventura(n = 0, opzioni = {}) {
    preparaPartita('avventura');
    stato.livello = n;
    stato.aiuto = !!opzioni.aiuto;
    const l = livello();
    const c = nuovoCampo(0, 0, 'tino');
    caricaRighe(c, l.righe);
    c.soglia = l.calo + (stato.aiuto ? AIUTO.calo : 0);
    c.guida = stato.aiuto ? Infinity : l.guida;
    primeBolle(c);
    stato.campi = [c];
    if (!opzioni.silenzio) nascondiPannello();
    aggiornaTabellone();
    mostraScritta(c, FW / 2, 380, `${n + 1}. ${l.nome}`, 2.2, 30);
  }

  function preparaInfinito(c, tipi, righe) {
    c.righe = [];
    for (let i = 0; i < righe; i++) nuovaRiga(c, tipi);
    c.spinta = 0;
    c.arrivate = 0;
  }
  function iniziaInfinito(opzioni = {}) {
    preparaPartita(opzioni.demo ? 'demo' : 'infinito');
    const c = nuovoCampo(0, 0, 'tino');
    c.nColori = coloriInfinito(0);
    preparaInfinito(c, tipiInfinito(c), INFINITO.righe);
    c.ogni = cresce(INFINITO.ogni, 0);
    c.timer = c.ogni;
    c.guida = INFINITO.guida;
    primeBolle(c);
    stato.campi = [c];
    if (opzioni.demo) c.ia = IA.bravo;
    else nascondiPannello();
    aggiornaTabellone();
  }
  const coloriInfinito = (arrivate) => INFINITO.colori.filter(([a]) => arrivate >= a).pop()[1];
  const tipiInfinito = (c) => [0, 1, 2, 3, 4, 5].slice(0, c.nColori);

  function iniziaDue(opzioni = {}) {
    preparaPartita('due');
    const a = nuovoCampo(0, 0, 'tino');
    const b = nuovoCampo(1, FW + SPAZIO, 'gino');
    // stesse bolle all'inizio per tutti e due
    const tipi = [0, 1, 2, 3, 4, 5].slice(0, DUE.colori);
    preparaInfinito(a, tipi, DUE.righe);
    b.fase = a.fase;
    b.righe = a.righe.map((riga) => riga.map((x) => (x ? { t: x.t, nuova: 0 } : null)));
    for (const c of [a, b]) {
      c.nColori = DUE.colori;
      c.ogni = cresce(DUE.ogni, 0);
      c.timer = c.ogni;
      c.guida = DUE.guida;
      c.soglia = Infinity;
    }
    primeBolle(a);
    b.colore = a.colore; b.prossimo = a.prossimo; b.caricaT = 0.3;
    a.tasti = { sx: ['KeyA'], dx: ['KeyD'], tira: ['KeyW'], scambia: ['KeyS'] };
    b.tasti = { sx: ['ArrowLeft'], dx: ['ArrowRight'], tira: ['ArrowUp', 'Enter'], scambia: ['ArrowDown'] };
    if (opzioni.ia) { a.ia = opzioni.ia[0]; b.ia = opzioni.ia[1]; }
    stato.campi = [a, b];
    if (!opzioni.silenzio) nascondiPannello();
    aggiornaTabellone();
  }

  function iniziaDemo() {
    iniziaInfinito({ demo: true });
  }

  // ---------------------------------------------------------------- comandi
  function spara(c, angolo = c.angolo) {
    if (stato.fase !== 'gioco' || c.stato !== 'gioco' || c.tiro || c.ricarica > 0 || c.caricaT > 0) return false;
    c.angolo = clamp(angolo, CANNA.min, Math.PI - CANNA.min);
    const o = perno(c);
    c.tiro = { x: o.x, y: o.y, dx: Math.cos(c.angolo), dy: -Math.sin(c.angolo), rimbalzi: 0, t: c.colore, resto: 0 };
    c.colore = c.prossimo;
    c.prossimo = nuovoColore(c);
    c.caricaT = 0.22;
    c.tiri++;
    c.eroeA.inclina = 0.12;
    suoni.tiro();
    return true;
  }
  function scambia(c) {
    if (stato.fase !== 'gioco' || c.stato !== 'gioco' || c.caricaT > 0) return;
    [c.colore, c.prossimo] = [c.prossimo, c.colore];
    c.scambioT = 0.2;
    suoni.scambia();
  }
  function mira(c, angolo) {
    c.angolo = clamp(angolo, CANNA.min, Math.PI - CANNA.min);
  }

  // ---------------------------------------------------------------- aggiornamento
  function aggiorna(dt) {
    if (stato.fase === 'pausa') return;
    for (const c of stato.campi) aggiornaCampo(c, dt);
    aggiornaParticelle(dt);
    for (const s of stato.scritte) s.t -= dt;
    stato.scritte = stato.scritte.filter((s) => s.t > 0);
    controllaFine(dt);
  }

  function aggiornaCampo(c, dt) {
    const top = cima(c);
    c.topVis += (top - c.topVis) * Math.min(1, dt * 10);
    c.spinta += (0 - c.spinta) * Math.min(1, dt * 9);
    c.ricarica = Math.max(0, c.ricarica - dt);
    c.caricaT = Math.max(0, c.caricaT - dt);
    c.scambioT = Math.max(0, c.scambioT - dt);
    for (const a of [c.eroeA, c.aiutanteA]) {
      a.tremaT = Math.max(0, a.tremaT - dt);
      a.saltoT = Math.max(0, a.saltoT - dt);
      if (a.facciaT !== undefined) { a.facciaT = Math.max(0, a.facciaT - dt); if (!a.facciaT) a.faccia = null; }
    }
    c.eroeA.inclina *= Math.max(0, 1 - dt * 8);
    for (const [, , b] of tutte(c)) if (b.nuova > 0) b.nuova = Math.max(0, b.nuova - dt);

    if (c.stato === 'perso') {
      // le bolle si spengono e cadono una alla volta, dal basso
      c.eroeA.caduta = Math.min(1, c.eroeA.caduta + dt * 2);
      c.aiutanteA.caduta = Math.min(1, c.aiutanteA.caduta + dt * 2);
      c.morteT -= dt;
      while (c.morteT <= 0) {
        c.morteT += 0.035;
        let ultima = null;
        for (const x of tutte(c)) ultima = x;
        if (!ultima) break;
        const [r, k, b] = ultima;
        cade(c, r, k, b, true);
        c.righe[r][k] = null;
      }
      return;
    }
    if (c.stato !== 'gioco') return;

    if (c.tasti) muoviConTasti(c, dt, c.tasti);
    else if (stato.campi.length === 1 && !c.ia) muoviConTasti(c, dt, TASTI_SOLO);
    if (c.ia) pilotaIA(c, dt);

    // righe nuove a tempo (infinito e due)
    if (stato.modo === 'infinito' || stato.modo === 'due' || stato.modo === 'demo') {
      c.timer -= dt;
      const avviso = stato.modo === 'due' ? DUE.avviso : INFINITO.avviso;
      if (c.timer < avviso && !c.avvisato) { c.avvisato = true; suoni.avviso(); }
      if (c.timer <= 0 && !c.tiro) {
        arrivaRiga(c);
        c.timer = c.ogni = cresce(stato.modo === 'due' ? DUE.ogni : INFINITO.ogni, c.arrivate);
        c.avvisato = false;
      }
    }

    if (c.tiro) muoviTiro(c, dt);
  }

  function arrivaRiga(c) {
    if (stato.modo !== 'due') {
      c.nColori = Math.max(c.nColori, coloriInfinito(c.arrivate));
    }
    nuovaRiga(c, stato.modo === 'due' ? [0, 1, 2, 3, 4, 5].slice(0, DUE.colori) : tipiInfinito(c));
    suoni.riga();
    controllaColori(c);
    controllaPerso(c);
  }

  function muoviTiro(c, dt) {
    const p = c.tiro;
    const top = cima(c);
    p.resto += TIRO.velocita * dt;
    while (p.resto >= TIRO.passo) {
      p.resto -= TIRO.passo;
      p.muro = false;
      const fermo = passo(c, p, top);
      if (p.muro) suoni.muro();
      if (fermo) {
        c.tiro = null;
        c.ricarica = TIRO.ricarica;
        const [r, k] = trovaCella(c, p.x, p.y, top);
        attacca(c, r, k, p.t, p.rimbalzi);
        return;
      }
    }
  }

  function attacca(c, r, k, t, rimbalzi) {
    metti(c, r, k, { t, nuova: 0.15 });
    suoni.attacca();
    const g = gruppo(c, r, k);
    let scoppiate = 0, cadute = 0;
    if (g.length >= 3) {
      g.forEach(([a, b], i) => {
        scoppia(c, a, b, cella(c, a, b), i);
        c.righe[a][b] = null;
      });
      scoppiate = g.length;
      const s = staccate(c);
      for (const [a, b] of s) {
        cade(c, a, b, cella(c, a, b));
        c.righe[a][b] = null;
      }
      cadute = s.length;
    }
    while (c.righe.length && c.righe[c.righe.length - 1].every((x) => !x)) c.righe.pop();

    const x = cx(c, r, k), y = cy(c, r);
    if (scoppiate) {
      c.catena = cadute ? c.catena + 1 : 0;
      let punti = scoppiate * PUNTI.bolla + cadute * PUNTI.caduta * Math.max(1, c.catena);
      if (rimbalzi) punti += rimbalzi * PUNTI.sponda;
      aggiungiPunti(c, punti);
      mostraScritta(c, x - c.ox, y, '+' + punti, 1, cadute >= 6 ? 26 : 20);
      if (rimbalzi && scoppiate) mostraScritta(c, x - c.ox, y + 24, rimbalzi > 1 ? 'Doppia sponda!' : 'Sponda!', 1, 16);
      if (cadute) suoni.caduta(cadute);
      if (cadute >= 4 || scoppiate >= 6) {
        c.eroeA.saltoT = 0.6;
        c.aiutanteA.saltoT = 0.6;
        if (cadute >= 10) mostraScritta(c, FW / 2, 330, 'Che raccolto!', 1.4, 30);
      } else c.aiutanteA.saltoT = 0.4;
      // in due, le bolle in più diventano un attacco
      if (stato.modo === 'due') {
        let attacco = cadute + Math.max(0, scoppiate - 3);
        if (attacco > 0) {
          const parato = Math.min(c.attacchi, attacco);
          c.attacchi -= parato;
          attacco -= parato;
          const altro = stato.campi[1 - c.i];
          if (attacco > 0 && altro.stato === 'gioco') { altro.attacchi += attacco; suoni.attacco(); }
        }
      }
    } else {
      c.catena = 0;
      c.aVuoto++;
      // in due gli attacchi arrivano dopo un tiro a vuoto
      if (stato.modo === 'due' && c.attacchi >= DUE.rigaOgni) {
        const tipi = [0, 1, 2, 3, 4, 5].slice(0, DUE.colori);
        while (c.attacchi >= DUE.rigaOgni) { c.attacchi -= DUE.rigaOgni; nuovaRiga(c, tipi); }
        suoni.riga();
        c.eroeA.faccia = 'ferito'; c.eroeA.facciaT = 0.8; c.eroeA.tremaT = 0.4;
        if (c.eroe === 'gino') c.eroeA.tremaT = 0.6;
      }
    }

    if (!conta(c)) {
      // campo ripulito
      aggiungiPunti(c, PUNTI.pulito);
      suoni.pulito();
      if (stato.modo === 'avventura') {
        c.stato = 'vinto';
        c.eroeA.festa = true;
        c.aiutanteA.festa = true;
        return;
      }
      mostraScritta(c, FW / 2, 330, 'Tutto pulito! +' + PUNTI.pulito, 1.6, 28);
      if (stato.modo === 'due') {
        // in due si vince solo quando l'altro arriva ai fiori: ripulire manda
        // due righe all'avversario e ne fa arrivare di nuove a sé
        const altro = stato.campi[1 - c.i];
        if (altro.stato === 'gioco') altro.attacchi += DUE.rigaOgni * DUE.pulito;
        for (let i = 0; i < DUE.righe - 1; i++) nuovaRiga(c, [0, 1, 2, 3, 4, 5].slice(0, DUE.colori));
      } else {
        for (let i = 0; i < INFINITO.righe; i++) nuovaRiga(c, tipiInfinito(c));
      }
    }
    controllaColori(c);

    if (stato.modo === 'avventura' && c.aVuoto >= c.soglia) {
      c.aVuoto = 0;
      c.discese++;
      suoni.calo();
      c.aiutanteA.tremaT = 0.6;
      c.eroeA.faccia = 'arrabbiato'; c.eroeA.facciaT = 1;
      mostraScritta(c, FW / 2, cima(c) + 40, 'Il ramo scende!', 1.1, 22);
    }
    controllaPerso(c);
    aggiornaTabellone();
  }

  function controllaPerso(c) {
    if (c.stato === 'gioco' && pericolo(c) >= MAXR) {
      c.stato = 'perso';
      c.tiro = null;
      c.morteT = 0.4;
      suoni.sconfitta();
    }
  }

  function controllaFine(dt) {
    if (stato.fine) {
      stato.fine.t -= dt;
      if (stato.fine.t <= 0 && !stato.fine.fatto) {
        stato.fine.fatto = true;
        concludi(stato.fine.esito);
      }
      return;
    }
    const [a, b] = stato.campi;
    if (!a) return;
    let esito = null;
    if (stato.modo === 'avventura' || stato.modo === 'infinito' || stato.modo === 'demo') {
      if (a.stato === 'vinto') esito = 'vinto';
      else if (a.stato === 'perso') esito = 'perso';
    } else if (stato.modo === 'due') {
      if (a.stato !== 'gioco' || b.stato !== 'gioco') {
        // vince chi ha ripulito o chi è rimasto in piedi
        const vince = b.stato === 'perso' ? 0 : 1;
        esito = vince;
        const v = stato.campi[vince], p = stato.campi[1 - vince];
        if (v.stato === 'gioco') v.stato = 'vinto';
        if (p.stato === 'gioco') { p.stato = 'perso'; p.morteT = 0.4; }
        v.eroeA.festa = true;
      }
    }
    if (esito === null) return;
    stato.fine = { t: esito === 'vinto' ? 1.4 : 2, esito };
    if (esito === 'vinto') suoni.vinto();
  }

  function concludi(esito) {
    if (stato.modo === 'demo') { iniziaDemo(); return; }
    if (stato.test) { stato.fase = 'finita'; return; }
    stato.fase = 'finita';
    if (stato.modo === 'avventura') {
      const n = stato.livello;
      if (esito === 'vinto') {
        const c = stato.campi[0];
        const l = livello();
        const risparmio = Math.max(0, l.par - c.tiri);
        if (risparmio) aggiungiPunti(c, risparmio * PUNTI.tiroRisparmiato);
        const s = stelleDi(l, c.tiri);
        stato.stelleOra = s;
        stato.risparmio = risparmio;
        if (!stelle[n] || stelle[n] < s) { stelle[n] = s; scrivi('stelle', stelle); }
        if (n + 2 > sbloccati) { sbloccati = Math.min(LIVELLI.length, n + 2); scrivi('sbloccati', sbloccati); }
        stato.perdite[n] = 0;
        mostraPannello(pannelloLivello());
      } else {
        stato.perdite[n] = (stato.perdite[n] || 0) + 1;
        mostraPannello(pannelloSconfitta());
      }
    } else if (stato.modo === 'infinito') {
      const p = stato.campi[0].punti;
      const nuovo = p > recordInfinito;
      if (nuovo) { recordInfinito = p; scrivi('record-infinito', p); }
      mostraPannello(pannelloInfinito(nuovo));
    } else if (stato.modo === 'due') {
      stato.vittorie[esito]++;
      mostraPannello(pannelloDue(esito));
    }
    aggiornaTabellone();
  }
  const stelleDi = (l, tiri) => (tiri <= l.par ? 3 : tiri <= Math.round(l.par * 1.35) ? 2 : 1);

  function aggiungiPunti(c, n) {
    c.punti += n;
    aggiornaTabellone();
  }

  // ---------------------------------------------------------------- effetti
  function scoppia(c, r, k, b, i) {
    const x = cx(c, r, k), y = cy(c, r);
    const col = TIPI[b.t].colore;
    for (let j = 0; j < 7; j++) {
      const a = Math.random() * Math.PI * 2, v = casuale(60, 220);
      stato.particelle.push({ tipo: 'schizzo', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: casuale(0.35, 0.6), r: casuale(2, 4.5), colore: col });
    }
    stato.particelle.push({ tipo: 'anello', x, y, t: 0.25, t0: 0.25, colore: col });
    suoni.scoppio(i);
  }
  function cade(c, r, k, b, spenta = false) {
    stato.particelle.push({
      tipo: 'bolla', x: cx(c, r, k), y: cy(c, r) + c.spinta, vx: casuale(-90, 90), vy: casuale(-160, -40),
      t: 2, b: b.t, rot: 0, vr: casuale(-4, 4), spenta, fondo: FH + 40,
    });
  }
  function aggiornaParticelle(dt) {
    for (const p of stato.particelle) {
      p.t -= dt;
      if (p.tipo === 'bolla') {
        p.vy += 1500 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y > p.fondo) p.t = 0;
      } else if (p.tipo === 'schizzo') {
        p.vy += 500 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }
    stato.particelle = stato.particelle.filter((p) => p.t > 0);
  }
  function mostraScritta(c, x, y, testo, durata = 1, grande = 20) {
    stato.scritte.push({ x: c.ox + x, y, testo, t: durata, t0: durata, grande });
  }

  // ---------------------------------------------------------------- computer
  // Prova tutti gli angoli con la stessa fisica del gioco, guarda dove si
  // attaccherebbe la bolla e sceglie il tiro che fa scoppiare o cadere di più;
  // se non scoppia niente, cerca bolle uguali vicine e resta lontano dai fiori.
  function valuta(c, r, k, t) {
    const prima = cella(c, r, k);
    metti(c, r, k, { t });
    const g = gruppo(c, r, k);
    let v;
    if (g.length >= 3) {
      const tolte = g.map(([a, b]) => { const q = c.righe[a][b]; c.righe[a][b] = null; return [a, b, q]; });
      c.righe[r][k] = null;
      const s = staccate(c).length;
      for (const [a, b, q] of tolte) c.righe[a][b] = q;
      v = 100 + g.length * 10 + s * 22;
    } else {
      v = (g.length - 1) * 14 - r * 1.2;
      if (r + c.discese >= MAXR - 1) v -= 300;
      else if (r + c.discese >= MAXR - 3) v -= 30;
    }
    c.righe[r][k] = prima;
    return v;
  }
  function cercaTiri(c, t) {
    const visti = new Map();
    for (let a = CANNA.min + 0.01; a < Math.PI - CANNA.min; a += 0.012) {
      const s = simula(c, a);
      const [r, k] = s.cella;
      const chiave = r * COL + k;
      const e = visti.get(chiave);
      if (e) { e.angoli.push(a); continue; }
      visti.set(chiave, { r, k, angoli: [a], valore: valuta(c, r, k, t) + (s.rimbalzi ? -2 : 0) });
    }
    const lista = [...visti.values()];
    for (const e of lista) e.angolo = e.angoli[Math.floor(e.angoli.length / 2)];
    // gli angoli in mezzo a una fascia larga sono più sicuri
    for (const e of lista) e.valore += Math.min(6, e.angoli.length) * 0.5;
    return lista.sort((x, y) => y.valore - x.valore);
  }
  function scegliTiroIA(c, par) {
    let tiri = cercaTiri(c, c.colore);
    let scambiare = false;
    if (c.prossimo !== c.colore && Math.random() < par.scambia) {
      const altri = cercaTiri(c, c.prossimo);
      if (altri[0] && tiri[0] && altri[0].valore > tiri[0].valore + 20) { tiri = altri; scambiare = true; }
    }
    let scelta = tiri[0];
    if (Math.random() > par.mira) scelta = scegli(tiri.slice(0, 5));
    return { scambiare, angolo: scelta.angolo + gauss() * par.errore * Math.PI / 180 };
  }
  function pilotaIA(c, dt) {
    if (c.tiro || c.caricaT > 0 || c.ricarica > 0) return;
    if (c.iaAngolo === null) {
      const s = scegliTiroIA(c, c.ia);
      if (s.scambiare) scambia(c);
      c.iaAngolo = s.angolo;
      c.iaT = c.ia.pensa * casuale(0.7, 1.3);
    }
    // la canna gira verso l'angolo scelto, poi tira
    const d = c.iaAngolo - c.angolo;
    c.angolo += clamp(d, -CANNA.ruotaVeloce * dt, CANNA.ruotaVeloce * dt);
    c.iaT -= dt;
    if (c.iaT <= 0 && Math.abs(d) < 0.01) {
      spara(c, c.iaAngolo);
      c.iaAngolo = null;
    }
  }

  // ---------------------------------------------------------------- input
  const tasti = new Map();   // codice → da quanto è premuto
  const TASTI_SOLO = { sx: ['ArrowLeft', 'KeyA'], dx: ['ArrowRight', 'KeyD'], tira: ['Space', 'ArrowUp', 'KeyW', 'Enter'], scambia: ['ArrowDown', 'KeyS', 'KeyX'] };
  const TASTI_GIOCO = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

  function muoviConTasti(c, dt, t) {
    let dir = 0, durata = 0;
    for (const k of t.sx) if (tasti.has(k)) { dir += 1; durata = Math.max(durata, tasti.get(k)); }
    for (const k of t.dx) if (tasti.has(k)) { dir -= 1; durata = Math.max(durata, tasti.get(k)); }
    if (!dir) return;
    for (const k of [...t.sx, ...t.dx]) if (tasti.has(k)) tasti.set(k, tasti.get(k) + dt);
    const v = durata > 0.5 ? CANNA.ruotaVeloce : CANNA.ruota;
    mira(c, c.angolo + dir * v * dt);
  }

  function campoDeiTasti(codice, tipo) {
    if (stato.modo === 'due') return stato.campi.find((c) => c.tasti && c.tasti[tipo].includes(codice));
    if (stato.campi.length === 1 && !stato.campi[0].ia && TASTI_SOLO[tipo].includes(codice)) return stato.campi[0];
    return null;
  }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (TASTI_GIOCO.includes(e.code) && !pannelloAperto()) e.preventDefault();
    if (!tasti.has(e.code)) tasti.set(e.code, 0);
    document.body.classList.add('mostra-cursore');
    if (e.repeat) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (stato.fase === 'pausa') riprendi();
      else if (inPartita()) pausa();
      return;
    }
    if (e.code === 'KeyM') { cambiaAudio(); return; }
    if (e.code === 'KeyN') { cambiaMusica(); return; }
    if (pannelloAperto() || !inPartita()) return;
    const ct = campoDeiTasti(e.code, 'tira');
    if (ct) { spara(ct); return; }
    const cs = campoDeiTasti(e.code, 'scambia');
    if (cs) scambia(cs);
  });
  window.addEventListener('keyup', (e) => tasti.delete(e.code));
  window.addEventListener('blur', () => { tasti.clear(); if (inPartita()) pausa(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && inPartita()) pausa(); });

  function posLogica(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  function campoIn(x) {
    if (stato.campi.length === 1) return stato.campi[0];
    return stato.campi[x < FW + SPAZIO / 2 ? 0 : 1];
  }
  const angoloVerso = (c, p) => {
    const o = perno(c);
    return Math.atan2(o.y - p.y, p.x - o.x);
  };
  // la bolla dopo (e Gino, o il ceppo, accanto) si tocca per scambiare
  function suProssimo(c, p) {
    const q = posProssimo(c);
    return Math.hypot(p.x - q.x, p.y - q.y) < 46 || (p.y > PERNO_Y + 30 && Math.abs(p.x - q.x) < 60);
  }

  // Col mouse la canna segue il puntatore e il clic tira (in un campo solo).
  // Col dito: si trascina per mirare e si tira alzandolo; se lo si alza sotto
  // la canna il tiro si annulla. Toccare la bolla dopo la scambia.
  const dita = new Map();   // pointerId → { c, annulla }
  palco.addEventListener('pointerdown', (e) => {
    if (e.target !== canvas && e.target !== palco) return;
    if (!inPartita() || stato.fase !== 'gioco') return;
    const p = posLogica(e);
    const c = campoIn(p.x);
    if (!c || c.ia) return;
    if (e.pointerType === 'mouse') {
      if (stato.modo === 'due') return;
      if (suProssimo(c, p)) { scambia(c); return; }
      mira(c, angoloVerso(c, p));
      spara(c);
      return;
    }
    try { palco.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
    if (suProssimo(c, p)) { scambia(c); return; }
    dita.set(e.pointerId, { c, annulla: false });
    aggiornaDito(c, p, dita.get(e.pointerId));
  });
  function aggiornaDito(c, p, d) {
    d.annulla = p.y > PERNO_Y - 10;
    c.mira = d.annulla ? 'annulla' : 'dito';
    if (!d.annulla) mira(c, angoloVerso(c, p));
  }
  window.addEventListener('pointermove', (e) => {
    if (!inPartita() || stato.fase !== 'gioco') return;
    const p = posLogica(e);
    if (e.pointerType === 'mouse') {
      document.body.classList.remove('mostra-cursore');
      if (stato.modo === 'due') return;
      const c = stato.campi[0];
      if (c && !c.ia && p.y < PERNO_Y - 6) mira(c, angoloVerso(c, p));
      return;
    }
    const d = dita.get(e.pointerId);
    if (d) aggiornaDito(d.c, p, d);
  }, { passive: true });
  const fineDito = (e) => {
    const d = dita.get(e.pointerId);
    if (!d) return;
    dita.delete(e.pointerId);
    d.c.mira = null;
    if (e.type === 'pointerup' && !d.annulla) spara(d.c);
  };
  window.addEventListener('pointerup', fineDito);
  window.addEventListener('pointercancel', fineDito);

  // ---------------------------------------------------------------- flusso
  function pausa() {
    if (!inPartita() || stato.fase === 'pausa') return;
    stato.fase = 'pausa';
    tasti.clear();
    mostraPannello(pannelloPausa());
  }
  function riprendi() {
    if (stato.fase !== 'pausa') return;
    if (touch && orientamentoSbagliato()) return;
    stato.fase = 'gioco';
    nascondiPannello();
  }
  function vaiAlMenu() {
    iniziaDemo();
    mostraPannello(pannelloMenu());
    aggiornaTabellone();
  }

  function aggiornaTabellone() {
    const c = stato.campi[0];
    if (stato.modo === 'due') {
      elPunti.parentElement.style.visibility = 'hidden';
      elInfo.innerHTML = `Tino ${stato.vittorie[0]} – ${stato.vittorie[1]} Gino`;
      return;
    }
    elPunti.parentElement.style.visibility = stato.modo === 'demo' ? 'hidden' : '';
    elPunti.textContent = c ? numero(c.punti) : '0';
    if (stato.modo === 'avventura') {
      elInfo.innerHTML = `<span class="lungo">Livello </span>${stato.livello + 1}<span class="lungo"> · ${livello().nome}</span>`;
    } else if (stato.modo === 'infinito') {
      elInfo.innerHTML = `<span class="lungo">Infinito · </span>record ${numero(Math.max(recordInfinito, c ? c.punti : 0))}`;
    } else elInfo.textContent = '';
  }
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

  // ---------------------------------------------------------------- disegno
  // Le bolle si disegnano una volta su una tela a parte (lucide, col disegno dentro).
  const sprite = new Map();
  const SPR = 3;   // risoluzione delle tele (× la grandezza logica)
  function spriteBolla(t, spenta = false) {
    const chiave = t + (spenta ? 's' : '');
    if (sprite.has(chiave)) return sprite.get(chiave);
    const c = document.createElement('canvas');
    c.width = c.height = 48 * SPR;
    const g = c.getContext('2d');
    g.scale(SPR, SPR);
    g.translate(24, 24);
    disegnaBolla(g, t, spenta);
    sprite.set(chiave, c);
    return c;
  }
  function schiarisci(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    if (k > 0) { r += (255 - r) * k; gg += (255 - gg) * k; b += (255 - b) * k; } else { r *= 1 + k; gg *= 1 + k; b *= 1 + k; }
    return `rgb(${Math.round(r)},${Math.round(gg)},${Math.round(b)})`;
  }
  function disegnaBolla(g, t, spenta) {
    const col = spenta ? '#8f8f8f' : TIPI[t].colore;
    const rr = R - 0.5;
    const grad = g.createRadialGradient(-6, -8, 2, 0, 0, rr);
    grad.addColorStop(0, schiarisci(col, 0.55));
    grad.addColorStop(0.55, schiarisci(col, 0.12));
    grad.addColorStop(1, schiarisci(col, -0.25));
    g.fillStyle = grad;
    g.beginPath(); g.arc(0, 0, rr, 0, Math.PI * 2); g.fill();
    g.lineWidth = 1.6;
    g.strokeStyle = schiarisci(col, -0.45);
    g.stroke();
    g.save();
    g.beginPath(); g.arc(0, 0, rr - 1, 0, Math.PI * 2); g.clip();
    if (!spenta) disegnaContenuto(g, TIPI[t].id);
    g.restore();
    // riflessi
    g.fillStyle = 'rgba(255, 255, 255, 0.65)';
    g.beginPath(); g.ellipse(-8, -10, 6, 3.4, -0.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255, 255, 255, 0.35)';
    g.beginPath(); g.arc(9, 10, 2, 0, Math.PI * 2); g.fill();
  }
  function contorno(g, colore, spessore = 1.4) {
    g.lineWidth = spessore;
    g.strokeStyle = colore;
    g.stroke();
  }
  function disegnaContenuto(g, id) {
    g.lineJoin = 'round';
    if (id === 'ghianda') {
      g.beginPath();
      g.moveTo(-8, -1); g.bezierCurveTo(-9, 9, -3, 13, 0, 14); g.bezierCurveTo(3, 13, 9, 9, 8, -1); g.closePath();
      g.fillStyle = '#b8732c'; g.fill(); contorno(g, '#5c3517');
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath(); g.ellipse(-3.5, 5, 1.6, 4, 0.1, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(-10, -1); g.bezierCurveTo(-10, -9, -4, -11, 0, -11); g.bezierCurveTo(4, -11, 10, -9, 10, -1); g.closePath();
      g.fillStyle = '#6b4020'; g.fill(); contorno(g, '#3e2410');
      g.strokeStyle = 'rgba(30,15,5,0.5)'; g.lineWidth = 0.9;
      for (let x = -7; x <= 7; x += 3.5) { g.beginPath(); g.moveTo(x - 2, -9); g.lineTo(x + 2, -2); g.stroke(); }
      g.fillStyle = '#4a2c12'; g.fillRect(-1.2, -15, 2.4, 5);
    } else if (id === 'fragola') {
      g.beginPath();
      g.moveTo(0, 13); g.bezierCurveTo(-12, 4, -11, -7, -5, -7); g.quadraticCurveTo(0, -8, 5, -7); g.bezierCurveTo(11, -7, 12, 4, 0, 13); g.closePath();
      g.fillStyle = '#c81d25'; g.fill(); contorno(g, '#6e0e12');
      g.fillStyle = '#ffe27a';
      for (const [x, y] of [[-5, -2], [0, -3], [5, -2], [-3, 3], [3, 3], [0, 8], [-6, 3], [6, 3]]) {
        g.beginPath(); g.ellipse(x, y, 0.8, 1.2, 0, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#3d9a2c';
      for (let i = 0; i < 5; i++) {
        g.save(); g.translate(0, -8); g.rotate(-1.2 + i * 0.6);
        g.beginPath(); g.ellipse(0, -3, 1.8, 4.2, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    } else if (id === 'mirtillo') {
      g.beginPath(); g.arc(0, 2, 11, 0, Math.PI * 2);
      g.fillStyle = '#25307e'; g.fill(); contorno(g, '#11173f');
      g.fillStyle = 'rgba(190, 200, 255, 0.35)';
      g.beginPath(); g.ellipse(-4, -2, 4, 3, -0.5, 0, Math.PI * 2); g.fill();
      // coroncina
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
        g.lineTo(Math.cos(a) * 4.2, -6 + Math.sin(a) * 4.2);
        g.lineTo(Math.cos(a + 0.63) * 1.6, -6 + Math.sin(a + 0.63) * 1.6);
      }
      g.closePath();
      g.fillStyle = '#141a4d'; g.fill();
    } else if (id === 'fiore') {
      g.fillStyle = '#fff15a';
      for (let i = 0; i < 6; i++) {
        g.save(); g.rotate(i * Math.PI / 3);
        g.beginPath(); g.ellipse(0, -7.5, 4.3, 7, 0, 0, Math.PI * 2);
        g.fill(); contorno(g, '#b07800', 1.2);
        g.restore();
      }
      g.beginPath(); g.arc(0, 0, 4.6, 0, Math.PI * 2);
      g.fillStyle = '#e8701a'; g.fill(); contorno(g, '#8a3a08', 1.2);
    } else if (id === 'violetta') {
      const petalo = (a, l, c) => {
        g.save(); g.rotate(a);
        g.beginPath(); g.ellipse(0, -l, 5, l, 0, 0, Math.PI * 2);
        g.fillStyle = c; g.fill(); contorno(g, '#3a145e', 1.2);
        g.restore();
      };
      petalo(-0.5, 7, '#7d3cc0'); petalo(0.5, 7, '#7d3cc0');
      petalo(-1.9, 6.5, '#9a5ad8'); petalo(1.9, 6.5, '#9a5ad8');
      petalo(Math.PI, 7.5, '#5b2496');
      g.beginPath(); g.arc(0, 0, 2.8, 0, Math.PI * 2);
      g.fillStyle = '#ffd23a'; g.fill();
    } else if (id === 'uvaspina') {
      g.beginPath(); g.ellipse(0, 1.5, 9, 11.5, 0, 0, Math.PI * 2);
      g.fillStyle = '#7fcf4a'; g.fill(); contorno(g, '#2e6a17');
      g.strokeStyle = 'rgba(240, 255, 210, 0.7)'; g.lineWidth = 1;
      for (const x of [-4.5, 0, 4.5]) {
        g.beginPath(); g.moveTo(0, -9.5); g.quadraticCurveTo(x * 1.6, 1.5, 0, 12.5); g.stroke();
      }
      g.fillStyle = '#5a3a1a'; g.fillRect(-0.9, -14, 1.8, 5);
    }
  }

  function disegna(tempo) {
    ctx.clearRect(0, 0, W, H);
    for (const c of stato.campi) disegnaCampo(c, tempo);
    disegnaParticelle();
    disegnaScritte();
  }

  function disegnaCampo(c, tempo) {
    const m = mondo();
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.ox, 0, FW, FH);
    ctx.clip();
    disegnaFondo(c, m);
    disegnaLinea(c, tempo);
    disegnaRamo(c, m, tempo);
    disegnaBolle(c, tempo);
    if (c.stato === 'gioco' && !c.ia && stato.modo !== 'demo') disegnaGuida(c, tempo);
    if (c.tiro) disegnaUna(c.tiro.x, c.tiro.y, c.tiro.t);
    disegnaPersonaggi(c, tempo);
    disegnaCanna(c, tempo);
    ctx.restore();
    // cornice di legno
    const [chiaro, scuro] = m.legno;
    ctx.fillStyle = scuro;
    ctx.fillRect(c.ox, 0, MURO, FH);
    ctx.fillRect(c.ox + FW - MURO, 0, MURO, FH);
    ctx.fillStyle = chiaro;
    ctx.fillRect(c.ox + 4, 0, MURO - 8, FH);
    ctx.fillRect(c.ox + FW - MURO + 4, 0, MURO - 8, FH);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(c.ox + 4, 0, 2, FH);
    ctx.fillRect(c.ox + FW - MURO + 4, 0, 2, FH);
  }

  function disegnaFondo(c, m) {
    const img = fondali[m.fondale];
    if (pronta(img)) {
      // ritaglio del fondale (16:9): in un campo solo la parte centrale
      const k = FH / img.naturalHeight;
      const tot = stato.modo === 'due' ? W : FW;
      const sw = tot / k;
      const sx = (img.naturalWidth - sw) / 2 + (c.ox / k);
      ctx.drawImage(img, Math.max(0, sx), 0, Math.min(sw, FW / k), img.naturalHeight, c.ox, 0, FW, FH);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, FH);
      g.addColorStop(0, '#9fd3f0');
      g.addColorStop(1, '#6cbf4a');
      ctx.fillStyle = g;
      ctx.fillRect(c.ox, 0, FW, FH);
    }
    ctx.fillStyle = m.velo;
    ctx.fillRect(c.ox, 0, FW, FH);
    // prato in fondo, dove stanno Tino e Gino
    const g = ctx.createLinearGradient(0, PERNO_Y - 20, 0, FH);
    g.addColorStop(0, 'rgba(70, 140, 50, 0)');
    g.addColorStop(0.35, 'rgba(70, 140, 50, 0.75)');
    g.addColorStop(1, 'rgba(45, 100, 32, 0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(c.ox, PERNO_Y - 20, FW, FH - PERNO_Y + 20);
  }

  // la linea dei fiori: le bolle non devono arrivare qui
  function disegnaLinea(c, tempo) {
    const vicino = c.stato === 'gioco' && pericolo(c) >= MAXR - 2;
    ctx.save();
    ctx.strokeStyle = vicino ? `rgba(255, 90, 70, ${0.55 + 0.35 * Math.sin(tempo * 8)})` : 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(c.ox + MURO, LIMITE);
    ctx.lineTo(c.ox + FW - MURO, LIMITE);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let x = c.ox + MURO + 22; x < c.ox + FW - MURO; x += 44) {
      ctx.fillStyle = vicino ? '#ffb3a6' : 'rgba(255, 255, 255, 0.75)';
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5 + tempo * 0.3;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * 3.4, LIMITE + Math.sin(a) * 3.4, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#f2c623';
      ctx.beginPath(); ctx.arc(x, LIMITE, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // il ramo in cima: nell'avventura scende, sopra resta il legno del soffitto
  function disegnaRamo(c, m, tempo) {
    const [chiaro, scuro] = m.legno;
    const y = c.topVis;
    let trema = 0;
    if (stato.modo === 'avventura' && c.stato === 'gioco' && c.soglia - c.aVuoto <= 1) trema = Math.sin(tempo * 40) * 1.5;
    ctx.save();
    ctx.translate(0, trema);
    ctx.fillStyle = scuro;
    ctx.fillRect(c.ox, -10, FW, y + 10 - 12);
    // assi del soffitto
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 2;
    for (let yy = y - 12 - 22; yy > -10; yy -= 22) {
      ctx.beginPath(); ctx.moveTo(c.ox, yy); ctx.lineTo(c.ox + FW, yy); ctx.stroke();
    }
    // il ramo
    const g = ctx.createLinearGradient(0, y - 18, 0, y + 2);
    g.addColorStop(0, chiaro);
    g.addColorStop(1, scuro);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(c.ox, y - 18);
    for (let x = 0; x <= FW; x += 24) ctx.lineTo(c.ox + x, y - 18 + Math.sin(x * 0.05) * 2);
    ctx.lineTo(c.ox + FW, y + 1);
    for (let x = FW; x >= 0; x -= 24) ctx.lineTo(c.ox + x, y + 1 + Math.sin(x * 0.07 + 1) * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath(); ctx.moveTo(c.ox, y - 14); ctx.lineTo(c.ox + FW, y - 14); ctx.stroke();
    // foglie
    const [fc, fs] = m.foglie;
    for (let i = 0; i < 14; i++) {
      const x = c.ox + 14 + i * 34 + (i % 2) * 8;
      const a = (i % 2 ? 0.6 : -0.6) + Math.sin(tempo * 1.5 + i) * 0.08;
      ctx.save();
      ctx.translate(x, y - 2);
      ctx.rotate(a);
      ctx.fillStyle = i % 3 ? fc : fs;
      ctx.beginPath(); ctx.ellipse(0, 7, 4.5, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    disegnaSegnali(c, tempo);
  }

  // in cima: quanti tiri a vuoto mancano (avventura), quando arriva la riga
  // nuova (infinito e due) e gli attacchi in arrivo (due)
  function disegnaSegnali(c, tempo) {
    if (c.stato !== 'gioco') return;
    const y = 20;
    if (stato.modo === 'avventura' && Number.isFinite(c.soglia)) {
      const resto = c.soglia - c.aVuoto;
      const n = c.soglia;
      const x0 = c.ox + FW / 2 - (n - 1) * 11;
      for (let i = 0; i < n; i++) {
        const piena = i < resto;
        const trema = piena && resto === 1 ? Math.sin(tempo * 30) * 2 : 0;
        disegnaGhiandina(x0 + i * 22 + trema, y, piena ? 1 : 0.25);
      }
    } else if (stato.modo !== 'avventura') {
      const k = clamp(c.timer / c.ogni, 0, 1);
      const w = 180;
      const x0 = c.ox + FW / 2 - w / 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      rettangolo(ctx, x0, y - 6, w, 12, 6); ctx.fill();
      ctx.fillStyle = c.timer < 2 ? (Math.sin(tempo * 20) > 0 ? '#ff7a5c' : '#ffd59a') : '#ffd59a';
      rettangolo(ctx, x0 + 2, y - 4, (w - 4) * k, 8, 4); ctx.fill();
      if (stato.modo === 'due' && c.attacchi > 0) {
        const n = Math.min(c.attacchi, 14);
        for (let i = 0; i < n; i++) disegnaGhiandina(c.ox + MURO + 14 + i * 12, y + 16, 1, 0.55, true);
        ctx.fillStyle = '#ffb3a6';
        ctx.font = '600 13px Fredoka, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('+' + c.attacchi, c.ox + MURO + 20 + n * 12, y + 16);
      }
    }
  }
  function disegnaGhiandina(x, y, alfa, k = 0.8, rossa = false) {
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.beginPath();
    ctx.moveTo(-7, -1); ctx.bezierCurveTo(-8, 8, -3, 11, 0, 12); ctx.bezierCurveTo(3, 11, 8, 8, 7, -1); ctx.closePath();
    ctx.fillStyle = rossa ? '#e5484d' : '#d08a3c'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-9, 0); ctx.bezierCurveTo(-9, -7, -4, -9, 0, -9); ctx.bezierCurveTo(4, -9, 9, -7, 9, 0); ctx.closePath();
    ctx.fillStyle = '#6b4020'; ctx.fill();
    ctx.fillRect(-1, -13, 2, 5);
    ctx.restore();
  }
  function rettangolo(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function disegnaUna(x, y, t, s = 1, rot = 0, spenta = false) {
    const img = spriteBolla(t, spenta);
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(img, -24 * s, -24 * s, 48 * s, 48 * s);
    ctx.restore();
  }

  function disegnaBolle(c, tempo) {
    const top = c.topVis + c.spinta;
    const avviso = stato.modo !== 'avventura' && c.stato === 'gioco' && c.timer < 2;
    for (const [r, k, b] of tutte(c)) {
      let x = cx(c, r, k), y = cy(c, r, top);
      if (avviso) x += Math.sin(tempo * 45 + r) * 1.2;
      const s = b.nuova > 0 ? 1 + Math.sin(b.nuova / 0.15 * Math.PI) * 0.08 : 1;
      disegnaUna(x, y, b.t, s);
    }
  }

  function disegnaGuida(c, tempo) {
    if (c.tiro || c.caricaT > 0.1 || c.mira === 'annulla') return;
    const s = simula(c, c.angolo);
    const max = c.guida;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    let fatto = 0;
    const fase = (tempo * 60) % 18;
    const tuttaLaStrada = !Number.isFinite(max);
    for (let i = 1; i < s.punti.length; i++) {
      const a = s.punti[i - 1], b = s.punti[i];
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = (18 - (fatto % 18) + fase) % 18; d < l; d += 18) {
        const tot = fatto + d;
        if (tot < 40) continue;
        if (tot > max) break;
        const alfa = tuttaLaStrada ? 0.85 : clamp((max - tot) / 120, 0, 0.85);
        ctx.globalAlpha = alfa;
        ctx.beginPath();
        ctx.arc(a.x + (b.x - a.x) * d / l, a.y + (b.y - a.y) * d / l, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      fatto += l;
      if (fatto > max) break;
    }
    // bolla fantasma dove si attaccherebbe
    if (tuttaLaStrada) {
      const [r, k] = s.cella;
      ctx.globalAlpha = 0.4 + 0.15 * Math.sin(tempo * 6);
      disegnaUna(cx(c, r, k), cy(c, r), c.colore);
    }
    ctx.restore();
  }

  function posProssimo(c) {
    const o = perno(c);
    // in un campo solo la tiene Gino, a destra; in due sta su un ceppo
    if (stato.modo === 'due') return c.i === 0 ? { x: o.x + 92, y: FH - 62 } : { x: o.x - 92, y: FH - 62 };
    return { x: o.x + 128, y: FH - 132 };
  }

  function disegnaCanna(c, tempo) {
    const o = perno(c);
    // ceppo
    ctx.save();
    ctx.fillStyle = '#7a4a22';
    rettangolo(ctx, o.x - 30, o.y + 6, 60, FH - o.y, 10); ctx.fill();
    ctx.fillStyle = '#c98a3c';
    ctx.beginPath(); ctx.ellipse(o.x, o.y + 8, 30, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(o.x, o.y + 8, 18, 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(o.x, o.y + 8, 8, 2.4, 0, 0, Math.PI * 2); ctx.stroke();
    // canna di bambù
    ctx.translate(o.x, o.y);
    ctx.rotate(-c.angolo);
    const l = CANNA.lunga;
    const g = ctx.createLinearGradient(0, -13, 0, 13);
    g.addColorStop(0, '#d9e88a');
    g.addColorStop(0.5, '#9fbf3f');
    g.addColorStop(1, '#5f7f1f');
    ctx.fillStyle = g;
    rettangolo(ctx, 0, -13, l, 26, 6); ctx.fill();
    ctx.strokeStyle = '#46601a'; ctx.lineWidth = 2;
    ctx.stroke();
    for (const x of [22, 46]) { ctx.beginPath(); ctx.moveTo(x, -13); ctx.lineTo(x, 13); ctx.stroke(); }
    ctx.fillStyle = '#46601a';
    rettangolo(ctx, l - 6, -15, 8, 30, 3); ctx.fill();
    ctx.restore();
    // bolla in canna, al centro del ceppo
    if (c.stato === 'gioco' || c.stato === 'vinto') {
      const k = 1 - c.caricaT / 0.3;
      const s = clamp(k, 0.2, 1);
      disegnaUna(o.x, o.y, c.colore, s);
      // la bolla dopo
      const q = posProssimo(c);
      const sv = c.scambioT > 0 ? 0.6 + 0.4 * (1 - c.scambioT / 0.2) : 1;
      disegnaUna(q.x, q.y + Math.sin(tempo * 3) * 3, c.prossimo, 0.8 * sv);
    }
  }

  function facciaTino(c) {
    const a = c.eroeA;
    if (c.stato === 'perso') return 'ko';
    if (a.faccia) return a.faccia;
    if (c.stato !== 'gioco') return 'normale';
    if (pericolo(c) >= MAXR - 2) return 'arrabbiato';
    if (stato.modo === 'avventura' && c.soglia - c.aVuoto <= 1) return 'arrabbiato';
    if (stato.modo !== 'avventura' && c.timer < 2) return 'arrabbiato';
    return 'normale';
  }

  function disegnaPersonaggi(c, tempo) {
    const o = perno(c);
    if (c.eroe === 'tino') {
      const f = facciaTino(c);
      const h = f === 'ko' ? 62 : f === 'normale' ? 128 : 124;
      disegnaFoto(immagini[f], o.x - 108, FH - 4, h, c.eroeA, tempo, false, -c.eroeA.inclina);
      if (stato.modo !== 'due') disegnaFoto(immagini.gino, o.x + 128, FH - 4, 80, c.aiutanteA, tempo, true);
    } else {
      disegnaFoto(immagini.gino, o.x + 104, FH - 4, 92, c.eroeA, tempo, true, c.eroeA.inclina);
    }
  }
  function disegnaFoto(img, x, y, h, a, tempo, gino, inclina = 0) {
    if (!pronta(img)) return;
    const w = h * img.naturalWidth / img.naturalHeight;
    ctx.save();
    if (a.tremaT > 0) x += Math.sin(tempo * 70) * 4 * Math.min(1, a.tremaT * 3);
    let salto = 0;
    if (a.festa) salto = Math.abs(Math.sin(tempo * 7)) * 18;
    else if (a.saltoT > 0) salto = Math.sin(a.saltoT / 0.6 * Math.PI) * 14;
    ctx.translate(x, y - salto);
    if (gino && a.caduta > 0) {
      ctx.translate(0, -h / 2);
      ctx.rotate(a.caduta * 1.4);
      ctx.translate(a.caduta * 20, h / 2 * (1 - a.caduta * 0.5));
    }
    ctx.rotate(inclina);
    if (a.saltoT > 0.45) ctx.scale(1.06, 0.94);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }

  function disegnaParticelle() {
    for (const p of stato.particelle) {
      if (p.tipo === 'bolla') {
        disegnaUna(p.x, p.y, p.b, 1, p.rot, p.spenta);
      } else if (p.tipo === 'schizzo') {
        ctx.globalAlpha = clamp(p.t / 0.3, 0, 1);
        ctx.fillStyle = p.colore;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.tipo === 'anello') {
        const k = 1 - p.t / p.t0;
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, R * (0.8 + k * 0.8), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  function disegnaScritte() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of stato.scritte) {
      const k = 1 - s.t / s.t0;
      ctx.globalAlpha = clamp(s.t / 0.3, 0, 1);
      ctx.font = `700 ${s.grande}px Fredoka, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(40, 25, 10, 0.85)';
      const y = s.y - k * 24;
      ctx.strokeText(s.testo, s.x, y);
      ctx.fillStyle = '#fff8ec';
      ctx.fillText(s.testo, s.x, y);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- pannelli
  function pannelloAperto() { return pannello.classList.contains('visibile'); }
  function mostraPannello(html) {
    if (stato.test) return;
    pannello.innerHTML = html;
    pannello.classList.add('visibile');
    document.body.classList.add('mostra-cursore');
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
  const numero = (n) => n.toLocaleString('it-IT');
  const stelline = (n, max = 3) => `<span class="stelle" aria-label="${n} stelle su 3">${'★'.repeat(n)}<span class="spente">${'★'.repeat(max - n)}</span></span>`;

  const iconeBolle = {};
  function iconaBolla(t) {
    if (!iconeBolle[t]) iconeBolle[t] = spriteBolla(t).toDataURL();
    return iconeBolle[t];
  }

  function testoComandi() {
    if (touch) {
      return `<div class="comandi">
        <p>Trascina il dito per mirare e <b>alzalo</b> per tirare; se lo alzi sotto la canna il tiro si annulla.</p>
        <p>Tocca la <b>bolla dopo</b> (quella di Gino) per scambiarla con quella in canna.</p>
        <p>In due: il telefono va tenuto in orizzontale, un dito per metà schermo.</p>
      </div>`;
    }
    return `<div class="comandi">
      <p>Mira con il <b>mouse</b> e tira con un <b>clic</b>, oppure <kbd>←</kbd> <kbd>→</kbd> e <kbd>Spazio</kbd>.
      <kbd>↓</kbd> o un clic sulla bolla di Gino la scambiano con quella in canna.</p>
      <p>In due: Tino <kbd>A</kbd> <kbd>D</kbd> mira, <kbd>W</kbd> tira, <kbd>S</kbd> scambia; Gino <kbd>←</kbd> <kbd>→</kbd>, <kbd>↑</kbd>, <kbd>↓</kbd>.</p>
      <p><kbd>P</kbd> pausa · <kbd>M</kbd> suoni · <kbd>N</kbd> musica</p>
    </div>`;
  }

  function pannelloMenu() {
    let mondi = '';
    MONDI.forEach((m, i) => {
      const bottoni = LIVELLI.map((l, n) => (l.mondo === i
        ? `<button data-azione="livello" data-n="${n}" ${n < sbloccati ? '' : 'disabled'} title="${l.nome}">${n + 1}${stelle[n] ? `<small>${'★'.repeat(stelle[n])}</small>` : ''}</button>` : '')).join('');
      mondi += `<h3>${m.nome}</h3><div class="livelli">${bottoni}</div>`;
    });
    const da = Math.min(sbloccati, LIVELLI.length) - 1;
    const bolle = TIPI.map((t, i) => `<span><img src="${iconaBolla(i)}" alt="">${t.nome}</span>`).join('');
    return `<div class="riquadro">
      <div class="ritratti">${img('normale', 'salta')}${img('gino')}</div>
      <h1>Sparabolle</h1>
      <p>Gli agenti della Tari hanno chiuso ghiande, bacche e fiori del bosco dentro le bolle! Tino le spara verso l'alto con la sua canna: <b>tre bolle uguali</b> vicine scoppiano, e quelle rimaste staccate dal ramo cadono giù.</p>
      <div class="scelte">
        <button class="bottone" data-azione="livello" data-n="${da}" data-primo>${da > 0 ? 'Avventura: livello ' + (da + 1) : 'Avventura'}</button>
        <button class="bottone secondario" data-azione="infinito">Infinito</button>
        <button class="bottone secondario" data-azione="due">In due</button>
      </div>
      ${recordInfinito ? `<p class="record">Record dell'infinito: ${numero(recordInfinito)} punti</p>` : ''}
      <div class="mondi">${mondi}</div>
      <h3>Le bolle</h3>
      <div class="bolle">${bolle}</div>
      ${testoComandi()}
    </div>`;
  }

  function pannelloPausa() {
    const dove = stato.modo === 'avventura' ? `<p>Livello ${stato.livello + 1} · ${livello().nome}</p>`
      : stato.modo === 'infinito' ? '<p>Infinito</p>' : '<p>Tino contro Gino</p>';
    return `<div class="riquadro">
      <div class="ritratti">${img('normale')}</div>
      <h2>Pausa</h2>
      ${dove}
      <div class="scelte">
        <button class="bottone" data-azione="riprendi" data-primo>Continua</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
      ${testoComandi()}
    </div>`;
  }

  function pannelloLivello() {
    const n = stato.livello;
    const c = stato.campi[0];
    const s = stato.stelleOra;
    const ultimo = n + 1 >= LIVELLI.length;
    const avanti = ultimo
      ? '<p>Hai finito il prato! Gli altri mondi arrivano presto.</p>'
      : '';
    return `<div class="riquadro">
      <div class="ritratti">${img('normale', 'salta')}${img('gino', 'salta')}</div>
      <h2>Livello ${n + 1} finito!</h2>
      <p class="grandi">${stelline(s)}</p>
      <table class="conto">
        <tr><td>Tiri</td><td>${c.tiri}</td></tr>
        <tr><td>Per 3 stelle</td><td>${livello().par}</td></tr>
        ${stato.risparmio ? `<tr><td>Tiri risparmiati</td><td>+${numero(stato.risparmio * PUNTI.tiroRisparmiato)}</td></tr>` : ''}
        <tr class="totale"><td>Punti</td><td>${numero(c.punti)}</td></tr>
      </table>
      ${avanti}
      <div class="scelte">
        ${ultimo ? '' : `<button class="bottone" data-azione="livello" data-n="${n + 1}" data-primo>Livello ${n + 2}</button>`}
        <button class="bottone secondario" data-azione="livello" data-n="${n}">Rigioca</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  function pannelloSconfitta() {
    const n = stato.livello;
    const aiuto = (stato.perdite[n] || 0) >= AIUTO.dopo && !stato.aiuto
      ? `<p>Vuoi un aiuto? Il ramo scende dopo ${AIUTO.calo} tiri in più.</p>
         <button class="bottone" data-azione="aiuto" data-n="${n}" data-primo>Riprova con l'aiuto</button>` : '';
    return `<div class="riquadro">
      <div class="ritratti">${img('ko')}${img('gino', 'caduto')}</div>
      <h2>Le bolle sono arrivate ai fiori!</h2>
      <p>Livello ${n + 1} · ${livello().nome}</p>
      <div class="scelte">
        ${aiuto}
        <button class="bottone${aiuto ? ' secondario' : ''}" data-azione="livello" data-n="${n}" ${aiuto ? '' : 'data-primo'}>Riprova</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  function pannelloInfinito(nuovo) {
    const c = stato.campi[0];
    return `<div class="riquadro">
      <div class="ritratti">${img('ko')}${img('gino', 'caduto')}</div>
      <h2>Le bolle sono arrivate ai fiori!</h2>
      <p>${numero(c.punti)} punti, con ${c.arrivate} righe arrivate.</p>
      ${nuovo ? '<p><b>Nuovo record!</b></p>' : `<p class="record">Record: ${numero(recordInfinito)} punti</p>`}
      <div class="scelte">
        <button class="bottone" data-azione="infinito" data-primo>Ancora</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  function pannelloDue(vince) {
    const chi = vince === 0 ? 'Tino' : 'Gino';
    const ritratti = vince === 0 ? `${img('normale', 'salta')}${img('gino', 'caduto')}` : `${img('ko')}${img('gino', 'salta')}`;
    return `<div class="riquadro">
      <div class="ritratti">${ritratti}</div>
      <h2>Vince ${chi}!</h2>
      <p class="grandi">Tino ${stato.vittorie[0]} – ${stato.vittorie[1]} Gino</p>
      <div class="scelte">
        <button class="bottone" data-azione="due" data-primo>Rivincita</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  pannello.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-azione]');
    if (!btn) return;
    switch (btn.dataset.azione) {
      case 'livello': iniziaAvventura(+btn.dataset.n); break;
      case 'aiuto': iniziaAvventura(+btn.dataset.n, { aiuto: true }); break;
      case 'infinito': iniziaInfinito(); break;
      case 'due': iniziaDue(); break;
      case 'riprendi': riprendi(); break;
      case 'menu': vaiAlMenu(); break;
      default: break;
    }
    // telefono girato dalla parte sbagliata: si parte in pausa, sotto l'invito a girarlo
    if (touch && inPartita() && stato.fase === 'gioco' && orientamentoSbagliato()) pausa();
  });

  $('#btn-pausa').addEventListener('click', (e) => {
    e.currentTarget.blur();
    if (stato.fase === 'pausa') riprendi();
    else pausa();
  });
  $('#btn-audio').addEventListener('click', (e) => { e.currentTarget.blur(); cambiaAudio(); });
  $('#btn-musica').addEventListener('click', (e) => { e.currentTarget.blur(); cambiaMusica(); });

  // ---------------------------------------------------------------- avvio
  document.body.classList.toggle('muto', muto);
  document.body.classList.toggle('senza-musica', musicaSpenta);
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

  // utile per le prove automatiche
  window.sparabolle = {
    stato, iniziaAvventura, iniziaInfinito, iniziaDue, aggiorna, spara, scambia, mira,
    simula, scegliTiroIA, cercaTiri, staccate, conta, pericolo,
    TIRO, CANNA, PUNTI, INFINITO, DUE, IA, LIVELLI, MONDI, TIPI,
    costanti: { FW, FH, D, R, RH, COL, TOP0, MAXR, LIMITE, PERNO_Y },
  };
})();
