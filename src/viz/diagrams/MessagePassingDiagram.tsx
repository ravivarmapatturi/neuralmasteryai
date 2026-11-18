import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, FlowDots, line, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const NODES = [
  { id: 0, x: 150, y: 60 },
  { id: 1, x: 60, y: 110 },
  { id: 2, x: 150, y: 140 },
  { id: 3, x: 240, y: 110 },
  { id: 4, x: 20, y: 60 },
  { id: 5, x: 280, y: 60 },
];
const EDGES: [number, number][] = [[0, 1], [0, 2], [0, 3], [1, 4], [3, 5]];

function hopDistance(from: number): Map<number, number> {
  const dist = new Map<number, number>([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(cur)!;
    for (const [a, b] of EDGES) {
      const nb = a === cur ? b : b === cur ? a : null;
      if (nb !== null && !dist.has(nb)) {
        dist.set(nb, d + 1);
        queue.push(nb);
      }
    }
  }
  return dist;
}

/** A center node's representation after k rounds of message passing
 * -- click k to see which nodes' information has reached it, the
 * graph analog of a CNN's receptive field. */
export default function MessagePassingDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(3, 1800);
  const k = cycle.value + 1;
  const setK = (value: number) => cycle.pick(value - 1);
  const color = getConceptColor(t, 'attention');
  const dist = hopDistance(0);

  return (
    <VisualizationContainer footer={`After ${k} layer${k > 1 ? 's' : ''} of message passing, node 0's representation reflects its ${k}-hop neighborhood -- ${[...dist.values()].filter((d) => d <= k).length - 1} other node(s) have influenced it so far.`}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {[1, 2, 3].map((x) => (
          <div key={x} onClick={() => setK(x)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setK(x); } }} onMouseEnter={() => setK(x)} style={{ cursor: 'pointer', padding: '0.4rem 0.7rem', borderRadius: 7, background: k === x ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${k === x ? color : t.border}` }}>
            <span style={{ fontSize: 10, fontWeight: k === x ? 700 : 500, color: k === x ? color : t.textPrimary }}>k={x}</span>
          </div>
        ))}
      </div>
      <svg width="100%" viewBox="0 0 300 170" style={{ display: 'block' }}>
        {EDGES.map(([a, b], i) => {
          const na = NODES[a], nb = NODES[b];
          return <g key={i}><line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={t.border} strokeWidth={1.5} />{Math.min(dist.get(a) ?? 9, dist.get(b) ?? 9) < k && <FlowDots d={line(na.x, na.y, nb.x, nb.y)} color={color} count={1} dur={1.8} delay={Math.min(dist.get(a) ?? 0, dist.get(b) ?? 0) * 0.45} />}</g>;
        })}
        {NODES.map((n) => {
          const d = dist.get(n.id) ?? Infinity;
          const inRange = d <= k;
          const isCenter = n.id === 0;
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={isCenter ? 14 : 11} fill={isCenter ? color : inRange ? `${color}35` : t.surfaceAlt} stroke={isCenter ? color : inRange ? color : t.border} strokeWidth={isCenter ? 2 : 1.25} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={9} fontWeight={isCenter ? 700 : 500} fill={isCenter ? t.background : t.textSecondary}>{n.id}</text>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
