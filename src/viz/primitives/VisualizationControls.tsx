import React from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}) {
  const t = useVizTokens();
  const display = format ? format(value) : value;

  return (
    <label style={{ display: 'block', marginBottom: SPACING.xs, fontSize: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: t.textSecondary }}>
        <span>{label}</span>
        <span style={{ color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: t.accentPrimary, cursor: 'pointer' }}
      />
    </label>
  );
}

export function PillSelect<T extends string | number>({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: T;
  // Structurally matches React's Dispatch<SetStateAction<T>> (not just
  // `(v: T) => void`) so `onChange={setState}` infers T correctly from a
  // raw useState setter -- passing `(v: T) => void` there defeats
  // simultaneous inference across value/onChange/options and TS silently
  // falls back to the `string | number` constraint. PillSelect itself only
  // ever calls onChange with a plain value (never the updater-function
  // form), so this is purely a wider accepted type, not a behavior change.
  onChange: (v: T | ((prev: T) => T)) => void;
  options: { value: T; label: string }[];
}) {
  const t = useVizTokens();
  return (
    <div style={{ marginBottom: SPACING.xs, fontSize: 14 }}>
      {label && <div style={{ marginBottom: 6, color: t.textSecondary }}>{label}</div>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                padding: '6px 12px',
                borderRadius: RADIUS.sm,
                border: `1px solid ${active ? t.accentPrimary : t.border}`,
                background: active ? t.accentPrimary : 'transparent',
                color: active ? t.background : t.textPrimary,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VizButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const t = useVizTokens();
  const isPrimary = variant === 'primary';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        borderRadius: RADIUS.sm,
        border: `1px solid ${isPrimary ? t.accentPrimary : t.border}`,
        background: isPrimary ? t.accentPrimary : 'transparent',
        color: isPrimary ? t.background : t.textPrimary,
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 120ms ease',
      }}
    >
      {children}
    </button>
  );
}

export function ControlRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: SPACING.md, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: SPACING.sm }}>
      {children}
    </div>
  );
}

/** Transport controls (play/pause/reset/step) for any step-driven visualization. */
export function PlaybackControls({
  playing,
  onTogglePlay,
  onReset,
  onStepBack,
  onStepForward,
  disableBack,
  disableForward,
}: {
  playing: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onStepBack?: () => void;
  onStepForward?: () => void;
  disableBack?: boolean;
  disableForward?: boolean;
}) {
  const t = useVizTokens();
  const iconBtn: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    border: `1px solid ${t.border}`,
    background: 'transparent',
    color: t.textPrimary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
  };
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {onStepBack && (
        <button type="button" onClick={onStepBack} disabled={disableBack} style={{ ...iconBtn, opacity: disableBack ? 0.4 : 1 }} aria-label="Step back">
          ◀
        </button>
      )}
      <button
        type="button"
        onClick={onTogglePlay}
        style={{ ...iconBtn, borderColor: t.accentPrimary, color: t.accentPrimary }}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      {onStepForward && (
        <button type="button" onClick={onStepForward} disabled={disableForward} style={{ ...iconBtn, opacity: disableForward ? 0.4 : 1 }} aria-label="Step forward">
          ▶|
        </button>
      )}
      <button type="button" onClick={onReset} style={iconBtn} aria-label="Reset">
        ↺
      </button>
    </div>
  );
}
