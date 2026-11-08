import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchEllipse, SketchPath, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** The residual/skip connection: the sublayer's input travels straight
 * through (bottom path) AND through the sublayer transform (top path),
 * the two are summed, then LayerNorm normalizes the result. The skip path
 * is what lets gradients flow straight through depth without passing
 * through every sublayer's transformation. */
export default function AddNormDiagram() {
  const t = useVizTokens();
  const subColor = getConceptColor(t, 'attention');
  const width = 450;
  const height = 160;
  const inX = 30;
  const subX = 110;
  const subW = 100;
  const sumX = 265;
  const normX = 315;
  const normW = 80;
  const outX = 435;
  const topY = 40;
  const botY = 120;
  const midY = height / 2;

  return (
    <VisualizationContainer footer="Post-norm, as in the original paper: LayerNorm(x + Sublayer(x)). The skip connection (bottom path) means depth never forces gradients through a transformation they can't get around.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <SketchEllipse cx={inX} cy={midY} width={32} height={32} color={t.textSecondary} id="an-x" />
        <text x={inX} y={midY + 4} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily="monospace" fill={t.textSecondary}>x</text>

        {/* top path: through the sublayer */}
        <SketchPath d={`M ${inX + 16},${midY - 4} C 65,${topY} 85,${topY} ${subX},${topY}`} color={subColor} id="an-top-in" />
        <SketchRect x={subX} y={topY - 18} width={subW} height={36} color={subColor} id="an-sublayer" />
        <text x={subX + subW / 2} y={topY + 5} textAnchor="middle" fontSize={11.5} fontWeight={700} fontFamily={HAND_FONT} fill={subColor}>Sublayer(x)</text>
        <SketchPath d={`M ${subX + subW},${topY} C ${sumX - 25},${topY} ${sumX - 5},${midY - 25} ${sumX - 5},${midY - 15}`} color={subColor} id="an-top-out" />

        {/* bottom path: skip connection */}
        <SketchPath d={`M ${inX + 14},${midY + 8} C 80,${botY} ${sumX - 40},${botY} ${sumX - 5},${midY + 15}`} color={t.textSecondary} roughness={1.5} id="an-skip" />
        <text x={145} y={botY + 16} textAnchor="middle" fontSize={11} fontFamily={HAND_FONT} fill={t.textMuted}>skip connection</text>

        {/* sum node */}
        <SketchEllipse cx={sumX} cy={midY} width={32} height={32} color={t.textPrimary} strokeWidth={2} id="an-sum" />
        <text x={sumX} y={midY + 5} textAnchor="middle" fontSize={16} fontWeight={700} fill={t.textPrimary}>+</text>

        <SketchArrow points={[[sumX + 16, midY], [normX - 2, midY]]} color={t.textPrimary} strokeWidth={1.5} roughness={1.2} id="an-sum-to-norm" />

        {/* LayerNorm */}
        <SketchRect x={normX} y={midY - 18} width={normW} height={36} color={t.accentPrimary} id="an-layernorm" />
        <text x={normX + normW / 2} y={midY + 5} textAnchor="middle" fontSize={11.5} fontWeight={700} fontFamily={HAND_FONT} fill={t.accentPrimary}>LayerNorm</text>

        <SketchArrow points={[[normX + normW + 2, midY], [outX, midY]]} color={t.accentPrimary} strokeWidth={1.5} roughness={1.2} id="an-out" />
      </svg>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <VisualizationMath latex="\text{LayerNorm}(x + \text{Sublayer}(x))" />
      </div>
      <div className="nb-hand" style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size + 1, color: t.textMuted, marginTop: 4, fontFamily: HAND_FONT }}>
        Sublayer(x) is self-attention in one Add &amp; Norm, the feed-forward network in the other.
      </div>
    </VisualizationContainer>
  );
}
