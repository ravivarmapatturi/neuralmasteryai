import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const GRID = 8;
const CELL = 34;
const OBJ_SIZE = 3;
const START_R = 2;
const START_C = 2;

export default function OpticalFlowFieldDiagram() {
  const t = useVizTokens();
  const [dx, setDx] = useState(2);
  const [dy, setDy] = useState(1);

  const objColor = getConceptColor(t, 'attention');
  const flowColor = getConceptColor(t, 'query');

  const clampedDx = Math.max(-START_C, Math.min(GRID - OBJ_SIZE - START_C, dx));
  const clampedDy = Math.max(-START_R, Math.min(GRID - OBJ_SIZE - START_R, dy));

  const isObjCell = (r: number, c: number, dr: number, dc: number) => r >= START_R + dr && r < START_R + dr + OBJ_SIZE && c >= START_C + dc && c < START_C + dc + OBJ_SIZE;

  return (
    <VisualizationContainer footer={`Every pixel the object covers in frame 1 gets flow vector (${clampedDx}, ${clampedDy}) -- exactly the object's true displacement, since this is ground-truth motion (a known synthetic shift), not an estimate. Real optical-flow algorithms have to recover this same vector field from just the two images' pixel values, with no ground truth to check against -- that's the actual hard problem; the vector field itself, once computed, looks exactly like this.`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Slider label={`Motion dx`} value={dx} onChange={setDx} min={-3} max={3} format={(v) => `${v}`} />
        <Slider label={`Motion dy`} value={dy} onChange={setDy} min={-3} max={3} format={(v) => `${v}`} />
      </div>
      <svg width={GRID * CELL} height={GRID * CELL} viewBox={`0 0 ${GRID * CELL} ${GRID * CELL}`} className="nm-fit-svg" style={{ marginTop: 8, display: 'block' }}>
        {Array.from({ length: GRID }, (_, r) =>
          Array.from({ length: GRID }, (_, c) => {
            const cx = c * CELL + CELL / 2;
            const cy = r * CELL + CELL / 2;
            const onObj = isObjCell(r, c, 0, 0);
            return (
              <g key={`${r}-${c}`}>
                <rect x={c * CELL} y={r * CELL} width={CELL - 1} height={CELL - 1} fill={onObj ? `${objColor}33` : t.surfaceAlt} stroke={t.border} strokeWidth={0.5} />
                {onObj ? (
                  <>
                    <line
                      x1={cx}
                      y1={cy}
                      x2={cx + clampedDx * CELL}
                      y2={cy + clampedDy * CELL}
                      stroke={flowColor}
                      strokeWidth={2}
                      markerEnd="url(#flow-arrow)"
                    />
                  </>
                ) : (
                  <circle cx={cx} cy={cy} r={1.5} fill={t.textMuted} opacity={0.4} />
                )}
              </g>
            );
          }),
        )}
        <defs>
          <marker id="flow-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={flowColor} />
          </marker>
        </defs>
        <rect x={(START_C + clampedDx) * CELL} y={(START_R + clampedDy) * CELL} width={OBJ_SIZE * CELL} height={OBJ_SIZE * CELL} fill="none" stroke={objColor} strokeWidth={2} strokeDasharray="4 3" />
      </svg>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 6 }}>
        Solid box: frame 1 position. Dashed box: frame 2 position. Arrows: the per-pixel flow field.
      </div>
    </VisualizationContainer>
  );
}
