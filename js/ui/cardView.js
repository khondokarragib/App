/**
 * Bottom player card — 9 columns x 3 rows of egg boxes on the rope-framed
 * wooden panel (Card/card_landscape_frame), exactly like the reference:
 * every one of the 27 cells shows an egg box (Card/card_landscape_emptybox);
 * the 15 card numbers sit in their column-range column (1-9 -> col 0,
 * 10-19 -> col 1, ... 80-90 -> col 8) on a yellow egg; a drawn number swaps
 * to the red Card/card_landscape_matchbox with a bounce.
 */
import { textStyle } from './widgets.js';
import { frameSprite } from './assets.js';

export class CardView {
  constructor(sheets, layout) {
    this.sheets = sheets;
    this.L = layout;
    this.container = new PIXI.Container();
    this.slotSprites = new Map(); // number -> {tile, text}

    const { playerCard } = this.L;
    const frame = frameSprite(this.sheets, 'Card/card_landscape_frame');
    frame.anchor.set(0.5);
    frame.width = playerCard.w;
    frame.height = playerCard.h;
    frame.position.set(playerCard.cx, playerCard.cy);
    this.container.addChild(frame);

    this.slotsLayer = new PIXI.Container();
    this.container.addChild(this.slotsLayer);
  }

  /** (Re)build the 9x3 boxes and place the card's 15 numbers. */
  setCard(card) {
    this.slotsLayer.removeChildren();
    this.slotSprites.clear();
    const { cardSlots } = this.L;
    const byCell = new Map(); // "col:row" -> number
    for (const slot of card.slots) byCell.set(`${slot.col}:${slot.row}`, slot.n);

    for (let col = 0; col < 9; col++) {
      for (let row = 0; row < 3; row++) {
        const cx = cardSlots.x0 + col * cardSlots.pitchX;
        const cy = cardSlots.y0 + row * cardSlots.pitchY;
        const tile = frameSprite(this.sheets, 'Card/card_landscape_emptybox');
        tile.anchor.set(0.5);
        tile.width = cardSlots.boxW;
        tile.height = cardSlots.boxH;
        tile.position.set(cx, cy);
        this.slotsLayer.addChild(tile);
        const n = byCell.get(`${col}:${row}`);
        if (n != null) {
          const text = new PIXI.Text(String(n), textStyle(cardSlots.boxH * 0.42, '#2f8a84'));
          text.anchor.set(0.5);
          text.position.set(cx, cy - 1);
          this.slotsLayer.addChild(text);
          this.slotSprites.set(n, { tile, text });
        }
      }
    }
  }

  /** Swap a drawn card number's tile to the red matchbox. */
  markMatch(number) {
    const s = this.slotSprites.get(number);
    if (!s) return;
    s.tile.texture = this._tex('Card/card_landscape_matchbox');
    s.text.style = textStyle(this.L.cardSlots.boxH * 0.42, '#ffffff');
    gsap.fromTo(s.tile.scale, { x: 1.5, y: 1.5 }, { x: 1, y: 1, duration: 0.35, ease: 'back.out(2)' });
    gsap.fromTo(s.text.scale, { x: 1.6, y: 1.6 }, { x: 1, y: 1, duration: 0.35, ease: 'back.out(2)' });
  }

  _tex(name) {
    for (const key of Object.keys(this.sheets)) {
      const t = this.sheets[key].textures[name];
      if (t) return t;
    }
    return PIXI.Texture.WHITE;
  }
}
