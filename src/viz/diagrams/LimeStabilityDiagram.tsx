import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { fitLocalLinear, offsetsFromSeed } from '../lib/interpretability';

const INST_X = 1.0;
const INST_Y = 0.5;
const SEEDS = [1, 2, 3, 4, 5];

// The analytic gradient of the SAME true model at the same instance --
// computed once, in closed form, so it doesn't depend on any perturbation
// sample. This is the "ground truth" SHAP-like stable target every LIME
// run below is trying (and, with few samples, sometimes failing) to hit.
function analyticGradient(x: number, y: number, r = 1.5, k = 3) {
  const z = k * (r * r - x * x - y * y);
  const p = 1 / (1 + Math.exp(-z));
  const dz = p * (1 - p);
  return { gx: dz * k * -2 * x, gy: dz * k * -2 * y };
}

export default function LimeStabilityDiagram() {
  const t = useVizTokens();
  const SAMPLE_OPTIONS: (14 | 60)[] = [14, 60];
  const { value: autoIdx } = useAutoCycle(SAMPLE_OPTIONS.length, 2800);
  const [userSamples, setUserSamples] = useState<14 | 60 | null>(null);
  const nSamples = userSamples ?? SAMPLE_OPTIONS[autoIdx];

  const runs = useMemo(
    () => SEEDS.map((seed) => {
      const { b1, b2 } = fitLocalLinear(INST_X, INST_Y, offsetsFromSeed(seed, nSamples, 1.0), 0.5);
      return { seed, b1, b2 };
    }),
    [nSamples],
  );
  const ref = analyticGradient(INST_X, INST_Y);

  const width = 560;
  const height = 190;
  const rowY = { b1: 60, b2: 150 };
  const plotLeft = 90;
  const plotRight = width - 20;
  const domain: [number, number] = [-0.7, 0.1];
  const xFor = (v: number) => plotLeft + ((v - domain[0]) / (domain[1] - domain[0])) * (plotRight - plotLeft);

  const spread = (vals: number[]) => Math.max(...vals) - Math.min(...vals);

  return (
    <VisualizationContainer footer={`Five LIME runs, same instance, same kernel — only the random perturbation sample differs. With ${nSamples} samples, the fitted coefficients scatter ${nSamples === 14 ? 'visibly' : 'much less'} around the true local gradient (dashed). SHAP's Shapley-value computation has no such sampling noise for a fixed model + coalition structure.`}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {[14, 60].map((n) => (
          <button key={n} type="button" onClick={() => setUserSamples(n as 14 | 60)} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${nSamples === n ? t.accentPrimary : t.border}`,
            background: nSamples === n ? t.accentPrimary : 'transparent',
            color: nSamples === n ? t.background : t.textPrimary,
          }}>{n} samples/run</button>
        ))}
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {(['b1', 'b2'] as const).map((coef) => {
          const y = rowY[coef];
          const refVal = coef === 'b1' ? ref.gx : ref.gy;
          const vals = runs.map((r) => r[coef]);
          return (
            <g key={coef}>
              <text x={10} y={y + 4} fontSize={12} fontFamily="monospace" fontWeight={700} fill={t.textSecondary}>{coef}</text>
              <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke={t.border} strokeWidth={1} />
              <line x1={xFor(refVal)} y1={y - 22} x2={xFor(refVal)} y2={y + 22} stroke={t.textSecondary} strokeWidth={1.5} strokeDasharray="4 3" />
              {runs.map((r, i) => (
                <circle key={i} cx={xFor(r[coef])} cy={y - 10 + (i % 2 === 0 ? -6 : 6)} r={5.5} fill={t.accentDanger} fillOpacity={0.75} stroke={t.surface} strokeWidth={1} />
              ))}
              <text x={plotRight} y={y - 26} textAnchor="end" fontSize={10} fill={t.textMuted}>spread {spread(vals).toFixed(3)}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span style={{ color: t.textSecondary }}>┊</span> analytic (stable) local gradient &nbsp;&nbsp; <span style={{ color: t.accentDanger }}>⬤</span> one LIME run's fitted coefficient
      </div>
    </VisualizationContainer>
  );
}
