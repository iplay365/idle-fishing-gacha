import type { ReactNode } from 'react';
import type { Rarity } from '../game/config';
import { getSpecies } from '../game/fishing';
import type { Fish } from '../game/types';
import { formatCoins, rarityLabel } from './format';

export function RarityChip({ rarity }: { rarity: Rarity }) {
  return <span className={`chip r-${rarity}`}>{rarityLabel(rarity)}</span>;
}

export function Coins({ n }: { n: number }) {
  return (
    <span className="coins">
      <span className="coin-icon" aria-hidden>
        🪙
      </span>
      {formatCoins(n)}
    </span>
  );
}

export function FishIcon({ fish, size = 32 }: { fish: Fish; size?: number }) {
  const sp = getSpecies(fish.speciesId);
  return (
    <span
      className="emoji"
      style={{ fontSize: size, filter: sp.hue ? `hue-rotate(${sp.hue}deg) saturate(1.3)` : undefined }}
      aria-label={sp.name}
    >
      {sp.emoji}
    </span>
  );
}

export function Sheet({ onClose, children, title }: { onClose: () => void; children: ReactNode; title?: string }) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="sheet-handle" />
        {title && <h2 className="sheet-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`bar ${className}`}>
      <div className="bar-fill" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div>{children}</div>
    </div>
  );
}
