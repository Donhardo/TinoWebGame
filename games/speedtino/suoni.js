/*
 * Speedtino: suoni e musica, tutto Web Audio (nessun file).
 * La musica imita i tracker dell'Amiga: quattro canali (basso, accordo ad arpeggio
 * veloce, melodia a onda quadra, batteria di rumore), sedicesimi a 150 bpm.
 */
(function (radice) {
  'use strict';

  let ac = null, uscita = null, busMusica = null, busEffetti = null, rumore = null, quadre = {};
  let muto = false, musicaSpenta = false, livelloMusica = 'menu';
  // ogni tappa sposta il brano di tono e ne cambia la velocità
  let trasporto = 1, bpmGioco = 150;

  function avvia() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ac = new C();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    uscita = ac.createGain(); uscita.gain.value = muto ? 0 : 0.8;
    uscita.connect(comp); comp.connect(ac.destination);
    busMusica = ac.createGain(); busMusica.gain.value = musicaSpenta ? 0 : 0.42; busMusica.connect(uscita);
    busEffetti = ac.createGain(); busEffetti.gain.value = 0.7; busEffetti.connect(uscita);
    const n = ac.sampleRate;
    rumore = ac.createBuffer(1, n, n);
    const d = rumore.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    // onde "a impulso" con duty diversi, come i campioni dei tracker
    for (const duty of [0.125, 0.25, 0.5]) {
      const N = 32, re = new Float32Array(N), im = new Float32Array(N);
      for (let k = 1; k < N; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * (k % 2 || duty !== 0.5 ? 1 : 0);
      quadre[duty] = ac.createPeriodicWave(re, im);
    }
    programmaMusica();
    return ac;
  }

  const ora = () => ac.currentTime;
  const nota = n => {
    const m = /^([A-G])(#?)(\d)$/.exec(n);
    const i = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
    return 440 * Math.pow(2, (i + (Number(m[3]) + 1) * 12 - 69) / 12);
  };

  function tono(f0, f1, durata, { onda = 0.5, vol = 0.3, bus = busEffetti, t = ora(), attacco = 0.004 } = {}) {
    const o = ac.createOscillator(), g = ac.createGain();
    if (typeof onda === 'number') o.setPeriodicWave(quadre[onda]); else o.type = onda;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + durata);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attacco);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + durata + 0.02);
  }

  function soffio(durata, { vol = 0.3, filtro = 'bandpass', f = 2000, f1 = f, q = 1, bus = busEffetti, t = ora() } = {}) {
    const s = ac.createBufferSource(); s.buffer = rumore;
    const fl = ac.createBiquadFilter(); fl.type = filtro; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f1 !== f) fl.frequency.exponentialRampToValueAtTime(f1, t + durata);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
    s.connect(fl); fl.connect(g); g.connect(bus);
    s.start(t, Math.random() * 0.5); s.stop(t + durata + 0.02);
  }

  const EFFETTI = {
    salto() { tono(260, 620, 0.12, { onda: 0.25, vol: 0.22 }); },
    parete() { tono(330, 700, 0.1, { onda: 0.125, vol: 0.2 }); soffio(0.05, { vol: 0.12, f: 3000 }); },
    atterra() { soffio(0.06, { vol: 0.12, filtro: 'lowpass', f: 600 }); },
    rampino() { soffio(0.05, { vol: 0.2, f: 4500, q: 3 }); tono(900, 1500, 0.06, { onda: 0.125, vol: 0.12 }); },
    mancato() { tono(500, 300, 0.08, { onda: 0.125, vol: 0.1 }); },
    stacca() { tono(520, 900, 0.09, { onda: 0.25, vol: 0.16 }); },
    ghianda() { const t = ora(); tono(1318, 1318, 0.06, { onda: 0.5, vol: 0.14, t }); tono(1976, 1976, 0.12, { onda: 0.5, vol: 0.14, t: t + 0.06 }); },
    morte() {
      const t = ora();
      tono(600, 60, 0.45, { onda: 'sawtooth', vol: 0.22, t });
      soffio(0.35, { vol: 0.35, filtro: 'lowpass', f: 3000, f1: 200, t });
      if (busMusica) { busMusica.gain.cancelScheduledValues(t); busMusica.gain.setValueAtTime(0.12, t); busMusica.gain.linearRampToValueAtTime(musicaSpenta ? 0 : 0.42, t + 0.9); }
    },
    rinasce() { tono(400, 800, 0.1, { onda: 0.5, vol: 0.1 }); },
    stanza() { const t = ora(); ['E5', 'A5', 'C6'].forEach((n, i) => tono(nota(n), nota(n), 0.09, { onda: 0.25, vol: 0.09, t: t + i * 0.05 })); },
    liberato() {
      const t = ora();
      ['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6'].forEach((n, i) => tono(nota(n), nota(n), i === 6 ? 0.4 : 0.1, { onda: 0.5, vol: 0.13, t: t + i * 0.07 }));
      ['C4', 'G4'].forEach((n, i) => tono(nota(n), nota(n), 0.5, { onda: 0.25, vol: 0.12, t: t + 0.42 + i * 0.001 }));
    },
    gabbia() { soffio(0.25, { vol: 0.3, filtro: 'bandpass', f: 1200, f1: 3000, q: 2 }); tono(220, 880, 0.25, { onda: 0.125, vol: 0.12 }); },
    record() { const t = ora(); ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => tono(nota(n), nota(n), 0.14, { onda: 0.5, vol: 0.12, t: t + i * 0.08 })); }
  };

  // ---------- musica ----------
  const BRANO = {
    accordi: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E'],
    toni: {
      Am: ['A3', 'C4', 'E4'], F: ['F3', 'A3', 'C4'], C: ['C4', 'E4', 'G4'], G: ['G3', 'B3', 'D4'], E: ['E3', 'G#3', 'B3']
    },
    bassi: { Am: 'A1', F: 'F1', C: 'C2', G: 'G1', E: 'E1' },
    melodia: [
      'E5 - A4 - C5 - E5 - D5 - C5 - B4 - A4 -',
      'C5 - - - A4 - C5 - F5 - E5 - C5 - - -',
      'G5 - E5 - C5 - E5 - G5 - A5 - G5 - E5 -',
      'D5 - - - B4 - D5 - G5 - - - F5 - D5 -',
      'E5 - A4 - C5 - E5 - A5 - G5 - E5 - C5 -',
      'F5 - - - E5 - C5 - A4 - C5 - F5 - A5 -',
      'G5 - - - D5 - B4 - D5 - G5 - B5 - A5 -',
      'G#5 - - - E5 - B4 - G#4 - B4 - E5 - - -'
    ].map(r => r.split(' '))
  };
  const STILI = {
    menu: { bpm: 118, batteria: false, melodia: 0.08, arpeggio: 0.05, basso: 0.2 },
    gioco: { bpm: 150, batteria: true, melodia: 0.1, arpeggio: 0.05, basso: 0.22 }
  };
  let passoMusica = 0, prossima = 0, timer = null;
  const bpm = () => (livelloMusica === 'gioco' ? bpmGioco : STILI[livelloMusica].bpm);

  function suonaPasso(i, t) {
    const st = STILI[livelloMusica], s16 = 60 / bpm() / 4;
    const k = livelloMusica === 'gioco' ? trasporto : 1;
    const battuta = Math.floor(i / 16) % 8, p = i % 16;
    const acc = BRANO.accordi[battuta];
    // basso: ottavi che saltano d'ottava
    if (p % 2 === 0) {
      const f = nota(BRANO.bassi[acc]) * (p % 4 === 2 ? 2 : 1) * k;
      tono(f, f, s16 * 1.7, { onda: 0.25, vol: st.basso, bus: busMusica, t });
    }
    // arpeggio veloce, un'ottava sopra
    const ar = nota(BRANO.toni[acc][p % 3]) * k;
    tono(ar * 2, ar * 2, s16 * 0.9, { onda: 0.125, vol: st.arpeggio, bus: busMusica, t });
    // melodia
    const m = BRANO.melodia[battuta][p];
    if (m !== '-') {
      let lun = 1;
      while (p + lun < 16 && BRANO.melodia[battuta][p + lun] === '-') lun++;
      const f = nota(m) * k;
      tono(f, f, s16 * lun * 0.95, { onda: 0.5, vol: st.melodia, bus: busMusica, t, attacco: 0.01 });
    }
    if (st.batteria) {
      if (p % 8 === 0 || p === 10) tono(140, 40, 0.16, { onda: 'sine', vol: 0.55, bus: busMusica, t });
      if (p % 8 === 4) soffio(0.13, { vol: 0.32, f: 1800, q: 0.8, bus: busMusica, t });
      if (p % 2 === 1) soffio(0.03, { vol: 0.09, filtro: 'highpass', f: 7000, bus: busMusica, t });
    }
  }

  function programmaMusica() {
    if (timer) return;
    prossima = ora() + 0.1;
    timer = setInterval(() => {
      if (!ac || ac.state !== 'running') return;
      const s16 = 60 / bpm() / 4;
      if (prossima < ora()) prossima = ora() + 0.05;
      while (prossima < ora() + 0.2) {
        if (!musicaSpenta && !muto) suonaPasso(passoMusica, prossima);
        passoMusica++;
        prossima += s16;
      }
    }, 50);
  }

  const API = {
    avvia,
    effetto(nome) { if (!ac || muto || ac.state !== 'running') return; EFFETTI[nome](); },
    musica(livello) { if (livello !== livelloMusica) { livelloMusica = livello; passoMusica = 0; } },
    // tappa: semitoni di trasporto e velocità della musica in corsa
    tappa(semitoni, velocita) { trasporto = Math.pow(2, semitoni / 12); bpmGioco = velocita; },
    muto(v) { muto = v; if (uscita) uscita.gain.value = v ? 0 : 0.8; },
    musicaSpenta(v) { musicaSpenta = v; if (busMusica) busMusica.gain.value = v ? 0 : 0.42; },
    pausa(v) { if (!ac) return; if (v) ac.suspend(); else ac.resume(); }
  };
  radice.SpeedtinoSuoni = API;
})(this);
