import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Store = 'relational' | 'vector' | 'graph';
const QUERIES: { text: string; store: Store }[] = [
  { text: 'Find all orders placed by user 4471 last month', store: 'relational' },
  { text: 'Find the 10 chunks most semantically similar to this question', store: 'vector' },
  { text: 'Find every document connected to this one through a chain of citations, up to 3 hops away', store: 'graph' },
  { text: 'Sum total revenue grouped by product category this quarter', store: 'relational' },
  { text: "Which support tickets read most like this new one, even with different wording?", store: 'vector' },
  { text: 'Who are the mutual connections between these two people, and how are they linked?', store: 'graph' },
];

/** Six real example queries -- click one to see which engine actually
 * answers it, reinforcing that the decision comes from query SHAPE, not
 * preference. */
export default function QueryPatternMatchDiagram() {
  const t = useVizTokens();
  const { value: selected, pick: setSelected, stop } = useAutoCycle(QUERIES.length, 2800, 0);
  const colorFor = (s: Store) => (s === 'relational' ? getConceptColor(t, 'query') : s === 'vector' ? getConceptColor(t, 'attention') : t.accentWarn);
  const labelFor = (s: Store) => (s === 'relational' ? 'Relational' : s === 'vector' ? 'Vector' : 'Graph');

  return (
    <VisualizationContainer footer="Click a query -- the engine it routes to follows directly from what's actually being asked, not a preference.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {QUERIES.map((q, i) => {
          const isSelected = selected === i;
          const color = colorFor(q.store);
          return (
            <div
              key={i}
              onClick={() => {
                stop();
                setSelected(i);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '0.55rem 0.8rem', borderRadius: 7,
                background: isSelected ? `${color}18` : t.surfaceAlt, border: `1.25px solid ${isSelected ? color : t.border}`,
              }}
            >
              <div style={{ flex: 1, fontSize: 12.5, color: t.textSecondary, fontStyle: 'italic' }}>&ldquo;{q.text}&rdquo;</div>
              {isSelected && (
                <div style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color, padding: '2px 8px', borderRadius: 999, border: `1px solid ${color}` }}>
                  {labelFor(q.store)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, fontSize: DIAGRAM_TYPE.caption.size }}>
        <span style={{ color: colorFor('relational') }}>● Relational</span>
        <span style={{ color: colorFor('vector') }}>● Vector</span>
        <span style={{ color: colorFor('graph') }}>● Graph</span>
      </div>
    </VisualizationContainer>
  );
}
