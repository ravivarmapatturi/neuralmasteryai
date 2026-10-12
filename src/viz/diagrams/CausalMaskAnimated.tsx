import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath, VizButton } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_ANIMATION, getConceptColor, valueColor } from './diagramSystem';
import { SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const TOKENS = ['I', 'love', 'ice', 'cream'];
// A plausible, fixed post-softmax causal attention distribution (each row
// sums to 1 over its own unmasked prefix) -- illustrative, not re-derived
// from the worked example's own numbers, since this diagram's whole point
// is the -inf -> 0 masking mechanism, not another full worked computation.
const UNMASKED_ROWS = [
  [1, 0, 0, 0],
  [0.6, 0.4, 0, 0],
  [0.3, 0.3, 0.4, 0],
  [0.2, 0.3, 0.2, 0.3],
];

type Stage = 'scores' | 'masked' | 'softmax';

export default function CausalMaskAnimated() {
  const t = useVizTokens();
  const [stage, setStage] = useState<Stage>('softmax');
  const cellSize = 52;
  const n = TOKENS.length;
  const labelW = 64;
  const labelH = 28;

  const maskColor = getConceptColor(t, 'masked');
  const attnColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="Each query position (row) may only attend to itself and earlier key positions (column). Future positions are set to -infinity before softmax, so softmax(-infinity) = 0 -- not 'small', exactly zero probability.">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <VizButton variant={stage === 'scores' ? 'primary' : 'secondary'} onClick={() => setStage('scores')}>
          1. Raw scores
        </VizButton>
        <VizButton variant={stage === 'masked' ? 'primary' : 'secondary'} onClick={() => setStage('masked')}>
          2. Apply mask (-∞)
        </VizButton>
        <VizButton variant={stage === 'softmax' ? 'primary' : 'secondary'} onClick={() => setStage('softmax')}>
          3. Softmax
        </VizButton>
      </div>

      <svg width="100%" viewBox={`0 0 ${labelW + n * cellSize + (n - 1) * 2} ${labelH + n * cellSize + (n - 1) * 2}`} style={{ maxWidth: 420, display: 'block', margin: '0 auto' }}>
        {TOKENS.map((tok, c) => (
          <text key={`col-${c}`} x={labelW + c * (cellSize + 2) + cellSize / 2} y={labelH - 10} textAnchor="middle" fontSize={DIAGRAM_TYPE.secondaryLabel.size + 1} fontFamily={HAND_FONT} fill={t.textMuted}>
            {tok}
          </text>
        ))}
        {TOKENS.map((tok, r) => (
          <text key={`row-${r}`} x={labelW - 10} y={labelH + r * (cellSize + 2) + cellSize / 2 + 4} textAnchor="end" fontSize={DIAGRAM_TYPE.secondaryLabel.size + 1} fontFamily={HAND_FONT} fill={t.textMuted}>
            {tok}
          </text>
        ))}
        {TOKENS.map((_, r) =>
          TOKENS.map((_, c) => {
            const future = c > r;
            const x = labelW + c * (cellSize + 2);
            const y = labelH + r * (cellSize + 2);
            const prob = UNMASKED_ROWS[r][c];

            let fill: string;
            let label: string;
            if (stage === 'scores') {
              fill = valueColor(t, 'attention', future ? 0.5 : prob);
              label = future ? '?' : prob.toFixed(2);
            } else if (stage === 'masked') {
              fill = future ? t.surfaceAlt : valueColor(t, 'attention', prob);
              label = future ? '−∞' : prob.toFixed(2);
            } else {
              fill = future ? t.surfaceAlt : valueColor(t, 'attention', prob);
              label = future ? '0' : prob.toFixed(2);
            }

            return (
              <g key={`${r}-${c}`} style={{ transition: `all ${DIAGRAM_ANIMATION.normal}ms ${DIAGRAM_ANIMATION.easing}` }}>
                {/* fill here is real data (the probability-intensity
                    heatmap color), not decoration -- kept as a plain rect
                    so it keeps its CSS transition between stages and stays
                    an accurate color encoding. The SketchRect below adds
                    only the hand-drawn border on top, no fillColor (same
                    legibility fix as every other converted diagram). Its
                    own color (future ? maskColor : attnColor) doesn't
                    depend on `stage`, so it doesn't even regenerate on
                    stage clicks -- only the backing fill animates. */}
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={3}
                  fill={fill}
                  stroke="none"
                  style={{ transition: `all ${DIAGRAM_ANIMATION.normal}ms ${DIAGRAM_ANIMATION.easing}` }}
                />
                <SketchRect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  color={future ? maskColor : attnColor}
                  roughness={1.1}
                  strokeWidth={future ? 1.1 : 1.4}
                  id={`cma-cell-${r}-${c}`}
                />
                <text
                  x={x + cellSize / 2}
                  y={y + cellSize / 2 + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontFamily="monospace"
                  fontWeight={600}
                  fill={future ? t.textMuted : prob > 0.55 ? t.background : t.textPrimary}
                  opacity={future && stage === 'scores' ? 0.5 : 1}
                >
                  {label}
                </text>
              </g>
            );
          }),
        )}
      </svg>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <VisualizationMath
          latex={
            stage === 'scores'
              ? 'QK^T'
              : stage === 'masked'
                ? '\\text{mask}(QK^T)_{ij} = \\begin{cases} (QK^T)_{ij} & j \\le i \\\\ -\\infty & j > i \\end{cases}'
              : '\\mathrm{softmax}(-\\infty) = \\frac{e^{-\\infty}}{\\sum e^{(\\cdot)}} = \\frac{0}{\\sum e^{(\\cdot)}} = 0'
          }
        />
      </div>
    </VisualizationContainer>
  );
}
