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
- `assets/tino/`, `assets/gino/` — immagini dei personaggi
- `games/<nome-gioco>/` — un gioco per cartella

## Giochi
- **Botta e Ghianda** (`games/botta-e-ghianda/`): Tino e Gino si rimandano una ghianda.
  Contro il computer (livelli sempre più difficili) o in due sulla stessa tastiera.
