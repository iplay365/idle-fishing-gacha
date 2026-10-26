import { useState } from 'react';
import { CONFIG } from '../game/config';
import { getSpecies } from '../game/fishing';
import { exportCode, importCode } from '../game/save';
import type { GameState, ProgressReport } from '../game/types';
import { Coins, FishIcon, Sheet } from './common';
import { formatDuration } from './format';
import type { GameApi } from './useGame';

export function OfflineModal({ report, onClose }: { report: ProgressReport; onClose: () => void }) {
  const capped = report.elapsedMs > report.cappedMs;
  return (
    <Sheet onClose={onClose} title="Welcome back! 🌅">
      <p className="center muted small">
        You were away {formatDuration(report.elapsedMs)}
        {capped && ` — progress is capped at ${formatDuration(CONFIG.offline.capMs)}`}.
      </p>
      <div className="report">
        <div className="row between">
          <span>🧺 Crew catches</span>
          <b>{report.workerCatches}</b>
        </div>
        <div className="row between">
          <span>🎒 Added to bag</span>
          <b>{report.fishToBag}</b>
        </div>
        {report.overflowSold > 0 && (
          <div className="row between">
            <span>📦 Bag full, auto-sold {report.overflowSold}</span>
            <Coins n={report.overflowCoins} />
          </div>
        )}
        <div className="row between">
          <span>🛒 Market sales ({report.sales})</span>
          <Coins n={report.salesCoins} />
        </div>
        {report.bestCatch && (
          <div className="row between">
            <span>
              ⭐ Best: <FishIcon fish={report.bestCatch} size={18} /> {getSpecies(report.bestCatch.speciesId).name}
            </span>
            <Coins n={report.bestCatch.value} />
          </div>
        )}
      </div>
      <button className="btn full" onClick={onClose}>
        Collect
      </button>
    </Sheet>
  );
}

export function SettingsModal({ game, onClose }: { game: GameApi; onClose: () => void }) {
  const { state, actions, toast } = game;
  const [code, setCode] = useState('');
  const s = state.stats;

  const doImport = () => {
    const loaded: GameState | null = importCode(code, Date.now());
    if (!loaded) {
      toast('❌ Invalid save code');
      return;
    }
    if (!window.confirm('Replace your current progress with this save?')) return;
    actions.load(loaded);
    toast('✅ Save imported');
    onClose();
  };

  return (
    <Sheet onClose={onClose} title="Settings & Save">
      <div className="report">
        <div className="row between">
          <span>Total casts</span>
          <b>{s.casts}</b>
        </div>
        <div className="row between">
          <span>Fish caught / escaped</span>
          <b>
            {s.catches} / {s.escapes}
          </b>
        </div>
        <div className="row between">
          <span>Crew catches</span>
          <b>{s.workerCatches}</b>
        </div>
        <div className="row between">
          <span>Coins earned</span>
          <Coins n={s.coinsEarned} />
        </div>
        {s.bestFishName && (
          <div className="row between">
            <span>Best fish: {s.bestFishName}</span>
            <Coins n={s.bestFishValue} />
          </div>
        )}
      </div>
      <p className="small muted">Progress autosaves on this device every {CONFIG.save.autosaveMs / 1000}s.</p>
      <div className="row gap">
        <button className="btn grow" onClick={() => toast(actions.save() ? '💾 Saved' : '⚠️ Storage unavailable')}>
          Save now
        </button>
        <button
          className="btn btn-ghost grow"
          onClick={() => {
            const c = exportCode(state);
            setCode(c);
            navigator.clipboard?.writeText(c).then(
              () => toast('📋 Save code copied'),
              () => toast('Save code shown below'),
            );
          }}
        >
          Export code
        </button>
      </div>
      <textarea
        className="code"
        placeholder="Paste a save code here to import"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={3}
      />
      <div className="row gap">
        <button className="btn btn-ghost grow" disabled={!code.trim()} onClick={doImport}>
          Import code
        </button>
        <button
          className="btn btn-danger grow"
          onClick={() => {
            if (!window.confirm('Erase ALL progress? This cannot be undone.')) return;
            actions.reset();
            onClose();
          }}
        >
          Reset game
        </button>
      </div>
    </Sheet>
  );
}
