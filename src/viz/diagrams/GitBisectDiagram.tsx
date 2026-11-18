import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const N_PRESETS = [200, 50, 500, 1000];

export default function GitBisectDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(N_PRESETS.length, 3000, 0);
  const [userN, setUserN] = useState<number | null>(null);
  const n = userN ?? N_PRESETS[autoIdx];
  const checks = Math.ceil(Math.log2(n));
  const color = getConceptColor(t, 'attention');
  const errColor = t.accentDanger;

  // Real simulation: each check halves the remaining search space.
  const steps: number[] = [];
  let remaining = n;
  while (remaining > 1) {
    steps.push(remaining);
    remaining = Math.ceil(remaining / 2);
  }
  steps.push(1);

  return (
    <VisualizationContainer footer={`${n} commits between the last known-good and known-bad: linear search (checking one at a time) could take up to ${n} checks. Binary search (git bisect) takes ⌈log₂(${n})⌉ = ${checks} checks -- each one eliminates half of whatever's left, regardless of which half the bug turns out to be in.`}>
      <Slider
        label="Commits to search"
        value={n}
        onChange={(v) => {
          stop();
          setUserN(v);
        }}
        min={2}
        max={1000}
        format={(v) => v.toLocaleString()}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '10px 0' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ padding: '6px 10px', borderRadius: 6, background: `${color}18`, border: `1px solid ${color}`, fontFamily: 'monospace', fontSize: 12, color }}>
              {s.toLocaleString()}
            </div>
            {i < steps.length - 1 && <span style={{ color: t.textMuted }}>→</span>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 20, fontSize: DIAGRAM_TYPE.secondaryLabel.size }}>
        <span>
          Binary search: <strong style={{ color }}>{checks}</strong> checks
        </span>
        <span>
          Linear search (worst case): <strong style={{ color: errColor }}>{n.toLocaleString()}</strong> checks
        </span>
      </div>
    </VisualizationContainer>
  );
}
