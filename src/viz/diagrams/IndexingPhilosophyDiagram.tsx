import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Engine = 'relational' | 'vector' | 'graph';
const ENGINES: { key: Engine; label: string; structure: string; whatNearMeans: string; without: string }[] = [
  { key: 'relational', label: 'Relational: B-tree index', structure: 'A sorted tree over one or more columns', whatNearMeans: '"Near" = adjacent in sorted order (same value, or within a range)', without: 'Full table scan -- check every row' },
  { key: 'vector', label: 'Vector: HNSW / IVF', structure: 'A multi-layer graph or clustered buckets over the embedding space', whatNearMeans: '"Near" = small distance (cosine/Euclidean) in high-dimensional space', without: 'Compare the query against every stored vector' },
  { key: 'graph', label: 'Graph: native adjacency', structure: "Relationships stored directly as pointers between nodes -- no separate index needed", whatNearMeans: '"Near" = directly connected, or connected via a short path', without: 'Reconstruct relationships via joins across foreign keys' },
];

/** Same underlying idea across all three -- precompute a structure that
 * avoids scanning everything -- but "nearby" means something different in
 * each engine, which is why the structures look nothing alike. */
export default function IndexingPhilosophyDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, pick: setAutoIdx, stop } = useAutoCycle(ENGINES.length, 3200, 1);
  const colorFor = (k: Engine) => (k === 'relational' ? getConceptColor(t, 'query') : k === 'vector' ? getConceptColor(t, 'attention') : t.accentWarn);
  const active = ENGINES[autoIdx];
  const selected = active.key;

  return (
    <VisualizationContainer footer={`Without this index: ${active.without}.`}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ENGINES.map((e, i) => {
          const isSelected = selected === e.key;
          const color = colorFor(e.key);
          return (
            <div
              key={e.key}
              onClick={() => {
                stop();
                setAutoIdx(i);
              }}
              style={{ flex: '1 1 150px', cursor: 'pointer', padding: '0.7rem 0.85rem', borderRadius: 8, background: isSelected ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}` }}
            >
              <div style={{ fontWeight: 700, fontSize: 12.5, color }}>{e.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, fontSize: 12.5, color: t.textSecondary, lineHeight: 1.5 }}>
        <div><strong style={{ color: t.textPrimary }}>Structure:</strong> {active.structure}</div>
        <div style={{ marginTop: 4 }}><strong style={{ color: t.textPrimary }}>What &ldquo;nearby&rdquo; means here:</strong> {active.whatNearMeans}</div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Same goal (avoid scanning everything) -- three different structures, because &ldquo;close&rdquo; means something different in each engine.
      </div>
    </VisualizationContainer>
  );
}
