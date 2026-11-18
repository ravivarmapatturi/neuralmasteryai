import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const BATCH_STEPS = [2, 4, 8, 12, 16];

/** More micro-batches per pipeline fill/drain cycle means a smaller
 * fraction of total time is spent in the "bubble" -- drag micro-batch
 * count and watch the idle (bubble) fraction actually shrink. */
export default function PipelineBubbleDiagram() {
  const t = useVizTokens();
  const { value: stepIdx, pick } = useAutoCycle(BATCH_STEPS.length, 2500, 1);
  const microBatches = BATCH_STEPS[stepIdx];
  const STAGES = 4;
  const color = getConceptColor(t, 'attention');
  const bubbleColor = t.textMuted;

  const totalSteps = STAGES - 1 + microBatches;
  const bubblePct = Math.round(((STAGES - 1) / totalSteps) * 100);

  const width = 560;
  const cellW = Math.min(30, (width - 80) / totalSteps);

  return (
    <VisualizationContainer footer={`Bubble (idle) time: ${bubblePct}% of total. More micro-batches per cycle means the fixed fill/drain cost (${STAGES - 1} steps) is amortized over more useful work.`}>
      <Slider
        label={`Micro-batches: ${microBatches}`}
        min={1}
        max={16}
        step={1}
        value={microBatches}
        onChange={(val) => {
          const closest = BATCH_STEPS.reduce((prev, curr, idx) => Math.abs(curr - val) < Math.abs(BATCH_STEPS[prev] - val) ? idx : prev, 0);
          pick(closest);
        }}
      />
      <svg width="100%" viewBox={`0 0 ${width} ${STAGES * 26 + 20}`} style={{ display: 'block', marginTop: 8 }}>
        {Array.from({ length: STAGES }, (_, stage) => (
          <g key={stage}>
            <text x={4} y={20 + stage * 26} fontSize={8} fill={t.textMuted}>stage {stage + 1}</text>
            {Array.from({ length: totalSteps }, (_, step) => {
              const isBusy = step >= stage && step < stage + microBatches;
              return <rect key={step} x={60 + step * cellW} y={10 + stage * 26} width={cellW - 2} height={18} rx={2} fill={isBusy ? color : 'none'} stroke={isBusy ? color : bubbleColor} strokeWidth={1} opacity={isBusy ? 0.85 : 0.25} style={{ transition: 'all 200ms ease' }} />;
            })}
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: DIAGRAM_TYPE.caption.size, marginTop: 4 }}>
        <span style={{ color, fontWeight: 600 }}>■ doing useful work</span>
        <span style={{ color: t.textMuted }}>□ bubble (idle, waiting: {bubblePct}%)</span>
      </div>
    </VisualizationContainer>
  );
}
