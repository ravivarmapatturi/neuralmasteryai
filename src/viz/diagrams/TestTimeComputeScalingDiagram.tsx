import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const MIN_BUDGET = 1024;
const MAX_BUDGET = 32768;

/** Illustrative curve shaped to match the real, documented relationship --
 * NOT live model output. Anthropic's own extended-thinking writeup states
 * accuracy on math problems "improves logarithmically with the number of
 * thinking tokens," and independent analysis of OpenAI's o1 scaling chart
 * found the same log-linear shape: exponentially more compute buys
 * roughly linear accuracy gains, i.e. real but sharply diminishing
 * returns. This function reproduces that SHAPE with illustrative
 * constants, not a real benchmark result. */
function illustrativeAccuracy(budgetTokens: number): number {
  const floorAcc = 0.42;
  const gainPerDoubling = 0.09;
  const doublings = Math.log2(budgetTokens / MIN_BUDGET);
  return Math.min(0.93, floorAcc + gainPerDoubling * doublings);
}

export default function TestTimeComputeScalingDiagram() {
  const t = useVizTokens();
  const budgetCycle = useAutoCycle(497, 120, 48);
  const budget = MIN_BUDGET + budgetCycle.value * 64;
  const setBudget = (next: number) => budgetCycle.pick(Math.round((next - MIN_BUDGET) / 64));
  const color = t.accentPrimary;

  const points = useMemo(() => {
    const steps = 24;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const logMin = Math.log2(MIN_BUDGET);
      const logMax = Math.log2(MAX_BUDGET);
      const tokens = Math.pow(2, logMin + ((logMax - logMin) * i) / steps);
      return { tokens, acc: illustrativeAccuracy(tokens) };
    });
  }, []);

  const width = 420, height = 150;
  const logMin = Math.log2(MIN_BUDGET), logMax = Math.log2(MAX_BUDGET);
  const px = (tokens: number) => ((Math.log2(tokens) - logMin) / (logMax - logMin)) * width;
  const py = (a: number) => height - a * (height - 10) - 5;
  const path = points.map((p) => `${px(p.tokens)},${py(p.acc)}`).join(' ');
  const acc = illustrativeAccuracy(budget);

  return (
    <VisualizationContainer footer={`Illustrative curve at the documented shape (logarithmic, not linear) -- not a real benchmark run. Doubling the thinking budget from ${Math.round(budget)} to ${Math.round(budget * 2)} tokens buys a real but shrinking accuracy gain, and every one of those thinking tokens is billed as output -- so past a point, more budget mostly buys latency and cost, not correctness.`}>
      <Slider label={`thinking budget = ${budget.toLocaleString()} tokens`} value={budget} onChange={setBudget} min={MIN_BUDGET} max={MAX_BUDGET} step={64} format={(v) => `${Math.round(v).toLocaleString()} tok`} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 10 }}>
        <line x1={0} y1={height - 5} x2={width} y2={height - 5} stroke={t.border} strokeWidth={1} />
        <polyline points={path} fill="none" stroke={color} strokeWidth={2.5} />
        <line x1={px(budget)} y1={py(acc)} x2={px(budget)} y2={height - 5} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        <circle cx={px(budget)} cy={py(acc)} r={4} fill={color} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        <span>{MIN_BUDGET.toLocaleString()} tok (min)</span>
        <span>illustrative accuracy vs. thinking budget (log scale)</span>
        <span>{MAX_BUDGET.toLocaleString()} tok</span>
      </div>
    </VisualizationContainer>
  );
}
