import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const STAGES = [
  { key: 'arch', label: 'Architecture', page: 'Foundation Model Internals', desc: 'tokenization, attention, MoE, sampling -- the machinery that makes the model run at all' },
  { key: 'pretrain', label: 'Pretrain', page: 'Training Pipeline', desc: 'self-supervised next-token prediction on massive text -- broad knowledge, not yet helpful' },
  { key: 'posttrain', label: 'Post-train', page: 'Training Pipeline', desc: 'SFT + RLHF/DPO/GRPO -- turns a raw predictor into a helpful, aligned assistant' },
  { key: 'extend', label: 'Extend', page: 'Prompt Eng. / RAG', desc: 'prompting and retrieval, at inference time, with weights frozen' },
  { key: 'serve', label: 'Serve', page: 'Evaluation & Serving', desc: 'batching, speculative decoding, Paged Attention -- fast and affordable at scale' },
];

/** The whole section as one pipeline -- click a stage to see which page
 * owns it and what job it actually does, rather than just naming five
 * link titles. */
export default function GenAiPipelineOverviewDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(STAGES.length, 2600);
  const active = cycle.value;
  const setActive = cycle.pick;
  const width = 600;
  const height = 100;
  const stageW = (width - 20) / STAGES.length;

  return (
    <VisualizationContainer footer={`${STAGES[active].label} (${STAGES[active].page}): ${STAGES[active].desc}`}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="genai-pipe-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STAGES.map((s, i) => {
          const x = 10 + i * stageW + stageW / 2;
          const isActive = active === i;
          return (
            <g key={s.key}>
              {i > 0 && <line x1={10 + (i - 1) * stageW + stageW / 2 + 50} y1={40} x2={x - 50} y2={40} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#genai-pipe-arrow)" />}
              <g onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} style={{ cursor: 'pointer' }}>
                <rect x={x - 50} y={20} width={100} height={40} rx={8} fill={isActive ? `${t.accentPrimary}30` : t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={isActive ? 2.5 : 1.5} />
                <text x={x} y={44} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.accentPrimary}>{s.label}</text>
              </g>
              <text x={x} y={78} textAnchor="middle" fontSize={8} fill={t.textMuted}>{s.page}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Click a stage. Everything from "extend" onward runs with weights already frozen.
      </div>
    </VisualizationContainer>
  );
}
