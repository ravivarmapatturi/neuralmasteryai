import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { trueOdeSolution, networkPrediction, dataLoss, physicsLoss } from '../lib/aiforscience';

type Mode = 'dataOnly' | 'physicsInformed';
const DATA_POINTS = [0.1]; // deliberately sparse -- one single labeled point
const COLLOCATION_POINTS = [0.3, 0.8, 1.3, 1.8, 2.3, 2.8]; // no labels needed here, just the ODE

export default function PinnLossDiagram() {
  const t = useVizTokens();
  const MODES: Mode[] = ['physicsInformed', 'dataOnly'];
  const { value: autoIdx } = useAutoCycle(MODES.length, 3400);
  const [userMode, setUserMode] = useState<Mode | null>(null);
  const mode = userMode ?? MODES[autoIdx];
  const [a, setA] = useState(1.0);
  const [b, setB] = useState(0.0);

  const dLoss = useMemo(() => dataLoss(a, b, DATA_POINTS), [a, b]);
  const pLoss = useMemo(() => physicsLoss(a, b, COLLOCATION_POINTS), [a, b]);
  const totalLoss = mode === 'physicsInformed' ? dLoss + pLoss : dLoss;

  const width = 380, height = 200;
  const xDomain: [number, number] = [0, 3];
  const yDomain: [number, number] = [0, 1.1];
  const px = (x: number) => ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * width;
  const py = (y: number) => height - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * height;
  const samples = Array.from({ length: 60 }, (_, i) => (i / 59) * 3);

  return (
    <VisualizationContainer footer={`Real network output y(x) = e^(-ax) + bx·e^(-x), with only ONE labeled data point at x=0.1. Real data loss = ${dLoss.toFixed(4)}; real physics-residual loss (dy/dx + y, at 6 unlabeled points -- no ground truth needed, just the ODE itself) = ${pLoss.toFixed(4)}. ${mode === 'physicsInformed' ? 'With physics loss included, the fit is constrained everywhere, not just near the one labeled point.' : 'Data-only, the fit is free to do anything away from the single labeled point -- watch it drift from the true solution.'}`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PillSelect label="Training objective" value={mode} onChange={(v) => setUserMode(v as Mode)} options={[
          { value: 'physicsInformed', label: 'Data + physics loss' },
          { value: 'dataOnly', label: 'Data loss only' },
        ]} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <Slider label="param a" value={a} onChange={setA} min={0.2} max={2.5} step={0.05} />
        <Slider label="param b" value={b} onChange={setB} min={-1} max={1} step={0.05} />
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <polyline points={samples.map((x) => `${px(x)},${py(trueOdeSolution(x))}`).join(' ')} fill="none" stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="4 3" />
        <polyline points={samples.map((x) => `${px(x)},${py(networkPrediction(x, a, b))}`).join(' ')} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        {DATA_POINTS.map((x, i) => <circle key={i} cx={px(x)} cy={py(trueOdeSolution(x))} r={5} fill={t.accentWarn} />)}
        {mode === 'physicsInformed' && COLLOCATION_POINTS.map((x, i) => <circle key={i} cx={px(x)} cy={py(networkPrediction(x, a, b))} r={2.5} fill={t.accentSecondary} />)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, flexWrap: 'wrap' }}>
        <span><span style={{ color: t.textMuted }}>┈</span> true solution y=e⁻ˣ</span>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> network prediction</span>
        <span><span style={{ color: t.accentWarn }}>⬤</span> the one labeled point</span>
        {mode === 'physicsInformed' && <span><span style={{ color: t.accentSecondary }}>⬤</span> unlabeled physics-collocation points</span>}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Adjust a, b to minimize the real total loss ({totalLoss.toFixed(4)}) by hand and watch how differently "good" looks with vs. without the physics term.
      </div>
    </VisualizationContainer>
  );
}
