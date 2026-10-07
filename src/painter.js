// Painter: man legt FORMEN in Teilen ("parts") an, die Schattierung rechnet der
// Painter selbst aus. Dadurch muss niemand jedes Pixel einzeln einfaerben, und
// alle Figuren bekommen automatisch dieselbe Lichtfuehrung (Licht von links oben).
//
// Regeln der Schattierung je Pixel:
//  - Kante zum Leeren oben/links: heller (Licht faellt darauf)
//  - Kante zum Leeren unten/rechts: dunkler
//  - liegt ein Teil davor (spaeter gemalt), wirft es Schatten -> dunkler.
//    So trennen sich z. B. Arm und Oberkoerper trotz gleicher Farbe.
//  - je weiter unten im Teil, desto dunkler (sanfter Verlauf)

import { makeRamp, outlineFor, hexToRgb, BASE_LEVEL } from './palette.js';

const EMPTY = -1;

export class Painter {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.parts = [];
    this.pix = new Int16Array(w * h).fill(EMPTY);
    this.levelOverride = new Int8Array(w * h).fill(-1);
    this.flatColor = new Array(w * h).fill(null);
    this.ox = 0; // Verschiebung fuer alles, was gemalt wird (Wippen beim Laufen)
    this.oy = 0;
  }

  /**
   * Neues Teil. Teile, die spaeter angelegt werden, liegen vorne.
   * opts.shift: ganze Leiter verschieben (-1 = Teil liegt weiter hinten, dunkler)
   * opts.flat: feste Farbe ohne Schattierung (Augen)
   * opts.soft: schwaechere Schattierung (Gesicht)
   */
  part(name, hex, opts = {}) {
    const p = {
      id: this.parts.length,
      name,
      ramp: hex ? makeRamp(hex) : null,
      shift: opts.shift || 0,
      flat: opts.flat || null,
      soft: !!opts.soft,
      noShade: !!opts.noShade,
      minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity,
    };
    this.parts.push(p);
    return p;
  }

  at(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return EMPTY;
    return this.pix[y * this.w + x];
  }

  px(p, x, y) {
    x += this.ox; y += this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.pix[i] = p.id;
    this.levelOverride[i] = -1;
    this.flatColor[i] = null;
  }

  erase(x, y) {
    x += this.ox; y += this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.pix[y * this.w + x] = EMPTY;
  }

  rect(p, x, y, w, h) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(p, x + i, y + j);
  }

  /** Senkrechte oder waagerechte/diagonale Linie (Bresenham). */
  line(p, x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(p, x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /**
   * Form aus Textzeilen. '#' = Pixel des Teils, '.'/' ' = nichts,
   * 'x' = vorhandene Pixel loeschen, Ziffern 0-5 = Pixel mit fester Leiterstufe.
   */
  rows(p, x, y, lines, { flipX = false } = {}) {
    lines.forEach((line, j) => {
      const len = line.length;
      for (let i = 0; i < len; i++) {
        const c = line[flipX ? len - 1 - i : i];
        if (c === '.' || c === ' ') continue;
        if (c === 'x') { this.erase(x + i, y + j); continue; }
        this.px(p, x + i, y + j);
        if (c >= '0' && c <= '5') this.setLevel(x + i, y + j, +c);
      }
    });
  }

  /** Feste Leiterstufe fuer einen schon gemalten Pixel (z. B. Glanzlicht im Haar). */
  setLevel(x, y, level) {
    x += this.ox; y += this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.levelOverride[y * this.w + x] = level;
  }

  /** Pixel mit fester Farbe in ein Teil malen (Augen, Edelsteine). */
  color(p, x, y, hex) {
    this.px(p, x, y);
    x += this.ox; y += this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.flatColor[y * this.w + x] = hex;
  }

  /** Spiegelt die gesamte bisherige Zeichnung (fuer Blick nach rechts). */
  mirror() {
    const { w, h } = this;
    for (const arr of [this.pix, this.levelOverride, this.flatColor]) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w / 2; x++) {
          const a = y * w + x, b = y * w + (w - 1 - x);
          const t = arr[a]; arr[a] = arr[b]; arr[b] = t;
        }
      }
    }
  }

  /** Rechnet Farben aus und liefert RGBA-Daten. outline: 'color' | 'dark' | 'none' */
  render({ outline = 'color', outlineHex = '#1a1020' } = {}) {
    const { w, h, parts, pix } = this;
    for (const p of parts) { p.minX = p.minY = Infinity; p.maxX = p.maxY = -Infinity; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const id = pix[y * w + x];
      if (id === EMPTY) continue;
      const p = parts[id];
      if (x < p.minX) p.minX = x; if (x > p.maxX) p.maxX = x;
      if (y < p.minY) p.minY = y; if (y > p.maxY) p.maxY = y;
    }

    const out = new Uint8ClampedArray(w * h * 4);
    const put = (i, hex) => {
      const [r, g, b] = hexToRgb(hex);
      out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = 255;
    };

    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const id = pix[i];
      if (id === EMPTY) continue;
      const p = parts[id];
      if (this.flatColor[i]) { put(i, this.flatColor[i]); continue; }
      if (p.flat) { put(i, p.flat); continue; }
      let level = this.levelOverride[i];
      if (level < 0) level = this.shadeLevel(x, y, p);
      level = Math.max(0, Math.min(5, level + p.shift));
      put(i, p.ramp[level]);
    }

    if (outline !== 'none') {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (pix[y * w + x] !== EMPTY) continue;
        let nb = EMPTY;
        for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
          const n = this.at(x + dx, y + dy);
          if (n !== EMPTY) { nb = n; break; }
        }
        if (nb === EMPTY) continue;
        const p = parts[nb];
        const hex = outline === 'dark' || !p.ramp ? outlineHex : outlineFor(p.ramp);
        put(y * w + x, hex);
      }
    }
    return out;
  }

  shadeLevel(x, y, p) {
    if (p.noShade) return BASE_LEVEL;
    const rel = (n) => (n === EMPTY ? 'empty' : n === p.id ? 'same' : n > p.id ? 'over' : 'under');
    const W = {
      //        leer  davor  dahinter
      up:    { empty: 0.9, over: -0.9, under: 0.5 },
      left:  { empty: 0.4, over: -0.6, under: 0.2 },
      right: { empty: -0.8, over: -0.6, under: -0.3 },
      down:  { empty: -0.7, over: -0.3, under: -0.3 },
    };
    let s = 0;
    const add = (dir, n) => { const r = rel(n); if (r !== 'same') s += W[dir][r]; };
    add('up', this.at(x, y - 1));
    add('left', this.at(x - 1, y));
    add('right', this.at(x + 1, y));
    add('down', this.at(x, y + 1));
    const hgt = p.maxY - p.minY;
    const t = hgt > 0 ? (y - p.minY) / hgt : 0.5;
    s -= (t - 0.35) * 1.1;
    if (p.soft) s *= 0.6;
    // Haut nie bis in die tiefste Stufe: die ist fuer Haut zu rot und wirkt wie eine Linie
    return Math.max(p.soft ? 2 : 1, Math.min(4, Math.round(BASE_LEVEL + s)));
  }
}
