import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, FlowDots, line, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Model = 'gate' | 'checkpoint';

const DESC: Record<Model, string> = {
  gate: 'Permission-gated (Claude Code\'s default): the agent asks before a risky action runs. Read-only tools (file reads, search) don\'t ask; bash commands do, except an allowlisted set of read-only ones. An "auto" mode swaps the human gate for a classifier that reviews actions instead -- the gate stays, the approver changes.',
  checkpoint: 'Checkpoint-and-revert (Cursor\'s Agent mode): the action just runs -- a checkpoint is saved automatically first, and you can preview or restore to any earlier checkpoint if the result is wrong. The safety net is after the fact, not before it.',
};

/** Two real, different philosophies for the same problem (a coding agent
 * about to take an action that could be wrong): stop and ask first, or let
 * it run and make undo cheap and reliable. Neither is strictly safer --
 * gate-before costs a pause on every risky step; checkpoint-after assumes
 * every action really is cheaply reversible, which stops being true the
 * moment the action leaves your machine (a push, a deploy, an API call). */
export default function CodingAgentSafetyModelDiagram() {
  const t = useVizTokens();
  const MODELS: Model[] = ['gate', 'checkpoint'];
  const cyc = useAutoCycle(2, 3800);
  const model = MODELS[cyc.value];
  const setModel = (m: Model) => cyc.pick(MODELS.indexOf(m));
  const color = getConceptColor(t, 'attention');
  const danger = t.accentDanger;

  return (
    <VisualizationContainer footer={DESC[model]}>
      <PillSelect<Model>
        label="Safety model"
        value={model}
        onChange={(v) => setModel(v as Model)}
        options={[
          { value: 'gate', label: 'Permission-gated' },
          { value: 'checkpoint', label: 'Checkpoint + revert' },
        ]}
      />
      <svg width="100%" viewBox="0 0 420 130" style={{ marginTop: 8 }}>
        <defs>
          <marker id="csm-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {/* Agent decides -> action */}
        <rect x={10} y={50} width={90} height={30} rx={5} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1} />
        <text x={55} y={69} textAnchor="middle" fontSize={9.5} fill={t.textPrimary}>Agent decides</text>
        <line x1={100} y1={65} x2={150} y2={65} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#csm-arrow)" />
        <FlowDots d={line(100, 65, 150, 65)} color={color} dur={2.6} count={1} />

        {model === 'gate' ? (
          <>
            <path d="M 155 65 L 195 45 L 235 65 L 195 85 Z" fill={`${color}30`} stroke={color} strokeWidth={2} />
            <text x={195} y={68} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>Approve?</text>
            <line x1={235} y1={65} x2={280} y2={65} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#csm-arrow)" />
            <FlowDots d={line(235, 65, 280, 65)} color={color} dur={2.6} count={1} delay={1.3} />
            <text x={195} y={30} textAnchor="middle" fontSize={8} fill={t.textMuted}>pauses here, every time (unless allowlisted)</text>
          </>
        ) : (
          <>
            <rect x={155} y={50} width={80} height={30} rx={5} fill={`${color}30`} stroke={color} strokeWidth={2} />
            <text x={195} y={69} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>Checkpoint saved</text>
            <line x1={235} y1={65} x2={280} y2={65} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#csm-arrow)" />
            <FlowDots d={line(235, 65, 280, 65)} color={color} dur={2.6} count={1} delay={0.8} />
            <text x={195} y={30} textAnchor="middle" fontSize={8} fill={t.textMuted}>no pause -- saved, then runs</text>
          </>
        )}

        <rect x={285} y={50} width={90} height={30} rx={5} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1} />
        <text x={330} y={69} textAnchor="middle" fontSize={9.5} fill={t.textPrimary}>Action runs</text>

        {model === 'checkpoint' && (
          <>
            <path
              d="M 330 82 C 330 115, 195 115, 195 82"
              fill="none"
              stroke={danger}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              markerEnd="url(#csm-arrow)"
            />
            <FlowDots d="M 330 82 C 330 115, 195 115, 195 82" color={danger} dur={2.6} count={1} delay={1.6} />
            <text x={262} y={112} textAnchor="middle" fontSize={8} fill={danger} fontWeight={700}>restore if wrong</text>
          </>
        )}
      </svg>
    </VisualizationContainer>
  );
}
