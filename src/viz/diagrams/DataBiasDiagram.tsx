import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** Training data collected under an OLD system's behavior encodes that
 * system's blind spots -- click to see how an old ranking system's own
 * past decisions shape which items even HAD a chance to get clicked. */
export default function DataBiasDiagram() {
  const t = useVizTokens();
  const { value: cycleIdx, stop } = useAutoCycle(2, 3000, 0);
  const [userRevealed, setUserRevealed] = useState<boolean | null>(null);
  const revealed = userRevealed ?? (cycleIdx === 0);
  const shownColor = getConceptColor(t, 'attention');
  const hiddenColor = t.textMuted;

  const items = [
    { shown: true, clicked: true },
    { shown: true, clicked: false },
    { shown: true, clicked: true },
    { shown: false, clicked: null },
    { shown: false, clicked: null },
    { shown: true, clicked: false },
    { shown: false, clicked: null },
  ];

  return (
    <VisualizationContainer footer={revealed ? 'Items the OLD system never showed (dim) generated zero click data -- not because users wouldn\'t have liked them, but because they never had a chance. Training on this data alone perpetuates the old system\'s blind spots.' : 'Click "reveal" -- only a fraction of all items were ever actually shown to users.'}>
      <button
        type="button"
        onClick={() => {
          stop();
          setUserRevealed(!revealed);
        }}
        style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${shownColor}`, background: revealed ? `${shownColor}15` : 'transparent', color: shownColor, cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}
      >
        {revealed ? 'Showing full catalog' : 'Reveal what was hidden'}
      </button>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {items.map((item, i) => (
          <div key={i} style={{ width: 60, padding: '0.5rem', borderRadius: 7, textAlign: 'center', background: item.shown ? `${shownColor}18` : revealed ? `${hiddenColor}10` : 'transparent', border: `1.5px solid ${item.shown ? shownColor : hiddenColor}`, opacity: item.shown || revealed ? 1 : 0, transition: 'all 0.3s ease' }}>
            <div style={{ fontSize: 9, color: item.shown ? shownColor : hiddenColor, fontWeight: 700 }}>{item.shown ? (item.clicked ? 'clicked' : 'not clicked') : 'never shown'}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Fixed by exploration strategies (deliberately showing some uncertain items) rather than training purely on the old system's exposure pattern.
      </div>
    </VisualizationContainer>
  );
}
