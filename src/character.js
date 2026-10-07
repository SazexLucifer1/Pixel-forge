// Figuren: eine Beschreibung (spec) -> 32x32-Bilder in vier Richtungen.
// Jede Richtung wird aus Teilen zusammengesetzt (Beine, Koerper, Arme, Kopf,
// Haare, Hut, Waffe ...). Die Reihenfolge der Teile ist die Tiefe: was spaeter
// kommt, liegt vorne. Blick nach rechts ist der gespiegelte Blick nach links,
// gespiegelt VOR dem Schattieren, damit das Licht weiter von links oben kommt.

import { Painter } from './painter.js';

export const FRAME = 32;
export const DIRECTIONS = ['down', 'left', 'right', 'up'];

export const ANIMATIONS = {
  walk: {
    fps: 8,
    frames: [
      { step: 1, bob: 0 },
      { step: 0, bob: -1 },
      { step: -1, bob: 0 },
      { step: 0, bob: -1 },
    ],
  },
  idle: {
    fps: 3,
    frames: [
      { step: 0, bob: 0 },
      { step: 0, bob: 0, breathe: 1 },
    ],
  },
};

export const OPTIONS = {
  hairStyle: { short: 'Kurz', spiky: 'Stachelig', bob: 'Bob', long: 'Lang', ponytail: 'Zopf', bald: 'Glatze' },
  outfit: { tunic: 'Tunika', vest: 'Weste', robe: 'Robe', armor: 'Ruestung' },
  hat: { none: 'Keiner', hood: 'Kapuze', wizard: 'Zaubererhut', brim: 'Krempenhut', helmet: 'Helm', circlet: 'Stirnreif' },
  weapon: { none: 'Keine', sword: 'Schwert', staff: 'Stab', axe: 'Axt', bow: 'Bogen' },
  beard: { none: 'Keiner', mustache: 'Schnurrbart', full: 'Vollbart' },
};

export const DEFAULT_SPEC = {
  name: 'held',
  skin: '#f3c9a5',
  hair: '#5a3a22',
  hairStyle: 'short',
  eyes: '#3b6fb0',
  outfit: 'tunic',
  top: '#2f8f86',
  shirt: '#e8dcc0',
  bottom: '#4a4a5e',
  boots: '#6b4a34',
  accent: '#d9a33a',
  cape: false,
  capeColor: '#8c2f3a',
  hat: 'none',
  hatColor: '#3b5fae',
  weapon: 'none',
  metal: '#9aa7b5',
  beard: 'none',
  blush: false,
};

export const PRESETS = {
  Held: { ...DEFAULT_SPEC, name: 'held', cape: true, capeColor: '#a0703f', weapon: 'sword' },
  Ritter: {
    ...DEFAULT_SPEC, name: 'ritter', outfit: 'armor', top: '#9aa7b5', bottom: '#4a4a5e', boots: '#5e6878',
    hat: 'helmet', hatColor: '#9aa7b5', weapon: 'sword', cape: true, capeColor: '#2a3b6e', accent: '#c9b26a',
  },
  Magierin: {
    ...DEFAULT_SPEC, name: 'magierin', hair: '#d9d4cc', hairStyle: 'long', eyes: '#8a3fa8', outfit: 'robe',
    top: '#6a3f8a', bottom: '#6a3f8a', boots: '#2a2630', hat: 'wizard', hatColor: '#6a3f8a', accent: '#d9a33a',
    weapon: 'staff', blush: true,
  },
  Haendler: {
    ...DEFAULT_SPEC, name: 'haendler', skin: '#d39a6e', hair: '#b3412c', outfit: 'vest', top: '#4f8a3c',
    shirt: '#e8dcc0', bottom: '#6b4a34', hat: 'brim', hatColor: '#6b4a34', beard: 'mustache', accent: '#d9a33a',
  },
  Waldlaeuferin: {
    ...DEFAULT_SPEC, name: 'waldlaeuferin', skin: '#e8b089', hair: '#c08a3e', hairStyle: 'ponytail',
    eyes: '#4f8a3c', top: '#2f5a3a', bottom: '#6b4a34', hat: 'hood', hatColor: '#4f8a3c', weapon: 'bow',
    cape: true, capeColor: '#2f5a3a', blush: true,
  },
  Zwerg: {
    ...DEFAULT_SPEC, name: 'zwerg', skin: '#d39a6e', hair: '#c4533a', hairStyle: 'bald', beard: 'full',
    outfit: 'armor', top: '#b87a52', bottom: '#4a4a5e', boots: '#2a2630', weapon: 'axe', hat: 'helmet',
    hatColor: '#c9b26a', accent: '#c9b26a',
  },
  Priesterin: {
    ...DEFAULT_SPEC, name: 'priesterin', hair: '#e6c46a', hairStyle: 'long', eyes: '#3b6fb0', outfit: 'robe',
    top: '#e8dcc0', bottom: '#e8dcc0', boots: '#a8a4b8', accent: '#3b5fae', hat: 'circlet', weapon: 'staff',
    blush: true,
  },
  Dieb: {
    ...DEFAULT_SPEC, name: 'dieb', skin: '#b87a52', hair: '#2a2230', hairStyle: 'spiky', eyes: '#6b4a2a',
    top: '#2a2630', bottom: '#2a3b6e', boots: '#2a2630', accent: '#8c2f3a', cape: true, capeColor: '#8c2f3a',
  },
};

