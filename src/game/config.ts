/**
 * Central balance sheet. Every probability, timer, price and upgrade cost in
 * the game lives here so tuning never requires touching game logic.
 */

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const;
export type Rarity = (typeof RARITIES)[number];
export type RarityTable<T> = Record<Rarity, T>;

export const RARITY_LABEL: RarityTable<string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

export interface SpeciesDef {
  id: string;
  name: string;
  emoji: string;
  /** Optional CSS hue-rotate (deg) to recolour the emoji for variety. */
  hue?: number;
  rarity: Rarity;
  minKg: number;
  maxKg: number;
  /** Coin value of a minimum-weight specimen. */
  baseValue: number;
}

export const FISH_SPECIES: SpeciesDef[] = [
  { id: 'sardine', name: 'Sardine', emoji: '🐟', rarity: 'common', minKg: 0.05, maxKg: 0.3, baseValue: 2 },
  { id: 'shrimp', name: 'Pond Shrimp', emoji: '🦐', rarity: 'common', minKg: 0.02, maxKg: 0.1, baseValue: 2 },
  { id: 'crab', name: 'Hermit Crab', emoji: '🦀', rarity: 'common', minKg: 0.1, maxKg: 0.6, baseValue: 3 },
  { id: 'puffer', name: 'Pufferfish', emoji: '🐡', rarity: 'uncommon', minKg: 0.3, maxKg: 1.5, baseValue: 10 },
  { id: 'clown', name: 'Clownfish', emoji: '🐠', rarity: 'uncommon', minKg: 0.1, maxKg: 0.4, baseValue: 12 },
  { id: 'squid', name: 'Squid', emoji: '🦑', rarity: 'uncommon', minKg: 0.5, maxKg: 3, baseValue: 14 },
  { id: 'lobster', name: 'Lobster', emoji: '🦞', rarity: 'rare', minKg: 0.5, maxKg: 4, baseValue: 40 },
  { id: 'octopus', name: 'Octopus', emoji: '🐙', rarity: 'rare', minKg: 1, maxKg: 8, baseValue: 50 },
  { id: 'turtle', name: 'Sea Turtle', emoji: '🐢', rarity: 'rare', minKg: 5, maxKg: 40, baseValue: 60 },
  { id: 'shark', name: 'Reef Shark', emoji: '🦈', rarity: 'epic', minKg: 20, maxKg: 90, baseValue: 180 },
  { id: 'bluepuff', name: 'Azure Puffer', emoji: '🐡', hue: 180, rarity: 'epic', minKg: 1, maxKg: 5, baseValue: 200 },
  { id: 'dolphin', name: 'Pink Dolphin', emoji: '🐬', hue: 290, rarity: 'epic', minKg: 60, maxKg: 180, baseValue: 240 },
  { id: 'koi', name: 'Golden Koi', emoji: '🐟', hue: 200, rarity: 'legendary', minKg: 2, maxKg: 12, baseValue: 900 },
  { id: 'whale', name: 'Baby Whale', emoji: '🐳', rarity: 'legendary', minKg: 300, maxKg: 1200, baseValue: 1100 },
  { id: 'moonsquid', name: 'Moon Squid', emoji: '🦑', hue: 220, rarity: 'legendary', minKg: 20, maxKg: 100, baseValue: 1000 },
  { id: 'kraken', name: 'Kraken Pup', emoji: '🐙', hue: 120, rarity: 'mythic', minKg: 100, maxKg: 600, baseValue: 5000 },
  { id: 'leviathan', name: 'Leviathan', emoji: '🐉', rarity: 'mythic', minKg: 800, maxKg: 3000, baseValue: 6000 },
  { id: 'starwhale', name: 'Star Whale', emoji: '🐋', hue: 250, rarity: 'mythic', minKg: 500, maxKg: 2500, baseValue: 5500 },
];

export interface RodStatRange {
  bite: [number, number];
  luck: [number, number];
  power: [number, number];
}

