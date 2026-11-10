# Tino Flipper · Revisione tecnica e grafica (novembre 2026)

Revisione della versione 2 (motore comune + tavolo *Le radici della Quercia*),
con l'obiettivo di avvicinarla a un flipper vero in luci, suoni e fisica.
La prima parte dice **cosa è stato fatto** in questa revisione (già nel codice);
la seconda è l'**elenco delle proposte** da decidere col proprietario, in ordine
di resa per fatica. In fondo, i numeri delle partite simulate e come continuare.

## 1. Com'era

- Fisica solida (passo 1/960 s, urti cerchio-segmento, flipper a capsula) ma
  **senza attrito tangenziale**: la ghianda scivolava lungo pareti e flipper
  senza mai perdere velocità di striscio né prendere rotazione; la rotazione
  disegnata era finta (proporzionale alla velocità).
- Luci: lampade sì, ma **accese/spente di colpo**, nessuna illuminazione
  generale (il tavolo resta identico col tilt o a partita finita), un solo
  lampo bianco su tutto lo schermo per i jackpot.
- Suoni: buoni ma "asciutti" (nessun riverbero, nessun suono continuo); mancavano
  i suoni meccanici che fanno "flipper": solenoide che ricade, campanella dei
  bumper, knocker, molla dello stantuffo, scolo della palla.
- Display: una targa con il testo luminoso (`shadowBlur` a ogni fotogramma, costoso).
- Il **tiro da maestro era impossibile**: la ghianda lanciata seguiva tutta la
  volta e scendeva a sinistra senza mai entrare nelle corsie T·I·N·O (misurato:
  1 lancio su 180 entrava in una corsia).
- Il tavolo era scelto nel codice (`TF.tavoli.radici`): niente di pronto per
  la tappa 2 (più tavoli).
- I copioni delle partite simulate non erano nel repository.

## 2. Fatto in questa revisione

### Fisica (`motore.js`)
- **Attrito di Coulomb** negli urti veri (velocità normale sopra 120 px/s):
  la spinta tangenziale è al massimo μ volte quella normale (pareti 0,12,
  gomme 0,2, flipper 0,25). La ghianda che picchia di striscio perde un po' di
  velocità lungo la superficie. Il primo tentativo (una frazione fissa a ogni
  contatto) fermava la ghianda sulle superfici inclinate: 30 incastri a partita.
  Con l'attrito solo sugli urti: zero incastri, zero uscite, partite come prima.
- **Spin**: la ghianda prende rotazione negli urti (`p.spin`, cala del 60% al
  secondo in volo) e il disegno la usa: rotola davvero lungo il flipper.
- **Zone** (`m.zona`): cerchi che non urtano ma sentono la ghianda (servono ai
  robivecchi; nelle prove del giocatore simulato valgono come esito).

### Luci (`gioco.js`)
- **Illuminazione generale** (`stato.gi`, `illuminazione()`): il campo si
  scurisce col tilt (30%), a fine palla (62%) e a partita finita (45%), con
  dissolvenza; nel multiball pulsa leggermente.
- **Flasher** (`G.flasher`, `T.flasher`): lampi di luce colorata in quattro
  punti del tavolo (dietro i nodi, in cima alla radice lunga, sull'anello,
  sulla resina) nei momenti forti; il lampo bianco su tutto lo schermo è più
  leggero (0,22 invece di 0,35).
