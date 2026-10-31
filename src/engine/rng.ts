/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SplitMix32 PRNG for fast deterministic seed generation.
 */
export function splitmix32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x9e3779b9) | 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a deterministic random number sequence based on an integer seed.
 */
export class DeterministicRNG {
  private fn: () => number;

  constructor(seed = 123456789) {
    this.fn = splitmix32(seed);
  }

  next(): number {
    return this.fn();
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  choice<T>(items: T[]): T {
    const idx = Math.floor(this.next() * items.length);
    return items[idx];
  }
}
