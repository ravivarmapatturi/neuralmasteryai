import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { bowl, bowlGradient } from '../lib/calculus';

const POS_PRESETS: [number, number][] = [
  [1.6, -0.9],
  [-1.8, 1.2],
  [-1.2, -1.5],
  [1.9, 1.4],
];

export default function GradientDirectionDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(POS_PRESETS.length, 2800);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [x, y] = userPos ?? POS_PRESETS[autoIdx];

  const grad = useMemo(() => bowlGradient(x, y), [x, y]);
  const value = bowl(x, y);

  const width = 300, height = 300, scale = 55, ox = width / 2, oy = height / 2;
  const px = (vx: number) => ox + vx * scale;
  const py = (vy: number) => oy - vy * scale;

  const grid = useMemo(() => {
    const cells: { x: number; y: number; v: number }[] = [];
    for (let gx = -2.4; gx <= 2.4; gx += 0.2) for (let gy = -2.4; gy <= 2.4; gy += 0.2) cells.push({ x: gx, y: gy, v: bowl(gx, gy) });
    return cells;
  }, []);
  const maxV = Math.max(...grid.map((c) => c.v));

  const gn = Math.hypot(grad[0], grad[1]) || 1;
  const ascend: [number, number] = [grad[0] / gn * 0.7, grad[1] / gn * 0.7];
  const descend: [number, number] = [-ascend[0], -ascend[1]];

  return (
    <VisualizationContainer footer={`f(x,y) = x² + 2y², at (${x.toFixed(2)}, ${y.toFixed(2)}): f = ${value.toFixed(2)}, real ∇f = (${grad[0].toFixed(2)}, ${grad[1].toFixed(2)}). The gradient (red) is the direction of STEEPEST INCREASE -- to reduce the loss, step the opposite way (green), exactly what every gradient-descent update does.`}>
      <div style={{ display: 'flex', gap: 16 }}>
        <Slider label="x" value={x} onChange={(newX) => setUserPos([newX, y])} min={-2.4} max={2.4} step={0.1} />
        <Slider label="y" value={y} onChange={(newY) => setUserPos([x, newY])} min={-2.4} max={2.4} step={0.1} />
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 300, margin: '8px auto 0' }}>
        {grid.map((c, i) => (
          <rect key={i} x={px(c.x) - 5} y={py(c.y) - 5} width={11} height={11} fill={t.accentSecondary} fillOpacity={(c.v / maxV) * 0.55} />
        ))}
        <defs>
          <marker id="gd-up" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={t.accentDanger} /></marker>
          <marker id="gd-down" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={t.accentPrimary} /></marker>
        </defs>
        <circle cx={px(x)} cy={py(y)} r={4} fill={t.textPrimary} />
        <line x1={px(x)} y1={py(y)} x2={px(x + ascend[0])} y2={py(y + ascend[1])} stroke={t.accentDanger} strokeWidth={2.5} markerEnd="url(#gd-up)" />
        <line x1={px(x)} y1={py(y)} x2={px(x + descend[0])} y2={py(y + descend[1])} stroke={t.accentPrimary} strokeWidth={2.5} markerEnd="url(#gd-down)" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        <span><span style={{ color: t.accentDanger }}>⬤</span> ∇f (steepest increase)</span>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> −∇f (gradient descent step)</span>
      </div>
    </VisualizationContainer>
  );
}
