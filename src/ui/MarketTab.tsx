import { CONFIG } from '../game/config';
import { getSpecies } from '../game/fishing';
import { netProceeds } from '../game/market';
import { Coins, Empty, FishIcon, ProgressBar, RarityChip } from './common';
import { formatDuration } from './format';
import type { GameApi } from './useGame';

export function MarketTab({ game }: { game: GameApi }) {
  const { state, actions, toast } = game;
  const now = Math.max(Date.now(), state.lastTick);
  const listings = [...state.listings].sort((a, b) => a.endsAt - b.endsAt);
  const pending = listings.reduce((s, l) => s + netProceeds(l.price), 0);

  return (
    <div className="tab">
      <div className="tab-head">
        <h2>
          Market <span className="muted">{listings.length}/{CONFIG.market.maxListings}</span>
        </h2>
        {pending > 0 && (
          <span className="small muted">
            Pending <Coins n={pending} />
          </span>
        )}
      </div>
      <p className="muted small">
        NPC buyers purchase your listings when the timer ends. Rarer fish and premium prices take longer.
      </p>
      {listings.length === 0 ? (
        <Empty icon="🏪">No listings. Tap a fish in your Bag to sell it here.</Empty>
      ) : (
        <div className="list">
          {listings.map((l) => {
            const total = l.endsAt - l.listedAt;
            const left = l.endsAt - now;
            return (
              <div key={l.id} className={`card listing b-${l.fish.rarity}`}>
                <FishIcon fish={l.fish} size={34} />
                <div className="grow">
                  <div className="row between">
                    <span className="strong">{getSpecies(l.fish.speciesId).name}</span>
                    <Coins n={netProceeds(l.price)} />
                  </div>
                  <div className="row between small muted">
                    <span>
                      <RarityChip rarity={l.fish.rarity} /> {CONFIG.market.priceTiers[l.tier].label}
                    </span>
                    <span>{left > 0 ? formatDuration(left) : 'Selling…'}</span>
                  </div>
                  <ProgressBar value={1 - left / total} />
                </div>
                <button
                  className="btn btn-icon"
                  aria-label="Cancel listing"
                  onClick={() => {
                    if (!actions.cancelListing(l.id)) toast('🎒 Bag is full — cannot cancel.');
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
