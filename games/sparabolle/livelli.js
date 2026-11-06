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
 *   1-6 le stesse, gelate (1 ghianda, 2 fragolina, 3 mirtillo, 4 fiore, 5 violetta,
 *       6 uva spina): il primo scoppio, o un'esplosione, le scongela soltanto
 *   G R M F V U  le stesse col lucchetto: non scoppiano finché non scoppia
 *       (o cade) una chiave
 *   p   ghianda petardo: esplode se la tocca un tiro o se scoppia una bolla
 *       vicina, e si porta via le sei bolle intorno
 *   a   bolla arcobaleno: prende il tipo del primo tiro che la tocca
 *   z   bolla fulmine: se la tocca un tiro (o scoppia una vicina) fa scoppiare
 *       tutta la sua riga
 *   o   sasso: non scoppia mai, cade solo se resta staccato (le esplosioni lo rompono)
 *   k   chiave: se la tocca un tiro scoppia e apre tutti i lucchetti
 *   t   bolletta della Tari: grigia, non scoppia; ogni `bollette` tiri ne spunta
 *       un'altra accanto a una di quelle in campo
 *   $   robivecchio (quello del campo `robivecchio`): si prende facendolo cadere
 *       o con un'esplosione; se a fine livello è ancora appeso vola via
 *
 * Ogni bolla deve essere attaccata al ramo (riga 0) attraverso le vicine,
 * altrimenti cadrebbe subito. Per vincere bastano le bolle colorate (e gli
 * arcobaleni): sassi, bollette e le altre speciali rimaste cadono da sole.
 *
 * Campi del livello:
 *   calo    tiri a vuoto (che non fanno scoppiare niente) prima che il ramo scenda
 *   guida   lunghezza della linea di mira: Infinity (fino all'arrivo, con la bolla
 *           fantasma), un numero di px, oppure 'sponda' (fino al primo rimbalzo)
 *   par     tiri di un buon giocatore (tarato con partite simulate): con al
 *           massimo par tiri si prendono 3 stelle, con par × 1,35 due
 *   novita  bolla nuova presentata prima di giocare (testi in gioco.js, NOVITA)
 *   bollette ogni quanti tiri si moltiplica una bolletta della Tari
 *   boss    agenti della Tari che camminano nel corridoio dietro le bolle:
 *           { tipo: 'retino' | 'timbro' | 'capo', riga (centro, in righe dal
 *           ramo), lato (0 sinistra, 1 destra: metà campo; senza, tutto il campo),
 *           vita (× la vita della tabella BOSS) }. Si vince quando sono tutti KO.
 */
window.SB_MONDI = [
  {
    nome: 'Il prato',
    fondale: 'prato',
    velo: 'rgba(18, 40, 14, 0.42)',
    legno: ['#8a5a2b', '#5c3517'],
    foglie: ['#5aa83c', '#3d7f2a'],
    terra: [70, 140, 50],
    barra: '#24461f',
  },
  {
    nome: 'La spiaggia',
    fondale: 'spiaggia',
    velo: 'rgba(10, 40, 60, 0.38)',
    legno: ['#b88a55', '#7d5730'],
    foglie: ['#4fae6e', '#2f7f4c'],
    terra: [196, 160, 98],
    barra: '#1f4a5c',
  },
  {
    nome: 'Il bosco in autunno',
    fondale: 'autunno',
    velo: 'rgba(40, 20, 8, 0.42)',
    legno: ['#7a4a26', '#4a2a12'],
    foglie: ['#e08a2a', '#b8521c'],
    terra: [120, 80, 40],
    barra: '#4a2d16',
  },
  {
    nome: 'Gli uffici della Tari',
    fondale: 'uffici',
    velo: 'rgba(20, 16, 40, 0.5)',
    legno: ['#7d7f8c', '#4b4d5a'],
    foglie: ['#6a8fbf', '#46658f'],
    terra: [90, 80, 110],
    barra: '#2d2a4a',
  },
];

