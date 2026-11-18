import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Variant = 'mha' | 'gqa' | 'mqa' | 'mla';
const N_HEADS = 8;
const KV_GROUPS: Record<Variant, number> = { mha: 8, gqa: 2, mqa: 1, mla: 1 };
const DESC: Record<Variant, string> = {
  mha: 'Every head gets its own full K/V projection -- highest quality, largest KV cache (8 K/V pairs stored per token).',
  gqa: 'Heads split into groups; each group shares one K/V projection -- the middle ground most current production LLMs use (here: 4 heads per group, 2 K/V pairs stored).',
  mqa: 'ALL heads share a single K/V projection, only Q stays per-head -- smallest possible KV cache (1 K/V pair stored), some quality cost.',
  mla: "Compresses K/V into a smaller shared LATENT vector, decompressed per head at attention time -- recovers MHA-like quality at MQA-like cache cost (conceptually 1 compressed representation stored, not drawn as a group split like GQA/MQA).",
};

/** Same 8 query heads throughout -- only how many independent K/V
 * projections back them changes. Select a variant to see the actual
 * grouping and the resulting KV-cache-per-token count. */
export default function AttentionVariantsKvCacheDiagram() {
  const t = useVizTokens();
  const variants: Variant[] = ['mha', 'gqa', 'mqa', 'mla'];
  const cycle = useAutoCycle(variants.length, 3200, 1);
  const variant = variants[cycle.value];
  const setVariant = (next: Variant) => cycle.pick(variants.indexOf(next));
  const qColor = getConceptColor(t, 'query');
  const kvColor = getConceptColor(t, 'key');
  const groups = KV_GROUPS[variant];
  const headsPerGroup = N_HEADS / groups;

  const width = 480;
  const headSpacing = (width - 60) / N_HEADS;

  return (
    <VisualizationContainer footer={DESC[variant]}>
      <PillSelect<Variant> label="Attention variant" value={variant} onChange={setVariant} options={[{ value: 'mha', label: 'MHA' }, { value: 'gqa', label: 'GQA' }, { value: 'mqa', label: 'MQA' }, { value: 'mla', label: 'MLA' }]} />
      <svg width="100%" viewBox={`0 0 ${width} 130`} style={{ display: 'block', marginTop: 10 }}>
        {Array.from({ length: N_HEADS }, (_, i) => {
          const x = 30 + i * headSpacing + headSpacing / 2;
          return (
            <g key={i}>
              <circle cx={x} cy={20} r={12} fill={`${qColor}18`} stroke={qColor} strokeWidth={1.5} />
              <text x={x} y={24} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={qColor}>Q{i}</text>
            </g>
          );
        })}
        {variant !== 'mla' ? (
          Array.from({ length: groups }, (_, g) => {
            const startHead = g * headsPerGroup;
            const cx = 30 + (startHead + headsPerGroup / 2) * headSpacing;
            return (
              <g key={g}>
                {Array.from({ length: headsPerGroup }, (_, h) => {
                  const hx = 30 + (startHead + h) * headSpacing + headSpacing / 2;
                  return <line key={h} x1={hx} y1={32} x2={cx} y2={70} stroke={kvColor} strokeWidth={1.25} opacity={0.6} />;
                })}
                <rect x={cx - 20} y={70} width={40} height={28} rx={6} fill={`${kvColor}30`} stroke={kvColor} strokeWidth={1.5} />
                <text x={cx} y={88} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={kvColor}>KV{g}</text>
              </g>
            );
          })
        ) : (
          <>
            {Array.from({ length: N_HEADS }, (_, i) => {
              const x = 30 + i * headSpacing + headSpacing / 2;
              return <line key={i} x1={x} y1={32} x2={width / 2} y2={70} stroke={kvColor} strokeWidth={1.25} opacity={0.6} />;
            })}
            <rect x={width / 2 - 50} y={70} width={100} height={28} rx={6} fill={`${kvColor}30`} stroke={kvColor} strokeWidth={1.5} />
            <text x={width / 2} y={88} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={kvColor}>compressed latent</text>
          </>
        )}
        <text x={30} y={112} fontSize={9} fontFamily="monospace" fill={kvColor}>KV pairs stored per token: {variant === 'mla' ? '1 (latent)' : groups}</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        {N_HEADS} query heads (top) throughout — only the K/V side (bottom) changes between variants.
      </div>
    </VisualizationContainer>
  );
}
