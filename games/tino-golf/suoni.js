/*
 * Tino Golf: suoni e musica, tutto sintetizzato con Web Audio (nessun file).
 */
let ctx = null, uscita = null, bus = null, busMusica = null, rumore = null;
export const audio = { muto: false, musicaSpenta: false };

function avvia() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  comp.connect(ctx.destination);
  uscita = ctx.createGain();
  uscita.connect(comp);
  bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(uscita);
  busMusica = ctx.createGain(); busMusica.gain.value = 0; busMusica.connect(uscita);
  const n = ctx.sampleRate;
  rumore = ctx.createBuffer(1, n, n);
  const d = rumore.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  aggiornaVolumi();
  return ctx;
}

export function sblocca() {
  const c = avvia();
  if (c && c.state === 'suspended') c.resume();
}

export function aggiornaVolumi(silenzio = false) {
  if (!ctx) return;
  const t = ctx.currentTime;
  uscita.gain.setTargetAtTime(audio.muto || silenzio ? 0 : 1, t, 0.05);
  busMusica.gain.setTargetAtTime(audio.musicaSpenta ? 0 : 0.32, t, 0.3);
}

function tono(tipo, f0, f1, dur, vol, quando = 0, dest = bus) {
  const t = ctx.currentTime + quando;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.02);
}

function soffio(f0, f1, q, dur, vol, quando = 0, tipo = 'bandpass') {
  const t = ctx.currentTime + quando;
  const s = ctx.createBufferSource(); s.buffer = rumore;
  const f = ctx.createBiquadFilter(); f.type = tipo; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

const E = {
  colpo(f = 0.5) {
    tono('sine', 900, 380, 0.09, 0.25 + f * 0.3);
    soffio(2600, 1400, 2, 0.05, 0.25 + f * 0.25);
  },
  sponda(v = 1) {
    const k = Math.min(1, v / 5);
    tono('sine', 260 + k * 80, 150, 0.14, 0.08 + k * 0.22);
  },
  bordo(v = 1) {
    const k = Math.min(1, v / 5);
    tono('triangle', 170, 90, 0.12, 0.08 + k * 0.2);
  },
  fungo() {
    tono('sine', 320, 760, 0.16, 0.25);
    tono('sine', 760, 520, 0.12, 0.12, 0.12);
  },
  palo(v = 1) { tono('sine', 520, 300, 0.12, 0.1 + Math.min(0.2, v / 25)); },
  labbro() { tono('sine', 1500, 1300, 0.08, 0.15); tono('sine', 1900, 1700, 0.06, 0.08, 0.05); },
  buca() {
    tono('triangle', 300, 120, 0.18, 0.3);
    [784, 988, 1175, 1568].forEach((f, i) => tono('sine', f, f, 0.25, 0.14, 0.12 + i * 0.08));
  },
  acqua() {
    soffio(1800, 300, 1.2, 0.5, 0.35, 0, 'lowpass');
    tono('sine', 500, 180, 0.2, 0.12, 0.02);
    [0.12, 0.2, 0.3].forEach((q, i) => tono('sine', 900 + i * 200, 1400, 0.06, 0.06, q));
  },
  miele() { soffio(500, 180, 3, 0.25, 0.3, 0, 'lowpass'); tono('sine', 140, 80, 0.2, 0.12); },
  tele() {
    tono('sine', 300, 1300, 0.35, 0.18);
    [1568, 2093, 2637].forEach((f, i) => tono('sine', f, f, 0.12, 0.07, 0.15 + i * 0.06));
  },
  molla() { tono('sine', 180, 900, 0.22, 0.25); tono('sine', 900, 600, 0.15, 0.1, 0.2); },
  presa() {
    [520, 1301, 1873].forEach((f, i) => tono('sine', f, f * 0.995, 0.9 - i * 0.2, 0.12 / (i + 1)));
    tono('triangle', 120, 80, 0.15, 0.2);
  },
  sputa() { tono('sine', 220, 520, 0.12, 0.2); },
  campanaGiu() { soffio(800, 300, 1, 0.18, 0.06, 0, 'lowpass'); },
  fuori() { tono('sine', 900, 200, 0.7, 0.14); },
  atterra(v = 1) { tono('sine', 200, 90, 0.12, 0.08 + Math.min(0.2, v / 30)); },
  ascensore() { tono('triangle', 220, 330, 0.25, 0.05); },
  premio(stelle = 1) {
    const n = [523, 659, 784, 1047, 1319];
    n.slice(0, 2 + stelle).forEach((f, i) => { tono('triangle', f, f, 0.3, 0.12, i * 0.11); tono('sine', f * 2, f * 2, 0.2, 0.04, i * 0.11); });
  },
  peccato() { [440, 392, 330].forEach((f, i) => tono('triangle', f, f, 0.3, 0.1, i * 0.16)); },
  clic() { tono('sine', 700, 700, 0.04, 0.06); },
  pulsante() { tono('square', 1200, 900, 0.03, 0.06); tono('sine', 520, 780, 0.18, 0.18, 0.04); tono('sine', 780, 1170, 0.2, 0.12, 0.16); },
  gino() { tono('sine', 700, 1000, 0.1, 0.08); tono('sine', 1000, 1300, 0.1, 0.06, 0.1); },
};

export const suoni = new Proxy({}, {
  get: (_, nome) => (...a) => {
    if (audio.muto || audio.silenzio || !ctx || !E[nome]) return;
    try { E[nome](...a); } catch (e) { /* niente */ }
  },
});

/* Rotolio continuo della pallina. */
let rotolio = null;
export function rotola(v) {
  if (!ctx || audio.muto || audio.silenzio) { if (rotolio) rotolio.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); return; }
  if (!rotolio) {
    const s = ctx.createBufferSource(); s.buffer = rumore; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(bus); s.start();
    rotolio = { f, g };
  }
  const k = Math.min(1, v / 6);
  rotolio.g.gain.setTargetAtTime(k > 0.02 ? 0.03 + k * 0.12 : 0, ctx.currentTime, 0.05);
  rotolio.f.frequency.setTargetAtTime(200 + k * 700, ctx.currentTime, 0.05);
}

