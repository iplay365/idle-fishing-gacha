import { CONFIG } from './config';
import { getSpecies, rollFish } from './fishing';
import { stowFish } from './inventory';
import { settleListings } from './market';
import { applyLuck, pickRarity } from './rng';
import { clone, takeId } from './state';
import type { Fish, GameState, ProgressReport, Rng } from './types';

const HOUR_MS = 3_600_000;

export interface WorkerCatchEvent {
  workerName: string;
  workerEmoji: string;
  fish: Fish;
  stored: boolean;
}

function emptyReport(elapsedMs: number, cappedMs: number): ProgressReport {
  return {
    elapsedMs,
    cappedMs,
    workerCatches: 0,
    fishToBag: 0,
    overflowSold: 0,
    overflowCoins: 0,
    sales: 0,
    salesCoins: 0,
    bestCatch: null,
  };
}

/**
 * Simulates workers and the marketplace from `state.lastTick` up to `to`.
 * Used for the live game loop and (capped) offline progress alike.
 */
export function advance(
  state: GameState,
  to: number,
  rng: Rng,
): { state: GameState; report: ProgressReport; events: WorkerCatchEvent[] } {
  const dt = Math.max(0, to - state.lastTick);
  const report = emptyReport(dt, dt);
  const events: WorkerCatchEvent[] = [];
  const draft = clone(state);
  draft.lastTick = Math.max(state.lastTick, to);
  if (dt === 0) return { state: draft, report, events };

  const sold = settleListings(draft, to);
  report.sales = sold.sales;
  report.salesCoins = sold.coins;

  const hours = dt / HOUR_MS;
  for (const worker of draft.workers) {
    if (!worker.assigned) continue;
    worker.progress += CONFIG.workers.catchesPerHour[worker.rarity] * hours;
    const weights = applyLuck(CONFIG.workers.rarityWeights, CONFIG.workers.luck[worker.rarity]);
    // Small epsilon so many tiny live ticks don't lose a catch to float drift.
    while (worker.progress >= 1 - 1e-9) {
      worker.progress = Math.max(0, worker.progress - 1);
      const rarity = pickRarity(rng, weights);
      const fish = rollFish(rng, rarity, 0, 'worker', takeId(draft, 'f'), to);
      const res = stowFish(draft, fish);
      report.workerCatches += 1;
      draft.stats.workerCatches += 1;
      if (res.stored) report.fishToBag += 1;
      else {
        report.overflowSold += 1;
        report.overflowCoins += res.coins;
      }
      if (!report.bestCatch || fish.value > report.bestCatch.value) report.bestCatch = fish;
      events.push({ workerName: worker.name, workerEmoji: worker.emoji, fish, stored: res.stored });
    }
  }
  return { state: draft, report, events };
}

/**
 * Applies progress for time spent away. Simulation is capped; time beyond the
 * cap is treated as paused, so pending market timers are pushed back by it.
 */
export function applyOffline(state: GameState, now: number, rng: Rng): { state: GameState; report: ProgressReport } {
  const elapsed = now - state.lastTick;
  if (elapsed <= 0) return { state: { ...state, lastTick: Math.max(state.lastTick, now) }, report: emptyReport(0, 0) };
  const capped = Math.min(elapsed, CONFIG.offline.capMs);
  const { state: next, report } = advance(state, state.lastTick + capped, rng);
  const overflow = elapsed - capped;
  if (overflow > 0) {
    for (const l of next.listings) {
      l.listedAt += overflow;
      l.endsAt += overflow;
    }
  }
  next.lastTick = now;
  report.elapsedMs = elapsed;
  report.cappedMs = capped;
  return { state: next, report };
}

export function describeFish(fish: Fish): string {
  return getSpecies(fish.speciesId).name;
}
