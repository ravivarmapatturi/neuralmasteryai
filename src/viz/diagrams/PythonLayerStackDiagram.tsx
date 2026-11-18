import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { getConceptColor } from './diagramSystem';
import { VisualizationContainer, useAutoCycle } from '../primitives';

interface Layer {
  name: string;
  reuses: string;
}
const LAYERS: Layer[] = [
  { name: 'Python (this section)', reuses: 'The foundation everything else is written in -- language features, concurrency model, packaging.' },
  { name: 'NumPy', reuses: 'Reuses Python\'s object model and iterator protocol, but the core habit -- "avoid the for loop, reach for the array operation" -- is what every layer above inherits.' },
  { name: 'PyTorch', reuses: "Reuses NumPy's exact vectorization habit and deliberately mirrors its tensor API, adding autograd and a GPU backend on top." },
  { name: 'Production Python', reuses: 'Reuses everything below, wrapped in the packaging, testing, and tooling practices that make it something a team can run for years, not just a notebook cell.' },
];

export default function PythonLayerStackDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, pick: setAutoIdx, stop } = useAutoCycle(LAYERS.length, 2800, 0);
  const [userSelected, setUserSelected] = useState<number | null>(null);
  const selected = userSelected ?? autoIdx;
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={LAYERS[selected].reuses}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {LAYERS.map((layer, i) => (
          <div
            key={layer.name}
            onClick={() => {
              stop();
              setUserSelected(i);
              setAutoIdx(i);
            }}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              background: selected === i ? `${color}18` : t.surfaceAlt,
              border: `1.5px solid ${selected === i ? color : t.border}`,
              cursor: 'pointer',
              fontWeight: selected === i ? 700 : 400,
              color: selected === i ? color : t.textPrimary,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: t.textMuted }}>{i + 1}</span>
            {layer.name}
            {i < LAYERS.length - 1 && <span style={{ marginLeft: 'auto', color: t.textMuted }}>↓ builds on this</span>}
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
