import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Dim = 'tensor' | 'pipeline' | 'data';
const DIMS: Dim[] = ['tensor', 'pipeline', 'data'];

/** Nested boxes -- tensor parallelism inside a node (fastest interconnect,
 * most latency-sensitive), pipeline parallelism across nodes, data
 * parallelism replicated across the whole pipeline+tensor group. Click a
 * dimension to see why it sits at that level. */
export default function ThreeDParallelismCompositionDiagram() {
  const t = useVizTokens();
  const { value: dimIdx, pick } = useAutoCycle(DIMS.length, 3000, 0);
  const active: Dim = DIMS[dimIdx];
  const tensorColor = getConceptColor(t, 'query');
  const pipelineColor = getConceptColor(t, 'attention');
  const dataColor = t.accentWarn;

  const desc: Record<Dim, string> = {
    tensor: 'Tensor parallelism: WITHIN a node, where GPU-to-GPU interconnect is fastest -- its per-layer communication is the most latency-sensitive of the three.',
    pipeline: 'Pipeline parallelism: ACROSS nodes -- coarser-grained, more tolerant of slower inter-node links than tensor parallelism\'s tight per-layer chatter.',
    data: 'Data parallelism: replicated across the resulting pipeline+tensor-parallel GROUPS -- uses however many GPUs remain for throughput scaling.',
  };

  return (
    <VisualizationContainer footer={desc[active]}>
      <div onClick={() => pick(2)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(2); } }} onMouseEnter={() => pick(2)} style={{ cursor: 'pointer', padding: 14, borderRadius: 12, background: active === 'data' ? `${dataColor}15` : 'transparent', border: `2px solid ${active === 'data' ? dataColor : t.border}`, transition: 'all 250ms ease' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: active === 'data' ? dataColor : t.textMuted, marginBottom: 8 }}>{active === 'data' ? '▶ DATA PARALLEL (replicated groups)' : 'DATA PARALLEL (replicated groups)'}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[0, 1].map((g) => (
            <div key={g} onClick={(e) => { e.stopPropagation(); pick(1); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick(1); } }} onMouseEnter={(e) => { e.stopPropagation(); pick(1); }} style={{ cursor: 'pointer', flex: 1, padding: 10, borderRadius: 10, background: active === 'pipeline' ? `${pipelineColor}18` : t.surfaceAlt, border: `2px solid ${active === 'pipeline' ? pipelineColor : t.border}`, transition: 'all 250ms ease' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: active === 'pipeline' ? pipelineColor : t.textMuted, marginBottom: 6 }}>{active === 'pipeline' ? '▶ PIPELINE (across nodes)' : 'PIPELINE (across nodes)'}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1].map((node) => (
                  <div key={node} onClick={(e) => { e.stopPropagation(); pick(0); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick(0); } }} onMouseEnter={(e) => { e.stopPropagation(); pick(0); }} style={{ cursor: 'pointer', flex: 1, padding: 8, borderRadius: 8, background: active === 'tensor' ? `${tensorColor}25` : t.surface, border: `2px solid ${active === 'tensor' ? tensorColor : t.border}`, transition: 'all 250ms ease' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: active === 'tensor' ? tensorColor : t.textMuted, marginBottom: 4 }}>{active === 'tensor' ? '▶ TENSOR' : 'TENSOR'}</div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[0, 1, 2, 3].map((gpu) => (
                        <div key={gpu} style={{ flex: 1, height: 16, borderRadius: 3, background: active === 'tensor' ? tensorColor : t.border, opacity: active === 'tensor' ? 0.9 : 0.4, transition: 'all 200ms ease' }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Click any level -- fastest-communication dimension goes innermost (tensor), slowest-tolerant goes outermost (data).
      </div>
    </VisualizationContainer>
  );
}
