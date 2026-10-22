/**
 * Machine view — coop, chicken, egg tray and the round controls.
 *
 * Composition matches the original frontend (bundle.js MachineView):
 *   tower (Machines/Background, the red door) -> drawn egg -> rope tray
 *   (Machines/Rope: two rope columns + hay shelf) -> vine frame
 *   (Machines/FrameBackground) -> chicken -> front frame (Machines/FrameFront
 *   with the bunting + nest) -> straw/fur/leaf bursts.
 *
 * The drawn ball is the Machines/egg sprite (golden egg with the teal glass)
 * carrying the white ball number on the glass — exactly like the reference.
 * It drops from the nest onto the hay tray; the previous egg rolls off to
 * the right (angle 220 normal / 150 turbo+instant).
 *
 * Chicken choreography (AnimationsController):
 *  - IDLE: static (original builds the AnimatedSprite with loop=false).
 *  - Normal ball: chicken_normal 0-42 once @.35; egg drops at frame 32.
 *  - Turbo round: intro chicken_turbo 0-42 once @1.25 (+leaf burst,
 *    TurboStartChicken sound); per ball chicken_turbo 42-60 once @1.25,
 *    egg drops at local frame 18 (+straw & fur bursts).
 *  - Turbo can be switched ON and OFF at any time; the FAST button flaps
 *    its wings (Turbo/turboloop) while turbo is on.
 */
import { textStyle, SpriteButton } from './widgets.js';
import { frameSprite, prefixAnimatedSprite } from './assets.js';

const PLAY_FRAMES = {
  out: 'Play/play_out', over: 'Play/play_over', down: 'Play/play_down', disable: 'Play/play_disable',
};
const SKIP_FRAMES = {
  out: 'Skip/skip_out', over: 'Skip/skip_over', down: 'Skip/skip_down', disable: 'Skip/skip_disable',
};
const TURBO_OFF = {
  out: 'Turbo/turbo_off_out', over: 'Turbo/turbo_off_over', down: 'Turbo/turbo_off_down', disable: 'Turbo/turbo_off_disable',
};

const NORMAL_SPEED = 0.35;
const TURBO_SPEED = 1.25;
const STRAW_SPEED = 0.75;
const NORMAL_TRIGGER = 32;
const TURBO_TRIGGER = 18;

export class MachineView {
  constructor(sheets, config, audio, renderer, layout) {
    this.sheets = sheets;
    this.config = config;
    this.audio = audio;
    this.renderer = renderer;
    this.L = layout;
    this.container = new PIXI.Container();
    this._turbo = false;
    this._laySeq = 0;
    this._buildCoop();
    this._buildChicken();
    this._buildButtons();
  }

  // ------------------------------------------------------------- coop stack
  _buildCoop() {
    const { machineBack, machineFrame, tray, straw } = this.L;

    // tower: red barn door below the machine
    const back = frameSprite(this.sheets, 'Machines/Background');
    back.anchor.set(0.5);
    back.width = machineBack.w; back.height = machineBack.h;
    back.position.set(machineBack.cx, machineBack.cy);
    this.container.addChild(back);

    // drawn eggs live between the tower and the tray (tray hay overlaps them)
    this.eggLayer = new PIXI.Container();
    this.container.addChild(this.eggLayer);
    this.egg = null;

    // rope tray: two rope columns + hay shelf (Machines/Rope)
    const rope = frameSprite(this.sheets, 'Machines/Rope');
    rope.anchor.set(0.5);
    rope.width = tray.w; rope.height = tray.h;
    rope.position.set(tray.cx, tray.cy);
    this.container.addChild(rope);

    // vine frame (dark interior the chicken sits in)
    const frame = frameSprite(this.sheets, 'Machines/FrameBackground');
    frame.anchor.set(0.5);
    frame.width = machineFrame.w; frame.height = machineFrame.h;
    frame.position.set(machineFrame.cx, machineFrame.cy);
    this.container.addChild(frame);

    // front frame: bunting on top, nest at the bottom (chicken goes behind it)
    const front = frameSprite(this.sheets, 'Machines/FrameFront');
    front.anchor.set(0.5);
    const fs = machineFrame.w / 327; // same scale as FrameBackground (orig 1.2)
    front.width = 312 * fs; front.height = 291 * fs;
    front.position.set(machineFrame.cx, machineFrame.cy);
    this.frontSprite = front;
    this.container.addChild(front);

    // straw burst where the egg lands
    const strawTex = prefixAnimatedSprite(this.sheets, 'Machines/chicken_straw/', 45, this.renderer).textures;
    this.strawAnim = new PIXI.AnimatedSprite(strawTex);
    this.strawAnim.anchor.set(0.5);
    this.strawAnim.loop = false;
    this.strawAnim.animationSpeed = STRAW_SPEED;
    this.strawAnim.visible = false;
    this.strawAnim.width = straw.w; this.strawAnim.height = straw.h;
    this.strawAnim.position.set(straw.cx, straw.cy);
    this.strawAnim.onComplete = () => { this.strawAnim.visible = false; };
    this.container.addChild(this.strawAnim);

    // fur + leaf bursts (turbo / win)
    this.furAnim = prefixAnimatedSprite(this.sheets, 'Machines/chicken_fur/', 39, this.renderer);
    this.furAnim.anchor.set(0.5); this.furAnim.loop = false; this.furAnim.visible = false;
    this.furAnim.width = 200; this.furAnim.height = 172;
    this.furAnim.position.set(this.L.chicken.cx, this.L.chicken.bottom - 120);
    this.furAnim.onComplete = () => { this.furAnim.visible = false; };
    this.container.addChild(this.furAnim);

    this.leafAnim = prefixAnimatedSprite(this.sheets, 'Machines/chicken_leaf/', 39, this.renderer);
    this.leafAnim.anchor.set(0.5); this.leafAnim.loop = false; this.leafAnim.visible = false;
    this.leafAnim.width = 190; this.leafAnim.height = 300;
    this.leafAnim.position.set(this.L.chicken.cx + 40, this.L.chicken.bottom - 150);
    this.leafAnim.onComplete = () => { this.leafAnim.visible = false; };
    this.container.addChild(this.leafAnim);
  }

