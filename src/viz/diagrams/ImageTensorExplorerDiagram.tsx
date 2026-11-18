import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';

const VIEWS = ['rgb', 'gray', 'normalized'] as const;

export default function ImageTensorExplorerDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(VIEWS.length, 3200);
  const [userView, setUserView] = useState<typeof VIEWS[number] | null>(null);
  const view = userView ?? VIEWS[autoIdx];
  const vals = [[28, 64, 120, 190], [42, 90, 164, 224], [15, 48, 118, 205], [8, 32, 96, 178]];
  const channel = view === 'rgb' ? ['R', 'G', 'B'] : [view === 'gray' ? 'gray' : 'z-score'];

  return (
    <VisualizationContainer footer={view === 'normalized' ? 'Networks consume floating values aligned to the training distribution, not raw 0–255 bytes.' : view === 'gray' ? 'A grayscale image has one intensity channel; discard color only when it is irrelevant to the task.' : 'A color image is a height × width × 3 tensor: separate red, green, and blue values at every pixel.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {VIEWS.map(v => (
          <VizButton key={v} variant={view === v ? 'primary' : 'secondary'} onClick={() => setUserView(v)}>
            {v === 'rgb' ? 'RGB tensor' : v === 'gray' ? 'grayscale' : 'normalized'}
          </VizButton>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        {channel.map((name, ci) => (
          <div key={name}>
            <div style={{ color: t.textSecondary, textAlign: 'center', fontSize: 11, marginBottom: 4 }}>{name} channel</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 28px)', gap: 2 }}>
              {vals.flatMap((row, r) => row.map((v, col) => {
                const n = view === 'normalized' ? (v / 255 * 2 - 1).toFixed(1) : v;
                const color = view === 'rgb' ? `rgb(${ci === 0 ? v : 30}, ${ci === 1 ? v : 30}, ${ci === 2 ? v : 30})` : `rgb(${v}, ${v}, ${v})`;
                return (
                  <div key={`${r}-${col}`} style={{ width: 28, height: 28, background: color, color: v > 130 ? '#111' : '#fff', display: 'grid', placeItems: 'center', fontSize: 8 }}>
                    {n}
                  </div>
                );
              }))}
            </div>
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
