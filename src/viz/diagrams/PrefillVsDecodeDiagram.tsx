import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { PillSelect, VisualizationContainer, VisualizationHeader } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Phase = 'prefill' | 'decode';

/** The two phases every LLM request goes through, on the axis that
 * actually determines their bottleneck -- prefill parallelizes across
 * every prompt token at once (compute-bound), decode can't parallelize
 * across steps at all (memory-bandwidth-bound). Click either. */
export default function PrefillVsDecodeDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState<Phase>('decode');
  const phaseColor = getConceptColor(t, active === 'prefill' ? 'query' : 'attention');
  const tokens = active === 'prefill' ? ['the', 'cat', 'sat', 'down'] : ['fast', 'next'];

  return (
    <VisualizationContainer title="Prefill and decode phases"
      footer={
        active === 'prefill'
          ? 'Prefill: all prompt tokens are known upfront -- one large, parallelizable matrix multiply. Compute-bound: speed scales with GPU FLOPs.'
          : "Decode: each new token depends on the previous one -- can't be parallelized across steps. Every step re-reads the full model weights + growing KV cache from GPU memory -- memory-bandwidth-bound, not compute-bound."
      }
    >
      <VisualizationHeader eyebrow="Interactive model" title="Two phases, two bottlenecks" description="Choose a phase to see which tokens can run together." />
      <PillSelect label="Request phase" value={active} onChange={setActive} options={[{ value: 'prefill', label: 'Prefill' }, { value: 'decode', label: 'Decode' }]} />
      <div role="img" aria-label={`${active} phase token flow: ${tokens.join(', ')}. ${active === 'prefill' ? 'All prompt tokens are processed together.' : 'Each next token waits for the previous token.'}`} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 8px', color: t.textPrimary }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          {tokens.map((token, i) => <span key={`${active}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 56, minHeight: 42, padding: '4px 10px', border: `2px solid ${phaseColor}`, borderRadius: 8, background: `${phaseColor}18`, fontSize: 16 }}>{token}</span>)}
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.5 }}>{active === 'prefill' ? 'Prompt tokens are processed together in parallel.' : 'The next token waits for the previous token before generation continues.'}</div>
      </div>
      <div style={{ textAlign: 'center', fontSize: Math.max(DIAGRAM_TYPE.caption.size, 14), color: t.textMuted, marginTop: 4 }}>
        Same GPU, opposite bottlenecks: prefill is compute-bound; decode is memory-bandwidth-bound.
      </div>
    </VisualizationContainer>
  );
}
