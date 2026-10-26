import { useState } from 'react';
import { CONFIG, RARITIES, type PriceTier } from '../game/config';
import { getSpecies } from '../game/fishing';
import { quickSellPrice } from '../game/inventory';
import { listingDuration, listingPrice, marketFull, netProceeds } from '../game/market';
import type { Fish } from '../game/types';
import { Coins, Empty, FishIcon, RarityChip, Sheet } from './common';
import { formatDuration, formatKg } from './format';
import type { GameApi } from './useGame';

const TIERS = Object.keys(CONFIG.market.priceTiers) as PriceTier[];

export function BagTab({ game }: { game: GameApi }) {
  const { state, actions, toast } = game;
  const [selected, setSelected] = useState<string | null>(null);
  const fish = [...state.inventory].sort(
    (a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || b.value - a.value,
  );
  const commons = state.inventory.filter((f) => f.rarity === 'common');
  const commonsValue = commons.reduce((sum, f) => sum + quickSellPrice(f), 0);
  const sel = state.inventory.find((f) => f.id === selected) ?? null;

  return (
    <div className="tab">
      <div className="tab-head">
        <h2>
          Bag <span className="muted">{state.inventory.length}/{CONFIG.inventory.capacity}</span>
        </h2>
        {commons.length > 0 && (
          <button className="btn btn-small btn-ghost" onClick={() => actions.quickSell(commons.map((f) => f.id))}>
            Quick-sell commons ({commons.length}) · <Coins n={commonsValue} />
          </button>
        )}
      </div>
      {fish.length === 0 ? (
        <Empty icon="🎒">Your bag is empty. Go catch something!</Empty>
      ) : (
        <div className="fish-grid">
          {fish.map((f) => (
            <button key={f.id} className={`fish-cell b-${f.rarity}`} onClick={() => setSelected(f.id)}>
              <FishIcon fish={f} size={30} />
              <span className="fish-cell-value">
                <Coins n={f.value} />
              </span>
              {f.source === 'worker' && <span className="worker-badge">🧺</span>}
            </button>
          ))}
        </div>
      )}
      {sel && (
        <SellSheet
          fish={sel}
          marketIsFull={marketFull(state)}
          onClose={() => setSelected(null)}
          onList={(tier) => {
            actions.list(sel.id, tier);
            toast(`📋 Listed ${getSpecies(sel.speciesId).name} at ${CONFIG.market.priceTiers[tier].label} price`);
            setSelected(null);
          }}
          onQuickSell={() => {
            actions.quickSell([sel.id]);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function SellSheet({
  fish,
  marketIsFull,
  onClose,
  onList,
  onQuickSell,
}: {
  fish: Fish;
  marketIsFull: boolean;
  onClose: () => void;
  onList: (tier: PriceTier) => void;
  onQuickSell: () => void;
}) {
  const sp = getSpecies(fish.speciesId);
  return (
    <Sheet onClose={onClose}>
      <div className={`fish-detail glow-${fish.rarity}`}>
        <FishIcon fish={fish} size={64} />
        <div className="strong big-text">{sp.name}</div>
        <RarityChip rarity={fish.rarity} />
        <div className="muted small">
          {formatKg(fish.weightKg)} · base value <Coins n={fish.value} />
          {fish.source === 'worker' && ' · caught by crew'}
        </div>
      </div>
      <div className="section-label">List on the NPC market (fee {Math.round(CONFIG.market.feeRate * 100)}%)</div>
      {marketIsFull && <p className="warn small">Market is full ({CONFIG.market.maxListings} listings). Wait for sales.</p>}
      <div className="tier-list">
        {TIERS.map((tier) => (
          <button key={tier} className="btn tier-btn" disabled={marketIsFull} onClick={() => onList(tier)}>
            <span className="strong">{CONFIG.market.priceTiers[tier].label}</span>
            <Coins n={netProceeds(listingPrice(fish, tier))} />
            <span className="muted small">⏱ {formatDuration(listingDuration(fish, tier))}</span>
          </button>
        ))}
      </div>
      <button className="btn btn-ghost full" onClick={onQuickSell}>
        Quick-sell now for <Coins n={quickSellPrice(fish)} />
      </button>
    </Sheet>
  );
}
