// Farbleitern: aus EINER Grundfarbe werden sechs Toene von dunkel nach hell.
// Der Trick, der Pixelart "gemalt" aussehen laesst: Schatten werden kuehler und
// satter (Farbton wandert Richtung Blau-Violett), Lichter waermer und weicher
// (Richtung Gelb). Eine reine Helligkeitsleiter wirkt dagegen grau und platt.

export const RAMP_SIZE = 6;
export const BASE_LEVEL = 3; // Index der gewaehlten Farbe in der Leiter

export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb([h, s, l]) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Farbton um `amount` Grad in Richtung `target` drehen (kuerzester Weg). */
function hueToward(h, target, amount) {
  let d = ((target - h + 540) % 360) - 180;
  const step = Math.sign(d) * Math.min(Math.abs(d), amount);
  return h + step;
}

const rampCache = new Map();

/**
 * Sechsstufige Leiter, Index 3 ist (fast) die gewaehlte Farbe.
 * Index 0 ist fast schwarz und wird fuer Umrisse benutzt.
 */
export function makeRamp(hex) {
  const key = hex.toLowerCase();
  if (rampCache.has(key)) return rampCache.get(key);
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const grey = s < 0.08; // Grau bleibt grau, bekommt nur einen Hauch Temperatur
  const ramp = [];
  for (let i = 0; i < RAMP_SIZE; i++) {
    const d = i - BASE_LEVEL;
    let hh = h, ss = s, ll = l;
    if (d < 0) {
      const k = -d;
      hh = grey ? 250 : hueToward(h, 255, 6 * k);
      ss = grey ? 0.06 + 0.04 * k : clamp(s + 0.03 * k, 0, 0.85);
      ll = l * Math.pow(0.74, k) - 0.012 * k;
    } else if (d > 0) {
      hh = grey ? 50 : hueToward(h, 55, 10 * d);
      ss = grey ? 0.05 : clamp(s - 0.08 * d, 0, 1);
      ll = l + (1 - l) * 0.3 * d + 0.02;
    }
    ramp.push(rgbToHex(hslToRgb([hh, clamp(ss, 0, 1), clamp(ll, 0.035, 0.97)])));
  }
  rampCache.set(key, ramp);
  return ramp;
}

/** Umrissfarbe zu einer Leiter: noch dunkler als Stufe 0, leicht violett. */
export function outlineFor(ramp) {
  const [h, s, l] = rgbToHsl(hexToRgb(ramp[0]));
  return rgbToHex(hslToRgb([hueToward(h, 275, 25), clamp(s * 0.8 + 0.1, 0, 0.6), clamp(l * 0.75, 0.03, 0.12)]));
}

/** Kuratierte Startfarben, damit man nicht mit haesslichen Toenen anfaengt. */
export const SWATCHES = {
  skin: ['#f3c9a5', '#e8b089', '#d39a6e', '#b87a52', '#8e5a3b', '#5e3a28', '#c7d7a0', '#9db8d8'],
  hair: ['#2a2230', '#5a3a22', '#8a5530', '#c08a3e', '#e6c46a', '#b3412c', '#d9d4cc', '#3d5fa8', '#7a4b9a', '#4f8f5a'],
  eyes: ['#3b6fb0', '#4f8a3c', '#6b4a2a', '#2a2a3a', '#8a3fa8', '#c0442e'],
  cloth: [
    '#2f8f86', '#3b5fae', '#2a3b6e', '#8c2f3a', '#c4533a', '#d9a33a', '#4f8a3c', '#2f5a3a',
    '#6a3f8a', '#a8a4b8', '#e8dcc0', '#6b4a34', '#4a4a5e', '#2a2630', '#9aa7b5', '#b8862e',
  ],
  metal: ['#9aa7b5', '#c9b26a', '#b87a52', '#5e6878'],
};
