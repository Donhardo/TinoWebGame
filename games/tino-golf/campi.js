/*
 * Tino Golf: le buche.
 *
 * Ogni buca è descritta a dati:
 * - blocchi: { p: contorno [[x, z], ...], h: quota, rampa: [[x1, z1, h1], [x2, z2, h2]],
 *   ascensore: { giu, su, attesa, corsa, fase }, aperti: lati senza sponda (il lato k va
 *   dal punto k al k+1), mat }. Dove due blocchi si toccano il lato va lasciato aperto.
 * - tee [x, z] (partenza), buca [x, z], palette (tabella PALETTE in gioco.js).
 * - ostacoli: palo, fungo (cuscino che rimbalza), girandola.
 * - zone (ellissi sul prato): sabbia, miele, acqua.
 * - campane: { x, z, r, ciclo, giu, fase }: si abbassano a tempo e trattengono la pallina.
 * - tele: anelli magici { a: [x, z], b: [x, z], dir: angolo d'uscita, colore }.
 * - molle: { x, z, salto }.
 * - ia: la strada per il computer [x, y, z, { salto }] dalla partenza alla buca.
 * Le buche vanno verso -z; angolo 0 = verso -z, π/2 = verso -x, -π/2 = verso +x.
 */

const ret = (x1, z1, x2, z2) => [[x1, z1], [x2, z1], [x2, z2], [x1, z2]];
// lati di ret: 0 = lato verso -z, 1 = lato destro (+x), 2 = lato verso +z, 3 = lato sinistro

export const CAMPI = [
  {
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
    nome: 'La girandola',
    par: 3,
    palette: 'menta',
    tee: [0, 5.2],
    buca: [0, -7],
    blocchi: [
      { p: ret(-1.4, 0, 1.4, 6.5), aperti: [0] },
      { p: ret(-1.4, -2, 1.4, 0), rampa: [[0, 0, 0], [0, -2, 0.5]], aperti: [0, 2] },
      { p: ret(-1.4, -8.2, 1.4, -2), h: 0.5, aperti: [2] },
    ],
    ostacoli: [
      { t: 'girandola', x: 0, z: -4.3, bracci: 3, lungo: 0.88, vel: 1.1 },
    ],
    ia: [[0, 0, 5.2], [0, 0.5, -3], [0, 0.5, -7]],
  },
  {
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
      { t: 'miele', x: 1.25, z: -1.3, rx: 0.5, rz: 0.55 },
      { t: 'sabbia', x: -1.0, z: -3.4, rx: 0.85, rz: 0.65 },
    ],
    campane: [
      { x: 0.25, z: -4.6, r: 0.5, ciclo: 3.4, giu: 1.1 },
    ],
    ia: [[0, 0, 5.4], [1.25, 0, 1.4], [0.6, 0, -3], [0, 0, -6]],
  },
  {
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
  ascensore: {
    titolo: "L'ascensore",
    testo: [
      'La piattaforma sale e scende: salici quando è giù e lei ti porta in alto. Puoi tirare anche mentre si muove.',
      'La <b>molla</b> fa fare un salto alla pallina: serve per passare il fosso.',
      'Se la pallina cade di sotto: un colpo in più e si riparte da dove avevi tirato.',
    ],
  },
};
