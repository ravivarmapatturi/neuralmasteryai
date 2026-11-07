import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Pattern = 'vertical' | 'horizontal' | 'diagonal';

const IMG_SIZE = 12;
const CELL_PX = 4; // pixels per HOG cell
const N_CELLS = IMG_SIZE / CELL_PX;
const N_BINS = 8;

function buildImage(pattern: Pattern): number[][] {
  return Array.from({ length: IMG_SIZE }, (_, r) =>
    Array.from({ length: IMG_SIZE }, (_, c) => {
      if (pattern === 'vertical') return c < IMG_SIZE / 2 ? 0.15 : 0.9;
      if (pattern === 'horizontal') return r < IMG_SIZE / 2 ? 0.15 : 0.9;
      return r + c < IMG_SIZE ? 0.15 : 0.9;
    }),
  );
}

/** Real gradient computation (finite differences) and real per-cell,
 * magnitude-weighted orientation histogram (unsigned, 0-180 degrees, the
 * standard HOG convention) -- not a canned illustration. */
function computeCellHistograms(img: number[][]): number[][][] {
  const cells: number[][][] = Array.from({ length: N_CELLS }, () => Array.from({ length: N_CELLS }, () => Array(N_BINS).fill(0)));
  for (let r = 1; r < IMG_SIZE - 1; r++) {
    for (let c = 1; c < IMG_SIZE - 1; c++) {
      const ix = img[r][c + 1] - img[r][c - 1];
      const iy = img[r + 1][c] - img[r - 1][c];
      const magnitude = Math.hypot(ix, iy);
      if (magnitude < 1e-6) continue;
      let angle = (Math.atan2(iy, ix) * 180) / Math.PI;
      if (angle < 0) angle += 180; // unsigned gradient
      if (angle >= 180) angle -= 180;
      const bin = Math.min(N_BINS - 1, Math.floor(angle / (180 / N_BINS)));
      cells[Math.floor(r / CELL_PX)][Math.floor(c / CELL_PX)][bin] += magnitude;
    }
  }
  return cells;
}

const CELL_DRAW = 44;

export default function HogFeatureDiagram() {
  const t = useVizTokens();
  const [pattern, setPattern] = useState<Pattern>('diagonal');
  const img = buildImage(pattern);
  const cells = computeCellHistograms(img);
  const maxMag = Math.max(...cells.flat(2), 1e-6);
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="Each cell's starburst is a real, computed histogram of gradient orientations within that 4x4-pixel cell -- line length is the summed gradient magnitude in that direction, line angle is the bin's orientation. Concatenating every cell's histogram into one long vector is the HOG descriptor -- a compact summary of 'which directions do the edges point, and how strongly' at every location in the image.">
      <PillSelect<Pattern>
        label="Edge pattern"
        value={pattern}
        onChange={setPattern}
        options={[
          { value: 'vertical', label: 'Vertical edge' },
          { value: 'horizontal', label: 'Horizontal edge' },
          { value: 'diagonal', label: 'Diagonal edge' },
        ]}
      />
      <svg width={N_CELLS * CELL_DRAW} height={N_CELLS * CELL_DRAW} viewBox={`0 0 ${N_CELLS * CELL_DRAW} ${N_CELLS * CELL_DRAW}`} className="nm-fit-svg" style={{ marginTop: 8, display: 'block' }}>
        {cells.map((row, r) =>
          row.map((bins, c) => {
            const cx = c * CELL_DRAW + CELL_DRAW / 2;
            const cy = r * CELL_DRAW + CELL_DRAW / 2;
            return (
              <g key={`${r}-${c}`}>
                <rect x={c * CELL_DRAW} y={r * CELL_DRAW} width={CELL_DRAW - 1} height={CELL_DRAW - 1} fill={t.surfaceAlt} stroke={t.border} strokeWidth={0.5} />
                {bins.map((mag, bin) => {
                  if (mag < 1e-6) return null;
                  const angleRad = (bin * (180 / N_BINS) * Math.PI) / 180;
                  const len = (mag / maxMag) * (CELL_DRAW / 2 - 4);
                  const dx = Math.cos(angleRad) * len;
                  const dy = Math.sin(angleRad) * len;
                  return <line key={bin} x1={cx - dx} y1={cy - dy} x2={cx + dx} y2={cy + dy} stroke={color} strokeWidth={1.5} opacity={0.85} />;
                })}
              </g>
            );
          }),
        )}
      </svg>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 6 }}>
        {N_CELLS}×{N_CELLS} cells, {N_BINS} orientation bins each — a {N_CELLS * N_CELLS * N_BINS}-dimensional HOG descriptor for this tiny image.
      </div>
    </VisualizationContainer>
  );
}
