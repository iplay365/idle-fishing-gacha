import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/game/config';
import { listFish } from '../src/game/market';
import { advance, applyOffline } from '../src/game/progress';
import { mulberry32 } from '../src/game/rng';
import { deserialize, exportCode, importCode, serialize } from '../src/game/save';
import { freshState, makeFish, T0 } from './helpers';

const HOUR = 3_600_000;

describe('offline progression', () => {
  it('workers catch at their configured rate', () => {
    const s = freshState();
    const { report, state } = applyOffline(s, T0 + 2 * HOUR, mulberry32(1));
    expect(report.workerCatches).toBe(CONFIG.workers.catchesPerHour.common * 2);
    expect(state.inventory.length).toBe(report.fishToBag);
    expect(state.lastTick).toBe(T0 + 2 * HOUR);
  });

  it('caps simulated time at the offline limit', () => {
    const s = freshState();
    const week = applyOffline(s, T0 + 7 * 24 * HOUR, mulberry32(2)).report;
    const cap = applyOffline(s, T0 + CONFIG.offline.capMs, mulberry32(2)).report;
    expect(week.cappedMs).toBe(CONFIG.offline.capMs);
    expect(week.workerCatches).toBe(cap.workerCatches);
    expect(week.workerCatches).toBe((CONFIG.workers.catchesPerHour.common * CONFIG.offline.capMs) / HOUR);
  });

  it('unassigned workers do nothing', () => {
    const s = freshState();
    s.workers[0].assigned = false;
    expect(applyOffline(s, T0 + 3 * HOUR, mulberry32(3)).report.workerCatches).toBe(0);
  });

  it('completes market listings that ended while away', () => {
    let s = freshState({ inventory: [makeFish('a', 100), makeFish('b', 200, 'mythic')], coins: 0 });
    s.workers[0].assigned = false;
    s = listFish(s, 'a', 'fair', T0);
    s = listFish(s, 'b', 'premium', T0);
    const { state, report } = applyOffline(s, T0 + 10 * 60_000, mulberry32(4));
    expect(report.sales).toBe(1);
    expect(state.coins).toBe(Math.floor(100 * (1 - CONFIG.market.feeRate)));
    expect(state.listings).toHaveLength(1);
  });

  it('time beyond the cap pauses unfinished listings', () => {
    let s = freshState({ inventory: [makeFish('m', 999, 'mythic')] });
    s.workers[0].assigned = false;
    s = listFish(s, 'm', 'premium', T0);
    // shrink the window so the listing outlives the cap: pretend it ends far later
    s.listings[0].endsAt = T0 + CONFIG.offline.capMs + HOUR;
    const awayMs = CONFIG.offline.capMs + 10 * HOUR;
    const { state } = applyOffline(s, T0 + awayMs, mulberry32(5));
    expect(state.listings).toHaveLength(1);
    expect(state.listings[0].endsAt).toBe(T0 + CONFIG.offline.capMs + HOUR + 10 * HOUR);
  });

  it('worker overflow beyond bag capacity is sold, not lost', () => {
    const full = Array.from({ length: CONFIG.inventory.capacity }, (_, i) => makeFish(`f${i}`, 1));
    const s = freshState({ inventory: full, coins: 0 });
    const { state, report } = applyOffline(s, T0 + 4 * HOUR, mulberry32(6));
    expect(report.overflowSold).toBe(report.workerCatches);
    expect(state.coins).toBe(report.overflowCoins);
    expect(state.coins).toBeGreaterThan(0);
  });

  it('live ticks accumulate fractional worker progress', () => {
    let s = freshState();
    const rng = mulberry32(8);
    let catches = 0;
    for (let t = 1; t <= 3600; t++) {
      const r = advance(s, T0 + t * 1000, rng);
      s = r.state;
      catches += r.report.workerCatches;
    }
    expect(catches).toBe(CONFIG.workers.catchesPerHour.common);
  });

  it('active fishing out-earns a worker by a wide margin (balance sanity)', () => {
    // Expected manual bites per hour assuming ~6s per cast cycle.
    const castsPerHour = HOUR / 6000;
    const manualFishPerHour = castsPerHour * CONFIG.fishing.baseBiteChance;
    expect(manualFishPerHour).toBeGreaterThan(CONFIG.workers.catchesPerHour.mythic * 5);
  });
});

describe('save / load', () => {
  it('round-trips state through serialize and export codes', () => {
    const s = freshState({ coins: 1234, inventory: [makeFish('a', 9)] });
    expect(deserialize(serialize(s), T0)).toEqual(s);
    expect(importCode(exportCode(s), T0)).toEqual(s);
  });

  it('rejects garbage', () => {
    expect(deserialize('not json', T0)).toBeNull();
    expect(deserialize('{"version":2}', T0)).toBeNull();
    expect(importCode('@@@', T0)).toBeNull();
  });
});
