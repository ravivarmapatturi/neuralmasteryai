import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { classifierScore, classify, gradient } from '../lib/aisecurity';

const BASE: [number, number] = [1.3, 0.4]; // sits just inside class 1's region (radius ≈1.36 > sqrt(1.6)≈1.265)
const EPS_PRESETS = [0.05, 0.25, 0.45, 0.12];

export default function AdversarialPerturbationDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(EPS_PRESETS.length, 3000, 0);
  const [userEpsilon, setUserEpsilon] = useState<number | null>(null);
  const epsilon = userEpsilon ?? EPS_PRESETS[autoIdx];

  const { perturbed, baseScore, perturbedScore, baseClass, perturbedClass } = useMemo(() => {
    const [gx, gy] = gradient(...BASE);
    const norm = Math.hypot(gx, gy) || 1;
    // Step AGAINST the gradient of the score that currently classifies it
    // correctly -- the real, standard adversarial-direction construction
    // (fast gradient sign method's continuous analogue).
    const dir: [number, number] = [-gx / norm, -gy / norm];
    const perturbed: [number, number] = [BASE[0] + dir[0] * epsilon, BASE[1] + dir[1] * epsilon];
    return {
      perturbed,
      baseScore: classifierScore(...BASE),
      perturbedScore: classifierScore(...perturbed),
      baseClass: classify(...BASE),
      perturbedClass: classify(...perturbed),
    };
  }, [epsilon]);

  const width = 320;
  const height = 320;
  const scale = 90;
  const cx = width / 2, cy = height / 2;
  const px = (x: number) => cx + x * scale;
  const py = (y: number) => cy - y * scale;

  const circlePts: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    circlePts.push([Math.sqrt(1.6) * Math.cos(a), Math.sqrt(1.6) * Math.sin(a)]);
  }

  return (
    <VisualizationContainer footer={`Real decision boundary: x²+y²=1.6. Original point scores ${baseScore.toFixed(3)} (class ${baseClass}). A perturbation of magnitude ε=${epsilon.toFixed(2)}, moved exactly along the real gradient direction, changes the score to ${perturbedScore.toFixed(3)} ${perturbedClass !== baseClass ? '-- crossing the boundary, flipping the classification' : '-- not quite enough to flip it yet'}. Push ε up and watch the flip happen at a real, computable threshold, not an arbitrary one.`}>
      <Slider label="perturbation magnitude (ε)" value={epsilon} onChange={(v) => { stop(); setUserEpsilon(v); }} min={0} max={0.6} step={0.01} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 320, margin: '8px auto 0' }}>
        <polygon points={circlePts.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')} fill={t.accentSecondary} fillOpacity={0.08} stroke={t.accentSecondary} strokeWidth={1.5} strokeDasharray="4 3" />

        <line x1={px(BASE[0])} y1={py(BASE[1])} x2={px(perturbed[0])} y2={py(perturbed[1])} stroke={t.accentWarn} strokeWidth={2} markerEnd="url(#adv-arrow)" />
        <defs>
          <marker id="adv-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentWarn} />
          </marker>
        </defs>

        <circle cx={px(BASE[0])} cy={py(BASE[1])} r={7} fill={baseClass === 1 ? t.accentPrimary : t.accentDanger} stroke={t.surface} strokeWidth={1.5} />
        <text x={px(BASE[0]) + 10} y={py(BASE[1]) - 8} fontSize={10} fill={t.textMuted}>original</text>

        <circle cx={px(perturbed[0])} cy={py(perturbed[1])} r={7} fill={perturbedClass === 1 ? t.accentPrimary : t.accentDanger} stroke={t.surface} strokeWidth={1.5} />
        <text x={px(perturbed[0]) + 10} y={py(perturbed[1]) + 16} fontSize={10} fill={t.textMuted}>perturbed</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        A human looking at "original" vs. "perturbed" would call these two points essentially the same input -- the model's decision boundary doesn't agree.
      </div>
    </VisualizationContainer>
  );
}