const EYE_DARK = '#1c1424';
const BLUSH = '#ee8f86';

/** Ein Bild (RGBA, 32x32) fuer Richtung + Pose. */
export function renderFrame(spec, dir, pose, renderOpts) {
  const s = { ...DEFAULT_SPEC, ...spec };
  const P = new Painter(FRAME, FRAME);
  if (dir === 'down') drawDown(P, s, pose);
  else if (dir === 'up') drawUp(P, s, pose);
  else {
    drawSide(P, s, pose);
    if (dir === 'right') P.mirror();
  }
  return P.render(renderOpts);
}

// ---------------------------------------------------------------------------
// gemeinsame Bausteine
// ---------------------------------------------------------------------------

const HEAD_FRONT = [
  '..########..',
  '.##########.',
  '############',
  '############',
  '############',
  '############',
  '############',
  '############',
  '.##########.',
  '..########..',
  '...######...',
];

const HEAD_SIDE = [
  '..#######..',
  '.#########.',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '.##########',
  '..########.',
  '...#####...',
];

const hidesHair = (s) => s.hat === 'helmet' || s.hat === 'hood';
const robeLike = (s) => s.outfit === 'robe';

function sleeveColor(s) {
  return s.outfit === 'vest' ? s.shirt : s.top;
}

/** Waffe senkrecht in der Hand; (hx, hy) = Pixel, an dem die Hand greift. */
function drawWeapon(P, s, hx, hy, { far = false } = {}) {
  if (s.weapon === 'none') return;
  const shift = far ? -1 : 0;
  if (s.weapon === 'sword') {
    const blade = P.part('klinge', s.metal, { shift });
    P.line(blade, hx, hy - 10, hx, hy - 2);
    P.setLevel(hx, hy - 10, 5);
    P.setLevel(hx, hy - 9, 4);
    const guard = P.part('parier', s.accent, { shift });
    P.rect(guard, hx - 1, hy - 1, 3, 1);
    const grip = P.part('griff', '#6b4a34', { shift });
    P.rect(grip, hx, hy, 1, 2);
    P.px(guard, hx, hy + 2);
  } else if (s.weapon === 'staff') {
    const wood = P.part('stab', '#8a5530', { shift });
    P.line(wood, hx, hy - 15, hx, hy + 6);
    const gem = P.part('stein', s.accent, { shift });
    P.rows(gem, hx - 1, hy - 18, ['.4.', '434', '.2.']);
  } else if (s.weapon === 'axe') {
    const wood = P.part('stiel', '#8a5530', { shift });
    P.line(wood, hx, hy - 9, hx, hy + 3);
    const head = P.part('axtblatt', s.metal, { shift });
    P.rows(head, hx - 4, hy - 10, ['.##.', '####', '####', '.###', '..##']);
    P.setLevel(hx - 4, hy - 9, 5);
    P.setLevel(hx - 4, hy - 8, 4);
  } else if (s.weapon === 'bow') {
    const wood = P.part('bogen', '#8a5530', { shift });
    P.rows(wood, hx - 2, hy - 9, ['.#', '#.', '#.', '#.', '#.', '#.', '#.', '#.', '#.', '#.', '#.', '.#']);
    const string = P.part('sehne', '#e8dcc0', { noShade: true, shift });
    P.line(string, hx - 1, hy - 8, hx - 1, hy + 1);
  }
}

