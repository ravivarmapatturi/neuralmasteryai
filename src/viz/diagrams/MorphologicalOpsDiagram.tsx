import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

type Op = 'original' | 'erosion' | 'dilation' | 'opening' | 'closing';

const SIZE = 11;

function buildOriginal(): number[][] {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  // A solid 7x7 blob -- big enough that a centered hole doesn't erode the
  // entire blob away to nothing (a 7x7 blob's one-pixel erosion still
  // leaves a 5x5 interior; only the hole's immediate 3x3 neighborhood
  // within that interior dies, leaving a ring, not an empty grid)...
  for (let r = 2; r <= 8; r++) for (let c = 2; c <= 8; c++) grid[r][c] = 1;
  // ...with a small hole dead center...
  grid[5][5] = 0;
  // ...and an isolated noise speck placed with a 1-cell margin on every
  // side, so dilating it isn't clipped by the grid edge (which matters for
  // the closing example below to behave as described).
  grid[1][9] = 1;
  return grid;
}
const ORIGINAL = buildOriginal();

function erode(g: number[][]): number[][] {
  return g.map((row, r) =>
    row.map((_, c) => {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE || g[rr][cc] === 0) return 0;
        }
      }
      return 1;
    }),
  );
}
function dilate(g: number[][]): number[][] {
  return g.map((row, r) =>
    row.map((_, c) => {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && g[rr][cc] === 1) return 1;
        }
      }
      return 0;
    }),
  );
}

const RESULTS: Record<Op, number[][]> = {
  original: ORIGINAL,
  erosion: erode(ORIGINAL),
  dilation: dilate(ORIGINAL),
  opening: dilate(erode(ORIGINAL)),
  closing: erode(dilate(ORIGINAL)),
};

const EXPLAIN: Record<Op, string> = {
  original: 'The starting binary image: a solid blob with a small hole inside it, plus an isolated single-pixel noise speck far away.',
  erosion: 'Every pixel must have its entire 3x3 neighborhood "on" to survive -- the blob shrinks from its edges, the hole grows, and the noise speck (which has no "on" neighbors) disappears entirely.',
  dilation: 'Any pixel with even one "on" neighbor turns on -- the blob grows, the small hole gets filled in, but the noise speck also grows into a small blob of its own.',
  opening: 'Erosion then dilation: the noise speck is erased by the erosion step and never comes back (dilating nothing gives nothing) -- but the blob roughly returns to its original size. The standard "remove small noise" operation.',
  closing: 'Dilation then erosion: the hole gets filled by the dilation step and stays filled -- but the noise speck, having grown in the dilation step, does NOT fully disappear in the erosion step. The standard "fill small gaps" operation.',
};

const CELL = 24;

export default function MorphologicalOpsDiagram() {
  const t = useVizTokens();
  const [op, setOp] = useState<Op>('original');
  const grid = RESULTS[op];

  return (
    <VisualizationContainer footer={EXPLAIN[op]}>
      <PillSelect<Op>
        label="Operation"
        value={op}
        onChange={setOp}
        options={[
          { value: 'original', label: 'Original' },
          { value: 'erosion', label: 'Erosion' },
          { value: 'dilation', label: 'Dilation' },
          { value: 'opening', label: 'Opening' },
          { value: 'closing', label: 'Closing' },
        ]}
      />
      <svg width={SIZE * CELL} height={SIZE * CELL} viewBox={`0 0 ${SIZE * CELL} ${SIZE * CELL}`} className="nm-fit-svg" style={{ marginTop: 8, display: 'block' }}>
        {grid.map((row, r) =>
          row.map((v, c) => (
            <rect key={`${r}-${c}`} x={c * CELL} y={r * CELL} width={CELL - 1} height={CELL - 1} fill={v ? t.accentPrimary : t.surfaceAlt} stroke={t.border} strokeWidth={0.5} />
          )),
        )}
      </svg>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 6 }}>
        3×3 structuring element (a full square) applied to every pixel.
      </div>
    </VisualizationContainer>
  );
}