export const CONFIG = {
  startingCoins: 150,

  save: {
    key: 'idle-fishing-gacha/save/v1',
    autosaveMs: 10_000,
  },

  /** Game loop tick for workers & marketplace while the app is open. */
  tickMs: 1_000,

  offline: {
    /** Offline progress is simulated for at most this long. */
    capMs: 4 * 60 * 60 * 1000,
    /** Only show the "welcome back" report if away at least this long. */
    minReportMs: 60_000,
  },

  fishing: {
    /** Chance that a manual cast gets any bite at all (empty casts are common). */
    baseBiteChance: 0.25,
    maxBiteChance: 0.5,
    /** Bobber wait before the outcome is revealed. */
    waitMinMs: 1_800,
    waitMaxMs: 4_500,
    /** How long the player has to tap "Reel" once a fish bites. Rarer = harder. */
    reactionWindowMs: {
      common: 1_300,
      uncommon: 1_100,
      rare: 900,
      epic: 750,
      legendary: 600,
      mythic: 480,
    } as RarityTable<number>,
    /** Relative rarity weights for a manual bite before rod luck. */
    rarityWeights: {
      common: 70,
      uncommon: 22,
      rare: 6.2,
      epic: 1.5,
      legendary: 0.25,
      mythic: 0.05,
    } as RarityTable<number>,
    /** Weight roll = min + (max-min) * u^skew. Larger skew → small fish more common. */
    weightSkew: 2.2,
    /** A max-weight fish is worth (1 + sizeBonus) × baseValue. */
    sizeBonus: 1.5,
  },

  /**
   * Luck multiplies each rarity weight by (1 + luck)^tierIndex, so it shifts
   * odds toward higher tiers without ever guaranteeing them.
   */

  inventory: {
    capacity: 40,
    /** Instant NPC dock buyer rate. Also applied to worker catches when the bag is full. */
    quickSellRate: 0.4,
  },

  market: {
    maxListings: 6,
    /** Fee taken from each completed marketplace sale. */
    feeRate: 0.08,
    /** Base time until an NPC buyer purchases a listing. */
    saleTimeMs: {
      common: 60_000,
      uncommon: 2 * 60_000,
      rare: 5 * 60_000,
      epic: 12 * 60_000,
      legendary: 30 * 60_000,
      mythic: 60 * 60_000,
    } as RarityTable<number>,
    priceTiers: {
      bargain: { label: 'Bargain', priceMult: 0.85, timeMult: 0.4 },
      fair: { label: 'Fair', priceMult: 1, timeMult: 1 },
      premium: { label: 'Premium', priceMult: 1.3, timeMult: 2.5 },
    },
  },

  rods: {
    pullCost: 800,
    starter: { name: 'Twig Rod', rarity: 'common' as Rarity, bite: 0, luck: 0, power: 0 },
    /** Gacha odds (percent). */
    gachaRates: {
      common: 60,
      uncommon: 25,
      rare: 10.5,
      epic: 3.5,
      legendary: 0.9,
      mythic: 0.1,
    } as RarityTable<number>,
    /** Stats are rolled uniformly within these ranges. bite = +catch chance. */
    statRanges: {
      common: { bite: [0, 0.02], luck: [0, 0.05], power: [0, 0.05] },
      uncommon: { bite: [0.02, 0.04], luck: [0.05, 0.12], power: [0.05, 0.12] },
      rare: { bite: [0.04, 0.07], luck: [0.12, 0.25], power: [0.12, 0.25] },
      epic: { bite: [0.07, 0.11], luck: [0.25, 0.45], power: [0.25, 0.4] },
      legendary: { bite: [0.11, 0.16], luck: [0.45, 0.75], power: [0.4, 0.6] },
      mythic: { bite: [0.16, 0.22], luck: [0.8, 1.2], power: [0.6, 0.9] },
    } as RarityTable<RodStatRange>,
    scrapValue: { common: 40, uncommon: 100, rare: 300, epic: 1_000, legendary: 4_000, mythic: 15_000 } as RarityTable<number>,
    names: {
      common: ['Bamboo Rod', 'Willow Rod', 'Pond Stick'],
      uncommon: ['Fiberglass Rod', 'Breeze Rod', 'Tidecaller'],
      rare: ['Carbon Rod', 'Coral Reach', 'Seafoam Spinner'],
      epic: ['Stormcaster', 'Abyss Lure', 'Pearl Whisper'],
      legendary: ['Sunforged Rod', 'Moonlit Reel', 'Kraken Bane'],
      mythic: ['Starfall Rod', "Poseidon's Whim"],
    } as RarityTable<string[]>,
  },

  workers: {
    pullCost: 2_000,
    maxSlots: 5,
    /** Cost to unlock slot N (index 0 = first slot, free). Grows steeply on purpose. */
    slotCosts: [0, 8_000, 40_000, 160_000, 600_000] as readonly number[],
    gachaRates: {
      common: 62,
      uncommon: 25,
      rare: 9.5,
      epic: 2.8,
      legendary: 0.6,
      mythic: 0.1,
    } as RarityTable<number>,
    /** Automatic catches per hour. Far below what an active player lands. */
    catchesPerHour: { common: 5, uncommon: 7, rare: 9, epic: 12, legendary: 15, mythic: 18 } as RarityTable<number>,
    luck: { common: 0, uncommon: 0.05, rare: 0.12, epic: 0.25, legendary: 0.4, mythic: 0.6 } as RarityTable<number>,
    /** Workers fish shallow waters: far more commons than a manual cast. */
    rarityWeights: {
      common: 80,
      uncommon: 16,
      rare: 3.5,
      epic: 0.45,
      legendary: 0.05,
      mythic: 0.005,
    } as RarityTable<number>,
    releaseValue: { common: 100, uncommon: 250, rare: 800, epic: 2_500, legendary: 10_000, mythic: 40_000 } as RarityTable<number>,
    emoji: {
      common: ['🐸', '🐤', '🐭'],
      uncommon: ['🐧', '🐰', '🐹'],
      rare: ['🦦', '🐨', '🐶'],
      epic: ['🐼', '🦝', '🐯'],
      legendary: ['🦊', '🦉', '🦁'],
      mythic: ['🐲', '🦄'],
    } as RarityTable<string[]>,
    names: ['Pip', 'Mochi', 'Bubbles', 'Nori', 'Tofu', 'Biscuit', 'Pebble', 'Sprout', 'Wasabi', 'Dumpling', 'Maple', 'Kelp', 'Juniper', 'Coco', 'Taro', 'Waffles', 'Sunny', 'Miso'],
    starter: { name: 'Pip', rarity: 'common' as Rarity, emoji: '🐸' },
  },
} as const;

export type PriceTier = keyof typeof CONFIG.market.priceTiers;
