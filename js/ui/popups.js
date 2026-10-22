/**
 * Popups: win dialog, BIG WIN banner, generic dim layer.
 */
import { textStyle } from './widgets.js';
import { frameSprite, prefixAnimatedSprite } from './assets.js';
import { formatMoney } from '../math/bingoMath.js';

export class Popups {
  constructor(sheets, config, layout) {
    this.sheets = sheets;
    this.config = config;
    this.L = layout;
    this.container = new PIXI.Container();
    this.container.visible = false;
    this._build();
  }

  _build() {
    this.dim = new PIXI.Graphics();
    this.dim.beginFill(0x000000, 0.55).drawRect(0, 0, this.L.dim.w, this.L.dim.h).endFill();
    this.dim.eventMode = 'static';
    this.container.addChild(this.dim);

    // --- win popup: wooden board + texts + OK button
    this.winBox = new PIXI.Container();
    const board = frameSprite(this.sheets, 'UI/win_Popup');
    board.anchor.set(0.5);
    board.width = 560; board.height = 363;
    this.winBox.addChild(board);

    const t1 = new PIXI.Text('CONGRATULATIONS', textStyle(34, '#ffffff', { stroke: '#4a2410', strokeThickness: 6 }));
    t1.anchor.set(0.5); t1.position.set(0, -108);
    const t2 = new PIXI.Text('You have Won Total', textStyle(22, '#ffe9c9'));
    t2.anchor.set(0.5); t2.position.set(0, -58);
    this.winAmount = new PIXI.Text('€0,30', textStyle(44, '#ffe27a', { stroke: '#4a2410', strokeThickness: 6 }));
    this.winAmount.anchor.set(0.5); this.winAmount.position.set(0, 4);
    this.winBox.addChild(t1, t2, this.winAmount);

    // OK button
    const okG = new PIXI.Graphics();
    okG.beginFill(0x2ba3a8).drawRoundedRect(-60, -24, 120, 48, 10).endFill();
    okG.beginFill(0x4fd3d8, 0.6).drawRoundedRect(-56, -20, 112, 20, 8).endFill();
    const okT = new PIXI.Text('OK', textStyle(24, '#ffffff'));
    okT.anchor.set(0.5);
    okG.addChild(okT);
    okG.position.set(0, 92);
    okG.eventMode = 'static'; okG.cursor = 'pointer';
    okG.on('pointertap', () => this.hide());
    this.winBox.addChild(okG);

    this.winBox.position.set(this.L.winPopup.x, this.L.winPopup.y);
    this.winBox.visible = false;
    this.container.addChild(this.winBox);

    // --- BIG WIN banner
    this.bigwin = new PIXI.Container();
    const bw = frameSprite(this.sheets, 'BigWin/bigwinbitmap');
    bw.anchor.set(0.5);
    bw.width = 520;
    this.bigAmount = new PIXI.Text('', textStyle(46, '#fff3cf', { stroke: '#a3541f', strokeThickness: 8 }));
    this.bigAmount.anchor.set(0.5);
    this.bigAmount.position.set(0, 96);
    this.bigwin.addChild(bw, this.bigAmount);
    this.bigwin.position.set(this.L.bigWin.x, this.L.bigWin.y);
    this.bigwin.visible = false;
    this.container.addChild(this.bigwin);
  }

  showWin(amount, { big = false } = {}) {
    this.container.visible = true;
    this.winAmount.text = formatMoney(amount);
    this.winBox.visible = true;
    this.winBox.alpha = 0;
    this.winBox.scale.set(0.6);
    gsap.to(this.winBox, { alpha: 1, duration: 0.3 });
    gsap.to(this.winBox.scale, { x: 1, y: 1, duration: 0.45, ease: 'back.out(1.8)' });
    if (big) {
      this.bigwin.visible = true;
      this.bigAmount.text = formatMoney(amount);
      this.bigwin.alpha = 0; this.bigwin.scale.set(0.4);
      gsap.to(this.bigwin, { alpha: 1, duration: 0.4 });
      gsap.to(this.bigwin.scale, { x: 1, y: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
    }
    return new Promise((res) => { this._onHide = res; });
  }

  hide() {
    gsap.to(this.winBox, {
      alpha: 0, duration: 0.25, onComplete: () => {
        this.container.visible = false;
        this.winBox.visible = false;
        this.bigwin.visible = false;
        this._onHide?.();
        this._onHide = null;
      },
    });
  }
}
