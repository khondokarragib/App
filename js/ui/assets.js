/**
 * Asset loading: PIXI spritesheets + loose textures.
 * Preserves original atlas files unchanged.
 */
export const ATLASES = [
  'background-0',
  'ui-0', 'ui-1', 'ui-2', 'ui-3', 'ui-4',
];
export const LOOSE = ['background-1'];

/**
 * Load a texture without PIXI.Assets: PIXI.Assets probes WebGL extensions,
 * which crashes when the game runs on the 2D canvas fallback renderer.
 * This works with both WebGL and canvas renderers.
 */
async function loadImageTexture(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  const image = await createImageBitmap(blob);
  return new PIXI.Texture(new PIXI.BaseTexture(image));
}

export async function loadAssets(onProgress) {
  const textures = {};
  const sheets = {};
  let done = 0;
  const total = ATLASES.length + LOOSE.length;

  const tick = () => { done++; onProgress?.(done / total); };

  await Promise.all([
    ...ATLASES.map(async (name) => {
      const [json, img] = await Promise.all([
        fetch(`assets/${name}.json`).then((r) => r.json()),
        loadImageTexture(`assets/${name}.png`),
      ]);
      const sheet = new PIXI.Spritesheet(img, json);
      await sheet.parse();
      sheets[name] = sheet;
      tick();
    }),
    ...LOOSE.map(async (name) => {
      textures[name] = await loadImageTexture(`assets/${name}.png`);
      tick();
    }),
  ]);

  return { sheets, textures };
}

/**
 * The source atlases export some sprites trimmed against a 1600x900 stage
 * (the chicken animations), which makes PIXI report stage-sized sprites.
 * Rebuild a tight texture (frame only) for standalone use.
 */
export function tightTexture(tex) {
  if (tex && tex.trim) return new PIXI.Texture(tex.baseTexture, tex.frame.clone());
  return tex;
}

/** Sprite from an atlas frame. */
export function frameSprite(sheets, frameName) {
  for (const name of Object.keys(sheets)) {
    const tex = sheets[name].textures[frameName];
    if (tex) return new PIXI.Sprite(tightTexture(tex));
  }
  console.warn('missing frame', frameName);
  return new PIXI.Sprite(PIXI.Texture.WHITE);
}

/**
 * Animated sprite from all frames sharing a prefix (zero-padded 5 digits).
 *
 * The chicken animations are exported trimmed against a 1600x900 stage and
 * some frames are stored rotated. Rendering a sprite with the ORIGINAL parsed
 * texture into a tight union-box RenderTexture bakes everything (trim +
 * rotation) into plain textures that animate consistently at any anchor.
 * `renderer` is the PIXI renderer used for baking (done once per prefix).
 */
const bakedPrefixes = new Map();

export function prefixAnimatedSprite(sheets, prefix, fps = 20, renderer = null) {
  if (bakedPrefixes.has(prefix)) {
    const anim = new PIXI.AnimatedSprite(bakedPrefixes.get(prefix));
    anim.animationSpeed = fps / 60;
    return anim;
  }
  const raws = [];
  for (let i = 0; i < 100; i++) {
    const name = `${prefix}${String(i).padStart(5, '0')}`;
    let found = null;
    for (const key of Object.keys(sheets)) {
      const tex = sheets[key].textures[name];
      if (tex) { found = tex; break; }
    }
    if (found) raws.push(found);
    else if (raws.length) break;
  }
  if (!raws.length) {
    console.warn('no frames for prefix', prefix);
    const anim = new PIXI.AnimatedSprite([PIXI.Texture.WHITE]);
    anim.animationSpeed = fps / 60;
    return anim;
  }

  // union of frame positions on the original stage (trim x/y = stage pos)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const boxes = raws.map((tex) => {
    const sx = tex.trim ? tex.trim.x : 0;
    const sy = tex.trim ? tex.trim.y : 0;
    // render-space footprint: rendering the original sprite at (0,0) places
    // its content at (trim.x, trim.y) spanning trim.w x trim.h
    const w = tex.trim ? tex.trim.width : tex.frame.width;
    const h = tex.trim ? tex.trim.height : tex.frame.height;
    minX = Math.min(minX, sx); minY = Math.min(minY, sy);
    maxX = Math.max(maxX, sx + w); maxY = Math.max(maxY, sy + h);
    return { tex, sx, sy };
  });
  const W = Math.max(2, Math.ceil(maxX - minX)), H = Math.max(2, Math.ceil(maxY - minY));

  let frames;
  if (renderer) {
    frames = boxes.map(({ tex }) => {
      const rt = PIXI.RenderTexture.create({ width: W, height: H });
      const sp = new PIXI.Sprite(tex);
      // the sprite draws its trimmed content at (trim.x, trim.y) within its
      // own box, so a common position maps every frame into the union box
      sp.position.set(-minX, -minY);
      renderer.render(sp, { renderTexture: rt });
      sp.destroy();
      return rt;
    });
  } else {
    // fallback: tight frame-only textures (rotation NOT corrected)
    frames = raws.map((tex) => tightTexture(tex));
  }
  bakedPrefixes.set(prefix, frames);
  const anim = new PIXI.AnimatedSprite(frames);
  anim.animationSpeed = fps / 60;
  return anim;
}

/** Collect texture frames for a prefix without building a sprite. */
export function prefixTextures(sheets, prefix) {
  const frames = [];
  for (let i = 0; i < 100; i++) {
    const name = `${prefix}${String(i).padStart(5, '0')}`;
    for (const key of Object.keys(sheets)) {
      const tex = sheets[key].textures[name];
      if (tex) { frames.push(tex); break; }
    }
  }
  return frames;
}
