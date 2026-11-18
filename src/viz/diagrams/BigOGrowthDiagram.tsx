import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { opsFor, type Complexity } from '../lib/algorithms';

const CLASSES: { c: Complexity; color: 'accentPrimary' | 'accentSecondary' | 'textSecondary' | 'accentWarn' | 'accentDanger' }[] = [
  { c: 'O(1)', color: 'accentPrimary' },
  { c: 'O(log n)', color: 'accentSecondary' },
  { c: 'O(n)', color: 'textSecondary' },
  { c: 'O(n log n)', color: 'accentWarn' },
  { c: 'O(n^2)', color: 'accentDanger' },
];

const N_PRESETS = [10, 25, 50, 75, 100];

export default function BigOGrowthDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(N_PRESETS.length, 2600);
  const [userN, setUserN] = useState<number | null>(null);
  const n = userN ?? N_PRESETS[autoIdx];

  const width = 420, height = 200;
  const maxOps = opsFor('O(n^2)', 100);
  const px = (nn: number) => (nn / 100) * width;
  const py = (ops: number) => height - Math.min(1, ops / maxOps) * height;

  return (
    <VisualizationContainer footer={`At n=${n}: ${CLASSES.map((cl) => `${cl.c} = ${Math.round(opsFor(cl.c, n)).toLocaleString()} ops`).join(', ')}. O(2ⁿ) at n=${n} would be ${n <= 40 ? (2 ** n).toLocaleString() : 'astronomically large (' + n + ' doublings)'} -- too large to even plot on the same axis, which is the entire point: exponential algorithms aren't "somewhat slower," they're categorically infeasible past small n.`}>
      <Slider label="n" value={n} onChange={setUserN} min={1} max={100} step={1} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        {CLASSES.map((cl) => {
          const samples = Array.from({ length: 50 }, (_, i) => (i / 49) * 100);
          const points = samples.map((s) => `${px(s)},${py(opsFor(cl.c, s))}`).join(' ');
          return <polyline key={cl.c} points={points} fill="none" stroke={t[cl.color]} strokeWidth={2} />;
        })}
        <line x1={px(n)} y1={0} x2={px(n)} y2={height} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        {CLASSES.map((cl) => (
          <circle key={cl.c} cx={px(n)} cy={py(opsFor(cl.c, n))} r={3.5} fill={t[cl.color]} />
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        {CLASSES.map((cl) => <span key={cl.c}><span style={{ color: t[cl.color] }}>⬤</span> {cl.c}</span>)}
      </div>
    </VisualizationContainer>
  );
}
