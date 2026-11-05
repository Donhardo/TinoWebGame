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
  schermo logico 960 × 540), scritte a caratteri; la legenda è in cima al file
  (anche quella dei caratteri del tempio). Tino è alto poco più di un quadretto:
  sopra il suo pavimento servono due quadretti liberi.
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
  biglia; nel mondo 2 `8 9 0 & $ @ %`: dado, ditale, linguetta di lattina,
  rocchetto di filo, biglietto del tram, conchiglia, mozzicone di matita; nel mondo 3
  `! ? + ; " / ,`: gomma, puntina, francobollo, cappuccio di penna, elastico,
  temperamatite, molletta; disegni in `assets/oggetti/robivecchi/`). Salvati in `localStorage` appena presi; si
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
  ricompare dall'ultimo punto in cui toccava terra. Se Tino o il capo sono sopra un
  nastro trasportatore il megafono tace (le onde da dietro, con il nastro che frena
  Tino, erano impossibili da saltare). Se Tino riparte da un
  punto di partenza più avanti della scrivania, il capo arriva dal bordo
  sinistro della stanza dopo 4 s.
- **Tino vestito**: cappello e frusta sono in `assets/tino/accessori/` e si
  appoggiano alle foto originali con la tabella `POSE` (posizione e rotazione
  per ogni espressione); anteprima in `bozzetti/avventura.html`.
- **Tabelle** in cima a `gioco.js`: `FISICA`, `FRUSTA`, `AGENTI`, `VITA`, `PORTA`;
  per il mondo 2 `MASSI`, `FRECCE`, `SABBIA`, `PIATTAFORME`; per il mondo 3 `NASTRI`,
  `CASSETTI`, `FOTOCOPIE`, `TIMBRONI`; `MONDI` (nome, colori e
  decorazioni di ogni mondo: il livello sceglie il suo con `mondo: N` in `livelli.js`,
  e `preparaStanza` disegna radici, tempio o uffici di conseguenza; nel menu i livelli sono
  divisi per mondo).
