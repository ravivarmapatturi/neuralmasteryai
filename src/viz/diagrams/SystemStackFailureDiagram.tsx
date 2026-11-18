import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const LAYERS = [
  { name: 'CPU', note: 'Why a training job is slow even though "the GPU is only at 40% utilization" -- the CPU-bound data pipeline feeding it is the actual bottleneck.' },
  { name: 'RAM', note: 'Why a dataloader thrashes or a process gets OOM-killed -- virtual memory, paging, and how much fits in RAM at once.' },
  { name: 'PCIe', note: 'Why moving data from host RAM to GPU memory has real, measurable overhead -- not free, and a real cost in a tight training loop.' },
  { name: 'GPU', note: "Why a model's forward pass is fast but the surrounding pipeline isn't -- the GPU itself is rarely the bottleneck once you know what to check." },
  { name: 'VRAM', note: 'Why "out of memory" happens on the GPU specifically, independent of how much system RAM is free -- a completely separate, usually smaller pool.' },
  { name: 'network', note: 'Why an inference server\'s p99 latency is terrible despite a fast median -- network variance, not the model, dominates tail latency.' },
  { name: 'distributed workers', note: 'Why a distributed job hangs instead of crashing -- partial failure, stragglers, and network partitions have no clean single-process equivalent.' },
];

export default function SystemStackFailureDiagram() {
  const t = useVizTokens();
  const { value: selected, pick: setSelected, stop } = useAutoCycle(LAYERS.length, 2500, 0);
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={LAYERS[selected].note}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {LAYERS.map((layer, i) => (
          <div key={layer.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              onClick={() => {
                stop();
                setSelected(i);
              }}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                background: selected === i ? `${color}18` : t.surfaceAlt,
                border: `1.5px solid ${selected === i ? color : t.border}`,
                cursor: 'pointer',
                fontWeight: selected === i ? 700 : 400,
                color: selected === i ? color : t.textPrimary,
                fontFamily: 'monospace',
                fontSize: 13,
                minWidth: 160,
                textAlign: 'center',
              }}
            >
              {layer.name}
            </div>
            {i < LAYERS.length - 1 && <div style={{ color: t.textMuted, fontSize: 12 }}>↓</div>}
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
