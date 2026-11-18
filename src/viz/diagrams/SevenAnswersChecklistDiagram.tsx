import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const ITEMS = [
  { key: 'code', label: 'Code', desc: 'Which git commit trained this model?' },
  { key: 'data', label: 'Data', desc: 'Which version of which dataset?' },
  { key: 'model', label: 'Model', desc: 'What architecture, what hyperparameters?' },
  { key: 'params', label: 'Params', desc: 'Learning rate, batch size, epochs, regularization -- everything that changes the result but isn\'t data or architecture.' },
  { key: 'metrics', label: 'Metrics', desc: 'Loss curves, accuracy, precision/recall -- logged over training TIME, not just the final number.' },
  { key: 'env', label: 'Environment', desc: 'Package versions, hardware (GPU type/count), random seeds.' },
  { key: 'result', label: 'Result', desc: 'The trained model artifact itself, retrievable later.' },
];

/** Seven fields, all 7 needed for every run -- click one for exactly
 * what it means. Miss any one and "why does prod behave this way" has no
 * answer in 6 months. */
export default function SevenAnswersChecklistDiagram() {
  const t = useVizTokens();
  const { value: activeIndex, pick } = useAutoCycle(ITEMS.length, 2500, 4);
  const color = getConceptColor(t, 'attention');
  const info = ITEMS[activeIndex];

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {ITEMS.map((item, idx) => {
          const isActive = activeIndex === idx;
          return (
            <div key={item.key} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} onMouseEnter={() => pick(idx)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '0.5rem 0.8rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}`, transition: 'all 200ms ease' }}>
              <span style={{ color, fontSize: 11 }}>✓</span>
              <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{item.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        All seven, for every run, automatically -- not the ones that seemed important at the time.
      </div>
    </VisualizationContainer>
  );
}
