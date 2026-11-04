# TinoWebGame

Sito di minigiochi per browser con protagonisti dei peluche fotografati.
Progetto personale.

## Tecnologia
- HTML, CSS e JavaScript, senza framework.
- Pensato prima di tutto per computer (mouse e tastiera), ma ogni gioco
  deve essere giocabile anche da cellulare con controlli touch.

## Personaggi
- **Tino**: scoiattolo di peluche, il protagonista. Immagini in `assets/tino/`.
- **Gino**: figlio di Tino. Immagini in `assets/gino/`.
- Altri personaggi potranno essere aggiunti in `assets/<nome>/`.

## Espressioni di Tino
In `assets/tino/` ci sono più immagini, da usare a seconda della situazione:
- `tino-normale` (dal file originale Tino.gif): immagine di base, in gioco e nella home.
- `tino-arrabbiato`: quando subisce un punto o è in difficoltà, o prima di un tiro decisivo.
- `tino-ferito`: quando viene colpito o perde una vita.
- `tino-ko`: quando perde la partita (game over).

## Gino
Gino per ora ha una sola immagine (solo la testa): i suoi stati vanno resi
con animazioni sulla stessa immagine (tremolio quando è colpito, saltello
quando segna, caduta o rotazione quando perde). Se in futuro verranno aggiunte
altre immagini, seguiranno lo schema normale, arrabbiato, ferito, ko.

## Regole per le immagini
- Usare sempre i PNG originali dei personaggi, mai ridisegnarli o sostituirli
  con disegni o emoji.
- Ritagliarli sui bordi, ottimizzarli per il web, sfondo trasparente.
  Se un'immagine non ha lo sfondo trasparente, renderla trasparente.
- Se un'immagine è in un formato diverso dal PNG, convertirla in PNG.
- Animarli solo con trasformazioni: saltelli, schiacciamento, oscillazione,
  rotazione, specchiatura.

## Giochi
- Riprendono meccaniche di giochi classici, ma con nomi, grafica e livelli
  originali: nessun riferimento a nomi, personaggi o elementi di giochi esistenti.
- Ogni gioco sta in una cartella separata in `games/<nome-gioco>/`.
- La home elenca tutti i giochi; quando se ne aggiunge uno, va aggiunto alla home.
- Difficoltà progressiva, ma sempre battibile.

## Convenzioni
- Nomi di file e cartelle in minuscolo, con i trattini, senza spazi.
- Testi del sito in italiano.
- Percorsi sempre relativi (es. `../../assets/...`): il sito è servito da una
  sottocartella su GitHub Pages, quindi niente percorsi che iniziano con `/`.

## Struttura del sito
- `index.html` + `css/home.css`: home con l'elenco dei giochi (una scheda
  `<li>` per gioco in `.giochi`, con anteprima animata in CSS).
- `css/sito.css`: stili comuni (colori in variabili `:root`, classe `.bottone`
  e `.bottone.secondario`, animazioni `saltello` e `oscilla`). Ogni pagina lo
  include; ogni gioco aggiunge il proprio `stile.css`.
