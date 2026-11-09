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
- **Sfondo**: `fondale.png` dipinto con Gemini (prato visto dall'alto, 16:9, erba
  verde brillante, cornice sottile di trifogli e fiorellini bianchi, gialli e lilla,
  un sentierino di terra a metà campo; ruota col campo in verticale, per questo è
  zenitale). Un primo fondale con radici, sassi e ghiande ai bordi aveva troppo poco
  contrasto con i personaggi e la ghianda. Ritagliato a 16:9 (1365 × 768), a colori
  pieni: a 256 colori i fiorellini perdevano il colore o l'erba veniva a chiazze.
  La ghianda ha un contorno chiaro per staccarsi dal prato. Se manca, resta il prato
  con fiorellini disegnato nel codice (`preparaPrato`). Sul sentierino una fila di
  formiche che scappano quando passa la ghianda.
- **Tino** non si specchia: la foto originale guarda già a destra, verso Gino.
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
canvas), `ghianda.svg` (premi e barra), `foglia.svg` (anteprima della home), disegni
dipinti in `fondali/`, `ostacoli/`, `aliante.png` e `aliante-strappato.png` (più
`foglie/` e `cappelli/` del negozio, quando arrivano da Gemini).
- **Decisioni prese**: titolo "Gino Volante"; Tino lancia Gino per gioco (niente
  agenti della Tari); altalena a bilico; la foglia dura finché non urta ma si
  sgualcisce (due urti); ambientazione che va dal prato al bosco fino al cielo;
  un solo comando per tutto (Spazio, Invio o ↑, clic, tocco). Si gioca anche con il
  telefono in verticale (si vede meno avanti e più cielo). Musica sintetizzata in
  loop; negozio di foglie (con poteri) e cappelli (solo da guardare); tunnel di nuvole
  nel cielo.
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
  I valori del volo vengono da `parametri()`, che applica il potere della foglia
  scelta (in `P`); gli urti si contano in `g.urti` (il volo finisce a `P.urti`).
- **Ostacoli**: coppie sopra/sotto con un varco, sempre raggiungibile dal varco prima
  (salita chiesta al massimo 150 px/s, discesa 300). La difficoltà è nella tabella
  `CURVE` (curve a punti [metri, valore], lineari tra un punto e l'altro): fino a 700 m
  cresce in fretta, poi più piano fino ai 2000 m e ancora più piano fino ai 4000 m, dove
  si ferma. Varco 245 → 175 → 158 → 150 (3000 m) → 145 px, distanza tra le coppie
  560 → 360 → 310 → 290 px, velocità 240 → 340 → 380 → 405 px/s, ostacoli che si
  muovono su e giù dai 300 m (44 px a 740 m, 50 a 2000, 56 a 4000); radure con la
  corrente ogni 8 coppie all'inizio, 12 a 2000 m, 14 a 4000 m; foglie nuove ogni 11
  coppie all'inizio, 18 a 2000 m, 20 a 4000 m. Tappe: prato
  (0 m: fiori alti e rami), bosco (250 m: tronchi tagliati e rami col muschio), cielo
  (600 m: nuvoloni temporaleschi); colori e sfondi sfumano da una tappa all'altra.
- **Tunnel di nuvole** (tabella `TUNNEL`, curve `tunnelOgni`, `tunnelLungo`,
  `tunnelVarco`, funzione `colonnaTunnel`): nel cielo dai 1100 m. Colonne di nuvole
  (`o.tunnel`, ferme) una dopo l'altra a 0,86 larghezze di ostacolo, senza spazio
  libero, con il varco che sale e scende come un corridoio: la pendenza cambia piano
  (`svolta`) e non supera 135 px/s in salita e 240 in discesa (Gino sale a più di 300 e
  scende a 620); vicino ai bordi si gira verso il centro. Un tunnel ogni 14 coppie
  normali a 1100 m, 11 a 2000, 8 a 3000, 6 a 4500; lungo 6 colonne a 1100 m, 9 a 2000,
  13 a 3000, 18 a 4500; varco 192 → 178 → 166 → 158 px. Una ghianda ogni due colonne nel
  corridoio; all'entrata il messaggio "Tunnel di nuvole!". Le nuvole di ogni ostacolo
  si calcolano una volta (`nuvoleRel`, relative al centro del varco).
- **Musica** (tabelle `MUSICA` e `BRANO`, funzioni `passoMusica`, `aggiornaMusica`):
  tutta Web Audio, nessun file. 8 battute in Do (Do, Fa, Sol, Do, La minore, Fa, Sol,
  Sol7) in sedicesimi: basso saltellante (triangolo più un filo di onda quadra), "pop"
  elettronici (sinusoide che cade di tono in 25 ms) sui controtempi, melodia a onda
  quadra dietro un filtro passa-basso. Tre livelli: menu (100 bpm, solo un colpetto di
  cassa), lancio e volo libero (108 bpm, cassa e charleston), volo con la foglia (124
  bpm, rullante, charleston fitto, più pop, filtro più aperto). Un timer ogni 50 ms
  programma le note 0,2 s avanti. Tace (volume a zero) in pausa, con la scheda nascosta,
  con i suoni spenti (M) o con la sola musica spenta (pulsante con la nota nella barra
  o tasto N, `localStorage` `musica-spenta`); parte solo dopo il primo gesto.
- **Negozio** (tabelle `FOGLIE` e `CAPPELLI` in cima a `gioco.js`, pannello
  `pannelloNegozio`, dal menu e dalla fine del volo): due schede, foglie e cappelli. Si
  compra con le ghiande raccolte (`ghiande-totali`, che ora sono spendibili); i pezzi
  con `traguardo` si sbloccano quando il record arriva a quei metri (a fine volo
  compare "Sbloccato: …"). Scelte e acquisti in `localStorage` `foglia`, `cappello`,
  `foglie`, `cappelli`. In cima al negozio Gino con la foglia e il cappello scelti.
  - Foglie (potere = moltiplicatori su `FOGLIA`): quercia (gratis, equilibrata), acero
    150 (gravità ×0,92, colpo ×0,88: plana più a lungo), castagno 300 (colpo ×1,08,
    gravità ×1,12), ginkgo 450 (attira le ghiande entro 110 px, slancio ×0,6), pioppo
    650 (slancio ×1,5 che dura ×1,5, da strappata colpo ×0,85), fico 900 (3 urti,
    colpo ×0,91, gravità ×1,18, protezione 0,6 s), felce a 1500 m (protezione 1,9 s,
    gravità ×1,07), foglia d'oro a 2500 m (ghiande ×2, colpo ×0,94). La planata sopra
    il tetto segue la gravità. Con il fico la foglia nuova toglie un urto alla volta.
  - Cappelli (solo da guardare): nessuno, aviatore 100, elica 200, paglia 350, bombetta
    500, mago 750, esploratore a 1000 m (è `assets/tino/accessori/cappello.svg`, quello
    di Tino), corona di ghiande a 2000 m, casco con le alette a 3000 m. Si appoggiano
    alla foto di Gino con la `posa` (centro del bordo basso, larghezza e rotazione in
    pixel della foto 381 × 470), come gli accessori di Tino nell'avventura; seguono
    rotazione e schiacciamento di Gino.
  - Grafica: disegni nel codice (`fogliaCodice`, `cappelloCodice`,
    disegnati una volta su una tela a parte). Quando ci sono, il gioco usa i PNG
    dipinti `foglie/<id>.png`, `foglie/<id>-strappata.png` (la quercia è l'aliante) e
    `cappelli/<id>.png` (bordo basso del cappello in fondo, al centro); i prompt per
    Gemini seguono lo stile dell'aliante (sfondo magenta, manubrio al centro del bordo
    basso), e si preparano come l'aliante.
- **Aiuti e premi**: ghiande nei varchi e tra le coppie; ogni 8 coppie una radura con
  una corrente d'aria che spinge in alto (fin sotto il tetto) e una fila di ghiande;
  ogni 11 coppie una foglia nuova che ripara quella strappata (se è integra, +3
  ghiande).
- **Punteggio**: distanza totale in metri (lancio + foglia); `localStorage`
  `gino-volante:record`, `record-ghiande` (più ghiande in un volo), `ghiande-totali`
  (da spendere nel negozio), `lanci`, `muto`, `musica-spenta`, `foglia`, `cappello`,
  `foglie`, `cappelli`.
- **Espressioni**: Tino arrabbiato (concentrato) mentre salta e se il lancio è corto,
  normale e saltellante se il lancio è buono, ko se manca l'asse. Gino ruota in volo,
  si schiaccia ai rimbalzi, si inclina ai colpi d'ala, trema negli urti, saltella
  quando si ferma.
- **Difficoltà tarata** con voli simulati (giocatori simulati che mirano al varco
  con errore, ritardo e colpi persi, 30 voli ciascuno): con gli ostacoli dipinti bravo
  ~2250 m di media, medio ~1350 m, principiante ~580 m (prima, con i rettangoli, ~1800,
  ~1000, ~600). Per dimostrare che è sempre battibile
  c'è un giocatore che pianifica (prova le sequenze di colpi d'ala per 1,2 s avanti, con
  un piccolo margine, correnti d'aria comprese, e mira al centro del varco quando
  entrambe le mosse sono sicure): 16 voli su 16 fino a 3000 m senza strappi. Il
  copione semplice che mira solo al varco invece cade ogni tanto oltre i 1900 m. Le
  persone vere reagiscono peggio dei copioni, quindi si arriva meno lontano.
  Con i tunnel e le curve oltre i 2000 m (copioni riscritti, che sul gioco di prima
  davano ~540, ~1370, ~2420 m): principiante ~540 m, medio ~1350 m, bravo ~2035 m; il
  pianificatore arriva ancora a 3000 m in 16 voli su 16 senza strappi (7 tunnel per
  volo) e anche fino a 4500 m (13 tunnel, fino a 17 colonne).
  Con le foglie del negozio (principiante / medio / bravo, 30 voli; ±10-15% di rumore):
  quercia 540 / 1350 / 2035, acero 510 / 1545 / 2115, castagno 470 / 1310 / 2150,
  ginkgo 515 / 1210 / 1930 (ma ~40% di ghiande in più), pioppo 510 / 1280 / 2285, fico
  420 / 1125 / 2325 (più pesante: aiuta chi è bravo, l'urto in più conta per chi sbaglia
  poco), felce 490 / 1400 / 2170, oro 440 / 1405 / 2200 (ghiande doppie). Prima della
  ritaratura acero e felce davano +15-20% e il fico +47% al bravo. Il pianificatore
  arriva a 3000 m senza strappi con ogni foglia (16 voli su 16 per foglia, tunnel
  compresi).
- **Disegni dipinti** (fatti con Gemini, ci sono già; se un file mancasse resterebbe
  la grafica disegnata nel codice): `fondali/prato.png`, `fondali/bosco.png`,
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
  Gemini li ha dati in WebP da 1024 px: prato e cielo avevano ai lati una striscia
  ripetuta (tagliata: x 82-940 e 130-893), il bosco una fascia di cielo piatto con una
  riga dura in cima (tagliata: da y 108); palette a 256 colori. Aliante: magenta tolto
  calcolando la trasparenza da quanto è magenta il pixel (e ripulendo i bordi),
  ritagliato, allargato perché il manubrio stia al centro, 512 px di larghezza; in
  gioco è largo 150 px.
