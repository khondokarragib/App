/**
 * The Golden Egg — demo reconstruction entry point.
 * HTML + vanilla JS + PixiJS + GSAP. See docs/ for analysis, math model,
 * integration contract and verification notes.
 *
 * Supports both orientations with the original layouts:
 *  - portrait 720x1280 (phones)    — board left, silo right, coop centre
 *  - landscape 1280x720 (desktop)  — board left, coop centre, silo right
 * Rotating the device rebuilds the views with the other layout profile and
 * re-renders the current game state (even mid-round).
 */
import { CONFIG } from './config.js';
import { loadAssets, frameSprite } from './ui/assets.js';
import { PanelView } from './ui/panelView.js';
import { MachineView } from './ui/machineView.js';
import { CardView } from './ui/cardView.js';
import { Popups } from './ui/popups.js';
import { GameAudio } from './ui/audio.js';
import { DESIGN, LAYOUTS } from './ui/widgets.js';
import { Game, GameState } from './core/game.js';
import { DemoOutcomeProvider } from './outcomes/demoProvider.js';
import { DemoHostAdapter } from './integration/hostAdapter.js';
import { formatMoney } from './math/bingoMath.js';

const canvas = document.getElementById('game-canvas');
let app;
try {
  app = new PIXI.Application({
    view: canvas,
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
} catch (e) {
  // WebGL unavailable (some browsers/devices): fall back to the 2D canvas
  // renderer so the game still runs.
  app = new PIXI.Application({
    view: canvas,
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true,
    resolution: 1,
    forceCanvas: true,
  });
}
const stage = new PIXI.Container();
app.stage.addChild(stage);

const $ = (id) => document.getElementById(id);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtBet = (v) => formatMoney(v).replace(/[€\s]/g, '');

function pickLayout() {
  return window.innerWidth >= window.innerHeight ? LAYOUTS.landscape : LAYOUTS.portrait;
}

function fitStage(layout) {
  const d = DESIGN[layout.orientation];
  const w = app.screen.width, h = app.screen.height;
  const sc = Math.min(w / d.w, h / d.h);
  stage.scale.set(sc);
  stage.position.set((w - d.w * sc) / 2, (h - d.h * sc) / 2);
}

async function boot() {
  const loadFill = $('load-fill'), loadText = $('load-text');
  const { sheets, textures } = await loadAssets((p) => {
    loadFill.style.width = `${Math.round(p * 100)}%`;
  });
  loadText.textContent = 'Ready';
  const loadingEl = $('loading');
  setTimeout(() => {
    if (!loadingEl) return;
    loadingEl.style.transition = 'opacity 0.5s';
    loadingEl.style.opacity = '0';
    setTimeout(() => loadingEl.remove(), 550);
  }, 200);

  // ---------------- audio / wallet / provider ----------------
  const audio = new GameAudio();
  const wallet = new DemoHostAdapter(CONFIG);
  const seedParam = new URLSearchParams(location.search).get('seed');
  const provider = seedParam !== null
    ? DemoOutcomeProvider.fromSeed(CONFIG, Number(seedParam))
    : new DemoOutcomeProvider(CONFIG);

  // ---------------- views (rebuilt per orientation) ----------------
  const V = { layout: null, bg: null, panel: null, machine: null, card: null, popups: null };
  let uiGeneration = 0;
  let drawingBusy = false;

  function buildBackground(L) {
    const g = new PIXI.Container();
    let bg;
    if (L.orientation === 'portrait') {
      bg = new PIXI.Sprite(textures['background-1']);
      bg.width = DESIGN.portrait.w; bg.height = DESIGN.portrait.h;
    } else {
      bg = frameSprite(sheets, 'Background/bg_landscape_normal');
      bg.anchor.set(0.5);
      bg.width = DESIGN.landscape.w; bg.height = DESIGN.landscape.h;
      bg.position.set(DESIGN.landscape.w / 2, DESIGN.landscape.h / 2);
    }
    g.addChild(bg);

    const barns = L.orientation === 'portrait' ? [L.barn] : [L.barnLeft, L.barnRight];
    for (const b of barns) {
      const s = frameSprite(sheets, 'Background/barn');
      s.anchor.set(0.5);
      s.width = b.w; s.height = b.h;
      s.position.set(b.cx, b.cy);
      g.addChild(s);
    }

    const fm = frameSprite(sheets, L.orientation === 'portrait'
      ? 'Background/flower_portrait_middle' : 'Background/flower_landscape_middle');
    fm.anchor.set(0.5);
    fm.width = L.flowersMiddle.w; fm.height = L.flowersMiddle.h;
    fm.position.set(L.flowersMiddle.cx, L.flowersMiddle.cy);
    g.addChild(fm);

    // drifting clouds
    const clouds = [];
    const cloudY = L.orientation === 'portrait' ? [60, 106, 152] : [40, 84, 128];
    const cloudX = L.orientation === 'portrait' ? [80, 300, 520] : [150, 550, 950];
    const dw = DESIGN[L.orientation].w;
    for (let i = 0; i < 3; i++) {
      const c = frameSprite(sheets, `Background/cloud/0000${i + 1}`);
      c.alpha = 0.9;
      c.position.set(cloudX[i], cloudY[i]);
      c.scale.set(0.9 - i * 0.15);
      g.addChild(c);
      clouds.push(c);
    }
    app.ticker.add((dt) => {
      for (const c of clouds) {
        if (!c.transform) return; // destroyed on rebuild
        c.x += dt * 0.12;
        if (c.x > dw + 60) c.x = -120;
      }
    });

    const ff = frameSprite(sheets, L.orientation === 'portrait'
      ? 'Background/flower_portrait_front' : 'Background/flower_landscape_front');
    ff.anchor.set(0.5);
    ff.width = L.flowersFront.w; ff.height = L.flowersFront.h;
    ff.position.set(L.flowersFront.cx, L.flowersFront.cy);
    g.addChild(ff);

    const logo = frameSprite(sheets, 'Background/logo');
    logo.scale.set(L.logo.scale);
    logo.position.set(L.logo.x, L.logo.y);
    g.addChild(logo);
    return g;
  }

  /** Re-apply the current game state to freshly built views. */
  function renderState() {
    if (!V.panel) return;
    const silent = V.panel.onPayRowAdvance;
    V.panel.onPayRowAdvance = null;

    if (game.card) {
      V.panel.resetForCard(game.card);
      V.card.setCard(game.card);
    }
    V.machine.setBetText(game.bet, fmtBet);
    V.panel.renderPaytable(game.bet, CONFIG.ballsFactor(game.ballsSetting));
    V.panel.setBallsSetting(game.ballsSetting);

    const inRound = game.state !== GameState.IDLE && game.round;
    V.machine.setRoundMode(!!inRound);
    V.machine.setTurboVisual(game.turbo);
    if (inRound) {
      const drawn = game.round.drawn;
      const n = game.revealIndex;
      for (let i = 0; i < n; i++) {
        V.panel.markDrawn(drawn[i].ball, drawn[i].isMatch);
        if (drawn[i].isMatch) V.card.markMatch(drawn[i].ball);
      }
      V.panel.setBallsCalled(n);
      if (n > 0) V.machine.showEggInstant(drawn[n - 1].ball);
    }
    V.panel.onPayRowAdvance = silent;
  }

  function buildUI() {
    uiGeneration++;
    const L = pickLayout();
    for (const key of ['bg', 'panel', 'machine', 'card', 'popups']) {
      const v = V[key];
      if (!v) continue;
      if (key === 'machine') v.destroy();
      else (v.container || v).destroy({ children: true });
    }
    stage.removeChildren();

    V.layout = L;
    V.bg = buildBackground(L);
    V.panel = new PanelView(sheets, CONFIG, L);
    V.machine = new MachineView(sheets, CONFIG, audio, app.renderer, L);
    V.card = new CardView(sheets, L);
    V.popups = new Popups(sheets, CONFIG, L);
    stage.addChild(V.bg, V.panel.container, V.machine.container, V.card.container, V.popups.container);
    fitStage(L);
    wireControls();
    renderState();
  }

  // ---------------- game ----------------
  const game = new Game({
    config: CONFIG,
    provider,
    wallet,
    events: {
      onCardChanged(card) {
        if (!V.panel) return;
        V.panel.resetForCard(card);
        V.card.setCard(card);
        V.machine.clearCompartment();
      },
      onBetChanged(bet) {
        if (!V.panel) return;
        V.machine.setBetText(bet, fmtBet);
        V.panel.renderPaytable(bet, CONFIG.ballsFactor(game.ballsSetting));
      },
      onBallsChanged(n) {
        if (!V.panel) return;
        V.panel.setBallsSetting(n);
        V.panel.renderPaytable(game.bet, CONFIG.ballsFactor(n));
      },
      onTurboChanged(on) {
        if (!V.machine) return;
        V.machine.setTurboVisual(on);
        if (on && game.state === GameState.DRAWING) V.machine.playTurboIntro();
        updateAmbiance();
      },
      onStateChange(s) {
        if (!V.machine) return;
        V.machine.setRoundMode(s !== GameState.IDLE);
        if (s === GameState.DRAWING) runDrawSequence();
        if (s === GameState.IDLE) {
          $('f-win').textContent = formatMoney(0);
          V.machine.clearCompartment();
        }
        updateAmbiance();
      },
      onError(e) { console.warn('game error:', e.message); },
    },
  });

  function updateAmbiance() {
    if (game.turbo && game.state === GameState.DRAWING) {
      audio.stopLoop('AmbianceNormal');
      audio.loop('AmbianceTurbo', { volume: 0.45 });
    } else {
      audio.stopLoop('AmbianceTurbo');
      audio.loop('AmbianceNormal', { volume: 0.4 });
    }
  }

  // ---------------- round presentation ----------------
  async function runDrawSequence() {
    if (drawingBusy) return;
    drawingBusy = true;
    const gen = uiGeneration;
    const round = game.round;
    V.panel.resetForCard(game.card);
    V.machine.clearCompartment();

    let idx = 0;
    if (game.turbo && gen === uiGeneration) await V.machine.playTurboIntro();

    while (game.state === GameState.DRAWING) {
      const res = game.revealNext();
      if (!res) break;
      if (res.skipped) {
        // FORWARD: stop the lay, reveal everything, show the last egg.
        V.machine.stopLay();
        const drawn = round.drawn;
        for (let i = idx; i < drawn.length; i++) {
          V.panel.markDrawn(drawn[i].ball, drawn[i].isMatch);
          if (drawn[i].isMatch) V.card.markMatch(drawn[i].ball);
        }
        V.machine.showEggInstant(drawn[drawn.length - 1].ball);
        V.panel.setBallsCalled(drawn.length);
        idx = drawn.length;
        break;
      }
      idx++;
      const { ball, isMatch } = res;
      // resolves at the egg-drop frame (32 normal / 18 turbo) — like the
      // original, which starts the next ball's lay at that same moment
      await new Promise((resolve) => V.machine.layBall(ball, isMatch, game.turbo, resolve));
      V.panel.markDrawn(ball, isMatch);
      if (isMatch) V.card.markMatch(ball);
      V.panel.setBallsCalled(idx);
    }

    // round complete — the outcome was fixed before any of the above ran.
    if (gen === uiGeneration) {
      V.machine.stopLay();
      await V.machine.rollEggsOff();
    }
    const completion = round.completionBall;
    if (completion && gen === uiGeneration) {
      V.panel.showResultRows(completion);
      V.machine.playWinCelebrate();
      V.panel.flashCard(game.card.numbers, () => {});
      await delay(CONFIG.timings.winPopupDelay * 1000);
    }

    drawingBusy = false;
    await finishRound();
  }

  async function finishRound() {
    const outcome = game.round;
    const win = game.currentWin();
    const isBig = outcome && outcome.multiplier >= CONFIG.bigWinMultiplier;
    if (win > 0) {
      if (isBig) audio.bigWin();
      audio.play('Cong');
      await V.popups.showWin(win, { big: isBig });
    }
    const settled = await game.settle();
    $('f-win').textContent = formatMoney(settled);
    if (V.panel) V.panel.renderPaytable(game.bet, CONFIG.ballsFactor(game.ballsSetting));
  }

  // ---------------- control wiring (re-run after every rebuild) ----------------
  function wireControls() {
    // PLAY starts the round from IDLE; once drawing, the same button has
    // morphed into FORWARD and skips the remaining animation.
    V.machine.playBtn.onPress = () => {
      if (game.state === GameState.IDLE) { audio.play('PlayButton'); game.play(); }
      else { audio.play('Click'); game.skipToEnd(); }
    };
    V.machine.newCardBtn.onPress = () => { audio.play('NewCard'); game.newCard(); };
    V.machine.betPlusBtn.onPress = () => { audio.play('BetChanged'); game.changeBet(1); };
    V.machine.betMinusBtn.onPress = () => { audio.play('BetChanged'); game.changeBet(-1); };
    V.machine.turboBtn.onPress = () => { audio.play('TurboButton'); game.toggleTurbo(); };
    V.panel.onBallsChange = (dir) => { audio.play('Click'); game.cycleBallsSetting(dir); };
    V.panel.onPayRowAdvance = () => audio.play('PayoutChanged');
  }

  // ---------------- orientation / resize ----------------
  let lastOrientation = pickLayout().orientation;
  window.addEventListener('resize', () => {
    const o = pickLayout().orientation;
    if (o !== lastOrientation) {
      lastOrientation = o;
      buildUI(); // rebuild views with the other layout, re-render state
    } else {
      fitStage(V.layout);
    }
  });

  // ---------------- footer ----------------
  const fCredits = $('f-credits');
  const updateCredits = (b) => { fCredits.textContent = formatMoney(b); };
  wallet.onBalanceChanged(updateCredits);
  wallet.onError((e) => {
    if (e.message === 'INSUFFICIENT_BALANCE' && V.machine) {
      gsap.fromTo(V.machine.betText, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.3)' });
    }
  });
  updateCredits(wallet.getBalance());

  // ---------------- boot ----------------
  buildUI();
  game.init();
  audio.loop('GeneralAmbiance', { volume: 0.35 });
  updateAmbiance();

  // ---------------- DOM menus ----------------
  $('menu-btn').addEventListener('click', () => $('side-menu').classList.toggle('open'));
  $('sm-help').addEventListener('click', () => { $('side-menu').classList.remove('open'); $('help-modal').classList.add('open'); });
  $('help-close').addEventListener('click', () => $('help-modal').classList.remove('open'));
  $('sm-sound').addEventListener('click', (e) => {
    audio.setEnabled(!audio.enabled);
    e.currentTarget.style.opacity = audio.enabled ? 1 : 0.4;
    $('side-menu').classList.remove('open');
  });
  $('sm-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
    $('side-menu').classList.remove('open');
  });
  $('sm-home').addEventListener('click', () => {
    $('side-menu').classList.remove('open');
    $('leave-modal').classList.add('open');
  });
  $('leave-no').addEventListener('click', () => $('leave-modal').classList.remove('open'));
  $('leave-yes').addEventListener('click', () => {
    $('leave-modal').classList.remove('open');
    const end = document.createElement('div');
    end.style.cssText = 'position:absolute;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8);color:#fff;font-size:20px;text-align:center;padding:20px;';
    end.textContent = 'Demo session ended. Reload the page to play again.';
    $('app').appendChild(end);
  });

  // expose for integration tests / debugging (no secrets, demo only)
  window.__goldenEgg = { game, wallet, provider, config: CONFIG, sheets, views: V };
}

boot().catch((e) => {
  console.error(e);
  const lt = $('load-text');
  if (lt) lt.textContent = 'Failed to load. Check console.';
});
