import { useState, useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { polyFit, evalPoly } from '../lib/advancedRl';

// The true value function has its real peak INSIDE a gap the offline
// dataset never visited -- exactly the setup that makes naive value
// extrapolation dangerous: the fitted function is free to claim whatever
// it wants there, with no data to correct it.
function trueValue(a: number): number { return 1 - a * a; }
const SEEN_X = [-1, -0.75, -0.55, 0.55, 0.75, 1];
const SEEN_Y = SEEN_X.map((x) => trueValue(x) + (x > 0 ? 0.03 : -0.03));

const DEGREES = [4, 2, 3];

export default function OfflineRlExtrapolationDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(DEGREES.length, 3200);
  const [userDegree, setUserDegree] = useState<number | null>(null);
  const degree = userDegree ?? DEGREES[autoIdx];

  const coeffs = useMemo(() => polyFit(SEEN_X, SEEN_Y, degree), [degree]);

  const width = 420;
  const height = 260;
  const domain: [number, number] = [-1.2, 1.2];
  const px = (x: number) => ((x - domain[0]) / (domain[1] - domain[0])) * width;
  const range: [number, number] = [-1.5, 2.5];
  const py = (y: number) => height - ((y - range[0]) / (range[1] - range[0])) * height;

  const samples = Array.from({ length: 80 }, (_, i) => domain[0] + (i / 79) * (domain[1] - domain[0]));
  const truePts = samples.map((x) => [px(x), py(trueValue(x))]);
  const fitPts = samples.map((x) => [px(x), py(evalPoly(coeffs, x))]);

  // naive offline policy: argmax of the FITTED curve over the sampled grid
  let bestIdx = 0;
  for (let i = 1; i < samples.length; i++) if (evalPoly(coeffs, samples[i]) > evalPoly(coeffs, samples[bestIdx])) bestIdx = i;
  const chosenA = samples[bestIdx];
  const claimedValue = evalPoly(coeffs, chosenA);
  const actualValue = trueValue(chosenA);

  return (
    <VisualizationContainer footer={`A real degree-4 least-squares fit to only the 6 visible dots (no data in the middle gap) claims action a=${chosenA.toFixed(2)} is worth ${claimedValue.toFixed(2)} -- its real value is only ${actualValue.toFixed(2)}. The naive offline policy would confidently pick an action it has essentially no evidence for.`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'center' }}>
        {DEGREES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setUserDegree(d)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              border: `1px solid ${degree === d ? t.accentPrimary : t.border}`,
              background: degree === d ? `${t.accentPrimary}20` : 'transparent',
              color: degree === d ? t.accentPrimary : t.textSecondary,
            }}
          >
            {d === 4 ? 'Standard Q (degree 4)' : d === 2 ? 'Conservative (degree 2)' : 'Cubic (degree 3)'}
          </button>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: 420, margin: '0 auto' }}>
        {/* unseen gap band */}
        <rect x={px(-0.5)} y={0} width={px(0.5) - px(-0.5)} height={height} fill={t.textMuted} fillOpacity={0.08} />
        <text x={px(0)} y={16} textAnchor="middle" fontSize={10} fill={t.textMuted}>never visited by the dataset</text>

        <polyline points={truePts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentSecondary} strokeWidth={2} strokeDasharray="5 3" />
        <polyline points={fitPts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentDanger} strokeWidth={2.5} />

        {SEEN_X.map((x, i) => (
          <circle key={i} cx={px(x)} cy={py(SEEN_Y[i])} r={5} fill={t.accentPrimary} stroke={t.surface} strokeWidth={1.5} />
        ))}

        <circle cx={px(chosenA)} cy={py(claimedValue)} r={6} fill="none" stroke={t.accentDanger} strokeWidth={2} />
        <line x1={px(chosenA)} y1={py(claimedValue)} x2={px(chosenA)} y2={py(actualValue)} stroke={t.accentDanger} strokeWidth={1.5} strokeDasharray="3 2" />
        <circle cx={px(chosenA)} cy={py(actualValue)} r={4} fill={t.accentDanger} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> offline dataset (what the model actually saw)</span>
        <span><span style={{ color: t.accentSecondary }}>┈</span> true value</span>
        <span><span style={{ color: t.accentDanger }}>⬤</span> naive fitted value</span>
      </div>
    </VisualizationContainer>
  );
}
