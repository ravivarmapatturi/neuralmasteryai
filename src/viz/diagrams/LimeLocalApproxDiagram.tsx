import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { fitLocalLinear, offsetsFromSeed } from '../lib/interpretability';

const OFFSETS = offsetsFromSeed(7, 26, 1.1);

const SIGMA_PRESETS = [0.3, 0.6, 1.0, 1.8];

export default function LimeLocalApproxDiagram() {
  const t = useVizTokens();
  const [instX, setInstX] = useState(1.0);
  const [instY, setInstY] = useState(0.5);
  const { value: autoIdx } = useAutoCycle(SIGMA_PRESETS.length, 2800);
  const [userSigma, setUserSigma] = useState<number | null>(null);
  const sigma = userSigma ?? SIGMA_PRESETS[autoIdx];

  const width = 420;
  const height = 420;
  const scale = 90;
  const cx = width / 2;
  const cy = height / 2;
  const px = (x: number) => cx + x * scale;
  const py = (y: number) => cy - y * scale;

  const { points, b0, b1, b2 } = useMemo(() => fitLocalLinear(instX, instY, OFFSETS, sigma), [instX, instY, sigma]);

  // local boundary line: b0 + b1*x + b2*y = 0.5  ->  y = (0.5 - b0 - b1*x)/b2
  const lineY = (x: number) => (0.5 - b0 - b1 * x) / b2;

  const circlePoints: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    circlePoints.push([1.5 * Math.cos(a), 1.5 * Math.sin(a)]);
  }

  return (
    <VisualizationContainer footer={`Fitted local model: score ≈ ${b0.toFixed(2)} + ${b1.toFixed(2)}·x + ${b2.toFixed(2)}·y — a real weighted least-squares fit to the samples above, biased toward the ones closest to the instance (bigger dots = higher LIME weight). Drag the instance and it refits from scratch.`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Slider label="instance x" value={instX} onChange={setInstX} min={-1.5} max={1.5} step={0.1} />
        <Slider label="instance y" value={instY} onChange={setInstY} min={-1.5} max={1.5} step={0.1} />
        <Slider label="kernel width (σ)" value={sigma} onChange={setUserSigma} min={0.2} max={1.2} step={0.1} />
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 420, margin: '8px auto 0' }}>
        {/* true nonlinear boundary */}
        <polygon points={circlePoints.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')} fill={t.accentPrimary} fillOpacity={0.07} stroke={t.accentPrimary} strokeWidth={1.5} strokeDasharray="4 3" />

        {points.map((p, i) => (
          <circle key={i} cx={px(p.x)} cy={py(p.y)} r={3 + p.weight * 7} fill={p.prob > 0.5 ? t.accentPrimary : t.textMuted} fillOpacity={0.3 + p.weight * 0.6} />
        ))}

        {/* fitted local linear boundary, clipped to view */}
        <line x1={px(-1.8)} y1={py(lineY(-1.8))} x2={px(1.8)} y2={py(lineY(1.8))} stroke={t.accentDanger} strokeWidth={2.5} />

        {/* instance point */}
        <circle cx={px(instX)} cy={py(instY)} r={7} fill={t.accentWarn} stroke={t.background} strokeWidth={2} />
        <text x={px(instX) + 12} y={py(instY) - 8} fontSize={11} fontWeight={700} fill={t.accentWarn}>instance</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> true nonlinear boundary</span>
        <span><span style={{ color: t.accentDanger }}>⬤</span> LIME's local linear approximation</span>
      </div>
    </VisualizationContainer>
  );
}
