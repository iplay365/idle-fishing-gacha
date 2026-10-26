import { CONFIG } from './config';
import { getSpecies } from './fishing';
import { clone, earn } from './state';
import type { Fish, GameState } from './types';

export function bagFull(state: GameState): boolean {
  return state.inventory.length >= CONFIG.inventory.capacity;
}

export function quickSellPrice(fish: Fish): number {
  return Math.max(1, Math.floor(fish.value * CONFIG.inventory.quickSellRate));
}

function noteBest(draft: GameState, fish: Fish): void {
  if (fish.value > draft.stats.bestFishValue) {
    draft.stats.bestFishValue = fish.value;
    draft.stats.bestFishName = getSpecies(fish.speciesId).name;
  }
}

/**
 * Adds a fish to a draft state. If the bag is full the fish is sold to the
 * dock buyer instantly at the quick-sell rate. Returns coins from overflow.
 */
export function stowFish(draft: GameState, fish: Fish): { stored: boolean; coins: number } {
  noteBest(draft, fish);
  if (draft.inventory.length < CONFIG.inventory.capacity) {
    draft.inventory.push(fish);
    return { stored: true, coins: 0 };
  }
  const coins = quickSellPrice(fish);
  earn(draft, coins);
  return { stored: false, coins };
}

/** Player lands a fish from a manual cast. Fails when the bag is full. */
export function landFish(state: GameState, fish: Fish): GameState {
  if (bagFull(state)) return state;
  const draft = clone(state);
  stowFish(draft, fish);
  draft.stats.catches += 1;
  return draft;
}

export function removeFish(draft: GameState, fishId: string): Fish | undefined {
  const idx = draft.inventory.findIndex((f) => f.id === fishId);
  if (idx < 0) return undefined;
  return draft.inventory.splice(idx, 1)[0];
}

export function quickSell(state: GameState, fishIds: string[]): GameState {
  const draft = clone(state);
  for (const id of fishIds) {
    const fish = removeFish(draft, id);
    if (fish) earn(draft, quickSellPrice(fish));
  }
  return draft;
}
