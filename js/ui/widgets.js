/**
 * Layout constants for both orientations, measured from the reference
 * screenshots and the original frontend code (bundle.js changeOrientation):
 *  - portrait  : 720 x 1280 design space (phones)
 *  - landscape : 1280 x 720 design space (desktop), matching the original
 *    desktop arrangement (grid left, machine centre, silo right).
 *
 * All views take a layout profile at construction time.
 */
export const DESIGN = {
  portrait: { w: 720, h: 1280 },
  landscape: { w: 1280, h: 720 },
};

export const LAYOUTS = {
  portrait: {
    orientation: 'portrait',
    dim: { w: 720, h: 1280 },

    logo: { x: 26, y: 10, scale: 0.55 },
    barn: { cx: 240, cy: 502, w: 511, h: 349 },    // red barn behind board/silo, base on the grass
    flowersMiddle: { cx: 360, cy: 820, w: 720, h: 780 },
    flowersFront: { cx: 360, cy: 1197, w: 720, h: 165 },

    // bingo board (bm frame: wooden frame + wings + ladder)
    panelFrame: { cx: 195, cy: 543, w: 376, h: 875 },
    ballsBoard: { x: 78, y: 120, w: 240, h: 44 },  // white board + text
    paper: { cx: 195, cy: 322, w: 338, h: 305 },   // graph paper behind grid
    grid: { x0: 43, y0: 183.5, pitchX: 33.4, pitchY: 33.1, cols: 10, rows: 9, box: 31.5 },

    // paytable silo
    silo: { cx: 565, cy: 335, w: 281, h: 523 },
    ballsHeader: { cx: 512, cy: 111, countCx: 619, countCy: 111, font: 25, badgeR: 15 },
    paytable: { y0: 150, rowH: 25.8, numX: 515, dashX: 543, valX: 618, indX: 570, indW: 230, indH: 25, font: 21 },

    // machine / coop
    machineFrame: { cx: 376, cy: 655, w: 353, h: 313 },  // FrameBackground+FrameFront
    machineBack: { cx: 376, cy: 1012, w: 253, h: 495 },  // tower door below
    tray: { cx: 376, cy: 884, w: 275, h: 151 },          // Machines/Rope (ropes+hay tray)
    chicken: { cx: 370, bottom: 778, h: 200 },
    straw: { cx: 376, cy: 884, w: 260, h: 177 },
    drawnEgg: { cx: 376, cy: 873, w: 76, h: 103 },       // Machines/egg + number
    eggRollX: 190,

    // controls
    newCard: { cx: 131, cy: 622, w: 162, h: 170 },
    betPlus: { cx: 587, cy: 525, w: 90, h: 96 },
    betScreen: { cx: 608, cy: 650, w: 115, h: 109 },
    betMinus: { cx: 587, cy: 748, w: 90, h: 96 },
    turbo: { cx: 123, cy: 885, w: 218, h: 197 },
    play: { cx: 600, cy: 885, w: 216, h: 197 },

    // bottom player card (9 columns x 3 rows)
    playerCard: { cx: 356, cy: 1108, w: 513, h: 246 },
    cardSlots: { x0: 151, y0: 1048.5, pitchX: 53.2, pitchY: 62.5, boxW: 52, boxH: 59 },

    winPopup: { x: 360, y: 560 },
    bigWin: { x: 360, y: 520 },
  },

  landscape: {
    orientation: 'landscape',
    dim: { w: 1280, h: 720 },

    logo: { x: 12, y: 8, scale: 0.7 },
    barnLeft: { cx: 340, cy: 270, w: 511, h: 349 },
    barnRight: { cx: 940, cy: 270, w: 511, h: 349 },
    flowersMiddle: { cx: 640, cy: 560, w: 1280, h: 366 },
    flowersFront: { cx: 640, cy: 653, w: 1158, h: 138 },

    // bingo board, left side
    panelFrame: { cx: 346, cy: 382, w: 327, h: 762 },
    ballsBoard: { x: 232, y: 14, w: 230, h: 40 },
    paper: { cx: 346, cy: 168, w: 300, h: 272 },
    grid: { x0: 214.3, y0: 71.9, pitchX: 29.3, pitchY: 29.4, cols: 10, rows: 9, box: 27.5 },

    // paytable silo, right side
    silo: { cx: 1049, cy: 247, w: 222, h: 414 },
    ballsHeader: { cx: 1005, cy: 63, countCx: 1092, countCy: 63 },
    paytable: { y0: 106, rowH: 20.4, numX: 1012, dashX: 1032, valX: 1106, indX: 1059, indW: 172, indH: 20, font: 16.5 },

    // machine / coop, centre
    machineFrame: { cx: 712, cy: 166, w: 372, h: 330 },
    machineBack: { cx: 712, cy: 529, w: 267, h: 523 },
    tray: { cx: 712, cy: 389, w: 291, h: 160 },
    chicken: { cx: 700, bottom: 252, h: 218 },
    straw: { cx: 712, cy: 389, w: 274, h: 187 },
    drawnEgg: { cx: 712, cy: 385, w: 80, h: 109 },
    eggRollX: 190,

    // controls
    newCard: { cx: 294, cy: 385, w: 154, h: 162 },
    betPlus: { cx: 1134, cy: 442, w: 76, h: 81 },
    betScreen: { cx: 1054, cy: 442, w: 97, h: 92 },
    betMinus: { cx: 974, cy: 442, w: 76, h: 81 },
    turbo: { cx: 859, cy: 565, w: 207, h: 187 },
    play: { cx: 1078, cy: 565, w: 205, h: 187 },

    // player card, bottom left (9 columns x 3 rows)
    playerCard: { cx: 341, cy: 556, w: 476, h: 206 },
    cardSlots: { x0: 170, y0: 508, pitchX: 42.8, pitchY: 47.5, boxW: 41, boxH: 47 },

    winPopup: { x: 640, y: 330 },
    bigWin: { x: 640, y: 300 },
  },
};

