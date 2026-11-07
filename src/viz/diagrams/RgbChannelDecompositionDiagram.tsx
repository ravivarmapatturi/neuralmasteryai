import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

type View = 'rgb' | 'r' | 'g' | 'b' | 'gray';

const SIZE = 6;
const CELL = 34;

// A synthetic 6x6 image: four colored quadrants plus a diagonal blend --
// enough structure that each channel view looks genuinely different.
function pixelAt(r: number, c: number): [number, number, number] {
  const red = c < SIZE / 2 ? 220 : 40;
  const green = r < SIZE / 2 ? 200 : 30;
  const blue = Math.round(((r + c) / (2 * (SIZE - 1))) * 220);
  return [red, green, blue];
}

export default function RgbChannelDecompositionDiagram() {
  const t = useVizTokens();
  const [view, setView] = useState<View>('rgb');

  const colorFor = (r: number, c: number): string => {
    const [red, green, blue] = pixelAt(r, c);
    if (view === 'rgb') return `rgb(${red},${green},${blue})`;
    if (view === 'r') return `rgb(${red},${red},${red})`;
    if (view === 'g') return `rgb(${green},${green},${green})`;
    if (view === 'b') return `rgb(${blue},${blue},${blue})`;
    const gray = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
    return `rgb(${gray},${gray},${gray})`;
  };

  return (
    <VisualizationContainer footer="A color image is really three stacked grayscale grids (height × width × 3), one per channel -- the R/G/B views above are literally just one of those three grids rendered alone. Grayscale isn't a fourth channel, it's a weighted blend of all three (human vision is far more sensitive to green than red or blue, hence the uneven weights).">
      <PillSelect<View>
        label="Channel view"
        value={view}
        onChange={setView}
        options={[
          { value: 'rgb', label: 'RGB (all channels)' },
          { value: 'r', label: 'Red only' },
          { value: 'g', label: 'Green only' },
          { value: 'b', label: 'Blue only' },
          { value: 'gray', label: 'Grayscale' },
        ]}
      />
      <svg width={SIZE * CELL} height={SIZE * CELL} viewBox={`0 0 ${SIZE * CELL} ${SIZE * CELL}`} className="nm-fit-svg" style={{ marginTop: 8, display: 'block' }}>
        {Array.from({ length: SIZE }, (_, r) =>
          Array.from({ length: SIZE }, (_, c) => (
            <rect key={`${r}-${c}`} x={c * CELL} y={r * CELL} width={CELL - 1} height={CELL - 1} fill={colorFor(r, c)} stroke={t.border} strokeWidth={0.5} />
          )),
        )}
      </svg>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 6 }}>
        6×6×3 array — height × width × channels, the shape every downstream CNN layer operates on.
      </div>
    </VisualizationContainer>
  );
}