- Font: Fredoka da Google Fonts, con font di sistema come riserva.
- `assets/tino/` e `assets/gino/`: PNG già ritagliati, max 512 px, palette
  ottimizzata (30–50 KB l'uno).

## Pubblicazione
- Sito pubblico con GitHub Pages dal ramo `main`, cartella principale:
  https://donhardo.github.io/TinoWebGame/ (si aggiorna da solo a ogni unione in `main`).
- Flusso di lavoro: modifiche su un ramo, pull request verso `main`, unione.
  Se la pull request precedente è già unita, ripartire da `main` aggiornato.
- Per provare in locale serve un piccolo server (`python3 -m http.server`):
  aperte da file, alcune funzioni del browser (es. leggere i pixel delle
  immagini) sono bloccate.

## Giochi realizzati

### Botta e Ghianda (`games/botta-e-ghianda/`)
Gioco a racchette: Tino (sinistra / in basso) e Gino (destra / in alto) si
rimandano una ghianda. File: `index.html`, `stile.css`, `gioco.js` (tutta la
logica, su canvas), `ghianda.svg` (usata nell'anteprima della home).
- **Campo**: coordinate logiche 960 × 540 (u = asse tra i giocatori, v = asse
  di movimento). Se lo schermo è verticale il campo ruota (Tino in basso),
  mentre i personaggi restano dritti.
- **Controlli**: mouse, W/S o frecce; dito sul telefono. In due: Tino W/S,
  Gino frecce, oppure un dito per metà campo. P o Esc pausa, M suoni.
- **Modalità**: contro Gino a livelli da 5 punti (record del livello salvato
  in `localStorage`), due giocatori a 7 punti; nel menu una partita
  dimostrativa computer contro computer fa da sfondo.
- **Colpi**: tutta la sagoma visibile dei personaggi fa da racchetta (maschera
  dei pixel non trasparenti; se non leggibile, rettangolo). L'angolo dipende
  dal punto colpito e dal movimento del personaggio.
- **Difficoltà**: tabelle `PALLA` e `IA` in cima a `gioco.js` (base, aumento
  per livello, limite). Gino sbaglia di più sui tiri veloci, angolati e con
  rimbalzi; tarato con partite simulate: ~8% di tiri sbagliati al livello 1,
  ~3% dal livello 12 (mai imbattibile).
- **Super tiro** (tabella `SUPER`): barra che si carica a ogni colpo e col
  tempo; a barra piena il colpo successivo infuoca la ghianda, che scoppia
  ("POP!") e diventa un pop corn veloce e ondeggiante. Chi lo respinge lo
  spegne. Contro il computer la barra di Gino si carica più piano all'inizio.
- **Sfondo**: prato con fiorellini (disegnato una volta su una tela a parte)
  e una fila di formiche a metà campo che scappano quando passa la ghianda.
- **Espressioni**: Tino arrabbiato quando subisce un punto, prima del punto
  decisivo e quando ha il super tiro pronto; ferito sui tiri molto forti;
  ko quando perde. Gino: schiacciamento, tremolio, saltello, caduta ruotata.
- **Prove automatiche**: `window.bottaEGhianda` espone stato e funzioni
  (`iniziaPartita`, `aggiorna`, `prevedi`, `tocca`, `sagoma`, tabelle) per
  simulare partite senza tempo reale.

### Tino e la Ghianda d'Oro (`games/ghianda-d-oro/`)
Avventura a schermate fisse (meccaniche da classico d'azione nel tempio): Tino,
con cappello e frusta, va dalla partenza all'uscita di ogni livello tra trappole,
porte e agenti della Tari. Storia: gli agenti hanno rapito Gino. File:
`index.html`, `stile.css`, `livelli.js` (mappe e testi), `gioco.js` (logica, su canvas).
- **Decisioni prese**: titolo "Tino e la Ghianda d'Oro"; telecamera a stanze fisse
  come l'originale; movimenti "via di mezzo" (Tino si aggrappa ai bordi da solo);
  gli agenti si stordiscono e si evitano, non si eliminano; sul telefono si gioca
  solo in orizzontale (in verticale compare l'invito a girarlo).
- **Livelli**: in `livelli.js`, griglie di stanze da 16 × 9 quadretti (60 px,
  schermo logico 960 × 540), scritte a caratteri; la legenda è in cima al file.
  Testi dei cartelli in due versioni (`pc` e `touch`).
- **Ceci = energia**: si parte con 3, si perde un cece se colpiti, presi da un
  agente, sugli spuntoni, cadendo in un baratro o da troppo in alto (si riparte
  dall'ultimo punto sicuro). A zero ceci Tino è KO e riparte dal punto di
  partenza (torcia), senza limiti di tentativi. Il cece d'oro alza il massimo.
- **Frusta**: vicino a un piolo d'oro si aggancia e Tino dondola (← → per lo
  slancio, ↑ ↓ accorciano e allungano la frusta conservando il momento, Spazio o
  X per staccarsi; sul telefono ▲ ▼ e Salta/Frusta). Agganciata da terra resta
  lasca finché Tino non si stacca dal suolo. Lontano dai pioli schiocca, stordisce
  gli agenti e spazza via le bollette. ↑ salta solo fuori dalla frusta; Spazio
  salta sempre.
- **Robivecchi**: premi nascosti in punti difficili (cifre 1-7 nella mappa:
  moneta, bottone, graffetta, fiocco, carta di credito scaduta, tappo a corona,
  biglia; disegni in
  `assets/oggetti/robivecchi/`). Salvati in `localStorage` appena presi; si
  vedono nella barra (quelli del livello), a fine livello e nel menu (collezione).
- **Chiavi e lucchetti**: `k` chiave (si accumulano, si vedono nella barra),
  `L` porta col lucchetto (si apre toccandola con una chiave, che si consuma;
  le `L` una sopra l'altra sono la stessa porta).
- **Trappole**: `^` spuntoni fissi, `v` spuntoni a scomparsa (tabella `SPUNTONI`),
  `x` cesoie a tempo che occupano la casella e quella sopra (tabella `CESOIE`,
  ogni cesoia è sfasata rispetto alla precedente), `Y` stalattiti che cadono
  quando Tino ci passa sotto (tabella `STALATTITI`), `~` pavimento che crolla,
  baratri. Il fumetto dei cartelli va in basso se Tino è nella metà alta.
- **Agenti della Tari** (`assets/agenti-tari/`, disegni vettoriali con scritta
  TARI già in tracciati): col retino (ronda e insegue), col timbro (lancia
  bollette), ispettore capo (fine dei mondi).
- **Ispettore capo** (`I` nella mappa, tabella `CAPO`, un solo capo per livello):
  dorme alla scrivania e si sveglia quando Tino lo supera. Insegue Tino anche
  da una stanza all'altra: va dove Tino è uscito (`G.uscite`). È più lento di
  Tino (220 contro 250) ma ignora gli spuntoni. Salta gradini di un quadretto
  e buchi di al massimo due; davanti a muri più alti o burroni più larghi si
  ferma e minaccia. La frusta e le trappole (cesoie, stalattiti) lo fermano
  solo per 0,6 s, poi è immune per un po'; non si stordisce. Col megafono
  lancia onde "MULTA!" da saltare, se Tino è sullo stesso piano. Quando
  atterra fa tremare lo schermo e cadere le stalattiti vicine. Pesa: il
  pavimento crepato sotto di lui crolla prima, e se cade nel baratro
  ricompare dall'ultimo punto in cui toccava terra. Se Tino riparte da un
  punto di partenza più avanti della scrivania, il capo arriva dal bordo
  sinistro della stanza dopo 4 s.
- **Tino vestito**: cappello e frusta sono in `assets/tino/accessori/` e si
  appoggiano alle foto originali con la tabella `POSE` (posizione e rotazione
  per ogni espressione); anteprima in `bozzetti/avventura.html`.
- **Tabelle** in cima a `gioco.js`: `FISICA`, `FRUSTA`, `AGENTI`, `VITA`, `PORTA`.
- **Livelli fatti** (mondo 1, le radici della quercia):
  1 "Le radici della Quercia" (4 stanze, guida; moneta in fondo al baratro);
  2 "Il pozzo delle radici" (3 × 2 stanze: agente col timbro, due pioli,
  stalattiti, buco con chiave e spuntoni a scomparsa, cesoie, porta col
  lucchetto, corsa alla porta di 5 s; bottone e graffetta; ~35 s al giocatore
  perfetto); 3 "La galleria dei pioli" (6 stanze in fila: pilastro da superare
  accorciando la frusta, strada alta o bassa con due agenti, porta di 5 s,
  corridoio di tre cesoie e spuntoni a scomparsa, chiave su una sporgenza sotto
  una stalattite, porta col lucchetto, frusta dal pavimento che crolla;
  fiocco e carta di credito; ~43 s); 4 "L'ispettore capo" (6 stanze in fila:
  piolo sopra gli spuntoni con il tappo da prendere accorciando la frusta,
  agente col retino, ufficio con l'ispettore che dorme, poi inseguimento tra
  gradino, spuntoni a scomparsa, cesoie, pavimento crepato e una scala di tre
  gradini (deviazione per la biglia), fino al burrone da passare col piolo,
  dove il capo resta bloccato; ~29 s al giocatore perfetto, con il capo a
  150-250 px nei punti critici; testo di fine mondo nel campo `fine`).
- **Prove automatiche**: `window.ghiandaDOro` (`G.test = true`, `avvia`,
  `premi`, `passo`) per far giocare un livello a un giocatore simulato con una
  sequenza di mosse (vai, salta, sali, frusta, dondola regolando la corda).
  Tutti i livelli si completano con tutti i robivecchi (il copione del 4 salta
  da solo le onde del megafono); le porte del 2 e del 3
  richiedono ~3,5–4 s a un giocatore perfetto (impostate a 5 s).
- **Piano dei mondi** (approvato): 3 mondi da 4 livelli, ognuno con colori,
  sfondi e una trappola propria; l'ultimo livello di ogni mondo ha l'ispettore
  capo, che non si stordisce e va seminato.
  1. *Le radici della Quercia* (gallerie di terra e pietra): completo, livelli 1-4.
  2. *Il tempio sepolto* (sabbia, pietre dorate, colonne, geroglifici di
     ghiande): massi che rotolano, frecce dai muri, sabbie mobili, piattaforme
     mobili.
  3. *Gli uffici della Tari* (scrivanie, archivi, timbri giganti): nastri
     trasportatori di pratiche, cassetti-piattaforma, fotocopiatrici che
     sparano fogli, più agenti; alla fine liberazione di Gino e Ghianda d'Oro.
- **Prossimo passo (deciso)**: nella prossima sessione si fa il mondo 2,
  *Il tempio sepolto*, per intero: tutti e 4 i livelli (5-8) in una volta.
  Servono colori e sfondo propri del mondo (sabbia, pietre dorate, colonne,
  geroglifici di ghiande; oggi `preparaStanza` disegna solo le radici, quindi
  va scelto lo stile in base al mondo del livello), le trappole nuove (massi
  che rotolano, frecce dai muri, sabbie mobili, piattaforme mobili), nuovi
  robivecchi e, nel livello 8, un nuovo inseguimento dell'ispettore capo.
  Ogni livello va verificato col giocatore simulato (tutti i robivecchi).
- **Provarlo su Claude**: per far provare un ramo non ancora unito si pubblica
  il gioco come artifact. In una cartella di appoggio vanno `index.html` (senza
  doctype, html, head e body, con i percorsi `../../` tolti), `css/sito.css`,
  `stile.css`, `livelli.js`, `gioco.js` (con `BASE = 'assets/'` e
  `leggi('sbloccati', N)` per sbloccare tutti i livelli) e la cartella
  `assets/`. Si pubblica con `files` e `root`.
- **Copioni del giocatore simulato**: i copioni usati per verificare i
  livelli non sono nel repository; per un livello nuovo vanno riscritti
  (passi vai, salta, sali, frusta, dondola) e fatti girare con Playwright.

## Per il prossimo gioco
- Cartella `games/<nome-gioco>/` con `index.html`, `stile.css`, `gioco.js`;
  riusare `css/sito.css`, la barra in alto e i pannelli (menu, pausa, fine)
  di Botta e Ghianda come modello.
- Aggiungere la scheda nella home e una voce in questo file e nel README.
- Usare le espressioni di Tino e le animazioni di Gino come descritto sopra.
- Provare su computer e su telefono (orizzontale e verticale) e tarare la
  difficoltà con partite simulate prima di pubblicare.
