import { CONFIG } from './config';
import type { GameState } from './types';

export function createInitialState(now: number): GameState {
  const rod = CONFIG.rods.starter;
  const worker = CONFIG.workers.starter;
  return {
    version: 1,
    coins: CONFIG.startingCoins,
    inventory: [],
    rods: [{ id: 'r1', name: rod.name, rarity: rod.rarity, bite: rod.bite, luck: rod.luck, power: rod.power }],
    equippedRodId: 'r1',
    workers: [{ id: 'w1', name: worker.name, emoji: worker.emoji, rarity: worker.rarity, assigned: true, progress: 0 }],
    slots: 1,
    listings: [],
    lastTick: now,
    nextId: 2,
    stats: {
      casts: 0,
      catches: 0,
      escapes: 0,
      workerCatches: 0,
      coinsEarned: 0,
      bestFishValue: 0,
      bestFishName: '',
    },
  };
}

/** Allocates a unique id. Mutates the (already cloned) draft. */
export function takeId(draft: GameState, prefix: string): string {
  const id = `${prefix}${draft.nextId}`;
  draft.nextId += 1;
  return id;
}

export function clone(state: GameState): GameState {
  return structuredClone(state);
}

export function equippedRod(state: GameState) {
  return state.rods.find((r) => r.id === state.equippedRodId) ?? state.rods[0];
}

export function earn(draft: GameState, amount: number): void {
  draft.coins += amount;
  draft.stats.coinsEarned += amount;
}
