import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const STAGES = [
  { key: 'base', label: 'Pretrained', fixes: '—', gives: 'Broad knowledge, grammar, style', missing: 'Not instructable -- just continues text plausibly' },
  { key: 'sft', label: '+ SFT', fixes: '"Continues text" → "follows instructions"', gives: 'Format of being a helpful assistant', missing: "No sense of *which* acceptable response is *better*" },
  { key: 'pref', label: '+ RLHF/DPO/GRPO', fixes: 'SFT\'s missing preference signal', gives: 'Learns from comparisons, not just examples', missing: 'Reward hacking risk -- must be actively guarded against' },
];

/** Each stage fixes the specific gap the previous one left -- click a
 * stage to see exactly what it gives the model and what's still missing
 * afterward, the same "what's fixed / what's still limited" pattern used
 * for the RNN->Transformer evolution on the sequence-models page. */
export default function AlignmentPipelineDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(STAGES.length, 2800, 2);
  const selected = cycle.value;
  const setSelected = cycle.pick;
  const width = 500;
  const height = 90;
  const nodeW = (width - 20) / STAGES.length;

  return (
    <VisualizationContainer footer={`Gives: ${STAGES[selected].gives}. ${selected > 0 ? `Still missing before this stage: ${STAGES[selected].missing}` : STAGES[selected].missing}`}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="align-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STAGES.map((s, i) => {
          const x = 10 + i * nodeW + nodeW / 2;
          const isSelected = selected === i;
          return (
            <g key={s.key}>
              {i > 0 && <line x1={10 + (i - 1) * nodeW + nodeW / 2 + 60} y1={40} x2={x - 60} y2={40} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#align-arrow)" />}
              <g onClick={() => setSelected(i)} onMouseEnter={() => setSelected(i)} style={{ cursor: 'pointer' }}>
                <rect x={x - 60} y={20} width={120} height={40} rx={8} fill={isSelected ? `${t.accentPrimary}30` : t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={isSelected ? 2.5 : 1.5} />
                <text x={x} y={44} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.accentPrimary}>{s.label}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Click a stage — each fixes what the one before it left unsolved.
      </div>
    </VisualizationContainer>
  );
}
