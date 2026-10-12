import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { RRF_DEFAULT_K as K, reciprocalRankFusion, rrfScoreForRank } from '../lib/rrf';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const DENSE_RANKING = ['Doc B', 'Doc A', 'Doc D', 'Doc C'];
const SPARSE_RANKING = ['Doc C', 'Doc B', 'Doc A', 'Doc D'];

/** Reciprocal Rank Fusion combines two ranked lists using each result's
 * POSITION, not its raw (differently-scaled) score -- 1/(k+rank) per list,
 * summed. Hover a doc to see its two positions add up to its fused rank.
 * See src/viz/lib/rrf.ts for the computation and its unit tests. */
export default function HybridSearchFusionDiagram() {
  const t = useVizTokens();
  const [hovered, setHovered] = useState<string | null>(null);
  const denseColor = getConceptColor(t, 'query');
  const sparseColor = t.accentWarn;
  const fusedColor = getConceptColor(t, 'attention');

  const rrfScore = (doc: string) => {
    const dRank = DENSE_RANKING.indexOf(doc) + 1;
    const sRank = SPARSE_RANKING.indexOf(doc) + 1;
    return rrfScoreForRank(dRank, K) + rrfScoreForRank(sRank, K);
  };
  const fused = reciprocalRankFusion([DENSE_RANKING, SPARSE_RANKING], K).map((r) => r.doc);

  function Column({ title, ranking, color }: { title: string; ranking: string[]; color: string }) {
    return (
      <div style={{ flex: 1 }}>
        <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, fontFamily: HAND_FONT, color, marginBottom: 6 }}>{title}</div>
        {ranking.map((d, i) => (
          <SketchBox key={d} color={hovered === d ? color : t.border} strokeWidth={hovered === d ? 2 : 1.3} style={{ marginBottom: 5 }}>
            <div
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '5px 8px', fontSize: 11, fontFamily: 'monospace', textAlign: 'center', cursor: 'pointer',
                background: hovered === d ? `${color}30` : t.surfaceAlt, color: t.textSecondary,
              }}
            >
              #{i + 1} {d}
            </div>
          </SketchBox>
        ))}
      </div>
    );
  }

  return (
    <VisualizationContainer footer="Hover a document -- its dense rank and sparse rank each contribute 1/(k+rank) to its fused score. A doc ranked highly by BOTH lists rises to the top even if neither single ranking put it #1.">
      <div style={{ display: 'flex', gap: 16 }}>
        <Column title="Dense ranking" ranking={DENSE_RANKING} color={denseColor} />
        <Column title="Sparse ranking" ranking={SPARSE_RANKING} color={sparseColor} />
        <Column title="Fused (RRF)" ranking={fused} color={fusedColor} />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        {hovered
          ? `${hovered}: 1/(${K}+${DENSE_RANKING.indexOf(hovered) + 1}) + 1/(${K}+${SPARSE_RANKING.indexOf(hovered) + 1}) = ${rrfScore(hovered).toFixed(4)}`
          : 'RRF score = 1/(k+rank_dense) + 1/(k+rank_sparse), k=60 (standard default)'}
      </div>
    </VisualizationContainer>
  );
}