- **Ostacoli dipinti** (Gemini, sfondo magenta tolto come per l'aliante), in
  `ostacoli/`: `girasole.png` + `ramo.png` (prato), `tronco.png` + `muschio.png`
  (bosco), `nuvola.png`, `nuvola2.png` (più chiara) e `nuvola3.png` (scura, col fulmine)
  per il cielo, mescolate nei mucchi.
  Tabella `SPRITE` in `gioco.js`: per ogni disegno la parte bella (in cima per girasole
  e tronco, in fondo per ramo e muschio) si disegna intera e sotto (o sopra) si ripete
  una striscia di fusto (`strisciaFusto`: una riga presa a metà della parte liscia,
  copiata 64 volte su una tela a parte) fino a terra o in cima allo schermo, così
  l'ostacolo è alto quanto serve. Stirare una riga sola presa al confine della parte
  bella la faceva venire mezza trasparente sui telefoni (schermi densi). Gli urti
  seguono la sagoma: 14 fasce ricavate dai pixel non trasparenti della parte bella più
  il fusto (`sagoma`). Il cielo non ha colonne: ogni ostacolo è un mucchio di nuvole
  sciolte (tabella `NUVOLE`), sfalsate a destra e a sinistra e di misure diverse, dal
  varco fino alle chiome e dal varco fino in cima; ogni nuvola è un'ellisse per gli urti
  e sono abbastanza vicine da non lasciare buchi. Se i disegni mancano, ostacoli
  disegnati nel codice con urti a rettangolo (`formaOstacolo`). Con le sagome il
  pianificatore arriva ancora sempre a 3000 m (16 su 16, senza strappi); i fusti sottili
  perdonano un po' di più: bravo ~2250 m, medio ~1350 m, principiante ~580 m.
- **Prove automatiche**: `window.ginoVolante` (`stato`, `avvia(seme)`, `premi`,
  `aggiorna`, `centroOstacolo`, `urtaOstacolo`, `parametri()` (i valori del volo con
  la foglia scelta), `provaFoglia(id)` e `provaCappello(id)` (scelgono senza comprare),
  `regalaGhiande(n)`, `compra`, `posseduto`, `musica`, tabelle); con `stato.test = true`
  il gioco non avanza da solo, non apre pannelli e non suona. I copioni non sono nel
  repository: il pianificatore decide ogni 4 fotogrammi (dt 1/120) se battere,
  simulando 1,2 s avanti in profondità (memo su passi, quota e velocità arrotondate)
  con la fisica di `voloFoglia` e i valori di `parametri()`, con margine (terra a
  raggio + 8, urti provati anche a ±5 px); i giocatori semplici guardano lo stato con
  un ritardo, mirano al centro del varco con un errore che cambia a ogni ostacolo,
  battono solo se scendono e saltano qualche colpo (principiante ritardo 0,15 s, errore
  16 px, 4% persi; medio 0,12 s, 12 px, 2%; bravo 0,1 s, 7,5 px, 0,9%).
- **Provarlo su Claude**: come per gli altri giochi, in una cartella di appoggio
  `index.html` (senza doctype, html, head e body, percorsi `../../` tolti),
  `css/sito.css`, `stile.css`, `gioco.js` (con `ASSETS = 'assets/'`), `ghianda.svg`,
  `foglia.svg`, i disegni dipinti (`fondali/`, `ostacoli/`, `aliante*.png`, e
  `foglie/`, `cappelli/` quando ci sono) e `assets/tino/` (con `accessori/cappello.svg`,
  il cappello da esploratore), `assets/gino/`; si pubblica con `files` e `root`. Per
  provare il negozio, nella copia di `gioco.js` si parte con 5000 ghiande
  (`leggi('ghiande-totali', 5000)`) e i traguardi sono aperti (`if (x.traguardo)
  return true;` in `posseduto`).
- **Stato**: completo, con grafica dipinta (fondali, aliante, ostacoli), musica,
  negozio e tunnel di nuvole. Foglie e cappelli del negozio restano disegnati nel
  codice (decisione presa: vanno bene così; i PNG dipinti sarebbero comunque usati se
  aggiunti). Possibili seguiti, non ancora decisi: fondali più grandi (quelli di Gemini sono da
  1024 px, un po' sfocati sul telefono in verticale), altre tappe oltre il cielo.

### Ghiande e Mattoncini (`games/ghiande-e-mattoncini/`)
Gioco a mattoncini (meccaniche da classico del genere): con un'asse si fa
rimbalzare una ghianda contro un muro di mattoncini piccoli; quando sono tutti
rotti si passa al livello dopo. File: `index.html`, `stile.css`, `livelli.js`
(mondi e mappe), `gioco.js` (tutta la logica, su canvas), `ghianda.svg` (vite e
anteprima della home). I fondali sono quelli di Tino Bum (`../tino-bum/fondali/`).
- **Decisioni prese**: titolo "Ghiande e Mattoncini"; si sceglie nel menu se giocare
  con Tino (asse di legno) o Gino (foglia di quercia): stesse regole, cambia solo
  l'aspetto e il suono del rimbalzo (scelta in `localStorage` `personaggio`); il
  personaggio regge l'asse da sotto. Tarato su adulti: la ghianda è veloce e diventa
  più veloce a ogni livello. Sul telefono si gioca in verticale (in orizzontale
  compare l'invito a girarlo); il campo si allunga fino a 980 se lo schermo è lungo.
- **Campo**: logico 604 × 820 (verticale), muri di 14 px, 16 colonne di mattoncini da
  36 × 18 da y = 58; l'asse ha la cima a `H - 104` (716) ed è spessa 14; ghianda di
  raggio 7. Il rimbalzo sull'asse dipende solo da dove la colpisce (fino a 62° dalla
  verticale); la direzione non scende mai sotto il 30% di componente verticale.
  Movimento a passi di 4 px; negli spigoli tra due mattoncini vicini il rimbalzo è
  dritto. Se per 15 s non si rompe niente, l'angolo si corregge un poco (giri chiusi).
- **Controlli**: mouse (l'asse segue il puntatore), ← → o A D; clic, Spazio, ↑ o Invio
  lanciano la ghianda. Al primo clic nel campo il mouse si aggancia al gioco (Pointer
  Lock, `aggancia`/`sgancia`): l'asse segue gli spostamenti (`movementX`, scartati i
  salti oltre 250 px) anche se il puntatore uscirebbe dalla finestra. Prima, con l'asse
  in fondo allo schermo, il puntatore usciva facilmente e l'asse si fermava. Esc lo
  libera e mette in pausa; i pannelli lo liberano, riprendere lo riaggancia. Sul telefono il dito sposta l'asse di quanto si sposta (×1,25,
  così si tocca dove si vuole), un tocco breve lancia. P o Esc pausa, M suoni, N musica.
- **Livelli** (`livelli.js`, legenda in cima): `a`-`f` colorati (il colore dipende dal
  mondo), `2` `3` resistenti, `#` indistruttibili, `*` petardo (fa saltare gli otto
  vicini, a catena), `?` sorpresa (lascia sempre un potenziamento). 4 mondi da 5
  livelli (4 normali e il boss), ognuno con colori, cornice e disegnino dei mattoncini
  propri: il prato (fiorellini; 1 Il prato fiorito, 2 Il girasole, 3 Le aiuole, 4 I
  petardi della sagra, 5 La ronda dell'agente), la spiaggia (sabbia; 6 Il castello di
  sabbia, 7 Le onde, 8 Il faro, 9 La barriera corallina, 10 L'agente del timbro), il
  bosco d'autunno (venature; 11 La grande quercia, 12 I funghi, 13 Il sentiero
  nascosto, 14 La tana del tasso, 15 La squadra della Tari), gli uffici della Tari
  (faldoni e casseforti; 16 Lo sportello, 17 Le pile di bollette, 18 L'archivio, 19
  L'ufficio del capo, con la scritta TARI in mattoncini da tre colpi, 20 Il capo della
  Tari).
- **Boss** (tabelle `BOSS`, `COPPIA`, `ARRABBIATO`, `BOLLETTE` in cima a `gioco.js`;
  campo `boss` del livello): gli scagnozzi alla fine dei primi tre mondi, l'ispettore
  capo alla fine del quarto. Sono i disegni di `assets/agenti-tari/` (non si specchiano),
  camminano avanti e indietro sopra le prime 8 righe (lasciate vuote nella mappa), con
  sotto due righe di mattoncini che li riparano; la ghianda rimbalza sul loro corpo e
  toglie un colpo (2 con la ghianda di fuoco, un terzo coi semini della fionda; dopo un
  colpo 0,25 s di pausa). Si vince quando sono tutti KO (cadono all'indietro), anche se
  restano mattoncini; bonus 2000 per mondo. Barre della vita in alto a destra. Sotto
  metà vita si arrabbiano (sbuffi, barra rossa): velocità ×1,35, attacchi più spessi.
  - Agente col retino (mondo 1, 12 colpi): ogni 6 s alza la rete per 1,6 s (cerchio
    giallo e "!"); se la ghianda la tocca, la tiene 0,45 s e la ributta giù più forte
    verso la parte del campo lontana dall'asse.
  - Agente col timbro (mondo 2, 14 colpi): ogni 3,4 s lancia una bolletta verso l'asse,
    ogni 9 s timbra 3 mattoncini nuovi (bollette "TARI", un colpo) nei buchi delle due
    righe sotto di lui, vicino a dove si trova.
  - La squadra (mondo 3): retino e timbro insieme, uno per metà campo, col 60% della vita.
  - Ispettore capo (mondo 4, 20 colpi, più grande): ogni 5,2 s due bollette a ventaglio
    col megafono (tre da arrabbiato), ogni 10 s timbra 4 mattoncini.
  - Bollette: cadono a 230 px/s ondeggiando; se prendono l'asse la bloccano per 0,7 s
    (stelline, Tino ferito, Gino trema). Si schivano o si colpiscono coi semini.
- **Difficoltà** (tabelle `PALLA`, `ASSE`, `CADUTA` in cima a `gioco.js`, livello da 0):
  il grado va da 0 al primo livello a 15 all'ultimo (`grado()`, boss compresi);
  velocità al lancio 430 → 625, massima 650 → 940 (cresce dell'1,2% a ogni rimbalzo
  sull'asse e dello 0,4% a ogni mattoncino), asse larga 108 → 80, potenziamenti dal
  13% al 10% dei mattoncini.
- **Potenziamenti** (tabella `POTERI`, con peso e durata): asse lunga (×1,45, 20 s),
  tre ghiande, miele (la ghianda si attacca all'asse e parte da sola dopo 2,5 s, 18
  s), ghianda di fuoco (passa tra i mattoncini rompibili, 8 s), fionda (semini dalle
  estremità dell'asse ogni 0,42 s, 10 s), lumaca (velocità ×0,72, 12 s), siepe (in
  fondo, salva una volta), ghianda d'oro (+1 vita, rara); dispetti: asse corta (×0,65,
  14 s) e vespa (velocità ×1,22, 12 s). Le icone dei poteri attivi stanno in alto
  a sinistra con l'anello del tempo; nel menu c'è la legenda.
- **Punti e vite**: 3 vite (massimo 6), una in più ogni 20000 punti. Mattoncino 50
  (resistenti 50 per colpo da dare, petardo 80, sorpresa 60) più il 10% per ogni
  mattoncino della stessa volata (fino a +100%), 10 per i colpi che non rompono, 100
  per un potenziamento buono; a fine livello bonus del livello (500 per mondo + 100 per
  livello) e del tempo (10 per ogni secondo sotto i 150). `localStorage`: `record`,
  `sbloccati` (si può ripartire da ogni livello raggiunto, con i punti da zero),
  `personaggio`, `muto`, `musica-spenta`.
- **Suoni** (tutti Web Audio, con un compressore, come negli altri giochi): nota che
  sale sulla pentatonica di Re minore a ogni mattoncino della stessa volata,
  "tock" dei resistenti, "clank" degli indistruttibili, rimbalzo di legno (Tino) o di
  foglia (Gino), petardo, arpeggi per i potenziamenti (che scendono per i dispetti),
  fionda, siepe, vita persa, vittoria, sconfitta. **Musica** (tabelle `MUSICA` e
  `BRANO`, come in Gino Volante): 8 battute in Re minore (Rem, Sib, Fa, Do, Rem, Sib,
  Do, La7), menu a 96 bpm e partita a 116; con 6 mattoncini o meno il filtro si apre e
  il charleston si fa fitto. Tace in pausa e con la scheda nascosta.
- **Espressioni**: Tino concentrato (arrabbiato) con l'ultima vita, quando restano 3
  mattoncini o meno e quando prende un dispetto; ferito quando perde una vita; ko a
  fine partita; saltella a fine livello e coi potenziamenti. Gino trema quando perde
  una vita o prende un dispetto, saltella quando prende un potenziamento e a fine
  livello, cade ruotato a fine partita. Il personaggio segue l'asse con un po' di
  ritardo, si inclina quando corre e si schiaccia a ogni rimbalzo.
- **Partita dimostrativa**: nel menu il computer gioca i primi livelli sbloccati
  (giocatore simulato `pilotaIA`, che prevede dove arriva la ghianda, mira a un
  mattoncino rompibile con `sceltaMira` e schiva le bollette che arrivano prima della
  ghianda con `schivaBollette`).
- **Difficoltà tarata** con partite simulate (vite infinite, 8 partite per livello e per
  giocatore; giocatori con ritardo, errore che cresce con la velocità e l'angolo della
  ghianda, velocità dell'asse e mira: principiante 0,22 s / 16 px / 1300 px/s / mira 30%,
  medio 0,16 / 12 / 1800 / 60%, bravo 0,11 / 8 / 2600 / 85%). Vite perse per livello
  con i boss (principiante / medio / bravo): mondo 1 da 0,1 / 0,1 / 0 a 0,9 / 0,5 / 0
  (boss 0,6 / 0,1 / 0,1); mondo 2 da 0,6 / 0,1 / 0 a 3,5 / 1,3 / 0,5 (boss 2,3 / 0,8 /
  0,8); mondo 3 da 0,9 / 1,1 / 0,3 a 4,9 / 2,9 / 0,8 (il sentiero nascosto, col varco nel
  muro; boss 2,9 / 0,6 / 1,1); mondo 4 da 2,5 / 1 / 0,5 a 5,9 / 4,6 / 1,9 (l'archivio e
  l'ufficio del capo); il capo è il più duro: 7,6 / 5,5 / 2,8 vite e 13-16 storditure
  (prima della ritaratura, con 30 colpi, ventaglio da 3 ogni 3,8 s e 0,9 s di blocco,
  il bravo ne perdeva 11). Il bravo perde ~15 vite in tutto il gioco e ne guadagna
  ~12 coi punti; il medio arriva al mondo 3 e poi riparte dal livello raggiunto.
  Un livello dura 1,5-5 minuti (boss 1,5-4), 7000-30000 punti.
- **Prove automatiche**: `window.ghiandeEMattoncini` (`stato`, `iniziaPartita(n)`,
  `caricaLivello`, `aggiorna`, `azione`, `prendi(id)`, `nuovaCapsula`, tabelle); con
  `stato.test = true` il gioco non avanza da solo, non suona, non apre pannelli e non va
  in pausa (`stato.statistiche.storditi` conta le bollette prese), e con `stato.iaGioca = true` (e `stato.parametriIA`) l'asse la guida il
  giocatore simulato; a livello finito `stato.fase` diventa `superato`. I copioni non
  sono nel repository: per ogni livello `iniziaPartita(n)`, `stato.vite = 999`, poi
  `aggiorna(1 / 120)` fino a `superato` (o 600 s), contando le vite perse.
- **Provarlo su Claude**: come per gli altri giochi, in una cartella di appoggio
  `index.html` (senza doctype, html, head e body, percorsi `../../` tolti),
  `css/sito.css`, `stile.css`, `livelli.js`, `gioco.js` (con `ASSETS = 'assets/'`,
  `FONDALI = 'fondali/'` e `leggi('sbloccati', 20)` per aprire tutti i livelli),
  `ghianda.svg`, `fondali/` (da Tino Bum), `assets/tino/`, `assets/gino/` e
  `assets/agenti-tari/`; si pubblica
  con `files` e `root`.
- **Stato**: giocabile (4 mondi, 20 livelli con 4 boss, 10 potenziamenti, musica).
  Possibili seguiti, non ancora decisi: mattoncini che si muovono o che ricrescono,
  classifica dei punti, differenze di gioco tra Tino e Gino.

### Sparabolle (`games/sparabolle/`)
Gioco a bolle (meccaniche da classico del genere): Tino spara bolle verso l'alto con
una canna di bambù, Gino gli tiene la bolla dopo. Tre o più bolle uguali che si
toccano scoppiano; quelle rimaste staccate dal ramo cadono. File: `index.html`,
`stile.css`, `livelli.js` (mondi e mappe), `gioco.js` (tutta la logica, su canvas). I
fondali sono quelli di Tino Bum (`../tino-bum/fondali/`: prato, spiaggia, autunno, uffici).
- **Decisioni prese**: titolo "Sparabolle"; dentro le bolle ghiande, bacche e fiori
  (sei tipi: ghianda, fragolina, mirtillo, fiore giallo, violetta, uva spina, ognuno
  con un colore e un disegno, così si distinguono anche senza i colori); modalità
  avventura, infinito e due giocatori a campi affiancati; un boss a fine mondo. Piano in
  tre tappe: 1 motore e primi livelli (fatta), 2 bolle speciali, mondi e boss (fatta), 3
  rifinitura, suoni e taratura. Sul telefono si gioca in verticale, in due in
  orizzontale (altrimenti compare l'invito a girarlo e il gioco va in pausa).
- **Campo**: logico 480 × 780 per giocatore (in due 1000 × 780, con 40 px tra i campi);
  muri di 20 px, bolle di raggio 20 su una griglia a nido d'ape di 11 colonne (righe
  "spostate" da 10, che dipendono da `fase`: quando arriva una riga dall'alto la fase si
  inverte). Il ramo parte a y = 58, la linea dei fiori è dopo 13 righe; perno della
  canna a y = 640. Le mappe hanno al massimo 8-9 righe: con 9 righe nei mondi difficili
  bastavano 2-3 discese per perdere (accorciate a 8).
- **Tiro** (tabella `TIRO`): 1300 px/s a passi di 5 px (la stessa funzione `passo` serve
  al tiro, alla linea di mira e al computer, quindi danno lo stesso risultato); la bolla
  si ferma sul ramo, a meno di 0,8 diametri da un'altra (si ricorda quale ha toccato, per
  la jolly) o contro un agente, e si attacca alla casella libera più vicina attaccata a
  qualcosa (`trovaCella`). La bolla in canna e quella dopo sono sempre di un tipo ancora
  in campo (`controllaColori`; jolly e miele restano).
- **Controlli**: mouse (la canna segue il puntatore, clic tira, clic sulla bolla di Gino
  scambia), ← → (o A D) e Spazio / ↑, ↓ scambia; sul telefono si trascina il dito e si
  tira alzandolo (sotto la canna il tiro si annulla), toccando la bolla di Gino si
  scambia. In due: Tino A D, W, S; Gino ← →, ↑ (o Invio), ↓; sul telefono un dito per
  campo. P o Esc pausa, M suoni, N musica.
- **Avventura** (`livelli.js`, legenda in cima: righe a caratteri, spazi ignorati;
  `calo`, `guida`, `par`, `robivecchio`, `novita`, `bollette`, `boss`): il ramo scende
  di una riga ogni `calo` tiri a vuoto (che non fanno scoppiare, cadere, scongelare o
  aprire niente; si sommano per tutto il livello); le ghiandine in cima contano i tiri
  che mancano e il ramo trema all'ultimo. Si perde se una bolla supera la linea dei
  fiori. Si vince quando non restano bolle colorate né arcobaleni (`daPulire`): sassi,
  bollette e speciali rimaste cadono da sole; nei livelli con il boss si vince quando
  gli agenti sono tutti KO. Stelle: 3 con al massimo `par` tiri, 2 con `par` × 1,35; 100
  punti per ogni tiro sotto il par. `guida`: Infinity = fino all'arrivo con la bolla
  fantasma, un numero = lunghezza in px, `'sponda'` = fino al primo rimbalzo (senza
  rimbalzi fino all'arrivo, ma senza bolla fantasma). Dopo 3 sconfitte nello stesso
  livello si può riprovare con l'aiuto (tabella `AIUTO`: il ramo scende dopo 3 tiri in
  più, guida intera, agenti con 3/4 della vita che attaccano 1,5 volte più di rado).
  Prima di un livello con una novità mai vista c'è il pannello che la presenta
  (`NOVITA`, viste in `localStorage` `novita`). `localStorage` `sparabolle:sbloccati`,
  `stelle`, `robivecchi`, `novita`.
- **Bolle speciali** (lettere in `livelli.js`; in griglia ogni casella è `{ t, s, gelo,
  chiuso, nuova }`, t = -1 per le speciali senza colore; le caselle non si modificano
  mai, si sostituiscono). Le regole stanno tutte in `risolvi(c, r, k, t, tocca)`, che
  cambia solo `c.righe` (niente effetti): il gioco la usa e poi mostra gli effetti
  (`mostraRisultato`), il computer la prova su una copia delle righe (`valuta`).
  - `p` ghianda petardo (bolla scura con la miccia): scatta se il tiro si attacca
    accanto o se scoppia una bolla vicina; colpisce le sei vicine, a catena.
  - `a` arcobaleno: prende il tipo del tiro che si attacca accanto.
  - `z` fulmine: scatta come il petardo e colpisce tutta la sua riga.
  - `1`-`6` gelate (ghianda … uva spina): il primo scoppio del loro gruppo, o
    un'esplosione, le scongela soltanto; se restano staccate cadono lo stesso.
  - `o` sasso: non scoppia, cade se staccato; le esplosioni lo rompono.
  - `k` chiave e `G R M F V U` col lucchetto: le chiuse non fanno gruppo; una chiave
    toccata (o caduta, o esplosa) apre tutti i lucchetti; un'esplosione apre solo quello
    che colpisce.
  - `t` bolletta della Tari: grigia, non scoppia; ogni `bollette` tiri ne spunta un'altra
    accanto a una a caso (mai a meno di 2 righe dai fiori; numero dei tiri che mancano in
    alto a sinistra). Le bollette appese direttamente al ramo non si possono più far
    cadere e si moltiplicano per sempre: nelle mappe stanno dalla riga 2 in giù.
  - `$` robivecchio (oggetto del campo `robivecchio`, disegni di
    `assets/oggetti/robivecchi/`, 20 su 21: la carta di credito scaduta non c'è): bolla
    di vetro; si prende facendola cadere o con un'esplosione (+250); se a fine livello è
    ancora appeso vola via. Uno per livello normale; collezione nel menu.
  - Esplosioni (tabella `ESPLOSIONE`): il petardo prende anche un agente entro 62 px, il
    fulmine gli agenti sulla sua riga.
- **Potenziamenti** (tabella `POTERI`, al massimo uno per tiro, nell'ordine): bomba di
  miele (9 bolle cadute in un tiro: la bolla dopo è un vasetto di miele che si porta via
  tutto entro 86 px, sassi e gelate comprese), soffio di Gino (3 tiri di fila che fanno
  cadere: il ramo sale di una riga, o se non è mai sceso riparte il conto dei tiri; in
  infinito e in due la riga nuova arriva più tardi), bolla jolly (gruppo di 9: la bolla
  dopo è un arcobaleno, `ARC`), mira lunga (tiro di sponda che fa cadere 3 bolle: 5 tiri
  con la guida intera, la scritta sotto la canna li conta). Jolly e miele prendono il
  posto della bolla dopo (se è già speciale, vanno in coda, `c.coda`). Con soglie più
  basse (gruppo di 6, 8 cadute) il computer ne prendeva 3-5 per livello; ora ~1-2 jolly,
  ~0,5 miele, ~0,5 mira, ~0,2 soffi per livello.
- **Boss** (tabelle `BOSS` e `ARRABBIATO`, campo `boss` del livello): gli agenti della
  Tari (`assets/agenti-tari/`, non si specchiano) camminano avanti e indietro (con soste)
  in un corridoio di due righe vuote (righe 2 e 3, `riga: 2.5`) tra il soffitto di bolle e
  un muro di tre righe, tenuto su da tre pilastri; si disegnano dietro le bolle. Il tiro
  li colpisce se ci arriva (`passo` ne controlla la sagoma, raggio `r`): bisogna aprire un
  varco nel muro, o tagliare i pilastri. Sotto metà vita si arrabbiano (sbuffi, barra
  rossa): velocità ×1,35, attacchi più fitti. Le barre della vita sono in cima; KO:
  cadono all'indietro e cadono tutte le bolle (+1000 a testa; +150 per colpo).
  - Agente col retino (prato, 6 colpi): ogni 5,5 s alza la rete per 1,7 s (prima si
    illumina di giallo, poi "!"): il tiro che la prende va perso (vale come tiro a vuoto).
  - Agente col timbro (spiaggia, 7 colpi): ogni 4 tiri timbra 3 bolle nuove nei buchi
    vicino a sé (righe del corridoio e quella sotto).
  - La squadra (bosco): retino a sinistra e timbro a destra, ognuno nella sua metà, con
    il 65% della vita.
  - Ispettore capo (uffici, 9 colpi, più grande): ogni 7 s lancia una bolletta che cade
    dritta ondeggiando; se tocca una bolla ci si attacca come bolletta grigia, se trova la
    strada libera arriva a Tino (multa: due tiri a vuoto, Tino ferito). Un tiro che la
    incontra la para (+50). Con la tabella di prima (bollette ogni 4,2 s e 2 bollette
    timbrate ogni 5 tiri) il bravo vinceva il 25% e il medio mai.
- **Mondi e livelli** (tabella `SB_MONDI`: nome, fondale, velo, legno, foglie, colore del
  terreno in fondo e della barra): 4 mondi da 6 livelli, l'ultimo col boss.
  1. *Il prato* (guida intera): 1 "Il primo raccolto" (robivecchio), 2 "La siepe di
     fragole", 3 "Il girotondo" (petardo), 4 "Le violette", 5 "Il cesto del contadino",
     6 "La ronda dell'agente" (retino). 3-5 tipi, `calo` 8, 7, 6, 6, 6, 7.
  2. *La spiaggia* (guida fino alla sponda): 7 "Il castello di sabbia" (arcobaleno), 8
     "Le onde", 9 "Il faro" (fulmine), 10 "La barriera corallina", 11 "Il molo", 12
     "L'agente del timbro". 5 tipi, `calo` 6, 6, 6, 5, 5, 6.
  3. *Il bosco in autunno*: 13 "La grande quercia" (gelate), 14 "I funghi", 15 "Il
     sentiero dei sassi" (sassi), 16 "La tana del tasso", 17 "Le lucciole", 18 "La squadra
     della Tari". 5-6 tipi, guida fino alla sponda (13-15) e poi di 420 px, `calo` 6, 6, 5,
     6, 6, 6.
  4. *Gli uffici della Tari* (guida di 340 px, 6 tipi): 19 "Lo sportello" (chiavi e
     lucchetti), 20 "Le pile di pratiche", 21 "L'archivio" (bollette, ogni 7 tiri), 22 "Il
     timbro rosso" (bollette ogni 8), 23 "L'ufficio del capo" (tutto, bollette ogni 7), 24
     "Il capo della Tari". `calo` 5, 6, 7, 6, 6, 6.
  Fine del gioco: pannello con il capo KO ("ghiande, bacche e fiori sono di nuovo liberi").
- **Infinito** (tabella `INFINITO`): 5 righe all'inizio, poi una riga nuova dall'alto ogni
  12 s, che scende di 0,18 s per riga fino a 4,5 s (barra in cima, le bolle tremano negli
  ultimi 2 s); 4 tipi, 5 dalla 10ª riga, 6 dalla 26ª. Campo ripulito: +1000 e 5 righe
  nuove. Record in `record-infinito`. Niente bolle speciali, ma i potenziamenti sì.
- **Due giocatori** (tabella `DUE`): stesse 6 righe all'inizio per tutti e due, 5 tipi,
  una riga ogni 15 s (fino a 6 s). Le bolle in più di un tiro (cadute + scoppiate oltre
  le prime 3) diventano attacchi: prima parano quelli in arrivo, poi vanno all'altro
  (ghiandine rosse in cima); ogni 7 attacchi è una riga nuova, che arriva dopo il primo
  tiro a vuoto. Ripulire il campo manda 2 righe all'altro e ne fa arrivare 5 a sé (prima
  vinceva subito chi ripuliva e le partite duravano 10 s). Vince chi resta in piedi;
  vittorie della sessione nella barra. Anche qui ci sono i potenziamenti.
- **Punti** (tabella `PUNTI`): 10 per bolla che scoppia (anche nelle esplosioni), 20 per
  bolla che cade × la catena (tiri di fila che fanno cadere), 50 per ogni sponda di un
  tiro che fa scoppiare, 250 per il robivecchio, 150 per colpo a un agente e 1000 per il
  KO, 50 per una bolletta del capo parata, 1000 per il campo ripulito.
- **Espressioni**: Tino arrabbiato quando il ramo sta per scendere o è appena sceso, con
  le bolle a due righe dai fiori, negli ultimi 2 s prima di una riga nuova e mentre cade
  una bolletta del capo; ferito quando gli arrivano righe d'attacco o una multa; ko quando
  perde; saltella quando colpisce un agente. Gino (aiutante) saltella quando scoppia
  qualcosa e quando dà un potenziamento, trema quando il ramo scende e alle multe, cade
  ruotato quando si perde. In due Gino è il giocatore di destra.
- **Suoni e musica**: Web Audio come negli altri giochi (scoppi che salgono sulla
  pentatonica di Sol, caduta, ramo che scende, riga nuova, attacco, scambio; petardo,
  fulmine, ghiaccio, chiave, robivecchio, potenziamento, soffio, miele, agente colpito e
  KO, rete, timbro, lancio, multa, parata, bolletta); musichetta in Sol in loop (menu 98
  bpm, partita 120, più tesa con le bolle vicine ai fiori).
- **Disegni**: bolle disegnate nel codice una volta su tele a parte (`spriteBolla`,
  `disegnaContenuto`, `disegnaSpeciale`; ghiaccio e lucchetto sopra con `spriteSopra`;
  il robivecchio è una bolla di vetro con il disegno dell'oggetto sopra), canna di bambù
  sul ceppo, ramo con foglie e soffitto di assi, linea dei fiori (rossa quando le bolle
  sono vicine). Esplosioni con una vampata e una piccola scossa dello schermo, il fulmine
  con un lampo lungo la riga. Il petardo rosso si confondeva con la fragolina: ora è una
  bolla scura con la ghianda arancione.
- **Difficoltà tarata** con partite simulate (giocatori simulati che provano tutti gli
  angoli con la stessa fisica, `cercaTiri`/`scegliTiroIA`, con errore sull'angolo e una
  probabilità di non scegliere il tiro migliore: principiante 3,5° / 40%, medio 2° / 70%,
  bravo 0,7° / 95%; con la guida corta l'errore si moltiplica per `ERRORE_GUIDA`: 1,1
  guida lunga senza fantasma, 1,25 fino alla sponda, 1,45 corta). Con gli agenti il
  computer pensa prima e poi mira dove l'agente sarà 0,75 s dopo, e lascia perdere i
  tiri sulla rete. Livelli vinti (principiante / medio / bravo, 24 partite; tra
  parentesi il principiante con l'aiuto): prato 1-3 100 / 100 / 100, 4 88 / 100 / 100,
  5 46 / 100 / 100 (79), 6 92 / 100 / 100; spiaggia 79-100 / 100 / 100, boss 12 54 /
  100 / 100 (88); bosco 13 88 / 96 / 100, 14 54 / 96 / 100, 15 42 / 92 / 100, 16 17 / 88
  / 100 (67), 17 63 / 96 / 100, 18 17 / 71 / 100 (63); uffici 19 54 / 96 / 100, 20 38 /
  83 / 100, 21 13 / 75 / 100 (46), 22 29 / 67 / 100 (38), 23 13 / 58 / 100 (63), 24 13 /
  58 / 100 (54). Robivecchi presi dal medio: 96-100% (71% nel 22). Il par è la mediana
  dei tiri del bravo (6-38). Infinito: medio ~4-6 min. In due una partita dura ~30-90 s.
- **Prove automatiche**: `window.sparabolle` (`stato`, `iniziaAvventura(n, { silenzio,
  aiuto })`, `iniziaInfinito`, `iniziaDue({ ia: [IA.x, IA.y] })`, `aggiorna`, `spara`,
  `scambia`, `mira`, `simula`, `cercaTiri`, `scegliTiroIA`, `risolvi`, `daiPotere(c, id)`,
  `daPulire`, tabelle); con `stato.test = true` il gioco non avanza da solo, non suona,
  non apre pannelli e non salva i robivecchi; mettendo `stato.campi[0].ia = IA.medio`
  gioca il computer; a fine partita `stato.fine.esito`, e nel campo `tiri`, `robi`
  (`'preso'`), `statPoteri`, `boss[i].vita`. I copioni (Playwright, `aggiorna(1 / 60)`
  fino a `stato.fase === 'finita'`, 6 pagine in parallelo: tutti i livelli con 24 partite
  per giocatore in ~1 minuto) non sono nel repository.
- **Provarlo su Claude**: come per gli altri giochi, in una cartella di appoggio
  `index.html` (senza doctype, html, head e body, percorsi `../../` tolti),
  `css/sito.css`, `stile.css`, `livelli.js`, `gioco.js` (con `ASSETS = 'assets/'`,
  `FONDALI = 'fondali/'` e `leggi('sbloccati', 24)`), `fondali/` (i quattro di Tino Bum),
  `assets/tino/`, `assets/gino/`, `assets/agenti-tari/`, `assets/oggetti/robivecchi/`;
  si pubblica con `files` e `root`.
- **Tappa 3 (da fare)**: rifinitura, suoni e taratura con persone vere (i giocatori
  simulati sono più rapidi); possibili aggiunte: bolle speciali anche nell'infinito,
  classifica dei tempi, un mondo bonus.

### Tino Pro Skate (`games/tino-pro-skate/`)
Corsa a scorrimento orizzontale sullo skate (meccaniche da classici del genere): Tino va
avanti da solo, salta, fa trick, scivola su panchine e ringhiere e abbatte gli agenti
della Tari saltandoci in testa. File: `index.html`, `stile.css`, `gioco.js` (tutta la
logica, su canvas), `ghianda.svg`.
- **Decisioni prese**: titolo "Tino Pro Skate"; ambientazione a Firenze in quartieri che
  si susseguono (le Cascine, Novoli, i cantieri della tramvia, il centro); storia: hanno
  rubato lo skate di Gino ("Papà… mi hanno rubato lo skate!" "Sì, figlio mio: ci penso
  io!"), l'ispettore capo l'ha pignorato per una bolletta non pagata; modalità storia
  (quartieri con inseguimento dell'ispettore alla fine) e corsa infinita; Grinta a 3
  tacche (1 tacca Sfondamento, 3 tacche Botta di Grinta); negozio con le ghiande, solo
  tavole con piccoli poteri (caschi e adesivi da appoggiare su Tino sono stati provati e
  tolti: non andavano bene; i disegni restano in `disegni/caschi/` e `disegni/adesivi/`,
  non usati); Gino giocabile nell'infinito (scelta
  nel menu, `localStorage` `personaggio`); musica punk rock sintetizzata. Sul telefono si
  gioca in orizzontale (in verticale compare l'invito a girarlo e il gioco va in pausa).
  Dopo la prima prova: manual con ← (non più con ↓), inclinazione in aria con ← → per
  backflip e frontflip (la Cupola è stata tolta), half pipe da cui si esce tenendo →
  (oppure da soli quando lo slancio è finito).
- **Tappe**: 1 motore (fatta: corsa, salti, trick, combo, grind, manual, schiacciata,
  Grinta, agenti col retino e col timbro, quartiere delle Cascine, corsa infinita,
  musica punk, Gino giocabile); 2 contenuti (fatta: i quattro quartieri: Novoli, cantieri
  della tramvia e centro con ostacoli propri; la modalità storia con gli inseguimenti
  dell'ispettore capo; potenziamenti per strada e negozio); grafica a fumetto delle Cascine e della
  half pipe (fatta, prima della tappa 2); 3
  rifinitura (suoni, taratura con persone vere).
- **Grafica a fumetto** (fatta per le Cascine): fondali ed elementi dipinti con Nano Banana Pro
  (Gemini) dal proprietario del sito, in `games/tino-pro-skate/disegni/`; se un file manca resta
  il disegno nel codice. Stile comune dei prompt: "Comic book cartoon style for a 2D
  side-scrolling skateboarding game: bold uniform black ink outlines, flat vibrant colors with
  simple cel shading, light halftone dots in the shadows, playful and exaggerated shapes, punk
  rock energy. Strict side view (orthographic, no perspective), no people, no animals, no logos,
  no text unless requested." Il primo fondale fa da riferimento ("same style as the attached
  image"); elementi su magenta #FF00FF, di lato, appoggiati al bordo basso, con le proporzioni
  delle sagome di `FORME`.
  - **Preparazione** (copione in Python non nel repository): Gemini li dà in JPG; il magenta si
    toglie calcolando la trasparenza da quanto è magenta il pixel (`min(r, b) - g`), solo nella
    zona di sfondo (collegata al bordo, più i buchi molto magenta come tra le doghe della
    panchina, allargata di 2 px), con una soglia (sotto il 30% di colore il pixel è trasparente:
    lo sfondo sfumato lasciava un velo) e togliendo il magenta dai bordi semitrasparenti;
    poi ritaglio, riduzione (circa 2,5 volte la misura in gioco) e palette a 256 colori.
  - **File**: `fondali/cascine-lontano.png` (1578 × 665, cielo, colline coi cipressi, ponte
    all'Indiano, Arno), `cascine-medio.png` (platani, lampioni, piramide), `cascine-vicino.png`
    (cancellata, siepe, marciapiede), `fondali/vignetta.png` (viale al tramonto con lo skate e un
    cartello vuoto: ci va il titolo; menu e pannello della storia); `elementi/` cono, cassette,
    cassonetto (un bidone più alto che largo: in gioco sono due bidoni affiancati, uno
    specchiato), transenna (vista di fronte: più larga della sagoma), panchina, ringhiera
    (tagliata a destra: si compone con la testa, tratti di tubo con un piede e la testa
    specchiata), rampa, banco del mercato (allargato del 25%), tombino (aperto, il buco sulla
    buca), tavola; `pipe/muro.png` (murales con TINO, PUNK, SKK8, la ghianda con gli occhiali) e
    `pipe/conca.png` (sezione della conca coi blocchi di pietra ai lati).
  - **Strati** (`disegna`, `striscia`, `strato`): lontano alto 400 a 0,05 della telecamera, medio
    alto 182 a 0,3, vicino alto 84 a 0,7 (poggia 12 px sopra la strada); lontano e medio si
    affiancano dritti e specchiati (i bordi non combaciavano), il vicino si ripete dritto. Sopra
    il lontano si riempie col colore della sua riga in cima. Ogni strato si prepara una volta già
    scalato per lo schermo, con la copia specchiata accanto e il velo del quartiere (`Q.velo`,
    bianco al 16%: personaggi, ghiande e bollette si staccano) già sopra: scalare i disegni a
    ogni fotogramma raddoppiava il tempo di disegno sul telefono.
  - **Elementi** (`disegnaElemento`): adattati alla sagoma senza cambiarla, appoggiati a terra al
    centro; le misure vengono dai disegni (seduta della panchina al 53% dall'alto, cima della
    rampa al 93% della larghezza, tendone del banco in cima, buco del tombino dal 14% al 60%).
  - **Half pipe** (`disegnaPipeDipinta`): il muro coi murales è alto 150 sopra la strada (la riga
    247 del disegno sta a terra: sotto il disegno fa già da conca e si copre), largo ~1250, e si
    vede anche nella parte aperta della conca; si disegna in un passaggio a parte prima degli
    altri ostacoli e si accende in base alla sua larghezza (prima, legato alla sola conca,
    compariva e spariva a metà schermo e copriva gli ostacoli vicini); la conca è divisa a metà, le pareti hanno il
    bordo esterno della curva (col tubo) sul bordo della pipe e in mezzo si ripete il pezzo
    centrale del fondo (dal 40% al 60%), dritto e specchiato (stirare una colonna sola faceva
    strisciate).
  - **Aspetto a fumetto**: le foto di Gino e degli agenti si disegnano da una copia
    preparata una volta (`contornata`, `fumetto`) con contorno nero di 3 px e ombra piena
    sfalsata di 4 px; Tino solo con l'ombra (`CONTORNO_TINO`: col contorno nero non piaceva); le ghiande hanno un contorno chiaro (si perdevano sugli alberi). Font
    Bangers (Google Fonts) per HUD, messaggi, scritte dei trick e titoli; onomatopee in una
    stella a punte (`botto`: POP! Giglio, WHOOSH! flip, SKRRR! grind, BAM! pestone, CRASH!
    cassette, SBAM! urto, SDENG! agente sfondato, VROOOM! Sfondamento, KA-BOOM! Botta); linee di
    velocità sopra i 430 px/s e con lo Sfondamento; retinatura a puntini sui bordi dello
    schermo; bollette con contorno nero; pannelli con bordo nero spesso, ombra piena e
    retinatura, bottoni da fumetto, foto con contorno (CSS `drop-shadow`).
  - **Prestazioni**: con il processore rallentato ×4 (Pixel 7 in orizzontale) un fotogramma si
    disegna in ~14 ms (prima ~9,5); i disegni pesano ~1,5 MB in tutto.
  - **Controllo**: le corse simulate danno lo stesso identico stato di prima (8 semi, 3000 m,
    impronta di tutto lo stato tranne particelle e messaggi; va fissata la larghezza dello
    schermo, perché la strada si genera fino a un po' oltre il bordo destro).
- **Tappa 2, immagini**: i prompt sono in `disegni/prompt-tappa-2.md`, 60 riquadri già
  completi (stile comune + immagine, da incollare così come sono su Nano Banana Pro con
  `cascine-lontano.png` allegato come riferimento), con un codice ciascuno: Novoli N1-N7,
  cantieri C1-C11 (lo scavo C9 al posto della half pipe col suo muro C10; la ruspa in due
  pezzi, corpo C4 e braccio C5, per animare la benna), centro F1-F8 (F6 turista persona, F6b
  variante orsetto: se ne usa una), mezzi dell'ispettore I1-I4 (senza guidatore: l'ispettore
  SVG ci va sopra), icone dei potenziamenti P1-P7, negozio (tavole T1-T6, caschi K1-K5,
  adesivi A1-A6), vignette della storia V1-V4, transenna alta dipinta S1. Proporzioni dei
  pezzi nuovi proposte nei prompt: le sagome si adattano ai disegni quando arrivano.
  Vantaggi e svantaggi delle tavole nei prompt sono solo una proposta.
  **Stato**: arrivate e preparate (come quelle delle Cascine, copione Python non nel
  repository) tutte le immagini (A5, il cono, al secondo tentativo: la prima volta Gemini
  aveva rifatto il fulmine). T5 e T6 al secondo tentativo (al primo la
  tavola era vista da sotto): nel prompt va detto che è di profilo, "NOT from above, NOT from
  below", allegando anche `tavole/giglio.png`. I caschi sono specchiati (Gemini li fa guardare
  a sinistra, Tino guarda a destra). Nuovi file: `tavole/pop-corn.png`, `tavole/oro.png`,
  `caschi/` stelle, ghianda, cresta, cupola (a cappello di ghianda), alato (K1-K5);
  `adesivi/` ghianda, ruota, giglio, fulmine, cono, tari; `poteri/bombolone.png`,
  `elementi/barriera.png` (usata: la barriera è passata da 70 a 130 di larghezza per stare
  alle proporzioni del disegno, e la coppia di barriere è più distanziata di 60 px; il
  pianificatore non la urta mai in 20 incontri); `elementi/sbarra.png` (S1, usata: il disegno
  va da terra alla cima del cartello, 0-230, con le assi che finiscono a 56; tagliati i pali
  lunghi sotto, che Gemini fa alti mezza immagine; la transenna è passata da 56 a 90 di
  larghezza perché il disegno è largo ~107); `fondali/vignetta-novoli`, `-cantieri`,
  `-centro`, `-finale` (V1-V4, 900 px; alla V4 tolta la cornice bianca; V1 e V2 rifatte al
  secondo tentativo: la prima volta avevano le palme ed erano la stessa piazza con lo skatepark;
  nel prompt "no palm trees, no skatepark ramps" e il Palazzo di Giustizia descritto com'è). Decisioni prese
  sulle immagini: il tram C8 resta con le scritte della fiancata (va bene così al
  proprietario; tolte solo le perline e lo sfondo bianco sopra il tetto); turista F6 (la
  persona), non l'orsetto F6b; lo scavo C9 è tagliato sotto i bordi in prospettiva (i tubi sui
  bordi sono disegnati nel codice); del fango C6 resta solo la pozza (via l'asfalto, tenuti i
  pixel marroni). I lontani di Gemini (anche quello delle Cascine) avevano in fondo una fascia
  bianca, tagliata: nel centro si vedeva sotto gli archi del Ponte Vecchio, che ora ha dietro
  l'acqua dell'Arno disegnata nel codice. File: `fondali/<q>-lontano|medio|vicino.png` per `novoli`, `cantieri`,
  `centro`, `fondali/ponte-vecchio.png`; `elementi/` scalinata, corrimano, fioriera,
  monopattini, ruspa, benna, fango, binari, tram, sampietrini, turista, bancarella, bici;
  `pipe/scavo.png`, `pipe/muro-cantiere.png`; `mezzi/` ape, monopattino, carrello, golf
  (I1-I4); `poteri/` casco, ruote-oro, calamita, schiacciata, lampredotto, ruota-sgonfia
  (P1-P3, P5-P7); `tavole/` giglio, longboard, leggera, pesante (T1-T4). Mezzi e vignette
  sono usati dalla storia; poteri e tavole dai potenziamenti e dal negozio; caschi e adesivi
  non sono usati.
- **Potenziamenti per strada** (tabelle `POTERI` e `COMPARSA` in cima a `gioco.js`, icone in
  `disegni/poteri/`): uno ogni 300-450 m dai 150 m, in un tratto di strada libera tutto suo
  (`generaStrada`, come la ruota di scorta), mai due uguali di fila; nella corsa infinita e
  nella strada della storia, non nell'inseguimento (all'inizio dell'inseguimento i
  potenziamenti attivi si tolgono). I buoni stanno a 165 (si prendono saltando), la ruota
  sgonfia (1 su 6) a 20, sulla strada (si evita saltando). Casco (peso 12, finché non si urta,
  al massimo 20 s: l'urto non toglie la ruota, "BONK!"), ruote d'oro (18, 15 s, combo × 2),
  calamita (20, 15 s, attira le ghiande entro 170 px), bombolone (15, +1 tacca di Grinta;
  con la Grinta piena +300 punti), schiacciata all'olio (12, 12 s, velocità del salto × 1,06),
  lampredotto (12, 15 s, Grinta doppia), ruota sgonfia (8 s, salto × 0,95, manual al massimo
  1 s, Tino arrabbiato). Stato in `stato.poteri` ({ id: secondi }), `attivo(id)`,
  `prendiPotere`, `aggiornaPoteri`, `forzaSalto()`. HUD: icone sotto la Grinta con l'anello
  del tempo (lampeggiano negli ultimi 2 s). Su Tino: alone azzurro (casco), ruote dorate,
  anelli rossi (calamita), sbuffi viola, gocce d'olio, tavola che pende (ruota sgonfia).
  Prima il casco aveva peso 18 e durava 30 s: il medio andava il 16% più lontano.
- **Negozio** (tabella `TAVOLE`; `pannelloNegozio`, dal menu e dalla fine della corsa, come
  in Gino Volante): solo tavole; si compra con `ghiande-totali` (si raccolgono ~150 ghiande
  ogni 1000 m: ~200 a corsa per il principiante, ~450 il medio, ~750 il bravo).
  `localStorage` `tavola`, `tavole`; `posseduto(tipo, id)`; i poteri della tavola si
  leggono con `pTav('chiave', predefinito)`. Tavole: classica (gratis), giglio 500 (Giglio
  0,30 s e 150 punti; flip −10%), longboard 1000 (fango × 0,8 invece di 0,62, sampietrini
  senza tremare e col manual, manual fino a 4,5 s; giri × 0,85; disegnata larga 104),
  leggera 1800 (giri × 1,2; atterraggio entro 30°), pesante 2800 (Sfondamento 1,5 s,
  pestoni e sfasciate +50%; salto × 0,985, giri × 0,9), pop corn 4000 (attira le ghiande
  entro 90 px; Grinta × 0,9), tavola d'oro al record di 5000 m (ghiande × 2). In cima al
  negozio Tino sulla tavola scelta e Gino. Le tavole valgono anche con Gino e
  nell'inseguimento.
- **Taratura di potenziamenti e tavole** (copione Playwright non nel repository: il
  giocatore, quando andando dritto urterebbe entro 1,15 s, prova quattro mosse (salto corto,
  tenuto, ↓ per 0,5 e 0,9 s) a ogni istante da 0 a 0,8 s e guarda 1,7 s avanti, sceglie la
  mossa con la finestra di istanti buoni più lunga e la fa a metà finestra con l'errore del
  livello (principiante 0,12 s e 3% di mosse perse, medio 0,08 e 1,5%, bravo 0,05 e 0,5%);
  salta per i potenziamenti buoni e cerca di evitare la ruota sgonfia; niente trick né
  Grinta). 30 corse per livello, fino a 6000 m, senza / con potenziamenti: principiante
  1219 / 1205 m, medio 2835 / 3133 m (+10%), bravo 4874 / 5217 m (+7%). Tavole (medio, 30
  corse): giglio, pop corn e oro danno le stesse corse della classica (non cambiano i
  salti), longboard +2%, pesante −2% al principiante (50 corse). La leggera col salto più
  alto (anche solo +2% di velocità) dava al principiante +22-26%: il salto più alto è stato
  tolto. Con la ruota sgonfia sempre attiva il bravo arriva a 3000 m in 11 corse su 12.
  Ghiande: pop corn +28%, oro × 2.
- **Quartieri** (tabella `QUARTIERI`, `GIRO_QUARTIERI`, `quartiereA(x)`): Cascine → Novoli →
  cantieri della tramvia → centro, 750 m l'uno (`LUNGO_QUARTIERE`), poi si ricomincia dalle
  Cascine (sempre più veloci). Ogni quartiere ha nome, colori (cielo, colline, palazzi,
  marciapiede, strada, terra) e tipo di strada (`viale`, `piazza` di cemento, `cantiere` con
  rattoppi e riga gialla, `lastricato` di pietra, `stradaQuartiere`). Lontano e medio sfumano
  in 30 m (`SFUMA`) dal quartiere vecchio al nuovo; vicino e strada cambiano di netto al
  confine (`perSegmenti`). Entrando compare il nome con un sottotitolo. Nel centro il medio
  alterna i palazzi al Ponte Vecchio (`medioCentro`); senza disegni restano cielo, colline e
  file di palazzi coi colori del quartiere (`disegnaPalazzi`). I pezzi hanno `q` (in quali
  quartieri compaiono) e `pesi` per quartiere; i pezzi comuni (coni, cassette, buche, agenti,
  rampe, transenne) ci sono ovunque, panchine, ringhiere, banco del mercato e cassonetti sono
  delle Cascine (panchine e cassonetti anche a Novoli). Menu: "Parti da" sceglie il quartiere
  di partenza (si parte coi metri e la velocità di lì); si sblocca quando il record arriva al
  suo inizio (`quartiereAperto`, `localStorage` `partenza`). A fine corsa si vede il quartiere
  raggiunto.
  - **Novoli**: scalinata (`scalinata()`: sette parti `gradino` invisibili, 16-32-48-64-48-32-16
    px, su cui si sale da soli perché `FISICA.gradino` ora è 18; corrimano invisibili che salgono
    da 50 a 101, corrono a 101 sopra il piano e scendono a 62: grind inclinati, con `h0`,
    `inclinato`, `quotaSu`, `pendenza`), corrimano lungo (grind a 60, 480-760 px), fioriera
    (solida e grind sul bordo a 44), monopattini (solidi, rompibili, 50 di altezza).
  - **Cantieri**: ruspa (tabella `RUSPA`: il corpo sta dietro e non urta; il braccio gira
    attorno al perno, ciclo 3,2 s: giù 1 s con la benna a terra da saltare, sale 0,4 s, su 1,4
    s, alta abbastanza da passarci sotto, scende 0,4 s; `angoloBenna`, `riquadroBenna`), fango
    (zona di 220-300 px: a terra la velocità ×0,62, `ZONE`), binari (massicciata a 12, su cui si
    sale da soli, e rotaia grind a 32), tram (solido e piano a 92, lungo 560: ci si salta sopra),
    barriera di cemento (solida a 50, larga 130, dipinta), lo scavo al posto della half pipe
    (stesse regole, `arte: 'scavo'`, `disegnaScavo`, `disegnaMuroCantiere`), più transenne alte.
  - **Centro**: sampietrini (zona di 520-820 px con un cono o le bici in mezzo: Tino trema, il
    rotolio rimbomba e niente manual), turisti (solidi alti 96, uno o due; saltarli senza urtarli
    vale "Foto ricordo! +100" col flash), bancarella (carretto solido a 54 e tettoia a 130 da cui
    si passa sotto), bici nella rastrelliera (solide a 54, larghe 170).
  - Tolti dopo le prove: l'agente col timbro sopra la fioriera e sopra la bancarella (atterrando
    sulla fioriera ci si scivolava contro; sulla bancarella la tettoia lo copriva).
- **Storia** (tabelle `STORIA`, `MEZZI`, `INSEGUIMENTO`; `nuovaStoria(cap)`, `stato.storia` =
  `{ cap, fase: strada | inseguimento | vinto, xFine, xVia }`, `stato.capo`): nel menu "La
  storia" (prima), sotto la corsa infinita con personaggio e partenza. Quattro capitoli, uno
  per quartiere, solo con Tino: 750 m di strada (il generatore si ferma a `xFine`, il
  quartiere resta quello del capitolo anche dopo), poi l'inseguimento dell'ispettore capo.
  Pannelli: introduzione (vignetta delle Cascine, scelta del capitolo tra quelli aperti), tra un
  capitolo e l'altro la vignetta del quartiere dopo col titolo sul cartello, punti e battute
  (`DOPO`), finale con la vignetta del Ponte Vecchio (Gino riprende lo skate) e il totale dei
  punti migliori. Se Tino è KO sulla strada si rifà il capitolo; nell'inseguimento si riprova
  dall'inizio dell'inseguimento con le ruote piene (`riprovaInseguimento`, copia dello stato
  presa all'inizio), senza limiti.
- **Inseguimento**: l'ispettore (SVG, non si specchia) sul mezzo dipinto: Ape (Cascine, sacchi
  di bollette), monopattino (Novoli, in piedi, più alto da colpire: 124, bollette e coni),
  carrello del cantiere (cartacce rovesciate dalla benna: ci si sale sopra; monopattino e
  carrello sono dipinti verso sinistra e si disegnano specchiati, `specchia`) e golf cart con lo
  skate di Gino (centro, tutti gli attacchi). Entra da destra, poi il ciclo: **fuga** (5,5 →
  4,8 → 4,2 → 3,8 s secondo i colpi presi; sta 460 px avanti a Tino e attacca col braccio alzato
  e il "!" 0,45 s prima: bollette basse o alte che vanno 330 px/s più piano di lui, disegnate 1,4 volte più
  grandi delle altre (urti ×1,2; `INSEGUIMENTO.grandezza`), oppure
  lascia cadere sacco / cartacce / cono; niente attacchi nei primi 0,8 s e negli ultimi 1,3),
  **avviso** (0,9 s di fumo), **inceppo** (torna indietro verso Tino a 270 px/s, con la freccia
  gialla sopra): saltandogli in testa (cima `alto` del mezzo) è un colpo (+500, rimbalzo come il
  pestone, ghiande e, se manca, una ruota di scorta); urtarlo di lato toglie una ruota e lui
  riparte ridendo; se Tino lo supera senza colpirlo riparte. Lo Sfondamento addosso vale un
  colpo, la Botta di Grinta lo fa incepparsi subito. Colpi: 3, 3, 3, 4. All'ultimo il mezzo si
  schianta (+2000) e l'ispettore vola all'indietro. Durata ~29 s (centro ~36) giocando bene.
  Musica intensa per tutto l'inseguimento; HUD in alto a destra: "Ispettore tra N m", poi i
  colpi che mancano (bollette).
- **Taratura della storia** (copioni Playwright non nel repository; `giocaCapitolo` gioca un
  capitolo intero con i tentativi): il pianificatore (4 mosse per tratti da 0,15 s, 5 tratti
  avanti, con l'ispettore inceppato cerca prima le sequenze che lo colpiscono) vince tutti gli
  inseguimenti senza urti (12 semi per capitolo). I giocatori "umani" (finestra della mossa che
  supera il pericolo, fatta a metà con l'errore: principiante 0,12 s, medio 0,08, bravo 0,05;
  ↓ tenuto fino a dopo il pericolo) su capitoli interi (8 semi): bravo vince quasi sempre al
  primo tentativo (0-0,1 KO a capitolo); medio 0-0,4 KO sulla strada e 0-0,25 nell'inseguimento;
  principiante vince tutti i capitoli entro pochi tentativi (KO sulla strada 0,1-1,6, nel centro
  3,1; nell'inseguimento 0,1-0,4). Solo inseguimento con 3 ruote (16 semi): principiante
  81-100%, medio 94-100%, bravo 94-100%. Prima di separare le coppie del monopattino (attacchi
  ogni 1,15 s, ora 1,3) i coni lì erano la causa di urto più frequente.
- **Mondo**: x verso destra, h verso l'alto (0 = strada), 40 px = 1 m. Schermo logico
  alto 540, largo 760-1300 secondo lo schermo; Tino sta a 0,26 della larghezza.
- **Fisica** (tabella `FISICA`): gravità 2300, ollie 780 (~132 px; tenendo premuto la
  gravità scende a 1350 per 0,28 s, ~200 px). Velocità e pause tra i pezzi nelle curve
  `CURVE` ([metri, valore]): 340 → 395 (400 m) → 465 (1200) → 535 (2500) → 585 px/s
  (4000 m); strada libera tra i pezzi 1,5 s → 0,72 s.
- **Comandi**: Spazio / ↑ / W salto (tenere = più alto); in aria ← → (o A D) girano
  all'indietro / in avanti, a terra fanno il manual (← sulle ruote dietro, → "di punta",
  max 3 s); X / K Giglio in aria (tenendo premuto diventa la presa "Il Lampredotto");
  ↓ / S a terra accucciato (finché si tiene: alto 50 invece di 90, passa sotto le transenne
  alte e prende velocità, fino a +15% in 0,5 s, che poi torna piano; niente manual), in aria
  schiacciata (sfonda cassette e transenne dall'alto e rimbalza); E /
  Maiusc Sfondamento; Q / Invio Botta di Grinta; mouse: sinistro salto, destro trick. Se
  si salta tenendo ← o → (dal manual) non si gira finché non si lasciano
  (`bloccaGiro`). Telefono: metà sinistra salto; metà destra: tocco = Giglio (dopo 0,11
  s), tenuta = presa in aria / manual a terra, trascinata a destra o a sinistra = gira
  (e nella half pipe a destra esce), trascinata in giù = schiacciata; pulsanti SFONDA e
  BOTTA disegnati in alto a destra.
- **Rotazione** (tabella `GIRO`, `giraAria`, `controllaAtterraggio`): tenendo ← o → la
  velocità di rotazione sale (60 rad/s²) fino a 12 rad/s; lasciando si smorza (×e^-18t).
  All'atterraggio la tavola deve essere dritta rispetto alla superficie (le rampe sono
  inclinate) entro 0,62 rad (~35°) e il trick finito, altrimenti Tino cade; tra 35° e 45°
  (`GIRO.manual`) atterra in manual (girato in avanti di punta, all'indietro sulle ruote
  dietro), che dura almeno 0,5 s anche senza tenere ← → (non nella half pipe: lì vale ancora
  il limite di 35°); in discesa la tavola è gialla in quella fascia e rossa oltre. Ogni giro
  intero vale un Frontflip o un Backflip (`flipFatti`: 250 punti e 30 di Grinta a giro,
  Doppio / Triplo con ×1,3). In discesa, se l'angolo è sbagliato la tavola si illumina di
  rosso. Un flip sulla strada riesce col salto lungo lasciando la freccia dopo ~0,55 s
  (finestra di ~0,1 s); con le rampe e la half pipe c'è più tempo.
- **Trick e combo** (tabella `TRICK`): Giglio 0,36 s / 100 punti, flip (vedi sopra),
  presa 260 al secondo, grind 200 al secondo, manual 110 al secondo, Pestone 150
  (Superpestone doppio se si arriva con la schiacciata), Sfasciata 120. Un trick a metà
  quando si tocca terra fa cadere (si perdonano gli ultimi 0,07 s): niente ruota persa,
  ma combo persa, velocità dimezzata e 20 di Grinta in meno. La combo è la somma dei punti
  × il numero di azioni; si chiude toccando terra (0,14 s di grazia per passare al
  manual, che la tiene viva), si perde con un urto o una caduta.
- **Grinta** (tabella `GRINTA`): 3 tacche da 100, si carica con trick, grind, manual,
  pestoni e combo. Sfondamento (1 tacca): 1 s a velocità ×1,5 che sfonda cassette e
  transenne, butta via agenti e bollette. Botta di Grinta (3 tacche): salto e schianto a
  terra, onda d'urto che stordisce per 4 s tutti gli agenti sullo schermo, sfonda gli
  ostacoli rompibili e spazza le bollette, poi 2,5 s di Sfondamento; nella musica uno
  stacco di un battito e si riparte dal ritornello.
- **Vita** (tabella `VITA`): 3 ruote, ogni urto ne toglie una (1,6 s di invulnerabilità,
  velocità dimezzata che torna piano); a zero Tino è KO. Ogni ~650 m, se manca una ruota,
  ne compare una di scorta in alto (da prendere saltando).
- **Strada** (tabelle `FORME` e `PEZZI`, generatore `generaStrada`): pezzi scelti a caso
  con un peso e un metro da cui compaiono, mai due uguali di fila: cono, panchina (grind),
  cassette (rompibili), buca col tombino aperto, cassonetto (ci si sale), agente col
  retino, ringhiera (grind) con un cono sotto, rampa (lancia a 700 + 0,4 × velocità), due
  coni, transenna (rompibile), banco del mercato del martedì (tendone su cui si sale, con
  le cassette sotto), agente col timbro (davanti 860 px liberi: lancia da lontano), due
  cassonetti, due agenti col retino (il secondo dove si ricade dopo il pestone sul primo,
  e non alza la rete), cono e agente, agente col timbro sul cassonetto, transenna alta (dai
  180 m: `sbarra`, larga 56, solida da 56 a 230 px con `basso: 56`, quindi non si salta: si
  passa sotto accucciati, con 4 ghiande basse; la prima volta compare l'avviso; si sfonda
  con la Grinta; dipinta, `elementi/sbarra.png`, larga 90; di riserva il disegno nel codice),
  half pipe (dai
  60 m). Ghiande lungo i
  salti e sui grind (10 punti l'una, sommate in `ghiande-totali` per il negozio futuro).
- **Half pipe** (tabella `PIPE`, `puntoPipe`, `muoviPipe`, `lanciaPipe`, `esciPipe`,
  `disegnaPipe`): conca a U scavata nella strada (due quarti di cerchio di raggio 130 e
  fondo piatto di 200, larga 460), con muro di fondo coi graffiti e tubi sui bordi;
  vicino alla conca la telecamera scende di 112 px (`stato.cam.h`, che entra in `sy`) e
  mentre Tino è dentro la inquadra ferma. Tino ci entra dal bordo sinistro (o ci atterra
  da un salto) e la percorre lungo la curva con una velocità che dipende solo dalla quota
  (quella di lancio del passaggio, più quanto è sceso), così arriva sempre al bordo
  (prima, con la gravità lungo la curva, entrando lento o atterrando in fondo restava a
  dondolare senza uscire); a ogni bordo vola dritto in
  su a 960 × 0,9^passaggi px/s (~200 px al primo, ~6 voli), con base della tavola
  verticale; in volo gira e fa i trick, e all'atterraggio si gira (specchiato, `verso`).
  Ogni volo è un'azione "Aria" (50 punti) e la combo resta aperta per tutta la conca.
  Tenendo → quando arriva al bordo destro esce e riprende la corsa; se lo slancio è sotto
  560 esce da solo (~9 s), comunque dopo 10 voli. Il salto sulla parete "pompa" (una
  volta per passaggio, toglie 1,5 passaggi: il volo dopo è più alto). Una caduta dentro la conca toglie la combo e due passaggi.
  Ghiande in colonna sopra i bordi. Mentre Tino è dentro gli agenti aspettano e le
  bollette spariscono; la Botta di Grinta non si può usare.
- **Agenti** (tabella `AGENTI`, disegni di `assets/agenti-tari/`, non si specchiano): col
  retino cammina verso Tino e a 215 px alza la rete (0,2 s di avviso, poi 0,38 s in cui
  prende davanti a sé fino a 76 px d'altezza); col timbro lancia bollette ogni 1,9 → 1,25
  s, basse (44, da saltare) o alte (118, non bisogna saltare). Il pestone vale se si
  scende sulla testa entro 50 px dal centro; di lato è un urto.
- **Fondale di riserva delle Cascine**: fondale disegnato nel
  codice a strati che scorrono a velocità diverse: nuvole, colline con i cipressi, l'Arno
  con il ponte all'Indiano, filari di platani con i lampioni e la piramide (l'antica
  ghiacciaia), siepe con la cancellata, viale d'asfalto con la pista ciclabile.
- **Musica** (tabelle `MUSICA` e `BRANO`): punk rock in Mi, tutto Web Audio: power chord
  a dente di sega distorti (WaveShaper), basso a ottavi, cassa, rullante e charleston.
  16 battute: strofa Mi Mi Do Re con la chitarra stoppata, ritornello La Do Sol Re con
  accordi aperti e melodia (più forte con la Grinta piena o la combo lunga). Menu 150
  bpm, in corsa da 168 a 186 bpm con la velocità. Suoni continui: rotolio delle ruote e
  stridio del grind. M tutti i suoni, N solo la musica (`muto`, `musica-spenta`).
- **Espressioni**: Tino arrabbiato con la Grinta piena, con l'ultima ruota e durante la
  Botta; ferito quando urta o cade; ko a fine corsa (la tavola vola via). Gino (solo la
  testa) saltella quando chiude una combo, trema quando urta, rotola quando cade.
- **Punteggio**: punti delle combo + 10 per ghianda + 50 per ogni cosa sfondata;
  `localStorage` `tino-pro-skate:record-metri`, `record-punti`, `ghiande-totali`,
  `storia-capitolo` (capitoli finiti, 4 = storia finita), `storia-punti` (i punti migliori
  di ogni capitolo).
- **Difficoltà tarata** con corse simulate (Playwright, solo salti, senza trick né
  Grinta): un giocatore che pianifica (ricerca in profondità sul futuro copiato con
  `clona`/`rimetti`, 7 tratti da 0,15 s) arriva a 4500 m con 0-3 urti in 10 corse su 10;
  ogni ostacolo ha una finestra di 0,3-0,6 s per il salto giusto. Giocatori "umani" che
  saltano a metà della finestra con un errore (principiante 0,12 s e 3% di salti persi,
  medio 0,08 s e 1,5%, bravo 0,05 s e 0,5%; 8 corse): ~1500, ~2700, ~5150 m di media. Le
  cause di urto più frequenti sono la rete, le bollette alte e il cassonetto. Con la half
  pipe (6 corse, ±20%): pianificatore 0-1 urti fino a 4000 m in 6 corse su 6, umani
  ~1800, ~3000, ~4500 m (la conca è una pausa senza ostacoli).
- **Prove con i quartieri** (copioni non nel repository, in Playwright): il pianificatore
  (ricerca in profondità con `clona`/`rimetti`, quattro mosse per tratti da 0,15 s, 5 tratti
  avanti) arriva a 4000 m senza urti in 8 corse su 8 attraverso tutti i quartieri. I giocatori
  "umani" sono stati riscritti: quando vedono che andando dritti urteranno cercano la finestra
  di tempo in cui la mossa (salto corto, salto tenuto, ↓ tenuto) supera il pericolo lasciando
  una via d'uscita per dopo (una ricerca in profondità di 3 tratti), e la fanno a metà finestra
  con l'errore del livello. Con questo copione (8 corse) il gioco di prima, solo Cascine, dava
  principiante ~1245 m e medio ~2430 m; con i quartieri principiante ~1245 m, medio ~2645 m,
  bravo ~7150 m. Il copione di prima dava numeri un po' diversi (1500 / 2700 / 5150): i due
  copioni non sono confrontabili tra loro, solo con sé stessi. Prima di accorciarli le bici
  (196 px) e i monopattini (175) lasciavano una finestra di salto di meno di 0,1 s.
- **Prove automatiche**: `window.tinoProSkate` (`stato` (getter), `nuovaCorsa(seme, da)` (da = quartiere di partenza, 0-3), `nuovaStoria(cap, seme)`, `riprovaInseguimento()`, tabelle `MEZZI`, `INSEGUIMENTO`, `STORIA`; `stato.statistiche.colpiCapo`,
  `aggiorna`, `premi(azione, giu)` con azione `salto`, `trick`, `giu`, `avanti`,
  `indietro`, `sfondamento`, `botta`, `clona()`, `rimetti(s)`, `supporto`, `curva`, tabelle); con
  `stato.test = true` il gioco non avanza da solo, non suona e non apre pannelli. Lo stato
  contiene solo dati (anche il seme del generatore, `stato.rng`), quindi copiandolo si
  prova il futuro; le particelle usano `Math.random` per non toccare la strada.
  `stato.statistiche.cause` conta gli urti per causa, `stato.statistiche.sbarre` le transenne
  alte passate da sotto. I copioni non sono nel repository: il pianificatore prova per ogni
  tratto da 0,15 s quattro mosse (niente, salto corto, salto tenuto, ↓ tenuto) per 5 tratti
  avanti; con l'accucciata e il manual nuovi arriva a 3000 m senza urti in 8 corse su 8 (4-9
  transenne alte a corsa); senza la mossa ↓ sbatte sempre contro le transenne. Attenzione nel
  copione: ↓ va tenuto senza lasciarlo tra un tratto e l'altro (lasciato anche per un solo
  fotogramma Tino si rialza sotto la transenna e la urta). Con la transenna larga 90 e la
  barriera larga 130: cantieri (1500-2250 m) senza urti in 4 corse su 4, 11 transenne alte.
- **Provarlo su Claude**: come per gli altri giochi, in una cartella di appoggio
  `index.html` (senza doctype, html, head e body, percorsi `../../` tolti),
  `css/sito.css`, `stile.css`, `gioco.js` (con `ASSETS = 'assets/'`), `ghianda.svg`,
  `disegni/`, `assets/tino/`, `assets/gino/`, `assets/agenti-tari/`; si pubblica con `files` e
  `root`. Per provare i quartieri, nella copia di `gioco.js` `quartiereAperto = () => true`; per
  aprire tutti i capitoli della storia `leggi('storia-capitolo', 3)`; per il negozio
  `leggi('ghiande-totali', 5000)` e traguardi aperti (`if (x.traguardo) return true;` in
  `posseduto`). Nelle prove: `prova('tavola', id)` sceglie senza comprare, `regalaGhiande(n)`,
  `prendiPotere(id, x, h)`, `stato.poteri`, `stato.statistiche.poteri` e `salvati` (urti
  parati dal casco).

### Tino Flipper (`games/tino-flipper/`)
Flipper al neon (meccaniche da classico del genere), senza storia: solo un passatempo.
File: `index.html`, `stile.css`, `gioco.js` (tutta la logica, su canvas).
- **Decisioni prese**: titolo "Tino Flipper", sottotitolo "Notte al neon nel bosco";
  nessuna storia; la palla è una ghianda tonda col cappello; Gino al centro del tavolo come
  bersaglio (la sua foto in un cerchio al neon), Tino sul grembiule in basso a sinistra (e
  grande nel pannello di destra sugli schermi larghi); sei scenari a tempo che cambiano
  colori, sfondo, musica e regole; tre palle a partita e classifica dei cinque migliori.
  Sul telefono si gioca in verticale.
- **Tavolo**: logico 600 × 1040 (campo x 20-540, centro `CX` = 280; corridoio di lancio
  x 540-580). Volta in cima: semicerchio di centro (300, 300) e raggio 280. Sugli schermi
  larghi il canvas è largo 600 + 2 × 260: a sinistra il display (punti, palla, bonus,
  campo, combo, Tana, jackpot, rimbalzo, rampe, scenario in corso o prossimo, scenari
  fatti), a destra Tino con il fumetto, i comandi e Gino. Senza pannelli lo scenario in
  corso compare in una barra in cima al tavolo.
- **Geometria** (in cima a `gioco.js`, funzioni `parete`, `segmento`, `cerchio`, `arco`,
  `specchio` per il lato destro): orbita sinistra (canale x 20-70 fino a y 520, spinner a
  y 440), sporgenze sulle pareti a y 540-700 (spingono in campo le ghiande che scendono
  lungo i muri: senza, finivano dritte nelle corsie esterne), corsie esterne e interne,
  fionde, flipper con perno a (178, 905) e (382, 905), corsie T·I·N·O in cima, tre bumper,
  Gino a (280, 482), tre bersagli che cadono a y 612, la Tana a (115, 405) con la conca
  aperta verso il flipper destro e un tettuccio sopra (senza, la ghianda si incastrava
  tra la cupola e la parete dell'orbita), la bocca della rampa a destra (`BOCCA`) e il
  percorso sopraelevato (`RAMPA`) che riporta la ghianda nella corsia interna sinistra.
  Cancelletto a una via in cima al corridoio di lancio; il fondo del corridoio è lo
  stantuffo.
- **Fisica** (tabelle `FISICA`, `FLIPPER`, `LANCIO`, `BUMPER`, `FIONDA`): passo fisso di
  1/960 s, gravità 1650, velocità massima 3300; urti cerchio-segmento e cerchio-cerchio,
  flipper come capsula che si assottiglia (raggio 14 al perno, 7 in punta, lungo 92) che
  trasmette la velocità della superficie; su 30 rad/s, giù 17. Bumper e fionde spingono
  (980 e 820); le fionde variano un po' spinta e angolo a ogni colpo (con la spinta sempre
  uguale la ghianda faceva ping-pong all'infinito tra le due fionde). Le ghiande del
  multiball si urtano. Ghianda ferma per 3 s: scossone gratis.
- **Comandi**: flipper ← → (o Z /, A D, i due Maiusc, tasto sinistro e destro del mouse;
  sul telefono metà sinistra e metà destra dello schermo); lancio: tenere premuto ↓,
  Spazio, S o Invio e lasciare (col mouse o col dito, se in campo non c'è nessuna ghianda,
  si tiene premuto ovunque); scossone ↑ o W (sul telefono una strisciata veloce in su).
  P o Esc pausa, M suoni, N musica.
- **Regole** (tabella `PUNTI`): corsie T·I·N·O (i flipper spostano le lettere accese;
  tutte e quattro: bonus ×2…×6); tiro da maestro al lancio (la lettera che lampeggia,
  50.000); tre bersagli giù aprono la Tana, tre ghiande bloccate nella Tana = multiball a
  3 ghiande con jackpot sulla rampa (150.000 + 50.000 a ogni jackpot; bersagli giù nel
  multiball = jackpot doppio) e, dopo tre jackpot, super jackpot su Gino (500.000); combo
  (rampa, orbita, Tana e Gino entro 3,6 s l'uno dall'altro): alla 3ª campo ×2, alla 5ª
  ×3, alla 7ª ×4 per 20 s; palla salvata ("ANCORA") per 9 s dall'ingresso in campo (14 col
  multiball); rimbalzo nella corsia esterna sinistra, che si riaccende con 30 giri di
  spinner; palla extra accesa dopo 8 rampe (poi ogni 12) e presa nella Tana. Bonus a fine
  palla (conteggio per bumper, corsie, rampe, orbite, bersagli, Gino, scenari) per il
  moltiplicatore. Scossone: tre di fila = TILT (flipper spenti, niente bonus).
- **Scenari** (tabelle `SCENARI`, `FESTA`, `TEMI`): colpendo Gino (3 volte, poi una in più
  per ogni scenario fatto, al massimo 7) si accende lo scenario, che parte nella Tana e
  dura 35 s: Disco nel bosco (bumper a 10.000, 25 colpi per il premio), Pioggia di ghiande
  (ghiande d'oro sul tavolo, 25.000 l'una, 10 per il premio), Caccia alle lucciole (la
  lucciola si posa su un tiro: 75.000 × quante prese), Temporale (rampa e orbita partono da
  30.000 e raddoppiano a ogni colpo, fino a 480.000), Luna park (tutto ×3). Dopo i cinque,
  la Gran festa di Gino: quattro ghiande in campo e ogni tiro è un jackpot da 100.000.
  Finita la festa si ricomincia da capo con il tavolo più veloce (gravità +6% a giro, palla
  salvata più corta, Gino e spinner chiedono di più). Ogni scenario ha il suo tema di
  colori (neon, accento, lampade, sfondo) e uno sfondo animato (stelle, fasci di luce e
  palla stroboscopica, ghiande che cadono, lucciole, pioggia e fulmini, ruota panoramica,
  coriandoli); il tavolo sfuma da un tema all'altro.
- **Disegno**: sfondo del tema, pareti al neon e pista della rampa si disegnano una volta
  su tele a parte (`preparaStrati`) e si rifanno solo quando cambiano tema o misura; al neon
  c'è l'alone (`neon`), le luci sono aloni sfumati già pronti disegnati in modo 'lighter'
  (`luce`). Lampade sul campo (lettere, moltiplicatori, ANCORA, frecce dei tiri accese,
  scenari attorno a Gino, colpi su Gino, blocchi della Tana, palla extra, rimbalzo); scia
  della ghianda, scintille, punti che salgono, messaggio grande al centro, lampo bianco
  sui jackpot, scossa dello schermo.
- **Espressioni**: Tino arrabbiato quando perde una ghianda, all'avviso di tilt e
  all'ultima palla; ferito nella corsia esterna e al tilt; ko a fine partita; saltella su
  jackpot, combo grosse, scenari e palla extra. Gino trema quando è colpito, saltella sui
  jackpot, si inclina a fine partita.
- **Suoni e musica**: tutto Web Audio con un compressore (flipper, bumper con tre note,
  fionde, corsie, spinner, rampa, Tana, jackpot, multiball, tuono, tilt, carica dello
  stantuffo che sale di tono…). Musica synthwave in La minore (tabelle `BRANO`, `STILI`):
  basso a ottavi, cassa dritta, arpeggi e melodia; ogni scenario ha la sua velocità, onda e
  filtro (menu 100 bpm, partita 120, festa e multiball 138). `localStorage`
  `tino-flipper:classifica`, `muto`, `musica-spenta`.
- **Giocatore simulato** (`pilotaIA`, `provaColpo`, tabella `IA`): quando una ghianda
  arriva sui flipper prova diversi istanti per battere con la stessa fisica del gioco
  (stesso passo, senza effetti) e sceglie quello che la manda dove vuole (`desiderati`:
  Tana accesa, rampa nel multiball, lucciola, Gino o bersagli…). Il colpo parte al passo di
  fisica giusto (`flipper.prog`, orologio della fisica): con il colpo al fotogramma dopo
  prevedeva 10 rampe e ne prendeva una. Fa la partita dimostrativa nel menu; sul telefono
  prova meno istanti (`IA_LEGGERA`). `errore` = imprecisione in secondi, `bravura` =
  probabilità di mirare.
- **Prove automatiche**: `window.tinoFlipper` (`stato`, `iniziaPartita('gioco' | 'demo')`,
  `aggiorna`, `lancia`, `premiFlipper`, `premiLancio`, `scossone`, `provaColpo`,
  `avviaScenario`, `avviaMultiball`, `nuovaPalla`, `flipper`, tabelle); con
  `stato.test = true` il gioco non avanza da solo, non suona e non apre pannelli, con
  `stato.iaGioca = true` gioca il giocatore simulato anche la partita vera.
  `stato.statistiche` conta palle, perse, salvate, uscite dal tavolo e incastri. I copioni
  (Playwright, `aggiorna(1 / 60)` fino a `stato.fase === 'finita'`) non sono nel repository.
- **Taratura** (partite simulate col giocatore simulato, 4-6 per livello, 1/60 s a passo):
  nessuna ghianda esce mai dal tavolo. Incastri trovati e tolti: ping-pong tra le fionde,
  ghianda tra Tana e parete dell'orbita, gradino tra guida della corsia interna e perno del
  flipper, corsia interna troppo stretta tra guida e fionda (ora almeno ~30 px). Con
  errore sul colpo di 25 / 35 / 50 ms e mira il 60 / 35 / 20% delle volte le partite durano
  in media 12 / 6 / 8 minuti (da 1 a 25, molto variabili), con 1-5 multiball e 3-8 scenari;
  con errore di 4-12 ms si arriva alla festa e si fanno due o tre giri. Le persone vere
  sono molto meno precise (non vedono il futuro), quindi giocano meno a lungo.
- **Provarlo su Claude**: come per gli altri giochi, in una cartella di appoggio
  `index.html` (senza doctype, html, head e body, percorsi `../../` tolti),
  `css/sito.css`, `stile.css`, `gioco.js` (con `ASSETS = 'assets/'`), `assets/tino/`,
  `assets/gino/`; si pubblica con `files` e `root`.
- **Stato**: giocabile (versione 1, un solo tavolo al neon). Dopo la prima prova al
  proprietario piace ma è "troppo compresso" e troppo tutto al neon: si passa alla
  versione 2 qui sotto.
- **Piano della versione 2** (approvato, da fare):
  - **Tavoli più grandi** (circa 640 × 1900 logici, alti due schermi) con **telecamera
    verticale** che segue la ghianda con anticipo e morbidezza (quando scende verso i
    flipper ci arriva prima la telecamera; nel multiball inquadra le ghiande più in basso);
    **mini mappa** del tavolo (nel pannello sugli schermi larghi, in un angolo sul
    telefono). Sul telefono si resta in verticale.
  - **Più flipper**: oltre ai due in basso un terzo a metà tavolo (a destra) e, dove serve,
    un quarto piccolo su un piano rialzato in alto; il giocatore simulato deve saperli
    usare tutti.
  - **Elementi meccanici dei flipper veri** (ognuno vestito secondo il tavolo):
    magneti che fermano e trattengono la ghianda (e la rilanciano o la spostano), bersagli
    che cadono a banchi con ripristino, bersagli fissi, bersagli che spuntano dal piano e
    si riabbassano, cartellini e sagome che si abbattono e si rialzano, espulsore verticale
    dalla buca a una rampa (la ghianda sale da sotto), tunnel sotto il campo (la ghianda
    sparisce e riesce altrove), deviatori sulle rampe che cambiano strada, rampe di filo
    metallico, giro della morte, palo che si alza tra i flipper (salva la ghianda), rimbalzo
    nelle corsie esterne, lancio automatico, blocco con le ghiande che si vedono ferme in
    fila, palla prigioniera (una ghianda chiusa in un corridoio da spingere in fondo),
    disco che gira sul piano e devia la ghianda, giocattolo che si muove e si colpisce
    (bersaglio da "picchiare"), mini campo rialzato, cancelletti a una via, spinner,
    corsie con i rollover.
  - **Un tavolo per ogni mondo degli altri giochi**, ognuno con un giocattolo e regole
    proprie: Radici della Quercia (legno, radici, torce, piolo d'oro che fa girare la
    ghianda, Ghianda d'Oro), Prato (erba, fiorellini, formiche che corrono, funghi), Spiaggia
    (faro che gira e illumina i tiri, castello di sabbia da abbattere, onda che spinge),
    Uffici della Tari (timbro gigante che scende, archivio coi cassetti, agente col retino
    come bersaglio mobile, ispettore capo come sfida), Firenze a fumetto (rampa sul Ponte
    Vecchio, tram che attraversa, onomatopee, contorni neri) e l'attuale Notte al neon come
    tavolo bonus. Nel menu si sceglie il tavolo; i tavoli si sbloccano coi punti.
  - **Grafica disegnata, non solo neon**: piano di gioco dipinto (prompt per Gemini come
    negli altri giochi, con un fondale di riserva disegnato nel codice), pareti di legno,
    plastica colorata o metallo cromato secondo il tavolo, lampade come inserti di plastica
    che si accendono; il neon solo per luci, scritte e momenti speciali (multiball,
    jackpot).
  - **Codice**: motore comune (fisica, flipper, rampe, elementi meccanici, telecamera,
    regole, suoni) e un file per tavolo descritto a dati in `games/tino-flipper/tavoli/`.
    Si tengono le regole che funzionano già (corsie, combo, multiball, jackpot, scenari,
    palla salvata, tilt), adattate a ogni tavolo.
  - **Tappe**: 1) motore grande con telecamera, flipper in più, primi elementi meccanici e
    il primo tavolo nuovo disegnato nel codice; 2) gli altri tavoli; 3) prompt per i
    fondali dipinti e rifinitura. Prima di iniziare: pianta del primo tavolo (anche come
    schizzo) e decisioni da prendere col proprietario. Ogni tavolo si controlla con partite
    simulate (la ghianda non deve uscire né incastrarsi) e si tara; si fa provare come
    artifact prima di unire.

## Per il prossimo gioco
- Cartella `games/<nome-gioco>/` con `index.html`, `stile.css`, `gioco.js`;
  riusare `css/sito.css`, la barra in alto e i pannelli (menu, pausa, fine)
  di Botta e Ghianda come modello.
- Aggiungere la scheda nella home e una voce in questo file e nel README.
- Usare le espressioni di Tino e le animazioni di Gino come descritto sopra.
- Provare su computer e su telefono (orizzontale e verticale) e tarare la
  difficoltà con partite simulate prima di pubblicare.
