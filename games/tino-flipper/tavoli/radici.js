/*
 * Tino Flipper · tavolo "Le radici della Quercia".
 *
 * Tavolo logico 640 × 1900 (il corridoio di lancio è a destra, x 580-620).
 * Campo (piano 0) e galleria alta (piano 1, mini campo di assi in alto a
 * sinistra con il quarto flipper). Elementi: fionde, bumper (nodi), corsie
 * T·I·N·O, orbita destra con lo spinner, radice lunga (rampa di legno con il
 * deviatore verso la dispensa), giro della morte con la liana, buca del ghiro
 * (tunnel verso il pozzo, con il sasso che spunta davanti), sassi (bersagli che
 * cadono), cartelli (si abbattono e si rialzano), piolo d'oro (disco che gira)
 * con Gino seduto al centro (bersaglio),
 * resina (magnete), cunicolo del cece (palla prigioniera), agente col timbro
 * (giocattolo che cammina), terzo flipper, molla (rimbalzo), radice che spunta
 * (palo tra i flipper), dispensa (blocco con le ghiande in fila).
 *
 * TF.tavoli.radici(G) crea il tavolo; G è l'interfaccia di gioco.js.
 */
(() => {
  'use strict';
  const TF = window.TF;
  const U = TF.util;
  const { clamp, casuale, scegli, numero, hexA } = U;
  const R = TF.R;

  const PUNTI = {
    bumper: 1000, fionda: 110, corsia: 5000, corsieTutte: 25000, corsiaInterna: 1000, corsiaEsterna: 5000,
    sasso: 3000, sassiTutti: 25000, cartello: 3000, cartelliTutti: 25000, spunta: 5000, tunnel: 10000,
    torcia: 5000, torceTutte: 50000, gino: 7500, uscita: 5000, agente: 5000, stordito: 25000,
    chiave: 15000, spinner: 300, orbita: 15000, rampa: 20000, rampaInPiu: 5000, giro: 25000,
    piolo: 2000, resina: 10000, skill: 50000, kickback: 2500,
    jackpot: 150000, jackpotInPiu: 50000, superJackpot: 500000,
  };
  const AGENTE = { x0: 296, x1: 462, y: 692, vel: 62, velCorsa: 175, colpi: 3, stordito: 6 };

  // Avventure: si accendono stordendo l'agente e partono nella buca del ghiro.
  const AVVENTURE = [
    { id: 'torce', nome: 'Le torce', durata: 40, testo: 'Accendi le torce nella galleria alta! Il tunnel è aperto.', tinta: '#ff8a1e', stile: 'torce' },
    { id: 'frana', nome: 'La frana', durata: 35, testo: 'I sassi si rialzano subito: abbattili tutti!', tinta: '#b8a48a', stile: 'frana' },
    { id: 'chiave', nome: 'La chiave', durata: 40, testo: 'Spingi il cece in fondo al cunicolo, poi apri la porta sulla radice lunga.', tinta: '#ffd23f', stile: 'chiave' },
    { id: 'inseguimento', nome: 'Inseguimento', durata: 35, testo: 'L\'agente scappa: colpiscilo cinque volte!', tinta: '#7fa6d9', stile: 'inseguimento' },
  ];
  const FINALE = { id: 'ghianda', nome: 'La Ghianda d\'Oro', durata: 45, testo: 'Quattro ghiande in campo: ogni tiro è un jackpot!', tinta: '#ffd700', stile: 'finale' };

  // Robivecchi: ognuno si guadagna con un'impresa; poi compare in un punto
  // difficile del tavolo e ci resta finché la ghianda non ci passa sopra.
  // x, y: dove si disegna; piano: su che piano sta; percorso + s: sta su una
  // rampa (si prende passando per quel punto del percorso); pos(): si muove.
  // mira: gli esiti che il giocatore simulato cerca per prenderlo.
  const ROBIVECCHI = [
    { id: 'moneta', nome: 'Moneta', impresa: 'Fai un tiro da maestro', dove: 'nella galleria alta, accanto al pozzo', x: 200, y: 500, piano: 1, mira: ['tunnel'] },
    { id: 'bottone', nome: 'Bottone', impresa: 'Completa T·I·N·O due volte nella stessa palla', dove: 'in cima all\'orbita destra', x: 550, y: 500, piano: 0, mira: ['orbita'] },
    { id: 'graffetta', nome: 'Graffetta', impresa: 'Accendi le tre torce nella stessa palla', dove: 'tra i nodi', x: 352, y: 284, piano: 0, freccia: false, mira: ['robivecchio'] },
    { id: 'fiocco', nome: 'Fiocco', impresa: 'Tre radici lunghe di fila nella stessa combo', dove: 'in cima alla radice lunga, sul deviatore', x: 270, y: 438, piano: 0, percorso: 'rampa', s: 'fine', mira: ['rampa'] },
    { id: 'carta', nome: 'Carta di credito scaduta', file: 'carta-scaduta', impresa: 'Acciuffa l\'agente nell\'avventura Inseguimento', dove: 'sopra il sentiero dell\'agente', x: 430, y: 648, piano: 0, mira: ['robivecchio'] },
    { id: 'tappo', nome: 'Tappo a corona', impresa: 'Fai un super jackpot su Gino', dove: 'in cima all\'anello del giro della morte', x: 455, y: 505, piano: 0, percorso: 'giro', mira: ['giro'] },
    { id: 'biglia', nome: 'Biglia', impresa: 'Finisci la Ghianda d\'Oro', dove: 'sul bordo del piolo d\'oro, che gira', x: 300, y: 802, piano: 0, mira: ['robivecchio'] },
  ];

  const BRANO = TF.brano([
    ['D3', 'm', 'D5 - F5 - A5 - - G5 F5 - E5 - D5 - - -'],
    ['Bb2', 'M', 'D5 - - F5 Bb5 - A5 - G5 - F5 - D5 - - -'],
    ['F2', 'M', 'C5 - F5 - A5 - C6 - A5 - G5 - F5 - - -'],
    ['C3', 'M', 'E5 - G5 - C6 - - - B5 - G5 - E5 - - -'],
    ['D3', 'm', 'A5 - - D6 - C6 - A5 G5 - F5 - G5 - A5 -'],
    ['G2', 'm', 'Bb5 - A5 - G5 - D5 - G5 - Bb5 - D6 - - -'],
    ['A2', '7', 'C#6 - - A5 - E5 - G5 - - A5 - C#6 - E6 -'],
    ['A2', '7', 'D6 - C#6 - A5 - G5 - E5 - C#5 - A4 - - -'],
  ]);
  const STILI = {
    menu: { bpm: 92, cassa: 'mezza', arpeggio: false, onda: 'triangle', filtro: 1500, basso: 'saltellante', ondaBasso: 'triangle', rullante: false, legnetti: true },
    gioco: { bpm: 112, cassa: 'mezza', arpeggio: true, ondaArpeggio: 'triangle', onda: 'square', filtro: 2000, basso: 'saltellante', ondaBasso: 'triangle', legnetti: true },
    torce: { bpm: 118, cassa: 'dritta', arpeggio: true, ondaArpeggio: 'triangle', onda: 'sawtooth', filtro: 2400, basso: 'saltellante', legnetti: true },
    frana: { bpm: 122, cassa: 'dritta', arpeggio: true, onda: 'square', filtro: 1700, legnetti: true },
    chiave: { bpm: 116, cassa: 'mezza', arpeggio: true, ondaArpeggio: 'sine', onda: 'triangle', filtro: 3200, basso: 'saltellante', legnetti: true },
    inseguimento: { bpm: 134, cassa: 'dritta', arpeggio: true, onda: 'square', filtro: 2600, aperto: true },
    multiball: { bpm: 130, cassa: 'dritta', arpeggio: true, onda: 'sawtooth', filtro: 3400, aperto: true, legnetti: true },
    finale: { bpm: 138, cassa: 'dritta', arpeggio: true, onda: 'sawtooth', filtro: 4200, aperto: true, legnetti: true },
  };

  TF.tavoli.radici = function crea(G) {
    const W = 640, H = 1900, CX = 300;
    const m = TF.nuovoMondo(W, H);
    const S = {};                     // stato proprio del tavolo (rifatto a ogni partita)

    // ============================================================ pianta
    const mx = (p) => p.map(([x, y]) => [600 - x, y]);       // specchio attorno al centro del campo
    // pareti esterne e volta (centro 320, 330, raggio 300)
    const VOLTA = U.arco(320, 330, 300, Math.PI, 2 * Math.PI, 72);
    m.parete([[20, 1340], [20, 330]]);
    m.parete(VOLTA);
    m.parete([[620, 330], [620, 1920]]);
    const SPORGENZA = [[40, 1387], [80, 1447], [80, 1518], [40, 1530]];
    m.parete([[20, 1340], [40, 1380], [40, 1387]]);
    m.parete(SPORGENZA);
    m.parete([[40, 1530], [40, 1920]]);
    m.parete(mx([[20, 1340], [40, 1380], [40, 1387]]));
    m.parete(mx(SPORGENZA));
    m.parete(mx([[40, 1530], [40, 1920]]));
    // corridoio di lancio
    m.parete([[580, 440], [580, 1920]]);
    m.cerchio(580, 440, 4, { tipo: 'muro', e: TF.FISICA.pareti });
    // cancelletto inclinato sopra il corridoio e l'orbita: si passa solo salendo;
    // chi ricade dall'alto ci scivola sopra e finisce nell'orbita
    m.segmento(618, 392, 556, 454, { tipo: 'cancello', unaVia: [-0.707, -0.707] });
    m.segmento(580, 1846, 620, 1846, { tipo: 'stantuffo', e: 0.15 });

    // orbita destra con lo spinner
    m.parete([[520, 470], [520, 960]]);
    m.cerchio(520, 470, 5, { tipo: 'muro', e: TF.FISICA.pareti });
    m.cerchio(520, 960, 6, { tipo: 'paletto' });
    m.sensore('spinner', 522, 760, 578, 760);
    m.sensore('orbita', 522, 560, 578, 560, { verso: [0, -1], esito: 'orbita' });
    const SPINNER = { x: 550, y: 760, ang: 0, vel: 0 };

    // corsie T·I·N·O; la guida a sinistra delle corsie prende la ghianda che
    // arriva lungo la volta e la fa scendere nelle corsie (senza, seguiva
    // tutto l'arco e scendeva a sinistra: il tiro da maestro era impossibile)
    const CORSIE = [275, 325, 375, 425];
    for (const x of [250, 300, 350, 400, 450]) m.segmento(x, 112, x, 158, { tipo: 'paletto', r: 4, e: 0.5 });
    m.segmento(236, 38, 250, 112, { tipo: 'muro', r: 3, e: 0.12 });
    CORSIE.forEach((x, i) => m.sensore('corsia', x - 22, 140, x + 22, 140, { verso: [0, 1], dati: { i }, esito: 'corsie' }));

    // nodi (bumper)
    const BUMPER = [{ x: 300, y: 255 }, { x: 405, y: 248 }, { x: 352, y: 338 }].map((b, i) => {
      b.c = m.cerchio(b.x, b.y, 27, { tipo: 'bumper', id: 'bumper', spinta: 980, dati: { i } });
      b.lampo = 0; b.i = i;
      return b;
    });

    // Massa delle radici sotto la galleria: faccia destra, buca del ghiro
    // (nicchia), bocca della radice lunga, sassi.
    const NICCHIA = U.arco(200, 858, 28, 0, -Math.PI, 10);
    const MASSA = U.unisci(
      [[20, 340], [240, 384], [240, 610], [228, 905], [228, 858]],
      NICCHIA,
      [[172, 858], [172, 905], [150, 962], [143, 980]],
      [[121, 914], [64, 933], [86, 1000]],
      [[142, 1074], [148, 1087]],
    );
    m.parete(MASSA, { tipo: 'muro' });
    const DIETRO_SASSI = [[142, 1074], [34, 1127], [40, 1140], [20, 1150]];
    m.parete(DIETRO_SASSI);
    for (const [x, y] of [[228, 905], [172, 905], [86, 1000], [143, 980]]) m.cerchio(x, y, 6, { tipo: 'paletto' });
    // buca del ghiro e sasso che spunta davanti
    const BUCA = { x: 200, y: 876 };
    m.presa('tunnel', BUCA.x, BUCA.y, 16, { velMax: 1500, attivo: () => !S.sassoSu, esito: 'tunnel' });
    const SASSO = m.segmento(176, 903, 224, 903, { tipo: 'spunta', id: 'spunta', r: 5, e: 0.4, attivo: () => S.sassoSu, esito: 'spunta' });
    // bocca della radice lunga (rampa)
    m.bocca('rampa', 86, 1000, 143, 980, { verso: [-0.32, -0.95], velMin: 700 });

    // sassi: banco di quattro bersagli che cadono
    const S0 = [40, 1140], S1 = [148, 1087];
    const SL = Math.hypot(S1[0] - S0[0], S1[1] - S0[1]);
    const SU = [(S1[0] - S0[0]) / SL, (S1[1] - S0[1]) / SL];
    const SASSI = [0, 1, 2, 3].map((i) => {
      const a = 3 + i * 29.5, b = a + 25;
      const s = { i, ax: S0[0] + SU[0] * a, ay: S0[1] + SU[1] * a, bx: S0[0] + SU[0] * b, by: S0[1] + SU[1] * b, lampo: 0 };
      s.seg = m.segmento(s.ax, s.ay, s.bx, s.by, { tipo: 'sasso', id: 'sasso', r: 5, e: 0.35, attivo: () => S.sassi[i], dati: { i }, esito: 'sassi' });
      return s;
    });

    // giro della morte: bocca con il canale
    m.parete([[413, 953], [428, 895], [482, 909], [467, 967]]);
    m.cerchio(413, 953, 6, { tipo: 'paletto' });
    m.cerchio(467, 967, 6, { tipo: 'paletto' });
    m.bocca('giro', 413, 953, 467, 967, { verso: [0.25, -0.97], velMin: 750 });

    // cartelli che si abbattono
    const CARTELLI = [252, 300, 348].map((x, i) => {
      const c = { i, x, y: 1060, lampo: 0, giu: 0 };
      // si colpiscono da sotto; dall'alto si passa (altrimenti la ghianda ci si fermava sopra)
      c.seg = m.segmento(x - 16, 1060, x + 16, 1060, { tipo: 'cartello', id: 'cartello', r: 5, e: 0.3, attivo: () => S.cartelli[i], dati: { i }, esito: 'cartelli', soglia: 220, unaVia: [0, 1] });
      return c;
    });
    // piolo d'oro (disco che gira)
    const PIOLO = m.disco({ id: 'piolo', x: 300, y: 850, r: 60, w: 3.4, presa: 3 });
    // Gino seduto al centro del piolo d'oro: il bersaglio grande del campo
    const GINO = { x: 300, y: 850, r: 30, trema: 0, salto: 0, colpi: 0 };
    GINO.c = m.cerchio(GINO.x, GINO.y, GINO.r, { tipo: 'gino', id: 'gino', e: 0.6, spinta: 150, esito: 'gino' });
    // agente col timbro sulla radice
    const AG = m.mobile({ id: 'agente', x: 370, y: AGENTE.y, r: 24, tipo: 'agente', esito: 'agente', e: 0.6 });
    // resina (magnete)
    const RESINA = m.magnete({ id: 'resina', x: 300, y: 1290, r: 78, presa: 14, forza: 2500 });
    // cunicolo del cece (palla prigioniera)
    m.parete([[580, 1222], [521, 1236], [521, 1318]]);
    m.parete([[559, 1240], [559, 1318]]);
    m.cerchio(521, 1318, 4, { tipo: 'paletto' });
    m.cerchio(559, 1318, 4, { tipo: 'paletto' });
    m.parete([[561, 1318], [580, 1336]]);
    // il cece è tenuto nel cunicolo dal codice (si muove solo in verticale) e sporge dall'imbocco
    const CECE = m.prigioniera({ id: 'cece', x: 540, giu: 1326, su: 1254 });

    // flipper: i due in basso, il terzo a destra a metà tavolo, il quarto nella galleria
    // scivolo sopra il perno del terzo flipper (senza, la ghianda restava tra parete e perno)
    m.segmento(580, 1094, 560, 1124);
    const FL = {
      sx: m.nuovoFlipper({ id: 'sx', lato: 'sx', x: 198, y: 1752, zona: [50, 1560, 304, 1810] }),
      dx: m.nuovoFlipper({ id: 'dx', lato: 'dx', x: 402, y: 1752, zona: [296, 1560, 550, 1810] }),
      terzo: m.nuovoFlipper({ id: 'terzo', lato: 'dx', x: 562, y: 1140, lungo: 82, r1: 13, r2: 7, zona: [462, 1030, 580, 1196] }),
      alto: m.nuovoFlipper({ id: 'alto', lato: 'sx', piano: 1, x: 64, y: 592, lungo: 70, r1: 12, r2: 6, zona: [42, 470, 200, 640] }),
    };
    // guide delle corsie interne e fionde (come nella versione 1)
    const GUIDA = [[78, 1566], [78, 1692], [190, 1731]];
    m.parete(GUIDA);
    m.parete(mx(GUIDA));
    m.cerchio(78, 1566, 5, { tipo: 'paletto' });
    m.cerchio(522, 1566, 5, { tipo: 'paletto' });
    const FIONDE = [[[128, 1582], [128, 1663], [172, 1685]], mx([[128, 1582], [128, 1663], [172, 1685]])];
    FIONDE.forEach((p, k) => {
      const [a, b, c] = p;
      m.segmento(a[0], a[1], b[0], b[1], { tipo: 'muro', e: 0.3 });
      m.segmento(b[0], b[1], c[0], c[1], { tipo: 'muro', e: 0.3 });
      m.segmento(a[0], a[1], c[0], c[1], { tipo: 'fionda', id: 'fionda', spinta: 820, e: 0.55, r: 4, dati: { k } });
      m.cerchio(a[0], a[1], 6, { tipo: 'paletto' });
      m.cerchio(c[0], c[1], 6, { tipo: 'paletto' });
    });
    m.sensore('esterna', 40, 1727, 76, 1727, { verso: [0, 1], dati: { lato: 'sx' } });
    m.sensore('esterna', 524, 1727, 560, 1727, { verso: [0, 1], dati: { lato: 'dx' } });
    m.sensore('interna', 80, 1637, 126, 1637, { verso: [0, 1], dati: { lato: 'sx' } });
    m.sensore('interna', 474, 1637, 520, 1637, { verso: [0, 1], dati: { lato: 'dx' } });
    // radice che spunta tra i flipper
    m.cerchio(300, 1836, 9, { tipo: 'palo', e: 0.5, attivo: () => S.palo > 0 });

    // ---------------------------------------------------- galleria alta (piano 1)
    const P1 = { piano: 1 };
    const GALLERIA = [[40, 600], [40, 384], [58, 368], [222, 368], [240, 384], [240, 395]];
    m.parete(GALLERIA, P1);
    m.parete([[240, 445], [240, 560], [164, 632]], P1);
    m.parete([[40, 600], [40, 690]], P1);
    // scivolo sopra il perno del quarto flipper (senza, la ghianda restava tra parete e perno)
    m.segmento(40, 548, 64, 576, { piano: 1 });
    m.segmento(30, 700, 250, 700, P1);
    m.cerchio(240, 395, 4, { tipo: 'muro', piano: 1, e: TF.FISICA.pareti });
    m.cerchio(240, 445, 5, { tipo: 'paletto', piano: 1 });
    m.cerchio(164, 632, 5, { tipo: 'paletto', piano: 1 });
    const TORCE = [95, 140, 185].map((x, i) => {
      const t = { i, x, y: 386, lampo: 0 };
      m.segmento(x - 13, 386, x + 13, 386, { tipo: 'torcia', id: 'torcia', r: 5, e: 0.4, piano: 1, dati: { i }, esito: 'torce' });
      return t;
    });
    m.sensore('uscita', 236, 397, 236, 443, { piano: 1, verso: [1, 0], esito: 'uscita' });
    m.sensore('scivolo', 42, 660, 240, 660, { piano: 1, verso: [0, 1], esito: 'scivolo' });
    const POZZO = { x: 200, y: 566 };

    // ---------------------------------------------------- percorsi
    const curva = U.bezier;
    m.percorso('rampa', U.unisci([[115, 990], [100, 945]], curva([100, 945], [78, 840], [66, 720], [92, 600], 14), curva([92, 600], [118, 470], [190, 420], [270, 438], 14)), { tipo: 'rampa' });
    m.percorso('rampaA', U.unisci(curva([270, 438], [380, 455], [500, 430], [500, 560], 14), [[500, 1000]], curva([500, 1000], [500, 1200], [494, 1400], [493, 1562], 12)), { tipo: 'rampa', uscita: 320 });
    m.percorso('rampaB', curva([270, 438], [190, 420], [62, 500], [44, 664], 14), { tipo: 'rampa' });
    const ANELLO = { x: 455, y: 560, r: 55 };
    m.percorso('giro', U.unisci([[440, 960], [452, 900]], curva([452, 900], [466, 790], [470, 690], [ANELLO.x, ANELLO.y + ANELLO.r], 12),
      U.arco(ANELLO.x, ANELLO.y, ANELLO.r, Math.PI / 2, Math.PI / 2 - 2 * Math.PI, 40),
      curva([ANELLO.x, ANELLO.y + ANELLO.r], [360, 760], [120, 1150], [107, 1562], 24)), { tipo: 'giro', uscita: 320, vel: [900, 1700] });
    m.percorso('tunnel', [[BUCA.x, BUCA.y], [200, 780], [204, 640], [POZZO.x, POZZO.y]], { sotto: true, costante: 800 });
    m.percorso('scivolo', [[146, 664], [196, 676], [258, 682]], { tipo: 'scivolo', uscita: 280 });
    m.percorso('dispensa', curva([44, 884], [26, 1100], [104, 1300], [107, 1562], 20), { tipo: 'liana', uscita: 300, costante: 1000 });
    // dove stanno i robivecchi sui percorsi: il fiocco in fondo alla radice
    // lunga, il tappo in cima all'anello (il punto del giro più vicino alla cima)
    const sDelPunto = (per, x, y) => {
      let meglio = 0, dist = Infinity;
      for (let s = 0; s <= per.lung; s += 3) {
        const q = m.puntoPercorso(per, s);
        const d = Math.hypot(q.x - x, q.y - y);
        if (d < dist) { dist = d; meglio = s; }
      }
      return meglio;
    };
    for (const r of ROBIVECCHI) {
      if (r.s === 'fine') r.s = m.percorsi[r.percorso].lung;
      else if (r.percorso) r.s = sDelPunto(m.percorsi[r.percorso], r.x, r.y);
    }
    ROBIVECCHI.find((r) => r.id === 'biglia').pos = () => [300 + Math.cos(PIOLO.ang + 1.2) * 48, 850 + Math.sin(PIOLO.ang + 1.2) * 48];

    // ============================================================ stato
    function nuovaPartita() {
      Object.assign(S, {
        sassi: [true, true, true, true], sassiT: 0,
        cartelli: [true, true, true], cartelliT: 0, palo: 0,
        sassoSu: true, sassoT: 0,
        dispensa: { aperta: false, bloccate: 0, uscita: [] },
        chiavi: 0, chiaviServono: 3, chiaveAvv: false,
        torce: [false, false, false],
        agente: { x: 370, dir: 1, colpi: 0, stordito: 0, trema: 0, salta: 0, attesa: 0, sosta: 0 },
        avventuraPronta: false, resina: false, kickback: true, spinGiri: 0,
        corsie: [false, false, false, false], skill: { corsia: Math.floor(Math.random() * 4), attivo: false, t: 0 },
        rampe: 0, prossimaExtra: 8, extraAccesa: false, superJackpot: false, deviatore: 0,
        lampoCorsie: 0, lampoFionda: [0, 0], lampoPiolo: 0, lampoResina: 0, inPiolo: new Set(),
        tinoPalla: 0, torcePalla: [false, false, false],
      });
      CECE.y = CECE.giu; CECE.vy = 0;
      AG.x = S.agente.x;
      RESINA.attivo = false; RESINA.palla = null;
      for (const f of Object.values(FL)) { f.a = f.riposo; f.premuto = false; f.prog = null; }
    }
    function nuovaPalla() {
      S.skill = { corsia: Math.floor(Math.random() * 4), attivo: true, t: 0 };
      S.palo = Math.max(S.palo, 0);
      S.tinoPalla = 0;
      S.torcePalla = [false, false, false];
    }
    const contatori = () => ({ gino: 0, bumper: 0, corsie: 0, rampe: 0, giri: 0, orbite: 0, sassi: 0, cartelli: 0, chiavi: 0, torce: 0, agente: 0, avventure: 0, spinner: 0 });
    function righeBonus(c) {
      return [
        ['Nodi', c.bumper, 100], ['Corsie', c.corsie, 1000], ['Radice lunga', c.rampe, 4000], ['Giri della morte', c.giri, 5000],
        ['Orbite', c.orbite, 3000], ['Sassi', c.sassi, 1000], ['Cartelli', c.cartelli, 1000], ['Chiavi', c.chiavi, 5000],
        ['Torce', c.torce, 2500], ['Gino', c.gino, 2500], ['Agente', c.agente, 2000], ['Avventure', c.avventure, 25000],
      ];
    }

    const avv = () => G.stato.avventura;
    const inAvv = (id) => !!G.stato.avventura && G.stato.avventura.id === id;
    const pronti = () => G.stato.modo !== 'gioco' || !G.stato.tiltato;

    // ============================================================ regole
    function evento(tipo, o, p, info) {
      const st = G.stato;
      const su = G.suoni;
      const c = st.contatori;
      switch (tipo) {
        case 'flipperColpo': su.colpo(Math.min(1, info / 2500)); return;
        case 'parete': su.legno(Math.min(1, info / 2000)); return;
        case 'palle': su.clic(); return;
        case 'prigioniera': su.prigioniera(); CECE.lampo = 1; return;
        case 'prigionieraCima': cimaCece(); return;
        case 'sensore': return sensore(o, p, info);
        case 'colpo': break;
        default: return;
      }
      switch (o.tipo) {
        case 'bumper': {
          const b = BUMPER[o.dati.i];
          b.lampo = 1;
          c.bumper++;
          G.punti(PUNTI.bumper, b.x, b.y - 34);
          G.scintille(p.x, p.y, '#ffcf6b', 8, 300);
          su.bumper(b.i);
          break;
        }
        case 'fionda':
          S.lampoFionda[o.dati.k] = 1;
          G.punti(PUNTI.fionda);
          G.scintille(p.x, p.y, '#ffd99a', 6, 240);
          su.fionda();
          break;
        case 'sasso': colpoSasso(o.dati.i, p); break;
        case 'cartello': {
          if (info < 200) { su.legno(0.5); return; }
          const k = o.dati.i;
          if (!S.cartelli[k]) return;
          S.cartelli[k] = false;
          CARTELLI[k].lampo = 1;
          c.cartelli++;
          G.punti(PUNTI.cartello, CARTELLI[k].x, 1040);
          su.cartello();
          S.cartelliT = 8;
          if (S.cartelli.every((x) => !x)) {
            S.palo = 20;
            G.punti(PUNTI.cartelliTutti, CX, 1020);
            G.messaggio('Radice che spunta!', 'Salva la ghianda tra i flipper per 20 s', 1.8);
            su.palo();
          }
          break;
        }
        case 'spunta':
          if (!S.sassoSu) return;
          S.sassoSu = false;
          S.sassoT = 20;
          G.punti(PUNTI.spunta, BUCA.x, 930);
          G.messaggio('Tunnel aperto!', 'Tira nella buca del ghiro', 1.4);
          su.sasso();
          break;
        case 'torcia': {
          const k = o.dati.i;
          TORCE[k].lampo = 1;
          su.torcia();
          c.torce++;
          S.torcePalla[k] = true;
          if (S.torcePalla.every(Boolean)) G.impresa('graffetta');
          if (inAvv('torce')) {
            if (!S.torce[k]) {
              S.torce[k] = true;
              avv().conto++;
              G.punti(75000, TORCE[k].x, 420, '#ffb347');
              if (S.torce.every(Boolean)) { G.obiettivo('Tutte le torce!', 300000); S.torce = [false, false, false]; }
            } else G.punti(5000);
            break;
          }
          if (!S.torce[k]) {
            S.torce[k] = true;
            G.punti(PUNTI.torcia, TORCE[k].x, 420);
            if (S.torce.every(Boolean)) {
              S.torce = [false, false, false];
              G.punti(PUNTI.torceTutte, 140, 440, '#ffb347');
              G.campo(2, 20, 'Torce accese!');
            }
          } else G.punti(1000);
          break;
        }
        case 'gino': {
          if (info < 100 || GINO.attesa > 0) return;
          GINO.trema = 0.5;
          GINO.attesa = 0.25;
          c.gino++;
          S.lampoPiolo = 1;
          G.scintille(p.x, p.y, '#ffe27a', 10, 260);
          G.tiro('gino', GINO.x, GINO.y);
          if (st.multiball && S.superJackpot) {
            S.superJackpot = false;
            st.jackpot.fatti = 0;
            const v = G.punti(PUNTI.superJackpot, GINO.x, GINO.y - 70, '#fff27a');
            G.messaggio('SUPER JACKPOT!', '+' + numero(v), 2.6);
            G.suoni.superJackpot();
            G.flash(1); G.scossa(1.5); G.festa();
            GINO.salto = 1.2;
            G.impresa('tappo');
            break;
          }
          if (inAvv('ghianda')) {
            const v = G.punti(250000, GINO.x, GINO.y - 70, '#fff27a');
            G.messaggio('Gino d\'oro!', '+' + numero(v), 1.4);
            G.suoni.jackpot();
            GINO.salto = 1;
            break;
          }
          G.punti(PUNTI.gino, GINO.x, GINO.y - 50);
          su.fisso();
          if (!S.resina) {
            S.resina = true;
            G.messaggio('Resina pronta!', 'Ferma la ghianda al centro', 1.5);
            su.acceso();
          }
          break;
        }
        case 'agente': colpoAgente(p, info); break;
        default: break;
      }
    }

    function sensore(s, p, avanti) {
      const st = G.stato;
      const su = G.suoni;
      const c = st.contatori;
      switch (s.id) {
        case 'corsia': {
          if (!avanti) return;
          const i = s.dati.i;
          c.corsie++;
          if (S.skill.attivo) {
            S.skill.attivo = false;
            if (S.skill.corsia === i) {
              st.statistiche.skill = (st.statistiche.skill || 0) + 1;
              const v = G.punti(PUNTI.skill, CORSIE[i], 190, '#fff27a');
              G.messaggio('Tiro da maestro!', '+' + numero(v), 2);
              su.skill();
              G.festa();
              G.impresa('moneta');
            }
          }
          if (!S.corsie[i]) {
            S.corsie[i] = true;
            G.punti(PUNTI.corsia, CORSIE[i], 190);
            su.corsia(i);
            if (S.corsie.every(Boolean)) {
              S.corsie = [false, false, false, false];
              st.bonusMolt = Math.min(st.bonusMolt + 1, 6);
              G.punti(PUNTI.corsieTutte, 350, 210);
              G.messaggio('T·I·N·O!', `Bonus ×${st.bonusMolt}`, 1.8);
              su.tino();
              S.lampoCorsie = 1;
              if (++S.tinoPalla >= 2) G.impresa('bottone');
            }
          } else {
            G.punti(500);
            su.clic();
          }
          break;
        }
        case 'spinner':
          SPINNER.vel = Math.min(26, Math.abs(p.vy) / 90 + SPINNER.vel * 0.3);
          break;
        case 'orbita':
          if (!avanti || p.vy > -700) return;
          c.orbite++;
          G.punti(PUNTI.orbita, 545, 600);
          su.orbita();
          G.tiro('orbita', 545, 600);
          break;
        case 'esterna':
          if (!avanti) return;
          if (s.dati.lato === 'sx' && S.kickback && pronti()) {
            p.vx = 0; p.vy = -2100; p.x = 58;
            S.kickback = false;
            S.spinGiri = 0;
            G.punti(PUNTI.kickback, 62, 1680);
            G.messaggio('La molla!', 'Si ricarica con lo spinner', 1.4);
            su.kickback();
            G.scossa(0.6);
          } else {
            p.esterna = true;
            G.punti(PUNTI.corsiaEsterna);
            G.faccia('ferito', 1.4);
            su.esterna();
          }
          break;
        case 'interna':
          if (!avanti) return;
          G.punti(PUNTI.corsiaInterna);
          su.clic();
          break;
        case 'uscita':
          if (!avanti) return;
          // dalla galleria si scende sul campo
          p.piano = 0;
          p.x = Math.max(p.x, 256);
          G.punti(PUNTI.uscita, 260, 420);
          su.deviatore();
          G.tiro('uscita', 260, 420);
          break;
        case 'scivolo':
          if (!avanti) return;
          G.percorso(p, 'scivolo', 400);
          su.rampa();
          break;
        default: break;
      }
    }

    function colpoSasso(i, p) {
      if (!S.sassi[i]) return;
      const st = G.stato;
      S.sassi[i] = false;
      SASSI[i].lampo = 1;
      st.contatori.sassi++;
      G.suoni.sasso();
      G.scintille(p.x, p.y, '#d8cbb8', 10, 220);
      if (inAvv('frana')) {
        G.punti(25000, (SASSI[i].ax + SASSI[i].bx) / 2 + 20, SASSI[i].ay - 20, '#e8dcc8');
      } else {
        G.punti(PUNTI.sasso, (SASSI[i].ax + SASSI[i].bx) / 2 + 20, SASSI[i].ay - 20);
      }
      if (!S.sassi.every((x) => !x)) return;
      G.punti(PUNTI.sassiTutti, 120, 1060);
      if (inAvv('frana')) {
        avv().conto++;
        G.obiettivo(avv().conto === 1 ? 'Frana!' : `Frana ×${avv().conto}!`, 150000);
        S.sassiT = 0.25;
        return;
      }
      S.sassiT = 1.2;
      if (st.multiball) {
        st.jackpot.doppio = true;
        G.messaggio('Jackpot doppio!', 'Prendi la radice lunga o il giro', 1.8);
      } else if (!S.dispensa.aperta) {
        S.dispensa.aperta = true;
        G.messaggio('Dispensa aperta!', `Radice lunga: blocca la ghianda ${S.dispensa.bloccate + 1}`, 1.8);
        G.suoni.deviatore();
      } else {
        G.messaggio('Sassi giù!', '', 1.2);
      }
      G.suoni.acceso();
    }
    function rialzaSassi() {
      S.sassi = [true, true, true, true];
      S.sassiT = 0;
      G.suoni.rialza();
    }

    function colpoAgente(p, forza) {
      const a = S.agente;
      if (forza < 120 || a.attesa > 0) return;
      a.attesa = 0.35;
      a.trema = 0.4;
      G.stato.contatori.agente++;
      G.suoni.agente();
      G.scintille(p.x, p.y, '#cfe0ff', 10, 260);
      if (a.stordito > 0) { G.punti(1000); return; }
      G.tiro('agente', AG.x, AG.y);
      if (inAvv('inseguimento')) {
        avv().conto++;
        G.punti(75000, AG.x, AG.y - 50, '#cfe0ff');
        if (avv().conto === 5) { G.obiettivo('Agente acciuffato!', 300000); a.stordito = AGENTE.stordito; G.impresa('carta'); }
        return;
      }
      G.punti(PUNTI.agente, AG.x, AG.y - 50);
      if (S.avventuraPronta || avv()) return;
      a.colpi++;
      const serve = agenteServe();
      if (a.colpi >= serve) {
        a.colpi = 0;
        a.stordito = AGENTE.stordito;
        S.avventuraPronta = true;
        S.sassoSu = false;
        G.punti(PUNTI.stordito, AG.x, AG.y - 70, '#fff27a');
        G.messaggio('Agente stordito!', `Avventura nel tunnel: ${prossimaAvventura().nome}`, 2.2);
        G.suoni.stordito();
        G.festa();
      } else {
        G.scritta(AG.x, AG.y + 40, `${a.colpi}/${serve}`, '#cfe0ff');
      }
    }
    function agenteServe() {
      return Math.min(3 + G.stato.avventureFatte.length + G.stato.giro, 6);
    }
    function prossimaAvventura() {
      const resto = AVVENTURE.filter((x) => !G.stato.avventureFatte.includes(x.id));
      return resto.length ? resto[0] : FINALE;
    }

    function cimaCece() {
      const st = G.stato;
      CECE.lampo = 1;
      st.contatori.chiavi++;
      G.suoni.chiave();
      G.scintille(CECE.x, CECE.su - 10, '#ffe27a', 14, 260);
      if (inAvv('chiave')) {
        G.punti(60000, CECE.x - 40, CECE.su - 20, '#ffe27a');
        if (!S.chiaveAvv) {
          S.chiaveAvv = true;
          G.messaggio('Chiave!', 'Apri la porta sulla radice lunga', 1.6);
        }
        return;
      }
      G.punti(PUNTI.chiave, CECE.x - 40, CECE.su - 20);
      G.tiro('cece', CECE.x, CECE.su);
      S.chiavi++;
      if (S.chiavi >= S.chiaviServono && !S.extraAccesa) {
        S.chiavi = 0;
        S.chiaviServono += 2;
        S.extraAccesa = true;
        S.sassoSu = false;
        G.messaggio('Palla extra accesa!', 'Prendila nella buca del ghiro', 2);
        G.suoni.acceso();
      } else {
        G.scritta(CECE.x - 40, CECE.su + 10, `chiave ${S.chiavi}/${S.chiaviServono}`, '#ffe27a');
      }
    }

    // la ghianda entra in una rampa
    function bocca(p, b, vel) {
      if (b.id === 'rampa') G.suoni.rampa();
      else G.suoni.giro();
      G.percorso(p, b.percorso, vel);
    }

    // fine di un percorso: true se il tavolo l'ha gestita
    function finePercorso(p, per) {
      const st = G.stato;
      switch (per.id) {
        case 'rampa': {
          // in cima alla radice lunga
          st.contatori.rampe++;
          S.rampe++;
          const x = 300, y = 450;
          G.punti(PUNTI.rampa + PUNTI.rampaInPiu * Math.min(st.combo.t > 0 ? st.combo.n : 0, 6), x, y);
          if (inAvv('chiave') && S.chiaveAvv) {
            S.chiaveAvv = false;
            avv().conto++;
            G.obiettivo('Porta aperta!', 200000);
          }
          jackpot(x, y - 40);
          if (S.rampe >= S.prossimaExtra && !S.extraAccesa) {
            S.extraAccesa = true;
            S.sassoSu = false;
            S.prossimaExtra += 12;
            G.messaggio('Palla extra accesa!', 'Prendila nella buca del ghiro', 2);
            G.suoni.acceso();
          }
          G.tiro('rampa', x, y);
          if (st.combo.fila >= 3) G.impresa('fiocco');
          const blocca = S.dispensa.aperta && !st.multiball && !avv();
          if (blocca) S.deviatore = 1;
          G.suoni.deviatore();
          G.percorso(p, blocca ? 'rampaB' : 'rampaA', p.v);
          return true;
        }
        case 'rampaA':
          G.suoni.fineRampa();
          return false;
        case 'rampaB':
          blocco(p);
          return true;
        case 'giro': {
          st.contatori.giri++;
          G.punti(PUNTI.giro + PUNTI.rampaInPiu * Math.min(st.combo.t > 0 ? st.combo.n : 0, 6), ANELLO.x, ANELLO.y);
          jackpot(ANELLO.x, ANELLO.y - 40);
          G.tiro('giro', ANELLO.x, ANELLO.y);
          G.suoni.fineRampa();
          return false;
        }
        case 'tunnel':
          // il pozzo: la ghianda sale da sotto nella galleria alta
          G.suoni.pozzo();
          G.libera(p, 1, POZZO.x, POZZO.y, casuale(-160, 40), casuale(-1050, -900));
          G.scintille(POZZO.x, POZZO.y, '#ffb347', 14, 260);
          return true;
        default: return false;
      }
    }

    function jackpot(x, y) {
      const st = G.stato;
      if (inAvv('ghianda')) {
        const v = G.punti(100000, x, y, '#fff27a');
        G.messaggio('JACKPOT!', '+' + numero(v), 1.1);
        G.suoni.jackpot();
        G.flash(0.5);
        GINO.salto = 1;
        return;
      }
      if (!st.multiball) return;
      const j = st.jackpot;
      const v = G.punti(j.valore * (j.doppio ? 2 : 1), x, y, '#fff27a');
      j.doppio = false;
      j.valore += PUNTI.jackpotInPiu;
      j.fatti++;
      G.messaggio('JACKPOT!', '+' + numero(v), 2);
      G.suoni.jackpot();
      G.flash(0.7);
      G.scossa(1);
      G.festa();
      GINO.salto = 1;
      if (j.fatti >= 3 && !S.superJackpot) {
        S.superJackpot = true;
        G.messaggio('Super jackpot acceso!', 'Colpisci Gino!', 2.2);
      }
    }

    // la dispensa: la ghianda resta in fila nel tubo
    function blocco(p) {
      const st = G.stato;
      const d = S.dispensa;
      d.aperta = false;
      d.bloccate++;
      rialzaSassi();
      G.togli(p);
      G.suoni.blocco();
      if (d.bloccate >= 3) {
        d.bloccate = 0;
        G.avviaMultiball();
        // escono le tre ghiande della dispensa, una alla volta
        d.uscita = [0.8, 1.6, 2.4];
        G.messaggio('MULTIBALL!', 'Jackpot sulla radice lunga e sul giro', 2.4);
        return;
      }
      G.messaggio(`Ghianda ${d.bloccate} nella dispensa!`, d.bloccate === 2 ? 'Ancora una per il multiball' : 'Abbatti i sassi per la prossima', 2);
      if (!st.palle.length) G.inCanna(false, 0.9);
    }

    // buca del ghiro: la ghianda si ferma, poi parte nel tunnel
    function presa(p, q) {
      if (q.id !== 'tunnel') return;
      const st = G.stato;
      G.suoni.buca();
      G.punti(PUNTI.tunnel, BUCA.x + 30, BUCA.y - 30);
      G.tiro('tunnel', BUCA.x, BUCA.y);
      let attesa = 0.6;
      if (S.extraAccesa) {
        S.extraAccesa = false;
        st.palleExtra++;
        G.messaggio('Palla extra!', 'Una ghianda in più', 2.2);
        G.suoni.extra();
        G.festa();
        attesa = 1.4;
      }
      if (S.avventuraPronta && !avv()) {
        S.avventuraPronta = false;
        const def = prossimaAvventura();
        G.avviaAvventura(def);
        st.contatori.avventure++;
        if (def.id === 'torce') S.torce = [false, false, false];
        if (def.id === 'frana') rialzaSassi();
        if (def.id === 'chiave') S.chiaveAvv = false;
        if (def.id === 'ghianda') {
          G.avviaMultiball(true);
          const quante = Math.max(0, 4 - st.palle.length);
          for (let i = 0; i < quante; i++) S.dispensa.uscita.push(1.6 + i * 0.7);
        }
        attesa = 1.8;
      }
      G.trattieni(p, BUCA.x, BUCA.y, attesa, () => {
        G.suoni.tunnel();
        G.percorso(p, 'tunnel', 800);
        if (!inAvv('torce') && !S.avventuraPronta && !S.extraAccesa) S.sassoSu = true;
      });
    }

    // resina: tiene la ghianda e la tira verso il tiro che serve
    function magnete(p, g) {
      if (g !== RESINA) return;
      S.resina = false;
      RESINA.attivo = false;
      G.punti(PUNTI.resina, RESINA.x, RESINA.y - 30);
      G.suoni.magnete();
      G.trattieni(p, RESINA.x, RESINA.y, 1.1, () => {
        const voglio = desiderati();
        let meglio = null;
        for (let a = 200; a <= 340; a += 5) {
          const r = a * Math.PI / 180;
          const prova = { x: RESINA.x, y: RESINA.y, vx: Math.cos(r) * 1750, vy: Math.sin(r) * 1750, piano: 0 };
          const { esito } = TF.simula(m, prova, [], 0.9, esitoExtra);
          const pos = voglio.indexOf(esito);
          const v = pos >= 0 ? 100 - pos * 10 : (VALORE[esito] ?? 1);
          if (!meglio || v > meglio.v) meglio = { v, r };
        }
        const r = meglio ? meglio.r : -Math.PI / 2;
        G.libera(p, 0, RESINA.x, RESINA.y, Math.cos(r) * 1750, Math.sin(r) * 1750);
        G.suoni.lascia();
        S.lampoResina = 1;
      });
    }

    // ============================================================ aggiornamento
    function aggiorna(dt) {
      const st = G.stato;
      // sassi
      if (S.sassiT > 0) {
        S.sassiT -= dt;
        if (S.sassiT <= 0) {
          if (S.dispensa.aperta && !st.multiball && !inAvv('frana')) S.sassiT = 0.0001;   // giù finché la dispensa è aperta
          else rialzaSassi();
        }
      }
      // cartelli: si rialzano se lì non c'è una ghianda
      if (S.cartelliT > 0) {
        S.cartelliT -= dt;
        if (S.cartelliT <= 0) {
          if (st.palle.some((p) => p.stato === 'campo' && p.piano === 0 && Math.abs(p.y - 1060) < 30 && p.x > 220 && p.x < 380)) S.cartelliT = 0.3;
          else { S.cartelli = [true, true, true]; G.suoni.rialza(); }
        }
      }
      if (S.palo > 0) S.palo = Math.max(0, S.palo - dt);
      // sasso che spunta
      const tienilo = S.avventuraPronta || S.extraAccesa || inAvv('torce');
      if (!S.sassoSu && !tienilo && S.sassoT > 0) {
        S.sassoT -= dt;
        if (S.sassoT <= 0) S.sassoT = 0.001;
      }
      if (!S.sassoSu && !tienilo && S.sassoT <= 0.001) {
        const libera = !st.palle.some((p) => p.piano === 0 && p.stato === 'campo' && Math.abs(p.x - BUCA.x) < 40 && p.y > 840 && p.y < 930);
        if (libera) { S.sassoSu = true; S.sassoT = 0; G.suoni.spunta(); }
      }
      // resina
      RESINA.attivo = S.resina && !st.tiltato;
      // spinner
      if (SPINNER.vel > 0) {
        const prima = Math.floor(SPINNER.ang / Math.PI);
        SPINNER.ang += SPINNER.vel * Math.PI * 2 * dt;
        SPINNER.vel = Math.max(0, SPINNER.vel - 7 * dt);
        const dopo = Math.floor(SPINNER.ang / Math.PI);
        for (let i = prima; i < dopo; i++) {
          G.punti(PUNTI.spinner);
          st.contatori.spinner++;
          G.suoni.spinner();
          S.spinGiri++;
          if (!S.kickback && S.spinGiri >= 30 + 10 * st.giro) {
            S.kickback = true;
            G.messaggio('Molla carica!', '', 1.2);
            G.suoni.acceso();
          }
        }
      }
      // skill shot: la lettera giusta lampeggia finché la ghianda è nel corridoio
      if (S.skill.attivo && st.lancio.palla) {
        S.skill.t += dt;
        if (S.skill.t > 0.55) { S.skill.t = 0; S.skill.corsia = (S.skill.corsia + 1) % 4; }
      }
      if (S.skill.attivo && !st.lancio.palla && st.lancio.scade !== undefined) {
        st.lancio.scade -= dt;
        if (st.lancio.scade <= 0) S.skill.attivo = false;
      }
      // piolo d'oro: punti quando la ghianda ci passa sopra
      PIOLO.ang += PIOLO.w * dt;
      for (const p of st.palle) {
        if (p.stato !== 'campo' || p.piano !== 0) continue;
        const dentro = Math.hypot(p.x - PIOLO.x, p.y - PIOLO.y) < PIOLO.r;
        if (dentro && !S.inPiolo.has(p)) {
          S.inPiolo.add(p);
          S.lampoPiolo = Math.max(S.lampoPiolo, 0.6);
          G.suoni.moneta(2);
          G.punti(PUNTI.piolo);
        } else if (!dentro) S.inPiolo.delete(p);
      }
      GINO.attesa = Math.max(0, (GINO.attesa || 0) - dt);
      // agente
      const a = S.agente;
      a.attesa = Math.max(0, a.attesa - dt);
      a.trema = Math.max(0, a.trema - dt);
      if (a.stordito > 0) {
        a.stordito -= dt;
        AG.vx = 0;
        if (a.stordito <= 0) G.suoni.rialza();
      } else if (a.sosta > 0) {
        a.sosta -= dt;
        AG.vx = 0;
      } else {
        const vel = (inAvv('inseguimento') ? AGENTE.velCorsa : AGENTE.vel) * (1 + 0.1 * st.giro);
        let x = a.x + a.dir * vel * dt;
        if (x > AGENTE.x1) { x = AGENTE.x1; a.dir = -1; a.sosta = inAvv('inseguimento') ? 0.1 : casuale(0.4, 1.2); }
        if (x < AGENTE.x0) { x = AGENTE.x0; a.dir = 1; a.sosta = inAvv('inseguimento') ? 0.1 : casuale(0.4, 1.2); }
        // non schiaccia una ghianda contro la parete: aspetta
        AG.vx = (x - a.x) / Math.max(dt, 1e-4);
        a.x = x;
      }
      AG.x = a.x;
      // dispensa: ghiande che escono (multiball)
      const d = S.dispensa;
      if (d.uscita.length) {
        d.uscita[0] -= dt;
        if (d.uscita[0] <= 0) {
          d.uscita.shift();
          const q = G.nuovaPalla(44, 884);
          G.percorso(q, 'dispensa', 1000);
          G.suoni.sputa();
          if (d.uscita.length) d.uscita[0] = Math.max(d.uscita[0], 0.6);
        }
      }
      // lampi
      for (const b of BUMPER) b.lampo = Math.max(0, b.lampo - dt * 4);
      for (const s of SASSI) s.lampo = Math.max(0, s.lampo - dt * 3);
      for (const c of CARTELLI) c.lampo = Math.max(0, c.lampo - dt * 3);
      for (const t of TORCE) t.lampo = Math.max(0, t.lampo - dt * 2);
      S.lampoFionda = S.lampoFionda.map((x) => Math.max(0, x - dt * 5));
      S.lampoCorsie = Math.max(0, S.lampoCorsie - dt);
      S.lampoPiolo = Math.max(0, S.lampoPiolo - dt * 2);
      S.lampoResina = Math.max(0, S.lampoResina - dt * 2);
      S.deviatore = Math.max(0, S.deviatore - dt * 1.5);
      CECE.lampo = Math.max(0, CECE.lampo - dt * 3);
      GINO.trema = Math.max(0, GINO.trema - dt);
      GINO.salto = Math.max(0, GINO.salto - dt);
    }
    function aggiornaFisica(h) {
      TF.aggiornaPrigioniere(m, h);
    }

    function inizioAvventura(def) {
      if (def.id === 'inseguimento') S.agente.stordito = 0;
    }
    function fineAvventura(a) {
      S.torce = [false, false, false];
      S.chiaveAvv = false;
      if (a && a.id === FINALE.id) G.impresa('biglia');
    }
    function fineBiglia() {
      S.palo = 0;
      S.resina = false;
      S.superJackpot = false;
      S.dispensa.uscita = [];
    }
    function fineMultiball() {
      S.superJackpot = false;
    }

    // ============================================================ giocatore simulato
    function desiderati() {
      const st = G.stato;
      const lista = [];
      const id = st.avventura && st.avventura.id;
      const rob = st.robivecchi && st.robivecchi.attivo;
      if (rob) lista.push(...(rob.id === 'moneta' && S.sassoSu ? ['spunta'] : []), ...rob.mira);
      if (id === 'torce') lista.push(...(S.torce.some((x) => !x) ? ['torce'] : []), 'tunnel');
      if (id === 'frana') lista.push('sassi');
      if (id === 'chiave') lista.push(S.chiaveAvv ? 'rampa' : 'cece');
      if (id === 'inseguimento') lista.push('agente');
      if (id === 'ghianda') lista.push('gino', 'rampa', 'giro', 'orbita');
      if (st.multiball) lista.push(...(S.superJackpot ? ['gino'] : []), 'rampa', 'giro');
      if (!st.multiball && (S.avventuraPronta || S.extraAccesa)) lista.push(S.sassoSu ? 'spunta' : 'tunnel');
      if (!st.multiball && S.dispensa.aperta) lista.push('rampa');
      if (!st.multiball && !S.dispensa.aperta && !id) lista.push('sassi');
      if (!S.avventuraPronta && !id) lista.push('agente');
      if (!S.resina) lista.push('gino');
      if (S.torce.some((x) => !x)) lista.push('torce');
      if (st.combo.t > 0) lista.push('rampa', 'giro', 'orbita', 'agente');
      lista.push(G.ia.mira || 'rampa', 'uscita');
      return lista;
    }
    const VALORE = {
      rampa: 5, giro: 5, tunnel: 5, orbita: 4, agente: 4, uscita: 4, torce: 4, cece: 3, sassi: 3, cartelli: 3,
      gino: 4, piolo: 3, spunta: 3, corsie: 3, resina: 3, su: 2, niente: 1, scivolo: 1, persa: 0, robivecchio: 6,
    };
    const MIRE = ['rampa', 'giro', 'orbita', 'agente', 'gino', 'cece', 'tunnel'];
    function esitoExtra(q) {
      if (q.piano === 0) {
        if (q.y > 1826) return 'persa';
        if (q.y > 1715 && (q.x < 78 || q.x > 522)) return 'persa';
      }
      return null;
    }

    // ============================================================ disegno
    // Colori del legno e della terra
    // All'aperto, al sole: prato, terra chiara, legno e radici chiare.
    const C = {
      prato: ['#a6d963', '#93cc55', '#86c24c', '#79b543'],
      terra: '#e6c891', terraScura: '#cfa86a',
      radice: '#a87444', radiceChiara: '#e0ae70', corteccia: '#8a5a2e',
      legno: '#c08a4e', legnoChiaro: '#f4d49c', legnoScuro: '#6e4622',
      asse: '#d9a868', asseScura: '#b07a42', pietra: '#c9c2b8', muschio: '#5f9a32',
      fiamma: '#ffb347', oro: '#ffcc33', neon: '#ff961e', neon2: '#e8521e', luce: '#fff2c0',
    };
    // generatore a caso fisso (le decorazioni sono sempre uguali)
    let seme = 11;
    const rnd = () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };

    function formaTavolo(g) {
      g.beginPath();
      g.moveTo(20, H + 20);
      g.lineTo(20, 330);
      g.arc(320, 330, 300, Math.PI, 2 * Math.PI);
      g.lineTo(620, H + 20);
      g.closePath();
    }
    function poligono(g, punti) {
      g.beginPath();
      g.moveTo(punti[0][0], punti[0][1]);
      for (let i = 1; i < punti.length; i++) g.lineTo(punti[i][0], punti[i][1]);
      g.closePath();
    }
    function tratto(g, punti) {
      g.beginPath();
      g.moveTo(punti[0][0], punti[0][1]);
      for (let i = 1; i < punti.length; i++) g.lineTo(punti[i][0], punti[i][1]);
    }
    function radice(g, punti, spessore) {
      g.save();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = 'rgba(60,40,10,0.25)';
      g.lineWidth = spessore + 4;
      g.translate(3, 4); tratto(g, punti); g.stroke(); g.translate(-3, -4);
      g.strokeStyle = C.radice;
      g.lineWidth = spessore;
      tratto(g, punti); g.stroke();
      g.strokeStyle = C.radiceChiara;
      g.lineWidth = Math.max(1.5, spessore * 0.28);
      g.translate(-spessore * 0.15, -spessore * 0.2);
      tratto(g, punti); g.stroke();
      g.restore();
    }

    // fiorellino a cinque petali
    function fiore(g, x, y, r, colore) {
      g.fillStyle = colore;
      for (let k = 0; k < 5; k++) {
        const an = k * Math.PI * 2 / 5 + x;
        g.beginPath(); g.arc(x + Math.cos(an) * r, y + Math.sin(an) * r, r * 0.8, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.arc(x, y, r * 0.6, 0, Math.PI * 2); g.fill();
    }
    // foglia (di quercia, semplice) vista dall'alto
    function foglia(g, x, y, l, an, colore) {
      g.save();
      g.translate(x, y); g.rotate(an);
      g.fillStyle = colore;
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(l * 0.3, -l * 0.42, l * 0.75, -l * 0.36, l, 0);
      g.bezierCurveTo(l * 0.75, l * 0.36, l * 0.3, l * 0.42, 0, 0);
      g.fill();
      g.strokeStyle = 'rgba(40,70,10,0.45)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(l * 0.9, 0); g.stroke();
      g.restore();
    }
    // macchia morbida (terra, luce)
    function macchia(g, x, y, rx, ry, colore, a) {
      g.save();
      g.translate(x, y); g.scale(1, ry / rx);
      const gr = g.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx);
      gr.addColorStop(0, hexA(colore, a)); gr.addColorStop(0.7, hexA(colore, a * 0.8)); gr.addColorStop(1, hexA(colore, 0));
      g.fillStyle = gr;
      g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill();
      g.restore();
    }

    // Strato 1: il prato al sole con la terra chiara e le radici (disegnato una volta)
    function disegnaFondo(g) {
      seme = 11;
      g.save();
      formaTavolo(g);
      g.clip();
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, C.prato[0]); gr.addColorStop(0.35, C.prato[1]); gr.addColorStop(0.7, C.prato[2]); gr.addColorStop(1, C.prato[3]);
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H + 20);
      // sentieri di terra battuta dove corre la ghianda
      const sentieri = [
        [300, 230, 210, 150], [380, 520, 90, 170], [330, 800, 150, 130], [330, 1080, 170, 120], [300, 1300, 230, 170],
        [300, 1560, 250, 130], [300, 1760, 200, 140], [110, 1660, 60, 180], [490, 1660, 60, 180], [545, 1180, 50, 160],
      ];
      for (const [x, y, rx, ry] of sentieri) macchia(g, x, y, rx, ry, C.terra, 0.85);
      for (const [x, y, rx, ry] of sentieri) macchia(g, x + rx * 0.25, y + ry * 0.2, rx * 0.5, ry * 0.45, C.terraScura, 0.25);
      // fili d'erba
      g.lineCap = 'round';
      for (let i = 0; i < 1500; i++) {
        const x = 24 + rnd() * 592, y = rnd() * H, l = 4 + rnd() * 7, an = -Math.PI / 2 + (rnd() - 0.5) * 0.9;
        g.strokeStyle = rnd() < 0.5 ? 'rgba(60,120,30,0.38)' : 'rgba(200,240,140,0.4)';
        g.lineWidth = 1.2 + rnd();
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke();
      }
      // sassolini e granelli chiari
      for (let i = 0; i < 700; i++) {
        const x = rnd() * W, y = rnd() * H, r = 0.6 + rnd() * 1.8;
        g.fillStyle = rnd() < 0.5 ? 'rgba(150,110,60,0.35)' : 'rgba(255,250,235,0.45)';
        g.beginPath(); g.ellipse(x, y, r, r * 0.7, rnd() * 3, 0, Math.PI * 2); g.fill();
      }
      for (let i = 0; i < 22; i++) {
        const x = 40 + rnd() * 540, y = 120 + rnd() * 1700, r = 5 + rnd() * 9;
        g.fillStyle = 'rgba(120,100,80,0.25)';
        g.beginPath(); g.ellipse(x + 2, y + 3, r, r * 0.65, 0.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = rnd() < 0.5 ? '#e4ddd2' : '#cfc6b9';
        g.beginPath(); g.ellipse(x, y, r, r * 0.65, rnd() * 3, 0, Math.PI * 2); g.fill();
      }
      // radici chiare che affiorano
      const radici = [
        [[20, 1240], [110, 1300], [170, 1420], [240, 1500], [280, 1610]],
        [[580, 1180], [500, 1260], [430, 1380], [380, 1520]],
        [[260, 700], [230, 820], [250, 980], [210, 1150], [240, 1300]],
        [[620, 640], [560, 700], [520, 820]],
        [[20, 1700], [70, 1760], [120, 1880]],
        [[580, 1700], [530, 1780], [500, 1900]],
        [[300, 420], [340, 520], [330, 600], [380, 650]],
        [[520, 360], [470, 420], [460, 480]],
      ];
      for (const r of radici) {
        const pts = [];
        for (let i = 0; i < r.length - 1; i++) {
          const a = r[i], b = r[i + 1];
          for (let k = 0; k < 6; k++) {
            const t = k / 6;
            pts.push([a[0] + (b[0] - a[0]) * t + Math.sin(i * 3 + k) * 4, a[1] + (b[1] - a[1]) * t]);
          }
        }
        pts.push(r[r.length - 1]);
        radice(g, pts, 10 + rnd() * 6);
        for (let i = 2; i < pts.length - 2; i += 4) {
          const [x, y] = pts[i];
          const a = rnd() * Math.PI * 2;
          radice(g, [[x, y], [x + Math.cos(a) * 22, y + Math.sin(a) * 22], [x + Math.cos(a + 0.4) * 40, y + Math.sin(a + 0.4) * 40]], 3 + rnd() * 3);
        }
      }
      // trifogli e ciuffi d'erba più scura
      for (let i = 0; i < 60; i++) {
        const x = 34 + rnd() * 560, y = 130 + rnd() * 1760;
        for (let k = 0; k < 3; k++) {
          const an = k * Math.PI * 2 / 3 + rnd();
          g.fillStyle = k % 2 ? '#4f9a2a' : '#5fae32';
          g.beginPath(); g.arc(x + Math.cos(an) * 4, y + Math.sin(an) * 4, 4, 0, Math.PI * 2); g.fill();
        }
      }
      // foglie di quercia cadute
      for (let i = 0; i < 26; i++) {
        const x = 40 + rnd() * 540, y = 140 + rnd() * 1740;
        foglia(g, x, y, 14 + rnd() * 8, rnd() * 6.28, ['#6fb53a', '#9ccc3c', '#e0a838', '#d9832a'][Math.floor(rnd() * 4)]);
      }
      // fiorellini bianchi, gialli, lilla e rossi
      const colori = ['#ffffff', '#fff27a', '#c9a6ff', '#ff8aa0', '#ffffff'];
      for (let i = 0; i < 120; i++) {
        const x = 30 + rnd() * 580, y = 120 + rnd() * 1770;
        fiore(g, x, y, 2.4 + rnd() * 1.8, colori[Math.floor(rnd() * colori.length)]);
      }
      // luce calda del sole dall'alto e chiazze di luce tra le foglie
      const sole = g.createRadialGradient(320, 40, 20, 320, 120, 520);
      sole.addColorStop(0, 'rgba(255,240,170,0.55)'); sole.addColorStop(1, 'rgba(255,240,170,0)');
      g.fillStyle = sole;
      g.fillRect(0, 0, W, 700);
      for (let i = 0; i < 18; i++) macchia(g, 40 + rnd() * 540, 200 + rnd() * 1600, 30 + rnd() * 40, 20 + rnd() * 26, '#fff6c8', 0.22);
      // ombra delle fronde lungo i bordi
      const ombra = g.createLinearGradient(20, 0, 110, 0);
      ombra.addColorStop(0, 'rgba(40,80,20,0.28)'); ombra.addColorStop(1, 'rgba(40,80,20,0)');
      g.fillStyle = ombra; g.fillRect(0, 0, 110, H + 20);
      const ombra2 = g.createLinearGradient(620, 0, 530, 0);
      ombra2.addColorStop(0, 'rgba(40,80,20,0.28)'); ombra2.addColorStop(1, 'rgba(40,80,20,0)');
      g.fillStyle = ombra2; g.fillRect(530, 0, 90, H + 20);
      // il corridoio di lancio: assi di legno chiaro
      g.fillStyle = '#c99a5e';
      g.fillRect(580, 330, 40, H);
      g.strokeStyle = 'rgba(90,55,20,0.4)';
      g.lineWidth = 1;
      for (let y = 360; y < H; y += 46) { g.beginPath(); g.moveTo(580, y); g.lineTo(620, y); g.stroke(); }
      // la nicchia della buca (la tana del ghiro)
      g.fillStyle = '#3a2410';
      g.beginPath(); g.arc(BUCA.x, BUCA.y, 22, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#140a03';
      g.beginPath(); g.arc(BUCA.x, BUCA.y + 2, 17, 0, Math.PI * 2); g.fill();
      // base del piolo d'oro
      g.fillStyle = 'rgba(60,40,10,0.25)';
      g.beginPath(); g.arc(PIOLO.x + 4, PIOLO.y + 5, PIOLO.r + 4, 0, Math.PI * 2); g.fill();
      // cunicolo del cece: canaletta di legno
      g.fillStyle = '#8a5a2e';
      g.fillRect(521, 1230, 38, 98);
      // scritta dipinta
      g.font = '700 22px Fredoka, sans-serif';
      g.textAlign = 'center';
      g.fillStyle = 'rgba(110,70,30,0.3)';
      g.save(); g.translate(300, 1470); g.fillText('LE RADICI DELLA QUERCIA', 0, 0); g.restore();
      g.restore();
    }

    // Strato 2: legno delle pareti, massa delle radici, fionde
    function disegnaPareti(g) {
      seme = 99;
      g.save();
      // la massa delle radici sotto la galleria
      g.save();
      g.shadowColor = 'rgba(50,40,10,0.35)'; g.shadowBlur = 16; g.shadowOffsetX = 6; g.shadowOffsetY = 8;
      poligono(g, MASSA.concat(DIETRO_SASSI.slice(1)));
      const gm = g.createLinearGradient(0, 340, 240, 1150);
      gm.addColorStop(0, '#b8844a'); gm.addColorStop(1, '#94643a');
      g.fillStyle = gm;
      g.fill();
      g.restore();
      g.save();
      poligono(g, MASSA.concat(DIETRO_SASSI.slice(1)));
      g.clip();
      // venature della corteccia
      g.strokeStyle = 'rgba(90,55,20,0.45)';
      g.lineWidth = 2;
      for (let i = 0; i < 46; i++) {
        const x = rnd() * 260, y = 330 + rnd() * 830;
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 8, y + 30, x - 6, y + 60, x + 4, y + 90 + rnd() * 50); g.stroke();
      }
      g.strokeStyle = 'rgba(255,225,170,0.35)';
      for (let i = 0; i < 30; i++) {
        const x = rnd() * 260, y = 330 + rnd() * 830;
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 6, y + 20, x - 4, y + 40, x + 2, y + 70); g.stroke();
      }
      // muschio e foglioline sulla corteccia
      for (let i = 0; i < 34; i++) {
        const x = 30 + rnd() * 200, y = 400 + rnd() * 720;
        for (let k = 0; k < 5; k++) {
          g.fillStyle = hexA(k % 2 ? '#7fbf45' : '#5f9a32', 0.75);
          g.beginPath(); g.arc(x + (rnd() - 0.5) * 14, y + (rnd() - 0.5) * 9, 2 + rnd() * 3, 0, Math.PI * 2); g.fill();
        }
      }
      g.restore();
      // edera lungo il bordo della massa
      for (let i = 2; i < MASSA.length - 1; i += 2) {
        const [x, y] = MASSA[i];
        foglia(g, x, y, 14, rnd() * 6.28, i % 4 ? '#6fb53a' : '#8fcf4a');
      }
      // isola del giro della morte
      poligono(g, [[413, 953], [428, 895], [482, 909], [467, 967]]);
      g.fillStyle = '#a8743f';
      g.fill();
      // fionde: gomma chiara su un ceppo
      FIONDE.forEach((p) => {
        poligono(g, p);
        const gf = g.createLinearGradient(p[0][0], p[0][1], p[2][0], p[2][1]);
        gf.addColorStop(0, '#d9a466'); gf.addColorStop(1, '#a8743f');
        g.fillStyle = gf;
        g.fill();
        g.fillStyle = '#ffcf6b';
        const cx = (p[0][0] + p[1][0] + p[2][0]) / 3, cy = (p[0][1] + p[1][1] + p[2][1]) / 3;
        g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
      });
      // pareti di legno: tutte le linee dure del piano 0
      const linee = m.segmenti[0].filter((s) => ['muro', 'stantuffo', 'paletto'].includes(s.tipo));
      const passa = (w, col, dx = 0, dy = 0) => {
        g.strokeStyle = col;
        g.lineWidth = w;
        g.beginPath();
        for (const s of linee) { g.moveTo(s.ax + dx, s.ay + dy); g.lineTo(s.bx + dx, s.by + dy); }
        g.stroke();
      };
      g.lineCap = 'round';
      passa(11, 'rgba(50,40,10,0.3)', 3, 4);
      passa(9, C.legnoScuro);
      passa(6, C.legno);
      passa(2, C.legnoChiaro, -1, -1);
      // fionde: bordo di gomma
      g.lineWidth = 7;
      FIONDE.forEach((p) => {
        g.strokeStyle = '#efe6d2';
        g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[2][0], p[2][1]); g.stroke();
      });
      // paletti
      for (const c of m.cerchi[0]) {
        if (c.tipo !== 'paletto' && c.tipo !== 'muro') continue;
        g.fillStyle = 'rgba(50,40,10,0.3)';
        g.beginPath(); g.arc(c.x + 2, c.y + 3, c.r + 2, 0, Math.PI * 2); g.fill();
        const gp = g.createRadialGradient(c.x - 2, c.y - 2, 1, c.x, c.y, c.r + 2);
        gp.addColorStop(0, '#fff4dc'); gp.addColorStop(1, '#a8743f');
        g.fillStyle = gp;
        g.beginPath(); g.arc(c.x, c.y, c.r + 1, 0, Math.PI * 2); g.fill();
        // l'anello di gomma attorno al paletto
        if (c.tipo === 'paletto' && c.r >= 5) {
          g.strokeStyle = 'rgba(40,22,6,0.7)'; g.lineWidth = 3.5;
          g.beginPath(); g.arc(c.x, c.y, c.r + 0.5, 0, Math.PI * 2); g.stroke();
          g.strokeStyle = '#efe6d2'; g.lineWidth = 2;
          g.beginPath(); g.arc(c.x, c.y, c.r + 0.5, 0, Math.PI * 2); g.stroke();
        }
      }
      // cornice del tavolo
      g.lineWidth = 14;
      g.strokeStyle = '#6e4622';
      formaTavolo(g);
      g.stroke();
      g.lineWidth = 6;
      g.strokeStyle = '#d9a466';
      formaTavolo(g);
      g.stroke();
      g.restore();
    }

    // Strato 3: la galleria alta (assi rialzate) e la dispensa
    const PIANO_GALLERIA = [[40, 368], [240, 368], [240, 560], [168, 650], [40, 650]];
    function disegnaGalleria(g) {
      seme = 5;
      g.save();
      g.shadowColor = 'rgba(50,40,10,0.4)'; g.shadowBlur = 20; g.shadowOffsetX = 10; g.shadowOffsetY = 14;
      poligono(g, PIANO_GALLERIA);
      g.fillStyle = C.asse;
      g.fill();
      g.restore();
      g.save();
      poligono(g, PIANO_GALLERIA);
      g.clip();
      // assi verticali
      for (let x = 40; x < 240; x += 25) {
        g.fillStyle = (x / 25) % 2 ? '#e2b478' : '#d6a66a';
        g.fillRect(x, 368, 25, 290);
        g.strokeStyle = 'rgba(110,70,30,0.55)';
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x, 368); g.lineTo(x, 660); g.stroke();
        g.strokeStyle = 'rgba(130,85,40,0.3)';
        for (let k = 0; k < 3; k++) {
          const xx = x + 4 + rnd() * 17;
          g.beginPath(); g.moveTo(xx, 368); g.bezierCurveTo(xx + 3, 450, xx - 3, 560, xx + 1, 660); g.stroke();
        }
        g.fillStyle = '#6e4622';
        g.beginPath(); g.arc(x + 12, 380, 1.8, 0, Math.PI * 2); g.arc(x + 12, 640, 1.8, 0, Math.PI * 2); g.fill();
      }
      // il pozzo
      const gp = g.createRadialGradient(POZZO.x, POZZO.y, 2, POZZO.x, POZZO.y, 20);
      gp.addColorStop(0, '#000'); gp.addColorStop(1, '#2b1708');
      g.fillStyle = gp;
      g.beginPath(); g.arc(POZZO.x, POZZO.y, 17, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#d9a35e'; g.lineWidth = 3; g.stroke();
      g.restore();
      // bordi di legno della galleria
      const linee = m.segmenti[1].filter((s) => s.tipo === 'muro' && s.ay < 690 && s.by < 690);
      g.lineCap = 'round';
      for (const [w, col, d] of [[12, 'rgba(50,40,10,0.3)', 3], [9, '#6e4622', 0], [6, '#c99258', 0], [2, '#f6d8a4', -1]]) {
        g.strokeStyle = col; g.lineWidth = w;
        g.beginPath();
        for (const s of linee) { g.moveTo(s.ax + d, s.ay + d); g.lineTo(s.bx + d, s.by + d); }
        g.stroke();
      }
      for (const c of m.cerchi[1]) {
        if (c.tipo !== 'paletto' && c.tipo !== 'muro') continue;
        g.fillStyle = '#e8c48c';
        g.beginPath(); g.arc(c.x, c.y, c.r + 1, 0, Math.PI * 2); g.fill();
      }
      // scivolo verso il campo
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(50,40,10,0.25)'; g.lineWidth = 26;
      tratto(g, m.percorsi.scivolo.punti.map(([x, y]) => [x + 4, y + 6])); g.stroke();
      g.strokeStyle = '#9c6a38'; g.lineWidth = 24;
      tratto(g, m.percorsi.scivolo.punti); g.stroke();
      g.strokeStyle = '#d9a868'; g.lineWidth = 16;
      tratto(g, m.percorsi.scivolo.punti); g.stroke();
      // la dispensa: tubo di vetro con gli anelli
      g.fillStyle = 'rgba(50,40,10,0.25)';
      g.beginPath(); g.roundRect ? g.roundRect(30, 662, 36, 228, 16) : g.rect(30, 662, 36, 228); g.fill();
      g.fillStyle = 'rgba(210,240,255,0.45)';
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 2;
      g.beginPath(); g.roundRect ? g.roundRect(26, 656, 36, 228, 16) : g.rect(26, 656, 36, 228); g.fill(); g.stroke();
      g.fillStyle = '#8c8c8c';
      for (const y of [690, 780, 860]) g.fillRect(24, y, 40, 5);
      g.font = '700 11px Fredoka, sans-serif';
      g.fillStyle = '#6e4622';
      g.textAlign = 'center';
      g.save(); g.translate(44, 770); g.rotate(-Math.PI / 2); g.fillText('DISPENSA', 0, 4); g.restore();
    }

    // Strato 4: rampe (radice lunga, giro della morte con la liana)
    function disegnaRampe(g) {
      g.save();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      const pista = (punti, w, a = 0.62) => {
        g.strokeStyle = 'rgba(50,40,10,0.22)'; g.lineWidth = w + 6;
        tratto(g, punti.map(([x, y]) => [x + 8, y + 12])); g.stroke();
        g.strokeStyle = hexA('#b07a42', a); g.lineWidth = w;
        tratto(g, punti); g.stroke();
        g.strokeStyle = hexA('#f0c890', a + 0.2); g.lineWidth = 3;
        // due bordi: si ottengono spostando la linea a destra e a sinistra
        for (const lato of [-1, 1]) {
          const off = punti.map((p, i) => {
            const q = punti[Math.min(i + 1, punti.length - 1)], o = punti[Math.max(i - 1, 0)];
            const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1;
            return [p[0] - dy / l * w / 2 * lato, p[1] + dx / l * w / 2 * lato];
          });
          tratto(g, off); g.stroke();
        }
      };
      pista(m.percorsi.rampa.punti, 30);
      pista(m.percorsi.rampaB.punti, 26);
      pista(m.percorsi.rampaA.punti, 26, 0.5);
      // giro della morte: salita, anello di metallo, poi la liana
      const giro = m.percorsi.giro.punti;
      const salita = giro.slice(0, 15);
      pista(salita, 28);
      g.strokeStyle = 'rgba(50,40,10,0.25)'; g.lineWidth = 16;
      g.beginPath(); g.arc(ANELLO.x + 8, ANELLO.y + 12, ANELLO.r, 0, Math.PI * 2); g.stroke();
      for (const [w, col] of [[14, '#6f7c86'], [9, '#b9c6cf'], [3, '#f1f6fa']]) {
        g.strokeStyle = col; g.lineWidth = w;
        g.beginPath(); g.arc(ANELLO.x, ANELLO.y, ANELLO.r, 0, Math.PI * 2); g.stroke();
      }
      const liana = giro.slice(giro.length - 25);
      g.strokeStyle = 'rgba(50,40,10,0.22)'; g.lineWidth = 9;
      tratto(g, liana.map(([x, y]) => [x + 7, y + 10])); g.stroke();
      g.globalAlpha = 0.75;
      g.strokeStyle = '#3f6b22'; g.lineWidth = 6;
      tratto(g, liana); g.stroke();
      g.strokeStyle = '#7fb24a'; g.lineWidth = 2;
      tratto(g, liana); g.stroke();
      // foglioline sulla liana
      for (let i = 2; i < liana.length - 1; i += 3) {
        const [x, y] = liana[i];
        g.fillStyle = i % 2 ? '#6ea83b' : '#4f8a2a';
        g.save(); g.translate(x, y); g.rotate(i);
        g.beginPath(); g.ellipse(7, 0, 7, 3.5, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      g.globalAlpha = 1;
      // liana della dispensa (sottile)
      const disp = m.percorsi.dispensa.punti;
      g.strokeStyle = 'rgba(60,120,30,0.5)'; g.lineWidth = 3;
      tratto(g, disp); g.stroke();
      g.restore();
    }

    // ---------------------------------------------------- disegno vivo
    const lampeggia = (vel = 4) => Math.sin(G.stato.tempo * vel * Math.PI) > 0;
    function lampade(g) {
      const d = G.d;
      const st = G.stato;
      const t = G.tinta();
      // corsie T·I·N·O
      ['T', 'I', 'N', 'O'].forEach((l, i) => {
        const skill = S.skill.attivo && S.skill.corsia === i && st.lancio.palla;
        d.lampada(g, CORSIE[i], 186, 13, t.neon, S.corsie[i] || (skill && lampeggia(6)) || (S.lampoCorsie > 0 && lampeggia(8)), l);
      });
      // frecce dei tiri
      const multi = st.multiball || inAvv('ghianda');
      const combo = st.combo.t > 0;
      d.lampada(g, 132, 1050, 13, t.neon, (multi || S.dispensa.aperta || (inAvv('chiave') && S.chiaveAvv) || combo) && lampeggia(multi ? 6 : 3), '', 'freccia', -0.33);
      d.lampada(g, 442, 1012, 13, t.neon, (multi || combo) && lampeggia(multi ? 6 : 3), '', 'freccia', 0.25);
      d.lampada(g, 550, 1010, 12, t.neon, combo && lampeggia(3), '', 'freccia', 0);
      d.lampada(g, BUCA.x, 948, 12, t.neon2, (S.avventuraPronta || S.extraAccesa || inAvv('torce') || !S.sassoSu) && lampeggia(S.avventuraPronta ? 6 : 2), '', 'freccia', 0);
      d.lampada(g, 300, 1112, 11, t.neon, (inAvv('inseguimento') || (!S.avventuraPronta && !avv())) && S.agente.stordito <= 0 && lampeggia(2), '', 'freccia', 0);
      d.lampada(g, 528, 1384, 11, '#ffe27a', inAvv('chiave') ? lampeggia(4) : CECE.lampo > 0, '', 'freccia', 0.5);
      d.lampada(g, 168, 1150, 11, t.neon, inAvv('frana') ? lampeggia(5) : S.dispensa.aperta, '', 'freccia', -1.1);
      // chiavi verso la palla extra
      for (let i = 0; i < 3; i++) d.lampada(g, 478 + i * 18, 1232 + i * 4, 6, '#ffe27a', S.chiavi > i);
      // dispensa: ghiande bloccate
      // palla extra, resina, radice che spunta, molla, ancora
      d.lampada(g, BUCA.x + 46, 926, 9, '#9cff7a', S.extraAccesa && lampeggia(4), 'E');
      d.lampada(g, RESINA.x, RESINA.y + 44, 10, t.neon2, S.resina, 'R');
      d.lampada(g, 300, 1878, 9, '#9cff7a', S.palo > 0 && (S.palo > 3 || lampeggia(6)));
      d.lampada(g, 62, 1660, 9, '#ffe9a8', S.kickback, 'M');
      d.lampada(g, 300, 1610, 13, '#9cff7a', st.salva > 0 && (st.salva > 2.5 || lampeggia(6)), 'ANCORA', 'pillola');
      // avventure fatte, attorno al piolo d'oro
      const fatte = st.avventureFatte;
      AVVENTURE.forEach((a, i) => {
        const ang = -Math.PI / 2 + (i - 1.5) * 0.5;
        const acceso = fatte.includes(a.id) || (st.avventura && st.avventura.id === a.id && lampeggia(3));
        d.lampada(g, PIOLO.x + Math.cos(ang) * 80, PIOLO.y + 10 + Math.sin(ang) * 80, 8, a.tinta, acceso);
      });
      // moltiplicatore del bonus
      for (let k = 2; k <= 6; k++) d.lampada(g, 196 + (k - 2) * 52, 1550, 11, t.neon, st.bonusMolt >= k, `${k}×`);
    }

    function disegnaPavimento(g) {
      const d = G.d;
      const st = G.stato;
      lampade(g);
      // piolo d'oro: disco che gira
      g.save();
      g.translate(PIOLO.x, PIOLO.y);
      g.rotate(PIOLO.ang);
      const gd = g.createRadialGradient(-10, -12, 4, 0, 0, PIOLO.r);
      gd.addColorStop(0, '#fff2b0'); gd.addColorStop(0.5, '#e0a82a'); gd.addColorStop(1, '#8a5a0e');
      g.fillStyle = gd;
      g.beginPath(); g.arc(0, 0, PIOLO.r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(90,50,5,0.6)';
      g.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(i * Math.PI / 4) * PIOLO.r, Math.sin(i * Math.PI / 4) * PIOLO.r); g.stroke();
      }
      g.beginPath(); g.arc(0, 0, PIOLO.r - 4, 0, Math.PI * 2); g.stroke();
      g.restore();
      g.fillStyle = '#ffe9a8';
      g.beginPath(); g.arc(PIOLO.x, PIOLO.y, 9, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#7a4a0a'; g.lineWidth = 2; g.stroke();
      if (S.lampoPiolo > 0 || (S.superJackpot && lampeggia(5))) d.luce(g, PIOLO.x, PIOLO.y, 90, '#ffd23f', S.superJackpot ? 0.9 : S.lampoPiolo);
      // resina
      const rr = S.resina ? 1 : S.lampoResina;
      if (rr > 0 || RESINA.palla) {
        const k = RESINA.palla ? 1 : rr;
        g.fillStyle = hexA('#e8901c', 0.35 * k + 0.1 * Math.sin(st.tempo * 6) * k);
        g.beginPath(); g.ellipse(RESINA.x, RESINA.y, 30, 24, 0.3, 0, Math.PI * 2); g.fill();
        d.luce(g, RESINA.x, RESINA.y, 60, '#ff9a1e', 0.5 * k);
      }
      g.fillStyle = hexA('#c8781a', 0.5);
      g.beginPath(); g.ellipse(RESINA.x, RESINA.y, 14, 11, 0.3, 0, Math.PI * 2); g.fill();
      // tinta dell'avventura (velo leggero sul campo)
      const a = st.avventura;
      if (a) {
        g.save();
        formaTavolo(g);
        g.fillStyle = hexA(a.tinta || '#ffffff', 0.07 + 0.03 * Math.sin(st.tempo * 2));
        g.fill();
        g.restore();
      }
    }

    // fiamma animata
    function fiamma(g, x, y, s, accesa, ora) {
      const d = G.d;
      if (!accesa) {
        g.fillStyle = '#3a2a1a';
        g.beginPath(); g.ellipse(x, y, 4 * s, 3 * s, 0, 0, Math.PI * 2); g.fill();
        return;
      }
      const f = Math.sin(ora * 13 + x) * 0.15 + Math.sin(ora * 7.3 + y) * 0.1;
      g.save();
      g.translate(x, y);
      g.scale(s, s * (1 + f));
      g.fillStyle = '#ff7a1a';
      g.beginPath(); g.moveTo(0, -18); g.quadraticCurveTo(10, -4, 7, 4); g.quadraticCurveTo(0, 9, -7, 4); g.quadraticCurveTo(-10, -4, 0, -18); g.fill();
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.moveTo(0, -10); g.quadraticCurveTo(5, -1, 4, 3); g.quadraticCurveTo(0, 6, -4, 3); g.quadraticCurveTo(-5, -1, 0, -10); g.fill();
      g.restore();
      d.luce(g, x, y - 6 * s, 34 * s, '#ff9a2a', 0.6);
    }

    function disegnaCampo(g, ora) {
      const d = G.d;
      const st = G.stato;
      // bumper: nodi di legno col cappello d'ambra
      for (const b of BUMPER) {
        g.fillStyle = 'rgba(50,40,10,0.3)';
        g.beginPath(); g.arc(b.x + 4, b.y + 6, 30, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#8a5a2e';
        g.beginPath(); g.arc(b.x, b.y, 30, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e2b478';
        g.beginPath(); g.arc(b.x, b.y, 26, 0, Math.PI * 2); g.fill();
        // anelli del legno
        g.strokeStyle = '#b07a42'; g.lineWidth = 2;
        for (const r of [26, 20, 14]) { g.beginPath(); g.arc(b.x, b.y, r, 0, Math.PI * 2); g.stroke(); }
        const k = b.lampo;
        // il colpo: l'anello del nodo "salta" (si allarga e sbiadisce) e il cappello d'ambra si gonfia
        if (k > 0) {
          g.strokeStyle = hexA('#fff6d0', 0.85 * k); g.lineWidth = 4 * k + 1;
          g.beginPath(); g.arc(b.x, b.y, 30 + 24 * (1 - k), 0, Math.PI * 2); g.stroke();
        }
        const ga = g.createRadialGradient(b.x - 6, b.y - 7, 2, b.x, b.y, 18);
        ga.addColorStop(0, k > 0 ? '#fffbe0' : '#ffe2a0'); ga.addColorStop(1, k > 0 ? '#ffb000' : '#c9781a');
        g.fillStyle = ga;
        g.beginPath(); g.arc(b.x, b.y, 15 + 4 * k, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)';
        g.beginPath(); g.ellipse(b.x - 5, b.y - 6, 5 + k, 3 + k, -0.6, 0, Math.PI * 2); g.fill();
        if (k > 0) d.luce(g, b.x, b.y, 70, '#ffb347', k);
      }
      // sassi (bersagli che cadono)
      for (const s of SASSI) {
        if (!S.sassi[s.i]) {
          g.strokeStyle = 'rgba(120,110,100,0.5)'; g.lineWidth = 3;
          g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke();
          continue;
        }
        g.save();
        g.translate((s.ax + s.bx) / 2, (s.ay + s.by) / 2);
        g.rotate(Math.atan2(s.by - s.ay, s.bx - s.ax));
        g.fillStyle = 'rgba(50,40,10,0.3)';
        g.beginPath(); g.ellipse(3, 4, 15, 8, 0, 0, Math.PI * 2); g.fill();
        const gs = g.createLinearGradient(0, -8, 0, 8);
        gs.addColorStop(0, s.lampo > 0 ? '#ffffff' : '#d6cfc6'); gs.addColorStop(1, '#7b746c');
        g.fillStyle = gs;
        g.beginPath(); g.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#4b4540'; g.lineWidth = 1.5; g.stroke();
        g.restore();
      }
      // cartelli
      for (const c of CARTELLI) {
        const su = S.cartelli[c.i];
        g.save();
        g.translate(c.x, c.y);
        if (su) {
          g.fillStyle = 'rgba(50,40,10,0.3)';
          g.fillRect(-15, 2, 34, 12);
          g.fillStyle = c.lampo > 0 ? '#fff3d6' : '#e7d3a8';
          g.fillRect(-17, -8, 34, 14);
          g.strokeStyle = '#5c3d21'; g.lineWidth = 2;
          g.strokeRect(-17, -8, 34, 14);
          g.fillStyle = '#5c3d21';
          g.font = '700 10px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(['↑', '★', '↑'][c.i], 0, -1);
        } else {
          g.fillStyle = 'rgba(231,211,168,0.35)';
          g.fillRect(-17, -2, 34, 6);
        }
        g.restore();
      }
      // sasso che spunta davanti alla buca
      if (S.sassoSu) {
        g.fillStyle = 'rgba(50,40,10,0.3)';
        g.beginPath(); g.ellipse(SASSO.ax + 27, 908, 26, 9, 0, 0, Math.PI * 2); g.fill();
        const gs = g.createLinearGradient(0, 895, 0, 912);
        gs.addColorStop(0, '#cfc8bf'); gs.addColorStop(1, '#6f6861');
        g.fillStyle = gs;
        g.beginPath(); g.ellipse(200, 903, 26, 9, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#3f3a35'; g.lineWidth = 1.5; g.stroke();
      }
      // cece nel cunicolo
      g.fillStyle = 'rgba(255,240,210,0.35)';
      g.fillRect(525, 1238, 30, 90);
      const gc = g.createRadialGradient(CECE.x - 4, CECE.y - 5, 2, CECE.x, CECE.y, R);
      gc.addColorStop(0, '#fff6d6'); gc.addColorStop(1, '#c9a35a');
      g.fillStyle = gc;
      g.beginPath(); g.arc(CECE.x, CECE.y, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(120,80,20,0.6)'; g.lineWidth = 1;
      g.beginPath(); g.arc(CECE.x + 3, CECE.y - 2, 5, 0.5, 2.5); g.stroke();
      if (CECE.lampo > 0) d.luce(g, CECE.x, CECE.y, 40, '#ffe27a', CECE.lampo);
      g.fillStyle = '#ffe27a';
      g.fillRect(525, 1238, 30, 4);
      // agente
      const a = S.agente;
      const img = G.immagini.agente;
      if (G.pronta(img)) {
        const hh = 74, ww = hh * img.naturalWidth / img.naturalHeight;
        g.save();
        g.translate(AG.x, AG.y + 22);
        if (a.stordito > 0) {
          g.rotate(-1.25 * Math.min(1, (AGENTE.stordito - a.stordito) * 3));
          g.translate(-ww * 0.1, 0);
        } else {
          const passo = Math.abs(AG.vx) > 1 ? Math.abs(Math.sin(ora * 9)) * 3 : 0;
          g.translate(0, -passo);
          if (a.trema > 0) g.translate(Math.sin(ora * 60) * 3, 0);
        }
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.beginPath(); g.ellipse(4, 2, ww * 0.42, 6, 0, 0, Math.PI * 2); g.fill();
        g.drawImage(img, -ww / 2, -hh, ww, hh);
        g.restore();
        if (a.stordito > 0) {
          for (let i = 0; i < 3; i++) {
            const an = ora * 4 + i * 2.1;
            g.fillStyle = '#fff27a';
            g.font = '700 14px Fredoka, sans-serif';
            g.fillText('★', AG.x + Math.cos(an) * 24, AG.y - 10 + Math.sin(an) * 8);
          }
        }
      } else {
        g.fillStyle = '#5a6b85';
        g.beginPath(); g.arc(AG.x, AG.y, AG.r, 0, Math.PI * 2); g.fill();
      }
      // spinner
      const sp = Math.abs(Math.cos(SPINNER.ang));
      g.fillStyle = '#d9dee2';
      g.fillRect(SPINNER.x - 26, SPINNER.y - 3 * sp - 1, 52, 6 * sp + 2);
      g.strokeStyle = '#4a5560'; g.lineWidth = 1.5;
      g.strokeRect(SPINNER.x - 26, SPINNER.y - 3 * sp - 1, 52, 6 * sp + 2);
      g.fillStyle = '#6f7c86';
      g.fillRect(SPINNER.x - 28, SPINNER.y - 1, 4, 2); g.fillRect(SPINNER.x + 24, SPINNER.y - 1, 4, 2);
      // cancello in cima al corridoio
      g.strokeStyle = '#4a5560'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(616, 394); g.lineTo(558, 452); g.stroke();
      g.strokeStyle = '#e8edf0'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(616, 394); g.lineTo(558, 452); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1;
      for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(612 - k * 10, 398 + k * 10); g.lineTo(612 - k * 10, 404 + k * 10); g.stroke(); }
      // fionde che lampeggiano
      FIONDE.forEach((p, k) => {
        if (S.lampoFionda[k] > 0) d.luce(g, (p[0][0] + p[2][0]) / 2, (p[0][1] + p[2][1]) / 2, 40, '#ffe9a8', S.lampoFionda[k]);
      });
      // radice che spunta
      if (S.palo > 0) {
        g.fillStyle = '#5f8a3a';
        g.beginPath(); g.arc(300, 1836, 10, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#2f4a1a'; g.lineWidth = 2; g.stroke();
        g.fillStyle = '#9cd36b';
        g.beginPath(); g.arc(297, 1833, 4, 0, Math.PI * 2); g.fill();
      }
      disegnaGino(g, ora);
      // flipper del piano 0
      for (const f of m.flipper) if (f.piano === 0) d.flipper(g, f);
    }

    // Gino seduto sul piolo d'oro: tremolio quando è colpito, saltello sui
    // jackpot, cade di lato a fine partita
    function disegnaGino(g, ora) {
      const d = G.d;
      const st = G.stato;
      const pronto = S.superJackpot || inAvv('ghianda');
      // cuscinetto: anello di gomma color crema col bordo arancione
      g.fillStyle = 'rgba(50,40,10,0.3)';
      g.beginPath(); g.arc(GINO.x + 3, GINO.y + 5, GINO.r + 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff6e0';
      g.beginPath(); g.arc(GINO.x, GINO.y, GINO.r, 0, Math.PI * 2); g.fill();
      g.lineWidth = 4;
      g.strokeStyle = pronto && lampeggia(5) ? '#fff27a' : S.resina ? '#ff961e' : '#e8521e';
      g.stroke();
      if (GINO.trema > 0) d.luce(g, GINO.x, GINO.y, 70, '#ffd23f', GINO.trema * 1.6);
      if (pronto) d.luce(g, GINO.x, GINO.y, 80, '#ffd23f', 0.5 + 0.3 * Math.sin(st.tempo * 10));
      const img = G.immagini.gino;
      if (!G.pronta(img)) return;
      const hh = 78, ww = hh * img.naturalWidth / img.naturalHeight;
      g.save();
      g.translate(GINO.x + (GINO.trema > 0 ? Math.sin(ora * 70) * 4 * GINO.trema / 0.5 : 0), GINO.y + 2);
      if (GINO.salto > 0) {
        const k = Math.sin(GINO.salto * Math.PI * 3);
        g.translate(0, -Math.abs(k) * 16);
        g.scale(1 - k * 0.07, 1 + k * 0.07);
      }
      const perso = st.modo === 'gioco' && st.fase === 'finita';
      if (perso) g.rotate(0.6);
      else g.rotate(GINO.trema > 0 ? Math.sin(ora * 60) * 0.1 : Math.sin(ora * 1.5) * 0.05);
      g.fillStyle = 'rgba(50,40,10,0.25)';
      g.beginPath(); g.ellipse(4, hh * 0.38, ww * 0.38, 7, 0, 0, Math.PI * 2); g.fill();
      g.drawImage(img, -ww / 2, -hh / 2 - 6, ww, hh);
      g.restore();
    }

    function disegnaSopraGalleria(g, ora) {
      const d = G.d;
      const st = G.stato;
      // torce
      for (const t of TORCE) {
        g.fillStyle = '#5c3d21';
        g.fillRect(t.x - 13, 380, 26, 10);
        g.fillStyle = '#3b2210';
        g.fillRect(t.x - 4, 370, 8, 14);
        const accesa = S.torce[t.i] || t.lampo > 0;
        fiamma(g, t.x, 372, 1, accesa || (inAvv('torce') && lampeggia(2)), ora);
      }
      d.flipper(g, FL.alto);
    }

    function disegnaSopra(g) {
      // deviatore in cima alla radice lunga
      const d = G.d;
      const st = G.stato;
      const verso = S.dispensa.aperta && !st.multiball ? 1 : 0;
      g.save();
      g.translate(270, 438);
      g.rotate(verso ? 0.5 : -0.4);
      g.fillStyle = '#d9dee2';
      g.fillRect(-3, -16, 6, 32);
      g.restore();
      d.lampada(g, 300, 410, 7, '#ffe27a', verso && lampeggia(3));
      // ghiande ferme nella dispensa
      for (let i = 0; i < S.dispensa.bloccate; i++) d.ghianda(g, 44, 868 - i * 25, 0.3 * i, 1);
      if (S.dispensa.aperta && lampeggia(2)) d.luce(g, 44, 800, 60, '#ffe27a', 0.4);
    }

    // Comandi e testi
    const TESTI = {
      guida: `<div class="guida">
        <span><b>Sassi</b>: abbattili tutti e quattro per aprire la <b>dispensa</b>; poi prendi la <b>radice lunga</b>.</span>
        <span><b>Multiball</b>: tre ghiande nella dispensa. Jackpot sulla radice lunga e sul giro della morte.</span>
        <span><b>Agente</b>: colpiscilo tre volte per stordirlo, poi tira nella <b>buca del ghiro</b> per un'avventura.</span>
        <span><b>Galleria alta</b>: dal tunnel si sale nella galleria. Accendi le tre torce: campo ×2.</span>
        <span><b>Cece</b>: spingilo in fondo al cunicolo per le chiavi. Tre chiavi: palla extra.</span>
        <span><b>Cartelli</b>: abbattili tutti e spunta la radice che salva la ghianda tra i flipper.</span>
        <span><b>Gino</b>: è sul piolo d'oro. Colpiscilo e la <b>resina</b> ferma la ghianda e la tira dove serve; nel multiball, dopo tre jackpot, vale il <b>super jackpot</b>.</span>
        <span><b>Avventure</b>: le torce, la frana, la chiave, l'inseguimento. Poi la Ghianda d'Oro!</span>
      </div>`,
      frasi: {
        normale: () => (G.stato.multiball ? 'Che baraonda!' : G.stato.avventura ? 'Che avventura!' : S.avventuraPronta ? 'Presto, nel tunnel!' : 'Colpisci l\'agente!'),
      },
    };

    return {
      id: 'radici', nome: 'Le radici della Quercia', sotto: 'Legno, radici e torce sotto la grande quercia',
      W, H, CX, mondo: m, S, FL, gravita: 1450,
      colori: { neon: C.neon, neon2: C.neon2, luce: C.luce, barra: '#5c3a1c', fondo: '#9fd3ea', pannello: ['#8a5a2e', '#5c3a1c'], display: '#ff9a1e' },
      lancio: { x: 600, y: 1834, xCorridoio: 582, yRitorno: 1780, yStantuffo: 1846 },
      forma: formaTavolo,
      // flasher: dietro i nodi, in cima alla radice lunga, sull'anello del giro, sulla resina
      flasher: [[352, 290], [270, 438], [ANELLO.x, ANELLO.y], [300, 1290]],
      yPersa: 1925, salvaDa: 578,
      AVVENTURE, FINALE, PUNTI, AGENTE, ROBIVECCHI,
      musica: { brano: BRANO, stili: STILI },
      inArrivo: () => (S.dispensa ? S.dispensa.uscita.length : 0),
      rimetti() { S.dispensa.uscita.push(0.5); },
      premuto(lato) {
        // i flipper spostano le lettere accese (o quella del tiro da maestro)
        if (G.stato.lancio.palla && S.skill.attivo) {
          S.skill.corsia = (S.skill.corsia + (lato === 'sx' ? 3 : 1)) % 4;
          S.skill.t = 0;
        } else if (!G.stato.tiltato) {
          const c = S.corsie;
          S.corsie = lato === 'sx' ? [c[1], c[2], c[3], c[0]] : [c[3], c[0], c[1], c[2]];
        }
      },
      nuovaPartita, nuovaPalla, contatori, righeBonus, evento, bocca, finePercorso, presa, magnete,
      aggiorna, aggiornaFisica, inizioAvventura, fineAvventura, fineBiglia, fineMultiball,
      desiderati, esitoExtra, VALORE, MIRE,
      strati: { fondo: disegnaFondo, pareti: disegnaPareti, galleria: disegnaGalleria, rampe: disegnaRampe },
      disegnaPavimento, disegnaCampo, disegnaSopraGalleria, disegnaSopra,
      testi: TESTI,
      // per le prove
      oggetti: { BUMPER, SASSI, CARTELLI, PIOLO, AG, RESINA, CECE, TORCE, GINO, BUCA, POZZO, ANELLO, SPINNER },
    };
  };
})();
