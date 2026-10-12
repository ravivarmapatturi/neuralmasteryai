import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type Phase = 'prefill' | 'decode';

/** The two phases every LLM request goes through, on the axis that
 * actually determines their bottleneck -- prefill parallelizes across
 * every prompt token at once (compute-bound), decode can't parallelize
 * across steps at all (memory-bandwidth-bound). Click either. */
export default function PrefillVsDecodeDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState<Phase>('decode');
  const prefillColor = getConceptColor(t, 'query');
  const decodeColor = getConceptColor(t, 'attention');
  const width = 560;
  const height = 150;

  return (
    <VisualizationContainer
      footer={
        active === 'prefill'
          ? 'Prefill: all prompt tokens are known upfront -- one large, parallelizable matrix multiply. Compute-bound: speed scales with GPU FLOPs.'
          : "Decode: each new token depends on the previous one -- can't be parallelized across steps. Every step re-reads the full model weights + growing KV cache from GPU memory -- memory-bandwidth-bound, not compute-bound."
      }
    >
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <g onClick={() => setActive('prefill')} onMouseEnter={() => setActive('prefill')} style={{ cursor: 'pointer' }} opacity={active === 'prefill' ? 1 : 0.35}>
          <text x={20} y={20} fontSize={11} fontWeight={700} fontFamily={HAND_FONT} fill={prefillColor}>Prefill</text>
          {['the', 'cat', 'sat', 'down'].map((tok, i) => (
            <g key={i}>
              <rect x={20 + i * 60} y={30} width={50} height={28} rx={5} fill={`${prefillColor}25`} stroke="none" />
              <SketchRect x={20 + i * 60} y={30} width={50} height={28} color={prefillColor} strokeWidth={active === 'prefill' ? 2 : 1.25} id={`pvd-prefill-${i}`} />
              <text x={45 + i * 60} y={48} textAnchor="middle" fontSize={9} fontFamily={HAND_FONT} fill={prefillColor}>{tok}</text>
            </g>
          ))}
          <text x={20} y={78} fontSize={8.5} fontFamily={HAND_FONT} fill={t.textMuted}>↑ processed together, one matmul</text>
        </g>

        <g onClick={() => setActive('decode')} onMouseEnter={() => setActive('decode')} style={{ cursor: 'pointer' }} opacity={active === 'decode' ? 1 : 0.35}>
          <text x={20} y={105} fontSize={11} fontWeight={700} fontFamily={HAND_FONT} fill={decodeColor}>Decode</text>
          {['fast', '?'].map((tok, i) => (
            <g key={i}>
              <rect x={20 + i * 70} y={115} width={55} height={28} rx={5} fill={i === 1 ? t.surfaceAlt : `${decodeColor}25`} stroke="none" />
              <SketchRect x={20 + i * 70} y={115} width={55} height={28} color={decodeColor} strokeWidth={active === 'decode' ? 2 : 1.25} id={`pvd-decode-${i}`} />
              <text x={47 + i * 70} y={133} textAnchor="middle" fontSize={9} fontFamily={HAND_FONT} fill={decodeColor}>{tok}</text>
              {i === 0 && <text x={110} y={133} fontSize={12} fontFamily={HAND_FONT} fill={t.textMuted}>→</text>}
            </g>
          ))}
        </g>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Same GPU, opposite bottlenecks -- this split is why LLM inference optimization is really two different problems.
      </div>
    </VisualizationContainer>
  );
}
