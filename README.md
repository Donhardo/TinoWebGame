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
