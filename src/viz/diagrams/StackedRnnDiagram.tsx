import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const LAYERS = 3;
const STEPS = 4;
const LAYER_COLORS = (t: ReturnType<typeof useVizTokens>) => [getConceptColor(t, 'token'), getConceptColor(t, 'query'), getConceptColor(t, 'attention')];

/** Depth applied to recurrence: each layer's full OUTPUT SEQUENCE becomes
 * the next layer's INPUT SEQUENCE -- not just its final hidden state. Hover
 * a layer to see which arrows are actually its input vs. its output. */
export default function StackedRnnDiagram() {
  const t = useVizTokens();
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null);
  const colors = LAYER_COLORS(t);

  const width = 520;
  const height = 260;
  const layerGap = 70;
  const topY = 40;
  const layerY = (l: number) => topY + l * layerGap;
  const stepX = (i: number) => 90 + i * ((width - 90 - 30) / (STEPS - 1));

  return (
    <VisualizationContainer footer="Hover a layer -- its input arrows come from the layer below (or raw tokens for layer 1), its output arrows feed the layer above. Each layer builds a progressively more abstract sequence representation, the same way depth helps any network.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="stacked-arrow-input" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
          {colors.map((c, i) => (
            <marker key={i} id={`stacked-arrow-${i}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill={c} />
            </marker>
          ))}
        </defs>

        {Array.from({ length: LAYERS }, (_, l) => {
          const y = layerY(LAYERS - 1 - l);
          const color = colors[l];
          const isHovered = hoveredLayer === l;
          const dim = hoveredLayer !== null && !isHovered;
          return (
            <g key={l} onMouseEnter={() => setHoveredLayer(l)} onMouseLeave={() => setHoveredLayer(null)} style={{ cursor: 'pointer' }} opacity={dim ? 0.3 : 1}>
              <text x={20} y={y + 4} fontSize={9} fontFamily="monospace" fontWeight={700} fill={color}>L{l + 1}</text>
              {Array.from({ length: STEPS }, (_, i) => {
                const x = stepX(i);
                return (
                  <g key={i}>
                    {i > 0 && <line x1={stepX(i - 1) + 20} y1={y} x2={x - 22} y2={y} stroke={color} strokeWidth={1.5} markerEnd={`url(#stacked-arrow-${l})`} />}
                    <rect x={x - 20} y={y - 14} width={40} height={28} rx={6} fill={isHovered ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isHovered ? 2.5 : 1.5} />
                    <text x={x} y={y + 4} textAnchor="middle" fontSize={9.5} fontWeight={600} fontFamily="monospace" fill={color}>
                      h{l + 1}_{i + 1}
                    </text>
                    {l < LAYERS - 1 && (
                      <line x1={x} y1={y - 14} x2={x} y2={layerY(LAYERS - 2 - l) + 16} stroke={color} strokeWidth={isHovered || hoveredLayer === l + 1 ? 2.5 : 1} markerEnd={`url(#stacked-arrow-${l})`} opacity={hoveredLayer === null || isHovered || hoveredLayer === l + 1 ? 0.9 : 0.2} />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {Array.from({ length: STEPS }, (_, i) => {
          const x = stepX(i);
          const y = layerY(LAYERS) - 20;
          return (
            <g key={`in${i}`}>
              <line x1={x} y1={y - 6} x2={x} y2={layerY(LAYERS - 1) + 16} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#stacked-arrow-input)" opacity={hoveredLayer === null || hoveredLayer === 0 ? 0.8 : 0.2} />
              <text x={x} y={y + 6} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={t.textMuted}>x{i + 1}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        {hoveredLayer !== null
          ? hoveredLayer === 0
            ? 'Layer 1 reads the raw input sequence x_1..x_T'
            : `Layer ${hoveredLayer + 1} reads layer ${hoveredLayer}'s full output sequence as its input`
          : 'Each layer\'s output sequence becomes the next layer\'s input sequence, not just its final hidden state.'}
      </div>
    </VisualizationContainer>
  );
}
