import { renderFrame, FRAME, DIRECTIONS, ANIMATIONS, OPTIONS, DEFAULT_SPEC, PRESETS } from './character.js';
import { renderSheet, godotSpriteFrames, download, canvasToBlob, scaledCanvas, safeName } from './export.js';
import { SWATCHES, makeRamp } from './palette.js';

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'pixel-forge.saved';

let spec = loadFromHash() || { ...PRESETS.Held };
let dir = 'down';
let anim = 'walk';
let bg = 'grass';
let frames = {}; // `${anim}_${dir}` -> [ImageData]

const COLOR_FIELDS = [
  ['skin', 'Haut', 'skin'],
  ['hair', 'Haare', 'hair'],
  ['eyes', 'Augen', 'eyes'],
  ['top', 'Oberteil', 'cloth'],
  ['shirt', 'Hemd', 'cloth', (s) => s.outfit === 'vest'],
  ['bottom', 'Hose/Rock', 'cloth'],
  ['boots', 'Stiefel', 'cloth'],
  ['accent', 'Akzent', 'cloth'],
  ['capeColor', 'Umhang', 'cloth', (s) => s.cape],
  ['hatColor', 'Hut', 'cloth', (s) => s.hat !== 'none' && s.hat !== 'circlet'],
  ['metal', 'Metall', 'metal', (s) => s.weapon === 'sword' || s.weapon === 'axe'],
];

const SELECT_FIELDS = [
  ['hairStyle', 'Frisur'],
  ['outfit', 'Kleidung'],
  ['hat', 'Kopf'],
  ['weapon', 'Waffe'],
  ['beard', 'Bart'],
];

const OUTLINE = { color: 'Umriss farbig', dark: 'Umriss dunkel', none: 'Kein Umriss' };

// ---------------------------------------------------------------------------
// Aufbau der Bedienelemente
// ---------------------------------------------------------------------------

function buildControls() {
  const sel = $('selects');
  sel.innerHTML = '';
  for (const [key, label] of SELECT_FIELDS) {
    sel.appendChild(selectField(key, label, OPTIONS[key]));
  }
  sel.appendChild(selectField('outline', 'Umriss', OUTLINE));

  const tg = $('toggles');
  tg.innerHTML = '';
  tg.appendChild(checkField('cape', 'Umhang'));
  tg.appendChild(checkField('blush', 'Rote Wangen'));

  buildColors();
  $('name').value = spec.name || '';
}

function selectField(key, label, options) {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  wrap.textContent = label;
  const s = document.createElement('select');
  for (const [value, text] of Object.entries(options)) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    s.appendChild(o);
  }
  s.value = spec[key] ?? Object.keys(options)[0];
  s.addEventListener('change', () => update({ [key]: s.value }, true));
  wrap.appendChild(s);
  return wrap;
}

function checkField(key, label) {
  const wrap = document.createElement('label');
  wrap.className = 'check';
  const c = document.createElement('input');
  c.type = 'checkbox';
  c.checked = !!spec[key];
  c.addEventListener('change', () => update({ [key]: c.checked }, true));
  wrap.append(c, label);
  return wrap;
}

function buildColors() {
  const box = $('colors');
  box.innerHTML = '<h2>Farben</h2>';
  for (const [key, label, swatchSet, visible] of COLOR_FIELDS) {
    if (visible && !visible(spec)) continue;
    const row = document.createElement('div');
    row.className = 'color-row';
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = label;
    const sw = document.createElement('div');
    sw.className = 'swatches';
    for (const hex of SWATCHES[swatchSet]) {
      const b = document.createElement('button');
      b.className = 'sw' + (hex.toLowerCase() === String(spec[key]).toLowerCase() ? ' on' : '');
      b.style.background = hex;
      b.title = hex;
      b.addEventListener('click', () => update({ [key]: hex }, true));
      sw.appendChild(b);
    }
    const pick = document.createElement('input');
    pick.type = 'color';
    pick.value = spec[key];
    pick.addEventListener('input', () => update({ [key]: pick.value }, false));
    pick.addEventListener('change', () => buildColors());
    const ramp = document.createElement('div');
    ramp.className = 'ramp';
    ramp.title = 'Farbleiter, die aus dieser Farbe entsteht';
    for (const c of makeRamp(spec[key])) {
      const s = document.createElement('span');
      s.style.background = c;
      ramp.appendChild(s);
    }
    row.append(lbl, sw, pick, ramp);
    box.appendChild(row);
  }
}

