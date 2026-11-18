import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { FlowDots, Pulse, line } from '../primitives/LiveFlow';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STAGES = [
  {
    name: 'Distribute',
    detail: 'Server samples a random fraction C of the K clients and sends each one the current global weights w_t -- no data ever moves in this step, only the model.',
  },
  {
    name: 'Local Train',
    detail: 'Each selected client runs E local epochs of SGD over its own private data, in minibatches of size B -- ClientUpdate(k, w): for E epochs, for each batch, w <- w - eta * grad. The client\'s raw data never leaves the device.',
  },
  {
    name: 'Upload',
    detail: 'Each client sends back only its updated weights w^k_{t+1} -- an update, not the training examples that produced it. This is the entire privacy mechanism: the server only ever sees model deltas.',
  },
  {
    name: 'Aggregate',
    detail: 'The server combines every client\'s update, weighted by how much local data it had: w_{t+1} = sum_k (n_k / m_t) * w^k_{t+1} -- a client with more examples gets proportionally more influence on the next round\'s global model.',
  },
];

/** One round of FederatedAveraging (McMahan et al., 2017, Algorithm 1),
 * walked as 4 stages in a loop back to Distribute -- the same
 * click-a-stage pattern as the other evolution/anatomy diagrams on this
 * site, applied to the actual client<->server cycle instead of a
 * historical progression. */
export default function FederatedRoundDiagram() {
  const t = useVizTokens();
  const { value: selected, pick } = useAutoCycle(STAGES.length, 3200, 0);
  const color = getConceptColor(t, 'attention');
  const width = 340;
  const height = 340;
  const cx = width / 2;
  const cy = height / 2;
  const clients = [0, 1, 2, 3, 4].map((i) => {
    const angle = (i / 5) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + 120 * Math.cos(angle), y: cy + 120 * Math.sin(angle) };
  });

  const activeColor = (STAGES[selected].name === 'Distribute' || STAGES[selected].name === 'Aggregate') ? t.accentPrimary : t.accentSecondary;

  return (
    <VisualizationContainer footer={STAGES[selected].detail}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        {STAGES.map((s, i) => (
          <button
            key={s.name}
            type="button"
            onClick={() => pick(i)}
            aria-pressed={selected === i}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: `1.5px solid ${selected === i ? color : t.border}`,
              background: selected === i ? `${color}20` : 'transparent',
              color: selected === i ? color : t.textSecondary,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
          >
            {i + 1}. {s.name}
          </button>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="fed-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={activeColor} />
          </marker>
        </defs>
        {clients.map((c, i) => {
          const outbound = STAGES[selected].name === 'Distribute';
          const inbound = STAGES[selected].name === 'Upload' || STAGES[selected].name === 'Aggregate';
          const x1 = outbound ? cx : c.x;
          const y1 = outbound ? cy : c.y;
          const x2 = outbound ? c.x : cx;
          const y2 = outbound ? c.y : cy;
          const scale = 22 / Math.hypot(x2 - x1, y2 - y1);
          return (
            <g key={i}>
              <line
                x1={x1 + (x2 - x1) * 0.16}
                y1={y1 + (y2 - y1) * 0.16}
                x2={x2 - (x2 - x1) * scale}
                y2={y2 - (y2 - y1) * scale}
                stroke={outbound || inbound ? activeColor : t.textMuted}
                strokeWidth={outbound || inbound ? 2 : 1}
                opacity={outbound || inbound ? 1 : 0.35}
                markerEnd={outbound || inbound ? 'url(#fed-arrow)' : undefined}
              />
              {outbound && (
                <FlowDots d={line(cx, cy, c.x, c.y)} color={activeColor} dur={1.6} count={2} r={2.5} />
              )}
              {STAGES[selected].name === 'Upload' && (
                <FlowDots d={line(c.x, c.y, cx, cy)} color={activeColor} dur={1.6} count={2} r={2.5} />
              )}
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={26} fill={`${t.accentPrimary}25`} stroke={t.accentPrimary} strokeWidth={2} />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fontWeight={700} fill={t.accentPrimary}>Server</text>
        {STAGES[selected].name === 'Aggregate' && (
          <Pulse cx={cx} cy={cy} r={34} color={t.accentPrimary} dur={1.8} />
        )}

        {clients.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={20} fill={`${t.accentSecondary}20`} stroke={t.accentSecondary} strokeWidth={1.5} />
            <text x={c.x} y={c.y + 3} textAnchor="middle" fontSize={8} fontWeight={700} fill={t.accentSecondary}>
              n_{i + 1}
            </text>
            {STAGES[selected].name === 'Local Train' && (
              <Pulse cx={c.x} cy={c.y} r={26} color={t.accentSecondary} dur={1.6} />
            )}
          </g>
        ))}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Only weights cross the wire in either direction -- client data (n_1..n_5, weighted by size in Aggregate) never does.
      </div>
    </VisualizationContainer>
  );
}