  // ------------------------------------------------------------- chicken
  _buildChicken() {
    const { chicken } = this.L;
    const layFrames = prefixAnimatedSprite(this.sheets, 'Machines/chicken_normal/', 21, this.renderer).textures;
    const turboAll = prefixAnimatedSprite(this.sheets, 'Machines/chicken_turbo/', 75, this.renderer).textures;
    this.chickenFrames = {
      lay: layFrames,
      turboIntro: turboAll.slice(0, 43),
      turboLay: turboAll.slice(42, 61),
    };
    this.chicken = new PIXI.AnimatedSprite(layFrames);
    this.chicken.anchor.set(0.5, 1);
    this.chicken.animationSpeed = NORMAL_SPEED;
    const sc = chicken.h / this.chicken.texture.height;
    this.chicken.scale.set(sc);
    this.chickenHolder = new PIXI.Container();
    this.chickenHolder.position.set(chicken.cx, chicken.bottom);
    this.container.addChildAt(this.chickenHolder, this.container.getChildIndex(this.frontSprite));
    this.chickenHolder.addChild(this.chicken);
    this.chicken.gotoAndStop(0); // IDLE: static (original: loop=false)
  }

  /** One lay cycle. Calls back when the egg drops (frame 32 / 18). */
  layBall(ball, isMatch, turbo, onLanded) {
    const seq = ++this._laySeq;
    const frames = turbo ? this.chickenFrames.turboLay : this.chickenFrames.lay;
    const trigger = turbo ? TURBO_TRIGGER : NORMAL_TRIGGER;
    const anim = this.chicken;
    anim.textures = frames;
    anim.animationSpeed = turbo ? TURBO_SPEED : NORMAL_SPEED;
    anim.loop = false;
    anim.onComplete = null;
    this._pendingLanded = onLanded;
    anim.onFrameChange = (f) => {
      if (seq !== this._laySeq) return;
      if (f >= trigger) {
        anim.onFrameChange = null;
        this._pendingLanded = null;
        this._dropEgg(ball, isMatch, turbo);
        onLanded?.();
      }
    };
    anim.gotoAndPlay(0);
    if (!turbo) this.audio?.play('ChickenSound');
    this.audio?.play('MachineVibration');
  }

  stopLay() {
    this._laySeq++;
    this.chicken.onFrameChange = null;
    this.chicken.onComplete = null;
    this.chicken.stop();
  }

  /** Turbo intro: wings + leaves, once (round start or mid-round enable). */
  playTurboIntro() {
    const anim = this.chicken;
    anim.textures = this.chickenFrames.turboIntro;
    anim.animationSpeed = TURBO_SPEED;
    anim.loop = false;
    anim.onFrameChange = null;
    this._burst(this.leafAnim, 0.65);
    this.audio?.play('TurboStartChicken');
    return new Promise((res) => {
      anim.onComplete = () => { anim.onComplete = null; res(); };
      anim.gotoAndPlay(0);
    });
  }

  /** Idle: static first frame of the normal set (original behaviour). */
  setIdle() {
    this.stopLay();
    this.chicken.textures = this.chickenFrames.lay;
    this.chicken.animationSpeed = NORMAL_SPEED;
    this.chicken.gotoAndStop(0);
  }

