import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Store = 'relational' | 'vector' | 'graph';
const STORES: { key: Store; label: string; question: string; goodAt: string; badAt: string }[] = [
  { key: 'relational', label: 'Relational', question: '"Rows matching exact conditions, with guarantees"', goodAt: 'Structured records, transactions, referential integrity, aggregation', badAt: 'Similarity search; relationship queries get slower with every extra hop' },
  { key: 'vector', label: 'Vector', question: '"What\'s semantically similar to this?"', goodAt: 'Embedding similarity search at massive scale (millions-billions)', badAt: 'Exact structured lookups; multi-hop relationship traversal' },
  { key: 'graph', label: 'Graph', question: '"How are these things connected, N hops away?"', goodAt: 'Multi-hop traversal, relationship-heavy queries, stays fast regardless of depth', badAt: 'Simple flat lookups; similarity search over unstructured content' },
];

/** The three engines side by side on the one axis that actually
 * distinguishes them -- what kind of question each is built to answer
 * well, not a feature checklist. Click a card for what it trades away. */
export default function ThreeStoreComparisonDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, pick: setAutoIdx, stop } = useAutoCycle(STORES.length, 3500, 0);
  const colorFor = (s: Store) => (s === 'relational' ? getConceptColor(t, 'query') : s === 'vector' ? getConceptColor(t, 'attention') : t.accentWarn);
  const active = STORES[autoIdx];
  const selected = active.key;

  return (
    <VisualizationContainer footer={`Good at: ${active.goodAt}`}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {STORES.map((s, i) => {
          const color = colorFor(s.key);
          const isSelected = selected === s.key;
          return (
            <div
              key={s.key}
              onClick={() => {
                stop();
                setAutoIdx(i);
              }}
              onMouseEnter={() => {
                stop();
                setAutoIdx(i);
              }}
              style={{
                flex: '1 1 160px', cursor: 'pointer', padding: '0.9rem 1rem', borderRadius: 10,
                background: isSelected ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}`,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color }}>{s.label}</div>
              <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 6, fontStyle: 'italic' }}>{s.question}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, padding: '0.7rem 0.9rem', borderRadius: 8, background: `${colorFor(selected)}12`, border: `1px solid ${colorFor(selected)}40` }}>
        <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textSecondary }}>
          <strong style={{ color: colorFor(selected) }}>Poor fit for:</strong> {active.badAt}
        </div>
      </div>
    </VisualizationContainer>
  );
}
