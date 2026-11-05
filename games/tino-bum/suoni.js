/*
 * Tino Bum! — suoni, tutti sintetizzati con Web Audio (nessun file).
 *
 * Due famiglie:
 * - effetti brevi (TB.audio.effetti.*): tiri di ogni mezzo, esplosioni,
 *   tonfi, voci dei personaggi, oggetti, campanelli dei turni, musichette;
 * - suoni continui (TB.audio.continui), aggiornati a ogni fotogramma dal
 *   gioco: vento, carica della potenza, motore del mezzo, fischio del colpo
 *   in volo, trivella sotto terra e rumori di fondo dell'ambientazione.
 * Tutto passa da un compressore, così i BADABUM non gracchiano.
 */
(() => {
  'use strict';
  const TB = window.TinoBum = window.TinoBum || {};

  let a = null;
  let permesso = false;
  let sospeso = false;
  let effetti = null, ambiente = null;
  let bufferRumore = null;

  function contesto(sempre) {
    if (!permesso && !sempre) return null;
    try {
      if (!a) {
        a = new (window.AudioContext || window.webkitAudioContext)();
        const comp = a.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 10;
        comp.ratio.value = 5;
        comp.attack.value = 0.003;
        comp.release.value = 0.25;
        const uscita = a.createGain();
        uscita.gain.value = 0.9;
        uscita.connect(comp).connect(a.destination);
        effetti = a.createGain();
        effetti.connect(uscita);
        ambiente = a.createGain();
        ambiente.gain.value = 0.6;
        ambiente.connect(uscita);
        bufferRumore = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
        const d = bufferRumore.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (a.state === 'suspended' && !sospeso) a.resume();
      return a;
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------------- mattoncini
  // tono: oscillatore con scivolata di frequenza e inviluppo (attacco breve, coda esponenziale)
  function tono(f, d, o = {}) {
    const c = contesto();
    if (!c) return;
    const t = c.currentTime + (o.rit || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.tipo || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.scivola || d));
    if (o.vibrato) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = o.vibrato;
      lg.gain.value = f * (o.profondita || 0.04);
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + d + 0.05);
    }
    const att = o.attacco || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.06, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let nodo = osc.connect(g);
    if (o.filtro) {
      const fl = c.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = o.filtro;
      nodo = nodo.connect(fl);
    }
    nodo.connect(o.bus || effetti);
    osc.start(t);
    osc.stop(t + d + 0.05);
  }

  // rumore filtrato: esplosioni, fruscii, spruzzi
  function rumore(d, o = {}) {
    const c = contesto();
    if (!c) return;
    const t = c.currentTime + (o.rit || 0);
    const s = c.createBufferSource();
    s.buffer = bufferRumore;
    s.playbackRate.value = o.velocita || 1;
    const fl = c.createBiquadFilter();
    fl.type = o.tipo || 'lowpass';
    fl.Q.value = o.q || 0.8;
    fl.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + d);
    const g = c.createGain();
    const att = o.attacco || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.08, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl).connect(g).connect(o.bus || effetti);
    s.start(t, Math.random() * 1.5);
    s.stop(t + d + 0.05);
  }

  const note = (lista, passo, o) => lista.forEach((f, i) => f && tono(f, o.d || passo * 1.6, { ...o, rit: (o.rit || 0) + i * passo }));
  const caso = (x, y) => x + Math.random() * (y - x);

  // ---------------------------------------------------------------- effetti
  const VOCI = {
    tino: 520, gino: 760, retino: 330, timbro: 300, capo: 210,
  };

  const E = {
    clic: () => tono(1100, 0.03, { tipo: 'square', vol: 0.02, filtro: 3000 }),

    // tiro: ogni mezzo ha il suo; p = potenza 0..1
    tiro(mezzo, p, colpo = {}) {
      const v = 0.6 + p * 0.4;
      if (colpo.teletrasporto) {
        note([880, 1175, 1568, 2093], 0.05, { tipo: 'triangle', vol: 0.045, d: 0.25 });
        rumore(0.3, { tipo: 'highpass', f: 6000, vol: 0.025 });
        return;
      }
      switch (mezzo) {
        case 'catapulta':
          tono(150, 0.14, { f2: 60, vol: 0.16 * v });                       // tonfo del legno
          rumore(0.08, { f: 900, vol: 0.12 * v });
          rumore(0.22, { tipo: 'bandpass', f: 900, f2: 2600, q: 1.2, vol: 0.07 * v, rit: 0.02 }); // swish
          tono(95, 0.12, { tipo: 'triangle', f2: 80, vol: 0.05, rit: 0.08 }); // scricchiolio
          break;
        case 'fionda':
          tono(190, 0.2, { tipo: 'triangle', f2: 520, scivola: 0.05, vol: 0.09 * v, vibrato: 28, profondita: 0.08 }); // elastico
          rumore(0.18, { tipo: 'bandpass', f: 1600, f2: 4000, q: 1.5, vol: 0.06 * v });
          break;
        case 'mortaio':
          tono(85, 0.45, { f2: 34, vol: 0.24 * v });                         // tuuump
          rumore(0.4, { f: 500, f2: 70, vol: 0.16 * v });
          tono(240, 0.12, { tipo: 'triangle', f2: 120, vol: 0.05, rit: 0.03 });
          break;
        case 'cannone':
          tono(1000, 0.06, { tipo: 'square', f2: 260, vol: 0.07 * v, filtro: 2500 }); // pop del tappo
          rumore(0.05, { tipo: 'bandpass', f: 3200, q: 1.5, vol: 0.1 * v });
          tono(420, 0.12, { f2: 180, vol: 0.06 * v, rit: 0.01 });
          break;
        case 'talpa':
          tono(110, 0.3, { tipo: 'sawtooth', f2: 320, vol: 0.09 * v, filtro: 1200 });
          rumore(0.25, { f: 1200, f2: 300, vol: 0.13 * v });
          break;
        case 'bolle':
          for (let i = 0; i < 4; i++) tono(caso(300, 500), 0.12, { f2: caso(900, 1400), vol: 0.075 * v, rit: i * caso(0.03, 0.06) });
          rumore(0.25, { tipo: 'bandpass', f: 700, q: 0.7, vol: 0.05 * v }); // soffio
          break;
        default:
          tono(200 + p * 200, 0.18, { tipo: 'triangle', f2: 600, vol: 0.07 });
          rumore(0.15, { f: 2500, f2: 400, vol: 0.08 });
      }
    },

    // esplosione: k = grandezza (circa 0,4..1,5)
    bum(k) {
      tono(120, 0.35 + k * 0.3, { f2: 30, vol: 0.22 + k * 0.08 });           // botta nel petto
      rumore(0.18 + k * 0.08, { f: 4500, f2: 400, vol: 0.14 + k * 0.08 });  // schiocco
      rumore(0.6 + k * 0.6, { f: 380, f2: 50, vol: 0.12 + k * 0.08, attacco: 0.02 }); // rombo
      const n = Math.round(3 + k * 5);                                       // zolle che ricadono
      for (let i = 0; i < n; i++) rumore(0.04, { tipo: 'bandpass', f: caso(900, 2600), q: 2, vol: caso(0.015, 0.04), rit: caso(0.25, 0.8) });
    },

    rimbalzo: () => { tono(240, 0.16, { tipo: 'triangle', f2: 560, vol: 0.07 }); rumore(0.04, { f: 1500, vol: 0.05 }); },
    divide: () => { tono(1300, 0.07, { tipo: 'square', f2: 600, vol: 0.03, filtro: 3500 }); note([1568, 2093], 0.04, { vol: 0.025, d: 0.1 }); },
    trivella: () => { rumore(0.35, { f: 900, f2: 200, vol: 0.09 }); tono(130, 0.3, { tipo: 'sawtooth', f2: 80, vol: 0.035, filtro: 900 }); },
    atterra: () => { tono(90, 0.12, { f2: 50, vol: 0.09 }); rumore(0.1, { f: 700, vol: 0.06 }); },

    // finisce nel liquido: acqua (spruzzo) o inchiostro (blop denso)
    splash(liquido, grande) {
      const k = grande ? 1.4 : 1;
      if (liquido === 'inchiostro') {
        tono(320, 0.25, { f2: 70, vol: 0.12 * k });
        tono(180, 0.3, { f2: 55, vol: 0.08 * k, rit: 0.06 });
        rumore(0.3, { f: 900, f2: 150, vol: 0.08 * k });
        for (let i = 0; i < 3; i++) tono(caso(200, 320), 0.08, { f2: caso(500, 700), vol: 0.03, rit: 0.25 + i * caso(0.08, 0.15) });
      } else {
        rumore(0.5 * k, { tipo: 'bandpass', f: 2500, f2: 600, q: 0.6, vol: 0.12 * k });
        tono(520, 0.2, { f2: 140, vol: 0.04 * k });
        for (let i = 0; i < 4; i++) tono(caso(600, 1000), 0.06, { f2: caso(1400, 2200), vol: 0.02, rit: 0.2 + i * caso(0.05, 0.12) });
      }
    },

    // voce di chi viene colpito: più acuta per Gino, più bassa per gli agenti
    ahi(chi, d) {
      const f = VOCI[chi] || 500;
      const v = Math.min(0.09, 0.04 + d / 4000);
      tono(f * 1.25, 0.16, { tipo: 'triangle', f2: f * 0.8, vol: v, vibrato: 18, profondita: 0.06 });
      tono(f * 2.5, 0.12, { tipo: 'sine', f2: f * 1.6, vol: v * 0.4 });
      if (d >= 180) tono(f, 0.3, { tipo: 'triangle', f2: f * 0.55, vol: v * 0.8, rit: 0.16, vibrato: 12, profondita: 0.08 });
    },
    // KO: fischio che scende
    ko(chi) {
      const f = (VOCI[chi] || 500) * 1.6;
      tono(f, 0.9, { tipo: 'triangle', f2: f * 0.3, vol: 0.07, vibrato: 7, profondita: 0.05 });
      tono(70, 0.25, { f2: 40, vol: 0.1, rit: 0.85 });
    },

    turno(umano) {
      if (umano) note([660, 880], 0.09, { tipo: 'triangle', vol: 0.06, d: 0.14 });
      else note([523, 659], 0.09, { tipo: 'triangle', vol: 0.035, d: 0.12 });
    },
    // ultimi secondi del turno: tic tac di legnetto, più acuto alla fine
    tic: (n) => { tono(n <= 2 ? 1800 : 1300, 0.05, { tipo: 'square', vol: 0.03, filtro: 2600 }); rumore(0.02, { tipo: 'bandpass', f: 3000, q: 3, vol: 0.03 }); },
    scaduto: () => { tono(180, 0.35, { tipo: 'sawtooth', vol: 0.045, filtro: 900 }); tono(140, 0.35, { tipo: 'sawtooth', vol: 0.04, filtro: 900, rit: 0.02 }); },
    speciale: () => note([784, 988, 1175, 1568], 0.07, { tipo: 'triangle', vol: 0.05, d: 0.3, vibrato: 6, profondita: 0.015 }),

    oggetto(tipo) {
      if (tipo === 'cerotto') note([523, 659, 784, 1046], 0.08, { tipo: 'triangle', vol: 0.06, d: 0.25 });
      else if (tipo === 'ombrello') { rumore(0.2, { tipo: 'bandpass', f: 600, f2: 1800, q: 1, vol: 0.09 }); tono(330, 0.15, { tipo: 'triangle', f2: 500, vol: 0.05, rit: 0.12 }); }
      else if (tipo === 'doppio') note([880, 0, 880, 1175], 0.07, { tipo: 'square', vol: 0.03, d: 0.08, filtro: 3000 });
      else if (tipo === 'vento') { rumore(0.7, { tipo: 'bandpass', f: 1400, f2: 250, q: 1, vol: 0.1, attacco: 0.05 }); tono(600, 0.5, { f2: 200, vol: 0.03 }); }
      else if (tipo === 'teletrasporto') note([1568, 1319, 1047, 1319, 1568, 2093], 0.045, { tipo: 'triangle', vol: 0.045, d: 0.2 });
      else note([784, 1175], 0.08, { tipo: 'triangle', vol: 0.06, d: 0.16 });
    },
    magica: () => { note([523, 784, 1046, 1568], 0.05, { tipo: 'triangle', vol: 0.05, d: 0.3 }); rumore(0.4, { tipo: 'highpass', f: 5000, vol: 0.03 }); },
    // l'ombrello para metà del colpo
    parata: () => { tono(700, 0.12, { tipo: 'triangle', f2: 350, vol: 0.06 }); rumore(0.06, { tipo: 'bandpass', f: 1800, q: 2, vol: 0.06 }); },
    bolla: () => tono(420, 0.35, { f2: 1100, vol: 0.07, vibrato: 14, profondita: 0.1 }),
    scoppio: () => { tono(1500, 0.05, { tipo: 'square', f2: 300, vol: 0.05, filtro: 4000 }); rumore(0.08, { tipo: 'highpass', f: 2500, vol: 0.08 }); },

    vittoria: () => {
      note([523, 659, 784, 1046, 0, 784, 1046], 0.13, { tipo: 'triangle', vol: 0.07, d: 0.22 });
      note([262, 330, 392, 523], 0.26, { tipo: 'sine', vol: 0.05, d: 0.4 });
    },
    sconfitta: () => {
      note([392, 370, 349, 330], 0.22, { tipo: 'triangle', vol: 0.06, d: 0.3, vibrato: 5, profondita: 0.02 });
      tono(262, 0.8, { tipo: 'triangle', f2: 196, vol: 0.05, rit: 0.9, vibrato: 5, profondita: 0.03 });
    },
  };

  // ---------------------------------------------------------------- continui
  // ogni voce è un generatore sempre acceso con il volume a zero quando tace
  const voci = {};
  function voce(nome, crea) {
    if (voci[nome]) return voci[nome];
    const c = contesto();
    if (!c) return null;
    const g = c.createGain();
    g.gain.value = 0;
    voci[nome] = { g, ...crea(c, g) };
    return voci[nome];
  }
  const sorgenteRumore = (c) => {
    const s = c.createBufferSource();
    s.buffer = bufferRumore;
    s.loop = true;
    s.start();
    return s;
  };
  const verso = (v, valore, k = 0.08) => v && v.g.gain.setTargetAtTime(valore, a.currentTime, k);

  const CREA = {
    vento: (c, g) => {
      const s = sorgenteRumore(c);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 0.9;
      f.frequency.value = 500;
      s.connect(f).connect(g).connect(ambiente);
      return { f };
    },
    carica: (c, g) => {
      const o = c.createOscillator();
      o.type = 'triangle';
      const o2 = c.createOscillator();
      o2.type = 'sine';
      o.connect(g);
      o2.connect(g);
      g.connect(effetti);
      o.start();
      o2.start();
      return { o, o2 };
    },
    motore: (c, g) => {
      const o = c.createOscillator();
      o.type = 'square';
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 380;
      const trem = c.createGain();
      trem.gain.value = 0.6;
      const lfo = c.createOscillator();
      lfo.frequency.value = 9;
      const lg = c.createGain();
      lg.gain.value = 0.4;
      lfo.connect(lg).connect(trem.gain);
      o.connect(f).connect(trem).connect(g).connect(effetti);
      o.start();
      lfo.start();
      return { o, lfo };
    },
    volo: (c, g) => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.connect(g).connect(effetti);
      o.start();
      return { o };
    },
    scavo: (c, g) => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 95;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 650;
      const s = sorgenteRumore(c);
      const fs = c.createBiquadFilter();
      fs.type = 'lowpass';
      fs.frequency.value = 900;
      const gs = c.createGain();
      gs.gain.value = 0.6;
      o.connect(f).connect(g);
      s.connect(fs).connect(gs).connect(g);
      g.connect(effetti);
      o.start();
      return { o };
    },
    // onde del mare: rumore basso che cresce e cala piano
    onde: (c, g) => {
      const s = sorgenteRumore(c);
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 520;
      s.connect(f).connect(g).connect(ambiente);
      return {};
    },
  };

  // rumori di fondo a intervalli: uccellini, gabbiani, foglie, uffici
  const SFONDO = {
    prato: () => {
      const f = caso(2600, 3600), n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) tono(f, 0.07, { f2: f * caso(1.15, 1.4), vol: 0.018, rit: i * 0.1, bus: ambiente });
      return caso(2.5, 6);
    },
    spiaggia: () => {
      // gabbiano
      if (Math.random() < 0.5) {
        for (let i = 0; i < 2; i++) tono(1250, 0.22, { tipo: 'triangle', f2: 850, vol: 0.016, rit: i * 0.26, vibrato: 30, profondita: 0.03, bus: ambiente });
      }
      return caso(5, 10);
    },
    autunno: () => {
      rumore(caso(0.4, 0.9), { tipo: 'highpass', f: 3500, vol: 0.02, attacco: 0.15, bus: ambiente }); // fruscio di foglie
      if (Math.random() < 0.25) rumore(0.03, { tipo: 'bandpass', f: 1800, q: 3, vol: 0.03, rit: 0.3, bus: ambiente }); // rametto
      return caso(2.5, 5);
    },
    uffici: () => {
      const r = Math.random();
      if (r < 0.55) {
        // qualcuno batte a macchina
        const n = 5 + Math.floor(Math.random() * 9);
        let t = 0;
        for (let i = 0; i < n; i++) {
          t += caso(0.07, 0.16);
          rumore(0.025, { tipo: 'bandpass', f: caso(2500, 3500), q: 4, vol: 0.03, rit: t, bus: ambiente });
        }
        tono(1600, 0.25, { tipo: 'triangle', vol: 0.015, rit: t + 0.15, bus: ambiente }); // fine riga: ding
      } else if (r < 0.75) {
        // telefono lontano
        for (let i = 0; i < 2; i++) tono(1320, 0.5, { tipo: 'square', vol: 0.008, filtro: 2500, rit: i * 0.75, vibrato: 22, profondita: 0.08, bus: ambiente });
      } else {
        // timbro lontano
        tono(120, 0.12, { f2: 60, vol: 0.04, bus: ambiente });
        rumore(0.05, { f: 800, vol: 0.03, bus: ambiente });
      }
      return caso(3, 7);
    },
  };
  let prossimoSfondo = 2;

  /*
   * p: { attivo, vento (-10..10), carica (0..1 o null), motore (nome mezzo o null),
   *      volo ({ vy, bolla } o null), scavo (bool), ambiente }
   */
  const MOTORI = { catapulta: 55, fionda: 72, mortaio: 40, cannone: 62, talpa: 48, bolle: 85 };
  function continui(p, dt) {
    if (!a) { if (permesso && p.attivo) contesto(); if (!a) return; }
    const zitto = !permesso || !p.attivo;
    if (zitto) {
      for (const v of Object.values(voci)) verso(v, 0, 0.05);
      return;
    }
    const t = a.currentTime;
    // vento: più forte e più acuto quando tira di più, a raffiche
    const w = Math.abs(p.vento) / 10;
    const vv = voce('vento', CREA.vento);
    const raffica = 0.75 + 0.25 * Math.sin(t * 0.9) * Math.sin(t * 0.37 + 1);
    verso(vv, (0.004 + w * w * 0.17) * raffica * (p.ambiente === 'uffici' ? 0.6 : 1), 0.3);
    vv.f.frequency.setTargetAtTime(280 + w * 650 * raffica, t, 0.3);

    const vc = voce('carica', CREA.carica);
    if (p.carica !== null) {
      vc.o.frequency.setTargetAtTime(170 + p.carica * 680, t, 0.02);
      vc.o2.frequency.setTargetAtTime((170 + p.carica * 680) * 2.01, t, 0.02);
      verso(vc, 0.025 + p.carica * 0.025, 0.02);
    } else verso(vc, 0, 0.02);

    const vm = voce('motore', CREA.motore);
    if (p.motore) {
      vm.o.frequency.setTargetAtTime(MOTORI[p.motore] || 55, t, 0.05);
      verso(vm, 0.05, 0.04);
    } else verso(vm, 0, 0.06);

    // fischio: sale mentre il colpo sale, scende mentre cade
    const vo = voce('volo', CREA.volo);
    if (p.volo && !p.scavo) {
      const f = p.volo.bolla ? 500 + Math.sin(t * 22) * 80 : Math.max(280, Math.min(1700, 950 - p.volo.vy * 0.9));
      vo.o.frequency.setTargetAtTime(f, t, 0.03);
      verso(vo, p.volo.bolla ? 0.012 : 0.02, 0.05);
    } else verso(vo, 0, 0.05);

    verso(voce('scavo', CREA.scavo), p.scavo ? 0.07 : 0, 0.05);

    const von = voce('onde', CREA.onde);
    verso(von, p.ambiente === 'spiaggia' ? 0.02 + 0.045 * (0.5 + 0.5 * Math.sin(t * 0.85)) : 0, 0.4);

    prossimoSfondo -= dt;
    if (prossimoSfondo <= 0) prossimoSfondo = SFONDO[p.ambiente] ? SFONDO[p.ambiente]() : 4;
  }

  TB.audio = {
    // si suona solo se il gioco lo permette (non muto, non nel menu)
    permetti(si) { permesso = !!si; },
    // al primo tocco o tasto: i browser fanno partire l'audio solo dopo un gesto
    sblocca() { if (!sospeso) contesto(true); },
    // scheda nascosta: si ferma tutto
    sospendi(si) {
      sospeso = !!si;
      if (!a) return;
      try { if (si) a.suspend(); else a.resume(); } catch (e) { /* niente */ }
    },
    effetti: E,
    continui,
  };
})();
