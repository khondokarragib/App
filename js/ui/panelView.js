/**
 * Panel view — bingo board + paytable silo.
 *
 * Board (left): BingoMatrix/bm_landscape_frame_normal (wooden frame + wings +
 * ladder), the graph-paper sprite and the 10 COLUMNS x 9 ROWS number grid
 * (row 1 is 1..10, like the reference). Card numbers sit on teal
 * bingoMatrixBoxOnScreen tiles with WHITE text; a drawn match becomes
 * bingoMatrixBoxMatch (red); a drawn miss becomes bingoMatrixBoxPass (dark).
 *
 * Silo (right): Payout/payout_landscape_frame_normal with the BALLS selector
 * (tap the BALLS header to cycle 3/6/9/12) and the 14 paytable rows. The
 * white payout_landscape_indicator pill marks the row currently in play
 * (first bracket >= balls called) and advances with the PayoutChanged sound;
 * when the round finishes, brackets below the finishing ball count are struck
 * through with payout_line_match and the won row pulses (original behaviour).
 */
import { textStyle } from './widgets.js';
import { frameSprite } from './assets.js';
import { formatMoney } from '../math/bingoMath.js';

const NUM_DARK = '#3b3f6b';
const PAY_BROWN = '#5a2c15';

export class PanelView {
  constructor(sheets, config, layout) {
    this.sheets = sheets;
    this.config = config;
    this.L = layout;
    this.container = new PIXI.Container();
    this.cellSprites = new Map(); // number -> {box, text}
    this.onBallsChange = null;
    this.onPayRowAdvance = null;  // sound hook
    this._payIdx = -1;            // currently indicated row
    this._buildGridPanel();
    this._buildSilo();
  }

  // -------------------------------------------------------------- grid
  _buildGridPanel() {
    const { panelFrame, ballsBoard, grid, paper } = this.L;

    // wooden frame + ladder sprite
    const frame = frameSprite(this.sheets, 'BingoMatrix/bm_landscape_frame_normal');
    frame.anchor.set(0.5);
    frame.width = panelFrame.w;
    frame.height = panelFrame.h;
    frame.position.set(panelFrame.cx, panelFrame.cy);
    this.container.addChild(frame);

    // graph-paper background for the grid
    const paperSpr = frameSprite(this.sheets, 'BingoMatrix/bm_landscape_background');
    paperSpr.anchor.set(0.5);
    paperSpr.width = paper.w;
    paperSpr.height = paper.h;
    paperSpr.position.set(paper.cx, paper.cy);
    this.container.addChild(paperSpr);

    this.gridLayer = new PIXI.Container();
    this.container.addChild(this.gridLayer);
    this._drawCardCells([]);

    // "BALLS CALLED" white board hanging from the frame's top beam
    const board = new PIXI.Graphics();
    board.beginFill(0xfff6e8);
    board.lineStyle(3, 0xd8bfa0, 1);
    board.drawRoundedRect(ballsBoard.x, ballsBoard.y, ballsBoard.w, ballsBoard.h, 14);
    board.endFill();
    this.container.addChild(board);

    const label = new PIXI.Text('BALLS CALLED', textStyle(ballsBoard.h * 0.48, '#333a68'));
    label.anchor.set(0, 0.5);
    label.position.set(ballsBoard.x + 16, ballsBoard.y + ballsBoard.h / 2 + 1);
    this.container.addChild(label);

    this.ballsCalledText = new PIXI.Text('0', textStyle(ballsBoard.h * 0.55, '#333a68'));
    this.ballsCalledText.anchor.set(1, 0.5);
    this.ballsCalledText.position.set(ballsBoard.x + ballsBoard.w - 16, ballsBoard.y + ballsBoard.h / 2 + 1);
    this.container.addChild(this.ballsCalledText);
  }

  /** (Re)draw the 90 cells: teal tile + white text behind card numbers. */
  _drawCardCells(cardNumbers) {
    this.gridLayer.removeChildren();
    this.cellSprites.clear();
    const { grid } = this.L;
    const cardSet = new Set(cardNumbers);
    for (let n = 1; n <= 90; n++) {
      const idx = n - 1;
      const col = idx % grid.cols;              // 10 columns: row 1 = 1..10
      const row = Math.floor(idx / grid.cols);
      const cx = grid.x0 + col * grid.pitchX;
      const cy = grid.y0 + row * grid.pitchY;
      const isCard = cardSet.has(n);
      let box = null;
      if (isCard) {
        box = frameSprite(this.sheets, 'BingoMatrix/bingoMatrixBoxOnScreen');
        box.anchor.set(0.5);
        box.width = grid.box;
        box.height = grid.box;
        box.position.set(cx, cy);
        this.gridLayer.addChild(box);
      }
      // card numbers are WHITE on the teal tile (reference); others dark
      const text = new PIXI.Text(String(n), textStyle(grid.box * 0.58, isCard ? '#ffffff' : NUM_DARK));
      text.anchor.set(0.5);
      text.position.set(cx, cy + 1);
      this.gridLayer.addChild(text);
      this.cellSprites.set(n, { box, text, cx, cy, isCard });
    }
  }

