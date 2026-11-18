import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { detectionProbability } from '../lib/alignment';

// Reuses the exact same detection-probability math from the deception
// diagram on Alignment & RLHF (1 - (1-p)^n) -- staged rollout is that
// same statistics problem, just with "audience size" standing in for
// "number of eval inputs."
const STAGES = [
  { label: 'Internal testing', n: 50 },
  { label: 'Limited external', n: 2000 },
  { label: 'General availability', n: 2_000_000 },
];
const P_PRESETS = [0.0005, 0.002, 0.0001, 0.005];

export default function StagedDeploymentDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(P_PRESETS.length, 3000, 0);
  const [userP, setUserP] = useState<number | null>(null);
  const p = userP ?? P_PRESETS[autoIdx];

  const results = useMemo(() => STAGES.map((s) => ({ ...s, prob: detectionProbability(p, s.n) })), [p]);
  const firstCaughtIdx = results.findIndex((r) => r.prob > 0.5);

  return (
    <VisualizationContainer footer={`With a rare real issue rate p=${p.toFixed(4)} per user: ${results.map((r) => `${r.label} (n=${r.n.toLocaleString()}) has ${(r.prob * 100).toFixed(1)}% chance of surfacing it`).join('; ')}. Staged rollout doesn't guarantee catching a rare issue early -- it guarantees that WHICHEVER stage does catch it, the blast radius up to that point was bounded by that stage's audience, not GA's.`}>
      <Slider label="real issue rate (p) per user" value={p} onChange={(v) => { stop(); setUserP(v); }} min={0.00005} max={0.01} step={0.00005} format={(v) => v.toFixed(4)} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
        {results.map((r, i) => (
          <div key={r.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: i === firstCaughtIdx ? t.accentPrimary : t.textSecondary, fontWeight: i === firstCaughtIdx ? 700 : 400 }}>{r.label} (n={r.n.toLocaleString()})</span>
              <span style={{ color: t.textMuted }}>{(r.prob * 100).toFixed(2)}%</span>
            </div>
            <div style={{ background: t.surfaceAlt, borderRadius: 4, height: 14 }}>
              <div style={{ width: `${r.prob * 100}%`, height: '100%', background: i === firstCaughtIdx ? t.accentPrimary : t.textMuted, borderRadius: 4, transition: 'width 200ms ease' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        {firstCaughtIdx === -1 ? 'At this rate, none of the three stages individually reach 50% detection odds -- this is a real, current limitation, not a solved problem.' : `First stage with real >50% odds of catching it: ${results[firstCaughtIdx].label}.`}
      </div>
    </VisualizationContainer>
  );
}
