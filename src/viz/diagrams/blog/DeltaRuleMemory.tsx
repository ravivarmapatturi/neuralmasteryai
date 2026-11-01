import { useMemo, useState } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../../primitives';

const D = 64;
// Deterministic pseudo-random unit vectors so the figure is the same for every reader.
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 - 0.5; }; }
function unit(r: () => number) { const v = Array.from({ length: D }, r); const n = Math.hypot(...v); return v.map(x => x / n); }
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

/** Write `pairs` key-value pairs, then rewrite key 0. Returns how far a read of key 0 is from the new value. */
export function recallError(pairs: number, delta: boolean) {
  const r = rng(7);
  const keys = Array.from({ length: pairs }, () => unit(r));
  const vals = Array.from({ length: pairs }, () => unit(r));
  const newV = unit(r);
  // S is D x D; S^T k reads a value.
  const S = Array.from({ length: D }, () => new Array(D).fill(0));
  const write = (k: number[], v: number[]) => {
    const read = Array.from({ length: D }, (_, j) => S.reduce((s, row, i) => s + row[j] * k[i], 0));
    const w = delta ? v.map((x, j) => x - read[j]) : v; // delta rule writes only the correction (beta = 1)
    for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) S[i][j] += k[i] * w[j];
  };
  keys.forEach((k, i) => write(k, vals[i]));
  write(keys[0], newV);
  const out = Array.from({ length: D }, (_, j) => S.reduce((s, row, i) => s + row[j] * keys[0][i], 0));
  const err = Math.hypot(...out.map((x, j) => x - newV[j]));
  return { err, oldLeft: dot(out, vals[0]) };
}

export default function DeltaRuleMemory() {
  const t = useVizTokens();
  const [pairs, setPairs] = useState(20);
  const plain = useMemo(() => recallError(pairs, false), [pairs]);
  const delta = useMemo(() => recallError(pairs, true), [pairs]);
  const W = 520, max = 2.2, bar = (e: number) => Math.min(1, e / max) * (W - 190);
  return (
    <VisualizationContainer title="Rewriting a memory" footer={`A 64-dimensional memory stores ${pairs} key-value pairs, then key 0 gets a new value. Reading key 0 back: plain linear attention is off by ${plain.err.toFixed(2)} (the old value is still in there, plus crosstalk); the delta rule is off by ${delta.err.toFixed(2)}. Error is the distance from the new value; random unit vectors, computed live.`}>
      <VisualizationHeader eyebrow="TRY IT" title="Can the memory forget the old value?" description="Store more pairs and compare how well each update rule returns the new value for a rewritten key." />
      <label style={{ display: 'block', marginBottom: '0.75rem', color: t.textPrimary }}>Pairs stored: <strong>{pairs}</strong>
        <input aria-label="Key-value pairs stored" type="range" min={1} max={60} value={pairs} onChange={e => setPairs(Number(e.target.value))} style={{ display: 'block', width: '100%' }} />
      </label>
      <svg viewBox={`0 0 ${W} 120`} width="100%" role="img" aria-label={`Recall error: plain ${plain.err.toFixed(2)}, delta rule ${delta.err.toFixed(2)}.`}>
        {[['Plain linear attention', plain, t.accentDanger], ['Delta rule (β = 1)', delta, t.accentPrimary]].map(([label, r, c], i) => {
          const res = r as { err: number; oldLeft: number };
          return <g key={String(label)} transform={`translate(0 ${10 + i * 52})`}>
            <text x={0} y={22} fontSize={13} fill={t.textPrimary}>{String(label)}</text>
            <rect x={170} y={6} width={Math.max(2, bar(res.err))} height={24} rx={4} fill={String(c)} />
            <text x={176 + bar(res.err)} y={23} fontSize={13} fontWeight={700} fill={t.textPrimary}>{res.err.toFixed(2)}</text>
            <text x={170} y={44} fontSize={11} fill={t.textSecondary}>old value still read back: {Math.max(0, res.oldLeft * 100).toFixed(0)}%</text>
          </g>;
        })}
      </svg>
    </VisualizationContainer>
  );
}
