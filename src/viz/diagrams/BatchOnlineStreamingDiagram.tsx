import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { SelectableRow, VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Mode = 'batch' | 'online' | 'streaming';
const MODES: { key: Mode; label: string; latency: number; throughput: number; desc: string; example: string }[] = [
  { key: 'batch', label: 'Batch', latency: 1, throughput: 3, desc: 'Run on a large accumulated dataset on a schedule -- no latency pressure, optimized purely for throughput.', example: 'Nightly recommendation refresh for all users' },
  { key: 'online', label: 'Online (real-time)', latency: 3, throughput: 1, desc: 'A live API call gets a prediction back synchronously, within a latency budget (often <100ms).', example: 'A fraud-check API called during checkout' },
  { key: 'streaming', label: 'Streaming', latency: 3, throughput: 2, desc: 'Predictions computed continuously as new events arrive on a stream -- no waiting for a batch window.', example: 'Real-time fraud detection on a Kafka event stream' },
];

function Dots({ n, color, t }: { n: number; color: string; t: ReturnType<typeof useVizTokens> }) {
  return <div style={{ display: 'flex', gap: 2 }}>{[1, 2, 3].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= n ? color : t.border }} />)}</div>;
}

/** Three inference modes on the two axes that actually separate them --
 * click one for a real example and the tradeoff it's making. */
export default function BatchOnlineStreamingDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState<Mode>('online');
  const color = getConceptColor(t, 'attention');
  const active = MODES.find((m) => m.key === selected)!;

  return (
    <VisualizationContainer footer={`${active.desc} Example: ${active.example}.`}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {MODES.map((m) => {
          const isSelected = selected === m.key;
          return (
            <SelectableRow key={m.key} selected={isSelected} label={m.label} onSelect={() => setSelected(m.key)} onMouseEnter={() => setSelected(m.key)} style={{ flex: '1 1 150px', padding: '0.7rem 0.85rem', borderRadius: 8, background: isSelected ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}` }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color }}>{m.label}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9.5, color: t.textMuted }}>
                <span>latency <Dots n={m.latency} color={color} t={t} /></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9.5, color: t.textMuted }}>
                <span>throughput <Dots n={m.throughput} color={color} t={t} /></span>
              </div>
            </SelectableRow>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        "Latency" here = how urgent the response is (higher = more urgent); "throughput" = how much total volume the mode is optimized to push through.
      </div>
    </VisualizationContainer>
  );
}
