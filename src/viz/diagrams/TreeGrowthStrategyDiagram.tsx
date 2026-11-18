import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';
import { levelWiseOrder, leafWiseOrder } from '../lib/ensembles';

const BUDGET = 3;

function Row({ label, nodes, color, visible }: { label: string; nodes: { id: string; gain: number }[]; color: string; visible: number }) {
  const t = useVizTokens();
  const total = nodes.reduce((s, n) => s + n.gain, 0);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>{label} — total gain {total.toFixed(1)}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {nodes.map((n, i) => (
          <div key={n.id} style={{ padding: '4px 10px', borderRadius: DIAGRAM_RADIUS.chip, background: `${color}20`, border: `1px solid ${color}`, fontSize: 12, fontFamily: 'monospace', color: t.textPrimary, opacity: i < visible ? 1 : 0.16 }}>
            {i + 1}. {n.id.replace('root-', '')} (+{n.gain})
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TreeGrowthStrategyDiagram() {
  const t = useVizTokens();
  const splitCycle = useAutoCycle(BUDGET + 1, 1200, BUDGET);
  const levelWise = levelWiseOrder(BUDGET);
  const leafWise = leafWiseOrder(BUDGET);
  const levelTotal = levelWise.reduce((s, n) => s + n.gain, 0);
  const leafTotal = leafWise.reduce((s, n) => s + n.gain, 0);

  return (
    <VisualizationContainer footer={`Same fixed budget of ${BUDGET} splits, real hand-set per-leaf loss-reduction ("gain") values. Level-wise is forced to take both of the root's real depth-1 children before touching depth 2, even though one of them (root-R, gain 2) is weak -- real total gain ${levelTotal.toFixed(1)}. Leaf-wise always expands whichever available leaf has the highest real gain, so it skips root-R entirely in favor of root-L's two strong children -- real total gain ${leafTotal.toFixed(1)}, a genuine ${(leafTotal - levelTotal).toFixed(1)}-point improvement at the identical split budget.`}>
      <div onPointerDown={splitCycle.stop}>
        <Row label="Level-wise (XGBoost default)" nodes={levelWise} color={t.accentSecondary} visible={splitCycle.value} />
        <Row label="Leaf-wise (LightGBM)" nodes={leafWise} color={t.accentPrimary} visible={splitCycle.value} />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        The cost: leaf-wise's tree is now unbalanced (root-R never got expanded at all this round) -- exactly the overfitting-on-small-data risk the prose describes, visible directly in which nodes got skipped.
      </div>
    </VisualizationContainer>
  );
}
