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
  const FACCIA = 128;          // distanza dal fondo della parte anteriore dei personaggi
  // ingombro massimo delle immagini (lungo v e lungo u); sul telefono in
  // verticale c'è più spazio in profondità
  const BOX = { orizzontale: { v: 134, u: 100 }, verticale: { v: 134, u: 126 } };
  const ANGOLO_MAX = 55 * Math.PI / 180;
  const PUNTI_LIVELLO = 5;     // punti per superare un livello contro Gino
  const PUNTI_DUE = 7;         // punti per vincere in due giocatori
  const VEL_PUNTATORE = 2600;  // velocità massima quando si segue mouse o dito

  // Super tiro: la barra si carica a ogni colpo e un poco col tempo;
  // quando è piena il colpo successivo infuoca la ghianda, che poi scoppia
  // e diventa un pop corn veloce e ballerino.
  const SUPER = {
    caricaColpo: 0.2,          // carica per ogni colpo (5 colpi = barra piena)
    caricaSecondo: 0.015,      // carica al secondo durante lo scambio
    velocita: 1.4,             // quanto è più veloce del tiro normale
    fuoco: 0.3,                // secondi in fiamme prima dello scoppio
    onda: 26,                  // ampiezza della traiettoria ballerina del pop corn
    frequenza: 11,
  };

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
      carica: 0,            // barra del super tiro, 0..1
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
    palla: { u: L / 2, v: S / 2, vu: 0, vv: 0, vel: 0, rot: 0, visibile: true, super: null },
    scia: [],
    particelle: [],
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
    superTiro: () => { suono(160, 0.4, 'sawtooth', 0.06, 900); suono(90, 0.3, 'square', 0.04, 60); },
    pop: () => { suono(1400, 0.05, 'square', 0.07, 600); setTimeout(() => suono(1800, 0.04, 'square', 0.05, 900), 40); },
    spegni: () => suono(500, 0.18, 'triangle', 0.05, 180),
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
    stato.particelle.length = 0;
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
    Object.assign(b, { u: L / 2, v: S / 2, vu: 0, vv: 0, vel: 0, visibile: true, inGioco: false, super: null });
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

    aggiornaParticelle(dt);
    aggiornaFormiche(dt);

    const fermi = stato.fase === 'fine' || stato.fase === 'fine-livello';
    if (!fermi) muoviGiocatori(dt);
    if (stato.palla.inGioco) {
      for (const g of [stato.tino, stato.gino]) caricaSuper(g, SUPER.caricaSecondo * dt);
    }

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
    return clamp(v, 50, S - 50);
  }

  // Contro il computer la barra di Gino si carica più piano nei primi livelli.
  function caricaSuper(g, quanto) {
    let k = 1;
    if (g.lato === 'gino' && stato.modo === 'cpu') k = Math.min(1, 0.55 + 0.05 * difficolta());
    g.carica = Math.min(1, g.carica + quanto * k);
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
    g.ia.mira = casuale(-1, 1) * p.mira * (sagoma(g).ev / 2);
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
        let errore = p.errore + p.erroreVel * Math.abs(b.vv) + p.erroreSponda * pr.sponde;
        if (b.super) errore += 30; // il pop corn balla ed è difficile da leggere
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
      b.u += b.vu * h;
      b.v += b.vv * h;
      if (b.super) aggiornaSuper(b, h);

      // sponde
      if (b.v < R) { b.v = 2 * R - b.v; b.vv = Math.abs(b.vv); suoni.sponda(); }
      else if (b.v > S - R) { b.v = 2 * (S - R) - b.v; b.vv = -Math.abs(b.vv); suoni.sponda(); }

      // tutta la sagoma dei personaggi fa da racchetta
      if (b.vu < 0 && tocca(stato.tino, b)) battuta(stato.tino);
      else if (b.vu > 0 && tocca(stato.gino, b)) battuta(stato.gino);

      if (b.u < -R * 2) { b.inGioco = false; punto('gino'); return; }
      if (b.u > L + R * 2) { b.inGioco = false; punto('tino'); return; }
    }
    b.rot += (b.vel * dt) / R * Math.sign(b.vu || 1) * 0.5;
  }

  function battuta(g) {
    const b = stato.palla;
    const p = parametriPalla();
    const verso = g.lato === 'tino' ? 1 : -1;
    const sg = sagoma(g);
    const scarto = clamp((b.v - g.v) / (sg.ev / 2 + R * 0.5), -1, 1);
    // il movimento del personaggio al momento del colpo dà un po' di effetto
    const effetto = clamp(g.vel / 2200, -0.22, 0.22);
    const angolo = clamp(scarto * ANGOLO_MAX + effetto, -ANGOLO_MAX, ANGOLO_MAX);

    // chi respinge un super tiro lo spegne
    if (b.super) {
      b.super = null;
      sbuffo(b);
      suoni.spegni();
    }
    b.vel = Math.min(b.vel * p.accel, p.max);

    const superTiro = g.carica >= 1;
    if (superTiro) {
      g.carica = 0;
      b.vel *= SUPER.velocita;
      b.super = { chi: g.lato, fase: 'fuoco', t: 0 };
      mostraMessaggio('Super tiro!', 0.9);
      suoni.superTiro();
    } else {
      caricaSuper(g, SUPER.caricaColpo);
    }

    b.vu = verso * b.vel * Math.cos(angolo);
    b.vv = b.vel * Math.sin(angolo);
    g.schiaccia = 1;
    const forza = Math.min(1, b.vel / p.max);
    if (!superTiro && forza > 0.82) {
      if (g.lato === 'tino') imposta(g, 'ferito', 0.4);
      else g.tremaT = Math.max(g.tremaT, 0.2);
    }
    if (!superTiro) suoni.battuta(forza);
    nuovaMira(g.lato === 'tino' ? stato.gino : stato.tino);
  }

  // La ghianda in fiamme scoppia e diventa pop corn, che avanza ondeggiando.
  function aggiornaSuper(b, h) {
    const sp = b.super;
    sp.t += h;
    if (sp.fase === 'fuoco' && sp.t >= SUPER.fuoco) {
      sp.fase = 'popcorn';
      sp.t = 0;
      scoppio(b);
      suoni.pop();
    } else if (sp.fase === 'popcorn') {
      b.v += Math.cos(sp.t * SUPER.frequenza) * SUPER.onda * SUPER.frequenza * h;
      if (b.v < R) { b.v = 2 * R - b.v; b.vv = Math.abs(b.vv); }
      else if (b.v > S - R) { b.v = 2 * (S - R) - b.v; b.vv = -Math.abs(b.vv); }
    }
  }

  // ---------------------------------------------------------------- sagome
  // Posizione e dimensioni a schermo dell'immagine di un personaggio, senza
  // le animazioni: serve sia per disegnarlo sia per i colpi.
  function sagoma(g) {
    const img = immagineDi(g);
    const nw = img.naturalWidth || 376;
    const nh = img.naturalHeight || 512;
    const box = verticale ? BOX.verticale : BOX.orizzontale;
    const bw = verticale ? box.v : box.u;
    const bh = verticale ? box.u : box.v;
    const k = Math.min(bw / nw, bh / nh);
    const w = nw * k;
    const h = nh * k;
    const eu = verticale ? h : w;   // profondità lungo u
    const ev = verticale ? w : h;   // larghezza lungo v
    const uCentro = g.lato === 'tino' ? FACCIA - eu / 2 : L - FACCIA + eu / 2;
    const c = aSchermo(uCentro, g.v);
    // (la foto di Tino guarda già a destra, verso Gino: non si specchia)
    return { img, w, h, eu, ev, x: c.x, y: c.y };
  }

  // Maschera dei pixel non trasparenti di ogni immagine. Se il browser non
  // permette di leggerla (pagina aperta da file), si usa il rettangolo.
  const maschere = new Map();
  function maschera(img) {
    if (!img.complete || !img.naturalWidth) return null;
    if (maschere.has(img)) return maschere.get(img);
    let m = null;
    try {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height).data;
      const a = new Uint8Array(c.width * c.height);
      for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] > 80 ? 1 : 0;
      m = { w: c.width, h: c.height, a };
    } catch (e) {
      m = null;
    }
    maschere.set(img, m);
    return m;
  }

  // La ghianda tocca il personaggio se il suo centro o un punto del suo bordo
  // cade su un pixel visibile dell'immagine.
  const PUNTI_BORDO = Array.from({ length: 16 }, (_, i) => [Math.cos(i * Math.PI / 8), Math.sin(i * Math.PI / 8)]);
  function tocca(g, b) {
    const sg = sagoma(g);
    const p = aSchermo(b.u, b.v);
    const dx = p.x - sg.x;
    const dy = p.y - sg.y;
    if (Math.abs(dx) > sg.w / 2 + R || Math.abs(dy) > sg.h / 2 + R) return false;
    const m = maschera(sg.img);
    if (!m) return true;
    const prova = (x, y) => {
      const lx = x / sg.w + 0.5;
      const ly = y / sg.h + 0.5;
      if (lx < 0 || lx >= 1 || ly < 0 || ly >= 1) return false;
      return m.a[Math.floor(ly * m.h) * m.w + Math.floor(lx * m.w)] === 1;
    };
    if (prova(dx, dy)) return true;
    for (const [cx, cy] of PUNTI_BORDO) {
      if (prova(dx + cx * R, dy + cy * R) || prova(dx + cx * R * 0.55, dy + cy * R * 0.55)) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- particelle
  function direzioneSchermo(b) {
    return verticale ? { x: b.vv, y: -b.vu } : { x: b.vu, y: b.vv };
  }

  function aggiungiParticella(q) {
    if (stato.particelle.length < 260) stato.particelle.push(Object.assign({ t: 0 }, q));
  }

  function aggiornaParticelle(dt) {
    const b = stato.palla;
    // fiamme dietro alla ghianda infuocata, briciole dietro al pop corn
    if (b.super && b.inGioco && b.visibile) {
      const p = aSchermo(b.u, b.v);
      const d = direzioneSchermo(b);
      const n = Math.hypot(d.x, d.y) || 1;
      const fuoco = b.super.fase === 'fuoco';
      const quante = fuoco ? 5 : 2;
      for (let i = 0; i < quante; i++) {
        aggiungiParticella({
          x: p.x + casuale(-6, 6), y: p.y + casuale(-6, 6),
          vx: -d.x / n * casuale(40, 160) + casuale(-40, 40),
          vy: -d.y / n * casuale(40, 160) + casuale(-40, 40) - (fuoco ? 40 : 0),
          r: fuoco ? casuale(5, 11) : casuale(2, 4),
          durata: fuoco ? casuale(0.25, 0.45) : casuale(0.3, 0.5),
          tipo: fuoco ? 'fuoco' : 'briciola',
        });
      }
    }
    for (const q of stato.particelle) {
      q.t += dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.tipo === 'pezzo' || q.tipo === 'briciola') q.vy += 300 * dt;
      q.vx *= 1 - 2 * dt;
      q.vy *= 1 - (q.tipo === 'fuoco' ? 2 : 0.5) * dt;
    }
    stato.particelle = stato.particelle.filter((q) => q.t < q.durata);
  }

  function scoppio(b) {
    const p = aSchermo(b.u, b.v);
    for (let i = 0; i < 22; i++) {
      const a = casuale(0, Math.PI * 2);
      const v = casuale(120, 360);
      aggiungiParticella({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, r: casuale(3, 6), durata: casuale(0.4, 0.7), tipo: 'pezzo' });
    }
    for (let i = 0; i < 10; i++) {
      const a = casuale(0, Math.PI * 2);
      aggiungiParticella({ x: p.x, y: p.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, r: casuale(8, 14), durata: 0.35, tipo: 'fuoco' });
    }
    aggiungiParticella({ x: p.x, y: p.y - 10, vx: 0, vy: -70, r: 0, durata: 0.7, tipo: 'testo', testo: 'POP!' });
  }

  function sbuffo(b) {
    const p = aSchermo(b.u, b.v);
    for (let i = 0; i < 12; i++) {
      const a = casuale(0, Math.PI * 2);
      const v = casuale(40, 140);
      aggiungiParticella({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, r: casuale(6, 12), durata: casuale(0.4, 0.6), tipo: 'fumo' });
    }
  }

  // ---------------------------------------------------------------- disegno
  function disegna(tempo) {
    ctx.save();
    // il campo si disegna in coordinate (u, v)
    if (verticale) ctx.transform(0, -1, 1, 0, 0, L);
    disegnaCampo();
    ctx.restore();

    disegnaBarre(tempo);
    disegnaScia();
    disegnaPersonaggio(stato.tino, tempo);
    disegnaPersonaggio(stato.gino, tempo);
    disegnaParticelle(false);
    disegnaPalla(tempo);
    disegnaParticelle(true);
    disegnaMessaggio();
  }

  // Il campo è un prato con qualche fiorellino; al posto della linea di metà
  // campo c'è una fila di formiche. Il prato si disegna una volta sola su una
  // tela a parte e poi si copia a ogni fotogramma.
  let prato = null;
  let pratoScala = 0;
  // Fondale dipinto (vista dall'alto, 16:9): se c'è, prende il posto del prato
  // disegnato nel codice. Ruota insieme al campo quando lo schermo è verticale.
  const fondale = new Image();
  fondale.src = 'fondale.png';

  function casualeConSeme(seme) {
    return () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };
  }

  function preparaPrato(k) {
    const c = document.createElement('canvas');
    c.width = Math.round(L * k);
    c.height = Math.round(S * k);
    const g = c.getContext('2d');
    g.scale(k, k);
    const rnd = casualeConSeme(11);

    // fondo
    const fondo = g.createLinearGradient(0, 0, L, S);
    fondo.addColorStop(0, '#7cc45c');
    fondo.addColorStop(1, '#64b04a');
    g.fillStyle = fondo;
    g.fillRect(0, 0, L, S);

    // chiazze più chiare e più scure, per non sembrare un campo da gioco
    for (let i = 0; i < 70; i++) {
      const x = rnd() * L, y = rnd() * S, r = 30 + rnd() * 90;
      const chiara = rnd() < 0.5;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, chiara ? 'rgba(200, 235, 120, 0.16)' : 'rgba(40, 100, 30, 0.14)');
      gr.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // fili d'erba
    g.lineCap = 'round';
    const verdi = ['rgba(52, 120, 40, 0.45)', 'rgba(70, 145, 50, 0.5)', 'rgba(150, 205, 95, 0.45)', 'rgba(40, 95, 30, 0.35)'];
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * L, y = rnd() * S;
      const a = rnd() * Math.PI * 2;
      const l = 4 + rnd() * 7;
      g.strokeStyle = verdi[i % verdi.length];
      g.lineWidth = 1 + rnd() * 1.2;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.6, y + Math.sin(a + 0.5) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }

    // fiorellini, lontani dalla fila di formiche
    const tipi = ['margherita', 'margherita', 'giallo', 'rosa', 'trifoglio'];
    let messi = 0;
    for (let tentativi = 0; messi < 30 && tentativi < 400; tentativi++) {
      const x = 30 + rnd() * (L - 60), y = 25 + rnd() * (S - 50);
      const tipo = tipi[Math.floor(rnd() * tipi.length)];
      const ruota = rnd() * Math.PI;
      const dim = 0.8 + rnd() * 0.5;
      if (Math.abs(x - L / 2) < 45) continue;
      disegnaFiore(g, x, y, tipo, ruota, dim);
      messi++;
    }

    // ombreggiatura ai bordi
    const vign = g.createRadialGradient(L / 2, S / 2, S * 0.45, L / 2, S / 2, L * 0.62);
    vign.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vign.addColorStop(1, 'rgba(20, 60, 15, 0.28)');
    g.fillStyle = vign;
    g.fillRect(0, 0, L, S);
    return c;
  }

  function disegnaFiore(g, x, y, tipo, ruota, dim) {
    g.save();
    g.translate(x, y);
    g.rotate(ruota);
    g.scale(dim, dim);
    g.shadowColor = 'rgba(20, 60, 15, 0.35)';
    g.shadowBlur = 3;
    g.shadowOffsetY = 1.5;
    if (tipo === 'trifoglio') {
      g.fillStyle = '#4f9e3a';
      for (let i = 0; i < 3; i++) {
        const a = i * (Math.PI * 2 / 3);
        g.beginPath();
        g.arc(Math.cos(a) * 4, Math.sin(a) * 4, 4.2, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      return;
    }
    const petali = tipo === 'margherita' ? 8 : 5;
    const colore = tipo === 'margherita' ? '#ffffff' : tipo === 'giallo' ? '#ffd83a' : '#f59ac0';
    const lungo = tipo === 'margherita' ? 6.5 : 4.5;
    g.fillStyle = colore;
    for (let i = 0; i < petali; i++) {
      const a = i * (Math.PI * 2 / petali);
      g.beginPath();
      g.ellipse(Math.cos(a) * lungo * 0.6, Math.sin(a) * lungo * 0.6, lungo * 0.62, lungo * 0.3, a, 0, Math.PI * 2);
      g.fill();
    }
    g.shadowColor = 'transparent';
    g.fillStyle = tipo === 'margherita' ? '#f5c518' : tipo === 'giallo' ? '#e89a10' : '#fff1a8';
    g.beginPath();
    g.arc(0, 0, tipo === 'margherita' ? 2.8 : 2, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function disegnaCampo() {
    if (fondale.complete && fondale.naturalWidth) {
      ctx.drawImage(fondale, 0, 0, L, S);
      disegnaFormiche();
      return;
    }
    const k = Math.min(2, Math.max(1, scala * Math.min(window.devicePixelRatio || 1, 2)));
    if (!prato || Math.abs(k - pratoScala) > 0.25) {
      prato = preparaPrato(k);
      pratoScala = k;
    }
    ctx.drawImage(prato, 0, 0, L, S);
    disegnaFormiche();
  }

  // ---------------------------------------------------------------- formiche
  // Marciano lungo la metà campo; se la ghianda passa vicino scappano e poi
  // tornano in fila. Alcune portano una briciola.
  const FORMICHE = (() => {
    const n = 22;
    return Array.from({ length: n }, (_, i) => ({
      base: i * ((S + 60) / n),
      du: 0, dv: 0, vu: 0, vv: 0,   // spostamento dalla fila e sua velocità
      paura: 0,
      u: L / 2, v: 0, dir: Math.PI / 2,
      briciola: i % 4 === 1,
      fase: i * 1.7,
    }));
  })();
  let marcia = 0;

  function aggiornaFormiche(dt) {
    marcia += dt * 24;
    const b = stato.palla;
    const pericolo = b.inGioco && b.visibile;
    const raggio = b.super ? 80 : 46;
    for (const f of FORMICHE) {
      const giro = S + 60;
      const vFila = ((f.base + marcia) % giro) - 30;
      const prima = { u: f.u, v: f.v };
      if (pericolo && f.paura <= 0) {
        const du = f.u - b.u;
        const dv = f.v - b.v;
        const d = Math.hypot(du, dv);
        if (d < raggio) {
          const a = d > 0.1 ? Math.atan2(dv, du) : casuale(0, Math.PI * 2);
          const fuga = casuale(160, 260) * (b.super ? 1.6 : 1);
          f.vu = Math.cos(a + casuale(-0.5, 0.5)) * fuga;
          f.vv = Math.sin(a + casuale(-0.5, 0.5)) * fuga;
          f.paura = casuale(0.7, 1.1);
        }
      }
      if (f.paura > 0) {
        f.paura -= dt;
        f.du += f.vu * dt;
        f.dv += f.vv * dt;
        f.vu *= 1 - 2.5 * dt;
        f.vv *= 1 - 2.5 * dt;
      } else {
        // torna in fila con calma
        const passo = 70 * dt;
        const d = Math.hypot(f.du, f.dv);
        if (d <= passo || d < 0.01) { f.du = 0; f.dv = 0; }
        else { f.du -= (f.du / d) * passo; f.dv -= (f.dv / d) * passo; }
      }
      f.u = L / 2 + f.du + Math.sin(marcia * 0.08 + f.fase) * 2.5;
      f.v = vFila + f.dv;
      const mu = f.u - prima.u;
      const mv = f.v - prima.v;
      // orienta la formica dove cammina (salta il momento in cui ricomincia il giro)
      if (Math.abs(mv) < 40 && Math.hypot(mu, mv) > 0.3) {
        const voluto = Math.atan2(mv, mu);
        let diff = voluto - f.dir;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        f.dir += diff * Math.min(1, dt * 12);
      }
    }
  }

  function disegnaFormiche() {
    const t = marcia * 0.6;
    for (const f of FORMICHE) {
      if (f.v < -12 || f.v > S + 12) continue;
      ctx.save();
      ctx.translate(f.u, f.v);
      ctx.rotate(f.dir);
      const zampa = Math.sin(t + f.fase) * 2.2;
      // zampe
      ctx.strokeStyle = '#2b1a12';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (const [x, s] of [[-3, 1], [0, -1], [3, 1]]) {
        const z = zampa * s;
        ctx.moveTo(x, 0); ctx.lineTo(x + z, -6);
        ctx.moveTo(x, 0); ctx.lineTo(x - z, 6);
      }
      // antenne
      ctx.moveTo(7, -1); ctx.quadraticCurveTo(10, -3, 12, -5);
      ctx.moveTo(7, 1); ctx.quadraticCurveTo(10, 3, 12, 5);
      ctx.stroke();
      // corpo: addome, torace, testa
      ctx.fillStyle = '#2b1a12';
      ctx.beginPath(); ctx.ellipse(-5.5, 0, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0.5, 0, 2.6, 1.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5.5, 0, 2.4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      if (f.briciola) {
        ctx.fillStyle = '#e0ad5e';
        ctx.beginPath(); ctx.ellipse(9.5, 0, 3.4, 2.8, 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function immagineDi(g) {
    if (g.lato === 'gino') return immagini.gino;
    const f = g.facciaT > 0 ? g.faccia : facciaBaseTino();
    return immagini[f] || immagini.normale;
  }

  function facciaBaseTino() {
    // concentrato prima di un super tiro: barra piena e ghianda in arrivo
    const b = stato.palla;
    if (stato.tino.carica >= 1 && b.inGioco && b.vu < 0) return 'arrabbiato';
    if (stato.fase === 'servizio' && stato.modo !== 'demo') {
      const n = obiettivo() - 1;
      if (stato.punti.tino === n || stato.punti.gino === n) return 'arrabbiato';
    }
    return 'normale';
  }

  function disegnaPersonaggio(g, tempo) {
    const img = immagineDi(g);
    if (!img.complete || !img.naturalWidth) return;

    const sg = sagoma(g);
    const c = sg;
    const w = sg.w;
    const h = sg.h;

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

    ctx.save();
    ctx.translate(c.x + dx, c.y + dy);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
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
    if (b.super && b.super.fase === 'popcorn') {
      disegnaPopcorn(p.x, p.y, b.rot * 0.4);
    } else {
      if (b.super) disegnaAlone(p.x, p.y, tempo);
      disegnaGhianda(p.x, p.y, b.rot, alfa, 1);
    }
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

  function disegnaAlone(x, y, tempo) {
    const r = R * (2.4 + 0.3 * Math.sin(tempo * 40));
    const g = ctx.createRadialGradient(x, y, R * 0.4, x, y, r);
    g.addColorStop(0, 'rgba(255, 240, 150, 0.95)');
    g.addColorStop(0.45, 'rgba(255, 140, 30, 0.7)');
    g.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // pop corn: un grappolo di bolle chiare
  const BOLLE_POPCORN = [[0, 0, 0.62], [-0.55, -0.35, 0.5], [0.55, -0.4, 0.52], [-0.5, 0.45, 0.48], [0.5, 0.45, 0.5], [0, -0.75, 0.45], [0.05, 0.7, 0.42]];
  function disegnaPopcorn(x, y, rot) {
    const r = R * 1.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#f3dc9b';
    for (const [bx, by, br] of BOLLE_POPCORN) {
      ctx.beginPath();
      ctx.arc(bx * r, by * r, br * r + 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowColor = 'transparent';
    for (const [bx, by, br] of BOLLE_POPCORN) {
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.arc(bx * r - 1, by * r - 1, br * r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#c98a3c';
    ctx.beginPath();
    ctx.ellipse(r * 0.15, r * 0.15, r * 0.16, r * 0.1, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function disegnaParticelle(sopra) {
    for (const q of stato.particelle) {
      const davanti = q.tipo === 'testo' || q.tipo === 'pezzo';
      if (davanti !== sopra) continue;
      const k = 1 - q.t / q.durata;
      ctx.save();
      ctx.globalAlpha = Math.max(0, k);
      if (q.tipo === 'fuoco') {
        ctx.fillStyle = k > 0.6 ? '#ffe066' : k > 0.3 ? '#ff9a2e' : '#e8481c';
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r * (0.4 + 0.6 * k), 0, Math.PI * 2);
        ctx.fill();
      } else if (q.tipo === 'fumo') {
        ctx.fillStyle = 'rgba(235, 235, 235, 0.7)';
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r * (1.6 - 0.6 * k), 0, Math.PI * 2);
        ctx.fill();
      } else if (q.tipo === 'pezzo' || q.tipo === 'briciola') {
        ctx.fillStyle = '#fffaf0';
        ctx.strokeStyle = '#e8c87a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (q.tipo === 'testo') {
        ctx.font = '700 34px Fredoka, "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#b5410f';
        ctx.strokeText(q.testo, q.x, q.y);
        ctx.fillStyle = '#fff3c4';
        ctx.fillText(q.testo, q.x, q.y);
      }
      ctx.restore();
    }
  }

  // Barre del super tiro, vicino alla linea di metà campo
  function disegnaBarre(tempo) {
    if (stato.modo === 'demo') return;
    const W = 150, H = 14;
    const pos = verticale
      ? { tino: [16, L / 2 + 40], gino: [S - 16 - W, L / 2 - 40 - H] }
      : { tino: [L / 2 - 28 - W, S - 34], gino: [L / 2 + 28, S - 34] };
    for (const lato of ['tino', 'gino']) {
      const g = stato[lato];
      const [x, y] = pos[lato];
      const piena = g.carica >= 1;
      ctx.save();
      ctx.fillStyle = 'rgba(25, 60, 20, 0.45)';
      arrotondato(x - 3, y - 3, W + 6, H + 6, (H + 6) / 2);
      ctx.fill();
      if (g.carica > 0) {
        const gr = ctx.createLinearGradient(x, 0, x + W, 0);
        if (piena) {
          gr.addColorStop(0, '#ffe066');
          gr.addColorStop(0.5, '#ff9a2e');
          gr.addColorStop(1, '#e8481c');
        } else if (lato === 'tino') {
          gr.addColorStop(0, '#ffd59a');
          gr.addColorStop(1, '#ff9a2e');
        } else {
          gr.addColorStop(0, '#c9e6ff');
          gr.addColorStop(1, '#5aa8e8');
        }
        ctx.fillStyle = gr;
        if (piena) {
          ctx.shadowColor = 'rgba(255, 150, 30, 0.9)';
          ctx.shadowBlur = 8 + 6 * Math.abs(Math.sin(tempo * 6));
        }
        arrotondato(x, y, Math.max(H, W * g.carica), H, H / 2);
        ctx.fill();
      }
      ctx.restore();
      if (piena) {
        ctx.save();
        ctx.font = '700 15px Fredoka, "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#7a2a08';
        ctx.fillText('SUPER!', x + W / 2, y + H / 2 + 1);
        ctx.restore();
      }
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
    ctx.strokeStyle = 'rgba(40, 85, 30, 0.85)';
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
      <div class="ritratti">${img('normale', 'salta')}<span class="vs">contro</span>${img('gino')}</div>
      <h1>Botta e Ghianda</h1>
      <p>Rimanda la ghianda e non lasciarla passare! Colpiscila con i bordi per tiri più angolati.</p>
      <p>Ogni colpo carica la barra del <b>super tiro</b>: quando è piena, il colpo dopo infuoca la ghianda… e poi succede qualcosa di croccante!</p>
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
      <div class="ritratti">${img('normale', 'salta')}${img('gino', 'caduto')}</div>
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
      ? `${img('normale', 'salta')}${img('gino', 'caduto')}`
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
    const dt = clamp((ora - ultimo) / 1000, 0, 0.05);
    ultimo = ora;
    aggiorna(dt);
    disegna(ora / 1000);
    requestAnimationFrame(ciclo);
  }
  requestAnimationFrame(ciclo);

  // utile per le prove automatiche
  window.bottaEGhianda = { stato, iniziaPartita, aggiorna, prevedi, IA, PALLA, SUPER, tocca, sagoma };
})();
