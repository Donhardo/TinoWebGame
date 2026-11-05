/*
 * Tino Bum! — i mezzi e i loro colpi.
 *
 * Ogni mezzo ha due colpi normali e un colpo speciale (si usa quando la barra
 * dello speciale è piena). Le grandezze sono in pixel del mondo (1600 × 900)
 * e secondi.
 *
 * Mezzo:
 *   velMax    velocità di lancio a potenza piena
 *   angoli    [minimo, massimo] dell'alzo, in gradi sopra l'orizzonte
 *   energia   quanti pixel può percorrere in un turno
 *   peso      moltiplica il ritardo dei colpi (chi è pesante aspetta di più)
 *   stelle    solo per la scheda di scelta (1-5)
 *
 * Colpo:
 *   raggio, danno   cratere e danno al centro (si riduce verso il bordo)
 *   vento           quanto lo sposta il vento (1 = normale)
 *   gravita         moltiplica la gravità
 *   ritardo         quanto si aspetta prima del turno successivo
 *   disegno         'ghianda', 'sasso', 'zucca', 'spicchio'
 *   dimensione      raggio del proiettile disegnato (e per i contatti)
 *   lancio          { n, apertura, potenze } più proiettili insieme
 *   rimbalzi        quante volte rimbalza prima di esplodere
 *   esplodeRimbalzo { raggio, danno } piccola esplosione a ogni rimbalzo
 *   divide          { quando: 'apice' | 'discesa', n, apertura, colpo }
 *   calo            { da, a, min } il danno cala con la strada percorsa: pieno
 *                   fino a `da` pixel, poi scende fino a `min` (frazione) ad `a`
 *   trivella        { lunghezza, raggio, vel } toccato il terreno continua
 *                   dritto scavando una galleria, poi esplode
 *   galleria        { lunghezza, raggio, vel } come la trivella, ma va in
 *                   orizzontale ed esplode appena è sotto un nemico
 *   bolla           la bolla cattura chi è vicino al punto in cui scoppia, lo
 *                   solleva (e il vento lo sposta) e poi lo lascia cadere
 */