- **Lampade con dissolvenza**: ogni lampada ha uno stato (per posizione) e si
  accende in ~40 ms e si spegne in ~90 ms come una lampadina a incandescenza;
  accesa ha il centro più chiaro (la lampadina sotto l'inserto).
- **Modalità attrazione**: nel menu un'onda di luce attraversa il tavolo.
- **Ghianda**: riflesso che si sposta secondo la posizione rispetto alla luce,
  secondo riflesso basso, ombra più larga e lontana sulle rampe; a più di 1100
  px/s **sfocatura di movimento** (due o tre copie sbiadite) al posto della scia
  al neon.
- **Flipper**: copia sbiadita all'angolo di un istante prima mentre batte.
- **Nodi (bumper)**: al colpo l'anello "salta" (si allarga e sbiadisce) e il
  cappello si gonfia; paletti con l'anello di gomma.
- **Vetro**: riflesso diagonale leggero e fisso sullo schermo (`colori.vetro:
  false` per toglierlo in un tavolo).
- **Display a matrice di punti** nel pannello di sinistra: 128 × 32 punti
  arancioni come i DMD veri, in alto palla e bonus, sotto il punteggio o il
  messaggio del momento (ogni schermata si prepara una volta, cache per testo).
- `testoLuce` senza `shadowBlur` (alone a tre passate).
- Stantuffo disegnato con molla e piattello, misure prese dal tavolo
  (`lancio.yStantuffo`).

### Suoni (`motore.js`)
- **Riverbero del mobile**: risposta all'impulso generata nel codice (0,45 s),
  mandata al 16% da tutti gli effetti.
- **Rotolamento continuo** (`A.rotola`): rumore filtrato che cresce con la
  velocità della ghianda più veloce, più grave sulle rampe di legno.
- Nuovi effetti: `flipperGiu` (il flipper che ricade), `knocker` (palla extra e
  match), `scolo` (la ghianda nella vaschetta), campanella di metallo nei
  `bumper`, molla che scatta nello `stantuffo` (`lancio`), clack dei flipper
  nel `tilt`, `robivecchio` e `impresa`.

### Regole da flipper vero
- **Match** a fine partita: due cifre contro le ultime due del punteggio
  (12% di probabilità); se escono, knocker e una palla in più alla prossima
  partita (`localStorage` `tino-flipper:match`).
- **Guida delle corsie**: un muretto di legno a sinistra delle corsie
  T·I·N·O prende la ghianda che arriva lungo la volta e la fa scendere nelle
  corsie. Ora il lancio decide la corsia: pieno (0,7–1) → T o I, a metà (0,65)
  → qualunque, debole (sotto 0,65) → non arriva. Il tiro da maestro è un gioco
  di tempismo con la lettera che lampeggia.
- **Robivecchi** (vedi CLAUDE.md): sette imprese, oggetto in un punto difficile,
  zona che lo sente, collezione salvata, pannelli.

### Tecnica
- Il tavolo si sceglie con `?tavolo=<id>` nell'indirizzo (ogni tavolo in
  `tavoli/<id>.js`, incluso da `index.html`); senza, le Radici.
- `games/tino-flipper/prove/partite.js`: partite simulate con Playwright
  (livelli preciso/bravo/medio/principiante), stampa durata, punti, avventure,
  multiball, uscite, incastri, dove si perde, tiri, imprese e robivecchi.
- Prestazioni misurate in Chromium senza GPU (non rappresentativo del
  telefono, ma utile per confronti): il tempo del fotogramma è quasi tutto
  rasterizzazione (`(program)` 89%), la logica è 0,2 ms. **Da verificare su un
  telefono vero** con la ×4 CPU throttling come per Tino Pro Skate.

## 3. Proposte (da decidere col proprietario)

Ordinate per resa rispetto alla fatica. Nessuna è iniziata.

### Grafica
1. **Lampadine dell'illuminazione generale lungo le pareti** (facile): una fila
   di piccole lampadine bianco-calde lungo il bordo del tavolo e sotto le rampe,
   che seguono `stato.gi` (si spengono col tilt, lampeggiano nei jackpot).
   È quello che più fa "flipper" guardandolo.
2. **Animazioni meccaniche** (facile): i sassi che cadono con una rotazione
   all'indietro invece di sparire, i cartelli che si abbattono ruotando, il
   sasso che spunta che sale da sotto, il deviatore che scatta con un rimbalzo.
3. **Grembiule (apron)** in basso (facile): la zona sotto i flipper come un
   grembiule di legno con due cartoline (istruzioni e punteggi) e le lampade
   del bonus sopra.
4. **Backglass dipinto** (media, serve Gemini): il pannello di sinistra come il
   vetro posteriore di un flipper vero, con un'illustrazione di Tino e Gino tra
   le radici e il display a matrice sotto; sul telefono un'anteprima piccola.
