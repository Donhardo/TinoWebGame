/*
 * Ghiande e Mattoncini — mondi e livelli.
 *
 * Ogni livello è una griglia di 16 colonne (mattoncini da 36 × 18 px),
 * scritta a caratteri, una stringa per riga, dall'alto in basso.
 *
 * Legenda:
 *   .        vuoto
 *   a … f    mattoncino colorato (un colpo); il colore dipende dal mondo
 *   2  3     mattoncino resistente (due o tre colpi)
 *   #        mattoncino indistruttibile (sasso, conchiglia, ceppo, cassaforte)
 *   *        petardo: quando si rompe fa saltare gli otto vicini (e i petardi a catena)
 *   ?        sorpresa: quando si rompe lascia sempre cadere un potenziamento
 *
 * Regola per i livelli nuovi: ogni mattoncino che si può rompere deve essere
 * raggiungibile dalla ghianda (varchi larghi almeno un mattoncino).
 */
window.GM_MONDI = [
  {
    nome: 'Il prato',
    fondale: 'prato',
    velo: 'rgba(20, 50, 15, 0.28)',
    colori: { a: '#e8483f', b: '#f5c518', c: '#4ea3e0', d: '#f08bb8', e: '#f4f1e6', f: '#6cbf4a' },
    resistente: '#a8764a',   // zolle di terra
    duro: '#8d939a',         // sassi
    cornice: ['#9c6a3a', '#6b4422'],
    decoro: 'erba',
  },
  {
    nome: 'La spiaggia',
    fondale: 'spiaggia',
    velo: 'rgba(10, 45, 70, 0.26)',
    colori: { a: '#ff7b6b', b: '#2ec4c4', c: '#f1d08a', d: '#ffd84a', e: '#fff4ea', f: '#3a7bd5' },
    resistente: '#d9a85e',   // sabbia bagnata
    duro: '#7f8c92',         // scogli
    cornice: ['#c9a476', '#8a6a44'],
    decoro: 'sabbia',
  },
  {
    nome: 'Il bosco d\'autunno',
    fondale: 'autunno',
    velo: 'rgba(45, 20, 5, 0.32)',
    colori: { a: '#f08a24', b: '#c8392b', c: '#e3b23c', d: '#8a5a2b', e: '#7c9a3a', f: '#8e5aa8' },
    resistente: '#6e4524',   // cortecce
    duro: '#5b4a3a',         // ceppi
    cornice: ['#7a4a22', '#4a2a10'],
    decoro: 'legno',
  },
  {
    nome: 'Gli uffici della Tari',
    fondale: 'uffici',
    velo: 'rgba(25, 15, 45, 0.38)',
    colori: { a: '#ffe066', b: '#6fb3f2', c: '#f7a1c4', d: '#8fd18b', e: '#f7f7f2', f: '#b4b8c4' },
    resistente: '#7d5fb0',   // faldoni viola dei timbri
    duro: '#6c7480',         // casseforti
    cornice: ['#8c93a0', '#4b525e'],
    decoro: 'carta',
  },
];

