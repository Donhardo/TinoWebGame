/*
 * Tino Bum! — terreno generato a caso, distruttibile, e fondali.
 *
 * Il terreno è una griglia di pixel del mondo (1600 × 900): 0 aria,
 * 1 terra, 2 roccia (non si rompe), 3 legno (tronchi). Si disegna una volta
 * su due tele (terra+legno, roccia) con il contorno spesso dei cartoni; a ogni
 * esplosione la tela della terra viene "morsa" e il bordo del cratere ripassato.
 */
(() => {
  'use strict';
  const TB = window.TinoBum = window.TinoBum || {};

  const W = 1600, H = 900, ACQUA = 846;
  TB.MONDO = { W, H, ACQUA };

  const ARIA = 0, TERRA = 1, ROCCIA = 2, LEGNO = 3;
  TB.MATERIALI = { ARIA, TERRA, ROCCIA, LEGNO };

  // ---------------------------------------------------------------- casuale
  function generatore(seme) {
    let a = seme >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  TB.generatore = generatore;

  // rumore liscio su una dimensione, x in 0..1, risultato circa -1..1
  function rumore(r, ottave = 4, base = 3) {
    const livelli = [];
    for (let o = 0; o < ottave; o++) {
      const n = base << o;
      const v = [];
      for (let i = 0; i <= n + 1; i++) v.push(r() * 2 - 1);
      livelli.push({ n, v, amp: 1 / (1 << o) });
    }
    return (x) => {
      let s = 0, tot = 0;
      for (const l of livelli) {
        const p = Math.max(0, Math.min(1, x)) * l.n;
        const i = Math.floor(p);
        const f = p - i;
        const t = f * f * (3 - 2 * f);
        s += (l.v[i] + (l.v[i + 1] - l.v[i]) * t) * l.amp;
        tot += l.amp;
      }
      return s / tot;
    };
  }

  // ---------------------------------------------------------------- generazione
  const TIPI = ['arcipelago', 'colline', 'ponti', 'valle'];

  function nuovoTerreno(seme, tipo) {
    const r = generatore(seme);
    tipo = tipo || TIPI[Math.floor(r() * TIPI.length)];
    const mat = new Uint8Array(W * H);
    const t = { seme, tipo, mat, r };

    const colonna = (x, y0, y1, m) => {
      x = Math.round(x);
      if (x < 0 || x >= W) return;
      y0 = Math.max(0, Math.round(y0));
      y1 = Math.min(H - 1, Math.round(y1));
      for (let y = y0; y <= y1; y++) mat[y * W + x] = m;
    };
    const cerchio = (cx, cy, rr, m, soloSeVuoto = false) => {
      for (let y = Math.max(0, Math.floor(cy - rr)); y <= Math.min(H - 1, cy + rr); y++) {
        const dx = Math.sqrt(Math.max(0, rr * rr - (y - cy) * (y - cy)));
        for (let x = Math.max(0, Math.floor(cx - dx)); x <= Math.min(W - 1, cx + dx); x++) {
          const i = y * W + x;
          if (soloSeVuoto && mat[i]) continue;
          if (m === ARIA && mat[i] === ROCCIA) continue;
          mat[i] = m;
        }
      }
    };
    const ellisse = (cx, cy, rx, ry, m) => {
      for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(H - 1, cy + ry); y++) {
        const k = 1 - ((y - cy) / ry) ** 2;
        if (k <= 0) continue;
        const dx = rx * Math.sqrt(k);
        for (let x = Math.max(0, Math.floor(cx - dx)); x <= Math.min(W - 1, cx + dx); x++) {
          const i = y * W + x;
          if (m === ARIA && mat[i] === ROCCIA) continue;
          mat[i] = m;
        }
      }
    };

    // isola sospesa (o poggiata sul fondo se base = true)
    const isola = (cx, larg, cima, spessore, base = false, mosso = 38) => {
      const n1 = rumore(r, 4, 3);
      const n2 = rumore(r, 3, 4);
      const x0 = cx - larg / 2, x1 = cx + larg / 2;
      for (let x = Math.floor(x0); x <= x1; x++) {
        const u = (x - cx) / (larg / 2);
        const e = Math.sqrt(Math.max(0, 1 - u * u));
        const q = (x - x0) / larg;
        const sopra = cima + (1 - Math.pow(e, 0.45)) * 70 + n1(q) * mosso;
        const sotto = base ? H : cima + spessore * Math.pow(e, 0.75) + n2(q) * 22 + 6;
        if (sotto > sopra + 6) colonna(x, sopra, sotto, TERRA);
      }
    };

    const tra = (a, b) => a + r() * (b - a);

    if (tipo === 'arcipelago') {
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const cx = (i + 0.5) / n * W + tra(-40, 40);
        const larg = W / n * tra(0.75, 1.05);
        const base = (i === 0 || i === n - 1) && r() < 0.5;
        isola(cx, larg, tra(400, 640), tra(130, 260), base);
      }
      if (r() < 0.6) isola(W / 2 + tra(-120, 120), tra(160, 240), tra(180, 300), tra(60, 100));
    } else if (tipo === 'colline') {
      const n = rumore(r, 5, 2);
      const fossi = [];
      const nf = 1 + Math.floor(r() * 2);
      for (let i = 0; i < nf; i++) fossi.push({ x: W * (i + 1) / (nf + 1) + tra(-80, 80), l: tra(70, 130) });
      for (let x = 0; x < W; x++) {
        if (fossi.some((f) => Math.abs(x - f.x) < f.l / 2)) continue;
        let y = 620 + n(x / W) * 150;
        for (const f of fossi) {
          const d = Math.abs(x - f.x) - f.l / 2;
          if (d < 60) y += (60 - d) * 1.1;
        }
        colonna(x, y, H, TERRA);
      }
      const ni = 1 + Math.floor(r() * 2);
      for (let i = 0; i < ni; i++) isola(W * (i + 1) / (ni + 1) + tra(-100, 100), tra(170, 260), tra(240, 380), tra(60, 120));
    } else if (tipo === 'ponti') {
      isola(tra(180, 260), tra(380, 480), tra(500, 600), 0, true);
      isola(W - tra(180, 260), tra(380, 480), tra(500, 600), 0, true);
      // ponte di terra ad arco tra le due rive
      const y0 = tra(500, 560), freccia = tra(40, 90), spess = tra(28, 40);
      const n = rumore(r, 3, 3);
      for (let x = 380; x <= W - 380; x++) {
        const u = (x - 380) / (W - 760);
        const yc = y0 + Math.sin(u * Math.PI) * freccia + n(u) * 10;
        colonna(x, yc, yc + spess + Math.sin(u * Math.PI) * 10, TERRA);
      }
      if (r() < 0.7) isola(W / 2 + tra(-80, 80), tra(180, 260), tra(220, 330), tra(70, 110));
    } else { // valle: due altipiani e una torre di roccia nel mezzo
      isola(tra(240, 320), tra(480, 600), tra(460, 560), 0, true);
      isola(W - tra(240, 320), tra(480, 600), tra(460, 560), 0, true);
      isola(W / 2, tra(360, 480), tra(700, 760), 0, true, 20);
      const cima = tra(330, 430);
      for (let y = cima; y < 760; y += 30) {
        cerchio(W / 2 + tra(-14, 14), y, tra(34, 46), ROCCIA);
      }
      cerchio(W / 2, cima - 10, 40, ROCCIA);
    }

    // grotte dentro la terra più spessa (con il fondo scuro disegnato dietro)
    const grotte = t.grotte = [];
    const primaDelleGrotte = mat.slice();
    const ng = 1 + Math.floor(r() * 3);
    for (let i = 0, prove = 0; i < ng && prove < 40; prove++) {
      const x = tra(150, W - 150), y = tra(450, 800);
      if (!pieno(mat, x, y - 60) || !pieno(mat, x, y + 50)) continue;
      const rx = tra(45, 90), ry = tra(24, 40);
      ellisse(x, y, rx, ry, ARIA);
      grotte.push({ x, y, rx, ry });
      i++;
    }

    // massi di roccia: incastrati nella superficie o sospesi a fare da ostacolo
    const nm = 2 + Math.floor(r() * 4);
    for (let i = 0; i < nm; i++) {
      const x = tra(120, W - 120);
      const s = superficie(mat, x, 0);
      if (s < 0 || s > ACQUA - 30) continue;
      const rr = tra(16, 30);
      const k = 2 + Math.floor(r() * 3);
      for (let j = 0; j < k; j++) cerchio(x + tra(-rr, rr), s + tra(-rr * 0.3, rr * 0.6), rr * tra(0.7, 1.1), ROCCIA);
    }
    if (tipo !== 'valle' && r() < 0.5) {
      const cx = W / 2 + tra(-60, 60), cy = tra(160, 300);
      for (let j = 0; j < 4; j++) cerchio(cx + tra(-30, 30), cy + tra(-18, 18), tra(20, 30), ROCCIA);
    }

    // tronchi distesi sulla superficie
    const nt = Math.floor(r() * 3);
    for (let i = 0; i < nt; i++) {
      const x = tra(150, W - 250), l = tra(70, 130), rr = tra(12, 17);
      const s = superficie(mat, x + l / 2, 0);
      if (s < 0 || s > ACQUA - 40) continue;
      for (let xx = x; xx <= x + l; xx += 2) cerchio(xx, s - rr + 6, rr, LEGNO, true);
    }

    // niente terra ai bordi estremi del mondo e sotto l'acqua resta tutto pieno
    for (let y = 0; y < H; y++) { mat[y * W] = 0; mat[y * W + W - 1] = 0; }

    // il fondo delle grotte: dove c'era terra e ora c'è aria
    t.fondo = new Uint8Array(W * H);
    for (const g of grotte) {
      for (let y = Math.max(0, Math.floor(g.y - g.ry - 4)); y <= Math.min(H - 1, g.y + g.ry + 4); y++) {
        for (let x = Math.max(0, Math.floor(g.x - g.rx - 4)); x <= Math.min(W - 1, g.x + g.rx + 4); x++) {
          const i = y * W + x;
          if (primaDelleGrotte[i] && !mat[i]) t.fondo[i] = 1;
        }
      }
    }
    disegnaTerreno(t);
    return t;
  }

  function pieno(mat, x, y) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    return mat[y * W + x] !== 0;
  }

  // prima superficie (aria sopra, pieno sotto) scendendo da y0; -1 se nessuna
  function superficie(mat, x, y0) {
    x = Math.round(x);
    if (x < 0 || x >= W) return -1;
    for (let y = Math.max(0, Math.round(y0)); y < H; y++) if (mat[y * W + x]) return y;
    return -1;
  }

  // ---------------------------------------------------------------- disegno
  function hash(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // distanza (a passi di griglia, fino a 12) dal pixel "vuoto" più vicino
  function distanze(mat, pieno) {
    const d = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) d[i] = pieno(mat[i]) ? 12 : 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!d[i]) continue;
        let m = d[i];
        if (x > 0) m = Math.min(m, d[i - 1] + 1); else m = 1;
        if (y > 0) {
          m = Math.min(m, d[i - W] + 1);
          if (x > 0) m = Math.min(m, d[i - W - 1] + 1);
          if (x < W - 1) m = Math.min(m, d[i - W + 1] + 1);
        } else m = 1;
        d[i] = m;
      }
    }
    for (let y = H - 1; y >= 0; y--) {
      for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x;
        if (!d[i]) continue;
        let m = d[i];
        if (x < W - 1) m = Math.min(m, d[i + 1] + 1); else m = 1;
        if (y < H - 1) {
          m = Math.min(m, d[i + W] + 1);
          if (x < W - 1) m = Math.min(m, d[i + W + 1] + 1);
          if (x > 0) m = Math.min(m, d[i + W - 1] + 1);
        }
        d[i] = m;
      }
    }
    return d;
  }

  const col = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const C = {
    bordo: col('#3a2210'), bordoErba: col('#24501a'),
    erbaChiara: col('#93dc5e'), erba: col('#68bb45'), erbaOmbra: col('#3f8a2e'),
    terra: col('#c07a3e'), terraScura: col('#9a5a2a'), sassolino: col('#e2ad70'), puntino: col('#6e3d1b'),
    roccia: col('#9aa1ad'), rocciaChiara: col('#c4cad3'), rocciaScura: col('#717885'), bordoRoccia: col('#2c2f37'),
    grotta: col('#6a3e1e'), grottaScura: col('#4a2a12'),
    legno: col('#a8693a'), legnoScuro: col('#7d4a24'), bordoLegno: col('#3a2010'),
  };

  function disegnaTerreno(t) {
    const { mat } = t;
    const dTutto = distanze(mat, (m) => m !== 0);
    const dRoccia = distanze(mat, (m) => m === ROCCIA);
    // profondità dall'aria sopra (per l'erba)
    const prof = new Uint16Array(W * H);
    for (let x = 0; x < W; x++) {
      let k = 0;
      for (let y = 0; y < H; y++) {
        const i = y * W + x;
        k = mat[i] ? k + 1 : 0;
        prof[i] = k;
      }
    }
    const n = rumore(generatore(t.seme + 7), 5, 20);

    const telaTerra = tela(W, H);
    const telaRoccia = tela(W, H);
    const telaFondo = tela(W, H);
    const imgF = telaFondo.ctx.createImageData(W, H);
    const pf = imgF.data;
    const imgT = telaTerra.ctx.createImageData(W, H);
    const imgR = telaRoccia.ctx.createImageData(W, H);
    const pt = imgT.data, pr = imgR.data;

    const r2 = rumore2(t.seme + 11, 22);
    const r3 = rumore2(t.seme + 13, 9);
    const metti = (arr, j, c) => { arr[j] = c[0]; arr[j + 1] = c[1]; arr[j + 2] = c[2]; arr[j + 3] = 255; };
    const misto = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const m = mat[i];
        const j = i * 4;
        if (!m) {
          if (t.fondo[i]) metti(pf, j, misto(C.grotta, C.grottaScura, r2(x, y) * 0.6));
          continue;
        }
        if (m === ROCCIA) {
          const d = dRoccia[i];
          if (d <= 3) { metti(pr, j, C.bordoRoccia); continue; }
          // luce dall'alto a sinistra: più chiara vicino ai bordi in alto
          const sopra = y > 6 && mat[(y - 6) * W + x] !== ROCCIA;
          const k = r2(x, y) * 0.5 + r3(x, y) * 0.25;
          let c = misto(C.roccia, C.rocciaScura, clamp01(k + (d <= 6 ? 0.35 : 0)));
          if (sopra && d > 3 && d <= 9) c = C.rocciaChiara;
          metti(pr, j, c);
          continue;
        }
        const d = dTutto[i];
        const p = prof[i];
        const erbaFino = 13 + Math.round((n(x / W) + 1) * 4) + (hash(x >> 2, 0, 5) < 0.25 ? 4 : 0);
        let c;
        if (m === LEGNO) {
          if (d <= 3) c = C.bordoLegno;
          else c = misto(C.legno, C.legnoScuro, clamp01((Math.sin(y * 0.7 + r3(x, y) * 4) + 1) * 0.3 + (d <= 6 ? 0.3 : 0)));
        } else if (d <= 3) {
          c = p <= erbaFino + 2 ? C.bordoErba : C.bordo;
        } else if (p <= erbaFino) {
          c = p <= 7 ? C.erbaChiara : C.erba;
        } else if (p <= erbaFino + 3) {
          c = C.erbaOmbra;
        } else {
          // terra: più scura in profondità e vicino ai bordi, a macchie morbide
          const k = clamp01((p - 40) / 260) * 0.55 + r2(x, y) * 0.3 + (d <= 7 ? 0.3 : 0);
          c = misto(C.terra, C.terraScura, clamp01(k));
        }
        metti(pt, j, c);
      }
    }
    telaTerra.ctx.putImageData(imgT, 0, 0);
    telaRoccia.ctx.putImageData(imgR, 0, 0);
    telaFondo.ctx.putImageData(imgF, 0, 0);
    t.telaFondo = telaFondo.canvas;
    decora(t, telaTerra.ctx, dTutto, prof);
    t.telaTerra = telaTerra.canvas;
    t.ctxTerra = telaTerra.ctx;
    t.telaRoccia = telaRoccia.canvas;
  }

  const clamp01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);

  // rumore liscio a due dimensioni (celle di lato "lato"), risultato 0..1
  function rumore2(seme, lato) {
    return (x, y) => {
      const gx = x / lato, gy = y / lato;
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const fx = gx - x0, fy = gy - y0;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = hash(x0, y0, seme), b = hash(x0 + 1, y0, seme);
      const c = hash(x0, y0 + 1, seme), d = hash(x0 + 1, y0 + 1, seme);
      return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
    };
  }

  // sassolini e radici disegnati sopra la terra (solo dove è ben piena)
  function decora(t, c, dTutto, prof) {
    const r = generatore(t.seme + 17);
    c.save();
    c.globalCompositeOperation = 'source-atop';
    c.lineJoin = 'round';
    c.lineCap = 'round';
    for (let k = 0; k < 260; k++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * H);
      const i = y * W + x;
      if (t.mat[i] !== TERRA || dTutto[i] < 10 || prof[i] < 30) continue;
      const rx = 3 + r() * 6, ry = rx * (0.6 + r() * 0.3);
      c.beginPath();
      c.ellipse(x, y, rx, ry, r() * 3, 0, Math.PI * 2);
      c.fillStyle = r() < 0.6 ? '#e2ad70' : '#b8865a';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = '#6e3d1b';
      c.stroke();
    }
    for (let k = 0; k < 40; k++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * H);
      const i = y * W + x;
      if (t.mat[i] !== TERRA || prof[i] < 22 || prof[i] > 70 || dTutto[i] < 10) continue;
      c.beginPath();
      c.moveTo(x, y);
      let px = x, py = y;
      for (let s = 0; s < 4; s++) {
        const nx = px + (r() - 0.5) * 30, ny = py + 8 + r() * 14;
        c.quadraticCurveTo(px + (r() - 0.5) * 20, (py + ny) / 2, nx, ny);
        px = nx; py = ny;
      }
      c.lineWidth = 3;
      c.strokeStyle = 'rgba(110, 61, 27, 0.7)';
      c.stroke();
    }
    c.restore();
  }

  function tela(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return { canvas, ctx: canvas.getContext('2d') };
  }

  // ---------------------------------------------------------------- crateri
  function scava(t, cx, cy, rr) {
    const { mat } = t;
    for (let y = Math.max(0, Math.floor(cy - rr)); y <= Math.min(H - 1, cy + rr); y++) {
      const dx = Math.sqrt(Math.max(0, rr * rr - (y - cy) * (y - cy)));
      const x0 = Math.max(0, Math.floor(cx - dx)), x1 = Math.min(W - 1, Math.floor(cx + dx));
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        if (mat[i] !== ROCCIA) mat[i] = 0;
      }
    }
    const c = t.ctxTerra;
    if (!c) return;
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.arc(cx, cy, rr, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'source-atop';
    c.strokeStyle = 'rgba(70, 36, 14, 0.45)';
    c.lineWidth = 16;
    c.beginPath();
    c.arc(cx, cy, rr + 8, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#3a2210';
    c.lineWidth = 7;
    c.beginPath();
    c.arc(cx, cy, rr + 2, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  // ---------------------------------------------------------------- fondali
  // Strati a parallasse disegnati una volta per mappa (stile cartone).
  function nuovoFondale(seme) {
    const r = generatore(seme * 31 + 5);
    const tra = (a, b) => a + r() * (b - a);
    const lontano = tela(W, H);
    const vicino = tela(W, H);

    // montagne lontane, azzurrine
    colline(lontano.ctx, r, 520, 160, '#9cc7d9', '#6f9fb6', 3);
    colline(lontano.ctx, r, 600, 120, '#8cc0a6', '#5f9580', 4);

    // colline vicine con alberi
    const c = vicino.ctx;
    const profilo = colline(c, r, 680, 110, '#76b65a', '#3f7d2c', 5);
    for (let i = 0; i < 22; i++) {
      const x = tra(0, W);
      const y = profilo(x) + 8;
      albero(c, r, x, y, tra(0.7, 1.25));
    }

    const nuvole = [];
    for (let i = 0; i < 7; i++) {
      nuvole.push({ x: tra(-200, W), y: tra(30, 300), s: tra(0.6, 1.3), v: tra(4, 12), forma: r() });
    }
    return { lontano: lontano.canvas, vicino: vicino.canvas, nuvole };
  }

  function colline(c, r, base, amp, colore, bordo, onde) {
    const n = rumore(r, 3, onde);
    const profilo = (x) => base + n(x / W) * amp;
    c.beginPath();
    c.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) c.lineTo(x, profilo(x));
    c.lineTo(W, H);
    c.closePath();
    c.fillStyle = colore;
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = bordo;
    c.stroke();
    return profilo;
  }

  function albero(c, r, x, y, s) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.lineWidth = 4;
    c.strokeStyle = '#2c4a1c';
    c.fillStyle = '#7a4a22';
    c.beginPath();
    c.rect(-6, -46, 12, 46);
    c.fill();
    c.stroke();
    const verde = r() < 0.5 ? '#4f9a3f' : '#5aa94a';
    c.fillStyle = verde;
    c.beginPath();
    c.arc(0, -62, 26, 0, Math.PI * 2);
    c.arc(-20, -48, 18, 0, Math.PI * 2);
    c.arc(20, -48, 18, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = verde;
    c.beginPath();
    c.arc(0, -62, 24, 0, Math.PI * 2);
    c.arc(-20, -48, 16, 0, Math.PI * 2);
    c.arc(20, -48, 16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255, 255, 255, 0.22)';
    c.beginPath();
    c.arc(-8, -70, 9, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  TB.terreno = { nuovoTerreno, nuovoFondale, scava, superficie, TIPI };
})();