  /** Mark a drawn number: match -> red tile, miss -> dark tile, white text. */
  markDrawn(number, isHit) {
    const cell = this.cellSprites.get(number);
    if (!cell) return;
    if (!cell.box) {
      cell.box = frameSprite(this.sheets, 'BingoMatrix/bingoMatrixBoxPass');
      cell.box.anchor.set(0.5);
      cell.box.width = this.L.grid.box;
      cell.box.height = this.L.grid.box;
      cell.box.position.set(cell.cx, cell.cy);
      this.gridLayer.addChildAt(cell.box, this.gridLayer.getChildIndex(cell.text));
    }
    cell.box.texture = this._tex(isHit ? 'BingoMatrix/bingoMatrixBoxMatch' : 'BingoMatrix/bingoMatrixBoxPass');
    cell.text.style = textStyle(this.L.grid.box * 0.58, '#ffffff');
    if (isHit) {
      gsap.fromTo(cell.text.scale, { x: 1.7, y: 1.7 }, { x: 1, y: 1, duration: 0.35, ease: 'back.out(2)' });
      gsap.fromTo(cell.box.scale, { x: 1.5, y: 1.5 }, { x: 1, y: 1, duration: 0.35, ease: 'back.out(2)' });
    }
  }

  _tex(name) {
    for (const key of Object.keys(this.sheets)) {
      const t = this.sheets[key].textures[name];
      if (t) return t;
    }
    return PIXI.Texture.WHITE;
  }

  setBallsCalled(n) {
    this.ballsCalledText.text = String(n);
    gsap.fromTo(this.ballsCalledText.scale, { x: 1.35, y: 1.35 }, { x: 1, y: 1, duration: 0.25, ease: 'back.out(2)' });
    this._advanceIndicator(n);
  }

  resetForCard(card) {
    this._drawCardCells(card.numbers);
    this.ballsCalledText.text = '0';
    this._clearStrikes();
    this._setIndicator(this.config.paytable[0] ? 0 : -1, true);
  }

  /** Flash all card cells when the card completes. */
  flashCard(numbers, done) {
    let i = 0;
    const flash = () => {
      for (const n of numbers) {
        const cell = this.cellSprites.get(n);
        if (cell?.box) cell.box.alpha = (i % 2 === 0) ? 0.25 : 1;
      }
      i++;
      if (i < 6) setTimeout(flash, 130);
      else done?.();
    };
    flash();
  }

  // -------------------------------------------------------------- silo
  _buildSilo() {
    const { silo, paytable, ballsHeader } = this.L;

    // red silo sprite (body + cream paper + snow cap baked in)
    const body = frameSprite(this.sheets, 'Payout/payout_landscape_frame_normal');
    body.anchor.set(0.5);
    body.width = silo.w;
    body.height = silo.h;
    body.position.set(silo.cx, silo.cy);
    this.container.addChild(body);

    // BALLS header: title + count badge; the whole header cycles the setting
    const title = new PIXI.Text('BALLS', textStyle(ballsHeader.font || 25, '#fff8ea', { stroke: '#7a2020', strokeThickness: 5 }));
    title.anchor.set(1, 0.5);
    title.position.set(ballsHeader.cx, ballsHeader.cy);
    this.container.addChild(title);

    const badgeG = new PIXI.Graphics();
    badgeG.beginFill(0x8e2323).drawCircle(0, 0, (ballsHeader.badgeR || 15)).endFill();
    badgeG.position.set(ballsHeader.countCx, ballsHeader.countCy);
    this.container.addChild(badgeG);
    this.ballsValue = new PIXI.Text('3', textStyle((ballsHeader.font || 25) * 0.95, '#fff8ea'));
    this.ballsValue.anchor.set(0.5);
    this.ballsValue.position.set(ballsHeader.countCx, ballsHeader.countCy + 1);
    this.container.addChild(this.ballsValue);

    const hit = new PIXI.Graphics();
    hit.beginFill(0xffffff, 0.001)
      .drawRect(ballsHeader.cx - 90, ballsHeader.cy - 26, (ballsHeader.countCx - ballsHeader.cx) + 120, 52)
      .endFill();
    hit.eventMode = 'static';
    hit.cursor = 'pointer';
    hit.on('pointertap', () => this.onBallsChange?.(1));
    this.container.addChild(hit);

    // paytable rows + indicator pill + strike lines
    this.payLayer = new PIXI.Container();
    this.container.addChild(this.payLayer);

    this.payIndicator = frameSprite(this.sheets, 'Payout/payout_landscape_indicator');
    this.payIndicator.anchor.set(0.5);
    this.payIndicator.width = paytable.indW;
    this.payIndicator.height = paytable.indH;
    this.payIndicator.visible = false;
    this.container.addChild(this.payIndicator);

    this.payRows = [];
    this.payStrikes = [];
    this.renderPaytable(0.20, 1);
  }