- **Trappole del tempio** (mondo 2):
  - `M` masso: quando Tino è nella stanza, a meno di 8 quadretti e non più in alto,
    trema e rotola verso di lui (220, più lento di Tino); cade dai bordi, si rompe
    contro i muri, affonda nella sabbia e ricompare dopo 2,5 s. `(` e `)` rotolano
    solo a sinistra / a destra, quando Tino li ha superati da quella parte (per gli
    inseguimenti). Si salta; stordisce gli agenti e ferma l'ispettore.
  - `>` `<` balestra: un muro con la faccia di pietra che tira frecce a tempo (ogni
    2,2 s, ogni balestra sfasata di 0,55 s rispetto alla precedente) solo se Tino è
    nella stanza; la bocca si illumina prima del tiro. Frecce all'altezza del corpo
    vanno saltate, quelle un quadretto più in alto passano sopra la testa (ma
    colpiscono chi salta). La frusta le spazza via; fermano anche l'ispettore.
  - `s` sabbie mobili: solo Tino ci affonda (48 px/s, a 50 px perde un cece e
    riparte dal punto sicuro); dentro corre al 45% e salta un po' meno, quindi si
    attraversano saltando di continuo. Per agenti e ispettore sono pavimento (il
    capo ci cammina al 45%). Vanno messe al livello del pavimento.
  - `=` `H` piattaforme mobili (lastre d'oro, `==` larga due quadretti), orizzontali
    e verticali: vanno e vengono fino al primo muro o al segno invisibile `:`, con
    una sosta agli estremi; si sale da sotto, con ↓ si scende, portano Tino con sé.
    Partono andando verso destra / verso il basso dalla posizione della mappa.
    Sopra una lastra verticale servono due quadretti liberi fino al soffitto
    (altrimenti Tino viene lasciato e la lastra gli passa attraverso).
  - L'ispettore capo non usa le lastre; quando segue Tino in un'altra stanza scende
    anche dai gradini (prima scendeva solo se Tino era più in basso).
- **Trappole degli uffici** (mondo 3):
  - `{` `}` nastri trasportatori verso sinistra / destra: sono pavimento e portano
    con sé Tino, agenti e ispettore (110 px/s: contro si corre a 140, a favore a 360).
    In aria il nastro non spinge. Non sono punto sicuro.
  - `[` `]` archivi: la casella è il mobile (muro), il cassetto esce di due quadretti a
    destra / a sinistra (fino al primo muro) all'altezza della cima della casella; ci
    si sale sopra (da sotto si passa). Ciclo: esce 0,35 s, aperto 2 s, rientra 0,35 s,
    chiuso 1,3 s; ogni riga è sfasata di 0,6 s e quelle più in basso si aprono prima,
    così si sale da un cassetto all'altro. Se rientra con Tino sopra, lo porta contro il
    mobile e lo lascia cadere. Agenti e ispettore non li usano.
  - `F` fotocopiatrice: blocco alto un quadretto (ci si sale) che ogni 2,6 s spara un
    foglio verso Tino (la luce verde avvisa), all'altezza del corpo, ondeggiando; si
    salta o si spazza con la frusta; contro i muri si ferma.
  - `G` timbro gigante appeso al soffitto: su 1,7 s, trema 0,5 s, scende fino al primo
    pavimento, resta giù 0,5 s, risale; lascia l'impronta TARI. Colpisce Tino, stordisce
    gli agenti, ferma l'ispettore. Va messo almeno due quadretti sopra la testa di Tino.
  - `O` la Ghianda d'Oro e `g` la gabbia di Gino (ultimo livello, al posto di `U`):
    la gabbia si apre solo con la Ghianda; Gino esce e saltella, poi il pannello finale
    "Gino è libero!" (con il testo `fine`), e il menu ricorda che il gioco è finito
    (`localStorage` `finito`).
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
- **Livelli fatti** (mondo 2, il tempio sepolto):
  5 "L'ingresso del tempio" (5 stanze: frecce basse da saltare e balestra su cui
  arrampicarsi, primo masso da saltare, piolo sugli spuntoni col dado da prendere
  allungando la frusta, masso che insegue fino a un buco da saltare, frecce alte e
  basse con il ditale su una sporgenza; ~26 s al giocatore perfetto);
  6 "Le sabbie mobili" (5 stanze: sabbia da attraversare saltando, piolo sopra la
  sabbia con la linguetta su una sporgenza alta, chiave su una colonna da prendere
  saltando fuori dalla sabbia, agente col retino e lucchetto, pavimento crepato
  sopra la sabbia con agente col timbro e piolo verso il rocchetto, masso che
  affonda nella sabbia; ~25 s);
  7 "Il salone delle colonne" (5 stanze: lastra orizzontale sulla sabbia, lastra
  verticale con le frecce da spazzare con la frusta e il biglietto in alto a
  sinistra, lastre sopra gli spuntoni con la conchiglia, due lastre verticali con
  la chiave in cima e frecce, lastra sugli spuntoni e lucchetto; ~50 s);
  8 "Il ritorno dell'ispettore" (6 stanze: sabbia, masso da saltare, ufficio
  dell'ispettore, poi inseguimento tra sabbia e frecce (che lo fermano), masso che
  scende da una sporgenza, salta in testa a Tino e poi colpisce l'ispettore,
  matita su una sporgenza, blocco alto due quadretti dove il capo resta a terra
  mentre Tino aspetta la lastra; ~33 s, con il capo a ~150 px sul blocco).
- **Livelli fatti** (mondo 3, gli uffici della Tari):
  9 "L'archivio" (5 stanze: nastro a favore, puntine con nastro contro e la puntina da
  prendere saltando sul nastro, archivio da scalare di cassetto in cassetto con la
  gomma su un cassetto in alto a destra, fotocopiatrice e agente col retino, agente col
  timbro su un blocco alto due; ~30 s); 10 "La sala dei timbri" (5 stanze: primo timbro,
  nastro veloce sotto due timbri con il francobollo da prendere saltando sotto il
  secondo, archivio e mensola col cappuccio, fotocopiatrice contro il mobile, ufficio
  con tre agenti, nastro contro sotto un timbro con la fotocopiatrice davanti; ~26 s);
  11 "Lo sportello chiuso" (5 stanze: pulsante e corsa allo sportello di 5,5 s aiutata
  dal nastro, con l'elastico da prendere al volo (~4,3 s senza, ~4,7 s con), pozzo
  dell'archivio con cassetti alternati a destra e sinistra e la chiave in cima,
  corridoio alto con due timbri e un pozzetto col temperamatite, sportello col
  lucchetto; ~28 s); 12 "L'ufficio del capo" (6 stanze: nastro e timbro, due cassetti
  sopra le puntine attorno a un pilastro, ufficio dell'ispettore, inseguimento su un
  nastro contro sotto due timbri (che lo fermano) con la molletta da prendere saltando,
  mobile alto due dove il capo resta bloccato e due cassetti sopra le puntine, Ghianda
  d'Oro su una mensola e gabbia di Gino; ~41 s, con il capo a ~110 px nel punto più
  stretto e a ~220 px quando Tino sale sul mobile).
- **Prove automatiche**: `window.ghiandaDOro` (`G.test = true`, `avvia`,
  `premi`, `passo`) per far giocare un livello a un giocatore simulato con una
  sequenza di mosse (vai, salta, sali, frusta, dondola regolando la corda).
  Tutti i livelli si completano con tutti i robivecchi (il copione del 4 salta
  da solo le onde del megafono); le porte del 2 e del 3
  richiedono ~3,5–4 s a un giocatore perfetto (impostate a 5 s). I livelli 5-8
  sono stati completati senza perdere ceci; per i copioni del tempio servono anche
  "attraversa la sabbia saltando" e le attese su massi, frecce
  (`caricaBalestra`, `G.frecce`) e lastre (`G.liv.piattaforme`, `posPiattaforma`).
  Per gli uffici: `estensione(cassetto, G.tempo)` (aspettare che un cassetto si apra
  da capo, non solo che sia aperto), `statoTimbro`, `caricaFotocopia`, `G.fogli`,
  `G.onde`. I livelli 9-12 sono stati completati senza perdere ceci e con tutti i
  robivecchi.
- **Piano dei mondi** (approvato): 3 mondi da 4 livelli, ognuno con colori,
  sfondi e una trappola propria; l'ultimo livello di ogni mondo ha l'ispettore
  capo, che non si stordisce e va seminato.
  1. *Le radici della Quercia* (gallerie di terra e pietra): completo, livelli 1-4.
  2. *Il tempio sepolto* (sabbia, pietre dorate, colonne, geroglifici di
     ghiande): completo, livelli 5-8 (massi, frecce, sabbie mobili, piattaforme mobili).
  3. *Gli uffici della Tari* (scrivanie, archivi, timbri giganti): completo, livelli
     9-12 (nastri trasportatori, cassetti, fotocopiatrici, timbri giganti, più agenti);
     alla fine liberazione di Gino e Ghianda d'Oro.
- **Stato**: il gioco è completo (3 mondi, 12 livelli, 21 robivecchi, finale con Gino).
  Possibili seguiti, non ancora decisi: un mondo bonus, la classifica dei tempi per
  livello, una schermata con tutti i robivecchi e i livelli in cui stanno.
- **Provarlo su Claude**: per far provare un ramo non ancora unito si pubblica
  il gioco come artifact. In una cartella di appoggio vanno `index.html` (senza
  doctype, html, head e body, con i percorsi `../../` tolti), `css/sito.css`,
  `stile.css`, `livelli.js`, `gioco.js` (con `BASE = 'assets/'` e
  `leggi('sbloccati', N)` per sbloccare tutti i livelli) e la cartella
  `assets/`. Si pubblica con `files` e `root`.
- **Copioni del giocatore simulato**: i copioni usati per verificare i
  livelli non sono nel repository; per un livello nuovo vanno riscritti
  (passi vai, salta, sali, frusta, dondola) e fatti girare con Playwright.

### Tino Bum! (`games/tino-bum/`)
Artiglieria a turni (meccaniche da classico dei carri armati a turni): ogni
giocatore guida un mezzo su una mappa di isole generata a caso, sceglie alzo e
potenza e tiene conto del vento. File: `index.html`, `stile.css`, `mezzi.js`
(tabelle `MEZZI` con i colpi e `OGGETTI`), `terreno.js` (generazione, crateri, fondali),
`suoni.js` (tutti i suoni), `gioco.js` (turni, fisica, IA, disegno, pannelli).
- **Decisioni prese**: titolo "Tino Bum!"; mezzi ricchi con caratteristiche
  proprie; IA brava ma battibile; mappe con isole e ostacoli generate a caso;
  fondali in stile cartone (per ora disegnati nel codice: se non bastano, si
  passano a Gemini i prompt per i fondali per ambientazione); tre modalità:
  Tino contro Gino (computer), due giocatori sullo stesso dispositivo, campagna
  contro gli agenti della Tari. Sul telefono si gioca in orizzontale.
- **Tappe**: 1 motore (fatta: terreno, turni, vento, 3 mezzi, IA, due
  giocatori); 2 contenuti (fatta: cannone a tappi, talpa trivella, soffiabolle;
  oggetti; campagna contro gli agenti con l'ispettore capo); 3 rifinitura
  (fatta: ambientazioni, suoni, ritaratura dei mezzi).
- **Mondo**: 1600 × 900 pixel, acqua da y = 846 (chi ci cade perde). Schermo
  logico 960 × 540; la camera inquadra i giocatori (e i colpi in volo), zoom con
  rotella o + −. Gravità 500, vento fino a ±10 (13 px/s² per punto).
- **Terreno** (`terreno.js`): griglia di materiali (0 aria, 1 terra, 2 roccia
  indistruttibile, 3 legno). Quattro tipi di mappa: `arcipelago`, `colline`,
  `ponti`, `valle` (con torre di roccia); grotte (con il fondo scuro), massi,
  tronchi. Disegnato una volta in ImageData (contorno spesso, erba, sassolini,
  radici); `scava` toglie i pixel e ripassa il bordo del cratere.
- **Fondali**: dipinti con Gemini (prompt di stile comune + uno per ambientazione:
  sfondo lontano senza primo piano, orizzonte nel terzo basso, centro sgombro,
  fondo che sfuma nell'acqua), in `games/tino-bum/fondali/` (`prato.png`,
  `spiaggia.png`, `autunno.png`, `uffici.png`, 1600 × 900, palette a 256 colori).
  Si disegna un po' più grande dello schermo e scorre piano con la camera. Se
  l'immagine non c'è, resta il fondale disegnato nel codice (`nuovoFondale`).
- **Ambientazioni** (tabella `AMBIENTI` in `gioco.js`, colori del terreno in
  `PALETTE` in `terreno.js`): prato (erba), spiaggia (sabbia, mare turchese),
  bosco in autunno (foglie arancioni, lago; foglie che volano col vento), uffici
  della Tari (moquette sopra pile di fogli, roccia di metallo, post-it al posto dei
  sassolini; al posto dell'acqua una vasca d'inchiostro viola dei timbri; fogli che
  volano col vento; un velo scuro sul fondale, che è molto pieno). Foglie e fogli
  sono solo decorazione, ma fanno vedere il vento. Contro Gino l'ambientazione
  cambia a ogni livello (prato, spiaggia, autunno, uffici, poi da capo); in due si
  sceglie nella schermata dei mezzi ("Dove:", ricordata in `localStorage`, o a
  caso); campagna: tappe 1 e 4 prato, 2 spiaggia, 3 autunno, 5 e 6 uffici.
- **Suoni** (`suoni.js`, `TB.audio`): tutti sintetizzati con Web Audio, nessun
  file; passano da un compressore. Effetti brevi in `TB.audio.effetti` (in
  `gioco.js` si chiamano con `suoni.nome(...)`, che controlla se si può suonare:
  non muto, non nella partita dimostrativa del menu, non nelle prove): tiro
  diverso per ogni mezzo (e per la ghianda magica), esplosione a tre strati
  (botta, schiocco, rombo, più le zolle che ricadono) secondo la grandezza,
  spruzzo nell'acqua o "blop" nell'inchiostro, voce di chi è colpito (più acuta
  per Gino, più bassa per gli agenti e il capo), fischio che scende al KO, tonfo
  quando un mezzo atterra, campanello del turno (più piano per il computer), tic
  tac negli ultimi 5 s dei turni umani, "tempo scaduto", speciale pronto, un
  suono per ogni oggetto, parata dell'ombrello, musichette di vittoria e
  sconfitta. Suoni continui in `TB.audio.continui`, aggiornati a ogni fotogramma
  da `aggiornaAudio`: vento (a raffiche, più forte e acuto col vento), carica
  della potenza (sale di tono), motore del mezzo mentre si sposta, fischio del
  colpo in volo (sale mentre sale, scende mentre cade; le bolle ondeggiano),
  trivella sotto terra; rumori di fondo dell'ambientazione (uccellini nel prato,
  onde e gabbiani sulla spiaggia, foglie nel bosco, macchine da scrivere,
  telefono e timbri negli uffici). In pausa, nel menu e con la scheda nascosta
  tace tutto. M o il pulsante in alto tolgono i suoni (`localStorage` `muto`).
- **Partenze**: punti in piano lontani tra loro (un terzo sinistro e un terzo
  destro); la mappa si scarta se l'IA non trova un tiro che colpisce da
  entrambe le parti senza vento.
- **Turni**: tocca a chi ha meno "ritardo" (ogni colpo ne aggiunge, moltiplicato
  per il `peso` del mezzo, più i passi fatti): i colpi forti fanno aspettare.
  30 s per i turni umani. Energia di movimento per turno (`energia` del mezzo).
- **Colpi**: tenere premuto carica la potenza (0,55 al secondo; il segno rosso
  è la potenza del tiro prima, il puntino rosso l'alzo di prima). Una breve
  traccia guida (senza vento) mostra solo l'inizio del tiro. Comportamenti in
  `mezzi.js`: `lancio` (più colpi), `rimbalzi`, `esplodeRimbalzo`, `divide`
  (all'apice o in discesa), `calo` (il danno cala con la strada percorsa),
  `trivella` (dentro il terreno va dritta scavando; se sbuca dall'altra parte
  riprende il volo, altrimenti esplode a fine corsa), `galleria` (come la trivella
  ma in orizzontale, esplode sotto il primo nemico), `bolla` (cattura chi è vicino,
  lo fa salire 2 s spinto dal vento e lo lascia cadere: danno di caduta, tabella
  `BOLLA`, e se finisce in acqua perde). Lo scavo è fatto un po' indietro rispetto
  alla punta, così la simulazione dell'IA (che non scava) dà lo stesso risultato.
  Danno lineare dal centro al bordo del cratere,
  +10% sul colpo diretto; le esplosioni spingono (tabella `FISICA.spinta`).
  Speciale: barra che si carica a ogni turno e coi danni subiti.
- **Mezzi**: catapulta (equilibrata), fionda gigante (tiri tesi,
  poco vento, molto movimento), mortaio di zucca (solo tiri alti, crateri grandi,
  pesante), cannone a tappi (tappo, tappone, speciale raffica di 5 tappi: danno
  pieno fino a 350-450 px di strada, poi cala fino al 40-50%), talpa trivella
  (trivella, scavafosse, speciale galleria), soffiabolle (bolle con vento ×2 e
  gravità dimezzata, bollicine che si dividono, speciale bollona). Girone di
  partite simulate al livello 5 (10 per coppia, 50 partite per mezzo, ±14%):
  prima della ritaratura la fionda vinceva il 18% (i suoi tiri tesi soffrono
  l'errore sull'alzo) e la catapulta il 74%. Ritaratura: `erroreIA: 0.4` per la
  fionda (moltiplica l'errore del computer, solo per quel mezzo), sasso con
  raggio 38 (era 32), ghianda della catapulta 200 di danno (era 240) e tre
  ghiande 95 (era 105). Dopo: catapulta 50%, fionda 48%, mortaio 58%, cannone
  52%, talpa 42%, soffiabolle 50%. Disegnati nel codice (`disegnaMezzo`), con il personaggio seduto
  dietro (`SEDILE`).
- **IA** (tabella `IA`): prova davvero i tiri con la stessa fisica del gioco
  (`simulaTiro`, `cercaTiro`: tutti gli alzi e le potenze, poi affina), sceglie
  il colpo che fa più danno (meno quello a sé stessa), si sposta se da dove sta
  non ha tiri buoni, poi sbaglia apposta: errore su alzo e potenza che cala col
  livello e si riduce se tira di nuovo allo stesso bersaglio fermo. Tarato con
  partite simulate computer contro computer: ~28% di tiri a segno al livello 1,
  ~45% ai livelli 4-8, ~60% dal 12 (non sale oltre). Vento massimo 2 + livello.
- **Oggetti** (tabella `OGGETTI` in `mezzi.js`): se ne scelgono due per partita
  dopo il mezzo (scelta ricordata in `localStorage`), ognuno una volta sola, al
  massimo uno per turno, prima di tirare (tasti 4 e 5 o icone nella plancia):
  cerotto (+250), ombrello (dimezza i danni del prossimo tiro nemico che prende,
  anche se a più colpi; si vede sopra il mezzo), doppio tiro (secondo tiro subito
  dopo, stesso vento), vento fermo, teletrasporto (il tiro diventa una ghianda
  magica che non fa danni: si ricompare dove cade; in acqua va persa). Il computer
  sceglie a caso tra i primi quattro e li usa con le soglie di `IA_OGGETTI`.
- **Campagna** (tabella `CAMPAGNA` in `gioco.js`, progressi in `localStorage`
  `campagna`): 6 tappe contro gli agenti della Tari (`PERSONAGGI` retino, timbro,
  capo: disegni SVG, non si specchiano per via della scritta, animati come Gino;
  nella scheda si vede la testa). Tappe 3, 5 e 6 con Gino alleato al computer
  (squadra 0); più giocatori per parte a 120 px l'uno dall'altro; con più di due
  giocatori le schede sono piccole e impilate. La vita massima è per giocatore
  (`vitaMax`). Si vince se resta in piedi qualcuno della squadra di Tino.
  Livelli degli agenti 2, 3, 5, 4, 3, 6; nella tappa 5 i tre agenti hanno 550 di vita
  (con 1000 tirano troppo spesso e la tappa era quasi impossibile), l'ispettore capo
  1550. Tarata con Tino al computer (livello 6, mezzo a turno tra tutti): dopo la
  ritaratura dei mezzi vince ~72%, ~67%, ~72%, ~78%, ~50%, ~56% delle partite
  (18 partite per tappa, quindi ±15%; prima era ~58%, ~67%, ~60%, ~70%, ~59%, ~55%).
- **Espressioni**: Tino arrabbiato quando è colpito, con poca vita o quando il
  nemico è quasi KO; ferito sui colpi da 180 in su; ko quando perde. Gino trema
  quando è colpito, saltella quando colpisce, cade ruotato quando perde.
- **Provarlo su Claude**: come per l'avventura, in una cartella di appoggio
  `index.html` (senza doctype, html, head e body, percorsi `../../` tolti),
  `css/sito.css`, `stile.css`, `mezzi.js`, `terreno.js`, `suoni.js`, `gioco.js` (con
  `BASE = 'assets/'` e `tappaCampagna = Math.max(6, ...)` per sbloccare tutte le
  tappe), `fondali/` e `assets/tino/`, `assets/gino/`, `assets/agenti-tari/`; si pubblica
  con `files` e `root`. Le partite simulate (computer contro computer a vari
  livelli, con `stato.test = true`) si fanno girare con Playwright; i copioni
  non sono nel repository.
- **Stato**: le tre tappe sono fatte. Possibili seguiti, non ancora decisi: una
  musica di sottofondo, fondali di riserva disegnati nel codice per ogni
  ambientazione, altre tappe della campagna.
- **Prove automatiche**: `window.tinoBum` (`stato`, `iniziaPartita(modo,
  livello, { ambiente, cpu0, liv, liv0, mezzo0, mezzo1, oggetti0, oggetti1, seme, tipo })`
  (modo `cpu`, `due`, `campagna` con il numero della tappa, `demo`), `usaOggetto`, `aggiorna`,
  `simulaTiro`, `cercaTiro`, `pianificaIA`); con `stato.test = true` il gioco
  non avanza da solo e si possono simulare partite intere chiamando `aggiorna`.

### Gino Volante (`games/gino-volante/`)
Lancio a distanza a tempismo che diventa un volo a colpi d'ala (meccaniche da
classici del genere): Tino lancia Gino con un'altalena a bilico, Gino vola e poi
apre una foglia. File: `index.html`, `stile.css`, `gioco.js` (tutta la logica, su
canvas), `ghianda.svg` (premi e barra), `foglia.svg` (anteprima della home).
- **Decisioni prese**: titolo "Gino Volante"; Tino lancia Gino per gioco (niente
  agenti della Tari); altalena a bilico; la foglia dura finché non urta ma si
  sgualcisce (due urti); ambientazione che va dal prato al bosco fino al cielo;
  un solo comando per tutto (Spazio, Invio o ↑, clic, tocco). Si gioca anche con il
  telefono in verticale (si vede meno avanti e più cielo).
- **Mondo**: x verso destra (0 = perno dell'altalena), h verso l'alto (0 = terreno),
  20 px = 1 m. Schermo logico alto 540 (largo 760-1400 secondo lo schermo; in
  verticale largo 560 e alto fino a 1100). La telecamera segue Gino di lato e sale
  se lui va in alto.
- **Fase 1, il lancio** (tabelle `ALTALENA`, `TINO`, `LANCIO`): Tino saltella sul
  ceppo; il primo tocco lo fa saltare (più in alto se è in cima al saltello, e allora
  piomba con più forza). Il secondo tocco lo fa piombare dritto giù: sopra la punta
  dell'asse (x da -120 a -94) è "Perfetto!" (forza 0,8-1,05, angolo 40°); più verso
  il perno la forza cala e l'angolo sale fino a 66°; troppo presto manca l'asse
  (Tino ko, 0 m); se non preme atterra vicino al perno (lancio corto, ~35 m).
  Senza foglia un lancio va da ~35 a ~225 m (rimbalzi e scivolata compresi).
- **Fase 2, il volo libero** (tabella `VOLO`): parabola con un po' d'attrito; Gino
  ruota, si schiaccia ai rimbalzi, poi scivola sull'erba e saltella quando si ferma.
- **Fase 3, la foglia** (tabelle `FOGLIA`, `OSTACOLI`, `CORRENTE`): si apre una sola
  volta, prima di toccare terra. Lo slancio iniziale viene dalla velocità di Gino
  all'apertura e si consuma piano; aprendola in cima al volo (velocità verticale
  sotto 150) lo slancio è +30% ("Apertura perfetta!") e più in alto si parte, più a
  lungo si plana. Sopra il "tetto" (h 460) la foglia non sale più e plana; il primo
  ostacolo arriva solo dopo la planata. Ogni tocco dà una spinta verso l'alto, la
  gravità tira giù. Il primo urto strappa la foglia (1,3 s di invulnerabilità, colpi
  d'ala un po' più deboli), il secondo chiude il volo; toccare terra chiude il volo.
- **Ostacoli**: coppie sopra/sotto con un varco, sempre raggiungibile dal varco prima
  (salita chiesta al massimo 150 px/s, discesa 300). La difficoltà è nella tabella
  `CURVE` (curve a punti [metri, valore], lineari tra un punto e l'altro): fino a 700 m
  cresce in fretta, poi più piano fino ai 2000 m, dove si ferma. Varco 245 → 175 → 158
  px, distanza tra le coppie 560 → 360 → 310 px, velocità 240 → 340 → 380 px/s, ostacoli
  che si muovono su e giù dai 300 m (44 px a 740 m, 50 a 2000); radure con la corrente
  ogni 8 coppie all'inizio e ogni 12 a 2000 m, foglie nuove ogni 11 coppie all'inizio e
  ogni 18 a 2000 m. Tappe: prato
  (0 m: fiori alti e rami), bosco (250 m: tronchi tagliati e rami col muschio), cielo
  (600 m: nuvoloni temporaleschi); colori e sfondi sfumano da una tappa all'altra.
- **Aiuti e premi**: ghiande nei varchi e tra le coppie; ogni 8 coppie una radura con
  una corrente d'aria che spinge in alto (fin sotto il tetto) e una fila di ghiande;
  ogni 11 coppie una foglia nuova che ripara quella strappata (se è integra, +3
  ghiande).
- **Punteggio**: distanza totale in metri (lancio + foglia); `localStorage`
  `gino-volante:record`, `record-ghiande` (più ghiande in un volo), `ghiande-totali`,
  `lanci`, `muto`.
- **Espressioni**: Tino arrabbiato (concentrato) mentre salta e se il lancio è corto,
  normale e saltellante se il lancio è buono, ko se manca l'asse. Gino ruota in volo,
  si schiaccia ai rimbalzi, si inclina ai colpi d'ala, trema negli urti, saltella
  quando si ferma.
- **Difficoltà tarata** con voli simulati (giocatori simulati che mirano al varco
  con errore, ritardo e colpi persi, 30 voli ciascuno): bravo ~1800 m di media, medio
  ~1000 m, principiante ~600 m (da 120 a 1500 m). Per dimostrare che è sempre battibile
  c'è un giocatore che pianifica (prova le sequenze di colpi d'ala per 1,2 s avanti, con
  un piccolo margine, correnti d'aria comprese, e mira al centro del varco quando
  entrambe le mosse sono sicure): 16 voli su 16 fino a 3000 m senza strappi. Il
  copione semplice che mira solo al varco invece cade ogni tanto oltre i 1900 m. Le
  persone vere reagiscono peggio dei copioni, quindi si arriva meno lontano.
- **Disegni dipinti (facoltativi)**: `fondali/prato.png`, `fondali/bosco.png`,
  `fondali/cielo.png` (uno per tappa, 16:9, es. 1600 × 900) e `aliante.png`,
  `aliante-strappato.png` (la foglia-aliante vista di lato, sfondo trasparente, con il
  manubrio al centro del bordo inferiore: è il punto a cui si tiene Gino). Se un file
  manca resta la grafica disegnata nel codice. I fondali si disegnano alti 1,2 volte lo
  schermo, con il fondo 24 px sotto l'erba: la parte alta (~20%) si vede solo quando la
  telecamera sale, e sopra il disegno si riempie col colore della sua riga in alto. Si
  affiancano uno dritto e uno specchiato (così i bordi combaciano) e scorrono a 0,15
  della telecamera; tra le tappe sfumano. Prompt per Gemini: stile come i fondali di
  Tino Bum (cartone con contorni morbidi), sfondo lontano senza primo piano, orizzonte
  nel terzo basso, centro sgombro (lì passano ostacoli e Gino), cielo semplice in alto;
  per l'aliante sfondo magenta pieno da togliere poi (rendere trasparente, ritagliare,
  ottimizzare come gli altri PNG).
- **Prove automatiche**: `window.ginoVolante` (`stato`, `avvia(seme)`, `premi`,
  `aggiorna`, `centroOstacolo`, `urtaOstacolo`, tabelle); con `stato.test = true` il
  gioco non avanza da solo e non apre pannelli. I copioni non sono nel repository.
- **Provarlo su Claude**: come per gli altri giochi, in una cartella di appoggio
  `index.html` (senza doctype, html, head e body, percorsi `../../` tolti),
  `css/sito.css`, `stile.css`, `gioco.js` (con `ASSETS = 'assets/'`), `ghianda.svg`,
  `foglia.svg`, i disegni dipinti se ci sono e `assets/tino/`, `assets/gino/`; si
  pubblica con `files` e `root`.
- **Stato**: completo. Possibili seguiti, non ancora decisi: cappelli o foglie
  diverse da comprare con le ghiande, una musica di sottofondo, altre tappe oltre il
  cielo.

## Per il prossimo gioco
- Cartella `games/<nome-gioco>/` con `index.html`, `stile.css`, `gioco.js`;
  riusare `css/sito.css`, la barra in alto e i pannelli (menu, pausa, fine)
  di Botta e Ghianda come modello.
- Aggiungere la scheda nella home e una voce in questo file e nel README.
- Usare le espressioni di Tino e le animazioni di Gino come descritto sopra.
- Provare su computer e su telefono (orizzontale e verticale) e tarare la
  difficoltà con partite simulate prima di pubblicare.