  // ------------------------------------------------------------- egg
  _makeEgg(ball) {
    const c = new PIXI.Container();
    const egg = frameSprite(this.sheets, 'Machines/egg');
    egg.anchor.set(0.5);
    egg.width = this.L.drawnEgg.w;
    egg.height = this.L.drawnEgg.h;
    c.addChild(egg);
    const num = new PIXI.Text(String(ball), textStyle(this.L.drawnEgg.h * 0.34, '#ffffff'));
    num.anchor.set(0.5);
    num.position.set(0, this.L.drawnEgg.h * 0.08); // centred on the teal glass
    c.addChild(num);
    return c;
  }

  _burst(anim, speed) {
    anim.animationSpeed = speed;
    anim.visible = true;
    anim.gotoAndPlay(0);
  }

  /** Egg drops from the nest onto the hay tray (original: 113 -> 233). */
  _dropEgg(ball, isMatch, turbo) {
    if (this.egg) {
      const old = this.egg;
      gsap.to(old, {
        x: this.L.drawnEgg.cx + this.L.eggRollX,
        rotation: (turbo ? 150 : 220) * Math.PI / 180,
        duration: turbo ? 0.35 : 0.5, ease: 'elastic.out(1, 0.8)',
        onComplete: () => { this.eggLayer.removeChild(old); },
      });
    }
    this._burst(this.strawAnim, turbo ? 1.5 : STRAW_SPEED);
    if (turbo) this._burst(this.furAnim, 0.65);
    this.audio?.play('Straw');

    const egg = this._makeEgg(ball);
    const dropFrom = this.L.drawnEgg.cy - this.L.drawnEgg.h * 1.05;
    egg.position.set(this.L.drawnEgg.cx, dropFrom);
    this.eggLayer.addChild(egg);
    this.egg = egg;
    this.audio?.play('EggFalls');
    gsap.to(egg, {
      y: this.L.drawnEgg.cy, duration: 0.15, ease: 'sine.in',
      onComplete: () => {
        gsap.fromTo(egg, { y: this.L.drawnEgg.cy }, {
          y: this.L.drawnEgg.cy + this.L.drawnEgg.h * 0.12, duration: 0.05, repeat: 1, yoyo: true,
        });
      },
    });
  }

  /** Show an egg instantly (skip path / rebuild) without animation. */
  showEggInstant(ball) {
    if (this.egg) this.eggLayer.removeChild(this.egg);
    this.egg = this._makeEgg(ball);
    this.egg.position.set(this.L.drawnEgg.cx, this.L.drawnEgg.cy);
    this.eggLayer.addChild(this.egg);
  }

  /** End of round: roll the eggs off (original: x -> +190, angle 150). */
  rollEggsOff() {
    return new Promise((res) => {
      if (this.egg) {
        const e = this.egg;
        gsap.to(e, {
          x: this.L.drawnEgg.cx + this.L.eggRollX, rotation: 150 * Math.PI / 180,
          duration: 0.5, ease: 'elastic.out(1, 0.8)',
          onComplete: () => this.eggLayer.removeChild(e),
        });
      }
      this.egg = null;
      gsap.delayedCall(0.5, res);
    });
  }

  clearCompartment() {
    if (this.egg) this.eggLayer.removeChild(this.egg);
    this.egg = null;
    this.setIdle();
  }

  // ------------------------------------------------------------- win celebration
  playWinCelebrate() {
    const anim = this.chicken;
    anim.textures = this.chickenFrames.lay;
    anim.animationSpeed = NORMAL_SPEED;
    anim.loop = false;
    this._burst(this.strawAnim, STRAW_SPEED);
    this._burst(this.leafAnim, 0.65);
    this.audio?.play('ChickenJump');
    this.audio?.play('Leaf');
    gsap.to(this.chickenHolder, {
      y: this.L.chicken.bottom + 58, duration: 0.25, ease: 'sine.in', yoyo: true, repeat: 1,
    });
    anim.onComplete = null;
    anim.gotoAndPlay(0);
    setTimeout(() => anim.gotoAndStop(0), 2100);
  }

