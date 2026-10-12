import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchEllipse, SketchPath, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** The residual/skip connection: the sublayer's input travels straight
 * through (bottom path) AND through the sublayer transform (top path),
 * the two are summed, then LayerNorm normalizes the result. The skip path
 * is what lets gradients flow straight through depth without passing
 * through every sublayer's transformation.
 *
 * Hand-drawn pass: shapes only (rect/circle/line/path -> SketchRect/
 * SketchEllipse/SketchArrow/SketchPath), colors still sourced from
 * useVizTokens() -- that already resolves to the notebook palette, no
 * separate hook needed for a static (non-interactive) diagram like this
 * one. No fillColor on anything: a colored hachure fill behind text
 * caused a real, reported legibility bug on LoopGraphAnatomyDiagram (see
 * that file's comment) -- outline-only nodes, same fix applied here from
 * the start rather than repeated after the fact. */
export default function AddNormDiagram() {
  const t = useVizTokens();
  const subColor = getConceptColor(t, 'attention');
  const width = 420;
  const height = 160;
  const inX = 30;
  const sumX = 260;
  const normX = 340;
  const outX = 400;
  const topY = 40;
  const botY = 120;

  return (
    <VisualizationContainer footer="Post-norm, as in the original paper: LayerNorm(x + Sublayer(x)). The skip connection (bottom path) means depth never forces gradients through a transformation they can't get around.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <SketchEllipse cx={inX} cy={height / 2} width={32} height={32} color={t.textSecondary} id="an-x" />
        <text x={inX} y={height / 2 + 4} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily="monospace" fill={t.textSecondary}>x</text>

        {/* top path: through the sublayer */}
        <SketchPath d={`M ${inX + 16},${height / 2} C 80,${topY} 120,${topY} 150,${topY}`} color={subColor} id="an-top-in" />
        <SketchRect x={150} y={topY - 18} width={100} height={36} color={subColor} id="an-sublayer" />
        <text x={200} y={topY + 5} textAnchor="middle" fontSize={11.5} fontWeight={700} fontFamily={HAND_FONT} fill={subColor}>Sublayer(x)</text>
        <SketchPath d={`M 250,${topY} C ${sumX - 30},${topY} ${sumX - 10},${height / 2 - 12} ${sumX},${height / 2 - 8}`} color={subColor} id="an-top-out" />

        {/* bottom path: skip connection */}
        <SketchPath d={`M ${inX + 12},${height / 2 + 10} C 80,${botY} ${sumX - 40},${botY} ${sumX},${height / 2 + 8}`} color={t.textSecondary} roughness={2} id="an-skip" />
        <text x={140} y={botY + 16} textAnchor="middle" fontSize={11} fontFamily={HAND_FONT} fill={t.textMuted}>skip connection</text>

        {/* sum node */}
        <SketchEllipse cx={sumX} cy={height / 2} width={32} height={32} color={t.textPrimary} strokeWidth={2} id="an-sum" />
        <text x={sumX} y={height / 2 + 5} textAnchor="middle" fontSize={16} fontWeight={700} fill={t.textPrimary}>+</text>

        <SketchArrow points={[[sumX + 16, height / 2], [normX - 32, height / 2]]} color={t.textPrimary} arrowhead={false} id="an-sum-to-norm" />

        {/* LayerNorm */}
        <SketchRect x={normX - 32} y={height / 2 - 20} width={72} height={40} color={t.accentPrimary} id="an-layernorm" />
        <text x={normX + 4} y={height / 2 + 4} textAnchor="middle" fontSize={11.5} fontWeight={700} fontFamily={HAND_FONT} fill={t.accentPrimary}>LayerNorm</text>

        <SketchArrow points={[[normX + 40, height / 2], [outX - 4, height / 2]]} color={t.accentPrimary} id="an-out" />
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
