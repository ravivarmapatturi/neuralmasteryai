import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const HOP_PRESETS = [3, 1, 5, 2];

/** How query cost actually grows with data/relationship size, per engine
 * -- a relational multi-hop join degrades with EVERY extra hop, a graph
 * traversal barely moves, and vector ANN search stays roughly flat as the
 * collection grows because that's the entire point of the index. Draggable
 * hop-count isolates the one variable that actually separates relational
 * from graph for connected queries. */
export default function ScaleCharacteristicsDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(HOP_PRESETS.length, 3000, 0);
  const [userHops, setUserHops] = useState<number | null>(null);
  const hops = userHops ?? HOP_PRESETS[autoIdx];
  const relColor = getConceptColor(t, 'query');
  const graphColor = t.accentWarn;

  const relationalCost = Math.pow(2.2, hops); // joins compound
  const graphCost = 1 + hops * 0.15; // near-flat, local traversal

  const width = 560;
  const height = 170;
  const chartTop = 15;
  const chartBottom = 130;
  const maxCost = Math.pow(2.2, 6);
  const barH = (v: number) => Math.max(3, (Math.min(v, maxCost) / maxCost) * (chartBottom - chartTop));

  return (
    <VisualizationContainer footer="Drag the hop count -- relational join cost compounds with every additional hop (each hop is another join across the whole table); graph traversal cost barely moves, because it's just following pointers to neighbors regardless of overall graph size. This is specifically about RELATIONSHIP depth -- a flat, single-table relational query doesn't have this problem at all.">
      <Slider
        label={`Query traverses ${hops} relationship hop${hops !== 1 ? 's' : ''} (e.g. "friends of friends of friends...")`}
        min={1}
        max={6}
        step={1}
        value={hops}
        onChange={(v) => {
          stop();
          setUserHops(v);
        }}
      />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={40} y1={chartBottom} x2={width - 20} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        <g>
          <rect x={140} y={chartBottom - barH(relationalCost)} width={80} height={barH(relationalCost)} fill={relColor} opacity={0.8} rx={3} />
          <text x={180} y={chartBottom + 16} textAnchor="middle" fontSize={10} fill={relColor} fontWeight={700}>Relational (joins)</text>
        </g>
        <g>
          <rect x={340} y={chartBottom - barH(graphCost)} width={80} height={barH(graphCost)} fill={graphColor} opacity={0.8} rx={3} />
          <text x={380} y={chartBottom + 16} textAnchor="middle" fontSize={10} fill={graphColor} fontWeight={700}>Graph (traversal)</text>
        </g>
        <text x={40} y={chartTop - 2} fontSize={9} fill={t.textMuted}>relative query cost</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        At {hops} hop{hops !== 1 ? 's' : ''}: relational cost ≈ {relationalCost.toFixed(1)}x baseline vs. graph ≈ {graphCost.toFixed(2)}x baseline.
      </div>
    </VisualizationContainer>
  );
}
