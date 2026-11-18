import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';

type Arch = '3dcnn' | 'twostream' | 'transformer';

const ARCHES: Record<Arch, { name: string; input: string; mechanism: string; note: string }> = {
  '3dcnn': {
    name: '3D CNN',
    input: 'A stacked clip of frames (height × width × time)',
    mechanism: 'Convolves across height, width, AND time simultaneously -- the kernel itself has a temporal extent, so a single layer already mixes information across a few adjacent frames.',
    note: 'Conceptually the simplest extension of a 2D CNN -- but 3D kernels are expensive, and effective temporal receptive field grows slowly without deep stacks.',
  },
  twostream: {
    name: 'Two-Stream',
    input: 'RGB frames (appearance) + a separately computed optical flow field (motion)',
    mechanism: 'Two separate CNNs process appearance and motion independently, then their predictions are fused (typically averaged or combined in a final layer).',
    note: 'Explicitly hands the network pre-computed motion information (via optical flow) rather than making it learn to infer motion from raw RGB alone.',
  },
  transformer: {
    name: 'Video Transformer',
    input: 'A sequence of spatial patches across all sampled frames, flattened into one long token sequence',
    mechanism: 'Self-attention operates across both space (patches within a frame) and time (the same patch position across frames) -- can be factorized into separate spatial and temporal attention for efficiency.',
    note: 'Same attention mechanism as image ViTs, extended with a time axis -- benefits from the same pretraining-at-scale advantages ViTs show for images.',
  },
};

const ARCH_KEYS: Arch[] = ['3dcnn', 'twostream', 'transformer'];

export default function VideoUnderstandingArchitectureDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(ARCH_KEYS.length, 3500);
  const [userArch, setUserArch] = useState<Arch | null>(null);
  const arch = userArch ?? ARCH_KEYS[autoIdx];
  const info = ARCHES[arch];

  return (
    <VisualizationContainer footer={info.note}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {ARCH_KEYS.map((k) => (
          <VizButton key={k} variant={arch === k ? 'primary' : 'secondary'} onClick={() => setUserArch(k)}>
            {ARCHES[k].name}
          </VizButton>
        ))}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <tbody>
          <tr>
            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: 600, verticalAlign: 'top', width: 90 }}>Input</td>
            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, color: t.textPrimary }}>{info.input}</td>
          </tr>
          <tr>
            <td style={{ padding: '8px 10px', color: t.textMuted, fontWeight: 600, verticalAlign: 'top' }}>Mechanism</td>
            <td style={{ padding: '8px 10px', color: t.textPrimary }}>{info.mechanism}</td>
          </tr>
        </tbody>
      </table>
    </VisualizationContainer>
  );
}
