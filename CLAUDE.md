# Hinweise fuer Claude Code

Pixel Forge: statische Browser-Seite (kein Build, kein Framework, keine Abhaengigkeiten), die
Pixelart-Figuren aus Code erzeugt und fuer Godot 4 exportiert. Sprache der Oberflaeche und der
Commits: Deutsch.

## Regeln

- **Keine Bilddateien als Asset-Quelle.** Alles wird in `src/` gemalt. Neue Teile (Frisur, Hut,
  Waffe) bekommen Formen in `character.js` fuer **alle drei** Ansichten (`drawDown`, `drawUp`,
  `drawSide`); rechts ist automatisch gespiegelt.
- **Farben nie direkt setzen, sondern Teile mit einer Grundfarbe anlegen** (`P.part(name, hex)`).
  Die Leiter kommt aus `makeRamp()`, die Schattierung aus `Painter.shadeLevel()`. Feste Stufen nur
  fuer Glanzlichter (`setLevel`).
- Reihenfolge von `P.part()` = Tiefe: spaeter angelegt liegt vorne.
- Das Sheet-Layout (`sheetLayout()`) und die Animationsnamen sind die Schnittstelle zu Godot.
  Wer sie aendert, bricht bestehende `.tres`-Dateien der Nutzer.

## Pruefen

```bash
python3 -m http.server 8000   # dann /index.html und /gallery.html?z=3
```

Nach jeder Aenderung an `character.js`/`painter.js`/`palette.js` die Galerie per Screenshot
ansehen (Playwright, Chromium unter /opt/pw-browsers/chromium). Es gibt keine Tests - das Bild ist
der Nachweis.
