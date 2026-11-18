import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** Same preference data in, two structurally different paths: RLHF trains
 * a separate reward model then runs full RL against it; DPO skips both,
 * optimizing a supervised-style loss directly on (chosen, rejected) pairs.
 * Toggle to see exactly which boxes disappear. */
export default function DpoVsRlhfDiagram() {
  const t = useVizTokens();
  const methods = ['rlhf', 'dpo'] as const;
  const cycle = useAutoCycle(methods.length, 3400, 1);
  const method = methods[cycle.value];
  const setMethod = (next: (typeof methods)[number]) => cycle.pick(methods.indexOf(next));
  const rlhfColor = t.accentDanger;
  const dpoColor = getConceptColor(t, 'attention');
  const color = method === 'rlhf' ? rlhfColor : dpoColor;

  const width = 520;
  const height = 130;

  return (
    <VisualizationContainer
      footer={
        method === 'rlhf'
          ? 'RLHF: preference pairs train a separate reward model, then a full RL loop (PPO) optimizes the LLM against it, with a KL penalty holding it near the SFT model.'
          : 'DPO: the same preference pairs feed a single supervised-style loss directly -- no reward model, no RL loop. Simpler and more stable to tune, at some loss of RL\'s flexibility.'
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {(['rlhf', 'dpo'] as const).map((m) => (
          <div key={m} onClick={() => setMethod(m)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMethod(m); } }} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 11, cursor: 'pointer', background: method === m ? t.accentPrimary : t.surfaceAlt, color: method === m ? t.background : t.textSecondary, fontWeight: method === m ? 700 : 400 }}>
            {m.toUpperCase()}
          </div>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="dvr-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={color} />
          </marker>
        </defs>
        <rect x={10} y={45} width={90} height={36} rx={6} fill={`${color}18`} stroke={color} strokeWidth={1.5} />
        <text x={55} y={67} textAnchor="middle" fontSize={9} fill={color}>preference pairs</text>
        <line x1={100} y1={63} x2={140} y2={63} stroke={color} strokeWidth={1.5} markerEnd="url(#dvr-arrow)" />

        {method === 'rlhf' ? (
          <>
            <rect x={140} y={45} width={100} height={36} rx={6} fill={`${color}18`} stroke={color} strokeWidth={1.5} />
            <text x={190} y={67} textAnchor="middle" fontSize={9} fill={color}>reward model</text>
            <line x1={240} y1={63} x2={280} y2={63} stroke={color} strokeWidth={1.5} markerEnd="url(#dvr-arrow)" />
            <rect x={280} y={45} width={100} height={36} rx={6} fill={`${color}18`} stroke={color} strokeWidth={1.5} />
            <text x={330} y={63} textAnchor="middle" fontSize={9} fill={color}>PPO (RL loop)</text>
            <text x={330} y={75} textAnchor="middle" fontSize={7} fill={color}>+ KL penalty</text>
            <line x1={380} y1={63} x2={420} y2={63} stroke={color} strokeWidth={1.5} markerEnd="url(#dvr-arrow)" />
            <rect x={420} y={45} width={90} height={36} rx={6} fill={`${color}30`} stroke={color} strokeWidth={2} />
            <text x={465} y={67} textAnchor="middle" fontSize={9} fill={color}>aligned LLM</text>
          </>
        ) : (
          <>
            <rect x={140} y={45} width={200} height={36} rx={6} fill={`${color}30`} stroke={color} strokeWidth={2} />
            <text x={240} y={60} textAnchor="middle" fontSize={9} fill={color}>direct supervised-style loss</text>
            <text x={240} y={72} textAnchor="middle" fontSize={7} fill={color}>on (chosen, rejected)</text>
            <line x1={340} y1={63} x2={380} y2={63} stroke={color} strokeWidth={1.5} markerEnd="url(#dvr-arrow)" />
            <rect x={380} y={45} width={90} height={36} rx={6} fill={`${color}30`} stroke={color} strokeWidth={2} />
            <text x={425} y={67} textAnchor="middle" fontSize={9} fill={color}>aligned LLM</text>
            <text x={425} y={100} textAnchor="middle" fontSize={8} fill={t.textMuted}>(no reward model, no RL loop)</text>
          </>
        )}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Same input, {method === 'rlhf' ? '4' : '2'} stages to the aligned model.
      </div>
    </VisualizationContainer>
  );
}