// ---------------------------------------------------------------------------
// Blick nach vorne (unten)
// ---------------------------------------------------------------------------

function drawDown(P, s, pose) {
  const upper = pose.bob + (pose.breathe || 0);

  // Langes Haar und Zopf liegen hinter dem Koerper
  if (!hidesHair(s) && (s.hairStyle === 'long')) {
    P.oy = pose.bob;
    const back = P.part('haar-hinten', s.hair, { shift: -1 });
    P.rows(back, 8, 7, [
      '.##############.',
      '################',
      '################',
      '################',
      '################',
      '################',
      '################',
      '################',
      '################',
      '################',
      '###..........###',
      '###..........###',
      '##............##',
      '.#............#.',
    ]);
  }

  // Umhang hinter dem Koerper
  if (s.cape) {
    P.oy = upper;
    const cape = P.part('umhang', s.capeColor, { shift: -1 });
    P.rows(cape, 8, 17, [
      '.##############.',
      '################',
      '################',
      '################',
      '################',
      '################',
      '################',
      '################',
      '################',
      '.##############.',
    ]);
  }

  // Beine
  P.oy = 0;
  const legs = P.part('beine', s.bottom);
  const boots = P.part('stiefel', s.boots);
  const leg = (x, lifted) => {
    const lift = lifted ? 1 : 0;
    P.rect(legs, x, 23 - lift, 3, 5);
    P.rect(boots, x, 28 - lift, 3, 2);
    if (!lifted) P.px(boots, x + (x < 16 ? -1 : 3), 29);
  };
  leg(12, pose.step === 1);
  leg(17, pose.step === -1);

  // Oberkoerper
  P.oy = upper;
  drawTorsoFront(P, s, false);

  // Arme
  const armFwdL = pose.step === -1 ? 1 : pose.step === 1 ? -1 : 0; // Gegenschwung zum Bein
  drawArmFront(P, s, 9, armFwdL);
  drawArmFront(P, s, 21, -armFwdL);

  // Kopf
  P.oy = upper;
  drawHeadFront(P, s);

  // Waffe in der rechten Hand der Figur (vom Betrachter aus links)
  P.oy = upper;
  if (s.weapon !== 'none') drawWeapon(P, s, 8, 22 + armFwdL);
}

