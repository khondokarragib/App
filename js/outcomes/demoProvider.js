/**
 * Demo outcome provider.
 *
 * DEMO ONLY: generates round outcomes locally with an injectable PRNG.
 * This module must NEVER be wired to a real-money settlement path.
 * Production deployments must obtain outcomes from the authorized platform
 * server (see docs/INTEGRATION_CONTRACT.md).
 */
import { createSeededRng, generateCard, generateDrawOrder, resolveRound } from '../math/bingoMath.js';

export class DemoOutcomeProvider {
  constructor(config, rng = Math.random) {
    this.config = config;
    this.rng = rng;
    this.roundSeq = 0;
  }

  /** Deterministic test fixture: same seed => same card + draw order. */
  static fromSeed(config, seed) {
    return new DemoOutcomeProvider(config, createSeededRng(seed));
  }

  /**
   * Produce a complete, validated round outcome BEFORE any presentation:
   * the client animates exactly what this payload says, never the reverse.
   */
  generateRound({ card }) {
    const drawOrder = generateDrawOrder(this.rng, this.config.ballsTotal);
    const { drawn, completionBall } = resolveRound(drawOrder, card.numbers);
    const multiplier = completionBall
      ? payoutMultiplierSafe(this.config.paytable, completionBall)
      : 0;
    this.roundSeq += 1;
    return {
      roundId: `demo-${Date.now()}-${this.roundSeq}`,
      drawn,               // [{ball, isMatch, matchCount}]
      completionBall,      // balls called when the 15th number matched
      multiplier,          // in bet units (BALLS factor applied by the wallet)
    };
  }

  /** Deal a fresh card. */
  dealCard() {
    return generateCard(this.rng, this.config.columnRange);
  }
}

function payoutMultiplierSafe(paytable, ballsCalled) {
  for (const row of paytable) if (ballsCalled <= row.maxBalls) return row.multiplier;
  return 0;
}
