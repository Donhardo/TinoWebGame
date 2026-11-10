# Tino Flipper · prompt per Gemini (Nano Banana Pro)

Tavolo: **Le radici della Quercia**. Tre immagini: il backglass e il piano di gioco
in due metà (Gemini non fa immagini alte 1:3 come il tavolo, quindi due metà 2:3
che il gioco unisce e sfuma).

Ogni riquadro qui sotto è già completo (stile comune + immagine): si copia così
com'è. Allegati da mettere insieme al testo:
- backglass: `guide/guida-backglass.png` (schema delle zone);
- piano, metà alta: `guide/guida-piano-alto.png` (dove vanno sentieri e radici);
- piano, metà bassa: `guide/guida-piano-basso.png` **e** la metà alta già fatta
  (per lo stesso stile e gli stessi colori).

**Com'è andata** (novembre 2026): il backglass è venuto bene al primo colpo. Il piano
Gemini l'ha fatto due volte **intero** (tavolo completo in 2:3, con fionde e corsie in
fondo) invece che in due metà; allungato fino all'1:3 del tavolo era troppo deformato e
non si usa. I prompt 2 e 3 qui sotto sono stati riscritti per chiedere un pezzo di prato
"a mappa" e non un tavolo da flipper (parola che fa disegnare a Gemini il tavolo intero).

Se un'immagine non va, si rifà: il gioco usa i PNG solo se ci sono, altrimenti
resta il disegno nel codice.

## Note per chi le prepara (non vanno nel prompt)

- **Niente Tino e Gino disegnati da Gemini**: la regola del sito vuole sempre le
  foto originali. Nel backglass Gemini lascia due posti liberi e il gioco ci mette
  sopra `tino-normale.png` e `gino.png`.
- **Backglass**: 3:4 verticale (es. 1536 × 2048). Si riduce a 600 × 800. Zone, in
  frazioni dell'altezza: titolo 3–18%, scena 20–67% (posto di Tino a sinistra,
  x 13–53%, posto di Gino a destra, x 63–82% e y 44–63%), sporgenza di radice su cui
  stanno in piedi a ~64%, finestra nera del display x 8–92% e y 70–91% (larga 3 volte
  l'alta), cornice in fondo. Dopo, nel codice (`DIPINTI.backglass` in
  `tavoli/radici.js`) si misurano finestra e sporgenza vere.
- **Piano**: due immagini 2:3 (es. 1024 × 1536 o 1696 × 2528). In gioco ognuna è
  660 × 990 (10 px per lato finiscono sotto la cornice): la alta copre y 0–990, la
  bassa y 910–1900; negli 80 px in comune la bassa sfuma sulla alta, quindi conta che
  il bordo basso della prima e quello alto della seconda si somiglino. Si riducono a
  ~940 px di larghezza (oltre non serve: gli strati del tavolo sono limitati a 2,6
  milioni di pixel). Il gioco ci disegna sopra pareti, rampe, nodi, flipper ecc.:
  per questo **nessun elemento di gioco** nel disegno.
- Preparazione: Gemini dà JPG/WebP → PNG; niente trasparenza (sono pieni), ritaglio
  delle strisce ripetute ai bordi se ci sono (come in Gino Volante), palette solo se
  non si vedono chiazze sull'erba (a 256 colori in Botta e Ghianda l'erba veniva a
  chiazze: si tiene a colori pieni, ~1 MB l'una).

## Stile comune

> Hand-painted storybook illustration, warm and sunny, soft cartoon style with gentle
> rounded shapes, clean soft outlines, rich but not neon colors, light cel shading and a
> subtle painted texture. Cheerful and cozy, for a children's pinball game about a toy
> squirrel living among the roots of a big oak. No people, no animals, no characters,
> no logos, no text unless requested.

## 1 · Backglass (`backglass-radici.png`)

```
Hand-painted storybook illustration, warm and sunny, soft cartoon style with gentle rounded shapes, clean soft outlines, rich but not neon colors, light cel shading and a subtle painted texture. Cheerful and cozy, for a children's pinball game about a toy squirrel living among the roots of a big oak. No people, no animals, no characters, no logos, no text unless requested.

Image: the backglass of a vintage pinball machine (the illuminated painted glass panel at the top of the cabinet), portrait 3:4. It must look like reverse-painted glass lit from behind: luminous colors, a glossy sheen, a carved wooden frame all around with a row of small warm light bulbs.
Follow the layout of the attached guide image exactly (use it only for positions, do not copy its flat colors):
- Top band (3% to 18% of the height): the title "TINO FLIPPER" in big chunky friendly letters, cream and orange with a dark brown outline, on a carved wooden sign hanging from two roots; under it, smaller, "Le radici della Quercia". Spell the text exactly like this.
- Middle (20% to 67%): the scene. The huge roots of an ancient oak form a cozy arch, with green moss, ivy, small mushrooms, clover, acorns, two glowing torches with warm flames and a golden peg glowing among the roots; sunlight from above, warm golden glow. Leave TWO EMPTY CLEAR AREAS with only a soft, plain, slightly blurred background (no roots, no objects, no details in them), because two photos of the characters will be placed there later: a big one on the left (from 13% to 53% of the width, from 24% to 64% of the height) and a smaller one on the right (from 63% to 82% of the width, from 44% to 63% of the height). Both stand on a thick mossy root running horizontally across the whole picture at about 64% of the height, like a stage.
- Lower band (70% to 91% of the height, from 8% to 92% of the width): a perfectly plain solid black rectangle with sharp corners, framed by a thin brass rim: it is the window of the score display. Nothing inside it, no reflections, no text.
- Around the black window and down to the bottom: dark carved oak wood with small acorn and oak-leaf ornaments.
No squirrel, no animals, no characters anywhere in the image.
```

