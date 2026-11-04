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
- **Robivecchi**: premi nascosti in punti difficili (cifre 1-5 nella mappa:
  moneta, bottone, graffetta, fiocco, carta di credito scaduta; disegni in
  `assets/oggetti/robivecchi/`). Salvati in `localStorage` appena presi; si
  vedono nella barra (quelli del livello), a fine livello e nel menu (collezione).
- **Agenti della Tari** (`assets/agenti-tari/`, disegni vettoriali con scritta
  TARI già in tracciati): col retino (ronda e insegue), col timbro (lancia
  bollette), ispettore capo (per la fine dei mondi, non ancora usato).
- **Tino vestito**: cappello e frusta sono in `assets/tino/accessori/` e si
  appoggiano alle foto originali con la tabella `POSE` (posizione e rotazione
  per ogni espressione); anteprima in `bozzetti/avventura.html`.
- **Tabelle** in cima a `gioco.js`: `FISICA`, `FRUSTA`, `AGENTI`, `VITA`, `PORTA`.
- **Livelli fatti**: 1 "Le radici della Quercia" (guida, moneta in fondo al
  baratro), 2 "Il pozzo delle radici" (2 × 2 stanze: agente col timbro,
  due pioli, corsa alla porta di 5 s; bottone e graffetta), 3 "La galleria dei
  pioli" (pilastro da superare accorciando la frusta, strada alta con pavimento
  che crolla o bassa con due agenti, porta di 5 s; fiocco e carta di credito).
- **Prove automatiche**: `window.ghiandaDOro` (`G.test = true`, `avvia`,
  `premi`, `passo`) per far giocare un livello a un giocatore simulato con una
  sequenza di mosse (vai, salta, sali, frusta, dondola regolando la corda).
  Tutti i livelli si completano con tutti i robivecchi; le porte del 2 e del 3
  richiedono ~3,5–4 s a un giocatore perfetto (impostate a 5 s).
- **Da fare**: altri livelli (3 mondi da 4: radici della quercia, tempio
  sepolto, uffici della Tari), ispettore capo, liberazione di Gino.

## Per il prossimo gioco
- Cartella `games/<nome-gioco>/` con `index.html`, `stile.css`, `gioco.js`;
  riusare `css/sito.css`, la barra in alto e i pannelli (menu, pausa, fine)
  di Botta e Ghianda come modello.
- Aggiungere la scheda nella home e una voce in questo file e nel README.
- Usare le espressioni di Tino e le animazioni di Gino come descritto sopra.
- Provare su computer e su telefono (orizzontale e verticale) e tarare la
  difficoltà con partite simulate prima di pubblicare.
