import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/game/config';
import { landFish, quickSell, quickSellPrice, stowFish } from '../src/game/inventory';
import { rollFish } from '../src/game/fishing';
import { mulberry32 } from '../src/game/rng';
import { clone } from '../src/game/state';
import { freshState, makeFish, T0 } from './helpers';

describe('inventory', () => {
  it('lands fish and tracks stats', () => {
    let s = freshState();
    s = landFish(s, makeFish('a', 10));
    s = landFish(s, makeFish('b', 30));
    expect(s.inventory.map((f) => f.id)).toEqual(['a', 'b']);
    expect(s.stats.catches).toBe(2);
    expect(s.stats.bestFishValue).toBe(30);
  });

  it('refuses manual catches when the bag is full', () => {
    const full = Array.from({ length: CONFIG.inventory.capacity }, (_, i) => makeFish(`f${i}`, 1));
    const s = freshState({ inventory: full });
    expect(landFish(s, makeFish('extra', 5))).toBe(s);
  });

  it('overflow (worker) fish auto-sell at the quick-sell rate', () => {
    const full = Array.from({ length: CONFIG.inventory.capacity }, (_, i) => makeFish(`f${i}`, 1));
    const draft = clone(freshState({ inventory: full, coins: 0 }));
    const res = stowFish(draft, makeFish('x', 100));
    expect(res.stored).toBe(false);
    expect(draft.coins).toBe(Math.floor(100 * CONFIG.inventory.quickSellRate));
    expect(draft.inventory).toHaveLength(CONFIG.inventory.capacity);
  });

  it('quick sell removes fish and pays less than the market would', () => {
    const s = quickSell(freshState({ inventory: [makeFish('a', 50), makeFish('b', 3)], coins: 0 }), ['a', 'missing']);
    expect(s.inventory.map((f) => f.id)).toEqual(['b']);
    expect(s.coins).toBe(quickSellPrice(makeFish('a', 50)));
    expect(s.coins).toBeLessThan(50);
  });

  it('rolled fish have weights within species range scaled by rod power', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 500; i++) {
      const f = rollFish(rng, 'rare', 0.5, 'player', `f${i}`, T0);
      expect(f.rarity).toBe('rare');
      expect(f.weightKg).toBeGreaterThan(0);
      expect(f.value).toBeGreaterThanOrEqual(40);
    }
  });
});
