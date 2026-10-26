import { RARITIES, type Rarity, type RarityTable } from './config';
import type { Rng } from './types';

/** Small deterministic PRNG for tests and reproducible simulations. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

export function pickOne<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

/** Picks a rarity from relative (not necessarily normalised) weights. */
export function pickRarity(rng: Rng, weights: RarityTable<number>): Rarity {
  let total = 0;
  for (const r of RARITIES) total += weights[r];
  let roll = rng() * total;
  for (const r of RARITIES) {
    roll -= weights[r];
    if (roll < 0) return r;
  }
  return 'common';
}

/** Luck multiplies each tier's weight by (1 + luck)^tierIndex. */
export function applyLuck(weights: RarityTable<number>, luck: number): RarityTable<number> {
  const out = { ...weights };
  RARITIES.forEach((r, i) => {
    out[r] = weights[r] * Math.pow(1 + Math.max(0, luck), i);
  });
  return out;
}

export function rarityIndex(r: Rarity): number {
  return RARITIES.indexOf(r);
}
