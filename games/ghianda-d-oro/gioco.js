/* Tino e la Ghianda d'Oro: avventura a schermate fisse.
   Tutta la logica è qui; i livelli sono in livelli.js. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- tabelle
  const T = 60;                       // lato di un quadretto
  const COL = 16, RIG = 9;            // quadretti per stanza
  const L = COL * T, A = RIG * T;     // 960 × 540: una stanza = uno schermo

  const FISICA = {
    gravita: 2300,
    cadutaMax: 1000,
    vel: 250,          // velocità di corsa
    accTerra: 2400,
    accAria: 1400,
    attrito: 2800,
    salto: 610,        // ~1,3 quadretti di altezza; con l'aggancio ai bordi si sale di 2
    coyote: 0.1,       // si può ancora saltare per un attimo dopo aver lasciato il bordo
    bufferSalto: 0.12,
    cadutaDanno: 4.6 * T,
  };
  const FRUSTA = {
    portata: 260,      // distanza massima dal piolo per agganciarsi
    cordaMin: 50,
    cordaMax: 320,
    velCorda: 170,     // ↑ accorcia, ↓ allunga la frusta mentre si dondola
    omegaMax: 7,
    schiocco: 150,     // lunghezza del colpo di frusta senza piolo
    durataSchiocco: 0.24,
    ricarica: 0.3,
    ricaricaStacco: 0.1, // dopo lo stacco si può riagganciare quasi subito
    spinta: 3.2,       // slancio con ← → mentre si dondola
    smorzamento: 0.12,
    staccoSalto: 220,  // spinta in alto staccandosi con il salto
  };
  const AGENTI = {
    ronda: 70,
    inseguimento: 165,
    vista: 5 * T,
    stordito: 3.5,
    festa: 1.2,
    lancio: 2.4,       // secondi tra due bollette
    tiro: 6 * T,       // l'agente col timbro lancia se Tino è entro questa distanza...
    tiroAltezza: 2.5 * T, // ...e più o meno alla sua altezza
    volo: 1.0,
    gravitaBolletta: 900,
  };
  const VITA = { iniziali: 3, massimo: 6, invulnerabile: 1.6, ferito: 0.9 };
  const TINO = { w: 34, h: 70, alto: 86, palmo: { x: 19, y: -32 } };
  const CREPA = { trema: 0.6, ritorno: 6 };
  // Robivecchi: premi nascosti nei punti difficili (nella mappa con le cifre 1-5)
  const ROBIVECCHI = {
    1: { nome: 'Moneta', file: 'moneta' },
    2: { nome: 'Bottone', file: 'bottone' },
    3: { nome: 'Graffetta', file: 'graffetta' },
    4: { nome: 'Fiocco', file: 'fiocco' },
    5: { nome: 'Carta di credito scaduta', file: 'carta-scaduta' },
    6: { nome: 'Tappo a corona', file: 'tappo' },
    7: { nome: 'Biglia', file: 'biglia' },
  };
  const PORTA = { tempo: 6, apre: 2.5, chiude: 0.9 };
  // Trappole a tempo (secondi)
  const CESOIE = { aperte: 1.4, chiude: 0.12, chiuse: 0.48, apre: 0.2, sfasa: 0.7 };
  const SPUNTONI = { periodo: 2.4, su: 1.1, avviso: 0.35 };
  const STALATTITI = { vista: 110, trema: 0.35, gravita: 2000, ritorno: 5 };
  // Ispettore capo: non si stordisce, insegue Tino di stanza in stanza e va seminato
  const CAPO = {
    vel: 220,          // più lento di Tino (250), ma non si ferma davanti alle trappole
    salto: 720,        // sale su gradini di un quadretto...
    velSalto: 240,     // ...e salta buchi larghi al massimo due quadretti
    sveglia: 0.8,      // secondi tra il risveglio e l'inseguimento
    risveglio: 2.5 * T, // si sveglia quando Tino lo supera di tanto così
    ahi: 0.6,          // la frusta (o una trappola) lo ferma per un attimo...
    immune: 1.4,       // ...poi per un po' non si ferma più
    festa: 1.4,        // dopo aver preso Tino
    festaTrappola: 2.2, // se Tino cade in una trappola vicino a lui, ride e aspetta
    caduta: 2.5,       // se cade in un baratro ricompare dopo un po'
    arriva: 4,         // ripartendo da un punto di partenza, arriva dopo tanto così
    pesante: 0.3,      // il pavimento crepato sotto di lui crolla prima
    megafono: { ogni: 3.6, carica: 0.5, vel: 380, min: 3 * T, max: 9 * T },
  };

  // Cappello e frusta sulle foto di Tino: [x, y, larghezza, rotazione] in pixel dell'immagine.
  const POSE = {
    normale:    { src: 'tino-normale',    w: 376, h: 512, cappello: [104, -8, 290, 6],    frusta: [262, 250, 150, -6] },
    arrabbiato: { src: 'tino-arrabbiato', w: 243, h: 381, cappello: [22, -20, 204, -4],   frusta: [156, 196, 106, -6] },
    ferito:     { src: 'tino-ferito',     w: 247, h: 445, cappello: [14, -40, 210, -16],  frusta: [164, 240, 106, -6] },
    ko:         { src: 'tino-ko',         w: 362, h: 210, cappello: [-70, 112, 150, 172], frusta: [280, 96, 96, 80] },
  };

  // ---------------------------------------------------------------- elementi
  const $ = (s) => document.querySelector(s);
  const canvas = $('#campo');
  const ctx = canvas.getContext('2d');
  const palco = $('#palco');
  const pannello = $('#pannello');
  const elCeci = $('#ceci');
  const elTitolo = $('#titolo-livello');
  const elRobi = $('#robivecchi');
  const elChiavi = $('#chiavi');

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const segno = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

  function leggi(chiave, predefinito) {
    try {
      const v = localStorage.getItem('ghianda-d-oro:' + chiave);
      return v === null ? predefinito : JSON.parse(v);
    } catch (e) { return predefinito; }
  }
  function scrivi(chiave, valore) {
    try { localStorage.setItem('ghianda-d-oro:' + chiave, JSON.stringify(valore)); } catch (e) { /* niente */ }
  }

  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (touch) document.body.classList.add('touch');

  // ---------------------------------------------------------------- immagini
  const BASE = '../../assets/';
  const SORGENTI = {
    'tino-normale': 'tino/tino-normale.png',
    'tino-arrabbiato': 'tino/tino-arrabbiato.png',
    'tino-ferito': 'tino/tino-ferito.png',
    'tino-ko': 'tino/tino-ko.png',
    cappello: 'tino/accessori/cappello.svg',
    frusta: 'tino/accessori/frusta.svg',
    retino: 'agenti-tari/agente-retino.svg',
    timbro: 'agenti-tari/agente-timbro.svg',
    capo: 'agenti-tari/ispettore-capo.svg',
    cece: 'oggetti/cece.svg',
    chiave: 'oggetti/chiave.svg',
  };
  for (const [k, r] of Object.entries(ROBIVECCHI)) SORGENTI['robi' + k] = `oggetti/robivecchi/${r.file}.svg`;
  const img = {};
  const caricate = Promise.all(Object.entries(SORGENTI).map(([nome, src]) => new Promise((ok) => {
    const i = new Image();
    i.onload = () => ok();
    i.onerror = () => ok();
    i.src = BASE + src;
    img[nome] = i;
  })));

  const RISOLUZIONE = 2.5; // le figure sono preparate a 2,5× la dimensione di gioco
  const figure = {};       // Tino già vestito, agenti, ceci: pronti da disegnare

  function nuovaTela(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  // Tino con cappello (e frusta arrotolata), già composto su una tela.
  function vestiTino(posa, conFrusta) {
    const p = POSE[posa];
    const base = img[p.src];
    const parti = [];
    const pezzo = (im, [x, y, w, r], hw) => parti.push({ im, x, y, w, h: w * hw, r });
    if (posa === 'ko') pezzo(img.cappello, p.cappello, 170 / 300);
    parti.push({ im: base, x: 0, y: 0, w: p.w, h: p.h, r: 0 });
    if (posa !== 'ko') pezzo(img.cappello, p.cappello, 170 / 300);
    if (conFrusta) pezzo(img.frusta, p.frusta, 210 / 130);

    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of parti) {
      const cx = q.x + q.w / 2, cy = q.y + q.h / 2, a = q.r * Math.PI / 180;
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const px = (dx * q.w) / 2, py = (dy * q.h) / 2;
        const X = cx + px * Math.cos(a) - py * Math.sin(a);
        const Y = cy + px * Math.sin(a) + py * Math.cos(a);
        x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
      }
    }
    const scalaGioco = posa === 'ko' ? 116 / p.w : TINO.alto / p.h;
    const k = scalaGioco * RISOLUZIONE;
    const c = nuovaTela((x1 - x0) * k, (y1 - y0) * k);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.scale(k, k);
    g.translate(-x0, -y0);
    for (const q of parti) {
      if (!q.im.complete || !q.im.naturalWidth) continue;
      g.save();
      g.translate(q.x + q.w / 2, q.y + q.h / 2);
      g.rotate(q.r * Math.PI / 180);
      g.drawImage(q.im, -q.w / 2, -q.h / 2, q.w, q.h);
      g.restore();
    }
    // punto d'appoggio: i piedi, al centro in basso della foto
    return { c, ax: (p.w / 2 - x0) * k, ay: (p.h - y0) * k };
  }

  function rasterizza(im, alto) {
    const k = (alto / im.naturalHeight) * RISOLUZIONE;
    const c = nuovaTela(im.naturalWidth * k, im.naturalHeight * k);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    if (im.naturalWidth) g.drawImage(im, 0, 0, c.width, c.height);
    return c;
  }

  function preparaFigure() {
    for (const posa of Object.keys(POSE)) {
      figure[posa] = vestiTino(posa, true);
      figure[posa + '-senza'] = vestiTino(posa, false);
    }
    figure.retino = rasterizza(img.retino, 100);
    figure.timbro = rasterizza(img.timbro, 100);
    figure.capo = rasterizza(img.capo, 132);
    figure.cece = rasterizza(img.cece, 30);
    figure.chiave = rasterizza(img.chiave, 40);
    for (const k of Object.keys(ROBIVECCHI)) figure['robi' + k] = rasterizza(img['robi' + k], 40);
  }

  // ---------------------------------------------------------------- audio
  let muto = leggi('muto', false);
  let audio = null;
  function suono(freq, durata = 0.08, tipo = 'square', volume = 0.06, freqFine = null) {
    if (muto || G.test) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime;
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
    salto: () => suono(330, 0.1, 'triangle', 0.05, 520),
    atterra: () => suono(120, 0.05, 'triangle', 0.05),
    frusta: () => { suono(1800, 0.05, 'square', 0.04, 500); suono(90, 0.06, 'sawtooth', 0.03); },
    aggancio: () => suono(700, 0.07, 'triangle', 0.06, 1100),
    cece: () => { suono(880, 0.07, 'triangle', 0.06); setTimeout(() => suono(1320, 0.09, 'triangle', 0.06), 60); },
    colpito: () => suono(300, 0.25, 'sawtooth', 0.05, 110),
    porta: () => suono(80, 0.35, 'sawtooth', 0.035, 140),
    crollo: () => suono(140, 0.3, 'square', 0.03, 50),
    stordito: () => [900, 700, 900].forEach((f, i) => setTimeout(() => suono(f, 0.06, 'triangle', 0.05), i * 70)),
    bolletta: () => suono(500, 0.12, 'triangle', 0.035, 300),
    partenza: () => [523, 784].forEach((f, i) => setTimeout(() => suono(f, 0.12, 'triangle', 0.06), i * 90)),
    chiave: () => [660, 990].forEach((f, i) => setTimeout(() => suono(f, 0.1, 'triangle', 0.07), i * 80)),
    lucchetto: () => { suono(220, 0.08, 'square', 0.05); setTimeout(() => suono(330, 0.25, 'triangle', 0.06, 660), 90); },
    robivecchio: () => [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => suono(f, 0.1, 'triangle', 0.07), i * 70)),
    vittoria: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => suono(f, 0.16, 'triangle', 0.08), i * 120)),
    capo: () => { suono(220, 0.12, 'sawtooth', 0.05, 330); setTimeout(() => suono(330, 0.18, 'sawtooth', 0.05, 200), 120); },
    megafono: () => { suono(260, 0.3, 'sawtooth', 0.05, 520); suono(130, 0.3, 'square', 0.03, 260); },
    tonfo: () => suono(70, 0.25, 'square', 0.06, 35),
    ko: () => [392, 330, 262, 196].forEach((f, i) => setTimeout(() => suono(f, 0.2, 'sawtooth', 0.045), i * 150)),
  };

  function cambiaAudio() {
    muto = !muto;
    scrivi('muto', muto);
    document.body.classList.toggle('muto', muto);
  }
  document.body.classList.toggle('muto', muto);
  $('#btn-audio').addEventListener('click', (e) => { cambiaAudio(); e.currentTarget.blur(); });
  $('#btn-pausa').addEventListener('click', (e) => { e.currentTarget.blur(); if (G.fase === 'gioco') pausa(); else if (G.fase === 'pausa') riprendi(); });

  // ---------------------------------------------------------------- stato
  const G = {
    fase: 'carica',      // carica, menu, gioco, pausa, ko, fine
    test: false,         // nelle prove automatiche il tempo lo decide chi prova
    n: 0,                // livello in corso
    liv: null,           // livello in corso (mappa e oggetti)
    tino: null,
    stanza: { x: 0, y: 0 },
    tempo: 0,
    particelle: [],
    scritte: [],
    bollette: [],
    onde: [],            // onde del megafono dell'ispettore capo
    uscite: {},          // da dove Tino è uscito da ogni stanza (l'ispettore lo segue)
    scossa: 0,
    cartello: null,
    tempoMorte: 0,
  };
  const sbloccati = () => leggi('sbloccati', 1);
  const trovati = () => leggi('robivecchi', {});
  // tutti i robivecchi del gioco, livello per livello (per il menu)
  function elencoRobivecchi() {
    const tutti = [];
    window.LIVELLI.forEach((def, n) => {
      def.stanze.forEach((riga, sy) => riga.forEach((st, sx) => st.forEach((r, y) => [...r].forEach((ch, x) => {
        if (ROBIVECCHI[ch]) tutti.push({ n, tipo: ch, chiave: `${n}:${sx * COL + x},${sy * RIG + y}` });
      }))));
    });
    return tutti;
  }

  // ---------------------------------------------------------------- livello
  function costruisci(n) {
    const def = window.LIVELLI[n];
    const righeStanze = def.stanze.length;
    const colStanze = def.stanze[0].length;
    const lw = colStanze * COL, lh = righeStanze * RIG;
    const griglia = [];
    const liv = {
      def, lw, lh, griglia,
      stanzeW: colStanze, stanzeH: righeStanze,
      porte: [], pulsanti: [], crepe: [], ceci: [], pioli: [], torce: [], cartelli: [],
      controlli: [], agenti: [], robivecchi: [], uscita: null, partenza: null, ceciTotali: 0,
      cesoie: [], stalattiti: [], chiavi: [], serrature: [], capo: null,
    };
    for (let y = 0; y < lh; y++) griglia.push(new Array(lw).fill('.'));
    let nCartello = 0;
    for (let sy = 0; sy < righeStanze; sy++) {
      for (let sx = 0; sx < colStanze; sx++) {
        const st = def.stanze[sy][sx];
        for (let y = 0; y < RIG; y++) {
          const riga = st[y] || '';
          for (let x = 0; x < COL; x++) {
            const ch = riga[x] || '.';
            const gx = sx * COL + x, gy = sy * RIG + y;
            const cx = gx * T + T / 2, cy = gy * T + T / 2;
            let cella = '.';
            if (ch === '#' || ch === '-' || ch === '^' || ch === 'v') cella = ch;
            else if (ch === 'x') liv.cesoie.push({ x: gx, y: gy, fase: liv.cesoie.length * CESOIE.sfasa });
            else if (ch === 'Y') liv.stalattiti.push({ x: cx, y0: gy * T, y: gy * T, vy: 0, stato: 'appesa', t: 0 });
            else if (ch === 'k') liv.chiavi.push({ x: cx, y: cy, preso: false });
            else if (ch === 'L') { cella = 'L'; liv.serrature.push({ x: gx, y: gy, aperta: 0, apre: false }); }
            else if (ch === '~') { cella = '~'; liv.crepe.push({ x: gx, y: gy, stato: 'intatta', t: 0 }); }
            else if (ch >= 'A' && ch <= 'D') { cella = '|'; liv.porte.push({ x: gx, y: gy, lettera: ch, apertura: 0, timer: 0 }); }
            else if (ch >= 'a' && ch <= 'd') liv.pulsanti.push({ x: gx, y: gy, lettera: ch.toUpperCase(), premuto: false });
            else if (ch === 'o') liv.ceci.push({ x: cx, y: cy, oro: false, preso: false });
            else if (ch === '*') liv.ceci.push({ x: cx, y: cy, oro: true, preso: false });
            else if (ch === 'P') liv.pioli.push({ x: cx, y: cy });
            else if (ROBIVECCHI[ch]) {
              const chiave = `${n}:${gx},${gy}`;
              liv.robivecchi.push({ x: cx, y: cy, tipo: ch, chiave, preso: false, giaTrovato: !!trovati()[chiave] });
            }
            else if (ch === 'f') liv.torce.push({ x: cx, y: cy });
            else if (ch === 'K') liv.controlli.push({ x: cx, y: (gy + 1) * T, acceso: false });
            else if (ch === 'U') liv.uscita = { x: cx, y: (gy + 1) * T };
            else if (ch === 'T') liv.partenza = { x: cx, y: (gy + 1) * T };
            else if (ch === 'i') liv.cartelli.push({ x: cx, y: (gy + 1) * T, testo: (def.cartelli || [])[nCartello++] || { pc: '', touch: '' } });
            else if (ch === 'I') {
              liv.capo = {
                x: cx, y: (gy + 1) * T, vx: 0, vy: 0, dir: 1, w: 50, h: 112,
                stato: 'dorme', t: 0, immune: 0, passo: 0, aTerra: true, saltando: false,
                megafono: CAPO.megafono.ogni * 0.5, bloccato: 0, scrivania: { x: cx, y: (gy + 1) * T },
                terra: { x: cx, y: (gy + 1) * T }, stanzaX: sx,
              };
            }
            else if (ch === 'r' || ch === 't') {
              liv.agenti.push({
                tipo: ch === 'r' ? 'retino' : 'timbro',
                x: cx, y: (gy + 1) * T, vx: 0, vy: 0, dir: -1, w: 40, h: 78,
                stato: 'ronda', t: 0, lancio: AGENTI.lancio * 0.6, passo: Math.random() * 6,
                stanzaX: sx, stanzaY: sy,
              });
            }
            griglia[gy][gx] = cella;
          }
        }
      }
    }
    liv.ceciTotali = liv.ceci.length;
    if (!liv.partenza) liv.partenza = { x: T * 2, y: T * 8 };
    return liv;
  }

  function cella(gx, gy) {
    const liv = G.liv;
    if (gx < 0 || gx >= liv.lw || gy < 0) return '#';
    if (gy >= liv.lh) return '.';
    return liv.griglia[gy][gx];
  }

  function porta(gx, gy) { return G.liv.porte.find((p) => p.x === gx && p.y === gy); }
  function serratura(gx, gy) { return G.liv.serrature.find((p) => p.x === gx && p.y === gy); }

  // 0 = cesoie aperte, 1 = chiuse
  function chiusura(c) {
    const C = CESOIE;
    const periodo = C.aperte + C.chiude + C.chiuse + C.apre;
    let tt = (G.tempo + c.fase) % periodo;
    if (tt < C.aperte) return 0;
    tt -= C.aperte;
    if (tt < C.chiude) return tt / C.chiude;
    tt -= C.chiude;
    if (tt < C.chiuse) return 1;
    return 1 - (tt - C.chiuse) / C.apre;
  }
  // spuntoni a scomparsa: 0 = nascosti, 1 = fuori
  function spuntoniFuori() {
    const tt = G.tempo % SPUNTONI.periodo;
    if (tt < SPUNTONI.su) return 1;
    if (tt > SPUNTONI.periodo - SPUNTONI.avviso) return 0.25; // stanno per uscire
    return 0;
  }
  function crepa(gx, gy) { return G.liv.crepe.find((c) => c.x === gx && c.y === gy); }

  // solido per Tino (e per gli agenti)
  function solido(gx, gy) {
    const c = cella(gx, gy);
    if (c === '#') return true;
    if (c === '|') { const p = porta(gx, gy); return !p || p.apertura < 0.9; }
    if (c === 'L') { const p = serratura(gx, gy); return !p || p.aperta < 0.9; }
    if (c === '~') { const k = crepa(gx, gy); return !k || k.stato !== 'caduta'; }
    return false;
  }

  // ---------------------------------------------------------------- Tino
  function nuovoTino(x, y, ceci, massimo) {
    return {
      x, y, vx: 0, vy: 0, dir: 1, w: TINO.w, h: TINO.h,
      aTerra: true, stato: 'libero',           // libero, appeso, sale, dondola, ko, uscita
      ceci, massimo,
      coyote: 0, buffer: 0, invulnerabile: 0, ferito: 0, schiaccia: 0,
      quotaCaduta: y, presaPausa: 0, spintaMuro: 0,
      appiglio: null, sale: 0, daSale: null,
      piolo: null, angolo: 0, omega: 0, corda: 0, lasca: false, chiavi: 0,
      schiocco: 0, ricarica: 0, passo: 0,
      sicuro: { x, y }, controllo: { x, y },
    };
  }

  function iniziaLivello(n, daControllo = null) {
    G.n = n;
    G.liv = costruisci(n);
    const p = daControllo || G.liv.partenza;
    G.tino = nuovoTino(p.x, p.y, VITA.iniziali, VITA.iniziali);
    if (daControllo) {
      G.tino.controllo = { ...daControllo };
      for (const k of G.liv.controlli) if (Math.abs(k.x - daControllo.x) < 1 && Math.abs(k.y - daControllo.y) < 1) k.acceso = true;
    } else {
      G.tino.controllo = { ...p };
    }
    G.tempo = 0;
    G.particelle.length = 0;
    G.scritte.length = 0;
    G.bollette.length = 0;
    G.onde.length = 0;
    G.uscite = {};
    G.scossa = 0;
    G.cartello = null;
    G.raccolti = 0;
    // ripartendo da un punto di partenza più avanti della scrivania, l'ispettore arriva da dietro
    const c = G.liv.capo;
    if (c && daControllo && Math.floor(daControllo.x / L) > c.stanzaX) {
      c.stato = 'arriva';
      c.t = CAPO.arriva;
      // entra dal bordo sinistro della stanza (o, se lì non c'è pavimento, dalla torcia)
      c.x = Math.max(Math.floor(daControllo.x / L) * L + 30, daControllo.x - 3 * T);
      c.y = daControllo.y;
      if (urtaMuri(c) || !solido(Math.floor(c.x / T), Math.floor(c.y / T))) c.x = daControllo.x;
      c.terra = { x: c.x, y: c.y };
    }
    elTitolo.textContent = `${n + 1}. ${G.liv.def.nome}`;
    aggiornaStanza(true);
    aggiornaCeci();
    aggiornaRobivecchi();
    aggiornaChiavi();
  }

  function aggiornaRobivecchi() {
    const liv = G.liv;
    elRobi.innerHTML = '';
    if (!liv) return;
    for (const r of liv.robivecchi) {
      const im = document.createElement('img');
      im.src = BASE + SORGENTI['robi' + r.tipo];
      im.alt = ROBIVECCHI[r.tipo].nome;
      im.title = ROBIVECCHI[r.tipo].nome + (r.preso || r.giaTrovato ? ' (trovato)' : ' (da trovare)');
      if (!(r.preso || r.giaTrovato)) im.className = 'vuoto';
      elRobi.appendChild(im);
    }
  }

  function aggiornaChiavi() {
    const n = G.tino ? G.tino.chiavi : 0;
    elChiavi.innerHTML = n ? `<img src="${BASE + SORGENTI.chiave}" alt="">${n > 1 ? '<b>×' + n + '</b>' : ''}` : '';
    elChiavi.setAttribute('aria-label', `Chiavi: ${n}`);
  }

  function aggiornaCeci() {
    const t = G.tino;
    if (!t) { elCeci.innerHTML = ''; return; }
    const prima = elCeci.children.length;
    if (elCeci.children.length !== t.massimo) {
      elCeci.innerHTML = '';
      for (let i = 0; i < t.massimo; i++) {
        const im = document.createElement('img');
        im.src = BASE + SORGENTI.cece;
        im.alt = '';
        elCeci.appendChild(im);
      }
    }
    [...elCeci.children].forEach((im, i) => {
      const pieno = i < t.ceci;
      if (pieno && im.classList.contains('vuoto') && prima) {
        im.classList.remove('nuovo'); void im.offsetWidth; im.classList.add('nuovo');
      }
      im.classList.toggle('vuoto', !pieno);
    });
    elCeci.setAttribute('aria-label', `Ceci: ${t.ceci} su ${t.massimo}`);
  }

  // ---------------------------------------------------------------- input
  const tastiera = new Set();
  const tocchi = { sx: false, dx: false, su: false, giu: false, salta: false, frusta: false };
  const comandi = { sx: false, dx: false, su: false, giu: false, salta: false, frusta: false };
  const prima = { su: false, giu: false, salta: false, frusta: false };
  const appena = { su: false, giu: false, salta: false, frusta: false };
  // ↑ salta (e, appesi alla frusta, la accorcia); Spazio salta sempre (e stacca dalla frusta)
  const TASTI = {
    sx: ['ArrowLeft', 'KeyA'],
    dx: ['ArrowRight', 'KeyD'],
    su: ['ArrowUp', 'KeyW'],
    salta: ['Space'],
    giu: ['ArrowDown', 'KeyS'],
    frusta: ['KeyX', 'KeyK', 'KeyJ', 'ShiftLeft', 'ShiftRight'],
  };
  const TASTI_GIOCO = Object.values(TASTI).flat();

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (TASTI_GIOCO.includes(e.code) && G.fase === 'gioco') e.preventDefault();
    tastiera.add(e.code);
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (G.fase === 'pausa') riprendi();
      else if (G.fase === 'gioco') pausa();
    } else if (e.code === 'KeyM') cambiaAudio();
  });
  window.addEventListener('keyup', (e) => tastiera.delete(e.code));
  window.addEventListener('blur', () => { tastiera.clear(); for (const k in tocchi) tocchi[k] = false; if (G.fase === 'gioco') pausa(); });

  // Controlli touch: la croce segue il dito (si può scivolare da ◀ a ▶),
  // i due pulsanti a destra funzionano ognuno per conto suo.
  const croce = $('#croce');
  const ditiCroce = new Map();
  function tastoCroce(x, y) {
    const el = document.elementFromPoint(x, y);
    const t = el && el.closest('[data-tasto]');
    if (t && croce.contains(t)) return t.dataset.tasto;
    const r = croce.getBoundingClientRect();
    if (y < r.top - 40 || y > r.bottom + 40) return null;
    const terzo = (x - r.left) / r.width;
    return terzo < 0.36 ? 'sx' : terzo > 0.64 ? 'dx' : (y < r.top + r.height / 2 ? 'su' : 'giu');
  }
  function aggiornaCroce() {
    tocchi.sx = tocchi.dx = tocchi.giu = tocchi.su = false;
    for (const t of ditiCroce.values()) if (t) tocchi[t] = true;
    for (const el of croce.querySelectorAll('[data-tasto]')) el.classList.toggle('attivo', tocchi[el.dataset.tasto]);
  }
  croce.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    croce.setPointerCapture(e.pointerId);
    ditiCroce.set(e.pointerId, tastoCroce(e.clientX, e.clientY));
    aggiornaCroce();
  });
  croce.addEventListener('pointermove', (e) => {
    if (!ditiCroce.has(e.pointerId)) return;
    ditiCroce.set(e.pointerId, tastoCroce(e.clientX, e.clientY));
    aggiornaCroce();
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    croce.addEventListener(ev, (e) => { ditiCroce.delete(e.pointerId); aggiornaCroce(); });
  }
  for (const b of document.querySelectorAll('.azioni [data-tasto]')) {
    const k = b.dataset.tasto;
    const giu = (e) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); tocchi[k] = true; b.classList.add('attivo'); };
    const su = () => { tocchi[k] = false; b.classList.remove('attivo'); };
    b.addEventListener('pointerdown', giu);
    b.addEventListener('pointerup', su);
    b.addEventListener('pointercancel', su);
    b.addEventListener('lostpointercapture', su);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  palco.addEventListener('contextmenu', (e) => e.preventDefault());

  function leggiComandi() {
    if (G.test) return; // nelle prove i comandi li imposta chi prova
    for (const k in TASTI) comandi[k] = tocchi[k] || TASTI[k].some((c) => tastiera.has(c));
  }
  function fronti() {
    for (const k of ['su', 'giu', 'salta', 'frusta']) {
      appena[k] = comandi[k] && !prima[k];
      prima[k] = comandi[k];
    }
  }

  // ---------------------------------------------------------------- fisica
  function scatola(o) { return { l: o.x - o.w / 2, r: o.x + o.w / 2, t: o.y - o.h, b: o.y }; }
  function sovrappone(a, b) { return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t; }

  // margine: mentre dondola, Tino urta i muri con una sagoma un po' più stretta,
  // così non si incastra sugli spigoli quando parte da fermo da un bordo
  function urtaMuri(o, margine = 0) {
    const s0 = scatola(o);
    const s = { l: s0.l + margine, r: s0.r - margine, t: s0.t + margine, b: s0.b - margine };
    for (let gy = Math.floor(s.t / T); gy <= Math.floor((s.b - 0.01) / T); gy++) {
      for (let gx = Math.floor(s.l / T); gx <= Math.floor((s.r - 0.01) / T); gx++) {
        if (solido(gx, gy)) return true;
      }
    }
    return false;
  }

  // muove un corpo (Tino o agente) con le collisioni; restituisce se tocca terra
  function muovi(o, dt, scendi = false) {
    // orizzontale
    o.x += o.vx * dt;
    let s = scatola(o);
    for (let gy = Math.floor(s.t / T); gy <= Math.floor((s.b - 0.01) / T); gy++) {
      for (let gx = Math.floor(s.l / T); gx <= Math.floor((s.r - 0.01) / T); gx++) {
        if (!solido(gx, gy)) continue;
        if (o.vx > 0) o.x = gx * T - o.w / 2 - 0.01;
        else if (o.vx < 0) o.x = (gx + 1) * T + o.w / 2 + 0.01;
        else o.x += (o.x < gx * T + T / 2) ? -1 : 1; // spinto fuori (es. porta che si chiude)
        o.vx = 0;
        s = scatola(o);
      }
    }
    // verticale
    const piediPrima = o.y;
    o.y += o.vy * dt;
    s = scatola(o);
    let terra = false;
    for (let gy = Math.floor(s.t / T); gy <= Math.floor((s.b - 0.01) / T); gy++) {
      for (let gx = Math.floor(s.l / T); gx <= Math.floor((s.r - 0.01) / T); gx++) {
        const sottile = cella(gx, gy) === '-' && o.vy > 0 && piediPrima <= gy * T + 0.5 && !scendi;
        if (!solido(gx, gy) && !sottile) continue;
        if (o.vy > 0) { o.y = gy * T; terra = true; }
        else if (o.vy < 0) o.y = (gy + 1) * T + o.h + 0.01;
        o.vy = 0;
        s = scatola(o);
      }
    }
    return terra;
  }

  function sottoPiedi(o) {
    const gy = Math.floor((o.y + 1) / T);
    const celle = [];
    for (let gx = Math.floor((o.x - o.w / 2) / T); gx <= Math.floor((o.x + o.w / 2 - 0.01) / T); gx++) celle.push([gx, gy]);
    return celle;
  }

  // cerca un bordo a cui aggrapparsi davanti a Tino
  function cercaAppiglio(t) {
    const d = t.dir;
    const latoX = t.x + d * (t.w / 2 + 3);
    const gx = Math.floor(latoX / T);
    const muroX = d > 0 ? gx * T : (gx + 1) * T;
    if (Math.abs(muroX - (t.x + d * t.w / 2)) > 8) return null;
    const palmo = t.y - 28;
    const gy = Math.round(palmo / T);
    const cima = gy * T;
    if (Math.abs(palmo - cima) > 28) return null;
    if (!solido(gx, gy) || cella(gx, gy) === '|' || cella(gx, gy) === 'L') return null;
    if (solido(gx, gy - 1) || solido(gx, gy - 2)) return null;
    // sopra Tino deve esserci spazio per salire
    const miaX = Math.floor(t.x / T);
    if (solido(miaX, gy - 1) || solido(miaX, gy - 2)) return null;
    return { gx, gy, muroX, cima, dir: d };
  }

  function aggiornaTino(dt) {
    const t = G.tino;
    t.invulnerabile = Math.max(0, t.invulnerabile - dt);
    t.ferito = Math.max(0, t.ferito - dt);
    t.schiaccia = Math.max(0, t.schiaccia - dt);
    t.ricarica = Math.max(0, t.ricarica - dt);
    t.presaPausa = Math.max(0, t.presaPausa - dt);
    if (t.schiocco > 0) t.schiocco = Math.max(0, t.schiocco - dt);
    if (t.stato === 'ko' || t.stato === 'uscita') return;

    const ix = (comandi.dx ? 1 : 0) - (comandi.sx ? 1 : 0);
    const saltoPremuto = appena.su || appena.salta;
    if (saltoPremuto) t.buffer = FISICA.bufferSalto; else t.buffer = Math.max(0, t.buffer - dt);

    // ---- appeso a un bordo
    if (t.stato === 'appeso') {
      const a = t.appiglio;
      t.x = a.muroX - a.dir * (t.w / 2 + 0.5);
      t.y = a.cima + 28;
      t.vx = t.vy = 0;
      if (ix === a.dir) t.spintaMuro += dt; else t.spintaMuro = 0;
      if (appena.giu || ix === -a.dir) {
        t.stato = 'libero';
        t.presaPausa = 0.35;
        t.quotaCaduta = t.y;
      } else if (saltoPremuto || t.buffer > 0 || t.spintaMuro > 0.15) {
        t.stato = 'sale';
        t.sale = 0;
        t.buffer = 0;
        t.daSale = { x: t.x, y: t.y };
      }
      return;
    }
    if (t.stato === 'sale') {
      const a = t.appiglio;
      t.sale += dt / 0.32;
      const k = Math.min(1, t.sale);
      const fx = a.muroX + a.dir * (t.w / 2 + 4);
      // prima su, poi avanti
      const ky = Math.min(1, k * 1.6), kx = Math.max(0, (k - 0.4) / 0.6);
      t.y = t.daSale.y + (a.cima - t.daSale.y) * ky;
      t.x = t.daSale.x + (fx - t.daSale.x) * kx;
      if (k >= 1) {
        t.stato = 'libero';
        t.aTerra = true;
        t.vx = t.vy = 0;
        t.quotaCaduta = t.y;
      }
      return;
    }

    // ---- appeso al piolo con la frusta
    if (t.stato === 'dondola') {
      const p = t.piolo;
      const g = FISICA.gravita / t.corda;
      let alfa = -g * Math.sin(t.angolo) + ix * FRUSTA.spinta * (Math.cos(t.angolo) > 0 ? 1 : -1);
      t.omega += alfa * dt;
      t.omega -= t.omega * FRUSTA.smorzamento * dt;
      // ↑ accorcia, ↓ allunga: accorciando si prende velocità (come una vera corda)
      const verso = (comandi.giu ? 1 : 0) - (comandi.su ? 1 : 0);
      if (verso) {
        const L0 = t.corda;
        const L1 = clamp(L0 + verso * FRUSTA.velCorda * dt, FRUSTA.cordaMin, FRUSTA.cordaMax);
        if (L1 !== L0) {
          t.corda = L1;
          posizionaSuCorda(t);
          if (urtaMuri(t, 6)) { t.corda = L0; posizionaSuCorda(t); }
          else t.omega = clamp(t.omega * (L0 / L1) * (L0 / L1), -FRUSTA.omegaMax, FRUSTA.omegaMax);
        }
      }
      const vecchio = t.angolo;
      t.angolo += t.omega * dt;
      if (Math.abs(t.angolo) > 1.7) { t.angolo = Math.sign(t.angolo) * 1.7; t.omega = 0; }
      posizionaSuCorda(t);
      if (urtaMuri(t, 6)) {
        t.angolo = vecchio;
        t.omega = -t.omega * 0.3;
        posizionaSuCorda(t);
      }
      if (appena.frusta || appena.salta) {
        const v = t.omega * t.corda;
        t.vx = Math.cos(t.angolo) * v;
        t.vy = -Math.sin(t.angolo) * v;
        if (appena.salta) t.vy -= FRUSTA.staccoSalto;
        t.vx = clamp(t.vx, -FISICA.vel * 2.2, FISICA.vel * 2.2);
        t.stato = 'libero';
        t.aTerra = false;
        t.piolo = null;
        t.quotaCaduta = t.y;
        t.ricarica = FRUSTA.ricaricaStacco;
        t.buffer = 0;
        suoni.salto();
      }
      return;
    }

    // ---- libero: corre, salta, cade
    if (ix) t.dir = ix;
    const acc = t.aTerra ? FISICA.accTerra : FISICA.accAria;
    const meta = ix * FISICA.vel;
    if (ix) t.vx += clamp(meta - t.vx, -acc * dt, acc * dt);
    else if (t.aTerra) t.vx += clamp(-t.vx, -FISICA.attrito * dt, FISICA.attrito * dt);
    else t.vx += clamp(-t.vx, -FISICA.accAria * 0.5 * dt, FISICA.accAria * 0.5 * dt);

    if (t.aTerra) t.coyote = FISICA.coyote; else t.coyote = Math.max(0, t.coyote - dt);
    if (t.buffer > 0 && t.coyote > 0) {
      t.vy = -FISICA.salto;
      t.aTerra = false;
      t.coyote = 0;
      t.buffer = 0;
      t.quotaCaduta = t.y;
      suoni.salto();
    }
    // salto più basso se si lascia subito il tasto
    if (t.vy < -200 && !comandi.su && !comandi.salta) t.vy += FISICA.gravita * 0.9 * dt;

    t.vy = Math.min(FISICA.cadutaMax, t.vy + FISICA.gravita * dt);
    const eraATerra = t.aTerra;
    const vyPrima = t.vy;
    t.aTerra = muovi(t, dt, comandi.giu);
    if (!t.aTerra) t.quotaCaduta = Math.min(t.quotaCaduta, t.y);
    if (t.aTerra && !eraATerra) {
      if (vyPrima > 300) { t.schiaccia = 0.14; polvere(t.x, t.y, 6); suoni.atterra(); }
      const salto = t.y - t.quotaCaduta;
      t.quotaCaduta = t.y;
      if (salto > FISICA.cadutaDanno) colpito(0, 'caduta');
    }
    if (t.aTerra) t.quotaCaduta = t.y;
    if (t.aTerra && Math.abs(t.vx) > 20) t.passo += dt * Math.abs(t.vx) / 18;

    // aggrapparsi ai bordi (automatico, se si va verso il muro o si sta saltando contro)
    if (!t.aTerra && !t.lasca && t.vy > -220 && t.presaPausa <= 0 && !comandi.giu) {
      const a = cercaAppiglio(t);
      if (a && (ix === a.dir || Math.abs(t.vx) > 30 && segno(t.vx) === a.dir || t.vy > -220)) {
        t.stato = 'appeso';
        t.appiglio = a;
        t.spintaMuro = 0;
        t.vx = t.vy = 0;
        suoni.atterra();
        return;
      }
    }

    // frusta lasca (agganciata stando a terra): si tende appena Tino si stacca da terra
    if (t.lasca && t.piolo) {
      const mx = t.x + t.dir * TINO.palmo.x, my = t.y + TINO.palmo.y;
      const dx = mx - t.piolo.x, dy = my - t.piolo.y;
      const d = Math.hypot(dx, dy);
      if (appena.frusta) { sgancia(t); t.ricarica = FRUSTA.ricaricaStacco; return; }
      if (d > FRUSTA.cordaMax + 10 || dy < -20) { sgancia(t); }
      else if (t.aTerra) t.corda = clamp(Math.max(t.corda, d), FRUSTA.cordaMin, FRUSTA.cordaMax);
      else if (d >= t.corda - 1) {
        t.angolo = Math.atan2(dx, dy);
        t.corda = clamp(d, FRUSTA.cordaMin, FRUSTA.cordaMax);
        t.omega = (t.vx * Math.cos(t.angolo) - t.vy * Math.sin(t.angolo)) / t.corda;
        t.stato = 'dondola';
        t.lasca = false;
        posizionaSuCorda(t);
        if (urtaMuri(t, 6)) { t.x = mx - t.dir * TINO.palmo.x; t.y = my - TINO.palmo.y; t.stato = 'libero'; t.lasca = true; }
      }
      return;
    }

    // frusta
    if (appena.frusta && t.ricarica <= 0) usaFrusta(t);
  }

  function sgancia(t) {
    t.piolo = null;
    t.lasca = false;
  }

  function posizionaSuCorda(t) {
    const p = t.piolo;
    const mx = p.x + Math.sin(t.angolo) * t.corda;
    const my = p.y + Math.cos(t.angolo) * t.corda;
    t.x = mx - t.dir * TINO.palmo.x;
    t.y = my - TINO.palmo.y;
  }

  function usaFrusta(t) {
    const mano = { x: t.x + t.dir * TINO.palmo.x, y: t.y + TINO.palmo.y };
    let migliore = null, punti = Infinity;
    for (const p of G.liv.pioli) {
      const dx = p.x - mano.x, dy = p.y - mano.y;
      const d = Math.hypot(dx, dy);
      if (d > FRUSTA.portata || dy > 0) continue; // il piolo non deve stare sotto la mano
      const pt = d - (segno(dx) === t.dir ? 60 : 0);
      if (pt < punti) { punti = pt; migliore = p; }
    }
    t.ricarica = FRUSTA.ricarica;
    if (migliore && t.aTerra) {
      // da terra la frusta resta lasca finché Tino non si stacca dal suolo
      t.piolo = migliore;
      t.corda = clamp(Math.hypot(mano.x - migliore.x, mano.y - migliore.y), FRUSTA.cordaMin, FRUSTA.cordaMax);
      t.lasca = true;
      suoni.aggancio();
      return;
    }
    if (migliore) {
      const dx = mano.x - migliore.x, dy = mano.y - migliore.y;
      t.piolo = migliore;
      t.corda = clamp(Math.hypot(dx, dy), FRUSTA.cordaMin, FRUSTA.cordaMax);
      t.angolo = Math.atan2(dx, dy);
      // la velocità diventa velocità di rotazione
      t.omega = (t.vx * Math.cos(t.angolo) - t.vy * Math.sin(t.angolo)) / t.corda;
      t.stato = 'dondola';
      t.aTerra = false;
      t.schiocco = 0;
      posizionaSuCorda(t);
      if (urtaMuri(t, 6)) { // troppo vicino al muro: niente aggancio
        t.stato = 'libero';
        t.piolo = null;
        t.x = mano.x - t.dir * TINO.palmo.x;
        t.y = mano.y - TINO.palmo.y;
      } else {
        suoni.aggancio();
        return;
      }
    }
    // schiocco: stordisce gli agenti e spazza via le bollette
    t.schiocco = FRUSTA.durataSchiocco;
    suoni.frusta();
    const colpo = {
      l: Math.min(mano.x, mano.x + t.dir * FRUSTA.schiocco),
      r: Math.max(mano.x, mano.x + t.dir * FRUSTA.schiocco),
      t: t.y - t.h - 10, b: t.y - 10,
    };
    for (const a of G.liv.agenti) {
      if (a.stato === 'stordito' || a.stato === 'fuori') continue;
      if (sovrappone(colpo, scatola(a))) {
        a.stato = 'stordito';
        a.t = AGENTI.stordito;
        a.vx = 0;
        suoni.stordito();
        scritta(a.x, a.y - a.h - 10, 'Stordito!', '#ffe680');
      }
    }
    for (const b of G.bollette) {
      if (b.x > colpo.l - 10 && b.x < colpo.r + 10 && b.y > colpo.t - 10 && b.y < colpo.b + 10) {
        b.via = true;
        coriandoli(b.x, b.y, '#ffffff', 6);
      }
    }
    const c = G.liv.capo;
    if (c && sovrappone(colpo, scatola(c))) {
      if (c.stato === 'dorme') svegliaCapo(c);
      else fermaCapo(c, t.dir, 'frusta');
    }
  }

  function colpito(dir, causa) {
    const t = G.tino;
    if (t.stato === 'ko' || t.stato === 'uscita') return;
    if (causa !== 'trappola' && t.invulnerabile > 0) return;
    t.ceci = Math.max(0, t.ceci - 1);
    t.ferito = VITA.ferito;
    t.invulnerabile = VITA.invulnerabile;
    aggiornaCeci();
    suoni.colpito();
    scritta(t.x, t.y - t.h - 30, '-1', '#ff8a7a');
    if (t.stato === 'dondola' || t.stato === 'appeso' || t.stato === 'sale') t.stato = 'libero';
    sgancia(t);
    if (dir) { t.vx = dir * 280; t.vy = -380; t.aTerra = false; t.quotaCaduta = t.y; }
    if (t.ceci <= 0) koTino();
  }

  // spuntoni, baratri: si perde un cece e si riparte dall'ultimo punto sicuro
  function trappola() {
    const t = G.tino;
    t.x = t.sicuro.x; t.y = t.sicuro.y;
    t.vx = t.vy = 0;
    t.stato = 'libero';
    sgancia(t);
    t.aTerra = true;
    t.quotaCaduta = t.y;
    aggiornaStanza();
    colpito(0, 'trappola');
    const c = G.liv.capo;
    if (c && attivo(c) && Math.abs(c.x - t.x) < 5 * T && Math.abs(c.y - t.y) < 2 * T) {
      c.stato = 'festa';
      c.t = CAPO.festaTrappola;
      c.vx = 0;
      scritta(c.x, c.y - c.h - 20, 'Ah ah ah!', '#ff8a7a');
    }
  }

  function koTino() {
    const t = G.tino;
    t.stato = 'ko';
    t.vx = 0;
    t.piolo = null;
    G.tempoMorte = 0;
    suoni.ko();
  }

  function controllaTino(dt) {
    const t = G.tino;
    if (t.stato === 'ko' || t.stato === 'uscita') return;
    const s = scatola(t);
    const piccola = { l: s.l + 5, r: s.r - 5, t: s.t + 8, b: s.b };
    // spuntoni
    for (let gy = Math.floor(s.t / T); gy <= Math.floor((s.b - 0.01) / T); gy++) {
      for (let gx = Math.floor(s.l / T); gx <= Math.floor((s.r - 0.01) / T); gx++) {
        const c = cella(gx, gy);
        if (c !== '^' && !(c === 'v' && spuntoniFuori() === 1)) continue;
        if (sovrappone(piccola, { l: gx * T + 6, r: gx * T + T - 6, t: gy * T + 30, b: gy * T + T })) { trappola(); return; }
      }
    }
    // baratro
    if (t.y - t.h > G.liv.lh * T + 40) { trappola(); return; }

    // cesoie: colpiscono se sono quasi chiuse
    for (const c of G.liv.cesoie) {
      if (chiusura(c) < 0.7) continue;
      const area = { l: c.x * T + 16, r: c.x * T + T - 16, t: (c.y - 1) * T, b: (c.y + 1) * T };
      if (sovrappone(piccola, area)) { colpito(-t.dir || -1); break; }
    }

    // chiavi
    for (const k of G.liv.chiavi) {
      if (k.preso) continue;
      if (k.x > s.l - 16 && k.x < s.r + 16 && k.y > s.t - 16 && k.y < s.b + 16) {
        k.preso = true;
        t.chiavi++;
        aggiornaChiavi();
        suoni.chiave();
        coriandoli(k.x, k.y, '#ffd23a', 12);
        scritta(k.x, k.y - 26, 'Una chiave!', '#ffe680');
      }
    }
    // porte col lucchetto: si aprono toccandole con una chiave
    const vicino = { l: s.l - 6, r: s.r + 6, t: s.t, b: s.b };
    for (const p of G.liv.serrature) {
      if (p.apre) continue;
      if (!sovrappone(vicino, { l: p.x * T, r: p.x * T + T, t: p.y * T, b: p.y * T + T })) continue;
      if (t.chiavi > 0) {
        t.chiavi--;
        aggiornaChiavi();
        // si apre tutta la porta (le celle una sopra l'altra)
        for (const q of G.liv.serrature) if (q.x === p.x && Math.abs(q.y - p.y) < 8) q.apre = true;
        suoni.lucchetto();
        scritta(p.x * T + T / 2, p.y * T - 10, 'Aperta!', '#ffe680');
      } else if (G.tempo > (G.avvisoChiave || 0)) {
        G.avvisoChiave = G.tempo + 2;
        scritta(p.x * T + T / 2, p.y * T - 10, 'Serve una chiave!', '#ff8a7a');
      }
      break;
    }

    // ceci
    for (const c of G.liv.ceci) {
      if (c.preso) continue;
      if (c.x > s.l - 14 && c.x < s.r + 14 && c.y > s.t - 14 && c.y < s.b + 14) {
        c.preso = true;
        G.raccolti++;
        if (c.oro) { t.massimo = Math.min(VITA.massimo + 2, t.massimo + 1); }
        t.ceci = Math.min(t.massimo, t.ceci + 1);
        aggiornaCeci();
        suoni.cece();
        coriandoli(c.x, c.y, c.oro ? '#ffd23a' : '#f3d79a', 10);
        scritta(c.x, c.y - 20, c.oro ? 'Cece d\'oro!' : '+1', '#ffe680');
      }
    }
    // robivecchi
    for (const r of G.liv.robivecchi) {
      if (r.preso) continue;
      if (r.x > s.l - 16 && r.x < s.r + 16 && r.y > s.t - 16 && r.y < s.b + 16) {
        r.preso = true;
        const tr = trovati();
        tr[r.chiave] = true;
        scrivi('robivecchi', tr);
        suoni.robivecchio();
        coriandoli(r.x, r.y, '#ffd23a', 18);
        coriandoli(r.x, r.y, '#ffffff', 10);
        scritta(r.x, r.y - 30, ROBIVECCHI[r.tipo].nome + '!', '#ffe680');
        aggiornaRobivecchi();
      }
    }
    // punti di partenza
    for (const k of G.liv.controlli) {
      if (!k.acceso && Math.abs(k.x - t.x) < 40 && Math.abs(k.y - t.y) < 60) {
        k.acceso = true;
        t.controllo = { x: k.x, y: k.y };
        suoni.partenza();
        scritta(k.x, k.y - 110, 'Punto di partenza!', '#ffe680');
      }
    }
    // uscita
    const u = G.liv.uscita;
    if (u && t.aTerra && Math.abs(u.x - t.x) < 26 && Math.abs(u.y - t.y) < 10) {
      t.stato = 'uscita';
      t.vx = 0;
      G.tempoMorte = 0;
      suoni.vittoria();
    }
    // cartelli
    G.cartello = null;
    for (const c of G.liv.cartelli) {
      if (Math.abs(c.x - t.x) < 90 && Math.abs(c.y - t.y) < 100) G.cartello = c;
    }
    // ultimo punto sicuro: a terra, su pavimento intero, lontano da trappole e agenti
    if (t.aTerra && t.stato === 'libero' && t.invulnerabile <= 0) {
      const sotto = sottoPiedi(t);
      const fermo = sotto.every(([gx, gy]) => cella(gx, gy) === '#');
      const gx = Math.floor(t.x / T), gy = Math.floor((t.y - 1) / T);
      let trappoleVicine = false;
      for (let x = gx - 1; x <= gx + 1; x++) {
        if (cella(x, gy) === '^' || cella(x, gy) === 'v' || cella(x, gy + 1) === '.') trappoleVicine = true;
      }
      if (G.liv.cesoie.some((c) => Math.abs(c.x - gx) <= 1 && Math.abs(c.y - gy) <= 1)) trappoleVicine = true;
      if (G.liv.stalattiti.some((k) => Math.abs(k.x - t.x) < STALATTITI.vista + 20 && k.y0 < t.y)) trappoleVicine = true;
      const c = G.liv.capo;
      const agentiVicini = G.liv.agenti.some((a) => a.stato !== 'stordito' && Math.abs(a.x - t.x) < 3 * T && Math.abs(a.y - t.y) < T)
        || (c && attivo(c) && Math.abs(c.x - t.x) < 4 * T && Math.abs(c.y - t.y) < 2 * T);
      if (fermo && !trappoleVicine && !agentiVicini) t.sicuro = { x: t.x, y: t.y };
    }
  }

  // ---------------------------------------------------------------- oggetti
  function aggiornaOggetti(dt) {
    const t = G.tino;
    const liv = G.liv;
    // pulsanti e porte
    for (const p of liv.pulsanti) {
      const prima = p.premuto;
      p.premuto = false;
      const sopra = (o) => o.aTerra !== false && Math.floor((o.y - 1) / T) === p.y && Math.abs(o.x - (p.x * T + T / 2)) < T / 2 + o.w / 2 - 6;
      if (t.aTerra && t.stato === 'libero' && sopra(t)) p.premuto = true;
      for (const a of liv.agenti) if (sopra(a)) p.premuto = true;
      if (p.premuto) {
        const tempo = (liv.def.porte && liv.def.porte[p.lettera]) || PORTA.tempo;
        for (const d of liv.porte) {
          if (d.lettera !== p.lettera) continue;
          d.timer = tempo;
        }
        if (!prima) suoni.porta();
      }
    }
    for (const d of liv.porte) {
      if (d.timer > 0) {
        d.timer -= dt;
        d.apertura = Math.min(1, d.apertura + PORTA.apre * dt);
      } else if (d.apertura > 0) {
        // non si chiude addosso a Tino
        const cellaPorta = { l: d.x * T, r: d.x * T + T, t: d.y * T, b: d.y * T + T };
        const sotto = sovrappone(scatola(t), cellaPorta) || liv.agenti.some((a) => sovrappone(scatola(a), cellaPorta))
          || (liv.capo && liv.capo.stato !== 'arriva' && liv.capo.stato !== 'cade' && sovrappone(scatola(liv.capo), cellaPorta));
        if (!sotto) {
          const primaA = d.apertura;
          d.apertura = Math.max(0, d.apertura - PORTA.chiude * dt);
          if (primaA >= 0.9 && d.apertura < 0.9 && d === liv.porte.find((q) => q.lettera === d.lettera)) suoni.porta();
        }
      }
    }
    // porte col lucchetto che si aprono
    for (const p of liv.serrature) if (p.apre && p.aperta < 1) p.aperta = Math.min(1, p.aperta + 1.2 * dt);
    // stalattiti: cadono quando Tino ci passa sotto
    for (const k of liv.stalattiti) {
      const nellaStanza = Math.floor(k.x / L) === G.stanza.x && Math.floor(k.y0 / A) === G.stanza.y;
      if (k.stato === 'appesa') {
        if (nellaStanza && t.stato !== 'ko' && Math.abs(t.x - k.x) < STALATTITI.vista && t.y > k.y0 + T) { k.stato = 'trema'; k.t = STALATTITI.trema; }
      } else if (k.stato === 'trema') {
        k.t -= dt;
        if (k.t <= 0) { k.stato = 'cade'; k.vy = 0; suoni.crollo(); }
      } else if (k.stato === 'cade') {
        k.vy += STALATTITI.gravita * dt;
        k.y += k.vy * dt;
        const punta = { l: k.x - 10, r: k.x + 10, t: k.y + 10, b: k.y + 44 };
        if (t.stato !== 'ko' && sovrappone(punta, scatola(t))) {
          colpito(0);
          k.stato = 'rotta'; k.t = STALATTITI.ritorno;
          coriandoli(k.x, k.y + 30, '#9b8264', 10);
        } else if (liv.capo && attivo(liv.capo) && sovrappone(punta, scatola(liv.capo))) {
          fermaCapo(liv.capo, 0, 'trappola');
          k.stato = 'rotta'; k.t = STALATTITI.ritorno;
          coriandoli(k.x, k.y + 30, '#9b8264', 10);
        } else if (solido(Math.floor(k.x / T), Math.floor((k.y + 44) / T)) || k.y > (liv.lh + 1) * T) {
          k.stato = 'rotta'; k.t = STALATTITI.ritorno;
          suoni.crollo();
          for (let i = 0; i < 8; i++) G.particelle.push({ x: k.x + (Math.random() - 0.5) * 20, y: k.y + 40, vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 200, vita: 0.7, colore: '#8a7357', r: 3 + Math.random() * 4, peso: 1 });
        }
      } else if (k.stato === 'rotta') {
        k.t -= dt;
        if (k.t <= 0) { k.stato = 'appesa'; k.y = k.y0; }
      }
    }
    // pavimento crepato
    const sotto = t.aTerra ? sottoPiedi(t) : [];
    const capo = liv.capo;
    const sottoCapo = capo && capo.aTerra && attivo(capo) ? sottoPiedi(capo) : [];
    for (const c of liv.crepe) {
      if (c.stato === 'intatta' && sotto.some(([x, y]) => x === c.x && y === c.y)) { c.stato = 'trema'; c.t = CREPA.trema; }
      else if (c.stato === 'intatta' && sottoCapo.some(([x, y]) => x === c.x && y === c.y)) { c.stato = 'trema'; c.t = CAPO.pesante; }
      else if (c.stato === 'trema') {
        c.t -= dt;
        if (c.t <= 0) {
          c.stato = 'caduta';
          c.t = CREPA.ritorno;
          suoni.crollo();
          for (let i = 0; i < 8; i++) {
            G.particelle.push({ x: c.x * T + Math.random() * T, y: c.y * T + Math.random() * 20, vx: (Math.random() - 0.5) * 80, vy: Math.random() * 100, vita: 1.2, colore: '#9b8264', r: 5 + Math.random() * 8, peso: 1 });
          }
        }
      } else if (c.stato === 'caduta') {
        c.t -= dt;
        const cellaC = { l: c.x * T, r: c.x * T + T, t: c.y * T, b: c.y * T + T };
        if (c.t <= 0 && !sovrappone(scatola(t), cellaC) && !(capo && attivo(capo) && sovrappone(scatola(capo), cellaC))) c.stato = 'intatta';
      }
    }
  }

  // ---------------------------------------------------------------- agenti
  function stanzaDi(x, y) {
    return { x: clamp(Math.floor(x / L), 0, G.liv.stanzeW - 1), y: clamp(Math.floor(y / A), 0, G.liv.stanzeH - 1) };
  }

  function aggiornaAgenti(dt) {
    const t = G.tino;
    for (const a of G.liv.agenti) {
      if (a.stanzaX !== G.stanza.x || a.stanzaY !== G.stanza.y) continue;
      a.passo += dt;
      if (a.stato === 'stordito') {
        a.t -= dt;
        a.vx = 0;
        if (a.t <= 0) { a.stato = 'ronda'; }
      } else if (a.stato === 'festa') {
        a.t -= dt;
        a.vx = 0;
        if (a.t <= 0) a.stato = 'ronda';
      }
      const dx = t.x - a.x, dy = t.y - a.y;
      const vivo = t.stato !== 'ko' && t.stato !== 'uscita';
      if (a.tipo === 'retino' && (a.stato === 'ronda' || a.stato === 'insegue')) {
        const vede = vivo && Math.abs(dy) < 50 && Math.abs(dx) < AGENTI.vista && (segno(dx) === a.dir || Math.abs(dx) < 2 * T);
        if (vede) { a.stato = 'insegue'; a.dir = segno(dx) || a.dir; } else a.stato = 'ronda';
        const vel = a.stato === 'insegue' ? AGENTI.inseguimento : AGENTI.ronda;
        // davanti c'è un muro, un buco o il bordo della stanza?
        const davanti = a.x + a.dir * (a.w / 2 + 4);
        const gx = Math.floor(davanti / T), gy = Math.floor((a.y - 1) / T);
        const muro = solido(gx, gy) || solido(gx, gy - 1);
        const piano = cella(gx, gy + 1);
        const buco = !(piano === '#' || piano === '-' || piano === '|');
        const bordo = davanti < a.stanzaX * L + 4 || davanti > (a.stanzaX + 1) * L - 4;
        if (muro || buco || bordo) {
          if (a.stato === 'insegue') a.vx = 0;
          else { a.dir = -a.dir; a.vx = 0; }
        } else a.vx = a.dir * vel;
      } else if (a.tipo === 'timbro' && a.stato !== 'stordito' && a.stato !== 'festa') {
        a.vx = 0;
        if (vivo && Math.abs(dx) > 4) a.dir = segno(dx);
        if (vivo && Math.abs(dx) < AGENTI.tiro && Math.abs(dy) < AGENTI.tiroAltezza) {
          a.lancio -= dt;
          if (a.lancio <= 0) {
            a.lancio = AGENTI.lancio;
            lanciaBolletta(a, t);
          }
        }
      }
      a.vy = Math.min(FISICA.cadutaMax, a.vy + FISICA.gravita * dt);
      muovi(a, dt);
      // presa!
      if (vivo && a.stato !== 'stordito' && a.stato !== 'festa' && t.invulnerabile <= 0) {
        const s = scatola(a);
        const presa = { l: s.l - (a.dir < 0 ? 16 : 0), r: s.r + (a.dir > 0 ? 16 : 0), t: s.t, b: s.b };
        if (sovrappone(presa, scatola(t))) {
          colpito(segno(dx) || 1);
          a.stato = 'festa';
          a.t = AGENTI.festa;
          scritta(a.x, a.y - a.h - 14, a.tipo === 'retino' ? 'Preso!' : 'Timbrato!', '#ff8a7a');
        }
      }
    }
    // bollette in volo
    for (const b of G.bollette) {
      b.vy += AGENTI.gravitaBolletta * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.r += b.giro * dt;
      b.vita -= dt;
      if (solido(Math.floor(b.x / T), Math.floor(b.y / T)) || b.vita <= 0) { b.via = true; coriandoli(b.x, b.y, '#ffffff', 5); continue; }
      const s = scatola(t);
      if (t.stato !== 'ko' && b.x > s.l - 8 && b.x < s.r + 8 && b.y > s.t - 8 && b.y < s.b + 4) {
        b.via = true;
        colpito(segno(b.vx) || 1);
      }
    }
    G.bollette = G.bollette.filter((b) => !b.via);
  }

  // ---------------------------------------------------------------- ispettore capo
  // attivo: sveglio e in campo (non dorme, non è caduto, non sta arrivando)
  function attivo(c) { return c.stato !== 'dorme' && c.stato !== 'arriva' && c.stato !== 'cade'; }

  function svegliaCapo(c) {
    c.stato = 'sveglia';
    c.t = CAPO.sveglia;
    c.vx = 0;
    c.dir = segno(G.tino.x - c.x) || 1;
    suoni.capo();
    scritta(c.x, c.y - c.h - 40, 'FERMO LÌ! Sei in arretrato!', '#ff8a7a');
  }

  // la frusta e le trappole non lo stordiscono: lo fermano solo un attimo
  function fermaCapo(c, dir, causa) {
    if (!attivo(c) || c.stato === 'sveglia') return;
    if (c.immune > 0) {
      if (causa === 'frusta') scritta(c.x, c.y - c.h - 14, 'Non mi fai niente!', '#ffe680');
      return;
    }
    c.stato = 'ahi';
    c.t = CAPO.ahi;
    c.immune = CAPO.ahi + CAPO.immune;
    if (c.aTerra) c.vx = 0;
    if (dir) { c.x += dir * 14; if (urtaMuri(c)) c.x -= dir * 14; }
    suoni.stordito();
    scritta(c.x, c.y - c.h - 14, causa === 'frusta' ? 'Ahi! Non vale!' : 'Ahia!', '#ffe680');
  }

  function aggiornaCapo(dt) {
    const c = G.liv.capo;
    if (!c) return;
    const t = G.tino;
    const vivo = t.stato !== 'ko' && t.stato !== 'uscita';
    c.passo += dt;
    c.immune = Math.max(0, c.immune - dt);
    const st = stanzaDi(c.x, c.y - c.h / 2);
    const stessa = st.x === G.stanza.x && st.y === G.stanza.y;

    if (c.stato === 'dorme') {
      // si sveglia se Tino lo supera o gli passa troppo vicino
      if (vivo && stessa && Math.abs(t.y - c.y) < 2 * T && (t.x - c.x > CAPO.risveglio || Math.abs(t.x - c.x) < 40)) svegliaCapo(c);
      return;
    }
    if (c.stato === 'arriva' || c.stato === 'cade') {
      c.t -= dt;
      if (c.t <= 0) {
        const caduto = c.stato === 'cade';
        if (caduto) { c.x = c.terra.x; c.y = c.terra.y; }
        c.vx = c.vy = 0;
        c.stato = 'insegue';
        c.immune = CAPO.immune;
        c.megafono = CAPO.megafono.ogni;
        polvere(c.x, c.y, 10);
        suoni.capo();
        if (stanzaDi(c.x, c.y - c.h / 2).x === G.stanza.x) scritta(c.x, c.y - c.h - 20, caduto ? 'Eccomi di nuovo!' : 'Ti ho ritrovato!', '#ff8a7a');
      }
      return;
    }
    if (c.stato === 'sveglia' || c.stato === 'ahi' || c.stato === 'festa') {
      c.t -= dt;
      if (c.aTerra) c.vx = 0;
      if (c.t <= 0) c.stato = 'insegue';
    } else if (c.stato === 'urla') {
      c.t -= dt;
      c.vx = 0;
      if (c.t <= 0) { sparaOnda(c); c.stato = 'insegue'; }
    } else if (c.stato === 'insegue') {
      pensaCapo(c, t, stessa && vivo, st, dt);
    }

    // fisica
    if (!c.aTerra && c.saltando) c.vx = c.dir * CAPO.velSalto;
    c.vy = Math.min(FISICA.cadutaMax, c.vy + FISICA.gravita * dt);
    const vyPrima = c.vy;
    const eraATerra = c.aTerra;
    c.aTerra = muovi(c, dt);
    if (c.aTerra && !eraATerra) {
      if (c.saltando || vyPrima > 400) atterraCapo(c, stessa);
      c.saltando = false;
      if (c.stato === 'insegue') c.vx = 0;
    }
    if (c.aTerra && sottoPiedi(c).every(([gx, gy]) => cella(gx, gy) === '#')) c.terra = { x: c.x, y: c.y };
    // nel baratro
    if (c.y - c.h > G.liv.lh * T + 40) {
      c.stato = 'cade';
      c.t = CAPO.caduta;
      c.vx = c.vy = 0;
      c.saltando = false;
      return;
    }
    // cesoie
    for (const k of G.liv.cesoie) {
      if (chiusura(k) < 0.7) continue;
      if (sovrappone(scatola(c), { l: k.x * T + 16, r: k.x * T + T - 16, t: (k.y - 1) * T, b: (k.y + 1) * T })) { fermaCapo(c, 0, 'trappola'); break; }
    }
    // presa!
    if (vivo && (c.stato === 'insegue' || c.stato === 'urla') && t.invulnerabile <= 0) {
      const s = scatola(c);
      const presa = { l: s.l - 10, r: s.r + 10, t: s.t, b: s.b };
      if (sovrappone(presa, scatola(t))) {
        colpito(segno(t.x - c.x) || c.dir);
        if (t.stato !== 'ko') t.vx = segno(t.vx) * 60; // solo un saltello: non lo butta sulle trappole
        c.stato = 'festa';
        c.t = CAPO.festa;
        c.vx = 0;
        scritta(c.x, c.y - c.h - 14, 'Multato!', '#ff8a7a');
      }
    }
  }

  function pensaCapo(c, t, vedeTino, st, dt) {
    if (!c.aTerra) return;
    let tx, ty;
    if (vedeTino) { tx = t.x; ty = t.y; }
    else {
      // Tino è in un'altra stanza: va dove l'ha visto uscire
      const u = G.uscite[st.x + ',' + st.y];
      if (!u) { c.vx = 0; return; }
      tx = u.x + u.dir * 90; ty = u.y + (u.giu ? 3 * T : 0);
    }
    const dx = tx - c.x;
    // megafono: se Tino scappa sullo stesso piano, gli spara contro un'onda da saltare
    c.megafono -= dt;
    const M = CAPO.megafono;
    if (vedeTino && c.megafono <= 0 && Math.abs(t.y - c.y) < 25 && Math.abs(dx) > M.min && Math.abs(dx) < M.max) {
      c.stato = 'urla';
      c.t = M.carica;
      c.dir = segno(dx);
      c.vx = 0;
      c.megafono = M.ogni;
      scritta(c.x, c.y - c.h - 20, 'ALT!', '#ff8a7a');
      return;
    }
    if (Math.abs(dx) < 10) { c.vx = 0; c.bloccato = 0; return; }
    c.dir = segno(dx);
    const fy = Math.floor((c.y - 1) / T);
    const gx = Math.floor((c.x + c.dir * (c.w / 2 + 6)) / T);
    const appoggio = (x, y) => solido(x, y) || cella(x, y) === '-';
    let azione = 'cammina';
    if (solido(gx, fy)) {
      // gradino alto un quadretto, con spazio sopra: lo salta
      azione = !solido(gx, fy - 1) && !solido(gx, fy - 2) && !solido(Math.floor(c.x / T), fy - 2) ? 'salta' : 'fermo';
    } else if (!appoggio(gx, fy + 1)) {
      let largo = 0;
      for (let k = 1; k <= 3; k++) if (appoggio(gx + c.dir * k, fy + 1)) { largo = k; break; }
      let fondo = false;
      for (let y = fy + 2; y < fy + 6; y++) if (appoggio(gx, y)) { fondo = true; break; }
      if (fondo && ty > c.y + T / 2) azione = 'cammina';           // scende
      else if (largo && largo <= 2 && !solido(gx + c.dir * largo, fy)) azione = 'salta';
      else azione = 'fermo';                                         // burrone troppo largo
    }
    if (azione === 'fermo') {
      c.vx = 0;
      const prima = c.bloccato;
      c.bloccato += dt;
      if (vedeTino && Math.floor(c.bloccato / 3) !== Math.floor(prima / 3)) {
        scritta(c.x, c.y - c.h - 20, ['Torna qui!', 'Tornerò! Con gli interessi!', 'Non finisce qui!'][Math.floor(c.bloccato / 3) % 3], '#ff8a7a');
      }
      return;
    }
    c.bloccato = 0;
    if (azione === 'salta') {
      c.vy = -CAPO.salto;
      c.vx = c.dir * CAPO.velSalto;
      c.aTerra = false;
      c.saltando = true;
    } else c.vx = c.dir * CAPO.vel;
  }

  // l'ispettore pesa: quando atterra trema tutto e le stalattiti vicine cadono
  function atterraCapo(c, stessa) {
    polvere(c.x, c.y, 10);
    if (!stessa) return;
    G.scossa = 0.25;
    suoni.tonfo();
    for (const k of G.liv.stalattiti) {
      if (k.stato === 'appesa' && Math.abs(k.x - c.x) < 6 * T && Math.floor(k.y0 / A) === G.stanza.y && Math.floor(k.x / L) === G.stanza.x) {
        k.stato = 'trema';
        k.t = STALATTITI.trema;
      }
    }
  }

  function sparaOnda(c) {
    G.onde.push({ x: c.x + c.dir * 46, y: c.y - 38, vx: c.dir * CAPO.megafono.vel, vita: 3, nata: G.tempo });
    suoni.megafono();
  }

  function aggiornaOnde(dt) {
    const t = G.tino;
    for (const o of G.onde) {
      o.x += o.vx * dt;
      o.vita -= dt;
      // le onde restano nella stanza in cui sono partite
      if (o.vita <= 0 || Math.floor(o.x / L) !== G.stanza.x || solido(Math.floor((o.x + segno(o.vx) * 14) / T), Math.floor(o.y / T))) { o.via = true; continue; }
      const s = scatola(t);
      if (t.stato !== 'ko' && t.stato !== 'uscita' && o.x + 14 > s.l + 4 && o.x - 14 < s.r - 4 && o.y + 16 > s.t + 6 && o.y - 16 < s.b) {
        o.via = true;
        colpito(0); // niente spinta: non deve buttare Tino sulle trappole
      }
    }
    G.onde = G.onde.filter((o) => !o.via);
  }

  function lanciaBolletta(a, t) {
    const x0 = a.x + a.dir * 20, y0 = a.y - a.h + 10;
    const volo = AGENTI.volo;
    const tx = t.x, ty = t.y - t.h / 2;
    G.bollette.push({
      x: x0, y: y0,
      vx: (tx - x0) / volo,
      vy: (ty - y0 - 0.5 * AGENTI.gravitaBolletta * volo * volo) / volo,
      r: 0, giro: 6 * a.dir, vita: 4,
    });
    suoni.bolletta();
  }

  // ---------------------------------------------------------------- effetti
  function polvere(x, y, n) {
    for (let i = 0; i < n; i++) {
      G.particelle.push({ x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 60, vita: 0.5, colore: 'rgba(220,200,170,0.8)', r: 4 + Math.random() * 4, peso: 0.2 });
    }
  }
  function coriandoli(x, y, colore, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 160;
      G.particelle.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, vita: 0.6, colore, r: 2 + Math.random() * 3, peso: 0.6 });
    }
  }
  function scritta(x, y, testo, colore) { G.scritte.push({ x, y, testo, colore, vita: 1.2 }); }

  function aggiornaEffetti(dt) {
    for (const p of G.particelle) {
      p.vy += 900 * p.peso * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vita -= dt;
    }
    G.particelle = G.particelle.filter((p) => p.vita > 0);
    for (const s of G.scritte) { s.y -= 30 * dt; s.vita -= dt; }
    G.scritte = G.scritte.filter((s) => s.vita > 0);
  }

  // ---------------------------------------------------------------- stanza
  let telaStanza = null;
  let chiaveStanza = '';

  function aggiornaStanza(forza = false) {
    const t = G.tino;
    const s = stanzaDi(t.x, t.y - t.h / 2);
    if (forza || s.x !== G.stanza.x || s.y !== G.stanza.y) {
      // l'ispettore capo seguirà Tino passando dallo stesso punto
      if (!forza) G.uscite[G.stanza.x + ',' + G.stanza.y] = { x: t.x, y: t.y, dir: segno(s.x - G.stanza.x), giu: s.y > G.stanza.y };
      G.stanza = s;
      G.bollette.length = 0;
      G.onde.length = 0;
      chiaveStanza = '';
    }
  }

  // ---------------------------------------------------------------- passo
  function aggiorna(dt) {
    G.tempo += dt;
    fronti();
    aggiornaTino(dt);
    aggiornaOggetti(dt);
    aggiornaAgenti(dt);
    aggiornaCapo(dt);
    aggiornaOnde(dt);
    controllaTino(dt);
    G.scossa = Math.max(0, G.scossa - dt);
    aggiornaStanza();
    aggiornaEffetti(dt);
    const t = G.tino;
    if (t.stato === 'ko') {
      G.tempoMorte += dt;
      if (G.tempoMorte > 1.6 && G.fase === 'gioco') mostraKo();
    } else if (t.stato === 'uscita') {
      G.tempoMorte += dt;
      if (G.tempoMorte > 1.2 && G.fase === 'gioco') mostraFineLivello();
    }
  }

  // ---------------------------------------------------------------- disegno
  let scala = 1, dpr = 1;

  function ridimensiona() {
    const r = palco.getBoundingClientRect();
    const aw = Math.max(100, r.width - (touch ? 8 : 16));
    const ah = Math.max(100, r.height - (touch ? 8 : 16));
    scala = Math.min(aw / L, ah / A);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = Math.round(L * scala) + 'px';
    canvas.style.height = Math.round(A * scala) + 'px';
    canvas.width = Math.round(L * scala * dpr);
    canvas.height = Math.round(A * scala * dpr);
    chiaveStanza = '';
    disegna();
  }
  new ResizeObserver(ridimensiona).observe(palco);

  // numero pseudo-casuale fisso per ogni quadretto (per variare i mattoni)
  const caso = (x, y, k = 0) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };

  // sfondo e muri della stanza: disegnati una volta su una tela a parte
  function preparaStanza() {
    const chiave = `${G.n}:${G.stanza.x}:${G.stanza.y}:${canvas.width}`;
    if (chiave === chiaveStanza && telaStanza) return;
    chiaveStanza = chiave;
    const k = scala * dpr;
    telaStanza = telaStanza || document.createElement('canvas');
    telaStanza.width = canvas.width;
    telaStanza.height = canvas.height;
    const g = telaStanza.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    const ox = G.stanza.x * COL, oy = G.stanza.y * RIG;

    // sfondo: mattoni scuri
    g.fillStyle = '#3a2b1e';
    g.fillRect(0, 0, L, A);
    for (let y = 0; y < A; y += 30) {
      const sfas = (y / 30) % 2 ? 30 : 0;
      for (let x = -60 + sfas; x < L; x += 60) {
        const v = caso(x + ox * 7, y + oy * 5);
        g.fillStyle = `rgb(${68 + v * 18},${52 + v * 14},${38 + v * 10})`;
        g.fillRect(x + 2, y + 2, 56, 26);
      }
    }
    // radici che pendono dall'alto
    g.strokeStyle = 'rgba(40,26,14,0.7)';
    g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const x = caso(i, ox + oy, 3) * L;
      const lung = 60 + caso(i, ox, 9) * 140;
      g.lineWidth = 3 + caso(i, oy, 4) * 4;
      g.beginPath();
      g.moveTo(x, 0);
      g.bezierCurveTo(x + 20, lung * 0.4, x - 20, lung * 0.7, x + 6, lung);
      g.stroke();
    }

    // muri e pavimenti
    for (let gy = 0; gy < RIG; gy++) {
      for (let gx = 0; gx < COL; gx++) {
        const X = ox + gx, Y = oy + gy;
        const c = cella(X, Y);
        const x = gx * T, y = gy * T;
        if (c === '#') {
          g.fillStyle = '#8f7656';
          g.fillRect(x, y, T, T);
          // mattoni grandi
          for (let r = 0; r < 2; r++) {
            const sf = (Y + r) % 2 ? 30 : 0;
            for (let m = -1; m < 2; m++) {
              const mx = x + sf + m * 60;
              const v = caso(X * 2 + m, Y * 2 + r);
              g.fillStyle = `rgb(${140 + v * 26},${114 + v * 22},${82 + v * 16})`;
              const l = Math.max(x + 1.5, mx + 1.5), rr = Math.min(x + T - 1.5, mx + 58.5);
              if (rr > l) g.fillRect(l, y + r * 30 + 1.5, rr - l, 27);
            }
          }
          if (cella(X, Y - 1) !== '#') {
            g.fillStyle = '#b89d78';
            g.fillRect(x, y, T, 9);
            g.fillStyle = '#5f8a3a';
            for (let i = 0; i < 4; i++) if (caso(X, Y, i) > 0.55) g.fillRect(x + i * 15 + 2, y - 3, 9, 5);
          }
          if (cella(X, Y + 1) !== '#') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + T - 6, T, 6); }
          if (cella(X - 1, Y) !== '#' && X > 0) { g.fillStyle = 'rgba(255,240,210,0.18)'; g.fillRect(x, y, 4, T); }
          if (cella(X + 1, Y) !== '#' && X < G.liv.lw - 1) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + T - 5, y, 5, T); }
        } else if (c === '-') {
          g.fillStyle = '#7a4a22';
          g.fillRect(x, y, T, 12);
          g.fillStyle = '#a06a35';
          g.fillRect(x, y, T, 4);
          g.fillStyle = '#5a3418';
          g.fillRect(x + 8, y + 12, 6, 14);
          g.fillRect(x + T - 14, y + 12, 6, 14);
        } else if (c === '^') {
          for (let i = 0; i < 3; i++) {
            const sx = x + 4 + i * 18;
            g.fillStyle = '#d7d7d7';
            g.beginPath();
            g.moveTo(sx, y + T); g.lineTo(sx + 8, y + 30); g.lineTo(sx + 16, y + T);
            g.closePath(); g.fill();
            g.strokeStyle = '#4a4a4a'; g.lineWidth = 2; g.stroke();
            g.fillStyle = '#ffffff'; g.fillRect(sx + 7, y + 33, 2, 10);
          }
        }
      }
    }
    // vignettatura
    const v = g.createRadialGradient(L / 2, A / 2, A * 0.35, L / 2, A / 2, L * 0.65);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = v;
    g.fillRect(0, 0, L, A);
  }

  function disegna() {
    if (!G.liv) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#2c1e10';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    preparaStanza();
    const k = scala * dpr;
    // quando l'ispettore capo atterra trema tutto
    const sx = G.scossa > 0 ? (Math.random() - 0.5) * 16 * G.scossa / 0.25 : 0;
    const sy = G.scossa > 0 ? (Math.random() - 0.5) * 12 * G.scossa / 0.25 : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (sx || sy) { ctx.fillStyle = '#2c1e10'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(telaStanza, sx * k, sy * k);
    ctx.setTransform(k, 0, 0, k, (sx - G.stanza.x * L) * k, (sy - G.stanza.y * A) * k);
    const visibile = (x, y, m = 100) => x > G.stanza.x * L - m && x < (G.stanza.x + 1) * L + m && y > G.stanza.y * A - m && y < (G.stanza.y + 1) * A + m;
    const tm = G.tempo;
    const liv = G.liv;

    // torce
    for (const f of liv.torce) {
      if (!visibile(f.x, f.y)) continue;
      disegnaTorcia(f.x, f.y + 10, true, tm);
    }
    // punti di partenza
    for (const c of liv.controlli) {
      if (!visibile(c.x, c.y)) continue;
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(c.x - 5, c.y - 70, 10, 70);
      ctx.fillStyle = '#3a2414';
      ctx.fillRect(c.x - 14, c.y - 74, 28, 8);
      if (c.acceso) disegnaFiamma(c.x, c.y - 80, 1.3, tm);
      else { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(c.x, c.y - 78, 10, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // uscita
    if (liv.uscita && visibile(liv.uscita.x, liv.uscita.y)) {
      const u = liv.uscita;
      ctx.save();
      const bag = ctx.createRadialGradient(u.x, u.y - 50, 5, u.x, u.y - 50, 90);
      bag.addColorStop(0, `rgba(255,214,90,${0.35 + Math.sin(tm * 3) * 0.1})`);
      bag.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = bag;
      ctx.fillRect(u.x - 100, u.y - 150, 200, 160);
      ctx.beginPath();
      ctx.moveTo(u.x - 30, u.y);
      ctx.lineTo(u.x - 30, u.y - 80);
      ctx.quadraticCurveTo(u.x, u.y - 116, u.x + 30, u.y - 80);
      ctx.lineTo(u.x + 30, u.y);
      ctx.closePath();
      ctx.fillStyle = '#120b05';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#e8b33a';
      ctx.stroke();
      ctx.restore();
    }
    // cartelli
    for (const c of liv.cartelli) {
      if (!visibile(c.x, c.y)) continue;
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(c.x - 3, c.y - 44, 6, 44);
      ctx.fillStyle = '#c99a5b';
      ctx.strokeStyle = '#3a2414';
      ctx.lineWidth = 3;
      tondo(c.x - 20, c.y - 62, 40, 28, 5);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a2414';
      ctx.font = '700 20px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', c.x, c.y - 41);
    }
    // pioli
    for (const p of liv.pioli) {
      if (!visibile(p.x, p.y)) continue;
      let cima = p.y;
      while (cima > 0 && !solido(Math.floor(p.x / T), Math.floor((cima - 1) / T))) cima -= T;
      cima = Math.floor(cima / T) * T;
      ctx.strokeStyle = '#5b4a38';
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(p.x, cima); ctx.lineTo(p.x, p.y - 14); ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#3e2a0a';
      ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#f2c14e';
      ctx.stroke();
    }
    // pulsanti
    for (const p of liv.pulsanti) {
      const x = p.x * T, y = (p.y + 1) * T;
      if (!visibile(x, y)) continue;
      const h = p.premuto ? 3 : 9;
      ctx.fillStyle = '#3e2a0a';
      ctx.fillRect(x + 6, y - h - 2, T - 12, h + 2);
      ctx.fillStyle = p.premuto ? '#c7932a' : '#f2c14e';
      ctx.fillRect(x + 9, y - h - 1, T - 18, h - 1);
    }
    // porte (saracinesche che salgono)
    for (const d of liv.porte) {
      const x = d.x * T, y = d.y * T;
      if (!visibile(x, y)) continue;
      const alto = T * (1 - d.apertura);
      if (alto <= 1) continue;
      // la cella più in alto della porta si ritira verso il soffitto: disegno solo la parte rimasta
      ctx.fillStyle = '#4a4f5c';
      ctx.fillRect(x + 14, y, T - 28, alto);
      ctx.fillStyle = '#2b2f38';
      for (let yy = y + 8; yy < y + alto; yy += 16) ctx.fillRect(x + 8, yy, T - 16, 5);
      ctx.strokeStyle = '#1f2433';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 14, y, T - 28, alto);
      if (cella(d.x, d.y + 1) !== '|') {
        ctx.fillStyle = '#2b2f38';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(x + 14 + i * 9, y + alto); ctx.lineTo(x + 18 + i * 9, y + alto + 6); ctx.lineTo(x + 22 + i * 9, y + alto);
          ctx.fill();
        }
      }
    }
    // spuntoni a scomparsa
    const fuori = spuntoniFuori();
    for (let gy = G.stanza.y * RIG; gy < (G.stanza.y + 1) * RIG; gy++) {
      for (let gx = G.stanza.x * COL; gx < (G.stanza.x + 1) * COL; gx++) {
        if (cella(gx, gy) !== 'v') continue;
        const x = gx * T, y = gy * T;
        ctx.fillStyle = '#2a1e14';
        for (let i = 0; i < 3; i++) ctx.fillRect(x + 6 + i * 18, y + T - 4, 12, 4);
        if (!fuori) continue;
        const h = fuori === 1 ? 30 : 9;
        for (let i = 0; i < 3; i++) {
          const sx = x + 4 + i * 18;
          ctx.fillStyle = fuori === 1 ? '#c9ced6' : '#8c94a6';
          ctx.beginPath();
          ctx.moveTo(sx, y + T); ctx.lineTo(sx + 8, y + T - h); ctx.lineTo(sx + 16, y + T);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2; ctx.stroke();
        }
      }
    }
    // cesoie: due lame che si chiudono a tempo
    for (const c of liv.cesoie) {
      const x = c.x * T + T / 2, alto = (c.y - 1) * T, basso = (c.y + 1) * T;
      if (!visibile(x, alto)) continue;
      const k = chiusura(c);
      const lung = 6 + (T - 6) * k;
      ctx.fillStyle = '#2a1e14';
      ctx.fillRect(x - 18, alto, 36, 8);
      ctx.fillRect(x - 18, basso - 6, 36, 6);
      for (const [y0, verso] of [[alto + 4, 1], [basso - 3, -1]]) {
        const y1 = y0 + verso * lung;
        ctx.fillStyle = k > 0.7 ? '#e6e9ee' : '#b9c0cc';
        ctx.strokeStyle = '#2b2f38';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x - 13, y0);
        ctx.lineTo(x + 13, y0);
        ctx.lineTo(x + 13, y1 - verso * 10);
        for (let i = 0; i < 3; i++) { ctx.lineTo(x + 13 - (i * 2 + 1) * 4.3, y1); ctx.lineTo(x + 13 - (i * 2 + 2) * 4.3, y1 - verso * 7); }
        ctx.lineTo(x - 13, y1 - verso * 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x - 9, Math.min(y0, y1) + 3, 3, Math.max(0, Math.abs(y1 - y0) - 14));
      }
    }
    // stalattiti
    for (const k of liv.stalattiti) {
      if (!visibile(k.x, k.y0)) continue;
      ctx.fillStyle = '#5f4b37';
      ctx.beginPath(); ctx.ellipse(k.x, k.y0 + 2, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
      if (k.stato === 'rotta') continue;
      const tr = k.stato === 'trema' ? (Math.random() - 0.5) * 5 : 0;
      ctx.fillStyle = '#8a7357';
      ctx.strokeStyle = '#3e3226';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(k.x - 15 + tr, k.y);
      ctx.lineTo(k.x + 15 + tr, k.y);
      ctx.lineTo(k.x + 5 + tr, k.y + 28);
      ctx.lineTo(k.x + tr, k.y + 46);
      ctx.lineTo(k.x - 6 + tr, k.y + 26);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,210,0.3)';
      ctx.fillRect(k.x - 8 + tr, k.y + 3, 4, 18);
    }
    // porte col lucchetto (salgono quando si aprono)
    for (const p of liv.serrature) {
      const x = p.x * T, y = p.y * T;
      if (!visibile(x, y)) continue;
      const alto = T * (1 - p.aperta);
      if (alto <= 1) continue;
      ctx.fillStyle = '#7a4a22';
      ctx.fillRect(x + 6, y, T - 12, alto);
      ctx.strokeStyle = '#3a2414';
      ctx.lineWidth = 2;
      for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 6 + i * 16, y); ctx.lineTo(x + 6 + i * 16, y + alto); ctx.stroke(); }
      ctx.strokeRect(x + 6, y, T - 12, alto);
      ctx.fillStyle = '#3e3e46';
      if (alto > 16) ctx.fillRect(x + 4, y + 8, T - 8, 6);
      if (alto > 50) ctx.fillRect(x + 4, y + 44, T - 8, 6);
      // lucchetto sulla cella più in basso
      if (cella(p.x, p.y + 1) !== 'L' && !p.apre) {
        const cx = x + T / 2, cy = y + 30;
        ctx.strokeStyle = '#6b5014'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy - 6, 8, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#e8b33a'; ctx.strokeStyle = '#6b5014'; ctx.lineWidth = 2;
        tondo(cx - 12, cy - 6, 24, 20, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3a2414';
        ctx.beginPath(); ctx.arc(cx, cy + 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(cx - 1.5, cy + 2, 3, 7);
      }
    }
    // chiavi
    for (const k of liv.chiavi) {
      if (k.preso || !visibile(k.x, k.y)) continue;
      const by = Math.sin(tm * 3 + k.x) * 4;
      const b = ctx.createRadialGradient(k.x, k.y + by, 2, k.x, k.y + by, 34);
      b.addColorStop(0, 'rgba(255,220,90,0.55)'); b.addColorStop(1, 'rgba(255,220,90,0)');
      ctx.fillStyle = b; ctx.fillRect(k.x - 34, k.y + by - 34, 68, 68);
      ctx.drawImage(figure.chiave, k.x - 20, k.y + by - 20, 40, 40);
    }
    // pavimento crepato
    for (const c of liv.crepe) {
      if (c.stato === 'caduta') continue;
      const x = c.x * T, y = c.y * T;
      if (!visibile(x, y)) continue;
      const tr = c.stato === 'trema' ? (Math.random() - 0.5) * 4 : 0;
      ctx.fillStyle = '#a58a66';
      ctx.fillRect(x + tr, y, T, 22);
      ctx.fillStyle = '#b89d78';
      ctx.fillRect(x + tr, y, T, 7);
      ctx.strokeStyle = '#3e3226';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 12 + tr, y); ctx.lineTo(x + 22 + tr, y + 12); ctx.lineTo(x + 16 + tr, y + 22);
      ctx.moveTo(x + 44 + tr, y); ctx.lineTo(x + 36 + tr, y + 10); ctx.lineTo(x + 48 + tr, y + 22);
      ctx.stroke();
    }
    // ceci
    for (const c of liv.ceci) {
      if (c.preso || !visibile(c.x, c.y)) continue;
      const by = Math.sin(tm * 3 + c.x * 0.05) * 4;
      const s = c.oro ? 1.4 : 1;
      if (c.oro) {
        const b = ctx.createRadialGradient(c.x, c.y + by, 2, c.x, c.y + by, 34);
        b.addColorStop(0, 'rgba(255,220,90,0.7)'); b.addColorStop(1, 'rgba(255,220,90,0)');
        ctx.fillStyle = b; ctx.fillRect(c.x - 34, c.y + by - 34, 68, 68);
      }
      ctx.drawImage(figure.cece, c.x - 15 * s, c.y + by - 15 * s, 30 * s, 30 * s);
    }
    // robivecchi: luccicano; quelli già trovati in una partita precedente sono più trasparenti
    for (const r of liv.robivecchi) {
      if (r.preso || !visibile(r.x, r.y)) continue;
      const by = Math.sin(tm * 2.4 + r.x) * 5;
      const b = ctx.createRadialGradient(r.x, r.y + by, 3, r.x, r.y + by, 40);
      b.addColorStop(0, `rgba(255,236,150,${0.5 + Math.sin(tm * 5) * 0.15})`);
      b.addColorStop(1, 'rgba(255,236,150,0)');
      ctx.fillStyle = b;
      ctx.fillRect(r.x - 40, r.y + by - 40, 80, 80);
      ctx.globalAlpha = r.giaTrovato ? 0.5 : 1;
      ctx.save();
      ctx.translate(r.x, r.y + by);
      ctx.rotate(Math.sin(tm * 1.7 + r.y) * 0.15);
      ctx.drawImage(figure['robi' + r.tipo], -20, -20, 40, 40);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (Math.sin(tm * 3 + r.x) > 0.6) stella(r.x + 16, r.y + by - 16, 5, '#fffbe0');
    }
    // agenti
    for (const a of liv.agenti) {
      if (!visibile(a.x, a.y)) continue;
      disegnaAgente(a, tm);
    }
    // ispettore capo (dorme dietro la scrivania)
    if (liv.capo) {
      const c = liv.capo;
      const sc = c.scrivania;
      if (c.stato !== 'dorme' && visibile(sc.x, sc.y)) disegnaScrivania(sc.x, sc.y);
      if (visibile(c.x, c.y, 200)) disegnaCapo(c, tm);
      if (c.stato === 'dorme' && visibile(sc.x, sc.y)) disegnaScrivania(sc.x, sc.y);
    }
    // onde del megafono
    for (const o of G.onde) disegnaOnda(o, tm);
    // bollette
    for (const b of G.bollette) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#1f2433';
      ctx.lineWidth = 2;
      ctx.fillRect(-11, -14, 22, 28);
      ctx.strokeRect(-11, -14, 22, 28);
      ctx.fillStyle = '#c0392b';
      ctx.font = '700 8px "Alfa Slab One", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TARI', 0, -4);
      ctx.fillStyle = '#8c94a6';
      ctx.fillRect(-7, 1, 14, 2); ctx.fillRect(-7, 6, 10, 2);
      ctx.restore();
    }
    disegnaTino(tm);
    // particelle
    for (const p of G.particelle) {
      ctx.globalAlpha = clamp(p.vita * 2, 0, 1);
      ctx.fillStyle = p.colore;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // scritte
    ctx.textAlign = 'center';
    ctx.font = '700 22px Fredoka, sans-serif';
    ctx.lineJoin = 'round';
    for (const s of G.scritte) {
      ctx.globalAlpha = clamp(s.vita * 2, 0, 1);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#2a1004';
      ctx.strokeText(s.testo, s.x, s.y);
      ctx.fillStyle = s.colore;
      ctx.fillText(s.testo, s.x, s.y);
    }
    ctx.globalAlpha = 1;

    // testo del cartello (in alto, fisso sullo schermo)
    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (G.cartello && G.tino.stato !== 'ko') {
      // se Tino è nella metà alta dello schermo il fumetto va in basso, per non coprire niente
      const inAlto = G.tino.y - G.stanza.y * A < A * 0.55;
      disegnaFumetto(touch ? G.cartello.testo.touch : G.cartello.testo.pc, inAlto);
    }
  }

  function tondo(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function disegnaFumetto(testo, inBasso = false) {
    if (!testo) return;
    ctx.font = '600 21px Fredoka, sans-serif';
    const parole = testo.split(' ');
    const righe = [];
    let riga = '';
    for (const p of parole) {
      const prova = riga ? riga + ' ' + p : p;
      if (ctx.measureText(prova).width > 760 && riga) { righe.push(riga); riga = p; } else riga = prova;
    }
    righe.push(riga);
    const h = 22 + righe.length * 27;
    const y0 = inBasso ? A - 12 - h : 12;
    ctx.fillStyle = 'rgba(255,248,236,0.94)';
    ctx.strokeStyle = '#7a4a22';
    ctx.lineWidth = 3;
    tondo(L / 2 - 400, y0, 800, h, 14);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3b2a1a';
    ctx.textAlign = 'center';
    righe.forEach((r, i) => ctx.fillText(r, L / 2, y0 + 32 + i * 27));
  }

  function disegnaFiamma(x, y, s, tm) {
    const f = 1 + Math.sin(tm * 17 + x) * 0.08 + Math.sin(tm * 29 + x * 2) * 0.05;
    const b = ctx.createRadialGradient(x, y, 2, x, y, 70 * s);
    b.addColorStop(0, 'rgba(255,190,80,0.35)');
    b.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = b;
    ctx.fillRect(x - 70 * s, y - 70 * s, 140 * s, 140 * s);
    ctx.fillStyle = '#f5a623';
    ctx.beginPath(); ctx.ellipse(x, y, 9 * s, 15 * s * f, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe680';
    ctx.beginPath(); ctx.ellipse(x, y + 4 * s, 4.5 * s, 8 * s * f, 0, 0, Math.PI * 2); ctx.fill();
  }

  function disegnaTorcia(x, y, accesa, tm) {
    ctx.fillStyle = '#5b3a1e';
    ctx.fillRect(x - 5, y, 10, 30);
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(x - 9, y - 4, 18, 8);
    if (accesa) disegnaFiamma(x, y - 12, 1, tm);
  }

  function disegnaAgente(a, tm) {
    const fig = figure[a.tipo];
    if (!fig) return;
    const alto = 100, largo = alto * fig.width / fig.height;
    ctx.save();
    ctx.translate(a.x, a.y);
    let rot = 0, su = 0;
    if (a.stato === 'stordito') rot = Math.sin(tm * 6) * 0.12 + 0.1;
    else if (a.stato === 'festa') su = -Math.abs(Math.sin(tm * 12)) * 10;
    else if (Math.abs(a.vx) > 1) { rot = Math.sin(a.passo * (a.stato === 'insegue' ? 16 : 9)) * 0.07; su = -Math.abs(Math.sin(a.passo * (a.stato === 'insegue' ? 16 : 9))) * 4; }
    else rot = Math.sin(a.passo * 2) * 0.02;
    ctx.translate(0, su);
    ctx.rotate(rot);
    // la figura è disegnata di fronte: il centro del corpo è a circa il 42% della larghezza
    ctx.drawImage(fig, -largo * 0.42, -alto + 4, largo, alto);
    ctx.restore();
    if (a.stato === 'stordito') {
      for (let i = 0; i < 3; i++) {
        const an = tm * 4 + i * 2.1;
        const sx = a.x + Math.cos(an) * 26, sy = a.y - a.h - 18 + Math.sin(an) * 7;
        stella(sx, sy, 7, '#ffe680');
      }
    }
  }

  function disegnaScrivania(x, y) {
    // piano, gambe, pratiche e un timbro
    ctx.fillStyle = '#5b3a1e';
    ctx.fillRect(x - 62, y - 58, 124, 12);
    ctx.fillStyle = '#4a2e16';
    ctx.fillRect(x - 56, y - 46, 112, 46);
    ctx.fillStyle = '#6e4626';
    ctx.fillRect(x - 50, y - 40, 46, 16);
    ctx.fillRect(x + 4, y - 40, 46, 16);
    ctx.fillStyle = '#e8b33a';
    ctx.fillRect(x - 30, y - 34, 8, 4);
    ctx.fillRect(x + 24, y - 34, 8, 4);
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 62, y - 58, 124, 12);
    ctx.strokeRect(x - 56, y - 46, 112, 46);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#f4efe2' : '#e6dcc4';
      ctx.fillRect(x - 52 + i * 2, y - 66 - i * 5, 34, 6);
      ctx.strokeStyle = '#8c94a6'; ctx.lineWidth = 1;
      ctx.strokeRect(x - 52 + i * 2, y - 66 - i * 5, 34, 6);
    }
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x + 30, y - 66, 18, 8);
    ctx.fillStyle = '#5b3a1e';
    ctx.fillRect(x + 36, y - 78, 6, 12);
    ctx.beginPath(); ctx.arc(x + 39, y - 80, 6, 0, Math.PI * 2); ctx.fill();
  }

  function disegnaCapo(c, tm) {
    if (c.stato === 'arriva' || c.stato === 'cade') return;
    const fig = figure.capo;
    if (!fig) return;
    const alto = 132, largo = alto * fig.width / fig.height;
    ctx.save();
    ctx.translate(c.x, c.y);
    let rot = 0, su = 0, sx = 1, sy = 1;
    if (c.stato === 'dorme') { rot = 0.07 + Math.sin(tm * 1.6) * 0.02; sy = 1 + Math.sin(tm * 1.6) * 0.015; }
    else if (c.stato === 'sveglia') su = -Math.abs(Math.sin(c.t * 12)) * 16;
    else if (c.stato === 'urla') { sx = 1.04; sy = 0.97; ctx.translate((Math.random() - 0.5) * 3, 0); }
    else if (c.stato === 'ahi') rot = -c.dir * 0.14 + Math.sin(tm * 40) * 0.04;
    else if (c.stato === 'festa') su = -Math.abs(Math.sin(tm * 10)) * 12;
    else if (!c.aTerra) { rot = -c.dir * 0.06; sx = 0.96; sy = 1.04; }
    else if (Math.abs(c.vx) > 1) { rot = Math.sin(c.passo * 11) * 0.06; su = -Math.abs(Math.sin(c.passo * 11)) * 5; }
    else rot = Math.sin(c.passo * 2) * 0.02;
    ctx.translate(0, su);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    if (c.immune > 0 && c.stato !== 'ahi' && Math.floor(tm * 10) % 2) ctx.globalAlpha = 0.8;
    // la figura guarda a destra: il corpo è a circa il 42% della larghezza
    ctx.drawImage(fig, -largo * 0.42, -alto + 4, largo, alto);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    const scrivi = (testo, x, y, dim, colore) => {
      ctx.font = `700 ${dim}px Fredoka, sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = '#2a1004'; ctx.strokeText(testo, x, y);
      ctx.fillStyle = colore; ctx.fillText(testo, x, y);
    };
    if (c.stato === 'dorme') {
      for (let i = 0; i < 3; i++) {
        const f = (tm * 0.5 + i / 3) % 1;
        ctx.globalAlpha = Math.sin(f * Math.PI);
        scrivi('z', c.x + 30 + f * 30, c.y - alto - f * 40, 16 + i * 5, '#ffffff');
      }
      ctx.globalAlpha = 1;
    } else if (c.stato === 'sveglia') scrivi('!', c.x, c.y - alto - 16, 40, '#ffe680');
    else if (c.stato === 'urla') {
      // il megafono si gonfia
      const mx = c.x - largo * 0.42 + largo * (232 / 260), my = c.y - alto + 4 + alto * (112 / 320);
      ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(mx, my, 10 + i * 8 + (tm * 40) % 8, -0.6, 0.6); ctx.stroke(); }
    }
    if (c.stato === 'ahi') for (let i = 0; i < 3; i++) {
      const an = tm * 5 + i * 2.1;
      stella(c.x + Math.cos(an) * 30, c.y - alto - 6 + Math.sin(an) * 7, 7, '#ffe680');
    }
  }

  // onda del megafono: archi e la scritta MULTA!
  function disegnaOnda(o, tm) {
    const d = segno(o.vx);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const r = 10 + i * 7;
      ctx.beginPath();
      ctx.arc(o.x - d * (24 - i * 4), o.y, r, d > 0 ? -0.9 : Math.PI - 0.9, d > 0 ? 0.9 : Math.PI + 0.9);
      ctx.strokeStyle = '#2a1004'; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = i === 2 ? '#ff6a4d' : '#ffe680'; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.font = '700 15px "Alfa Slab One", Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = '#2a1004';
    const y = o.y - 24 + Math.sin(tm * 20) * 2;
    ctx.strokeText('MULTA!', o.x - d * 10, y);
    ctx.fillStyle = '#ff6a4d';
    ctx.fillText('MULTA!', o.x - d * 10, y);
    ctx.restore();
  }

  function stella(x, y, r, colore) {
    ctx.fillStyle = colore;
    ctx.strokeStyle = '#7a5d10';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  function posaTino() {
    const t = G.tino;
    if (t.stato === 'ko') return 'ko';
    if (t.ferito > 0) return 'ferito';
    const agentiVicini = G.liv.agenti.some((a) => a.stato !== 'stordito' && a.stanzaX === G.stanza.x && a.stanzaY === G.stanza.y && Math.abs(a.x - t.x) < 4 * T && Math.abs(a.y - t.y) < 2 * T);
    const c = G.liv.capo;
    const capoVicino = c && attivo(c) && Math.abs(c.x - t.x) < 6 * T && Math.abs(c.y - t.y) < 3 * T;
    if (t.ceci === 1 || agentiVicini || capoVicino) return 'arrabbiato';
    return 'normale';
  }

  function disegnaTino(tm) {
    const t = G.tino;
    const posa = posaTino();
    const frustaInUso = t.stato === 'dondola' || t.lasca || t.schiocco > 0;
    const fig = figure[posa + (frustaInUso ? '-senza' : '')];
    if (!fig) return;
    const s = 1 / RISOLUZIONE;
    ctx.save();
    if (t.invulnerabile > 0 && t.stato !== 'ko' && Math.floor(tm * 14) % 2) ctx.globalAlpha = 0.45;
    if (t.stato === 'uscita') ctx.globalAlpha = clamp(1 - G.tempoMorte / 0.9, 0, 1);

    // la frusta fino al piolo: tesa mentre dondola, un po' molle quando è lasca
    if (t.piolo && (t.stato === 'dondola' || t.lasca)) {
      const mx = t.x + t.dir * TINO.palmo.x, my = t.y + TINO.palmo.y;
      const d = Math.hypot(mx - t.piolo.x, my - t.piolo.y);
      const molle = t.lasca ? Math.max(0, t.corda - d) * 0.6 + 6 : 0;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#24150a'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(mx, my);
      ctx.quadraticCurveTo((mx + t.piolo.x) / 2, (my + t.piolo.y) / 2 + molle, t.piolo.x, t.piolo.y);
      ctx.stroke();
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.translate(t.x, t.y);
    let sx = 1, sy = 1, rot = 0, dy = 0;
    if (t.stato === 'ko') {
      // sdraiato
    } else if (t.stato === 'dondola') {
      // ruota attorno alla mano che regge la frusta
      ctx.translate(t.dir * TINO.palmo.x, TINO.palmo.y);
      ctx.rotate(-t.angolo * 0.8);
      ctx.translate(-t.dir * TINO.palmo.x, -TINO.palmo.y);
    } else if (t.stato === 'appeso') {
      rot = t.appiglio.dir * 0.08;
      dy = Math.sin(tm * 5) * 1.5;
    } else if (t.stato === 'sale') {
      rot = t.appiglio.dir * 0.2 * Math.sin(Math.min(1, t.sale) * Math.PI);
    } else if (!t.aTerra) {
      if (t.vy < 0) { sx = 0.93; sy = 1.07; } else { sx = 1.03; sy = 0.98; }
      rot = t.dir * clamp(t.vx / 2500, -0.1, 0.1);
    } else if (Math.abs(t.vx) > 20) {
      rot = Math.sin(t.passo) * 0.08;
      dy = -Math.abs(Math.cos(t.passo)) * 4;
    }
    if (t.schiaccia > 0) { const q = t.schiaccia / 0.14; sx *= 1 + 0.12 * q; sy *= 1 - 0.12 * q; }
    if (posa === 'ferito' && t.stato !== 'ko') ctx.translate(Math.sin(tm * 60) * 2, 0);
    ctx.translate(0, dy);
    ctx.rotate(rot);
    ctx.scale(sx * t.dir, sy);
    ctx.drawImage(fig.c, -fig.ax * s, -fig.ay * s, fig.c.width * s, fig.c.height * s);
    ctx.restore();

    // schiocco della frusta
    if (t.schiocco > 0) {
      const p = 1 - t.schiocco / FRUSTA.durataSchiocco;
      const lung = FRUSTA.schiocco * Math.sin(Math.min(1, p * 1.4) * Math.PI * 0.5 + (p > 0.7 ? (p - 0.7) * 2 : 0));
      const mx = t.x + t.dir * TINO.palmo.x, my = t.y + TINO.palmo.y;
      const fx = mx + t.dir * lung, fy = my - 16 + Math.sin(p * 9) * 8;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#24150a'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(mx, my);
      ctx.quadraticCurveTo(mx + t.dir * lung * 0.5, my - 34 * (1 - p), fx, fy);
      ctx.stroke();
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2.5; ctx.stroke();
      if (p > 0.45 && p < 0.8) stella(fx, fy, 9, '#fff6c8');
    }
  }

  // ---------------------------------------------------------------- pannelli
  const LOGO = `
    <svg class="logo" viewBox="0 0 400 230" role="img" aria-label="Tino e la Ghianda d'Oro">
      <defs>
        <linearGradient id="logo-oro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffe680"/><stop offset="0.45" stop-color="#f2a93b"/><stop offset="1" stop-color="#c2401c"/>
        </linearGradient>
        <path id="logo-arco" d="M40 150 Q200 40 360 150"/>
      </defs>
      <g font-family="'Alfa Slab One', Georgia, serif" font-size="96" text-anchor="middle" letter-spacing="4">
        ${[8, 6, 4, 2].map((d) => `<text transform="translate(${d * 0.6} ${d})" fill="#3a1606"><textPath href="#logo-arco" startOffset="50%">TINO</textPath></text>`).join('')}
        <text fill="url(#logo-oro)" stroke="#2a1004" stroke-width="3" paint-order="stroke"><textPath href="#logo-arco" startOffset="50%">TINO</textPath></text>
      </g>
      <g transform="translate(200 196) rotate(-3)">
        <rect x="-150" y="-26" width="300" height="40" rx="4" fill="#b8321f" stroke="#2a1004" stroke-width="3"/>
        <path d="M-150 -26 L-172 -6 L-150 14 M150 -26 L172 -6 L150 14" fill="#8e2414" stroke="#2a1004" stroke-width="3" stroke-linejoin="round"/>
        <text y="3" text-anchor="middle" font-family="'Alfa Slab One', Georgia, serif" font-size="23" fill="#ffe7a8">e la Ghianda d'Oro</text>
      </g>
    </svg>`;

  const COMANDI = touch
    ? `<div class="comandi">
        <p><b>◀ ▶</b> muovi Tino · <b>Salta</b> salta e sale sui bordi · <b>▼</b> scendi da un bordo</p>
        <p><b>Frusta</b>: vicino a un piolo d'oro ti agganci, altrimenti stordisci gli agenti</p>
        <p>Appeso alla frusta: <b>▲ ▼</b> accorci e allunghi, <b>Salta</b> o <b>Frusta</b> per staccarti</p>
      </div>`
    : `<div class="comandi">
        <p><kbd>←</kbd> <kbd>→</kbd> muovi Tino · <kbd>↑</kbd> o <kbd>Spazio</kbd> salta e sale sui bordi · <kbd>↓</kbd> scendi</p>
        <p><kbd>X</kbd> frusta: vicino a un piolo d'oro ti agganci, altrimenti stordisci gli agenti</p>
        <p>Appeso alla frusta: <kbd>↑</kbd> <kbd>↓</kbd> accorci e allunghi, <kbd>Spazio</kbd> o <kbd>X</kbd> per staccarti</p>
        <p><kbd>P</kbd> pausa · <kbd>M</kbd> suoni</p>
      </div>`;

  function apriPannello(html) {
    pannello.innerHTML = `<div class="riquadro">${html}</div>`;
    pannello.classList.add('visibile');
    const b = pannello.querySelector('[data-azione]');
    if (b && !touch) b.focus();
  }
  function chiudiPannello() { pannello.classList.remove('visibile'); pannello.innerHTML = ''; }

  pannello.addEventListener('click', (e) => {
    const b = e.target.closest('[data-azione]');
    if (!b) return;
    const az = b.dataset.azione;
    if (az === 'gioca') avvia(Number(b.dataset.livello || 0));
    else if (az === 'riprendi') riprendi();
    else if (az === 'riprova') avvia(G.n, G.tino.controllo);
    else if (az === 'ricomincia') avvia(G.n);
    else if (az === 'menu') mostraMenu();
    else if (az === 'prossimo') avvia(G.n + 1);
  });

  function ritratto(posa) {
    const f = figure[posa];
    if (!f) return '';
    const id = 'r' + Math.random().toString(36).slice(2);
    setTimeout(() => {
      const c = document.getElementById(id);
      if (!c) return;
      c.width = f.c.width; c.height = f.c.height;
      c.getContext('2d').drawImage(f.c, 0, 0);
    });
    return `<div class="ritratto"><canvas id="${id}" class="${posa === 'ko' ? '' : 'salta'}"></canvas></div>`;
  }

  function mostraMenu() {
    G.fase = 'menu';
    const s = sbloccati();
    const n = window.LIVELLI.length;
    let livelli = '';
    if (n > 1) {
      livelli = '<div class="livelli">' + window.LIVELLI.map((l, i) =>
        `<button class="bottone secondario" type="button" data-azione="gioca" data-livello="${i}" ${i < s ? '' : 'disabled'} title="${l.nome}">${i + 1}</button>`).join('') + '</div>';
    }
    const continua = Math.min(s, n) - 1;
    apriPannello(`
      ${LOGO}
      <p class="storia">Gli agenti della Tari hanno rapito Gino e lo tengono nel tempio della Ghianda d'Oro.
        Tino prende cappello e frusta e parte all'avventura!</p>
      <div class="scelte">
        <button class="bottone" type="button" data-azione="gioca" data-livello="${continua}">${continua > 0 ? `Continua dal livello ${continua + 1}` : 'Gioca'}</button>
      </div>
      ${livelli}
      ${collezione()}
      ${COMANDI}`);
  }

  function collezione() {
    const tutti = elencoRobivecchi();
    if (!tutti.length) return '';
    const tr = trovati();
    const n = tutti.filter((r) => tr[r.chiave]).length;
    return `<div class="collezione">
      <p><b>Robivecchi trovati: ${n} su ${tutti.length}</b></p>
      <div class="vetrina">${tutti.map((r) => `<img src="${BASE + SORGENTI['robi' + r.tipo]}" alt="${ROBIVECCHI[r.tipo].nome}" title="${ROBIVECCHI[r.tipo].nome} · livello ${r.n + 1}${tr[r.chiave] ? '' : ' (da trovare)'}" class="${tr[r.chiave] ? '' : 'vuoto'}">`).join('')}</div>
    </div>`;
  }

  function mostraKo() {
    G.fase = 'ko';
    apriPannello(`
      ${ritratto('ko')}
      <h2>Tino è KO!</h2>
      <p>Finiti i ceci: gli agenti della Tari esultano. Ma Tino non si arrende!</p>
      <div class="scelte">
        <button class="bottone" type="button" data-azione="riprova">Riparti dal punto di partenza</button>
        <button class="bottone secondario" type="button" data-azione="menu">Menu</button>
      </div>`);
  }

  function mostraFineLivello() {
    G.fase = 'fine';
    const n = G.n;
    const ultimo = n + 1 >= window.LIVELLI.length;
    scrivi('sbloccati', Math.max(sbloccati(), Math.min(window.LIVELLI.length, n + 2)));
    const minuti = Math.floor(G.tempo / 60), secondi = Math.floor(G.tempo % 60);
    apriPannello(`
      ${ritratto('normale')}
      <h2>Livello superato!</h2>
      <p class="statistiche">Ceci raccolti: <b>${G.raccolti}</b> su ${G.liv.ceciTotali} · Tempo: <b>${minuti}:${String(secondi).padStart(2, '0')}</b></p>
      ${G.liv.robivecchi.length ? `<p class="statistiche">Robivecchi: ${G.liv.robivecchi.map((r) => `<img class="robi-mini ${r.preso || r.giaTrovato ? '' : 'vuoto'}" src="${BASE + SORGENTI['robi' + r.tipo]}" alt="${ROBIVECCHI[r.tipo].nome}" title="${ROBIVECCHI[r.tipo].nome}">`).join(' ')}</p>` : ''}
      ${G.liv.def.fine ? `<p>${G.liv.def.fine}</p>` : ''}
      ${ultimo ? '<p>Gino è ancora prigioniero più in fondo nel tempio: i prossimi livelli arrivano presto!</p>' : ''}
      <div class="scelte">
        ${ultimo ? '' : '<button class="bottone" type="button" data-azione="prossimo">Livello successivo</button>'}
        <button class="bottone ${ultimo ? '' : 'secondario'}" type="button" data-azione="ricomincia">Rigioca</button>
        <button class="bottone secondario" type="button" data-azione="menu">Menu</button>
      </div>`);
  }

  function pausa() {
    if (G.fase !== 'gioco') return;
    G.fase = 'pausa';
    apriPannello(`
      <h2>Pausa</h2>
      <div class="scelte">
        <button class="bottone" type="button" data-azione="riprendi">Riprendi</button>
        <button class="bottone secondario" type="button" data-azione="ricomincia">Ricomincia il livello</button>
        <button class="bottone secondario" type="button" data-azione="menu">Menu</button>
      </div>
      ${COMANDI}`);
  }
  function riprendi() {
    if (G.fase !== 'pausa') return;
    chiudiPannello();
    G.fase = 'gioco';
    ultimo = performance.now();
  }

  function avvia(n, daControllo = null) {
    chiudiPannello();
    iniziaLivello(n, daControllo);
    G.fase = 'gioco';
    ultimo = performance.now();
    for (const k in prima) prima[k] = true; // il tasto premuto per iniziare non fa saltare
  }

  // ---------------------------------------------------------------- ciclo
  let ultimo = performance.now();
  const PASSO = 1 / 120;
  let accumulo = 0;
  function ciclo(ora) {
    const dt = Math.min(0.05, (ora - ultimo) / 1000);
    ultimo = ora;
    const verticale = touch && matchMedia('(orientation: portrait)').matches;
    if (G.fase === 'gioco' && !G.test && !verticale) {
      leggiComandi();
      accumulo += dt;
      while (accumulo >= PASSO) {
        aggiorna(PASSO);
        accumulo -= PASSO;
      }
    }
    if (!G.test || G.disegnaInTest) disegna();
    requestAnimationFrame(ciclo);
  }

  // ---------------------------------------------------------------- avvio
  caricate.then(() => {
    preparaFigure();
    iniziaLivello(0);
    ridimensiona();
    mostraMenu();
    requestAnimationFrame(ciclo);
  });

  // Per le prove automatiche: si possono simulare partite senza tempo reale.
  window.ghiandaDOro = {
    G, comandi, FISICA, FRUSTA, AGENTI, VITA, TINO, POSE, CAPO,
    pronto: caricate,
    avvia,
    passo(dt = PASSO) { aggiorna(dt); },
    premi(nuovi) { for (const k in comandi) comandi[k] = !!nuovi[k]; },
    cella, solido, ROBIVECCHI, chiusura, spuntoniFuori,
  };
})();
