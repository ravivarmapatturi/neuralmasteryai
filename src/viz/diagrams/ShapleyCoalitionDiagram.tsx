import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

// A real toy cooperative game: v(S) = the model's average predicted loan
// score using only the features in S (others held at their average value).
// Every number below is looked up from this one table -- the Shapley
// values are the actual average marginal contribution across all 3! = 6
// orderings, computed live below, not pasted in from elsewhere.
const V: Record<string, number> = { '': 50, I: 70, A: 55, C: 60, AI: 78, CI: 85, AC: 65, ACI: 90 };
const NAMES: Record<string, string> = { I: 'income', A: 'age', C: 'credit_score' };
const key = (s: string[]) => s.slice().sort().join('');
const v = (s: string[]) => V[key(s)];

const ORDERINGS: string[][] = [
  ['I', 'A', 'C'], ['I', 'C', 'A'], ['A', 'I', 'C'],
  ['A', 'C', 'I'], ['C', 'I', 'A'], ['C', 'A', 'I'],
];

function marginals(order: string[]) {
  const steps: { feature: string; before: number; after: number; delta: number }[] = [];
  let coalition: string[] = [];
  for (const f of order) {
    const before = v(coalition);
    coalition = [...coalition, f];
    const after = v(coalition);
    steps.push({ feature: f, before, after, delta: after - before });
  }
  return steps;
}

function shapleyValues() {
  const totals: Record<string, number> = { I: 0, A: 0, C: 0 };
  for (const order of ORDERINGS) {
    for (const s of marginals(order)) totals[s.feature] += s.delta;
  }
  return Object.fromEntries(Object.entries(totals).map(([f, t]) => [f, t / ORDERINGS.length]));
}

export default function ShapleyCoalitionDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(ORDERINGS.length, 2800);
  const [userOrderIdx, setUserOrderIdx] = useState<number | null>(null);
  const orderIdx = userOrderIdx ?? autoIdx;
  const order = ORDERINGS[orderIdx];
  const steps = marginals(order);
  const shap = shapleyValues();
  const colors: Record<string, string> = { I: t.accentPrimary, A: t.accentSecondary, C: t.accentWarn };

  const width = 620;
  const height = 140;
  const stageX = [70, 240, 410, 580];
  const yFor = (val: number) => height - 20 - (val / 100) * 100;

  return (
    <VisualizationContainer footer="Same 3 features, walked in a different order each time -- the marginal contribution a feature gets credited with depends on who's already in the coalition. Averaging over every ordering is what makes Shapley values fair rather than order-dependent.">
      <PillSelect label="Ordering" value={orderIdx} onChange={(v) => setUserOrderIdx(v as number)} options={ORDERINGS.map((o, i) => ({ value: i, label: o.map((f) => NAMES[f][0].toUpperCase()).join('→') }))} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        {stageX.map((x, i) => {
          const val = i === 0 ? V[''] : v(order.slice(0, i));
          return (
            <g key={i}>
              <line x1={x} y1={height - 20} x2={x} y2={yFor(val)} stroke={t.border} strokeWidth={1.5} />
              <circle cx={x} cy={yFor(val)} r={5} fill={t.textSecondary} />
              <text x={x} y={height - 6} textAnchor="middle" fontSize={10} fill={t.textMuted}>
                {i === 0 ? '∅' : order.slice(0, i).map((f) => NAMES[f]).join('+')}
              </text>
              <text x={x} y={yFor(val) - 10} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.textPrimary}>{val}</text>
            </g>
          );
        })}
        {steps.map((s, i) => {
          const x1 = stageX[i];
          const x2 = stageX[i + 1];
          const y1 = yFor(s.before);
          const y2 = yFor(s.after);
          const color = colors[s.feature];
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2.5} />
              <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>
                +{NAMES[s.feature]}: {s.delta >= 0 ? '+' : ''}{s.delta}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ marginTop: 12, fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary }}>Shapley value = average marginal contribution across all 6 orderings</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {(['I', 'C', 'A'] as const).map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 90, fontSize: 12, fontFamily: 'monospace', color: colors[f] }}>{NAMES[f]}</div>
            <div style={{ flex: 1, background: t.surfaceAlt, borderRadius: 4, height: 16 }}>
              <div style={{ width: `${(shap[f] / 25) * 100}%`, height: '100%', background: colors[f], borderRadius: 4 }} />
            </div>
            <div style={{ width: 40, fontSize: 12, textAlign: 'right', color: t.textSecondary }}>{shap[f].toFixed(1)}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        50 (baseline) + {shap.I.toFixed(1)} + {shap.C.toFixed(1)} + {shap.A.toFixed(1)} = {(50 + shap.I + shap.C + shap.A).toFixed(0)} — exactly the full-model prediction. That's the efficiency axiom: attributions always sum to prediction − baseline.
      </div>
    </VisualizationContainer>
  );
}