Se il titolo viene scritto male: rifarla aggiungendo "Check the spelling: T-I-N-O F-L-I-P-P-E-R".

## 2 · Piano di gioco, metà alta (`piano-radici-alto.png`)

Allegare solo `guide/guida-piano-alto.png`.

```
Hand-painted storybook illustration, warm and sunny, soft cartoon style with gentle rounded shapes, clean soft outlines, rich but not neon colors, light cel shading and a subtle painted texture. Cheerful and cozy. No people, no animals, no characters, no logos, no text.

Image: a painted ground texture, portrait 2:3, seen exactly from above (top-down, orthographic, like a map: no perspective, no horizon, no sky, no tree trunk, no canopy). It is a piece of a sunny meadow, and it will be used as the background of the UPPER part of a much taller picture: it is NOT a whole pinball table and it is NOT a game board. It has no beginning and no end at the bottom: the meadow simply continues beyond the bottom edge.
Bright fresh green grass with short blades, clover, a few fallen oak leaves (green and a few golden), tiny white, yellow, lilac and pink flowers; smooth patches of light packed earth (pale sandy beige) and a few thin light-colored oak roots surfacing from the ground, with small pebbles; soft dappled sunlight, a little warmer at the top; a slightly darker green shade along the left and right edges.
Use the attached guide image as a map, exactly: light earth where the guide has beige shapes (same sizes and positions: a large oval near the top, a tall oval in the middle, a round patch in the lower part), thin roots where the guide has brown lines, grass everywhere else. Do not copy the guide's flat colors and blobby look: paint it properly.
Keep it calm and low in contrast, with no large dark areas.
Absolutely NO game elements of any kind: no flippers, no slingshots, no triangles, no lanes, no gutters, no drain, no paths shaped like rails or tracks, no walls, no ramps, no bumpers, no holes, no targets, no lights, no arrows, no frames, no borders. Only natural ground.
The bottom edge must look like the middle of a meadow, cut in two.
```

## 3 · Piano di gioco, metà bassa (`piano-radici-basso.png`)

Allegare la metà alta già venuta bene (prima immagine) **e** `guide/guida-piano-basso.png`
(seconda immagine).

```
Hand-painted storybook illustration, warm and sunny, soft cartoon style with gentle rounded shapes, clean soft outlines, rich but not neon colors, light cel shading and a subtle painted texture. Cheerful and cozy. No people, no animals, no characters, no logos, no text.

Image: a painted ground texture, portrait 2:3, seen exactly from above (top-down, orthographic, like a map: no perspective, no horizon, no sky, no tree). It is the continuation of the first attached image, directly BELOW it: same style, same colors, same grass, same lighting, same scale of details (flowers and leaves the same size). Its top edge must continue seamlessly the bottom edge of the first attached image. It is NOT a whole pinball table and it is NOT a game board: only the ground of a sunny meadow.
Bright fresh green grass with short blades, clover, a few fallen oak leaves, tiny white, yellow, lilac and pink flowers; smooth patches of light packed earth (pale sandy beige) and thin light-colored oak roots surfacing from the ground, with small pebbles; a slightly darker green shade along the left and right edges.
Use the second attached image (the guide) as a map, exactly: light earth where the guide has beige shapes (same sizes and positions: two rounded patches in the upper half, a wide rounded patch filling most of the lower half), thin roots where it has brown lines, grass everywhere else. Do not copy the guide's flat colors.
Keep it calm and low in contrast, with no large dark areas.
Absolutely NO game elements of any kind: no flippers, no slingshots, no triangles, no lanes, no gutters, no drain, no paths shaped like rails or tracks, no walls, no ramps, no bumpers, no holes, no targets, no lights, no arrows, no frames, no borders. Only natural ground, also at the bottom edge.
```

Se Gemini disegna ancora fionde o corsie: rifarla aggiungendo in fondo "This is a texture,
not a playfield: if you are drawing anything that looks like a pinball part, remove it."
