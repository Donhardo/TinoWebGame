/*
 * Tino Flipper (versione 2): la partita.
 *
 * Mette insieme il motore (motore.js) e un tavolo (tavoli/<nome>.js): palle,
 * lancio, palla salvata, tilt, bonus a fine palla, combo e moltiplicatore del
 * campo, multiball e avventure (con le regole proprie del tavolo), telecamera
 * verticale con anticipo, mini mappa, disegno a strati, comandi, pannelli e il
 * giocatore simulato (partita dimostrativa e prove automatiche).
 *
 * Il tavolo è più alto dello schermo: se ne vede una finestra che segue la
 * ghianda. Sugli schermi larghi accanto al tavolo ci sono due pannelli
 * disegnati nel canvas (display e mini mappa a sinistra, Tino a destra).
 */
(() => {
  'use strict';
  const TF = window.TF;
  const U = TF.util;
  const { clamp, casuale, scegli, numero, hexA } = U;
  const R = TF.R;
  const A = TF.audio;
  const suoni = A.suoni;

  const LATO = 260;                   // pannelli laterali (schermi larghi)
  const ALTO_MIN = 960;               // altezza logica minima della finestra sul tavolo
  const LANCIO = { min: 900, max: 3150, pieno: 1.05, auto: 0.74 };
  const SALVA = { inizio: 12, multiball: 14, minimo: 5 };
  const TILT = { colpo: 1, cala: 0.55, avviso: 1.7, tilt: 2.75 };
  const PERCORSO = { su: -500, giu: 900 };          // accelerazione sulle rampe (px/s²)
  const CAMERA = { anticipo: 0.25, molla: 42, zonaMorta: 36, margine: 70, sottoFlipper: 0.75 };

  const ASSETS = '../../assets/';
  const immagini = {
    normale: carica(ASSETS + 'tino/tino-normale.png'),
    arrabbiato: carica(ASSETS + 'tino/tino-arrabbiato.png'),
    ferito: carica(ASSETS + 'tino/tino-ferito.png'),
    ko: carica(ASSETS + 'tino/tino-ko.png'),
    gino: carica(ASSETS + 'gino/gino.png'),
    agente: carica(ASSETS + 'agenti-tari/agente-timbro.svg'),
  };
  function carica(src) {
    const img = new Image();
    img.src = src;
    return img;
  }
  const pronta = (img) => img && img.complete && img.naturalWidth > 0;

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

  // ================================================================ stato
  const stato = {
    test: false,         // prove automatiche: niente suoni, pannelli e avanzamento da solo
    iaGioca: false,      // nelle prove il giocatore simulato gioca anche la partita vera
    modo: 'demo',        // 'demo' | 'gioco'
    fase: 'gioco',       // 'gioco' | 'bonus' | 'pausa' | 'finita'
    pausaDa: null,
    punti: 0, palla: 1, palleTotali: 3, palleExtra: 0,
    palle: [],
    lancio: { carica: 0, premuto: false, attesa: false, auto: 0, palla: null, ritardo: 0 },
    salva: 0, salvaPronto: false,
    bonusMolt: 1, moltCampo: 1, moltT: 0,
    combo: { n: 0, t: 0 },
    multiball: false,
    jackpot: { valore: 150000, fatti: 0, doppio: false },
    avventura: null, avventureFatte: [], giro: 0,
    tilt: 0, tiltato: false,
    contatori: null, bonus: null,
    scossa: 0, flash: 0, flasher: [], gi: 1,
    messaggi: [], scritte: [], particelle: [],
    tino: { faccia: 'normale', t: 0, salto: 0 },
    tempo: 0,
    vistaIntera: false,
    statistiche: { palle: 0, durata: 0, perse: 0, salvate: 0, fuori: 0, ferme: 0, dove: [], tiri: {} },
  };
  let muto = leggi('muto', false);
  let ultimaPosizione = -1;

  // ================================================================ interfaccia per il tavolo
  const ia = { mira: null, flipper: {} };
  const G = {
    stato, suoni, ia, immagini, pronta,
    punti: aggiungiPunti, messaggio, scritta, faccia, festa, scintille, tiro, obiettivo, campo,
    scossa: (k = 1) => { stato.scossa = Math.max(stato.scossa, 0.25 * k); },
    flash: (k = 0.6) => { stato.flash = Math.max(stato.flash, k); flasherTutti(k); },
    flasher,
    percorso: avviaPercorso, trattieni, libera, togli, nuovaPalla, inCanna,
    avviaMultiball, avviaAvventura, fineAvventura,
    tinta, d: null,
  };

  // Il tavolo: ?tavolo=<id> nell'indirizzo (ogni tavolo è in tavoli/<id>.js,
  // incluso da index.html); se manca o non c'è, le Radici.
  const idTavolo = (() => {
    try { return new URLSearchParams(location.search).get('tavolo'); } catch (e) { return null; }
  })();
  const T = (TF.tavoli[idTavolo] || TF.tavoli.radici)(G);
  const m = T.mondo;
  const W = T.W, H = T.H;
  if (!T.lancio.yStantuffo) T.lancio.yStantuffo = H - 54;
  const flipperDi = (lato) => m.flipper.filter((f) => f.lato === lato);
  let classifica = leggi(T.id + ':classifica', []);
  const record = () => (classifica.length ? classifica[0].punti : 0);

  A.abilitato = () => !stato.test && stato.modo !== 'demo';
  A.muto = muto;
  A.musica.brano = T.musica.brano;
  A.musica.spenta = leggi('musica-spenta', false);
  A.musica.stile = () => {
    if (stato.test) return null;
    const st = T.musica.stili;
    if (stato.modo !== 'gioco' || stato.fase === 'finita') return st.menu;
    if (stato.fase === 'pausa') return null;
    if (stato.avventura) return st[stato.avventura.stile] || st.gioco;
    if (stato.multiball) return st.multiball;
    return st.gioco;
  };

  function tinta() {
    const a = stato.avventura;
    return { neon: a ? a.tinta : T.colori.neon, neon2: T.colori.neon2, luce: T.colori.luce };
  }

  // ================================================================ regole comuni
  function nuoviContatori() { return T.contatori(); }

  function moltiplicatore() {
    return Math.min(stato.moltT > 0 ? stato.moltCampo : 1, 6);
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
    if (T.oggetti.GINO) T.oggetti.GINO.salto = 1;
  }
  function scintille(x, y, colore, n = 10, vel = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = casuale(0.3, 1) * vel;
      stato.particelle.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, durata: casuale(0.3, 0.7), colore, r: casuale(1.5, 3.2) });
    }
    if (stato.particelle.length > 260) stato.particelle.splice(0, stato.particelle.length - 260);
  }
  // Flasher: le lampade grosse dei flipper veri, che sparano un lampo di luce
  // colorata sul campo nei momenti forti (jackpot, multiball, avventure).
  function flasher(x, y, colore = null, k = 1, durata = 0.4) {
    stato.flasher.push({ x, y, colore: colore || tinta().luce, k, t: 0, durata });
    if (stato.flasher.length > 12) stato.flasher.shift();
  }
  function flasherTutti(k = 1) {
    (T.flasher || []).forEach(([x, y], i) => flasher(x, y, null, k, 0.35 + 0.06 * i));
  }
  function obiettivo(testo, valore) {
    const c = camera.y + camera.alto * 0.4;
    const v = aggiungiPunti(valore, T.CX, c, '#fff27a');
    messaggio(testo, '+' + numero(v), 2.2);
    suoni.jackpot();
    stato.flash = Math.max(stato.flash, 0.6);
    festa();
  }
  function campo(mm, durata, testo) {
    if (mm >= stato.moltCampo || stato.moltT <= 0) {
      stato.moltCampo = mm;
      stato.moltT = durata;
      messaggio(testo || `Campo ×${mm}`, `Campo ×${mm} per ${durata} secondi`, 1.8);
      suoni.molt();
      festa();
    }
  }

  // Tiri principali: contano per le combo (e nel finale sono jackpot)
  function tiro(nome, x, y) {
    stato.statistiche.tiri[nome] = (stato.statistiche.tiri[nome] || 0) + 1;
    const c = stato.combo;
    c.n = c.t > 0 ? c.n + 1 : 1;
    c.t = 3.6;
    if (c.n >= 2) {
      aggiungiPunti(10000 * c.n, x, y - 24, tinta().neon2);
      messaggio(`Combo ×${c.n}!`, '', 1.1);
      suoni.combo(c.n);
      if (c.n === 3 || c.n === 5 || c.n === 7) campo(c.n === 3 ? 2 : c.n === 5 ? 3 : 4, 20);
    }
    const a = stato.avventura;
    if (a && a.id === T.FINALE.id && nome !== 'rampa' && nome !== 'giro') {
      const v = aggiungiPunti(100000, x, y - 44, '#fff27a');
      messaggio('JACKPOT!', '+' + numero(v), 1.1);
      suoni.jackpot();
      stato.flash = 0.5;
    }
  }

  function avviaMultiball(finale = false) {
    stato.multiball = true;
    stato.jackpot.valore = T.PUNTI.jackpot + 50000 * stato.giro;
    stato.jackpot.fatti = 0;
    stato.jackpot.doppio = false;
    if (!finale) suoni.multiball();
    stato.flash = 0.8;
    G.scossa(1.2);
    festa();
    stato.salva = Math.max(stato.salva, SALVA.multiball);
  }

  function avviaAvventura(def) {
    stato.avventura = { ...def, t: def.durata, conto: 0 };
    messaggio(def.nome, def.testo, 3.2);
    suoni.avventura();
    stato.flash = 0.6;
    festa();
    T.inizioAvventura(def);
    aggiornaColori();
  }
  function fineAvventura(completa) {
    const a = stato.avventura;
    if (!a) return;
    stato.avventura = null;
    T.fineAvventura(a);
    aggiornaColori();
    if (a.id === T.FINALE.id) {
      stato.avventureFatte = [];
      stato.giro++;
      messaggio('La Ghianda d\'Oro!', 'Si ricomincia: il tavolo va più veloce', 2.6);
      suoni.vittoria();
      festa();
    } else {
      stato.avventureFatte.push(a.id);
      messaggio(`${a.nome}: finita`, completa ? '' : 'Stordisci l\'agente per la prossima', 1.8);
      suoni.fineAvventura();
      if (stato.avventureFatte.length === T.AVVENTURE.length) messaggio('Tutte le avventure!', 'Stordisci l\'agente per la Ghianda d\'Oro', 2.4);
    }
  }

  // ---------------------------------------------------------------- palle
  function nuovaPalla(x, y, vx = 0, vy = 0) {
    const p = { x, y, vx, vy, px: x, py: y, rot: Math.random() * 6, stato: 'campo', piano: 0, scia: [], ferma: 0, s: 0, v: 0, per: null };
    stato.palle.push(p);
    return p;
  }
  function avviaPercorso(p, id, vel) {
    const per = m.percorsi[id];
    p.stato = 'percorso';
    p.per = per;
    p.s = 0;
    p.v = per.costante || clamp(vel || 1000, per.vel[0], per.vel[1]);
    const q = m.puntoPercorso(per, 0);
    p.x = q.x; p.y = q.y;
    p.scia.length = 0;
  }
  function trattieni(p, x, y, tempo, poi) {
    p.stato = 'ferma';
    p.x = x; p.y = y; p.vx = 0; p.vy = 0;
    p.attesa = tempo;
    p.poi = poi;
  }
  function libera(p, piano, x, y, vx, vy) {
    p.stato = 'campo';
    p.piano = piano;
    p.x = x; p.y = y; p.px = x; p.py = y;
    p.vx = vx; p.vy = vy;
    p.ferma = 0;
    for (const g of m.magneti) if (g.palla === p) g.palla = null;
  }
  function togli(p) {
    const i = stato.palle.indexOf(p);
    if (i >= 0) stato.palle.splice(i, 1);
    for (const g of m.magneti) if (g.palla === p) g.palla = null;
  }

  // Mette una ghianda nel corridoio di lancio. auto = parte da sola.
  function inCanna(auto = false, ritardo = 0) {
    const L = stato.lancio;
    L.attesa = true;
    L.ritardo = ritardo;
    L.auto = auto ? 0.7 + ritardo : 0;
    L.carica = 0;
    L.palla = null;
  }
  function mettiInCanna() {
    const p = nuovaPalla(T.lancio.x, T.lancio.y);
    p.stato = 'canna';
    stato.lancio.palla = p;
  }
  function lancia(forza) {
    const L = stato.lancio;
    const p = L.palla;
    if (!p) return;
    p.stato = 'campo';
    p.piano = 0;
    p.x = T.lancio.x; p.y = T.lancio.y;
    p.vy = -(LANCIO.min + (LANCIO.max - LANCIO.min) * forza) * casuale(0.985, 1.015);
    p.vx = 0;
    p.lanciata = true;
    L.palla = null;
    L.attesa = false;
    L.carica = 0;
    L.premuto = false;
    L.scade = 4;
    stato.salvaPronto = true;
    suoni.lancio(forza);
    suoni.fineCarica();
  }
  const inGioco = () => stato.palle.length + (stato.lancio.attesa ? 1 : 0) + (T.inArrivo ? T.inArrivo() : 0);

  function pallaPersa(p) {
    togli(p);
    if (stato.test) (stato.statistiche.scoli = stato.statistiche.scoli || []).push([Math.round(p.x), p.esterna ? 'esterna' : 'centro', p.ultimo || '']);
    stato.statistiche.perse++;
    if (stato.modo === 'demo') {
      if (!inGioco()) inCanna(true, 0.4);
      if (stato.multiball && inGioco() <= 1) chiudiMultiball();
      return;
    }
    if (stato.tiltato) {
      if (!stato.palle.length) fineBiglia();
      return;
    }
    if (stato.salva > 0) {
      stato.statistiche.salvate++;
      messaggio('Salvata!', 'Ecco un\'altra ghianda', 1.4);
      suoni.scolo();
      suoni.salvata();
      if (stato.multiball && T.rimetti) T.rimetti();
      else inCanna(true, 0.3);
      return;
    }
    if (stato.multiball && inGioco() <= 1) chiudiMultiball();
    if (inGioco() === 0) {
      faccia('arrabbiato', 2.2);
      suoni.persa();
      fineBiglia();
    } else {
      suoni.scolo();
    }
  }
  function chiudiMultiball() {
    stato.multiball = false;
    T.fineMultiball();
    if (stato.avventura && stato.avventura.id === T.FINALE.id) fineAvventura(true);
    else messaggio('Fine del multiball', '', 1.4);
  }

  function fineBiglia() {
    if (stato.avventura) fineAvventura(false);
    stato.multiball = false;
    stato.moltT = 0;
    stato.combo = { n: 0, t: 0 };
    T.fineBiglia();
    const righe = T.righeBonus(stato.contatori).filter((r) => r[1] > 0);
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
    stato.inizioPalla = stato.tempo;
    stato.statistiche.palle++;
    T.nuovaPalla();
    inCanna(stato.modo === 'demo' || stato.iaGioca);
    camera.y = H - camera.alto;
    if (stato.modo === 'gioco') {
      messaggio(`Palla ${stato.palla}`, touch ? 'Tieni premuto e lascia per lanciare' : 'Tieni premuto ↓ o Spazio, poi lascia', 2.2);
      faccia(stato.palla === stato.palleTotali && !stato.palleExtra ? 'arrabbiato' : 'normale', 2);
    }
    aggiornaTabellone();
  }
  function iniziaPartita(modo = 'gioco') {
    stato.modo = modo;
    Object.assign(stato, {
      punti: 0, palla: 1, palle: [], bonusMolt: 1, moltCampo: 1, moltT: 0, combo: { n: 0, t: 0 },
      multiball: false, jackpot: { valore: T.PUNTI.jackpot, fatti: 0, doppio: false },
      avventura: null, avventureFatte: [], giro: 0, palleExtra: 0, tilt: 0, tiltato: false,
      messaggi: [], scritte: [], particelle: [], bonus: null,
      statistiche: { palle: 0, durata: 0, perse: 0, salvate: 0, fuori: 0, ferme: 0, dove: [], tiri: {} },
    });
    stato.lancio = { carica: 0, premuto: false, attesa: false, auto: 0, palla: null, ritardo: 0 };
    T.nuovaPartita();
    aggiornaColori();
    ultimaPosizione = -1;
    stato.match = null;
    // palle in più vinte col match
    const match = modo === 'gioco' && !stato.test ? leggi('match', 0) || 0 : 0;
    if (match > 0) {
      stato.palleExtra = 1;
      scrivi('match', match - 1);
    }
    iniziaPalla();
    if (modo === 'gioco') {
      nascondiPannello();
      suoni.via();
      if (match > 0) setTimeout(() => messaggio('Palla extra dal match!', 'Una ghianda in più per questa partita', 2.4), 2300);
    }
  }
  function fineGioco() {
    stato.fase = 'finita';
    faccia('ko', 99);
    suoni.sconfitta();
    // il match dei flipper veri: due cifre a caso contro le ultime due del
    // punteggio; se sono uguali, knocker e una palla in più alla prossima partita
    const cifre = String(stato.punti % 100).padStart(2, '0');
    const vinto = !stato.test && Math.random() < 0.12;
    let estratte = cifre;
    if (!vinto) while (estratte === cifre) estratte = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    stato.match = { cifre, estratte, vinto };
    if (vinto) {
      scrivi('match', (leggi('match', 0) || 0) + 1);
      setTimeout(() => { if (stato.fase === 'finita') suoni.knocker(); }, 900);
    }
    const voce = { punti: stato.punti, data: new Date().toLocaleDateString('it-IT') };
    const lista = classifica.concat([voce]).sort((a, b) => b.punti - a.punti).slice(0, 5);
    ultimaPosizione = lista.indexOf(voce);
    if (!stato.test) {
      classifica = lista;
      scrivi(T.id + ':classifica', classifica);
    }
    aggiornaTabellone();
    mostraPannello(pannelloFine());
  }
  function pausa() {
    if (stato.modo !== 'gioco' || stato.fase === 'pausa' || stato.fase === 'finita') return;
    stato.pausaDa = stato.fase;
    stato.fase = 'pausa';
    for (const f of m.flipper) f.premuto = false;
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
      for (const f of m.flipper) f.premuto = false;
      messaggio('TILT!', 'Hai scosso troppo il tavolo', 3, '#ff4a5a');
      faccia('ferito', 3);
      suoni.tilt();
      stato.salva = 0;
      if (stato.avventura) fineAvventura(false);
    } else if (stato.tilt >= TILT.avviso) {
      messaggio('Attento!', 'Ancora uno e va in tilt', 1.4, '#ffb627');
      faccia('arrabbiato', 1.5);
      suoni.avviso();
    }
  }

  // ---------------------------------------------------------------- aggiornamento
  let accumulo = 0;
  let orologio = 0;     // tempo della fisica (avanza di un passo alla volta)

  m.ev = (tipo, o, p, info) => T.evento(tipo, o, p, info);

  function passoFisica(h) {
    orologio += h;
    m.tempo = stato.tempo;
    m.tiltato = stato.tiltato;
    for (const f of m.flipper) TF.muoviFlipper(f, h, orologio, stato.tiltato);
    const palle = stato.palle;
    for (let i = 0; i < palle.length; i++) {
      const p = palle[i];
      if (p.stato !== 'campo') continue;
      const r = TF.passoPalla(m, p, h, false);
      if (!r) continue;
      if (r.bocca) T.bocca(p, r.bocca, r.vel);
      else if (r.presa) T.presa(p, r.presa);
      else if (r.magnete) { r.magnete.palla = p; T.magnete(p, r.magnete); }
    }
    for (let i = 0; i < palle.length; i++) {
      if (palle[i].stato !== 'campo') continue;
      for (let j = i + 1; j < palle.length; j++) {
        if (palle[j].stato === 'campo' && palle[j].piano === palle[i].piano) TF.urtaPalle(m, palle[i], palle[j]);
      }
    }
    T.aggiornaFisica(h);
  }

  function aggiorna(dt) {
    stato.tempo += dt;
    aggiornaEffetti(dt);
    if (stato.fase === 'pausa' || stato.fase === 'finita') return;
    if (stato.fase === 'bonus') aggiornaBonus(dt);
    m.gravita = (T.gravita || 1650) * (1 + 0.06 * Math.min(stato.giro, 4));
    if (stato.modo === 'demo' || stato.iaGioca) pilotaIA(dt);

    // lancio
    const L = stato.lancio;
    if (L.attesa) {
      if (L.ritardo > 0) {
        L.ritardo -= dt;
        if (L.ritardo <= 0 && !L.palla) mettiInCanna();
      } else if (!L.palla) {
        mettiInCanna();
      }
      if (L.palla) {
        if ((stato.modo === 'demo' || stato.iaGioca) && L.auto <= 0 && !L.premuto) L.auto = 0.5;
        if (L.auto > 0) {
          L.auto -= dt;
          if (L.auto <= 0) lancia(stato.modo === 'demo' || stato.iaGioca ? casuale(0.55, 0.95) : LANCIO.auto);
        } else if (L.premuto) {
          L.carica = Math.min(1, L.carica + dt / LANCIO.pieno);
          suoni.carica(L.carica);
        }
      }
    }

    accumulo = Math.min(accumulo + dt, 0.06);
    while (accumulo >= TF.FISICA.passo) {
      passoFisica(TF.FISICA.passo);
      accumulo -= TF.FISICA.passo;
    }

    for (const p of [...stato.palle]) {
      if (p.stato === 'percorso') {
        const per = p.per;
        p.s += p.v * dt;
        const q = m.puntoPercorso(per, Math.min(p.s, per.lung));
        p.x = q.x; p.y = q.y;
        if (!per.costante) p.v = clamp(p.v + (q.dy < 0 ? PERCORSO.su : PERCORSO.giu) * dt, per.vel[0], per.vel[1]);
        p.rot += p.v * dt / R;
        if (p.s >= per.lung) {
          const fatto = T.finePercorso(p, per);
          if (!fatto && p.stato === 'percorso') {
            p.stato = 'campo';
            p.piano = per.piano;
            p.vx = q.dx * per.uscita; p.vy = q.dy * per.uscita;
            p.px = p.x; p.py = p.y;
          }
        }
        continue;
      }
      if (p.stato === 'ferma') {
        p.attesa -= dt;
        if (p.attesa <= 0 && p.poi) {
          const poi = p.poi;
          p.poi = null;
          poi(p);
        }
        continue;
      }
      if (p.stato !== 'campo') continue;
      // la ghianda gira con lo spin preso negli urti (più un filo col moto, così non sembra mai ferma)
      p.rot += ((p.spin || 0) + (p.vx * 0.25 + p.vy * 0.1) / R) * dt;
      if (p.y > T.yPersa || p.x < -40 || p.x > W + 40 || p.y < -60) {
        if (p.y < H) {
          stato.statistiche.fuori++;
          if (stato.test) stato.statistiche.dove.push(['fuori', Math.round(p.x), Math.round(p.y)]);
        }
        pallaPersa(p);
        continue;
      }
      // la ghianda è tornata giù nel corridoio: di nuovo in canna
      if (p.x > T.lancio.xCorridoio && p.y > T.lancio.yRitorno && Math.abs(p.vy) < 200 && !L.palla) {
        p.stato = 'canna';
        p.x = T.lancio.x; p.y = T.lancio.y; p.vx = p.vy = 0;
        L.attesa = true; L.palla = p; L.ritardo = 0;
        L.auto = stato.modo === 'demo' || stato.iaGioca ? 0.5 : L.auto;
      }
      // il conto di "salvata" parte quando la ghianda entra in campo
      if (stato.salvaPronto && p.x < T.salvaDa) {
        stato.salvaPronto = false;
        if (stato.salva <= 0) stato.salva = Math.max(SALVA.minimo, SALVA.inizio - stato.giro);
      }
      // ghianda ferma (incastrata)
      if (p.vx * p.vx + p.vy * p.vy < 40 * 40) p.ferma += dt;
      else p.ferma = 0;
      if (p.ferma > 3 && !(p.x > T.lancio.xCorridoio && p.y > T.lancio.yRitorno)) {
        p.ferma = 0;
        p.vx += casuale(-200, 200); p.vy -= 400;
        stato.statistiche.ferme++;
        if (stato.test) stato.statistiche.dove.push(['ferma', p.piano, Math.round(p.x), Math.round(p.y)]);
        if (stato.modo === 'gioco') messaggio('Ghianda incastrata', 'Uno scossone gratis', 1.2);
      }
      p.scia.push(p.x, p.y);
      if (p.scia.length > 16) p.scia.splice(0, 2);
    }

    // tempi
    if (stato.salva > 0 && !stato.salvaPronto) stato.salva = Math.max(0, stato.salva - dt);
    if (stato.moltT > 0) stato.moltT -= dt;
    if (stato.combo.t > 0) stato.combo.t -= dt;
    stato.tilt = Math.max(0, stato.tilt - TILT.cala * dt);
    const a = stato.avventura;
    if (a) {
      a.t -= dt;
      if (a.t <= 0 && a.id !== T.FINALE.id) fineAvventura(true);
      if (a.id === T.FINALE.id && a.t <= 0 && !stato.multiball) fineAvventura(true);
    }
    T.aggiorna(dt);
    aggiornaCamera(dt);
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

  // Illuminazione generale del tavolo (come nei flipper veri: si spegne col
  // tilt, si abbassa a fine palla e a partita finita)
  function illuminazione() {
    if (stato.tiltato) return 0.3;
    if (stato.fase === 'finita') return 0.45;
    if (stato.fase === 'bonus') return 0.62;
    return 1;
  }
  function aggiornaEffetti(dt) {
    stato.scossa = Math.max(0, stato.scossa - dt);
    stato.flash = Math.max(0, stato.flash - dt * 1.6);
    stato.gi += (illuminazione() - stato.gi) * Math.min(1, dt * 7);
    for (const f of stato.flasher) f.t += dt;
    stato.flasher = stato.flasher.filter((f) => f.t < f.durata);
    for (const s of stato.scritte) { s.t += dt; s.y -= 40 * dt; }
    stato.scritte = stato.scritte.filter((s) => s.t < s.durata);
    if (stato.messaggi.length) {
      const mm = stato.messaggi[0];
      mm.t += dt;
      if (mm.t > mm.durata) stato.messaggi.shift();
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

  // ================================================================ giocatore simulato
  // Quando una ghianda arriva su un flipper prova diversi istanti per battere
  // con la stessa fisica del gioco e sceglie quello che la manda dove vuole.
  // Il tasto di un lato muove tutti i flipper di quel lato, anche nella prova.
  // errore: secondi di imprecisione; bravura: probabilità di mirare davvero.
  const IA = { errore: 0.004, bravura: 0.9, tiene: 0.2, passi: 14, passoRitardo: 0.02, durata: 1 };
  const IA_LEGGERA = { passi: 8, passoRitardo: 0.035 };

  function copiaFlipper(lato, ritardo) {
    return m.flipper.map((f) => {
      const c = { ...f };
      if (c.prog) c.prog = { da: c.prog.da - orologio, a: c.prog.a - orologio };
      if (f.lato === lato && ritardo !== null) c.prog = { da: ritardo, a: ritardo + IA.tiene };
      return c;
    });
  }
  function provaColpo(p, f, ritardo, durata = IA.durata) {
    return TF.simula(m, p, copiaFlipper(f.lato, ritardo), durata, T.esitoExtra).esito;
  }
  function pilotaIA(dt) {
    for (const f of m.flipper) {
      const s = ia.flipper[f.id] || (ia.flipper[f.id] = { pausa: 0, pensa: 0 });
      if (flipperDi(f.lato).some((x) => x.prog)) continue;   // colpo in corso su quel lato
      if (s.pausa > 0) { s.pausa -= dt; continue; }
      const z = f.zona;
      const p = stato.palle.find((q) => q.stato === 'campo' && q.piano === f.piano && q.x > z[0] && q.x < z[2] && q.y > z[1] && q.y < z[3] && q.vy > -150);
      if (!p) continue;
      if (s.pensa > 0) { s.pensa -= dt; continue; }
      s.pensa = 0.03;
      const voglio = Math.random() < IA.bravura ? T.desiderati() : [];
      let meglio = null;
      const prove = touch && !stato.test ? IA_LEGGERA : IA;
      for (let i = 0; i < prove.passi; i++) {
        const r = i * prove.passoRitardo;
        const esito = provaColpo(p, f, r);
        const pos = voglio.indexOf(esito);
        const punteggio = pos >= 0 ? 100 - pos * 10 : (T.VALORE[esito] ?? 1);
        if (!meglio || punteggio > meglio.punteggio) meglio = { r, esito, punteggio };
      }
      // se non c'è niente di meglio che lasciarla rotolare, aspetta e riprova
      if (meglio.punteggio <= T.VALORE.niente) {
        const lasciando = provaColpo(p, f, null, 0.35);
        if (lasciando !== 'persa' && lasciando !== 'scivolo') continue;
      }
      if (meglio.r > 0.08 && meglio.punteggio < 50) continue;   // decide più avanti
      const da = orologio + Math.max(0, meglio.r + casuale(-IA.errore, IA.errore));
      for (const x of flipperDi(f.lato)) x.prog = { da, a: da + IA.tiene };
      s.pausa = meglio.r + IA.tiene + 0.08;
      s.esito = meglio.esito;
      p.ultimo = f.id + ':' + meglio.esito;
      if (Math.random() < 0.15) ia.mira = scegli(T.MIRE);
    }
  }

  // ================================================================ telecamera
  // Segue la ghianda più pericolosa (la più in basso che scende) guardando dove
  // sarà tra un quarto di secondo; quando è nella parte bassa del tavolo tiene
  // in vista i flipper. Si muove come una molla smorzata, con una zona morta.
  const camera = { y: 0, v: 0, alto: ALTO_MIN, bersaglio: null };
  function pallaDaSeguire() {
    let meglio = null, punteggio = -Infinity;
    for (const p of stato.palle) {
      if (p.stato === 'percorso' && p.per.sotto && p.s < p.per.lung * 0.7) continue;
      const vy = p.stato === 'campo' ? p.vy : 0;
      const s = p.y + (vy > 0 ? vy * 0.4 : 0) + (p.stato === 'campo' ? 400 : p.stato === 'canna' ? -200 : 0);
      if (s > punteggio) { punteggio = s; meglio = p; }
    }
    return meglio;
  }
  function aggiornaCamera(dt) {
    const alto = camera.alto;
    if (alto >= H) { camera.y = 0; camera.v = 0; return; }
    const p = pallaDaSeguire();
    camera.bersaglio = p;
    let meta = camera.y;
    if (p) {
      const vy = p.stato === 'campo' ? p.vy : 0;
      const centro = p.y + clamp(vy * CAMERA.anticipo, -250, 350);
      meta = centro - alto * 0.5;
      if (p.y > H - alto * CAMERA.sottoFlipper && p.piano === 0) meta = Math.max(meta, H - alto);
    } else {
      meta = H - alto;
    }
    meta = clamp(meta, 0, H - alto);
    let des = camera.y;
    if (meta > camera.y + CAMERA.zonaMorta) des = meta - CAMERA.zonaMorta;
    else if (meta < camera.y - CAMERA.zonaMorta) des = meta + CAMERA.zonaMorta;
    if (meta === H - alto || meta === 0) des = meta;
    const k = CAMERA.molla;
    camera.v += (k * (des - camera.y) - 2 * Math.sqrt(k) * camera.v) * dt;
    camera.y += camera.v * dt;
    // la ghianda non esce mai dall'inquadratura
    if (p && p.stato !== 'percorso') {
      if (p.y < camera.y + CAMERA.margine) { camera.y = p.y - CAMERA.margine; camera.v = Math.min(camera.v, 0); }
      if (p.y > camera.y + alto - CAMERA.margine) { camera.y = p.y + CAMERA.margine - alto; camera.v = Math.max(camera.v, 0); }
    }
    camera.y = clamp(camera.y, 0, H - alto);
  }

  // ================================================================ input
  const tasti = new Set();
  const SINISTRA = ['ArrowLeft', 'KeyZ', 'KeyA', 'ShiftLeft'];
  const DESTRA = ['ArrowRight', 'Slash', 'KeyD', 'ShiftRight', 'KeyL'];
  const LANCIA = ['ArrowDown', 'Space', 'KeyS', 'Enter'];
  const SCUOTI = ['ArrowUp', 'KeyW', 'KeyT'];
  const premuti = { sx: false, dx: false };

  function premiFlipper(lato, giu) {
    if (stato.modo !== 'gioco' || stato.fase === 'pausa' || stato.fase === 'finita') return;
    if (giu && !premuti[lato]) {
      if (!stato.tiltato) suoni.flipper();
      if (T.premuto) T.premuto(lato);
    } else if (!giu && premuti[lato] && !stato.tiltato) {
      suoni.flipperGiu();
    }
    premuti[lato] = giu;
    for (const f of flipperDi(lato)) { f.premuto = giu; f.prog = null; }
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
  function cambiaVista() {
    stato.vistaIntera = !stato.vistaIntera;
    scrivi('vista-intera', stato.vistaIntera);
    ridimensiona();
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
    if (e.code === 'KeyV') { cambiaVista(); return; }
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

  // Mouse e dita: metà sinistra = flipper di sinistra, metà destra = di destra.
  // Con la ghianda nel corridoio (e nessuna in campo) si tiene premuto per
  // caricare. Una strisciata veloce verso l'alto è lo scossone.
  const dita = new Map();
  function latoDi(e) {
    const r = canvas.getBoundingClientRect();
    return e.clientX - r.left < r.width / 2 ? 'sx' : 'dx';
  }
  function soloInCanna() {
    return stato.lancio.palla && stato.lancio.auto <= 0 && !stato.palle.some((p) => p.stato !== 'canna');
  }
  function aggiornaDita() {
    let sx = false, dx = false;
    for (const d of dita.values()) {
      if (d.ruolo === 'sx') sx = true;
      if (d.ruolo === 'dx') dx = true;
    }
    if (premuti.sx !== sx) premiFlipper('sx', sx);
    if (premuti.dx !== dx) premiFlipper('dx', dx);
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (stato.modo !== 'gioco' || stato.fase !== 'gioco') return;
    e.preventDefault();
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
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
  canvas.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });

  // ---------------------------------------------------------------- audio
  function sbloccaAudio() {
    if (stato.test) return;
    try { A.contesto(); } catch (e) { return; }
    A.aggiornaMusica();
  }
  window.addEventListener('pointerdown', sbloccaAudio, true);
  window.addEventListener('keydown', sbloccaAudio, true);
  function cambiaAudio() {
    muto = !muto;
    A.muto = muto;
    scrivi('muto', muto);
    document.body.classList.toggle('muto', muto);
    if (muto) suoni.fineCarica();
    A.aggiornaMusica();
  }
  function cambiaMusica() {
    A.musica.spenta = !A.musica.spenta;
    scrivi('musica-spenta', A.musica.spenta);
    document.body.classList.toggle('senza-musica', A.musica.spenta);
    A.aggiornaMusica();
  }

  // ================================================================ DISEGNO
  let scala = 1, dpr = 1, lato = 0, larghezza = W, mini = null;
  function ridimensiona() {
    const r = palco.getBoundingClientRect();
    const aw = Math.max(100, r.width - 8);
    const ah = Math.max(100, r.height - 8);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (stato.vistaIntera) {
      scala = Math.min(aw / W, ah / H);
      camera.alto = H;
    } else {
      scala = Math.min(aw / W, ah / ALTO_MIN);
      camera.alto = Math.min(H, ah / scala);
    }
    // pannelli ai lati se c'è spazio
    lato = aw - W * scala >= 2 * 200 * scala ? Math.min(LATO, (aw / scala - W) / 2) : 0;
    larghezza = W + 2 * lato;
    canvas.style.width = Math.round(larghezza * scala) + 'px';
    canvas.style.height = Math.round(camera.alto * scala) + 'px';
    canvas.width = Math.round(larghezza * scala * dpr);
    canvas.height = Math.round(camera.alto * scala * dpr);
    camera.y = clamp(camera.y, 0, Math.max(0, H - camera.alto));
    strati.chiave = '';
    pannelli.chiave = '';
    if (touch && r.width > r.height && window.innerHeight <= 520) pausa();
  }
  new ResizeObserver(ridimensiona).observe(palco);

  function aggiornaColori() {
    const t = tinta();
    document.documentElement.style.setProperty('--neon', t.neon);
    document.documentElement.style.setProperty('--neon2', t.neon2);
  }

  // Strati disegnati una volta, a tavolo intero: base (fondo e pareti),
  // galleria e rampe. La risoluzione è limitata per non usare troppa memoria.
  const strati = { chiave: '', base: null, galleria: null, rampe: null, k: 1 };
  function nuovaTela(k) {
    const c = document.createElement('canvas');
    c.width = Math.round(W * k);
    c.height = Math.round(H * k);
    const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    return [c, g];
  }
  function preparaStrati() {
    const k = Math.min(scala * dpr, Math.sqrt(2.6e6 / (W * H)));
    const chiave = String(k);
    if (strati.chiave === chiave) return;
    strati.chiave = chiave;
    strati.k = k;
    const [cb, gb] = nuovaTela(k);
    T.strati.fondo(gb);
    T.strati.pareti(gb);
    const [cg, gg] = nuovaTela(k);
    T.strati.galleria(gg);
    const [cr, gr] = nuovaTela(k);
    T.strati.rampe(gr);
    strati.base = cb; strati.galleria = cg; strati.rampe = cr;
    // mini mappa: il tavolo intero in piccolo
    const mw = 120, mh = Math.round(mw * H / W);
    const cm = document.createElement('canvas');
    cm.width = mw * 2; cm.height = mh * 2;
    const gm = cm.getContext('2d');
    for (const s of [cb, cg, cr]) gm.drawImage(s, 0, 0, cm.width, cm.height);
    mini = { c: cm, w: mw, h: mh };
  }
  function strato(c) {
    const k = strati.k;
    const y0 = Math.max(0, camera.y - 20), y1 = Math.min(H, camera.y + camera.alto + 20);
    ctx.drawImage(c, 0, y0 * k, W * k, (y1 - y0) * k, 0, y0, W, y1 - y0);
  }

  // ---------------------------------------------------------------- aiuti di disegno
  const spriteGhianda = (() => {
    const c = document.createElement('canvas');
    const k = 4;
    c.width = c.height = R * 2 * k + 8;
    const g = c.getContext('2d');
    g.scale(k, k);
    const mm = R + 1;
    const gr = g.createRadialGradient(mm - 4, mm - 4, 1, mm, mm, R);
    gr.addColorStop(0, '#fff3dc');
    gr.addColorStop(0.25, '#f2b56a');
    gr.addColorStop(0.75, '#b06a2a');
    gr.addColorStop(1, '#6b3a12');
    g.fillStyle = gr;
    g.beginPath(); g.arc(mm, mm, R, 0, Math.PI * 2); g.fill();
    g.save();
    g.beginPath(); g.arc(mm, mm, R, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#6e4a24';
    g.beginPath(); g.ellipse(mm, mm - R * 0.55, R * 1.05, R * 0.62, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(40,20,5,0.55)';
    g.lineWidth = 0.6;
    for (let i = -3; i <= 3; i++) {
      g.beginPath(); g.moveTo(mm + i * 3.4 - 3, mm - R); g.lineTo(mm + i * 3.4 + 3, mm - R * 0.05); g.stroke();
      g.beginPath(); g.moveTo(mm + i * 3.4 + 3, mm - R); g.lineTo(mm + i * 3.4 - 3, mm - R * 0.05); g.stroke();
    }
    g.restore();
    g.strokeStyle = '#4a2c10';
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(mm, mm - R * 0.95); g.lineTo(mm + 1.5, mm - R - 0.8); g.stroke();
    // contorno scuro: la ghianda si stacca anche dalla terra chiara
    g.strokeStyle = 'rgba(45,22,5,0.85)';
    g.lineWidth = 1.3;
    g.beginPath(); g.arc(mm, mm, R - 0.5, 0, Math.PI * 2); g.stroke();
    return { c, k, m: mm };
  })();
  function disegnaGhianda(g, x, y, rot, s = 1, semplice = false) {
    const sp = spriteGhianda;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(s / sp.k, s / sp.k);
    g.drawImage(sp.c, -sp.m * sp.k, -sp.m * sp.k);
    g.restore();
    if (semplice) return;
    // riflesso della luce (che sta in alto al centro del tavolo): si sposta
    // un poco secondo dove sta la ghianda, come su una pallina lucida
    const lx = clamp((T.CX - x) / 320, -1, 1) * 2.6;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,255,255,0.38)';
    g.beginPath(); g.ellipse(x + (lx - 2.6) * s, y - 5 * s, 3.4 * s, 2.2 * s, -0.6 + lx * 0.15, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.beginPath(); g.ellipse(x - lx * 0.5 * s, y + 7 * s, 4 * s, 1.4 * s, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
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
  // Lampade: inserti di plastica colorata che si accendono. Come le lampadine
  // vere si accendono e si spengono con una piccola dissolvenza (stato per
  // lampada, riconosciuta dalla posizione); nel menu un'onda di luce
  // attraversa il tavolo (la "modalità attrazione" dei flipper veri).
  const lampStato = new Map();
  let dtDisegno = 1 / 60;
  function ondaAttrazione(x, y) {
    if (stato.modo !== 'demo') return false;
    const f = ((stato.tempo * 1.6 - (y + x * 0.35) / 260) % 1 + 1) % 1;
    return f < 0.07;
  }
  function lampada(g, x, y, r, colore, accesa, testo = '', forma = 'tondo', ang = 0) {
    if (y < camera.y - 60 || y > camera.y + camera.alto + 60) return;
    const chiave = x + '|' + y + '|' + testo;
    let L = lampStato.get(chiave);
    if (!L) { L = { k: accesa ? 1 : 0 }; lampStato.set(chiave, L); }
    const meta = accesa || ondaAttrazione(x, y) ? 1 : 0;
    L.k += (meta - L.k) * Math.min(1, dtDisegno * (meta ? 26 : 11));
    const k = L.k;
    accesa = k > 0.5;
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
    // spenta: plastica scura con un velo del suo colore (si vede anche sul fondo chiaro);
    // accesa: il colore pieno con il centro più chiaro (la lampadina sotto l'inserto)
    g.fillStyle = `rgba(55,32,12,${0.5 * (1 - k)})`;
    g.fill();
    g.fillStyle = hexA(colore, 0.35 + 0.65 * k);
    g.fill();
    if (k > 0.05) {
      const gl = g.createRadialGradient(0, 0, 0, 0, 0, r * (forma === 'pillola' ? 2.4 : 1.1));
      gl.addColorStop(0, `rgba(255,255,240,${0.55 * k})`);
      gl.addColorStop(1, 'rgba(255,255,240,0)');
      g.fillStyle = gl;
      g.fill();
    }
    g.lineWidth = accesa ? 2 : 1.5;
    g.strokeStyle = accesa ? '#fff8e0' : 'rgba(40,22,6,0.65)';
    g.stroke();
    if (testo) {
      g.rotate(-ang);
      g.fillStyle = accesa ? '#2a1405' : 'rgba(255,240,210,0.7)';
      g.font = `700 ${Math.round(r * (forma === 'pillola' ? 0.95 : testo.length > 1 ? 0.8 : 1.1))}px Fredoka, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(testo, 0, 1);
    }
    g.restore();
    if (k > 0.03) luce(g, x, y, r * (forma === 'pillola' ? 4.5 : 3), colore, 0.65 * k);
  }
  // Flipper: gomma color crema su un'anima di legno
  function disegnaFlipper(g, f) {
    const [tx, ty] = m.punta(f);
    const a = Math.atan2(ty - f.py, tx - f.px);
    const L = f.lungo;
    g.save();
    g.translate(f.px + 3, f.py + 5);
    g.rotate(a);
    const forma = () => {
      g.beginPath();
      g.arc(0, 0, f.r1, Math.PI / 2, Math.PI * 1.5);
      g.lineTo(L, -f.r2);
      g.arc(L, 0, f.r2, -Math.PI / 2, Math.PI / 2);
      g.closePath();
    };
    g.fillStyle = 'rgba(0,0,0,0.4)';
    forma(); g.fill();
    g.restore();
    // sfocatura di movimento: mentre batte si vede ancora dov'era un istante prima
    if (Math.abs(f.w) > 6) {
      g.save();
      g.translate(f.px, f.py);
      g.rotate(a - f.verso * Math.sign(f.w) * 0.2);
      g.globalAlpha = 0.28;
      g.fillStyle = '#f3e6c8';
      forma(); g.fill();
      g.restore();
    }
    g.save();
    g.translate(f.px, f.py);
    g.rotate(a);
    const gr = g.createLinearGradient(0, -f.r1, 0, f.r1);
    gr.addColorStop(0, '#fffaf0');
    gr.addColorStop(1, '#d9c9a8');
    g.fillStyle = gr;
    forma(); g.fill();
    g.lineWidth = 3.5;
    g.strokeStyle = stato.tiltato ? '#555' : tinta().neon2;
    forma(); g.stroke();
    g.fillStyle = '#7a4e26';
    g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e5b273';
    g.beginPath(); g.arc(-1, -1, 2, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  G.d = { luce, lampada, ghianda: disegnaGhianda, flipper: disegnaFlipper };

  function testoLuce(g, testo, x, y, size, colore) {
    g.save();
    g.font = `700 ${size}px Fredoka, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    // alone a due passate (niente shadowBlur: sui telefoni costava un fotogramma intero)
    g.strokeStyle = hexA(colore, 0.22);
    g.lineWidth = size * 0.6;
    g.strokeText(testo, x, y);
    g.strokeStyle = hexA(colore, 0.5);
    g.lineWidth = size * 0.32;
    g.strokeText(testo, x, y);
    g.lineWidth = size * 0.16;
    g.strokeStyle = colore;
    g.strokeText(testo, x, y);
    g.fillStyle = '#fff';
    g.fillText(testo, x, y);
    g.restore();
  }
  function adatta(g, testo, size, max) {
    g.font = `700 ${size}px Fredoka, sans-serif`;
    const w = g.measureText(testo).width;
    return w > max ? size * max / w : size;
  }
  const lampeggia = (vel = 4) => Math.sin(stato.tempo * vel * Math.PI) > 0;

  // ---------------------------------------------------------------- disegno del fotogramma
  function disegnaPalle(g, filtro) {
    const t = tinta();
    for (const p of stato.palle) {
      if (!filtro(p)) continue;
      if (p.stato === 'ferma') luce(g, p.x, p.y, 40, t.neon2, 0.6 + 0.4 * Math.sin(stato.tempo * 12));
      const alta = p.stato === 'percorso' || p.piano === 1;
      const s = p.stato === 'percorso' ? 1 + 0.18 * p.per.alto : 1;
      // sfocatura di movimento: a velocità alta la ghianda lascia due o tre
      // copie sbiadite dietro di sé (al posto della scia al neon)
      if (p.stato === 'campo') {
        const v = Math.hypot(p.vx, p.vy);
        if (v > 1100) {
          const n = v > 2200 ? 3 : 2;
          const passo = 0.014 * Math.min(1.4, v / 2200);
          for (let i = n; i >= 1; i--) {
            g.globalAlpha = 0.26 * (1 - i / (n + 1));
            disegnaGhianda(g, p.x - p.vx * passo * i, p.y - p.vy * passo * i, p.rot, s, true);
          }
          g.globalAlpha = 1;
        }
      }
      // ombra: più lontana e sfumata quando la ghianda è in alto (rampe, galleria)
      g.fillStyle = alta ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.35)';
      g.beginPath(); g.ellipse(p.x + (alta ? 9 : 3), p.y + (alta ? 12 : 4), R * (alta ? 1.15 : 1), R * (alta ? 1 : 0.9), 0, 0, Math.PI * 2); g.fill();
      disegnaGhianda(g, p.x, p.y + (p.stato === 'canna' ? p.giu || 0 : 0), p.rot, s);
    }
  }
  function disegnaLancio(g) {
    const L = stato.lancio;
    const tira = L.palla ? L.carica * 46 : 0;
    const x = T.lancio.x;
    const yS = T.lancio.yStantuffo;
    g.save();
    // molla di metallo (si comprime quando si carica)
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 3;
    g.beginPath();
    const y0 = yS + tira, y1 = H;
    for (let i = 0; i <= 8; i++) g.lineTo(x + 2 + (i % 2 ? 10 : -10), y0 + 2 + (y1 - y0) * i / 8);
    g.stroke();
    g.strokeStyle = '#d7d7d7';
    g.lineWidth = 2.4;
    g.beginPath();
    for (let i = 0; i <= 8; i++) g.lineTo(x + (i % 2 ? 10 : -10), y0 + (y1 - y0) * i / 8);
    g.stroke();
    // il piattello dello stantuffo (gomma)
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(x - 13, y0, 28, 7);
    g.fillStyle = tinta().neon2;
    g.fillRect(x - 14, y0 - 2, 28, 7);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x - 14, y0 - 2, 28, 2);
    if (L.palla && L.carica > 0) {
      g.fillStyle = hexA(tinta().neon2, 0.3);
      g.fillRect(x - 14, yS - 4 - 300 * L.carica, 28, 300 * L.carica);
    }
    g.restore();
    if (L.palla) L.palla.giu = tira;
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
      g.strokeStyle = 'rgba(25,12,3,0.85)';
      g.strokeText(s.testo, s.x, s.y);
      g.fillStyle = s.colore;
      g.fillText(s.testo, s.x, s.y);
    }
    g.restore();
  }
  // Messaggio grande (in coordinate dello schermo, sul tavolo)
  function disegnaMessaggio(g) {
    const mm = stato.messaggi[0];
    if (!mm) return;
    const t = tinta();
    const entra = Math.min(1, mm.t / 0.18);
    const esce = Math.min(1, (mm.durata - mm.t) / 0.3);
    const k = Math.max(0, Math.min(entra, esce));
    const s = 0.6 + 0.4 * (1 - Math.pow(1 - entra, 3)) + (mm.t < 0.25 ? Math.sin(mm.t / 0.25 * Math.PI) * 0.12 : 0);
    const y = camera.alto * 0.36;
    g.save();
    g.globalAlpha = k;
    g.fillStyle = 'rgba(25,12,3,0.62)';
    g.beginPath();
    if (g.roundRect) g.roundRect(60, y - 38, 480, mm.sotto ? 102 : 74, 18); else g.rect(60, y - 38, 480, mm.sotto ? 102 : 74);
    g.fill();
    g.translate(T.CX, y);
    g.scale(s, s);
    testoLuce(g, mm.testo, 0, 0, adatta(g, mm.testo, 46, 440), mm.colore || t.neon2);
    if (mm.sotto) {
      g.font = `600 ${adatta(g, mm.sotto, 19, 450)}px Fredoka, sans-serif`;
      g.textAlign = 'center';
      g.fillStyle = t.luce;
      g.fillText(mm.sotto, 0, 42);
    }
    g.restore();
  }
  function disegnaBonus(g) {
    const b = stato.bonus;
    if (!b || stato.palle.length) return;
    const t = tinta();
    const y0 = camera.alto * 0.5 - 200;
    g.save();
    g.fillStyle = 'rgba(25,12,3,0.85)';
    g.fillRect(70, y0, 460, 400);
    g.strokeStyle = t.neon;
    g.lineWidth = 2;
    g.strokeRect(70, y0, 460, 400);
    testoLuce(g, b.tilt ? 'TILT' : 'Bonus', T.CX, y0 + 40, 38, b.tilt ? '#ff4a5a' : t.neon2);
    g.font = '600 18px Fredoka, sans-serif';
    g.textBaseline = 'middle';
    b.righe.slice(0, 10).forEach((r, i) => {
      g.fillStyle = '#fff';
      g.textAlign = 'left';
      g.fillText(`${r[0]} × ${r[1]}`, 110, y0 + 84 + i * 24);
      g.textAlign = 'right';
      g.fillText(numero(r[1] * r[2]), 490, y0 + 84 + i * 24);
    });
    g.textAlign = 'center';
    g.fillStyle = t.neon;
    g.font = '700 22px Fredoka, sans-serif';
    g.fillText(`× ${b.molt} = ${numero(b.contato)}`, T.CX, y0 + 370);
    g.restore();
  }
  // Barra dell'avventura in cima al tavolo quando mancano i pannelli
  function disegnaInfoTavolo(g) {
    const a = stato.avventura;
    if (!a) return;
    const t = tinta();
    g.save();
    g.fillStyle = 'rgba(25,12,3,0.7)';
    g.fillRect(110, 8, 380, 30);
    const k = a.id === T.FINALE.id ? 1 : clamp(a.t / a.durata, 0, 1);
    g.fillStyle = hexA(t.neon, 0.6);
    g.fillRect(110, 34, 380 * k, 4);
    g.font = '700 16px Fredoka, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(`${a.nome}${a.id !== T.FINALE.id ? ' · ' + Math.ceil(a.t) + ' s' : ''}`, 300, 22);
    g.restore();
  }
  // Mini mappa: tavolo intero, ghiande e finestra inquadrata
  function disegnaMiniMappa(g, x, y, w) {
    if (!mini) return;
    const h = w * H / W;
    const k = w / W;
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(x - 3, y - 3, w + 6, h + 6);
    g.globalAlpha = 0.9;
    g.drawImage(mini.c, x, y, w, h);
    g.globalAlpha = 1;
    if (camera.alto < H) {
      g.strokeStyle = '#7fd8ff';
      g.lineWidth = 2;
      g.strokeRect(x + 1, y + camera.y * k, w - 2, camera.alto * k);
    }
    for (const p of stato.palle) {
      if (p.stato === 'percorso' && p.per.sotto) continue;
      g.fillStyle = '#ffd27a';
      g.beginPath(); g.arc(x + p.x * k, y + p.y * k, Math.max(2.5, R * k * 1.4), 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2a1405'; g.lineWidth = 1; g.stroke();
    }
    g.restore();
  }

  // Flasher e illuminazione generale, sopra il campo (in coordinate del tavolo)
  function disegnaLuci(g) {
    for (const f of stato.flasher) {
      const a = Math.pow(1 - f.t / f.durata, 1.6) * f.k;
      luce(g, f.x, f.y, 190, f.colore, a * 0.9);
      luce(g, f.x, f.y, 70, '#ffffff', a * 0.6);
    }
    if (stato.multiball && T.forma) {
      // nel multiball l'illuminazione generale pulsa
      g.save();
      g.globalCompositeOperation = 'lighter';
      T.forma(g);
      g.fillStyle = hexA(tinta().luce, 0.04 + 0.04 * Math.sin(stato.tempo * 9));
      g.fill();
      g.restore();
    }
    if (stato.gi < 0.995 && T.forma) {
      g.save();
      T.forma(g);
      g.fillStyle = `rgba(8,4,0,${(1 - stato.gi) * 0.72})`;
      g.fill();
      g.restore();
    }
  }
  // Il vetro: un riflesso leggero e fisso sullo schermo, come la luce della
  // stanza sul vetro del flipper
  function disegnaVetro(g, VH) {
    const gr = g.createLinearGradient(0, 0, W * 0.9, VH * 0.5);
    gr.addColorStop(0, 'rgba(255,255,255,0.075)');
    gr.addColorStop(0.32, 'rgba(255,255,255,0.03)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, VH);
  }

  let ultimaOra = 0;
  function disegna(ora) {
    preparaStrati();
    dtDisegno = clamp(ora - ultimaOra, 0.001, 0.05);
    ultimaOra = ora;
    const VH = camera.alto;
    ctx.setTransform(scala * dpr, 0, 0, scala * dpr, 0, 0);
    ctx.fillStyle = T.colori.fondo;
    ctx.fillRect(0, 0, larghezza, VH);
    if (lato) disegnaPannelli();
    ctx.save();
    ctx.beginPath(); ctx.rect(lato, 0, W, VH); ctx.clip();
    ctx.translate(lato, 0);
    ctx.save();
    if (stato.scossa > 0) {
      const k = stato.scossa * 22;
      ctx.translate(casuale(-k, k), casuale(-k, k));
    }
    ctx.translate(0, -camera.y);
    strato(strati.base);
    T.disegnaPavimento(ctx, ora);
    T.disegnaCampo(ctx, ora);
    disegnaLancio(ctx);
    disegnaPalle(ctx, (p) => p.piano === 0 && (p.stato === 'campo' || p.stato === 'canna' || p.stato === 'ferma'));
    strato(strati.galleria);
    T.disegnaSopraGalleria(ctx, ora);
    disegnaPalle(ctx, (p) => p.piano === 1 && (p.stato === 'campo' || p.stato === 'ferma'));
    strato(strati.rampe);
    T.disegnaSopra(ctx, ora);
    disegnaPalle(ctx, (p) => p.stato === 'percorso' && !p.per.sotto);
    // ghianda nel tunnel: si vede solo un alone che corre sotto terra
    for (const p of stato.palle) if (p.stato === 'percorso' && p.per.sotto) luce(ctx, p.x, p.y, 26, tinta().neon2, 0.5);
    disegnaLuci(ctx);
    disegnaParticelle(ctx);
    disegnaScritte(ctx);
    ctx.restore();
    if (T.colori.vetro !== false) disegnaVetro(ctx, VH);
    if (!lato) {
      disegnaInfoTavolo(ctx);
      if (VH < H) disegnaMiniMappa(ctx, W - 50, 46, 44);
    }
    disegnaMessaggio(ctx);
    if (stato.fase === 'bonus') disegnaBonus(ctx);
    if (stato.flash > 0) {
      ctx.fillStyle = hexA('#ffffff', stato.flash * 0.22);
      ctx.fillRect(0, 0, W, VH);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- pannelli laterali
  const pannelli = { chiave: '', tele: null, conta: 0 };
  function disegnaPannelli() {
    const VH = camera.alto;
    const chiave = lato + '|' + scala + '|' + dpr + '|' + VH;
    if (pannelli.chiave !== chiave) {
      pannelli.chiave = chiave;
      pannelli.tele = [0, 1].map(() => {
        const c = document.createElement('canvas');
        c.width = Math.round(lato * scala * dpr);
        c.height = Math.round(VH * scala * dpr);
        return c;
      });
      pannelli.conta = 0;
    }
    if (pannelli.conta++ % 3 === 0) {
      pannelli.tele.forEach((c, i) => {
        const g = c.getContext('2d');
        g.setTransform(scala * dpr, 0, 0, scala * dpr, 0, 0);
        if (i === 0) disegnaDisplay(g, lato, VH);
        else disegnaPannelloTino(g, lato, VH);
      });
    }
    ctx.drawImage(pannelli.tele[0], 0, 0, lato, VH);
    ctx.drawImage(pannelli.tele[1], lato + W, 0, lato, VH);
    // la mini mappa si ridisegna a ogni fotogramma
    const mw = Math.min(110, lato - 60);
    const mh = mw * H / W;
    disegnaMiniMappa(ctx, (lato - mw) / 2, VH - mh - 18, mw);
  }
  function sfondoPannello(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, T.colori.pannello[0]); gr.addColorStop(1, T.colori.pannello[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 2;
    for (let y = 40; y < h; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }
  // Display a matrice di punti (come il DMD dei flipper veri): il testo si
  // scrive su una tela piccola, si leggono i pixel e si accende un puntino
  // arancione per ognuno. Ogni schermata si prepara una volta (cache per testo).
  // 128 × 32 punti come i DMD veri: in alto, piccoli, la palla e il bonus;
  // sotto, grande, il punteggio (o il messaggio del momento).
  const DMD = { cols: 128, righe: 32, cache: new Map() };
  function schermataDMD(sx, dx, grande, w, h, colore) {
    const chiave = [sx, dx, grande, w, h, colore].join('|');
    let c = DMD.cache.get(chiave);
    if (c) return c;
    if (DMD.cache.size > 30) DMD.cache.clear();
    const piccola = document.createElement('canvas');
    piccola.width = DMD.cols; piccola.height = DMD.righe;
    const gp = piccola.getContext('2d');
    gp.fillStyle = '#000'; gp.fillRect(0, 0, DMD.cols, DMD.righe);
    gp.fillStyle = '#fff'; gp.textBaseline = 'alphabetic';
    gp.font = '700 8px Arial, Helvetica, sans-serif';
    gp.textAlign = 'left'; gp.fillText(sx, 1, 8);
    gp.textAlign = 'right'; gp.fillText(dx, DMD.cols - 1, 8);
    let size = 19;
    gp.font = `900 ${size}px Arial, Helvetica, sans-serif`;
    const ww = gp.measureText(grande).width;
    if (ww > DMD.cols - 2) { size = Math.max(8, Math.floor(size * (DMD.cols - 2) / ww)); gp.font = `900 ${size}px Arial, Helvetica, sans-serif`; }
    gp.textAlign = 'center';
    gp.fillText(grande, DMD.cols / 2, 21 + size * 0.36);
    const dati = gp.getImageData(0, 0, DMD.cols, DMD.righe).data;
    const k = Math.min(3, Math.ceil(scala * dpr));
    c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    const g = c.getContext('2d');
    g.scale(k, k);
    const cw = w / DMD.cols, ch = h / DMD.righe;
    g.fillStyle = hexA(colore, 0.13);
    for (let j = 0; j < DMD.righe; j++) for (let i = 0; i < DMD.cols; i++) g.fillRect((i + 0.2) * cw, (j + 0.2) * ch, cw * 0.6, ch * 0.6);
    for (let j = 0; j < DMD.righe; j++) {
      for (let i = 0; i < DMD.cols; i++) {
        const v = dati[(j * DMD.cols + i) * 4] / 255;
        if (v < 0.3) continue;
        g.fillStyle = hexA(colore, 0.6 + 0.4 * v);
        g.fillRect((i + 0.08) * cw, (j + 0.08) * ch, cw * 0.84, ch * 0.84);
      }
    }
    DMD.cache.set(chiave, c);
    return c;
  }
  function disegnaDisplay(g, w, h) {
    const t = tinta();
    sfondoPannello(g, w, h);
    g.save();
    // il display: cornice scura, vetro e puntini arancioni
    const dx = 12, dy = 14, dw = w - 24, dh = 114;
    g.fillStyle = '#1a1008';
    g.beginPath(); if (g.roundRect) g.roundRect(dx - 4, dy - 4, dw + 8, dh + 8, 8); else g.rect(dx - 4, dy - 4, dw + 8, dh + 8); g.fill();
    g.fillStyle = '#0a0503';
    g.fillRect(dx, dy, dw, dh);
    const mm = stato.messaggi[0];
    const info = stato.moltT > 0 ? `CAMPO x${stato.moltCampo}` : stato.combo.t > 0 && stato.combo.n > 1 ? `COMBO x${stato.combo.n}` : `BONUS x${stato.bonusMolt}`;
    const gioco = stato.modo === 'gioco';
    const grande = gioco ? (mm && mm.t < mm.durata - 0.4 ? mm.testo.toUpperCase() : numero(stato.punti)) : numero(record());
    g.drawImage(schermataDMD(gioco ? `PALLA ${Math.min(stato.palla, stato.palleTotali)}/${stato.palleTotali}` : 'RECORD', gioco ? info : 'TINO FLIPPER', grande, dw - 8, dh - 8, T.colori.display || '#ff9a1e'), dx + 4, dy + 4, dw - 8, dh - 8);
    // riflesso sul vetro del display
    const gv = g.createLinearGradient(dx, dy, dx + dw * 0.6, dy + dh);
    gv.addColorStop(0, 'rgba(255,255,255,0.1)'); gv.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = gv;
    g.fillRect(dx, dy, dw, dh);
    g.strokeStyle = hexA(t.neon, 0.6); g.lineWidth = 1.5;
    g.strokeRect(dx, dy, dw, dh);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // avventura
    let y = 156;
    const a = stato.avventura;
    g.textAlign = 'left';
    const riga = (testo, colore = '#fff', size = 15) => {
      g.font = `600 ${size}px Fredoka, sans-serif`;
      g.fillStyle = colore;
      g.fillText(testo, 20, y);
      y += size + 9;
    };
    if (a) {
      riga('AVVENTURA', hexA('#ffffff', 0.55), 12);
      riga(a.nome, a.tinta, 20);
      if (a.id !== T.FINALE.id) {
        g.fillStyle = 'rgba(255,255,255,0.15)';
        g.fillRect(20, y - 6, w - 40, 6);
        g.fillStyle = a.tinta;
        g.fillRect(20, y - 6, (w - 40) * clamp(a.t / a.durata, 0, 1), 6);
        y += 12;
      }
      g.font = '500 13px Fredoka, sans-serif';
      g.fillStyle = hexA('#ffffff', 0.8);
      y = testoACapo(g, a.testo, 20, y, w - 40, 17) + 12;
    } else {
      const S = T.S;
      riga('PROSSIMA AVVENTURA', hexA('#ffffff', 0.55), 12);
      const prossima = T.AVVENTURE.find((x) => !stato.avventureFatte.includes(x.id)) || T.FINALE;
      riga(prossima.nome, prossima.tinta, 18);
      riga(S.avventuraPronta ? 'Pronta: tira nella buca!' : `Agente: ${S.agente ? S.agente.colpi : 0} colpi`, hexA('#ffffff', 0.75), 13);
      y += 4;
    }
    if (stato.multiball) {
      riga('MULTIBALL', '#fff27a', 18);
      riga(`Jackpot ${numero(stato.jackpot.valore)}`, hexA('#ffffff', 0.8), 13);
    }
    // obiettivi
    const S = T.S;
    if (S.dispensa) {
      y += 4;
      riga('DISPENSA', hexA('#ffffff', 0.55), 12);
      riga(`${'● '.repeat(S.dispensa.bloccate)}${'○ '.repeat(3 - S.dispensa.bloccate)}${S.dispensa.aperta ? ' aperta!' : ''}`, '#ffd27a', 15);
      riga('CHIAVI', hexA('#ffffff', 0.55), 12);
      riga(`${S.chiavi} di ${S.chiaviServono}${S.extraAccesa ? ' · palla extra!' : ''}`, '#ffe27a', 15);
      riga('AVVENTURE', hexA('#ffffff', 0.55), 12);
      for (const av of T.AVVENTURE) riga(`${stato.avventureFatte.includes(av.id) ? '✓' : '·'} ${av.nome}`, stato.avventureFatte.includes(av.id) ? av.tinta : hexA('#ffffff', 0.45), 13);
    }
    g.restore();
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
    if (riga) { g.fillText(riga, x, y); y += alto; }
    return y;
  }
  function disegnaPannelloTino(g, w, h) {
    const t = tinta();
    sfondoPannello(g, w, h);
    g.save();
    const base = Math.min(h - 260, 560);
    luce(g, w / 2, base - 120, 200, t.neon, 0.25);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.ellipse(w / 2, base, 100, 20, 0, 0, Math.PI * 2); g.fill();
    const tino = stato.tino;
    const f = stato.fase === 'finita' ? 'ko' : tino.faccia;
    const img = immagini[f] || immagini.normale;
    if (pronta(img)) {
      const hh = f === 'ko' ? 140 : 240;
      const ww = hh * img.naturalWidth / img.naturalHeight;
      g.save();
      g.translate(w / 2, base + 4);
      if (tino.salto > 0) {
        const s = Math.sin(tino.salto * Math.PI * 2.5);
        g.translate(0, -Math.abs(s) * 30);
        g.scale(1 + s * 0.05, 1 - s * 0.05);
      } else if (f === 'ferito') {
        g.translate(Math.sin(stato.tempo * 50) * 3, 0);
      } else {
        const p = camera.bersaglio;
        const k = p ? (p.x - T.CX) / 300 : Math.sin(stato.tempo);
        g.rotate(k * 0.06);
      }
      g.drawImage(img, -ww / 2, -hh, ww, hh);
      g.restore();
    }
    const frasi = {
      normale: T.testi.frasi.normale(),
      arrabbiato: stato.tilt >= TILT.avviso ? 'Piano col tavolo!' : 'Uffa, ghianda persa!',
      ferito: stato.tiltato ? 'Ahia, il tilt!' : 'Ahi, corsia esterna!',
      ko: 'Partita finita!',
    };
    const frase = tino.salto > 0 ? 'Evviva!' : frasi[f] || '';
    if (frase && stato.modo === 'gioco') {
      g.font = '700 17px Fredoka, sans-serif';
      const fw = Math.min(w - 24, g.measureText(frase).width + 30);
      const fy = base - 300;
      g.fillStyle = '#fff8e8';
      g.beginPath();
      if (g.roundRect) g.roundRect(w / 2 - fw / 2, fy, fw, 44, 16); else g.rect(w / 2 - fw / 2, fy, fw, 44);
      g.fill();
      g.beginPath(); g.moveTo(w / 2 - 8, fy + 42); g.lineTo(w / 2 + 6, fy + 60); g.lineTo(w / 2 + 12, fy + 42); g.fill();
      g.fillStyle = '#3b2210';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(frase, w / 2, fy + 23);
    }
    g.textAlign = 'center';
    g.font = '600 14px Fredoka, sans-serif';
    g.fillStyle = hexA('#ffffff', 0.65);
    const righe = touch
      ? ['Tocca a sinistra e a destra', 'per i flipper', 'Striscia in su: scossone']
      : ['← → o Z /  flipper', '↓ o Spazio  lancio', '↑ scossone · V vista intera', 'P pausa · M suoni · N musica'];
    righe.forEach((r, i) => g.fillText(r, w / 2, base + 40 + i * 21));
    const gi = immagini.gino;
    if (pronta(gi) && h - base > 200) {
      const hh = 70, ww = hh * gi.naturalWidth / gi.naturalHeight;
      const G2 = T.oggetti.GINO;
      g.save();
      g.translate(w / 2, h - 60);
      const s = G2.salto > 0 ? Math.abs(Math.sin(G2.salto * Math.PI * 3)) * 20 : 0;
      g.translate(0, -s);
      g.rotate(G2.trema > 0 ? Math.sin(stato.tempo * 60) * 0.1 : Math.sin(stato.tempo * 1.5) * 0.08);
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
        <p>Tocca la <b>metà sinistra</b> o la <b>metà destra</b> dello schermo: si muovono tutti i flipper di quel lato (anche quelli a metà tavolo e nella galleria).</p>
        <p>Con la ghianda nel corridoio: <b>tieni premuto</b> e lascia per lanciarla. Una <b>strisciata veloce in su</b> scuote il tavolo (non troppo: tilt!).</p>
        <p>La mappa in alto a destra mostra tutto il tavolo.</p>
      </div>`;
    }
    return `<div class="comandi">
      <p>Flipper: <kbd>←</kbd> <kbd>→</kbd> (oppure <kbd>Z</kbd> <kbd>/</kbd>, <kbd>A</kbd> <kbd>D</kbd>, i due <kbd>Maiusc</kbd>), o tasto sinistro e destro del mouse. Ogni tasto muove tutti i flipper del suo lato.</p>
      <p>Lancio: tieni premuto <kbd>↓</kbd> o <kbd>Spazio</kbd> e lascia. Scossone: <kbd>↑</kbd> (non troppo: tilt!).</p>
      <p><kbd>V</kbd> tavolo intero · <kbd>P</kbd> pausa · <kbd>M</kbd> suoni · <kbd>N</kbd> musica</p>
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
      <p class="sotto">${T.nome}</p>
      <p>${T.sotto}: un tavolo alto due schermi, con quattro flipper, rampe, tunnel, il giro della morte e tanti meccanismi da scoprire.</p>
      <div class="scelte">
        <button class="bottone" data-azione="gioca" data-primo>Gioca</button>
        <a class="bottone secondario" href="neon/index.html">Notte al neon (tavolo bonus)</a>
      </div>
      ${classifica.length ? '<h3>I migliori punteggi</h3>' + tabellaClassifica() : ''}
      <h3>Come si gioca</h3>
      ${T.testi.guida}
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
      ${T.testi.guida}
      ${testoComandi()}
    </div>`;
  }
  function pannelloFine() {
    const nuovo = ultimaPosizione === 0;
    return `<div class="riquadro">
      <div class="ritratti">${img('ko')}${img('gino', 'caduto')}</div>
      <h2>${nuovo ? 'Nuovo record!' : 'Partita finita'}</h2>
      <p><b>${numero(stato.punti)}</b> punti</p>
      ${stato.match ? `<p class="match ${stato.match.vinto ? 'vinto' : ''}">Match <b>${stato.match.cifre}</b> · <b>${stato.match.estratte}</b>${stato.match.vinto ? ' · Match! Palla extra alla prossima partita' : ''}</p>` : ''}
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
  const btnVista = $('#btn-vista');
  if (btnVista) btnVista.addEventListener('click', (e) => { e.currentTarget.blur(); cambiaVista(); });

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
  document.body.classList.add('tavolo-' + T.id);
  document.body.classList.toggle('muto', muto);
  document.body.classList.toggle('senza-musica', A.musica.spenta);
  stato.vistaIntera = leggi('vista-intera', false);
  ridimensiona();
  vaiAlMenu();

  let ultimo = performance.now();
  function ciclo(ora) {
    const dt = clamp((ora - ultimo) / 1000, 0, 0.05);
    ultimo = ora;
    if (!stato.test) aggiorna(dt);
    disegna(ora / 1000);
    // rotolamento: la ghianda più veloce in campo (sulle rampe suona più grave)
    let vel = 0, rampa = false;
    if (stato.fase === 'gioco' && stato.modo === 'gioco') {
      for (const p of stato.palle) {
        if (p.stato === 'campo') vel = Math.max(vel, Math.hypot(p.vx, p.vy));
        else if (p.stato === 'percorso' && !p.per.sotto && p.v > vel) { vel = p.v; rampa = true; }
      }
    }
    A.rotola(vel, rampa);
    requestAnimationFrame(ciclo);
  }
  requestAnimationFrame(ciclo);

  // per le prove automatiche
  window.tinoFlipper = {
    stato, tavolo: T, mondo: m, camera, ia, IA,
    iniziaPartita, aggiorna, lancia, premiFlipper, premiLancio, scossone, pilotaIA, provaColpo,
    avviaAvventura, avviaMultiball, nuovaPalla, avviaPercorso, cambiaVista,
    orologio: () => orologio,
  };
})();
