import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { overestimationBiasSimulation } from '../lib/advancedRl';

export default function OverestimationBiasDiagram() {
  const t = useVizTokens();
  const SEEDS = [1, 2, 3, 4, 5];
  const { value: autoIdx } = useAutoCycle(SEEDS.length, 2800);
  const [userSeed, setUserSeed] = useState<number | null>(null);
  const seed = userSeed ?? SEEDS[autoIdx];
  const result = useMemo(() => overestimationBiasSimulation(400, seed), [seed]);

  const rows = [
    { label: 'Single critic', est: result.single.est, true: result.single.true, color: t.accentDanger },
    { label: 'Twin critics (TD3)', est: result.twin.est, true: result.twin.true, color: t.accentPrimary },
  ];
  const maxVal = Math.max(...rows.map((r) => r.est), result.trueOptimal, 1e-6);

  return (
    <VisualizationContainer footer={`400 real Monte Carlo trials: each critic scores 21 candidate actions as trueQ(a) + noise, and the "policy" greedily picks the action with the highest score. Single critic's own estimate at its chosen action averages ${result.single.est.toFixed(3)} -- but that action's REAL value is only ${result.single.true.toFixed(3)}, a real ${(result.single.est - result.single.true).toFixed(3)} overestimation gap. Twin critics (min of two independent noisy estimates) narrow that gap to ${(result.twin.est - result.twin.true).toFixed(3)}.`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r) => (
          <div key={r.label}>
            <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: r.color, marginBottom: 4 }}>{r.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 90, fontSize: 11, color: t.textMuted }}>critic's estimate</div>
              <div style={{ flex: 1, background: t.surfaceAlt, borderRadius: 4, height: 16 }}>
                <div style={{ width: `${(r.est / maxVal) * 100}%`, height: '100%', background: r.color, opacity: 0.9, borderRadius: 4 }} />
              </div>
              <div style={{ width: 46, fontSize: 11, textAlign: 'right' }}>{r.est.toFixed(3)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <div style={{ width: 90, fontSize: 11, color: t.textMuted }}>true value there</div>
              <div style={{ flex: 1, background: t.surfaceAlt, borderRadius: 4, height: 16 }}>
                <div style={{ width: `${(r.true / maxVal) * 100}%`, height: '100%', background: r.color, opacity: 0.4, borderRadius: 4 }} />
              </div>
              <div style={{ width: 46, fontSize: 11, textAlign: 'right' }}>{r.true.toFixed(3)}</div>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: t.textMuted }}>true optimal value (at the real best action): <strong style={{ color: t.textPrimary }}>{result.trueOptimal.toFixed(3)}</strong></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
        <VizButton onClick={() => setUserSeed((seed % 5) + 1)}>Re-run with a new noise seed</VizButton>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        The gap isn't a fluke of one bad run -- re-running with a fresh seed keeps producing a real gap for the single critic, because taking a max over noisy estimates is a statistically biased estimator of the max of the true values, regardless of which specific noise was drawn.
      </div>
    </VisualizationContainer>
  );
}