  // ------------------------------------------------------------- buttons
  _buildButtons() {
    const S = this.sheets;
    const L = this.L;

    this.playBtn = new SpriteButton(S, PLAY_FRAMES, { w: L.play.w, h: L.play.h });
    this.playBtn.container.position.set(L.play.cx, L.play.cy);
    this.container.addChild(this.playBtn.container);

    // FAST (turbo) button: static egg when off; flapping wings when on
    this.turboBtn = new SpriteButton(S, TURBO_OFF, { w: L.turbo.w, h: L.turbo.h });
    this.turboBtn.container.position.set(L.turbo.cx, L.turbo.cy);
    this.container.addChild(this.turboBtn.container);

    const startFrames = prefixAnimatedSprite(S, 'Turbo/turbostart/', 18, this.renderer).textures;
    const loopFrames = prefixAnimatedSprite(S, 'Turbo/turboloop/', 18, this.renderer).textures;
    this.turboWings = new PIXI.AnimatedSprite(loopFrames);
    this.turboWings.anchor.set(0.5);
    this.turboWings.loop = true;
    this.turboWings.animationSpeed = 0.3;
    const ws = Math.max(L.turbo.w / this.turboWings.texture.width, L.turbo.h / this.turboWings.texture.height);
    this.turboWings.scale.set(ws * 1.05);
    this.turboWings.visible = false;
    this.turboWings.eventMode = 'none';
    this.turboBtn.container.addChild(this.turboWings);
    this._turboStartFrames = startFrames;

    this.newCardBtn = new SpriteButton(S, {
      out: 'Card/new_card_out', over: 'Card/new_card_over', down: 'Card/new_card_down', disable: 'Card/new_card_disable',
    }, { w: L.newCard.w, h: L.newCard.h });
    this.newCardBtn.container.position.set(L.newCard.cx, L.newCard.cy);
    // the sign sprite is blank — the original draws the label on it
    const ncText = new PIXI.Text('NEW CARD', textStyle(L.newCard.w * 0.15, '#5a4632'));
    ncText.anchor.set(0.5);
    ncText.position.set(0, -L.newCard.h * 0.14);
    this.newCardBtn.container.addChild(ncText);
    this.container.addChild(this.newCardBtn.container);

    this.betPlusBtn = new SpriteButton(S, {
      out: 'Bet/betplusbutton_out', over: 'Bet/betplusbutton_over', down: 'Bet/betplusbutton_down', disable: 'Bet/betplusbutton_disabled',
    }, { w: L.betPlus.w, h: L.betPlus.h });
    this.betPlusBtn.container.position.set(L.betPlus.cx, L.betPlus.cy);
    this.container.addChild(this.betPlusBtn.container);

    this.betMinusBtn = new SpriteButton(S, {
      out: 'Bet/betdownbutton_out', over: 'Bet/betdownbutton_over', down: 'Bet/betdownbutton_down', disable: 'Bet/betdownbutton_disabled',
    }, { w: L.betMinus.w, h: L.betMinus.h });
    this.betMinusBtn.container.position.set(L.betMinus.cx, L.betMinus.cy);
    this.container.addChild(this.betMinusBtn.container);

    const box = frameSprite(S, 'Bet/betscreen');
    box.anchor.set(0.5);
    box.width = L.betScreen.w; box.height = L.betScreen.h;
    box.position.set(L.betScreen.cx, L.betScreen.cy);
    this.container.addChild(box);
    this.betText = new PIXI.Text('0,20', textStyle(L.betScreen.h * 0.3, '#333a68'));
    this.betText.anchor.set(0.5);
    this.betText.position.set(L.betScreen.cx, L.betScreen.cy + 2);
    this.container.addChild(this.betText);

    // hover blip on all buttons (original OverButton sound)
    for (const b of [this.playBtn, this.turboBtn, this.newCardBtn, this.betPlusBtn, this.betMinusBtn]) {
      b.onHover = () => this.audio?.play('OverButton');
    }
  }

  setBetText(v, fmt) { this.betText.text = fmt(v); }

  /**
   * Turbo toggle visual. When ON the button flaps its wings (Turbo/turboloop)
   * — works both at idle and during the round, and can be switched back off.
   */
  setTurboVisual(on) {
    this._turbo = on;
    this.turboWings.visible = on;
    if (on) {
      this.turboWings.gotoAndPlay(0);
      this.audio?.loop('TurboButtonWings');
    } else {
      this.turboWings.stop();
      this.audio?.stopLoop('TurboButtonWings');
    }
  }

  /** PLAY <-> FORWARD morph, grey out IDLE-only controls. */
  setRoundMode(inRound) {
    this.playBtn.setFrames(this.sheets, inRound ? SKIP_FRAMES : PLAY_FRAMES);
    this.playBtn.setEnabled(true);
    this.newCardBtn.setEnabled(!inRound);
    this.betPlusBtn.setEnabled(!inRound);
    this.betMinusBtn.setEnabled(!inRound);
  }

  /** Resolve any in-flight lay callback (used before the view is destroyed). */
  destroy() {
    this.stopLay();
    if (this._pendingLanded) { const cb = this._pendingLanded; this._pendingLanded = null; cb(); }
    this.container.destroy({ children: true });
  }
}