window.GM_LIVELLI = [
  // ------------------------------------------------------------ mondo 1, il prato
  {
    mondo: 0, nome: 'Il prato fiorito',
    mappa: [
      '................',
      '.aaaaaaaaaaaaaa.',
      '.bbbbbbbbbbbbbb.',
      '.cccc?cccc?cccc.',
      '.dddddddddddddd.',
      '.eeeeeeeeeeeeee.',
      '.ffffffffffffff.',
    ],
  },
  {
    mondo: 0, nome: 'Il girasole',
    mappa: [
      '......bbbb......',
      '....bbbbbbbb....',
      '...bbb2222bbb...',
      '..bbb222222bbb..',
      '..bb22*22*22bb..',
      '..bbb222222bbb..',
      '...bbb2222bbb...',
      '....bbbbbbbb....',
      '......bbbb......',
      '.......ff.......',
      '.......ff.......',
      '....fff??fff....',
    ],
  },
  {
    mondo: 0, nome: 'Le aiuole',
    mappa: [
      '2222222222222222',
      'aaaaaaaaaaaaaaaa',
      '................',
      '#bb#cc#dd#ee#bb#',
      '#bb#cc#dd#ee#bb#',
      '#bb#cc#dd#ee#bb#',
      '#?b#cc#d?#ee#b?#',
      '................',
      '.ffffffffffffff.',
    ],
  },
  {
    mondo: 0, nome: 'I petardi della sagra',
    mappa: [
      '3333333333333333',
      '2a2a2a2a2a2a2a2a',
      'a*aaa*aaa*aaa*aa',
      'bbbbbbbbbbbbbbbb',
      'cc##cccc##cccc##',
      'dddddddddddddddd',
      'e?eeeeeeeeeeee?e',
      '................',
      '##....####....##',
    ],
  },
  // ------------------------------------------------------------ mondo 2, la spiaggia
  {
    mondo: 1, nome: 'Il castello di sabbia',
    mappa: [
      '..c..c....c..c..',
      '..ccccc..ccccc..',
      '..c2c2c..c2c2c..',
      '..ccccc..ccccc..',
      '..cccccccccccc..',
      '..cc22cccc22cc..',
      '..cc22cccc22cc..',
      '..cccc3333cccc..',
      '..cccc3??3cccc..',
      'bbbbbbbbbbbbbbbb',
      '................',
      'ffffffffffffffff',
    ],
  },
  {
    mondo: 1, nome: 'Le onde',
    mappa: [
      'aa....aaaa....aa',
      '.aa..aa..aa..aa.',
      '..aaaa....aaaa..',
      'bb....bbbb....bb',
      '.bb..bb..bb..bb.',
      '..bbbb....bbbb..',
      'ff....ffff....ff',
      '.ff..f*..*f..ff.',
      '..ffff....ffff..',
      '2..2..2??2..2..2',
    ],
  },
  {
    mondo: 1, nome: 'Il faro',
    mappa: [
      '.......##.......',
      '......#33#......',
      '......#?3#......',
      '......2222......',
      '.......ee.......',
      '......aeea......',
      '......eaae......',
      '......aeea......',
      '......eaae......',
      '.....#eeee#.....',
      'bbb..#2222#..bbb',
      'bbbb.#....#.bbbb',
      'dd?ddd....ddd?dd',
    ],
  },
  {
    mondo: 1, nome: 'La barriera corallina',
    mappa: [
      '3a3a3a3a3a3a3a3a',
      'a3a3a3a3a3a3a3a3',
      '#..#..#..#..#..#',
      'bbbbbbbbbbbbbbbb',
      'b*bb2bb*bb2bb*bb',
      'bbbbbbbbbbbbbbbb',
      '.#.#.#.#.#.#.#.#',
      'eeeeeeeeeeeeeeee',
      'e?ee2ee?ee2ee?ee',
      'eeeeeeeeeeeeeeee',
    ],
  },
  // ------------------------------------------------------------ mondo 3, il bosco d'autunno
  {
    mondo: 2, nome: 'La grande quercia',
    mappa: [
      '.....aabbaa.....',
      '...aabbccbbaa...',
      '..abbccaaccbba..',
      '.aabcc?aa?ccbaa.',
      '.abbccaaaaccbba.',
      '..aabbccccbbaa..',
      '...aabbbbbbaa...',
      '.....aabbaa.....',
      '.......22.......',
      '.......22.......',
      '......2332......',
      '....##2332##....',
    ],
  },
  {
    mondo: 2, nome: 'I funghi',
    mappa: [
      '..bbbb....bbbb..',
      '.bebbeb..bebbeb.',
      'bbbbbbb..bbbbbbb',
      '...22......22...',
      '...22......22...',
      '.......??.......',
      '....cccccccc....',
      '...cecceccecc...',
      '..cccccccccccc..',
      '......3333......',
      '......3333......',
      '#..............#',
    ],
  },
  {
    mondo: 2, nome: 'Il sentiero nascosto',
    mappa: [
      'aaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbb',
      '#####......#####',
      'ccccc......ccccc',
      'cc?cc......cc?cc',
      '................',
      '...##########...',
      '...dddddddddd...',
      '...d2d2d2d2dd...',
      '................',
      'ff.ff.ff.ff.ff.f',
    ],
  },
  {
    mondo: 2, nome: 'La tana del tasso',
    mappa: [
      '2222222222222222',
      '2*222222222222*2',
      '#..............#',
      '#.aaaaaaaaaaaa.#',
      '#.a3333333333a.#',
      '#.a3bbbbbbbb3a.#',
      '#.a3b?*cc*?b3a.#',
      '#.a3bbbbbbbb3a.#',
      '#.a3333333333a.#',
      '#.aaaaaaaaaaaa.#',
      '#..............#',
      '###....##....###',
    ],
  },
  // ------------------------------------------------------------ mondo 4, gli uffici della Tari
  {
    mondo: 3, nome: 'Lo sportello',
    mappa: [
      'bbbbbbbbbbbbbbbb',
      'aaaaaaaaaaaaaaaa',
      '2222222222222222',
      '...####..####...',
      'cccccccccccccccc',
      'c?cccccccccccc?c',
      'dddddddddddddddd',
      '................',
      '#..#..#..#..#..#',
    ],
  },
  {
    mondo: 3, nome: 'Le pile di bollette',
    mappa: [
      '33.33.33.33.33.3',
      'ee.ee.ee.ee.ee.e',
      'ee.ee.ee.ee.ee.e',
      '22.22.22.22.22.2',
      'ee.ee.ee.ee.ee.e',
      'e?.ee.e*.ee.?e.e',
      'ee.ee.ee.ee.ee.e',
      '##.ee.##.ee.##.e',
    ],
  },
  {
    mondo: 3, nome: 'L\'archivio',
    mappa: [
      '3333333333333333',
      'a#a#a#a#a#a#a#a#',
      '2222222222222222',
      'b*bbbbb**bbbbb*b',
      'cccccccccccccccc',
      '#c#c#c#c#c#c#c#c',
      '2222222222222222',
      'd?dddddddddddd?d',
    ],
  },
  {
    mondo: 3, nome: 'L\'ufficio del capo',
    mappa: [
      '2222222222222222',
      'eeeeeeeeeeeeeeee',
      'e333ee3ee33ee3ee',
      'ee3ee3e3e3e3e3ee',
      'ee3ee333e33ee3ee',
      'ee3ee3e3e3e3e3ee',
      'ee3ee3e3e3e3e3ee',
      'eeeeeeeeeeeeeeee',
      '................',
      '#?##..####..##?#',
      '................',
      'ffff*ffffff*ffff',
    ],
  },
];
