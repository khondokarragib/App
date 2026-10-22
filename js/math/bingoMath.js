/**
 * Pure, deterministic game math for The Golden Egg (video bingo).
 * No rendering, no randomness by itself — randomness is injected so tests
 * and deterministic fixtures can drive every code path.
 */

/** Create a seeded PRNG (mulberry32) for reproducible demo/test rounds. */
export function createSeededRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle (in place) driven by the injected rng. */
export function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a 15-number card. 9 columns; column c holds numbers in its range
 * (1-9, 10-19, ... 80-90). Exactly 6 columns hold 2 numbers and 3 columns
 * hold 1 number (15 total) — the distribution observed on the reference
 * recordings (cards shown there follow this exact pattern).
 */
export function generateCard(rng, columnRange) {
  // choose 6 columns to receive 2 numbers
  const counts = new Array(9).fill(1);
  const idx = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], rng).slice(0, 6);
  for (const i of idx) counts[i] = 2;

  const columns = [];
  for (let c = 0; c < 9; c++) {
    const [lo, hi] = columnRange(c);
    const pool = [];
    for (let n = lo; n <= hi; n++) pool.push(n);
    shuffle(pool, rng);
    const nums = pool.slice(0, counts[c]).sort((a, b) => a - b);
    columns.push(nums);
  }

  // The bottom "player card" mirrors the card columns on a 9 x 3 display.
  // Single-number columns occupy one row; two-number columns occupy two
  // distinct rows (layout observed on the reference screenshots).
  const rowPairs = [[0, 1], [0, 2], [1, 2]];
  const slots = [];
  for (let c = 0; c < 9; c++) {
    if (columns[c].length === 1) {
      slots.push({ n: columns[c][0], col: c, row: Math.floor(rng() * 3) });
    } else {
      const pair = rowPairs[Math.floor(rng() * rowPairs.length)];
      slots.push({ n: columns[c][0], col: c, row: pair[0] });
      slots.push({ n: columns[c][1], col: c, row: pair[1] });
    }
  }
  return { columns, numbers: columns.flat(), slots };
}

/**
 * Build the full 90-ball draw order for a round (without replacement),
 * driven by the injected rng.
 */
export function generateDrawOrder(rng, ballsTotal = 90) {
  const balls = [];
  for (let n = 1; n <= ballsTotal; n++) balls.push(n);
  return shuffle(balls, rng);
}

/**
 * Resolve a complete round deterministically from a draw order + card:
 * returns every drawn ball in order, the number of balls called when the
 * 15th card number was matched (i.e. the card completion ball), and the
 * matched balls. The card always completes by ball 90 at the latest.
 */
export function resolveRound(drawOrder, cardNumbers) {
  const cardSet = new Set(cardNumbers);
  let matched = 0;
  const drawn = [];
  let completionBall = null;
  for (let i = 0; i < drawOrder.length; i++) {
    const ball = drawOrder[i];
    const isMatch = cardSet.has(ball);
    if (isMatch) matched++;
    drawn.push({ ball, isMatch, matchCount: matched });
    if (matched === cardNumbers.length && completionBall === null) {
      completionBall = i + 1; // balls called (1-based)
      break; // the caller stops drawing once the card is complete
    }
  }
  return { drawn, completionBall, totalMatched: matched };
}

/**
 * Payout multiplier (in bet units, before the BALLS-setting factor) for a
 * completion at `ballsCalled`, per the observed paytable.
 */
export function payoutMultiplier(paytable, ballsCalled) {
  for (const row of paytable) {
    if (ballsCalled <= row.maxBalls) return row.multiplier;
  }
  return 0;
}

/** Exact expected payout multiplier for the paytable (negative hypergeometric). */
export function theoreticalRtpMultiplier(paytable, ballsTotal = 90, cardNumbers = 15) {
  const comb = (n, k) => {
    if (k < 0 || n < k) return 0;
    let r = 1;
    for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
    return r;
  };
  const denom = comb(ballsTotal, cardNumbers);
  let ev = 0;
  let prevBalls = cardNumbers - 1;
  for (const row of paytable) {
    const p = comb(row.maxBalls, cardNumbers) / denom - comb(prevBalls, cardNumbers) / denom;
    ev += p * row.multiplier;
    prevBalls = row.maxBalls;
  }
  return ev;
}

/** Format money like the reference UI: 10000.4 -> "€10.000,40" */
export function formatMoney(amount, currencySymbol = '€') {
  const s = amount.toFixed(2);
  const [intPart, dec] = s.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${currencySymbol}${grouped},${dec}`;
}
