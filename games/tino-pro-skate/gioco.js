/*
 * Tino Pro Skate
 * Tino corre sullo skate per le strade di Firenze: salta gli ostacoli, fa i
 * trick, scivola su panchine e ringhiere e abbatte gli agenti della Tari
 * saltandoci sopra. La barra della Grinta (3 tacche) si carica con i trick.
 *
 * Coordinate del mondo: x verso destra (px), h verso l'alto (0 = strada).
 * 40 px = 1 metro. Tutta la logica legge `stato`, che contiene solo dati
 * (niente immagini né funzioni): le prove lo copiano e lo rimettono.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------- tabelle
  const PX_M = 40;             // pixel per metro
  const SUOLO = 70;            // pixel di strada visibili sotto h = 0

  const FISICA = {
    gravita: 2300,
    gravitaTenuta: 1350,       // mentre si tiene premuto il salto (salto più alto)
    tenutaMax: 0.28,           // per quanto conta tenere premuto
    salto: 780,                // ollie: ~132 px, tenendo premuto ~200 px
    cadutaMax: 1500,
    schiacciata: 1500,         // ↓ in aria: si scende di colpo
    pestone: 700,              // rimbalzo saltando in testa a un agente
    pestoneTenuto: 860,        // ... tenendo premuto il salto
    rimbalzoSfasciata: 600,    // rimbalzo dopo aver sfondato le cassette dall'alto
    rampa: 1.15,               // la rampa lancia in alto: velocità × pendenza × questo
    rampaMin: 520,
    larg: 36,                  // ingombro di Tino (larghezza, altezza)
    alt: 90,
    gradino: 14,               // quanto sale da solo (rampe)
    margine: 8,                // gli urti perdonano qualche pixel
  };

  // Velocità e distanza tra un pezzo di strada e l'altro: curve [metri, valore],
  // lineari tra un punto e l'altro e ferme dopo l'ultimo.
  const CURVE = {
    velocita: [[0, 340], [400, 395], [1200, 465], [2500, 535], [4000, 585]], // px/s
    pausa: [[0, 1.5], [800, 1.1], [2000, 0.88], [4000, 0.72]],             // secondi di strada libera tra i pezzi
    cadenzaTimbro: [[0, 1.9], [1500, 1.5], [3500, 1.25]],                   // secondi tra le bollette
  };
  function curva(punti, m) {
    if (m <= punti[0][0]) return punti[0][1];
    for (let i = 1; i < punti.length; i++) {
      const [m1, v1] = punti[i];
      if (m <= m1) {
        const [m0, v0] = punti[i - 1];
        return v0 + (v1 - v0) * (m - m0) / (m1 - m0);
      }
    }
    return punti[punti.length - 1][1];
  }

  // Trick e combo. Un trick ancora a metà quando si tocca terra fa cadere.
  const TRICK = {
    giglio: { nome: 'Il Giglio', dur: 0.36, punti: 100, grinta: 16 },       // la tavola gira su sé stessa
    presa: { nome: 'Il Lampredotto', puntiSec: 260, grintaSec: 24 },         // presa della tavola, finché si tiene
    grind: { puntiSec: 200, grintaSec: 32 },                                 // scivolata su panchine e ringhiere
    manual: { nome: 'Manual', nomePunta: 'Manual di punta', puntiSec: 110, grintaSec: 16, max: 3 }, // in equilibrio sulle ruote dietro (o davanti)
    flip: { punti: 250, grinta: 30, doppio: 1.3 },                           // giro intero in aria (frontflip / backflip)
    pestone: { nome: 'Pestone', punti: 150, grinta: 24 },                    // saltando in testa a un agente
    sfasciata: { nome: 'Sfasciata', punti: 120, grinta: 14 },                // cassette e transenne sfondate dall'alto
    pelo: 0.07,                // secondi di trick che si perdonano all'atterraggio
    grazia: 0.14,              // dopo l'atterraggio si può ancora passare al manual senza chiudere la combo
  };

  // Rotazione in aria: → gira in avanti (frontflip), ← all'indietro (backflip).
  // Rilasciando la rotazione si smorza in fretta. Si atterra se la tavola è
  // dritta (rispetto a dove si atterra) entro la tolleranza, altrimenti si cade.
  const GIRO = {
    max: 12,                   // rad/s
    spinta: 60,                // rad/s² tenendo premuto
    smorza: 18,                // per secondo, rilasciando
    tolleranza: 0.62,          // ~35°
  };

  // La half pipe: una conca a U scavata nella strada. Tino ci entra, risale le
  // pareti e vola sopra i bordi; a ogni passaggio perde slancio. Tenendo → mentre
  // risale la parete destra esce e riprende la corsa; quando lo slancio è poco
  // esce da solo.
  const PIPE = {
    raggio: 130,               // le due pareti sono quarti di cerchio (profondità = raggio)
    piano: 200,                // fondo piatto
    lancio: 960,               // velocità verso l'alto al bordo, al primo passaggio (~200 px)
    calo: 0.9,                 // a ogni passaggio
    minimo: 560,               // sotto questa al bordo destro esce da solo
    camera: -112,              // la telecamera scende per far vedere la conca
  };

  // La Grinta: 3 tacche da 100. Una tacca = Sfondamento, tre = Botta di Grinta.
  const GRINTA = {
    tacca: 100,
    tacche: 3,
    sfondamento: 1.0,          // secondi di scatto che sfonda tutto
    velSfondamento: 1.5,
    botta: 2.5,                // secondi di sfondamento dopo la Botta di Grinta
    stordito: 4,               // secondi di stordimento degli agenti
    saltoBotta: 860,
    cadutaBotta: 1700,
    persaCaduta: 20,           // grinta persa cadendo
  };

  const VITA = {
    ruote: 3,                  // si parte con 3 ruote; ogni urto ne toglie una
    invulnerabile: 1.6,
    lentezza: 0.5,             // velocità dopo un urto o una caduta (torna piano a 1)
    ripresa: 0.7,              // per secondo
  };

  const AGENTI = {
    larg: 46,
    alt: 100,
    pestone: 50,               // distanza dal centro entro cui il salto in testa vale
    passo: 55,                 // l'agente col retino cammina verso Tino
    reteDa: 215,               // a questa distanza alza la rete
    rete: [0.2, 0.38],         // tempo per alzarla, tempo in cui prende
    portataRete: 46,
    altRete: 76,               // la rete prende fin qui (sopra si passa)
    bolletta: 270,             // velocità delle bollette (verso Tino)
    bassa: 44, alta: 118,      // altezza delle bollette: da saltare / da non saltare
    lancioDa: [230, 820],      // il timbro lancia quando Tino è a questa distanza
    avviso: 0.35,              // il braccio si alza prima del lancio
  };

  const ASSETS = '../../assets/';
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
  function carica(percorso) {
    const im = new Image();
    im.src = percorso;
    return im;
  }
  const pronta = (im) => im.complete && im.naturalWidth > 0;

  const $ = (s) => document.querySelector(s);
  const palco = $('#palco');
  const canvas = $('#campo');
  const ctx = canvas.getContext('2d');
  const pannello = $('#pannello');
  const elMetri = $('#metri');
  const elPunti = $('#punti');
  const elGhiande = $('#ghiande');

  // ---------------------------------------------------------------- utilità
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;

  // casuale con seme (lo stato del generatore sta in stato.rng, così le prove
  // possono copiare lo stato e ripetere lo stesso futuro)
  function casuale() {
    if (stato.rng === null) return Math.random();
    stato.rng = (stato.rng + 0x6D2B79F5) | 0;
    let t = stato.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const tra = (a, b) => a + casuale() * (b - a);
  // per le decorazioni che si muovono (particelle): non tocca il generatore della strada
  const vis = (a, b) => a + Math.random() * (b - a);
  // casuale fisso per le decorazioni (sempre uguale per lo stesso numero)
  function hash(n) {
    let t = (Math.floor(n) * 374761393 + 668265263) | 0;
    t = Math.imul(t ^ (t >>> 13), 1274126177);
    return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
  }

  function leggi(chiave, predefinito) {
    try {
      const v = localStorage.getItem('tino-pro-skate:' + chiave);
      return v === null ? predefinito : JSON.parse(v);
    } catch (e) {
      return predefinito;
    }
  }
  function scrivi(chiave, valore) {
    try { localStorage.setItem('tino-pro-skate:' + chiave, JSON.stringify(valore)); } catch (e) { /* niente */ }
  }

  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  // ---------------------------------------------------------------- stato
  function nuovoStato() {
    return {
      test: false,             // nelle prove il gioco non avanza da solo, non suona e non apre pannelli
      fase: 'menu',            // menu | corsa | ko | fine | pausa
      prima: 'menu',           // la fase prima della pausa
      rng: null,
      tempo: 0,
      personaggio: 'tino',
      tino: null,
      input: { salto: false, trick: false, giu: false, avanti: false, indietro: false },
      ostacoli: [],
      nemici: [],
      bollette: [],
      ghiande: [],
      gen: null,
      x0: 0,                   // dove è partita la corsa
      metri: 0,
      punti: 0,
      preseGhiande: 0,
      grinta: 0,
      combo: null,
      ultimaCombo: null,       // per il disegno: l'ultima combo chiusa
      particelle: [],
      messaggi: [],
      scossa: 0,
      cam: { x: 0, h: 0 },
      statistiche: { cause: {}, urti: 0, cadute: 0, pestoni: 0, trick: 0, comboMax: 0, sfondamenti: 0, botte: 0 },
      risultato: null,
    };
  }
  let stato = nuovoStato();
  stato.personaggio = leggi('personaggio', 'tino');

  let muto = leggi('muto', false);
  let musicaSpenta = leggi('musica-spenta', false);
  let recordMetri = leggi('record-metri', 0);
  let recordPunti = leggi('record-punti', 0);
  let ghiandeTotali = leggi('ghiande-totali', 0);
  let storiaVista = leggi('storia-vista', false);

  function nuovoTino() {
    return {
      x: 0, h: 0, vy: 0,
      terra: true,             // appoggiato a qualcosa (strada, piano, ringhiera, rampa)
      appoggio: -1,            // indice dell'ostacolo su cui poggia (-1 = strada)
      tenuta: 0,               // da quanto tiene premuto il salto in questo salto
      tenendo: false,
      trick: null,             // { tipo, t, dur }
      prossimo: null,          // trick prenotato
      presa: 0,                // da quanto dura la presa
      manual: 0,               // da quanto dura il manual (0 = non in manual)
      manualFinito: false,     // il manual è durato troppo: si riprende a terra
      grind: 0,                // da quanto scivola
      schiaccia: false,
      sfondamento: 0,
      botta: null,             // null | 'su' | 'giu'
      mod: 1,                  // velocità (1 = piena)
      ruote: VITA.ruote,
      invulnerabile: 0,
      ferito: 0,               // secondi di espressione ferita
      caduta: 0,               // secondi della scivolata dopo una caduta
      grazia: 0,               // dopo l'atterraggio: si può ancora passare al manual
      ang: 0,                  // rotazione decisa dal giocatore in aria (rad, + = in avanti)
      vang: 0,
      bloccaGiro: false,       // ← → tenuti dal manual: non girano finché non si lasciano
      verso: 1,                // 1 guarda a destra, -1 a sinistra (nella half pipe)
      pipe: null,              // { i, s, vs, aria, passaggi }
      manualPunta: false,
      rot: 0,                  // rotazione disegnata
      giro: 0,                 // giro della tavola (giglio)
      schiacciaVis: 0,         // schiacciamento disegnato
      saltello: 0,             // Gino saltella
      v: 0,
    };
  }

  // ---------------------------------------------------------------- audio
  // Tutto sintetizzato con Web Audio, nessun file. Gli effetti e la musica
  // passano da un compressore.
  let audio = null;
  let uscita = null;           // effetti
  let rumoreBuf = null;
  function contesto() {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      const comp = audio.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      comp.connect(audio.destination);
      uscita = audio.createGain();
      uscita.gain.value = 0.9;
      uscita.connect(comp);
      audio.compressore = comp;
      rumoreBuf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const d = rumoreBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  const puoSuonare = () => !muto && !stato.test && !!audio && audio.state === 'running';

  function tono(freq, durata = 0.08, tipo = 'square', volume = 0.06, freqFine = null, ritardo = 0) {
    if (!puoSuonare()) return;
    try {
      const t = audio.currentTime + ritardo;
      const osc = audio.createOscillator();
      const g = audio.createGain();
      osc.type = tipo;
      osc.frequency.setValueAtTime(freq, t);
      if (freqFine) osc.frequency.exponentialRampToValueAtTime(freqFine, t + durata);
      g.gain.setValueAtTime(volume, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
      osc.connect(g).connect(uscita);
      osc.start(t);
      osc.stop(t + durata + 0.02);
    } catch (e) { /* audio non disponibile */ }
  }
  function fruscio(durata, volume, tipoFiltro, freq, ritardo = 0, freqFine = null) {
    if (!puoSuonare()) return;
    try {
      const t = audio.currentTime + ritardo;
      const s = audio.createBufferSource();
      s.buffer = rumoreBuf;
      const f = audio.createBiquadFilter();
      f.type = tipoFiltro;
      f.frequency.setValueAtTime(freq, t);
      if (freqFine) f.frequency.exponentialRampToValueAtTime(freqFine, t + durata);
      const g = audio.createGain();
      g.gain.setValueAtTime(volume, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
      s.connect(f).connect(g).connect(uscita);
      s.start(t, Math.random() * 0.5);
      s.stop(t + durata + 0.02);
    } catch (e) { /* niente */ }
  }
  const suoni = {
    ollie: () => { fruscio(0.05, 0.35, 'highpass', 2500); tono(180, 0.06, 'triangle', 0.08, 90); },
    atterra: (k = 1) => { tono(120, 0.09, 'sine', 0.12 * k, 50); fruscio(0.07, 0.2 * k, 'lowpass', 900); },
    trick: () => fruscio(0.22, 0.12, 'bandpass', 900, 0, 3200),
    trickFatto: (n) => tono(660 + n * 90, 0.09, 'triangle', 0.05, null),
    grindInizio: () => { tono(1800, 0.05, 'square', 0.03, 1200); fruscio(0.06, 0.2, 'highpass', 4000); },
    pestone: () => { tono(320, 0.12, 'square', 0.07, 120); tono(180, 0.2, 'sawtooth', 0.04, 600, 0.05); },
    ahia: (alto) => tono(alto ? 520 : 300, 0.22, 'sawtooth', 0.045, alto ? 260 : 150, 0.04),
    sfascia: () => { fruscio(0.25, 0.4, 'lowpass', 1800, 0, 300); tono(90, 0.15, 'sine', 0.12, 45); },
    ghianda: () => { tono(1050, 0.06, 'triangle', 0.045); tono(1570, 0.09, 'triangle', 0.04, null, 0.045); },
    urto: () => { fruscio(0.3, 0.45, 'lowpass', 1400, 0, 200); tono(140, 0.3, 'sawtooth', 0.06, 50); },
    caduta: () => { fruscio(0.5, 0.25, 'bandpass', 1500, 0, 300); tono(400, 0.3, 'triangle', 0.05, 150); },
    tacca: (n) => [523, 659, 784].slice(0, n).forEach((f, i) => tono(f * 1.5, 0.1, 'square', 0.04, null, i * 0.06)),
    sfondamento: () => { fruscio(0.5, 0.3, 'bandpass', 300, 0, 2400); tono(110, 0.4, 'sawtooth', 0.06, 330); },
    botta: () => { tono(80, 0.7, 'sine', 0.3, 30); fruscio(0.9, 0.5, 'lowpass', 2500, 0, 120); tono(200, 0.5, 'square', 0.05, 60, 0.05); },
    lancio: () => fruscio(0.18, 0.12, 'bandpass', 2000, 0, 800),
    rete: () => fruscio(0.25, 0.12, 'bandpass', 500, 0, 1500),
    combo: (molt) => [784, 988, 1175, 1568].slice(0, clamp(molt - 1, 1, 4)).forEach((f, i) => tono(f, 0.1, 'triangle', 0.05, null, i * 0.07)),
    ruota: () => [523, 784, 1046].forEach((f, i) => tono(f, 0.1, 'triangle', 0.06, null, i * 0.07)),
    record: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tono(f, 0.14, 'square', 0.04, null, i * 0.1)),
    ko: () => [392, 330, 262, 196].forEach((f, i) => tono(f, 0.22, 'square', 0.05, f * 0.9, i * 0.16)),
    via: () => [392, 523].forEach((f, i) => tono(f, 0.1, 'square', 0.05, null, i * 0.09)),
  };

  // Suoni continui: il rotolio delle ruote (cambia con la velocità) e lo
  // stridio del grind. Si aggiornano a ogni fotogramma.
  const continui = { pronti: false };
  function preparaContinui() {
    if (continui.pronti || !audio) return;
    const a = audio;
    const sorgente = (filtro, freq, q) => {
      const s = a.createBufferSource();
      s.buffer = rumoreBuf; s.loop = true;
      const f = a.createBiquadFilter();
      f.type = filtro; f.frequency.value = freq; f.Q.value = q;
      const g = a.createGain(); g.gain.value = 0;
      s.connect(f).connect(g).connect(uscita);
      s.start();
      return { f, g };
    };
    continui.ruote = sorgente('lowpass', 300, 0.7);
    continui.grind = sorgente('bandpass', 3200, 6);
    continui.pronti = true;
  }
  function aggiornaContinui() {
    if (!audio || audio.state !== 'running') return;
    preparaContinui();
    const t = audio.currentTime;
    const on = !muto && !stato.test && stato.fase === 'corsa' && !document.hidden && stato.tino;
    const ti = stato.tino;
    const ruote = on && ti.terra && ti.grind === 0 ? 0.05 + 0.08 * clamp(ti.v / 600, 0, 1) : 0;
    const grind = on && ti.grind > 0 ? 0.09 : 0;
    continui.ruote.g.gain.setTargetAtTime(ruote, t, 0.05);
    continui.ruote.f.frequency.setTargetAtTime(on ? 200 + ti.v * 0.5 : 200, t, 0.1);
    continui.grind.g.gain.setTargetAtTime(grind, t, 0.03);
    continui.grind.f.frequency.setTargetAtTime(2800 + Math.sin(stato.tempo * 30) * 300, t, 0.02);
  }

  // ---------------------------------------------------------------- musica
  // Punk rock sintetizzato: chitarra a power chord (dente di sega distorto),
  // basso a ottavi, batteria serrata. Strofa (Mi, Mi, Do, Re con la chitarra
  // stoppata) e ritornello (La, Do, Sol, Re con gli accordi aperti e la
  // melodia). Nel menu è più calma; in corsa accelera con la velocità.
  // Con la Botta di Grinta c'è uno stacco: tutto si ferma per un battito.
  const MUSICA = {
    bpm: [150, 168, 186],      // menu, corsa lenta, corsa veloce
    volume: 0.32,
    anticipo: 0.2,
  };
  const NOTA = (n) => {
    const m = /^([A-G])(#?)(\d)$/.exec(n);
    return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // 16 battute da 8 ottavi: accordo (fondamentale) e melodia ('-' = pausa)
  const BRANO = [
    ['E2', ''], ['E2', ''], ['C3', ''], ['D3', ''],
    ['E2', ''], ['E2', ''], ['C3', ''], ['D3', 'D4 - E4 - F#4 - A4 -'],
    ['A2', 'A4 A4 C5 B4 A4 - E4 -'], ['C3', 'G4 G4 E5 D5 C5 - G4 -'],
    ['G2', 'B4 B4 D5 C5 B4 A4 G4 -'], ['D3', 'A4 - F#4 A4 D5 - - -'],
    ['A2', 'A4 A4 C5 B4 A4 - E5 -'], ['C3', 'G5 - E5 - C5 - E5 -'],
    ['G2', 'D5 - B4 - G4 - B4 -'], ['D3', 'D5 D5 C#5 C#5 A4 - - -'],
  ].map(([radice, mel]) => ({
    radice: NOTA(radice),
    melodia: mel ? mel.split(' ').map((n) => (n === '-' ? null : NOTA(n))) : null,
  }));
  const musica = { passo: 0, prossimo: 0, suona: false, uscita: null, chitarra: null, stacco: 0 };

  function suonaMusica() {
    return !!audio && audio.state === 'running' && !muto && !musicaSpenta && !stato.test
      && stato.fase !== 'pausa' && !document.hidden;
  }
  function preparaMusica() {
    if (musica.uscita) return;
    const a = audio;
    musica.uscita = a.createGain();
    musica.uscita.gain.value = 0;
    musica.uscita.connect(a.compressore);
    // la chitarra: distorsione, poi un filtro che toglie il ronzio
    const dist = a.createWaveShaper();
    const n = 1024, curva = new Float32Array(n), k = 28;
    for (let i = 0; i < n; i++) {
      const x = i * 2 / n - 1;
      curva[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
    dist.curve = curva;
    const passaBasso = a.createBiquadFilter();
    passaBasso.type = 'lowpass'; passaBasso.frequency.value = 3200;
    const passaAlto = a.createBiquadFilter();
    passaAlto.type = 'highpass'; passaAlto.frequency.value = 110;
    const gChit = a.createGain(); gChit.gain.value = 0.16;
    dist.connect(passaBasso).connect(passaAlto).connect(gChit).connect(musica.uscita);
    musica.chitarra = dist;
    musica.filtroChitarra = passaBasso;
  }
  function notaM(t, tipo, f, vol, dur, verso, fFine = null, tFine = 0.03, attacco = 0.004) {
    const a = audio;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f, t);
    if (fFine) o.frequency.exponentialRampToValueAtTime(fFine, t + tFine);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attacco);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(verso || musica.uscita);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function rumoreM(t, vol, dur, tipoFiltro, freq) {
    const a = audio;
    const s = a.createBufferSource();
    s.buffer = rumoreBuf;
    const f = a.createBiquadFilter();
    f.type = tipoFiltro; f.frequency.value = freq;
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(musica.uscita);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }
  // power chord: fondamentale, quinta e ottava, un po' scordate tra loro
  function accordo(t, radice, dur, vol) {
    for (const [iv, st] of [[0, -6], [7, 5], [12, 0]]) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'sawtooth';
      o.frequency.value = hz(radice + 12 + iv);
      o.detune.value = st;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(musica.chitarra);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
  }
  const cassa = (t, v = 0.7) => notaM(t, 'sine', 160, v, 0.14, null, 42, 0.1);
  const rullante = (t, v = 0.3) => { rumoreM(t, v, 0.13, 'bandpass', 1900); notaM(t, 'triangle', 200, v * 0.5, 0.08); };
  const charleston = (t, v = 0.06) => rumoreM(t, v, 0.035, 'highpass', 8000);
  const piatto = (t, v = 0.18) => rumoreM(t, v, 0.9, 'highpass', 5000);

  // livello: 0 menu, 1 corsa; intenso: grinta piena o combo lunga
  function passoMusica(n, t, liv, durata, intenso) {
    const b = Math.floor(n / 8) % BRANO.length;
    const battuta = BRANO[b];
    const i = n % 8;
    const ritornello = b >= 8;
    const r = battuta.radice;
    if (liv === 0) {
      // menu: chitarra stoppata a quarti, cassa e charleston
      if (i % 2 === 0) accordo(t, r, 0.09, 0.5);
      if (i === 0 || i === 4) cassa(t, 0.5);
      if (i === 2 || i === 6) rullante(t, 0.15);
      charleston(t, 0.04);
      notaM(t, 'sawtooth', hz(r - 12 + 12), 0.08, durata * 0.8);
      return;
    }
    // chitarra
    if (ritornello) accordo(t, r, durata * 0.95, 0.6);
    else accordo(t, r, 0.07, 0.6); // stoppata
    // basso a ottavi
    notaM(t, 'sawtooth', hz(r), 0.13, durata * 0.85);
    notaM(t, 'square', hz(r - 12), 0.07, durata * 0.7);
    // batteria: cassa sull'1 e sul 3 (e sul levare), rullante sul 2 e sul 4
    if (i === 0 || i === 4 || i === 3 || (ritornello && i === 7)) cassa(t);
    if (i === 2 || i === 6) rullante(t);
    if (ritornello && (i === 5) && intenso) rullante(t, 0.18);
    if (i === 0 && (b === 0 || b === 8)) piatto(t);
    else if (ritornello && i % 2 === 0) rumoreM(t, 0.07, 0.25, 'highpass', 6000);
    else charleston(t);
    // melodia
    if (battuta.melodia) {
      const m = battuta.melodia[i];
      if (m !== null) {
        const dopo = battuta.melodia.slice(i + 1).findIndex((x) => x !== null);
        const dur = durata * Math.min(3, dopo < 0 ? 3 : dopo + 1) * 0.92;
        const vol = intenso ? 0.11 : 0.07;
        notaM(t, 'square', hz(m), vol, dur, null, null, 0.03, 0.01);
        notaM(t, 'sawtooth', hz(m) * 1.003, vol * 0.4, dur, null, null, 0.03, 0.01);
      }
    }
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
    const corsa = stato.fase === 'corsa' || stato.fase === 'ko';
    const liv = corsa ? 1 : 0;
    const vel = corsa && stato.tino ? clamp((curva(CURVE.velocita, stato.metri) - 340) / 245, 0, 1) : 0;
    const bpm = corsa ? lerp(MUSICA.bpm[1], MUSICA.bpm[2], vel) : MUSICA.bpm[0];
    const intenso = corsa && (stato.grinta >= GRINTA.tacca * GRINTA.tacche || (stato.combo && stato.combo.azioni.length >= 3));
    if (musica.prossimo < t) musica.prossimo = t + 0.03; // il timer è rimasto indietro
    const durata = 60 / bpm / 2; // ottavi
    while (musica.prossimo < t + MUSICA.anticipo) {
      if (musica.stacco > 0) {
        // lo stacco della Botta di Grinta: un battito di silenzio, poi si riparte dal ritornello col piatto
        musica.stacco--;
        if (musica.stacco === 0) { musica.passo = 8 * 8; }
      } else {
        try { passoMusica(musica.passo, musica.prossimo, liv, durata, intenso); } catch (e) { musica.errore = e; }
        musica.passo = (musica.passo + 1) % (8 * BRANO.length);
      }
      musica.prossimo += durata;
    }
  }
  setInterval(aggiornaMusica, 50);
  document.addEventListener('visibilitychange', aggiornaMusica);
  // l'audio parte solo dopo il primo gesto (clic, tocco o tasto)
  function sbloccaAudio() {
    if (stato.test) return;
    try { contesto(); } catch (e) { return; }
    aggiornaMusica();
  }
  window.addEventListener('pointerdown', sbloccaAudio, true);
  window.addEventListener('keydown', sbloccaAudio, true);

  // ---------------------------------------------------------------- schermo
  let scala = 1;
  let larg = 960;
  const alt = 540; // dimensioni logiche dello schermo (la larghezza segue lo schermo)

  function ridimensiona() {
    const r = palco.getBoundingClientRect();
    const aw = Math.max(100, r.width - 16);
    const ah = Math.max(100, r.height - 16);
    larg = clamp(Math.round(alt * aw / ah), 760, 1300);
    scala = Math.min(aw / larg, ah / alt);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = Math.round(larg * scala) + 'px';
    canvas.style.height = Math.round(alt * scala) + 'px';
    canvas.width = Math.round(larg * scala * dpr);
    canvas.height = Math.round(alt * scala * dpr);
    ctx.setTransform(scala * dpr, 0, 0, scala * dpr, 0, 0);
    // sul telefono in verticale si mette in pausa (compare l'invito a girarlo)
    if (touch && r.height > r.width && stato.fase === 'corsa') pausa();
  }
  new ResizeObserver(ridimensiona).observe(palco);

  const xTino = () => 0.26 * larg; // dove sta Tino sullo schermo
  const sx = (x) => x - stato.cam.x;
  const sy = (h) => alt - SUOLO - h + stato.cam.h;

  // ---------------------------------------------------------------- input
  // Tastiera: Spazio / ↑ / W salto (tenere premuto = più alto); ← → in aria
  // girano (backflip, frontflip), a terra fanno il manual (dietro, di punta);
  // → tenuto sulla parete destra fa uscire dalla half pipe; X / K trick (Giglio;
  // tenendo premuto diventa la presa); ↓ / S schiacciata in aria; E / Maiusc
  // Sfondamento (1 tacca); Q / Invio Botta di Grinta (3 tacche). Mouse: tasto
  // sinistro salto, destro trick. Telefono: metà sinistra salto; metà destra
  // tocco = Giglio, tenendo = presa in aria e manual a terra, trascinando a
  // destra / sinistra si gira, trascinando in giù = schiacciata; pulsanti in
  // alto a destra per la Grinta.
  const TASTI = {
    salto: ['Space', 'ArrowUp', 'KeyW'],
    trick: ['KeyX', 'KeyK'],
    giu: ['ArrowDown', 'KeyS'],
    avanti: ['ArrowRight', 'KeyD'],
    indietro: ['ArrowLeft', 'KeyA'],
    sfondamento: ['KeyE', 'ShiftLeft', 'ShiftRight'],
    botta: ['KeyQ', 'Enter'],
  };
  const azioneDi = (code) => Object.keys(TASTI).find((k) => TASTI[k].includes(code));

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (stato.fase === 'pausa') riprendi();
      else if (inGioco()) pausa();
      return;
    }
    if (e.code === 'KeyM') { cambiaAudio(); return; }
    if (e.code === 'KeyN') { cambiaMusica(); return; }
    const az = azioneDi(e.code);
    if (!az) return;
    if (pannelloAperto()) return; // il bottone del pannello fa da sé
    e.preventDefault();
    if (e.repeat) return;
    premi(az, true);
  });
  window.addEventListener('keyup', (e) => {
    const az = azioneDi(e.code);
    if (az) premi(az, false);
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(stato.input)) stato.input[k] = false;
    if (inGioco()) pausa();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && inGioco()) pausa(); });

  // pulsanti della Grinta disegnati sul campo (per il telefono, ma si possono anche cliccare)
  const PULSANTI = () => [
    { az: 'sfondamento', x: larg - 152, y: 92, r: 34 },
    { az: 'botta', x: larg - 66, y: 92, r: 40 },
  ];
  function puntoLogico(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scala, y: (e.clientY - r.top) / scala };
  }
  const tocchi = new Map(); // pointerId → { ruolo, x0, y0, t0, risolto }
  palco.addEventListener('pointerdown', (e) => {
    if (e.target !== canvas && e.target !== palco) return;
    e.preventDefault();
    if (stato.fase !== 'corsa') return;
    const p = puntoLogico(e);
    for (const b of PULSANTI()) {
      if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 12) { premi(b.az, true); return; }
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
    if (e.pointerType === 'mouse') {
      // mouse: sinistro salto, destro trick
      const ruolo = e.button === 2 ? 'trick' : 'salto';
      tocchi.set(e.pointerId, { ruolo, mouse: true });
      premi(ruolo, true);
      return;
    }
    if (p.x < larg / 2) {
      tocchi.set(e.pointerId, { ruolo: 'salto' });
      premi('salto', true);
    } else {
      // a destra: si decide dal gesto (tocco, trascinata, tenuta)
      const t = { ruolo: 'gesto', x0: p.x, y0: p.y, t0: performance.now(), risolto: null };
      tocchi.set(e.pointerId, t);
      const ti = stato.tino;
      if (ti.terra && !ti.pipe) { t.risolto = 'manual'; premi('indietro', true); } // a terra: tenere = manual
    }
  });
  palco.addEventListener('pointermove', (e) => {
    const t = tocchi.get(e.pointerId);
    if (!t || t.ruolo !== 'gesto') return;
    const p = puntoLogico(e);
    if (t.risolto === 'manual') {
      if (stato.tino.terra && !stato.tino.pipe) return;
      // si è saltato col dito ancora giù: da qui il dito gira
      premi('indietro', false);
      t.risolto = null; t.x0 = p.x; t.y0 = p.y; t.t0 = performance.now();
    }
    const dx = p.x - t.x0, dy = p.y - t.y0;
    if (!t.risolto && dy > 36 && dy > Math.abs(dx) && !stato.tino.terra) {
      t.risolto = 'giu'; premi('giu', true);
      return;
    }
    if (!t.risolto && Math.abs(dx) > 22) t.risolto = 'giro';
    if (t.risolto === 'giro') {
      // trascinando a destra si gira in avanti, a sinistra all'indietro (anche per uscire dalla half pipe)
      premi('avanti', dx > 22);
      premi('indietro', dx < -22);
    }
  });
  function fineTocco(e) {
    const t = tocchi.get(e.pointerId);
    if (!t) return;
    tocchi.delete(e.pointerId);
    if (t.ruolo !== 'gesto') { premi(t.ruolo, false); return; }
    if (t.risolto === 'manual') premi('indietro', false);
    else if (t.risolto === 'giu') premi('giu', false);
    else if (t.risolto === 'giro') { premi('avanti', false); premi('indietro', false); }
    else if (t.risolto === 'giglio') premi('trick', false);
    else if (!t.risolto && !stato.tino.terra) { premi('trick', true); premi('trick', false); }
  }
  palco.addEventListener('pointerup', fineTocco);
  palco.addEventListener('pointercancel', fineTocco);
  palco.addEventListener('contextmenu', (e) => e.preventDefault());
  // un tocco a destra che resta fermo in aria diventa Giglio dopo poco (e poi presa, se si tiene)
  function controllaGesti() {
    const ora = performance.now();
    for (const t of tocchi.values()) {
      if (t.ruolo === 'gesto' && !t.risolto && ora - t.t0 > 110 && !stato.tino.terra) {
        t.risolto = 'giglio';
        premi('trick', true);
      }
    }
  }

  // Tutti i comandi passano da qui (anche quelli delle prove).
  function premi(az, giu) {
    if (stato.fase !== 'corsa') {
      if (giu && az === 'salto' && stato.fase === 'ko') return;
      if (!giu) stato.input[az] = false;
      return;
    }
    const t = stato.tino;
    if (az in stato.input) stato.input[az] = giu;
    if (!giu) {
      if (az === 'salto') t.tenendo = false;
      return;
    }
    if (t.caduta > 0) return;
    switch (az) {
      case 'salto': salta(); break;
      case 'trick': iniziaTrick('giglio'); break;
      case 'giu':
        if (!t.terra && !t.botta) { t.schiaccia = true; t.vy = Math.min(t.vy, -FISICA.schiacciata); t.tenendo = false; }
        break;
      case 'sfondamento': sfondamento(); break;
      case 'botta': bottaDiGrinta(); break;
      default: break;
    }
  }

  // ---------------------------------------------------------------- flusso
  const inGioco = () => stato.fase === 'corsa' || stato.fase === 'ko';

  function nuovaCorsa(seme) {
    const personaggio = stato.personaggio;
    const test = stato.test;
    stato = nuovoStato();
    stato.test = test;
    stato.personaggio = personaggio;
    stato.rng = seme === undefined ? null : seme | 0;
    stato.tino = nuovoTino();
    stato.x0 = 0;
    stato.gen = { x: 1100, n: 0, ultimo: '', ruota: 600 };
    stato.cam.x = stato.tino.x - xTino();
    // all'inizio una fila di ghiande per prendere confidenza
    for (let i = 0; i < 6; i++) stato.ghiande.push({ x: 380 + i * 60, h: 45, tipo: 'ghianda' });
    stato.fase = 'corsa';
    nascondiPannello();
    aggiornaBarra();
    suoni.via();
    messaggio('Vai, Tino!', 1.4, '#ffd23f', true);
  }

  function pausa() {
    if (!inGioco()) return;
    stato.prima = stato.fase;
    stato.fase = 'pausa';
    for (const k of Object.keys(stato.input)) stato.input[k] = false;
    if (stato.tino) stato.tino.tenendo = false;
    tocchi.clear();
    if (!stato.test) mostraPannello(pannelloPausa());
  }
  function riprendi() {
    if (stato.fase !== 'pausa') return;
    stato.fase = stato.prima;
    nascondiPannello();
  }
  function vaiAlMenu() {
    const personaggio = stato.personaggio;
    stato = nuovoStato();
    stato.personaggio = personaggio;
    stato.fase = 'menu';
    stato.tino = nuovoTino();
    stato.cam.x = -xTino();
    aggiornaBarra();
    if (!stato.test) mostraPannello(pannelloMenu());
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

  function fine() {
    const punti = Math.round(stato.punti);
    const metri = Math.floor(stato.metri);
    const nuovoMetri = metri > recordMetri;
    const nuovoPunti = punti > recordPunti;
    if (!stato.test) {
      if (nuovoMetri) { recordMetri = metri; scrivi('record-metri', metri); }
      if (nuovoPunti) { recordPunti = punti; scrivi('record-punti', punti); }
      ghiandeTotali += stato.preseGhiande;
      scrivi('ghiande-totali', ghiandeTotali);
    }
    stato.risultato = { metri, punti, ghiande: stato.preseGhiande, nuovoMetri, nuovoPunti, comboMax: stato.statistiche.comboMax };
    stato.fase = 'fine';
    if (!stato.test) {
      if (nuovoMetri || nuovoPunti) suoni.record();
      mostraPannello(pannelloFine());
    }
  }

  function aggiornaBarra() {
    elMetri.textContent = Math.floor(stato.metri);
    elPunti.textContent = Math.round(stato.punti).toLocaleString('it-IT') + ' punti';
    elGhiande.textContent = stato.preseGhiande;
  }

  function messaggio(testo, durata = 1, colore = '#fff', grande = false) {
    stato.messaggi.push({ testo, t: 0, durata, colore, grande });
    if (stato.messaggi.length > 4) stato.messaggi.shift();
  }
  // scritta che sale da un punto del mondo (trick, punti)
  function scritta(testo, x, h, colore = '#fff') {
    stato.particelle.push({ tipo: 'scritta', testo, x, h, vx: 0, vy: 60, t: 0, dur: 0.9, colore });
  }

  // ---------------------------------------------------------------- azioni
  function salta() {
    const t = stato.tino;
    if (!t.terra || t.botta || t.pipe) return;
    t.bloccaGiro = stato.input.avanti || stato.input.indietro;
    t.vy = FISICA.salto;
    t.terra = false;
    t.appoggio = -1;
    t.tenuta = 0;
    t.tenendo = true;
    t.manual = 0;
    t.manualFinito = false;
    t.grind = 0;
    t.grazia = 0; // la combo resta aperta: si continua in aria
    t.schiacciaVis = -0.6;
    suoni.ollie();
  }

  function iniziaTrick(tipo) {
    const t = stato.tino;
    if (t.terra || t.botta || t.caduta > 0) return;
    if (t.trick) {
      if (t.trick.tipo === 'presa') { chiudiPresa(); } else { t.prossimo = tipo; return; }
    }
    t.trick = { tipo, t: 0, dur: TRICK[tipo].dur };
    suoni.trick();
  }
  function chiudiPresa() {
    const t = stato.tino;
    t.trick = null;
    t.presa = 0;
  }
  // un trick finito in aria: entra nella combo
  function trickFatto(tipo) {
    const t = stato.tino;
    const tr = TRICK[tipo];
    aggiungi(tr.nome, tr.punti);
    caricaGrinta(tr.grinta);
    stato.statistiche.trick++;
    suoni.trickFatto(stato.combo ? stato.combo.azioni.length : 1);
    scritta(tr.nome, t.x, t.h + 120, '#ffe08a');
  }

  // ---------------------------------------------------------------- combo
  function aggiungi(nome, punti) {
    if (!stato.combo) stato.combo = { azioni: [], punti: 0 };
    stato.combo.azioni.push(nome);
    stato.combo.punti += punti;
  }
  function puntiCombo(p) {
    if (stato.combo) stato.combo.punti += p;
  }
  function chiudiCombo() {
    const c = stato.combo;
    if (!c) return;
    stato.combo = null;
    const molt = c.azioni.length;
    const tot = Math.round(c.punti * molt);
    if (tot <= 0) return;
    stato.punti += tot;
    if (molt > 1) caricaGrinta(4 * (molt - 1));
    stato.statistiche.comboMax = Math.max(stato.statistiche.comboMax, molt);
    stato.ultimaCombo = { testo: molt > 1 ? `${Math.round(c.punti)} × ${molt} = ${tot}` : `+${tot}`, t: 0, molt };
    if (molt > 1) suoni.combo(molt);
    if (molt >= 4) messaggio(molt >= 7 ? 'Combo pazzesca!' : 'Bella combo!', 1.1, '#ffd23f');
    stato.tino.saltello = 0.5;
    aggiornaBarra();
  }
  function perdiCombo() {
    if (stato.combo && stato.combo.azioni.length) {
      stato.ultimaCombo = { testo: 'Combo persa', t: 0, molt: 0, persa: true };
    }
    stato.combo = null;
  }

  function caricaGrinta(n) {
    const prima = Math.floor(stato.grinta / GRINTA.tacca);
    stato.grinta = clamp(stato.grinta + n, 0, GRINTA.tacca * GRINTA.tacche);
    const dopo = Math.floor(stato.grinta / GRINTA.tacca);
    if (dopo > prima) {
      suoni.tacca(dopo);
      if (dopo === GRINTA.tacche) messaggio(touch ? 'Grinta piena! Tocca BOTTA' : 'Grinta piena! Q per la Botta', 1.6, '#ff5a3c', true);
    }
  }

  function sfondamento() {
    const t = stato.tino;
    if (stato.grinta < GRINTA.tacca || t.sfondamento > 0 || t.botta) return;
    stato.grinta -= GRINTA.tacca;
    t.sfondamento = GRINTA.sfondamento;
    stato.statistiche.sfondamenti++;
    suoni.sfondamento();
    messaggio('Sfondamento!', 0.9, '#ff9a3c');
  }

  function bottaDiGrinta() {
    const t = stato.tino;
    if (stato.grinta < GRINTA.tacca * GRINTA.tacche || t.botta || t.pipe) return; // nella half pipe la Botta aspetta
    stato.grinta = 0;
    stato.statistiche.botte++;
    t.trick = null; t.prossimo = null; t.presa = 0;
    t.manual = 0; t.grind = 0;
    t.ang = 0; t.vang = 0;
    t.schiaccia = false;
    if (t.terra) {
      t.terra = false; t.appoggio = -1;
      t.vy = GRINTA.saltoBotta;
      t.botta = 'su';
    } else {
      t.botta = 'giu';
      t.vy = -GRINTA.cadutaBotta;
    }
    t.tenendo = false;
    suoni.sfondamento();
  }
  // l'onda d'urto della Botta di Grinta: stordisce tutti gli agenti sullo
  // schermo, sfonda gli ostacoli che si possono rompere, spazza le bollette
  function onda() {
    const t = stato.tino;
    t.botta = null;
    t.sfondamento = GRINTA.botta;
    const da = stato.cam.x - 40, a = stato.cam.x + larg + 160;
    for (const e of stato.nemici) {
      if (e.x > da && e.x < a && e.stato === 'attivo') { e.stato = 'stordito'; e.t = GRINTA.stordito; e.rete = 0; }
    }
    for (const o of stato.ostacoli) {
      if (o.rompibile && !o.rotto && o.x + o.w > da && o.x < a) rompi(o, false);
    }
    for (const b of stato.bollette) {
      if (b.x > da && b.x < a) { b.via = true; coriandoli(b.x, b.h, '#fff', 5); }
    }
    stato.scossa = 0.5;
    stato.particelle.push({ tipo: 'onda', x: t.x, h: t.h, t: 0, dur: 0.6 });
    polvere(t.x, t.h, 18);
    suoni.botta();
    musica.stacco = 2;
    messaggio('BOTTA DI GRINTA!', 1.4, '#ff5a3c', true);
    aggiungi('Botta di Grinta', 300);
  }

  function rompi(o, dallAlto) {
    o.rotto = true;
    for (let i = 0; i < 8; i++) {
      stato.particelle.push({
        tipo: 'pezzo', x: o.x + vis(0, o.w), h: vis(4, o.h), vx: vis(-80, 260), vy: vis(200, 520),
        t: 0, dur: 1.1, colore: o.tipo === 'transenna' ? (i % 2 ? '#e8463a' : '#fff') : (i % 3 ? '#b07a44' : '#f5a623'),
        r: vis(4, 8), rot: vis(0, 6), vr: vis(-12, 12),
      });
    }
    stato.punti += 50;
    suoni.sfascia();
    if (dallAlto) {
      const tr = TRICK.sfasciata;
      aggiungi(tr.nome, tr.punti);
      caricaGrinta(tr.grinta);
      scritta(tr.nome, o.x + o.w / 2, o.h + 80, '#ffb36b');
    }
  }

  // un urto: si perde una ruota (a zero è KO)
  function urto(causa = '?') {
    const t = stato.tino;
    if (t.invulnerabile > 0 || t.sfondamento > 0 || t.botta || stato.fase !== 'corsa') return false;
    t.ruote--;
    stato.statistiche.urti++;
    stato.statistiche.cause[causa] = (stato.statistiche.cause[causa] || 0) + 1;
    t.invulnerabile = VITA.invulnerabile;
    t.mod = VITA.lentezza;
    t.ferito = 0.9;
    t.trick = null; t.prossimo = null; t.presa = 0;
    t.manual = 0;
    perdiCombo();
    stato.scossa = 0.3;
    suoni.urto();
    if (t.terra && t.grind === 0) { t.terra = false; t.appoggio = -1; t.vy = 330; t.tenendo = false; }
    if (t.ruote <= 0) {
      stato.fase = 'ko';
      stato.koT = 0;
      t.vy = 520; t.terra = false; t.appoggio = -1;
      suoni.ko();
    } else {
      messaggio(t.ruote === 1 ? 'Ultima ruota!' : 'Ahia!', 1, '#ff6b5a');
    }
    return true;
  }
  // caduta da un trick non finito: niente ruota persa, ma si perde la combo
  function cadi() {
    const t = stato.tino;
    t.trick = null; t.prossimo = null; t.presa = 0;
    t.ang = 0; t.vang = 0;
    t.caduta = 0.6;
    t.mod = VITA.lentezza;
    t.ferito = 0.9;
    t.invulnerabile = Math.max(t.invulnerabile, 1);
    stato.grinta = Math.max(0, stato.grinta - GRINTA.persaCaduta);
    stato.statistiche.cadute++;
    perdiCombo();
    suoni.caduta();
    polvere(t.x, t.h, 10);
    messaggio('Caduta!', 0.9, '#ff9a7a');
  }

  // ---------------------------------------------------------------- strada
  // Ostacoli: { tipo, x, w, h, solido (blocca di lato), piano (ci si sale sopra),
  // grind (ci si scivola sopra), rampa, rompibile, unaVia (piano da cui si passa
  // sotto) }. h è l'altezza della cima.
  const FORME = {
    cono: { w: 28, h: 34, solido: true },
    buca: { w: 72, h: 0, buca: true },
    panchina: { w: 170, h: 40, grind: true },
    ringhiera: { w: 320, h: 68, grind: true },
    cassonetto: { w: 112, h: 84, solido: true, piano: true },
    cassette: { w: 50, h: 52, solido: true, rompibile: true },
    transenna: { w: 24, h: 64, solido: true, rompibile: true },
    rampa: { w: 132, h: 46, rampa: true },
    banco: { w: 236, h: 128, piano: true, unaVia: true },
    halfpipe: { w: 2 * PIPE.raggio + PIPE.piano, h: 0, halfpipe: true },
  };
  function ostacolo(tipo, x, extra = {}) {
    const o = Object.assign({ tipo, x, rotto: false, colpito: false }, FORME[tipo], extra);
    stato.ostacoli.push(o);
    return o;
  }
  function agente(tipo, x, base = 0) {
    const e = {
      tipo, x, base, stato: 'attivo', t: 0, rete: 0, reteFatta: false,
      prossimo: 0.6, braccio: 0, bassa: casuale() < 0.5, ko: null,
    };
    stato.nemici.push(e);
    return e;
  }
  const ghianda = (x, h) => stato.ghiande.push({ x, h, tipo: 'ghianda' });
  // ghiande lungo il salto (un ollie centrato in xc, partendo da quota h0)
  function arco(xc, v, h0 = 0, n = 5) {
    const T = 2 * FISICA.salto / FISICA.gravita;
    for (let k = 1; k <= n; k++) {
      const s = T * k / (n + 1);
      ghianda(xc + (s - T / 2) * v, h0 + FISICA.salto * s - FISICA.gravita / 2 * s * s + 45);
    }
  }
  function fila(x1, x2, h, passo = 46) {
    for (let x = x1; x <= x2; x += passo) ghianda(x, h + 45);
  }

  // I pezzi di strada: ognuno mette i suoi ostacoli a partire da x e dice
  // quanto è lungo. da: metri da cui compare; peso: quanto spesso. prima:
  // strada libera che serve davanti (gli agenti col timbro lanciano da lontano).
  const PEZZI = [
    { id: 'cono', da: 0, peso: 3, crea: (x, v) => { ostacolo('cono', x); arco(x + 14, v); return 28; } },
    { id: 'panchina', da: 0, peso: 2, crea: (x) => { const o = ostacolo('panchina', x); fila(x + 16, x + o.w - 10, o.h); return o.w; } },
    { id: 'cassette', da: 20, peso: 2, crea: (x, v) => { ostacolo('cassette', x); arco(x + 25, v, 0, 4); return 50; } },
    { id: 'buca', da: 40, peso: 2, crea: (x, v) => { ostacolo('buca', x); arco(x + 36, v); return 72; } },
    { id: 'cassonetto', da: 60, peso: 2, crea: (x) => { const o = ostacolo('cassonetto', x); fila(x + 22, x + o.w - 16, o.h, 40); return o.w; } },
    { id: 'retino', da: 100, peso: 3, prima: 150, crea: (x) => { agente('retino', x + 30); return 60; } },
    { id: 'ringhiera', da: 120, peso: 2, crea: (x) => {
      const w = Math.round(tra(280, 440));
      ostacolo('ringhiera', x, { w });
      ostacolo('cono', x + w * 0.55 - 14);
      fila(x + 20, x + w - 10, 68);
      return w;
    } },
    { id: 'rampa', da: 150, peso: 1.2, crea: (x, v) => {
      const o = ostacolo('rampa', x);
      const vy = lancioRampa(v);
      const T = (vy + Math.sqrt(vy * vy + 2 * FISICA.gravita * o.h)) / FISICA.gravita;
      for (let k = 1; k <= 6; k++) {
        const s = T * k / 7;
        ghianda(x + o.w + s * v, o.h + vy * s - FISICA.gravita / 2 * s * s + 45);
      }
      return o.w + T * v * 0.6;
    } },
    { id: 'coni', da: 200, peso: 2, crea: (x, v) => {
      const d = Math.round(v * 1.1);
      ostacolo('cono', x); ostacolo('cono', x + d);
      arco(x + 14, v, 0, 4); arco(x + d + 14, v, 0, 4);
      return d + 28;
    } },
    { id: 'transenna', da: 250, peso: 1.5, crea: (x, v) => { ostacolo('transenna', x); arco(x + 12, v); return 24; } },
    { id: 'banco', da: 300, peso: 1.2, crea: (x) => {
      const o = ostacolo('banco', x);
      ostacolo('cassette', x + 70);
      fila(x + 20, x + o.w - 16, o.h, 40);
      return o.w;
    } },
    { id: 'timbro', da: 350, peso: 2.5, prima: 860, crea: (x) => { agente('timbro', x + 30); return 60; } },
    { id: 'cassonetti', da: 500, peso: 1.2, crea: (x, v) => {
      const d = Math.round(112 + v * 0.65);
      ostacolo('cassonetto', x); ostacolo('cassonetto', x + d);
      fila(x + 22, x + 96, 84, 40); fila(x + d + 22, x + d + 96, 84, 40);
      return d + 112;
    } },
    { id: 'retini', da: 700, peso: 1.5, prima: 150, crea: (x, v) => {
      // il secondo è dove si ricade dopo il pestone sul primo (a catena)
      const d = Math.round(v * 0.6 - 14);
      agente('retino', x + 30); agente('retino', x + 30 + d).reteFatta = true; // il secondo non alza la rete
      return d + 60;
    } },
    { id: 'conoRetino', da: 900, peso: 1.2, prima: 150, crea: (x, v) => {
      ostacolo('cono', x); arco(x + 14, v, 0, 4);
      const d = Math.round(v * 1.05);
      agente('retino', x + d + 30);
      return d + 60;
    } },
    { id: 'halfpipe', da: 60, peso: 0.9, crea: (x) => {
      const o = ostacolo('halfpipe', x);
      // colonne di ghiande sopra i bordi, da prendere in volo
      for (const xx of [x + 10, x + o.w - 10]) for (let h = 40; h <= 190; h += 50) ghianda(xx, h);
      return o.w;
    } },
    { id: 'timbroCassonetto', da: 1200, peso: 1, prima: 860, crea: (x) => {
      ostacolo('cassonetto', x);
      agente('timbro', x + 56, 84);
      return 112;
    } },
  ];
  const lancioRampa = (v) => 700 + v * 0.4;

  function generaStrada() {
    const g = stato.gen;
    while (g.x < stato.cam.x + larg + 700) {
      const m = (g.x - stato.x0) / PX_M;
      const v = curva(CURVE.velocita, m);
      // una ruota di scorta ogni tanto, se ne manca qualcuna
      if (m > g.ruota && stato.tino.ruote < VITA.ruote) {
        g.ruota = m + 650;
        stato.ghiande.push({ x: g.x + 40, h: 170, tipo: 'ruota' });
        g.x += 200;
        continue;
      }
      const possibili = PEZZI.filter((p) => m >= p.da && p.id !== g.ultimo);
      let tot = 0;
      for (const p of possibili) tot += p.peso;
      let r = casuale() * tot;
      let scelto = possibili[0];
      for (const p of possibili) { r -= p.peso; if (r <= 0) { scelto = p; break; } }
      const x = g.x + (scelto.prima || 0);
      const lung = scelto.crea(x, v, m);
      g.ultimo = scelto.id;
      g.n++;
      g.x = x + lung + v * curva(CURVE.pausa, m) * tra(1, 1.3);
    }
  }

  // la cima più alta sotto Tino che non superi hMax (strada, piani, ringhiere, rampe)
  function supporto(x, hMax) {
    let top = 0, i = -1;
    const os = stato.ostacoli;
    for (const o of os) if (o.halfpipe && x > o.x + 2 && x < o.x + o.w - 2) top = -1e9; // la conca: niente strada
    for (let k = 0; k < os.length; k++) {
      const o = os[k];
      if (o.rotto) continue;
      let h;
      if (o.rampa) {
        if (x < o.x || x > o.x + o.w) continue;
        h = o.h * (x - o.x) / o.w;
      } else if (o.piano || o.grind) {
        if (x < o.x - 6 || x > o.x + o.w + 6) continue;
        h = o.h;
      } else continue;
      if (h <= hMax && h > top) { top = h; i = k; }
    }
    return { top, i };
  }

  // ---------------------------------------------------------------- aggiorna
  function aggiorna(dt) {
    // passi piccoli, così gli urti non si saltano
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < n; i++) passo(dt / n);
  }

  function passo(dt) {
    stato.tempo += dt;
    if (stato.fase === 'corsa' || stato.fase === 'ko') {
      muoviTino(dt);
      if (stato.fase === 'corsa') {
        muoviNemici(dt);
        muoviBollette(dt);
        prendiGhiande();
      }
      aggiornaCamera(dt);
      generaStrada();
      pulisci();
      if (stato.fase === 'ko') {
        stato.koT += dt;
        if (stato.koT > 1.8) fine();
      }
    }
    aggiornaParticelle(dt);
    stato.scossa = Math.max(0, stato.scossa - dt);
    for (const m of stato.messaggi) m.t += dt;
    stato.messaggi = stato.messaggi.filter((m) => m.t < m.durata);
    if (stato.ultimaCombo) {
      stato.ultimaCombo.t += dt;
      if (stato.ultimaCombo.t > 1.6) stato.ultimaCombo = null;
    }
  }

  // la telecamera segue Tino; vicino a una half pipe scende per mostrare la conca
  // e, mentre Tino ci è dentro, la inquadra ferma
  function aggiornaCamera(dt) {
    const t = stato.tino;
    let tx = t.x - xTino(), th = 0;
    for (const o of stato.ostacoli) {
      if (o.halfpipe && t.x > o.x - 320 && t.x < o.x + o.w + 160) th = PIPE.camera;
    }
    if (t.pipe) {
      const o = stato.ostacoli[t.pipe.i];
      tx = o.x + o.w / 2 - larg * 0.42;
    }
    const k = Math.min(1, dt * 5);
    stato.cam.h += (th - stato.cam.h) * k;
    stato.camLibera = Math.max(0, (stato.camLibera || 0) - dt);
    if (t.pipe || stato.camLibera > 0) stato.cam.x += (tx - stato.cam.x) * k;
    else stato.cam.x = tx;
  }

  function muoviTino(dt) {
    const t = stato.tino;
    const ko = stato.fase === 'ko';
    // velocità
    t.mod = Math.min(1, t.mod + VITA.ripresa * dt);
    let v = curva(CURVE.velocita, stato.metri) * t.mod;
    if (t.sfondamento > 0) v *= GRINTA.velSfondamento;
    if (t.caduta > 0) v *= 0.75;
    if (ko) v = Math.max(0, (t.v || 0) - 500 * dt);
    t.v = v;
    if (!t.pipe) t.x += v * dt;
    if (!ko) stato.metri = Math.max(stato.metri, (t.x - stato.x0) / PX_M);

    // timer
    t.invulnerabile = Math.max(0, t.invulnerabile - dt);
    t.ferito = Math.max(0, t.ferito - dt);
    t.caduta = Math.max(0, t.caduta - dt);
    t.sfondamento = Math.max(0, t.sfondamento - dt);
    t.saltello = Math.max(0, t.saltello - dt);
    t.schiacciaVis *= Math.exp(-dt * 10);
    if (t.pipe) { muoviPipe(dt); return; }

    const hPrima = t.h;
    t.hPrima = hPrima;
    // si arriva sul bordo di una half pipe: si entra
    if (t.terra && t.appoggio < 0 && t.h <= 0.5 && !ko) {
      const k = stato.ostacoli.findIndex((o) => o.halfpipe && t.x >= o.x && t.x < o.x + 30);
      if (k >= 0) { entraPipe(k, 1); return; }
    }
    if (t.terra) {
      const s = supporto(t.x, t.h + FISICA.gradino);
      const prima = t.appoggio >= 0 ? stato.ostacoli[t.appoggio] : null;
      if (s.top >= t.h - 0.5 || (s.i === t.appoggio && s.i >= 0)) {
        t.h = s.top;
        if (s.i !== t.appoggio) {
          t.appoggio = s.i;
          if (s.i < 0 || !stato.ostacoli[s.i].grind) t.grind = 0;
        }
      } else {
        // il supporto è finito: si vola (dalla rampa con lo slancio)
        t.terra = false;
        t.appoggio = -1;
        t.vy = prima && prima.rampa ? lancioRampa(v) : 0;
        t.tenuta = FISICA.tenutaMax; // cadendo da un bordo tenere premuto non conta
        if (prima && prima.rampa) { scritta('Rampa!', t.x, t.h + 110, '#9ee7ff'); aggiungi('Rampa', 60); }
        t.grind = 0;
        t.manual = 0;
      }
    }
    if (!t.terra) {
      // in aria
      let g = FISICA.gravita;
      if (t.tenendo && stato.input.salto && t.vy > 0 && t.tenuta < FISICA.tenutaMax && !t.botta) {
        g = FISICA.gravitaTenuta;
        t.tenuta += dt;
      }
      t.vy = Math.max(-(t.botta === 'giu' ? GRINTA.cadutaBotta : t.schiaccia ? FISICA.schiacciata : FISICA.cadutaMax), t.vy - g * dt);
      if (t.botta === 'su' && t.vy <= 0) { t.botta = 'giu'; t.vy = -GRINTA.cadutaBotta; }
      t.h += t.vy * dt;
      aggiornaTrick(dt);
      giraAria(dt);
      if (t.vy <= 0) {
        // dentro la conca di una half pipe si atterra sulla parete
        const k = ko ? -1 : stato.ostacoli.findIndex((o) => o.halfpipe && t.x > o.x + 2 && t.x < o.x + o.w - 2);
        if (k >= 0) {
          const o = stato.ostacoli[k];
          const sp = sDaX(o, t.x);
          if (t.h <= puntoPipe(o, sp).h) atterraPipe(k, sp);
        } else {
          const s = supporto(t.x, hPrima + 0.5);
          if (t.h <= s.top) atterra(s);
        }
      }
    } else {
      aggiornaTerra(dt);
    }
    if (ko) { t.rot += dt * 4; return; }

    // urti con gli ostacoli
    for (const o of stato.ostacoli) {
      if (o.rotto || o.colpito) continue;
      if (Math.abs(t.x - (o.x + o.w / 2)) > FISICA.larg / 2 + o.w / 2 - FISICA.margine / 2) continue;
      if (o.buca) {
        if (t.terra && t.appoggio < 0 && t.h === 0 && Math.abs(t.x - (o.x + o.w / 2)) < o.w / 2 - 12) {
          if (urto(o.tipo)) o.colpito = true;
        }
        continue;
      }
      if (!o.solido) continue;
      if (t.h >= o.h - FISICA.margine) continue; // sopra
      if (o.rompibile && (t.sfondamento > 0 || t.botta)) { rompi(o, false); continue; }
      if (o.rompibile && t.schiaccia && hPrima >= o.h - 34) {
        rompi(o, true);
        t.schiaccia = false;
        t.vy = FISICA.rimbalzoSfasciata;
        t.terra = false; t.appoggio = -1;
        continue;
      }
      if (urto(o.tipo)) o.colpito = true;
    }
  }

  // ---------------------------------------------------------------- rotazione
  function giraAria(dt) {
    const t = stato.tino;
    if (t.botta || t.caduta > 0) { t.vang = 0; return; }
    const av = stato.input.avanti, ind = stato.input.indietro;
    if (t.bloccaGiro && !av && !ind) t.bloccaGiro = false;
    const dir = t.bloccaGiro ? 0 : (av ? 1 : 0) - (ind ? 1 : 0);
    if (dir) t.vang = clamp(t.vang + dir * GIRO.spinta * dt, -GIRO.max, GIRO.max);
    else t.vang *= Math.exp(-GIRO.smorza * dt);
    t.ang += t.vang * dt;
  }
  // quanto manca alla tavola dritta (rispetto a una superficie inclinata di pend)
  function restoGiro(pend = 0) {
    const t = stato.tino;
    const n = Math.round((t.ang - pend) / (Math.PI * 2));
    return { n, resto: t.ang - pend - n * Math.PI * 2 };
  }
  // all'atterraggio: tavola dritta e trick finito, altrimenti si cade. Dà i giri fatti.
  function controllaAtterraggio(pend) {
    const t = stato.tino;
    const { n, resto } = restoGiro(pend);
    let ok = Math.abs(resto) <= GIRO.tolleranza;
    const tr = t.trick;
    if (tr) {
      if (tr.tipo === 'presa' || tr.dur - tr.t > TRICK.pelo) ok = false;
      else if (ok) { trickFatto(tr.tipo); scritta('Al pelo!', t.x, t.h + 150, '#9ee7ff'); }
      t.trick = null;
      t.prossimo = null;
    }
    if (ok && n !== 0) flipFatti(n);
    t.ang = 0;
    t.vang = 0;
    return ok;
  }
  function flipFatti(n) {
    const t = stato.tino;
    const k = Math.abs(n);
    const base = n > 0 ? 'Frontflip' : 'Backflip';
    const nome = k === 1 ? base : (k === 2 ? 'Doppio ' : k === 3 ? 'Triplo ' : k + ' × ') + base;
    const f = TRICK.flip;
    aggiungi(nome, Math.round(f.punti * k * (k > 1 ? f.doppio : 1)));
    caricaGrinta(f.grinta * k);
    stato.statistiche.trick += k;
    stato.statistiche.flip = (stato.statistiche.flip || 0) + k;
    suoni.trickFatto(stato.combo ? stato.combo.azioni.length + 2 : 3);
    scritta(nome + '!', t.x, t.h + 130, '#ffd23f');
  }

  // ---------------------------------------------------------------- half pipe
  // Il percorso della conca: s va da 0 (bordo sinistro) a lunghezzaPipe() (bordo
  // destro): parete sinistra (quarto di cerchio), fondo piatto, parete destra.
  const lunghezzaPipe = () => Math.PI * PIPE.raggio + PIPE.piano;
  function puntoPipe(o, s) {
    const R = PIPE.raggio, q = Math.PI * R / 2, F = PIPE.piano;
    if (s <= q) {
      const f = s / R;
      return { x: o.x + R - R * Math.cos(f), h: -R * Math.sin(f), th: Math.PI / 2 - f, dh: -Math.cos(f) };
    }
    if (s <= q + F) return { x: o.x + R + (s - q), h: -R, th: 0, dh: 0 };
    const f = Math.min(Math.PI / 2, (s - q - F) / R);
    return { x: o.x + R + F + R * Math.sin(f), h: -R * Math.cos(f), th: -f, dh: Math.sin(f) };
  }
  function sDaX(o, x) {
    // x cresce con s: ricerca dicotomica
    let a = 0, b = lunghezzaPipe();
    for (let i = 0; i < 30; i++) {
      const m = (a + b) / 2;
      if (puntoPipe(o, m).x < x) a = m; else b = m;
    }
    return (a + b) / 2;
  }
  function entraPipe(k, verso) {
    const t = stato.tino;
    const o = stato.ostacoli[k];
    t.pipe = { i: k, s: verso > 0 ? 0.5 : lunghezzaPipe() - 0.5, vs: verso * Math.max(t.v, 320), aria: false, passaggi: 0, lato: '' };
    t.verso = verso;
    t.terra = true; t.appoggio = -1;
    t.manual = 0; t.grind = 0; t.grazia = 0;
    stato.bollette = [];
    if (!stato.pipeVista) {
      stato.pipeVista = true;
      messaggio(touch ? 'Half pipe! Per uscire trascina a destra' : 'Half pipe! Tieni → per uscire', 2.2, '#9ee7ff', true);
    }
    aggiornaPipeSuolo(o);
  }
  // atterrando da un salto dentro la conca
  function atterraPipe(k, sp) {
    const t = stato.tino;
    const ok = controllaAtterraggio(0);
    t.vy = 0;
    entraPipe(k, 1);
    t.pipe.s = sp;
    if (!ok) caduto();
    suoni.atterra(0.8);
    aggiornaPipeSuolo(stato.ostacoli[k]);
  }
  function aggiornaPipeSuolo(o) {
    const t = stato.tino, p = t.pipe;
    const pt = puntoPipe(o, p.s);
    t.x = pt.x; t.h = pt.h;
    t.base = t.verso > 0 ? pt.th : -pt.th;
  }
  // caduta dentro la half pipe: niente scivolata, ma si perde la combo e lo slancio
  function caduto() {
    const t = stato.tino;
    t.trick = null; t.prossimo = null; t.presa = 0;
    t.ang = 0; t.vang = 0;
    t.ferito = 0.9;
    t.pipe.passaggi += 2;
    stato.grinta = Math.max(0, stato.grinta - GRINTA.persaCaduta);
    stato.statistiche.cadute++;
    perdiCombo();
    suoni.caduta();
    messaggio('Caduta!', 0.9, '#ff9a7a');
  }
  function muoviPipe(dt) {
    const t = stato.tino, p = t.pipe;
    const o = stato.ostacoli[p.i];
    const L = lunghezzaPipe();
    if (!p.aria) {
      const pt = puntoPipe(o, p.s);
      p.vs -= FISICA.gravita * pt.dh * dt;
      p.s += p.vs * dt;
      const vl = PIPE.lancio * Math.pow(PIPE.calo, p.passaggi);
      if (p.s >= L) {
        if (stato.input.avanti || vl < PIPE.minimo) { esciPipe(); return; }
        lanciaPipe('dx', vl);
      } else if (p.s <= 0) {
        lanciaPipe('sx', vl);
      } else aggiornaPipeSuolo(o);
      return;
    }
    // in aria sopra un bordo: su e giù dritto
    t.hPrima = t.h;
    t.vy -= FISICA.gravita * dt;
    t.h += t.vy * dt;
    aggiornaTrick(dt);
    giraAria(dt);
    if (t.vy < 0 && t.h <= 0) {
      const v = Math.abs(t.vy);
      const ok = controllaAtterraggio(0);
      t.verso = -t.verso;
      p.aria = false;
      t.terra = true;
      t.vy = 0;
      p.s = p.lato === 'dx' ? L - 0.5 : 0.5;
      p.vs = p.lato === 'dx' ? -v : v;
      if (!ok) caduto(); else suoni.atterra(0.6);
      aggiornaPipeSuolo(o);
    }
  }
  function lanciaPipe(lato, vl) {
    const t = stato.tino, p = t.pipe;
    const o = stato.ostacoli[p.i];
    p.aria = true;
    p.lato = lato;
    p.passaggi++;
    t.terra = false;
    t.vy = vl;
    t.h = 0;
    t.x = lato === 'dx' ? o.x + o.w - 10 : o.x + 10;
    t.base = -Math.PI / 2; // tavola dritta in su, come sulla parete
    t.tenendo = false;
    t.tenuta = FISICA.tenutaMax;
    t.bloccaGiro = stato.input.avanti || stato.input.indietro;
    aggiungi('Aria', 50);
    caricaGrinta(6);
    suoni.ollie();
  }
  function esciPipe() {
    const t = stato.tino;
    const o = stato.ostacoli[t.pipe.i];
    t.pipe = null;
    t.x = o.x + o.w + 2;
    t.h = 0;
    t.terra = true; t.appoggio = -1;
    t.verso = 1; t.base = 0;
    t.mod = 1;
    t.grazia = TRICK.grazia;
    t.bloccaGiro = true;
    stato.camLibera = 0.8;
    scritta('Fuori!', t.x, 120, '#9ee7ff');
  }

  function aggiornaTrick(dt) {
    const t = stato.tino;
    const tr = t.trick;
    if (!tr) return;
    if (tr.tipo === 'presa') {
      if (!stato.input.trick) { chiudiPresa(); return; }
      t.presa += dt;
      puntiCombo(TRICK.presa.puntiSec * dt);
      caricaGrinta(TRICK.presa.grintaSec * dt);
      return;
    }
    tr.t += dt;
    if (tr.t >= tr.dur) {
      trickFatto(tr.tipo);
      if (tr.tipo === 'giglio' && stato.input.trick && !t.prossimo) {
        // tenendo premuto il Giglio diventa la presa
        t.trick = { tipo: 'presa', t: 0 };
        t.presa = 0;
        aggiungi(TRICK.presa.nome, 0);
      } else if (t.prossimo) {
        const p = t.prossimo;
        t.prossimo = null;
        t.trick = null;
        iniziaTrick(p);
      } else t.trick = null;
    }
  }

  function atterra(s) {
    const t = stato.tino;
    const o = s.i >= 0 ? stato.ostacoli[s.i] : null;
    t.h = s.top;
    t.terra = true;
    t.appoggio = s.i;
    const forte = Math.min(1, -t.vy / 1400);
    t.vy = 0;
    t.tenendo = false;
    t.schiacciaVis = 0.5 + forte * 0.6;
    if (stato.fase === 'ko') return;
    const pend = o && o.rampa ? -Math.atan2(o.h, o.w) : 0;
    if (!controllaAtterraggio(pend)) { cadi(); t.schiaccia = false; t.grazia = 0; if (t.botta) onda(); return; }
    t.schiaccia = false;
    if (t.botta) { onda(); return; }
    if (t.caduta > 0) { t.grazia = 0; return; }
    if (o && o.grind) {
      t.grind = 0.0001;
      aggiungi(o.tipo === 'panchina' ? 'Panchina' : 'Ringhiera', 40);
      suoni.grindInizio();
      scintille(t.x, t.h, 6);
      return;
    }
    suoni.atterra(0.5 + forte * 0.5);
    if (forte > 0.6) polvere(t.x, t.h, 6);
    t.grazia = TRICK.grazia;
  }

  // a terra: grind, manual e chiusura della combo
  function aggiornaTerra(dt) {
    const t = stato.tino;
    if (stato.fase === 'ko') return;
    const o = t.appoggio >= 0 ? stato.ostacoli[t.appoggio] : null;
    if (o && o.grind && t.caduta <= 0) {
      t.grind += dt;
      puntiCombo(TRICK.grind.puntiSec * dt);
      caricaGrinta(TRICK.grind.grintaSec * dt);
      if (Math.random() < dt * 30) scintille(t.x - 20, t.h, 1);
      return;
    }
    t.grind = 0;
    const tieni = stato.input.indietro || stato.input.avanti;
    if (!tieni) t.manualFinito = false;
    const puoManual = tieni && !t.manualFinito && t.caduta <= 0 && !t.botta;
    if (puoManual) {
      if (t.manual === 0) {
        t.manualPunta = !stato.input.indietro;
        aggiungi(t.manualPunta ? TRICK.manual.nomePunta : TRICK.manual.nome, 30);
        t.manual = 0.0001;
      }
      t.manual += dt;
      t.grazia = 0;
      puntiCombo(TRICK.manual.puntiSec * dt);
      caricaGrinta(TRICK.manual.grintaSec * dt);
      if (t.manual >= TRICK.manual.max) {
        // troppo a lungo: la tavola torna giù e la combo si chiude
        t.manual = 0;
        t.manualFinito = true;
        chiudiCombo();
      }
      return;
    }
    if (t.manual > 0) { t.manual = 0; t.grazia = TRICK.grazia; }
    if (t.grazia > 0) {
      t.grazia -= dt;
      if (t.grazia <= 0) chiudiCombo();
    } else if (stato.combo) chiudiCombo();
  }

  // ---------------------------------------------------------------- agenti
  function muoviNemici(dt) {
    const t = stato.tino;
    if (t.pipe) return; // mentre Tino è nella half pipe gli agenti aspettano
    for (const e of stato.nemici) {
      e.t += dt;
      if (e.stato === 'ko') {
        e.ko.vy -= FISICA.gravita * dt;
        e.ko.h += e.ko.vy * dt;
        e.ko.x += e.ko.vx * dt;
        e.ko.rot += e.ko.vr * dt;
        continue;
      }
      const dist = e.x - t.x;
      if (e.stato === 'stordito') {
        e.t2 = (e.t2 || 0) + dt;
        if (e.t2 >= GRINTA.stordito) { e.stato = 'attivo'; e.t2 = 0; }
      } else if (e.tipo === 'retino') {
        if (dist > 0 && dist < 900) e.x -= AGENTI.passo * dt;
        if (!e.reteFatta && dist > 40 && dist < AGENTI.reteDa) { e.reteFatta = true; e.rete = 0.0001; suoni.rete(); }
        if (e.rete > 0) {
          e.rete += dt;
          if (e.rete > AGENTI.rete[0] + AGENTI.rete[1] + 0.25) e.rete = 0;
        }
      } else if (e.tipo === 'timbro') {
        const lancia = dist > AGENTI.lancioDa[0] && dist < AGENTI.lancioDa[1];
        if (lancia) {
          e.prossimo -= dt;
          if (e.prossimo < AGENTI.avviso) e.braccio = Math.min(1, e.braccio + dt / AGENTI.avviso);
          if (e.prossimo <= 0) {
            e.prossimo = curva(CURVE.cadenzaTimbro, stato.metri);
            stato.bollette.push({ x: e.x - 30, h: e.bassa ? AGENTI.bassa : AGENTI.alta, rot: 0 });
            e.bassa = casuale() < 0.5 ? !e.bassa : e.bassa;
            e.braccio = 0;
            suoni.lancio();
          }
        }
      }
      // contatto con Tino
      const top = e.base + AGENTI.alt;
      const dx = Math.abs(t.x - e.x);
      // il pestone perdona di più dell'urto: basta scendere sulla testa, anche di striscio
      if (t.vy < 0 && t.hPrima >= top - 42 && t.h < top && dx < AGENTI.pestone) pestone(e);
      else if (dx < FISICA.larg / 2 + AGENTI.larg / 2 - 8) {
        if (t.h + FISICA.alt > e.base + 6 && t.h < top) {
          if (e.stato === 'stordito') { /* si passa */ }
          else if (t.sfondamento > 0 || t.botta) koNemico(e, true);
          else urto(e.tipo);
        }
      }
      // la rete: davanti all'agente, all'altezza del corpo
      if (e.stato === 'attivo' && e.rete > AGENTI.rete[0] && e.rete < AGENTI.rete[0] + AGENTI.rete[1]) {
        const x2 = e.x - AGENTI.larg / 2 + 4, x1 = x2 - AGENTI.portataRete;
        if (t.x + FISICA.larg / 2 > x1 && t.x - FISICA.larg / 2 < x2 && t.h < e.base + AGENTI.altRete && t.h + FISICA.alt > e.base) {
          if (t.sfondamento > 0 || t.botta) koNemico(e, true); else urto('rete');
        }
      }
    }
  }
  function pestone(e) {
    const t = stato.tino;
    const doppio = t.schiaccia;
    koNemico(e, false);
    t.vy = stato.input.salto ? FISICA.pestoneTenuto : FISICA.pestone;
    t.terra = false; t.appoggio = -1;
    t.tenuta = FISICA.tenutaMax;
    t.schiaccia = false;
    t.h = Math.max(t.h, e.base + AGENTI.alt - 10);
    const tr = TRICK.pestone;
    aggiungi(doppio ? 'Superpestone' : tr.nome, tr.punti * (doppio ? 2 : 1));
    caricaGrinta(tr.grinta * (doppio ? 1.5 : 1));
    stato.statistiche.pestoni++;
    suoni.pestone();
    scritta(doppio ? 'Superpestone!' : 'Pestone!', e.x, e.base + 150, '#ffb36b');
    stelline(e.x, e.base + AGENTI.alt);
  }
  function koNemico(e, sfondato) {
    if (e.stato === 'ko') return;
    e.stato = 'ko';
    e.ko = { x: 0, h: 0, vx: sfondato ? 380 : 120, vy: sfondato ? 600 : 300, rot: 0, vr: sfondato ? 9 : -5 };
    stato.punti += sfondato ? 100 : 0;
    suoni.ahia(e.tipo === 'retino');
    if (sfondato) { suoni.sfascia(); scritta('Via!', e.x, e.base + 140, '#ffb36b'); }
  }

  function muoviBollette(dt) {
    const t = stato.tino;
    for (const b of stato.bollette) {
      if (b.via) continue;
      b.x -= AGENTI.bolletta * dt;
      b.rot += dt * 7;
      if (Math.abs(b.x - t.x) < FISICA.larg / 2 + 12 && b.h + 10 > t.h && b.h - 10 < t.h + FISICA.alt) {
        b.via = true;
        if (t.sfondamento > 0 || t.botta) { coriandoli(b.x, b.h, '#fff', 6); stato.punti += 30; }
        else if (urto(b.h > 80 ? 'bolletta alta' : 'bolletta bassa')) coriandoli(b.x, b.h, '#fff', 6);
        else b.via = false;
      }
    }
    stato.bollette = stato.bollette.filter((b) => !b.via && b.x > stato.cam.x - 200);
  }

  function prendiGhiande() {
    const t = stato.tino;
    for (const g of stato.ghiande) {
      if (g.preso) continue;
      if (Math.abs(g.x - t.x) < 30 && Math.abs(g.h - (t.h + 45)) < 54) {
        g.preso = true;
        if (g.tipo === 'ruota') {
          t.ruote = Math.min(VITA.ruote, t.ruote + 1);
          suoni.ruota();
          messaggio('Ruota di scorta!', 1.2, '#9ee7ff');
        } else {
          stato.preseGhiande++;
          stato.punti += 10;
          suoni.ghianda();
        }
        stato.particelle.push({ tipo: 'luccichio', x: g.x, h: g.h, t: 0, dur: 0.35 });
        aggiornaBarra();
      }
    }
  }

  function pulisci() {
    const limite = stato.cam.x - 400;
    if (stato.ostacoli.length && stato.ostacoli[0].x + 600 < limite) {
      // gli indici degli appoggi cambiano: si ricalcolano
      const t = stato.tino;
      const app = t.appoggio >= 0 ? stato.ostacoli[t.appoggio] : null;
      const pipeO = t.pipe ? stato.ostacoli[t.pipe.i] : null;
      stato.ostacoli = stato.ostacoli.filter((o) => o.x + o.w > limite);
      t.appoggio = app ? stato.ostacoli.indexOf(app) : -1;
      if (t.pipe) t.pipe.i = stato.ostacoli.indexOf(pipeO);
    }
    stato.nemici = stato.nemici.filter((e) => e.x > limite && !(e.stato === 'ko' && e.ko.h < -600));
    stato.ghiande = stato.ghiande.filter((g) => g.x > limite && !g.preso);
  }

  // ---------------------------------------------------------------- particelle
  function polvere(x, h, n) {
    for (let i = 0; i < n; i++) {
      stato.particelle.push({ tipo: 'polvere', x: x + vis(-20, 20), h: h + 2, vx: vis(-140, 60), vy: vis(20, 110), t: 0, dur: vis(0.35, 0.6), r: vis(4, 9) });
    }
  }
  function scintille(x, h, n) {
    for (let i = 0; i < n; i++) {
      stato.particelle.push({ tipo: 'scintilla', x, h: h + 2, vx: vis(-260, -60), vy: vis(40, 220), t: 0, dur: vis(0.15, 0.35) });
    }
  }
  function stelline(x, h) {
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      stato.particelle.push({ tipo: 'stella', x, h, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160 + 80, t: 0, dur: 0.5 });
    }
  }
  function coriandoli(x, h, colore, n) {
    for (let i = 0; i < n; i++) {
      stato.particelle.push({ tipo: 'pezzo', x, h, vx: vis(-160, 160), vy: vis(80, 300), t: 0, dur: 0.7, colore, r: 4, rot: 0, vr: vis(-10, 10) });
    }
  }
  function aggiornaParticelle(dt) {
    for (const p of stato.particelle) {
      p.t += dt;
      if (p.tipo === 'onda' || p.tipo === 'luccichio') continue;
      if (p.tipo === 'scritta') { p.h += p.vy * dt; continue; }
      p.x += p.vx * dt;
      p.h += p.vy * dt;
      if (p.tipo === 'pezzo' || p.tipo === 'scintilla') p.vy -= 1400 * dt;
      if (p.tipo === 'pezzo') p.rot += p.vr * dt;
      if (p.tipo === 'polvere') { p.vx *= 0.95; p.vy *= 0.95; }
    }
    stato.particelle = stato.particelle.filter((p) => p.t < p.dur);
  }

  // ---------------------------------------------------------------- disegno
  // Le Cascine: colline con i cipressi e il ponte all'Indiano in lontananza,
  // l'Arno, i filari di platani con i lampioni, la siepe con la cancellata e
  // il viale d'asfalto con la pista ciclabile.
  const QUARTIERI = {
    cascine: {
      nome: 'Le Cascine',
      cielo: ['#6fb7ea', '#cfeafc'],
      colline: ['#a8c98c', '#8fb877'],
      cipresso: '#3e6e3f',
      ponte: '#c4cfd9',
      arno: '#7db0bf',
      chioma: ['#4a8a3d', '#5c9d48', '#3f7a35'],
      tronco: ['#9a8f78', '#cfc5a8'],
      siepe: '#3f7d36',
      erba: '#6fae4d',
      asfalto: '#5a5e66',
      cordolo: '#c9c2b2',
    },
  };
  const Q = QUARTIERI.cascine;
  const yStrada = () => sy(0);

  function disegna() {
    ctx.save();
    if (stato.scossa > 0) ctx.translate((Math.random() - 0.5) * 14 * stato.scossa, (Math.random() - 0.5) * 10 * stato.scossa);
    disegnaCielo();
    disegnaColline();
    disegnaArnoPonte();
    disegnaPlatani();
    disegnaSiepe();
    disegnaStrada();
    disegnaOstacoli(false);
    disegnaGhiande();
    disegnaNemici();
    disegnaBollette();
    disegnaRider();
    disegnaParticelle();
    ctx.restore();
    if (stato.fase !== 'menu') disegnaHud();
  }

  function disegnaCielo() {
    const g = ctx.createLinearGradient(0, 0, 0, yStrada());
    g.addColorStop(0, Q.cielo[0]);
    g.addColorStop(1, Q.cielo[1]);
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, larg + 40, alt + 40);
    // nuvolette che scorrono piano
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const p = stato.cam.x * 0.02 + stato.tempo * 6;
    for (let i = -1; i < 6; i++) {
      const k = Math.floor(p / 320) + i;
      const x = k * 320 - p + hash(k * 7) * 140;
      const y = 40 + hash(k * 13) * 90;
      const s = 0.7 + hash(k * 3) * 0.6;
      for (const [dx, dy, rx, ry] of [[0, 0, 46, 16], [26, -10, 28, 16], [-24, -4, 22, 12]]) {
        ctx.beginPath();
        ctx.ellipse(x + dx * s, y + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function disegnaColline() {
    const p = stato.cam.x * 0.05;
    const base = yStrada() - 120;
    for (let strato = 0; strato < 2; strato++) {
      const q = p * (strato ? 1.6 : 1);
      ctx.fillStyle = Q.colline[strato];
      ctx.beginPath();
      ctx.moveTo(-10, base + 40);
      for (let x = -10; x <= larg + 10; x += 12) {
        const w = x + q;
        const h = 40 + Math.sin(w / 170 + strato) * 22 + Math.sin(w / 61 + strato * 2) * 8 + (strato ? -6 : 18);
        ctx.lineTo(x, base - h + strato * 30);
      }
      ctx.lineTo(larg + 10, base + 60);
      ctx.closePath();
      ctx.fill();
      // cipressi
      if (strato === 1) {
        ctx.fillStyle = Q.cipresso;
        for (let k = Math.floor(q / 46) - 1; k < Math.floor((q + larg) / 46) + 1; k++) {
          if (hash(k * 5) > 0.3) continue;
          const x = k * 46 - q + hash(k) * 20;
          const w = x + q;
          const yb = base - (40 + Math.sin(w / 170 + 1) * 22 + Math.sin(w / 61 + 2) * 8 - 6) + 30 + 4;
          const hh = 26 + hash(k * 9) * 18;
          ctx.beginPath();
          ctx.ellipse(x, yb - hh / 2, 5, hh / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function disegnaArnoPonte() {
    const yA = yStrada() - 92;
    // l'Arno
    ctx.fillStyle = Q.arno;
    ctx.fillRect(-10, yA - 10, larg + 20, 26);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    const pr = stato.cam.x * 0.12;
    for (let k = Math.floor(pr / 70); k < Math.floor((pr + larg) / 70) + 1; k++) {
      const x = k * 70 - pr + hash(k * 11) * 30;
      const y = yA - 4 + hash(k * 17) * 14;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18 + hash(k) * 16, y); ctx.stroke();
    }
    // il ponte all'Indiano: due piloni con gli stralli, ogni tanto
    const pp = stato.cam.x * 0.1;
    const passo = 2600;
    for (let k = Math.floor(pp / passo) - 1; k <= Math.floor((pp + larg) / passo) + 1; k++) {
      const x0 = k * passo - pp + 300;
      if (x0 > larg + 400 || x0 < -500) continue;
      ctx.strokeStyle = Q.ponte;
      ctx.fillStyle = Q.ponte;
      ctx.fillRect(x0 - 260, yA - 18, 520, 6); // impalcato
      for (const dx of [-120, 120]) {
        const xp = x0 + dx;
        ctx.fillRect(xp - 4, yA - 88, 8, 76);
        ctx.lineWidth = 1.2;
        for (let i = 1; i <= 5; i++) {
          ctx.beginPath(); ctx.moveTo(xp, yA - 84 + i * 3); ctx.lineTo(xp - i * 24, yA - 16); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(xp, yA - 84 + i * 3); ctx.lineTo(xp + i * 24, yA - 16); ctx.stroke();
        }
      }
    }
  }

  function platano(x, yb, k) {
    const s = 0.85 + hash(k * 3) * 0.35;
    // tronco chiazzato
    ctx.fillStyle = Q.tronco[0];
    ctx.fillRect(x - 7 * s, yb - 120 * s, 14 * s, 120 * s);
    ctx.fillStyle = Q.tronco[1];
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(x + (hash(k * 7 + i) - 0.5) * 8 * s, yb - (20 + i * 26) * s, 4 * s, 7 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // chioma
    const c = Q.chioma;
    const blocchi = [[0, -150, 58], [-40, -128, 40], [42, -126, 42], [-18, -176, 38], [24, -170, 36]];
    blocchi.forEach(([dx, dy, r], i) => {
      ctx.fillStyle = c[(i + k) % 3];
      ctx.beginPath();
      ctx.arc(x + dx * s, yb + dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function lampione(x, yb) {
    ctx.strokeStyle = '#2e3138';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, yb - 110); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, yb - 100); ctx.quadraticCurveTo(x + 14, yb - 112, x + 4, yb - 120); ctx.stroke();
    ctx.fillStyle = '#2e3138';
    ctx.fillRect(x - 9, yb - 132, 18, 4);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.moveTo(x - 7, yb - 128); ctx.lineTo(x + 7, yb - 128); ctx.lineTo(x + 4, yb - 116); ctx.lineTo(x - 4, yb - 116); ctx.fill();
  }
  // la piramide delle Cascine (l'antica ghiacciaia), ogni tanto tra gli alberi
  function piramide(x, yb) {
    ctx.fillStyle = '#c9b48f';
    ctx.beginPath(); ctx.moveTo(x - 46, yb); ctx.lineTo(x, yb - 62); ctx.lineTo(x + 46, yb); ctx.fill();
    ctx.fillStyle = '#b39b74';
    ctx.beginPath(); ctx.moveTo(x, yb - 62); ctx.lineTo(x + 46, yb); ctx.lineTo(x + 10, yb); ctx.fill();
    ctx.fillStyle = '#5b4a36';
    ctx.fillRect(x - 6, yb - 16, 12, 16);
  }
  function disegnaPlatani() {
    const p = stato.cam.x * 0.32;
    const yb = yStrada() - 40;
    const passo = 150;
    for (let k = Math.floor(p / passo) - 2; k <= Math.floor((p + larg) / passo) + 2; k++) {
      const x = k * passo - p;
      if (k % 37 === 5) { piramide(x + 70, yb + 4); continue; }
      if (hash(k * 19) < 0.82) platano(x + hash(k) * 30, yb, k);
      if (k % 2 === 0) lampione(x + 80, yb + 2);
    }
  }
  function disegnaSiepe() {
    const p = stato.cam.x * 0.6;
    const y = yStrada() - 34;
    ctx.fillStyle = Q.siepe;
    ctx.beginPath();
    ctx.moveTo(-10, y + 10);
    for (let x = -10; x <= larg + 20; x += 18) {
      const w = x + p;
      ctx.lineTo(x, y - 14 - Math.sin(w / 23) * 3 - hash(Math.floor(w / 18)) * 4);
    }
    ctx.lineTo(larg + 20, y + 10);
    ctx.fill();
    // cancellata di ferro
    ctx.strokeStyle = '#2b2f36';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, y - 20); ctx.lineTo(larg + 10, y - 20); ctx.stroke();
    for (let k = Math.floor(p / 14); k <= Math.floor((p + larg) / 14) + 1; k++) {
      const x = k * 14 - p;
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y - 26); ctx.stroke();
      ctx.fillStyle = '#2b2f36';
      ctx.beginPath(); ctx.moveTo(x - 3, y - 25); ctx.lineTo(x, y - 31); ctx.lineTo(x + 3, y - 25); ctx.fill();
    }
  }
  function disegnaStrada() {
    const y0 = yStrada();
    const c = stato.cam.x;
    ctx.fillStyle = Q.erba;
    ctx.fillRect(-10, y0 - 34, larg + 20, 16);
    ctx.fillStyle = Q.cordolo;
    ctx.fillRect(-10, y0 - 20, larg + 20, 6);
    ctx.fillStyle = Q.asfalto;
    ctx.fillRect(-10, y0 - 14, larg + 20, 46);
    // granelli dell'asfalto
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let k = Math.floor(c / 23); k <= Math.floor((c + larg) / 23) + 1; k++) {
      ctx.fillRect(k * 23 - c + hash(k) * 20, y0 - 10 + hash(k * 3) * 38, 3, 2);
    }
    // pista ciclabile: riga tratteggiata
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let k = Math.floor(c / 80); k <= Math.floor((c + larg) / 80) + 1; k++) {
      ctx.fillRect(k * 80 - c, y0 + 18, 44, 4);
    }
    ctx.fillStyle = Q.cordolo;
    ctx.fillRect(-10, y0 + 32, larg + 20, 7);
    ctx.fillStyle = Q.erba;
    ctx.fillRect(-10, y0 + 39, larg + 20, alt - y0);
    ctx.fillStyle = '#5c9a40';
    for (let k = Math.floor(c / 31); k <= Math.floor((c + larg) / 31) + 1; k++) {
      const x = k * 31 - c + hash(k * 5) * 20;
      const y = y0 + 48 + hash(k * 7) * 20;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 8); ctx.lineTo(x + 6, y); ctx.fill();
    }
  }

  function arrotondato(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function disegnaOstacoli(davanti) {
    if (davanti) return;
    const y0 = yStrada();
    for (const o of stato.ostacoli) {
      const x = sx(o.x);
      if (x > larg + 50 || x + o.w < -50 || o.rotto) continue;
      const yt = sy(o.h);
      ctx.save();
      switch (o.tipo) {
        case 'cono': {
          if (o.colpito) { ctx.translate(x + 14, y0); ctx.rotate(1.3); ctx.translate(-14, 0); } else ctx.translate(x, y0);
          ctx.fillStyle = '#2b2b2b';
          ctx.fillRect(-3, -5, 34, 5);
          ctx.fillStyle = '#ff7a1a';
          ctx.beginPath(); ctx.moveTo(2, -5); ctx.lineTo(11, -34); ctx.lineTo(17, -34); ctx.lineTo(26, -5); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.moveTo(6.5, -18); ctx.lineTo(8.6, -25); ctx.lineTo(19.4, -25); ctx.lineTo(21.5, -18); ctx.fill();
          break;
        }
        case 'buca': {
          ctx.fillStyle = '#1d1e22';
          ctx.beginPath(); ctx.ellipse(x + o.w / 2, y0 + 6, o.w / 2, 11, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#3a3c42';
          ctx.beginPath(); ctx.ellipse(x + o.w / 2, y0 + 2, o.w / 2 - 6, 5, 0, Math.PI, 0); ctx.fill();
          // il coperchio del tombino appoggiato accanto
          ctx.fillStyle = '#6d6f75';
          ctx.beginPath(); ctx.ellipse(x + o.w + 18, y0 - 6, 8, 20, 0.2, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#4b4d52'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x + o.w + 18, y0 - 6, 5, 14, 0.2, 0, Math.PI * 2); ctx.stroke();
          break;
        }
        case 'panchina': {
          ctx.fillStyle = '#244a2b';
          for (const dx of [14, o.w - 20]) ctx.fillRect(x + dx, yt, 6, y0 - yt);
          ctx.fillStyle = '#2f6b3a';
          for (let i = 0; i < 3; i++) ctx.fillRect(x, yt - 34 + i * 9, o.w, 6); // schienale
          ctx.fillStyle = '#244a2b';
          ctx.fillRect(x + 10, yt - 36, 5, 36); ctx.fillRect(x + o.w - 15, yt - 36, 5, 36);
          ctx.fillStyle = '#3c8048';
          ctx.fillRect(x - 4, yt - 2, o.w + 8, 7); // seduta: qui si scivola
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(x - 4, yt - 2, o.w + 8, 2);
          break;
        }
        case 'ringhiera': {
          ctx.fillStyle = '#3a3e47';
          for (let px = 6; px < o.w; px += 64) ctx.fillRect(x + px - 3, yt, 6, y0 - yt);
          ctx.fillRect(x + o.w - 9, yt, 6, y0 - yt);
          ctx.fillRect(x, yt + 26, o.w, 4);
          ctx.fillStyle = '#9aa3b2';
          arrotondato(x - 3, yt - 3, o.w + 6, 7, 3.5); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fillRect(x, yt - 2, o.w, 2);
          break;
        }
        case 'cassonetto': {
          ctx.fillStyle = '#2f6e45';
          arrotondato(x, yt + 6, o.w, y0 - yt - 12, 6); ctx.fill();
          ctx.fillStyle = '#245a37';
          arrotondato(x - 4, yt - 2, o.w + 8, 12, 4); ctx.fill(); // coperchio
          ctx.fillStyle = '#1b1c20';
          for (const dx of [16, o.w - 16]) { ctx.beginPath(); ctx.arc(x + dx, y0 - 6, 7, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = '#e9f1e6';
          ctx.fillRect(x + 20, yt + 28, o.w - 40, 18);
          ctx.fillStyle = '#2f6e45';
          ctx.font = '700 11px Fredoka, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('RIFIUTI', x + o.w / 2, yt + 41);
          break;
        }
        case 'cassette': {
          for (let i = 0; i < 2; i++) {
            const yy = y0 - 26 * (i + 1);
            ctx.fillStyle = '#c08a52';
            ctx.fillRect(x + i * 3, yy, o.w - i * 6, 24);
            ctx.fillStyle = '#9c6b39';
            ctx.fillRect(x + i * 3, yy + 7, o.w - i * 6, 3);
            ctx.fillRect(x + i * 3, yy + 15, o.w - i * 6, 3);
            ctx.fillStyle = i ? '#f5a623' : '#e8463a';
            for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + 11 + k * 14, yy - 1, 6, 0, Math.PI * 2); ctx.fill(); }
          }
          break;
        }
        case 'transenna': {
          ctx.fillStyle = '#2b2b2b';
          ctx.fillRect(x - 10, y0 - 4, o.w + 20, 4);
          ctx.fillRect(x + 2, yt + 10, 4, y0 - yt - 10); ctx.fillRect(x + o.w - 6, yt + 10, 4, y0 - yt - 10);
          ctx.save();
          ctx.beginPath(); ctx.rect(x - 2, yt, o.w + 4, 30); ctx.clip();
          ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, yt, o.w + 4, 30);
          ctx.fillStyle = '#e8463a';
          for (let k = -2; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x + k * 12, yt + 30); ctx.lineTo(x + k * 12 + 6, yt + 30); ctx.lineTo(x + k * 12 + 26, yt); ctx.lineTo(x + k * 12 + 20, yt); ctx.fill(); }
          ctx.restore();
          break;
        }
        case 'rampa': {
          ctx.fillStyle = '#b5824e';
          ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + o.w, yt); ctx.lineTo(x + o.w, y0); ctx.fill();
          ctx.strokeStyle = '#8b5f33'; ctx.lineWidth = 2;
          for (let k = 1; k < 5; k++) { const xx = x + o.w * k / 5; ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y0 - (y0 - yt) * k / 5); ctx.stroke(); }
          ctx.strokeStyle = '#e0b07a'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + o.w, yt); ctx.stroke();
          break;
        }
        case 'halfpipe': disegnaPipe(o, x); break;
        case 'banco': {
          // il banco del mercato del martedì: tavolo con la merce e tendone a righe
          ctx.fillStyle = '#6b4a2e';
          ctx.fillRect(x + 8, sy(50), o.w - 16, 8);
          ctx.fillRect(x + 14, sy(50), 5, 50); ctx.fillRect(x + o.w - 19, sy(50), 5, 50);
          const merce = ['#e8463a', '#f5a623', '#7cc04a', '#8e5bd1', '#f2d23a'];
          for (let k = 0; k < 9; k++) {
            ctx.fillStyle = merce[k % 5];
            ctx.beginPath(); ctx.arc(x + 22 + k * 23, sy(56), 7, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#5a5a5a';
          ctx.fillRect(x + 2, yt, 5, y0 - yt); ctx.fillRect(x + o.w - 7, yt, 5, y0 - yt);
          for (let k = 0; k < o.w / 24; k++) {
            ctx.fillStyle = k % 2 ? '#fff' : '#d8342c';
            ctx.fillRect(x + k * 24, yt - 4, Math.min(24, o.w - k * 24), 14);
            ctx.beginPath(); ctx.arc(x + k * 24 + 12, yt + 10, 12, 0, Math.PI); ctx.fill();
          }
          break;
        }
        default: break;
      }
      ctx.restore();
    }
  }

  // la half pipe vista di lato: muro di fondo coi graffiti, il cemento sotto la
  // curva, i tubi di metallo sui bordi
  function disegnaPipe(o, x) {
    const R = PIPE.raggio;
    const x1 = x + o.w;
    const yTop = sy(0) - 14;
    const yFondo = sy(-R - 34);
    ctx.fillStyle = '#6d737c';
    ctx.fillRect(x, yTop, o.w, alt + 40 - yTop);
    // graffiti sul muro di fondo
    ctx.save();
    ctx.beginPath(); ctx.rect(x, yTop, o.w, sy(-R) - yTop); ctx.clip();
    const tag = [['TINO', '#e8463a'], ['PUNK', '#ffd23f'], ['SK8', '#4ec2e8']];
    tag.forEach(([t, c], i) => {
      ctx.save();
      ctx.translate(x + o.w * (0.24 + i * 0.27), sy(-R * 0.45) + (i % 2) * 18);
      ctx.rotate(-0.12 + i * 0.1);
      ctx.font = '700 30px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 6; ctx.strokeStyle = '#2b2f36'; ctx.strokeText(t, 0, 0);
      ctx.fillStyle = c; ctx.fillText(t, 0, 0);
      ctx.restore();
    });
    ctx.restore();
    // il cemento: tutto quello che sta sotto la curva
    ctx.fillStyle = '#b8bdc4';
    ctx.beginPath();
    ctx.moveTo(x - 2, yTop);
    const L = lunghezzaPipe();
    for (let k = 0; k <= 60; k++) {
      const pt = puntoPipe(o, L * k / 60);
      ctx.lineTo(sx(pt.x), sy(pt.h));
    }
    ctx.lineTo(x1 + 2, yTop);
    ctx.lineTo(x1 + 2, yFondo);
    ctx.lineTo(x - 2, yFondo);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#dde1e6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 0; k <= 60; k++) {
      const pt = puntoPipe(o, L * k / 60);
      if (k) ctx.lineTo(sx(pt.x), sy(pt.h)); else ctx.moveTo(sx(pt.x), sy(pt.h));
    }
    ctx.stroke();
    // giunti del cemento
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 2;
    for (let k = 1; k < 6; k++) { const xx = x + o.w * k / 6; ctx.beginPath(); ctx.moveTo(xx, sy(-R) + 6); ctx.lineTo(xx, yFondo); ctx.stroke(); }
    // sotto, la terra
    ctx.fillStyle = Q.erba;
    ctx.fillRect(x - 2, yFondo, o.w + 4, alt + 60 - yFondo);
    // bordi: tubo di metallo
    for (const xx of [x, x1]) {
      ctx.fillStyle = '#d5dae1';
      ctx.beginPath(); ctx.arc(xx, sy(0) - 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5b616b'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  function disegnaGhiande() {
    for (const g of stato.ghiande) {
      const x = sx(g.x);
      if (x < -30 || x > larg + 30) continue;
      const y = sy(g.h) + Math.sin(stato.tempo * 4 + g.x * 0.01) * 3;
      if (g.tipo === 'ruota') {
        ctx.save();
        ctx.translate(x, y);
        ctx.shadowColor = '#9ee7ff'; ctx.shadowBlur = 14;
        ctx.rotate(stato.tempo * 3);
        ctx.fillStyle = '#f3e9c6';
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#9a8f78';
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-1.5, -14, 3, 8);
        ctx.restore();
        continue;
      }
      if (pronta(immagini.ghianda)) ctx.drawImage(immagini.ghianda, x - 11, y - 13, 22, 26);
    }
  }

  function disegnaNemici() {
    for (const e of stato.nemici) {
      const im = immagini[e.tipo];
      if (!pronta(im)) continue;
      let x = sx(e.x), h = e.base;
      if (x < -120 || x > larg + 120) continue;
      const s = 112 / 302;
      const w = 260 * s, hh = 320 * s;
      ctx.save();
      let rot = 0;
      if (e.stato === 'ko') { x += e.ko.x; h += e.ko.h; rot = e.ko.rot; }
      const y = sy(h);
      ctx.translate(x, y);
      if (e.stato === 'stordito') rot = Math.sin(stato.tempo * 6) * 0.12;
      if (e.tipo === 'timbro' && e.braccio > 0) rot = -0.08 * e.braccio;
      if (e.tipo === 'retino' && e.stato === 'attivo' && e.dist !== undefined) rot = 0;
      ctx.rotate(rot);
      // camminata: un saltello
      let sal = 0;
      if (e.tipo === 'retino' && e.stato === 'attivo') sal = Math.abs(Math.sin(e.t * 9)) * 3;
      ctx.drawImage(im, -110 * s, -302 * s - sal, w, hh);
      ctx.restore();
      if (e.stato === 'stordito') {
        // stelline che girano sopra la testa
        for (let i = 0; i < 3; i++) {
          const a = stato.tempo * 5 + i * 2.1;
          stella(x + Math.cos(a) * 24, sy(h + AGENTI.alt + 14) + Math.sin(a) * 6, 6, '#ffd23f');
        }
      } else if (e.stato === 'attivo') {
        const avviso = (e.tipo === 'retino' && e.rete > 0 && e.rete < AGENTI.rete[0] + AGENTI.rete[1])
          || (e.tipo === 'timbro' && e.braccio > 0.2);
        if (avviso) {
          ctx.fillStyle = '#ffd23f';
          ctx.strokeStyle = '#1c1f27';
          ctx.lineWidth = 3;
          ctx.font = '700 30px Fredoka, sans-serif';
          ctx.textAlign = 'center';
          ctx.strokeText('!', x, sy(h + AGENTI.alt + 16));
          ctx.fillText('!', x, sy(h + AGENTI.alt + 16));
        }
        if (e.tipo === 'retino' && e.rete > AGENTI.rete[0] && e.rete < AGENTI.rete[0] + AGENTI.rete[1]) {
          // la rete calata davanti: manico dalla mano e cerchio con le maglie
          const x2 = x - AGENTI.larg / 2 + 4, x1 = x2 - AGENTI.portataRete;
          const cx = (x1 + x2) / 2, cy = sy(h + AGENTI.altRete / 2), r = AGENTI.altRete / 2;
          ctx.strokeStyle = '#6b4a2e';
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(x - 6, sy(h + 70)); ctx.lineTo(cx + r * 0.7, cy - r * 0.5); ctx.stroke();
          ctx.save();
          ctx.beginPath(); ctx.ellipse(cx, cy, (x2 - x1) / 2, r, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
          ctx.clip();
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 1;
          for (let k = -6; k <= 6; k++) {
            ctx.beginPath(); ctx.moveTo(cx + k * 9 - r, cy - r); ctx.lineTo(cx + k * 9 + r, cy + r); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + k * 9 + r, cy - r); ctx.lineTo(cx + k * 9 - r, cy + r); ctx.stroke();
          }
          ctx.restore();
          ctx.strokeStyle = '#ffd23f';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(cx, cy, (x2 - x1) / 2, r, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
  }
  function stella(x, y, r, colore) {
    ctx.fillStyle = colore;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.fill();
  }

  function disegnaBollette() {
    for (const b of stato.bollette) {
      const x = sx(b.x), y = sy(b.h);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(b.rot) * 0.35);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#8a8f99';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-14, -10, 28, 20);
      ctx.strokeRect(-14, -10, 28, 20);
      ctx.fillStyle = '#d8342c';
      ctx.font = '700 10px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TARI', 0, -1);
      ctx.fillStyle = '#9aa0aa';
      ctx.fillRect(-9, 3, 18, 2);
      ctx.restore();
      // scia
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 18, y - 4); ctx.lineTo(x + 40, y - 4); ctx.moveTo(x + 18, y + 4); ctx.lineTo(x + 32, y + 4); ctx.stroke();
    }
  }

  // la tavola: centro del piano in (0, 0); giro = schiacciamento verticale (Giglio)
  function tavola(k, giro = 1) {
    k.save();
    k.scale(1, giro);
    // ruote e carrelli
    k.fillStyle = '#8d939c';
    k.fillRect(-27, 2, 10, 4); k.fillRect(17, 2, 10, 4);
    k.fillStyle = '#f3e9c6';
    for (const dx of [-24, -18, 18, 24]) { k.beginPath(); k.arc(dx, 9, 5.2, 0, Math.PI * 2); k.fill(); }
    k.fillStyle = '#b8ae8c';
    for (const dx of [-21, 21]) { k.beginPath(); k.arc(dx, 9, 2, 0, Math.PI * 2); k.fill(); }
    // piano con le punte rialzate
    k.fillStyle = '#d8342c';
    k.beginPath();
    k.moveTo(-30, -2); k.lineTo(30, -2);
    k.quadraticCurveTo(38, -2, 41, -9); k.lineTo(43, -7);
    k.quadraticCurveTo(40, 3, 30, 3); k.lineTo(-30, 3);
    k.quadraticCurveTo(-40, 3, -43, -7); k.lineTo(-41, -9);
    k.quadraticCurveTo(-38, -2, -30, -2);
    k.fill();
    // fiamma gialla sul fianco
    k.fillStyle = '#ffd23f';
    k.beginPath(); k.moveTo(-18, 2); k.quadraticCurveTo(-4, -1, 10, 2); k.quadraticCurveTo(-2, 0.5, -18, 2); k.fill();
    k.fillStyle = '#1c1f27';
    k.fillRect(-30, -3, 60, 1.6);
    k.restore();
  }

  function facciaTino() {
    const t = stato.tino;
    if (stato.fase === 'ko' || stato.fase === 'fine') return 'ko';
    if (t.ferito > 0 || t.caduta > 0) return 'ferito';
    if (t.botta || stato.grinta >= GRINTA.tacca * GRINTA.tacche || t.ruote === 1) return 'arrabbiato';
    return 'normale';
  }

  function disegnaRider() {
    const t = stato.tino;
    if (!t) return;
    const gino = stato.personaggio === 'gino';
    const x = sx(t.x), y = sy(t.h);
    const ko = stato.fase === 'ko' || stato.fase === 'fine';
    const faccia = gino ? 'gino' : facciaTino();
    const im = immagini[faccia];
    ctx.save();
    if (t.invulnerabile > 0 && !ko && t.caduta <= 0 && Math.floor(stato.tempo * 14) % 2 === 0) ctx.globalAlpha = 0.5;

    // ombra sulla strada (o sul piano)
    const sotto = supporto(t.x, t.h + 1).top;
    if (!t.pipe && sotto > -1e8) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      const dist = clamp((t.h - sotto) / 200, 0, 1);
      ctx.beginPath(); ctx.ellipse(x, sy(sotto) + 2, 30 * (1 - dist * 0.5), 5, 0, 0, Math.PI * 2); ctx.fill();
    }

    if (ko || t.caduta > 0) {
      // la tavola vola via, il personaggio rotola
      const k = ko ? Math.min(stato.koT || 0, 2) : 0.6 - t.caduta;
      ctx.save();
      ctx.translate(x + 50 + k * 140, y - 12 - Math.sin(Math.min(1, k * 2) * Math.PI) * 40);
      ctx.rotate(k * 9);
      tavola(ctx);
      ctx.restore();
      if (pronta(im)) {
        ctx.save();
        if (gino) {
          ctx.translate(x, y - 28);
          ctx.rotate(ko ? t.rot : 1.2 + Math.sin(stato.tempo * 30) * 0.1);
          const hh = 58, w = hh * im.naturalWidth / im.naturalHeight;
          ctx.drawImage(im, -w / 2, -hh / 2, w, hh);
        } else if (ko) {
          const hh = 58, w = hh * im.naturalWidth / im.naturalHeight;
          ctx.translate(x, y);
          ctx.drawImage(im, -w / 2, -hh, w, hh);
        } else {
          ctx.translate(x, y - 6);
          ctx.rotate(-1.25);
          const hh = 88, w = hh * im.naturalWidth / im.naturalHeight;
          ctx.drawImage(im, -w / 2, -hh + 26, w, hh);
        }
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    let base = 0;
    if (t.pipe) base = t.base;
    else if (t.terra && t.appoggio >= 0 && stato.ostacoli[t.appoggio] && stato.ostacoli[t.appoggio].rampa) {
      const o = stato.ostacoli[t.appoggio];
      base = -Math.atan2(o.h, o.w);
    }
    let giro = 1, tavY = 0, tavRot = 0, corpoY = 0, sqx = 1, sqy = 1, extra = 0, manualRot = 0;
    const tr = t.trick;
    if (tr && tr.tipo === 'giglio') {
      const p = tr.t / tr.dur;
      giro = Math.cos(p * Math.PI * 2);
      tavY = -18 * Math.sin(p * Math.PI);
      corpoY = -10 * Math.sin(p * Math.PI);
      tavRot = Math.sin(p * Math.PI) * 0.2;
    } else if (tr && tr.tipo === 'presa') {
      sqx = 1.05; sqy = 0.84; tavY = -12; tavRot = -0.22; extra = -0.08;
    } else if (t.manual > 0) {
      manualRot = t.manualPunta ? 0.17 : -0.2;
    } else if (t.grind > 0) {
      extra = Math.sin(stato.tempo * 40) * 0.015;
    } else if (!t.terra && !t.pipe && Math.abs(t.vang) < 0.5 && Math.abs(restoGiro().resto) < 0.3) {
      extra = clamp(-t.vy / 4500, -0.12, 0.14);
    }
    const s = t.schiacciaVis;
    if (s > 0) { sqx *= 1 + s * 0.12; sqy *= 1 - s * 0.16; } else if (s < 0) { sqx *= 1 + s * 0.08; sqy *= 1 - s * 0.12; }

    // in aria: la tavola si illumina di rosso se si atterrerebbe storti
    const storto = !t.terra && t.vy < 0 && Math.abs(restoGiro().resto) > GIRO.tolleranza;

    ctx.translate(x, y);
    if (t.verso < 0) ctx.scale(-1, 1);
    ctx.rotate(base);
    if (manualRot) {
      const px = t.manualPunta ? 24 : -24;
      ctx.translate(px, 0); ctx.rotate(manualRot); ctx.translate(-px, 0);
    }
    // i giri si fanno attorno al centro del corpo
    ctx.translate(0, -46); ctx.rotate(t.ang + extra); ctx.translate(0, 46);

    // Sfondamento: scia infuocata e linee di velocità
    if (t.sfondamento > 0 || t.botta) {
      const g = ctx.createRadialGradient(0, -44, 10, 0, -44, 70);
      g.addColorStop(0, 'rgba(255,190,60,0.55)');
      g.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(-10, -44, 80, 60, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,200,0.8)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const yy = -14 - i * 22 + Math.sin(stato.tempo * 40 + i) * 3;
        const l = 40 + ((stato.tempo * 900 + i * 47) % 50);
        ctx.beginPath(); ctx.moveTo(-40, yy); ctx.lineTo(-40 - l, yy); ctx.stroke();
      }
    }

    ctx.save();
    ctx.translate(0, -11 + tavY);
    ctx.rotate(tavRot);
    if (storto) { ctx.shadowColor = 'rgba(255,40,40,0.95)'; ctx.shadowBlur = 14; }
    tavola(ctx, Math.abs(giro) < 0.12 ? 0.12 * Math.sign(giro || 1) : giro);
    ctx.restore();

    if (pronta(im)) {
      ctx.save();
      ctx.translate(0, -13 + corpoY);
      ctx.scale(sqx, sqy);
      ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
      if (gino) {
        // Gino: solo la testa, animata (saltello, tremito, inclinazione)
        const hh = 62, w = hh * im.naturalWidth / im.naturalHeight;
        let dy = 0, dx = 0, r = 0;
        if (t.saltello > 0) dy = -Math.sin((1 - t.saltello / 0.5) * Math.PI) * 14;
        if (t.ferito > 0) dx = Math.sin(stato.tempo * 70) * 4;
        if (!t.terra && !t.pipe) r = clamp(t.vy / 3000, -0.2, 0.2);
        ctx.translate(dx, dy);
        ctx.rotate(r);
        ctx.drawImage(im, -w / 2, -hh, w, hh);
      } else {
        const hh = 94, w = hh * im.naturalWidth / im.naturalHeight;
        ctx.drawImage(im, -w / 2 - 2, -hh, w, hh);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function disegnaParticelle() {
    for (const p of stato.particelle) {
      const x = sx(p.x), y = sy(p.h);
      const f = p.t / p.dur;
      switch (p.tipo) {
        case 'polvere':
          ctx.fillStyle = `rgba(210,200,180,${0.6 * (1 - f)})`;
          ctx.beginPath(); ctx.arc(x, y, p.r * (1 + f), 0, Math.PI * 2); ctx.fill();
          break;
        case 'scintilla':
          ctx.fillStyle = `rgba(255,${200 + Math.round(55 * (1 - f))},90,${1 - f})`;
          ctx.fillRect(x - 2, y - 2, 4, 4);
          break;
        case 'pezzo':
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = 1 - f * f;
          ctx.fillStyle = p.colore;
          ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
          ctx.restore();
          break;
        case 'stella':
          stella(x, y, 7 * (1 - f * 0.5), `rgba(255,215,60,${1 - f})`);
          break;
        case 'luccichio':
          ctx.strokeStyle = `rgba(255,240,160,${1 - f})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, y, 10 + f * 18, 0, Math.PI * 2); ctx.stroke();
          break;
        case 'onda':
          ctx.strokeStyle = `rgba(255,140,60,${1 - f})`;
          ctx.lineWidth = 10 * (1 - f) + 2;
          ctx.beginPath(); ctx.ellipse(x, y, 40 + f * larg, 20 + f * 160, 0, Math.PI, 0); ctx.stroke();
          break;
        case 'scritta':
          ctx.globalAlpha = 1 - f * f;
          ctx.font = '700 20px Fredoka, sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#1c1f27';
          ctx.strokeText(p.testo, x, y);
          ctx.fillStyle = p.colore;
          ctx.fillText(p.testo, x, y);
          ctx.globalAlpha = 1;
          break;
        default: break;
      }
    }
  }

  function testo(t, x, y, misura, colore, allinea = 'center', bordo = 4) {
    ctx.font = `700 ${misura}px Fredoka, sans-serif`;
    ctx.textAlign = allinea;
    ctx.lineJoin = 'round';
    ctx.lineWidth = bordo;
    ctx.strokeStyle = '#1c1f27';
    ctx.strokeText(t, x, y);
    ctx.fillStyle = colore;
    ctx.fillText(t, x, y);
  }

  function disegnaHud() {
    const t = stato.tino;
    // ruote
    for (let i = 0; i < VITA.ruote; i++) {
      const x = 28 + i * 30, y = 26;
      ctx.fillStyle = '#1c1f27';
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = i < t.ruote ? '#f3e9c6' : '#4a4e58';
      ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = i < t.ruote ? '#b8ae8c' : '#3a3d45';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Grinta: 3 tacche
    const gx = 16, gy = 48, gw = 240, gh = 20;
    const piena = stato.grinta >= GRINTA.tacca * GRINTA.tacche;
    ctx.fillStyle = '#1c1f27';
    arrotondato(gx - 3, gy - 3, gw + 6, gh + 6, 8); ctx.fill();
    const tw = gw / GRINTA.tacche;
    for (let i = 0; i < GRINTA.tacche; i++) {
      const f = clamp((stato.grinta - i * GRINTA.tacca) / GRINTA.tacca, 0, 1);
      ctx.fillStyle = '#3a3d45';
      arrotondato(gx + i * tw + 2, gy, tw - 4, gh, 5); ctx.fill();
      if (f > 0) {
        ctx.fillStyle = f >= 1 ? (piena ? `hsl(${8 + Math.sin(stato.tempo * 10) * 8}, 90%, 55%)` : '#ff9a3c') : '#c9773a';
        arrotondato(gx + i * tw + 2, gy, (tw - 4) * f, gh, 5); ctx.fill();
      }
    }
    testo('GRINTA', gx + 6, gy + gh + 18, 13, '#ffd9a8', 'left', 3);
    if (!touch) testo('E Sfondamento · Q Botta', gx + 70, gy + gh + 18, 12, 'rgba(255,255,255,0.75)', 'left', 3);
    if (touch) {
      // pulsanti della Grinta
      const pr = PULSANTI();
      const pronto = [stato.grinta >= GRINTA.tacca, piena];
      const etichette = ['SFONDA', 'BOTTA'];
      pr.forEach((b, i) => {
        ctx.globalAlpha = pronto[i] ? 0.95 : 0.4;
        ctx.fillStyle = i ? '#d8342c' : '#e8892a';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1c1f27'; ctx.lineWidth = 3; ctx.stroke();
        testo(etichette[i], b.x, b.y + 5, i ? 15 : 13, '#fff', 'center', 3);
        ctx.globalAlpha = 1;
      });
    }
    // combo in corso
    const c = stato.combo;
    if (c && c.azioni.length) {
      const nomi = c.azioni.length > 4 ? '… + ' + c.azioni.slice(-4).join(' + ') : c.azioni.join(' + ');
      testo(nomi, larg / 2, 34, 18, '#fff');
      testo(`${Math.round(c.punti)} × ${c.azioni.length}`, larg / 2, 62, 26, '#ffd23f');
    } else if (stato.ultimaCombo) {
      const u = stato.ultimaCombo;
      ctx.globalAlpha = clamp(1.6 - u.t, 0, 1);
      testo(u.testo, larg / 2, 50 - u.t * 10, u.persa ? 22 : 26, u.persa ? '#ff8a7a' : '#7dff9a');
      ctx.globalAlpha = 1;
    }
    // messaggi
    stato.messaggi.forEach((m, i) => {
      const a = clamp(Math.min(m.t * 6, (m.durata - m.t) * 4), 0, 1);
      ctx.globalAlpha = a;
      const k = m.grande ? 40 : 28;
      testo(m.testo, larg / 2, 150 + i * (k + 8) - (1 - a) * 8, k, m.colore, 'center', 5);
      ctx.globalAlpha = 1;
    });
    // consigli dei primi metri
    if (stato.fase === 'corsa' && stato.metri < 90) {
      const consigli = touch ? [
        'Tocca a sinistra per saltare (tieni premuto per saltare più in alto)',
        'In aria trascina a destra o a sinistra per girare, tocca a destra per il Giglio',
        'Atterra con la tavola dritta, o Tino cade!',
        'Tieni il dito a destra: in aria è la presa, a terra il manual',
        'Salta in testa agli agenti! La Grinta si carica con i trick',
      ] : [
        'Spazio per saltare (tieni premuto per saltare più in alto)',
        'In aria: ← → per girare (backflip, frontflip) · X Giglio, tieni X per la presa',
        'Atterra con la tavola dritta e il trick finito, o Tino cade!',
        '← a terra: manual (tiene viva la combo) · ↓ in aria: schiacciata',
        'Salta in testa agli agenti! Con la Grinta: E Sfondamento, Q Botta',
      ];
      const i = Math.min(consigli.length - 1, Math.floor(stato.metri / 18));
      const f = (stato.metri % 18) / 18;
      ctx.globalAlpha = clamp(Math.min(f * 8, (1 - f) * 8), 0, 1);
      ctx.fillStyle = 'rgba(28,31,39,0.72)';
      ctx.font = '600 17px Fredoka, sans-serif';
      const w = ctx.measureText(consigli[i]).width + 28;
      arrotondato(larg / 2 - w / 2, alt - 44, w, 32, 16); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(consigli[i], larg / 2, alt - 22);
      ctx.globalAlpha = 1;
    }
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
    const src = nome === 'gino' ? ASSETS + 'gino/gino.png' : nome === 'capo' ? ASSETS + 'agenti-tari/ispettore-capo.svg' : ASSETS + 'tino/tino-' + nome + '.png';
    const alt = nome === 'gino' ? 'Gino' : nome === 'capo' ? 'L\'ispettore capo' : 'Tino';
    return `<img src="${src}" alt="${alt}" class="${classe}">`;
  };

  function testoComandi() {
    if (touch) {
      return `<div class="comandi">
        <p><b>Metà sinistra:</b> salto (tieni premuto per saltare più in alto).</p>
        <p><b>Metà destra:</b> in aria un tocco è il Giglio, tenendo premuto la presa, trascinando a destra o a sinistra Tino gira (frontflip, backflip), trascinando in giù la schiacciata; a terra tenendo premuto il manual. Nella half pipe trascina a destra per uscire.</p>
        <p><b>Pulsanti in alto:</b> SFONDA (1 tacca di Grinta) e BOTTA (3 tacche).</p>
      </div>`;
    }
    return `<div class="comandi">
      <p><kbd>Spazio</kbd> o <kbd>↑</kbd> salto (tieni premuto: più alto) · in aria <kbd>←</kbd> <kbd>→</kbd> backflip e frontflip: atterra con la tavola dritta! · <kbd>X</kbd> Giglio, tenendolo premuto la presa</p>
      <p><kbd>←</kbd> a terra manual (<kbd>→</kbd> di punta) · <kbd>↓</kbd> in aria schiacciata (sfonda le cassette) · nella half pipe tieni <kbd>→</kbd> per uscire · <kbd>E</kbd> Sfondamento (1 tacca) · <kbd>Q</kbd> Botta di Grinta (3 tacche)</p>
      <p>Mouse: tasto sinistro salto, destro trick · <kbd>P</kbd> pausa · <kbd>M</kbd> suoni · <kbd>N</kbd> musica</p>
    </div>`;
  }

  function pannelloMenu() {
    const rec = recordMetri > 0
      ? `<p class="record">Record: <b>${recordMetri} m</b> · <b>${recordPunti.toLocaleString('it-IT')}</b> punti · ghiande raccolte: ${ghiandeTotali}</p>` : '';
    const scelta = (id, nome, im) => `<button class="personaggio${stato.personaggio === id ? ' attivo' : ''}" data-azione="personaggio" data-id="${id}" aria-pressed="${stato.personaggio === id}">${im} ${nome}</button>`;
    return `<div class="riquadro">
      <div class="ritratti">${img(stato.personaggio === 'gino' ? 'arrabbiato' : 'normale', 'salta')}${img('gino', 'gino' + (stato.personaggio === 'gino' ? ' salta' : ''))}</div>
      <h1 class="titolo-punk">Tino Pro Skate</h1>
      <p>Hanno rubato lo skate di Gino! Tino sale sul suo e parte dalle Cascine: salti, trick, scivolate sulle panchine e pestoni in testa agli agenti della Tari.</p>
      ${rec}
      <div class="personaggi">${scelta('tino', 'Tino', img('normale'))}${scelta('gino', 'Gino', img('gino'))}</div>
      <div class="scelte">
        <button class="bottone" data-azione="gioca" data-primo>Corsa infinita</button>
        <button class="bottone secondario" data-azione="storia">La storia</button>
      </div>
      ${testoComandi()}
    </div>`;
  }

  function pannelloStoria() {
    return `<div class="riquadro">
      <h2>Lo skate di Gino</h2>
      <div class="fumetti">
        <div class="fumetto">${img('gino', 'trema')}<p>Papà… mi hanno rubato lo skate!</p></div>
        <div class="fumetto destra">${img('arrabbiato')}<p>Sì, figlio mio: ci penso io!</p></div>
        <div class="fumetto">${img('capo')}<p>Bolletta non pagata: skate pignorato! Ah ah ah!</p></div>
      </div>
      <p>L'ispettore capo della Tari è scappato con lo skate verso il centro. Tino parte dalle Cascine, poi Novoli, i cantieri della tramvia e il centro.</p>
      <p class="nota">Per ora la corsa è alle Cascine: gli altri quartieri e l'inseguimento dell'ispettore arrivano presto.</p>
      <div class="scelte">
        <button class="bottone" data-azione="gioca" data-primo>Parti!</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
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
      ${testoComandi()}
    </div>`;
  }

  function pannelloFine() {
    const r = stato.risultato;
    const gino = stato.personaggio === 'gino';
    const ritratti = gino ? `${img('normale')}${img('gino', 'gino caduto')}` : `${img('ko')}${img('gino', 'gino trema')}`;
    const record = r.nuovoMetri || r.nuovoPunti
      ? `<p class="nuovo-record">Nuovo record${r.nuovoMetri && r.nuovoPunti ? ' di metri e di punti' : r.nuovoMetri ? ' di metri' : ' di punti'}!</p>` : '';
    return `<div class="riquadro">
      <div class="ritratti">${ritratti}</div>
      <h2>${gino ? 'Gino è caduto!' : 'Tino è KO!'}</h2>
      <div class="dati">
        <div><b>${r.metri} m</b><span>strada fatta</span></div>
        <div><b>${r.punti.toLocaleString('it-IT')}</b><span>punti</span></div>
        <div><b>${r.ghiande}</b><span>ghiande</span></div>
        <div><b>${r.comboMax ? '× ' + r.comboMax : '–'}</b><span>combo più lunga</span></div>
      </div>
      ${record}
      <p class="record">Record: ${recordMetri} m · ${recordPunti.toLocaleString('it-IT')} punti · ghiande raccolte in tutto: ${ghiandeTotali}</p>
      <div class="scelte">
        <button class="bottone" data-azione="gioca" data-primo>Riparti</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  pannello.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-azione]');
    if (!btn) return;
    switch (btn.dataset.azione) {
      case 'gioca':
        if (!storiaVista) { storiaVista = true; scrivi('storia-vista', true); mostraPannello(pannelloStoria()); break; }
        nuovaCorsa();
        break;
      case 'storia': storiaVista = true; scrivi('storia-vista', true); mostraPannello(pannelloStoria()); break;
      case 'riprendi': riprendi(); break;
      case 'menu': vaiAlMenu(); break;
      case 'personaggio':
        stato.personaggio = btn.dataset.id;
        scrivi('personaggio', stato.personaggio);
        mostraPannello(pannelloMenu());
        break;
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
  let ultimaBarra = 0;
  function ciclo(ora) {
    const dt = clamp((ora - ultimo) / 1000, 0, 0.05);
    ultimo = ora;
    if (!stato.test) {
      controllaGesti();
      if (stato.fase === 'menu') {
        // nel menu Tino passeggia sul viale
        stato.tino.x += 110 * dt;
        stato.cam.x = stato.tino.x - xTino();
        stato.tempo += dt;
      } else aggiorna(dt);
      if (ora - ultimaBarra > 120) { ultimaBarra = ora; if (inGioco()) aggiornaBarra(); }
      aggiornaContinui();
    }
    disegna();
    requestAnimationFrame(ciclo);
  }
  requestAnimationFrame(ciclo);

  // utile per le prove automatiche: con stato.test = true il gioco non avanza
  // da solo; clona() e rimetti(s) servono a provare il futuro senza toccarlo
  window.tinoProSkate = {
    get stato() { return stato; },
    nuovaCorsa, aggiorna, premi, supporto, curva, disegna,
    clona: () => structuredClone(stato),
    rimetti: (s) => { stato = s; },
    larghezza: () => larg,
    FISICA, CURVE, TRICK, GRINTA, VITA, AGENTI, PEZZI, FORME, PX_M,
  };
})();
