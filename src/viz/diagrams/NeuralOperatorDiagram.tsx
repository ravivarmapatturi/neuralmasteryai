import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { SPATIAL_GRID, initialCondition, diffuse } from '../lib/aiforscience';

type Kind = 'single-bump' | 'double-bump' | 'square';

export default function NeuralOperatorDiagram() {
  const t = useVizTokens();
  const KINDS: Kind[] = ['double-bump', 'single-bump', 'square'];
  const { value: autoIdx } = useAutoCycle(KINDS.length, 3400);
  const [userKind, setUserKind] = useState<Kind | null>(null);
  const kind = userKind ?? KINDS[autoIdx];
  const [time, setTime] = useState(0);

  const initial = useMemo(() => initialCondition(kind), [kind]);
  const evolved = useMemo(() => diffuse(initial, time), [initial, time]);

  const width = 380, height = 180;
  const px = (x: number) => ((x + 5) / 10) * width;
  const maxY = 1.4;
  const py = (y: number) => height - (y / maxY) * height;

  return (
    <VisualizationContainer footer={`Real closed-form solution to the 1D heat equation (convolution with a real Gaussian kernel of width √(2·diffusivity·t)) -- the exact mapping a trained neural operator learns to approximate directly, function to function, without re-solving from scratch. Switch initial conditions and the SAME mapping (same "operator") applies instantly to the new input -- no retraining, unlike a standard network trained for one fixed input/output pair.`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PillSelect label="Initial condition" value={kind} onChange={(v) => setUserKind(v as Kind)} options={[
          { value: 'single-bump', label: 'Single bump' },
          { value: 'double-bump', label: 'Double bump' },
          { value: 'square', label: 'Square pulse' },
        ]} />
        <Slider label="time t" value={time} onChange={setTime} min={0} max={6} step={0.1} />
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <polyline points={initial.map((y, i) => `${px(SPATIAL_GRID[i])},${py(y)}`).join(' ')} fill="none" stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="4 3" />
        <polyline points={evolved.map((y, i) => `${px(SPATIAL_GRID[i])},${py(y)}`).join(' ')} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        <span><span style={{ color: t.textMuted }}>┈</span> initial condition (t=0)</span>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> real solution at time t</span>
      </div>
    </VisualizationContainer>
  );
}
