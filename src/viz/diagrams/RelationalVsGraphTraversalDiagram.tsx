import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const FANOUT = 3; // avg matching rows per join hop -- representative, not universal
const WIDTH = 480;
const HEIGHT = 200;
const PAD_L = 50;
const PAD_B = 30;

function relationalCost(hops: number): number {
  return FANOUT ** hops; // each additional JOIN multiplies the row-fan-out of the previous one
}
function graphCost(hops: number): number {
  return hops * 2; // following a pointer to a node's neighbors is a local, ~constant-time step
}

const HOP_PRESETS = [3, 1, 5, 2];

export default function RelationalVsGraphTraversalDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(HOP_PRESETS.length, 3000, 0);
  const [userHops, setUserHops] = useState<number | null>(null);
  const hops = userHops ?? HOP_PRESETS[autoIdx];

  const relColor = t.accentDanger;
  const graphColor = getConceptColor(t, 'attention');
  const maxCost = relationalCost(6);
  const plotW = WIDTH - PAD_L - 20;
  const plotH = HEIGHT - PAD_B - 20;

  const barsFor = (fn: (h: number) => number, color: string, dx: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const h = i + 1;
      const cost = fn(h);
      const barH = (Math.log(cost + 1) / Math.log(maxCost + 1)) * plotH;
      const x = PAD_L + i * (plotW / 6) + dx;
      const y = 20 + plotH - barH;
      const active = h === hops;
      return (
        <rect key={h} x={x} y={y} width={plotW / 6 / 2 - 4} height={barH} fill={color} opacity={active ? 1 : 0.35} rx={2} />
      );
    });

  return (
    <VisualizationContainer
      footer={`At ${hops} hop${hops === 1 ? '' : 's'}: a relational join chain (assuming ~${FANOUT} matching rows per hop) examines on the order of ${relationalCost(hops).toLocaleString()} rows, while a graph traversal touches roughly ${graphCost(hops)} -- following a relationship pointer is a local, near-constant-time step regardless of how large the overall graph is, while each additional JOIN multiplies the previous step's result set.`}
    >
      <Slider
        label={`Hops (relationship depth)`}
        value={hops}
        onChange={(v) => {
          stop();
          setUserHops(v);
        }}
        min={1}
        max={6}
        format={(v) => `${v}`}
      />
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={PAD_L} y1={20 + plotH} x2={PAD_L + plotW} y2={20 + plotH} stroke={t.border} strokeWidth={1} />
        {barsFor(relationalCost, relColor, 0)}
        {barsFor(graphCost, graphColor, plotW / 6 / 2)}
        {Array.from({ length: 6 }, (_, i) => (
          <text key={i} x={PAD_L + i * (plotW / 6) + plotW / 6 / 2} y={20 + plotH + 16} textAnchor="middle" fontSize={9} fill={t.textMuted}>
            {i + 1}
          </text>
        ))}
        <text x={PAD_L} y={12} fontSize={9} fill={t.textMuted}>rows/steps examined (log scale)</text>
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: DIAGRAM_TYPE.secondaryLabel.size, marginTop: 4 }}>
        <span style={{ color: relColor }}>■ Relational JOIN chain</span>
        <span style={{ color: graphColor }}>■ Graph traversal</span>
      </div>
    </VisualizationContainer>
  );
}
