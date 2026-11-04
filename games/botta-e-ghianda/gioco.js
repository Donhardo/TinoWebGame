/*
 * Botta e Ghianda
 * Tino e Gino si rimandano una ghianda: le racchette sono i due personaggi.
 *
 * La fisica lavora in coordinate di campo (u, v):
 *   u = asse tra i due giocatori (0 = lato di Tino, L = lato di Gino)
 *   v = asse lungo cui si muovono i personaggi (0..S)
 * Su schermo orizzontale u va da sinistra a destra; su schermo verticale
 * (telefono in verticale) Tino sta in basso e Gino in alto.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------- costanti
  const L = 960;               // lunghezza del campo
  const S = 540;               // larghezza del campo
  const R = 13;                // raggio della ghianda
  const FACCIA = 118;          // distanza dal fondo del piano di battuta
  const LUNG = 124;            // lunghezza utile della "racchetta"
  const BOX_V = 150;           // ingombro immagine lungo v
  const BOX_U = 112;           // ingombro immagine lungo u
  const ANGOLO_MAX = 55 * Math.PI / 180;
  const PUNTI_LIVELLO = 5;     // punti per superare un livello contro Gino
  const PUNTI_DUE = 7;         // punti per vincere in due giocatori
  const VEL_PUNTATORE = 2600;  // velocità massima quando si segue mouse o dito

  const ASSETS = '../../assets/';
  const immagini = {
    normale: carica('tino/tino-normale.png'),
    arrabbiato: carica('tino/tino-arrabbiato.png'),
    ferito: carica('tino/tino-ferito.png'),
    ko: carica('tino/tino-ko.png'),
    gino: carica('gino/gino.png'),
  };
  function carica(percorso) {
    const img = new Image();
    img.src = ASSETS + percorso;
    return img;
  }

  // ---------------------------------------------------------------- DOM
  const $ = (s) => document.querySelector(s);
  const canvas = $('#campo');
  const ctx = canvas.getContext('2d');
  const palco = $('#palco');
  const pannello = $('#pannello');
  const elPuntiTino = $('#punti-tino');
  const elPuntiGino = $('#punti-gino');
  const elInfo = $('#info');

  // ---------------------------------------------------------------- utilità
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const casuale = (a, b) => a + Math.random() * (b - a);

  function leggi(chiave, predefinito) {
    try {
      const v = localStorage.getItem('botta-e-ghianda:' + chiave);
      return v === null ? predefinito : JSON.parse(v);
    } catch (e) {
      return predefinito;
    }
  }
  function scrivi(chiave, valore) {
    try { localStorage.setItem('botta-e-ghianda:' + chiave, JSON.stringify(valore)); } catch (e) { /* niente */ }
  }

  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  // ---------------------------------------------------------------- stato
  function nuovoGiocatore(lato) {
    return {
      lato,                 // 'tino' | 'gino'
      v: S / 2,
      vel: 0,
      bersaglio: null,      // posizione richiesta da mouse/dito
      tastoPremuto: 0,      // da quanto si tiene premuto un tasto
      faccia: 'normale', facciaT: 0,
      schiaccia: 0,         // 0..1 dopo una battuta
      saltoT: 0,            // saltello quando segna
      tremaT: 0,            // tremolio quando subisce
      festa: false,         // saltelli continui a fine partita
      caduta: 0,            // 0..1 quando perde la partita
      ia: { timer: 0, bersaglio: S / 2, mira: 0, sbaglio: 0 },
    };
  }

  const stato = {
    modo: 'demo',          // 'demo' | 'cpu' | 'due'
    fase: 'demo',          // 'demo' | 'servizio' | 'gioco' | 'punto' | 'pausa' | 'fine-livello' | 'fine'
    pausaDa: null,
    livello: 1,
    punti: { tino: 0, gino: 0 },
    puntiGiocati: 0,
    timer: 0,
    versoServizio: 1,
    palla: { u: L / 2, v: S / 2, vu: 0, vv: 0, vel: 0, rot: 0, visibile: true },
    scia: [],
    tino: nuovoGiocatore('tino'),
    gino: nuovoGiocatore('gino'),
    messaggio: null,       // { testo, t, durata }
    vincitore: null,
  };
  let muto = leggi('muto', false);
  let record = leggi('record', 1);

  // ---------------------------------------------------------------- difficoltà
  // d cresce di 1 per livello e un poco a ogni punto giocato nel livello.
  function difficolta() {
    if (stato.modo === 'demo') return 2;
    return (stato.livello - 1) + Math.min(stato.puntiGiocati, 8) * 0.1;
  }

  const PALLA = {
    inizio: [420, 25, 640],   // velocità al servizio: base, aumento per livello, massimo
    max: [900, 45, 1300],     // velocità massima raggiungibile nello scambio
    accel: 1.06,              // aumento a ogni colpo
  };
  function parametriPalla() {
    if (stato.modo === 'due') return { inizio: 430, max: 1050, accel: 1.055 };
    const d = difficolta();
    return { inizio: cresce(PALLA.inizio, d), max: cresce(PALLA.max, d), accel: PALLA.accel };
  }

  // Gino parte già bravino e migliora a ogni livello (e un poco a ogni punto).
  // Non è mai perfetto: sbaglia di più sui tiri veloci e angolati e su quelli
  // che rimbalzano sulle sponde, così una buona angolata può sempre batterlo.
  const IA = {
    vel: [380, 35, 800],              // velocità: base, aumento per livello, massimo
    reazione: [0.16, -0.01, 0.07],    // secondi tra una stima e l'altra
    errore: [34, -2, 10],             // errore fisso
    erroreVel: [0.16, -0.008, 0.06],  // errore in proporzione alla velocità laterale
    erroreSponda: [50, -3, 20],       // errore per ogni rimbalzo da prevedere
    mira: [0.15, 0.05, 0.6],          // quanto cerca di colpire di lato per angolare
  };
  function cresce([base, passo, limite], d) {
    const v = base + passo * d;
    return passo >= 0 ? Math.min(limite, v) : Math.max(limite, v);
  }
  function parametriIA() {
    const d = stato.modo === 'demo' ? 2 : difficolta();
    const p = {};
    for (const k in IA) p[k] = cresce(IA[k], d);
    return p;
  }

  // ---------------------------------------------------------------- audio
  let audio = null;
  function suono(freq, durata = 0.08, tipo = 'square', volume = 0.06, freqFine = null) {
    if (muto) return;
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
    battuta: (forza) => suono(320 + forza * 260, 0.07, 'square', 0.05),
    sponda: () => suono(220, 0.05, 'triangle', 0.06),
    punto: (buono) => buono ? suono(520, 0.25, 'triangle', 0.08, 880) : suono(300, 0.3, 'sawtooth', 0.05, 110),
    via: () => suono(660, 0.08, 'triangle', 0.06),
    vittoria: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => suono(f, 0.16, 'triangle', 0.08), i * 120)),
    sconfitta: () => [392, 330, 262, 196].forEach((f, i) => setTimeout(() => suono(f, 0.2, 'sawtooth', 0.045), i * 150)),
  };

  // ---------------------------------------------------------------- schermo
  let verticale = false;
  let scala = 1;
  let larg = L, alt = S; // dimensioni logiche dello schermo

  function aSchermo(u, v) { return verticale ? { x: v, y: L - u } : { x: u, y: v }; }
  function daSchermo(x, y) { return verticale ? { u: L - y, v: x } : { u: x, v: y }; }

  function ridimensiona() {
    const r = palco.getBoundingClientRect();
    const aw = Math.max(100, r.width - 16);
    const ah = Math.max(100, r.height - 16);
    verticale = ah > aw * 1.15;
    larg = verticale ? S : L;
    alt = verticale ? L : S;
    scala = Math.min(aw / larg, ah / alt);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = Math.round(larg * scala) + 'px';
    canvas.style.height = Math.round(alt * scala) + 'px';
    canvas.width = Math.round(larg * scala * dpr);
    canvas.height = Math.round(alt * scala * dpr);
    ctx.setTransform(scala * dpr, 0, 0, scala * dpr, 0, 0);
    stato.scia.length = 0;
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
    }
  });
  window.addEventListener('keyup', (e) => tasti.delete(e.code));
  window.addEventListener('blur', () => { tasti.clear(); if (inPartita()) pausa(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && inPartita()) pausa(); });

  function puntoLogico(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * larg;
    const y = (e.clientY - r.top) / r.height * alt;
    return daSchermo(x, y);
  }

  // Nei due giocatori ogni dito resta legato al personaggio che ha toccato per primo.
  const ditiAssegnati = new Map();

  function gestisciPuntatore(e, inizio) {
    if (!inPartita() || stato.fase === 'pausa') return;
    const p = puntoLogico(e);
    if (stato.modo === 'cpu') {
      stato.tino.bersaglio = p.v;
    } else if (stato.modo === 'due' && e.pointerType !== 'mouse') {
      if (inizio || !ditiAssegnati.has(e.pointerId)) {
        ditiAssegnati.set(e.pointerId, p.u < L / 2 ? 'tino' : 'gino');
      }
      stato[ditiAssegnati.get(e.pointerId)].bersaglio = p.v;
    }
  }

  palco.addEventListener('pointerdown', (e) => {
    if (e.target !== canvas && e.target !== palco) return;
    if (e.pointerType !== 'mouse') {
      try { palco.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
    }
    gestisciPuntatore(e, true);
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      document.body.classList.remove('mostra-cursore');
      gestisciPuntatore(e, false);
    } else if (palco.hasPointerCapture && palco.hasPointerCapture(e.pointerId)) {
      gestisciPuntatore(e, false);
    }
  }, { passive: true });
  const fineDito = (e) => ditiAssegnati.delete(e.pointerId);
  window.addEventListener('pointerup', fineDito);
  window.addEventListener('pointercancel', fineDito);

  function direzioneTasti(su, giu) {
    let d = 0;
    if (su.some((c) => tasti.has(c))) d -= 1;
    if (giu.some((c) => tasti.has(c))) d += 1;
    return d;
  }

  // ---------------------------------------------------------------- flusso di gioco
  function inPartita() {
    return ['servizio', 'gioco', 'punto', 'pausa'].includes(stato.fase) && stato.modo !== 'demo';
  }

  function iniziaPartita(modo, livello = 1) {
    stato.modo = modo;
    stato.livello = livello;
    nuovoSet();
    nascondiPannello();
    suono(440, 0.05, 'triangle', 0.001); // sblocca l'audio sul primo gesto
  }

  function nuovoSet() {
    stato.punti.tino = 0;
    stato.punti.gino = 0;
    stato.puntiGiocati = 0;
    stato.vincitore = null;
    for (const g of [stato.tino, stato.gino]) {
      Object.assign(g, nuovoGiocatore(g.lato), { v: g.v });
    }
    stato.versoServizio = Math.random() < 0.5 ? 1 : -1;
    preparaServizio();
    aggiornaTabellone();
  }

  function obiettivo() {
    return stato.modo === 'due' ? PUNTI_DUE : PUNTI_LIVELLO;
  }

  function preparaServizio() {
    stato.fase = stato.modo === 'demo' ? 'demo' : 'servizio';
    stato.timer = stato.modo === 'demo' ? 0.6 : 1.1;
    const b = stato.palla;
    Object.assign(b, { u: L / 2, v: S / 2, vu: 0, vv: 0, vel: 0, visibile: true, inGioco: false });
    stato.scia.length = 0;
    if (stato.modo !== 'demo') {
      const n = obiettivo() - 1;
      if (stato.punti.tino === n || stato.punti.gino === n) mostraMessaggio('Punto decisivo!', 1.1);
      else mostraMessaggio('Pronti...', 0.9);
    }
  }

  function lancia() {
    const b = stato.palla;
    const p = parametriPalla();
    const a = casuale(-0.45, 0.45);
    b.vel = p.inizio;
    b.vu = stato.versoServizio * b.vel * Math.cos(a);
    b.vv = b.vel * Math.sin(a);
    b.inGioco = true;
    if (stato.modo !== 'demo') { stato.fase = 'gioco'; suoni.via(); }
    nuovaMira(stato.versoServizio > 0 ? stato.gino : stato.tino);
  }

  function punto(chiSegna) {
    const segna = stato[chiSegna];
    const subisce = chiSegna === 'tino' ? stato.gino : stato.tino;
    stato.palla.visibile = false;
    stato.versoServizio = chiSegna === 'tino' ? 1 : -1; // si serve verso chi ha subito
    segna.saltoT = 0.55;
    subisce.tremaT = 0.45;
    if (subisce.lato === 'tino') imposta(subisce, 'arrabbiato', 1.5);

    if (stato.modo === 'demo') { preparaServizio(); return; }

    stato.punti[chiSegna]++;
    stato.puntiGiocati++;
    aggiornaTabellone();
    const buono = stato.modo === 'due' || chiSegna === 'tino';
    suoni.punto(buono);
    mostraMessaggio(chiSegna === 'tino' ? 'Punto a Tino!' : 'Punto a Gino!', 1.1);
    stato.fase = 'punto';
    stato.timer = 1.2;
  }

  function dopoPunto() {
    if (stato.punti.tino >= obiettivo()) return fineSet('tino');
    if (stato.punti.gino >= obiettivo()) return fineSet('gino');
    preparaServizio();
  }

  function fineSet(vincitore) {
    stato.vincitore = vincitore;
    const vince = stato[vincitore];
    const perde = vincitore === 'tino' ? stato.gino : stato.tino;
    vince.festa = true;
    perde.caduta = 0.0001; // avvia l'animazione di caduta
    if (perde.lato === 'tino') imposta(perde, 'ko', Infinity);
    stato.messaggio = null;

    if (stato.modo === 'cpu') {
      if (vincitore === 'tino') {
        stato.fase = 'fine-livello';
        record = Math.max(record, stato.livello + 1);
        scrivi('record', record);
        suoni.vittoria();
        setTimeout(() => mostraPannello(pannelloLivelloSuperato()), 900);
      } else {
        stato.fase = 'fine';
        suoni.sconfitta();
        setTimeout(() => mostraPannello(pannelloSconfitta()), 1100);
      }
    } else {
      stato.fase = 'fine';
      suoni.vittoria();
      setTimeout(() => mostraPannello(pannelloVittoriaDue()), 1000);
    }
  }

  function pausa() {
    if (!inPartita() || stato.fase === 'pausa') return;
    stato.pausaDa = stato.fase;
    stato.fase = 'pausa';
    tasti.clear();
    mostraPannello(pannelloPausa());
  }

  function riprendi() {
    if (stato.fase !== 'pausa') return;
    stato.fase = stato.pausaDa;
    nascondiPannello();
  }

  function vaiAlMenu() {
    stato.modo = 'demo';
    stato.livello = 1;
    nuovoSet();
    mostraPannello(pannelloMenu());
    aggiornaTabellone();
  }

  function imposta(g, faccia, durata) {
    g.faccia = faccia;
    g.facciaT = durata;
  }

  function mostraMessaggio(testo, durata) {
    stato.messaggio = { testo, t: 0, durata };
  }

  function aggiornaTabellone() {
    const demo = stato.modo === 'demo';
    elPuntiTino.textContent = demo ? '0' : stato.punti.tino;
    elPuntiGino.textContent = demo ? '0' : stato.punti.gino;
    if (stato.modo === 'cpu') elInfo.innerHTML = '<span class="lungo">Livello </span><span class="corto">Liv. </span>' + stato.livello;
    else if (stato.modo === 'due') elInfo.innerHTML = '<span class="lungo">Due giocatori · a ' + PUNTI_DUE + '</span>';
    else elInfo.innerHTML = '';
  }

  function cambiaAudio() {
    muto = !muto;
    scrivi('muto', muto);
    document.body.classList.toggle('muto', muto);
    if (!muto) suoni.via();
  }

  // ---------------------------------------------------------------- aggiornamento
  function aggiorna(dt) {
    if (stato.fase === 'pausa') return;

    // animazioni dei personaggi
    for (const g of [stato.tino, stato.gino]) {
      g.schiaccia = Math.max(0, g.schiaccia - dt * 5);
      g.saltoT = Math.max(0, g.saltoT - dt);
      g.tremaT = Math.max(0, g.tremaT - dt);
      if (g.facciaT !== Infinity) g.facciaT = Math.max(0, g.facciaT - dt);
      if (g.caduta > 0) g.caduta = Math.min(1, g.caduta + dt * 1.6);
    }
    if (stato.messaggio) {
      stato.messaggio.t += dt;
      if (stato.messaggio.t > stato.messaggio.durata) stato.messaggio = null;
    }

    const fermi = stato.fase === 'fine' || stato.fase === 'fine-livello';
    if (!fermi) muoviGiocatori(dt);

    switch (stato.fase) {
      case 'demo':
        if (!stato.palla.inGioco) {
          stato.timer -= dt;
          if (stato.timer <= 0) lancia();
        } else {
          muoviPalla(dt);
        }
        break;
      case 'servizio':
        stato.timer -= dt;
        if (stato.timer <= 0) lancia();
        break;
      case 'gioco':
        muoviPalla(dt);
        break;
      case 'punto':
        stato.timer -= dt;
        if (stato.timer <= 0) dopoPunto();
        break;
      default:
        break;
    }
  }

  function muoviGiocatori(dt) {
    const { tino, gino } = stato;
    if (stato.modo === 'demo') {
      guidaIA(tino, dt);
      guidaIA(gino, dt);
    } else if (stato.modo === 'cpu') {
      guidaUmano(tino, direzioneTasti(['KeyW', 'ArrowUp', 'KeyA', 'ArrowLeft'], ['KeyS', 'ArrowDown', 'KeyD', 'ArrowRight']), dt);
      guidaIA(gino, dt);
    } else {
      guidaUmano(tino, direzioneTasti(['KeyW'], ['KeyS']), dt);
      guidaUmano(gino, direzioneTasti(['ArrowUp'], ['ArrowDown']), dt);
    }
  }

  function limitaV(v) {
    return clamp(v, LUNG / 2 - 14, S - LUNG / 2 + 14);
  }

  function guidaUmano(g, dir, dt) {
    const prima = g.v;
    if (dir !== 0) {
      g.bersaglio = null;
      g.tastoPremuto += dt;
      // parte un po' più lento per i piccoli aggiustamenti, poi accelera
      const vel = 320 + 420 * Math.min(1, g.tastoPremuto / 0.18);
      g.v = limitaV(g.v + dir * vel * dt);
    } else {
      g.tastoPremuto = 0;
      if (g.bersaglio !== null) {
        const t = limitaV(g.bersaglio);
        const passo = VEL_PUNTATORE * dt;
        g.v += clamp(t - g.v, -passo, passo);
      }
    }
    g.vel = (g.v - prima) / Math.max(dt, 1e-6);
  }

  // Dove arriverà la palla lungo v quando raggiunge la posizione u indicata,
  // tenendo conto dei rimbalzi sulle sponde.
  function prevedi(b, uArrivo) {
    if (b.vu === 0) return { v: b.v, sponde: 0 };
    const t = (uArrivo - b.u) / b.vu;
    if (t < 0) return { v: b.v, sponde: 0 };
    const campo = S - 2 * R;
    const grezzo = b.v - R + b.vv * t;
    const sponde = Math.abs(Math.floor(grezzo / campo));
    let x = grezzo % (2 * campo);
    if (x < 0) x += 2 * campo;
    if (x > campo) x = 2 * campo - x;
    return { v: x + R, sponde };
  }

  // Chiamata quando la ghianda parte verso g: sceglie dove provare a colpirla
  // e quanto sbaglierà la stima su questo tiro.
  function nuovaMira(g) {
    const p = parametriIA();
    g.ia.mira = casuale(-1, 1) * p.mira * (LUNG / 2);
    g.ia.sbaglio = casuale(-1, 1);
    g.ia.timer = 0;
  }

  function guidaIA(g, dt) {
    const b = stato.palla;
    const p = parametriIA();
    const verso = g.lato === 'gino' ? 1 : -1;
    g.ia.timer -= dt;
    if (g.ia.timer <= 0) {
      g.ia.timer = p.reazione;
      const arriva = b.inGioco && b.visibile && Math.sign(b.vu) === verso;
      if (arriva) {
        const uArrivo = g.lato === 'gino' ? L - FACCIA - R : FACCIA + R;
        const pr = prevedi(b, uArrivo);
        // l'errore cala man mano che la ghianda si avvicina e restano meno sponde
        const errore = p.errore + p.erroreVel * Math.abs(b.vv) + p.erroreSponda * pr.sponde;
        g.ia.bersaglio = pr.v + g.ia.mira + g.ia.sbaglio * errore;
      } else {
        // in attesa torna verso il centro, seguendo un po' la ghianda
        g.ia.bersaglio = S / 2 + (b.v - S / 2) * 0.3;
      }
    }
    const prima = g.v;
    const diff = g.ia.bersaglio - g.v;
    if (Math.abs(diff) > 3) {
      const passo = p.vel * dt;
      g.v = limitaV(g.v + clamp(diff, -passo, passo));
    }
    g.vel = (g.v - prima) / Math.max(dt, 1e-6);
  }

  function muoviPalla(dt) {
    const b = stato.palla;
    if (!b.inGioco) return;
    const passi = Math.max(1, Math.ceil((b.vel * dt) / 6));
    const h = dt / passi;
    for (let i = 0; i < passi; i++) {
      const uPrima = b.u;
      const vPrima = b.v;
      b.u += b.vu * h;
      b.v += b.vv * h;

      // sponde
      if (b.v < R) { b.v = 2 * R - b.v; b.vv = Math.abs(b.vv); suoni.sponda(); }
      else if (b.v > S - R) { b.v = 2 * (S - R) - b.v; b.vv = -Math.abs(b.vv); suoni.sponda(); }

      // Tino
      const pianoT = FACCIA;
      if (b.vu < 0 && uPrima - R >= pianoT && b.u - R < pianoT) {
        const f = (uPrima - R - pianoT) / (uPrima - b.u);
        const vColpo = vPrima + (b.v - vPrima) * f;
        if (Math.abs(vColpo - stato.tino.v) <= LUNG / 2 + R * 0.7) battuta(stato.tino, vColpo);
      }
      // Gino
      const pianoG = L - FACCIA;
      if (b.vu > 0 && uPrima + R <= pianoG && b.u + R > pianoG) {
        const f = (pianoG - uPrima - R) / (b.u - uPrima);
        const vColpo = vPrima + (b.v - vPrima) * f;
        if (Math.abs(vColpo - stato.gino.v) <= LUNG / 2 + R * 0.7) battuta(stato.gino, vColpo);
      }

      if (b.u < -R * 2) { b.inGioco = false; punto('gino'); return; }
      if (b.u > L + R * 2) { b.inGioco = false; punto('tino'); return; }
    }
    b.rot += (b.vel * dt) / R * Math.sign(b.vu || 1) * 0.5;
  }

  function battuta(g, vColpo) {
    const b = stato.palla;
    const p = parametriPalla();
    const verso = g.lato === 'tino' ? 1 : -1;
    const scarto = clamp((vColpo - g.v) / (LUNG / 2 + R), -1, 1);
    // il movimento del personaggio al momento del colpo dà un po' di effetto
    const effetto = clamp(g.vel / 2200, -0.22, 0.22);
    const angolo = clamp(scarto * ANGOLO_MAX + effetto, -ANGOLO_MAX, ANGOLO_MAX);
    b.vel = Math.min(b.vel * p.accel, p.max);
    b.vu = verso * b.vel * Math.cos(angolo);
    b.vv = b.vel * Math.sin(angolo);
    b.u = verso > 0 ? FACCIA + R : L - FACCIA - R;
    g.schiaccia = 1;
    const forza = b.vel / p.max;
    if (forza > 0.82) {
      if (g.lato === 'tino') imposta(g, 'ferito', 0.4);
      else g.tremaT = Math.max(g.tremaT, 0.2);
    }
    suoni.battuta(forza);
    nuovaMira(g.lato === 'tino' ? stato.gino : stato.tino);
  }

  // ---------------------------------------------------------------- disegno
  function disegna(tempo) {
    ctx.save();
    // il campo si disegna in coordinate (u, v)
    if (verticale) ctx.transform(0, -1, 1, 0, 0, L);
    disegnaCampo();
    ctx.restore();

    disegnaScia();
    disegnaPersonaggio(stato.tino, tempo);
    disegnaPersonaggio(stato.gino, tempo);
    disegnaPalla(tempo);
    disegnaMessaggio();
  }

  function disegnaCampo() {
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#6cbb59');
    g.addColorStop(1, '#58a748');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, S);

    // strisce d'erba
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    for (let u = 0; u < L; u += 120) ctx.fillRect(u, 0, 60, S);

    // zone dei due personaggi
    ctx.fillStyle = 'rgba(255, 213, 154, 0.16)';
    ctx.fillRect(0, 0, FACCIA, S);
    ctx.fillStyle = 'rgba(201, 230, 255, 0.16)';
    ctx.fillRect(L - FACCIA, 0, FACCIA, S);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, L - 16, S - 16);

    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(L / 2, 14);
    ctx.lineTo(L / 2, S - 14);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(L / 2, S / 2, 64, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(FACCIA, 8); ctx.lineTo(FACCIA, S - 8);
    ctx.moveTo(L - FACCIA, 8); ctx.lineTo(L - FACCIA, S - 8);
    ctx.stroke();
  }

  function immagineDi(g) {
    if (g.lato === 'gino') return immagini.gino;
    const f = g.facciaT > 0 ? g.faccia : facciaBaseTino();
    return immagini[f] || immagini.normale;
  }

  function facciaBaseTino() {
    if (stato.fase === 'servizio' && stato.modo !== 'demo') {
      const n = obiettivo() - 1;
      if (stato.punti.tino === n || stato.punti.gino === n) return 'arrabbiato';
    }
    return 'normale';
  }

  function disegnaPersonaggio(g, tempo) {
    const img = immagineDi(g);
    if (!img.complete || !img.naturalWidth) return;

    const uCentro = g.lato === 'tino' ? FACCIA - BOX_U / 2 : L - FACCIA + BOX_U / 2;
    const c = aSchermo(uCentro, g.v);
    const bw = verticale ? BOX_V : BOX_U;
    const bh = verticale ? BOX_U : BOX_V;
    const k = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
    const w = img.naturalWidth * k;
    const h = img.naturalHeight * k;

    let dx = 0, dy = 0, rot = 0;
    // schiacciamento lungo la direzione della ghianda
    const sq = g.schiaccia;
    let sx = verticale ? 1 + 0.1 * sq : 1 - 0.18 * sq;
    let sy = verticale ? 1 - 0.18 * sq : 1 + 0.1 * sq;

    if (g.saltoT > 0) {
      const t = 1 - g.saltoT / 0.55;
      dy -= Math.sin(t * Math.PI) * 28;
    }
    if (g.festa) {
      const s = Math.abs(Math.sin(tempo * 6));
      dy -= s * 26;
      sy *= 1 + (1 - s) * 0.06;
      sx *= 1 - (1 - s) * 0.04;
    }
    if (g.tremaT > 0) {
      dx += Math.sin(tempo * 70) * 6 * (g.tremaT / 0.45);
    }
    if (g.caduta > 0 && g.lato === 'gino') {
      const e = 1 - Math.pow(1 - g.caduta, 3);
      rot = e * (Math.PI / 2) * (verticale ? 1 : -1);
      dy += e * h * 0.2;
    } else if (g.caduta > 0) {
      dy += (1 - Math.pow(1 - g.caduta, 3)) * 12;
    }

    // Tino guarda verso Gino quando il campo è orizzontale
    const specchia = g.lato === 'tino' && !verticale;

    ctx.save();
    ctx.translate(c.x + dx, c.y + dy);
    ctx.rotate(rot);
    ctx.scale(sx * (specchia ? -1 : 1), sy);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function disegnaPalla(tempo) {
    const b = stato.palla;
    if (!b.visibile) return;
    const p = aSchermo(b.u, b.v);
    let alfa = 1;
    if (!b.inGioco && stato.fase === 'servizio') alfa = 0.55 + 0.45 * Math.abs(Math.sin(tempo * 8));
    disegnaGhianda(p.x, p.y, b.rot, alfa, 1);
    if (b.inGioco) {
      stato.scia.push({ x: p.x, y: p.y });
      if (stato.scia.length > 9) stato.scia.shift();
    }
  }

  function disegnaScia() {
    const n = stato.scia.length;
    for (let i = 0; i < n; i++) {
      const s = stato.scia[i];
      ctx.fillStyle = `rgba(255, 244, 214, ${0.05 + 0.25 * (i / n)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, R * (0.4 + 0.5 * (i / n)), 0, Math.PI * 2);
      ctx.fill();
    }
    if (!stato.palla.inGioco) stato.scia.length = 0;
  }

  function disegnaGhianda(x, y, rot, alfa, k) {
    const r = R * k;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alfa;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    // corpo
    ctx.fillStyle = '#c98a3c';
    ctx.beginPath();
    ctx.moveTo(-r * 0.86, -r * 0.15);
    ctx.bezierCurveTo(-r * 0.9, r * 0.7, -r * 0.3, r * 1.1, 0, r * 1.2);
    ctx.bezierCurveTo(r * 0.3, r * 1.1, r * 0.9, r * 0.7, r * 0.86, -r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';
    // riflesso
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.38, r * 0.3, r * 0.14, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    // cappello
    ctx.fillStyle = '#7a4a22';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.2, r, r * 0.62, 0, Math.PI, 0);
    ctx.lineTo(r, -r * 0.1);
    ctx.quadraticCurveTo(0, r * 0.05, -r, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 32, 12, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(i * r * 0.32 - r * 0.2, -r * 0.7);
      ctx.lineTo(i * r * 0.32 + r * 0.2, -r * 0.1);
    }
    ctx.stroke();
    // picciolo
    ctx.fillStyle = '#5c3517';
    ctx.fillRect(-r * 0.09, -r * 1.05, r * 0.18, r * 0.3);
    ctx.restore();
  }

  function disegnaMessaggio() {
    const m = stato.messaggio;
    if (!m) return;
    const t = m.t / m.durata;
    const alfa = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;
    const k = 1 + 0.15 * Math.max(0, 1 - t * 6);
    ctx.save();
    ctx.globalAlpha = clamp(alfa, 0, 1);
    ctx.translate(larg / 2, verticale ? alt * 0.42 : alt * 0.3);
    ctx.scale(k, k);
    ctx.font = `700 ${verticale ? 44 : 52}px Fredoka, "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(47, 90, 40, 0.85)';
    ctx.strokeText(m.testo, 0, 0);
    ctx.fillStyle = '#fff8ec';
    ctx.fillText(m.testo, 0, 0);
    ctx.restore();
  }

  // ---------------------------------------------------------------- pannelli
  function pannelloAperto() { return pannello.classList.contains('visibile'); }

  function mostraPannello(html) {
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
    const alt = nome === 'gino' ? 'Gino' : 'Tino';
    return `<img src="${src}" alt="${alt}" class="${classe}">`;
  };

  function testoComandi() {
    if (touch) {
      return `<div class="comandi">
        <p><b>Contro Gino:</b> trascina il dito sul campo per muovere Tino.</p>
        <p><b>In due:</b> ognuno trascina il dito nella propria metà del campo (oppure tastiera: Tino <kbd>W</kbd> <kbd>S</kbd>, Gino <kbd>↑</kbd> <kbd>↓</kbd>).</p>
      </div>`;
    }
    return `<div class="comandi">
      <p><b>Contro Gino:</b> muovi Tino col mouse, oppure con <kbd>W</kbd> <kbd>S</kbd> o con le frecce <kbd>↑</kbd> <kbd>↓</kbd></p>
      <p><b>In due:</b> Tino con <kbd>W</kbd> <kbd>S</kbd>, Gino con <kbd>↑</kbd> <kbd>↓</kbd>.</p>
      <p><kbd>P</kbd> pausa · <kbd>M</kbd> suoni</p>
    </div>`;
  }

  function pannelloMenu() {
    const rec = record > 1 ? `<p class="record">Il tuo record: livello ${record}</p>` : '';
    return `<div class="riquadro">
      <div class="ritratti">${img('normale', 'salta specchia')}<span class="vs">contro</span>${img('gino')}</div>
      <h1>Botta e Ghianda</h1>
      <p>Rimanda la ghianda e non lasciarla passare! Colpiscila con i bordi per tiri più angolati.</p>
      ${rec}
      <div class="scelte">
        <button class="bottone" data-azione="cpu" data-primo>Sfida Gino</button>
        <button class="bottone secondario" data-azione="due">Due giocatori</button>
      </div>
      ${testoComandi()}
    </div>`;
  }

  function pannelloPausa() {
    return `<div class="riquadro">
      <div class="ritratti">${img('normale')}</div>
      <h2>Pausa</h2>
      <div class="scelte">
        <button class="bottone" data-azione="riprendi" data-primo>Continua</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  function pannelloLivelloSuperato() {
    const n = stato.livello;
    return `<div class="riquadro">
      <div class="ritratti">${img('normale', 'salta specchia')}${img('gino', 'caduto')}</div>
      <h2>Livello ${n} superato!</h2>
      <p>Tino vince ${stato.punti.tino} a ${stato.punti.gino}. Gino però si allena: nel prossimo livello sarà più veloce.</p>
      <div class="scelte">
        <button class="bottone" data-azione="prossimo" data-primo>Livello ${n + 1}</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  function pannelloSconfitta() {
    const n = stato.livello;
    const ricomincia = n > 1 ? '<button class="bottone secondario" data-azione="ricomincia">Dal livello 1</button>' : '';
    return `<div class="riquadro">
      <div class="ritratti">${img('ko')}${img('gino', 'salta')}</div>
      <h2>Ha vinto Gino!</h2>
      <p>Gino vince ${stato.punti.gino} a ${stato.punti.tino} al livello ${n}. Tino non si arrende: riprova!</p>
      <div class="scelte">
        <button class="bottone" data-azione="riprova" data-primo>Riprova il livello ${n}</button>
        ${ricomincia}
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  function pannelloVittoriaDue() {
    const vinceTino = stato.vincitore === 'tino';
    const ritratti = vinceTino
      ? `${img('normale', 'salta specchia')}${img('gino', 'caduto')}`
      : `${img('ko')}${img('gino', 'salta')}`;
    return `<div class="riquadro">
      <div class="ritratti">${ritratti}</div>
      <h2>Vince ${vinceTino ? 'Tino' : 'Gino'}!</h2>
      <p>${stato.punti.tino} a ${stato.punti.gino}. Si fa la rivincita?</p>
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
      case 'cpu': iniziaPartita('cpu', 1); break;
      case 'due': iniziaPartita('due'); break;
      case 'prossimo': iniziaPartita('cpu', stato.livello + 1); break;
      case 'riprova': iniziaPartita('cpu', stato.livello); break;
      case 'ricomincia': iniziaPartita('cpu', 1); break;
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

  // ---------------------------------------------------------------- avvio
  document.body.classList.toggle('muto', muto);
  ridimensiona();
  vaiAlMenu();

  let ultimo = performance.now();
  function ciclo(ora) {
    const dt = Math.min(0.05, (ora - ultimo) / 1000);
    ultimo = ora;
    aggiorna(dt);
    disegna(ora / 1000);
    requestAnimationFrame(ciclo);
  }
  requestAnimationFrame(ciclo);

  // utile per le prove automatiche
  window.bottaEGhianda = { stato, iniziaPartita, aggiorna, prevedi, IA, PALLA };
})();
