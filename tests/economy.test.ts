import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/game/config';
import { buySlot, nextSlotCost, pullRod, pullWorker, releaseWorker, scrapRod, setAssigned } from '../src/game/gacha';
import { cancelListing, listFish, listingDuration, listingPrice, netProceeds, settleListings } from '../src/game/market';
import { biteChance, rollCast } from '../src/game/fishing';
import { mulberry32 } from '../src/game/rng';
import { clone } from '../src/game/state';
import { freshState, makeFish, T0 } from './helpers';

describe('marketplace', () => {
  it('lists a fish, sells it after the timer and pays out minus fee', () => {
    const fish = makeFish('f1', 100);
    let s = freshState({ inventory: [fish], coins: 0 });
    s = listFish(s, 'f1', 'fair', T0);
    expect(s.inventory).toHaveLength(0);
    expect(s.listings).toHaveLength(1);
    const l = s.listings[0];
    expect(l.price).toBe(100);
    expect(l.endsAt - T0).toBe(CONFIG.market.saleTimeMs.common);

    const early = clone(s);
    expect(settleListings(early, l.endsAt - 1).sales).toBe(0);
    expect(early.coins).toBe(0);

    const done = clone(s);
    const res = settleListings(done, l.endsAt);
    expect(res.sales).toBe(1);
    expect(done.coins).toBe(netProceeds(100));
    expect(done.coins).toBe(Math.floor(100 * (1 - CONFIG.market.feeRate)));
    expect(done.listings).toHaveLength(0);
  });

  it('price tiers trade price against sale time', () => {
    const fish = makeFish('f', 100, 'rare');
    expect(listingPrice(fish, 'premium')).toBeGreaterThan(listingPrice(fish, 'fair'));
    expect(listingPrice(fish, 'bargain')).toBeLessThan(listingPrice(fish, 'fair'));
    expect(listingDuration(fish, 'premium')).toBeGreaterThan(listingDuration(fish, 'fair'));
    expect(listingDuration(fish, 'bargain')).toBeLessThan(listingDuration(fish, 'fair'));
  });

  it('enforces the listing limit and can cancel back to the bag', () => {
    const inv = Array.from({ length: CONFIG.market.maxListings + 1 }, (_, i) => makeFish(`f${i}`, 5));
    let s = freshState({ inventory: inv });
    for (const f of inv) s = listFish(s, f.id, 'fair', T0);
    expect(s.listings).toHaveLength(CONFIG.market.maxListings);
    expect(s.inventory).toHaveLength(1);
    s = cancelListing(s, s.listings[0].id);
    expect(s.listings).toHaveLength(CONFIG.market.maxListings - 1);
    expect(s.inventory).toHaveLength(2);
  });
});

describe('gacha & upgrades', () => {
  it('rod pulls cost coins and refuse when broke', () => {
    const rng = mulberry32(1);
    const broke = freshState({ coins: CONFIG.rods.pullCost - 1 });
    expect(pullRod(broke, rng).rod).toBeNull();

    const s = freshState({ coins: CONFIG.rods.pullCost });
    const { state, rod } = pullRod(s, rng);
    expect(rod).not.toBeNull();
    expect(state.coins).toBe(0);
    expect(state.rods).toHaveLength(2);
    const range = CONFIG.rods.statRanges[rod!.rarity];
    expect(rod!.luck).toBeGreaterThanOrEqual(range.luck[0]);
    expect(rod!.luck).toBeLessThanOrEqual(range.luck[1]);
  });

  it('rod gacha distribution roughly follows configured rates', () => {
    const rng = mulberry32(42);
    let s = freshState({ coins: CONFIG.rods.pullCost * 20_000 });
    const counts: Record<string, number> = {};
    for (let i = 0; i < 20_000; i++) {
      const r = pullRod(s, rng);
      counts[r.rod!.rarity] = (counts[r.rod!.rarity] ?? 0) + 1;
      s = { ...r.state, rods: s.rods }; // keep rod list small
    }
    expect(counts.common / 20_000).toBeCloseTo(CONFIG.rods.gachaRates.common / 100, 1);
    expect((counts.mythic ?? 0) / 20_000).toBeLessThan(0.005);
  });

  it('cannot scrap the equipped rod; scrapping others pays out', () => {
    const { state } = pullRod(freshState({ coins: CONFIG.rods.pullCost }), mulberry32(3));
    expect(scrapRod(state, state.equippedRodId)).toBe(state);
    const other = state.rods[1];
    const after = scrapRod(state, other.id);
    expect(after.rods).toHaveLength(1);
    expect(after.coins).toBe(CONFIG.rods.scrapValue[other.rarity]);
  });

  it('worker slots get steeply more expensive and cap at max', () => {
    const costs = CONFIG.workers.slotCosts;
    for (let i = 2; i < costs.length; i++) expect(costs[i]).toBeGreaterThan(costs[i - 1] * 2);
    let s = freshState({ coins: 10_000_000 });
    expect(s.slots).toBe(1);
    while (nextSlotCost(s) !== null) s = buySlot(s);
    expect(s.slots).toBe(CONFIG.workers.maxSlots);
    const spent = costs.reduce((a, b) => a + b, 0);
    expect(s.coins).toBe(10_000_000 - spent);
    expect(buySlot(s)).toBe(s);
  });

  it('new workers only auto-assign when a slot is free', () => {
    const s0 = freshState({ coins: CONFIG.workers.pullCost * 2 });
    const { state: s1, worker } = pullWorker(s0, mulberry32(5));
    expect(worker!.assigned).toBe(false); // starter occupies the only slot
    expect(setAssigned(s1, worker!.id, true)).toBe(s1);
    const s2 = setAssigned(s1, 'w1', false);
    const s3 = setAssigned(s2, worker!.id, true);
    expect(s3.workers.find((w) => w.id === worker!.id)!.assigned).toBe(true);
    const s4 = releaseWorker(s3, 'w1');
    expect(s4.workers).toHaveLength(1);
    expect(s4.coins).toBe(s3.coins + CONFIG.workers.releaseValue.common);
  });
});

describe('manual fishing odds', () => {
  it('most casts are empty and rare fish are scarce', () => {
    const rng = mulberry32(7);
    const rod = freshState().rods[0];
    let bites = 0;
    let rarePlus = 0;
    const N = 50_000;
    for (let i = 0; i < N; i++) {
      const o = rollCast(rng, rod, 'x', T0);
      if (o.kind === 'bite') {
        bites++;
        if (!['common', 'uncommon'].includes(o.fish.rarity)) rarePlus++;
      }
    }
    expect(bites / N).toBeCloseTo(biteChance(rod), 1);
    expect(bites / N).toBeLessThan(0.5);
    expect(rarePlus / bites).toBeLessThan(0.12);
  });
});
