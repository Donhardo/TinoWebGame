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
          nome: 'Sasso', raggio: 32, danno: 215, vento: 0.35, gravita: 1, ritardo: 90,
          disegno: 'sasso', dimensione: 7,
        },
        {
          nome: 'Rimbalzino', raggio: 36, danno: 225, vento: 0.35, gravita: 1, ritardo: 110,
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
  };
})();
