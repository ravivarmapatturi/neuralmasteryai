import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, FlowDots, Pulse, line, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** Two structurally different stores: short-term is whatever fits in the
 * live context window (fast, but bounded and gone once the session ends);
 * long-term is an external database/vector store the agent explicitly
 * writes to and queries, which is what makes it persist across sessions
 * and effectively turns memory into a retrieval problem. */
export default function ShortTermVsLongTermMemoryDiagram() {
  const t = useVizTokens();
  const cyc = useAutoCycle(2, 3500);
  const hovered = cyc.value === 0 ? 'short' : 'long';
  const setHovered = (s: 'short' | 'long' | null) => {
    if (s) cyc.pick(s === 'short' ? 0 : 1);
  };
  const shortColor = getConceptColor(t, 'query');
  const longColor = getConceptColor(t, 'value');
  const width = 520;
  const height = 170;

  return (
    <VisualizationContainer footer={
      hovered === 'short' ? 'Bounded by context window size, and gone once the session ends — fast because it\'s just already-there tokens, no lookup required.'
      : hovered === 'long' ? 'Persists across sessions by living outside the context window entirely — accessed via explicit write/query calls, which is exactly the retrieval problem RAG solves.'
      : 'Hover a store.'
    }>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <g onMouseEnter={() => setHovered('short')} onMouseLeave={() => {}} style={{ cursor: 'pointer' }}>
          <rect x={20} y={20} width={210} height={120} rx={10} fill={hovered === 'short' ? `${shortColor}18` : t.surfaceAlt} stroke={shortColor} strokeWidth={hovered === 'short' ? 2.5 : 1.5} />
          <text x={125} y={42} textAnchor="middle" fontSize={11} fontWeight={700} fill={shortColor}>Short-term</text>
          {['conversation so far', 'retrieved documents', 'tool results'].map((label, i) => (
            <rect key={label} x={35} y={54 + i * 26} width={180} height={20} rx={4} fill={t.surface} stroke={shortColor} strokeWidth={1} opacity={0.7} />
          ))}
          {['conversation so far', 'retrieved documents', 'tool results'].map((label, i) => (
            <text key={label} x={125} y={68 + i * 26} textAnchor="middle" fontSize={8} fill={t.textSecondary}>{label}</text>
          ))}
          <FlowDots d={line(40, 64, 210, 64)} color={shortColor} dur={2.4} count={1} />
        </g>

        <g onMouseEnter={() => setHovered('long')} onMouseLeave={() => {}} style={{ cursor: 'pointer' }}>
          <rect x={290} y={20} width={210} height={120} rx={10} fill={hovered === 'long' ? `${longColor}18` : t.surfaceAlt} stroke={longColor} strokeWidth={hovered === 'long' ? 2.5 : 1.5} />
          <text x={395} y={42} textAnchor="middle" fontSize={11} fontWeight={700} fill={longColor}>Long-term</text>
          <circle cx={395} cy={90} r={35} fill={t.surface} stroke={longColor} strokeWidth={1.25} strokeDasharray="3 2" />
          <Pulse cx={395} cy={90} r={35} color={longColor} dur={2.4} />
          <text x={395} y={87} textAnchor="middle" fontSize={8} fill={t.textSecondary}>vector store</text>
          <text x={395} y={98} textAnchor="middle" fontSize={8} fill={t.textSecondary}>/ database</text>
          <text x={325} y={125} fontSize={8} fill={longColor}>write ↓</text>
          <FlowDots d={line(338, 55, 338, 120)} color={longColor} dur={2.2} count={1} />
          <text x={430} y={125} fontSize={8} fill={longColor}>↑ query</text>
          <FlowDots d={line(446, 120, 446, 55)} color={longColor} dur={2.2} count={1} delay={1.1} />
        </g>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Same agent, two structurally different memory stores with different lifetimes.
      </div>
    </VisualizationContainer>
  );
}
