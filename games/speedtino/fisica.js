/*
 * Speedtino: fisica (senza disegno), usata dal gioco e dalle prove in node.
 * Coordinate in pixel logici (lo schermo è 320 × 180), y verso il basso.
 * Il mondo è una fila di stanze (vedi stanze.js) messe una dopo l'altra.
 */
(function (radice) {
  'use strict';

  const T = 8;            // lato di un quadretto
  const RIGHE = 22;       // righe di ogni stanza
  const PAVIMENTO = 17;   // riga della cima del pavimento all'inizio e alla fine di ogni stanza

  const FISICA = {
    corsa: 150,           // velocità di corsa
    accTerra: 1500,
    accAria: 1000,
    attrito: 1800,
    salto: 262,           // spinta del salto
    gSu: 940,             // gravità salendo col salto tenuto
    g: 1900,              // gravità normale
    caduta: 340,          // velocità massima in caduta
    scivolo: 70,          // velocità massima scivolando lungo un muro
    pareteX: 175,         // salto dalla parete: spinta di lato
    pareteY: 250,         // e in su
    bloccoParete: 0.13,   // dopo il salto dalla parete i comandi di lato contano meno
    coyote: 0.08,         // si può ancora saltare appena lasciato il bordo
    memoria: 0.1,         // un salto premuto poco prima di toccare terra vale
    massima: 430          // velocità massima in tutte le direzioni
  };

  const RAMPINO = {
    portata: 104,         // distanza massima del piolo
    minimo: 18,           // corda più corta
    massimo: 104,         // corda più lunga
    gravita: 950,         // gravità appesi (più dolce: il dondolo è più leggibile)
    spinta: 560,          // ← → appesi
    avvolgi: 120,         // ↑ ↓ accorciano e allungano la corda
    lancio: 110,          // salto mentre si è appesi: spinta in su lasciando la corda
    indietro: 14          // un piolo può stare un poco dietro a Tino
  };

  const CORPO = { w: 10, h: 10 };

  // ---------- mondo ----------
  function nuovoMondo() {
    return { stanze: [], colonne: [], pioli: [], seghe: [], ghiande: [], larghezza: 0 };
  }

  // aggiunge una stanza (oggetto di stanze.js) in fondo al mondo
  function aggiungiStanza(m, def, id) {
    const righe = def.righe;
    const larga = righe[0].length;
    const x0 = m.larghezza;
    const st = { id, def, x0, larga, righe, spawn: null };
    const indice = m.stanze.length;
    m.stanze.push(st);
    for (let c = 0; c < larga; c++) m.colonne.push(indice);
    for (let r = 0; r < RIGHE; r++) {
      for (let c = 0; c < larga; c++) {
        const k = righe[r][c];
        const cx = (x0 + c) * T + T / 2, cy = r * T + T / 2;
        if (k === 'o') m.pioli.push({ x: cx, y: cy, stanza: indice });
        else if (k === '*') m.seghe.push({ x: cx, y: cy, r: 6.5, stanza: indice });
        else if (k === 'a') m.ghiande.push({ x: cx, y: cy, stanza: indice, presa: false });
      }
    }
    // punto di partenza: sopra il pavimento della seconda colonna
    st.spawn = { x: (x0 + 1) * T + 1, y: PAVIMENTO * T - CORPO.h };
    m.larghezza += larga;
    return st;
  }

  function casella(m, cx, cy) {
    if (cy < 0 || cy >= RIGHE || cx < 0 || cx >= m.larghezza) return '.';
    const st = m.stanze[m.colonne[cx]];
    return st.righe[cy][cx - st.x0];
  }
  const solida = k => k === '#' || k === '%';
  function solidaIn(m, cx, cy) {
    if (cx < 0) return true;              // muro invisibile all'inizio del mondo
    return solida(casella(m, cx, cy));
  }

  function urtaSolido(m, x, y, w, h) {
    const c0 = Math.floor(x / T), c1 = Math.floor((x + w - 0.001) / T);
    const r0 = Math.floor(y / T), r1 = Math.floor((y + h - 0.001) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solidaIn(m, c, r)) return true;
    return false;
  }

  // ---------- giocatore ----------
  function nuovoGiocatore(x, y) {
    return {
      x, y, vx: 0, vy: 0, verso: 1,
      aTerra: false, muro: 0, coyote: 0, memoria: 0, blocco: 0,
      gancio: null, mancato: 0, tiro: null,
      morto: false, causa: null, tempo: 0
    };
  }

  function centro(p) { return { x: p.x + CORPO.w / 2, y: p.y + CORPO.h / 2 }; }

  function vediLinea(m, x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 3);
    for (let i = 1; i < n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      if (solidaIn(m, Math.floor(x / T), Math.floor(y / T))) return false;
    }
    return true;
  }

  // il piolo a cui si aggancerebbe il rampino adesso
  function bersaglio(m, p) {
    const c = centro(p);
    let meglio = null, voto = Infinity;
    for (const q of m.pioli) {
      const dx = q.x - c.x;
      if (dx < -RAMPINO.portata || dx > RAMPINO.portata) continue;
      const dy = q.y - c.y;
      if (dy > 2) continue;                                  // mai sotto Tino
      if (dx * p.verso < -RAMPINO.indietro) continue;        // non dietro
      const d = Math.hypot(dx, dy);
      if (d > RAMPINO.portata || d < 6) continue;
      if (!vediLinea(m, c.x, c.y, q.x, q.y)) continue;
      const v = d - 0.35 * dx * p.verso;                     // meglio quelli davanti
      if (v < voto) { voto = v; meglio = q; }
    }
    return meglio;
  }

  function muovi(m, p, dx, dy) {
    // a passi piccoli, prima in orizzontale poi in verticale
    let urtoX = 0, urtoY = 0;
    const passiX = Math.ceil(Math.abs(dx) / 3) || 1;
    for (let i = 0; i < passiX; i++) {
      const nx = p.x + dx / passiX;
      if (urtaSolido(m, nx, p.y, CORPO.w, CORPO.h)) {
        if (dx > 0) p.x = Math.floor((nx + CORPO.w) / T) * T - CORPO.w;
        else p.x = Math.floor(nx / T) * T + T;
        urtoX = Math.sign(dx);
        break;
      }
      p.x = nx;
    }
    const passiY = Math.ceil(Math.abs(dy) / 3) || 1;
    for (let i = 0; i < passiY; i++) {
      const ny = p.y + dy / passiY;
      if (urtaSolido(m, p.x, ny, CORPO.w, CORPO.h)) {
        if (dy > 0) p.y = Math.floor((ny + CORPO.h) / T) * T - CORPO.h;
        else p.y = Math.floor(ny / T) * T + T;
        urtoY = Math.sign(dy);
        break;
      }
      p.y = ny;
    }
    return { urtoX, urtoY };
  }

  // pericoli: spuntoni, seghe, caduta
  function controllaPericoli(m, p) {
    if (p.y > RIGHE * T + 24) { p.morto = true; p.causa = 'caduta'; return; }
    const x0 = p.x + 1, x1 = p.x + CORPO.w - 1, y0 = p.y + 1, y1 = p.y + CORPO.h - 0.5;
    const c0 = Math.floor(x0 / T), c1 = Math.floor(x1 / T), r0 = Math.floor(y0 / T), r1 = Math.floor(y1 / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const k = casella(m, c, r);
      let bx0 = c * T, by0 = r * T, bx1 = bx0 + T, by1 = by0 + T;
      if (k === '^') { by0 += 4; bx0 += 1; bx1 -= 1; }
      else if (k === 'v') { by1 -= 4; bx0 += 1; bx1 -= 1; }
      else if (k === '>') { bx1 -= 4; by0 += 1; by1 -= 1; }
      else if (k === '<') { bx0 += 4; by0 += 1; by1 -= 1; }
      else continue;
      if (x1 > bx0 && x0 < bx1 && y1 > by0 && y0 < by1) { p.morto = true; p.causa = 'spuntoni'; return; }
    }
    const c = centro(p);
    for (const s of m.seghe) {
      if (Math.abs(s.x - c.x) > 20) continue;
      const qx = Math.max(p.x, Math.min(s.x, p.x + CORPO.w));
      const qy = Math.max(p.y, Math.min(s.y, p.y + CORPO.h));
      if ((qx - s.x) ** 2 + (qy - s.y) ** 2 < (s.r - 0.5) ** 2) { p.morto = true; p.causa = 'sega'; return; }
    }
  }

  const avvicina = (v, a, d) => (v < a ? Math.min(a, v + d) : Math.max(a, v - d));

  /*
   * Un passo di fisica. comandi: { sx: -1 | 0 | 1, su, giu, salto (tenuto),
   * saltoPremuto (appena premuto), gancio (tenuto), gancioPremuto }.
   */
  function passo(m, p, k, dt) {
    if (p.morto) return;
    p.tempo += dt;
    if (k.sx) p.verso = k.sx;
    p.coyote = p.aTerra ? FISICA.coyote : Math.max(0, p.coyote - dt);
    p.memoria = k.saltoPremuto ? FISICA.memoria : Math.max(0, p.memoria - dt);
    p.blocco = Math.max(0, p.blocco - dt);
    p.mancato = Math.max(0, p.mancato - dt);

    // rampino
    if (k.gancioPremuto && !p.gancio) {
      const q = bersaglio(m, p);
      const c = centro(p);
      if (q) {
        const d = Math.hypot(q.x - c.x, q.y - c.y);
        p.gancio = { x: q.x, y: q.y, L: Math.max(RAMPINO.minimo, Math.min(RAMPINO.massimo, d)) };
      } else {
        p.mancato = 0.16;
        p.tiro = { x: c.x + p.verso * 40, y: c.y - 40 };
      }
    }
    if (p.gancio && !k.gancio) p.gancio = null;
    if (p.gancio && k.saltoPremuto && !p.aTerra) {
      p.gancio = null;
      p.vy = Math.min(p.vy - RAMPINO.lancio, -RAMPINO.lancio);
      p.memoria = 0;
    }

    if (p.gancio) {
      const g = p.gancio;
      if (k.su) g.L = Math.max(RAMPINO.minimo, g.L - RAMPINO.avvolgi * dt);
      if (k.giu) g.L = Math.min(RAMPINO.massimo, g.L + RAMPINO.avvolgi * dt);
      const c = centro(p);
      const rx = c.x - g.x, ry = c.y - g.y, d = Math.hypot(rx, ry) || 1;
      const ux = rx / d, uy = ry / d;
      const teso = d >= g.L - 0.5;
      p.vy += RAMPINO.gravita * dt;
      if (p.aTerra && !teso) {
        // a terra con la corda lenta si corre normalmente
        const voluta = k.sx * FISICA.corsa;
        p.vx = avvicina(p.vx, voluta, (k.sx ? FISICA.accTerra : FISICA.attrito) * dt);
      } else if (k.sx) {
        // spinta lungo la tangente del dondolo
        const tx = -uy, ty = ux;
        const s = Math.sign(tx * k.sx || k.sx);
        p.vx += tx * s * RAMPINO.spinta * dt;
        p.vy += ty * s * RAMPINO.spinta * dt;
      }
      if (teso) {
        const radiale = p.vx * ux + p.vy * uy;
        if (radiale > 0) { p.vx -= radiale * ux; p.vy -= radiale * uy; }
      }
    } else {
      // corsa
      const acc = p.aTerra ? (k.sx ? FISICA.accTerra : FISICA.attrito) : FISICA.accAria;
      const peso = p.blocco > 0 ? 0.25 : 1;
      if (k.sx) {
        const voluta = k.sx * FISICA.corsa;
        if (Math.sign(p.vx) === k.sx && Math.abs(p.vx) > FISICA.corsa) {
          if (p.aTerra) p.vx = avvicina(p.vx, voluta, FISICA.attrito * 0.5 * dt);
        } else p.vx = avvicina(p.vx, voluta, acc * peso * dt);
      } else if (p.aTerra) p.vx = avvicina(p.vx, 0, acc * dt);
      else p.vx = avvicina(p.vx, 0, 120 * dt);

      // salto, salto dalla parete
      if (p.memoria > 0 && p.coyote > 0) {
        p.vy = -FISICA.salto; p.coyote = 0; p.memoria = 0; p.aTerra = false;
      } else if (p.memoria > 0 && p.muro && !p.aTerra) {
        p.vy = -FISICA.pareteY; p.vx = -p.muro * FISICA.pareteX; p.verso = -p.muro;
        p.blocco = FISICA.bloccoParete; p.memoria = 0;
      }
      const g = (k.salto && p.vy < 0) ? FISICA.gSu : FISICA.g;
      p.vy += g * dt;
      const max = (p.muro && p.vy > 0 && k.sx === p.muro) ? FISICA.scivolo : FISICA.caduta;
      if (p.vy > max) p.vy = Math.max(max, p.vy - 2400 * dt);
    }

    const v = Math.hypot(p.vx, p.vy);
    if (v > FISICA.massima) { p.vx *= FISICA.massima / v; p.vy *= FISICA.massima / v; }

    const u = muovi(m, p, p.vx * dt, p.vy * dt);
    if (u.urtoX) p.vx = 0;
    if (u.urtoY) p.vy = 0;

    // la corda non si allunga: si riporta Tino sul cerchio
    if (p.gancio) {
      const g = p.gancio, c = centro(p);
      const rx = c.x - g.x, ry = c.y - g.y, d = Math.hypot(rx, ry);
      if (d > g.L) {
        const f = (d - g.L) / d;
        const r2 = muovi(m, p, -rx * f, -ry * f);
        if (r2.urtoX) p.vx = 0;
        if (r2.urtoY) p.vy = 0;
      }
    }

    p.aTerra = urtaSolido(m, p.x, p.y + 0.5, CORPO.w, CORPO.h) && p.vy >= 0;
    if (p.aTerra && p.vy > 0) p.vy = 0;
    p.muro = 0;
    if (!p.aTerra) {
      if (urtaSolido(m, p.x + 1, p.y + 2, CORPO.w, CORPO.h - 4)) p.muro = 1;
      else if (urtaSolido(m, p.x - 1, p.y + 2, CORPO.w, CORPO.h - 4)) p.muro = -1;
    }

    controllaPericoli(m, p);
  }

  function copia(p) {
    const c = Object.assign({}, p);
    if (p.gancio) c.gancio = Object.assign({}, p.gancio);
    return c;
  }

  const API = {
    T, RIGHE, PAVIMENTO, FISICA, RAMPINO, CORPO,
    nuovoMondo, aggiungiStanza, casella, solida, nuovoGiocatore, passo, bersaglio, centro, copia
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else radice.SpeedtinoFisica = API;
})(this);
