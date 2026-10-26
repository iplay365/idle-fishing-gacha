import { createInitialState } from '../src/game/state';
import type { Fish, GameState } from '../src/game/types';

export const T0 = 1_700_000_000_000;

export function makeFish(id: string, value: number, rarity: Fish['rarity'] = 'common'): Fish {
  return { id, speciesId: 'sardine', rarity, weightKg: 0.1, value, source: 'player', caughtAt: T0 };
}

export function freshState(patch: Partial<GameState> = {}): GameState {
  return { ...createInitialState(T0), ...patch };
}
