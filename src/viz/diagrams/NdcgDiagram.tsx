import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';
import { dcg, ndcg } from '../lib/specializedSupervised';

const ITEM_NAMES = ['result A', 'result B', 'result C', 'result D', 'result E'];

export default function NdcgDiagram() {
  const t = useVizTokens();
  const [order, setOrder] = useState([0, 1, 2, 3, 4]);
  const rankCycle = useAutoCycle(ITEM_NAMES.length, 1100);
  const trueRelevance = [1, 4, 0, 3, 2]; // graded relevance, index-matched to ITEM_NAMES

  const relevances = order.map((i) => trueRelevance[i]);
  const realDcg = useMemo(() => dcg(relevances), [relevances]);
  const realNdcg = useMemo(() => ndcg(relevances), [relevances]);

  const swap = (i: number) => {
    rankCycle.stop();
    if (i >= order.length - 1) return;
    const next = [...order];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setOrder(next);
  };

  return (
    <VisualizationContainer footer={`Real DCG = Σ (2^rel − 1)/log₂(i+2) = ${realDcg.toFixed(3)}. Real NDCG = DCG / ideal-DCG = ${realNdcg.toFixed(3)}. Click "swap down" on any item to see NDCG respond -- swapping two low-relevance items near the bottom barely moves it; swapping the top item down costs far more, exactly the position-discount the log term enforces.`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {order.map((itemIdx, pos) => (
          <div key={itemIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: DIAGRAM_RADIUS.node, background: rankCycle.value === pos ? `${t.accentPrimary}18` : t.surfaceAlt, border: `1px solid ${rankCycle.value === pos ? t.accentPrimary : t.border}`, transition: 'background 300ms, border-color 300ms' }}>
            <span style={{ fontSize: 11, color: t.textMuted, width: 20 }}>#{pos + 1}</span>
            <span style={{ flex: 1, fontSize: 13, color: t.textPrimary }}>{ITEM_NAMES[itemIdx]}</span>
            <span style={{ fontSize: 11, color: t.accentPrimary, fontFamily: 'monospace' }}>rel={trueRelevance[itemIdx]}</span>
            <VizButton variant="secondary" onClick={() => swap(pos)}>swap ↓</VizButton>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 30, marginTop: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: t.accentPrimary, fontFamily: 'monospace' }}>{realDcg.toFixed(3)}</div>
          <div style={{ fontSize: 11, color: t.textMuted }}>DCG</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: realNdcg > 0.9 ? t.accentPrimary : t.accentWarn, fontFamily: 'monospace' }}>{realNdcg.toFixed(3)}</div>
          <div style={{ fontSize: 11, color: t.textMuted }}>NDCG</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        NDCG=1.0 only when the list is already in the true, ideal relevance order.
      </div>
    </VisualizationContainer>
  );
}
