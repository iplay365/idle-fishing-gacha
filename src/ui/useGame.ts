import { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIG, type PriceTier } from '../game/config';
import { buySlot, equipRod, pullRod, pullWorker, releaseWorker, scrapRod, setAssigned } from '../game/gacha';
import { landFish, quickSell } from '../game/inventory';
import { cancelListing, listFish } from '../game/market';
import { advance, applyOffline } from '../game/progress';
import { clearSave, loadGame, saveGame } from '../game/save';
import { clone, createInitialState } from '../game/state';
import type { Fish, GameState, ProgressReport } from '../game/types';
import { getSpecies } from '../game/fishing';
import { formatCoins } from './format';

const rng = Math.random;
/** A live tick gap larger than this (e.g. phone slept) is treated as offline time. */
const OFFLINE_GAP_MS = 60_000;

export interface Toast {
  id: number;
  text: string;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function boot(): { state: GameState; report: ProgressReport | null } {
  const now = Date.now();
  const store = storage();
  const saved = store ? loadGame(store, now) : null;
  if (!saved) return { state: createInitialState(now), report: null };
  const { state, report } = applyOffline(saved, now, rng);
  return { state, report: report.elapsedMs >= CONFIG.offline.minReportMs ? report : null };
}

export function useGame() {
  const [initial] = useState(boot);
  const [state, setState] = useState<GameState>(initial.state);
  const [offlineReport, setOfflineReport] = useState<ProgressReport | null>(initial.report);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const ref = useRef(state);
  const toastId = useRef(0);

  const commit = useCallback((next: GameState) => {
    ref.current = next;
    setState(next);
  }, []);

  const toast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const persist = useCallback(() => {
    const store = storage();
    return store ? saveGame(store, ref.current) : false;
  }, []);

  const tick = useCallback(() => {
    const now = Date.now();
    const cur = ref.current;
    if (now - cur.lastTick > OFFLINE_GAP_MS) {
      const { state: next, report } = applyOffline(cur, now, rng);
      commit(next);
      if (report.elapsedMs >= CONFIG.offline.minReportMs && (report.workerCatches > 0 || report.sales > 0)) {
        setOfflineReport(report);
      }
      return;
    }
    const { state: next, report, events } = advance(cur, now, rng);
    commit(next);
    for (const e of events.slice(-2)) {
      const name = getSpecies(e.fish.speciesId).name;
      toast(`${e.workerEmoji} ${e.workerName} caught a ${name}${e.stored ? '' : ' (bag full, sold)'}`);
    }
    if (report.sales > 0) {
      toast(`🛒 Sold ${report.sales} fish for ${formatCoins(report.salesCoins)} 🪙`);
    }
  }, [commit, toast]);

  useEffect(() => {
    const loop = window.setInterval(tick, CONFIG.tickMs);
    const autosave = window.setInterval(persist, CONFIG.save.autosaveMs);
    const onVis = () => {
      if (document.visibilityState === 'hidden') persist();
      else tick();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', persist);
    return () => {
      window.clearInterval(loop);
      window.clearInterval(autosave);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', persist);
    };
  }, [tick, persist]);

  const update = useCallback(
    (fn: (s: GameState) => GameState) => {
      const next = fn(ref.current);
      const changed = next !== ref.current;
      if (changed) commit(next);
      return changed;
    },
    [commit],
  );

  const actions = {
    recordCast: () =>
      update((s) => {
        const d = clone(s);
        d.stats.casts += 1;
        return d;
      }),
    recordEscape: () =>
      update((s) => {
        const d = clone(s);
        d.stats.escapes += 1;
        return d;
      }),
    land: (fish: Fish) => update((s) => landFish(s, fish)),
    quickSell: (ids: string[]) => update((s) => quickSell(s, ids)),
    list: (fishId: string, tier: PriceTier) => update((s) => listFish(s, fishId, tier, Date.now())),
    cancelListing: (id: string) => update((s) => cancelListing(s, id)),
    pullRod: () => {
      const r = pullRod(ref.current, rng);
      commit(r.state);
      return r.rod;
    },
    pullWorker: () => {
      const r = pullWorker(ref.current, rng);
      commit(r.state);
      return r.worker;
    },
    equipRod: (id: string) => update((s) => equipRod(s, id)),
    scrapRod: (id: string) => update((s) => scrapRod(s, id)),
    assign: (id: string, on: boolean) => update((s) => setAssigned(s, id, on)),
    releaseWorker: (id: string) => update((s) => releaseWorker(s, id)),
    buySlot: () => update((s) => buySlot(s)),
    save: () => persist(),
    load: (next: GameState) => {
      commit({ ...next, lastTick: Date.now() });
      persist();
    },
    reset: () => {
      const store = storage();
      if (store) clearSave(store);
      commit(createInitialState(Date.now()));
      persist();
    },
  };

  return { state, actions, toasts, toast, offlineReport, dismissOffline: () => setOfflineReport(null) };
}

export type GameApi = ReturnType<typeof useGame>;
