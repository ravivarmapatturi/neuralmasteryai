import { useState } from 'react';
import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const BATCH_SIZES = [1, 2, 4, 8, 16];

/** Why batching wins on a GPU: cost per request drops sharply as batch
 * size grows, because the GPU forward pass for a batch of 8 costs barely
 * more than a batch of 1 -- drag the batch window to see the effective
 * per-request GPU-time actually fall. */
export default function AdaptiveBatchingQueueDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, pick } = useAutoCycle(BATCH_SIZES.length, 2500, 2);
  const [manualBatch, setManualBatch] = useState<number | null>(null);
  const batchSize = manualBatch ?? BATCH_SIZES[autoIdx];
  const color = getConceptColor(t, 'attention');

  // Toy model: fixed forward-pass overhead + small marginal cost per extra
  // item -- illustrates why batch-of-8 costs far less than 8x batch-of-1.
  const fixedOverheadMs = 8;
  const perItemMs = 1.2;
  const totalMs = fixedOverheadMs + batchSize * perItemMs;
  const perRequestMs = totalMs / batchSize;
  const unbatchedPerRequestMs = fixedOverheadMs + perItemMs;

  const width = 560;
  const height = 150;
  const maxBatch = 16;
  const chartBottom = 130;
  const chartTop = 20;
  const xFor = (n: number) => 50 + (n / maxBatch) * (width - 90);
  const maxCost = fixedOverheadMs + perItemMs;
  const yFor = (cost: number) => chartBottom - (cost / maxCost) * (chartBottom - chartTop);

  return (
    <VisualizationContainer footer={`Batch of ${batchSize}: ${totalMs.toFixed(1)}ms total GPU time, ${perRequestMs.toFixed(2)}ms per request -- vs. ${unbatchedPerRequestMs.toFixed(1)}ms per request if each ran alone. The fixed overhead (kernel launch, memory transfer) is paid once per BATCH, not once per REQUEST.`}>
      <Slider
        label={`Batch window collects: ${batchSize} request${batchSize !== 1 ? 's' : ''}`}
        min={1}
        max={maxBatch}
        step={1}
        value={batchSize}
        onChange={(v) => {
          setManualBatch(v);
          const closest = BATCH_SIZES.reduce((prev, curr) => Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev);
          pick(BATCH_SIZES.indexOf(closest));
        }}
      />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={50} y1={chartBottom} x2={width - 20} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        <line x1={50} y1={chartTop} x2={50} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        <path
          d={Array.from({ length: maxBatch }, (_, i) => {
            const n = i + 1;
            const cost = (fixedOverheadMs + n * perItemMs) / n;
            return `${i === 0 ? 'M' : 'L'} ${xFor(n)},${yFor(cost)}`;
          }).join(' ')}
          fill="none" stroke={color} strokeWidth={2.5}
        />
        <circle cx={xFor(batchSize)} cy={yFor(perRequestMs)} r={4.5} fill={color} />
        <text x={50} y={chartTop - 4} fontSize={9} fill={t.textMuted}>ms per request</text>
        <text x={width - 20} y={chartBottom + 16} textAnchor="end" fontSize={9} fill={t.textMuted}>batch size →</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color, fontWeight: 700, marginTop: 4 }}>
        {(unbatchedPerRequestMs / perRequestMs).toFixed(1)}x cheaper per request than running each alone.
      </div>
    </VisualizationContainer>
  );
}
