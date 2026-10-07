// Spritesheet und Godot-Export.
// Aufbau des Sheets: eine Zeile je Animation und Richtung, eine Spalte je Frame.
//   walk_down, walk_left, walk_right, walk_up, idle_down, idle_left, idle_right, idle_up

import { renderFrame, FRAME, DIRECTIONS, ANIMATIONS } from './character.js';

export function sheetLayout() {
  const rows = [];
  for (const anim of Object.keys(ANIMATIONS)) {
    for (const dir of DIRECTIONS) rows.push({ anim, dir, name: `${anim}_${dir}`, frames: ANIMATIONS[anim].frames.length });
  }
  const cols = Math.max(...rows.map((r) => r.frames));
  return { rows, cols, width: cols * FRAME, height: rows.length * FRAME };
}

/** Zeichnet das komplette Sheet in einen Canvas (1 Pixel = 1 Pixel). */
export function renderSheet(spec, renderOpts) {
  const layout = sheetLayout();
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  layout.rows.forEach((row, r) => {
    ANIMATIONS[row.anim].frames.forEach((pose, c) => {
      const data = renderFrame(spec, row.dir, pose, renderOpts);
      ctx.putImageData(new ImageData(data, FRAME, FRAME), c * FRAME, r * FRAME);
    });
  });
  return { canvas, layout };
}

export function safeName(name) {
  return (name || 'figur').toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'figur';
}

/**
 * Godot-4-Ressource "SpriteFrames" (.tres) passend zum Sheet.
 * In Godot: AnimatedSprite2D -> Sprite Frames -> Laden -> diese Datei.
 */
export function godotSpriteFrames(name, folder) {
  const layout = sheetLayout();
  const dir = folder.replace(/\/+$/, '');
  const pngPath = `${dir}/${name}.png`;
  const subs = [];
  const anims = [];
  let id = 0;
  layout.rows.forEach((row, r) => {
    const frames = [];
    for (let c = 0; c < row.frames; c++) {
      id++;
      subs.push(
        `[sub_resource type="AtlasTexture" id="AtlasTexture_${id}"]\n` +
          `atlas = ExtResource("1_sheet")\n` +
          `region = Rect2(${c * FRAME}, ${r * FRAME}, ${FRAME}, ${FRAME})\n`,
      );
      frames.push(`{\n"duration": 1.0,\n"texture": SubResource("AtlasTexture_${id}")\n}`);
    }
    anims.push(
      `{\n"frames": [${frames.join(', ')}],\n"loop": true,\n"name": &"${row.name}",\n"speed": ${ANIMATIONS[row.anim].fps}.0\n}`,
    );
  });
  return (
    `[gd_resource type="SpriteFrames" load_steps=${id + 2} format=3]\n\n` +
    `[ext_resource type="Texture2D" path="${pngPath}" id="1_sheet"]\n\n` +
    subs.join('\n') +
    `\n[resource]\nanimations = [${anims.join(', ')}]\n`
  );
}

export function download(filename, blobOrText, type = 'text/plain') {
  const blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Vergroessertes Sheet (fuer Vorschau / Teilen), scharf ohne Glaettung. */
export function scaledCanvas(src, scale) {
  const c = document.createElement('canvas');
  c.width = src.width * scale;
  c.height = src.height * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
