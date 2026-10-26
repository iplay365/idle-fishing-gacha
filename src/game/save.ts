import { CONFIG } from './config';
import { createInitialState } from './state';
import type { GameState } from './types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

/** Parses a save, filling in any fields missing from older saves. Returns null if invalid. */
export function deserialize(raw: string, now: number): GameState | null {
  try {
    const data = JSON.parse(raw) as Partial<GameState>;
    if (!data || data.version !== 1 || typeof data.coins !== 'number') return null;
    const base = createInitialState(now);
    const state: GameState = {
      ...base,
      ...data,
      stats: { ...base.stats, ...(data.stats ?? {}) },
    } as GameState;
    if (!Array.isArray(state.inventory) || !Array.isArray(state.rods) || state.rods.length === 0) return null;
    if (!state.rods.some((r) => r.id === state.equippedRodId)) state.equippedRodId = state.rods[0].id;
    return state;
  } catch {
    return null;
  }
}

export function loadGame(storage: StorageLike, now: number): GameState | null {
  try {
    const raw = storage.getItem(CONFIG.save.key);
    return raw ? deserialize(raw, now) : null;
  } catch {
    return null;
  }
}

export function saveGame(storage: StorageLike, state: GameState): boolean {
  try {
    storage.setItem(CONFIG.save.key, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage: StorageLike): void {
  try {
    storage.removeItem(CONFIG.save.key);
  } catch {
    /* storage unavailable */
  }
}

/** Portable save code for manual backup / device transfer. */
export function exportCode(state: GameState): string {
  return btoa(unescape(encodeURIComponent(serialize(state))));
}

export function importCode(code: string, now: number): GameState | null {
  try {
    return deserialize(decodeURIComponent(escape(atob(code.trim()))), now);
  } catch {
    return null;
  }
}
