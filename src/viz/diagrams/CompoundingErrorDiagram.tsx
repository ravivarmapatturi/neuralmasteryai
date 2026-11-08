import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { compoundingErrorTrace } from '../lib/advancedRl';

const STEPS = 30;

export default function CompoundingErrorDiagram() {
  const t = useVizTokens();
  const [seed, setSeed] = useState(3);
  const { compounding, corrected } = useMemo(() => compoundingErrorTrace(STEPS, seed, 0.12), [seed]);

  const width = 460;
  const height = 220;
  const maxAbs = Math.max(...compounding.map(Math.abs), ...corrected.map(Math.abs), 0.3);
  const px = (i: number) => (i / (STEPS - 1)) * width;
  const py = (v: number) => height / 2 - (v / maxAbs) * (height / 2 - 10);

  const line = (series: number[]) => series.map((v, i) => `${px(i)},${py(v)}`).join(' ');

  return (
    <VisualizationContainer footer={`Same per-step prediction error (a real random draw each step, std ≈0.12) fed two different ways: behavioral cloning (red) feeds its own drifted state back into itself, so error accumulates -- a real running sum, ending ${Math.abs(compounding[compounding.length - 1]).toFixed(2)} away from the expert after ${STEPS} steps. An expert-corrected variant (green, e.g. DAgger-style) resets from the true state each step, so the same-sized errors never accumulate -- ends within ${Math.abs(corrected[corrected.length - 1]).toFixed(2)}.`}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={t.border} strokeWidth={1} strokeDasharray="3 3" />
        <rect x={6} y={height / 2 - 16} width={155} height={14} rx={3} fill={t.surface} fillOpacity={0.92} />
        <text x={10} y={height / 2 - 5} fontSize={9.5} fontWeight={600} fill={t.textMuted}>expert trajectory (0 deviation)</text>

        <polyline points={line(corrected)} fill="none" stroke={t.accentPrimary} strokeWidth={2} />
        <polyline points={line(compounding)} fill="none" stroke={t.accentDanger} strokeWidth={2.5} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span><span style={{ color: t.accentDanger }}>⬤</span> behavioral cloning (compounding)</span>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> with expert correction (bounded)</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <VizButton onClick={() => setSeed((s) => s + 1)}>Re-run with new random errors</VizButton>
      </div>
    </VisualizationContainer>
  );
}
