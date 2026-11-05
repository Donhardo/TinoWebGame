/*
 * Ghiande e Mattoncini
 * Tino (con l'asse di legno) o Gino (con la foglia) fanno rimbalzare una
 * ghianda contro un muro di mattoncini: si rompono tutti per passare al
 * livello dopo. Dai mattoncini cadono potenziamenti (e qualche dispetto).
 *
 * Campo logico 604 × 820 (verticale): muri di 14 px, 16 colonne di
 * mattoncini da 36 × 18 a partire da y = 58; l'asse ha la cima a y = 716 e il
 * personaggio la regge da sotto. I mondi e le mappe sono in livelli.js.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------- costanti
  const W = 604;
  let H = 820;                 // sul telefono in verticale il campo si allunga (fino a 980)
  const MURO = 14;
  const COLONNE = 16, CW = 36, CH = 18, GY = 58;
  let PY = H - 104;            // cima dell'asse
  const AH = 14;               // spessore dell'asse
  const R = 7;                 // raggio della ghianda
  let Y_SIEPE = H - 12;        // dove rimbalza la ghianda sulla siepe
  const VITE = 3, VITE_MAX = 6;
  const PUNTI_VITA = 20000;    // una vita in più ogni tot punti
  const MAX_PALLE = 15;

  const MONDI = window.GM_MONDI;
  const LIVELLI = window.GM_LIVELLI;

  // Difficoltà: [base, aumento per livello, limite]; il grado va da 0 (primo
  // livello) a 15 (ultimo), boss compresi (vedi grado()).
  const PALLA = {
    inizio: [430, 13, 640],    // velocità al lancio
    max: [650, 20, 940],       // velocità massima che raggiunge nel livello
    colpoMattone: 0.004,       // aumento a ogni mattoncino colpito
    colpoAsse: 0.012,          // aumento a ogni rimbalzo sull'asse
    angoloMax: 62 * Math.PI / 180,  // angolo massimo dalla verticale sull'asse
    minVerticale: 0.3,         // la componente verticale non scende sotto questa frazione
    giraDopo: 15,              // secondi senza toccare mattoncini rompibili prima di correggere un po' l'angolo
  };
  const ASSE = {
    larghezza: [108, -2, 80],
    lunga: 1.45, corta: 0.65,
    tastiera: 900,             // px/s con le frecce
    puntatore: 5000,           // px/s massimi quando segue mouse o dito
    dito: 1.25,                // quanto si sposta l'asse per ogni pixel di dito
  };
  const CADUTA = {
    probabilita: [0.13, -0.002, 0.1],  // probabilità che un mattoncino lasci un potenziamento
    velocita: 165,
  };
  const FIONDA = { ogni: 0.42, velocita: 720 };

  // Potenziamenti (buoni e dispetti). durata in secondi; peso = quanto spesso cadono.
  const POTERI = [
    { id: 'lunga', nome: 'Asse lunga', colore: '#4f9a3f', peso: 14, durata: 20, buono: true },
    { id: 'tre', nome: 'Tre ghiande', colore: '#c98a3c', peso: 12, buono: true },
    { id: 'miele', nome: 'Miele', colore: '#f0a020', peso: 9, durata: 18, buono: true },
    { id: 'fuoco', nome: 'Ghianda di fuoco', colore: '#ff5a1f', peso: 6, durata: 8, buono: true },
    { id: 'fionda', nome: 'Fionda', colore: '#8a5a2b', peso: 8, durata: 10, buono: true },
    { id: 'lumaca', nome: 'Lumaca', colore: '#3fa79a', peso: 9, durata: 12, buono: true },
    { id: 'siepe', nome: 'Siepe', colore: '#2f6b26', peso: 6, buono: true },
    { id: 'vita', nome: 'Ghianda d\'oro', colore: '#e0a810', peso: 2.2, buono: true },
    { id: 'corta', nome: 'Asse corta', colore: '#c0392b', peso: 9, durata: 14, buono: false },
    { id: 'vespa', nome: 'Vespa', colore: '#2b2b2b', peso: 9, durata: 12, buono: false },
  ];
  const POTERE = Object.fromEntries(POTERI.map((p) => [p.id, p]));
  const DESCRIZIONI = {
    lunga: 'asse più lunga',
    tre: 'tre ghiande insieme',
    miele: 'la ghianda si attacca',
    fuoco: 'passa tra i mattoncini',
    fionda: 'Tino tira semini',
    lumaca: 'ghianda più lenta',
    siepe: 'salva una volta',
    vita: 'una vita in più',
    corta: 'asse più corta',
    vespa: 'ghianda più veloce',
  };

  // Boss alla fine di ogni mondo (campo boss in livelli.js). alt = altezza del
  // disegno; vita = colpi da dare; vel = px/s. Il retino ogni tanto alza la rete:
  // se la ghianda la tocca la prende e la ributta giù dalla parte lontana dall'asse.
  // Timbro e capo lanciano bollette (stordiscono l'asse) e timbrano mattoncini nuovi
  // nei buchi delle righe sotto di loro. Sotto metà vita si arrabbiano: più veloci e
  // più frequenti (arrabbiato = moltiplicatore dei tempi).
  const BOSS = {
    retino: {
      img: 'agente-retino', nome: 'Agente col retino', alt: 118, vita: 12, vel: 125,
      rete: { ogni: 6, dura: 1.6, raggio: 26, tiene: 0.45, lancio: 1.12 },
      mano: [0.83, 0.11], corpo: [0.15, 0.08, 0.73, 0.94],
    },
    timbro: {
      img: 'agente-timbro', nome: 'Agente col timbro', alt: 118, vita: 14, vel: 100,
      bollette: { ogni: 3.4, quante: 1 }, timbra: { ogni: 9, quanti: 3 },
      mano: [0.86, 0.36], corpo: [0.15, 0.08, 0.73, 0.94],
    },
    capo: {
      img: 'ispettore-capo', nome: 'Ispettore capo', alt: 136, vita: 20, vel: 85,
      bollette: { ogni: 5.2, quante: 2, arrabbiato: 3 }, timbra: { ogni: 10, quanti: 4 },
      mano: [0.95, 0.34], corpo: [0.18, 0.08, 0.8, 0.94],
    },
  };
  const COPPIA = 0.6;               // in due, ognuno ha questa frazione della vita
  const ARRABBIATO = { vel: 1.35, tempi: 0.7 };
  const BOLLETTE = { velocita: 230, stordito: 0.7, sparpaglia: 0.38 };
  const Y_BOSS = 64;                // cima dei boss

  // Giocatore simulato (partita dimostrativa e prove automatiche)
  // reazione: secondi tra una stima e l'altra; errore: px a 500 px/s (cresce con la
  // velocità e con l'angolo); mira: probabilità di mirare a un mattoncino rompibile.
  const IA = { reazione: 0.11, errore: 7, vel: 2600, mira: 0.85, attesa: 0.6 };

  const ASSETS = '../../assets/';
  const FONDALI = '../tino-bum/fondali/';
  const immagini = {
    normale: carica(ASSETS + 'tino/tino-normale.png'),
    arrabbiato: carica(ASSETS + 'tino/tino-arrabbiato.png'),
    ferito: carica(ASSETS + 'tino/tino-ferito.png'),
    ko: carica(ASSETS + 'tino/tino-ko.png'),
    gino: carica(ASSETS + 'gino/gino.png'),
  };
  for (const k in BOSS) immagini[k] = carica(ASSETS + 'agenti-tari/' + BOSS[k].img + '.svg');
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
  const elVite = $('#vite');
  const elInfo = $('#info');

  // ---------------------------------------------------------------- utilità
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const casuale = (a, b) => a + Math.random() * (b - a);
  const cresce = ([base, passo, limite], d) => {
    const v = base + passo * d;
    return passo >= 0 ? Math.min(limite, v) : Math.max(limite, v);
  };

  function leggi(chiave, predefinito) {
    try {
      const v = localStorage.getItem('ghiande-e-mattoncini:' + chiave);
      return v === null ? predefinito : JSON.parse(v);
    } catch (e) {
      return predefinito;
    }
  }
  function scrivi(chiave, valore) {
    try { localStorage.setItem('ghiande-e-mattoncini:' + chiave, JSON.stringify(valore)); } catch (e) { /* niente */ }
  }

  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  // ---------------------------------------------------------------- stato
  const stato = {
    test: false,           // prove automatiche: niente suoni, niente pannelli, nessun avanzamento da solo
    iaGioca: false,        // nelle prove il giocatore simulato guida anche in partita
    modo: 'demo',          // 'demo' | 'gioco'
    fase: 'gioco',         // 'gioco' | 'persa' | 'vinto' | 'pausa' | 'finita'
    pausaDa: null,
    personaggio: leggi('personaggio', 'tino'),
    livello: 0,
    punti: 0,
    vite: VITE,
    prossimaVita: PUNTI_VITA,
    mattoni: [],
    griglia: [],
    righe: 0,
    rimasti: 0,
    palle: [],
    capsule: [],
    semi: [],
    boss: [],
    bollette: [],
    esplosioni: [],
    particelle: [],
    scritte: [],
    asse: { x: W / 2, w: 108, vx: 0, bersaglio: null, schiaccia: 0, stordito: 0 },
    poteri: { lunga: 0, corta: 0, miele: 0, fuoco: 0, fionda: 0, lumaca: 0, vespa: 0 },
    siepe: false,
    fattoreVel: 1,
    combo: 0,
    tempo: 0,              // secondi nel livello
    fermo: 0,              // secondi senza toccare l'asse o mattoncini rompibili
    semeT: 0,
    timer: 0,
    scossa: 0,
    messaggio: null,
    eroe: { x: W / 2, inclina: 0, faccia: 'normale', facciaT: 0, tremaT: 0, saltoT: 0, caduta: 0, festa: false, schiaccia: 0 },
    ia: { timer: 0, bersaglio: W / 2, attesa: 0 },
    conto: null,           // punti di fine livello
    statistiche: { vitePerse: 0, colpiAsse: 0 },
  };
  let muto = leggi('muto', false);
  let musicaSpenta = leggi('musica-spenta', false);
  let record = leggi('record', 0);
  let sbloccati = leggi('sbloccati', 1);   // quanti livelli si possono scegliere

  const livello = () => LIVELLI[stato.livello];
  const grado = () => stato.livello * 15 / (LIVELLI.length - 1);
  const bossVivi = () => stato.boss.filter((b) => b.stato !== 'ko');
  const mondo = () => MONDI[livello().mondo];

  // ---------------------------------------------------------------- audio
  // Tutto sintetizzato con Web Audio (nessun file), come negli altri giochi:
  // effetti brevi e una musichetta in loop. Passa tutto da un compressore.
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

  // scala pentatonica di Re minore: a ogni mattoncino della stessa volata la nota sale
  const SCALA = [587, 698, 784, 880, 1047, 1175, 1397, 1568, 1760, 2093, 2349, 2794];
  let ultimoMattone = 0;
  const EFFETTI = {
    mattone(combo) {
      const ora = audio.currentTime;
      if (ora - ultimoMattone < 0.025) return;    // le esplosioni non fanno cento note insieme
      ultimoMattone = ora;
      const f = SCALA[Math.min(combo - 1, SCALA.length - 1)];
      tono(f, 0.1, { tipo: 'triangle', vol: 0.075 });
      tono(f * 2, 0.05, { tipo: 'sine', vol: 0.02 });
    },
    resistente: () => { tono(330, 0.07, { tipo: 'square', vol: 0.04, filtro: 1600 }); rumore(0.04, { f: 2500, vol: 0.04 }); },
    duro: () => { tono(1500, 0.06, { tipo: 'square', f2: 950, vol: 0.025, filtro: 4000 }); tono(2250, 0.05, { tipo: 'sine', vol: 0.02 }); },
    asse(personaggio) {
      if (personaggio === 'gino') {
        tono(420, 0.09, { tipo: 'sine', f2: 660, vol: 0.09 });
        rumore(0.05, { tipo: 'bandpass', f: 2500, q: 1.2, vol: 0.03 });
      } else {
        tono(210, 0.1, { tipo: 'triangle', f2: 300, scivola: 0.03, vol: 0.12 });
        tono(105, 0.07, { tipo: 'sine', vol: 0.07 });
      }
    },
    muro: () => tono(190, 0.04, { tipo: 'triangle', vol: 0.035 }),
    petardo() {
      rumore(0.4, { f: 1400, f2: 180, vol: 0.22 });
      tono(95, 0.3, { tipo: 'sine', f2: 40, vol: 0.25 });
      rumore(0.08, { tipo: 'highpass', f: 3000, vol: 0.08, rit: 0.03 });
    },
    capsula: () => tono(900, 0.07, { tipo: 'sine', f2: 1350, vol: 0.03 }),
    buono: () => note([660, 880, 1175], 0.06, { tipo: 'triangle', vol: 0.06, d: 0.12 }),
    dispetto: () => note([440, 330, 247], 0.07, { tipo: 'sawtooth', vol: 0.035, filtro: 2000, d: 0.13 }),
    vita: () => note([523, 659, 784, 1046, 1318], 0.07, { tipo: 'triangle', vol: 0.06, d: 0.15 }),
    seme: () => tono(1250, 0.05, { tipo: 'square', f2: 650, vol: 0.018, filtro: 3000 }),
    lancio: () => { tono(300, 0.16, { tipo: 'triangle', f2: 720, vol: 0.06 }); rumore(0.12, { tipo: 'bandpass', f: 1200, f2: 3000, vol: 0.03 }); },
    siepe: () => { tono(260, 0.14, { tipo: 'triangle', f2: 520, vol: 0.07 }); rumore(0.15, { f: 1200, vol: 0.06 }); },
    fuoco: () => rumore(0.08, { tipo: 'bandpass', f: 1800, q: 2, vol: 0.05 }),
    persa() {
      tono(420, 0.65, { tipo: 'sawtooth', f2: 90, vol: 0.06, filtro: 1800 });
      rumore(0.3, { f: 900, f2: 200, vol: 0.06, rit: 0.1 });
    },
    vinto: () => note([523, 659, 784, 1046, 784, 1046, 1318], 0.09, { tipo: 'triangle', vol: 0.07, d: 0.18 }),
    sconfitta: () => note([392, 330, 262, 196], 0.17, { tipo: 'sawtooth', vol: 0.04, filtro: 1500, d: 0.24 }),
    via: () => tono(660, 0.08, { tipo: 'triangle', vol: 0.06 }),
    // boss
    ahi(chi) {
      const f = chi === 'capo' ? 190 : 300;
      tono(f, 0.22, { tipo: 'sawtooth', f2: f * 0.7, vol: 0.06, filtro: 1400 });
      tono(f * 1.5, 0.12, { tipo: 'square', f2: f, vol: 0.025, filtro: 1800, rit: 0.03 });
      rumore(0.05, { f: 1800, vol: 0.05 });
    },
    rete: () => { rumore(0.25, { tipo: 'bandpass', f: 900, f2: 2600, q: 1.4, vol: 0.06 }); tono(500, 0.12, { tipo: 'triangle', f2: 900, vol: 0.03 }); },
    presa: () => { tono(240, 0.15, { tipo: 'triangle', f2: 150, vol: 0.08 }); rumore(0.12, { f: 700, vol: 0.06 }); },
    ributta: () => { rumore(0.2, { tipo: 'bandpass', f: 2400, f2: 700, q: 1.2, vol: 0.07 }); tono(700, 0.14, { tipo: 'square', f2: 250, vol: 0.03, filtro: 2500 }); },
    bolletta: () => rumore(0.16, { tipo: 'bandpass', f: 3000, f2: 1500, q: 2, vol: 0.05 }),
    stordito: () => { tono(160, 0.35, { tipo: 'square', vol: 0.035, filtro: 900 }); note([1400, 1100, 1400, 1100], 0.06, { tipo: 'sine', vol: 0.03, d: 0.08 }); },
    timbra: () => { tono(85, 0.25, { tipo: 'sine', f2: 45, vol: 0.3 }); rumore(0.12, { f: 900, vol: 0.15 }); },
    megafono: () => tono(520, 0.3, { tipo: 'sawtooth', f2: 380, vol: 0.04, filtro: 2200 }),
    bossKo: () => { tono(900, 0.9, { tipo: 'triangle', f2: 120, vol: 0.06 }); rumore(0.4, { f: 1200, f2: 200, vol: 0.12, rit: 0.6 }); },
  };
  const suoni = new Proxy(EFFETTI, {
    get: (o, k) => (...a) => { if (puoSuonare()) { try { o[k](...a); } catch (e) { /* niente */ } } },
  });

  // ---------------------------------------------------------------- musica
  // Musichetta in loop come in Gino Volante: basso saltellante, "pop" sugli
  // accordi, melodia a onda quadra. Due livelli: menu (calma) e partita; quando
  // restano pochi mattoncini il filtro si apre e il charleston si fa più fitto.
  const MUSICA = { bpm: [96, 116], volume: 0.28, anticipo: 0.2 };
  const NOTA = (n) => {
    const m = /^([A-G])(#?)(\d)$/.exec(n);
    return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  };
  const BRANO = [
    ['D3', 'm', 'A5 - - F5 - - D5 - E5 - F5 - A5 - - -'],
    ['A#2', 'M', 'D6 - - A#5 - - F5 - A#5 - - - A5 - G5 -'],
    ['F3', 'M', 'A5 - C6 - A5 - F5 - G5 - A5 - C6 - - -'],
    ['C3', 'M', 'G5 - - E5 - - C5 - E5 - G5 - - - - -'],
    ['D3', 'm', 'F5 - A5 - D6 - A5 - F5 - - - E5 - D5 -'],
    ['A#2', 'M', 'D5 - F5 - A#5 - D6 - C6 - A#5 - A5 - - -'],
    ['C3', 'M', 'G5 - E5 - C6 - - - G5 - A5 - A#5 - - -'],
    ['A2', '7', 'A5 - - - C#6 - - - E6 - - - C#6 - A5 -'],
  ].map(([radice, tipo, mel]) => ({
    radice: NOTA(radice),
    accordo: { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 10] }[tipo],
    melodia: mel.split(' ').map((n) => (n === '-' ? null : NOTA(n))),
  }));
  const BASSO = { 0: 0, 2: 12, 4: 7, 6: 12, 8: 0, 10: 7, 11: 10, 12: 12, 14: 7 };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const musica = { passo: 0, prossimo: 0, suona: false, uscita: null, filtro: null };

  function inPartita() {
    return stato.modo === 'gioco' && ['gioco', 'persa', 'vinto', 'pausa'].includes(stato.fase);
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
      notaMusica(t, 'square', hz(m), 0.045, durata * 0.8);
    }
    if (i % 4 === 2) pop(t, acc[(i >> 2) % 3] + 12, 0.15);
    if (teso && i % 2 === 1) pop(t, acc[(n >> 1) % 3] + 24, 0.06);
    const mel = battuta.melodia[i];
    if (mel !== null) {
      const lunga = battuta.melodia.slice(i + 1).findIndex((x) => x !== null);
      const dur = durata * Math.min(4, lunga < 0 ? 4 : lunga + 1) * 0.9;
      notaMusica(t, 'square', hz(mel), liv === 0 ? 0.06 : 0.08, dur, musica.filtro);
      notaMusica(t, 'triangle', hz(mel + 12), 0.035, dur * 0.6, musica.filtro);
    }
    if (liv === 1 && (i === 0 || i === 8 || i === 10)) notaMusica(t, 'sine', 150, 0.5, 0.16, musica.uscita, 45, 0.12);
    if (liv === 0 && i === 0) notaMusica(t, 'sine', 120, 0.22, 0.12, musica.uscita, 50, 0.1);
    if (liv === 1 && (i === 4 || i === 12)) rumoreMusica(t, 0.18, 0.12, 'bandpass', 1800);
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
    const teso = liv === 1 && (stato.boss.length > 0 || (stato.rimasti > 0 && stato.rimasti <= 6));
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
  function ridimensiona() {
    const r = palco.getBoundingClientRect();
    const aw = Math.max(100, r.width - 16);
    const ah = Math.max(100, r.height - 16);
    // campo più alto se lo schermo è stretto e lungo (telefono in verticale)
    if (!stato.test) {
      H = clamp(Math.round(W * ah / aw), 820, 980);
      PY = H - 104;
      Y_SIEPE = H - 12;
    }
    scala = Math.min(aw / W, ah / H);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = Math.round(W * scala) + 'px';
    canvas.style.height = Math.round(H * scala) + 'px';
    canvas.width = Math.round(W * scala * dpr);
    canvas.height = Math.round(H * scala * dpr);
    ctx.setTransform(scala * dpr, 0, 0, scala * dpr, 0, 0);
    // telefono girato in orizzontale: compare l'invito a girarlo, quindi si mette in pausa
    if (touch && r.width > r.height && window.innerHeight <= 520 && inPartita()) pausa();
  }
  new ResizeObserver(ridimensiona).observe(palco);

  // ---------------------------------------------------------------- input
  const tasti = new Set();
  const TASTI_GIOCO = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (TASTI_GIOCO.includes(e.code) && !pannelloAperto()) e.preventDefault();
    tasti.add(e.code);
    document.body.classList.add('mostra-cursore');
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (stato.fase === 'pausa') riprendi();
      else if (inPartita()) pausa();
    } else if (e.code === 'KeyM') {
      cambiaAudio();
    } else if (e.code === 'KeyN') {
      cambiaMusica();
    } else if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') && !pannelloAperto()) {
      azione();
    }
  });
  window.addEventListener('keyup', (e) => tasti.delete(e.code));
  window.addEventListener('blur', () => { tasti.clear(); if (inPartita()) pausa(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && inPartita()) pausa(); });

  function xLogica(e) {
    const r = canvas.getBoundingClientRect();
    return (e.clientX - r.left) / r.width * W;
  }

  // Col mouse l'asse segue il puntatore; col dito si muove di quanto si sposta
  // il dito (così si può toccare dove si vuole senza coprire l'asse).
  // Un tocco breve senza spostarsi lancia la ghianda.
  const dito = { id: null, x0: 0, asse0: 0, t0: 0, mosso: 0 };
  palco.addEventListener('pointerdown', (e) => {
    if (e.target !== canvas && e.target !== palco) return;
    if (!inPartita() || stato.fase === 'pausa') return;
    if (e.pointerType === 'mouse') {
      stato.asse.bersaglio = xLogica(e);
      azione();
      return;
    }
    try { palco.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
    dito.id = e.pointerId;
    dito.x0 = xLogica(e);
    dito.asse0 = stato.asse.x;
    dito.t0 = performance.now();
    dito.mosso = 0;
  });
  window.addEventListener('pointermove', (e) => {
    if (!inPartita() || stato.fase === 'pausa') return;
    if (e.pointerType === 'mouse') {
      document.body.classList.remove('mostra-cursore');
      stato.asse.bersaglio = xLogica(e);
    } else if (e.pointerId === dito.id) {
      const dx = xLogica(e) - dito.x0;
      dito.mosso = Math.max(dito.mosso, Math.abs(dx));
      stato.asse.bersaglio = dito.asse0 + dx * ASSE.dito;
    }
  }, { passive: true });
  const fineDito = (e) => {
    if (e.pointerId !== dito.id) return;
    if (e.type === 'pointerup' && dito.mosso < 12 && performance.now() - dito.t0 < 350) azione();
    dito.id = null;
  };
  window.addEventListener('pointerup', fineDito);
  window.addEventListener('pointercancel', fineDito);

  // lancia le ghiande attaccate all'asse (all'inizio o col miele)
  function azione() {
    if (stato.modo !== 'gioco' || stato.fase !== 'gioco') return;
    for (const p of stato.palle) if (p.attaccata) lancia(p);
  }

  // ---------------------------------------------------------------- flusso di gioco
  function iniziaPartita(n = 0, opzioni = {}) {
    stato.modo = opzioni.demo ? 'demo' : 'gioco';
    stato.punti = 0;
    stato.vite = VITE;
    stato.prossimaVita = PUNTI_VITA;
    stato.statistiche = { vitePerse: 0, colpiAsse: 0, livelli: [] };
    stato.eroe.caduta = 0;
    stato.eroe.festa = false;
    caricaLivello(n);
    if (!opzioni.demo) nascondiPannello();
    aggiornaTabellone();
  }

  function caricaLivello(n) {
    stato.livello = n;
    const liv = LIVELLI[n];
    const m = MONDI[liv.mondo];
    stato.mattoni = [];
    stato.righe = liv.mappa.length;
    stato.griglia = liv.mappa.map(() => new Array(COLONNE).fill(null));
    stato.rimasti = 0;
    liv.mappa.forEach((riga, r) => {
      for (let c = 0; c < COLONNE; c++) {
        const ch = riga[c];
        if (!ch || ch === '.') continue;
        const b = { c, r, x: MURO + c * CW, y: GY + r * CH, lampo: 0, ch };
        if (m.colori[ch]) Object.assign(b, { tipo: 'colore', colpi: 1, colore: m.colori[ch] });
        else if (ch === '2' || ch === '3') Object.assign(b, { tipo: 'resistente', colpi: +ch, max: +ch });
        else if (ch === '#') Object.assign(b, { tipo: 'duro', colpi: Infinity });
        else if (ch === '*') Object.assign(b, { tipo: 'petardo', colpi: 1 });
        else if (ch === '?') Object.assign(b, { tipo: 'sorpresa', colpi: 1 });
        else continue;
        if (b.tipo !== 'duro') stato.rimasti++;
        stato.mattoni.push(b);
        stato.griglia[r][c] = b;
      }
    });
    stato.capsule = [];
    stato.semi = [];
    stato.bollette = [];
    stato.esplosioni = [];
    stato.particelle = [];
    stato.boss = (liv.boss || []).map((tipo, i, tutti) => nuovoBoss(tipo, i, tutti.length));
    stato.scritte = [];
    stato.tempo = 0;
    stato.conto = null;
    stato.statistiche.vitePerseLivello = 0;
    nuovaVita();
    stato.asse.x = W / 2;
    stato.asse.w = larghezzaAsse();
    stato.eroe.x = W / 2;
    stato.eroe.festa = false;
    stato.eroe.caduta = 0;
    stato.fase = 'gioco';
    mostraMessaggio(`${n + 1}. ${liv.nome}`, 2.2);
    if (stato.boss.length) stato.messaggioDopo = { testo: stato.boss.length > 1 ? 'Arrivano gli agenti!' : stato.boss[0].tipo === 'capo' ? 'Arriva il capo!' : 'Arriva un agente!', t: 2.3 };
    if (stato.modo === 'gioco') suoni.via();
    // fondale del mondo anche dietro al campo
    document.body.classList.remove('mondo-0', 'mondo-1', 'mondo-2', 'mondo-3');
    document.body.classList.add('mondo-' + liv.mondo);
    palco.style.backgroundImage = `url("${FONDALI + m.fondale}.png")`;
    aggiornaTabellone();
  }

  // dopo una vita persa (o a inizio livello): poteri spenti, ghianda sull'asse
  function nuovaVita() {
    for (const k in stato.poteri) stato.poteri[k] = 0;
    stato.siepe = false;
    stato.fattoreVel = 1;
    stato.combo = 0;
    stato.fermo = 0;
    stato.capsule = [];
    stato.semi = [];
    stato.bollette = [];
    stato.asse.stordito = 0;
    stato.palle = [nuovaPalla()];
    stato.ia.attesa = IA.attesa;
  }

  function nuovaPalla() {
    return {
      x: stato.asse.x, y: PY - R, vx: 0, vy: -1,
      vel: cresce(PALLA.inizio, grado()),
      attaccata: true, offset: casuale(-10, 10), auto: 0,
      rot: 0, scia: [], persa: false,
    };
  }

  function larghezzaAsse() {
    const base = cresce(ASSE.larghezza, grado());
    if (stato.poteri.lunga > 0) return base * ASSE.lunga;
    if (stato.poteri.corta > 0) return base * ASSE.corta;
    return base;
  }

  function lancia(p) {
    if (!p.attaccata) return;
    p.attaccata = false;
    // angolo come se avesse colpito l'asse in quel punto, ma mai troppo dritto
    let rel = clamp(p.offset / (stato.asse.w / 2), -1, 1) * 0.7;
    if (Math.abs(rel) < 0.12) rel = (rel < 0 ? -1 : 1) * casuale(0.12, 0.3);
    const a = rel * PALLA.angoloMax;
    p.vx = Math.sin(a);
    p.vy = -Math.cos(a);
    p.y = PY - R - 1;
    suoni.lancio();
  }

  function perdiVita() {
    stato.vite--;
    stato.statistiche.vitePerse++;
    stato.statistiche.vitePerseLivello++;
    stato.fase = 'persa';
    stato.timer = 1.3;
    stato.capsule = [];
    stato.semi = [];
    stato.bollette = [];
    stato.asse.stordito = 0;
    const e = stato.eroe;
    if (stato.personaggio === 'tino') imposta('ferito', 1.3);
    e.tremaT = 0.8;
    stato.scossa = 0.3;
    suoni.persa();
    aggiornaTabellone();
  }

  function dopoVitaPersa() {
    if (stato.modo === 'demo') stato.vite = Math.max(stato.vite, 1);
    if (stato.vite > 0) {
      nuovaVita();
      stato.fase = 'gioco';
      if (stato.vite === 1 && stato.modo === 'gioco') mostraMessaggio('Ultima ghianda!', 1.6);
      return;
    }
    // partita finita
    stato.fase = 'finita';
    stato.palle = [];
    stato.eroe.caduta = 0.01;
    if (stato.personaggio === 'tino') imposta('ko', Infinity);
    const nuovo = stato.punti > record;
    if (nuovo) { record = stato.punti; scrivi('record', record); }
    suoni.sconfitta();
    if (!stato.test) setTimeout(() => { if (stato.fase === 'finita') mostraPannello(pannelloSconfitta(nuovo)); }, 900);
  }

  function vinci() {
    if (stato.fase !== 'gioco') return;
    stato.fase = 'vinto';
    stato.timer = stato.boss.length ? 2.2 : 1.6;
    stato.capsule = [];
    stato.semi = [];
    stato.bollette = [];
    stato.eroe.festa = true;
    imposta('normale', Infinity);
    const bonusLivello = (stato.boss.length ? 2500 : 500) * (livello().mondo + 1) + 100 * stato.livello;
    const bonusTempo = Math.max(0, Math.round(150 - stato.tempo)) * 10;
    stato.conto = { punti: stato.punti, bonusLivello, bonusTempo, tempo: stato.tempo };
    aggiungiPunti(bonusLivello + bonusTempo);
    stato.statistiche.livelli.push({ livello: stato.livello, tempo: stato.tempo, vitePerse: stato.statistiche.vitePerseLivello });
    if (stato.modo === 'gioco') {
      sbloccati = Math.max(sbloccati, Math.min(LIVELLI.length, stato.livello + 2));
      scrivi('sbloccati', sbloccati);
      if (stato.punti > record) { record = stato.punti; scrivi('record', record); }
    }
    mostraMessaggio(stato.boss.length ? (stato.boss.length > 1 ? 'Agenti battuti!' : stato.boss[0].tipo === 'capo' ? 'Capo battuto!' : 'Agente battuto!') : 'Livello superato!', 1.6);
    suoni.vinto();
  }

  function dopoVittoria() {
    if (stato.modo === 'demo' || stato.test) {
      if (stato.test && stato.modo === 'gioco') { stato.fase = 'superato'; return; }
      caricaLivello((stato.livello + 1) % Math.min(4, LIVELLI.length));
      return;
    }
    stato.fase = 'superato';
    const ultimo = stato.livello === LIVELLI.length - 1;
    mostraPannello(ultimo ? pannelloFinale() : pannelloLivello());
  }

  function pausa() {
    if (!inPartita() || stato.fase === 'pausa' || stato.test) return;
    stato.pausaDa = stato.fase;
    stato.fase = 'pausa';
    tasti.clear();
    mostraPannello(pannelloPausa());
    aggiornaMusica();
  }
  function riprendi() {
    if (stato.fase !== 'pausa') return;
    stato.fase = stato.pausaDa;
    nascondiPannello();
    aggiornaMusica();
  }

  function vaiAlMenu() {
    iniziaPartita(Math.floor(Math.random() * Math.min(4, sbloccati)), { demo: true });
    mostraPannello(pannelloMenu());
    aggiornaTabellone();
  }

  function imposta(faccia, durata) {
    stato.eroe.faccia = faccia;
    stato.eroe.facciaT = durata;
  }
  function mostraMessaggio(testo, durata) {
    stato.messaggio = { testo, t: 0, durata };
  }

  function aggiungiPunti(n) {
    if (stato.modo !== 'gioco') return;
    stato.punti += n;
    while (stato.punti >= stato.prossimaVita) {
      stato.prossimaVita += PUNTI_VITA;
      if (stato.vite < VITE_MAX) {
        stato.vite++;
        suoni.vita();
        mostraMessaggio('Una ghianda in più!', 1.4);
      }
    }
    aggiornaTabellone();
  }

  function aggiornaTabellone() {
    const demo = stato.modo === 'demo';
    elPunti.textContent = demo ? (record ? record : 0) : stato.punti;
    const n = demo ? 0 : stato.vite;
    let html = '';
    for (let i = 0; i < Math.min(n, 5); i++) html += '<img src="ghianda.svg" alt="">';
    if (n > 5) html += `<span class="piu">+${n - 5}</span>`;
    elVite.innerHTML = html;
    elVite.setAttribute('aria-label', demo ? '' : `${n} ${n === 1 ? 'vita' : 'vite'}`);
    elInfo.innerHTML = demo ? '<span class="lungo">Record</span>'
      : `<span class="lungo">Livello </span><span class="corto">Liv. </span>${stato.livello + 1}`;
  }

  function cambiaAudio() {
    muto = !muto;
    scrivi('muto', muto);
    document.body.classList.toggle('muto', muto);
    if (!muto) { try { contesto(); } catch (e) { /* niente */ } suoni.via(); }
    aggiornaMusica();
  }
  function cambiaMusica() {
    musicaSpenta = !musicaSpenta;
    scrivi('musica-spenta', musicaSpenta);
    document.body.classList.toggle('senza-musica', musicaSpenta);
    aggiornaMusica();
  }

  // ---------------------------------------------------------------- aggiornamento
  function aggiorna(dt) {
    if (stato.fase === 'pausa') return;
    aggiornaEroe(dt);
    aggiornaParticelle(dt);
    if (stato.messaggio) {
      stato.messaggio.t += dt;
      if (stato.messaggio.t > stato.messaggio.durata) stato.messaggio = null;
    }
    stato.scossa = Math.max(0, stato.scossa - dt);
    for (const b of stato.mattoni) if (b.lampo > 0) b.lampo = Math.max(0, b.lampo - dt);
    animaBoss(dt);
    if (stato.messaggioDopo) {
      stato.messaggioDopo.t -= dt;
      if (stato.messaggioDopo.t <= 0) { mostraMessaggio(stato.messaggioDopo.testo, 1.6); stato.messaggioDopo = null; if (stato.boss.length) suoni.megafono(); }
    }

    if (stato.fase === 'persa') {
      stato.timer -= dt;
      if (stato.timer <= 0) dopoVitaPersa();
      return;
    }
    if (stato.fase === 'vinto') {
      stato.timer -= dt;
      if (stato.timer <= 0) dopoVittoria();
      return;
    }
    if (stato.fase !== 'gioco') return;

    stato.tempo += dt;
    aggiornaPoteri(dt);
    muoviAsse(dt);

    for (const p of stato.palle) muoviPalla(p, dt);
    stato.palle = stato.palle.filter((p) => !p.persa);

    aggiornaBoss(dt);
    aggiornaBollette(dt);
    aggiornaEsplosioni(dt);
    aggiornaCapsule(dt);
    aggiornaSemi(dt);
    if (stato.fase !== 'gioco') return;   // vinto durante l'aggiornamento

    // nessun mattoncino colpito per troppo tempo (giro chiuso): si corregge un po' l'angolo
    stato.fermo += dt;
    if (stato.fermo > PALLA.giraDopo) {
      stato.fermo = 0;
      for (const p of stato.palle) {
        if (p.attaccata) continue;
        const a = casuale(0.17, 0.3) * (Math.random() < 0.5 ? -1 : 1);
        const c = Math.cos(a), s = Math.sin(a);
        [p.vx, p.vy] = [p.vx * c - p.vy * s, p.vx * s + p.vy * c];
        raddrizza(p);
      }
    }

    if (stato.palle.length === 0) perdiVita();
  }

  function aggiornaPoteri(dt) {
    const pt = stato.poteri;
    for (const k in pt) if (pt[k] > 0) pt[k] = Math.max(0, pt[k] - dt);
    const vuole = pt.lumaca > 0 ? 0.72 : pt.vespa > 0 ? 1.22 : 1;
    stato.fattoreVel += (vuole - stato.fattoreVel) * Math.min(1, dt * 3);
    const w = larghezzaAsse();
    stato.asse.w += (w - stato.asse.w) * Math.min(1, dt * 10);
  }

  function muoviAsse(dt) {
    const a = stato.asse;
    const prima = a.x;
    const guidaIA = stato.modo === 'demo' || stato.iaGioca;
    if (a.stordito > 0) {
      a.stordito = Math.max(0, a.stordito - dt);
      if (guidaIA) pilotaIA(0);   // il giocatore simulato continua a guardare, ma non si muove
    } else if (guidaIA) {
      pilotaIA(dt);
    } else {
      let dir = 0;
      if (tasti.has('ArrowLeft') || tasti.has('KeyA')) dir -= 1;
      if (tasti.has('ArrowRight') || tasti.has('KeyD')) dir += 1;
      if (dir) {
        a.bersaglio = null;
        a.x += dir * ASSE.tastiera * dt;
      } else if (a.bersaglio !== null) {
        const passo = ASSE.puntatore * dt;
        a.x += clamp(a.bersaglio - a.x, -passo, passo);
      }
    }
    const lim = a.w / 2 + MURO;
    a.x = clamp(a.x, lim, W - lim);
    if (a.bersaglio !== null) a.bersaglio = clamp(a.bersaglio, lim, W - lim);
    a.vx = dt > 0 ? (a.x - prima) / dt : 0;
    a.schiaccia = Math.max(0, a.schiaccia - dt * 6);
  }

  // velocità effettiva della ghianda
  const velocita = (p) => p.vel * stato.fattoreVel;

  // la direzione non deve mai essere troppo orizzontale
  function raddrizza(p) {
    const l = Math.hypot(p.vx, p.vy) || 1;
    let vx = p.vx / l, vy = p.vy / l;
    if (Math.abs(vy) < PALLA.minVerticale) {
      vy = (vy < 0 ? -1 : 1) * PALLA.minVerticale;
      vx = (vx < 0 ? -1 : 1) * Math.sqrt(1 - vy * vy);
    }
    p.vx = vx; p.vy = vy;
  }

  function muoviPalla(p, dt) {
    const a = stato.asse;
    if (p.attaccata) {
      p.offset = clamp(p.offset, -a.w / 2 + 4, a.w / 2 - 4);
      p.x = a.x + p.offset;
      p.y = PY - R;
      if (p.auto > 0) {
        p.auto -= dt;
        if (p.auto <= 0) lancia(p);
      }
      return;
    }
    if (p.presa) {
      const b = p.presa;
      const [mx, my] = puntoMano(b);
      p.x = mx; p.y = my;
      p.presaT -= dt;
      if (p.presaT <= 0) ributta(p);
      return;
    }
    const v = velocita(p);
    const passi = Math.max(1, Math.ceil(v * dt / 4));
    const h = dt / passi;
    const fuoco = stato.poteri.fuoco > 0;
    p.rot += dt * (p.vx < 0 ? -9 : 9);
    for (let i = 0; i < passi; i++) {
      p.x += p.vx * v * h;
      p.y += p.vy * v * h;
      // muri
      if (p.x < MURO + R) { p.x = MURO + R; p.vx = Math.abs(p.vx); raddrizza(p); suoni.muro(); }
      else if (p.x > W - MURO - R) { p.x = W - MURO - R; p.vx = -Math.abs(p.vx); raddrizza(p); suoni.muro(); }
      if (p.y < MURO + R) { p.y = MURO + R; p.vy = Math.abs(p.vy); suoni.muro(); }
      // asse
      if (p.vy > 0 && p.y + R >= PY && p.y + R <= PY + AH + 10) {
        const margine = R * 0.7;
        if (p.x >= a.x - a.w / 2 - margine && p.x <= a.x + a.w / 2 + margine) {
          rimbalzoAsse(p);
          if (p.attaccata) return;
          continue;
        }
      }
      // siepe
      if (stato.siepe && p.vy > 0 && p.y + R >= Y_SIEPE) {
        p.y = Y_SIEPE - R;
        p.vy = -Math.abs(p.vy);
        stato.siepe = false;
        suoni.siepe();
        for (let k = 0; k < 14; k++) aggiungiParticella({ x: p.x + casuale(-30, 30), y: Y_SIEPE, vx: casuale(-120, 120), vy: casuale(-260, -80), colore: '#4f9a3f', dim: 4, vita: 0.7 });
      }
      // boss
      if (stato.boss.length && p.y - R < Y_BOSS + 160 && urtaBoss(p)) {
        if (p.presa || stato.fase !== 'gioco') return;
      }
      // mattoncini
      if (p.y - R < GY + stato.righe * CH + 2 && p.y + R > GY - 2) {
        if (urtaMattoni(p, fuoco) && stato.fase !== 'gioco') return;
      }
      if (p.y - R > H) { p.persa = true; return; }
    }
    if (fuoco && Math.random() < 0.6) {
      aggiungiParticella({ x: p.x + casuale(-3, 3), y: p.y + casuale(-3, 3), vx: casuale(-30, 30), vy: casuale(-60, 0), colore: Math.random() < 0.5 ? '#ffb020' : '#ff5a1f', dim: casuale(2, 4), vita: 0.35, g: -100 });
    }
    p.scia.push({ x: p.x, y: p.y });
    if (p.scia.length > 6) p.scia.shift();
  }

  function rimbalzoAsse(p) {
    const a = stato.asse;
    const rel = clamp((p.x - a.x) / (a.w / 2 + R * 0.7), -1, 1);
    const ang = rel * PALLA.angoloMax;
    p.vx = Math.sin(ang);
    p.vy = -Math.cos(ang);
    p.y = PY - R;
    p.vel = Math.min(cresce(PALLA.max, grado()), p.vel * (1 + PALLA.colpoAsse));
    stato.combo = 0;
    stato.statistiche.colpiAsse++;
    a.schiaccia = 1;
    stato.eroe.schiaccia = 1;
    suoni.asse(stato.personaggio);
    if (stato.poteri.miele > 0) {
      p.attaccata = true;
      p.offset = p.x - a.x;
      p.auto = 2.5;
    }
  }

  function urtaMattoni(p, fuoco) {
    const c0 = Math.floor((p.x - R - MURO) / CW), c1 = Math.floor((p.x + R - MURO) / CW);
    const r0 = Math.floor((p.y - R - GY) / CH), r1 = Math.floor((p.y + R - GY) / CH);
    let migliore = null, prof = 0, nx = 0, ny = 0;
    const toccati = [];
    for (let r = Math.max(0, r0); r <= Math.min(stato.righe - 1, r1); r++) {
      for (let c = Math.max(0, c0); c <= Math.min(COLONNE - 1, c1); c++) {
        const b = stato.griglia[r][c];
        if (!b) continue;
        const qx = clamp(p.x, b.x, b.x + CW), qy = clamp(p.y, b.y, b.y + CH);
        const dx = p.x - qx, dy = p.y - qy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= R * R) continue;
        let n, pen;
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          n = [dx / d, dy / d];
          pen = R - d;
        } else {
          // centro dentro al mattoncino: si esce dal lato più vicino
          const sx = Math.min(p.x - b.x, b.x + CW - p.x), sy = Math.min(p.y - b.y, b.y + CH - p.y);
          if (sx < sy) { n = [p.x < b.x + CW / 2 ? -1 : 1, 0]; pen = sx + R; }
          else { n = [0, p.y < b.y + CH / 2 ? -1 : 1]; pen = sy + R; }
        }
        toccati.push(b);
        if (fuoco && b.tipo !== 'duro') continue;
        if (pen > prof) { prof = pen; migliore = b; nx = n[0]; ny = n[1]; }
      }
    }
    if (!toccati.length) return false;
    if (fuoco) {
      for (const b of toccati) if (b.tipo !== 'duro') { colpisci(b, true); suoni.fuoco(); }
      if (!migliore) { stato.fermo = 0; return true; }
    }
    // negli spigoli tra due mattoncini vicini il rimbalzo è dritto
    if (nx !== 0 && ny !== 0) {
      const vicinoX = cella(migliore.r, migliore.c + Math.sign(nx));
      const vicinoY = cella(migliore.r + Math.sign(ny), migliore.c);
      if (vicinoX && !vicinoY) { nx = 0; ny = Math.sign(ny); }
      else if (vicinoY && !vicinoX) { ny = 0; nx = Math.sign(nx); }
    }
    const vn = p.vx * nx + p.vy * ny;
    if (vn < 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; }
    p.x += nx * prof;
    p.y += ny * prof;
    raddrizza(p);
    colpisci(migliore, false);
    if (migliore.tipo !== 'duro') p.vel = Math.min(cresce(PALLA.max, grado()), p.vel * (1 + PALLA.colpoMattone));
    return true;
  }

  const cella = (r, c) => (r >= 0 && r < stato.righe && c >= 0 && c < COLONNE ? stato.griglia[r][c] : null);

  function colpisci(b, distruggi) {
    b.lampo = 0.12;
    if (b.tipo === 'duro') { suoni.duro(); return; }
    stato.fermo = 0;
    b.colpi = distruggi ? 0 : b.colpi - 1;
    if (b.colpi > 0) {
      aggiungiPunti(10);
      suoni.resistente();
      for (let k = 0; k < 4; k++) aggiungiParticella({ x: b.x + casuale(4, CW - 4), y: b.y + CH / 2, vx: casuale(-90, 90), vy: casuale(-160, -20), colore: coloreDi(b), dim: 3, vita: 0.5 });
      return;
    }
    rompi(b);
  }

  function rompi(b) {
    if (stato.griglia[b.r][b.c] !== b) return;
    stato.griglia[b.r][b.c] = null;
    stato.mattoni.splice(stato.mattoni.indexOf(b), 1);
    stato.rimasti--;
    stato.combo++;
    const base = b.tipo === 'resistente' ? 50 * b.max : b.tipo === 'petardo' ? 80 : b.tipo === 'sorpresa' ? 60 : 50;
    const punti = Math.round(base * (1 + 0.1 * Math.min(stato.combo - 1, 10)) / 5) * 5;
    aggiungiPunti(punti);
    if (stato.modo === 'gioco') stato.scritte.push({ x: b.x + CW / 2, y: b.y + CH / 2, testo: '+' + punti, t: 0 });
    suoni.mattone(stato.combo);
    const col = coloreDi(b);
    for (let k = 0; k < 7; k++) {
      aggiungiParticella({ x: b.x + casuale(3, CW - 3), y: b.y + casuale(3, CH - 3), vx: casuale(-150, 150), vy: casuale(-220, 40), colore: col, dim: casuale(3, 6), vita: casuale(0.5, 0.9), giro: casuale(-10, 10) });
    }
    // potenziamenti
    const prob = cresce(CADUTA.probabilita, grado()) * (b.tipo === 'timbrato' ? 0.5 : 1);
    if (b.tipo === 'sorpresa' || Math.random() < prob) nuovaCapsula(b.x + CW / 2, b.y + CH / 2);
    if (b.tipo === 'petardo') stato.esplosioni.push({ b, t: 0.07 });
    if (stato.rimasti <= 0 && !stato.boss.length) vinci();
  }

  function aggiornaEsplosioni(dt) {
    for (const e of stato.esplosioni) e.t -= dt;
    const pronte = stato.esplosioni.filter((e) => e.t <= 0);
    stato.esplosioni = stato.esplosioni.filter((e) => e.t > 0);
    for (const { b } of pronte) {
      suoni.petardo();
      stato.scossa = Math.max(stato.scossa, 0.25);
      const cx = b.x + CW / 2, cy = b.y + CH / 2;
      for (let k = 0; k < 22; k++) {
        const a = casuale(0, Math.PI * 2), v = casuale(80, 340);
        aggiungiParticella({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, colore: ['#ffd84a', '#ff8a1f', '#e8483f'][k % 3], dim: casuale(3, 6), vita: casuale(0.3, 0.6), g: 200 });
      }
      stato.particelle.push({ tipo: 'bum', x: cx, y: cy, t: 0, vita: 0.45 });
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const v = cella(b.r + dr, b.c + dc);
          if (v && v.tipo !== 'duro') { v.colpi = 0; rompi(v); }
        }
      }
    }
  }

  function nuovaCapsula(x, y) {
    let tot = 0;
    for (const p of POTERI) tot += p.peso;
    let k = Math.random() * tot;
    let scelto = POTERI[0];
    for (const p of POTERI) { k -= p.peso; if (k <= 0) { scelto = p; break; } }
    // la ghianda d'oro non cade se le vite sono già al massimo
    if (scelto.id === 'vita' && stato.vite >= VITE_MAX) scelto = POTERE.lunga;
    stato.capsule.push({ x, y, id: scelto.id, t: 0 });
    suoni.capsula();
  }

  function aggiornaCapsule(dt) {
    const a = stato.asse;
    for (const c of stato.capsule) {
      c.y += CADUTA.velocita * dt;
      c.t += dt;
      if (c.y + 12 >= PY && c.y - 12 <= PY + AH && Math.abs(c.x - a.x) <= a.w / 2 + 12) {
        c.preso = true;
        prendi(c.id);
      } else if (c.y > H + 20) c.preso = true;
    }
    stato.capsule = stato.capsule.filter((c) => !c.preso);
  }

  function prendi(id) {
    const p = POTERE[id];
    const pt = stato.poteri;
    const e = stato.eroe;
    if (p.durata) pt[id] = p.durata;
    if (id === 'lunga') pt.corta = 0;
    if (id === 'corta') pt.lunga = 0;
    if (id === 'lumaca') pt.vespa = 0;
    if (id === 'vespa') pt.lumaca = 0;
    if (id === 'siepe') stato.siepe = true;
    if (id === 'vita') {
      stato.vite = Math.min(VITE_MAX, stato.vite + 1);
      aggiornaTabellone();
    }
    if (id === 'tre') {
      const nuove = [];
      for (const q of stato.palle) {
        if (q.presa) continue;
        if (q.attaccata) lancia(q);
        for (const ang of [-0.4, 0.4]) {
          if (stato.palle.length + nuove.length >= MAX_PALLE) break;
          const c = Math.cos(ang), s = Math.sin(ang);
          const n = { ...q, presa: null, scia: [], vx: q.vx * c - q.vy * s, vy: q.vx * s + q.vy * c };
          raddrizza(n);
          nuove.push(n);
        }
      }
      stato.palle.push(...nuove);
    }
    if (id === 'fionda') stato.semeT = 0;
    aggiungiPunti(p.buono ? 100 : 0);
    mostraMessaggio(p.nome + (p.buono ? '!' : '…'), 1.1);
    if (id === 'vita') suoni.vita();
    else if (p.buono) suoni.buono();
    else suoni.dispetto();
    if (p.buono) e.saltoT = 0.6;
    else {
      e.tremaT = 0.5;
      if (stato.personaggio === 'tino') imposta('arrabbiato', 1.2);
    }
  }

  function aggiornaSemi(dt) {
    const pt = stato.poteri;
    const a = stato.asse;
    if (pt.fionda > 0) {
      stato.semeT -= dt;
      if (stato.semeT <= 0) {
        stato.semeT = FIONDA.ogni;
        stato.semi.push({ x: a.x - a.w / 2 + 8, y: PY - 4 }, { x: a.x + a.w / 2 - 8, y: PY - 4 });
        suoni.seme();
      }
    }
    for (const s of stato.semi) {
      s.y -= FIONDA.velocita * dt;
      if (s.y < MURO) { s.via = true; continue; }
      const bol = stato.bollette.find((k) => Math.abs(k.x - s.x) < 14 && Math.abs(k.y - s.y) < 14);
      if (bol) { s.via = true; bol.via = true; aggiungiPunti(20); coriandoli(bol.x, bol.y, '#f7f7f2'); continue; }
      const capo = bossVivi().find((b) => dentroCorpo(b, s.x, s.y, 0));
      if (capo) { s.via = true; colpisciBoss(capo, 0.34); if (stato.fase !== 'gioco') return; continue; }
      const r = Math.floor((s.y - GY) / CH), c = Math.floor((s.x - MURO) / CW);
      const b = cella(r, c);
      if (b) {
        s.via = true;
        colpisci(b, false);
        if (stato.fase !== 'gioco') return;
      }
    }
    stato.semi = stato.semi.filter((s) => !s.via);
  }

  // ---------------------------------------------------------------- boss
  function nuovoBoss(tipo, i, quanti) {
    const T = BOSS[tipo];
    const img = immagini[tipo];
    const h = T.alt;
    const w = h * 260 / 320;
    // in due si dividono il campo: uno a sinistra, uno a destra
    const xMin = MURO + 4 + (quanti > 1 ? i * (W - 2 * MURO) / 2 : 0);
    const xMax = (quanti > 1 ? MURO + (i + 1) * (W - 2 * MURO) / 2 : W - MURO) - w - 4;
    const vita = Math.round(T.vita * (quanti > 1 ? COPPIA : 1));
    return {
      tipo, T, img, w, h, vita, max: vita,
      x: (xMin + xMax) / 2, y: Y_BOSS, dir: i % 2 ? -1 : 1, xMin, xMax,
      stato: 'cammina', t: 0,
      rete: T.rete ? T.rete.ogni * (0.6 + 0.4 * i) : 0, reteSu: 0,
      bollette: T.bollette ? T.bollette.ogni : 0,
      timbra: T.timbra ? T.timbra.ogni * 0.8 : 0,
      lampo: 0, trema: 0, salto: 0, invulnerabile: 0, caduta: 0, arrabbiato: false, giro: casuale(1.5, 3.5),
    };
  }

  const puntoMano = (b) => [b.x + b.w * b.T.mano[0], b.y + b.h * b.T.mano[1]];
  function corpo(b) {
    const [x0, y0, x1, y1] = b.T.corpo;
    return { x: b.x + b.w * x0, y: b.y + b.h * y0, w: b.w * (x1 - x0), h: b.h * (y1 - y0) };
  }
  function dentroCorpo(b, x, y, r) {
    const c = corpo(b);
    return x > c.x - r && x < c.x + c.w + r && y > c.y - r && y < c.y + c.h + r;
  }
  const tempi = (b) => (b.arrabbiato ? ARRABBIATO.tempi : 1);

  function animaBoss(dt) {
    for (const b of stato.boss) {
      b.t += dt;
      b.lampo = Math.max(0, b.lampo - dt);
      b.trema = Math.max(0, b.trema - dt);
      b.salto = Math.max(0, b.salto - dt);
      if (b.stato === 'ko') {
        b.caduta = Math.min(1, b.caduta + dt * 0.9);
      }
    }
  }

  function aggiornaBoss(dt) {
    for (const b of stato.boss) {
      if (b.stato === 'ko') continue;
      b.invulnerabile = Math.max(0, b.invulnerabile - dt);
      // cammina avanti e indietro, e ogni tanto cambia verso
      const vel = b.T.vel * (b.arrabbiato ? ARRABBIATO.vel : 1) * (b.reteSu > 0 ? 0.5 : 1);
      b.x += b.dir * vel * dt;
      if (b.x < b.xMin) { b.x = b.xMin; b.dir = 1; }
      if (b.x > b.xMax) { b.x = b.xMax; b.dir = -1; }
      b.giro -= dt;
      if (b.giro <= 0) { b.giro = casuale(1.5, 3.5); if (Math.random() < 0.5) b.dir *= -1; }
      // rete
      if (b.T.rete) {
        if (b.reteSu > 0) b.reteSu = Math.max(0, b.reteSu - dt);
        else {
          b.rete -= dt;
          if (b.rete <= 0) { b.reteSu = b.T.rete.dura; b.rete = b.T.rete.ogni * tempi(b); suoni.rete(); }
        }
      }
      // bollette
      if (b.T.bollette) {
        b.bollette -= dt;
        if (b.bollette <= 0) {
          b.bollette = b.T.bollette.ogni * tempi(b) * casuale(0.85, 1.15);
          lanciaBollette(b);
        }
      }
      // timbri: mattoncini nuovi nei buchi sotto di sé
      if (b.T.timbra) {
        b.timbra -= dt;
        if (b.timbra <= 0) {
          b.timbra = b.T.timbra.ogni * tempi(b);
          timbraMattoni(b);
        }
      }
    }
  }

  function lanciaBollette(b) {
    const [mx, my] = puntoMano(b);
    const quante = b.arrabbiato && b.T.bollette.arrabbiato ? b.T.bollette.arrabbiato : b.T.bollette.quante;
    const bersaglio = stato.asse.x + casuale(-50, 50);
    const base = Math.atan2(bersaglio - mx, PY - my);
    for (let i = 0; i < quante; i++) {
      const a = base + (i - (quante - 1) / 2) * BOLLETTE.sparpaglia * (quante > 1 ? 1.3 : 1);
      stato.bollette.push({ x: mx, y: my, vx: Math.sin(a) * BOLLETTE.velocita, vy: Math.cos(a) * BOLLETTE.velocita, rot: casuale(-0.5, 0.5), t: 0 });
    }
    b.salto = 0.3;
    if (b.tipo === 'capo') suoni.megafono(); else suoni.bolletta();
  }

  function timbraMattoni(b) {
    const righe = [];
    for (let r = 8; r < Math.min(stato.righe, 10); r++) righe.push(r);
    const centro = Math.floor((b.x + b.w / 2 - MURO) / CW);
    const buchi = [];
    for (const r of righe) {
      for (let c = 0; c < COLONNE; c++) if (!stato.griglia[r][c]) buchi.push({ r, c, d: Math.abs(c - centro) + Math.random() * 2 });
    }
    // non si timbra sopra la ghianda
    const liberi = buchi.filter(({ r, c }) => !stato.palle.some((p) => Math.abs(p.x - (MURO + c * CW + CW / 2)) < CW && Math.abs(p.y - (GY + r * CH + CH / 2)) < CH + R));
    liberi.sort((u, v) => u.d - v.d);
    const scelti = liberi.slice(0, b.T.timbra.quanti + (b.arrabbiato ? 1 : 0));
    if (!scelti.length) return;
    for (const { r, c } of scelti) {
      const n = { c, r, x: MURO + c * CW, y: GY + r * CH, lampo: 0.3, ch: 't', tipo: 'timbrato', colpi: 1 };
      stato.griglia[r][c] = n;
      stato.mattoni.push(n);
      stato.rimasti++;
      coriandoli(n.x + CW / 2, n.y + CH / 2, '#7d5fb0');
    }
    b.salto = 0.35;
    stato.scossa = Math.max(stato.scossa, 0.12);
    suoni.timbra();
  }

  function coriandoli(x, y, colore) {
    for (let k = 0; k < 6; k++) aggiungiParticella({ x, y, vx: casuale(-120, 120), vy: casuale(-180, 0), colore, dim: casuale(3, 5), vita: 0.5, giro: casuale(-8, 8) });
  }

  // urto della ghianda con i boss: la rete la prende, il corpo la fa rimbalzare
  function urtaBoss(p) {
    for (const b of stato.boss) {
      if (b.stato === 'ko') continue;
      if (b.reteSu > 0) {
        const [mx, my] = puntoMano(b);
        if (Math.hypot(p.x - mx, p.y - my) < b.T.rete.raggio + R) {
          p.presa = b;
          p.presaT = b.T.rete.tiene;
          b.reteSu = 0;
          suoni.presa();
          return true;
        }
      }
      const c = corpo(b);
      const qx = clamp(p.x, c.x, c.x + c.w), qy = clamp(p.y, c.y, c.y + c.h);
      let dx = p.x - qx, dy = p.y - qy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= R * R) continue;
      let nx, ny, pen;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        nx = dx / d; ny = dy / d; pen = R - d;
      } else {
        // dentro al corpo (il boss gli è venuto addosso): esce dal lato più vicino
        const l = p.x - c.x, rr = c.x + c.w - p.x, t = p.y - c.y, bb = c.y + c.h - p.y;
        const m = Math.min(l, rr, t, bb);
        nx = m === l ? -1 : m === rr ? 1 : 0;
        ny = m === t ? -1 : m === bb ? 1 : 0;
        pen = m + R;
      }
      const vn = p.vx * nx + p.vy * ny;
      if (vn < 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; }
      p.x += nx * pen;
      p.y += ny * pen;
      raddrizza(p);
      colpisciBoss(b, stato.poteri.fuoco > 0 ? 2 : 1);
      return true;
    }
    return false;
  }

  function ributta(p) {
    const b = p.presa;
    p.presa = null;
    // giù dalla parte lontana dall'asse, più forte del solito
    const lontano = stato.asse.x > W / 2 ? casuale(MURO + 30, W * 0.35) : casuale(W * 0.65, W - MURO - 30);
    const dx = lontano - p.x, dy = PY - p.y;
    const l = Math.hypot(dx, dy);
    p.vx = dx / l; p.vy = dy / l;
    raddrizza(p);
    p.vel = Math.min(cresce(PALLA.max, grado()) * 1.05, p.vel * b.T.rete.lancio);
    b.salto = 0.3;
    suoni.ributta();
  }

  function colpisciBoss(b, danno) {
    if (b.invulnerabile > 0) { suoni.duro(); return; }
    b.vita = Math.max(0, b.vita - danno);
    b.invulnerabile = 0.25;
    b.lampo = 0.25;
    b.trema = 0.35;
    stato.fermo = 0;
    aggiungiPunti(100);
    if (stato.modo === 'gioco') stato.scritte.push({ x: b.x + b.w / 2, y: b.y + 20, testo: '+100', t: 0 });
    suoni.ahi(b.tipo);
    if (!b.arrabbiato && b.vita <= b.max / 2 && b.vita > 0) {
      b.arrabbiato = true;
      mostraMessaggio(b.tipo === 'capo' ? 'Il capo si arrabbia!' : 'L\'agente si arrabbia!', 1.3);
    }
    if (b.vita <= 0) {
      b.stato = 'ko';
      b.reteSu = 0;
      for (const p of stato.palle) if (p.presa === b) ributta(p);
      suoni.bossKo();
      stato.scossa = 0.4;
      aggiungiPunti(2000 * (livello().mondo + 1));
      if (!bossVivi().length) {
        // via anche i mattoncini timbrati e le bollette: il livello è vinto
        stato.bollette = [];
        vinci();
      }
    }
  }

  function aggiornaBollette(dt) {
    const a = stato.asse;
    for (const k of stato.bollette) {
      k.t += dt;
      k.x += (k.vx + Math.sin(k.t * 6) * 40) * dt;
      k.y += k.vy * dt;
      k.rot += dt * 2;
      if (k.x < MURO + 8) { k.x = MURO + 8; k.vx = Math.abs(k.vx); }
      if (k.x > W - MURO - 8) { k.x = W - MURO - 8; k.vx = -Math.abs(k.vx); }
      if (k.y + 9 >= PY && k.y - 9 <= PY + AH && Math.abs(k.x - a.x) <= a.w / 2 + 8) {
        k.via = true;
        a.stordito = BOLLETTE.stordito;
        stato.statistiche.storditi = (stato.statistiche.storditi || 0) + 1;
        stato.eroe.tremaT = BOLLETTE.stordito;
        coriandoli(k.x, PY, '#f7f7f2');
        suoni.stordito();
      } else if (k.y > H + 20) k.via = true;
    }
    stato.bollette = stato.bollette.filter((k) => !k.via);
  }

  // ---------------------------------------------------------------- giocatore simulato
  // Guarda la ghianda che arriverà prima all'asse, prevede dove (con i
  // rimbalzi sui muri ma non sui mattoncini), e ci va con un po' di ritardo,
  // un piccolo errore e una mira che cambia l'angolo del rimbalzo.
  function prevediX(p) {
    const t = (PY - R - p.y) / (p.vy * velocita(p));
    let x = p.x + p.vx * velocita(p) * t;
    const a = MURO + R, b = W - MURO - R, l = b - a;
    x = (x - a) % (2 * l);
    if (x < 0) x += 2 * l;
    return a + (x > l ? 2 * l - x : x);
  }
  // le bollette che arrivano all'asse prima della ghianda: cerca il punto sicuro più vicino
  function schivaBollette(ia, a, tPalla = Infinity) {
    const arrivi = [];
    for (const k of stato.bollette) {
      if (k.y > PY) continue;
      const t = (PY - k.y) / k.vy;
      if (t > 1.5 || t > tPalla - 0.1) continue;
      // dove arriva, coi rimbalzi sui muri
      const a0 = MURO + 8, l = W - 2 * MURO - 16;
      let x = (k.x + k.vx * t - a0) % (2 * l);
      if (x < 0) x += 2 * l;
      arrivi.push(a0 + (x > l ? 2 * l - x : x));
    }
    if (!arrivi.length) return;
    const lim = a.w / 2 + MURO;
    const sicuro = (x) => x >= lim && x <= W - lim && arrivi.every((xk) => Math.abs(xk - x) > a.w / 2 + 22);
    if (sicuro(ia.bersaglio)) return;
    for (let d = 10; d < W; d += 10) {
      for (const x of [ia.bersaglio - d, ia.bersaglio + d]) if (sicuro(x)) { ia.bersaglio = x; return; }
    }
  }

  // dove colpire la ghianda sull'asse perché vada su un mattoncino rompibile
  // (segue un raggio con i rimbalzi sui muri)
  function sceltaMira(xArrivo) {
    const buone = [];
    for (let rel = -0.85; rel <= 0.86; rel += 0.1) {
      const ang = rel * PALLA.angoloMax;
      let x = xArrivo, y = PY - R, vx = Math.sin(ang) * 6, vy = -Math.cos(ang) * 6;
      for (let i = 0; i < 400; i++) {
        x += vx; y += vy;
        if (x < MURO + R) { x = MURO + R; vx = -vx; }
        if (x > W - MURO - R) { x = W - MURO - R; vx = -vx; }
        if (y < MURO + R) { y = MURO + R; vy = -vy; }
        if (vy > 0 && y > PY - 30) break;
        const b = cella(Math.floor((y - GY) / CH), Math.floor((x - MURO) / CW));
        if (b) { if (b.tipo !== 'duro') buone.push(rel); break; }
      }
    }
    return buone.length ? buone[Math.floor(Math.random() * buone.length)] : casuale(-0.8, 0.8);
  }

  function pilotaIA(dt) {
    const a = stato.asse;
    const ia = stato.ia;
    const par = stato.parametriIA || IA;
    if (dt === 0) return;
    for (const p of stato.palle) {
      if (p.attaccata) {
        ia.attesa -= dt;
        if (ia.attesa <= 0) { lancia(p); ia.attesa = par.attesa; }
      }
    }
    ia.timer -= dt;
    if (ia.timer <= 0) {
      ia.timer = par.reazione;
      let scelta = null, tMin = Infinity;
      for (const p of stato.palle) {
        if (p.attaccata || p.vy <= 0) continue;
        const t = (PY - R - p.y) / (p.vy * velocita(p));
        if (t < tMin) { tMin = t; scelta = p; }
      }
      if (scelta) {
        const x = prevediX(scelta);
        if (ia.miraPer === undefined || Math.abs(ia.miraPer - x) > 40) {
          // nuova traiettoria: sceglie dove colpire la ghianda e sbaglia un po' la stima
          ia.mira = Math.random() < par.mira ? sceltaMira(x) : casuale(-0.8, 0.8);
          ia.miraPer = x;
          const difficile = velocita(scelta) / 500 * (0.5 + Math.abs(scelta.vx));
          ia.err = (Math.random() + Math.random() - 1) * par.errore * 1.6 * difficile;
        }
        ia.bersaglio = x - ia.mira * (a.w / 2 + R * 0.7) + ia.err;
        schivaBollette(ia, a, tMin);
      } else {
        ia.miraPer = undefined;
        // nessuna ghianda in arrivo: va verso un potenziamento buono, o segue la ghianda
        const c = stato.capsule.find((k) => POTERE[k.id].buono);
        const brutto = stato.capsule.find((k) => !POTERE[k.id].buono && k.y > PY - 160 && Math.abs(k.x - a.x) < a.w / 2 + 20);
        if (c) ia.bersaglio = c.x;
        else if (brutto) ia.bersaglio = brutto.x < a.x ? brutto.x + a.w / 2 + 30 : brutto.x - a.w / 2 - 30;
        else if (stato.palle[0]) ia.bersaglio = W / 2 + (stato.palle[0].x - W / 2) * 0.6;
        schivaBollette(ia, a);
      }
    }
    const passo = par.vel * dt;
    a.x += clamp(ia.bersaglio - a.x, -passo, passo);
  }

  // ---------------------------------------------------------------- personaggio
  function aggiornaEroe(dt) {
    const e = stato.eroe;
    const a = stato.asse;
    e.x += (a.x - e.x) * Math.min(1, dt * 16);
    const inc = clamp(a.vx / 4000, -0.18, 0.18);
    e.inclina += (inc - e.inclina) * Math.min(1, dt * 10);
    e.schiaccia = Math.max(0, e.schiaccia - dt * 5);
    e.saltoT = Math.max(0, e.saltoT - dt);
    e.tremaT = Math.max(0, e.tremaT - dt);
    if (e.facciaT !== Infinity) e.facciaT = Math.max(0, e.facciaT - dt);
    if (e.caduta > 0) e.caduta = Math.min(1, e.caduta + dt * 1.6);
  }

  // l'espressione di base di Tino: concentrato con l'ultima vita o quando restano pochi mattoncini
  function facciaTino() {
    const e = stato.eroe;
    if (e.facciaT > 0) return e.faccia;
    if (stato.fase === 'finita') return 'ko';
    if (stato.asse.stordito > 0) return 'ferito';
    const quasi = stato.boss.length ? bossVivi().reduce((t, b) => t + b.vita, 0) <= 2 : stato.rimasti <= 3;
    if (stato.fase === 'gioco' && stato.modo === 'gioco' && (stato.vite === 1 || quasi)) return 'arrabbiato';
    return 'normale';
  }

  // ---------------------------------------------------------------- particelle
  function aggiungiParticella(q) {
    if (stato.particelle.length > 400) return;
    stato.particelle.push({ t: 0, rot: 0, giro: 0, g: 900, ...q });
  }
  function aggiornaParticelle(dt) {
    for (const q of stato.particelle) {
      q.t += dt;
      if (q.tipo) continue;
      q.vy += q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.giro * dt;
    }
    stato.particelle = stato.particelle.filter((q) => q.t < q.vita);
    for (const s of stato.scritte) { s.t += dt; s.y -= 40 * dt; }
    stato.scritte = stato.scritte.filter((s) => s.t < 0.8);
  }

  function coloreDi(b) {
    const m = mondo();
    if (b.tipo === 'colore') return b.colore;
    if (b.tipo === 'resistente') return m.resistente;
    if (b.tipo === 'duro') return m.duro;
    if (b.tipo === 'petardo') return '#e8483f';
    if (b.tipo === 'timbrato') return '#f7f3e8';
    return '#f2c14e';
  }

  // ---------------------------------------------------------------- disegno
  function disegna(tempo) {
    ctx.save();
    if (stato.scossa > 0) ctx.translate(casuale(-1, 1) * stato.scossa * 14, casuale(-1, 1) * stato.scossa * 14);
    disegnaFondo();
    disegnaMattoni(tempo);
    disegnaBoss(tempo);
    disegnaBollette();
    disegnaCapsule(tempo);
    disegnaSemi();
    disegnaParticelle(false);
    disegnaEroe(tempo);
    disegnaAsse(tempo);
    disegnaSiepe(tempo);
    for (const p of stato.palle) disegnaPalla(p, tempo);
    disegnaParticelle(true);
    disegnaScritte();
    disegnaPoteri();
    disegnaVitaBoss();
    disegnaMessaggio(tempo);
    ctx.restore();
  }

  function disegnaFondo() {
    const m = mondo();
    const img = fondali[m.fondale];
    if (pronta(img)) {
      // ritaglio verticale al centro del fondale (che è largo 16:9)
      const k = H / img.naturalHeight;
      const sw = W / k;
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, 0, sw, img.naturalHeight, 0, 0, W, H);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#9fd3f0');
      g.addColorStop(1, '#6cbf4a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = m.velo;
    ctx.fillRect(0, 0, W, H);
    // cornice
    const [chiaro, scuro] = m.cornice;
    ctx.fillStyle = scuro;
    ctx.fillRect(0, 0, MURO, H);
    ctx.fillRect(W - MURO, 0, MURO, H);
    ctx.fillRect(0, 0, W, MURO);
    ctx.fillStyle = chiaro;
    ctx.fillRect(3, 3, MURO - 6, H);
    ctx.fillRect(W - MURO + 3, 3, MURO - 6, H);
    ctx.fillRect(3, 3, W - 6, MURO - 6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(3, 3, 2, H);
    ctx.fillRect(W - MURO + 3, 3, 2, H);
    ctx.fillRect(3, 3, W - 6, 2);
    // borchie
    ctx.fillStyle = scuro;
    for (let y = 60; y < H; y += 120) {
      ctx.beginPath(); ctx.arc(MURO / 2, y, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W - MURO / 2, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- mattoncini: ogni aspetto si disegna una volta su una tela a parte
  const sprite = new Map();
  function spriteMattone(b) {
    const m = mondo();
    const chiave = `${livello().mondo}|${b.tipo}|${b.colore || ''}|${b.tipo === 'resistente' ? b.max + '-' + b.colpi : ''}`;
    let s = sprite.get(chiave);
    if (s) return s;
    const k = 3;
    s = document.createElement('canvas');
    s.width = CW * k;
    s.height = CH * k;
    const g = s.getContext('2d');
    g.scale(k, k);
    disegnaMattone(g, b, m);
    sprite.set(chiave, s);
    return s;
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
  function schiarisci(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    if (k > 0) { r += (255 - r) * k; gg += (255 - gg) * k; b += (255 - b) * k; }
    else { r *= 1 + k; gg *= 1 + k; b *= 1 + k; }
    return `rgb(${r | 0}, ${gg | 0}, ${b | 0})`;
  }

  function disegnaMattone(g, b, m) {
    const x = 1, y = 1, w = CW - 2, h = CH - 2;
    const col = b.tipo === 'colore' ? b.colore : b.tipo === 'resistente' ? m.resistente
      : b.tipo === 'duro' ? m.duro : b.tipo === 'petardo' ? '#d93a30' : b.tipo === 'timbrato' ? '#f7f3e8' : '#f2b71e';
    // corpo con bordo scuro e luce in alto
    rettangolo(g, x, y, w, h, 4);
    const grad = g.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, schiarisci(col, 0.28));
    grad.addColorStop(0.5, col);
    grad.addColorStop(1, schiarisci(col, -0.28));
    g.fillStyle = grad;
    g.fill();
    g.lineWidth = 1.2;
    g.strokeStyle = 'rgba(30, 18, 8, 0.55)';
    g.stroke();
    g.fillStyle = 'rgba(255, 255, 255, 0.35)';
    rettangolo(g, x + 3, y + 2, w - 6, 3, 1.5);
    g.fill();

    if (b.tipo === 'colore') {
      decoro(g, m.decoro, col, x, y, w, h);
    } else if (b.tipo === 'resistente') {
      // chiodini agli angoli e crepe man mano che si rompe
      g.fillStyle = 'rgba(255, 240, 210, 0.75)';
      for (const [px, py] of [[5, 5], [w - 3, 5], [5, h - 2], [w - 3, h - 2]]) {
        g.beginPath(); g.arc(px, py, 1.4, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = 'rgba(255, 255, 255, 0.85)';
      g.font = '700 10px Fredoka, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(b.colpi, CW / 2, CH / 2 + 1);
      const rotti = b.max - b.colpi;
      g.strokeStyle = 'rgba(20, 10, 0, 0.7)';
      g.lineWidth = 1;
      if (rotti >= 1) {
        g.beginPath(); g.moveTo(8, 2); g.lineTo(11, 7); g.lineTo(9, 11); g.lineTo(13, 16); g.stroke();
      }
      if (rotti >= 2) {
        g.beginPath(); g.moveTo(28, 2); g.lineTo(25, 8); g.lineTo(29, 12); g.lineTo(26, 16); g.stroke();
      }
    } else if (b.tipo === 'duro') {
      g.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x + 2, y + h - 2); g.lineTo(x + 2, y + 2); g.lineTo(x + w - 2, y + 2); g.stroke();
      g.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      g.beginPath(); g.moveTo(x + w - 2, y + 2); g.lineTo(x + w - 2, y + h - 2); g.lineTo(x + 2, y + h - 2); g.stroke();
      if (m.decoro === 'carta') {
        // cassaforte: manopola e bulloni
        g.fillStyle = '#3a4048';
        g.beginPath(); g.arc(CW / 2, CH / 2, 4, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#c9ced6'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(CW / 2, CH / 2); g.lineTo(CW / 2 + 3, CH / 2 - 2); g.stroke();
      } else {
        g.fillStyle = 'rgba(0, 0, 0, 0.18)';
        for (const [px, py, r] of [[9, 7, 2.5], [22, 11, 3], [29, 6, 1.8], [15, 13, 1.5]]) {
          g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
        }
      }
    } else if (b.tipo === 'petardo') {
      // strisce gialle e miccia
      g.save();
      rettangolo(g, x, y, w, h, 4);
      g.clip();
      g.fillStyle = 'rgba(255, 216, 74, 0.85)';
      for (let i = -2; i < 6; i++) {
        g.beginPath();
        g.moveTo(i * 9, y + h); g.lineTo(i * 9 + 4, y + h); g.lineTo(i * 9 + 12, y); g.lineTo(i * 9 + 8, y);
        g.closePath(); g.fill();
      }
      g.restore();
      g.fillStyle = '#fff8ec';
      g.font = '700 9px Fredoka, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 2.5;
      g.strokeStyle = 'rgba(90, 10, 5, 0.9)';
      g.strokeText('BUM', CW / 2, CH / 2 + 1);
      g.fillText('BUM', CW / 2, CH / 2 + 1);
    } else if (b.tipo === 'timbrato') {
      // bolletta timbrata dagli agenti
      g.strokeStyle = 'rgba(60, 60, 80, 0.35)';
      g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(5, 12); g.lineTo(14, 12); g.moveTo(5, 14.5); g.lineTo(11, 14.5); g.stroke();
      g.save();
      g.translate(CW / 2 + 5, CH / 2);
      g.rotate(-0.12);
      g.strokeStyle = '#7d5fb0';
      g.lineWidth = 1.2;
      rettangolo(g, -11, -5, 22, 10, 2);
      g.stroke();
      g.fillStyle = '#7d5fb0';
      g.font = '700 7.5px Fredoka, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('TARI', 0, 0.5);
      g.restore();
    } else if (b.tipo === 'sorpresa') {
      g.fillStyle = '#fff8ec';
      g.font = '700 13px Fredoka, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 2.5;
      g.strokeStyle = 'rgba(122, 74, 34, 0.9)';
      g.strokeText('?', CW / 2, CH / 2 + 1);
      g.fillText('?', CW / 2, CH / 2 + 1);
    }
  }

  // il disegnino sui mattoncini colorati, diverso per ogni mondo
  function decoro(g, tipo, col, x, y, w, h) {
    if (tipo === 'erba') {
      // fiorellino
      g.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        g.beginPath(); g.arc(10 + Math.cos(a) * 2.6, 10 + Math.sin(a) * 2.6, 1.7, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#f5c518';
      g.beginPath(); g.arc(10, 10, 1.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(40, 90, 20, 0.35)';
      g.fillRect(x + 2, y + h - 3, w - 4, 2);
    } else if (tipo === 'sabbia') {
      g.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (const [px, py] of [[7, 9], [13, 12], [20, 8], [27, 12], [31, 7], [17, 14]]) {
        g.beginPath(); g.arc(px, py, 0.9, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(5, 13); g.quadraticCurveTo(9, 10, 13, 13); g.quadraticCurveTo(17, 16, 21, 13); g.stroke();
    } else if (tipo === 'legno') {
      g.strokeStyle = 'rgba(40, 20, 5, 0.35)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(4, 8); g.quadraticCurveTo(14, 6, 22, 9); g.quadraticCurveTo(28, 11, 33, 8);
      g.moveTo(4, 12); g.quadraticCurveTo(12, 14, 20, 12); g.quadraticCurveTo(27, 10, 33, 13);
      g.stroke();
      g.beginPath(); g.ellipse(25, 10, 2.2, 1.4, 0, 0, Math.PI * 2); g.stroke();
    } else if (tipo === 'carta') {
      // faldone con etichetta
      g.fillStyle = 'rgba(255, 255, 255, 0.75)';
      rettangolo(g, 12, 6, 12, 6, 1.5);
      g.fill();
      g.strokeStyle = 'rgba(60, 60, 80, 0.5)';
      g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(14, 8); g.lineTo(22, 8); g.moveTo(14, 10); g.lineTo(20, 10); g.stroke();
      g.fillStyle = 'rgba(0, 0, 0, 0.15)';
      g.fillRect(x + 2, y + 2, 2, h - 4);
    }
  }

  function disegnaMattoni(tempo) {
    for (const b of stato.mattoni) {
      ctx.drawImage(spriteMattone(b), b.x, b.y, CW, CH);
      if (b.lampo > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${b.lampo / 0.12 * 0.7})`;
        rettangolo(ctx, b.x + 1, b.y + 1, CW - 2, CH - 2, 4);
        ctx.fill();
      }
      if (b.tipo === 'petardo') {
        // scintilla sulla miccia
        const f = 0.6 + 0.4 * Math.sin(tempo * 20 + b.c);
        ctx.fillStyle = `rgba(255, 220, 80, ${f})`;
        ctx.beginPath(); ctx.arc(b.x + CW - 6, b.y + 3, 2 + f, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // ---- potenziamenti
  function disegnaIcona(g, id, x, y, r) {
    g.save();
    g.translate(x, y);
    g.strokeStyle = '#fff';
    g.fillStyle = '#fff';
    g.lineWidth = r * 0.18;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const s = r * 0.55;
    switch (id) {
      case 'lunga':
      case 'corta': {
        const fuori = id === 'lunga';
        g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke();
        for (const d of [-1, 1]) {
          const px = fuori ? d * s : d * s * 0.25, verso = fuori ? -d : d;
          g.beginPath();
          g.moveTo(px + verso * s * 0.5, -s * 0.5); g.lineTo(px, 0); g.lineTo(px + verso * s * 0.5, s * 0.5);
          g.stroke();
        }
        break;
      }
      case 'tre':
        for (const [px, py] of [[-s * 0.6, s * 0.35], [s * 0.6, s * 0.35], [0, -s * 0.5]]) {
          g.beginPath(); g.arc(px, py, s * 0.38, 0, Math.PI * 2); g.fill();
        }
        break;
      case 'miele':
        g.beginPath();
        g.moveTo(0, -s);
        g.bezierCurveTo(s * 0.9, 0, s * 0.8, s, 0, s);
        g.bezierCurveTo(-s * 0.8, s, -s * 0.9, 0, 0, -s);
        g.fill();
        break;
      case 'fuoco':
        g.beginPath();
        g.moveTo(0, -s * 1.1);
        g.bezierCurveTo(s * 0.4, -s * 0.4, s, 0, s * 0.6, s * 0.8);
        g.quadraticCurveTo(0, s * 1.2, -s * 0.6, s * 0.8);
        g.bezierCurveTo(-s, 0, -s * 0.2, -s * 0.2, 0, -s * 1.1);
        g.fill();
        break;
      case 'fionda':
        g.beginPath();
        g.moveTo(0, s); g.lineTo(0, 0); g.lineTo(-s * 0.7, -s); g.moveTo(0, 0); g.lineTo(s * 0.7, -s);
        g.stroke();
        break;
      case 'lumaca':
        g.beginPath();
        g.arc(0, -s * 0.1, s * 0.75, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(0, -s * 0.1, s * 0.32, 0, Math.PI * 1.5);
        g.stroke();
        g.beginPath(); g.moveTo(-s, s * 0.75); g.lineTo(s * 1.1, s * 0.75); g.stroke();
        break;
      case 'siepe':
        for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(i * s * 0.6, s * 0.1, s * 0.45, Math.PI, 0); g.fill(); }
        g.fillRect(-s, s * 0.1, s * 2, s * 0.5);
        break;
      case 'vita':
        g.beginPath();
        g.ellipse(0, s * 0.25, s * 0.6, s * 0.7, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(0, -s * 0.3, s * 0.8, s * 0.42, 0, Math.PI, 0);
        g.fill();
        g.fillRect(-s * 0.08, -s * 1.0, s * 0.16, s * 0.35);
        break;
      case 'vespa':
        g.fillStyle = '#ffd84a';
        g.beginPath(); g.ellipse(0, s * 0.1, s * 0.85, s * 0.55, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2b2b2b';
        g.fillRect(-s * 0.2, -s * 0.5, s * 0.22, s * 1.2);
        g.fillRect(s * 0.3, -s * 0.5, s * 0.2, s * 1.2);
        g.fillStyle = 'rgba(255, 255, 255, 0.85)';
        g.beginPath(); g.ellipse(-s * 0.2, -s * 0.65, s * 0.35, s * 0.22, -0.5, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(s * 0.25, -s * 0.68, s * 0.35, s * 0.22, 0.5, 0, Math.PI * 2); g.fill();
        break;
      default: break;
    }
    g.restore();
  }

  function disegnaCapsula(g, id, x, y, r, oscilla) {
    const p = POTERE[id];
    g.save();
    g.translate(x, y);
    g.rotate(oscilla);
    g.shadowColor = 'rgba(0, 0, 0, 0.35)';
    g.shadowBlur = 5;
    g.shadowOffsetY = 2;
    g.fillStyle = p.colore;
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    g.shadowColor = 'transparent';
    g.lineWidth = 2.2;
    g.strokeStyle = p.buono ? '#fff8ec' : '#ff9a8a';
    g.stroke();
    g.fillStyle = 'rgba(255, 255, 255, 0.25)';
    g.beginPath(); g.ellipse(-r * 0.3, -r * 0.45, r * 0.45, r * 0.25, -0.4, 0, Math.PI * 2); g.fill();
    g.restore();
    disegnaIcona(g, id, x, y, r);
  }

  function disegnaCapsule(tempo) {
    for (const c of stato.capsule) disegnaCapsula(ctx, c.id, c.x, c.y, 13, Math.sin(c.t * 5) * 0.25);
  }

  function disegnaSemi() {
    ctx.fillStyle = '#7a4a22';
    for (const s of stato.semi) {
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 2.6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // icone dei poteri attivi, in alto, con l'anello del tempo che resta
  function disegnaPoteri() {
    let x = MURO + 18;
    const y = MURO + 20;
    const attivi = POTERI.filter((p) => p.durata && stato.poteri[p.id] > 0);
    for (const p of attivi) {
      const f = stato.poteri[p.id] / p.durata;
      disegnaCapsula(ctx, p.id, x, y, 11, 0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 14.5, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
      ctx.stroke();
      x += 34;
    }
    if (stato.siepe) disegnaCapsula(ctx, 'siepe', x, y, 11, 0);
  }

  // ---- personaggio e asse
  function disegnaEroe(tempo) {
    const e = stato.eroe;
    const tino = stato.personaggio === 'tino';
    let img, h;
    if (tino) {
      const f = facciaTino();
      img = immagini[f];
      h = f === 'ko' ? 54 : f === 'normale' ? 94 : 92;
    } else {
      img = immagini.gino;
      h = 80;
    }
    if (!pronta(img)) return;
    const w = h * img.naturalWidth / img.naturalHeight;
    const base = H - 4;
    ctx.save();
    let x = e.x, y = base;
    if (e.tremaT > 0) x += Math.sin(tempo * 70) * 4 * Math.min(1, e.tremaT * 3);
    let salto = 0;
    if (e.festa) salto = Math.abs(Math.sin(tempo * 7)) * 18;
    else if (e.saltoT > 0) salto = Math.sin(e.saltoT / 0.6 * Math.PI) * 14;
    y -= salto;
    ctx.translate(x, y);
    if (!tino && e.caduta > 0) {
      ctx.translate(0, -h / 2);
      ctx.rotate(e.caduta * 1.4);
      ctx.translate(e.caduta * 20, h / 2 * (1 - e.caduta * 0.5));
    }
    ctx.rotate(e.inclina);
    const sq = e.schiaccia * 0.08;
    ctx.scale(1 + sq, 1 - sq);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }

  function disegnaAsse(tempo) {
    if (stato.fase === 'finita') return;
    const a = stato.asse;
    const tino = stato.personaggio === 'tino';
    const sq = a.schiaccia * 3;
    const x = a.x - a.w / 2 - sq, y = PY + sq * 0.5, w = a.w + sq * 2, h = AH - sq;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    if (tino) {
      // asse di legno con le venature e due chiodi
      rettangolo(ctx, x, y, w, h, 5);
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#e3a964');
      g.addColorStop(1, '#a8682e');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#5c3517';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(92, 53, 23, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 5); ctx.quadraticCurveTo(x + w * 0.4, y + 3, x + w * 0.7, y + 6); ctx.lineTo(x + w - 8, y + 5);
      ctx.moveTo(x + 12, y + h - 4); ctx.quadraticCurveTo(x + w * 0.5, y + h - 2, x + w - 14, y + h - 5);
      ctx.stroke();
      ctx.fillStyle = '#6b7178';
      for (const px of [x + 7, x + w - 7]) { ctx.beginPath(); ctx.arc(px, y + h / 2, 1.8, 0, Math.PI * 2); ctx.fill(); }
    } else {
      // foglia di quercia con le nervature
      const cy = y + h / 2;
      ctx.beginPath();
      ctx.moveTo(x, cy);
      const lobi = Math.max(3, Math.round(w / 30));
      for (let i = 0; i < lobi; i++) {
        const x0 = x + w * i / lobi, x1 = x + w * (i + 1) / lobi;
        ctx.quadraticCurveTo((x0 + x1) / 2, y - 5, x1, i === lobi - 1 ? cy : y + 1);
      }
      for (let i = lobi - 1; i >= 0; i--) {
        const x0 = x + w * (i + 1) / lobi, x1 = x + w * i / lobi;
        ctx.quadraticCurveTo((x0 + x1) / 2, y + h + 5, x1, i === 0 ? cy : y + h - 1);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(0, y - 4, 0, y + h + 4);
      g.addColorStop(0, '#9ad35a');
      g.addColorStop(1, '#4f8f2a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#2f5a18';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(230, 255, 200, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 4, cy); ctx.lineTo(x + w - 4, cy);
      for (let i = 1; i < lobi; i++) {
        const px = x + w * i / lobi;
        ctx.moveTo(px - 8, cy); ctx.lineTo(px, y + 3);
        ctx.moveTo(px - 8, cy); ctx.lineTo(px, y + h - 3);
      }
      ctx.stroke();
      // picciolo
      ctx.strokeStyle = '#5c7a2a';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x + w, cy); ctx.quadraticCurveTo(x + w + 7, cy - 2, x + w + 9, cy + 5); ctx.stroke();
    }
    ctx.restore();
    // asse stordita da una bolletta: stelline che girano
    if (a.stordito > 0) {
      ctx.save();
      ctx.fillStyle = '#ffd84a';
      ctx.strokeStyle = 'rgba(90, 60, 0, 0.8)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const ang = tempo * 6 + i * Math.PI * 2 / 3;
        const sx = a.x + Math.cos(ang) * a.w * 0.4, sy = PY - 8 + Math.sin(ang) * 5;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 ? 2.4 : 5.5, aa = k * Math.PI / 5 - Math.PI / 2;
          ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
    // miele colato
    if (stato.poteri.miele > 0) {
      ctx.fillStyle = 'rgba(240, 165, 30, 0.85)';
      rettangolo(ctx, x + 4, y - 2, w - 8, 5, 2.5);
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        const px = x + w * (0.2 + i * 0.2);
        const l = 4 + 3 * Math.sin(tempo * 3 + i * 1.7);
        ctx.beginPath(); ctx.ellipse(px, y + h + l * 0.5, 2.2, l * 0.6 + 2, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    // fionde alle estremità
    if (stato.poteri.fionda > 0) {
      ctx.strokeStyle = '#5c3517';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (const px of [a.x - a.w / 2 + 8, a.x + a.w / 2 - 8]) {
        ctx.beginPath();
        ctx.moveTo(px, PY + 2); ctx.lineTo(px, PY - 6); ctx.lineTo(px - 5, PY - 13);
        ctx.moveTo(px, PY - 6); ctx.lineTo(px + 5, PY - 13);
        ctx.stroke();
      }
    }
    // la ghianda aspetta sull'asse: si ricorda come lanciarla
    if (stato.modo === 'gioco' && stato.fase === 'gioco' && stato.palle.some((p) => p.attaccata && p.auto <= 0)) {
      ctx.save();
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(tempo * 5);
      ctx.font = '600 20px Fredoka, "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff8ec';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 4;
      const t = touch ? 'Tocca per lanciare' : 'Clic o Spazio per lanciare';
      ctx.strokeText(t, W / 2, PY - 70);
      ctx.fillText(t, W / 2, PY - 70);
      ctx.restore();
    }
  }

  function disegnaSiepe(tempo) {
    if (!stato.siepe) return;
    ctx.save();
    ctx.fillStyle = '#3f8a2f';
    for (let x = MURO; x < W - MURO; x += 14) {
      const h = 7 + 2 * Math.sin(x * 0.7 + tempo * 2);
      ctx.beginPath(); ctx.arc(x + 7, Y_SIEPE + 4, h, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = '#2f6b26';
    ctx.fillRect(MURO, Y_SIEPE + 4, W - 2 * MURO, H - Y_SIEPE);
    ctx.fillStyle = '#e8483f';
    for (let x = MURO + 20; x < W - MURO; x += 47) { ctx.beginPath(); ctx.arc(x, Y_SIEPE + 1, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  // ---- boss
  function disegnaBoss(tempo) {
    for (const b of stato.boss) {
      if (!pronta(b.img)) continue;
      ctx.save();
      let x = b.x + b.w / 2, y = b.y + b.h;
      if (b.trema > 0) x += Math.sin(tempo * 70) * 4;
      if (b.stato === 'ko') {
        // cade all'indietro e scivola giù dal campo
        const k = b.caduta;
        ctx.globalAlpha = 1 - Math.max(0, k - 0.7) / 0.3;
        y += k * k * 420;
        ctx.translate(x, y - b.h / 2);
        ctx.rotate(k * 2.2 * (b.dir || 1));
        ctx.translate(0, b.h / 2);
      } else {
        const passo = Math.sin(b.t * (b.arrabbiato ? 13 : 9));
        y -= Math.abs(passo) * 3 + Math.sin(b.salto / 0.3 * Math.PI) * 8 * (b.salto > 0);
        ctx.translate(x, y);
        ctx.rotate(passo * 0.04);
      }
      if (b.lampo > 0 && Math.floor(b.lampo * 30) % 2 === 0) ctx.globalAlpha *= 0.45;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(b.img, -b.w / 2, -b.h, b.w, b.h);
      ctx.restore();
      if (b.stato === 'ko') continue;
      // rete alzata: si illumina ed è pericolosa
      if (b.reteSu > 0) {
        const [mx, my] = puntoMano(b);
        const f = 0.5 + 0.5 * Math.sin(tempo * 18);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 216, 74, ${0.55 + 0.4 * f})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.arc(mx, my, b.T.rete.raggio, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        fumetto(mx + 6, my - b.T.rete.raggio - 6, '!');
      }
      // arrabbiato: sbuffi
      if (b.arrabbiato) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < 2; i++) {
          const t = (tempo * 1.5 + i * 0.5) % 1;
          ctx.globalAlpha = 1 - t;
          ctx.beginPath(); ctx.arc(b.x + b.w * (0.3 + i * 0.3), b.y + 6 - t * 18, 3 + t * 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    // la ghianda presa nella rete
    for (const p of stato.palle) if (p.presa) disegnaGhianda(p.x, p.y, p.rot, R / 13 * 1.15);
  }

  function fumetto(x, y, testo) {
    ctx.save();
    ctx.font = '700 16px Fredoka, "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff8ec';
    ctx.strokeStyle = 'rgba(40, 30, 15, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.fillText(testo, x, y + 1);
    ctx.restore();
  }

  function disegnaBollette() {
    for (const k of stato.bollette) {
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate(Math.sin(k.rot) * 0.5);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#fbfaf5';
      ctx.fillRect(-9, -11, 18, 22);
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#3b3f4a';
      ctx.lineWidth = 1;
      ctx.strokeRect(-9, -11, 18, 22);
      ctx.fillStyle = '#c0392b';
      ctx.font = '700 6.5px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TARI', 0, -4);
      ctx.strokeStyle = 'rgba(60, 60, 80, 0.5)';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) { ctx.moveTo(-6, 1 + i * 3.5); ctx.lineTo(6 - i * 2, 1 + i * 3.5); }
      ctx.stroke();
      ctx.restore();
    }
  }

  // barre della vita dei boss, in alto a destra
  function disegnaVitaBoss() {
    const vivi = stato.boss;
    vivi.forEach((b, i) => {
      const w = 170, h = 14;
      const x = W - MURO - w - 8, y = MURO + 8 + i * 22;
      ctx.save();
      ctx.globalAlpha = b.stato === 'ko' ? 0.4 : 1;
      rettangolo(ctx, x, y, w, h, 7);
      ctx.fillStyle = 'rgba(20, 15, 10, 0.6)';
      ctx.fill();
      const f = b.vita / b.max;
      if (f > 0) {
        rettangolo(ctx, x + 2, y + 2, (w - 4) * f, h - 4, 5);
        ctx.fillStyle = b.arrabbiato ? '#e8483f' : '#f2a31e';
        ctx.fill();
      }
      ctx.font = '600 10px Fredoka, "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff8ec';
      ctx.fillText(b.T.nome, x + w / 2, y + h / 2 + 0.5);
      ctx.restore();
    });
  }

  // ---- ghianda
  function disegnaPalla(p, tempo) {
    if (p.presa) return;
    const fuoco = stato.poteri.fuoco > 0;
    // scia
    for (let i = 0; i < p.scia.length; i++) {
      const s = p.scia[i];
      const k = (i + 1) / (p.scia.length + 1);
      ctx.fillStyle = fuoco ? `rgba(255, 140, 30, ${k * 0.5})` : `rgba(255, 248, 236, ${k * 0.3})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, R * k, 0, Math.PI * 2); ctx.fill();
    }
    if (fuoco) {
      const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, R * 2.6);
      g.addColorStop(0, 'rgba(255, 220, 80, 0.9)');
      g.addColorStop(0.5, 'rgba(255, 110, 20, 0.45)');
      g.addColorStop(1, 'rgba(255, 60, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, R * 2.6, 0, Math.PI * 2); ctx.fill();
    }
    disegnaGhianda(p.x, p.y, p.rot, R / 13 * 1.15);
  }

  function disegnaGhianda(x, y, rot, k) {
    const r = 13 * k;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#c98a3c';
    ctx.beginPath();
    ctx.moveTo(-r * 0.86, -r * 0.15);
    ctx.bezierCurveTo(-r * 0.9, r * 0.7, -r * 0.3, r * 1.1, 0, r * 1.2);
    ctx.bezierCurveTo(r * 0.3, r * 1.1, r * 0.9, r * 0.7, r * 0.86, -r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 32, 12, 0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.38, r * 0.3, r * 0.14, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a4a22';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.2, r, r * 0.62, 0, Math.PI, 0);
    ctx.lineTo(r, -r * 0.1);
    ctx.quadraticCurveTo(0, r * 0.05, -r, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5c3517';
    ctx.fillRect(-r * 0.09, -r * 1.05, r * 0.18, r * 0.3);
    ctx.restore();
  }

  function disegnaParticelle(sopra) {
    for (const q of stato.particelle) {
      const k = 1 - q.t / q.vita;
      if (q.tipo === 'bum') {
        if (!sopra) continue;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.translate(q.x, q.y);
        const s = 1 + (1 - k) * 0.6;
        ctx.scale(s, s);
        ctx.font = '700 22px Fredoka, "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#7a1a10';
        ctx.strokeText('BUM!', 0, 0);
        ctx.fillStyle = '#ffd84a';
        ctx.fillText('BUM!', 0, 0);
        ctx.restore();
        continue;
      }
      if (sopra) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.fillStyle = q.colore;
      ctx.fillRect(-q.dim / 2, -q.dim / 2, q.dim, q.dim * 0.7);
      ctx.restore();
    }
  }

  function disegnaScritte() {
    ctx.save();
    ctx.font = '600 13px Fredoka, "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    for (const s of stato.scritte) {
      ctx.globalAlpha = 1 - s.t / 0.8;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.strokeText(s.testo, s.x, s.y);
      ctx.fillStyle = '#fff8ec';
      ctx.fillText(s.testo, s.x, s.y);
    }
    ctx.restore();
  }

  function disegnaMessaggio() {
    const m = stato.messaggio;
    if (!m || pannelloAperto()) return;
    const t = m.t / m.durata;
    const alfa = t < 0.12 ? t / 0.12 : t > 0.8 ? (1 - t) / 0.2 : 1;
    const k = 1 + 0.15 * Math.max(0, 1 - t * 6);
    ctx.save();
    ctx.globalAlpha = clamp(alfa, 0, 1);
    ctx.translate(W / 2, PY - 196);
    ctx.scale(k, k);
    let dim = 40;
    ctx.font = `700 ${dim}px Fredoka, "Trebuchet MS", sans-serif`;
    while (ctx.measureText(m.testo).width > W - 60 && dim > 20) {
      dim -= 2;
      ctx.font = `700 ${dim}px Fredoka, "Trebuchet MS", sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 9;
    ctx.strokeStyle = 'rgba(40, 30, 15, 0.8)';
    ctx.strokeText(m.testo, 0, 0);
    ctx.fillStyle = '#fff8ec';
    ctx.fillText(m.testo, 0, 0);
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
  const eroeImg = (faccia, classe) => (stato.personaggio === 'gino' ? img('gino', classe) : img(faccia, classe));
  const numero = (n) => n.toLocaleString('it-IT');

  function testoComandi() {
    if (touch) {
      return `<div class="comandi">
        <p>Trascina il dito in qualsiasi punto per muovere l'asse; <b>tocca</b> per lanciare la ghianda.</p>
      </div>`;
    }
    return `<div class="comandi">
      <p>Muovi con il <b>mouse</b> o con <kbd>←</kbd> <kbd>→</kbd> (<kbd>A</kbd> <kbd>D</kbd>).
      <b>Clic</b>, <kbd>Spazio</kbd> o <kbd>↑</kbd> lanciano la ghianda.</p>
      <p><kbd>P</kbd> pausa · <kbd>M</kbd> suoni · <kbd>N</kbd> musica</p>
    </div>`;
  }

  const iconePoteri = {};
  function iconaPotere(id) {
    if (!iconePoteri[id]) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      g.scale(2, 2);
      disegnaCapsula(g, id, 16, 16, 13, 0);
      iconePoteri[id] = c.toDataURL();
    }
    return iconePoteri[id];
  }
  function elencoPoteri() {
    return `<div class="poteri">${POTERI.map((p) => `<span class="${p.buono ? '' : 'malus'}"><img src="${iconaPotere(p.id)}" alt=""><span><b>${p.nome}</b>: ${DESCRIZIONI[p.id]}</span></span>`).join('')}</div>`;
  }

  function pannelloMenu() {
    const scelto = stato.personaggio;
    const scheda = (id, nome, nota) => `<button class="personaggio ${scelto === id ? 'scelto' : ''}" data-azione="personaggio" data-id="${id}" aria-pressed="${scelto === id}">
        ${id === 'gino' ? img('gino') : img('normale')}<b>${nome}</b><small>${nota}</small></button>`;
    let mondi = '';
    MONDI.forEach((m, i) => {
      const bottoni = LIVELLI.map((l, n) => (l.mondo === i
        ? `<button data-azione="livello" data-n="${n}" ${n < sbloccati ? '' : 'disabled'} title="${l.nome}"${l.boss ? ' class="boss"' : ''}>${n + 1}${l.boss ? ' · boss' : ''}</button>` : '')).join('');
      mondi += `<h3>${m.nome}</h3><div class="livelli">${bottoni}</div>`;
    });
    const continua = sbloccati > 1
      ? `<button class="bottone secondario" data-azione="livello" data-n="${sbloccati - 1}">Dal livello ${sbloccati}</button>` : '';
    const rec = record ? `<p class="record">Il tuo record: ${numero(record)} punti</p>` : '';
    return `<div class="riquadro">
      <h1>Ghiande e Mattoncini</h1>
      <p>Fai rimbalzare la ghianda e rompi tutti i mattoncini! Dove la colpisci sull'asse decide dove va.</p>
      <p>Alla fine di ogni mondo ti aspettano gli agenti della Tari, e alla fine di tutto il loro capo: colpiscili con la ghianda e schiva le bollette, che bloccano l'asse.</p>
      <div class="personaggi">${scheda('tino', 'Tino', 'con l\'asse di legno')}${scheda('gino', 'Gino', 'con la foglia di quercia')}</div>
      <div class="scelte">
        <button class="bottone" data-azione="livello" data-n="0" data-primo>Gioca</button>
        ${continua}
      </div>
      ${rec}
      <div class="mondi">${mondi}</div>
      <h3>Cosa cade dai mattoncini</h3>
      ${elencoPoteri()}
      ${testoComandi()}
    </div>`;
  }

  function pannelloPausa() {
    return `<div class="riquadro">
      <div class="ritratti">${eroeImg('normale')}</div>
      <h2>Pausa</h2>
      <p>Livello ${stato.livello + 1} · ${livello().nome}</p>
      <div class="scelte">
        <button class="bottone" data-azione="riprendi" data-primo>Continua</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
      ${testoComandi()}
    </div>`;
  }

  function contoLivello() {
    const c = stato.conto;
    const min = Math.floor(c.tempo / 60), sec = Math.floor(c.tempo % 60);
    return `<table class="conto">
      <tr><td>Punti</td><td>${numero(c.punti)}</td></tr>
      <tr><td>Bonus del livello</td><td>${numero(c.bonusLivello)}</td></tr>
      <tr><td>Bonus del tempo (${min}:${String(sec).padStart(2, '0')})</td><td>${numero(c.bonusTempo)}</td></tr>
      <tr class="totale"><td>Totale</td><td>${numero(stato.punti)}</td></tr>
    </table>`;
  }

  function pannelloLivello() {
    const n = stato.livello;
    const prossimo = LIVELLI[n + 1];
    const cambiaMondo = prossimo.mondo !== livello().mondo;
    const avviso = prossimo.boss
      ? `<p><b>Attenzione:</b> ${prossimo.boss.length > 1 ? 'arrivano due agenti della Tari' : prossimo.boss[0] === 'capo' ? 'arriva l\'ispettore capo in persona' : 'arriva un agente della Tari'}! Colpiscilo con la ghianda e schiva le bollette.</p>`
      : cambiaMondo ? `<p>Si cambia mondo: <b>${MONDI[prossimo.mondo].nome}</b>. La ghianda andrà ancora più veloce!</p>` : '';
    return `<div class="riquadro">
      <div class="ritratti">${eroeImg('normale', 'salta')}</div>
      <h2>Livello ${n + 1} superato!</h2>
      ${contoLivello()}
      ${avviso}
      <div class="scelte">
        <button class="bottone" data-azione="prossimo" data-primo>Livello ${n + 2}</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  function pannelloFinale() {
    return `<div class="riquadro">
      <div class="ritratti">${img('normale', 'salta')}${img('gino', 'salta')}</div>
      <h2>Il capo della Tari è battuto!</h2>
      <p>L'ispettore capo è caduto giù dal muro insieme alle sue bollette. Tino e Gino festeggiano!</p>
      ${contoLivello()}
      <p class="record">Record: ${numero(record)} punti</p>
      <div class="scelte">
        <button class="bottone" data-azione="livello" data-n="0" data-primo>Da capo</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  function pannelloSconfitta(nuovoRecord) {
    const n = stato.livello;
    const ritratto = stato.personaggio === 'gino' ? img('gino', 'caduto') : img('ko');
    const dal1 = n > 0 ? '<button class="bottone secondario" data-azione="livello" data-n="0">Dal livello 1</button>' : '';
    return `<div class="riquadro">
      <div class="ritratti">${ritratto}</div>
      <h2>Ghiande finite!</h2>
      <p>${numero(stato.punti)} punti, al livello ${n + 1} (${livello().nome}).</p>
      ${nuovoRecord ? '<p><b>Nuovo record!</b></p>' : `<p class="record">Record: ${numero(record)} punti</p>`}
      <div class="scelte">
        <button class="bottone" data-azione="livello" data-n="${n}" data-primo>Riprova il livello ${n + 1}</button>
        ${dal1}
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  pannello.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-azione]');
    if (!btn) return;
    switch (btn.dataset.azione) {
      case 'personaggio':
        stato.personaggio = btn.dataset.id;
        scrivi('personaggio', stato.personaggio);
        mostraPannello(pannelloMenu());
        pannello.querySelector(`[data-id="${stato.personaggio}"]`).focus({ preventScroll: true });
        break;
      case 'livello': iniziaPartita(+btn.dataset.n); break;
      case 'prossimo': caricaLivello(stato.livello + 1); nascondiPannello(); break;
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

  // ---------------------------------------------------------------- avvio
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

  // utile per le prove automatiche
  window.ghiandeEMattoncini = {
    stato, iniziaPartita, caricaLivello, aggiorna, azione, lancia, prendi, nuovaCapsula,
    PALLA, ASSE, CADUTA, POTERI, IA, LIVELLI, MONDI,
    costanti: { W, H, MURO, COLONNE, CW, CH, GY, PY, AH, R },
  };
})();