function drawTorsoFront(P, s) {
  const robe = robeLike(s);
  const body = P.part('koerper', s.outfit === 'vest' ? s.shirt : s.top);
  P.rows(body, 11, 16, [
    '.########.',
    '##########',
    '##########',
    '##########',
    '##########',
    '##########',
    '##########',
    '##########',
    '##########',
  ]);
  if (robe) {
    const skirt = P.part('robe', s.bottom);
    P.rows(skirt, 10, 24, [
      '.##########.',
      '############',
      '############',
      '############',
      '############',
    ]);
    // Saum-Kante in der Akzentfarbe
    const trim = P.part('saum', s.accent);
    P.rect(trim, 10, 28, 12, 1);
    P.rect(trim, 15, 16, 2, 8);
  }
  if (s.outfit === 'vest') {
    const vest = P.part('weste', s.top);
    P.rows(vest, 11, 16, [
      '.###..###.',
      '####..####',
      '####..####',
      '#####.####',
      '##########',
      '##########',
      '##########',
      '##########',
      '##########',
    ]);
  }
  if (s.outfit === 'armor') {
    // Brustplatte: Glanzkante und Mittelnaht
    P.setLevel(13, 17, 5); P.setLevel(14, 17, 4); P.setLevel(13, 18, 4);
    P.setLevel(15, 19, 2); P.setLevel(16, 19, 2); P.setLevel(15, 20, 2); P.setLevel(16, 20, 2);
  }
  if (!robe || s.outfit === 'robe') {
    const belt = P.part('guertel', robe ? s.accent : '#4a3428');
    P.rect(belt, 11, 21, 10, 1);
    const buckle = P.part('schnalle', s.accent);
    P.rows(buckle, 15, 21, ['45']);
  }
  if (!robe) {
    // Saum der Tunika etwas dunkler, damit sie sich von der Hose loest
    for (let x = 11; x <= 20; x++) P.setLevel(x, 24, 2);
  }
  if (s.cape) {
    // Umhang-Kragen und Spange vorne
    const collar = P.part('kragen', s.capeColor);
    P.rows(collar, 10, 15, ['.##......##.', '###......###', '##........##']);
    const clasp = P.part('spange', s.accent);
    P.rows(clasp, 15, 16, ['54']);
  }
}

function drawArmFront(P, s, x, swing) {
  const sleeve = P.part('arm', sleeveColor(s));
  const len = 6 + swing; // vorne langer, hinten kuerzer
  P.rect(sleeve, x, 17, 2, len);
  P.px(sleeve, x === 9 ? 10 : 21, 16);
  if (s.outfit === 'armor') {
    const pauldron = P.part('schulter', s.top);
    P.rows(pauldron, x - 1, 15, x === 9 ? ['.###', '####', '###.'] : ['###.', '####', '.###']);
  }
  const hand = P.part('hand', s.skin, { soft: true });
  P.rect(hand, x, 17 + len, 2, 2);
}

function drawHeadFront(P, s) {
  const skin = P.part('kopf', s.skin, { soft: true });
  P.rows(skin, 10, 5, HEAD_FRONT);
  // Ohren
  P.px(skin, 9, 11); P.px(skin, 22, 11);

  const face = P.part('augen', null, { flat: EYE_DARK });
  for (const x of [13, 18]) {
    P.color(face, x, 10, EYE_DARK);
    P.color(face, x, 11, s.eyes);
  }
  if (s.blush) {
    const blush = P.part('wangen', null, { flat: BLUSH });
    P.color(blush, 12, 12, BLUSH);
    P.color(blush, 19, 12, BLUSH);
  }
  drawBeardFront(P, s);
  if (!hidesHair(s)) drawHairFront(P, s);
  drawHatFront(P, s, false);
}

function drawBeardFront(P, s) {
  if (s.beard === 'none') return;
  const beard = P.part('bart', s.hair);
  if (s.beard === 'mustache') {
    P.rows(beard, 12, 12, ['.######.', '##....##']);
  } else {
    P.rows(beard, 10, 12, [
      '#..######..#',
      '##.######.##',
      '.##########.',
      '..########..',
      '...######...',
      '....####....',
    ]);
  }
}

function drawHairFront(P, s) {
  const st = s.hairStyle;
  if (st === 'bald') {
    // Glanzlicht auf der Glatze
    P.setLevel(12, 6, 5); P.setLevel(13, 6, 4); P.setLevel(12, 7, 4);
    return;
  }
  const hair = P.part('haar', s.hair);
  const cap = [
    '....######....',
    '..##########..',
    '.############.',
    '##############',
    '##############',
    '###.######.###',
    '##..#.##.#..##',
    '##..........##',
    '##..........##',
    '#............#',
  ];
  P.rows(hair, 9, 3, cap);
  if (st === 'spiky') {
    P.rows(hair, 9, 0, [
      '.#...#..#...#.',
      '.##.###.##.##.',
      '.############.',
    ]);
    P.rows(hair, 9, 8, ['##.#.#..#.#.##']);
  }
  if (st === 'bob' || st === 'long') {
    P.rows(hair, 8, 11, ['###..........###', '###..........###', '###..........###', '.##..........##.']);
  }
  if (st === 'ponytail') {
    const tie = P.part('haarband', s.accent);
    P.rows(tie, 21, 7, ['#']);
  }
  // Glanzband oben links
  P.setLevel(12, 4, 5); P.setLevel(13, 4, 5); P.setLevel(11, 5, 4); P.setLevel(12, 5, 4);
}

