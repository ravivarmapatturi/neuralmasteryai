import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** Model cards and data cards apply the same transparency discipline
 * to two different artifacts -- click to compare what each actually
 * documents. */
export default function ModelCardVsDataCardDiagram() {
  const t = useVizTokens();
  const { value, pick } = useAutoCycle(2, 3500, 0);
  const card: 'model' | 'data' = value === 0 ? 'model' : 'data';
  const color = getConceptColor(t, 'attention');

  const CONTENTS = card === 'model'
    ? ['Intended use cases', 'Out-of-scope uses', 'Training data summary', 'Evaluation results (per subgroup, not just aggregate)', 'Known limitations']
    : ['Provenance', 'Collection methodology', 'Known biases', 'Licensing'];

  return (
    <VisualizationContainer footer="The standard a consumer should be able to check before building on a model or dataset -- rather than discovering a limitation the hard way in production.">
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button type="button" onClick={() => pick(0)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: card === 'model' ? 700 : 500, background: card === 'model' ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${card === 'model' ? color : t.border}`, color: card === 'model' ? color : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
          Model card
        </button>
        <button type="button" onClick={() => pick(1)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: card === 'data' ? 700 : 500, background: card === 'data' ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${card === 'data' ? color : t.border}`, color: card === 'data' ? color : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
          Data card
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {CONTENTS.map((c) => (
          <div key={c} style={{ padding: '0.45rem 0.65rem', borderRadius: 6, background: `${color}10`, fontSize: 10, color: t.textSecondary, borderLeft: `3px solid ${color}`, transition: 'all 200ms ease' }}>{c}</div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
