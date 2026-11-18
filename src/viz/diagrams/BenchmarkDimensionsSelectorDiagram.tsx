import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type SystemType = 'served' | 'retrieval';
const TYPES: SystemType[] = ['served', 'retrieval'];

const DIMENSIONS: Record<SystemType, { label: string; covered: string }[]> = {
  served: [
    { label: 'Latency (TTFT, TPOT, end-to-end, P50/P95/P99)', covered: 'LLM Inference Optimization' },
    { label: 'Throughput (tokens/sec, requests/sec)', covered: 'LLM Inference Optimization' },
    { label: 'Memory (weights + KV cache)', covered: 'LLM Inference Optimization — KV Cache' },
    { label: 'Cost (per 1M tokens)', covered: 'AI Cost Engineering' },
  ],
  retrieval: [
    { label: 'Recall@k, Precision@k', covered: 'Learning-to-Rank' },
    { label: 'MRR, NDCG', covered: 'Learning-to-Rank' },
    { label: 'Retrieval latency', covered: 'RAG — Evaluating RAG' },
    { label: 'Cost per query', covered: 'AI Cost Engineering' },
  ],
};

/** What to actually measure changes with the kind of system -- toggle
 * between served-model and retrieval benchmarking to see the dimension
 * set actually swap. */
export default function BenchmarkDimensionsSelectorDiagram() {
  const t = useVizTokens();
  const { value: typeIdx, pick, stop } = useAutoCycle(TYPES.length, 3500, 0);
  const type = TYPES[typeIdx];
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="Durable regardless of which specific models are being compared -- the dimension set is what stays true.">
      <PillSelect<SystemType>
        label="System type"
        value={type}
        onChange={(val) => {
          const next = typeof val === 'function' ? val(type) : val;
          const idx = TYPES.indexOf(next);
          if (idx >= 0) pick(idx);
          stop();
        }}
        options={[{ value: 'served', label: 'Any served model' }, { value: 'retrieval', label: 'Retrieval (embedding/reranker)' }]}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
        {DIMENSIONS[type].map((d) => (
          <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.7rem', borderRadius: 7, background: `${color}12`, transition: 'all 0.3s ease' }}>
            <span style={{ fontSize: 11, color: t.textPrimary }}>{d.label}</span>
            <span style={{ fontSize: 9.5, color: t.textMuted, fontStyle: 'italic' }}>{d.covered}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        For general model quality: see AI Evaluation in full (LLM-as-judge, RAG eval, agent eval, human/adversarial eval).
      </div>
    </VisualizationContainer>
  );
}
