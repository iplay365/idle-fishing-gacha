import { useEffect, useRef, useState } from 'react';
import { RARITY_LABEL } from '../game/config';
import { biteChance, getSpecies, rollCast, type CastOutcome } from '../game/fishing';
import { bagFull } from '../game/inventory';
import { equippedRod } from '../game/state';
import type { Fish } from '../game/types';
import { Coins, FishIcon, RarityChip } from './common';
import { formatKg, pct } from './format';
import type { GameApi } from './useGame';

type Phase = 'idle' | 'waiting' | 'bite' | 'result';
interface Result {
  kind: 'caught' | 'empty' | 'escaped' | 'spooked';
  fish?: Fish;
  line?: string;
}

const EMPTY_LINES = ['Nothing bit…', 'Just seaweed.', 'Not even a nibble.', 'An old boot. Tossed it back.', 'The water is quiet…'];

export function FishTab({ game }: { game: GameApi }) {
  const { state, actions, toast } = game;
  const rod = equippedRod(state);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const outcome = useRef<CastOutcome | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const full = bagFull(state);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const finish = (r: Result) => {
    window.clearTimeout(timer.current);
    setResult(r);
    setPhase('result');
  };

  const cast = () => {
    if (full) {
      toast('🎒 Bag is full! Sell or list fish first.');
      return;
    }
    const now = Date.now();
    const o = rollCast(Math.random, rod, `p${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, now);
    outcome.current = o;
    actions.recordCast();
    setResult(null);
    setPhase('waiting');
    timer.current = window.setTimeout(() => {
      if (o.kind === 'empty') {
        finish({ kind: 'empty', line: EMPTY_LINES[Math.floor(Math.random() * EMPTY_LINES.length)] });
        return;
      }
      setPhase('bite');
      navigator.vibrate?.(60);
      timer.current = window.setTimeout(() => {
        actions.recordEscape();
        finish({ kind: 'escaped', fish: o.fish });
      }, o.reactionMs);
    }, o.waitMs);
  };

  const onTap = () => {
    if (phase === 'idle' || phase === 'result') cast();
    else if (phase === 'waiting') finish({ kind: 'spooked' });
    else if (phase === 'bite' && outcome.current?.kind === 'bite') {
      const fish = outcome.current.fish;
      if (actions.land(fish)) finish({ kind: 'caught', fish });
      else {
        toast('🎒 Bag filled up — the fish slipped away.');
        finish({ kind: 'escaped', fish });
      }
    }
  };

  const label =
    phase === 'waiting' ? 'Waiting…' : phase === 'bite' ? 'REEL!' : phase === 'result' ? 'Cast again' : 'Cast';

  return (
    <div className="fish-tab">
      <div className={`scene phase-${phase}`} onClick={onTap}>
        <Scene phase={phase} />
        {phase === 'bite' && <div className="bite-alert">!</div>}
        {phase === 'result' && result && <ResultCard result={result} />}
        {phase === 'idle' && <div className="scene-hint">Tap to cast</div>}
      </div>

      <button
        className={`btn btn-cast ${phase === 'bite' ? 'btn-reel' : ''} ${phase === 'waiting' ? 'btn-wait' : ''}`}
        onClick={onTap}
      >
        {label}
      </button>
      {phase === 'waiting' && <p className="tip">Wait for the bite — reeling early spooks the fish.</p>}

      <div className="card rod-card">
        <div className="row between">
          <div>
            <div className="muted small">Equipped rod</div>
            <div className="strong">
              🎣 {rod.name} <RarityChip rarity={rod.rarity} />
            </div>
          </div>
          <div className="right small">
            <div>Bite {pct(biteChance(rod))}</div>
            <div>Luck +{pct(rod.luck)}</div>
            <div>Size +{pct(rod.power)}</div>
          </div>
        </div>
      </div>

      <div className="stats-row">
        <div>
          <b>{state.stats.casts}</b>
          <span>casts</span>
        </div>
        <div>
          <b>{state.stats.catches}</b>
          <span>caught</span>
        </div>
        <div>
          <b>{state.stats.escapes}</b>
          <span>escaped</span>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: Result }) {
  if (result.kind === 'caught' && result.fish) {
    const f = result.fish;
    return (
      <div className={`result-card pop glow-${f.rarity}`}>
        <FishIcon fish={f} size={56} />
        <div className="strong">{getSpecies(f.speciesId).name}</div>
        <RarityChip rarity={f.rarity} />
        <div className="small muted">
          {formatKg(f.weightKg)} · worth <Coins n={f.value} />
        </div>
      </div>
    );
  }
  if (result.kind === 'escaped' && result.fish) {
    return (
      <div className="result-card pop">
        <div className="big">💨</div>
        <div className="strong">It got away!</div>
        <div className="small muted">A {RARITY_LABEL[result.fish.rarity].toLowerCase()} shadow slipped off the hook.</div>
      </div>
    );
  }
  if (result.kind === 'spooked') {
    return (
      <div className="result-card pop">
        <div className="big">😱</div>
        <div className="strong">Too early!</div>
        <div className="small muted">You spooked the water.</div>
      </div>
    );
  }
  return (
    <div className="result-card pop">
      <div className="big">🌊</div>
      <div className="strong">{result.line}</div>
    </div>
  );
}

function Scene({ phase }: { phase: Phase }) {
  const cast = phase === 'waiting' || phase === 'bite';
  return (
    <svg viewBox="0 0 360 260" className="scene-svg" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd8e8" />
          <stop offset="1" stopColor="#bfe9ff" />
        </linearGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4cc3e8" />
          <stop offset="1" stopColor="#1f7fb8" />
        </linearGradient>
      </defs>
      <rect width="360" height="260" fill="url(#sky)" />
      <circle cx="292" cy="46" r="22" fill="#fff3a8" />
      <g className="cloud c1" fill="#fff">
        <ellipse cx="70" cy="40" rx="26" ry="11" />
        <ellipse cx="88" cy="34" rx="17" ry="11" />
      </g>
      <g className="cloud c2" fill="#fff" opacity="0.85">
        <ellipse cx="200" cy="62" rx="22" ry="8" />
        <ellipse cx="214" cy="57" rx="13" ry="8" />
      </g>
      <path d="M0 118 Q60 100 120 116 T240 112 T360 114 V130 H0Z" fill="#a8e0a0" />
      <rect y="124" width="360" height="136" fill="url(#sea)" />
      <g className="waves">
        <path d="M-40 132 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#bdf0ff" strokeWidth="3" fill="none" opacity="0.7" />
        <path d="M-40 170 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#9ee3fb" strokeWidth="2" fill="none" opacity="0.5" />
        <path d="M-40 214 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#9ee3fb" strokeWidth="2" fill="none" opacity="0.4" />
      </g>
      {/* dock */}
      <rect x="0" y="150" width="110" height="12" rx="3" fill="#b07a4f" />
      <rect x="14" y="160" width="8" height="70" fill="#8a5a37" />
      <rect x="84" y="160" width="8" height="70" fill="#8a5a37" />
      {/* cat fisher */}
      <g className="cat">
        <ellipse cx="62" cy="134" rx="20" ry="17" fill="#ffb877" />
        <circle cx="62" cy="108" r="17" fill="#ffc48c" />
        <path d="M48 98 L50 84 L60 95Z M76 98 L74 84 L64 95Z" fill="#ffc48c" />
        <path d="M51 96 L52 89 L57 94Z M73 96 L72 89 L67 94Z" fill="#ff9fb4" />
        <circle cx="56" cy="107" r="2.4" fill="#3b2b2b" />
        <circle cx="69" cy="107" r="2.4" fill="#3b2b2b" />
        <ellipse cx="51" cy="113" rx="3.4" ry="2" fill="#ff9fb4" opacity="0.8" />
        <ellipse cx="74" cy="113" rx="3.4" ry="2" fill="#ff9fb4" opacity="0.8" />
        <path d="M59 113 q3 3 6 0" stroke="#3b2b2b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <ellipse cx="62" cy="94" rx="23" ry="4.5" fill="#4aa3d8" />
        <path d="M47 94 q15 -22 30 0z" fill="#5fb3e6" />
      </g>
      {/* rod + line */}
      <g className={`rod ${phase === 'bite' ? 'rod-bend' : ''}`}>
        <line x1="74" y1="130" x2="180" y2="64" stroke="#7a4a2a" strokeWidth="4" strokeLinecap="round" />
        {cast ? (
          <path
            d={phase === 'bite' ? 'M180 64 Q232 150 262 168' : 'M180 64 Q226 120 262 160'}
            stroke="#ffffff"
            strokeWidth="1.2"
            fill="none"
          />
        ) : (
          <line x1="180" y1="64" x2="180" y2="96" stroke="#ffffff" strokeWidth="1.2" />
        )}
      </g>
      {cast ? (
        <g className={`bobber ${phase === 'bite' ? 'bobber-bite' : 'bobber-float'}`}>
          <ellipse cx="262" cy="166" rx="14" ry="4" fill="#ffffff" opacity="0.35" className="ripple" />
          <circle cx="262" cy="160" r="7" fill="#ff5a6e" />
          <rect x="255" y="160" width="14" height="7" rx="3" fill="#ffffff" />
        </g>
      ) : (
        <circle cx="180" cy="100" r="5" fill="#ff5a6e" />
      )}
    </svg>
  );
}