/* Musica: valzerino morbido in Fa (marimba e basso), 8 battute in loop. */
const BRANO = {
  bpm: 100,
  accordi: [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55], [53, 57, 60], [46, 50, 53], [48, 52, 55], [48, 52, 55, 58]],
  melodia: [
    [72, 0, 69, 0, 72, 74], [77, 0, 74, 0, 72, 0], [70, 0, 74, 0, 77, 0], [76, 0, 74, 72, 0, 0],
    [72, 0, 69, 0, 72, 74], [77, 0, 79, 0, 77, 74], [72, 0, 74, 0, 76, 0], [77, 0, 0, 0, 0, 0],
  ],
};
let musica = { attiva: false, prossima: 0, passo: 0, timer: null };
const hz = (n) => 440 * 2 ** ((n - 69) / 12);

function marimba(f, t, vol) {
  for (const [k, v, d] of [[1, 1, 0.5], [4, 0.25, 0.08], [10, 0.06, 0.03]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f * k;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(busMusica); o.start(t); o.stop(t + d + 0.02);
  }
}

function programma() {
  if (!ctx || !musica.attiva) return;
  const dt = 60 / BRANO.bpm / 2; // ottavi, 3/4 = 6 ottavi a battuta
  while (musica.prossima < ctx.currentTime + 0.25) {
    const t = musica.prossima, p = musica.passo;
    const bat = Math.floor(p / 6) % 8, o = p % 6;
    const acc = BRANO.accordi[bat];
    if (o === 0) {
      const o1 = ctx.createOscillator(), g = ctx.createGain();
      o1.type = 'triangle'; o1.frequency.value = hz(acc[0] - 12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dt * 2.2);
      o1.connect(g); g.connect(busMusica); o1.start(t); o1.stop(t + dt * 2.3);
    }
    if (o === 2 || o === 4) for (const n of acc.slice(1)) marimba(hz(n), t, 0.18);
    const mel = BRANO.melodia[bat][o];
    if (mel) marimba(hz(mel), t, 0.3);
    musica.prossima += dt;
    musica.passo++;
  }
}

export function avviaMusica() {
  if (!ctx || musica.attiva) return;
  musica.attiva = true;
  musica.prossima = ctx.currentTime + 0.1;
  musica.timer = setInterval(programma, 60);
}
