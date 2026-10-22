/**
 * Sound manager — uses the original game's sound set (names taken from the
 * reference bundle's resource registration). Files are expected at:
 *     assets/sounds/mp3/<name>.mp3        (ogg/ and wav/ also probed)
 *
 * The bundle ships NO audio files, so every load is allowed to fail: missing
 * sounds are silently ignored and the game runs mute until the files are
 * dropped into the folder — no code change needed.
 *
 * Sound map (name -> when it plays), per the original SoundController:
 *   GeneralAmbiance   loop, farm ambience, always
 *   AmbianceNormal    loop, idle ambience (fades during turbo rounds)
 *   AmbianceTurbo     loop, turbo-round ambience
 *   Click             generic button click
 *   OverButton        button hover
 *   PlayButton        PLAY pressed
 *   NewCard           NEW CARD pressed
 *   BetChanged        bet +/-
 *   PayoutChanged     paytable indicator advances / paytable re-rendered
 *   TurboButton       FAST toggled
 *   TurboButtonWings  loop, FAST button wings while turbo is on
 *   TurboStartChicken turbo intro (round start or mid-round enable)
 *   ChickenSound      normal lay squawk
 *   MachineVibration  machine rumble per ball
 *   Straw             straw burst when the egg lands
 *   Leaf              leaf burst (turbo intro / win)
 *   EggFalls          egg drops onto the tray
 *   ChickenJump       win celebration jump
 *   ChickenFall       win celebration landing
 *   Cong              win panel (CONGRATULATIONS)
 *   BigwinCount       BIG WIN counter loop
 *   BigwinCountNumber BIG WIN number ticks
 *   BigWinCountZoom   BIG WIN zoom
 *   BigWinsAmbiance   BIG WIN background
 */
const SOUND_FILES = {
  GeneralAmbiance: 'generalambiance',
  AmbianceNormal: 'ambiance_normal',
  AmbianceTurbo: 'ambiance_turbo',
  Click: 'click',
  OverButton: 'overbutton',
  PlayButton: 'play_button',
  NewCard: 'new_card',
  BetChanged: 'betchanged',
  PayoutChanged: 'paytable_changed',
  TurboButton: 'turbo_button',
  TurboButtonWings: 'turbo_mod_wings_loop',
  TurboStartChicken: 'turbo_start_chicken_sound',
  ChickenSound: 'chickensound',
  MachineVibration: 'egg_box_vibrations',
  Straw: 'straw',
  Leaf: 'leaf',
  EggFalls: 'egg_falls',
  ChickenJump: 'chickenjump',
  ChickenFall: 'chickenfall',
  Cong: 'congpanel',
  BigwinCount: 'bigwincount',
  BigwinCountNumber: 'bigwincountnumber',
  BigWinCountZoom: 'bigwincountzoom',
  BigWinsAmbiance: 'bigwinsambiance',
};

const BASES = ['assets/sounds/mp3/', 'assets/sounds/ogg/', 'assets/sounds/wav/'];
const EXTS = { 'assets/sounds/mp3/': '.mp3', 'assets/sounds/ogg/': '.ogg', 'assets/sounds/wav/': '.wav' };

export class GameAudio {
  constructor() {
    this.enabled = true;
    this._buffers = new Map();   // name -> AudioBuffer | 'missing'
    this._loops = new Map();     // name -> {src, gain}
    this._ctx = null;
    this._unlocked = false;
    this._pendingLoops = new Set();
    const unlock = () => {
      if (!this._ctx) {
        try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* unsupported */ }
      }
      if (this._ctx?.state === 'suspended') this._ctx.resume();
      this._unlocked = true;
      for (const name of this._pendingLoops) this.loop(name);
      this._pendingLoops.clear();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    this._preload();
  }

  async _preload() {
    // probe each sound; failures are fine (missing assets are ignored)
    await Promise.all(Object.entries(SOUND_FILES).map(async ([name, file]) => {
      for (const base of BASES) {
        try {
          const res = await fetch(`${base}${file}${EXTS[base]}`);
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          // decode lazily on first play to keep boot fast
          this._buffers.set(name, buf);
          return;
        } catch { /* try next extension */ }
      }
      this._buffers.set(name, 'missing');
    }));
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) for (const name of [...this._loops.keys()]) this.stopLoop(name);
  }

  async _decode(name) {
    const entry = this._buffers.get(name);
    if (!entry || entry === 'missing' || !this._ctx) return null;
    if (entry instanceof AudioBuffer) return entry;
    try {
      const buf = await this._ctx.decodeAudioData(entry.slice(0));
      this._buffers.set(name, buf);
      return buf;
    } catch {
      this._buffers.set(name, 'missing');
      return null;
    }
  }

  /** Fire-and-forget one-shot. Silently no-ops when the file is missing. */
  async play(name, { volume = 1 } = {}) {
    if (!this.enabled || !this._unlocked || !this._ctx || this._ctx.state !== 'running') return;
    const buf = await this._decode(name);
    if (!buf) return;
    const src = this._ctx.createBufferSource();
    const g = this._ctx.createGain();
    g.gain.value = volume;
    src.buffer = buf;
    src.connect(g).connect(this._ctx.destination);
    src.start();
  }

  /** Start a named loop (idempotent). */
  async loop(name, { volume = 0.5, fadeIn = 0.6 } = {}) {
    if (!this.enabled) return;
    if (!this._unlocked || !this._ctx || this._ctx.state !== 'running') {
      this._pendingLoops.add(name);
      return;
    }
    if (this._loops.has(name)) return;
    const buf = await this._decode(name);
    if (!buf) return;
    const src = this._ctx.createBufferSource();
    const g = this._ctx.createGain();
    src.buffer = buf;
    src.loop = true;
    g.gain.setValueAtTime(0.0001, this._ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(volume, this._ctx.currentTime + fadeIn);
    src.connect(g).connect(this._ctx.destination);
    src.start();
    this._loops.set(name, { src, gain: g, volume });
  }

  /** Stop a named loop with a short fade. */
  stopLoop(name, fadeOut = 0.5) {
    this._pendingLoops.delete(name);
    const l = this._loops.get(name);
    if (!l || !this._ctx) return;
    this._loops.delete(name);
    try {
      l.gain.gain.setValueAtTime(Math.max(l.gain.gain.value, 0.0001), this._ctx.currentTime);
      l.gain.gain.exponentialRampToValueAtTime(0.0001, this._ctx.currentTime + fadeOut);
      setTimeout(() => { try { l.src.stop(); } catch { /* already stopped */ } }, fadeOut * 1000 + 60);
    } catch { /* ignore */ }
  }

  // ----- semantic helpers (kept for existing call sites) -----
  click() { this.play('Click'); }
  error() { /* no dedicated file in the bundle */ }
  ballPop() { this.play('EggFalls'); }
  match() { /* match feedback is part of Straw/EggFalls in the original */ }
  noMatch() {}
  win() { this.play('Cong'); }
  bigWin() {
    this.play('BigWinsAmbiance');
    this.play('BigwinCount');
    this.play('BigwinCountNumber');
    this.play('BigWinCountZoom');
  }
}
