import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const CATEGORIES = [
  {
    id: 'inference', label: 'Inference engine', options: [
      { key: 'vllm', label: 'vLLM', when: 'Safest, best-supported general-purpose choice.' },
      { key: 'sglang', label: 'SGLang', when: 'Heavy agent workloads with shared prompt prefixes, or need structured/constrained generation.' },
      { key: 'trtllm', label: 'TensorRT-LLM', when: 'Absolute fastest on NVIDIA hardware, can afford a heavier compile/deploy workflow.' },
      { key: 'triton', label: 'Triton', when: 'Serving LLMs AND classical/vision models on one unified serving layer.' },
      { key: 'llamacpp', label: 'llama.cpp', when: 'CPU-only, consumer hardware, or edge/local deployment.' },
    ],
  },
  {
    id: 'ragft', label: 'RAG vs. fine-tuning', options: [
      { key: 'rag', label: 'RAG', when: 'Need current or proprietary facts -- auditable, and fine-tuning is a poor tool for reliable fact injection.' },
      { key: 'ft', label: 'Fine-tuning', when: 'Need a specific format/tone/behavior pattern followed reliably.' },
      { key: 'both', label: 'Both', when: 'Very common in practice: fine-tune for behavior/format, RAG for facts -- they combine cleanly.' },
    ],
  },
  {
    id: 'peft', label: 'LoRA vs. QLoRA vs. full FT', options: [
      { key: 'full', label: 'Full fine-tuning', when: 'Task requires substantial behavior change beyond a low-rank update, and cost is not the binding constraint.' },
      { key: 'lora', label: 'LoRA', when: 'The default for most practical fine-tuning -- far cheaper, nearly as effective.' },
      { key: 'qlora', label: 'QLoRA', when: 'GPU memory (not compute) is the binding constraint, e.g. one consumer GPU.' },
    ],
  },
  {
    id: 'db', label: 'Database type', options: [
      { key: 'sql', label: 'SQL', when: 'Structured data, exact queries, transactions, strong consistency.' },
      { key: 'vector', label: 'Vector', when: '"Find things similar in meaning" -- the backbone of RAG retrieval.' },
      { key: 'graph', label: 'Graph', when: 'Relationships ARE the query -- multi-hop traversals, GraphRAG, fraud rings.' },
    ],
  },
  {
    id: 'dist', label: 'DDP vs. FSDP/ZeRO', options: [
      { key: 'ddp', label: 'DDP', when: 'Model fits on a single GPU\'s memory -- simplest, full replication.' },
      { key: 'fsdp', label: 'FSDP / ZeRO', when: 'Model (or its gradients/optimizer state) no longer fits on one GPU -- shard instead of replicate.' },
    ],
  },
  {
    id: 'framework', label: 'PyTorch vs. JAX', options: [
      { key: 'pytorch', label: 'PyTorch', when: 'Default choice -- eager-mode debugging, the largest ecosystem, what this site\'s MLOps coverage assumes.' },
      { key: 'jax', label: 'JAX', when: 'A research lab already standardized on it, or TPU-scale training specifically.' },
    ],
  },
];

export default function TechComparisonDiagram() {
  const t = useVizTokens();
  const { value: catIdx, stop } = useAutoCycle(CATEGORIES.length, 3500, 1);
  const [userCatId, setUserCatId] = useState<string | null>(null);
  const [userOptKey, setUserOptKey] = useState<string | null>(null);

  const catId = userCatId ?? CATEGORIES[catIdx].id;
  const category = CATEGORIES.find((c) => c.id === catId)!;
  const optKey = userOptKey ?? category.options[0].key;
  const option = category.options.find((o) => o.key === optKey) ?? category.options[0];

  return (
    <VisualizationContainer footer={option.when}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" onClick={() => { stop(); setUserCatId(c.id); setUserOptKey(c.options[0].key); }} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${catId === c.id ? t.accentPrimary : t.border}`,
            background: catId === c.id ? t.accentPrimary : 'transparent',
            color: catId === c.id ? t.background : t.textPrimary,
            transition: 'all 0.2s ease',
          }}>{c.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {category.options.map((o) => (
          <div key={o.key} onClick={() => { stop(); setUserOptKey(o.key); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); setUserOptKey(o.key); } }} style={{
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '0.55rem 0.8rem', borderRadius: 8,
            background: optKey === o.key ? `${t.accentPrimary}18` : t.surfaceAlt,
            border: `1.5px solid ${optKey === o.key ? t.accentPrimary : t.border}`,
            transition: 'background 0.2s ease, border-color 0.2s ease',
          }}>
            <div style={{ width: 130, fontSize: 13, fontWeight: 700, color: optKey === o.key ? t.accentPrimary : t.textPrimary }}>{o.label}</div>
            <div style={{ flex: 1, fontSize: 12, color: t.textSecondary }}>{o.when}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        "When would you use X instead of Y" -- click a category, then an option, to rehearse the tradeoff out loud.
      </div>
    </VisualizationContainer>
  );
}
