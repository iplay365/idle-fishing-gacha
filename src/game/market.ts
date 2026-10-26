import { CONFIG, type PriceTier } from './config';
import { removeFish } from './inventory';
import { clone, earn, takeId } from './state';
import type { Fish, GameState } from './types';

export function listingPrice(fish: Fish, tier: PriceTier): number {
  return Math.max(1, Math.round(fish.value * CONFIG.market.priceTiers[tier].priceMult));
}

/** Coins actually received after the marketplace fee. */
export function netProceeds(price: number): number {
  return Math.max(1, Math.floor(price * (1 - CONFIG.market.feeRate)));
}

export function listingDuration(fish: Fish, tier: PriceTier): number {
  return Math.round(CONFIG.market.saleTimeMs[fish.rarity] * CONFIG.market.priceTiers[tier].timeMult);
}

export function marketFull(state: GameState): boolean {
  return state.listings.length >= CONFIG.market.maxListings;
}

export function listFish(state: GameState, fishId: string, tier: PriceTier, now: number): GameState {
  if (marketFull(state)) return state;
  const draft = clone(state);
  const fish = removeFish(draft, fishId);
  if (!fish) return state;
  draft.listings.push({
    id: takeId(draft, 'l'),
    fish,
    tier,
    price: listingPrice(fish, tier),
    listedAt: now,
    endsAt: now + listingDuration(fish, tier),
  });
  return draft;
}

export function cancelListing(state: GameState, listingId: string): GameState {
  if (state.inventory.length >= CONFIG.inventory.capacity) return state;
  const draft = clone(state);
  const idx = draft.listings.findIndex((l) => l.id === listingId);
  if (idx < 0) return state;
  const [listing] = draft.listings.splice(idx, 1);
  draft.inventory.push(listing.fish);
  return draft;
}

/** Completes every listing whose timer ended by `time`. Mutates the draft. */
export function settleListings(draft: GameState, time: number): { sales: number; coins: number } {
  let sales = 0;
  let coins = 0;
  draft.listings = draft.listings.filter((l) => {
    if (l.endsAt > time) return true;
    const net = netProceeds(l.price);
    earn(draft, net);
    sales += 1;
    coins += net;
    return false;
  });
  return { sales, coins };
}