// ---------------------------------------------------------------------------
// Rendern
// ---------------------------------------------------------------------------

function renderOpts() {
  return { outline: spec.outline || 'color' };
}

function rebuildFrames() {
  frames = {};
  for (const a of Object.keys(ANIMATIONS)) {
    for (const d of DIRECTIONS) {
      frames[`${a}_${d}`] = ANIMATIONS[a].frames.map(
        (pose) => new ImageData(renderFrame(spec, d, pose, renderOpts()), FRAME, FRAME),
      );
    }
  }
  const { canvas, layout } = renderSheet(spec, renderOpts());
  const sheet = $('sheet');
  sheet.width = canvas.width;
  sheet.height = canvas.height;
  sheet.getContext('2d').drawImage(canvas, 0, 0);
  sheet.style.width = canvas.width * 3 + 'px';
  sheet.style.height = canvas.height * 3 + 'px';
  $('sheetInfo').textContent =
    `${canvas.width}×${canvas.height} px, ${layout.cols} Spalten × ${layout.rows.length} Zeilen: ` +
    layout.rows.map((r) => r.name).join(', ');
}

function setupQuad() {
  const q = $('quad');
  q.innerHTML = '';
  for (const d of DIRECTIONS) {
    const c = document.createElement('canvas');
    c.width = c.height = FRAME;
    c.className = 'pixel';
    c.dataset.dir = d;
    c.title = 'Richtung waehlen';
    c.addEventListener('click', () => setDir(d));
    q.appendChild(c);
  }
}

let last = 0;
let tick = 0;
function loop(t) {
  const fps = ANIMATIONS[anim].fps;
  if (t - last >= 1000 / fps) {
    last = t;
    tick++;
    const list = frames[`${anim}_${dir}`];
    if (list) $('big').getContext('2d').putImageData(list[tick % list.length], 0, 0);
    for (const c of $('quad').children) {
      const l = frames[`${anim}_${c.dataset.dir}`];
      if (l) c.getContext('2d').putImageData(l[tick % l.length], 0, 0);
    }
  }
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Zustand
// ---------------------------------------------------------------------------

function update(patch, rebuildUi) {
  spec = { ...spec, ...patch };
  rebuildFrames();
  saveToHash();
  if (rebuildUi) buildControls();
}

function setSpec(next) {
  spec = { ...DEFAULT_SPEC, ...next };
  buildControls();
  rebuildFrames();
  saveToHash();
}

function setDir(d) {
  dir = d;
  for (const b of $('dirs').children) b.classList.toggle('on', b.dataset.dir === d);
}

function saveToHash() {
  try {
    const json = JSON.stringify(spec);
    history.replaceState(null, '', '#' + btoa(unescape(encodeURIComponent(json))));
  } catch { /* Adresse ist nur Bequemlichkeit */ }
}

function loadFromHash() {
  try {
    if (location.hash.length < 2) return null;
    return { ...DEFAULT_SPEC, ...JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1))))) };
  } catch {
    return null;
  }
}

function randomSpec() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const keys = (o) => Object.keys(o);
  const cloth = SWATCHES.cloth;
  const hat = pick(['none', 'none', 'none', ...keys(OPTIONS.hat)]);
  return {
    ...DEFAULT_SPEC,
    name: 'figur_' + Math.floor(Math.random() * 1000),
    skin: pick(SWATCHES.skin.slice(0, 6)),
    hair: pick(SWATCHES.hair),
    hairStyle: pick(keys(OPTIONS.hairStyle)),
    eyes: pick(SWATCHES.eyes),
    outfit: pick(keys(OPTIONS.outfit)),
    top: pick(cloth),
    shirt: pick(['#e8dcc0', '#a8a4b8', '#d9a33a']),
    bottom: pick(cloth),
    boots: pick(['#6b4a34', '#2a2630', '#4a4a5e', '#8a5530']),
    accent: pick(['#d9a33a', '#c9b26a', '#8c2f3a', '#3b5fae', '#e8dcc0']),
    cape: Math.random() < 0.4,
    capeColor: pick(cloth),
    hat,
    hatColor: pick(cloth),
    weapon: pick(keys(OPTIONS.weapon)),
    beard: Math.random() < 0.25 ? pick(['mustache', 'full']) : 'none',
    blush: Math.random() < 0.4,
  };
}

