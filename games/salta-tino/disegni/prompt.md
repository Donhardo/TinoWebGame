# Salta, Tino! · prompt per Gemini (Nano Banana Pro)

Stile scelto: **carta ritagliata** (collage di carta colorata a strati, come un diorama fatto in casa).

Ogni riquadro è già completo (stile + immagine): si copia così com'è. **F1 va fatto per primo**, in una chat
nuova e senza allegati: è il riferimento di stile. In tutti gli altri si allega F1 ("same style as the
attached image"). Conviene una chat nuova ogni tanto: in una chat già usata Gemini tende a ritoccare
l'immagine di prima invece di farne una nuova. Mandami le immagini col codice (es. R2).

Se un'immagine non va, si rifà: il gioco userà i PNG solo se ci sono, altrimenti resta il disegno nel codice.

## Note per chi le prepara (non vanno nel prompt)

- File: `fondali/` prato, tronco, chioma, cielo, stelle (F1-F5); `rami/` ramo, secco, radice, foglia, molla
  (R1-R5); `nuvole/` nuvola, secca, viola (N1-N3); `oggetti/` fungo, pigna, grandine, stella, pratiche,
  bolletta, luna (O1-O7); `poteri/` berretto, pale, calamita (P1-P3).
- Fondali: 9:16, il campo è largo 480 e alto 720-1040. F2-F5 si impilano in colonna (se la giunta si vede,
  una copia sì e una no specchiata in alto e in basso: per questo il cielo è di un colore piatto) e sfumano
  da una tappa all'altra come adesso; F1 sta sotto, una volta sola, con il prato al posto di quello del codice.
- Rami e nuvole: larghi in gioco 64-112 px e spessi ~14: si disegnano con le due estremità intere e il
  pezzo di mezzo ripetuto (come i fusti di Gino Volante). Il ramo a molla si specchia per il lancio a sinistra.
- Sfondo magenta tolto come negli altri giochi (trasparenza da quanto è magenta il pixel, solo nella zona
  di sfondo), poi ritaglio, riduzione e palette a 256 colori. Il bordino bianco di carta aiuta a staccare
  i pezzi dal fondale e a pulire i bordi.
- Restano disegnati nel codice: la bolla (è trasparente), le ghiande (`ghianda.svg`), Tino, Gino e gli
  agenti (foto e disegni originali).


## Fondali

### F1 · il prato alla base (da fare per primo, senza allegati)

```
Cut-paper collage style for a 2D vertical jumping game for children: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Background, portrait 9:16: the foot of a huge old oak tree in a sunny meadow. The bottom 25% is a green meadow of layered paper grass with small white, yellow and lilac paper flowers and clover, and a few thick roots spreading out from the trunk across the grass. The wide trunk of the oak, light brown paper bark with darker strips and a few knots, rises from the meadow in the center of the image (about 40% of the width) and goes out of the top edge. Behind, a sky of one flat light blue paper with two small white paper clouds. No branches, no leaves above. Keep the colors a little lighter and softer than the foreground pieces will be, and keep the central 40% of the width calm and low in contrast: the game's branches and characters are drawn on top of it.
```

### F2 · il tronco (striscia che si ripete)

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Background, portrait 9:16: a vertical section of the trunk of a huge oak tree, light brown paper bark with darker vertical strips, a few knots and one small dark hollow, filling the center of the image (about 40% of the width) from the top edge to the bottom edge. On both sides a sky of one flat light blue paper, with no clouds, no sun and no gradient, and a few small green paper leaves on twigs peeking from the trunk. Seamless vertically: the top edge must continue exactly into the bottom edge, so the image can be stacked in a tall column. Keep the colors a little lighter and softer than the foreground pieces will be, and keep the central 40% of the width calm and low in contrast: the game's branches and characters are drawn on top of it.
```

### F3 · la chioma (striscia che si ripete)

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Background, portrait 9:16: inside the crown of a huge oak tree. Big clusters of oak leaves cut from several greens of paper, thicker along the left and right edges, with the light brown trunk in the center (about 30% of the width) and a few thinner branches; small patches of flat light blue paper sky between the leaves, a few acorns. No gradient. Seamless vertically: the top edge must continue exactly into the bottom edge, so the image can be stacked in a tall column. Keep the colors a little lighter and softer than the foreground pieces will be, and keep the central 40% of the width calm and low in contrast: the game's branches and characters are drawn on top of it.
```

### F4 · il cielo (striscia che si ripete)

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Background, portrait 9:16: a bright sky of one flat blue paper, with no gradient, no sun and no birds, and soft white paper clouds of different sizes scattered across it, some large ones cut by the left and right edges, smaller ones in the middle. Far below nothing: only sky. Seamless vertically: the top edge must continue exactly into the bottom edge, so the image can be stacked in a tall column. Keep the colors a little lighter and softer than the foreground pieces will be, and keep the central 40% of the width calm and low in contrast: the game's branches and characters are drawn on top of it.
```

### F5 · le stelle (striscia che si ripete)

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Background, portrait 9:16: the night sky cut from one flat deep blue-violet paper, with no gradient and no moon, with many small five-pointed stars and dots cut from pale yellow and white paper scattered evenly, and two thin wisps of darker violet tissue-paper cloud. Seamless vertically: the top edge must continue exactly into the bottom edge, so the image can be stacked in a tall column. Keep the colors a little lighter and softer than the foreground pieces will be, and keep the central 40% of the width calm and low in contrast: the game's branches and characters are drawn on top of it.
```


## Rami

### R1 · ramo normale

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game platform, side view, very wide and thin (6:1): a straight oak branch with a flat top to stand on, brown paper bark with a lighter grain line along it and three small green paper oak leaves sticking up from the top. Both ends are cut and rounded. The middle part is uniform, so it can be stretched or repeated. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### R2 · ramo secco (si spezza)

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game platform, side view, very wide and thin (6:1): a dry dead branch made of pale beige and grey paper, with dark cracks across it, a few curled bits of peeling bark and no leaves. Both ends are splintered and broken. It must look fragile, clearly different from a healthy branch. The middle part is uniform, so it can be stretched or repeated. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### R3 · radice

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game platform, side view, very wide and thin (6:1): a thick knotted oak root, dark reddish-brown paper with a flat top to stand on, a little green paper moss on top and a few crumbs of earth hanging underneath. Both ends are cut and rounded. The middle part is uniform, so it can be stretched or repeated. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### R4 · foglia che va avanti e indietro

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game platform, side view, very wide and thin (5:1): one big bright green oak leaf lying flat and horizontal like a little raft, with its lobed edges, a lighter central vein along the whole length and thin side veins, the short stem at the right end. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### R5 · ramo a molla

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game platform, side view, very wide and thin (5:1): a young flexible branch of light yellow-green paper, slightly arched, with two small leaves on top and, at the right end, a curly tendril rolled up in a spiral. Under the middle of the branch hangs a short coiled spring made of a twisted strip of brown paper, about as tall as the branch is thick. It must look bouncy. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```


## Nuvole (rami del cielo e delle stelle)

### N1 · nuvola normale

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game platform, side view, very wide and thin (5:1): a fluffy white paper cloud made of overlapping rounded puffs in two layers of white and very pale blue paper, with a fairly flat top to stand on. The middle part is uniform, so it can be stretched. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### N2 · nuvola secca (svanisce)

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game platform, side view, very wide and thin (5:1): a thin, fragile grey cloud cut from translucent grey tissue paper, with torn ragged edges, a few holes and small pieces already coming off at the ends, as if it is about to dissolve. Clearly different from a normal white cloud. The middle part is uniform, so it can be stretched. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### N3 · nuvola viola (va avanti e indietro)

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game platform, side view, very wide and thin (5:1): a fluffy lilac and violet paper cloud made of overlapping rounded puffs, with a fairly flat top to stand on and three tiny pale yellow paper sparkles on it. The middle part is uniform, so it can be stretched. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```


## Oggetti

### O1 · fungo (fa saltare altissimo)

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game object, side view, square (1:1): a small mushroom with a round red paper cap with white paper dots and a short, thick cream paper stem, standing on the bottom edge. Cheerful and bouncy. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### O2 · pigna che cade

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game object, side view, portrait 2:3: a brown pine cone hanging tip down, made of rows of overlapping paper scales in two browns, with a short twig on top. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### O3 · chicco di grandine (cade nel cielo)

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game object, square (1:1): a round lumpy hailstone cut from pale icy blue and white paper, with a small white shine and a few faceted layers. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### O4 · stella cadente (cade tra le stelle)

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game object, portrait 1:2: a bright yellow five-pointed paper star in the bottom part of the image, with a tail of three pale yellow and white paper streamers going straight up from it to the top edge, getting thinner, as if it is falling down. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### O5 · pila di pratiche dell'ispettore (si ripete in altezza)

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game object, side view, square (1:1): a tall stack of office folders and paper files piled on top of each other, cut from pale yellow, light blue, pink, beige and light green paper, each folder a little offset to the left or right, white sheets sticking out of some, two red rubber stamp marks with the word TARI on the folders. The stack fills the whole height of the image. Seamless vertically: the top edge must continue exactly into the bottom edge, so the image can be stacked in a tall column. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### O6 · bolletta tirata dagli agenti

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game object, square (1:1): a white paper bill folded in half, a little crumpled, with grey lines of text and a big round red rubber stamp with the word TARI. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### O7 · luna

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game object, square (1:1): a pale yellow crescent moon cut from paper, with a few soft craters of slightly darker paper. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```


## Poteri

### P1 · berretto dell'elica (senza le pale)

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game object, side view, landscape 3:2: a round beanie cap made of segments of red, yellow, blue and green paper, with a short stalk sticking up from the top center. No propeller blades. The bottom edge of the cap is straight and horizontal, at the bottom of the image. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### P2 · pale dell'elica

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game object, side view, landscape 4:1: two propeller blades of a toy propeller cut from red and yellow paper, joined at a small round hub in the center, straight and horizontal. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```

### P3 · calamita

```
Cut-paper collage style for a 2D vertical jumping game for children, same style as the attached image: every shape is cut from colored construction paper and thin craft card, stacked in a few layers like a handmade shadow-box diorama, with soft short drop shadows between the paper layers, visible paper grain and fibers, slightly irregular hand-cut edges and an occasional torn edge. Flat matte colors, warm and cheerful palette, no glossy highlights, no gradients except the soft shadows between layers. Strict side view (orthographic, no perspective), no people, no animals, no characters, no logos, no text unless requested.

Game object, square (1:1): a red horseshoe magnet cut from paper, open side up, with the two tips covered in silver-grey paper. The object has a thin off-white paper rim around its outline. On a solid magenta #FF00FF background: the magenta must be perfectly flat and uniform, with no shadows, gradients or texture on it, and the object casts no shadow on it.
```
