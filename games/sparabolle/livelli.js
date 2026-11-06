/*
 * Sparabolle — mondi e livelli dell'avventura.
 *
 * Le bolle stanno su una griglia a nido d'ape di 11 colonne: le righe pari
 * (la prima è la riga 0) hanno 11 bolle, quelle dispari 10, spostate di mezza
 * bolla a destra. Ogni livello è un elenco di righe, dall'alto in basso; gli
 * spazi non contano (servono solo a far vedere lo spostamento).
 *
 * Legenda:
 *   .   vuoto
 *   g   ghianda          r   fragolina (bacca rossa)
 *   m   mirtillo         f   fiore giallo
 *   v   violetta         u   uva spina (bacca verde)
 *
 * Ogni bolla deve essere attaccata al ramo (riga 0) attraverso le vicine,
 * altrimenti cadrebbe subito.
 *
 * Campi del livello:
 *   calo    tiri a vuoto (che non fanno scoppiare niente) prima che il ramo scenda
 *   guida   lunghezza della linea di mira in px (Infinity: fino all'arrivo, con
 *           la bolla fantasma dove si attacca)
 *   par     tiri di un buon giocatore (tarato con partite simulate): con al
 *           massimo par tiri si prendono 3 stelle, con par × 1,35 due
 */
window.SB_MONDI = [
  {
    nome: 'Il prato',
    fondale: 'prato',
    velo: 'rgba(18, 40, 14, 0.42)',
    legno: ['#8a5a2b', '#5c3517'],
    foglie: ['#5aa83c', '#3d7f2a'],
  },
];

window.SB_LIVELLI = [
  {
    nome: 'Il primo raccolto', mondo: 0, calo: 8, guida: Infinity, par: 6,
    righe: [
      'r r r g g g g g m m m',
      ' r r g g g g m m m m',
      'm m m r r r r r g g g',
      ' m m r r r r g g g g',
      'g g . . m m m . . r r',
    ],
  },
  {
    nome: 'La siepe di fragole', mondo: 0, calo: 7, guida: Infinity, par: 13,
    righe: [
      'f f r r g g g r r f f',
      ' f r r g . . g r r f',
      'm m f f g g g f f m m',
      ' m f f m . . m f f m',
      'r r m m f . f m m r r',
      ' r g g r . . r g g r',
    ],
  },
  {
    nome: 'Il girotondo', mondo: 0, calo: 6, guida: Infinity, par: 15,
    righe: [
      'g g m m r r r m m g g',
      ' g f m m r r m m f g',
      'f f g m m f m m g f f',
      ' f g g r r r r g g f',
      'm m g r f f f r g m m',
      ' m . r f . . f r . m',
      'r r . f f . f f . r r',
    ],
  },
  {
    nome: 'Le violette', mondo: 0, calo: 6, guida: 1400, par: 21,
    righe: [
      'v v g g r r r g g v v',
      ' v m g g r r g g m v',
      'm m f f v v v f f m m',
      ' r m f v v v v f m r',
      'r r g g m m m g g r r',
      ' f r g m . . m g r f',
      'f f v v . . . v v f f',
    ],
  },
  {
    nome: 'Il cesto del contadino', mondo: 0, calo: 6, guida: 1400, par: 35,
    righe: [
      'g r m f v g v f m r g',
      ' g r m f v v f m r g',
      'r m f v g g g v f m r',
      ' r m f g g g g f m r',
      'm f v v r r r v v f m',
      ' m f v r . . r v f m',
      'f v g g . . . g g v f',
      ' f v g . . . . g v f',
    ],
  },
];
