import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const LAYERS = [
  { key: 'conv1d', label: 'Conv1D', desc: 'Convolution along a single axis (time or sequence) -- audio, time series, text convolutions.' },
  { key: 'conv2d', label: 'Conv2D', desc: 'The standard image convolution, sliding a 2D filter across height and width -- the core layer of every CNN.' },
  { key: 'conv3d', label: 'Conv3D', desc: 'Convolution across height, width, AND an additional axis (depth or time) -- volumetric medical scans and video.' },
  { key: 'depthwise', label: 'Depthwise Separable', desc: 'Factors a standard convolution into a depthwise (per-channel, spatial) step and a pointwise (1×1, channel-mixing) step -- dramatically cheaper, MobileNet\'s core layer.' },
  { key: 'transposed', label: 'Transposed Conv', desc: 'Upsamples rather than downsamples -- expands a smaller feature map back to a larger spatial size. U-Net decoders and GAN/diffusion generators.' },
  { key: 'pooling', label: 'Pooling', desc: 'Downsamples by taking the max or average value in each local region -- reduces spatial size and parameter count downstream.' },
];

/** Six convolutional layer types -- click one for what axis it
 * operates on and where it's actually used. */
export default function ConvolutionalLayersCatalogDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(LAYERS.length, 2300);
  const active = LAYERS[cycle.value].key;
  const setActive = (key: string) => cycle.pick(LAYERS.findIndex((layer) => layer.key === key));
  const color = getConceptColor(t, 'attention');
  const l = LAYERS.find((x) => x.key === active)!;

  return (
    <VisualizationContainer footer={l.desc}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {LAYERS.map((x) => {
          const isActive = active === x.key;
          return (
            <div key={x.key} onClick={() => setActive(x.key)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(x.key); } }} onMouseEnter={() => setActive(x.key)} style={{ cursor: 'pointer', padding: '0.5rem 0.6rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}>
              <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
