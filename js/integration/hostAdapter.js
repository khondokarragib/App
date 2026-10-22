/**
 * Casino platform adapter — demo wallet implementation + documented contract.
 *
 * DEMO WALLET: virtual credits only. The demo wallet is completely isolated
 * from any production settlement; a real host adapter would forward
 * round requests to the platform and receive server-authoritative outcomes.
 *
 * Proposed integration contract (full documentation in docs/INTEGRATION_CONTRACT.md):
 *   initialize(config, hostAdapter)
 *   getBalance()                  -> number
 *   placeBet(request)             -> Promise<{accepted, balance}>
 *        request = { roundId, bet, ballsSetting, stake }
 *   presentOutcome(outcome)       client-side presentation of a server outcome
 *   completeRound(roundId)        -> Promise<void>  settlement acknowledgement
 *   onBalanceChanged(callback)
 *   onError(callback)
 *   destroy()
 */
export class DemoHostAdapter {
  constructor(config) {
    this.config = config;
    this.balance = config.startBalance;
    this.listeners = { balance: [], error: [] };
    this.rounds = new Map(); // roundId -> {stake, settled}
  }

  getBalance() { return this.balance; }

  onBalanceChanged(cb) { this.listeners.balance.push(cb); }
  onError(cb) { this.listeners.error.push(cb); }

  _emitBalance() {
    for (const cb of this.listeners.balance) cb(this.balance);
  }
  _emitError(err) {
    for (const cb of this.listeners.error) cb(err);
  }

  /**
   * Validate + deduct the stake for a new round. Idempotent per roundId:
   * repeated calls with the same roundId do not deduct twice.
   */
  placeBet({ roundId, stake }) {
    if (this.rounds.has(roundId)) {
      return Promise.resolve({ accepted: true, balance: this.balance, duplicate: true });
    }
    if (!(stake > 0)) {
      const err = new Error('INVALID_STAKE');
      this._emitError(err);
      return Promise.reject(err);
    }
    if (stake > this.balance + 1e-9) {
      const err = new Error('INSUFFICIENT_BALANCE');
      this._emitError(err);
      return Promise.reject(err);
    }
    this.balance = Math.round((this.balance - stake) * 100) / 100;
    this.rounds.set(roundId, { stake, settled: false });
    this._emitBalance();
    return Promise.resolve({ accepted: true, balance: this.balance });
  }

  /** Credit the win and mark the round settled (idempotent per roundId). */
  completeRound(roundId, win) {
    const rec = this.rounds.get(roundId);
    if (!rec) return Promise.reject(new Error('UNKNOWN_ROUND'));
    if (rec.settled) return Promise.resolve({ balance: this.balance, duplicate: true });
    if (!(win >= 0)) return Promise.reject(new Error('INVALID_WIN'));
    rec.settled = true;
    this.balance = Math.round((this.balance + win) * 100) / 100;
    this._emitBalance();
    return Promise.resolve({ balance: this.balance });
  }

  /** Demo convenience: reset virtual credits. */
  reset() {
    this.balance = this.config.startBalance;
    this.rounds.clear();
    this._emitBalance();
  }

  destroy() {
    this.listeners.balance.length = 0;
    this.listeners.error.length = 0;
    this.rounds.clear();
  }
}
