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
  I livelli si modificano in `games/ghianda-d-oro/livelli.js`.
