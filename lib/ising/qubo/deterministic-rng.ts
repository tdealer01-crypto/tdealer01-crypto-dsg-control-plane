/**
 * Mulberry32 — a 32-bit seeded PRNG.
 *
 * Chosen because every operation is a 32-bit integer op, so a given seed
 * reproduces the identical sequence on any platform and in any process. That
 * bit-exact reproducibility is what lets an annealing run be replayed and its
 * provenance chain re-derived.
 */
export class DeterministicRng {
  private state: number;

  constructor(readonly seed: number) {
    if (!Number.isFinite(seed)) {
      throw new Error('DeterministicRng requires a finite numeric seed');
    }
    // Force the seed into uint32 space so fractional or negative seeds still
    // produce a well-defined, reproducible stream.
    this.state = Math.trunc(seed) >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Next integer in [0, boundExclusive). */
  nextInt(boundExclusive: number): number {
    if (!Number.isInteger(boundExclusive) || boundExclusive <= 0) {
      throw new Error('nextInt bound must be a positive integer');
    }
    return Math.floor(this.next() * boundExclusive) % boundExclusive;
  }

  /** Restart the stream from the original seed. */
  reset(): void {
    this.state = Math.trunc(this.seed) >>> 0;
  }
}

export function createRng(seed: number): DeterministicRng {
  return new DeterministicRng(seed);
}
