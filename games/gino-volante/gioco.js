/*
 * Gino Volante
 * Tino salta sull'altalena a bilico e lancia Gino; Gino vola a parabola e,
 * quando apre la foglia, continua a colpi d'ala tra rami, tronchi e nuvole.
 *
 * Coordinate del mondo: x verso destra (0 = perno dell'altalena), h verso
 * l'alto (0 = terreno). 20 px = 1 metro.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------- tabelle
  const PX_M = 20;             // pixel per metro
  const SUOLO = 46;            // pixel di terreno visibili sotto h = 0

  // Altalena: un'asse appoggiata su un sasso. A riposo la punta di Tino
  // (sinistra) è alta e quella di Gino (destra) tocca terra.
  const ALTALENA = {
    perno: { x: 0, h: 30 },
    mezza: 110,                // mezza lunghezza dell'asse
    pendenza: 0.28,            // inclinazione a riposo
    spessore: 7,
    ceppo: { x: -300, h: 92, larg: 76 },
  };

  // Tino sul ceppo: saltella; il primo tocco lo fa saltare (più in alto se
  // è in cima al saltello), il secondo lo fa piombare sull'asse.
  const TINO = {
    gravita: 1500,
    salto: 620,                // spinta verso l'alto
    saltoExtra: 200,           // in più se parte dalla cima del saltello
    saltello: 24,              // altezza dei saltelli sul ceppo
    periodo: 0.62,             // durata di un saltello
    schianto: 1250,            // velocità con cui piomba giù
    atterraSenza: -22,         // dove atterra se non si preme (vicino al perno)
    punta: 94,                 // da qui alla punta (x <= -94) il colpo è perfetto
    manca: 120,                // oltre (x < -120) manca l'asse
  };

  // Lancio di Gino: la forza (0..~1.05) dipende dal punto dell'asse colpito
  // (leva) e dall'altezza da cui piomba Tino.
  const LANCIO = {
    velBase: 520,
    velForza: 1080,            // velocità = base + forza × questo
    angolo: 40,                // gradi con il colpo perfetto
    angoloExtra: 26,           // in più con la leva minima (più verticale)
    corto: 0.45,               // sotto questa forza il lancio è corto
  };

  // Volo libero e rimbalzi
  const VOLO = {
    gravita: 760,
    attrito: 0.1,              // rallentamento in aria (per secondo)
    rimbalzo: 0.45,            // quanto rimbalza a terra (verticale)
    frenataRimbalzo: 0.75,     // velocità orizzontale conservata a ogni rimbalzo
    strisciata: 520,           // frenata mentre scivola sull'erba
    raggio: 21,                // ingombro di Gino per gli urti
  };

  // Volo con la foglia
  const FOGLIA = {
    tetto: 460,                // sopra quest'altezza la foglia non sale più: plana
    gravita: 1450,
    colpo: 430,                // velocità verso l'alto a ogni colpo d'ala
    colpoStrappata: 395,
    cadutaMax: 620,
    planata: 170,              // discesa massima sopra il tetto
    slancio: 0.5,              // parte della velocità all'apertura che diventa slancio
    slancioMax: 420,
    smorza: 5,                 // secondi in cui lo slancio si consuma (costante di tempo)
    bonusApice: 1.3,           // slancio in più se si apre in cima al volo
    apice: 150,                // |velocità verticale| sotto cui si è "in cima"
    invulnerabile: 1.3,        // secondi dopo il primo strappo
    primoOstacolo: 820,        // distanza del primo ostacolo davanti a Gino
  };

  // Difficoltà: ogni voce è una curva [metri, valore], lineare tra un punto e
  // l'altro e ferma dopo l'ultimo. Fino a 700 m cresce in fretta, poi più piano
  // fino ai 2000 m e ancora più piano fino ai 4000 m, dove si ferma (sempre
  // battibile: provato con voli simulati).
  const CURVE = {
    velocita: [[0, 240], [700, 340], [2000, 380], [4000, 405]],  // px/s in avanti con la foglia
    varco: [[0, 245], [700, 175], [2000, 158], [3000, 150], [4000, 145]], // spazio libero tra sopra e sotto
    distanza: [[0, 560], [700, 360], [2000, 310], [4000, 290]],  // tra una coppia e l'altra
    ampiezza: [[0, 0], [300, 0], [740, 44], [2000, 50], [4000, 56]], // movimento su e giù degli ostacoli
    raduraOgni: [[0, 8], [2000, 12], [4000, 14]],    // coppie tra una radura con la corrente e l'altra
    fogliaOgni: [[0, 11], [2000, 18], [4000, 20]],   // coppie tra una foglia nuova e l'altra
    // tunnel di nuvole (solo nel cielo, da TUNNEL.da)
    tunnelOgni: [[0, 14], [1100, 14], [2000, 11], [3000, 8], [4500, 6]], // coppie normali tra un tunnel e l'altro
    tunnelLungo: [[0, 6], [1100, 6], [2000, 9], [3000, 13], [4500, 18]], // colonne di nuvole di un tunnel
    tunnelVarco: [[0, 192], [1100, 192], [2000, 178], [3000, 166], [4500, 158]], // varco dentro il tunnel
  };

  // Tunnel di nuvole: colonne fitte una dopo l'altra (si toccano), con il varco
  // che sale e scende come un corridoio. La pendenza non supera salita e discesa
  // (px/s alla velocità del tunnel), ben sotto quello che Gino riesce a fare
  // (sale a più di 300 px/s e scende a 620), e il varco resta largo almeno il
  // doppio dell'oscillazione dei colpi d'ala (64 px) più Gino.
  const TUNNEL = {
    da: 1100,                  // metri del primo tunnel
    passo: 0.86,               // distanza tra le colonne, in larghezze di ostacolo
    salita: 135,
    discesa: 240,
    svolta: 0.45,              // quanto può cambiare la pendenza da una colonna all'altra
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

  const OSTACOLI = {
    larghezza: 84,
    margineBasso: 70,
    margineAlto: 40,
    salitaMax: 150,            // px/s di salita che si chiedono al giocatore
    discesaMax: 300,
    periodo: [2.6, 3.8],       // secondi di un'andata e ritorno degli ostacoli mobili
    lungRadura: 980,
    tolleranza: 5,             // gli urti perdonano qualche pixel
  };

  // la corrente spinge solo fin sotto il tetto (sopra la foglia plana e gli ostacoli alti la toccherebbero)
  const CORRENTE = { larg: 170, spinta: 1900, max: 380, finoA: 60 };

  // Tappe: prato, bosco, cielo (metri di inizio)
  const TAPPE = [
    { nome: 'Il prato', da: 0 },
    { nome: 'Il bosco', da: 250 },
    { nome: 'Il cielo', da: 600 },
  ];

  const ASSETS = '../../assets/';
  const immagini = {
    normale: carica('tino/tino-normale.png'),
    arrabbiato: carica('tino/tino-arrabbiato.png'),
    ferito: carica('tino/tino-ferito.png'),
    ko: carica('tino/tino-ko.png'),
    gino: carica('gino/gino.png'),
  };
  function carica(percorso) {
    const im = new Image();
    im.src = ASSETS + percorso;
    return im;
  }
  const imgGhianda = new Image();
  imgGhianda.src = 'ghianda.svg';

  // Disegni facoltativi (dipinti a parte): se un file manca, resta la grafica
  // disegnata nel codice. Fondali: uno per tappa, in fondali/. Aliante: la
  // foglia-aliante intera e strappata, vista di lato, con il manubrio in basso
  // al centro (il punto a cui si tiene Gino è il centro del bordo inferiore).
  function facoltativa(percorso) {
    const im = new Image();
    im.ok = false;
    im.onload = () => { im.ok = im.naturalWidth > 0; };
    im.src = percorso;
    return im;
  }
  const FONDALI = ['fondali/prato.png', 'fondali/bosco.png', 'fondali/cielo.png'].map(facoltativa);
  const ALIANTE = { intero: facoltativa('aliante.png'), strappato: facoltativa('aliante-strappato.png') };
  const PARALLASSE_FONDALE = 0.15;

  // Ostacoli dipinti (in ostacoli/). w, h: misure del PNG; largo: larghezza in
  // gioco; verso 'su' = la parte bella è in cima e lo stelo si allunga verso il
  // basso, 'giu' = pende dall'alto e il ramo si allunga verso l'alto; ripeti: riga
  // del PNG da cui si allunga (ripetendo quella riga); bande: sagoma della parte
  // bella per gli urti ([y0, y1, x0, x1] in pixel del PNG, ricavate dai pixel non
  // trasparenti); fusto: larghezza della parte allungata.
  const SPRITE = {
    girasole: {"w": 262, "h": 628, "largo": 105, "verso": "su", "ripeti": 333, "bande": [[0, 23, 70, 192], [23, 47, 52, 209], [47, 71, 35, 227], [71, 95, 24, 238], [95, 119, 21, 241], [119, 143, 24, 238], [143, 167, 35, 227], [167, 190, 39, 224], [190, 214, 69, 193], [214, 238, 30, 157], [238, 262, 12, 237], [262, 286, 1, 261], [286, 310, 1, 245], [310, 334, 123, 221]], "fusto": [123, 139]},
    ramo: {"w": 250, "h": 778, "largo": 100, "verso": "giu", "ripeti": 528, "bande": [[528, 545, 80, 192], [545, 563, 56, 201], [563, 581, 23, 232], [581, 599, 13, 232], [599, 617, 15, 241], [617, 635, 7, 240], [635, 653, 0, 249], [653, 670, 0, 250], [670, 688, 10, 244], [688, 706, 10, 241], [706, 724, 23, 225], [724, 742, 31, 216], [742, 760, 46, 211], [760, 778, 92, 159]], "fusto": [115, 136]},
    tronco: {"w": 230, "h": 1184, "largo": 92, "verso": "su", "ripeti": 236, "bande": [[0, 16, 16, 193], [16, 33, 3, 206], [33, 50, 3, 206], [50, 67, 3, 206], [67, 84, 4, 209], [84, 101, 4, 211], [101, 118, 5, 228], [118, 135, 5, 228], [135, 152, 6, 215], [152, 169, 6, 215], [169, 186, 7, 212], [186, 203, 8, 210], [203, 220, 8, 208], [220, 237, 8, 204]], "fusto": [7, 202]},
    muschio: {"w": 230, "h": 1304, "largo": 92, "verso": "giu", "ripeti": 962, "bande": [[962, 986, 54, 196], [986, 1010, 44, 205], [1010, 1035, 32, 220], [1035, 1059, 17, 228], [1059, 1084, 7, 228], [1084, 1108, 2, 220], [1108, 1133, 2, 201], [1133, 1157, 10, 193], [1157, 1181, 15, 174], [1181, 1206, 24, 171], [1206, 1230, 28, 171], [1230, 1255, 32, 92], [1255, 1279, 77, 90], [1279, 1304, 79, 91]], "fusto": [68, 165]}
  };
  const COPPIE = [{ basso: 'girasole', alto: 'ramo' }, { basso: 'tronco', alto: 'muschio' }];
  // nuvole del cielo: mucchi di nuvole sciolte (quelle che ci sono tra le tre)
  // largo: larghezza dell'ostacolo; misura: larghezza media di una nuvola; passo: distanza tra
  // una nuvola e la successiva (in altezze di nuvola: sotto 1 si toccano, quindi niente buchi)
  const NUVOLE = { largo: 140, misura: 112, file: ['nuvola', 'nuvola2', 'nuvola3'], rx: 0.44, ry: 0.42, passo: 0.82 };
  const IMG_OST = {};
  for (const n of [...Object.keys(SPRITE), ...NUVOLE.file]) IMG_OST[n] = facoltativa('ostacoli/' + n + '.png');
  const coppiaPronta = (t) => COPPIE[t] && IMG_OST[COPPIE[t].basso].ok && IMG_OST[COPPIE[t].alto].ok;
  const nuvolePronte = () => NUVOLE.file.filter((n) => IMG_OST[n].ok);
  // colore della riga in alto del fondale, per riempire il cielo se la telecamera sale
  function coloreCima(im) {
    if (im.cima !== undefined) return im.cima;
    im.cima = null;
    try {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 1;
      const k = c.getContext('2d');
      k.drawImage(im, 0, 0, im.naturalWidth, 4, 0, 0, 16, 1);
      const d = k.getImageData(0, 0, 16, 1).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < 16; i++) { r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; }
      im.cima = `rgb(${Math.round(r / 16)},${Math.round(g / 16)},${Math.round(b / 16)})`;
    } catch (e) { /* pixel non leggibili (pagina aperta da file) */ }
    return im.cima;
  }

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
  // casuale fisso per le decorazioni (sempre uguale per la stessa casella)
  function hash(n) {
    let t = (n * 374761393 + 668265263) | 0;
    t = Math.imul(t ^ (t >>> 13), 1274126177);
    return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
  }

  function leggi(chiave, predefinito) {
    try {
      const v = localStorage.getItem('gino-volante:' + chiave);
      return v === null ? predefinito : JSON.parse(v);
    } catch (e) {
      return predefinito;
    }
  }
  function scrivi(chiave, valore) {
    try { localStorage.setItem('gino-volante:' + chiave, JSON.stringify(valore)); } catch (e) { /* niente */ }
  }

  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  // ---------------------------------------------------------------- stato
  const stato = {
    test: false,               // nelle prove il gioco non avanza da solo
    fase: 'menu',              // menu | pronto | salto | schianto | mancato | volo | foglia | rotola | fermo | fine
    pausaDa: null,
    tempo: 0,
    timer: 0,
    tino: null,
    gino: null,
    asse: 1,                   // inclinazione dell'asse: 1 riposo, -1 dopo il lancio
    forza: 0,
    perfetto: false,
    xLancio: 0,                // dove Gino ha aperto la foglia (o si è fermato)
    apertaFoglia: false,
    toccatoTerra: false,
    ostacoli: [],
    oggetti: [],
    correnti: [],
    gen: null,
    particelle: [],
    messaggi: [],
    cam: { x: -420, h: 0 },
    ghiande: 0,
    risultato: null,
  };
  let muto = leggi('muto', false);
  let musicaSpenta = leggi('musica-spenta', false);
  let record = leggi('record', 0);
  let recordGhiande = leggi('record-ghiande', 0);
  let ghiandeTotali = leggi('ghiande-totali', 0);
  let lanci = leggi('lanci', 0);

  function nuovoTino() {
    const c = ALTALENA.ceppo;
    return { x: c.x + 8, h: c.h, vx: 0, vy: 0, faccia: 'normale', schiaccia: 0, saltoT: 0, hClic: 0, festa: false };
  }
  function nuovoGino() {
    const x = 92;
    return {
      x, h: superficie(x, 1) + VOLO.raggio + 6, vx: 0, vy: 0,
      rot: 0, vrot: 0, schiaccia: 0, inclina: 0, tremaT: 0, saltoT: 0,
      foglia: 0,               // 0 chiusa, 1 integra, 2 strappata
      fogliaApre: 0,           // animazione di apertura 0..1
      battito: 0,              // animazione del colpo d'ala
      invulnerabile: 0,
      fermo: 0,
    };
  }

  // ---------------------------------------------------------------- audio
  let audio = null;
  function contesto() {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  function suono(freq, durata = 0.08, tipo = 'square', volume = 0.06, freqFine = null, ritardo = 0) {
    if (muto || stato.test) return;
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
      osc.connect(g).connect(audio.destination);
      osc.start(t);
      osc.stop(t + durata + 0.02);
    } catch (e) { /* audio non disponibile */ }
  }
  const suoni = {
    salto: () => suono(300, 0.18, 'triangle', 0.06, 620),
    schianto: () => suono(500, 0.12, 'triangle', 0.05, 200),
    lancio: (f) => { suono(140, 0.12, 'square', 0.05, 90); suono(260 + f * 200, 0.45, 'triangle', 0.07, 900 + f * 500, 0.03); },
    perfetto: () => [660, 880, 1175].forEach((f, i) => suono(f, 0.12, 'triangle', 0.06, null, i * 0.07)),
    manca: () => suono(400, 0.5, 'sawtooth', 0.04, 90),
    apri: () => { suono(900, 0.15, 'sine', 0.05, 300); suono(250, 0.2, 'triangle', 0.04, 500, 0.05); },
    battito: () => suono(520, 0.07, 'triangle', 0.035, 760),
    ghianda: () => { suono(1050, 0.07, 'triangle', 0.05); suono(1570, 0.1, 'triangle', 0.045, null, 0.05); },
    foglia: () => [523, 784, 1046].forEach((f, i) => suono(f, 0.1, 'sine', 0.06, null, i * 0.06)),
    strappo: () => { suono(180, 0.18, 'sawtooth', 0.05, 80); suono(1200, 0.08, 'square', 0.025, 400); },
    urto: () => suono(160, 0.35, 'sawtooth', 0.05, 60),
    rimbalzo: (k) => suono(200 + k * 120, 0.08, 'triangle', 0.03 + k * 0.03, 120),
    corrente: () => suono(300, 0.4, 'sine', 0.03, 700),
    tappa: () => [784, 988].forEach((f, i) => suono(f, 0.12, 'sine', 0.05, null, i * 0.1)),
    record: () => [523, 659, 784, 1046, 1318].forEach((f, i) => suono(f, 0.16, 'triangle', 0.07, null, i * 0.11)),
    fine: () => [523, 440, 523].forEach((f, i) => suono(f, 0.14, 'triangle', 0.05, null, i * 0.12)),
    via: () => suono(660, 0.08, 'triangle', 0.06),
  };

  // ---------------------------------------------------------------- musica
  // Musichetta in loop, tutta sintetizzata: basso saltellante, "pop" elettronici
  // sugli accordi, melodia a onda quadra. Tre livelli: menu (calma), lancio (con
  // la cassa), volo con la foglia (più veloce, con rullante, charleston e più pop).
  // Si programma un po' in anticipo con un timer; tace in pausa, con la scheda
  // nascosta, con i suoni spenti (M) o con la sola musica spenta (N o pulsante).
  const MUSICA = {
    bpm: [100, 108, 124],      // menu, lancio, foglia
    volume: 0.3,
    anticipo: 0.2,             // secondi programmati in anticipo
  };
  const NOTA = (n) => {
    const m = /^([A-G])(#?)(\d)$/.exec(n);
    return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  };
  // 8 battute da 16 sedicesimi: accordo (fondamentale e tipo) e melodia ('-' = pausa)
  const BRANO = [
    ['C3', 'M', 'C5 - E5 - G5 - E5 - C6 - - - G5 - - -'],
    ['F3', 'M', 'A5 - - F5 - - A5 - C6 - A5 - G5 - F5 -'],
    ['G3', 'M', 'G5 - B4 - D5 - G5 - F5 - E5 - D5 - - -'],
    ['C3', 'M', 'E5 - C5 - E5 G5 - - C6 - - - - - - -'],
    ['A2', 'm', 'A5 - - E5 - - A5 - C6 - B5 - A5 - E5 -'],
    ['F3', 'M', 'F5 - A5 - C6 - A5 - F5 - - - A5 - C6 -'],
    ['G3', 'M', 'B5 - - G5 - - D6 - B5 - G5 - A5 - B5 -'],
    ['G3', '7', 'C6 - - - G5 - - - D5 - E5 - F5 - G5 -'],
  ].map(([radice, tipo, mel]) => ({
    radice: NOTA(radice),
    accordo: { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 10] }[tipo],
    melodia: mel.split(' ').map((n) => (n === '-' ? null : NOTA(n))),
  }));
  const BASSO = { 0: 0, 3: 0, 4: 7, 8: 12, 10: 7, 11: 0, 12: 7, 14: 12 }; // sedicesimo → intervallo
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const musica = { passo: 0, prossimo: 0, suona: false, uscita: null, filtro: null, rumore: null };

  function suonaMusica() {
    return !!audio && audio.state === 'running' && !muto && !musicaSpenta && !stato.test
      && stato.fase !== 'pausa' && !document.hidden;
  }
  function livelloMusica() {
    if (stato.fase === 'foglia') return 2;
    return inGioco() ? 1 : 0;
  }
  function preparaMusica() {
    if (musica.uscita) return;
    const a = audio;
    musica.uscita = a.createGain();
    musica.uscita.gain.value = 0;
    const comp = a.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    musica.uscita.connect(comp).connect(a.destination);
    // la melodia passa da un filtro che si apre durante il volo
    musica.filtro = a.createBiquadFilter();
    musica.filtro.type = 'lowpass';
    musica.filtro.frequency.value = 1600;
    musica.filtro.connect(musica.uscita);
    const buf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    musica.rumore = buf;
  }
  // una nota: onda, frequenza (con eventuale scivolata), volume, durata
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
  // "pop" elettronico: una sinusoide che parte alta e cade subito sulla nota
  const pop = (t, m, vol) => notaMusica(t, 'sine', hz(m) * 2.2, vol, 0.11, musica.uscita, hz(m), 0.025);

  function passoMusica(n, t, liv, durata) {
    const battuta = BRANO[Math.floor(n / 16) % BRANO.length];
    const i = n % 16;
    const acc = battuta.accordo.map((x) => battuta.radice + 24 + x); // pop un paio di ottave sopra
    // basso
    if (BASSO[i] !== undefined) {
      const m = battuta.radice - 12 + BASSO[i];
      notaMusica(t, 'triangle', hz(m), 0.32, durata * 1.6);
      notaMusica(t, 'square', hz(m), 0.05, durata * 0.9);
    }
    // pop sui controtempi (e su tutti i sedicesimi dispari nel volo)
    if (i % 4 === 2) pop(t, acc[(i >> 2) % 3] + 12, 0.16);
    if (liv === 2 && i % 2 === 1) pop(t, acc[(n >> 1) % 3] + 24, 0.07);
    if (liv >= 1 && i === 15) pop(t, acc[2] + 24, 0.1);
    // melodia
    const mel = battuta.melodia[i];
    if (mel !== null) {
      const lunga = battuta.melodia.slice(i + 1).findIndex((x) => x !== null);
      const dur = durata * Math.min(4, lunga < 0 ? 4 : lunga + 1) * 0.9;
      notaMusica(t, 'square', hz(mel), liv === 0 ? 0.07 : 0.09, dur, musica.filtro);
      notaMusica(t, 'triangle', hz(mel + 12), 0.04, dur * 0.6, musica.filtro);
    }
    // batteria
    if (liv >= 1 && (i === 0 || i === 8 || (liv === 2 && i === 10))) notaMusica(t, 'sine', 150, 0.55, 0.16, musica.uscita, 45, 0.12);
    if (liv === 0 && i === 0) notaMusica(t, 'sine', 120, 0.25, 0.12, musica.uscita, 50, 0.1);
    if (liv === 2 && (i === 4 || i === 12)) rumoreMusica(t, 0.22, 0.12, 'bandpass', 1800);
    if (liv >= 1 && i % 2 === 0 && (liv === 2 || i % 4 === 2)) rumoreMusica(t, liv === 2 ? 0.07 : 0.05, 0.035, 'highpass', 7000);
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
    musica.filtro.frequency.setTargetAtTime(liv === 2 ? 3600 : liv === 1 ? 2400 : 1500, t, 0.3);
    if (musica.prossimo < t) musica.prossimo = t + 0.03; // il timer è rimasto indietro
    const durata = 60 / MUSICA.bpm[liv] / 4;
    while (musica.prossimo < t + MUSICA.anticipo) {
      try { passoMusica(musica.passo, musica.prossimo, liv, durata); } catch (e) { musica.errore = e; }
      musica.prossimo += durata;
      musica.passo = (musica.passo + 1) % (16 * BRANO.length);
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
  let larg = 960, alt = 540; // dimensioni logiche dello schermo
  let verticale = false;

  function ridimensiona() {
    const r = palco.getBoundingClientRect();
    const aw = Math.max(100, r.width - 16);
    const ah = Math.max(100, r.height - 16);
    verticale = ah > aw * 1.05;
    if (verticale) {
      // telefono in verticale: si vede meno avanti ma più cielo
      larg = 560;
      alt = clamp(Math.round(560 * ah / aw), 560, 1100);
    } else {
      alt = 540;
      larg = clamp(Math.round(540 * aw / ah), 760, 1400);
    }
    scala = Math.min(aw / larg, ah / alt);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = Math.round(larg * scala) + 'px';
    canvas.style.height = Math.round(alt * scala) + 'px';
    canvas.width = Math.round(larg * scala * dpr);
    canvas.height = Math.round(alt * scala * dpr);
    ctx.setTransform(scala * dpr, 0, 0, scala * dpr, 0, 0);
    cieloCache = null;
  }
  new ResizeObserver(ridimensiona).observe(palco);

  const sx = (x) => x - stato.cam.x;
  const sy = (h) => alt - SUOLO - (h - stato.cam.h);
  const xGino = () => (verticale ? 0.24 : 0.3) * larg;

  // ---------------------------------------------------------------- input
  // Un solo comando per tutto: Spazio (o Invio, freccia su), clic, tocco.
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (stato.fase === 'pausa') riprendi();
      else if (inGioco()) pausa();
      return;
    }
    if (e.code === 'KeyM') { cambiaAudio(); return; }
    if (e.code === 'KeyN') { cambiaMusica(); return; }
    if (['Space', 'Enter', 'ArrowUp', 'KeyW'].includes(e.code)) {
      if (pannelloAperto()) return; // il bottone del pannello fa da sé
      e.preventDefault();
      if (!e.repeat) premi();
    }
  });
  window.addEventListener('blur', () => { if (inGioco()) pausa(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && inGioco()) pausa(); });

  palco.addEventListener('pointerdown', (e) => {
    if (e.target !== canvas && e.target !== palco) return;
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    premi();
  });
  palco.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------------------------------------------------------------- flusso
  function inGioco() {
    return ['pronto', 'salto', 'schianto', 'mancato', 'volo', 'foglia', 'rotola', 'fermo'].includes(stato.fase);
  }

  function preparaScena() {
    stato.tino = nuovoTino();
    stato.gino = nuovoGino();
    stato.asse = 1;
    stato.forza = 0;
    stato.perfetto = false;
    stato.xLancio = 0;
    stato.apertaFoglia = false;
    stato.toccatoTerra = false;
    stato.ostacoli = [];
    stato.oggetti = [];
    stato.correnti = [];
    stato.gen = null;
    stato.particelle = [];
    stato.messaggi = [];
    stato.cam.x = -380 - (larg - 960) * 0.3;
    stato.cam.h = 0;
    stato.ghiande = 0;
    stato.tempo = 0;
    stato.risultato = null;
    stato.tappa = 0;
    aggiornaBarra();
  }

  function avvia(seme) {
    semeCasuale = seme === undefined ? null : seme | 0;
    preparaScena();
    stato.fase = 'pronto';
    nascondiPannello();
    suono(440, 0.05, 'triangle', 0.001); // sblocca l'audio sul primo gesto
  }

  // Il comando unico: cosa fa dipende dalla fase.
  function premi() {
    const t = stato.tino;
    const g = stato.gino;
    switch (stato.fase) {
      case 'pronto': saltaTino(); break;
      case 'salto': schianto(); break;
      case 'volo': apriFoglia(); break;
      case 'foglia': battito(); break;
      case 'pausa': riprendi(); break;
      default: break;
    }
    return { t, g };
  }

  function saltaTino() {
    const t = stato.tino;
    const c = ALTALENA.ceppo;
    const su = t.h - c.h;
    const f = clamp(su / TINO.saltello, 0, 1);
    const vy0 = TINO.salto + TINO.saltoExtra * f;
    // velocità orizzontale scelta in modo che, senza premere, atterri vicino al perno
    const hFine = superficie(TINO.atterraSenza, 1);
    const g = TINO.gravita;
    const T = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * (t.h - hFine))) / g;
    t.vx = (TINO.atterraSenza - t.x) / T;
    t.vy = vy0;
    t.schiaccia = 0.8;
    t.faccia = 'arrabbiato'; // concentrato prima del tiro decisivo
    stato.fase = 'salto';
    suoni.salto();
  }

  function schianto() {
    const t = stato.tino;
    t.hClic = t.h;
    t.vx = 0;
    t.vy = Math.min(t.vy, 0) - TINO.schianto;
    stato.fase = 'schianto';
    suoni.schianto();
  }

  // Tino tocca l'asse (o il prato, se l'ha mancata)
  function atterraTino(conSchianto) {
    const t = stato.tino;
    const x = t.x;
    if (x < -TINO.manca) {
      // ha mancato l'asse
      t.h = 0; t.vy = 0; t.vx = 0;
      t.faccia = 'ko';
      stato.fase = 'mancato';
      stato.timer = 1.6;
      stato.gino.saltoT = 0.6; // Gino fa un saltello sul posto
      stato.forza = 0;
      mostraMessaggio('Mancata!', 1.4, '#c0392b');
      suoni.manca();
      polvere(x, 0, 10);
      return;
    }
    const leva = clamp((-x - (-TINO.atterraSenza)) / (TINO.punta - (-TINO.atterraSenza)), 0, 1);
    const caduta = conSchianto ? t.hClic - superficie(x, 1) : 0;
    const altezza = conSchianto ? clamp(0.8 + (caduta - 120) / 340, 0.7, 1.05) : 0.6;
    const forza = (0.25 + 0.75 * Math.pow(leva, 1.2)) * altezza;
    const angolo = (LANCIO.angolo + (1 - leva) * LANCIO.angoloExtra) * Math.PI / 180;
    const vel = LANCIO.velBase + LANCIO.velForza * forza;
    stato.forza = forza;
    stato.perfetto = conSchianto && leva >= 1;
    t.h = superficie(x, -1);
    t.vy = 0; t.vx = 0;
    t.schiaccia = 1;
    stato.asse = -1;
    const g = stato.gino;
    g.vx = vel * Math.cos(angolo);
    g.vy = vel * Math.sin(angolo);
    g.h += 18;
    g.vrot = 6 + forza * 8;
    g.schiaccia = 0.7;
    stato.fase = 'volo';
    lanci += 1; scrivi('lanci', lanci);
    if (forza < LANCIO.corto) {
      t.faccia = 'arrabbiato';
      mostraMessaggio(conSchianto ? 'Lancio corto…' : 'Troppo tardi!', 1.3, '#a0522d');
    } else {
      t.faccia = 'normale';
      t.festa = true;
      if (stato.perfetto) { mostraMessaggio('Perfetto!', 1.3, '#2f6b26'); suoni.perfetto(); }
      else if (forza > 0.75) mostraMessaggio('Bel lancio!', 1.1, '#2f6b26');
    }
    suoni.lancio(forza);
    polvere(x, t.h, 8);
  }

  function apriFoglia() {
    const g = stato.gino;
    if (stato.toccatoTerra || g.foglia) return;
    const d = g.x / PX_M;
    const vel = Math.hypot(g.vx, g.vy);
    const base = crociera(d);
    let slancio = clamp(FOGLIA.slancio * vel - base, 0, FOGLIA.slancioMax);
    if (Math.abs(g.vy) < FOGLIA.apice && g.h > 200) {
      slancio *= FOGLIA.bonusApice;
      mostraMessaggio('Apertura perfetta!', 1.3, '#2f6b26');
      suoni.perfetto();
    }
    g.foglia = 1;
    g.fogliaApre = 0;
    g.slancio = slancio;
    g.vx = base + slancio;
    g.vy = clamp(g.vy, -260, 260);
    g.vrot = 0;
    stato.apertaFoglia = true;
    stato.xLancio = g.x;
    stato.fase = 'foglia';
    // il primo ostacolo arriva solo dopo che Gino è planato sotto il tetto
    const planata = Math.max(0, g.h - FOGLIA.tetto) / FOGLIA.planata * 1.15 * g.vx;
    stato.gen = { x: g.x + FOGLIA.primoOstacolo + planata, n: 0, finoRadura: CURVE.raduraOgni[0][1], finoFoglia: CURVE.fogliaOgni[0][1], centro: clamp(Math.min(g.h, FOGLIA.tetto), 140, FOGLIA.tetto - 140) };
    suoni.apri();
  }

  function battito() {
    const g = stato.gino;
    if (g.h > FOGLIA.tetto) {
      g.battito = 0.5; // la foglia fruscia ma sopra il tetto non sale
      return;
    }
    g.vy = g.foglia === 2 ? FOGLIA.colpoStrappata : FOGLIA.colpo;
    g.battito = 1;
    g.inclina = -0.35;
    suoni.battito();
    if (casuale() < 0.35) aggiungiParticella({ tipo: 'fogliolina', x: g.x - 20, h: g.h + 20, vx: -60, vy: -40, vita: 1.2, rot: 0, vrot: 3 });
  }

  // Fine del volo con la foglia: Gino cade e rotola
  function finisciFoglia(motivo) {
    const g = stato.gino;
    g.foglia = 0;
    g.vx = motivo === 'terra' ? Math.min(g.vx, 260) : 140;
    g.vy = motivo === 'terra' ? 0 : 160;
    g.vrot = 7;
    g.tremaT = 0.5;
    stato.fase = 'rotola';
    stato.toccatoTerra = motivo === 'terra';
    if (motivo !== 'terra') {
      mostraMessaggio('Bum!', 0.9, '#c0392b');
      suoni.urto();
    }
    for (let i = 0; i < 6; i++) {
      aggiungiParticella({ tipo: 'fogliolina', x: g.x, h: g.h + 20, vx: tra(-120, 120), vy: tra(0, 200), vita: 1.6, rot: tra(0, 6), vrot: tra(-6, 6) });
    }
  }

  function ginoFermo() {
    const g = stato.gino;
    g.vx = 0; g.vy = 0; g.vrot = 0;
    g.saltoT = 1.2;
    stato.fase = 'fermo';
    stato.timer = 1.4;
    if (!stato.apertaFoglia) stato.xLancio = g.x;
  }

  function finisci() {
    const g = stato.gino;
    const metri = stato.fase === 'mancato' ? 0 : Math.max(0, Math.floor(g.x / PX_M));
    const nuovo = metri > record;
    if (nuovo) { record = metri; scrivi('record', record); }
    if (stato.ghiande > recordGhiande) { recordGhiande = stato.ghiande; scrivi('record-ghiande', recordGhiande); }
    ghiandeTotali += stato.ghiande;
    scrivi('ghiande-totali', ghiandeTotali);
    stato.risultato = {
      metri,
      lancio: Math.max(0, Math.floor(stato.xLancio / PX_M)),
      foglia: stato.apertaFoglia,
      mancato: stato.fase === 'mancato',
      corto: stato.forza < LANCIO.corto,
      nuovo,
      ghiande: stato.ghiande,
    };
    stato.fase = 'fine';
    aggiornaBarra();
    if (nuovo && metri > 0) suoni.record(); else suoni.fine();
    if (!stato.test) mostraPannello(pannelloFine());
  }

  function pausa() {
    if (!inGioco()) return;
    stato.pausaDa = stato.fase;
    stato.fase = 'pausa';
    mostraPannello(pannelloPausa());
  }
  function riprendi() {
    if (stato.fase !== 'pausa') return;
    stato.fase = stato.pausaDa;
    nascondiPannello();
  }
  function vaiAlMenu() {
    preparaScena();
    stato.fase = 'menu';
    mostraPannello(pannelloMenu());
  }

  function cambiaAudio() {
    muto = !muto;
    scrivi('muto', muto);
    document.body.classList.toggle('muto', muto);
    if (!muto) suoni.via();
    aggiornaMusica();
  }
  // spegne o riaccende solo la musica (con i suoni spenti, la riaccende insieme ai suoni)
  function cambiaMusica() {
    if (muto) { musicaSpenta = true; cambiaAudio(); }
    musicaSpenta = !musicaSpenta;
    scrivi('musica-spenta', musicaSpenta);
    document.body.classList.toggle('senza-musica', musicaSpenta);
    aggiornaMusica();
  }

  function mostraMessaggio(testo, durata, colore = '#2f6b26') {
    stato.messaggi = stato.messaggi.filter((m) => m.t < m.durata * 0.5);
    stato.messaggi.push({ testo, t: 0, durata, colore });
  }

  function aggiornaBarra() {
    const g = stato.gino;
    const metri = g && stato.fase !== 'menu' && stato.fase !== 'mancato' ? Math.max(0, Math.floor(g.x / PX_M)) : 0;
    const m = stato.risultato ? stato.risultato.metri : metri;
    if (elMetri.textContent !== String(m)) elMetri.textContent = m;
    const r = record > 0 ? 'record ' + record + ' m' : '';
    if (elRecord.textContent !== r) elRecord.textContent = r;
    if (elGhiande.textContent !== String(stato.ghiande)) elGhiande.textContent = stato.ghiande;
  }

  // ---------------------------------------------------------------- altalena
  // Altezza della superficie dell'asse in x (inclina 1 = a riposo, -1 = dopo il lancio)
  function superficie(x, inclina) {
    const p = ALTALENA.perno;
    return p.h + ALTALENA.spessore - ALTALENA.pendenza * inclina * x;
  }

  // ---------------------------------------------------------------- difficoltà
  function crociera(metri) { return curva(CURVE.velocita, metri); }
  function tappaDi(metri) {
    let i = 0;
    for (let k = 0; k < TAPPE.length; k++) if (metri >= TAPPE[k].da) i = k;
    return i;
  }

  function generaProssimo() {
    const gen = stato.gen;
    gen.n += 1;
    const metri = gen.x / PX_M;
    if (gen.tunnel) { colonnaTunnel(); return; }
    // radura con la corrente d'aria e una fila di ghiande
    gen.finoRadura -= 1;
    if (gen.finoRadura <= 0) {
      gen.finoRadura = Math.round(curva(CURVE.raduraOgni, metri));
      const cx = gen.x + 260;
      stato.correnti.push({ x: cx, larg: CORRENTE.larg });
      for (let i = 0; i < 6; i++) {
        const a = i / 5;
        stato.oggetti.push({ tipo: 'ghianda', x: cx + CORRENTE.larg + 70 + i * 70, h: FOGLIA.tetto - 70 - Math.sin(a * Math.PI) * 30 - a * 120 });
      }
      gen.x += OSTACOLI.lungRadura;
      gen.centro = FOGLIA.tetto - 140;
      return;
    }
    const varco = curva(CURVE.varco, metri);
    const spazio = curva(CURVE.distanza, metri) * tra(0.92, 1.1);
    const ampiezza = curva(CURVE.ampiezza, metri) * tra(0.5, 1);
    const minC = OSTACOLI.margineBasso + varco / 2 + ampiezza;
    const maxC = FOGLIA.tetto - OSTACOLI.margineAlto - varco / 2 - ampiezza;
    const dt = spazio / crociera(metri);
    // il nuovo varco non deve essere troppo lontano dal precedente: sempre raggiungibile
    const su = Math.max(0, OSTACOLI.salitaMax * dt - 2 * ampiezza);
    const giu = Math.max(0, OSTACOLI.discesaMax * dt - 2 * ampiezza);
    let centro = tra(minC, maxC);
    centro = clamp(centro, gen.centro - giu, gen.centro + su);
    centro = clamp(centro, minC, maxC);
    const tappa = tappaDi(metri);
    const o = {
      x: gen.x, ...formaOstacolo(tappa),
      centro, varco, ampiezza, periodo: tra(OSTACOLI.periodo[0], OSTACOLI.periodo[1]), fase: tra(0, Math.PI * 2),
      tappa, seme: Math.floor(tra(0, 1e6)), passato: false,
    };
    stato.ostacoli.push(o);
    // premi nel varco
    gen.finoFoglia -= 1;
    if (gen.finoFoglia <= 0) {
      gen.finoFoglia = Math.round(curva(CURVE.fogliaOgni, metri));
      stato.oggetti.push({ tipo: 'foglia', x: o.x + o.w / 2, dh: 0, ostacolo: o });
    } else if (casuale() < 0.55) {
      stato.oggetti.push({ tipo: 'ghianda', x: o.x + o.w / 2, dh: tra(-0.2, 0.2) * varco, ostacolo: o });
    }
    if (casuale() < 0.3) {
      // una ghianda tra un ostacolo e l'altro, a metà strada
      stato.oggetti.push({ tipo: 'ghianda', x: o.x + o.w + spazio * 0.45, h: lerp(gen.centro, centro, 0.6) });
    }
    gen.centro = centro;
    gen.x += spazio;
    // nel cielo, ogni tanto, comincia un tunnel di nuvole
    if (tappa === 2 && metri >= TUNNEL.da) {
      if (gen.finoTunnel === undefined) gen.finoTunnel = 2;
      gen.finoTunnel -= 1;
      if (gen.finoTunnel <= 0) {
        gen.finoTunnel = Math.round(curva(CURVE.tunnelOgni, metri));
        gen.tunnel = { resto: Math.round(curva(CURVE.tunnelLungo, metri)), pend: 0, primo: true };
      }
    }
  }

  // Una colonna del tunnel di nuvole: subito dopo la precedente, con il varco
  // che si sposta di poco (pendenza limitata, che cambia piano).
  function colonnaTunnel() {
    const gen = stato.gen;
    const tu = gen.tunnel;
    const metri = gen.x / PX_M;
    const forma = formaOstacolo(2);
    const passo = forma.w * TUNNEL.passo;
    const dt = passo / crociera(metri);
    const varco = curva(CURVE.tunnelVarco, metri);
    const su = TUNNEL.salita * dt, giu = TUNNEL.discesa * dt;
    const minC = OSTACOLI.margineBasso + varco / 2;
    const maxC = FOGLIA.tetto - OSTACOLI.margineAlto - varco / 2;
    let pend = tu.primo ? 0 : clamp(tu.pend + tra(-1, 1) * TUNNEL.svolta * (su + giu), -giu, su);
    // vicino ai bordi la pendenza si gira verso il centro
    if (gen.centro + pend * 3 > maxC) pend = Math.min(pend, -giu * tra(0.2, 0.8));
    if (gen.centro + pend * 3 < minC) pend = Math.max(pend, su * tra(0.2, 0.8));
    const centro = clamp(gen.centro + pend, Math.max(minC, gen.centro - giu), Math.min(maxC, gen.centro + su));
    tu.pend = centro - gen.centro;
    const o = {
      x: gen.x, ...forma, centro, varco, ampiezza: 0, periodo: 3, fase: 0,
      tappa: 2, seme: Math.floor(tra(0, 1e6)), passato: false, tunnel: true, entrata: tu.primo,
    };
    stato.ostacoli.push(o);
    // una scia di ghiande lungo il corridoio
    if (gen.n % 2 === 0) stato.oggetti.push({ tipo: 'ghianda', x: o.x + o.w / 2, dh: 0, ostacolo: o });
    tu.primo = false;
    tu.resto -= 1;
    gen.centro = centro;
    gen.x += passo;
    if (tu.resto <= 0) {
      gen.tunnel = null;
      gen.x += curva(CURVE.distanza, metri) * 0.6;
    }
  }

  function centroOstacolo(o, tempo) {
    return o.centro + (o.ampiezza ? o.ampiezza * Math.sin(tempo * Math.PI * 2 / o.periodo + o.fase) : 0);
  }
  function hOggetto(ob, tempo) {
    return ob.ostacolo ? centroOstacolo(ob.ostacolo, tempo) + ob.dh : ob.h;
  }

  // urto cerchio-rettangolo (rettangolo in coordinate del mondo: x1..x2, h1..h2)
  function urtaRett(cx, ch, r, x1, x2, h1, h2) {
    const px = clamp(cx, x1, x2);
    const ph = clamp(ch, h1, h2);
    const dx = cx - px, dh = ch - ph;
    return dx * dx + dh * dh < r * r;
  }
  // Che forma ha un ostacolo nuovo: disegni dipinti se ci sono, altrimenti rettangoli
  function formaOstacolo(tappa) {
    if (tappa < 2 && coppiaPronta(tappa)) {
      const c = COPPIE[tappa];
      return { forma: 'disegno', w: Math.max(SPRITE[c.basso].largo, SPRITE[c.alto].largo) };
    }
    if (tappa === 2 && nuvolePronte().length) return { forma: 'nuvole', w: NUVOLE.largo };
    return { forma: 'rett', w: OSTACOLI.larghezza * (tappa === 2 ? 1.25 : tappa === 1 ? 1.05 : 0.9) };
  }

  // Sagoma di un disegno in coordinate del mondo, relative al centro (dx) e al
  // bordo del varco (dh): rettangoli [dx0, dx1, dh0, dh1]; l'ultimo è il fusto.
  function sagoma(nome) {
    const S = SPRITE[nome];
    if (S.sagoma) return S.sagoma;
    const k = S.largo / S.w;
    const X = (x) => (x - S.w / 2) * k;
    const forme = S.bande.map(([y0, y1, x0, x1]) => (S.verso === 'su'
      ? [X(x0), X(x1), -y1 * k, -y0 * k]
      : [X(x0), X(x1), (S.h - y1) * k, (S.h - y0) * k]));
    forme.push(S.verso === 'su'
      ? [X(S.fusto[0]), X(S.fusto[1]), -100000, -S.ripeti * k]
      : [X(S.fusto[0]), X(S.fusto[1]), (S.h - S.ripeti) * k, 100000]);
    S.sagoma = forme;
    return forme;
  }

  // Le nuvole di un ostacolo del cielo: sotto il varco fino alle chiome, sopra
  // fino in cima. Ognuna è un'ellisse per gli urti; v = quale disegno, giro = specchiata.
  // Le nuvole relative al centro del varco si calcolano una volta per ostacolo
  // (h relativa a c = 0) e si spostano con il centro.
  function nuvoleRel(o) {
    const n = nuvolePronte().length;
    if (o.nuv && o.nuvN === n) return o.nuv;
    o.nuv = calcolaNuvole(o, 0, -60 - FOGLIA.tetto - 80, 1600);
    o.nuvN = n;
    return o.nuv;
  }
  function nuvoleDi(o, c) {
    return nuvoleRel(o).map((q) => ({ ...q, h: q.h + c }));
  }
  function calcolaNuvole(o, c, giu, su) {
    const disegni = nuvolePronte();
    const n = Math.max(1, disegni.length);
    const lista = [];
    const cx = o.x + o.w / 2;
    const fai = (i, sopra, bordo) => {
      const r = hash(o.seme + i * 7 + (sopra ? 1000 : 0));
      const ww = NUVOLE.misura * (0.85 + 0.3 * r);
      const im = IMG_OST[disegni[(o.seme + i + (sopra ? 1 : 0)) % n]];
      const hh = ww * (im && im.ok ? im.naturalHeight / im.naturalWidth : 0.72);
      const rx = ww * NUVOLE.rx, ry = hh * NUVOLE.ry;
      const gioco = Math.max(0, o.w / 2 - rx) * (i % 2 ? 1 : -1) * (0.5 + 0.5 * hash(o.seme + i * 13));
      return { x: cx + gioco, h: bordo, ww, hh, rx, ry, im, giro: (o.seme + i) % 2 === 1 };
    };
    // sotto: la prima nuvola tocca il bordo basso del varco
    let h = c - o.varco / 2;
    for (let i = 0; h > giu && i < 20; i++) {
      const q = fai(i, false, 0);
      q.h = h - q.ry;
      lista.push(q);
      h = q.h - q.hh * (NUVOLE.passo - NUVOLE.ry);
    }
    h = c + o.varco / 2;
    for (let i = 0; h < su && i < 30; i++) {
      const q = fai(i, true, 0);
      q.h = h + q.ry;
      lista.push(q);
      h = q.h + q.hh * (NUVOLE.passo - NUVOLE.ry);
    }
    return lista;
  }

  function urtaOstacolo(o, g, tempo) {
    const tol = OSTACOLI.tolleranza;
    const c = centroOstacolo(o, tempo);
    const r = VOLO.raggio;
    const x1 = o.x + tol, x2 = o.x + o.w - tol;
    if (g.x + r < x1 || g.x - r > x2) return false;
    if (o.forma === 'disegno') {
      const cx = o.x + o.w / 2;
      const coppia = COPPIE[o.tappa];
      for (const [nome, bordo] of [[coppia.basso, c - o.varco / 2], [coppia.alto, c + o.varco / 2]]) {
        for (const [dx0, dx1, dh0, dh1] of sagoma(nome)) {
          if (dx1 - dx0 <= 2 * tol) continue;
          if (urtaRett(g.x, g.h, r, cx + dx0 + tol, cx + dx1 - tol, bordo + dh0 + tol, bordo + dh1 - tol)) return true;
        }
      }
      return false;
    }
    if (o.forma === 'nuvole') {
      const rr = r - tol;
      const gh = g.h - c;
      for (const q of nuvoleRel(o)) {
        if (Math.abs(gh - q.h) > q.ry + rr) continue;
        const dx = (g.x - q.x) / (q.rx + rr), dh = (gh - q.h) / (q.ry + rr);
        if (dx * dx + dh * dh < 1) return true;
      }
      return false;
    }
    return urtaRett(g.x, g.h, r, x1, x2, -1000, c - o.varco / 2 - tol)
      || urtaRett(g.x, g.h, r, x1, x2, c + o.varco / 2 + tol, 100000);
  }

  // ---------------------------------------------------------------- aggiornamento
  function aggiorna(dt) {
    if (stato.fase === 'pausa') return;
    stato.tempo += dt;
    const t = stato.tino;
    const g = stato.gino;
    if (!t) return;

    t.schiaccia = Math.max(0, t.schiaccia - dt * 4);
    t.saltoT = (t.saltoT + dt) % 10;
    g.schiaccia = Math.max(0, g.schiaccia - dt * 4);
    g.tremaT = Math.max(0, g.tremaT - dt);
    g.saltoT = Math.max(0, g.saltoT - dt);
    g.battito = Math.max(0, g.battito - dt * 4);
    g.invulnerabile = Math.max(0, g.invulnerabile - dt);
    g.inclina += (clamp(-g.vy / 1400, -0.35, 0.3) - g.inclina) * Math.min(1, dt * 6);
    if (g.foglia) g.fogliaApre = Math.min(1, g.fogliaApre + dt * 5);
    stato.asse += ((stato.fase === 'pronto' || stato.fase === 'salto' || stato.fase === 'schianto' || stato.fase === 'menu' || stato.fase === 'mancato' ? 1 : -1) - stato.asse) * Math.min(1, dt * 25);
    for (const m of stato.messaggi) m.t += dt;
    stato.messaggi = stato.messaggi.filter((m) => m.t < m.durata);
    aggiornaParticelle(dt);

    switch (stato.fase) {
      case 'menu':
      case 'pronto': {
        // Tino saltella sul ceppo
        const fase = (stato.tempo % TINO.periodo) / TINO.periodo;
        t.h = ALTALENA.ceppo.h + TINO.saltello * Math.sin(fase * Math.PI);
        if (fase < 0.08 || fase > 0.94) t.schiaccia = Math.max(t.schiaccia, 0.5);
        break;
      }
      case 'salto':
      case 'schianto': {
        t.vy -= TINO.gravita * dt;
        t.x += t.vx * dt;
        t.h += t.vy * dt;
        const sopraAsse = t.x >= -TINO.manca && t.x <= 0;
        if (sopraAsse && t.vy < 0 && t.h <= superficie(t.x, 1)) atterraTino(stato.fase === 'schianto');
        else if (t.h <= 0) { t.x = Math.min(t.x, -TINO.manca - 1); atterraTino(false); }
        break;
      }
      case 'mancato':
        stato.timer -= dt;
        if (stato.timer <= 0) finisci();
        break;
      case 'volo':
      case 'rotola':
        voloLibero(dt);
        break;
      case 'foglia':
        voloFoglia(dt);
        break;
      case 'fermo':
        stato.timer -= dt;
        if (stato.timer <= 0) finisci();
        break;
      default:
        break;
    }
    aggiornaCamera(dt);
    // si tolgono gli oggetti rimasti indietro
    const via = stato.cam.x - 300;
    if (stato.ostacoli.length && stato.ostacoli[0].x + 200 < via) stato.ostacoli = stato.ostacoli.filter((o) => o.x + 200 > via);
    if (stato.oggetti.length && stato.oggetti[0].x < via) stato.oggetti = stato.oggetti.filter((o) => o.x > via);
    if (stato.correnti.length && stato.correnti[0].x + 300 < via) stato.correnti = stato.correnti.filter((c) => c.x + 300 > via);
    if (!stato.test) aggiornaBarra();
  }

  function voloLibero(dt) {
    const g = stato.gino;
    g.vy -= VOLO.gravita * dt;
    const k = Math.exp(-VOLO.attrito * dt);
    g.vx *= k;
    g.x += g.vx * dt;
    g.h += g.vy * dt;
    g.rot += g.vrot * dt;
    const r = VOLO.raggio;
    if (g.h <= r) {
      g.h = r;
      if (!stato.toccatoTerra && stato.fase === 'volo') {
        stato.toccatoTerra = true;
        stato.fase = 'rotola';
        if (!stato.apertaFoglia) stato.xLancio = g.x;
      }
      if (g.vy < -120) {
        // rimbalzo
        const forza = clamp(-g.vy / 1000, 0, 1);
        g.vy = -g.vy * VOLO.rimbalzo;
        g.vx *= VOLO.frenataRimbalzo;
        g.vrot = g.vx / 45;
        g.schiaccia = 0.5 + forza * 0.5;
        suoni.rimbalzo(forza);
        polvere(g.x, 0, 4 + Math.round(forza * 8));
      } else {
        // scivola sull'erba
        g.vy = 0;
        g.vx = Math.max(0, g.vx - VOLO.strisciata * dt);
        g.vrot = g.vx / 30;
        if (g.vx > 80 && casuale() < dt * 20) polvere(g.x - 10, 0, 1);
        if (g.vx <= 0) { g.rot = arrotondaRot(g.rot); ginoFermo(); }
      }
    }
  }
  // quando si ferma, Gino si raddrizza
  function arrotondaRot(r) { return Math.round(r / (Math.PI * 2)) * Math.PI * 2; }

  function voloFoglia(dt) {
    const g = stato.gino;
    const metri = g.x / PX_M;
    g.slancio *= Math.exp(-dt / FOGLIA.smorza);
    g.vx = crociera(metri) + g.slancio;
    if (g.h > FOGLIA.tetto) {
      // sopra il tetto la foglia plana piano verso il basso
      g.vy = Math.max(g.vy - FOGLIA.gravita * 0.5 * dt, -FOGLIA.planata);
    } else {
      g.vy = Math.max(g.vy - FOGLIA.gravita * dt, -FOGLIA.cadutaMax);
    }
    // correnti d'aria
    for (const c of stato.correnti) {
      if (g.x > c.x && g.x < c.x + c.larg && g.h < FOGLIA.tetto - CORRENTE.finoA) {
        if (!c.sentita) { c.sentita = true; suoni.corrente(); }
        g.vy = Math.min(CORRENTE.max, g.vy + CORRENTE.spinta * dt);
        if (casuale() < dt * 12) aggiungiParticella({ tipo: 'vento', x: g.x + tra(-20, 20), h: g.h - 30, vx: 0, vy: 260, vita: 0.6 });
      }
    }
    g.x += g.vx * dt;
    g.h += g.vy * dt;
    g.rot += (0 - g.rot) * Math.min(1, dt * 8);

    // ostacoli davanti
    while (stato.gen && stato.gen.x < g.x + larg * 1.2) generaProssimo();
    for (const o of stato.ostacoli) {
      if (o.x > g.x + 420) break;
      if (o.entrata && !o.annunciato) { o.annunciato = true; mostraMessaggio('Tunnel di nuvole!', 1.4, '#1f4f6b'); suoni.tappa(); }
    }

    // tappe
    const tp = tappaDi(metri);
    if (tp > stato.tappa) {
      stato.tappa = tp;
      mostraMessaggio(TAPPE[tp].nome, 1.6, '#1f4f6b');
      suoni.tappa();
    }

    // oggetti
    for (const ob of stato.oggetti) {
      if (ob.preso) continue;
      const dx = ob.x - g.x;
      if (dx > 40) break;
      if (dx < -40) continue;
      const dh = hOggetto(ob, stato.tempo) - g.h;
      if (dx * dx + dh * dh < 34 * 34) {
        ob.preso = true;
        if (ob.tipo === 'ghianda') {
          stato.ghiande += 1;
          suoni.ghianda();
          scintille(ob.x, g.h + dh, '#f2c14e');
        } else if (g.foglia === 2) {
          g.foglia = 1;
          mostraMessaggio('Foglia nuova!', 1.1, '#2f6b26');
          suoni.foglia();
          scintille(ob.x, g.h + dh, '#7cc45c');
        } else {
          stato.ghiande += 3;
          mostraMessaggio('+3 ghiande', 0.9, '#a0522d');
          suoni.foglia();
          scintille(ob.x, g.h + dh, '#f2c14e');
        }
      }
    }

    // urti
    if (g.invulnerabile <= 0) {
      for (const o of stato.ostacoli) {
        if (o.x > g.x + 60) break;
        if (urtaOstacolo(o, g, stato.tempo)) {
          if (g.foglia === 1) {
            g.foglia = 2;
            g.invulnerabile = FOGLIA.invulnerabile;
            g.slancio = 0;
            g.tremaT = 0.5;
            g.vy = Math.min(g.vy, 0) * 0.5;
            mostraMessaggio('Foglia strappata!', 1.2, '#a0522d');
            suoni.strappo();
            for (let i = 0; i < 4; i++) aggiungiParticella({ tipo: 'fogliolina', x: g.x, h: g.h + 24, vx: tra(-100, 60), vy: tra(-50, 150), vita: 1.4, rot: tra(0, 6), vrot: tra(-6, 6) });
          } else {
            finisciFoglia('urto');
          }
          return;
        }
      }
    }
    if (g.h <= VOLO.raggio) {
      g.h = VOLO.raggio;
      mostraMessaggio('Atterrato!', 0.9, '#a0522d');
      suoni.rimbalzo(0.6);
      polvere(g.x, 0, 6);
      finisciFoglia('terra');
    }
  }

  function aggiornaCamera(dt) {
    const c = stato.cam;
    const g = stato.gino;
    const base = -380 - (larg - 960) * 0.3;
    let tx = base;
    let th = 0;
    if (['volo', 'foglia', 'rotola', 'fermo', 'fine'].includes(stato.fase) || (stato.fase === 'pausa' && ['volo', 'foglia', 'rotola', 'fermo'].includes(stato.pausaDa))) {
      tx = Math.max(base, g.x - xGino());
      // Gino resta lontano dal bordo in alto
      const margine = stato.fase === 'foglia' || stato.pausaDa === 'foglia' ? 70 : alt * 0.28;
      th = Math.max(0, g.h - (alt - SUOLO - margine));
    }
    // in orizzontale la telecamera segue Gino senza ritardo (gli ostacoli devono essere precisi)
    c.x = stato.fase === 'foglia' ? tx : c.x + (tx - c.x) * Math.min(1, dt * 8);
    c.h += (th - c.h) * Math.min(1, dt * 5);
  }

  // ---------------------------------------------------------------- particelle
  function aggiungiParticella(p) {
    if (stato.particelle.length < 160) stato.particelle.push(p);
  }
  function polvere(x, h, n) {
    for (let i = 0; i < n; i++) {
      aggiungiParticella({ tipo: 'polvere', x: x + tra(-14, 14), h: h + 4, vx: tra(-80, 80), vy: tra(40, 160), vita: tra(0.4, 0.8), r: tra(4, 9) });
    }
  }
  function scintille(x, h, colore) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      aggiungiParticella({ tipo: 'scintilla', x, h, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, vita: 0.45, colore });
    }
  }
  function aggiornaParticelle(dt) {
    for (const p of stato.particelle) {
      p.vita -= dt;
      p.x += p.vx * dt;
      p.h += p.vy * dt;
      if (p.tipo === 'polvere') { p.vy -= 300 * dt; p.r += dt * 8; }
      if (p.tipo === 'fogliolina') { p.vy = Math.max(p.vy - 400 * dt, -90); p.rot += p.vrot * dt; p.vx *= 0.99; }
      if (p.tipo === 'scintilla') { p.vx *= 0.9; p.vy *= 0.9; }
    }
    stato.particelle = stato.particelle.filter((p) => p.vita > 0);
  }

  // ---------------------------------------------------------------- disegno
  // Colori delle tappe: cielo (alto, basso), colline lontane, erba, terra
  const COLORI = [
    { cieloA: '#7cc8f6', cieloB: '#e4f6ff', lontano: '#9fd47c', erba: '#6ab04c', erbaScura: '#4f9a3f', terra: '#8a5a2b' },
    { cieloA: '#6fb4a0', cieloB: '#e2f2d6', lontano: '#4f8a4a', erba: '#4f8a3a', erbaScura: '#3a6e2c', terra: '#5a3a1e' },
    { cieloA: '#3d95e6', cieloB: '#d4ecff', lontano: '#ffffff', erba: '#3e8a3a', erbaScura: '#2d6a2a', terra: '#2d6a2a' },
  ];
  function mescolaColore(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp(pa >> 16, pb >> 16, t));
    const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
    const bl = Math.round(lerp(pa & 255, pb & 255, t));
    return `rgb(${r},${g},${bl})`;
  }
  // pesi delle tappe per i metri dati (passaggio graduale di 60 m)
  function pesiTappe(metri) {
    const pesi = [0, 0, 0];
    const i = tappaDi(metri);
    const dentro = metri - TAPPE[i].da;
    if (i > 0 && dentro < 60) {
      const t = dentro / 60;
      pesi[i] = t; pesi[i - 1] = 1 - t;
    } else pesi[i] = 1;
    return pesi;
  }
  function colore(chiave, pesi) {
    let i = pesi.findIndex((p) => p > 0);
    if (pesi[i] >= 1 || i === pesi.length - 1) return COLORI[i][chiave];
    return mescolaColore(COLORI[i][chiave], COLORI[i + 1][chiave], pesi[i + 1]);
  }

  let cieloCache = null;

  function disegna() {
    const metri = Math.max(0, (stato.cam.x + xGino()) / PX_M);
    const pesi = pesiTappe(metri);
    const conImmagine = pesi.map((p, i) => p > 0 && FONDALI[i].ok);
    disegnaCielo(pesi, conImmagine);
    disegnaLontano(pesi, conImmagine);
    disegnaFondali(pesi, conImmagine);
    disegnaCorrenti();
    disegnaTerreno(pesi);
    disegnaPartenza();
    disegnaOstacoli();
    disegnaOggetti();
    disegnaParticelle(false);
    if (stato.tino) disegnaTino();
    if (stato.gino) disegnaGino();
    disegnaParticelle(true);
    disegnaIndicazioni();
    disegnaMessaggi();
  }

  function disegnaCielo(pesi, conImmagine) {
    const gr = ctx.createLinearGradient(0, 0, 0, alt);
    gr.addColorStop(0, colore('cieloA', pesi));
    gr.addColorStop(1, colore('cieloB', pesi));
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, larg, alt);
    // con i fondali dipinti, sole e nuvolette sono già nel disegno
    if (pesi.every((p, i) => p === 0 || conImmagine[i])) return;
    // sole
    ctx.fillStyle = 'rgba(255, 236, 140, 0.9)';
    ctx.beginPath();
    ctx.arc(larg - 90, 80 + stato.cam.h * 0.05, 38, 0, Math.PI * 2);
    ctx.fill();
    // nuvolette lontane (si muovono piano)
    const par = 0.08;
    const passo = 420;
    const ox = stato.cam.x * par;
    const primo = Math.floor(ox / passo) - 1;
    for (let i = primo; i < primo + Math.ceil(larg / passo) + 3; i++) {
      const x = i * passo - ox + hash(i) * 200;
      const y = 60 + hash(i + 7) * (alt * 0.4) + stato.cam.h * 0.15;
      nuvola(x, y, 0.6 + hash(i + 3) * 0.6, 'rgba(255, 255, 255, 0.75)');
    }
  }

  function nuvola(x, y, k, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, 26 * k, 0, Math.PI * 2);
    ctx.arc(x + 30 * k, y - 12 * k, 32 * k, 0, Math.PI * 2);
    ctx.arc(x + 64 * k, y, 24 * k, 0, Math.PI * 2);
    ctx.rect(x, y - 4 * k, 64 * k, 28 * k);
    ctx.fill();
  }

  // Fondali dipinti: affiancati (uno sì e uno specchiato, così i bordi
  // combaciano), scorrono piano con la telecamera; tra una tappa e l'altra sfumano.
  function disegnaFondali(pesi, conImmagine) {
    let primo = true;
    pesi.forEach((peso, i) => {
      if (!conImmagine[i]) return;
      const im = FONDALI[i];
      const hd = alt * 1.2;
      const wd = im.naturalWidth * hd / im.naturalHeight;
      const fondo = alt - SUOLO + 24 + stato.cam.h * 0.2;
      const cima = fondo - hd;
      ctx.globalAlpha = primo ? 1 : peso;
      primo = false;
      if (cima > 0) {
        const col = coloreCima(im);
        if (col) { ctx.fillStyle = col; ctx.fillRect(0, 0, larg, cima + 1); }
      }
      const ox = (stato.cam.x - (-420)) * PARALLASSE_FONDALE;
      const n0 = Math.floor(ox / wd);
      for (let n = n0; n * wd - ox < larg; n++) {
        const x = n * wd - ox;
        ctx.save();
        if (n % 2) { ctx.translate(x + wd, cima); ctx.scale(-1, 1); } else ctx.translate(x, cima);
        ctx.drawImage(im, 0, 0, wd + 1, hd);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    });
  }

  function disegnaLontano(pesi, conImmagine) {
    const base = sy(0);
    pesi = pesi.map((p, i) => (conImmagine[i] ? 0 : p));
    // prato: colline morbide
    if (pesi[0] > 0) {
      ctx.globalAlpha = pesi[0];
      ctx.fillStyle = COLORI[0].lontano;
      const ox = stato.cam.x * 0.25;
      ctx.beginPath();
      ctx.moveTo(0, base);
      for (let x = 0; x <= larg + 20; x += 20) {
        const w = x + ox;
        ctx.lineTo(x, base - 70 - 40 * Math.sin(w / 260) - 25 * Math.sin(w / 97 + 1) + stato.cam.h * 0.25);
      }
      ctx.lineTo(larg, base);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // bosco: alberi lontani
    if (pesi[1] > 0) {
      ctx.globalAlpha = pesi[1] * 0.5;
      const ox = stato.cam.x * 0.35;
      const passo = 70;
      const primo = Math.floor(ox / passo) - 1;
      for (let i = primo; i < primo + larg / passo + 3; i++) {
        const x = i * passo - ox;
        const hh = 100 + hash(i) * 90;
        const y = base + stato.cam.h * 0.35;
        ctx.fillStyle = '#3c2a18';
        ctx.fillRect(x - 6, y - hh * 0.5, 12, hh * 0.5);
        ctx.fillStyle = hash(i + 1) > 0.5 ? '#3f7a3a' : '#356a33';
        ctx.beginPath();
        ctx.ellipse(x, y - hh * 0.62, 40 + hash(i + 2) * 20, hh * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // cielo: grandi nuvole sotto e il mare di chiome
    if (pesi[2] > 0) {
      ctx.globalAlpha = pesi[2];
      const ox = stato.cam.x * 0.2;
      const passo = 260;
      const primo = Math.floor(ox / passo) - 1;
      for (let i = primo; i < primo + larg / passo + 3; i++) {
        const x = i * passo - ox;
        nuvola(x, base - 60 - hash(i + 11) * 80 + stato.cam.h * 0.2, 1.4 + hash(i) * 0.8, 'rgba(255, 255, 255, 0.85)');
      }
      ctx.globalAlpha = 1;
    }
  }

  function disegnaTerreno(pesi) {
    const y0 = sy(0);
    if (y0 > alt + 10) return;
    ctx.fillStyle = colore('terra', pesi);
    ctx.fillRect(0, y0, larg, alt - y0 + 2);
    ctx.fillStyle = colore('erba', pesi);
    ctx.fillRect(0, y0 - 4, larg, 16);
    ctx.fillStyle = colore('erbaScura', pesi);
    ctx.fillRect(0, y0 + 12, larg, 4);
    // decorazioni a caselle (fiori, funghi, chiome)
    const passo = 46;
    const primo = Math.floor(stato.cam.x / passo) - 1;
    for (let i = primo; i < primo + larg / passo + 3; i++) {
      const x = i * passo - stato.cam.x + hash(i) * 30;
      const r = hash(i + 101);
      const metri = (i * passo) / PX_M;
      const tp = tappaDi(Math.max(0, metri));
      if (tp === 0) {
        // ciuffi d'erba e fiori
        ctx.strokeStyle = COLORI[0].erbaScura;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y0); ctx.lineTo(x - 4, y0 - 10);
        ctx.moveTo(x + 3, y0); ctx.lineTo(x + 5, y0 - 12);
        ctx.stroke();
        if (r > 0.55) {
          const fc = ['#ffd83a', '#f59ac0', '#ffffff', '#b98cf2'][Math.floor(hash(i + 5) * 4)];
          ctx.strokeStyle = '#3f8a35';
          ctx.beginPath(); ctx.moveTo(x + 12, y0); ctx.lineTo(x + 12, y0 - 18); ctx.stroke();
          ctx.fillStyle = fc;
          ctx.beginPath(); ctx.arc(x + 12, y0 - 20, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#f5c518';
          ctx.beginPath(); ctx.arc(x + 12, y0 - 20, 2, 0, Math.PI * 2); ctx.fill();
        }
      } else if (tp === 1) {
        if (r > 0.6) {
          // funghetto
          ctx.fillStyle = '#f3e6cf';
          ctx.fillRect(x + 8, y0 - 12, 6, 12);
          ctx.fillStyle = r > 0.8 ? '#d9473a' : '#b9773a';
          ctx.beginPath(); ctx.ellipse(x + 11, y0 - 12, 11, 7, 0, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(x + 7, y0 - 15, 1.6, 0, Math.PI * 2); ctx.arc(x + 14, y0 - 16, 1.6, 0, Math.PI * 2); ctx.fill();
        } else if (r > 0.3) {
          ctx.fillStyle = '#8f8a7a';
          ctx.beginPath(); ctx.ellipse(x + 10, y0 + 2, 9, 6, 0, Math.PI, 0); ctx.fill();
        }
      } else {
        // chiome degli alberi
        ctx.fillStyle = r > 0.5 ? '#4f9a3f' : '#3e8a3a';
        ctx.beginPath(); ctx.arc(x + 10, y0 + 4, 22 + r * 10, Math.PI, 0); ctx.fill();
      }
    }
  }

  function disegnaPartenza() {
    if (stato.cam.x > 400) return;
    const c = ALTALENA.ceppo;
    // la grande quercia sullo sfondo
    const qx = sx(-620), qy = sy(0);
    ctx.fillStyle = '#6b4424';
    ctx.beginPath();
    ctx.moveTo(qx - 40, qy); ctx.lineTo(qx - 26, qy - 260); ctx.lineTo(qx + 26, qy - 260); ctx.lineTo(qx + 40, qy);
    ctx.fill();
    ctx.fillStyle = '#3f8a35';
    for (const [dx, dy, r] of [[-70, -300, 90], [60, -310, 95], [0, -380, 100], [-120, -240, 60], [120, -250, 60]]) {
      ctx.beginPath(); ctx.arc(qx + dx, qy + dy, r, 0, Math.PI * 2); ctx.fill();
    }
    // ceppo
    const cx = sx(c.x), cy = sy(c.h);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(cx - c.larg / 2, cy, c.larg, sy(0) - cy);
    ctx.fillStyle = '#d9a86a';
    ctx.beginPath(); ctx.ellipse(cx, cy, c.larg / 2, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a8763e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, c.larg / 4, 5, 0, 0, Math.PI * 2); ctx.stroke();
    // sasso del perno
    const p = ALTALENA.perno;
    ctx.fillStyle = '#9a9384';
    ctx.beginPath();
    ctx.moveTo(sx(p.x - 32), sy(0) + 2);
    ctx.quadraticCurveTo(sx(p.x - 28), sy(p.h + 6), sx(p.x), sy(p.h + 2));
    ctx.quadraticCurveTo(sx(p.x + 28), sy(p.h + 6), sx(p.x + 32), sy(0) + 2);
    ctx.fill();
    // asse
    const ang = Math.atan(ALTALENA.pendenza * stato.asse);
    ctx.save();
    ctx.translate(sx(p.x), sy(p.h + ALTALENA.spessore / 2));
    ctx.rotate(ang);
    ctx.fillStyle = '#c98a3c';
    arrotondato(-ALTALENA.mezza, -ALTALENA.spessore / 2, ALTALENA.mezza * 2, ALTALENA.spessore + 3, 4);
    ctx.fill();
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
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

  function disegnaCorrenti() {
    for (const c of stato.correnti) {
      const x = sx(c.x);
      if (x > larg || x + c.larg < 0) continue;
      const top = sy(FOGLIA.tetto + 40), bot = sy(0);
      const gr = ctx.createLinearGradient(0, top, 0, bot);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(255,255,255,0.35)');
      ctx.fillStyle = gr;
      ctx.fillRect(x, top, c.larg, bot - top);
      // riccioli di vento che salgono
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const yy = bot - ((stato.tempo * 220 + i * 90) % (bot - top));
        const xx = x + 20 + (i * 47) % (c.larg - 40);
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.quadraticCurveTo(xx + 12, yy - 14, xx, yy - 28);
        ctx.stroke();
      }
    }
  }

  // Ostacoli: forme diverse per tappa, ma l'urto è sempre il rettangolo
  function disegnaOstacoli() {
    for (const o of stato.ostacoli) {
      const x = sx(o.x);
      if (x > larg + 50 || x + o.w < -50) continue;
      const c = centroOstacolo(o, stato.tempo);
      const yBasso = sy(c - o.varco / 2); // cima dell'ostacolo dal basso
      const yAlto = sy(c + o.varco / 2);  // fondo dell'ostacolo dall'alto
      const yTerra = sy(0) + 4;
      if (o.forma === 'disegno') {
        const coppia = COPPIE[o.tappa];
        disegnaSprite(coppia.basso, x + o.w / 2, yBasso, yTerra);
        disegnaSprite(coppia.alto, x + o.w / 2, yAlto, yTerra);
      } else if (o.forma === 'nuvole') {
        for (const q of nuvoleRel(o)) {
          const y = sy(q.h + c);
          if (y < -q.hh || y > alt + q.hh || !q.im) continue;
          ctx.save();
          ctx.translate(sx(q.x), y);
          if (q.giro) ctx.scale(-1, 1);
          ctx.drawImage(q.im, -q.ww / 2, -q.hh / 2, q.ww, q.hh);
          ctx.restore();
        }
      } else if (o.tappa === 0) {
        steloFiore(x, o.w, yBasso, yTerra, o.seme);
        ramoAlto(x, o.w, yAlto, o.seme, '#7a4a22', '#5aa845');
      } else if (o.tappa === 1) {
        tronco(x, o.w, yBasso, yTerra, o.seme);
        ramoAlto(x, o.w, yAlto, o.seme, '#5a3a1e', '#3f7a3a', true);
      } else {
        nuvolone(x, o.w, yBasso, yTerra + 40, true, o.seme);
        nuvolone(x, o.w, -40, yAlto, false, o.seme);
      }
    }
  }

  // Un ostacolo dipinto: la parte bella intera, poi la riga 'ripeti' allungata
  // fino a terra (verso 'su') o fino in cima allo schermo (verso 'giu').
  // Striscia di fusto da ripetere: una riga presa a metà della parte liscia (lontano
  // dai bordi trasparenti), copiata 64 volte su una tela a parte. Stirare una riga
  // sola direttamente dal PNG la faceva venire mezza trasparente sugli schermi densi.
  function strisciaFusto(nome) {
    const S = SPRITE[nome];
    if (S.striscia) return S.striscia;
    const im = IMG_OST[nome];
    const riga = Math.round(S.h * (S.verso === 'su' ? 0.72 : 0.25));
    const c = document.createElement('canvas');
    c.width = S.w; c.height = 64;
    const k = c.getContext('2d');
    for (let y = 0; y < 64; y++) k.drawImage(im, 0, riga, S.w, 1, 0, y, S.w, 1);
    S.striscia = c;
    return c;
  }

  function disegnaSprite(nome, cx, yBordo, yTerra) {
    const S = SPRITE[nome];
    const im = IMG_OST[nome];
    const k = S.largo / S.w;
    const x0 = cx - S.largo / 2;
    const fusto = strisciaFusto(nome);
    const passo = 64 * k;
    ctx.save();
    if (S.verso === 'su') {
      ctx.beginPath(); ctx.rect(x0 - 10, -10, S.largo + 20, yTerra + 10); ctx.clip();
      const yS = yBordo + S.ripeti * k;
      for (let y = yS - 1; y < yTerra; y += passo - 1) ctx.drawImage(fusto, x0, y, S.largo, passo);
      ctx.drawImage(im, 0, 0, S.w, S.ripeti, x0, yBordo, S.largo, S.ripeti * k);
    } else {
      const hb = (S.h - S.ripeti) * k;
      const yS = yBordo - hb;
      for (let y = yS + 1 - passo; y > -passo; y -= passo - 1) ctx.drawImage(fusto, x0, y, S.largo, passo);
      ctx.drawImage(im, 0, S.ripeti, S.w, S.h - S.ripeti, x0, yS, S.largo, hb);
    }
    ctx.restore();
  }

  function steloFiore(x, w, yCima, yTerra, seme) {
    const cx = x + w / 2;
    ctx.fillStyle = '#3f8a35';
    ctx.fillRect(cx - 9, yCima + 16, 18, yTerra - yCima);
    // foglie lungo lo stelo
    ctx.fillStyle = '#5aa845';
    for (let y = yCima + 60; y < yTerra - 20; y += 70) {
      const lato = ((y / 70 + seme) % 2 < 1) ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(cx + lato * 22, y, 22, 8, lato * -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // corolla
    const colori = ['#ffd83a', '#f59ac0', '#ff9d4a', '#b98cf2'];
    ctx.fillStyle = colori[seme % 4];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * w * 0.32, yCima + 14 + Math.sin(a) * w * 0.32, w * 0.2, w * 0.13, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#7a4a22';
    ctx.beginPath(); ctx.arc(cx, yCima + 14, w * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5c3517';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx - 8 + (i * 7) % 18, yCima + 10 + (i * 5) % 10, 2, 0, Math.PI * 2); ctx.fill(); }
  }

  function ramoAlto(x, w, yFondo, seme, legno, foglie, muschio) {
    if (yFondo < -20) return;
    ctx.fillStyle = legno;
    ctx.fillRect(x + w * 0.2, -10, w * 0.6, yFondo + 10 - 18);
    // nodi del legno
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    for (let y = yFondo - 60; y > -10; y -= 55) {
      ctx.beginPath(); ctx.moveTo(x + w * 0.3, y); ctx.lineTo(x + w * 0.55, y - 8); ctx.stroke();
    }
    // ciuffo di foglie in fondo
    ctx.fillStyle = foglie;
    ctx.beginPath();
    ctx.arc(x + w * 0.3, yFondo - 22, w * 0.3, 0, Math.PI * 2);
    ctx.arc(x + w * 0.7, yFondo - 24, w * 0.32, 0, Math.PI * 2);
    ctx.arc(x + w * 0.5, yFondo - 12, w * 0.3, 0, Math.PI * 2);
    ctx.fill();
    if (muschio) {
      ctx.strokeStyle = '#8fbf6a';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const xx = x + w * (0.25 + i * 0.25);
        ctx.beginPath(); ctx.moveTo(xx, yFondo - 14); ctx.lineTo(xx + 3, yFondo + 6 - (seme + i) % 3 * 4); ctx.stroke();
      }
    }
  }

  function tronco(x, w, yCima, yTerra, seme) {
    ctx.fillStyle = '#6b4424';
    ctx.fillRect(x, yCima + 6, w, yTerra - yCima);
    ctx.fillStyle = '#5a3a1e';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 10 + i * (w - 24) / 2, yCima + 20, 4, yTerra - yCima - 20);
    // cima tagliata
    ctx.fillStyle = '#d9a86a';
    ctx.beginPath(); ctx.ellipse(x + w / 2, yCima + 6, w / 2, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a8763e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x + w / 2, yCima + 6, w / 4, 4, 0, 0, Math.PI * 2); ctx.stroke();
    // funghetti sul fianco
    if (seme % 3 === 0) {
      ctx.fillStyle = '#e7c48a';
      ctx.beginPath(); ctx.ellipse(x + w, yCima + 80, 14, 6, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + w, yCima + 100, 10, 5, 0, Math.PI, 0); ctx.fill();
    }
  }

  function nuvolone(x, w, yA, yB, dalBasso, seme) {
    // nuvola temporalesca: corpo grigio con bordi gonfi, più chiara dal lato del varco
    const yBordo = dalBasso ? yA + 18 : yB - 18;
    ctx.fillStyle = '#7f8b9c';
    ctx.fillRect(x + 6, Math.min(yA, yB), w - 12, Math.abs(yB - yA));
    for (let y = dalBasso ? yA + 50 : yB - 50; dalBasso ? y < yB : y > yA; y += dalBasso ? 46 : -46) {
      const k = ((Math.floor(y / 46) + seme) % 2) ? 1 : -1;
      ctx.beginPath(); ctx.arc(x + (k > 0 ? 14 : w - 14), y, 12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#a3afbf';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + w * (0.2 + i * 0.3), yBordo, w * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#c3ccd8';
    ctx.beginPath(); ctx.arc(x + w * 0.35, yBordo + (dalBasso ? -6 : 6), w * 0.12, 0, Math.PI * 2); ctx.fill();
    // ogni tanto un lampo
    if (seme % 4 === 0 && Math.sin(stato.tempo * 3 + seme) > 0.7) {
      ctx.strokeStyle = '#ffe14a';
      ctx.lineWidth = 3;
      const yy = dalBasso ? yA + 50 : yB - 80;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, yy); ctx.lineTo(x + w * 0.4, yy + 14); ctx.lineTo(x + w * 0.55, yy + 18); ctx.lineTo(x + w * 0.45, yy + 34);
      ctx.stroke();
    }
  }

  function disegnaOggetti() {
    for (const ob of stato.oggetti) {
      if (ob.preso) continue;
      const x = sx(ob.x);
      if (x < -40 || x > larg + 40) continue;
      const y = sy(hOggetto(ob, stato.tempo)) + Math.sin(stato.tempo * 4 + ob.x) * 3;
      if (ob.tipo === 'ghianda') {
        if (imgGhianda.complete && imgGhianda.naturalWidth) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.sin(stato.tempo * 3 + ob.x) * 0.2);
          ctx.drawImage(imgGhianda, -12, -14, 24, 28);
          ctx.restore();
        }
      } else {
        // foglia nuova che brilla
        ctx.fillStyle = 'rgba(255, 255, 200, 0.5)';
        ctx.beginPath(); ctx.arc(x, y, 26 + Math.sin(stato.tempo * 6) * 3, 0, Math.PI * 2); ctx.fill();
        if (!disegnaAliante(x, y + 18, 0.5, Math.sin(stato.tempo * 2) * 0.2, false)) disegnaFoglia(x, y, 0.55, Math.sin(stato.tempo * 2) * 0.3, false);
      }
    }
  }

  // la foglia-aliante dipinta: (x, y) è il punto del manubrio; false se il disegno non c'è
  function disegnaAliante(x, y, k, rot, strappata) {
    const im = strappata && ALIANTE.strappato.ok ? ALIANTE.strappato : ALIANTE.intero;
    if (!im.ok) return false;
    const w = 150 * k;
    const h = w * im.naturalHeight / im.naturalWidth;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (strappata && im === ALIANTE.intero) ctx.filter = 'sepia(0.6) saturate(0.7)';
    ctx.drawImage(im, -w / 2, -h, w, h);
    ctx.restore();
    return true;
  }

  // la foglia: k scala, rot rotazione, strappata = con un morso mancante
  function disegnaFoglia(x, y, k, rot, strappata) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(k, k);
    ctx.fillStyle = strappata ? '#a7b84a' : '#5aa845';
    ctx.strokeStyle = strappata ? '#6b7a2a' : '#2f6b26';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-58, 4);
    ctx.bezierCurveTo(-40, -30, 40, -30, 58, 4);
    if (strappata) {
      ctx.lineTo(40, 4); ctx.lineTo(30, -8); ctx.lineTo(18, 6);
    }
    ctx.bezierCurveTo(30, 12, -30, 12, -58, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // nervature
    ctx.beginPath();
    ctx.moveTo(-56, 4); ctx.quadraticCurveTo(0, -10, 54, 2);
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      ctx.moveTo(i * 13, -4 + Math.abs(i));
      ctx.lineTo(i * 13 + (i > 0 ? 10 : -10), -16 + Math.abs(i) * 2);
    }
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // picciolo
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, 30); ctx.stroke();
    ctx.restore();
  }

  function disegnaTino() {
    const t = stato.tino;
    const x = sx(t.x), y = sy(t.h);
    if (x < -150 || x > larg + 150) return;
    const im = immagini[t.faccia] || immagini.normale;
    if (!im.complete || !im.naturalWidth) return;
    const altezza = t.faccia === 'ko' ? 74 : 120;
    const w = altezza * im.naturalWidth / im.naturalHeight;
    let sq = t.schiaccia;
    let saltino = 0;
    if (t.festa && stato.fase !== 'mancato') {
      // Tino fa il tifo mentre Gino vola
      const f = (t.saltoT % 0.5) / 0.5;
      saltino = Math.sin(f * Math.PI) * 10;
    }
    ctx.save();
    ctx.translate(x, y - saltino);
    if (stato.fase === 'salto' || stato.fase === 'schianto') ctx.rotate(stato.fase === 'schianto' ? 0.08 : -0.06);
    ctx.scale(1 + sq * 0.12, 1 - sq * 0.16);
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(im, -w / 2, -altezza, w, altezza);
    ctx.restore();
  }

  function disegnaGino() {
    const g = stato.gino;
    const x = sx(g.x);
    let y = sy(g.h);
    const im = immagini.gino;
    if (!im.complete || !im.naturalWidth) return;
    const altezza = 58;
    const w = altezza * im.naturalWidth / im.naturalHeight;
    if (g.saltoT > 0) y -= Math.sin((1 - (g.saltoT % 0.6) / 0.6) * Math.PI) * 16;
    let tremito = g.tremaT > 0 ? Math.sin(stato.tempo * 70) * 4 * (g.tremaT / 0.5) : 0;
    ctx.save();
    if (g.invulnerabile > 0 && Math.floor(stato.tempo * 12) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.translate(x + tremito, y);
    if (g.foglia) {
      // la foglia sopra la testa, tenuta come un aquilone
      const apre = g.fogliaApre;
      const battito = g.battito;
      ctx.save();
      ctx.rotate(g.inclina * 0.6);
      const k = (0.4 + 0.6 * apre) * (1 - battito * 0.1);
      if (!disegnaAliante(0, -altezza / 2 + 6 + battito * 5, k, Math.sin(stato.tempo * 5) * 0.04, g.foglia === 2)) {
        disegnaFoglia(0, -altezza * 0.55 - 14 + battito * 6, (0.3 + 0.45 * apre) * (1 - battito * 0.12), Math.sin(stato.tempo * 5) * 0.05, g.foglia === 2);
      }
      ctx.restore();
    }
    const rot = g.foglia ? g.inclina : g.rot;
    ctx.rotate(rot);
    const sq = g.schiaccia;
    ctx.scale(1 + sq * 0.25, 1 - sq * 0.25);
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(im, -w / 2, -altezza / 2 - 4, w, altezza);
    ctx.restore();
  }

  function disegnaParticelle(sopra) {
    for (const p of stato.particelle) {
      const davanti = p.tipo === 'scintilla' || p.tipo === 'fogliolina';
      if (davanti !== sopra) continue;
      const x = sx(p.x), y = sy(p.h);
      if (p.tipo === 'polvere') {
        ctx.fillStyle = `rgba(230, 210, 170, ${clamp(p.vita * 1.2, 0, 0.7)})`;
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
      } else if (p.tipo === 'scintilla') {
        ctx.fillStyle = p.colore;
        ctx.globalAlpha = clamp(p.vita * 2.5, 0, 1);
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.tipo === 'fogliolina') {
        ctx.globalAlpha = clamp(p.vita, 0, 1);
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot);
        ctx.fillStyle = '#5aa845';
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (p.tipo === 'vento') {
        ctx.strokeStyle = `rgba(255,255,255,${clamp(p.vita, 0, 0.8)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke();
      }
    }
  }

  // Suggerimenti sul da farsi, scritti in basso
  function disegnaIndicazioni() {
    const azione = touch ? 'Tocca' : 'Spazio o clic';
    let testo = '';
    const g = stato.gino;
    if (stato.fase === 'pronto') {
      testo = `${azione}: Tino salta (più in alto se parte dalla cima del saltello)`;
    } else if (stato.fase === 'salto') {
      testo = `${azione} quando Tino è sopra la punta dell'asse!`;
      // freccia sulla punta
      const px = sx(-TINO.punta - 13), py = sy(superficie(-TINO.punta - 13, 1)) - 12 - Math.abs(Math.sin(stato.tempo * 8)) * 8;
      ctx.fillStyle = '#ffd84a';
      ctx.strokeStyle = '#7a4a22';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 10, py - 14); ctx.lineTo(px + 10, py - 14); ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (stato.fase === 'volo') {
      const inCima = Math.abs(g.vy) < FOGLIA.apice && g.h > 200;
      testo = inCima ? `In cima! ${azione}: apri la foglia` : `${azione}: apri la foglia (meglio in cima al volo)`;
      if (inCima) {
        ctx.strokeStyle = 'rgba(255, 236, 140, 0.9)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(sx(g.x), sy(g.h), 44 + Math.sin(stato.tempo * 12) * 4, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (stato.fase === 'foglia' && g.x - stato.xLancio < 1400) {
      testo = `${azione}: colpo d'ala (Gino sale). Evita rami e ostacoli!`;
    } else if (stato.fase === 'foglia' && g.h > FOGLIA.tetto) {
      testo = 'Troppo in alto: la foglia plana';
    }
    if (!testo) return;
    ctx.save();
    ctx.font = `600 ${verticale ? 17 : 19}px Fredoka, "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = alt - 20;
    const w = Math.min(larg - 20, ctx.measureText(testo).width + 28);
    ctx.fillStyle = 'rgba(20, 50, 70, 0.6)';
    arrotondato(larg / 2 - w / 2, y - 15, w, 30, 15);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(testo, larg / 2, y, larg - 40);
    ctx.restore();
  }

  function disegnaMessaggi() {
    // le scritte stanno dalla parte opposta a Gino, per non coprirlo
    const yGino = stato.gino ? sy(stato.gino.h) : alt;
    const yBase = yGino < alt * 0.45 ? alt * 0.55 : alt * 0.2;
    stato.messaggi.forEach((m, i) => {
      const t = m.t / m.durata;
      const alfa = t < 0.15 ? t / 0.15 : t > 0.75 ? (1 - t) / 0.25 : 1;
      const k = 1 + 0.15 * Math.max(0, 1 - t * 6);
      ctx.save();
      ctx.globalAlpha = clamp(alfa, 0, 1);
      ctx.translate(larg / 2, yBase + i * 56 - t * 14);
      ctx.scale(k, k);
      ctx.font = `700 ${verticale ? 38 : 46}px Fredoka, "Trebuchet MS", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 9;
      ctx.strokeStyle = m.colore;
      ctx.strokeText(m.testo, 0, 0);
      ctx.fillStyle = '#fff8ec';
      ctx.fillText(m.testo, 0, 0);
      ctx.restore();
    });
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
    const az = touch ? '<b>tocca</b>' : '<kbd>Spazio</kbd> o clic';
    return `<div class="comandi">
      <p>Un solo comando per tutto: ${az}.</p>
      <ol>
        <li><b>Salto:</b> Tino saltella sul ceppo; ${az} per farlo saltare.</li>
        <li><b>Lancio:</b> ${az} quando Tino è sopra la punta dell'asse: piomba giù e lancia Gino. Troppo presto e la manca!</li>
        <li><b>Foglia:</b> ${az} mentre Gino vola per aprire la foglia: in cima al volo è meglio.</li>
        <li><b>Colpi d'ala:</b> ogni ${touch ? 'tocco' : 'colpo'} lo fa salire. Il primo urto strappa la foglia, il secondo chiude il volo. Le foglie nuove la riparano, le correnti d'aria lo spingono su.</li>
      </ol>
      ${touch ? '' : '<p><kbd>P</kbd> pausa · <kbd>M</kbd> tutti i suoni · <kbd>N</kbd> solo la musica</p>'}
    </div>`;
  }

  function pannelloMenu() {
    const rec = record > 0 ? `<p class="record">Il tuo record: <b>${record} m</b>${recordGhiande ? ` · più ghiande in un volo: ${recordGhiande}` : ''}</p>` : '';
    return `<div class="riquadro">
      <div class="ritratti">${img('normale', 'salta')}${img('gino', 'gino vola')}</div>
      <h1>Gino Volante</h1>
      <p>Tino lancia Gino con l'altalena e Gino vola più lontano che può, poi apre la foglia e continua a colpi d'ala sopra il prato, nel bosco e fino in cielo!</p>
      ${rec}
      <div class="scelte">
        <button class="bottone" data-azione="gioca" data-primo>Gioca</button>
      </div>
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
    </div>`;
  }

  function pannelloFine() {
    const r = stato.risultato;
    let ritratti, titolo, testo;
    if (r.mancato) {
      ritratti = `${img('ko')}${img('gino', 'gino salta')}`;
      titolo = 'Tino ha mancato l\'asse!';
      testo = 'Gino ride ancora sull\'altalena. Aspetta che Tino sia proprio sopra la punta.';
    } else if (r.nuovo && r.metri > 0) {
      ritratti = `${img('normale', 'salta')}${img('gino', 'gino salta')}`;
      titolo = 'Nuovo record!';
      testo = '';
    } else if (!r.foglia) {
      ritratti = `${img(r.corto ? 'arrabbiato' : 'normale')}${img('gino', 'gino salta')}`;
      titolo = 'Gino è atterrato';
      testo = 'La prossima volta apri la foglia mentre vola: si va molto più lontano!';
    } else if (r.corto) {
      ritratti = `${img('arrabbiato')}${img('gino', 'gino salta')}`;
      titolo = 'Che volo!';
      testo = 'Il lancio era un po\' corto: premi quando Tino è sopra la punta dell\'asse.';
    } else {
      ritratti = `${img('normale', 'salta')}${img('gino', 'gino salta')}`;
      titolo = 'Che volo!';
      testo = '';
    }
    const dettagli = r.mancato ? '' : r.foglia
      ? `Lancio ${r.lancio} m · con la foglia ${Math.max(0, r.metri - r.lancio)} m`
      : 'Solo lancio, senza foglia';
    const gh = r.ghiande ? ` · ${r.ghiande} ${r.ghiande === 1 ? 'ghianda' : 'ghiande'}` : '';
    return `<div class="riquadro">
      <div class="ritratti">${ritratti}</div>
      <h2>${titolo}</h2>
      <div class="risultato">${r.metri} m</div>
      <p class="dettagli">${dettagli}${gh}</p>
      ${testo ? `<p>${testo}</p>` : ''}
      <p class="record">Record: ${record} m · ghiande raccolte in tutto: ${ghiandeTotali}</p>
      <div class="scelte">
        <button class="bottone" data-azione="gioca" data-primo>Lancia ancora</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  pannello.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-azione]');
    if (!btn) return;
    switch (btn.dataset.azione) {
      case 'gioca': avvia(); break;
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
    disegna();
    requestAnimationFrame(ciclo);
  }
  requestAnimationFrame(ciclo);

  // utile per le prove automatiche
  window.ginoVolante = {
    stato, avvia, premi, aggiorna, musica, finisci, superficie, centroOstacolo, urtaOstacolo, nuvoleDi, sagoma, crociera,
    ALTALENA, TINO, LANCIO, VOLO, FOGLIA, OSTACOLI, CURVE, curva, CORRENTE, PX_M,
  };
})();
