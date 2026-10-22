/**
 * Game client state machine — presentation sequencing only.
 * Outcomes are produced by the outcome provider BEFORE animation; this
 * machine never alters a result.
 *
 * States: IDLE -> DRAWING -> COMPLETE -> (SETTLING) -> IDLE
 */
export const GameState = {
  IDLE: 'IDLE',
  DRAWING: 'DRAWING',
  COMPLETE: 'COMPLETE',
};

export class Game {
  constructor({ config, provider, wallet, events }) {
    this.config = config;
    this.provider = provider;
    this.wallet = wallet;
    this.events = events; // {onDrawBall, onRoundEnd, onStateChange, onError, onCardChanged, onBetChanged, onBallsChanged}
    this.state = GameState.IDLE;
    this.bet = config.defaultBet;
    this.ballsSetting = config.ballsChoices[0];
    this.card = null;
    this.round = null;       // current outcome payload
    this.revealIndex = 0;    // how many balls revealed so far
    this.turbo = false;      // locked for the current round once pressed
    this._skipFlag = false;
  }

  init() {
    this.card = this.provider.dealCard();
    this.events.onCardChanged?.(this.card);
    this.events.onBetChanged?.(this.bet);
    this.events.onBallsChanged?.(this.ballsSetting);
  }

  _setState(s) {
    this.state = s;
    this.events.onStateChange?.(s);
  }

  effectiveStake() {
    return Math.round(this.bet * this.config.ballsFactor(this.ballsSetting) * 100) / 100;
  }

  canPlay() {
    return this.state === GameState.IDLE && this.wallet.getBalance() >= this.effectiveStake() - 1e-9;
  }

  changeBet(dir) {
    if (this.state !== GameState.IDLE) return this.bet;
    const next = Math.min(
      this.config.betMax,
      Math.max(this.config.betMin, Math.round((this.bet + dir * this.config.betStep) * 100) / 100)
    );
    this.bet = next;
    this.events.onBetChanged?.(this.bet);
    return this.bet;
  }

  cycleBallsSetting(dir) {
    if (this.state !== GameState.IDLE) return this.ballsSetting;
    const opts = this.config.ballsChoices;
    const i = opts.indexOf(this.ballsSetting);
    this.ballsSetting = opts[(i + dir + opts.length) % opts.length];
    this.events.onBallsChanged?.(this.ballsSetting);
    return this.ballsSetting;
  }

  newCard() {
    if (this.state !== GameState.IDLE) return;
    this.card = this.provider.dealCard();
    this.events.onCardChanged?.(this.card);
  }

  /**
   * Turbo (FAST): can be switched on or off before the round AND during the
   * draw — the draw presentation picks up the new mode from the next ball.
   * It resets to off when the round settles.
   */
  toggleTurbo() {
    if (this.state === GameState.IDLE || this.state === GameState.DRAWING) {
      this.turbo = !this.turbo;
    } else {
      return this.turbo;
    }
    this.events.onTurboChanged?.(this.turbo);
    return this.turbo;
  }

  /** Instant/skip: reveals all remaining balls without per-ball display. */
  skipToEnd() {
    if (this.state === GameState.DRAWING) this._skipFlag = true;
  }

  /**
   * Start a round: obtain the outcome first, deduct the stake, then hand the
   * sequence to the presenter (the UI drives drawBall() from its own clock).
   */
  async play() {
    if (!this.canPlay()) {
      this.events.onError?.(new Error(this.state !== GameState.IDLE ? 'BUSY' : 'INSUFFICIENT_BALANCE'));
      return null;
    }
    const outcome = this.provider.generateRound({ card: this.card });
    try {
      await this.wallet.placeBet({ roundId: outcome.roundId, stake: this.effectiveStake() });
    } catch (e) {
      this.events.onError?.(e);
      return null;
    }
    this.round = outcome;
    this.revealIndex = 0;
    this._skipFlag = false;
    this._setState(GameState.DRAWING);
    return outcome;
  }

  /** Reveal the next ball. Returns the ball entry or null when done. */
  revealNext() {
    if (this.state !== GameState.DRAWING) return null;
    if (this._skipFlag) {
      // Fast-forward: mark everything revealed, return the completion ball.
      this.revealIndex = this.round.drawn.length;
      this._setState(GameState.COMPLETE);
      return { skipped: true, completionBall: this.round.completionBall, total: this.round.drawn.length };
    }
    if (this.revealIndex >= this.round.drawn.length) return null;
    const entry = this.round.drawn[this.revealIndex];
    this.revealIndex++;
    this.events.onDrawBall?.(entry, this.revealIndex);
    if (this.revealIndex >= this.round.drawn.length || entry.matchCount === this.card.numbers.length) {
      this._setState(GameState.COMPLETE);
    }
    return entry;
  }

  /** Current win in credits (BALLS factor applied here). */
  currentWin() {
    if (!this.round || !this.round.completionBall) return 0;
    const factor = this.config.ballsFactor(this.ballsSetting);
    return Math.round(this.bet * this.round.multiplier * factor * 100) / 100;
  }

  /** Settle the finished round (idempotent) and return to IDLE. */
  async settle() {
    if (this.state !== GameState.COMPLETE || !this.round) return 0;
    const win = this.currentWin();
    await this.wallet.completeRound(this.round.roundId, win);
    this.events.onRoundEnd?.({ win, outcome: this.round, bet: this.bet, ballsSetting: this.ballsSetting });
    this.round = null;
    this.revealIndex = 0;
    this.turbo = false; // turbo resets after the round (reference behaviour)
    this.events.onTurboChanged?.(this.turbo);
    this._setState(GameState.IDLE);
    return win;
  }

  destroy() {}
}