function drawHatFront(P, s, back) {
  const hat = P.part('hut', s.hatColor);
  switch (s.hat) {
    case 'hood':
      if (back) {
        P.rows(hat, 8, 3, [
          '....########....',
          '..############..',
          '.##############.',
          '.##############.',
          '################',
          '################',
          '################',
          '################',
          '################',
          '################',
          '################',
          '.##############.',
          '..############..',
          '.##############.',
        ]);
      } else {
        P.rows(hat, 8, 3, [
          '....########....',
          '..############..',
          '.##############.',
          '.##############.',
          '################',
          '#####......#####',
          '###..........###',
          '##............##',
          '##............##',
          '##............##',
          '##............##',
          '###..........###',
          '.###........###.',
          '.####......####.',
        ]);
      }
      break;
    case 'wizard': {
      P.rows(hat, 6, 0, [
        '...........##.......',
        '..........##........',
        '.........####.......',
        '........######......',
        '.......########.....',
        '.....###########....',
        '....############....',
        '..################..',
        '####################',
      ]);
      const band = P.part('hutband', s.accent);
      P.rect(band, 10, 6, 12, 1);
      break;
    }
    case 'brim': {
      P.rows(hat, 6, 2, [
        '.....##########.....',
        '....############....',
        '....############....',
        '....############....',
        '....############....',
        '..################..',
        '####################',
      ]);
      const band = P.part('hutband', s.accent);
      P.rect(band, 10, 6, 12, 1);
      break;
    }
    case 'helmet': {
      if (back) {
        P.rows(hat, 9, 3, [
          '....######....',
          '..##########..',
          '.############.',
          '##############',
          '##############',
          '##############',
          '##############',
          '##############',
          '##############',
          '.############.',
          '..##########..',
        ]);
      } else {
        P.rows(hat, 9, 3, [
          '....######....',
          '..##########..',
          '.############.',
          '##############',
          '##############',
          '##############',
          '###...##...###',
          '##....##....##',
          '##....##....##',
          '##..........##',
          '.#..........#.',
        ]);
        P.setLevel(12, 5, 5); P.setLevel(13, 5, 4); P.setLevel(11, 6, 4);
      }
      const ridge = P.part('helmkamm', s.accent);
      P.rect(ridge, 15, 2, 2, 4);
      break;
    }
    case 'circlet': {
      const band = P.part('reif', s.accent);
      P.rect(band, 10, 7, 12, 1);
      if (!back) {
        const gem = P.part('juwel', s.eyes);
        P.rows(gem, 15, 7, ['45']);
      }
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Blick nach hinten (oben)
// ---------------------------------------------------------------------------

function drawUp(P, s, pose) {
  const upper = pose.bob + (pose.breathe || 0);

  // Waffe auf dem Ruecken bzw. in der Hand, hinter dem Koerper
  const armFwdL = pose.step === 1 ? 1 : pose.step === -1 ? -1 : 0;
  P.oy = upper;
  if (s.weapon !== 'none') drawWeapon(P, s, 23, 22 - armFwdL, { far: true });

  P.oy = 0;
  const legs = P.part('beine', s.bottom);
  const boots = P.part('stiefel', s.boots);
  const leg = (x, lifted) => {
    const lift = lifted ? 1 : 0;
    P.rect(legs, x, 23 - lift, 3, 5);
    P.rect(boots, x, 28 - lift, 3, 2);
  };
  leg(12, pose.step === 1);
  leg(17, pose.step === -1);

  P.oy = upper;
  const body = P.part('koerper', s.outfit === 'vest' ? s.top : s.top);
  P.rows(body, 11, 16, [
    '.########.',
    '##########',
    '##########',
    '##########',
    '##########',
    '##########',
    '##########',
    '##########',
    '##########',
  ]);
  if (robeLike(s)) {
    const skirt = P.part('robe', s.bottom);
    P.rows(skirt, 10, 24, ['.##########.', '############', '############', '############', '############']);
    const trim = P.part('saum', s.accent);
    P.rect(trim, 10, 28, 12, 1);
  } else {
    const belt = P.part('guertel', '#4a3428');
    P.rect(belt, 11, 21, 10, 1);
    for (let x = 11; x <= 20; x++) P.setLevel(x, 24, 2);
  }
  drawArmFront(P, s, 9, armFwdL);
  drawArmFront(P, s, 21, -armFwdL);

  // Kopf von hinten: Haut nur am Nacken sichtbar
  P.oy = upper;
  const skin = P.part('kopf', s.skin, { soft: true });
  P.rows(skin, 10, 5, HEAD_FRONT);
  P.px(skin, 9, 11); P.px(skin, 22, 11);

  if (s.beard === 'full') {
    const beard = P.part('bart', s.hair, { shift: -1 });
    P.rows(beard, 10, 13, ['#..........#', '##........##']);
  }

  if (!hidesHair(s) && s.hairStyle !== 'bald') {
    const hair = P.part('haar', s.hair);
    P.rows(hair, 9, 3, [
      '....######....',
      '..##########..',
      '.############.',
      '##############',
      '##############',
      '##############',
      '##############',
      '##############',
      '##############',
      '##############',
      '.############.',
      '..##########..',
    ]);
    if (s.hairStyle === 'spiky') {
      P.rows(hair, 9, 0, ['.#...#..#...#.', '.##.###.##.##.', '.############.']);
    }
    if (s.hairStyle === 'long') {
      P.rows(hair, 8, 14, [
        '################',
        '################',
        '.##############.',
        '.##############.',
        '..############..',
        '..############..',
        '...##########...',
      ]);
    }
    if (s.hairStyle === 'bob') {
      P.rows(hair, 8, 11, ['################', '################', '################', '.##############.']);
    }
    if (s.hairStyle === 'ponytail') {
      const tie = P.part('haarband', s.accent);
      P.rect(tie, 15, 13, 2, 1);
      const tail = P.part('zopf', s.hair);
      P.rows(tail, 14, 14, ['.##.', '####', '####', '####', '.##.', '.##.', '..#.']);
    }
    P.setLevel(12, 4, 5); P.setLevel(13, 4, 4); P.setLevel(11, 5, 4);
  } else if (s.hairStyle === 'bald' && !hidesHair(s)) {
    P.setLevel(12, 6, 5); P.setLevel(13, 6, 4);
  }

  // Umhang vor dem Ruecken
  if (s.cape) {
    P.oy = upper;
    const cape = P.part('umhang', s.capeColor);
    const sway = pose.step === 0 ? 0 : 1;
    P.rows(cape, 9, 15, [
      '.############.',
      '##############',
      '##############',
      '##############',
      '##############',
      '##############',
      '##############',
      '##############',
      '##############',
      '##############',
      '##############',
      '.############.',
    ]);
    if (sway) P.rows(cape, 9, 27, ['#.#.#..#.#.#.#'.replace(/#/g, 'x')]);
  }

  if (s.hat !== 'none') {
    P.oy = upper;
    drawHatFront(P, s, true);
  }
}

// ---------------------------------------------------------------------------
// Blick zur Seite (links); rechts ist gespiegelt
// ---------------------------------------------------------------------------

function drawSide(P, s, pose) {
  const upper = pose.bob + (pose.breathe || 0);
  const step = pose.step; // 1 = vorderes Bein vorne, -1 = hinteres Bein vorne
  const swing = step * 2;

  if (s.weapon !== 'none') {
    // Waffen haelt in der Seitenansicht der ferne Arm, hinter dem Koerper -
    // vorne wuerden sie das Gesicht verdecken
    P.oy = upper;
    drawWeapon(P, s, 19, 21, { far: true });
  }

  if (!hidesHair(s) && (s.hairStyle === 'long' || s.hairStyle === 'ponytail')) {
    P.oy = upper;
    const back = P.part('haar-hinten', s.hair, { shift: -1 });
    if (s.hairStyle === 'long') {
      P.rows(back, 15, 8, ['######', '######', '######', '######', '######', '######', '######', '#####.', '#####.', '####..', '.##...', '.#....']);
    } else {
      P.rows(back, 20, 8, ['##.', '###', '###', '.##', '.##', '..#']);
    }
  }

  if (s.cape) {
    P.oy = upper;
    const cape = P.part('umhang', s.capeColor, { shift: -1 });
    const flare = step === 0 ? 1 : 2;
    P.rows(cape, 16, 16, [
      '#####...',
      '######..',
      '######..',
      '#######.',
      '#######.',
      '#######.',
      '########',
      '########',
      '########',
      '.#######',
    ].map((r) => r.slice(0, 6 + flare).padEnd(8, '.')));
  }

  // Beine: das ferne Bein zuerst (dunkler)
  P.oy = 0;
  const legFar = P.part('bein-fern', s.bottom, { shift: -1 });
  const bootFar = P.part('stiefel-fern', s.boots, { shift: -1 });
  const legNear = P.part('bein', s.bottom);
  const bootNear = P.part('stiefel', s.boots);
  const leg = (legP, bootP, hipX, dx) => {
    for (let y = 23; y <= 27; y++) {
      const t = (y - 23) / 4;
      P.rect(legP, hipX + Math.round(dx * t), y, 3, 1);
    }
    const fx = hipX + dx;
    P.rect(bootP, fx - 1, 28, 4, 2);
    P.px(bootP, fx - 2, 29);
  };
  leg(legFar, bootFar, 15, -swing);
  leg(legNear, bootNear, 14, swing);

  // Koerper
  P.oy = upper;
  const body = P.part('koerper', s.outfit === 'vest' ? s.shirt : s.top);
  P.rows(body, 12, 16, [
    '.######.',
    '########',
    '########',
    '########',
    '########',
    '########',
    '########',
    '########',
    '########',
  ]);
  if (s.outfit === 'vest') {
    const vest = P.part('weste', s.top);
    P.rows(vest, 12, 16, ['..####.', '..#####', '.######', '.######', '########', '########', '########', '########', '########']);
  }
  if (robeLike(s)) {
    const skirt = P.part('robe', s.bottom);
    P.rows(skirt, 11, 24, ['.########.', '##########', '##########', '##########', '##########'].map((r, i) => (step !== 0 && i > 2 ? r : r)));
    const trim = P.part('saum', s.accent);
    P.rect(trim, 11, 28, 10, 1);
  } else {
    const belt = P.part('guertel', '#4a3428');
    P.rect(belt, 12, 21, 8, 1);
    for (let x = 12; x <= 19; x++) P.setLevel(x, 24, 2);
  }
  if (s.outfit === 'armor') {
    P.setLevel(13, 17, 5); P.setLevel(13, 18, 4); P.setLevel(14, 17, 4);
  }
  if (s.cape) {
    const collar = P.part('kragen', s.capeColor);
    P.rows(collar, 13, 15, ['.######', '#######']);
  }

  // Naher Arm, schwingt gegen das nahe Bein
  P.oy = upper;
  const sleeve = P.part('arm', sleeveColor(s));
  const handDx = -swing; // Bein vorne -> Arm hinten
  for (let y = 17; y <= 21; y++) {
    const t = (y - 17) / 5;
    P.rect(sleeve, 15 + Math.round(handDx * t * 0.8), y, 2, 1);
  }
  P.rect(sleeve, 15, 16, 2, 1);
  if (s.outfit === 'armor') {
    const pauldron = P.part('schulter', s.top);
    P.rows(pauldron, 14, 15, ['.##.', '####', '####']);
  }
  const hand = P.part('hand', s.skin, { soft: true });
  const hx = 15 + Math.round(handDx * 0.8);
  P.rect(hand, hx, 22, 2, 2);

  // Kopf
  P.oy = upper;
  const skin = P.part('kopf', s.skin, { soft: true });
  P.rows(skin, 10, 5, HEAD_SIDE);
  P.px(skin, 9, 11); // Nase
  const face = P.part('augen', null, { flat: EYE_DARK });
  P.color(face, 12, 10, EYE_DARK);
  P.color(face, 12, 11, s.eyes);
  if (s.blush) {
    const blush = P.part('wangen', null, { flat: BLUSH });
    P.color(blush, 12, 13, BLUSH);
  }
  if (s.beard !== 'none') {
    const beard = P.part('bart', s.hair);
    if (s.beard === 'mustache') P.rows(beard, 9, 12, ['.###', '#...']);
    else P.rows(beard, 9, 12, ['.#####', '#######', '.######', '..####', '...##.']);
  }

  if (!hidesHair(s)) {
    if (s.hairStyle === 'bald') {
      P.setLevel(13, 6, 5); P.setLevel(14, 6, 4);
    } else {
      const hair = P.part('haar', s.hair);
      P.rows(hair, 9, 3, [
        '....#######..',
        '..##########.',
        '.############',
        '#############',
        '##.##########',
        '#...#########',
        '.....########',
        '......#######',
        '......######.',
        '.......#####.',
        '........###..',
      ]);
      // Ohr bleibt frei
      P.rows(skin, 15, 10, ['##', '##']);
      if (s.hairStyle === 'spiky') {
        P.rows(hair, 10, 0, ['..#..#..#..', '.##.##.###.', '###########']);
      }
      if (s.hairStyle === 'bob') {
        P.rows(hair, 17, 11, ['####', '####', '###.']);
        P.rows(skin, 15, 10, ['##', '##']);
      }
      if (s.hairStyle === 'ponytail') {
        const tie = P.part('haarband', s.accent);
        P.rows(tie, 21, 8, ['#', '#']);
      }
      P.setLevel(12, 4, 5); P.setLevel(13, 4, 5); P.setLevel(11, 5, 4);
    }
  }

  drawHatSide(P, s);
}

function drawHatSide(P, s) {
  const hat = P.part('hut', s.hatColor);
  switch (s.hat) {
    case 'hood':
      P.rows(hat, 9, 3, [
        '...########...',
        '.###########..',
        '#############.',
        '##############',
        '###.##########',
        '##...#########',
        '#.....########',
        '#.....########',
        '......########',
        '......########',
        '......#######.',
        '......#######.',
        '.....#######..',
        '....########..',
      ]);
      P.rows(hat, 21, 6, ['##', '###', '.##', '..#']);
      break;
    case 'wizard': {
      P.rows(hat, 5, 0, [
        '...............##...',
        '..............##....',
        '.........######.....',
        '........#######.....',
        '.......########.....',
        '......#########.....',
        '.....##########.....',
        '...#############....',
        '##################..',
      ]);
      const band = P.part('hutband', s.accent);
      P.rect(band, 10, 6, 11, 1);
      break;
    }
    case 'brim': {
      P.rows(hat, 5, 2, [
        '.....#########......',
        '....###########.....',
        '....###########.....',
        '....###########.....',
        '....###########.....',
        '..###############...',
        '####################',
      ]);
      const band = P.part('hutband', s.accent);
      P.rect(band, 9, 6, 11, 1);
      break;
    }
    case 'helmet': {
      P.rows(hat, 9, 3, [
        '....######...',
        '..##########.',
        '.############',
        '#############',
        '#############',
        '#############',
        '.##..########',
        '.....########',
        '.....########',
        '......######.',
        '.......####..',
      ]);
      P.setLevel(11, 5, 5); P.setLevel(12, 5, 4);
      const ridge = P.part('helmkamm', s.accent);
      P.rect(ridge, 14, 2, 3, 2);
      break;
    }
    case 'circlet': {
      const band = P.part('reif', s.accent);
      P.rect(band, 10, 7, 11, 1);
      break;
    }
    default:
      break;
  }
}
