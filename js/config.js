/**
 * Game configuration — The Golden Egg (video bingo).
 * All values derived from the reference client assets and recorded gameplay,
 * except where explicitly marked INFERRED (see docs/MATH_MODEL.md).
 */

export const CONFIG = {
  designWidth: 720,
  designHeight: 1280,

  // 90-ball bingo; card is 9 columns x 10 rows panel with 15 numbers.
  ballsTotal: 90,
  cardColumns: 9,
  cardRows: 10,
  cardNumbers: 15,

  // Column number ranges: col 0 => 1-9 ... col 7 => 70-79, col 8 => 80-90.
  columnRange: (c) => (c === 0 ? [1, 9] : c === 8 ? [80, 90] : [c * 10, c * 10 + 9]),

  // Bet levels (EUR). Observed steps of 0.20 from 0.20 upward in the reference.
  betMin: 0.20,
  betMax: 20.00,
  betStep: 0.20,
  defaultBet: 0.20,

  // "BALLS" selector on the paytable silo: number of balls drawn per
  // animation batch in the reference. The displayed paytable scales with
  // factor floor(N/2) = 1, 3, 4, 6 (CONFIRMED from recordings).
  // INFERRED: the effective stake per round scales by the same factor so the
  // theoretical return is identical for every setting (see docs/MATH_MODEL.md).
  ballsChoices: [3, 6, 9, 12],
  ballsFactor: (n) => Math.floor(n / 2),

  /**
   * Paytable: payout multipliers in bet units, brackets are
   * "card completed within <= maxBalls called balls".
   * CONFIRMED from reference recordings at BALLS=3, bet 0.20:
   * 40->300.00, 45->200.00, 50->20.00, 55->10.00, 60->2.00, 65->1.00,
   * 70->0.80, 75->0.50, 80->0.40, 82->0.35, 84->0.30, 86->0.25,
   * 88->0.10, 90->0.00  (divide by 0.20 bet to get the multipliers below).
   */
  paytable: [
    { maxBalls: 40, multiplier: 1500 },
    { maxBalls: 45, multiplier: 1000 },
    { maxBalls: 50, multiplier: 100 },
    { maxBalls: 55, multiplier: 50 },
    { maxBalls: 60, multiplier: 10 },
    { maxBalls: 65, multiplier: 5 },
    { maxBalls: 70, multiplier: 4 },
    { maxBalls: 75, multiplier: 2.5 },
    { maxBalls: 80, multiplier: 2 },
    { maxBalls: 82, multiplier: 1.75 },
    { maxBalls: 84, multiplier: 1.5 },
    { maxBalls: 86, multiplier: 1.25 },
    { maxBalls: 88, multiplier: 0.5 },
    { maxBalls: 90, multiplier: 0 },
  ],

  // WIN popup threshold: reference shows the win pop-up when a win occurs;
  // zero wins simply settle. (INFERRED behaviour for popup-less zero rounds.)
  bigWinMultiplier: 10, // >= 10x stake shows the BIG WIN banner (INFERRED)

  // Starting demo balance observed in the reference: EUR 10,000.40.
  startBalance: 10000.40,

  currency: 'EUR',
  locale: 'de-DE', // renders 10.000,40 like the reference

  // Round pacing (INFERRED to match recorded timings):
  timings: {
    ballIntervalNormal: 0.55, // seconds between ball reveals
    ballIntervalTurbo: 0.12,
    eggPopTime: 0.42,         // chicken lay + egg pop animation
    winPopupDelay: 0.9,
  },

  // Outcome source for demo mode. 'demo-rng' uses an injectable, seedable
  // random source. A production host must replace the outcome provider with
  // a server-authoritative one (see docs/INTEGRATION_CONTRACT.md).
  outcomeProvider: 'demo-rng',
};
