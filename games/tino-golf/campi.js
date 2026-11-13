/*
 * Tino Golf: le buche.
 *
 * Ogni buca è descritta a dati (id: nome fisso per i salvataggi, non cambiarlo):
 * - blocchi: { p: contorno [[x, z], ...], h: quota, rampa: [[x1, z1, h1], [x2, z2, h2]],
 *   ascensore: { giu, su, attesa, corsa, fase }, aperti: lati senza sponda (il lato k va
 *   dal punto k al k+1), mat }. Dove due blocchi si toccano il lato va lasciato aperto.
 * - tee [x, z] (partenza), buca [x, z], palette (tabella PALETTE in gioco.js).
 * - ostacoli: palo, fungo (cuscino che rimbalza), girandola.
 * - zone (ellissi sul prato): sabbia, miele, acqua.
 * - campane: { x, z, r, ciclo, giu, fase }: si abbassano a tempo e trattengono la pallina.
 * - tele: anelli magici { a: [x, z], b: [x, z], dir: angolo d'uscita, colore }.
 * - molle: { x, z, salto }.
 * - pulsanti: { id (anche il colore), x, z, durata (secondi; senza = per sempre), testo }.
 *   I blocchi con comando: { pulsante, spento, acceso, sparisce } vanno dalla quota
 *   spento ad acceso quando il pulsante è premuto (ponti che salgono da sotto,
 *   cancelli che sprofondano); con sparisce il blocco spento non c'è proprio.
 * - iaVarianti: strade per il computer finché un pulsante è spento
 *   { senza: id, dove: [x1, z1, x2, z2] (dove vale), ia: [...] }.
 * - ia: la strada per il computer [x, y, z, { salto }] dalla partenza alla buca.
 * Le buche vanno verso -z; angolo 0 = verso -z, π/2 = verso -x, -π/2 = verso +x.
 */

const ret = (x1, z1, x2, z2) => [[x1, z1], [x2, z1], [x2, z2], [x1, z2]];
// lati di ret: 0 = lato verso -z, 1 = lato destro (+x), 2 = lato verso +z, 3 = lato sinistro

