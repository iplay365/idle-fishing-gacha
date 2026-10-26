import { useState } from 'react';
import { CONFIG } from './game/config';
import { BagTab } from './ui/BagTab';
import { Coins } from './ui/common';
import { CrewTab } from './ui/CrewTab';
import { FishTab } from './ui/FishTab';
import { GachaTab } from './ui/GachaTab';
import { MarketTab } from './ui/MarketTab';
import { OfflineModal, SettingsModal } from './ui/Modals';
import { useGame } from './ui/useGame';

type Tab = 'fish' | 'bag' | 'market' | 'gacha' | 'crew';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'fish', icon: '🎣', label: 'Fish' },
  { id: 'bag', icon: '🎒', label: 'Bag' },
  { id: 'market', icon: '🏪', label: 'Market' },
  { id: 'gacha', icon: '🎁', label: 'Gacha' },
  { id: 'crew', icon: '🐾', label: 'Crew' },
];

export default function App() {
  const game = useGame();
  const { state, toasts, offlineReport, dismissOffline } = game;
  const [tab, setTab] = useState<Tab>('fish');
  const [settings, setSettings] = useState(false);
  const bagFull = state.inventory.length >= CONFIG.inventory.capacity;

  return (
    <div className="app">
      <header className="hud">
        <div className="hud-coins">
          <Coins n={state.coins} />
        </div>
        <div className={`hud-bag ${bagFull ? 'full' : ''}`}>
          🎒 {state.inventory.length}/{CONFIG.inventory.capacity}
        </div>
        <button className="btn btn-icon" aria-label="Settings" onClick={() => setSettings(true)}>
          ⚙️
        </button>
      </header>

      <main className="content">
        {/* FishTab stays mounted so an in-progress cast survives tab switches. */}
        <div hidden={tab !== 'fish'}>
          <FishTab game={game} />
        </div>
        {tab === 'bag' && <BagTab game={game} />}
        {tab === 'market' && <MarketTab game={game} />}
        {tab === 'gacha' && <GachaTab game={game} />}
        {tab === 'crew' && <CrewTab game={game} />}
      </main>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
            {t.id === 'market' && state.listings.length > 0 && <span className="badge">{state.listings.length}</span>}
            {t.id === 'bag' && bagFull && <span className="badge">!</span>}
          </button>
        ))}
      </nav>

      {offlineReport && <OfflineModal report={offlineReport} onClose={dismissOffline} />}
      {settings && <SettingsModal game={game} onClose={() => setSettings(false)} />}
    </div>
  );
}