// ---------------------------------------------------------------------------
// Vorlagen und gemerkte Figuren
// ---------------------------------------------------------------------------

function thumb(s) {
  const c = document.createElement('canvas');
  c.width = c.height = FRAME;
  c.className = 'pixel';
  c.getContext('2d').putImageData(new ImageData(renderFrame(s, 'down', ANIMATIONS.idle.frames[0]), FRAME, FRAME), 0, 0);
  return c;
}

function buildPresets() {
  const row = $('presets');
  for (const [name, s] of Object.entries(PRESETS)) {
    const b = document.createElement('button');
    b.className = 'preset';
    b.append(thumb(s), name);
    b.addEventListener('click', () => setSpec(s));
    row.appendChild(b);
  }
}

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeSaved(list) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch { /* privater Modus: dann eben nicht */ }
}

function buildSaved() {
  const box = $('saved');
  box.innerHTML = '';
  const list = readSaved();
  if (!list.length) {
    box.innerHTML = '<p class="hint">Noch nichts gemerkt. Figuren bleiben nur in diesem Browser - zum Sichern ".json" speichern.</p>';
    return;
  }
  list.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'item';
    const b = document.createElement('button');
    b.className = 'preset';
    b.append(thumb(s), s.name || 'figur');
    b.addEventListener('click', () => setSpec(s));
    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '✕';
    del.title = 'Entfernen';
    del.addEventListener('click', () => {
      const l = readSaved();
      l.splice(i, 1);
      writeSaved(l);
      buildSaved();
    });
    item.append(b, del);
    box.appendChild(item);
  });
}

// ---------------------------------------------------------------------------
// Ereignisse
// ---------------------------------------------------------------------------

function wire() {
  $('dirs').addEventListener('click', (e) => e.target.dataset.dir && setDir(e.target.dataset.dir));
  $('anims').addEventListener('click', (e) => {
    if (!e.target.dataset.anim) return;
    anim = e.target.dataset.anim;
    for (const b of $('anims').children) b.classList.toggle('on', b === e.target);
  });
  $('bgs').addEventListener('click', (e) => {
    if (!e.target.dataset.bg) return;
    bg = e.target.dataset.bg;
    for (const b of $('bgs').children) b.classList.toggle('on', b === e.target);
    applyBg();
  });
  $('random').addEventListener('click', () => setSpec(randomSpec()));
  $('name').addEventListener('input', () => {
    spec.name = $('name').value;
    saveToHash();
  });

  $('dlPng').addEventListener('click', async () => {
    const { canvas } = renderSheet(spec, renderOpts());
    download(`${safeName(spec.name)}.png`, await canvasToBlob(canvas));
  });
  $('dlTres').addEventListener('click', () => {
    const name = safeName(spec.name);
    download(`${name}.tres`, godotSpriteFrames(name, $('folder').value || 'res://'));
  });
  $('dlBig').addEventListener('click', async () => {
    const { canvas } = renderSheet(spec, renderOpts());
    download(`${safeName(spec.name)}_gross.png`, await canvasToBlob(scaledCanvas(canvas, 8)));
  });
  $('dlJson').addEventListener('click', () => {
    download(`${safeName(spec.name)}.json`, JSON.stringify(spec, null, 2), 'application/json');
  });
  $('loadJson').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSpec(JSON.parse(await file.text()));
    } catch {
      alert('Die Datei ist keine gueltige Figur.');
    }
    e.target.value = '';
  });
  $('keep').addEventListener('click', () => {
    const list = readSaved().filter((s) => s.name !== spec.name);
    list.unshift({ ...spec });
    writeSaved(list.slice(0, 40));
    buildSaved();
  });
}

function applyBg() {
  for (const el of [document.querySelector('.preview-wrap'), $('quad'), document.querySelector('.sheet-wrap')]) {
    el.className = el.className.replace(/\bbg-\w+/g, '').trim() + ' bg-' + bg;
  }
}

buildPresets();
buildControls();
setupQuad();
rebuildFrames();
buildSaved();
wire();
applyBg();
requestAnimationFrame(loop);
window.__pixelForge = { get spec() { return spec; }, setSpec };
