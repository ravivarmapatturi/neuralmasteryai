import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchRect } from '../../components/notebook/RoughShape';

const TOKENS = ['The', 'cat', 'sat', '<pad>', '<pad>'];

/** A real token may attend to any real token, in either direction -- but
 * never to a <pad> placeholder (as query OR key), since padding carries no
 * information. Unlike the causal mask, this one isn't triangular: it's
 * whole rows/columns blocked, not a future/past split. */
export default function PaddingMaskDiagram() {
  const t = useVizTokens();
  const cellSize = 44;
  const n = TOKENS.length;
  const labelW = 60;
  const labelH = 26;
  const maskColor = getConceptColor(t, 'masked');
  const attnColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="Rows and columns for <pad> positions are blocked entirely -- a real token never attends to padding, and padding never produces a meaningful output either.">
      <svg
        width="100%"
        viewBox={`0 0 ${labelW + n * cellSize + (n - 1) * 2} ${labelH + n * cellSize + (n - 1) * 2}`}
        style={{ maxWidth: 380, display: 'block', margin: '0 auto' }}
      >
        {TOKENS.map((tok, c) => (
          <text key={`col-${c}`} x={labelW + c * (cellSize + 2) + cellSize / 2} y={labelH - 9} textAnchor="middle" fontSize={DIAGRAM_TYPE.secondaryLabel.size} fill={tok === '<pad>' ? maskColor : t.textMuted}>
            {tok}
          </text>
        ))}
        {TOKENS.map((tok, r) => (
          <text key={`row-${r}`} x={labelW - 10} y={labelH + r * (cellSize + 2) + cellSize / 2 + 4} textAnchor="end" fontSize={DIAGRAM_TYPE.secondaryLabel.size} fill={tok === '<pad>' ? maskColor : t.textMuted}>
            {tok}
          </text>
        ))}
        {TOKENS.map((rowTok, r) =>
          TOKENS.map((colTok, c) => {
            const blocked = rowTok === '<pad>' || colTok === '<pad>';
            const x = labelW + c * (cellSize + 2);
            const y = labelH + r * (cellSize + 2);
            return (
              <g key={`${r}-${c}`}>
                {/* Plain (non-rough) backing rect for the soft color wash --
                    a rough.js hachure fill here would repeat the exact
                    text-legibility bug already found and fixed on
                    LoopGraphAnatomyDiagram (diagonal fill strokes
                    colliding with the ✓/−∞ glyph). The SketchRect below
                    draws only the hand-drawn border, no fill. */}
                <rect x={x} y={y} width={cellSize} height={cellSize} rx={3} fill={blocked ? t.surfaceAlt : `${attnColor}22`} stroke="none" />
                <SketchRect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  color={blocked ? maskColor : attnColor}
                  roughness={1.1}
                  strokeWidth={blocked ? 1.2 : 1.5}
                  id={`pad-cell-${r}-${c}`}
                />
                <text x={x + cellSize / 2} y={y + cellSize / 2 + 4} textAnchor="middle" fontSize={12} fontFamily="monospace" fontWeight={600} fill={blocked ? t.textMuted : t.textPrimary} opacity={blocked ? 0.6 : 1}>
                  {blocked ? '−∞' : '✓'}
                </text>
              </g>
            );
          }),
        )}
      </svg>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <VisualizationMath latex="\text{mask}(QK^T)_{ij} = -\infty \quad \text{if } i \text{ or } j \text{ is } \texttt{<pad>}" />
      </div>
    </VisualizationContainer>
  );
}