5. **Piano di gioco dipinto** (media, serve Gemini; già nel piano, tappa 3):
   prompt nello stile degli altri giochi; lo strato di fondo lo usa se c'è.
6. **Spessore delle pareti** (media): pareti con una faccia laterale in ombra e
   la cima chiara, ombre proiettate coerenti con la luce dall'alto; le rampe
   con i piloni di sostegno.
7. **Prospettiva leggera** (difficile, da evitare): inclinare tutto il campo
   cambierebbe disegno, urti del dito e telecamera. Non consigliata.

### Suoni
1. **Suono di impatto col vetro** (facile): quando la ghianda scende dalla
   galleria o esce dal pozzo molto veloce, un "tac" sul vetro.
2. **Campanelle a tre toni** (facile): nei flipper elettromeccanici i bonus
   suonano con tre campanelle; usarle per le corsie e il bonus di fine palla
   invece delle note sintetiche.
3. **Ronzio del mobile** (facile): un ronzio bassissimo (50 Hz) sotto tutto,
   che si sente solo nei silenzi; da provare, potrebbe dare fastidio.
4. **Suoni per il legno vero** (media): registrazioni brevi (.ogg di pochi KB)
   per flipper, bumper e scolo al posto della sintesi; cambierebbe la regola
   "nessun file" degli altri giochi, da decidere.

### Regole e gioco
1. **Status report** (facile): tenendo premuto un flipper per 2 s il display
   mostra a rotazione avventure fatte, chiavi, robivecchi, record.
2. **Iniziali in classifica** (facile): a nuovo record tre lettere scelte coi
   flipper e il lancio, come nei flipper veri.
3. **Live catch e cradle** (da provare): con l'attrito nuovo dovrebbe essere
   possibile fermare la ghianda sul flipper alzato; da provare con persone vere
   e, se non basta, alzare `attritoFlipper` o abbassare `FLIPPER.e`.
4. **Tilt a pendolo** (facile): invece del conteggio a scatti, un pendolo che
   oscilla e si smorza; l'avviso quando tocca il bordo (più fedele e più
   leggibile: si può disegnare nel pannello).
5. **Ball search** (facile): se la ghianda è ferma 3 s, prima di lo scossone
   gratis far scattare bumper e fionde vicini come fanno i flipper veri.

### Tecnica
1. **Strati ritagliati** (facile): galleria e rampe si disegnano solo nella
   loro area (ora tre `drawImage` a finestra intera per fotogramma).
2. **Pannelli laterali solo quando cambiano** (facile): ora si ridisegnano
   ogni tre fotogrammi anche se uguali.
3. **Menu dei tavoli** (tappa 2): scelta del tavolo nel menu e sblocco coi punti.
4. **Prove su telefono vero** con CPU throttling ×4 (come per Tino Pro Skate):
   se un fotogramma supera 16 ms, togliere le sfocature di movimento e i
   flasher sui telefoni (`touch`).

## 4. Numeri

Partite simulate (`prove/partite.js`, giocatore medio: errore 35 ms, mira 35%,
6 partite fino a 10–12 minuti):

| | prima | dopo |
|---|---|---|
| minuti a partita | 6,2 | 7,7–9,6 |
| ghiande fuori dal tavolo | 0 | 0 |
| ghiande incastrate | 0 | 0 |
| avventure a partita | 1,7 | 2,0–2,8 |

Il giocatore preciso (4 ms, mira 90%) arriva sempre a 12–15 minuti con tutte e
quattro le avventure e una volta su sei alla Ghianda d'Oro. Le variazioni sono
dentro il rumore di 6 partite.

## 5. Come continuare

Tutto quello che serve è nel repository e in CLAUDE.md (sezione Tino Flipper):
- il piano della versione 2 (tappe 2 e 3) e le decisioni prese;
- i robivecchi fatti e come sono fatti (`G.impresa`, `T.ROBIVECCHI`, zone);
- il copione delle partite simulate (`prove/partite.js`) da far girare prima e
  dopo ogni modifica alla fisica o al tavolo: le righe "fuori" e "ferme" devono
  restare a zero;
- questo elenco di proposte, da cui scegliere.
