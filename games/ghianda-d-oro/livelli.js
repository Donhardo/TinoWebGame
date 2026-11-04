/*
  Livelli di "Tino e la Ghianda d'Oro".

  Ogni livello è una griglia di stanze; ogni stanza è uno schermo da
  16 colonne × 9 righe di quadretti. Le stanze vicine si toccano: si passa
  dall'una all'altra uscendo dal bordo (come nei classici a schermate fisse).

  Legenda:
    .  vuoto                 #  muro / pavimento
    -  sporgenza sottile (ci si sale da sotto)
    ^  spuntoni              ~  pavimento crepato (crolla poco dopo che lo calpesti)
    P  piolo per la frusta   f  torcia (decorazione)
    a b c d  pulsanti a terra: aprono le porte A B C D
    A B C D  porte (saracinesche)
    o  cece (+1)             *  cece d'oro (+1 al massimo e +1 cece)
    K  punto di partenza     U  uscita del livello
    T  partenza di Tino      i  cartello (testi in "cartelli", nell'ordine in cui
                                  compaiono: stanza per stanza, riga per riga)
    r  agente col retino     t  agente col timbro
    1 2 3 4 5  robivecchi: moneta, bottone, graffetta, fiocco, carta di credito scaduta
*/
window.LIVELLI = [
  {
    nome: 'Le radici della Quercia',
    // tempo di apertura delle porte, in secondi
    porte: { A: 6 },
    cartelli: [
      {
        pc: 'Muovi Tino con ← → e salta con ↑ o Spazio. Se il bordo è alto, salta contro il muro: Tino si aggrappa da solo e con ↑ sale.',
        touch: 'Muovi Tino con ◀ ▶ e salta con Salta. Se il bordo è alto, salta contro il muro: Tino si aggrappa da solo e con Salta sale.',
      },
      {
        pc: 'Spuntoni! Saltali. Poi passa sul pulsante giallo: la porta si apre, ma solo per poco.',
        touch: 'Spuntoni! Saltali. Poi passa sul pulsante giallo: la porta si apre, ma solo per poco.',
      },
      {
        pc: 'Un piolo d\'oro! Salta e premi X: la frusta si aggancia. ← → per lo slancio, ↑ ↓ accorci e allunghi, Spazio o X per staccarti. In fondo luccica qualcosa...',
        touch: 'Un piolo d\'oro! Salta e tocca Frusta: si aggancia. ◀ ▶ per lo slancio, ▲ ▼ accorci e allunghi, Salta o Frusta per staccarti. In fondo luccica qualcosa...',
      },
      {
        pc: 'Un agente della Tari! Stordiscilo con la frusta (X) e passa. Il pavimento crepato crolla: non fermarti!',
        touch: 'Un agente della Tari! Stordiscilo con Frusta e passa. Il pavimento crepato crolla: non fermarti!',
      },
    ],
    stanze: [[
      [
        '################',
        '#...............',
        '#...............',
        '#...............',
        '#.....f.........',
        '#...............',
        '#......o...#####',
        '#.T.i..##..#####',
        '################',
      ],
      [
        '################',
        '.............#..',
        '....f........#..',
        '.............A..',
        '......o......A..',
        '..i......a...A..',
        '#####..#########',
        '#####^^#########',
        '################',
      ],
      [
        '################',
        '................',
        '.......P........',
        '................',
        '................',
        '.K.i...o...o....',
        '####.......#####',
        '####...1...#####',
        '####.......#####',
      ],
      [
        '################',
        '...............#',
        '...............#',
        '......f........#',
        '...............#',
        '.i...r.......oU#',
        '###########~~###',
        '###########..###',
        '###########..###',
      ],
    ]],
  },
  {
    nome: 'Il pozzo delle radici',
    porte: { A: 5 },
    cartelli: [
      {
        pc: 'Lassù c\'è un agente col timbro: lancia bollette! Spazzale via con la frusta (X), oppure salta e stordiscilo.',
        touch: 'Lassù c\'è un agente col timbro: lancia bollette! Spazzale via con Frusta, oppure salta e stordiscilo.',
      },
      {
        pc: 'Due pioli: dal primo staccati con Spazio e premi subito X per agganciarti al secondo.',
        touch: 'Due pioli: dal primo staccati con Salta e tocca subito Frusta per agganciarti al secondo.',
      },
    ],
    stanze: [
      [
        [
          '################',
          '#...............',
          '#........o...t..',
          '#....f.....#####',
          '#.......##......',
          '#.......##......',
          '#.....#####.....',
          '#.T.i.#####..^.2',
          '################',
        ],
        [
          '################',
          '......P...P.....',
          '..i.............',
          '####............',
          '#............###',
          '#.....3.........',
          '#...............',
          '#^^^^^^^^^^--...',
          '###########.....',
        ],
      ],
      [
        [
          '################',
          '#............#..',
          '#............#..',
          '#....f.......#..',
          '#............#..',
          '#............A..',
          '#............A..',
          '#.U.....o....A..',
          '######~~~~######',
        ],
        [
          '###########.....',
          '#...............',
          '#...........####',
          '#...............',
          '#...o...........',
          '#........###....',
          '................',
          '......r...K..a..',
          '################',
        ],
      ],
    ],
  },
  {
    nome: 'La galleria dei pioli',
    porte: { A: 5 },
    cartelli: [
      {
        pc: 'Il pilastro è alto: accorcia la frusta con ↑ per passarci sopra, poi aggrappati al piolo successivo.',
        touch: 'Il pilastro è alto: accorcia la frusta con ▲ per passarci sopra, poi aggrappati al piolo successivo.',
      },
    ],
    stanze: [[
      [
        '################',
        '#.....P.....P...',
        '#...............',
        '#...............',
        '#T.i.....#......',
        '####.....#....##',
        '####.....#..4.##',
        '####^^^^^#^^^^##',
        '################',
      ],
      [
        '################',
        '................',
        '........5.......',
        '...----~~~---...',
        '..#.............',
        '.K#...r....r....',
        '################',
        '################',
        '################',
      ],
      [
        '################',
        '.............A..',
        '........t....A..',
        '........#....A..',
        '.a.K....#....A..',
        '#####..###..####',
        '#####^^###^^####',
        '################',
        '################',
      ],
      [
        '################',
        '...............#',
        '......P........#',
        '...............#',
        '....o......r.U.#',
        '###~~~....######',
        '###.......######',
        '###.......######',
        '###.......######',
      ],
    ]],
  },
];