/** Shared PIXI text style factory matching the reference cartoon look. */
export function textStyle(size, fill = '#333a68', extra = {}) {
  return new PIXI.TextStyle({
    fontFamily: '"Trebuchet MS", "Arial Rounded MT Bold", Verdana, sans-serif',
    fontSize: size,
    fontWeight: '900',
    fill,
    ...extra,
  });
}

/**
 * Simple stateful button (out/over/down/disable) built from atlas frames.
 * frames = {out, over, down, disable}
 *
 * The interactive area always covers the full button rectangle (plus a small
 * touch padding), so taps register everywhere on the button — not only on
 * the opaque pixels.
 */
export class SpriteButton {
  constructor(sheets, frames, { w, h, anchor = 0.5, pad = 8 } = {}) {
    this.container = new PIXI.Container();
    this._geom = { w, h, anchor, pad };
    this.sprites = {};
    for (const state of ['out', 'over', 'down', 'disable']) {
      if (!frames[state]) continue;
      const s = frameSpriteSafe(sheets, frames[state]);
      s.anchor.set(anchor);
      if (w) s.width = w;
      if (h) s.height = h;
      s.visible = false;
      this.sprites[state] = s;
      this.container.addChild(s);
    }
    this.state = 'out';
    this.enabled = true;
    this._apply();
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this._updateHitArea();
    this.container.on('pointerover', () => { if (this.enabled) { this.state = 'over'; this._apply(); this.onHover?.(); } });
    this.container.on('pointerout', () => { if (this.enabled) { this.state = 'out'; this._apply(); } });
    this.container.on('pointerdown', () => {
      if (!this.enabled) return;
      this.state = 'down'; this._apply();
    });
    this.container.on('pointerup', () => { if (this.enabled) { this.state = 'over'; this._apply(); } });
    this.container.on('pointertap', () => { if (this.enabled) this.onPress?.(); });
  }

  _updateHitArea() {
    const { w, h, anchor, pad } = this._geom;
    if (!w || !h) return;
    const x0 = -w * anchor - pad;
    const y0 = -h * anchor - pad;
    this.container.hitArea = new PIXI.Rectangle(x0, y0, w + pad * 2, h + pad * 2);
  }

  /** Swap the frame set (e.g. PLAY <-> FORWARD) keeping size. */
  setFrames(sheets, frames) {
    const { w, h, anchor } = this._geom || {};
    for (const s of Object.values(this.sprites)) this.container.removeChild(s);
    this.sprites = {};
    for (const state of ['out', 'over', 'down', 'disable']) {
      if (!frames[state]) continue;
      const s = frameSpriteSafe(sheets, frames[state]);
      s.anchor.set(anchor ?? 0.5);
      if (w) s.width = w;
      if (h) s.height = h;
      s.visible = false;
      this.sprites[state] = s;
      this.container.addChild(s);
    }
    this._apply();
  }

  _apply() {
    const key = !this.enabled && this.sprites.disable ? 'disable' : (this.sprites[this.state] ? this.state : 'out');
    for (const [k, s] of Object.entries(this.sprites)) s.visible = (k === key);
  }

  setEnabled(on) { this.enabled = on; this._apply(); }
}

export function frameSpriteSafe(sheets, name) {
  for (const key of Object.keys(sheets)) {
    const tex = sheets[key].textures[name];
    if (tex) return new PIXI.Sprite(tex);
  }
  console.warn('missing frame', name);
  return new PIXI.Sprite(PIXI.Texture.WHITE);
}
