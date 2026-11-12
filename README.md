# TinoWebGame
Un piccolo sito di minigiochi con Tino come protagonista.

Il sito è pubblicato con GitHub Pages: https://donhardo.github.io/TinoWebGame/

Si apre `index.html` (la home) in un browser: non serve nessuna installazione.
Per provarlo in locale con un piccolo server:

```bash
python3 -m http.server 8000
```

e poi si visita http://localhost:8000.

## Struttura
- `index.html`, `css/` — home del sito e stili comuni
- `assets/tino/`, `assets/gino/` — immagini dei personaggi (`assets/tino/accessori/`: cappello e frusta)
- `assets/agenti-tari/`, `assets/oggetti/` — agenti della Tari e oggetti di gioco
- `bozzetti/` — pagine di prova per i disegni
- `games/<nome-gioco>/` — un gioco per cartella

## Giochi
- **Botta e Ghianda** (`games/botta-e-ghianda/`): Tino e Gino si rimandano una ghianda.
  Contro il computer (livelli sempre più difficili) o in due sulla stessa tastiera.
- **Tino e la Ghianda d'Oro** (`games/ghianda-d-oro/`): avventura nel tempio con
  cappello e frusta, tra trappole, porte e agenti della Tari, per salvare Gino.
  Tre mondi completi, le radici della Quercia, il tempio sepolto e gli uffici della Tari
  (12 livelli; l'ultimo di ogni mondo con l'inseguimento dell'ispettore capo; alla fine
  si libera Gino con la Ghianda d'Oro).
  I livelli si modificano in `games/ghianda-d-oro/livelli.js`.
- **Tino Bum!** (`games/tino-bum/`): artiglieria a turni tra isole generate a
  caso. Si sceglie il mezzo (sei: catapulta, fionda gigante, mortaio di zucca,
  cannone a tappi, talpa trivella, soffiabolle) e due oggetti, si prende la mira
  e si tiene conto del vento. Contro Gino (livelli sempre più difficili), in due
  sullo stesso dispositivo o nella campagna contro gli agenti della Tari. Quattro
  ambientazioni: prato, spiaggia, bosco in autunno e uffici della Tari.
- **Gino Volante** (`games/gino-volante/`): Tino lancia Gino con l'altalena a
  bilico (tempismo!), Gino vola e poi apre una foglia per continuare a colpi d'ala
  tra fiori, tronchi e nuvole, dal prato al bosco fino al cielo. Un solo comando
  (Spazio, clic o tocco); vince la distanza più lunga, con il record salvato.
  Fondali, foglia-aliante e ostacoli sono dipinti (in `games/gino-volante/fondali/`
  e `ostacoli/`). Musica sintetizzata (si spegne a parte), tunnel di nuvole sempre più
  lunghi e stretti nel cielo, e un negozio dove si spendono le ghiande: foglie con un
  potere ciascuna e cappelli per Gino.
- **Ghiande e Mattoncini** (`games/ghiande-e-mattoncini/`): gioco a mattoncini.
  Si sceglie se giocare con Tino (asse di legno) o Gino (foglia di quercia), si fa
  rimbalzare la ghianda e si rompono tutti i mattoncini. 20 livelli in quattro mondi
  (prato, spiaggia, bosco d'autunno, uffici della Tari), sempre più veloci; alla fine
  di ogni mondo un boss: gli agenti della Tari col retino e col timbro, e alla fine
  l'ispettore capo, che lanciano bollette e rimettono mattoncini; mattoncini
  resistenti, indistruttibili, petardi e sorprese; potenziamenti (asse lunga, tre
  ghiande, miele, ghianda di fuoco, fionda, lumaca, siepe, vita) e due dispetti (asse
  corta, vespa). Suoni e musica sintetizzati. I livelli si modificano in
  `games/ghiande-e-mattoncini/livelli.js`.
- **Sparabolle** (`games/sparabolle/`): Tino spara bolle di ghiande, bacche e fiori
  con una canna di bambù, Gino gli prepara la bolla dopo. Tre bolle uguali vicine
  scoppiano, quelle rimaste staccate dal ramo cadono. Avventura a livelli (il ramo
  scende ogni tot tiri a vuoto): 24 livelli in quattro mondi (prato, spiaggia, bosco in
  autunno, uffici della Tari) con bolle speciali (petardi, arcobaleni, fulmini, gelate,
  sassi, chiavi e lucchetti, bollette che si moltiplicano), robivecchi da collezionare,
  potenziamenti guadagnati con le combinazioni e un agente della Tari da colpire alla
  fine di ogni mondo. Poi infinito (righe nuove a tempo) e due giocatori a campi
  affiancati, con gli attacchi che mandano righe all'avversario. I livelli si modificano
  in `games/sparabolle/livelli.js`.
- **Tino Pro Skate** (`games/tino-pro-skate/`): Tino corre sullo skate per le strade di
  Firenze per recuperare lo skate di Gino, rubato dall'ispettore capo della Tari. Salti,
  trick in aria (Giglio, presa, frontflip e backflip con ← →: bisogna atterrare dritti),
  scivolate su panchine e ringhiere, manual e combo (anche atterrando un po' storti),
  accucciata con ↓ per passare sotto le transenne alte e prendere velocità, half pipe da
  cui si esce tenendo →;
  si abbattono gli agenti della Tari saltandoci in testa. La Grinta (3 tacche) si
  carica con i trick: una tacca per lo Sfondamento, tre per la Botta di Grinta che
  stordisce tutti. Corsa infinita (anche con Gino) attraverso quattro quartieri di Firenze,
  ognuno con fondali e ostacoli propri: le Cascine, Novoli (scalinata col corrimano, corrimano
  lunghi, fioriere, monopattini), i cantieri della tramvia (ruspa con la benna che sale e
  scende, fango che rallenta, rotaie, il tram, barriere, lo scavo al posto della half pipe) e
  il centro (sampietrini che fanno tremare, turisti, bancarelle, bici, il Ponte Vecchio sullo
  sfondo); nel menu si sceglie da quale quartiere partire (si sblocca arrivandoci). Grafica a
  fumetto (fondali a tre strati ed elementi dipinti con Gemini in `disegni/`, contorni neri
  attorno alle foto, onomatopee) e musica punk sintetizzata. Modalità storia in quattro
  capitoli (uno per quartiere), ognuno con l'inseguimento finale dell'ispettore capo su un
  mezzo (Ape, monopattino, carrello del cantiere, golf cart): quando il mezzo si inceppa gli
  si salta in testa; vignette tra un capitolo e l'altro e finale sul Ponte Vecchio.
  Lungo la strada ci sono potenziamenti da prendere saltando (casco, ruote d'oro, calamita,
  bombolone, schiacciata all'olio, lampredotto) e una ruota sgonfia da evitare; con le
  ghiande raccolte si comprano nel negozio tavole con piccoli poteri.
- **Tino Flipper** (`games/tino-flipper/`): flipper senza storia, solo per divertirsi.
  Il tavolo nuovo, *Le radici della Quercia*, è alto due schermi: la telecamera segue la
  ghianda (con una mini mappa del tavolo intero, o il tasto V per vederlo tutto). Quattro
  flipper (uno a metà tavolo e uno nella galleria alta di assi), la radice lunga col
  deviatore, il giro della morte con la liana, la buca del ghiro con il tunnel e il pozzo
  che porta nella galleria, sassi che cadono, cartelli che si abbattono, il piolo d'oro che
  gira, la resina che ferma la ghianda, il cece nel cunicolo, l'agente col timbro da
  stordire e la dispensa con le ghiande in fila per il multiball. Quattro avventure (le
  torce, la frana, la chiave, l'inseguimento) e il finale della Ghianda d'Oro. Il vecchio
  tavolo al neon resta come tavolo bonus (`neon/`). Suoni e musica sintetizzati, con il
  riverbero del mobile, il rotolamento della ghianda e i suoni meccanici (solenoidi,
  campanelle, knocker); display a matrice di punti, illuminazione generale che si
  spegne col tilt, flasher, match a fine partita; sette robivecchi da guadagnare con
  le imprese del tavolo; classifica dei cinque migliori punteggi per tavolo.
- **Salta, Tino!** (`games/salta-tino/`): Tino salta da solo di ramo in ramo su per la
  grande quercia e si sposta solo a destra e a sinistra (frecce, mouse o dito su una metà
  dello schermo; sul telefono si può scegliere anche l'inclinazione); uscendo da un lato
  rientra dall'altro. Salita infinita a tappe (le radici, il tronco, la chioma, il cielo,
  le stelle), con rami secchi e nuvole che si rompono, foglie e nuvole che vanno avanti e
  indietro, funghi che fanno saltare altissimo, agenti della Tari da stordire saltandoci
  in testa (quello col timbro tira bollette), rami a molla, pigne (grandine e stelle
  cadenti più in alto) annunciate da un avviso, raffiche di vento nel cielo, l'ispettore
  capo che ogni 500 m sale su una pila di pratiche e va seminato, ghiande e tre poteri
  (cappello a elica, bolla, calamita). Record dei metri; suoni e musica sintetizzati.
