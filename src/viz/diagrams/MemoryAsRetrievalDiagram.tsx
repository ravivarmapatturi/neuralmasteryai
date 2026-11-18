import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, FlowDots, Pulse, line, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** Long-term memory isn't a special mechanism -- once information lives
 * outside the context window, getting it back IS a retrieval problem:
 * embed it and write it to a store now, embed a query and search that
 * store later. Click either half of the round trip. */
export default function MemoryAsRetrievalDiagram() {
  const t = useVizTokens();
  const cyc = useAutoCycle(2, 3500);
  const active = cyc.value === 0 ? 'write' : 'query';
  const setActive = (k: 'write' | 'query') => cyc.pick(k === 'write' ? 0 : 1);
  const writeColor = getConceptColor(t, 'value');
  const queryColor = getConceptColor(t, 'query');
  const color = active === 'write' ? writeColor : queryColor;

  const width = 520;
  const height = 140;

  return (
    <VisualizationContainer footer={active === 'write' ? "Session 1: something worth remembering gets embedded and written into the store — this is the exact same embed step RAG uses for indexing documents." : "Session 2 (later, possibly a new context entirely): the agent embeds a query and searches the SAME store — nearest-neighbor retrieval, not a special 'memory' operation."}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
        {(['write', 'query'] as const).map((k) => (
          <div key={k} onClick={() => setActive(k)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(k); } }} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 11, cursor: 'pointer', background: active === k ? color : t.surfaceAlt, color: active === k ? t.background : t.textSecondary, fontWeight: active === k ? 700 : 400 }}>
            {k === 'write' ? 'Write (session 1)' : 'Query (session 2+)'}
          </div>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="mar-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={color} />
          </marker>
        </defs>
        {active === 'write' ? (
          <>
            <rect x={20} y={50} width={130} height={36} rx={7} fill={t.surfaceAlt} stroke={t.textMuted} strokeWidth={1.5} />
            <text x={85} y={72} textAnchor="middle" fontSize={9} fill={t.textSecondary}>"user prefers metric units"</text>
            <line x1={150} y1={68} x2={200} y2={68} stroke={color} strokeWidth={2} markerEnd="url(#mar-arrow)" />
            <FlowDots d={line(150, 68, 200, 68)} color={color} dur={2.4} count={1} />
            <rect x={205} y={50} width={80} height={36} rx={7} fill={`${color}18`} stroke={color} strokeWidth={1.5} />
            <text x={245} y={72} textAnchor="middle" fontSize={9} fill={color}>embed</text>
            <line x1={285} y1={68} x2={335} y2={68} stroke={color} strokeWidth={2} markerEnd="url(#mar-arrow)" />
            <FlowDots d={line(285, 68, 335, 68)} color={color} dur={2.4} count={1} delay={1.0} />
            <circle cx={385} cy={68} r={36} fill={t.surface} stroke={color} strokeWidth={1.5} strokeDasharray="3 2" />
            <Pulse cx={385} cy={68} r={36} color={color} dur={2.4} delay={1.8} />
            <text x={385} y={72} textAnchor="middle" fontSize={8} fill={t.textSecondary}>vector store</text>
          </>
        ) : (
          <>
            <rect x={20} y={50} width={130} height={36} rx={7} fill={t.surfaceAlt} stroke={t.textMuted} strokeWidth={1.5} />
            <text x={85} y={72} textAnchor="middle" fontSize={9} fill={t.textSecondary}>"convert this to my units"</text>
            <line x1={150} y1={68} x2={200} y2={68} stroke={color} strokeWidth={2} markerEnd="url(#mar-arrow)" />
            <FlowDots d={line(150, 68, 200, 68)} color={color} dur={2.4} count={1} />
            <rect x={205} y={50} width={80} height={36} rx={7} fill={`${color}18`} stroke={color} strokeWidth={1.5} />
            <text x={245} y={72} textAnchor="middle" fontSize={9} fill={color}>embed</text>
            <line x1={285} y1={68} x2={335} y2={68} stroke={color} strokeWidth={2} markerEnd="url(#mar-arrow)" />
            <FlowDots d={line(285, 68, 335, 68)} color={color} dur={2.4} count={1} delay={1.0} />
            <circle cx={385} cy={68} r={36} fill={t.surface} stroke={color} strokeWidth={1.5} />
            <Pulse cx={385} cy={68} r={36} color={color} dur={2.4} delay={1.8} />
            <text x={385} y={64} textAnchor="middle" fontSize={8} fill={t.textSecondary}>nearest</text>
            <text x={385} y={75} textAnchor="middle" fontSize={8} fill={t.textSecondary}>neighbor</text>
          </>
        )}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Same store, same embed step — long-term memory is retrieval with extra steps.
      </div>
    </VisualizationContainer>
  );
}
