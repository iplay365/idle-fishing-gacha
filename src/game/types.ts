import type { PriceTier, Rarity } from './config';

/** Returns a float in [0, 1). Injected everywhere so logic is testable. */
export type Rng = () => number;

export interface Fish {
  id: string;
  speciesId: string;
  rarity: Rarity;
  weightKg: number;
  value: number;
  source: 'player' | 'worker';
  caughtAt: number;
}

export interface Rod {
  id: string;
  name: string;
  rarity: Rarity;
  /** Additive bite chance. */
  bite: number;
  /** Rarity luck. */
  luck: number;
  /** Weight / value multiplier bonus. */
  power: number;
}

export interface Worker {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  assigned: boolean;
  /** Fractional progress toward the next catch (0..1). */
  progress: number;
}

export interface Listing {
  id: string;
  fish: Fish;
  tier: PriceTier;
  price: number;
  listedAt: number;
  endsAt: number;
}

export interface Stats {
  casts: number;
  catches: number;
  escapes: number;
  workerCatches: number;
  coinsEarned: number;
  bestFishValue: number;
  bestFishName: string;
}

export interface GameState {
  version: 1;
  coins: number;
  inventory: Fish[];
  rods: Rod[];
  equippedRodId: string;
  workers: Worker[];
  slots: number;
  listings: Listing[];
  /** Timestamp up to which workers/market have been simulated. */
  lastTick: number;
  nextId: number;
  stats: Stats;
}

/** Summary of what happened while simulating a span of time. */
export interface ProgressReport {
  elapsedMs: number;
  cappedMs: number;
  workerCatches: number;
  fishToBag: number;
  overflowSold: number;
  overflowCoins: number;
  sales: number;
  salesCoins: number;
  bestCatch: Fish | null;
}
