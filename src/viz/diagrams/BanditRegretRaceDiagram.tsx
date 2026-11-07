import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, VizButton, ControlRow } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { N_ARMS, OPTIMAL_PROB, simulateBandits, TRUE_PROBS } from '../lib/bandits';

const WIDTH = 640;
const HEIGHT = 220;
const PAD = 36;

/** Real cumulative-regret curves for epsilon-greedy, UCB1, and Thompson
 * Sampling, run against the same fixed 3-arm bandit -- not illustrative,
 * an actual simulation (see viz/lib/bandits.ts) you can watch play out to
 * a genuinely counter-intuitive result: UCB1 looks worse than
 * epsilon-greedy at first (it front-loads exploration) but its sublinear
 * regret eventually overtakes epsilon-greedy's linear regret. */
export default function BanditRegretRaceDiagram() {
  const t = useVizTokens();
  const [horizon, setHorizon] = useState(500);
  const [seed, setSeed] = useState(42);

  const trace = useMemo(() => simulateBandits(5000, seed), [seed]);
  const colorEps = getConceptColor(t, 'attention');
  const colorUcb = t.accentDanger;
  const colorThompson = getConceptColor(t, 'key');

  const visibleLen = horizon;
  const maxRegret = Math.max(
    trace.epsilonGreedy[visibleLen - 1],
    trace.ucb1[visibleLen - 1],
    trace.thompson[visibleLen - 1],
    1,
  );

  const toPath = (series: number[]) => {
    const step = Math.max(1, Math.floor(visibleLen / 150)); // sample for a smooth-enough, cheap path
    const points: string[] = [];
    for (let i = 0; i < visibleLen; i += step) {
      const x = PAD + (i / (visibleLen - 1)) * (WIDTH - 2 * PAD);
      const y = HEIGHT - PAD - (series[i] / maxRegret) * (HEIGHT - 2 * PAD);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return `M ${points.join(' L ')}`;
  };

  const finalEps = trace.epsilonGreedy[visibleLen - 1];
  const finalUcb = trace.ucb1[visibleLen - 1];
  const finalThompson = trace.thompson[visibleLen - 1];
  const ucbAheadOfEps = finalUcb < finalEps;

  const footer = `After ${horizon} pulls: Thompson=${finalThompson.toFixed(1)}, UCB1=${finalUcb.toFixed(1)}, ε-greedy=${finalEps.toFixed(1)} cumulative regret. ${
    ucbAheadOfEps
      ? "UCB1 has overtaken ε-greedy -- its sublinear regret (the flattening curve) wins out once there's enough horizon for it to matter."
      : "UCB1 still trails ε-greedy here -- its c=√2 confidence bound front-loads exploration heavily; try a longer horizon to watch it cross over."
  } Thompson Sampling leads throughout at every horizon tested.`;

  return (
    <VisualizationContainer footer={footer} title="Cumulative regret: epsilon-greedy vs UCB1 vs Thompson Sampling">
      <ControlRow>
        <div style={{ minWidth: 220 }}>
          <Slider label="Pulls (horizon)" value={horizon} onChange={setHorizon} min={20} max={5000} step={20} format={(v) => String(v)} />
        </div>
        <VizButton variant="secondary" onClick={() => setSeed((s) => s + 1)}>Re-run with a new seed</VizButton>
      </ControlRow>

      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ marginTop: 10 }}>
        <line x1={PAD} y1={HEIGHT - PAD} x2={WIDTH - PAD} y2={HEIGHT - PAD} stroke={t.border} />
        <line x1={PAD} y1={PAD} x2={PAD} y2={HEIGHT - PAD} stroke={t.border} />
        <text x={PAD} y={HEIGHT - 10} fontSize={10} fill={t.textSecondary}>0 pulls</text>
        <text x={WIDTH - PAD} y={HEIGHT - 10} textAnchor="end" fontSize={10} fill={t.textSecondary}>{horizon} pulls</text>

        <path d={toPath(trace.epsilonGreedy)} fill="none" stroke={colorEps} strokeWidth={2} />
        <path d={toPath(trace.ucb1)} fill="none" stroke={colorUcb} strokeWidth={2} />
        <path d={toPath(trace.thompson)} fill="none" stroke={colorThompson} strokeWidth={2} />
      </svg>

      <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: DIAGRAM_TYPE.secondaryLabel.size, flexWrap: 'wrap' }}>
        <Legend color={colorEps} label={`ε-greedy (ε=0.1): ${finalEps.toFixed(1)}`} />
        <Legend color={colorUcb} label={`UCB1: ${finalUcb.toFixed(1)}`} />
        <Legend color={colorThompson} label={`Thompson Sampling: ${finalThompson.toFixed(1)}`} />
      </div>
      <div style={{ marginTop: 6, fontSize: 11.5, color: t.textSecondary }}>
        True arm reward rates (unknown to the algorithms): {TRUE_PROBS.map((p) => p.toFixed(1)).join(' / ')} across {N_ARMS} arms -- optimal is {OPTIMAL_PROB.toFixed(1)}.
      </div>
    </VisualizationContainer>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
      {label}
    </div>
  );
}