export const CAMPI = [
  {
    id: 'primo-tiro',
    nome: 'Il primo tiro',
    par: 2,
    palette: 'menta',
    novita: 'tiro',
    tee: [0, 5.2],
    buca: [0, -5.2],
    blocchi: [
      { p: ret(-1.3, 0, 1.3, 6.5), aperti: [0] },
      { p: ret(-1.3, -1, 1.3, 0), rampa: [[0, 0, 0], [0, -1, 0.22]], aperti: [0, 2] },
      { p: ret(-1.3, -2, 1.3, -1), rampa: [[0, -1, 0.22], [0, -2, 0]], aperti: [0, 2] },
      { p: ret(-1.3, -6.5, 1.3, -2), aperti: [2] },
    ],
    ia: [[0, 0, 5.2], [0, 0, -5.2]],
  },
  {
    id: 'curva',
    nome: 'La curva',
    par: 3,
    palette: 'menta',
    tee: [0, 5.2],
    buca: [6.7, -2.6],
    blocchi: [
      { p: [[-1.3, 6.5], [1.3, 6.5], [1.3, -1.2], [8, -1.2], [8, -4], [-1.3, -4]] },
    ],
    ostacoli: [
      { t: 'fungo', x: -0.35, z: -3.05, r: 0.36 },
      { t: 'fungo', x: 4.3, z: -2.2, r: 0.3 },
    ],
    ia: [[0, 0, 5.2], [0, 0, -2.6], [6.7, 0, -2.6]],
  },
  {
    id: 'girandola',
    nome: 'La girandola',
    par: 3,
    palette: 'menta',
    tee: [0, 5.2],
    buca: [0.7, -7.1],
    blocchi: [
      { p: ret(-1.4, 0, 1.4, 6.5), aperti: [0] },
      { p: ret(-1.4, -2, 1.4, 0), rampa: [[0, 0, 0], [0, -2, 0.5]], aperti: [0, 2] },
      { p: ret(-1.4, -8.2, 1.4, -2), h: 0.5, aperti: [2] },
    ],
    ostacoli: [
      { t: 'girandola', x: 0, z: -4.3, bracci: 3, lungo: 0.88, vel: 1.1 },
    ],
    ia: [[0, 0, 5.2], [0, 0.5, -3], [0.7, 0.5, -7.1]],
  },
  {
    id: 'miele-e-laghetto',
    nome: 'Miele e laghetto',
    par: 3,
    palette: 'pesca',
    novita: 'trappole',
    tee: [0, 5.4],
    buca: [0, -6],
    blocchi: [
      { p: ret(-2.1, -7.3, 2.1, 6.6) },
    ],
    zone: [
      { t: 'acqua', x: -0.55, z: 1.0, rx: 1.25, rz: 1.5 },
      { t: 'miele', x: 1.15, z: -1.25, rx: 0.62, rz: 0.66 },
      { t: 'sabbia', x: -1.0, z: -3.4, rx: 0.85, rz: 0.65 },
    ],
    campane: [
      { x: 0.25, z: -4.6, r: 0.5, ciclo: 3.4, giu: 1.1 },
    ],
    ia: [[0, 0, 5.4], [1.25, 0, 1.4], [0.6, 0, -3], [0, 0, -6]],
  },
  {
    id: 'il-guado',
    nome: 'Il guado',
    par: 3,
    palette: 'pesca',
    tee: [0, 5.4],
    buca: [-0.9, -6.4],
    blocchi: [
      { p: ret(-2.2, -7.6, 2.2, 6.6) },
    ],
    zone: [
      { t: 'acqua', x: -1.15, z: 0.6, rx: 0.95, rz: 1.15 },
      { t: 'acqua', x: 1.47, z: 0.6, rx: 0.72, rz: 1.15 },
      { t: 'miele', x: -1.15, z: -3.0, rx: 0.55, rz: 0.55 },
      { t: 'sabbia', x: 0.55, z: -4.7, rx: 0.95, rz: 0.5 },
    ],
    ostacoli: [
      { t: 'fungo', x: -1.3, z: 3.6, r: 0.3 },
    ],
    ia: [[0, 0, 5.4], [0.25, 0, 2.2], [0.25, 0, -1], [-0.9, 0, -6.4]],
  },
  {
    id: 'le-campane',
    nome: 'Le campane',
    par: 3,
    palette: 'pesca',
    tee: [0, 5.2],
    buca: [-0.5, -7.7],
    blocchi: [
      { p: ret(-1.4, -9, 1.4, 6.5) },
    ],
    ostacoli: [
      { t: 'fungo', x: 0, z: -1.5, r: 0.32 },
    ],
    campane: [
      { x: -0.85, z: 0.4, r: 0.5, ciclo: 3.0, giu: 1.4, fase: 1.5 },
      { x: 0, z: 0.4, r: 0.5, ciclo: 3.0, giu: 1.4, fase: 1.5 },
      { x: 0.85, z: 0.4, r: 0.5, ciclo: 3.0, giu: 1.4, fase: 1.5 },
      { x: -0.72, z: -3.4, r: 0.47, ciclo: 2.6, giu: 1.1, fase: 0.9 },
      { x: 0.72, z: -3.4, r: 0.47, ciclo: 2.6, giu: 1.1, fase: 0.9 },
    ],
    zone: [
      { t: 'miele', x: 0.55, z: -6.9, rx: 0.42, rz: 0.55 },
      { t: 'sabbia', x: -0.75, z: -5.5, rx: 0.5, rz: 0.42 },
    ],
    ia: [[0, 0, 5.2], [0, 0, -5], [-0.5, 0, -7.7]],
  },
  {
    id: 'anelli-magici',
    nome: 'Gli anelli magici',
    par: 2,
    palette: 'lilla',
    novita: 'tele',
    tee: [0, 5.4],
    buca: [-0.75, -8.3],
    blocchi: [
      { p: ret(-1.6, 1, 1.6, 6.6) },
      { p: ret(-1.7, -9.3, 1.7, -4.4), h: 0.8 },
    ],
    tele: [
      { a: [-0.75, 1.95], b: [0.85, -5.05], dir: 0, colore: 'verde' },
      { a: [0.8, 1.95], b: [0.9, 6.0], dir: Math.PI / 2, colore: 'arancio' },
    ],
    ostacoli: [
      { t: 'palo', x: 0, z: 3.1, r: 0.18 },
    ],
    ia: [[0, 0, 5.4], [-0.75, 0, 1.95], [0.85, 0.8, -5.05, { salto: true }], [0.6, 0.8, -7.4], [-0.75, 0.8, -8.3]],
  },
  {
    id: 'tre-anelli',
    nome: 'Tre anelli',
    par: 3,
    palette: 'lilla',
    tee: [0, 5.6],
    buca: [-0.8, -7.4],
    blocchi: [
      { p: ret(-2.1, 2, 2.1, 6.6) },
      { p: ret(-6.8, -3, -3.6, 0.8), h: 0.3 },
      { p: ret(-1.7, -9.6, 1.7, -5), h: 0.8 },
    ],
    tele: [
      { a: [-1.25, 2.9], b: [-5.2, 0.1], dir: 0, colore: 'verde' },
      { a: [0, 2.9], b: [1.0, -9.0], dir: Math.PI, colore: 'blu' },
      { a: [1.25, 2.9], b: [1.3, 6.0], dir: Math.PI / 2, colore: 'arancio' },
      { a: [-4.3, -2.3], b: [-1.0, -5.6], dir: 0, colore: 'rosa' },
    ],
    ostacoli: [
      { t: 'fungo', x: 0, z: 4.15, r: 0.32 },
    ],
    ia: [[0, 0, 5.6], [0, 0, 2.9], [1.0, 0.8, -9.0, { salto: true }], [-0.8, 0.8, -7.4]],
  },
  {
    id: 'la-scorciatoia',
    nome: 'La scorciatoia',
    par: 3,
    palette: 'lilla',
    tee: [-2.4, 5.4],
    buca: [2.4, -7.8],
    blocchi: [
      { p: ret(-3.6, -6.2, -1.2, 6.6) },
      { p: ret(1.2, -9.2, 3.6, 6.6), h: 0.5 },
    ],
    tele: [
      { a: [-2.4, -5.1], b: [2.4, 5.6], dir: 0, colore: 'verde' },
      { a: [-1.75, 0.4], b: [1.75, -3.4], dir: -Math.PI / 2, colore: 'arancio' },
    ],
    ostacoli: [
      { t: 'fungo', x: -2.9, z: 2.4, r: 0.32 },
      { t: 'fungo', x: -1.9, z: -1.6, r: 0.32 },
      { t: 'palo', x: -2.4, z: -3.6, r: 0.16 },
      { t: 'girandola', x: 2.4, z: 1.2, bracci: 3, lungo: 0.92, vel: 1.2 },
    ],
    zone: [
      { t: 'sabbia', x: 2.6, z: -5.6, rx: 0.7, rz: 0.55 },
    ],
    ia: [[-2.4, 0, 5.4], [-2.4, 0, -5.1], [2.4, 0.5, 5.6, { salto: true }], [2.4, 0.5, -7.8]],
  },
  {
    id: 'ascensore',
    nome: "L'ascensore",
    par: 3,
    palette: 'azzurro',
    novita: 'ascensore',
    tee: [0, 5.3],
    buca: [0, -11.2],
    blocchi: [
      { p: ret(-1.3, -1, 1.3, 6.5), aperti: [0] },
      { p: ret(-1.3, -3, 1.3, -1), ascensore: { giu: 0, su: 1.6, attesa: 2.4, corsa: 1.6 }, aperti: [0, 2], base: -0.7 },
      { p: ret(-1.3, -7.4, 1.3, -3), h: 1.6, aperti: [0, 2], base: -0.7 },
      { p: ret(-1.5, -12.6, 1.5, -9.3), h: 1.6, aperti: [2], base: -0.7 },
    ],
    molle: [
      { x: 0, z: -6.6, salto: 5.4 },
    ],
    ia: [[0, 0, 5.3], [0, 0, -2], [0, 1.6, -2, { salto: true }], [0, 1.6, -6.6], [0, 1.6, -9.6, { salto: true }], [0, 1.6, -11.2]],
  },
  {
    id: 'le-scale-mobili',
    nome: 'Le scale mobili',
    par: 4,
    palette: 'azzurro',
    tee: [0, 5.3],
    buca: [0, -10.4],
    blocchi: [
      { p: ret(-1.3, -1, 1.3, 6.5), aperti: [0] },
      { p: ret(-1.3, -3, 1.3, -1), ascensore: { giu: 0, su: 0.9, attesa: 2.8, corsa: 1.2 }, aperti: [0, 2], base: -0.7 },
      { p: ret(-1.3, -5.6, 1.3, -3), h: 0.9, aperti: [0, 2], base: -0.7 },
      { p: ret(-1.3, -7.6, 1.3, -5.6), ascensore: { giu: 0.9, su: 1.8, attesa: 2.8, corsa: 1.2, fase: 3 }, aperti: [0, 2], base: -0.7 },
      { p: ret(-1.5, -11.6, 1.5, -7.6), h: 1.8, aperti: [2], base: -0.7 },
    ],
    ostacoli: [
      { t: 'fungo', x: 0.75, z: -4.3, r: 0.24 },
      { t: 'fungo', x: -0.85, z: -9.0, r: 0.24 },
    ],
    ia: [[0, 0, 5.3], [0, 0, -2], [0, 0.9, -2, { salto: true }], [0, 0.9, -6.6], [0, 1.8, -6.6, { salto: true }], [0, 1.8, -10.4]],
  },
  {
    id: 'la-discesa',
    nome: 'La discesa',
    par: 3,
    palette: 'azzurro',
    tee: [0, 5.3],
    buca: [0.35, -12.4],
    blocchi: [
      { p: ret(-1.3, -1, 1.3, 6.5), aperti: [0] },
      { p: ret(-1.3, -3, 1.3, -1), ascensore: { giu: 0, su: 2.0, attesa: 2.4, corsa: 1.8 }, aperti: [0, 2], base: -0.7 },
      { p: ret(-1.3, -4.6, 1.3, -3), h: 2.0, aperti: [0, 2], base: -0.7 },
      { p: ret(-1.3, -9.4, 1.3, -4.6), rampa: [[0, -4.6, 2.0], [0, -9.4, 0.7]], aperti: [0, 2], base: -0.7 },
      { p: ret(-1.5, -13.6, 1.5, -9.4), h: 0.7, aperti: [2], base: -0.7 },
    ],
    ostacoli: [
      { t: 'fungo', x: -0.5, z: -6.2, r: 0.28 },
      { t: 'fungo', x: 0.55, z: -7.9, r: 0.28 },
    ],
    zone: [
      { t: 'sabbia', x: -0.6, z: -12.6, rx: 0.55, rz: 0.5 },
    ],
    ia: [[0, 0, 5.3], [0, 0, -2], [0, 2.0, -2, { salto: true }], [0, 2.0, -4.6], [0, 0.7, -9.4], [0.35, 0.7, -12.4]],
  },
  {
    id: 'il-ponte-giallo',
    nome: 'Il ponte giallo',
    par: 3,
    palette: 'limone',
    novita: 'pulsanti',
    tee: [1.2, 5.4],
    buca: [0.9, -5.9],
    blocchi: [
      // partenza: davanti c'è un fosso, con un varco dove sale il ponte
      { p: [[-0.7, 1.2], [-2.2, 1.2], [-2.2, 6.6], [2.2, 6.6], [2.2, 1.2], [0.7, 1.2]], aperti: [5] },
      { p: ret(-0.7, -1.6, 0.7, 1.2), comando: { pulsante: 'giallo', spento: -1.1, acceso: 0, sparisce: true }, aperti: [0, 2], base: -0.32 },
      { p: [[-0.7, -1.6], [-2.0, -1.6], [-2.0, -7.2], [2.0, -7.2], [2.0, -1.6], [0.7, -1.6]], aperti: [5] },
    ],
    pulsanti: [
      { id: 'giallo', x: -1.2, z: 2.4, testo: 'il ponte si alza' },
    ],
    ostacoli: [
      { t: 'fungo', x: -0.4, z: -3.9, r: 0.3 },
      { t: 'palo', x: 1.3, z: 3.4, r: 0.16 },
    ],
    zone: [
      { t: 'sabbia', x: -1.25, z: -6.55, rx: 0.5, rz: 0.4 },
    ],
    ia: [[0, 0, 3.6], [0, 0, 1.2], [0, 0, -1.6], [0.9, 0, -5.9]],
    iaVarianti: [
      { senza: 'giallo', ia: [[1.2, 0, 5.4], [-1.2, 0, 2.4]] },
    ],
  },
  {
    id: 'la-porta-a-tempo',
    nome: 'La porta a tempo',
    par: 3,
    palette: 'limone',
    tee: [0, 5.5],
    buca: [-0.45, -8.6],
    blocchi: [
      { p: ret(-1.3, -9.8, 1.3, 6.6) },
      // il cancello: sprofonda quando si preme il pulsante blu, poi torna su
      { p: ret(-1.16, -2.9, 1.16, -2.5), comando: { pulsante: 'blu', spento: 0.48, acceso: -0.03 }, sponde: false },
    ],
    pulsanti: [
      { id: 'blu', x: 0, z: 2.5, durata: 2.4, testo: 'la porta si apre per poco: corri!' },
    ],
    ostacoli: [
      { t: 'fungo', x: 0.55, z: -6.4, r: 0.28 },
      { t: 'fungo', x: -0.7, z: -5.2, r: 0.24 },
    ],
    ia: [[0, 0, 2.5], [0, 0, -2.7], [0, 0, -6.4], [-0.45, 0, -8.6]],
    iaVarianti: [
      { senza: 'blu', dove: [-1.4, -2.5, 1.4, 6.7], ia: [[0, 0, 5.5], [0, 0, 2.5]] },
    ],
  },
  {
    id: 'la-sala-dei-pulsanti',
    nome: 'La sala dei pulsanti',
    par: 5,
    palette: 'limone',
    tee: [-0.6, 5.5],
    buca: [-0.8, -10.3],
    blocchi: [
      { p: [[0.6, 1.2], [-2.0, 1.2], [-2.0, 6.6], [2.0, 6.6], [2.0, 1.2], [1.8, 1.2]], aperti: [5] },
      { p: ret(0.6, -1.4, 1.8, 1.2), comando: { pulsante: 'giallo', spento: -1.1, acceso: 0, sparisce: true }, aperti: [0, 2], base: -0.32 },
      { p: [[0.6, -1.4], [-2.0, -1.4], [-2.0, -5.4], [0.4, -5.4], [2.0, -5.4], [2.0, -1.4], [1.8, -1.4]], aperti: [3, 6] },
      { p: [[0.4, -5.4], [0.4, -8.0], [-1.7, -8.0], [-1.7, -11.3], [2.0, -11.3], [2.0, -5.4]], aperti: [5] },
      { p: ret(0.54, -6.7, 1.86, -6.3), comando: { pulsante: 'rosso', spento: 0.48, acceso: -0.03 }, sponde: false },
    ],
    pulsanti: [
      { id: 'giallo', x: -1.2, z: 3.5, testo: 'il ponte si alza' },
      { id: 'rosso', x: -1.45, z: -3.1, durata: 3.5, testo: 'il cancello si apre per poco' },
    ],
    zone: [
      { t: 'sabbia', x: 1.45, z: -10.75, rx: 0.4, rz: 0.35 },
    ],
    ia: [[1.2, 0, 2.6], [1.2, 0, -1.4], [1.2, 0, -4.4], [1.2, 0, -7.4], [0.6, 0, -9.6], [-0.8, 0, -10.3]],
    iaVarianti: [
      { senza: 'giallo', dove: [-2.1, 1.2, 2.1, 6.7], ia: [[-0.6, 0, 5.5], [-1.2, 0, 3.5]] },
      { senza: 'rosso', dove: [-2.1, -6.3, 2.1, 1.2], ia: [[1.2, 0, -1.2], [-1.45, 0, -3.1]] },
    ],
  },
  {
    id: 'le-lucciole',
    nome: 'Le lucciole',
    par: 3,
    palette: 'notte',
    novita: 'notte',
    tee: [0, 5.6],
    buca: [0.25, -8.2],
    blocchi: [
      { p: ret(-1.7, 1, 1.7, 6.7) },
      { p: ret(-1.8, -9.4, 1.8, -3.6), h: 0.6 },
    ],
    tele: [
      { a: [0.85, 2.0], b: [-1.0, -4.25], dir: 0, colore: 'verde' },
      { a: [-0.85, 2.0], b: [1.2, 6.1], dir: Math.PI / 2, colore: 'arancio' },
    ],
    ostacoli: [
      { t: 'fungo', x: 0, z: 3.4, r: 0.3 },
    ],
    campane: [
      { x: -0.55, z: -6.4, r: 0.48, ciclo: 3.2, giu: 1.2, fase: 0.4 },
      { x: 0.6, z: -6.4, r: 0.48, ciclo: 3.2, giu: 1.2, fase: 2.0 },
    ],
    zone: [
      { t: 'sabbia', x: 1.1, z: -8.6, rx: 0.45, rz: 0.4 },
    ],
    ia: [[0, 0, 5.6], [0.85, 0, 2.0], [-1.0, 0.6, -4.25, { salto: true }], [0, 0.6, -6.4], [0.25, 0.6, -8.2]],
  },
  {
    id: 'la-giostra',
    nome: 'La giostra',
    par: 4,
    palette: 'notte',
    tee: [0, 5.3],
    buca: [0.3, -12.6],
    blocchi: [
      { p: ret(-1.3, -1, 1.3, 6.5), aperti: [0] },
      { p: ret(-1.3, -3, 1.3, -1), ascensore: { giu: 0, su: 1.2, attesa: 1.9, corsa: 1.1 }, aperti: [0, 2], base: -0.7 },
      { p: [[-0.6, -9], [-1.3, -9], [-1.3, -3], [1.3, -3], [1.3, -9], [0.6, -9]], h: 1.2, aperti: [2, 5], base: -0.7 },
      { p: ret(-0.6, -10.6, 0.6, -9), comando: { pulsante: 'viola', spento: 0.1, acceso: 1.2, sparisce: true }, aperti: [0, 2], base: 0.88 },
      { p: [[0.6, -10.6], [1.6, -10.6], [1.6, -14], [-1.6, -14], [-1.6, -10.6], [-0.6, -10.6]], h: 1.2, aperti: [5], base: -0.7 },
    ],
    pulsanti: [
      { id: 'viola', x: -0.55, z: -7.9, testo: 'il ponte si alza' },
    ],
    ostacoli: [
      { t: 'girandola', x: 0, z: -5.6, bracci: 3, lungo: 0.9, vel: 1.15 },
      { t: 'fungo', x: -0.85, z: -12.9, r: 0.26 },
    ],
    ia: [[0, 0, 5.3], [0, 0, -2], [0, 1.2, -2, { salto: true }], [0, 1.2, -8.6], [0, 1.2, -10.6], [0.3, 1.2, -12.6]],
    iaVarianti: [
      { senza: 'viola', dove: [-1.4, -9.0, 1.4, -3.0], ia: [[0, 1.2, -3.2], [-0.55, 1.2, -7.9]] },
    ],
  },
  {
    id: 'la-notte-stellata',
    nome: 'La notte stellata',
    par: 4,
    palette: 'notte',
    tee: [0, 5.8],
    buca: [-0.6, -10.6],
    blocchi: [
      { p: ret(-2.0, 1.0, 2.0, 6.9), aperti: [0] },
      { p: ret(-2.0, -6.4, 2.0, -0.9), aperti: [0, 2] },
      { p: ret(-2.0, -11.8, 2.0, -6.4), aperti: [2] },
      // il cancello rosso tra il prato del mezzo e quello della buca
      { p: ret(-1.86, -6.6, 1.86, -6.2), comando: { pulsante: 'rosso', spento: 0.48, acceso: -0.03 }, sponde: false },
    ],
    molle: [
      { x: 0, z: 1.7, salto: 4.6 },
    ],
    pulsanti: [
      { id: 'rosso', x: 1.3, z: -5.3, durata: 3.5, testo: 'il cancello si apre per poco' },
    ],
    ostacoli: [
      { t: 'girandola', x: -0.75, z: -3.3, bracci: 3, lungo: 0.9, vel: -1.0 },
      { t: 'fungo', x: 0.8, z: -8.6, r: 0.28 },
    ],
    zone: [
      { t: 'acqua', x: -1.1, z: 3.6, rx: 0.7, rz: 0.85 },
      { t: 'miele', x: 1.25, z: 3.4, rx: 0.42, rz: 0.48 },
    ],
    campane: [
      { x: -1.2, z: -9.0, r: 0.45, ciclo: 3.0, giu: 1.1, fase: 1.0 },
    ],
    ia: [[0, 0, 5.8], [0, 0, 1.7], [0, 0, -1.4, { salto: true }], [0.6, 0, -4.8], [0.6, 0, -7.6], [-0.6, 0, -10.6]],
    iaVarianti: [
      { senza: 'rosso', dove: [-2.1, -6.2, 2.1, -0.9], ia: [[0, 0, -1.4], [1.3, 0, -5.3]] },
    ],
  },
];

