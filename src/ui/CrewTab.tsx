import { CONFIG } from '../game/config';
import { assignedCount, nextSlotCost } from '../game/gacha';
import { rarityIndex } from '../game/rng';
import type { Worker } from '../game/types';
import { Coins, Empty, ProgressBar, RarityChip } from './common';
import { pct } from './format';
import type { GameApi } from './useGame';

export function CrewTab({ game }: { game: GameApi }) {
  const { state, actions, toast } = game;
  const assigned = state.workers.filter((w) => w.assigned);
  const resting = state.workers
    .filter((w) => !w.assigned)
    .sort((a, b) => rarityIndex(b.rarity) - rarityIndex(a.rarity));
  const slotCost = nextSlotCost(state);
  const hasFreeSlot = assignedCount(state) < state.slots;
  const perHour = assigned.reduce((s, w) => s + CONFIG.workers.catchesPerHour[w.rarity], 0);

  return (
    <div className="tab">
      <div className="tab-head">
        <h2>
          Crew <span className="muted">{state.slots}/{CONFIG.workers.maxSlots} slots</span>
        </h2>
        <span className="small muted">{perHour} catches/hr</span>
      </div>
      <p className="muted small">
        Crew fish on their own — slowly, and mostly commons — and keep working while you're away (up to{' '}
        {CONFIG.offline.capMs / 3_600_000}h).
      </p>

      <div className="slots">
        {Array.from({ length: CONFIG.workers.maxSlots }, (_, i) => {
          if (i < state.slots) {
            const w = assigned[i];
            if (!w)
              return (
                <div key={i} className="card slot slot-empty">
                  <span className="muted">Empty slot</span>
                  <span className="small muted">{resting.length ? 'Assign someone below' : 'Pull crew in Gacha'}</span>
                </div>
              );
            return <WorkerSlot key={w.id} worker={w} onRest={() => actions.assign(w.id, false)} />;
          }
          const isNext = i === state.slots && slotCost !== null;
          return (
            <div key={i} className="card slot slot-locked">
              <span>🔒 Slot {i + 1}</span>
              {isNext && slotCost !== null ? (
                <button
                  className="btn btn-small"
                  disabled={state.coins < slotCost}
                  onClick={() => {
                    if (window.confirm(`Unlock slot ${i + 1} for ${slotCost.toLocaleString()} coins?`)) actions.buySlot();
                  }}
                >
                  Unlock · <Coins n={slotCost} />
                </button>
              ) : (
                <span className="small muted">
                  <Coins n={CONFIG.workers.slotCosts[i]} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="section-label">Resting ({resting.length})</div>
      {resting.length === 0 ? (
        <Empty icon="😴">No resting crew.</Empty>
      ) : (
        <div className="list">
          {resting.map((w) => (
            <div key={w.id} className={`card rod-row b-${w.rarity}`}>
              <span className="emoji" style={{ fontSize: 30 }}>
                {w.emoji}
              </span>
              <div className="grow">
                <div className="strong">
                  {w.name} <RarityChip rarity={w.rarity} />
                </div>
                <div className="small muted">
                  {CONFIG.workers.catchesPerHour[w.rarity]}/hr · luck +{pct(CONFIG.workers.luck[w.rarity])}
                </div>
              </div>
              <div className="col-buttons">
                <button
                  className="btn btn-small"
                  disabled={!hasFreeSlot}
                  onClick={() => actions.assign(w.id, true)}
                >
                  Assign
                </button>
                <button
                  className="btn btn-small btn-ghost"
                  onClick={() => {
                    if (!window.confirm(`Release ${w.name}?`)) return;
                    actions.releaseWorker(w.id);
                    toast(`👋 ${w.name} left with a thank-you gift.`);
                  }}
                >
                  Release +{CONFIG.workers.releaseValue[w.rarity]}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkerSlot({ worker, onRest }: { worker: Worker; onRest: () => void }) {
  return (
    <div className={`card slot b-${worker.rarity}`}>
      <span className="emoji worker-bob" style={{ fontSize: 34 }}>
        {worker.emoji}
      </span>
      <div className="grow">
        <div className="row between">
          <span className="strong">{worker.name}</span>
          <RarityChip rarity={worker.rarity} />
        </div>
        <div className="small muted">{CONFIG.workers.catchesPerHour[worker.rarity]} catches/hr</div>
        <ProgressBar value={worker.progress} className="bar-thin" />
      </div>
      <button className="btn btn-icon" aria-label="Rest" onClick={onRest}>
        💤
      </button>
    </div>
  );
}
