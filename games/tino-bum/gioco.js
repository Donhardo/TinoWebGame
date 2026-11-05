/*
 * Tino Bum! — artiglieria a turni.
 *
 * Ogni giocatore guida un mezzo (catapulta, fionda, mortaio...) su una mappa
 * di isole generata a caso. Al proprio turno ci si sposta un po', si sceglie
 * l'alzo e si tiene premuto per la potenza, tenendo conto del vento.
 * Il turno successivo tocca a chi ha accumulato meno "ritardo": i colpi forti
 * fanno aspettare di più.
 *
 * Coordinate: mondo 1600 × 900 (y verso il basso), schermo logico 960 × 540.
 * La fisica va a passi fissi (PASSO) ed è la stessa che usa l'IA per provare
 * i tiri, così il computer "vede" esattamente dove arriverà un colpo.
 */
(() => {
  'use strict';
  const TB = window.TinoBum;
  const { W, H, ACQUA } = TB.MONDO;
  const MEZZI = TB.MEZZI;

  // ---------------------------------------------------------------- tabelle
  const FISICA = {
    gravita: 500,          // px/s²
    vento: 13,             // accelerazione per ogni punto di vento
    passo: 1 / 120,        // passo fisso della simulazione
    corpoY: 28,            // centro del corpo sopra i piedi
    corpoR: 26,            // raggio del corpo (per colpi e danni)
    cammino: 55,           // px/s camminando
    spinta: 170,           // spinta massima delle esplosioni
  };
  const TURNO = {
    tempo: 30,             // secondi per un turno umano
    carica: 0.55,          // potenza al secondo tenendo premuto
    angoloLento: 14,       // gradi/s appena si tiene premuto
    angoloVeloce: 40,      // gradi/s dopo un attimo
    speciale: 0.25,        // carica dello speciale a ogni turno
    specialeDanno: 0.6,    // carica in più per ogni 1000 di danno subito
    ritardoScaduto: 120,   // ritardo se il tempo finisce senza tirare
    ritardoPasso: 0.12,    // ritardo per ogni pixel percorso
  };
  const VITA = 1000;
  // IA: errore su alzo (gradi) e potenza, che cala col livello; a ogni tiro
  // contro lo stesso bersaglio fermo l'errore si riduce (aggiusta la mira)
  const IA = {
    erroreAngolo: [3.2, 0.86, 0.8],     // [base, fattore per livello, minimo]
    errorePotenza: [0.07, 0.86, 0.017],
    aggiusta: 0.6,                       // fattore per ogni tiro successivo
    scalaMinima: [0.75, 0.05, 0.3],      // [base, calo per livello, minimo]
    pensa: 0.8,                          // secondi "a pensare"
    velAngolo: 45,
  };
  const ventoMassimo = (liv) => Math.min(10, 2 + liv);

  // ---------------------------------------------------------------- immagini
  const BASE = '../../assets/';
  const caricaImg = (p) => { const i = new Image(); i.src = BASE + p; return i; };
  const IMG = {
    normale: caricaImg('tino/tino-normale.png'),
    arrabbiato: caricaImg('tino/tino-arrabbiato.png'),
    ferito: caricaImg('tino/tino-ferito.png'),
    ko: caricaImg('tino/tino-ko.png'),
    gino: caricaImg('gino/gino.png'),
  };
  // fondale dipinto (se non si carica, si usa quello disegnato nel codice)
  const FONDALE = new Image();
  FONDALE.src = 'fondali/prato.png';
  const fondaleDipinto = () => FONDALE.complete && FONDALE.naturalWidth > 0;
  const PERSONAGGI = {
    tino: { nome: 'Tino', colore: '#ffd59a', altezza: 58 },
    gino: { nome: 'Gino', colore: '#c9e6ff', altezza: 46 },
  };

  // ---------------------------------------------------------------- DOM
  const $ = (s) => document.querySelector(s);
  const canvas = $('#campo');
  let ctx = canvas.getContext('2d');
  const ctxPrincipale = ctx;
  const palco = $('#palco');
  const schermo = $('#schermo');
  const pannello = $('#pannello');
  const plancia = $('#plancia');
  const elTurno = $('#turno');

  const VW = 960, VH = 540;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const gauss = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  document.body.classList.toggle('touch', touch);

  function leggi(k, d) {
    try { const v = localStorage.getItem('tino-bum:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
  }
  function scrivi(k, v) {
    try { localStorage.setItem('tino-bum:' + k, JSON.stringify(v)); } catch (e) { /* niente */ }
  }

  // ---------------------------------------------------------------- audio
  let audio = null;
  let muto = leggi('muto', false);
  function contesto() {
    if (muto || stato.modo === 'demo') return null;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      return audio;
    } catch (e) { return null; }
  }
  function suono(freq, durata = 0.1, tipo = 'square', volume = 0.06, freqFine = null, ritardo = 0) {
    const a = contesto();
    if (!a) return;
    const t = a.currentTime + ritardo;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    if (freqFine) o.frequency.exponentialRampToValueAtTime(freqFine, t + durata);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + durata + 0.02);
  }
  let bufferRumore = null;
  function rumore(durata, volume, filtro, filtroFine) {
    const a = contesto();
    if (!a) return;
    if (!bufferRumore) {
      bufferRumore = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = bufferRumore.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime;
    const s = a.createBufferSource();
    s.buffer = bufferRumore;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filtro, t);
    f.frequency.exponentialRampToValueAtTime(filtroFine, t + durata);
    const g = a.createGain();
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
    s.connect(f).connect(g).connect(a.destination);
    s.start(t);
    s.stop(t + durata + 0.05);
  }
  const suoni = {
    tiro: (p) => { suono(180 + p * 220, 0.18, 'triangle', 0.07, 600 + p * 500); rumore(0.15, 0.08, 2500, 400); },
    bum: (k) => { rumore(0.5 + k * 0.4, 0.22 + k * 0.1, 1800, 80); suono(90, 0.35, 'sine', 0.12, 40); },
    rimbalzo: () => suono(300, 0.12, 'triangle', 0.07, 700),
    splash: () => { rumore(0.45, 0.12, 3000, 300); suono(500, 0.2, 'sine', 0.04, 150); },
    ahi: () => suono(700, 0.15, 'square', 0.035, 380),
    turno: () => { suono(660, 0.08, 'triangle', 0.06); suono(880, 0.12, 'triangle', 0.06, null, 0.09); },
    divide: () => suono(1200, 0.08, 'square', 0.04, 500),
    clic: () => suono(900, 0.03, 'square', 0.025),
    vittoria: () => [523, 659, 784, 1046].forEach((f, i) => suono(f, 0.18, 'triangle', 0.08, null, i * 0.12)),
    sconfitta: () => [392, 330, 262, 196].forEach((f, i) => suono(f, 0.22, 'sawtooth', 0.045, null, i * 0.15)),
  };

  // ---------------------------------------------------------------- stato
  const stato = {
    fase: 'menu',           // menu, mira, volo, assesta, fine, pausa
    faseInPausa: null,
    modo: 'demo',           // demo, cpu, due
    livello: 1,
    terreno: null,
    fondale: null,
    giocatori: [],
    attivo: null,
    vento: 0,
    tempoTurno: 0,
    proiettili: [],
    particelle: [],
    messaggio: null,
    scossa: 0,
    camera: { x: 0, y: 0, z: 0.6 },
    zoomUtente: 1,
    numeroTurno: 0,
    attesa: 0,
    accumulo: 0,
    tempo: 0,
    test: false,
    vincitore: null,
  };
  let record = leggi('record', 1);

  function nuovoGiocatore(o) {
    const M = MEZZI[o.mezzo];
    return {
      id: o.id, personaggio: o.personaggio, nome: o.nome || PERSONAGGI[o.personaggio].nome,
      mezzo: o.mezzo, cpu: !!o.cpu, liv: o.liv || 1, squadra: o.squadra,
      x: 0, y: 0, vx: 0, vy: 0, aTerra: true, verso: 1, inclinazione: 0,
      angolo: Math.round((M.angoli[0] + M.angoli[1]) / 2), potenza: 0, carica: false,
      ultimaPotenza: null, ultimoAngolo: null,
      vita: VITA, vitaMostrata: VITA, ritardo: 0, speciale: 0, colpo: 0,
      energia: M.energia, mosso: 0, passi: 0, morto: false, annegato: false,
      colpitoT: 0, feritoT: 0, festaT: 0, tremaT: 0, caduta: 0,
      ultimoTurno: 0, ia: null, memoria: { bersaglio: null, x: 0, colpi: 0 },
      tieniAngolo: 0,
    };
  }

  // ---------------------------------------------------------------- mondo
  function solido(x, y) {
    x = x | 0; y = y | 0;
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    return stato.terreno.mat[y * W + x] !== 0;
  }
  // il corpo non può entrare nel terreno: piedi stretti, corpo più largo
  function corpoBloccato(x, y) {
    for (const dx of [-4, 0, 4]) if (solido(x + dx, y)) return true;
    for (const dy of [9, 20, 32, 44]) for (const dx of [-13, -6, 0, 6, 13]) if (solido(x + dx, y - dy)) return true;
    return false;
  }
  function appoggiato(x, y) {
    for (const dx of [-11, -5, 0, 5, 11]) if (solido(x + dx, y + 1)) return true;
    return false;
  }
  function passoCammino(x, y, dir) {
    const nx = x + dir;
    if (nx < 16 || nx > W - 16) return null;
    for (let su = 0; su <= 7; su++) {
      if (!corpoBloccato(nx, y - su)) {
        let ny = y - su;
        let k = 0;
        while (k < 8 && !appoggiato(nx, ny)) { ny++; k++; }
        return { x: nx, y: ny, cade: !appoggiato(nx, ny) };
      }
    }
    return null;
  }
  function inclinazioneSuolo(x, y) {
    const quota = (xx) => {
      for (let d = -14; d <= 18; d++) if (solido(xx, y + d)) return y + d;
      return y + 18;
    };
    return clamp(Math.atan2(quota(x + 14) - quota(x - 14), 28), -0.4, 0.4);
  }

  // ---------------------------------------------------------------- proiettili
  function origineTiro(x, y, angolo, verso) {
    const a = angolo * Math.PI / 180;
    return { x: x + Math.cos(a) * verso * 24, y: y - 32 - Math.sin(a) * 24 };
  }

  function creaProiettili(g, colpo, angolo, verso, potenza, x = g.x, y = g.y) {
    const M = MEZZI[g.mezzo];
    const l = colpo.lancio || { n: 1, apertura: 0, potenze: [1] };
    const lista = [];
    for (let k = 0; k < l.n; k++) {
      const a = (angolo + (k - (l.n - 1) / 2) * l.apertura) * Math.PI / 180;
      const v = M.velMax * clamp(potenza * (l.potenze[k] || 1), 0.03, 1);
      const o = origineTiro(x, y, angolo, verso);
      lista.push({
        x: o.x, y: o.y, vx: Math.cos(a) * v * verso, vy: -Math.sin(a) * v,
        colpo, prop: g, t: 0, rimbalzi: colpo.rimbalzi || 0, apice: o.y,
        diviso: false, morto: false, rot: 0, scia: [],
      });
    }
    return lista;
  }

  function normale(x, y) {
    let sx = 0, sy = 0;
    for (let dy = -6; dy <= 6; dy += 2) {
      for (let dx = -6; dx <= 6; dx += 2) {
        if (dx * dx + dy * dy <= 36 && solido(x + dx, y + dy)) { sx -= dx; sy -= dy; }
      }
    }
    const l = Math.hypot(sx, sy);
    return l ? { x: sx / l, y: sy / l } : { x: 0, y: -1 };
  }

  // un passo di fisica per un proiettile; amb raccoglie eventi e figli
  function passoProiettile(p, dt, amb) {
    const c = p.colpo;
    p.t += dt;
    p.vx += amb.vento * FISICA.vento * c.vento * dt;
    p.vy += FISICA.gravita * c.gravita * dt;
    const x0 = p.x, y0 = p.y;
    const x1 = x0 + p.vx * dt, y1 = y0 + p.vy * dt;
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3));
    let px = x0, py = y0;
    for (let i = 1; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      if (y >= ACQUA) { p.morto = true; amb.evento({ tipo: 'acqua', x, y: ACQUA, p }); return; }
      if (x < -300 || x > W + 300) { p.morto = true; amb.evento({ tipo: 'fuori', x, y, p }); return; }
      let diretto = null;
      for (const g of amb.giocatori) {
        if (g.morto || (g === p.prop && p.t < 0.35)) continue;
        if (dist(x, y, g.x, g.y - FISICA.corpoY) < FISICA.corpoR + c.dimensione * 0.6) { diretto = g; break; }
      }
      const terra = !diretto && solido(x, y);
      if (diretto || terra) {
        if (terra && p.rimbalzi > 0) {
          const nr = normale(x, y);
          const vn = p.vx * nr.x + p.vy * nr.y;
          if (vn < 0) { p.vx -= 2 * vn * nr.x; p.vy -= 2 * vn * nr.y; }
          p.vx *= 0.72;
          p.vy *= 0.72;
          p.x = px + nr.x * 2;
          p.y = py + nr.y * 2;
          p.rimbalzi--;
          if (Math.hypot(p.vx, p.vy) < 90) p.rimbalzi = 0;
          if (c.esplodeRimbalzo) {
            amb.evento({ tipo: 'esplosione', x, y, raggio: c.esplodeRimbalzo.raggio, danno: c.esplodeRimbalzo.danno, p });
          }
          amb.evento({ tipo: 'rimbalzo', x, y, p });
          return;
        }
        p.morto = true;
        amb.evento({ tipo: 'esplosione', x, y, raggio: c.raggio, danno: c.danno, diretto, p });
        return;
      }
      px = x; py = y;
    }
    p.x = x1;
    p.y = y1;
    p.apice = Math.min(p.apice, p.y);
    const d = c.divide;
    if (d && !p.diviso) {
      if ((d.quando === 'apice' && p.vy >= 0) || (d.quando === 'discesa' && p.vy > 0 && p.y > p.apice + 70)) {
        p.diviso = true;
        p.morto = true;
        for (let k = 0; k < d.n; k++) {
          const f = d.n > 1 ? k / (d.n - 1) - 0.5 : 0;
          amb.aggiungi({
            x: p.x, y: p.y, vx: p.vx + f * d.apertura * 4, vy: d.quando === 'apice' ? p.vy : p.vy * 0.85 - 40,
            colpo: d.colpo, prop: p.prop, t: 1, rimbalzi: 0, apice: p.y, diviso: true, morto: false,
            rot: Math.random() * 6, scia: [],
          });
        }
        amb.evento({ tipo: 'divide', x: p.x, y: p.y, p });
      }
    }
  }

  // prova un tiro senza toccare niente: restituisce le esplosioni
  function simulaTiro(g, colpo, angolo, verso, potenza, vento, x = g.x, y = g.y) {
    const eventi = [];
    let lista = creaProiettili(g, colpo, angolo, verso, potenza, x, y);
    let nuovi = [];
    const amb = {
      vento, giocatori: stato.giocatori,
      evento: (e) => { if (e.tipo === 'esplosione') eventi.push(e); },
      aggiungi: (q) => nuovi.push(q),
    };
    // il giocatore che tira è immaginato nella posizione (x, y)
    const vx = g.x, vy = g.y;
    g.x = x; g.y = y;
    let t = 0;
    while (lista.length && t < 12) {
      for (const p of lista) passoProiettile(p, FISICA.passo, amb);
      if (nuovi.length) { lista = lista.concat(nuovi); nuovi = []; }
      lista = lista.filter((p) => !p.morto);
      t += FISICA.passo;
    }
    g.x = vx; g.y = vy;
    eventi.fine = t;
    return eventi;
  }

  function danno(ev, g) {
    if (ev.diretto === g) return Math.round(ev.danno * 1.1);
    const d = Math.max(0, dist(ev.x, ev.y, g.x, g.y - FISICA.corpoY) - FISICA.corpoR);
    if (d >= ev.raggio) return 0;
    return Math.round(ev.danno * (1 - d / ev.raggio));
  }

  // ---------------------------------------------------------------- partita
  function nemiciDi(g) { return stato.giocatori.filter((h) => !h.morto && h.squadra !== g.squadra); }

  function iniziaPartita(modo, livello = 1, scelte = {}) {
    stato.modo = modo;
    stato.livello = livello;
    const seme = scelte.seme || (Math.random() * 1e9) | 0;
    let tentativi = 0;
    for (;;) {
      stato.terreno = TB.terreno.nuovoTerreno(seme + tentativi * 7919, scelte.tipo);
      stato.giocatori = [];
      const liv = scelte.liv || (modo === 'demo' ? 6 : livello);
      const mezzoCpu = () => Object.keys(MEZZI)[Math.floor(Math.random() * 3)];
      stato.giocatori.push(nuovoGiocatore({
        id: 0, personaggio: 'tino', squadra: 0, mezzo: scelte.mezzo0 || mezzoCpu(), cpu: modo === 'demo' || !!scelte.cpu0, liv: scelte.liv0 || liv,
      }));
      stato.giocatori.push(nuovoGiocatore({
        id: 1, personaggio: 'gino', squadra: 1, mezzo: scelte.mezzo1 || mezzoCpu(), cpu: modo !== 'due', liv,
      }));
      if (piazzaGiocatori() && mappaGiocabile()) break;
      if (++tentativi > 12) break;
    }
    stato.fondale = TB.terreno.nuovoFondale(seme);
    stato.proiettili = [];
    stato.particelle = [];
    stato.messaggio = null;
    stato.numeroTurno = 0;
    stato.vincitore = null;
    stato.zoomUtente = 1;
    for (const g of stato.giocatori) g.ritardo = Math.random() * 20;
    inquadra(true);
    if (modo !== 'demo') nascondiPannello();
    iniziaTurno();
  }

  // sceglie i punti di partenza: lontani tra loro, in piano, sopra l'acqua
  function piazzaGiocatori() {
    const cand = [];
    const mat = stato.terreno.mat;
    for (let x = 90; x < W - 90; x += 6) {
      for (let y = 1; y < ACQUA - 30; y++) {
        if (!mat[y * W + x] || mat[(y - 1) * W + x]) continue;
        const piedi = y - 1;
        if (corpoBloccato(x, piedi) || corpoBloccato(x, piedi - 20)) continue;
        if (!appoggiato(x, piedi)) continue;
        const sl = Math.abs(inclinazioneSuolo(x, piedi));
        if (sl > 0.3) continue;
        // terra abbastanza larga sotto (non sulla punta di un sasso)
        let larghezza = 0;
        for (let dx = -40; dx <= 40; dx += 10) if (solido(x + dx, piedi + 12) || solido(x + dx, piedi + 24)) larghezza++;
        if (larghezza < 6) continue;
        cand.push({ x, y: piedi });
      }
    }
    const sinistra = cand.filter((c) => c.x < W * 0.38);
    const destra = cand.filter((c) => c.x > W * 0.62);
    if (!sinistra.length || !destra.length) return false;
    const a = sinistra[Math.floor(Math.random() * sinistra.length)];
    const b = destra[Math.floor(Math.random() * destra.length)];
    const [p0, p1] = Math.random() < 0.5 ? [a, b] : [b, a];
    const [g0, g1] = stato.giocatori;
    Object.assign(g0, { x: p0.x, y: p0.y, verso: p0.x < p1.x ? 1 : -1 });
    Object.assign(g1, { x: p1.x, y: p1.y, verso: p1.x < p0.x ? 1 : -1 });
    for (const g of stato.giocatori) g.inclinazione = inclinazioneSuolo(g.x, g.y);
    return true;
  }

  // ognuno deve poter colpire l'altro almeno con un colpo, senza vento
  function mappaGiocabile() {
    for (const g of stato.giocatori) {
      const t = cercaTiro(g, g.x, g.y, 0, { passoA: 4, passoP: 0.04, colpi: [0, 1] });
      if (!t || t.valore < 100) return false;
    }
    return true;
  }

  function iniziaTurno() {
    if (controllaFine()) return;
    const vivi = stato.giocatori.filter((g) => !g.morto);
    vivi.sort((a, b) => a.ritardo - b.ritardo || a.ultimoTurno - b.ultimoTurno);
    const g = vivi[0];
    stato.attivo = g;
    stato.numeroTurno++;
    g.ultimoTurno = stato.numeroTurno;
    g.energia = MEZZI[g.mezzo].energia;
    g.mosso = 0;
    g.passi = 0;
    g.potenza = 0;
    g.carica = false;
    if (stato.numeroTurno > 2) g.speciale = Math.min(1, g.speciale + TURNO.speciale);
    if (g.colpo === 2 && g.speciale < 1) g.colpo = 0;
    const vm = ventoMassimo(stato.modo === 'due' ? 8 : stato.livello);
    stato.vento = Math.round((Math.random() * 2 - 1) * vm);
    stato.tempoTurno = TURNO.tempo;
    stato.fase = 'mira';
    stato.zoomUtente = 1;
    g.ia = g.cpu ? { fase: 'pensa', t: IA.pensa * (0.7 + Math.random() * 0.6), piano: null } : null;
    mostraMessaggio('Tocca a ' + g.nome + '!', 1.3);
    suoni.turno();
    aggiornaPlancia(true);
  }

  function spara(g) {
    if (stato.fase !== 'mira' || stato.attivo !== g) return;
    const M = MEZZI[g.mezzo];
    const colpo = M.colpi[g.colpo];
    const potenza = clamp(g.potenza, 0.03, 1);
    const angolo = Math.round(g.angolo);
    stato.proiettili.push(...creaProiettili(g, colpo, angolo, g.verso, potenza));
    g.ultimaPotenza = potenza;
    g.ultimoAngolo = angolo;
    g.tiri = (g.tiri || 0) + 1;
    g.tiroAndato = false;
    g.ritardo += colpo.ritardo * M.peso + g.mosso * TURNO.ritardoPasso;
    if (colpo.speciale) { g.speciale = 0; g.colpo = 0; }
    g.carica = false;
    g.potenza = 0;
    stato.fase = 'volo';
    stato.attesa = 0;
    suoni.tiro(potenza);
    aggiornaPlancia(true);
  }

  function passaTurno(g) {
    g.ritardo += TURNO.ritardoScaduto + g.mosso * TURNO.ritardoPasso;
    g.carica = false;
    g.potenza = 0;
    mostraMessaggio('Tempo scaduto!', 1);
    stato.fase = 'assesta';
    stato.attesa = 0;
  }

  function controllaFine() {
    const squadre = new Set(stato.giocatori.filter((g) => !g.morto).map((g) => g.squadra));
    if (squadre.size > 1) return false;
    stato.fase = 'fine';
    stato.attesa = 0;
    const vincitore = stato.giocatori.find((g) => !g.morto) || null;
    stato.vincitore = vincitore;
    if (vincitore) vincitore.festaT = 99;
    if (stato.modo === 'demo') return true;
    const vinceUmano = vincitore && !vincitore.cpu;
    if (stato.modo === 'cpu') {
      if (vinceUmano) {
        record = Math.max(record, stato.livello + 1);
        scrivi('record', record);
        suoni.vittoria();
      } else suoni.sconfitta();
    } else suoni.vittoria();
    return true;
  }

  // ---------------------------------------------------------------- aggiornamento
  function aggiorna(dt) {
    stato.tempo += dt;
    if (stato.fase === 'pausa') return;
    aggiornaMessaggio(dt);
    for (const g of stato.giocatori) aggiornaAnimazioni(g, dt);
    aggiornaParticelle(dt);
    stato.scossa = Math.max(0, stato.scossa - dt * 2.5);

    stato.accumulo += dt;
    while (stato.accumulo >= FISICA.passo) {
      stato.accumulo -= FISICA.passo;
      passoFisica(FISICA.passo);
    }

    const g = stato.attivo;
    if (stato.fase === 'mira' && g) {
      if (g.cpu) guidaIA(g, dt);
      else guidaUmano(g, dt);
      if (!g.cpu && stato.modo !== 'demo') {
        stato.tempoTurno -= dt;
        if (stato.tempoTurno <= 0 && stato.fase === 'mira') passaTurno(g);
      }
      if (!g.aTerra && stato.fase === 'mira') { g.carica = false; }
    } else if (stato.fase === 'volo') {
      if (!stato.proiettili.length) { stato.fase = 'assesta'; stato.attesa = 0; }
    } else if (stato.fase === 'assesta') {
      stato.attesa += dt;
      const fermi = stato.giocatori.every((h) => h.aTerra || h.annegato);
      if ((fermi && stato.attesa > 0.8) || stato.attesa > 5) {
        for (const h of stato.giocatori) if (!h.morto && h.vita <= 0) muore(h);
        iniziaTurno();
      }
    } else if (stato.fase === 'fine') {
      stato.attesa += dt;
      if (stato.attesa > 1.8 && stato.modo !== 'demo' && !pannelloAperto()) mostraPannello(pannelloFine());
      if (stato.attesa > 3 && stato.modo === 'demo') iniziaPartita('demo');
    }
    aggiornaPlancia(false);
  }

  function passoFisica(dt) {
    if (stato.proiettili.length) {
      let nuovi = [];
      const amb = {
        vento: stato.vento, giocatori: stato.giocatori,
        evento: eventoReale, aggiungi: (q) => nuovi.push(q),
      };
      for (const p of stato.proiettili) {
        passoProiettile(p, dt, amb);
        p.rot += dt * 10;
      }
      stato.proiettili = stato.proiettili.concat(nuovi).filter((p) => !p.morto);
    }
    for (const g of stato.giocatori) passoGiocatore(g, dt);
  }

  function passoGiocatore(g, dt) {
    if (g.annegato) return;
    if (g.aTerra) {
      if (appoggiato(g.x, g.y)) return;
      g.aTerra = false;
    }
    g.vy = Math.min(g.vy + FISICA.gravita * dt, 800);
    // orizzontale
    let dx = g.vx * dt;
    const sx = Math.sign(dx);
    while (Math.abs(dx) > 0) {
      const s = Math.abs(dx) >= 1 ? sx : dx;
      const nx = g.x + s;
      let mosso = false;
      for (let su = 0; su <= 3; su++) {
        if (!corpoBloccato(nx, g.y - su)) { g.x = nx; g.y -= su; mosso = true; break; }
      }
      if (!mosso) { g.vx = 0; break; }
      dx -= s;
    }
    g.x = clamp(g.x, 10, W - 10);
    // verticale
    let dy = g.vy * dt;
    if (dy > 0) {
      while (dy > 0) {
        if (appoggiato(g.x, g.y)) {
          g.aTerra = true;
          if (g.vy > 300 && !g.morto) polvere(g.x, g.y, 6);
          g.vy = 0;
          g.vx = 0;
          g.inclinazione = inclinazioneSuolo(g.x, g.y);
          break;
        }
        const s = Math.min(1, dy);
        g.y += s;
        dy -= s;
      }
    } else {
      while (dy < 0) {
        if (solido(g.x, g.y - 46)) { g.vy = 0; break; }
        const s = Math.max(-1, dy);
        g.y += s;
        dy -= s;
      }
    }
    g.vx *= 1 - 0.6 * dt;
    if (g.y > ACQUA + 8) annega(g);
  }

  function annega(g) {
    g.annegato = true;
    g.aTerra = true;
    spruzzi(g.x, ACQUA, 26);
    suoni.splash();
    if (!g.morto) {
      g.vita = 0;
      mostraMessaggio(g.nome + ' è finito in acqua!', 1.6);
      muore(g);
    }
  }

  function muore(g) {
    if (g.morto) return;
    g.morto = true;
    g.vita = 0;
    g.caduta = 0.001;
    g.carica = false;
    suoni.sconfitta();
  }

  // ---------------------------------------------------------------- esplosioni
  function eventoReale(e) {
    if (e.tipo === 'esplosione') esplodi(e);
    else if (e.tipo === 'acqua') { spruzzi(e.x, ACQUA, 12); suoni.splash(); }
    else if (e.tipo === 'fuori') mostraMessaggio('Fuori!', 0.9);
    else if (e.tipo === 'rimbalzo') { suoni.rimbalzo(); polvere(e.x, e.y, 3); }
    else if (e.tipo === 'divide') { suoni.divide(); fumo(e.x, e.y, 10, 4); }
  }

  function esplodi(e) {
    TB.terreno.scava(stato.terreno, e.x, e.y, e.raggio);
    const k = clamp(e.raggio / 60, 0.4, 1.5);
    suoni.bum(k);
    stato.scossa = Math.min(1, stato.scossa + 0.25 + k * 0.25);
    zolle(e.x, e.y, e.raggio);
    fumo(e.x, e.y, e.raggio, 7);
    aggiungiParticella({ tipo: 'scritta', x: e.x, y: e.y - e.raggio * 0.4, vita: 0.75, durata: 0.75, testo: e.raggio > 60 ? 'BADABUM!' : 'BUM!', k });
    const autore = e.p && e.p.prop;
    for (const g of stato.giocatori) {
      if (g.annegato) continue;
      const d = danno(e, g);
      const lontano = Math.max(0, dist(e.x, e.y, g.x, g.y - FISICA.corpoY) - FISICA.corpoR);
      const spinta = 1 - lontano / (e.raggio * 1.4);
      if (spinta > 0) {
        let nx = g.x - e.x, ny = (g.y - FISICA.corpoY) - e.y;
        const l = Math.hypot(nx, ny) || 1;
        nx /= l; ny /= l;
        g.vx += nx * FISICA.spinta * spinta;
        g.vy = Math.min(g.vy, -(50 + 110 * spinta) + Math.min(0, ny) * 40);
        g.aTerra = false;
      }
      if (d > 0 && !g.morto) colpisci(g, d, autore);
    }
  }

  function colpisci(g, d, autore) {
    g.vita = Math.max(0, g.vita - d);
    g.colpitoT = 1.5;
    g.tremaT = 0.6;
    if (d >= 180) g.feritoT = 1.5;
    g.speciale = Math.min(1, g.speciale + d / 1000 * TURNO.specialeDanno);
    aggiungiParticella({ tipo: 'numero', x: g.x, y: g.y - 70, vy: -50, vita: 1.3, durata: 1.3, testo: '-' + d });
    suoni.ahi();
    if (autore && autore !== g && autore.squadra !== g.squadra) {
      autore.festaT = 1.2;
      if (!autore.tiroAndato) { autore.tiroAndato = true; autore.aSegno = (autore.aSegno || 0) + 1; }
    }
  }

  // ---------------------------------------------------------------- particelle
  function aggiungiParticella(q) {
    if (stato.particelle.length > 400) stato.particelle.shift();
    stato.particelle.push(q);
  }
  function zolle(x, y, r) {
    const n = Math.round(8 + r / 4);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const v = 120 + Math.random() * 260;
      aggiungiParticella({
        tipo: 'zolla', x: x + (Math.random() - 0.5) * r * 0.6, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        vita: 1.2, durata: 1.2, r: 3 + Math.random() * 5, colore: Math.random() < 0.25 ? '#68bb45' : '#a8652f',
      });
    }
  }
  function fumo(x, y, r, n) {
    for (let i = 0; i < n; i++) {
      aggiungiParticella({
        tipo: 'fumo', x: x + (Math.random() - 0.5) * r, y: y + (Math.random() - 0.5) * r * 0.6,
        vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 40, vita: 0.9, durata: 0.9,
        r: r * (0.35 + Math.random() * 0.3),
      });
    }
  }
  function polvere(x, y, n) {
    for (let i = 0; i < n; i++) {
      aggiungiParticella({
        tipo: 'fumo', x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 80, vy: -10 - Math.random() * 30,
        vita: 0.5, durata: 0.5, r: 6 + Math.random() * 6,
      });
    }
  }
  function spruzzi(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const v = 150 + Math.random() * 250;
      aggiungiParticella({
        tipo: 'goccia', x: x + (Math.random() - 0.5) * 20, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        vita: 1, durata: 1, r: 3 + Math.random() * 3,
      });
    }
  }
  function aggiornaParticelle(dt) {
    for (const q of stato.particelle) {
      q.vita -= dt;
      if (q.tipo === 'zolla' || q.tipo === 'goccia') {
        q.vy += FISICA.gravita * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (q.tipo === 'goccia' && q.y > ACQUA && q.vy > 0) q.vita = 0;
      } else if (q.tipo === 'fumo') {
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      } else if (q.tipo === 'numero') {
        q.y += q.vy * dt;
        q.vy *= 1 - 1.5 * dt;
      }
    }
    stato.particelle = stato.particelle.filter((q) => q.vita > 0);
  }

  function aggiornaAnimazioni(g, dt) {
    g.colpitoT = Math.max(0, g.colpitoT - dt);
    g.feritoT = Math.max(0, g.feritoT - dt);
    g.tremaT = Math.max(0, g.tremaT - dt);
    if (g.festaT < 50) g.festaT = Math.max(0, g.festaT - dt);
    if (g.morto && g.caduta < 1) g.caduta = Math.min(1, g.caduta + dt * 1.6);
    g.vitaMostrata += (g.vita - g.vitaMostrata) * Math.min(1, dt * 5);
  }

  // ---------------------------------------------------------------- giocatore umano
  const tasti = new Set();
  const tieni = new Set();
  let mouseGiu = false;

  function guidaUmano(g, dt) {
    const sinistra = tasti.has('ArrowLeft') || tasti.has('KeyA') || tieni.has('sinistra');
    const destra = tasti.has('ArrowRight') || tasti.has('KeyD') || tieni.has('destra');
    const su = tasti.has('ArrowUp') || tasti.has('KeyW') || tieni.has('su');
    const giu = tasti.has('ArrowDown') || tasti.has('KeyS') || tieni.has('giu');
    const tira = tasti.has('Space') || mouseGiu || tieni.has('tira');

    if (!g.carica && (sinistra !== destra)) cammina(g, sinistra ? -1 : 1, dt);
    if (su !== giu) {
      g.tieniAngolo += dt;
      const v = g.tieniAngolo > 0.35 ? TURNO.angoloVeloce : TURNO.angoloLento;
      cambiaAngolo(g, (su ? 1 : -1) * v * dt);
    } else g.tieniAngolo = 0;

    if (tira && g.aTerra) {
      g.carica = true;
      g.potenza = Math.min(1, g.potenza + TURNO.carica * dt);
      if (g.potenza >= 1) spara(g);
    } else if (g.carica) {
      spara(g);
    }
  }

  function cambiaAngolo(g, d) {
    const [a0, a1] = MEZZI[g.mezzo].angoli;
    g.angolo = clamp(g.angolo + d, a0, a1);
  }

  function cammina(g, dir, dt) {
    g.verso = dir;
    if (!g.aTerra || g.energia <= 0) return false;
    g.passi += FISICA.cammino * dt;
    let mosso = false;
    while (g.passi >= 1) {
      g.passi -= 1;
      if (g.energia <= 0) break;
      const r = passoCammino(g.x, g.y, dir);
      if (!r) { g.passi = 0; break; }
      g.x = r.x;
      g.y = r.y;
      g.energia--;
      g.mosso++;
      mosso = true;
      if (r.cade) { g.aTerra = false; break; }
    }
    if (mosso) g.inclinazione += (inclinazioneSuolo(g.x, g.y) - g.inclinazione) * 0.3;
    return mosso;
  }

  // ---------------------------------------------------------------- IA
  function cercaTiro(g, x, y, vento, o = {}) {
    const M = MEZZI[g.mezzo];
    const passoA = o.passoA || 2.5;
    const passoP = o.passoP || 0.025;
    const colpi = o.colpi || [0, 1].concat(g.speciale >= 1 ? [2] : []);
    const nemici = nemiciDi(g);
    if (!nemici.length) return null;
    const versi = [...new Set(nemici.map((h) => (h.x >= x ? 1 : -1)))];
    const prova = (ci, a, v, p) => {
      const ev = simulaTiro(g, M.colpi[ci], a, v, p, vento, x, y);
      return valuta(ev, g, nemici, x, y);
    };
    let migliori = [];
    for (const ci of colpi) {
      for (const v of versi) {
        for (let a = M.angoli[0]; a <= M.angoli[1] + 0.01; a += passoA) {
          for (let p = 0.2; p <= 1.001; p += passoP) {
            const val = prova(ci, a, v, p);
            migliori.push({ colpo: ci, angolo: a, verso: v, potenza: p, valore: val });
          }
        }
      }
    }
    migliori.sort((a, b) => b.valore - a.valore);
    migliori = migliori.slice(0, o.affina === false ? 1 : 3);
    if (o.affina !== false) {
      for (const m of migliori.slice()) {
        for (let da = -passoA; da <= passoA + 0.01; da += 1) {
          const a = clamp(Math.round(m.angolo + da), M.angoli[0], M.angoli[1]);
          for (let dp = -passoP; dp <= passoP + 0.0001; dp += 0.005) {
            const p = clamp(m.potenza + dp, 0.05, 1);
            const val = prova(m.colpo, a, m.verso, p);
            if (val > m.valore + 0.01) Object.assign(m, { angolo: a, potenza: p, valore: val });
          }
        }
      }
      migliori.sort((a, b) => b.valore - a.valore);
    }
    return migliori[0];
  }

  function valuta(eventi, g, nemici, x, y) {
    let v = 0;
    for (const h of stato.giocatori) {
      if (h.morto) continue;
      let tot = 0;
      for (const e of eventi) tot += danno(e, h === g ? { x, y } : h);
      if (!tot) continue;
      if (h.squadra !== g.squadra) v += Math.min(tot, h.vita) + (tot >= h.vita ? 500 : 0);
      else v -= tot * 1.6;
    }
    if (v === 0 && eventi.length) {
      // nessun danno: meglio cadere vicino a un nemico
      let m = Infinity;
      for (const e of eventi) for (const h of nemici) m = Math.min(m, dist(e.x, e.y, h.x, h.y));
      v = -m / 100;
    } else if (!eventi.length) v = -50;
    return v;
  }

  function scalaErrore(liv, base) {
    const [b, f, min] = base;
    return Math.max(min, b * Math.pow(f, liv - 1));
  }

  function pianificaIA(g, puoiMuovere) {
    const migliore = cercaTiro(g, g.x, g.y, stato.vento);
    if (!migliore) return null;
    let piano = { ...migliore, destinazione: null };
    if (puoiMuovere && migliore.valore < 120 && g.energia > 30) {
      let meglio = migliore.valore;
      for (const dir of [-1, 1]) {
        let x = g.x, y = g.y, e = g.energia, passi = 0;
        while (e > 0) {
          const r = passoCammino(x, y, dir);
          if (!r || r.cade) break;
          x = r.x; y = r.y; e--; passi++;
          if (passi % 30 === 0) {
            const t = cercaTiro(g, x, y, stato.vento, { passoA: 5, passoP: 0.05, affina: false });
            if (t && t.valore > meglio + 40) { meglio = t.valore; piano = { ...t, destinazione: x }; }
          }
        }
      }
    }
    return piano;
  }

  function erroreIA(g, piano) {
    const bersaglio = nemiciDi(g).sort((a, b) => dist(a.x, a.y, g.x, g.y) - dist(b.x, b.y, g.x, g.y))[0];
    const m = g.memoria;
    if (bersaglio && m.bersaglio === bersaglio && Math.abs(bersaglio.x - m.x) < 40 && !piano.mosso) m.colpi++;
    else m.colpi = 0;
    m.bersaglio = bersaglio;
    m.x = bersaglio ? bersaglio.x : 0;
    const [b, c, min] = IA.scalaMinima;
    const s = Math.max(Math.max(min, b - c * (g.liv - 1)), Math.pow(IA.aggiusta, m.colpi));
    const M = MEZZI[g.mezzo];
    piano.angolo = clamp(Math.round(piano.angolo + gauss() * scalaErrore(g.liv, IA.erroreAngolo) * s), M.angoli[0], M.angoli[1]);
    piano.potenza = clamp(piano.potenza + gauss() * scalaErrore(g.liv, IA.errorePotenza) * s, 0.05, 1);
  }

  function guidaIA(g, dt) {
    const ia = g.ia;
    if (!g.aTerra) return;
    if (ia.fase === 'pensa') {
      ia.t -= dt;
      if (ia.t > 0) return;
      ia.piano = pianificaIA(g, true);
      if (!ia.piano) { passaTurno(g); return; }
      ia.fase = ia.piano.destinazione !== null ? 'cammina' : 'mira';
      if (ia.fase === 'mira') erroreIA(g, ia.piano);
    } else if (ia.fase === 'cammina') {
      const d = ia.piano.destinazione - g.x;
      if (Math.abs(d) < 1.5 || !cammina(g, Math.sign(d), dt) || g.energia <= 0) {
        if (!g.aTerra) return;
        const p = pianificaIA(g, false);
        if (!p) { passaTurno(g); return; }
        ia.piano = { ...p, mosso: true };
        erroreIA(g, ia.piano);
        ia.fase = 'mira';
      }
    } else if (ia.fase === 'mira') {
      const p = ia.piano;
      g.verso = p.verso;
      g.colpo = p.colpo;
      const d = p.angolo - g.angolo;
      if (Math.abs(d) > 0.5) g.angolo += Math.sign(d) * Math.min(Math.abs(d), IA.velAngolo * dt);
      else { g.angolo = p.angolo; ia.fase = 'carica'; ia.t = 0.25; }
    } else if (ia.fase === 'carica') {
      ia.t -= dt;
      if (ia.t > 0) return;
      g.carica = true;
      g.potenza = Math.min(ia.piano.potenza, g.potenza + TURNO.carica * dt);
      if (g.potenza >= ia.piano.potenza - 1e-6) spara(g);
    }
  }

  // ---------------------------------------------------------------- schermo e camera
  let scalaBase = 1;
  function ridimensiona() {
    const r = palco.getBoundingClientRect();
    const aw = Math.max(100, r.width - 8);
    const ah = Math.max(100, r.height - 8);
    const s = Math.min(aw / VW, ah / VH);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(VW * s), h = Math.round(VH * s);
    schermo.style.width = w + 'px';
    schermo.style.height = h + 'px';
    schermo.style.setProperty('--s', s.toFixed(3));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    scalaBase = s * dpr;
    // sul telefono, se ai lati c'è spazio, i pulsanti vanno fuori dal campo
    document.body.classList.toggle('margini', (r.width - w) / 2 >= 104);
    stato.margineBasso = (plancia.offsetHeight || 60) / s;
  }
  new ResizeObserver(ridimensiona).observe(palco);

  const Z_MIN = Math.min(VW / W, VH / H);
  function inquadra(subito, dt = 0) {
    const cam = stato.camera;
    const punti = [];
    for (const g of stato.giocatori) if (!g.annegato) punti.push({ x: g.x, y: g.y - 30 });
    if (stato.fase === 'volo') for (const p of stato.proiettili) punti.push({ x: p.x, y: Math.max(p.y, -150) });
    if (!punti.length) punti.push({ x: W / 2, y: H / 2 });
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of punti) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const mb = stato.modo === 'demo' ? 0 : (stato.margineBasso || 60);
    x0 -= 170; x1 += 170; y0 -= 200; y1 += 50 + mb;
    let z = clamp(Math.min(VW / (x1 - x0), VH / (y1 - y0)), Z_MIN, 1);
    let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (stato.zoomUtente > 1 && stato.attivo) {
      z = clamp(z * stato.zoomUtente, Z_MIN, 1.6);
      cx = stato.attivo.x;
      cy = stato.attivo.y - 60;
    }
    const vw = VW / z, vh = VH / z;
    const tx = clamp(cx - vw / 2, 0, Math.max(0, W - vw));
    const sotto = H - vh + mb / z;
    const ty = clamp(cy - vh / 2, -260, sotto);
    if (subito) { cam.x = tx; cam.y = ty; cam.z = z; return; }
    const k = Math.min(1, dt * 3);
    cam.z += (z - cam.z) * k;
    const vw2 = VW / cam.z, vh2 = VH / cam.z;
    cam.x += (clamp(cx - vw2 / 2, 0, Math.max(0, W - vw2)) - cam.x) * k;
    cam.y += (clamp(cy - vh2 / 2, -260, H - vh2 + mb / cam.z) - cam.y) * k;
  }

  function aMondo(lx, ly) {
    const c = stato.camera;
    return { x: lx / c.z + c.x, y: ly / c.z + c.y };
  }
  function puntoLogico(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH };
  }

  // ---------------------------------------------------------------- input
  function turnoUmano() {
    const g = stato.attivo;
    return stato.fase === 'mira' && g && !g.cpu && !pannelloAperto() ? g : null;
  }

  function miraVerso(e) {
    const g = turnoUmano();
    if (!g || g.carica) return;
    const l = puntoLogico(e);
    const m = aMondo(l.x, l.y);
    const o = { x: g.x, y: g.y - 32 };
    const dx = m.x - o.x, dy = o.y - m.y;
    if (Math.hypot(dx, dy) < 12) return;
    g.verso = dx >= 0 ? 1 : -1;
    const [a0, a1] = MEZZI[g.mezzo].angoli;
    g.angolo = clamp(Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI, a0, a1);
  }

  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) miraVerso(e); });
  canvas.addEventListener('pointerdown', (e) => {
    contesto();
    miraVerso(e);
    if (e.pointerType === 'mouse' && e.button === 0 && turnoUmano()) mouseGiu = true;
  });
  window.addEventListener('pointerup', () => { mouseGiu = false; });
  canvas.addEventListener('wheel', (e) => {
    if (!turnoUmano()) return;
    e.preventDefault();
    stato.zoomUtente = clamp(stato.zoomUtente * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 2.2);
  }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const TASTI_GIOCO = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'];
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (TASTI_GIOCO.includes(e.code) && !pannelloAperto()) e.preventDefault();
    if (e.repeat && tasti.has(e.code)) return;
    tasti.add(e.code);
    contesto();
    const g = turnoUmano();
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (stato.fase === 'pausa') riprendi();
      else if (inPartita()) pausa();
    } else if (e.code === 'KeyM') cambiaAudio();
    else if (g && (e.code === 'ArrowUp' || e.code === 'KeyW')) { cambiaAngolo(g, 1); g.angolo = Math.round(g.angolo); }
    else if (g && (e.code === 'ArrowDown' || e.code === 'KeyS')) { cambiaAngolo(g, -1); g.angolo = Math.round(g.angolo); }
    else if (g && /^Digit[123]$/.test(e.code)) scegliColpo(g, Number(e.code.slice(5)) - 1);
    else if (e.code === 'Equal' || e.code === 'NumpadAdd') stato.zoomUtente = clamp(stato.zoomUtente * 1.2, 1, 2.2);
    else if (e.code === 'Minus' || e.code === 'NumpadSubtract') stato.zoomUtente = clamp(stato.zoomUtente / 1.2, 1, 2.2);
  });
  window.addEventListener('keyup', (e) => tasti.delete(e.code));
  window.addEventListener('blur', () => { tasti.clear(); tieni.clear(); mouseGiu = false; if (inPartita()) pausa(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && inPartita()) pausa(); });

  function scegliColpo(g, i) {
    if (g.carica) return;
    if (i === 2 && g.speciale < 1) return;
    g.colpo = i;
    suoni.clic();
    aggiornaPlancia(true);
  }

  // pulsanti della plancia (si tengono premuti)
  plancia.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-tieni]');
    contesto();
    if (b) {
      e.preventDefault();
      tieni.add(b.dataset.tieni);
      b.classList.add('premuto');
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
      const g = turnoUmano();
      if (g && b.dataset.tieni === 'su') { cambiaAngolo(g, 1); g.angolo = Math.round(g.angolo); }
      if (g && b.dataset.tieni === 'giu') { cambiaAngolo(g, -1); g.angolo = Math.round(g.angolo); }
      return;
    }
    const c = e.target.closest('[data-colpo]');
    const g = turnoUmano();
    if (c && g) scegliColpo(g, Number(c.dataset.colpo));
  });
  const lascia = (e) => {
    const b = e.target.closest && e.target.closest('[data-tieni]');
    if (b) { tieni.delete(b.dataset.tieni); b.classList.remove('premuto'); }
  };
  plancia.addEventListener('pointerup', lascia);
  plancia.addEventListener('pointercancel', lascia);
  plancia.addEventListener('lostpointercapture', lascia);

  function inPartita() { return stato.modo !== 'demo' && ['mira', 'volo', 'assesta'].includes(stato.fase); }
  function pausa() {
    if (!inPartita()) return;
    stato.faseInPausa = stato.fase;
    stato.fase = 'pausa';
    tieni.clear();
    mouseGiu = false;
    mostraPannello(pannelloPausa());
  }
  function riprendi() {
    if (stato.fase !== 'pausa') return;
    stato.fase = stato.faseInPausa;
    nascondiPannello();
  }
  function vaiAlMenu() {
    iniziaPartita('demo');
    mostraPannello(pannelloMenu());
  }
  function cambiaAudio() {
    muto = !muto;
    scrivi('muto', muto);
    document.body.classList.toggle('muto', muto);
  }

  // ---------------------------------------------------------------- plancia
  let planciaFirma = '';
  const el = {
    energia: $('#barra-energia'), riempi: $('#riempi'), segno: $('#segno'), angolo: $('#angolo'),
    colpi: $('#colpi'), tempo: $('#tempo'),
  };
  function aggiornaPlancia(forza) {
    const g = stato.attivo;
    const visibile = g && stato.modo !== 'demo' && ['mira', 'volo', 'assesta'].includes(stato.fase);
    plancia.classList.toggle('nascosta', !visibile);
    if (!visibile) { elTurno.textContent = ''; return; }
    const umano = !g.cpu && stato.fase === 'mira';
    plancia.classList.toggle('spenta', !umano);
    const M = MEZZI[g.mezzo];
    el.energia.style.width = (g.energia / M.energia * 100).toFixed(1) + '%';
    el.riempi.style.width = (g.potenza * 100).toFixed(1) + '%';
    el.segno.style.left = g.ultimaPotenza === null ? '-10px' : (g.ultimaPotenza * 100).toFixed(1) + '%';
    el.angolo.textContent = Math.round(g.angolo) + '°';
    const firma = [g.id, g.colpo, g.speciale >= 1, Math.round(g.speciale * 20), g.mezzo].join(',');
    if (forza || firma !== planciaFirma) {
      planciaFirma = firma;
      el.colpi.innerHTML = M.colpi.map((c, i) => {
        const bloccato = i === 2 && g.speciale < 1;
        const carica = i === 2 ? `<i class="carica-speciale" style="width:${(g.speciale * 100).toFixed(0)}%"></i>` : '';
        return `<button type="button" class="colpo${i === g.colpo ? ' scelto' : ''}${bloccato ? ' bloccato' : ''}${i === 2 ? ' speciale' : ''}" data-colpo="${i}">
          ${carica}<span class="tasto">${i + 1}</span><span class="nome-colpo">${c.nome}</span></button>`;
      }).join('');
      const s = parseFloat(schermo.style.getPropertyValue('--s')) || 1;
      stato.margineBasso = (plancia.offsetHeight || 60) / s;
      elTurno.innerHTML = `<span style="color:${PERSONAGGI[g.personaggio].colore}">${g.nome}</span> · ${M.nome}`;
    }
    if (el.tempo) {
      const mostra = !g.cpu && stato.fase === 'mira';
      el.tempo.textContent = mostra ? Math.ceil(Math.max(0, stato.tempoTurno)) : '';
      el.tempo.classList.toggle('poco', mostra && stato.tempoTurno < 8);
    }
  }

  // ---------------------------------------------------------------- disegno
  function disegna() {
    const dt = 1 / 60;
    if (stato.terreno) inquadra(false, dt);
    ctx.setTransform(scalaBase, 0, 0, scalaBase, 0, 0);
    disegnaCielo();
    if (!stato.terreno) return;
    const cam = stato.camera;
    ctx.save();
    if (stato.scossa > 0) ctx.translate((Math.random() - 0.5) * stato.scossa * 10, (Math.random() - 0.5) * stato.scossa * 10);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);
    disegnaFondale();
    disegnaAcqua(false);
    if (stato.terreno.grotte.length) ctx.drawImage(stato.terreno.telaFondo, 0, 0);
    ctx.drawImage(stato.terreno.telaTerra, 0, 0);
    ctx.drawImage(stato.terreno.telaRoccia, 0, 0);
    for (const g of stato.giocatori) disegnaGiocatore(g);
    if (stato.fase === 'mira' && stato.attivo) disegnaMira(stato.attivo);
    for (const p of stato.proiettili) disegnaProiettile(p);
    disegnaParticelle();
    disegnaAcqua(true);
    for (const g of stato.giocatori) disegnaEtichetta(g);
    ctx.restore();
    disegnaFuoriSchermo();
    disegnaHUD();
    disegnaMessaggio();
  }

  function disegnaCielo() {
    if (fondaleDipinto() && stato.terreno) {
      // un po' più grande dello schermo, scorre piano con la camera (parallasse)
      const cam = stato.camera;
      const k = 1.12;
      const w = VW * k, h = VH * k;
      const vw = VW / cam.z;
      const fx = W > vw ? clamp(cam.x / (W - vw), 0, 1) : 0.5;
      const fy = clamp((cam.y + 260) / (260 + H - VH / cam.z + 1), 0, 1);
      ctx.drawImage(FONDALE, -(w - VW) * fx, -(h - VH) * fy, w, h);
      return;
    }
    const gr = ctx.createLinearGradient(0, 0, 0, VH);
    gr.addColorStop(0, '#5fb6ee');
    gr.addColorStop(0.65, '#a8dcf6');
    gr.addColorStop(1, '#e4f5fb');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, VW, VH);
    // sole
    const sx = VW * 0.84, sy = 78;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(stato.tempo * 0.15);
    ctx.fillStyle = 'rgba(255, 230, 120, 0.55)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(-7, 40);
      ctx.lineTo(0, 62);
      ctx.lineTo(7, 40);
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(sx, sy, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd84a';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#e8a514';
    ctx.stroke();
  }

  function disegnaFondale() {
    if (fondaleDipinto()) return;
    const f = stato.fondale;
    const cam = stato.camera;
    const strato = (img, k) => ctx.drawImage(img, cam.x * (1 - k), cam.y * (1 - k) + 40 * (1 - k));
    strato(f.lontano, 0.25);
    for (const n of f.nuvole) {
      const x = ((n.x + stato.tempo * n.v) % (W + 400)) - 200 + cam.x * 0.6;
      disegnaNuvola(x, n.y + cam.y * 0.6, n.s);
    }
    strato(f.vicino, 0.55);
  }

  function disegnaNuvola(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.arc(34, -12, 36, 0, Math.PI * 2);
    ctx.arc(72, 0, 28, 0, Math.PI * 2);
    ctx.arc(36, 12, 30, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#8fbcd6';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  }

  function onda(x, t, davanti) {
    return ACQUA + Math.sin(x * 0.018 + t * (davanti ? 2.2 : 1.6)) * 5 + Math.sin(x * 0.043 - t * 1.3) * 3 + (davanti ? 10 : 0);
  }
  function disegnaAcqua(davanti) {
    const cam = stato.camera;
    const x0 = Math.floor(cam.x) - 20, x1 = cam.x + VW / cam.z + 20;
    const t = stato.tempo;
    ctx.beginPath();
    ctx.moveTo(x0, H + 400);
    for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, onda(x, t, davanti));
    ctx.lineTo(x1, H + 400);
    ctx.closePath();
    if (davanti) {
      ctx.fillStyle = 'rgba(38, 120, 196, 0.72)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, onda(x, t, true));
      ctx.stroke();
    } else {
      ctx.fillStyle = '#5bb2e8';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#2c6fa8';
      ctx.stroke();
    }
  }

  // --- mezzi (disegnati in coordinate locali: piedi in 0,0, avanti = +x)
  function bordo(lw = 3, c = '#3a2210') { ctx.lineWidth = lw; ctx.strokeStyle = c; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
  function ruota(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#7a4a22';
    ctx.fill();
    bordo();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#e2ad70';
    ctx.fill();
    ctx.stroke();
  }
  function rett(x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    bordo();
    ctx.stroke();
  }

  // a = alzo locale in radianti; tiro = 0..1 quanto è "tirato" mentre carica
  function disegnaMezzo(tipo, a, tiro) {
    const dx = Math.cos(a), dy = -Math.sin(a);
    if (tipo === 'catapulta') {
      rett(-30, -24, 60, 13, 5, '#b9814a');
      ruota(-19, -8, 9);
      ruota(19, -8, 9);
      rett(2, -44, 9, 22, 3, '#9a6232');
      // braccio
      const aa = a - tiro * 0.9;
      const bx = Math.cos(aa), by = -Math.sin(aa);
      ctx.save();
      ctx.translate(6, -40);
      ctx.beginPath();
      ctx.moveTo(-bx * 12, -by * 12);
      ctx.lineTo(bx * 30, by * 30);
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#3a2210';
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#c98a3c';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx * 32, by * 32, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#c98a3c';
      ctx.fill();
      bordo();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx * 32, by * 32, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#7a4a22';
      ctx.fill();
      ctx.restore();
    } else if (tipo === 'fionda') {
      rett(-26, -22, 52, 11, 5, '#c98a3c');
      ruota(-16, -8, 8);
      ruota(16, -8, 8);
      ctx.save();
      ctx.translate(8, -34);
      ctx.rotate(-a + Math.PI / 2);
      // la forcella si apre nella direzione del tiro (in alto nel sistema ruotato)
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(0, -2);
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-14, -4, -12, -22);
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(14, -4, 12, -22);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#3a2210';
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#a8693a';
      ctx.stroke();
      // elastico
      const t = 4 + tiro * 16;
      ctx.beginPath();
      ctx.moveTo(-12, -22);
      ctx.quadraticCurveTo(0, -22 + t * 2, 12, -22);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#d9473f';
      ctx.stroke();
      ctx.restore();
    } else if (tipo === 'mortaio') {
      rett(-34, -20, 68, 12, 5, '#9a6232');
      ruota(-24, -7, 8);
      ruota(0, -7, 8);
      ruota(24, -7, 8);
      // canna
      ctx.save();
      ctx.translate(6, -36);
      const k = 1 - tiro * 0.12;
      ctx.beginPath();
      ctx.moveTo(-dy * 10, dx * 10);
      ctx.lineTo(-dy * 10 + dx * 34 * k, dx * 10 + dy * 34 * k);
      ctx.lineTo(dy * 10 + dx * 34 * k, -dx * 10 + dy * 34 * k);
      ctx.lineTo(dy * 10, -dx * 10);
      ctx.closePath();
      ctx.fillStyle = '#e07a1c';
      ctx.fill();
      bordo();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(dx * 34 * k, dy * 34 * k, 10, 5, -a + Math.PI / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#5a2a08';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // zucca
      ctx.beginPath();
      ctx.ellipse(6, -34, 22, 17, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f39a2e';
      ctx.fill();
      bordo();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(6, -34, 9, 17, 0, 0, Math.PI * 2);
      ctx.moveTo(6, -51);
      ctx.lineTo(6, -17);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(120, 50, 0, 0.6)';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, -50);
      ctx.quadraticCurveTo(2, -60, 10, -62);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#3f7d2c';
      ctx.stroke();
    }
  }
  const SEDILE = { catapulta: { x: -16, y: -22 }, fionda: { x: -12, y: -20 }, mortaio: { x: -24, y: -18 } };

  function immagineDi(g) {
    if (g.personaggio === 'gino') return IMG.gino;
    if (g.morto) return IMG.ko;
    if (g.feritoT > 0) return IMG.ferito;
    if (g.colpitoT > 0 || g.vita < VITA * 0.3) return IMG.arrabbiato;
    if (stato.fase === 'mira' && stato.attivo === g && nemiciDi(g).some((h) => h.vita <= 250)) return IMG.arrabbiato;
    return IMG.normale;
  }

  function disegnaPersonaggio(g, x, y) {
    const img = immagineDi(g);
    if (!img.complete || !img.naturalWidth) return;
    const P = PERSONAGGI[g.personaggio];
    let h = P.altezza;
    let w = h * img.naturalWidth / img.naturalHeight;
    if (img === IMG.ko) { w = 66; h = w * img.naturalHeight / img.naturalWidth; }
    let dx = 0, dy = 0, rot = 0, sx = 1, sy = 1;
    const t = stato.tempo;
    if (g.festaT > 0) {
      const s = Math.abs(Math.sin(t * 7));
      dy -= s * 14;
      sy = 1 + (1 - s) * 0.06;
      sx = 1 - (1 - s) * 0.04;
    }
    if (g.tremaT > 0) dx += Math.sin(t * 70) * 4 * (g.tremaT / 0.6);
    if (g.carica) { sy *= 1 - g.potenza * 0.08; sx *= 1 + g.potenza * 0.05; }
    if (g.morto && g.personaggio === 'gino') {
      const e = 1 - Math.pow(1 - g.caduta, 3);
      rot = e * Math.PI / 2;
      dy += e * 10;
    }
    ctx.save();
    ctx.translate(x + dx, y + dy);
    ctx.rotate(rot);
    ctx.scale(sx * (g.verso > 0 ? -1 : 1), sy);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }

  function disegnaGiocatore(g) {
    if (g.annegato) return;
    const S = SEDILE[g.mezzo];
    ctx.save();
    ctx.translate(g.x, g.y + 1);
    ctx.rotate(g.inclinazione);
    // alzo locale (il mezzo è inclinato, la mira no)
    const a = g.angolo * Math.PI / 180;
    let ax = Math.cos(a), ay = -Math.sin(a);
    const c = Math.cos(-g.inclinazione), s = Math.sin(-g.inclinazione);
    let lx = (ax * g.verso) * c - ay * s;
    const ly = (ax * g.verso) * s + ay * c;
    lx *= g.verso;
    const aLocale = Math.atan2(-ly, lx);
    // ombra
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();
    ctx.scale(g.verso, 1);
    if (g.morto) ctx.globalAlpha = 0.85;
    disegnaPersonaggioLocale(g, S);
    disegnaMezzo(g.mezzo, aLocale, g.carica ? g.potenza : 0);
    ctx.restore();
  }
  function disegnaPersonaggioLocale(g, S) {
    // si disegna nel sistema già specchiato: annulliamo la specchiatura per l'immagine
    ctx.save();
    ctx.translate(S.x, S.y);
    ctx.scale(g.verso, 1);
    disegnaPersonaggio(g, 0, 0);
    ctx.restore();
  }

  function disegnaEtichetta(g) {
    if (g.annegato) return;
    const x = g.x, y = g.y - 96;
    const attivo = stato.attivo === g && stato.fase === 'mira';
    ctx.save();
    ctx.font = '600 15px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(30, 20, 10, 0.75)';
    ctx.strokeText(g.nome, x, y - 10);
    ctx.fillStyle = PERSONAGGI[g.personaggio].colore;
    ctx.fillText(g.nome, x, y - 10);
    const w = 64;
    ctx.fillStyle = 'rgba(30, 20, 10, 0.75)';
    ctx.beginPath();
    ctx.roundRect(x - w / 2 - 2, y - 4, w + 4, 10, 5);
    ctx.fill();
    const v = clamp(g.vitaMostrata / VITA, 0, 1);
    ctx.fillStyle = v > 0.5 ? '#6cd04a' : v > 0.25 ? '#f2c14e' : '#e8553f';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 2, w * v, 6, 3);
    ctx.fill();
    if (attivo) {
      const b = Math.sin(stato.tempo * 6) * 4;
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 40 + b);
      ctx.lineTo(x + 9, y - 40 + b);
      ctx.lineTo(x, y - 28 + b);
      ctx.closePath();
      ctx.fillStyle = '#ffd84a';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#7a4a22';
      ctx.stroke();
    }
    ctx.restore();
  }

  function disegnaMira(g) {
    if (!g.aTerra || g.morto) return;
    const M = MEZZI[g.mezzo];
    const ox = g.x, oy = g.y - 32;
    const R = 74;
    const ang = (d) => (g.verso > 0 ? -d : Math.PI + d) * 1;
    const a0 = M.angoli[0] * Math.PI / 180, a1 = M.angoli[1] * Math.PI / 180;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (g.verso > 0) ctx.arc(ox, oy, R, ang(a1), ang(a0));
    else ctx.arc(ox, oy, R, ang(a0), ang(a1));
    ctx.lineWidth = 9;
    ctx.strokeStyle = 'rgba(30, 20, 10, 0.35)';
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.stroke();
    const a = g.angolo * Math.PI / 180;
    const dx = Math.cos(a) * g.verso, dy = -Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(ox + dx * 30, oy + dy * 30);
    ctx.lineTo(ox + dx * (R + 10), oy + dy * (R + 10));
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#7a4a22';
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#ffd84a';
    ctx.stroke();
    // l'angolo dell'ultimo tiro
    if (g.ultimoAngolo !== null) {
      const u = g.ultimoAngolo * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(ox + Math.cos(u) * g.verso * R, oy - Math.sin(u) * R, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#e8553f';
      ctx.fill();
    }
    // breve traccia guida (senza vento): solo l'inizio del tiro
    const p = g.carica ? g.potenza : (g.ultimaPotenza || 0.6);
    const v = M.velMax * p;
    const o = origineTiro(g.x, g.y, g.angolo, g.verso);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let i = 1; i <= 6; i++) {
      const t = i * 0.05;
      const x = o.x + dx * v * t;
      const y = o.y + dy * v * t + 0.5 * FISICA.gravita * t * t;
      ctx.beginPath();
      ctx.arc(x, y, 3.2 - i * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function disegnaProiettile(p) {
    const c = p.colpo;
    p.scia.push({ x: p.x, y: p.y });
    if (p.scia.length > 16) p.scia.shift();
    ctx.save();
    for (let i = 0; i < p.scia.length; i++) {
      const s = p.scia[i];
      ctx.beginPath();
      ctx.arc(s.x, s.y, c.dimensione * 0.45 * (i / p.scia.length), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * i / p.scia.length})`;
      ctx.fill();
    }
    ctx.restore();
    disegnaOggetto(c.disegno, p.x, p.y, c.dimensione, p.rot);
  }

  function disegnaOggetto(tipo, x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    bordo(2.5);
    if (tipo === 'ghianda') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.86, -r * 0.15);
      ctx.bezierCurveTo(-r * 0.9, r * 0.7, -r * 0.3, r * 1.1, 0, r * 1.2);
      ctx.bezierCurveTo(r * 0.3, r * 1.1, r * 0.9, r * 0.7, r * 0.86, -r * 0.15);
      ctx.closePath();
      ctx.fillStyle = '#c98a3c';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.2, r, r * 0.62, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = '#7a4a22';
      ctx.fill();
      ctx.stroke();
    } else if (tipo === 'sasso') {
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.2);
      ctx.quadraticCurveTo(-r * 0.8, -r, 0, -r);
      ctx.quadraticCurveTo(r, -r * 0.9, r, 0);
      ctx.quadraticCurveTo(r * 0.9, r, 0, r * 0.9);
      ctx.quadraticCurveTo(-r, r * 0.9, -r, -r * 0.2);
      ctx.fillStyle = '#9aa1ad';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.35, r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = '#c4cad3';
      ctx.fill();
    } else if (tipo === 'zucca' || tipo === 'spicchio') {
      ctx.beginPath();
      if (tipo === 'zucca') ctx.ellipse(0, 0, r, r * 0.82, 0, 0, Math.PI * 2);
      else { ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, -r * 1.3, r, 0); ctx.quadraticCurveTo(0, r * 0.5, -r, 0); }
      ctx.fillStyle = '#f39a2e';
      ctx.fill();
      ctx.stroke();
      if (tipo === 'zucca') {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.4, r * 0.82, 0, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(120, 50, 0, 0.6)';
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.8);
        ctx.lineTo(r * 0.2, -r * 1.2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#3f7d2c';
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function disegnaParticelle() {
    for (const q of stato.particelle) {
      const k = clamp(q.vita / q.durata, 0, 1);
      ctx.save();
      if (q.tipo === 'zolla') {
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        ctx.fillStyle = q.colore;
        ctx.globalAlpha = Math.min(1, k * 3);
        ctx.fill();
        bordo(2);
        ctx.stroke();
      } else if (q.tipo === 'goccia') {
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        ctx.fillStyle = '#d6f0ff';
        ctx.fill();
        bordo(1.5, '#2c6fa8');
        ctx.stroke();
      } else if (q.tipo === 'fumo') {
        ctx.globalAlpha = k * 0.85;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r * (1.4 - k * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = '#fbf6ec';
        ctx.fill();
        bordo(3, '#b9ab98');
        ctx.stroke();
      } else if (q.tipo === 'scritta') {
        const e = 1 - k;
        const s = (0.6 + Math.min(1, e * 5) * 0.6) * (0.8 + q.k * 0.3);
        ctx.translate(q.x, q.y - e * 20);
        ctx.scale(s, s);
        ctx.globalAlpha = Math.min(1, k * 3);
        // stellona da fumetto
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
          const rr = i % 2 ? 26 : 44;
          const a = i / 20 * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * rr * 1.5, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = '#ffd84a';
        ctx.fill();
        bordo(4, '#c0392b');
        ctx.stroke();
        ctx.font = '700 26px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#fff';
        ctx.strokeText(q.testo, 0, 2);
        ctx.fillStyle = '#c0392b';
        ctx.fillText(q.testo, 0, 2);
      } else if (q.tipo === 'numero') {
        ctx.globalAlpha = Math.min(1, k * 2.5);
        ctx.font = '700 24px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#3a2210';
        ctx.strokeText(q.testo, q.x, q.y);
        ctx.fillStyle = '#ff6b4a';
        ctx.fillText(q.testo, q.x, q.y);
      }
      ctx.restore();
    }
  }

  // freccia sul bordo alto quando un proiettile esce dallo schermo
  function disegnaFuoriSchermo() {
    const cam = stato.camera;
    for (const p of stato.proiettili) {
      const sy = (p.y - cam.y) * cam.z;
      if (sy > 0) continue;
      const sx = clamp((p.x - cam.x) * cam.z, 20, VW - 20);
      ctx.save();
      ctx.translate(sx, 58);
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 4);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fillStyle = '#ffd84a';
      ctx.fill();
      bordo(3, '#7a4a22');
      ctx.stroke();
      ctx.restore();
    }
  }

  function disegnaHUD() {
    if (stato.modo === 'demo' && pannelloAperto()) return;
    const gs = stato.giocatori;
    if (gs[0]) schedaGiocatore(gs[0], 10, 10, false);
    if (gs[1]) schedaGiocatore(gs[1], VW - 230, 10, true);
    disegnaVento(VW / 2, 34);
  }

  function schedaGiocatore(g, x, y, destra) {
    const w = 220, h = 54;
    const attivo = stato.attivo === g && ['mira', 'volo'].includes(stato.fase);
    ctx.save();
    ctx.fillStyle = 'rgba(255, 248, 236, 0.92)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.lineWidth = attivo ? 4 : 2.5;
    ctx.strokeStyle = attivo ? '#e8a514' : '#7a4a22';
    ctx.stroke();
    // ritratto
    const px = destra ? x + w - 30 : x + 30, py = y + h / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 21, 0, Math.PI * 2);
    ctx.fillStyle = PERSONAGGI[g.personaggio].colore;
    ctx.fill();
    ctx.clip();
    const img = immagineDi(g);
    if (img.complete && img.naturalWidth) {
      const s = 50 / Math.max(img.naturalWidth, img.naturalHeight);
      const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
      ctx.drawImage(img, px - iw / 2, py - ih / 2 + 6, iw, ih);
    }
    ctx.restore();
    ctx.fillStyle = '#3b2a1a';
    ctx.font = '600 16px Fredoka, sans-serif';
    ctx.textAlign = destra ? 'right' : 'left';
    const tx = destra ? x + w - 58 : x + 58;
    ctx.fillText(g.nome + (g.cpu && stato.modo !== 'demo' ? ' (computer)' : ''), tx, y + 20);
    // vita
    const bw = w - 70, bx = destra ? x + 12 : x + 58;
    ctx.fillStyle = '#e3d6c0';
    ctx.beginPath();
    ctx.roundRect(bx, y + 27, bw, 10, 5);
    ctx.fill();
    const v = clamp(g.vitaMostrata / VITA, 0, 1);
    ctx.fillStyle = v > 0.5 ? '#5cbf3c' : v > 0.25 ? '#f2b33e' : '#e8553f';
    ctx.beginPath();
    ctx.roundRect(destra ? bx + bw * (1 - v) : bx, y + 27, bw * v, 10, 5);
    ctx.fill();
    // speciale
    ctx.fillStyle = '#e3d6c0';
    ctx.beginPath();
    ctx.roundRect(bx, y + 41, bw, 5, 3);
    ctx.fill();
    ctx.fillStyle = g.speciale >= 1 ? `hsl(${(stato.tempo * 200) % 360}, 85%, 55%)` : '#c98a3c';
    ctx.beginPath();
    ctx.roundRect(destra ? bx + bw * (1 - g.speciale) : bx, y + 41, bw * g.speciale, 5, 3);
    ctx.fill();
    ctx.restore();
  }

  function disegnaVento(x, y) {
    const v = stato.vento;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 248, 236, 0.92)';
    ctx.beginPath();
    ctx.roundRect(x - 80, y - 26, 160, 52, 14);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#7a4a22';
    ctx.stroke();
    ctx.fillStyle = '#7a4a22';
    ctx.font = '600 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VENTO', x, y - 11);
    ctx.font = '700 20px Fredoka, sans-serif';
    ctx.fillStyle = '#3b2a1a';
    ctx.fillText(Math.abs(v), x, y + 15);
    // freccia
    if (v) {
      const l = 18 + Math.abs(v) * 4.5;
      const s = Math.sign(v);
      ctx.translate(x, y + 9);
      const ondeggia = Math.sin(stato.tempo * 8) * 2;
      ctx.beginPath();
      ctx.moveTo(s * 18, 0);
      ctx.lineTo(s * (18 + l), ondeggia);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#3a8fd0';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * (26 + l), ondeggia);
      ctx.lineTo(s * (14 + l), ondeggia - 8);
      ctx.lineTo(s * (14 + l), ondeggia + 8);
      ctx.closePath();
      ctx.fillStyle = '#3a8fd0';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 18, 0);
      ctx.lineTo(-s * (18 + l * 0.5), -ondeggia);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(58, 143, 208, 0.45)';
      ctx.stroke();
    }
    ctx.restore();
  }

  function mostraMessaggio(testo, durata) { stato.messaggio = { testo, t: 0, durata }; }
  function aggiornaMessaggio(dt) {
    const m = stato.messaggio;
    if (!m) return;
    m.t += dt;
    if (m.t > m.durata) stato.messaggio = null;
  }
  function disegnaMessaggio() {
    const m = stato.messaggio;
    if (!m || (stato.modo === 'demo' && pannelloAperto())) return;
    const k = m.t / m.durata;
    const s = k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1;
    ctx.save();
    ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.translate(VW / 2, VH * 0.3);
    ctx.scale(s, s);
    ctx.font = '700 40px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#3b2a1a';
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
    pannello.querySelectorAll('canvas[data-mezzo]').forEach(disegnaAnteprima);
    const primo = pannello.querySelector('[data-primo]') || pannello.querySelector('button');
    if (primo && !touch) primo.focus({ preventScroll: true });
  }
  function nascondiPannello() {
    pannello.classList.remove('visibile');
    pannello.innerHTML = '';
  }

  const ritratto = (nome, classe = '') => {
    const src = nome === 'gino' ? BASE + 'gino/gino.png' : BASE + 'tino/tino-' + nome + '.png';
    return `<img src="${src}" alt="${nome === 'gino' ? 'Gino' : 'Tino'}" class="${classe}">`;
  };

  function testoComandi() {
    if (touch) {
      return `<div class="comandi">
        <p><b>Muoversi:</b> ◀ ▶ · <b>Alzo:</b> ▲ ▼ oppure tocca il cielo nella direzione in cui vuoi tirare.</p>
        <p><b>Tirare:</b> tieni premuto <b>TIRA</b> e lascia alla potenza giusta. Il segno rosso è la potenza del tiro prima.</p>
      </div>`;
    }
    return `<div class="comandi">
      <p><b>Muoversi:</b> <kbd>←</kbd> <kbd>→</kbd> · <b>Alzo:</b> <kbd>↑</kbd> <kbd>↓</kbd> oppure punta col mouse</p>
      <p><b>Tirare:</b> tieni premuto <kbd>Spazio</kbd> o il tasto del mouse e lascia alla potenza giusta</p>
      <p><b>Colpi:</b> <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> (il 3 è lo speciale) · <kbd>+</kbd> <kbd>−</kbd> zoom · <kbd>P</kbd> pausa · <kbd>M</kbd> suoni</p>
    </div>`;
  }

  function pannelloMenu() {
    const rec = record > 1 ? `<button class="bottone secondario" data-azione="continua">Continua dal livello ${record}</button>` : '';
    return `<div class="riquadro">
      <div class="ritratti">${ritratto('normale', 'salta specchia')}<span class="vs">contro</span>${ritratto('gino')}</div>
      <h1>Tino Bum!</h1>
      <p>Scegli il mezzo, prendi la mira e tieni d'occhio il vento: vince chi resta in piedi sull'isola!</p>
      <div class="scelte">
        <button class="bottone" data-azione="cpu" data-primo>Sfida Gino</button>
        ${rec}
        <button class="bottone secondario" data-azione="due">Due giocatori</button>
      </div>
      ${testoComandi()}
    </div>`;
  }

  let scelta = null; // { modo, livello, mezzi: [], chi }
  function pannelloScelta() {
    const chi = scelta.chi === 0 ? 'tino' : 'gino';
    const nome = chi === 'tino' ? 'Tino' : 'Gino';
    const stelle = (n) => '<span class="stelle">' + '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i></span>';
    const schede = Object.entries(MEZZI).map(([k, m]) => `
      <button class="mezzo" data-mezzo-scelto="${k}">
        <canvas data-mezzo="${k}" data-chi="${chi}" width="180" height="120"></canvas>
        <b>${m.nome}</b>
        <span class="desc">${m.descrizione}</span>
        <span class="valori">
          <span>Potenza</span>${stelle(m.stelle.potenza)}
          <span>Gittata</span>${stelle(m.stelle.gittata)}
          <span>Contro il vento</span>${stelle(m.stelle.vento)}
          <span>Movimento</span>${stelle(m.stelle.movimento)}
        </span>
        <span class="lista-colpi">${m.colpi.map((c) => c.speciale ? `<em>${c.nome}</em>` : c.nome).join(' · ')}</span>
      </button>`).join('');
    const titolo = scelta.modo === 'cpu' ? `Livello ${scelta.livello}: scegli il mezzo di Tino` : `${nome}, scegli il tuo mezzo`;
    return `<div class="riquadro largo">
      <h2>${titolo}</h2>
      <div class="mezzi">${schede}</div>
      <div class="scelte"><button class="bottone secondario" data-azione="menu">Indietro</button></div>
    </div>`;
  }

  function disegnaAnteprima(cv) {
    const c = cv.getContext('2d');
    const finto = { personaggio: cv.dataset.chi, verso: 1, festaT: 0, tremaT: 0, carica: false, morto: false, feritoT: 0, colpitoT: 0, vita: VITA, mezzo: cv.dataset.mezzo, caduta: 0 };
    const disegnaSu = () => {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      c.translate(cv.width / 2, cv.height - 10);
      c.scale(1.45, 1.45);
      ctx = c;
      disegnaPersonaggioLocale(finto, SEDILE[finto.mezzo]);
      disegnaMezzo(finto.mezzo, 45 * Math.PI / 180, 0);
      ctx = ctxPrincipale;
    };
    disegnaSu();
    for (const i of Object.values(IMG)) if (!i.complete) i.addEventListener('load', disegnaSu, { once: true });
  }

  function pannelloPausa() {
    return `<div class="riquadro">
      <div class="ritratti">${ritratto('normale')}</div>
      <h2>Pausa</h2>
      <div class="scelte">
        <button class="bottone" data-azione="riprendi" data-primo>Continua</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
      ${testoComandi()}
    </div>`;
  }

  function pannelloFine() {
    const v = stato.vincitore;
    const n = stato.livello;
    if (stato.modo === 'cpu') {
      if (v && !v.cpu) {
        return `<div class="riquadro">
          <div class="ritratti">${ritratto('normale', 'salta specchia')}${ritratto('gino', 'caduto')}</div>
          <h2>Livello ${n} superato!</h2>
          <p>Bum! Tino ha vinto. Gino però si allena: al prossimo livello mirerà meglio e il vento sarà più forte.</p>
          <div class="scelte">
            <button class="bottone" data-azione="prossimo" data-primo>Livello ${n + 1}</button>
            <button class="bottone secondario" data-azione="menu">Menu</button>
          </div>
        </div>`;
      }
      return `<div class="riquadro">
        <div class="ritratti">${ritratto('ko')}${ritratto('gino', 'salta')}</div>
        <h2>Ha vinto Gino!</h2>
        <p>Tino non si arrende: un'altra isola, un'altra sfida.</p>
        <div class="scelte">
          <button class="bottone" data-azione="riprova" data-primo>Riprova il livello ${n}</button>
          <button class="bottone secondario" data-azione="menu">Menu</button>
        </div>
      </div>`;
    }
    const vinceTino = v && v.personaggio === 'tino';
    const rit = !v ? `${ritratto('ko')}${ritratto('gino', 'caduto')}`
      : vinceTino ? `${ritratto('normale', 'salta specchia')}${ritratto('gino', 'caduto')}` : `${ritratto('ko')}${ritratto('gino', 'salta')}`;
    return `<div class="riquadro">
      <div class="ritratti">${rit}</div>
      <h2>${v ? 'Vince ' + v.nome + '!' : 'Pareggio!'}</h2>
      <p>Si fa la rivincita su un'isola nuova?</p>
      <div class="scelte">
        <button class="bottone" data-azione="due" data-primo>Rivincita</button>
        <button class="bottone secondario" data-azione="menu">Menu</button>
      </div>
    </div>`;
  }

  function apriScelta(modo, livello) {
    scelta = { modo, livello, mezzi: [], chi: 0 };
    mostraPannello(pannelloScelta());
  }

  pannello.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mezzo-scelto]');
    if (m && scelta) {
      scelta.mezzi[scelta.chi] = m.dataset.mezzoScelto;
      suoni.clic();
      if (scelta.modo === 'due' && scelta.chi === 0) {
        scelta.chi = 1;
        mostraPannello(pannelloScelta());
        return;
      }
      ultimeScelte = { ...scelta };
      iniziaPartita(scelta.modo, scelta.livello, { mezzo0: scelta.mezzi[0], mezzo1: scelta.mezzi[1] });
      scelta = null;
      return;
    }
    const b = e.target.closest('button[data-azione]');
    if (!b) return;
    switch (b.dataset.azione) {
      case 'cpu': apriScelta('cpu', 1); break;
      case 'continua': apriScelta('cpu', record); break;
      case 'due': apriScelta('due', 1); break;
      case 'prossimo': apriScelta('cpu', stato.livello + 1); break;
      case 'riprova': iniziaPartita('cpu', stato.livello, { mezzo0: ultimeScelte ? ultimeScelte.mezzi[0] : null }); break;
      case 'riprendi': riprendi(); break;
      case 'menu': vaiAlMenu(); break;
      default: break;
    }
  });
  let ultimeScelte = null;

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
    if (!stato.test) aggiorna(dt);
    disegna();
    requestAnimationFrame(ciclo);
  }
  requestAnimationFrame(ciclo);

  window.tinoBum = {
    stato, FISICA, TURNO, IA, MEZZI, iniziaPartita, aggiorna, simulaTiro, cercaTiro, pianificaIA,
    spara, danno, passoCammino, cammina,
  };
})();