/* Pannelli che presentano le novità la prima volta. */
export const NOVITA = {
  tiro: {
    titolo: 'Come si tira',
    testo: [
      'Trascina all\'indietro partendo dalla pallina, come una fionda, e lascia: più tiri lungo, più va forte.',
      'Trascinando lontano dalla pallina giri la telecamera.',
    ],
  },
  trappole: {
    titolo: 'Le trappoline',
    testo: [
      '<b>Laghetto</b>: la pallina finisce in acqua: un colpo in più e si riparte da dove avevi tirato.',
      '<b>Miele</b>: la pallina si appiccica e si ferma; il tiro dopo è debole.',
      '<b>Sabbia</b>: frena tanto.',
      '<b>Campana</b>: si abbassa a tempo; se ti prende tiene la pallina e poi la risputa indietro.',
    ],
  },
  tele: {
    titolo: 'Gli anelli magici',
    testo: [
      'Entra in un anello ed esci da quello dello stesso colore, con la stessa velocità, nella direzione della freccia.',
      'Attento: non tutti gli anelli portano vicino alla buca!',
    ],
  },
  pulsanti: {
    titolo: 'I pulsanti',
    testo: [
      'Fai passare la pallina sopra un <b>pulsante</b>: muove le cose del suo colore (la fila di puntini ti dice quali). Un ponte si alza, un cancello si abbassa…',
      'I pulsanti coi puntini attorno sono <b>a tempo</b>: dopo un po\' tutto torna com\'era. Se la pallina si ferma sopra, resta acceso.',
    ],
  },
  notte: {
    titolo: 'Di notte',
    testo: [
      'Nelle ultime buche c\'è un po\' di tutto: anelli magici, campane, ascensori, molle e pulsanti.',
      'Si gioca sotto le stelle, con le lucine accese lungo le sponde.',
    ],
  },
  ascensore: {
    titolo: "L'ascensore",
    testo: [
      'La piattaforma sale e scende: salici quando è giù e lei ti porta in alto. Puoi tirare anche mentre si muove.',
      'La <b>molla</b> fa fare un salto alla pallina: serve per passare il fosso.',
      'Se la pallina cade di sotto: un colpo in più e si riparte da dove avevi tirato.',
    ],
  },
};
