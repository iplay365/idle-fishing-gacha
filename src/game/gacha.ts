import { CONFIG } from './config';
import { pickOne, pickRarity, randRange } from './rng';
import { clone, earn, takeId } from './state';
import type { GameState, Rng, Rod, Worker } from './types';

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function pullRod(state: GameState, rng: Rng): { state: GameState; rod: Rod | null } {
  if (state.coins < CONFIG.rods.pullCost) return { state, rod: null };
  const draft = clone(state);
  draft.coins -= CONFIG.rods.pullCost;
  const rarity = pickRarity(rng, CONFIG.rods.gachaRates);
  const range = CONFIG.rods.statRanges[rarity];
  const rod: Rod = {
    id: takeId(draft, 'r'),
    name: pickOne(rng, CONFIG.rods.names[rarity]),
    rarity,
    bite: round3(randRange(rng, ...range.bite)),
    luck: round3(randRange(rng, ...range.luck)),
    power: round3(randRange(rng, ...range.power)),
  };
  draft.rods.push(rod);
  return { state: draft, rod };
}

export function equipRod(state: GameState, rodId: string): GameState {
  if (!state.rods.some((r) => r.id === rodId)) return state;
  return { ...state, equippedRodId: rodId };
}

export function scrapRod(state: GameState, rodId: string): GameState {
  const rod = state.rods.find((r) => r.id === rodId);
  if (!rod || rod.id === state.equippedRodId) return state;
  const draft = clone(state);
  draft.rods = draft.rods.filter((r) => r.id !== rodId);
  earn(draft, CONFIG.rods.scrapValue[rod.rarity]);
  return draft;
}

export function assignedCount(state: GameState): number {
  return state.workers.filter((w) => w.assigned).length;
}

export function pullWorker(state: GameState, rng: Rng): { state: GameState; worker: Worker | null } {
  if (state.coins < CONFIG.workers.pullCost) return { state, worker: null };
  const draft = clone(state);
  draft.coins -= CONFIG.workers.pullCost;
  const rarity = pickRarity(rng, CONFIG.workers.gachaRates);
  const worker: Worker = {
    id: takeId(draft, 'w'),
    name: pickOne(rng, CONFIG.workers.names),
    emoji: pickOne(rng, CONFIG.workers.emoji[rarity]),
    rarity,
    assigned: assignedCount(draft) < draft.slots,
    progress: 0,
  };
  draft.workers.push(worker);
  return { state: draft, worker };
}

export function setAssigned(state: GameState, workerId: string, assigned: boolean): GameState {
  const worker = state.workers.find((w) => w.id === workerId);
  if (!worker || worker.assigned === assigned) return state;
  if (assigned && assignedCount(state) >= state.slots) return state;
  const draft = clone(state);
  const w = draft.workers.find((x) => x.id === workerId)!;
  w.assigned = assigned;
  w.progress = 0;
  return draft;
}

export function releaseWorker(state: GameState, workerId: string): GameState {
  const worker = state.workers.find((w) => w.id === workerId);
  if (!worker) return state;
  const draft = clone(state);
  draft.workers = draft.workers.filter((w) => w.id !== workerId);
  earn(draft, CONFIG.workers.releaseValue[worker.rarity]);
  return draft;
}

/** Cost of the next slot, or null when maxed. */
export function nextSlotCost(state: GameState): number | null {
  if (state.slots >= CONFIG.workers.maxSlots) return null;
  return CONFIG.workers.slotCosts[state.slots];
}

export function buySlot(state: GameState): GameState {
  const cost = nextSlotCost(state);
  if (cost === null || state.coins < cost) return state;
  const draft = clone(state);
  draft.coins -= cost;
  draft.slots += 1;
  return draft;
}
