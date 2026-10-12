import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Two linear layers with a ReLU between -- applied identically and
 * independently to every position. The bar widths are drawn to scale
 * (512 -> 2048 -> 512) so the "expand then contract" shape is visible,
 * not just stated.
 *
 * Hand-drawn pass: shapes only (rect/line -> SketchRect/SketchArrow),
 * colors unchanged (useVizTokens() already resolves to the notebook
 * palette). No fillColor -- same text-legibility fix already applied to
 * every other converted diagram this session. */
export default function FeedForwardDiagram() {
  const t = useVizTokens();
  const width = 460;
  const height = 150;
  const barCenterY = 60;
  const inW = 16;
  const midW = 64;
  const outW = 16;
  const stageX = [40, 220, 400];

  function Bar({ x, w, label, sub }: { x: number; w: number; label: string; sub: string }) {
    return (
      <g>
        <SketchRect x={x - w / 2} y={barCenterY - w / 2} width={w} height={w} color={t.accentSecondary} id={`ffn-bar-${x}`} />
        <text x={x} y={barCenterY + w / 2 + 20} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily="monospace" fill={t.textPrimary}>{label}</text>
        <text x={x} y={barCenterY + w / 2 + 34} textAnchor="middle" fontSize={10.5} fontFamily={HAND_FONT} fill={t.textMuted}>{sub}</text>
      </g>
    );
  }

  return (
    <VisualizationContainer footer="Applied identically and independently to every position -- attention is the only place information mixes across tokens; the FFN is a per-token transform, run 512-wide -> 2048-wide -> 512-wide.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <Bar x={stageX[0]} w={inW * 2.2} label="x" sub="512" />
        <SketchArrow points={[[stageX[0] + inW * 1.1 + 10, barCenterY], [stageX[1] - midW / 2 - 40, barCenterY]]} color={t.textSecondary} id="ffn-arrow-1" />
        <text x={(stageX[0] + stageX[1]) / 2 - 10} y={barCenterY - 14} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={t.textMuted}>W₁, b₁</text>

        <Bar x={stageX[1]} w={midW} label="ReLU(xW₁+b₁)" sub="2048" />
        <SketchArrow points={[[stageX[1] + midW / 2 + 30, barCenterY], [stageX[2] - inW * 1.1 - 10, barCenterY]]} color={t.textSecondary} id="ffn-arrow-2" />
        <text x={(stageX[1] + stageX[2]) / 2 + 10} y={barCenterY - 14} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={t.textMuted}>W₂, b₂</text>

        <Bar x={stageX[2]} w={outW * 2.2} label="output" sub="512" />
      </svg>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <VisualizationMath latex="\text{FFN}(x) = \max(0, xW_1+b_1)W_2+b_2" />
      </div>
      <div className="nb-hand" style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size + 1, color: t.textMuted, marginTop: 4, fontFamily: HAND_FONT }}>
        Bar sizes are to scale: 512 -&gt; 2048 -&gt; 512.
      </div>
    </VisualizationContainer>
  );
}
