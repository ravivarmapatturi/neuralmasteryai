import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { convexFn, convexGrad, nonConvexFn, nonConvexGrad, gd1D } from '../lib/calculus';

type Mode = 'convex' | 'nonconvex';

interface Preset {
  mode: Mode;
  start: number;
}

const PRESETS: Preset[] = [
  { mode: 'nonconvex', start: -2.5 },
  { mode: 'nonconvex', start: 0.8 },
  { mode: 'convex', start: -1.5 },
  { mode: 'convex', start: 4.5 },
];

export default function ConvexVsNonConvexDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(PRESETS.length, 3200);
  const [userPreset, setUserPreset] = useState<Preset | null>(null);
  const preset = userPreset ?? PRESETS[autoIdx];
  const mode = preset.mode;
  const start = preset.start;

  const fn = mode === 'convex' ? convexFn : nonConvexFn;
  const grad = mode === 'convex' ? convexGrad : nonConvexGrad;
  const domain: [number, number] = mode === 'convex' ? [-2, 6] : [-3, 3];

  const path = useMemo(() => gd1D(start, grad, 0.03, 60), [start, mode]);
  const finalX = path[path.length - 1];

  const width = 380, height = 200;
  const px = (x: number) => ((x - domain[0]) / (domain[1] - domain[0])) * width;
  const samples = Array.from({ length: 100 }, (_, i) => domain[0] + (i / 99) * (domain[1] - domain[0]));
  const values = samples.map(fn);
  const maxV = Math.max(...values), minV = Math.min(...values);
  const py = (v: number) => height - 10 - ((v - minV) / (maxV - minV || 1)) * (height - 20);

  return (
    <VisualizationContainer footer={`Real gradient descent (60 steps, lr=0.03) from x=${start.toFixed(1)} converges to x=${finalX.toFixed(3)}, f=${fn(finalX).toFixed(3)}. ${mode === 'convex' ? 'Convex: try any start point -- it always lands at the same global minimum, x=2.' : 'Non-convex: which of the two real minima it lands in depends entirely on the starting point -- drag the slider across the "ridge" between them and watch the outcome flip.'}`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PillSelect label="Function" value={mode} onChange={(v) => setUserPreset({ mode: v as Mode, start: v === 'convex' ? -1 : -2.5 })} options={[
          { value: 'nonconvex', label: 'Non-convex' },
          { value: 'convex', label: 'Convex' },
        ]} />
        <Slider label="starting point" value={start} onChange={(s) => setUserPreset({ mode, start: s })} min={domain[0]} max={domain[1]} step={0.05} />
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <polyline points={samples.map((x, i) => `${px(x)},${py(values[i])}`).join(' ')} fill="none" stroke={t.textSecondary} strokeWidth={2} />
        {path.map((x, i) => (
          <circle key={i} cx={px(x)} cy={py(fn(x))} r={i === path.length - 1 ? 5 : 2.5} fill={t.accentPrimary} fillOpacity={i === path.length - 1 ? 1 : 0.3 + (i / path.length) * 0.5} />
        ))}
        <circle cx={px(start)} cy={py(fn(start))} r={5} fill="none" stroke={t.accentWarn} strokeWidth={2} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        <span style={{ color: t.accentWarn }}>○</span> start &nbsp; <span style={{ color: t.accentPrimary }}>⬤</span> real GD trajectory, converging left to right
      </div>
    </VisualizationContainer>
  );
}
