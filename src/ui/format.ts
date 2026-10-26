import { RARITY_LABEL, type Rarity } from '../game/config';

export function formatCoins(n: number): string {
  if (n < 10_000) return Math.floor(n).toLocaleString('en-US');
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 100_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}

export function formatKg(kg: number): string {
  return kg >= 100 ? `${Math.round(kg).toLocaleString('en-US')} kg` : `${kg.toFixed(2)} kg`;
}

export function pct(n: number): string {
  return `${Math.round(n * 1000) / 10}%`;
}

export const rarityLabel = (r: Rarity) => RARITY_LABEL[r];
