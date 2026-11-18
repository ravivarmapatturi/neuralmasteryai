import { useAutoCycle, FlowDots } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const REQUESTS = [
  { text: 'You are a helpful assistant. | What is 2+2?', shared: 6 },
  { text: 'You are a helpful assistant. | Summarize this doc.', shared: 6 },
  { text: 'You are a helpful assistant. | Translate to French.', shared: 6 },
];

/** Three requests sharing one system prompt -- click "share prefix" to
 * see the KV cache for that shared span computed ONCE and reused, instead
 * of recomputed per request (the radix-tree idea, drawn as literal
 * shared vs. unique cache blocks). */
export default function PrefixCachingDiagram() {
  const t = useVizTokens();
  const { value: cycleIdx, pick } = useAutoCycle(2, 3500, 0);
  const shared = cycleIdx === 0;
  const sharedColor = getConceptColor(t, 'attention');
  const uniqueColors = [getConceptColor(t, 'query'), getConceptColor(t, 'key'), t.accentWarn];
  const width = 560;

  const totalComputedWithoutSharing = REQUESTS.reduce((sum) => sum + 6 + 4, 0);
  const totalComputedWithSharing = 6 + REQUESTS.length * 4;

  return (
    <VisualizationContainer footer={shared ? `Shared prefix computed ONCE (6 blocks) instead of ${REQUESTS.length}x -- total KV compute: ${totalComputedWithSharing} blocks instead of ${totalComputedWithoutSharing}.` : 'Without prefix caching, the identical system-prompt prefix is recomputed from scratch for every single request.'}>
      <button
        type="button"
        onClick={() => pick(shared ? 1 : 0)}
        style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${sharedColor}`, background: shared ? `${sharedColor}20` : 'transparent', color: sharedColor, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
      >
        {shared ? 'Prefix caching: ON' : 'Prefix caching: OFF'}
      </button>
      <svg width="100%" viewBox={`0 0 ${width} 130`} style={{ display: 'block' }}>
        {REQUESTS.map((_, ri) => {
          const y = 15 + ri * 35;
          return (
            <g key={ri}>
              {Array.from({ length: 6 }, (_, i) => (
                <rect key={`s${i}`} x={10 + i * 24} y={y} width={20} height={20} rx={3} fill={`${sharedColor}30`} stroke={sharedColor} strokeWidth={1.25} opacity={shared && ri > 0 ? 0.3 : 1} />
              ))}
              {shared && ri > 0 && <text x={130} y={y + 14} fontSize={8} fill={sharedColor}>(reused, not recomputed)</text>}
              {Array.from({ length: 4 }, (_, i) => (
                <rect key={`u${i}`} x={280 + i * 24} y={y} width={20} height={20} rx={3} fill={`${uniqueColors[ri]}30`} stroke={uniqueColors[ri]} strokeWidth={1.25} />
              ))}
            </g>
          );
        })}
        {shared && (
          <>
            <FlowDots d="M 80 35 L 80 50" count={2} color={sharedColor} dur={1.8} />
            <FlowDots d="M 80 70 L 80 85" count={2} color={sharedColor} dur={1.8} />
          </>
        )}
        <text x={60} y={125} textAnchor="middle" fontSize={8} fill={sharedColor}>shared prefix</text>
        <text x={330} y={125} textAnchor="middle" fontSize={8} fill={t.textMuted}>unique per-request</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        SGLang's RadixAttention generalizes this to a tree that finds the longest common prefix across ANY requests, not just exact matches.
      </div>
    </VisualizationContainer>
  );
}
