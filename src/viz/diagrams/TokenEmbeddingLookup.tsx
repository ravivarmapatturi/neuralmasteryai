import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import DiagramMatrix from './DiagramMatrix';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const SENTENCE = [
  { tok: 'your', id: 71 },
  { tok: 'cat', id: 1274 },
  { tok: 'is', id: 253 },
  { tok: 'a', id: 6 },
  { tok: 'lovely', id: 5309 },
  { tok: 'cat', id: 1274 },
];
const VOCAB_ROWS = [6, 71, 253, 1274, 5309]; // sorted unique ids actually used, standing in for the full vocab table
const ROW_DIMS = 8; // stand-in for d_model=512, small enough to draw

// Deterministic per-id pseudo-embedding, purely illustrative -- a real
// table's values are learned, but every row must still be *some* fixed
// vector, and this shows that structure without pretending it's trained.
function rowFor(id: number): number[] {
  return Array.from({ length: ROW_DIMS }, (_, d) => Math.sin(id * 0.017 + d * 1.3) * 0.9);
}

/** A token ID indexes one fixed row of the embedding table -- the lookup is
 * indexing, not computation, and it's the same table at every position.
 * Click "cat" (either occurrence): both point at the identical row. */
export default function TokenEmbeddingLookup() {
  const t = useVizTokens();
  const cyc = useAutoCycle(SENTENCE.length, 1600, 1); // walks through the sentence until the reader clicks
  const selected = cyc.value;
  const setSelected = cyc.pick;
  const selectedId = SENTENCE[selected].id;
  const rowIndex = VOCAB_ROWS.indexOf(selectedId);
  const embColor = getConceptColor(t, 'embedding');

  return (
    <VisualizationContainer footer="The lookup only depends on the token ID -- both occurrences of 'cat' share ID 1274 and pull the exact same row, so they get back the exact same vector. Position isn't in this step at all; that's what positional encoding adds next.">
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        {SENTENCE.map((w, i) => {
          const isSelected = i === selected;
          const sharesRow = w.id === selectedId;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              style={{
                cursor: 'pointer',
                border: `1.5px solid ${sharesRow ? embColor : t.border}`,
                background: sharesRow ? `${embColor}22` : t.surfaceAlt,
                borderRadius: 8,
                padding: '6px 10px',
                textAlign: 'center',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: sharesRow ? embColor : t.textPrimary }}>{w.tok}</div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: t.textMuted, marginTop: 2 }}>id {w.id}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <DiagramMatrix
          data={VOCAB_ROWS.map(rowFor)}
          concept="embedding"
          rowLabels={VOCAB_ROWS.map((id) => `id ${id}`)}
          cellSize={30}
          maxAbs={1}
          showValues={false}
          highlightRow={rowIndex}
        />
      </div>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: DIAGRAM_TYPE.caption.size, color: t.textSecondary }}>
        embedding table, shape (vocab_size, d_model=512) -- shown here as {ROW_DIMS} of 512 dims, only the rows actually used above
      </div>
    </VisualizationContainer>
  );
}
