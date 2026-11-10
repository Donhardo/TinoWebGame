/*
 * Partite simulate di Tino Flipper (versione 2), con Playwright.
 *
 * Fa giocare il giocatore simulato (pilotaIA) a partite intere, senza tempo
 * reale, e stampa durata, punti, avventure, multiball, ghiande uscite dal
 * tavolo o incastrate (che non devono mai succedere) e dove si perdono.
 *
 * Serve un server locale dalla cartella principale del sito:
 *   python3 -m http.server 8765
 * Poi:
 *   node games/tino-flipper/prove/partite.js [tavolo] [partite] [minutiMax] [livello]
 * livello: preciso (4 ms, mira 90%), bravo (25 ms, 60%), medio (35 ms, 35%),
 * principiante (50 ms, 20%); predefinito medio. Le partite girano in 3 pagine
 * in parallelo.
 */
const { chromium } = require('playwright');

const tavolo = process.argv[2] || 'radici';
const partite = +(process.argv[3] || 6);
const minuti = +(process.argv[4] || 12);
const livello = process.argv[5] || 'medio';
const LIVELLI = {
  preciso: { errore: 0.004, bravura: 0.9 },
  bravo: { errore: 0.025, bravura: 0.6 },
  medio: { errore: 0.035, bravura: 0.35 },
  principiante: { errore: 0.05, bravura: 0.2 },
};
const URL = `http://localhost:8765/games/tino-flipper/index.html?tavolo=${tavolo}`;

async function partita(page, seme) {
  return page.evaluate(async ({ ia, minuti, seme }) => {
    const F = window.tinoFlipper;
    F.stato.test = true;
    F.stato.iaGioca = true;
    Object.assign(F.IA, ia);
    F.iniziaPartita('gioco');
    const st = F.stato;
    const passi = Math.round(minuti * 60 * 60);
    let n = 0;
    const avventure = new Set();
    let multiball = 0, eraMulti = false;
    while (st.fase !== 'finita' && n < passi) {
      F.aggiorna(1 / 60);
      n++;
      if (st.avventura) avventure.add(st.avventura.id);
      if (st.multiball && !eraMulti) multiball++;
      eraMulti = st.multiball;
      if (n % 2000 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    const s = st.statistiche;
    return {
      seme, finita: st.fase === 'finita', minuti: +(n / 3600).toFixed(1), punti: st.punti,
      palle: s.palle, perse: s.perse, salvate: s.salvate, fuori: s.fuori, ferme: s.ferme,
      dove: s.dove, scoli: s.scoli || [], tiri: s.tiri, avventure: [...avventure], multiball,
      robivecchi: st.robivecchi ? st.robivecchi.presi.slice() : [],
      giro: st.giro,
    };
  }, { ia: LIVELLI[livello] || LIVELLI.medio, minuti, seme });
}

(async () => {
  const b = await chromium.launch();
  const pagine = Math.min(3, partite);
  const code = Array.from({ length: partite }, (_, i) => i);
  const risultati = [];
  const errori = [];
  await Promise.all(Array.from({ length: pagine }, async () => {
    const page = await b.newPage({ viewport: { width: 1200, height: 900 } });
    page.on('pageerror', (e) => errori.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.tinoFlipper);
    while (code.length) {
      const seme = code.shift();
      const r = await partita(page, seme);
      risultati.push(r);
      console.log(`partita ${seme + 1}: ${r.minuti} min, ${r.punti.toLocaleString('it-IT')} punti, palle ${r.palle}, salvate ${r.salvate}, fuori ${r.fuori}, ferme ${r.ferme}, multiball ${r.multiball}, avventure [${r.avventure}], robivecchi [${r.robivecchi}]${r.finita ? '' : ' (interrotta)'}`);
      if (r.dove.length) console.log('   dove:', JSON.stringify(r.dove));
    }
    await page.close();
  }));
  await b.close();
  const media = (k) => (risultati.reduce((s, r) => s + r[k], 0) / risultati.length).toFixed(1);
  console.log(`\n${tavolo} · ${livello} · ${risultati.length} partite: ${media('minuti')} min, ${Math.round(risultati.reduce((s, r) => s + r.punti, 0) / risultati.length).toLocaleString('it-IT')} punti, fuori ${media('fuori')}, ferme ${media('ferme')}, multiball ${media('multiball')}, avventure ${(risultati.reduce((s, r) => s + r.avventure.length, 0) / risultati.length).toFixed(1)}`);
  const scoli = {};
  for (const r of risultati) for (const [x, lato] of r.scoli) scoli[lato + (x < 300 ? ' sx' : ' dx')] = (scoli[lato + (x < 300 ? ' sx' : ' dx')] || 0) + 1;
  console.log('dove si perde:', JSON.stringify(scoli));
  const tiri = {};
  for (const r of risultati) for (const [k, v] of Object.entries(r.tiri)) tiri[k] = (tiri[k] || 0) + v;
  console.log('tiri (totale):', JSON.stringify(tiri));
  if (errori.length) console.log('ERRORI:', errori);
})();
