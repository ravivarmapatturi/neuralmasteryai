import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const ITEMS = [
  { key: 'code', label: 'Code', desc: 'The exact git commit.' },
  { key: 'data', label: 'Data', desc: 'The exact dataset version.' },
  { key: 'model', label: 'Model', desc: 'The exact architecture and starting weights (for fine-tuning).' },
  { key: 'params', label: 'Params', desc: 'Every hyperparameter, logged.' },
  { key: 'env', label: 'Environment', desc: 'Exact package versions, ideally captured as a container image -- not just a requirements.txt.' },
  { key: 'seeds', label: 'Seeds', desc: 'Random seeds for data shuffling, weight initialization, and any stochastic training component.' },
  { key: 'hardware', label: 'Hardware', desc: 'GPU type and count -- some operations aren\'t bit-for-bit deterministic across different hardware.' },
];

/** Seven things a training run needs pinned to reproduce -- click one
 * to see exactly what it covers. Missing any one makes "the model
 * started behaving differently" unanswerable. */
export default function ReproducibilityChecklistDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick } = useAutoCycle(ITEMS.length, 2500, 5);
  const active = ITEMS[activeIdx].key;
  const color = getConceptColor(t, 'attention');
  const item = ITEMS[activeIdx];

  return (
    <VisualizationContainer footer={item.desc}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {ITEMS.map((x, idx) => {
          const isActive = active === x.key;
          return (
            <div key={x.key} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} onMouseEnter={() => pick(idx)} style={{ cursor: 'pointer', padding: '0.5rem 0.7rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}>
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