(() => {
  'use strict';
  const TB = window.TinoBum = window.TinoBum || {};

  const ghiandina = {
    nome: 'Ghiandina', raggio: 30, danno: 120, vento: 1, gravita: 1, ritardo: 0,
    disegno: 'ghianda', dimensione: 6,
  };
  const spicchio = {
    nome: 'Spicchio', raggio: 40, danno: 140, vento: 0.7, gravita: 1, ritardo: 0,
    disegno: 'spicchio', dimensione: 7,
  };

  const bollicina = {
    nome: 'Bollicina', raggio: 22, danno: 80, vento: 2, gravita: 0.5, ritardo: 0,
    disegno: 'bolla', dimensione: 6,
  };

  TB.MEZZI = {
    catapulta: {
      nome: 'Catapulta',
      descrizione: 'Di legno, equilibrata: il mezzo giusto per cominciare.',
      velMax: 900, angoli: [5, 85], energia: 150, peso: 1,
      stelle: { potenza: 3, gittata: 3, vento: 3, movimento: 3 },
      colpi: [
        {
          nome: 'Ghianda', raggio: 44, danno: 240, vento: 1, gravita: 1, ritardo: 100,
          disegno: 'ghianda', dimensione: 8,
        },
        {
          nome: 'Tre ghiande', raggio: 28, danno: 105, vento: 1, gravita: 1, ritardo: 115,
          disegno: 'ghianda', dimensione: 6,
          lancio: { n: 3, apertura: 4, potenze: [1, 0.97, 1.03] },
        },
        {
          nome: 'Pioggia di ghiande', speciale: true, raggio: 34, danno: 150, vento: 1, gravita: 1,
          ritardo: 170, disegno: 'ghianda', dimensione: 10,
          divide: { quando: 'apice', n: 6, apertura: 55, colpo: ghiandina },
        },
      ],
    },
    fionda: {
      nome: 'Fionda gigante',
      descrizione: 'Tiri tesi e veloci, il vento quasi non la sposta. Leggera da spostare.',
      velMax: 1060, angoli: [-10, 70], energia: 190, peso: 0.9,
      stelle: { potenza: 2, gittata: 5, vento: 5, movimento: 5 },
      colpi: [
        {
          nome: 'Sasso', raggio: 32, danno: 235, vento: 0.35, gravita: 1, ritardo: 90,
          disegno: 'sasso', dimensione: 7,
        },
        {
          nome: 'Rimbalzino', raggio: 36, danno: 240, vento: 0.35, gravita: 1, ritardo: 110,
          disegno: 'sasso', dimensione: 7, rimbalzi: 2,
        },
        {
          nome: 'Ghianda saltellante', speciale: true, raggio: 36, danno: 170, vento: 0.35, gravita: 1,
          ritardo: 160, disegno: 'ghianda', dimensione: 9, rimbalzi: 3,
          esplodeRimbalzo: { raggio: 34, danno: 150 },
        },
      ],
    },
    mortaio: {
      nome: 'Mortaio di zucca',
      descrizione: 'Solo tiri alti, ma che buche! Pesante e lento.',
      velMax: 880, angoli: [45, 88], energia: 110, peso: 1.15,
      stelle: { potenza: 5, gittata: 3, vento: 2, movimento: 1 },
      colpi: [
        {
          nome: 'Zucchina', raggio: 56, danno: 265, vento: 0.8, gravita: 1, ritardo: 115,
          disegno: 'zucca', dimensione: 9,
        },
        {
          nome: 'Zuccone', raggio: 88, danno: 205, vento: 0.7, gravita: 1, ritardo: 130,
          disegno: 'zucca', dimensione: 13,
        },
        {
          nome: 'Zucca a spicchi', speciale: true, raggio: 44, danno: 160, vento: 0.7, gravita: 1,
          ritardo: 185, disegno: 'zucca', dimensione: 12,
          divide: { quando: 'discesa', n: 5, apertura: 70, colpo: spicchio },
        },
      ],
    },
    cannone: {
      nome: 'Cannone a tappi',
      descrizione: 'Tappi di sughero velocissimi: fanno male da vicino, poco da lontano.',
      velMax: 1000, angoli: [-8, 65], energia: 160, peso: 1,
      stelle: { potenza: 5, gittata: 2, vento: 4, movimento: 3 },
      colpi: [
        {
          nome: 'Tappo', raggio: 30, danno: 300, vento: 0.5, gravita: 1, ritardo: 100,
          disegno: 'tappo', dimensione: 7, calo: { da: 450, a: 1400, min: 0.5 },
        },
        {
          nome: 'Tappone', raggio: 46, danno: 330, vento: 0.5, gravita: 1.15, ritardo: 120,
          disegno: 'tappo', dimensione: 10, calo: { da: 350, a: 1100, min: 0.4 },
        },
        {
          nome: 'Raffica di tappi', speciale: true, raggio: 26, danno: 150, vento: 0.5, gravita: 1,
          ritardo: 170, disegno: 'tappo', dimensione: 6, calo: { da: 450, a: 1400, min: 0.5 },
          lancio: { n: 5, apertura: 2.2, potenze: [0.96, 1.02, 1, 0.98, 1.04] },
        },
      ],
    },
    talpa: {
      nome: 'Talpa trivella',
      descrizione: 'Le sue punte entrano nel terreno e scoppiano sotto i piedi.',
      velMax: 880, angoli: [10, 82], energia: 130, peso: 1.05,
      stelle: { potenza: 3, gittata: 3, vento: 3, movimento: 2 },
      colpi: [
        {
          nome: 'Trivella', raggio: 40, danno: 235, vento: 0.9, gravita: 1, ritardo: 105,
          disegno: 'trivella', dimensione: 8, trivella: { lunghezza: 70, raggio: 9, vel: 260 },
        },
        {
          nome: 'Scavafosse', raggio: 74, danno: 150, vento: 0.9, gravita: 1, ritardo: 120,
          disegno: 'trivella', dimensione: 10, trivella: { lunghezza: 40, raggio: 12, vel: 220 },
        },
        {
          nome: 'Galleria', speciale: true, raggio: 64, danno: 230, vento: 0.9, gravita: 1, ritardo: 175,
          disegno: 'trivella', dimensione: 10, galleria: { lunghezza: 560, raggio: 16, vel: 320 },
        },
      ],
    },
    bolle: {
      nome: 'Soffiabolle',
      descrizione: 'Bolle leggere che volano piano: il vento le porta lontano.',
      velMax: 700, angoli: [0, 88], energia: 175, peso: 0.95,
      stelle: { potenza: 2, gittata: 4, vento: 1, movimento: 4 },
      colpi: [
        {
          nome: 'Bolla', raggio: 38, danno: 180, vento: 2, gravita: 0.5, ritardo: 95,
          disegno: 'bolla', dimensione: 9,
        },
        {
          nome: 'Bollicine', raggio: 30, danno: 95, vento: 2, gravita: 0.5, ritardo: 110,
          disegno: 'bolla', dimensione: 9,
          divide: { quando: 'apice', n: 4, apertura: 40, colpo: bollicina },
        },
        {
          nome: 'Bollona', speciale: true, raggio: 34, danno: 90, vento: 1.6, gravita: 0.5, ritardo: 160,
          disegno: 'bollona', dimensione: 14, bolla: { presa: 70, salita: 130, tempo: 2 },
        },
      ],
    },
  };
})();

/*
 * Gli oggetti: se ne scelgono due per partita, ognuno si usa una volta sola
 * (al massimo uno per turno, prima di tirare).
 */
(() => {
  'use strict';
  const TB = window.TinoBum;
  TB.OGGETTI = {
    cerotto: { nome: 'Cerotto', descrizione: 'Cura 250 punti di vita.', cura: 250 },
    ombrello: { nome: 'Ombrello', descrizione: 'Dimezza i danni del prossimo colpo che ti prende.' },
    doppio: { nome: 'Doppio tiro', descrizione: 'In questo turno tiri due volte.' },
    vento: { nome: 'Vento fermo', descrizione: 'Il vento si ferma per questo turno.' },
    teletrasporto: {
      nome: 'Teletrasporto', descrizione: 'Tiri una ghianda magica e ti ritrovi dove cade.',
      colpo: {
        nome: 'Ghianda magica', raggio: 0, danno: 0, vento: 1, gravita: 1, ritardo: 80,
        disegno: 'magica', dimensione: 8, teletrasporto: true,
      },
    },
  };
})();
