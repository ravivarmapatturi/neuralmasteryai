import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { quadraticForm, quadraticFormGradient, symmetricEigenvalues2, type Mat2 } from '../lib/linalg';

type Preset = 'pd' | 'psd' | 'indefinite';
const MATRICES: Record<Preset, Mat2> = {
  pd: [[2, 0.5], [0.5, 1.5]],
  psd: [[1, 1], [1, 1]],
  indefinite: [[1, 0], [0, -1]],
};

const PRESETS: Preset[] = ['pd', 'psd', 'indefinite'];

export default function QuadraticFormContourDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(PRESETS.length, 3200);
  const [userPreset, setUserPreset] = useState<Preset | null>(null);
  const preset = userPreset ?? PRESETS[autoIdx];
  const A = MATRICES[preset];
  const [lambda1, lambda2] = useMemo(() => symmetricEigenvalues2(A), [preset]);

  const width = 300, height = 300, scale = 55, ox = width / 2, oy = height / 2;
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy - y * scale;

  const grid = useMemo(() => {
    const cells: { x: number; y: number; v: number }[] = [];
    for (let x = -2.5; x <= 2.5; x += 0.2) {
      for (let y = -2.5; y <= 2.5; y += 0.2) {
        cells.push({ x, y, v: quadraticForm(A, [x, y]) });
      }
    }
    return cells;
  }, [preset]);
  const maxAbs = Math.max(...grid.map((c) => Math.abs(c.v)), 1e-6);

  const gradPoints: [number, number][] = [[1.5, 1], [-1.5, 1], [1.5, -1], [-1.5, -1], [0.8, -1.8]];

  return (
    <VisualizationContainer footer={`Real eigenvalues: λ = [${lambda1.toFixed(2)}, ${lambda2.toFixed(2)}]. ${preset === 'pd' ? 'Both strictly positive → positive definite → a real bowl, single global minimum at the origin, no flat directions.' : preset === 'psd' ? 'One eigenvalue is exactly 0 → positive SEMI-definite → a valley, not a bowl: flat (zero curvature) along one entire direction.' : 'Mixed signs → indefinite → a real saddle: a minimum along one axis, a maximum along the other, simultaneously.'}`}>
      <PillSelect label="Matrix A" value={preset} onChange={(v) => setUserPreset(v as Preset)} options={[
        { value: 'pd', label: 'Positive definite' },
        { value: 'psd', label: 'Positive semi-definite' },
        { value: 'indefinite', label: 'Indefinite (saddle)' },
      ]} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 300, margin: '8px auto 0' }}>
        {grid.map((c, i) => (
          <rect key={i} x={px(c.x) - 5} y={py(c.y) - 5} width={11} height={11} fill={t.accentPrimary} fillOpacity={Math.max(0, Math.min(0.7, Math.abs(c.v) / maxAbs))} />
        ))}
        <defs>
          <marker id="qf-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={t.accentWarn} /></marker>
        </defs>
        {gradPoints.map(([x, y], i) => {
          const g = quadraticFormGradient(A, [x, y]);
          const gn = Math.hypot(g[0], g[1]) || 1;
          const scaled: [number, number] = [g[0] / gn * 0.5, g[1] / gn * 0.5];
          return (
            <g key={i}>
              <circle cx={px(x)} cy={py(y)} r={3} fill={t.textPrimary} />
              <line x1={px(x)} y1={py(y)} x2={px(x + scaled[0])} y2={py(y + scaled[1])} stroke={t.accentWarn} strokeWidth={2} markerEnd="url(#qf-arrow)" />
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        Shading = real value of x^T A x at each point (darker = larger magnitude). Amber arrows = the real gradient (A+Aᵀ)x at 5 sample points -- always pointing toward steeper shading, exactly "uphill."
      </div>
    </VisualizationContainer>
  );
}
