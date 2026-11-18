import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const APPROACHES = [
  { id: 'debate', label: 'Debate', idea: 'Two model instances argue opposing sides in front of the judge.', why: 'A judge who can\'t verify a claim directly may still judge which of two competing arguments survives adversarial scrutiny -- like a jury that isn\'t a legal expert.' },
  { id: 'rrm', label: 'Recursive reward modeling', idea: 'AI assistance helps the human break a hard evaluation into smaller pieces it CAN judge.', why: 'Bootstraps evaluation capability with AI help, rather than requiring the human to do the full, too-complex evaluation alone from scratch.' },
  { id: 'process', label: 'Process-based oversight', idea: 'Grade the reasoning that produced an answer, not just the final answer.', why: 'A wrong answer from sound reasoning is a different, more fixable failure than a right answer from reasoning that happened to work this time but won\'t generalize -- see the worked example below.' },
];

export default function OversightApproachesDiagram() {
  const t = useVizTokens();
  const { value: selectedIdx, pick: setSelected, stop } = useAutoCycle(APPROACHES.length, 3500, 0);
  const active = APPROACHES[selectedIdx];
  const selected = active.id;

  return (
    <VisualizationContainer footer={active.why}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {APPROACHES.map((a, i) => {
          const isSelected = selected === a.id;
          return (
            <div key={a.id} onClick={() => { stop(); setSelected(i); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); setSelected(i); } }} style={{
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '0.7rem 0.9rem', borderRadius: 8,
              background: isSelected ? `${t.accentPrimary}18` : t.surfaceAlt, border: `1.5px solid ${isSelected ? t.accentPrimary : t.border}`,
            }}>
              <div style={{ width: 150, fontSize: 13, fontWeight: 700, color: isSelected ? t.accentPrimary : t.textPrimary }}>{a.label}</div>
              <div style={{ flex: 1, fontSize: 12, color: t.textSecondary }}>{a.idea}</div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        None of these fully escape depending on the model's own outputs -- which is exactly why interpretability (below) is a complementary tool, not a redundant one.
      </div>
    </VisualizationContainer>
  );
}
