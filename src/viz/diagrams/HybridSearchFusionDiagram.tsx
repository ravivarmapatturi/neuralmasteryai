import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
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
  const [k, setK] = useState(K);
  const denseColor = getConceptColor(t, 'query');
  const sparseColor = t.accentWarn;
  const fusedColor = getConceptColor(t, 'attention');

  const rrfScore = (doc: string) => {
    const dRank = DENSE_RANKING.indexOf(doc) + 1;
    const sRank = SPARSE_RANKING.indexOf(doc) + 1;
    return rrfScoreForRank(dRank, k) + rrfScoreForRank(sRank, k);
  };
  const fused = reciprocalRankFusion([DENSE_RANKING, SPARSE_RANKING], k).map((r) => r.doc);

  function Column({ title, ranking, color }: { title: string; ranking: string[]; color: string }) {
    return (
      <div style={{ flex: 1 }}>
        <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, fontFamily: HAND_FONT, color, marginBottom: 6 }}>{title}</div>
        {ranking.map((d, i) => (
          <SketchBox key={d} color={hovered === d ? color : t.border} strokeWidth={hovered === d ? 2 : 1.3} style={{ marginBottom: 5 }}>
            <button type="button"
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(d)}
              onBlur={() => setHovered(null)}
              aria-label={`${d}, rank ${i + 1} in ${title}; show fused score`}
              style={{
                width: '100%', border: 0, padding: '9px 8px', fontSize: 12, fontFamily: 'monospace', textAlign: 'center', cursor: 'pointer',
                background: hovered === d ? `${color}30` : t.surfaceAlt, color: t.textSecondary,
              }}
            >
              #{i + 1} {d}
            </button>
          </SketchBox>
        ))}
      </div>
    );
  }

  return (
    <VisualizationContainer footer="Change k to see how much first place matters. The example uses fixed, illustrative rankings; every fused score is calculated from the displayed positions.">
      <Slider label={`Rank damping k = ${k}`} min={1} max={100} step={1} value={k} onChange={setK} />
      <div style={{ display: 'flex', gap: 16 }}>
        <Column title="Dense ranking" ranking={DENSE_RANKING} color={denseColor} />
        <Column title="Sparse ranking" ranking={SPARSE_RANKING} color={sparseColor} />
        <Column title="Fused (RRF)" ranking={fused} color={fusedColor} />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        {hovered
          ? `${hovered}: 1/(${k}+${DENSE_RANKING.indexOf(hovered) + 1}) + 1/(${k}+${SPARSE_RANKING.indexOf(hovered) + 1}) = ${rrfScore(hovered).toFixed(4)}`
          : `RRF score = 1/(k+rank_dense) + 1/(k+rank_sparse), k=${k}`}
      </div>
    </VisualizationContainer>
  );
}
