import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STEPS = [
  { key: 'pull', label: 'Pull current candidates', desc: 'From primary sources -- provider docs, the inference engine\'s supported-models list, current leaderboards.' },
  { key: 'skeptic', label: 'Apply benchmark-design skepticism', desc: 'Don\'t take a leaderboard number at face value -- contamination and saturation are real, common failure modes.' },
  { key: 'checklist', label: 'Evaluate against the attribute checklist', desc: 'The 12-item checklist above, applied to each specific candidate.' },
  { key: 'dimensions', label: 'Score against benchmark dimensions', desc: 'Whichever dimension set matches the system being built -- served-model or retrieval.' },
];

/** This page's actual usage instructions, as a 4-step flow rather than
 * one paragraph -- click a step for the reasoning behind it. */
export default function UsageWorkflowDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick, stop } = useAutoCycle(STEPS.length, 2500, 1);
  const color = getConceptColor(t, 'attention');
  const info = STEPS[activeIdx];

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => {
          const isActive = activeIdx === i;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                onClick={() => { stop(); pick(i); }}
                onMouseEnter={() => { stop(); pick(i); }}
                style={{ cursor: 'pointer', padding: '0.5rem 0.8rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}`, fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary, transition: 'all 0.25s ease' }}
              >
                {i + 1}. {s.label}
              </div>
              {i < STEPS.length - 1 && <span style={{ color: t.textMuted, margin: '0 4px' }}>→</span>}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        The checklist and dimensions stay true regardless of which specific models exist when you're reading this -- that durability is the point.
      </div>
    </VisualizationContainer>
  );
}
