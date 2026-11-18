import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

export interface EcosystemLayer {
  label: string;
  desc: string;
  covered: boolean; // real dedicated page(s) exist elsewhere on this site vs. briefly covered inline on this page
}

/** A vertical, click-through map of the layers a real production system
 * is built from, top (the user) to bottom (infrastructure/operations) --
 * the same "read-order map, real description on click/hover" pattern as
 * DatabasesSectionMapDiagram, extended to a full-stack list instead of
 * one section's four pages. Solid rows have real dedicated depth
 * elsewhere on this site (this page links out); dashed rows are covered
 * briefly, inline, on this page itself -- the visual distinction matches
 * how the prose below actually behaves, not decoration. */
export default function EcosystemMapDiagram({ layers }: { layers: EcosystemLayer[] }) {
  const t = useVizTokens();
  const { value: selected, pick, stop } = useAutoCycle(layers.length, 2500, 0);
  const color = getConceptColor(t, 'attention');
  const mutedColor = t.textMuted;

  const rowH = 34;
  const gap = 6;
  const width = 560;
  const height = layers.length * (rowH + gap) + 10;

  return (
    <VisualizationContainer footer={layers[selected].desc}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="ecosystem-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={mutedColor} />
          </marker>
        </defs>
        {layers.map((layer, i) => {
          const y = 5 + i * (rowH + gap);
          const isSelected = selected === i;
          const rowColor = layer.covered ? color : mutedColor;
          return (
            <g key={layer.label}>
              {i > 0 && (
                <line
                  x1={width / 2}
                  y1={y - gap}
                  x2={width / 2}
                  y2={y}
                  stroke={mutedColor}
                  strokeWidth={1.5}
                  markerEnd="url(#ecosystem-arrow)"
                />
              )}
              <g onClick={() => { stop(); pick(i); }} onMouseEnter={() => { stop(); pick(i); }} style={{ cursor: 'pointer' }}>
                <rect
                  x={20}
                  y={y}
                  width={width - 40}
                  height={rowH}
                  rx={7}
                  fill={isSelected ? `${rowColor}25` : t.surfaceAlt}
                  stroke={rowColor}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeDasharray={layer.covered ? undefined : '4 3'}
                  style={{ transition: 'all 0.25s ease' }}
                />
                <text x={35} y={y + rowH / 2 + 4} fontSize={11} fontWeight={isSelected ? 700 : 600} fill={rowColor}>
                  {layer.label}
                </text>
                {!layer.covered && (
                  <text x={width - 35} y={y + rowH / 2 + 4} textAnchor="end" fontSize={8} fill={mutedColor}>
                    covered below
                  </text>
                )}
              </g>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Click a layer. Solid = real dedicated depth elsewhere on this site. Dashed = covered briefly, inline, right here.
      </div>
    </VisualizationContainer>
  );
}
