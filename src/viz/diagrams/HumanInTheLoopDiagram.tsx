import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Pattern = 'approval' | 'escalation' | 'correction';

const PATTERNS: Pattern[] = ['approval', 'escalation', 'correction'];

const STAGES: Record<Pattern, { key: string; label: string; isHuman: boolean }[]> = {
  approval: [
    { key: 'propose', label: 'Agent proposes action', isHuman: false },
    { key: 'human', label: 'Human approves / rejects', isHuman: true },
    { key: 'execute', label: 'Action executes (only if approved)', isHuman: false },
  ],
  escalation: [
    { key: 'work', label: 'Agent works the task', isHuman: false },
    { key: 'stuck', label: 'Agent detects it\'s stuck / uncertain', isHuman: false },
    { key: 'human', label: 'Hands off to a human', isHuman: true },
  ],
  correction: [
    { key: 'draft', label: 'Agent produces intermediate output', isHuman: false },
    { key: 'human', label: 'Human edits reasoning / output mid-task', isHuman: true },
    { key: 'continue', label: 'Agent continues from the correction', isHuman: false },
  ],
};

const DESC: Record<Pattern, string> = {
  approval: 'Standard for any action that\'s costly to reverse (send this email, execute this trade, delete this file) -- the agent pauses and waits, it does not proceed on its own.',
  escalation: 'Requires the agent to have an explicit "I don\'t know / can\'t do this confidently" path, not just always producing an answer regardless of confidence.',
  correction: 'A human can edit the agent\'s intermediate reasoning or output mid-task, not just approve/reject the final result -- common in coding agents (reviewing a diff before it applies) and research agents (correcting a bad search direction early).',
};

/** Three different points where a human can be inserted into an agent's
 * loop -- same three-stage shape, different point where control passes
 * to a person and why. */
export default function HumanInTheLoopDiagram() {
  const t = useVizTokens();
  const cyc = useAutoCycle(3, 3500);
  const pattern = PATTERNS[cyc.value];
  const setPattern = (p: Pattern) => cyc.pick(PATTERNS.indexOf(p));
  const agentColor = getConceptColor(t, 'attention');
  const humanColor = t.accentWarn;
  const stages = STAGES[pattern];

  return (
    <VisualizationContainer footer={DESC[pattern]}>
      <PillSelect<Pattern>
        label="HITL pattern"
        value={pattern}
        onChange={setPattern}
        options={[
          { value: 'approval', label: 'Approval gate' },
          { value: 'escalation', label: 'Escalation' },
          { value: 'correction', label: 'Active correction' },
        ]}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
        {stages.map((s, i) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ padding: '0.55rem 0.7rem', borderRadius: 7, minWidth: 90, textAlign: 'center', background: s.isHuman ? `${humanColor}18` : `${agentColor}18`, border: `1.5px solid ${s.isHuman ? humanColor : agentColor}` }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: s.isHuman ? humanColor : agentColor, marginBottom: 2 }}>{s.isHuman ? 'HUMAN' : 'AGENT'}</div>
              <div style={{ fontSize: 9, color: t.textPrimary }}>{s.label}</div>
            </div>
            {i < stages.length - 1 && <span style={{ color: t.textMuted, fontSize: 14 }}>→</span>}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        All three patterns insert a person somewhere in the loop -- the difference is where, and whether the agent asks first or only after it's already stuck.
      </div>
    </VisualizationContainer>
  );
}
