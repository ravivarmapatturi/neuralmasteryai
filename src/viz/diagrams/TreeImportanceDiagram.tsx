import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

// A real toy tree: 3 splits, each with real class counts. Gini impurity and
// impurity reduction are computed live from those counts, then aggregated
// per-feature the same way sklearn's `feature_importances_` does -- sum of
// (node_samples / total_samples) * impurity_reduction, normalized to 1.
function gini(pos: number, neg: number): number {
  const n = pos + neg;
  if (n === 0) return 0;
  const p = pos / n;
  return 1 - (p * p + (1 - p) * (1 - p));
}

interface SplitNode {
  id: string;
  feature: string;
  parent: [number, number];
  left: [number, number];
  right: [number, number];
  totalSamples: number;
}

const SPLITS: SplitNode[] = [
  { id: 'root', feature: 'income', parent: [50, 50], left: [45, 15], right: [5, 35], totalSamples: 100 },
  { id: 'left', feature: 'age', parent: [45, 15], left: [38, 2], right: [7, 13], totalSamples: 60 },
  { id: 'right', feature: 'credit_score', parent: [5, 35], left: [2, 23], right: [3, 12], totalSamples: 40 },
];

function computeReduction(s: SplitNode) {
  const impParent = gini(...s.parent);
  const nLeft = s.left[0] + s.left[1];
  const nRight = s.right[0] + s.right[1];
  const nParent = nLeft + nRight;
  const impLeft = gini(...s.left);
  const impRight = gini(...s.right);
  const weighted = (nLeft / nParent) * impLeft + (nRight / nParent) * impRight;
  return { impParent, impLeft, impRight, reduction: impParent - weighted };
}

export default function TreeImportanceDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState<string | null>(null);

  const results = SPLITS.map((s) => ({ ...s, ...computeReduction(s) }));
  const raw: Record<string, number> = {};
  for (const r of results) {
    raw[r.feature] = (raw[r.feature] ?? 0) + (r.totalSamples / 100) * r.reduction;
  }
  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  const importances = Object.entries(raw)
    .map(([feature, v]) => ({ feature, importance: v / total }))
    .sort((a, b) => b.importance - a.importance);

  const colors: Record<string, string> = { income: t.accentPrimary, age: t.accentSecondary, credit_score: t.accentWarn };

  const nodePos: Record<string, { x: number; y: number }> = {
    root: { x: 350, y: 40 },
    left: { x: 180, y: 150 },
    right: { x: 520, y: 150 },
  };
  const leafPos: Record<string, { x: number; y: number }> = {
    leftleft: { x: 90, y: 260 },
    leftright: { x: 270, y: 260 },
    rightleft: { x: 430, y: 260 },
    rightright: { x: 610, y: 260 },
  };

  const activeSplit = results.find((r) => r.id === active);

  return (
    <VisualizationContainer footer="Click a split to see its Gini-impurity reduction feed the aggregated bar chart below. income dominates because it's the root split, applied to all 100 samples -- credit_score barely moves the needle despite being a real split.">
      <svg width="100%" viewBox="0 0 700 300" style={{ display: 'block' }}>
        {/* edges */}
        <SketchArrow points={[[nodePos.root.x, nodePos.root.y + 20], [nodePos.left.x, nodePos.left.y - 20]]} color={t.border} strokeWidth={1.5} arrowhead={false} id="tree-edge-rl" />
        <SketchArrow points={[[nodePos.root.x, nodePos.root.y + 20], [nodePos.right.x, nodePos.right.y - 20]]} color={t.border} strokeWidth={1.5} arrowhead={false} id="tree-edge-rr" />
        <SketchArrow points={[[nodePos.left.x, nodePos.left.y + 20], [leafPos.leftleft.x, leafPos.leftleft.y - 16]]} color={t.border} strokeWidth={1.5} arrowhead={false} id="tree-edge-ll" />
        <SketchArrow points={[[nodePos.left.x, nodePos.left.y + 20], [leafPos.leftright.x, leafPos.leftright.y - 16]]} color={t.border} strokeWidth={1.5} arrowhead={false} id="tree-edge-lr" />
        <SketchArrow points={[[nodePos.right.x, nodePos.right.y + 20], [leafPos.rightleft.x, leafPos.rightleft.y - 16]]} color={t.border} strokeWidth={1.5} arrowhead={false} id="tree-edge-rl2" />
        <SketchArrow points={[[nodePos.right.x, nodePos.right.y + 20], [leafPos.rightright.x, leafPos.rightright.y - 16]]} color={t.border} strokeWidth={1.5} arrowhead={false} id="tree-edge-rr2" />

        {results.map((r) => {
          const pos = nodePos[r.id];
          const isActive = active === r.id;
          const color = colors[r.feature];
          return (
            <g key={r.id} onClick={() => setActive(isActive ? null : r.id)} style={{ cursor: 'pointer' }}>
              <rect x={pos.x - 70} y={pos.y - 20} width={140} height={40} rx={DIAGRAM_RADIUS.node} fill={isActive ? `${color}22` : t.surfaceAlt} stroke="none" />
              <SketchRect x={pos.x - 70} y={pos.y - 20} width={140} height={40} color={color} strokeWidth={isActive ? 2.5 : 1.5} id={`tree-node-${r.id}`} />
              <text x={pos.x} y={pos.y - 3} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily="monospace" fill={color}>{r.feature}</text>
              <text x={pos.x} y={pos.y + 12} textAnchor="middle" fontSize={10} fontFamily={HAND_FONT} fill={t.textMuted}>Gini {r.impParent.toFixed(3)} → {(r.reduction > 0 ? '−' : '+') + Math.abs(r.reduction).toFixed(3)}</text>
            </g>
          );
        })}

        {[
          { id: 'leftleft', counts: SPLITS[1].left },
          { id: 'leftright', counts: SPLITS[1].right },
          { id: 'rightleft', counts: SPLITS[2].left },
          { id: 'rightright', counts: SPLITS[2].right },
        ].map((leaf) => {
          const pos = leafPos[leaf.id];
          return (
            <g key={leaf.id}>
              <SketchRect x={pos.x - 46} y={pos.y - 16} width={92} height={32} color={t.border} strokeWidth={1} id={`tree-leaf-${leaf.id}`} />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={t.textSecondary}>[{leaf.counts[0]}, {leaf.counts[1]}]</text>
            </g>
          );
        })}
      </svg>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {importances.map((imp) => (
          <div key={imp.feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 90, fontSize: 12, fontFamily: 'monospace', color: colors[imp.feature] }}>{imp.feature}</div>
            <div style={{ flex: 1, background: t.surfaceAlt, borderRadius: 4, height: 18, position: 'relative' }}>
              <div style={{ width: `${imp.importance * 100}%`, height: '100%', background: colors[imp.feature], borderRadius: 4, transition: 'width 300ms ease', opacity: activeSplit && activeSplit.feature !== imp.feature ? 0.35 : 1 }} />
            </div>
            <div style={{ width: 46, fontSize: 12, textAlign: 'right', color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{(imp.importance * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>

      {activeSplit && (
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <VisualizationMath latex={`\\text{Gini} = 1-\\sum p_i^2 = ${activeSplit.impParent.toFixed(3)} \\;\\to\\; \\Delta = ${activeSplit.reduction.toFixed(3)}`} />
        </div>
      )}
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        importance(feature) = Σ over its splits of (node_samples / total_samples) × Gini reduction, normalized to sum to 1
      </div>
    </VisualizationContainer>
  );
}
