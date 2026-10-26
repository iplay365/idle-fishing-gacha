import { CONFIG, FISH_SPECIES, type Rarity, type SpeciesDef } from './config';
import { applyLuck, pickOne, pickRarity, randRange } from './rng';
import type { Fish, Rng, Rod } from './types';

const speciesById = new Map(FISH_SPECIES.map((s) => [s.id, s]));

export function getSpecies(id: string): SpeciesDef {
  const s = speciesById.get(id);
  if (!s) throw new Error(`Unknown species ${id}`);
  return s;
}

export function speciesOfRarity(rarity: Rarity): SpeciesDef[] {
  return FISH_SPECIES.filter((s) => s.rarity === rarity);
}

export function biteChance(rod: Rod): number {
  return Math.min(CONFIG.fishing.maxBiteChance, CONFIG.fishing.baseBiteChance + rod.bite);
}

export function fishValue(species: SpeciesDef, weightKg: number): number {
  const frac = (weightKg - species.minKg) / (species.maxKg - species.minKg);
  return Math.max(1, Math.round(species.baseValue * (1 + CONFIG.fishing.sizeBonus * Math.max(0, frac))));
}

/** Rolls species and weight for a fish of the given rarity. */
export function rollFish(
  rng: Rng,
  rarity: Rarity,
  power: number,
  source: Fish['source'],
  id: string,
  now: number,
): Fish {
  const species = pickOne(rng, speciesOfRarity(rarity));
  const u = Math.pow(rng(), CONFIG.fishing.weightSkew);
  const baseKg = species.minKg + (species.maxKg - species.minKg) * u;
  const weightKg = Math.round(baseKg * (1 + power) * 100) / 100;
  return {
    id,
    speciesId: species.id,
    rarity,
    weightKg,
    value: fishValue(species, weightKg),
    source,
    caughtAt: now,
  };
}

export type CastOutcome =
  | { kind: 'empty'; waitMs: number }
  | { kind: 'bite'; waitMs: number; reactionMs: number; fish: Fish };

/**
 * Resolves a manual cast up-front. The UI then plays it out: wait, and for a
 * bite, the player must tap within `reactionMs` to actually land the fish.
 */
export function rollCast(rng: Rng, rod: Rod, id: string, now: number): CastOutcome {
  const waitMs = Math.round(randRange(rng, CONFIG.fishing.waitMinMs, CONFIG.fishing.waitMaxMs));
  if (rng() >= biteChance(rod)) return { kind: 'empty', waitMs };
  const rarity = pickRarity(rng, applyLuck(CONFIG.fishing.rarityWeights, rod.luck));
  const fish = rollFish(rng, rarity, rod.power, 'player', id, now);
  return { kind: 'bite', waitMs, reactionMs: CONFIG.fishing.reactionWindowMs[rarity], fish };
}
