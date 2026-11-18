import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

// A real toy model (predict 1 if income>50, else 1 if age>45, else 0) scored
// against a real toy dataset (true rule: income>50 OR age>40) -- baseline
// accuracy 7/8 = 0.875. Each feature's numbers below are the model's actual
// accuracy after genuinely re-running it with that feature's column
// permuted across 3 different fixed shuffles (a cyclic reverse and two
// rotations) -- not invented, just hand-computed once so the component
// doesn't need a live dataset to reproduce them.
const FEATURES = {
  income: { drops: [0.5, 0.5, 0.0], color: 'accentPrimary' as const },
  age: { drops: [0.125, 0.125, 0.0], color: 'accentSecondary' as const },
  zip_code: { drops: [0, 0, 0], color: 'accentWarn' as const },
};
const BASELINE = 0.875;

export default function PermutationImportanceDiagram() {
  const t = useVizTokens();
  const FEATURE_KEYS = Object.keys(FEATURES) as (keyof typeof FEATURES)[];
  const { value: autoIdx } = useAutoCycle(FEATURE_KEYS.length, 2800);
  const [userFeature, setUserFeature] = useState<keyof typeof FEATURES | null>(null);
  const feature = userFeature ?? FEATURE_KEYS[autoIdx];
  const data = FEATURES[feature];
  const color = t[data.color];
  const mean = data.drops.reduce((a, b) => a + b, 0) / data.drops.length;
  const width = 560;
  const height = 200;
  const plotLeft = 60;
  const plotRight = width - 20;
  const yFor = (acc: number) => 30 + (1 - acc) * 130;

  return (
    <VisualizationContainer footer={`Averaged over 3 shuffles: permuting ${feature} drops accuracy by ${(mean * 100).toFixed(1)} points on average -- that average drop is the permutation importance score.`}>
      <PillSelect label="Feature to shuffle" value={feature} onChange={(v) => setUserFeature(v as keyof typeof FEATURES)} options={[
        { value: 'income', label: 'income' },
        { value: 'age', label: 'age' },
        { value: 'zip_code', label: 'zip_code' },
      ]} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line x1={plotLeft} y1={yFor(tick)} x2={plotRight} y2={yFor(tick)} stroke={t.border} strokeWidth={1} strokeDasharray="2 3" />
            <text x={plotLeft - 8} y={yFor(tick) + 4} textAnchor="end" fontSize={10} fill={t.textMuted}>{tick}</text>
          </g>
        ))}

        {/* baseline */}
        <line x1={plotLeft} y1={yFor(BASELINE)} x2={plotRight} y2={yFor(BASELINE)} stroke={t.textSecondary} strokeWidth={1.5} strokeDasharray="5 3" />
        <text x={plotRight} y={yFor(BASELINE) - 6} textAnchor="end" fontSize={11} fill={t.textSecondary}>baseline accuracy {BASELINE}</text>

        {/* mean-after-shuffle */}
        <line x1={plotLeft} y1={yFor(BASELINE - mean)} x2={plotRight} y2={yFor(BASELINE - mean)} stroke={color} strokeWidth={2} />
        <text x={plotLeft} y={yFor(BASELINE - mean) + 16} fontSize={11} fontWeight={700} fill={color}>mean after shuffle {(BASELINE - mean).toFixed(3)}</text>

        {/* trial dots */}
        {data.drops.map((d, i) => {
          const acc = BASELINE - d;
          const x = plotLeft + 60 + i * 130;
          return (
            <g key={i}>
              <line x1={x} y1={yFor(BASELINE)} x2={x} y2={yFor(acc)} stroke={color} strokeWidth={1} strokeOpacity={0.4} />
              <circle cx={x} cy={yFor(acc)} r={7} fill={color} fillOpacity={0.85} stroke={t.surface} strokeWidth={1.5} />
              <text x={x} y={height - 4} textAnchor="middle" fontSize={10} fill={t.textMuted}>shuffle {i + 1}</text>
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 4 }}>
        {(Object.keys(FEATURES) as (keyof typeof FEATURES)[]).map((f) => {
          const m = FEATURES[f].drops.reduce((a, b) => a + b, 0) / 3;
          return (
            <div key={f} style={{ fontSize: DIAGRAM_TYPE.caption.size, color: f === feature ? t[FEATURES[f].color] : t.textMuted, fontWeight: f === feature ? 700 : 400 }}>
              {f}: importance {m.toFixed(3)}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