window.SB_LIVELLI = [
  // ------------------------------------------------------------ il prato
  {
    nome: 'Il primo raccolto', mondo: 0, calo: 8, guida: Infinity, par: 6,
    robivecchio: 'moneta', novita: 'robivecchio',
    righe: [
      'r r r g g g g g m m m',
      ' r r g g g g m m m m',
      'm m m r r r r r g g g',
      ' m m r r r r g g g g',
      'g g . . m $ m . . r r',
    ],
  },
  {
    nome: 'La siepe di fragole', mondo: 0, calo: 7, guida: Infinity, par: 13,
    robivecchio: 'bottone',
    righe: [
      'f f r r g g g r r f f',
      ' f r r g . . g r r f',
      'm m f f g g g f f m m',
      ' m f f m . . m f f m',
      'r r m m f . f m m r r',
      ' r g g r $ . r g g r',
    ],
  },
  {
    nome: 'Il girotondo', mondo: 0, calo: 6, guida: Infinity, par: 14,
    robivecchio: 'graffetta', novita: 'petardo',
    righe: [
      'g g m m r r r m m g g',
      ' g f m m r r m m f g',
      'f f g m m f m m g f f',
      ' f g g r r r r g g f',
      'm m g r f p f r g m m',
      ' m . r f $ . f r . m',
      'r r . f f . f f . r r',
    ],
  },
  {
    nome: 'Le violette', mondo: 0, calo: 6, guida: 1400, par: 20,
    robivecchio: 'fiocco',
    righe: [
      'v v g g r r r g g v v',
      ' v m g g r r g g m v',
      'm m f f v v v f f m m',
      ' p m f v v v v f m r',
      'r r g g m m m g g r r',
      ' f r g m $ . m g r f',
      'f f v v . . . v v f f',
    ],
  },
  {
    nome: 'Il cesto del contadino', mondo: 0, calo: 6, guida: 1400, par: 33,
    robivecchio: 'tappo',
    righe: [
      'g r m f v g v f m r g',
      ' g r m f v v f m r g',
      'r m f v g g g v f m r',
      ' r m f g g g g f m r',
      'm f v v r p r v v f m',
      ' m f v r . . r v f m',
      'f v g g . . . g g v f',
      ' f v g $ . . . g v f',
    ],
  },
  {
    nome: "La ronda dell'agente", mondo: 0, calo: 7, guida: 1400, par: 21,
    novita: 'retino',
    boss: [{ tipo: 'retino', riga: 2.5 }],
    righe: [
      'g g r r m m f f g g r',
      ' g r r m m f f g g r',
      'm . . . . f . . . . r',
      ' m . . . f . . . . r',
      'm g g r r f m m g g r',
      ' g g r r m m f f g g',
      'f f m m g g r r m m f',
    ],
  },
  // ------------------------------------------------------------ la spiaggia
  {
    nome: 'Il castello di sabbia', mondo: 1, calo: 6, guida: 'sponda', par: 12,
    robivecchio: 'conchiglia', novita: 'arcobaleno',
    righe: [
      'f f f r r r r r f f f',
      ' f g g r r r r g g f',
      'm m g g a v a g g m m',
      ' m v v g g g g v v m',
      'r r v v m m m v v r r',
      ' r f f m a a m f f r',
      'g g f f . $ . f f g g',
    ],
  },
  {
    nome: 'Le onde', mondo: 1, calo: 6, guida: 'sponda', par: 11,
    robivecchio: 'biglia',
    righe: [
      'v v m m r r r m m v v',
      ' v m m r g g r m m v',
      'f f r r g g g r r f f',
      ' f r g g m m g g r f',
      'g g g m m a m m g g g',
      ' r r m v v v v m r r',
      'r f f v . $ . v f f r',
      ' f f . . . . . . f f',
    ],
  },
  {
    nome: 'Il faro', mondo: 1, calo: 6, guida: 'sponda', par: 11,
    robivecchio: 'dado', novita: 'fulmine',
    righe: [
      'm m m g g g g g m m m',
      ' m r r g g g g r r m',
      'f f r v v r v v r f f',
      ' f z v v r r v v z f',
      'g g f f m m m f f g g',
      ' g f m m r r m m f g',
      'v v g m m z m m g v v',
      ' v g g . $ . . g g v',
    ],
  },
  {
    nome: 'La barriera corallina', mondo: 1, calo: 5, guida: 'sponda', par: 14,
    robivecchio: 'ditale',
    righe: [
      'r r g g g m g g g r r',
      ' r g g m m m m g g r',
      'v v f f m a m f f v v',
      ' v f f r r r r f f v',
      'm m z r v v v r z m m',
      ' m g g v f f v g g m',
      'g g g a f f f a g g g',
      ' f f m m . . m m f f',
      'f f m . $ . . . m f f',
    ],
  },
  {
    nome: 'Il molo', mondo: 1, calo: 5, guida: 'sponda', par: 14,
    robivecchio: 'linguetta',
    righe: [
      'g g m m v v v m m g g',
      ' g m m v r r v m m g',
      'f f z r r f r r z f f',
      ' f r r f f f f r r f',
      'm m v v g a g v v m m',
      ' m v v g g g g v v m',
      'r r f f m m m f f r r',
      ' r f m m z r m m f r',
      'v v . m . $ . m . v v',
    ],
  },
  {
    nome: "L'agente del timbro", mondo: 1, calo: 6, guida: 'sponda', par: 24,
    novita: 'timbro',
    boss: [{ tipo: 'timbro', riga: 2.5 }],
    righe: [
      'g g r r m m f f v v g',
      ' g r r m m f f v v g',
      'm . . . . f . . . . v',
      ' m . . . f . . . . v',
      'm g g r r f m m v v v',
      ' g r r m m f f v g g',
      'f f m m g g r r m m f',
    ],
  },
  // ------------------------------------------------------------ il bosco in autunno
  {
    nome: 'La grande quercia', mondo: 2, calo: 6, guida: 'sponda', par: 15,
    robivecchio: 'rocchetto', novita: 'gelata',
    righe: [
      'g g g r r r r r g g g',
      ' g m m r 2 2 r m m g',
      'f f m m 2 r 2 m m f f',
      ' f 4 m m r r m m 4 f',
      'v v f f m 3 m f f v v',
      ' v v f 3 m m 3 f v v',
      'g g v v 1 1 1 v v g g',
      ' r r v . $ . . v r r',
    ],
  },
  {
    nome: 'I funghi', mondo: 2, calo: 6, guida: 'sponda', par: 19,
    robivecchio: 'biglietto',
    righe: [
      'r r r m m m m m r r r',
      ' r 1 1 m g g m 1 1 r',
      'v v g g g f g g g v v',
      ' v v g f f f f g v v',
      'm m 5 f f r f f 5 m m',
      ' m 5 5 r r r r 5 5 m',
      'f f m m r 3 r m m f f',
      ' f m m 3 3 $ 3 m m f',
    ],
  },
  {
    nome: 'Il sentiero dei sassi', mondo: 2, calo: 5, guida: 'sponda', par: 20,
    robivecchio: 'matita', novita: 'sasso',
    righe: [
      'm m m o g g g o m m m',
      ' m r r g g g g r r m',
      'f f r o v v v o r f f',
      ' f f r v v v v r f f',
      'g o g g r r r g g o g',
      ' g g m m r r m m g g',
      'v v m o 2 2 2 o m v v',
      ' v f f m m $ m f f v',
    ],
  },
  {
    nome: 'La tana del tasso', mondo: 2, calo: 6, guida: 420, par: 27,
    robivecchio: 'gomma',
    righe: [
      'u u g g r o r g g u u',
      ' u g g r r r r g g u',
      'm m v v o f o v v m m',
      ' m v v f f f f v v m',
      'r r u u f 6 f u u r r',
      ' r u m m 6 6 m m u r',
      'g g m o v v v o m g g',
      ' g f f v v $ v f f g',
    ],
  },
  {
    nome: 'Le lucciole', mondo: 2, calo: 6, guida: 420, par: 12,
    robivecchio: 'puntina',
    righe: [
      'v v v r r z r r v v v',
      ' v u u r r r r u u v',
      'g g u o m m m o u g g',
      ' g f f m 3 3 m f f g',
      'r r f f p o p f f r r',
      ' r m m f f f f m m r',
      'u u m 1 g g g 1 m u u',
      ' u v v g g $ g v v u',
    ],
  },
  {
    nome: 'La squadra della Tari', mondo: 2, calo: 6, guida: 420, par: 38,
    novita: 'squadra',
    boss: [
      { tipo: 'retino', riga: 2.5, lato: 0, vita: 0.65 },
      { tipo: 'timbro', riga: 2.5, lato: 1, vita: 0.65 },
    ],
    righe: [
      'g g r r m m f f v v u',
      ' g r r m m f f v v u',
      'm . . . . f . . . . u',
      ' m . . . f . . . . u',
      'm g g r r f m m v v u',
      ' g r r m m f f v u u',
      'f f m m g g r r m m f',
    ],
  },
  // ------------------------------------------------------------ gli uffici della Tari
  {
    nome: 'Lo sportello', mondo: 3, calo: 5, guida: 340, par: 18,
    robivecchio: 'francobollo', novita: 'chiave',
    righe: [
      'G G G r r r r r M M M',
      ' G m m r r r r f f M',
      'f f m m u u u f f v v',
      ' f u u m m m m v v v',
      'R R u g g k g g v U U',
      ' R g g f f f f g U U',
      'v v g f u u u f g m m',
      ' v m m u u $ u m m m',
    ],
  },
  {
    nome: 'Le pile di pratiche', mondo: 3, calo: 6, guida: 340, par: 22,
    robivecchio: 'cappuccio',
    righe: [
      'm m m g g g g g m m m',
      ' m F F g g g g F F m',
      'u u F f r r r f F u u',
      ' u v v r r r r v v u',
      'G G v v m k m v v G G',
      ' G r r m m m m r r G',
      'f f r 6 u u u 6 r f f',
      ' f v v u u $ u v v f',
    ],
  },
  {
    nome: "L'archivio", mondo: 3, calo: 7, guida: 340, par: 21,
    robivecchio: 'elastico', novita: 'bolletta', bollette: 7,
    righe: [
      'r r r g g g g g r r r',
      ' r m m g g g g m m r',
      'f f m t v v v t m f f',
      ' f u u v v v v u u f',
      'g g u u m m m u u g g',
      ' g v v m t t m v v g',
      'm m v r r r r r v m m',
      ' m f f r r $ r f f m',
    ],
  },
  {
    nome: 'Il timbro rosso', mondo: 3, calo: 6, guida: 340, par: 21,
    robivecchio: 'temperamatite', bollette: 8,
    righe: [
      'u u u m m m m m u u u',
      ' u g g m m m m g g u',
      'r r g g z v z g g r r',
      ' r f f v v v v f f r',
      'M M f t g g g t f M M',
      ' M v v g k g g v v M',
      'u u v r r t r r v u u',
      ' u m m r r $ r m m u',
    ],
  },
  {
    nome: "L'ufficio del capo", mondo: 3, calo: 6, guida: 340, par: 26,
    robivecchio: 'molletta', bollette: 7,
    righe: [
      'v v g r r r r r g v v',
      ' v g g r p p r g g v',
      'm m g o f f f o g m m',
      ' m u u f 4 4 f u u m',
      'R R u u g a g u u R R',
      ' R f f g g g g f f R',
      't m f k v v v k f m t',
      ' m v v v v $ v v v m',
    ],
  },
  {
    nome: 'Il capo della Tari', mondo: 3, calo: 6, guida: 340, par: 26,
    novita: 'capo',
    boss: [{ tipo: 'capo', riga: 2.5 }],
    righe: [
      'g g r r m m f f v v u',
      ' g r r m m f f v v u',
      'm . . . . t . . . . u',
      ' m . . . t . . . . u',
      'm g g r r f m m v v u',
      ' g r r m m f f v u u',
      'f f m m g g r r m m f',
    ],
  },
];
