import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const QUERY = 'canines that bark';
const DOCS = [
  { text: 'Dogs often bark at strangers.', denseScore: 0.86, sparseScore: 0.0, sharedTerms: [] },
  { text: 'Canines that bark loudly.', denseScore: 0.94, sparseScore: 0.71, sharedTerms: ['canines', 'that', 'bark'] },
  { text: 'A quiet afternoon in the park.', denseScore: 0.12, sparseScore: 0.0, sharedTerms: [] },
];

/** The same query against the same 3 documents, scored two structurally
 * different ways: dense catches the "dogs" doc purely on meaning (zero
 * shared words with the query), sparse only lights up on exact term
 * overlap -- neither is simply "better," they miss different things. */
export default function DenseVsSparseRetrievalDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<'dense' | 'sparse'>('dense');
  const denseColor = getConceptColor(t, 'attention');
  const sparseColor = t.accentWarn;
  const color = mode === 'dense' ? denseColor : sparseColor;

  return (
    <VisualizationContainer
      footer={
        mode === 'dense'
          ? 'Dense retrieval scores by meaning in embedding space -- the "dogs" document scores high despite sharing zero words with the query.'
          : 'Sparse retrieval scores by exact term overlap -- the "dogs" document scores 0 even though it means the same thing, because none of the query\'s exact words appear in it.'
      }
    >
      <PillSelect<'dense' | 'sparse'> label="Scoring mode" value={mode} onChange={setMode} options={[{ value: 'dense', label: 'Dense (embeddings)' }, { value: 'sparse', label: 'Sparse (term overlap)' }]} />
      <div style={{ marginTop: 10, fontSize: 12, fontFamily: 'monospace', color: t.textSecondary }}>query: "{QUERY}"</div>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DOCS.map((d, i) => {
          const score = mode === 'dense' ? d.denseScore : d.sparseScore;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 200, fontSize: 11, color: t.textSecondary, fontFamily: 'monospace' }}>"{d.text}"</div>
              <SketchBox color={t.border} strokeWidth={1.2} style={{ flex: 1 }}>
                <div style={{ height: 16, background: t.surfaceAlt, overflow: 'hidden' }}>
                  <div style={{ width: `${score * 100}%`, height: '100%', background: color, opacity: 0.8, transition: 'width 250ms' }} />
                </div>
              </SketchBox>
              <div style={{ width: 40, textAlign: 'right', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color }}>{score.toFixed(2)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Toggle modes -- the "dogs" document's score flips from near-top to zero.
      </div>
    </VisualizationContainer>
  );
}