  /** Draw paytable text rows for the current bet x BALLS factor. */
  renderPaytable(bet, factor) {
    this.payLayer.removeChildren();
    for (const s of this.payStrikes) this.container.removeChild(s);
    this.payStrikes = [];
    this.payRows = [];
    const { paytable } = this.L;
    this.config.paytable.forEach((row, i) => {
      const y = paytable.y0 + i * paytable.rowH;
      const amount = bet * row.multiplier * factor;
      const num = new PIXI.Text(String(row.maxBalls), textStyle(paytable.font, PAY_BROWN));
      num.anchor.set(1, 0.5);
      num.position.set(paytable.numX, y);
      const dash = new PIXI.Text('—', textStyle(paytable.font, PAY_BROWN));
      dash.anchor.set(0.5, 0.5);
      dash.position.set(paytable.dashX, y);
      const val = new PIXI.Text(formatMoney(amount).replace(/[€\s]/g, ''), textStyle(paytable.font, PAY_BROWN));
      val.anchor.set(1, 0.5);
      val.position.set(paytable.valX, y);
      this.payLayer.addChild(num, dash, val);
      this.payRows.push({ y, row, num, val });
    });
    this._setIndicator(this._payIdx, true);
  }

  /** Move the white pill to the first bracket >= ballsCalled. */
  _advanceIndicator(ballsCalled) {
    const idx = this.config.paytable.findIndex((r) => ballsCalled <= r.maxBalls);
    this._setIndicator(idx, false);
  }

  _setIndicator(idx, silent) {
    if (idx === this._payIdx && !silent) return;
    const advanced = idx > this._payIdx && this._payIdx >= 0;
    this._payIdx = idx;
    if (idx < 0 || !this.payRows[idx]) { this.payIndicator.visible = false; return; }
    this.payIndicator.visible = true;
    this.payIndicator.position.set(this.L.paytable.indX, this.payRows[idx].y);
    // the pill sits BEHIND the row text
    this.container.setChildIndex(this.payIndicator, this.container.getChildIndex(this.payLayer));
    if (advanced && !silent) this.onPayRowAdvance?.();
  }

  /** Round finished: strike brackets below the finish count, pulse the won row. */
  showResultRows(finishBalls) {
    const { paytable } = this.L;
    this._clearStrikes();
    this.config.paytable.forEach((row, i) => {
      if (row.maxBalls < finishBalls) {
        const strike = frameSprite(this.sheets, 'Payout/payout_line_match');
        strike.anchor.set(0.5);
        strike.width = paytable.indW;
        strike.height = paytable.indH * 0.8;
        strike.position.set(paytable.indX, this.payRows[i].y);
        this.container.addChild(strike);
        this.payStrikes.push(strike);
        this.payRows[i].num.alpha = 0.55;
        this.payRows[i].val.alpha = 0.55;
      }
    });
    const idx = this.config.paytable.findIndex((r) => finishBalls <= r.maxBalls);
    this._setIndicator(idx, true);
    if (idx >= 0 && this.payRows[idx]) {
      const t = this.payIndicator;
      gsap.to(t.scale, { x: 1.08, y: 1.15, duration: 0.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      this._pulseTarget = t;
    }
  }

  _clearStrikes() {
    for (const s of this.payStrikes) this.container.removeChild(s);
    this.payStrikes = [];
    for (const r of this.payRows) { r.num.alpha = 1; r.val.alpha = 1; }
    if (this._pulseTarget) { gsap.killTweensOf(this._pulseTarget.scale); this._pulseTarget.scale.set(1); this._pulseTarget = null; }
  }

  /** Back to idle presentation (new card / new round). */
  resetPaytableRows() {
    this._clearStrikes();
    this._payIdx = -1;
    this._setIndicator(0, true);
  }

  highlightPayRow(idx) { this._setIndicator(idx, true); }

  setBallsSetting(n) {
    this.ballsValue.text = String(n);
    gsap.fromTo(this.ballsValue.scale, { x: 1.4, y: 1.4 }, { x: 1, y: 1, duration: 0.3, ease: 'back.out(2)' });
  }
}
