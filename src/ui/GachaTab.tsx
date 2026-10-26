import { useState } from 'react';
import { CONFIG, RARITIES, RARITY_LABEL, type Rarity } from '../game/config';
import { biteChance } from '../game/fishing';
import { rarityIndex } from '../game/rng';
import type { Rod, Worker } from '../game/types';
import { Coins, RarityChip, Sheet } from './common';
import { pct } from './format';
import type { GameApi } from './useGame';

type Banner = 'rods' | 'workers';
type Reveal = { kind: 'rod'; rod: Rod } | { kind: 'worker'; worker: Worker };

export function GachaTab({ game }: { game: GameApi }) {
  const { state, actions, toast } = game;
  const [banner, setBanner] = useState<Banner>('rods');
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [showRates, setShowRates] = useState(false);
  const cost = banner === 'rods' ? CONFIG.rods.pullCost : CONFIG.workers.pullCost;
  const rates: Record<Rarity, number> = banner === 'rods' ? CONFIG.rods.gachaRates : CONFIG.workers.gachaRates;

  const pull = () => {
    if (state.coins < cost) {
      toast('Not enough coins!');
      return;
    }
    if (banner === 'rods') {
      const rod = actions.pullRod();
      if (rod) setReveal({ kind: 'rod', rod });
    } else {
      const worker = actions.pullWorker();
      if (worker) setReveal({ kind: 'worker', worker });
    }
  };

  const rods = [...state.rods].sort((a, b) => rarityIndex(b.rarity) - rarityIndex(a.rarity));

  return (
    <div className="tab">
      <div className="segmented">
        <button className={banner === 'rods' ? 'on' : ''} onClick={() => setBanner('rods')}>
          🎣 Rods
        </button>
        <button className={banner === 'workers' ? 'on' : ''} onClick={() => setBanner('workers')}>
          🧑‍🌾 Crew
        </button>
      </div>

      <div className={`banner banner-${banner}`}>
        <div className="banner-art">{banner === 'rods' ? '🎣' : '🐾'}</div>
        <div className="banner-title">{banner === 'rods' ? 'Tackle Capsule' : 'Crew Capsule'}</div>
        <div className="small">
          {banner === 'rods'
            ? 'Better rods raise bite chance, rarity luck and fish size.'
            : 'Crew members fish automatically, even while you are away.'}
        </div>
        <button className="btn btn-pull" onClick={pull} disabled={state.coins < cost}>
          Pull ×1 · <Coins n={cost} />
        </button>
        <button className="link small" onClick={() => setShowRates((v) => !v)}>
          {showRates ? 'Hide' : 'Show'} drop rates
        </button>
        {showRates && (
          <div className="rates">
            {RARITIES.map((r) => (
              <div key={r} className="row between small">
                <RarityChip rarity={r} />
                <span>{rates[r]}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {banner === 'rods' && (
        <>
          <div className="section-label">Your rods ({rods.length})</div>
          <div className="list">
            {rods.map((rod) => {
              const equipped = rod.id === state.equippedRodId;
              return (
                <div key={rod.id} className={`card rod-row b-${rod.rarity}`}>
                  <div className="grow">
                    <div className="strong">
                      {rod.name} <RarityChip rarity={rod.rarity} />
                    </div>
                    <div className="small muted">
                      Bite {pct(biteChance(rod))} · Luck +{pct(rod.luck)} · Size +{pct(rod.power)}
                    </div>
                  </div>
                  {equipped ? (
                    <span className="tag">Equipped</span>
                  ) : (
                    <div className="col-buttons">
                      <button className="btn btn-small" onClick={() => actions.equipRod(rod.id)}>
                        Equip
                      </button>
                      <button
                        className="btn btn-small btn-ghost"
                        onClick={() => {
                          if (rarityIndex(rod.rarity) >= 3 && !window.confirm(`Scrap ${rod.name}?`)) return;
                          actions.scrapRod(rod.id);
                        }}
                      >
                        Scrap +{CONFIG.rods.scrapValue[rod.rarity]}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      {banner === 'workers' && <p className="muted small center">Manage your crew in the Crew tab.</p>}

      {reveal && (
        <Sheet onClose={() => setReveal(null)}>
          <RevealCard reveal={reveal} />
          <div className="row gap">
            {reveal.kind === 'rod' && (
              <button
                className="btn grow"
                onClick={() => {
                  actions.equipRod(reveal.rod.id);
                  setReveal(null);
                }}
              >
                Equip
              </button>
            )}
            <button className="btn btn-ghost grow" onClick={() => setReveal(null)}>
              Nice!
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function RevealCard({ reveal }: { reveal: Reveal }) {
  const rarity = reveal.kind === 'rod' ? reveal.rod.rarity : reveal.worker.rarity;
  return (
    <div className={`reveal glow-${rarity}`}>
      <div className="reveal-burst" />
      <div className="reveal-icon">{reveal.kind === 'rod' ? '🎣' : reveal.worker.emoji}</div>
      <div className="strong big-text">{reveal.kind === 'rod' ? reveal.rod.name : reveal.worker.name}</div>
      <RarityChip rarity={rarity} />
      {reveal.kind === 'rod' ? (
        <div className="small muted">
          Bite +{pct(reveal.rod.bite)} · Luck +{pct(reveal.rod.luck)} · Size +{pct(reveal.rod.power)}
        </div>
      ) : (
        <div className="small muted">
          {CONFIG.workers.catchesPerHour[rarity]} catches/hr · luck +{pct(CONFIG.workers.luck[rarity])}
          {!reveal.worker.assigned && ' · no free slot, resting'}
        </div>
      )}
      {rarityIndex(rarity) >= 4 && <div className="jackpot">✨ {RARITY_LABEL[rarity]} pull! ✨</div>}
    </div>
  );
}
