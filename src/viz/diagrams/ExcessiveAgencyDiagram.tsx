import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const LEVELS = [
  { id: 'read', label: 'Read-only (summarize a doc)', severity: 1, consequence: 'Worst case: a wrong or leaked summary. Contained to text output.' },
  { id: 'search', label: '+ Web search', severity: 2, consequence: 'Worst case: the model is steered toward attacker-chosen sources, but still only produces text.' },
  { id: 'email', label: '+ Send email', severity: 4, consequence: 'Worst case: a real email leaves the system to an attacker-chosen recipient -- an irreversible, external side effect.' },
  { id: 'finance', label: '+ Financial transactions', severity: 9, consequence: 'Worst case: a real, hard-to-reverse financial action taken on the attacker\'s behalf -- the same underlying prompt injection, radically different blast radius.' },
];
const MAX_SEVERITY = 9;

export default function ExcessiveAgencyDiagram() {
  const t = useVizTokens();
  const { value: levelIdx, pick: setLevelIdx, stop } = useAutoCycle(LEVELS.length, 3000, 2);
  const level = LEVELS[levelIdx];

  return (
    <VisualizationContainer footer={`Same injected instruction, same attack, every single time -- only the agent's GRANTED capability changes below. ${level.consequence}`}>
      <input type="range" min={0} max={LEVELS.length - 1} step={1} value={levelIdx} onChange={(e) => { stop(); setLevelIdx(Number(e.target.value)); }}
        style={{ width: '100%', accentColor: t.accentPrimary }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.textMuted, marginTop: 2 }}>
        {LEVELS.map((l) => <span key={l.id}>{l.label.split(' ')[0]}</span>)}
      </div>

      <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: t.surfaceAlt, border: `1.5px solid ${t.border}` }}>
        <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>Agent capability: {level.label}</div>
        <div style={{ background: t.surface, borderRadius: 6, height: 20, overflow: 'hidden' }}>
          <div style={{
            width: `${(level.severity / MAX_SEVERITY) * 100}%`, height: '100%', borderRadius: 6,
            background: level.severity <= 1 ? t.accentPrimary : level.severity <= 2 ? t.accentSecondary : level.severity <= 4 ? t.accentWarn : t.accentDanger,
            transition: 'width 200ms ease',
          }} />
        </div>
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>illustrative blast-radius severity: {level.severity}/{MAX_SEVERITY}</div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        The fix isn't detecting every injection attempt (structurally hard, per the boundary diagram above) -- it's making sure the worst case, if an injection succeeds, stays small: least-privilege tool scoping and human approval for the two right-hand levels here.
      </div>
    </VisualizationContainer>
  );
}
