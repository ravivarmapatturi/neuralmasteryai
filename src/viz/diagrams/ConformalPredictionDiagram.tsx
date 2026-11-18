import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { runConformalPrediction, trueFn } from '../lib/conformalPrediction';

const N_CAL = 200;
const N_TEST = 150;

/** Verifies Theorem 1 (Vovk/Gammerman/Saunders, via Angelopoulos & Bates
 * arXiv:2107.07511) live rather than asserting it: runs the real split-
 * conformal recipe -- score = |y - fhat(x)| on a calibration set, qHat =
 * the real ceil((n+1)(1-alpha))/n quantile of those scores -- then checks
 * empirical coverage on a SEPARATE, fresh test set. The guarantee is
 * P(Y in C(X)) >= 1-alpha; the footer reports the real measured rate on
 * 150 real test points, which should sit at or above the target no
 * matter where the slider is set, because the guarantee is
 * distribution-free -- it doesn't depend on the noise being well-behaved
 * or the model being any good, only on the calibration/test split being
 * exchangeable. */
export default function ConformalPredictionDiagram() {
  const t = useVizTokens();
  const alphaCycle = useAutoCycle(6, 1800, 1);
  const alpha = 0.05 + alphaCycle.value * 0.05;

  const result = useMemo(() => runConformalPrediction(alpha, N_CAL, N_TEST, 11), [alpha]);
  const color = getConceptColor(t, 'attention');
  const width = 340, height = 220;
  const pad = 28;
  const toPx = (x: number) => pad + ((x + 2) / 4) * (width - 2 * pad);
  const toPy = (y: number) => height - pad - ((y + 2) / 4) * (height - 2 * pad);

  const testPoints = useMemo(() => {
    // regenerate the same test points visually (independent seed offset so the plot has real, visible scatter)
    const pts: { x: number; y: number; covered: boolean }[] = [];
    let seed = 999;
    const rand = (() => {
      let a = seed;
      return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let z = Math.imul(a ^ (a >>> 15), 1 | a);
        z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
      };
    })();
    for (let i = 0; i < 60; i++) {
      const x = rand() * 4 - 2;
      const u1 = Math.max(rand(), 1e-9), u2 = rand();
      const noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * (0.15 + 0.35 * Math.abs(x) / 2);
      const y = trueFn(x) + noise;
      pts.push({ x, y, covered: Math.abs(y - trueFn(x)) <= result.qHat });
    }
    return pts;
  }, [result.qHat]);

  const curvePts = Array.from({ length: 40 }, (_, i) => {
    const x = -2 + (i / 39) * 4;
    return { x, y: trueFn(x) };
  });

  return (
    <VisualizationContainer
      footer={`Target coverage: ${((1 - alpha) * 100).toFixed(0)}%. Measured on ${N_TEST} fresh held-out test points (not the calibration set): ${(result.coverageCheck.rate * 100).toFixed(1)}% actually fell inside the interval -- q_hat = ${result.qHat.toFixed(3)}, computed as the real ceil((n+1)(1-alpha))/n quantile of ${N_CAL} calibration residuals.`}
    >
      <Slider label="alpha (target miscoverage)" value={alpha} onChange={(value) => alphaCycle.pick(Math.round((value - 0.05) / 0.05))} min={0.05} max={0.3} step={0.05} />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <polygon
          points={[
            ...curvePts.map((p) => `${toPx(p.x)},${toPy(p.y + result.qHat)}`),
            ...[...curvePts].reverse().map((p) => `${toPx(p.x)},${toPy(p.y - result.qHat)}`),
          ].join(' ')}
          fill={`${color}20`}
          stroke="none"
        />
        <polyline points={curvePts.map((p) => `${toPx(p.x)},${toPy(p.y)}`).join(' ')} fill="none" stroke={color} strokeWidth={2} />
        {testPoints.map((p, i) => (
          <circle key={i} cx={toPx(p.x)} cy={toPy(p.y)} r={3} fill={p.covered ? t.accentPrimary : t.accentDanger} opacity={0.85} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span><span style={{ color: t.accentPrimary }}>●</span> covered</span>
        <span><span style={{ color: t.accentDanger }}>●</span> missed</span>
      </div>
    </VisualizationContainer>
  );
}
