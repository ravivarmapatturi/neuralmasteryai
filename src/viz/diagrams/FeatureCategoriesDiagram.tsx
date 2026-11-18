import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const CATEGORIES = [
  { key: 'user', label: 'User features', examples: ['purchase history', 'stated preferences', 'account age'], desc: 'Who is asking -- history and preferences specific to this user.' },
  { key: 'item', label: 'Item features', examples: ['category', 'price', 'content embedding'], desc: 'What\'s being considered -- content and metadata about the item itself, independent of any particular user.' },
  { key: 'context', label: 'Context features', examples: ['time of day', 'device', 'location'], desc: 'The situation right now -- signals that change the right answer even for the same user and item.' },
];

/** The three feature categories every production ranking/recommendation
 * system combines -- click one for concrete examples. */
export default function FeatureCategoriesDiagram() {
  const t = useVizTokens();
  const { value: selectedIdx, pick, stop } = useAutoCycle(CATEGORIES.length, 2800, 2);
  const color = getConceptColor(t, 'attention');
  const active = CATEGORIES[selectedIdx];

  return (
    <VisualizationContainer footer={active.desc}>
      <div style={{ display: 'flex', gap: 8 }}>
        {CATEGORIES.map((c, i) => {
          const isSelected = selectedIdx === i;
          return (
            <div
              key={c.key}
              onClick={() => { stop(); pick(i); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); pick(i); } }}
              onMouseEnter={() => { stop(); pick(i); }}
              style={{ flex: 1, cursor: 'pointer', padding: '0.7rem', borderRadius: 9, background: isSelected ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}`, textAlign: 'center', transition: 'all 0.25s ease' }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: isSelected ? color : t.textPrimary }}>{c.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
        {active.examples.map((ex) => (
          <div key={ex} style={{ fontSize: 10.5, fontFamily: 'monospace', padding: '3px 10px', borderRadius: 999, background: `${color}15`, color }}>{ex}</div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Most production systems combine all three -- a prediction usually depends on who, what, and when together.
      </div>
    </VisualizationContainer>
  );
}
