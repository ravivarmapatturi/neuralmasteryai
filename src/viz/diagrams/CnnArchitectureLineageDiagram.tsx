import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const ARCHS = [
  { key: 'lenet', year: '1998', label: 'LeNet', innovation: 'The original proof-of-concept -- two conv/pool stages feeding two fully-connected layers. Tiny, but the template everything else descends from.' },
  { key: 'alexnet', year: '2012', label: 'AlexNet', innovation: 'The deep learning boom starts here -- ReLU, dropout, and GPU training at ImageNet scale.' },
  { key: 'zfnet', year: '2013', label: 'ZFNet', innovation: 'A tuned AlexNet, paired with deconvolution visualizations that showed what early filters actually learn.' },
  { key: 'vgg', year: '2014', label: 'VGGNet', innovation: 'A deep stack of uniform 3×3 filters beats fewer, larger filters -- more depth, fewer parameters, an extra nonlinearity per layer.' },
  { key: 'inception', year: '2014', label: 'GoogLeNet/Inception', innovation: 'Run several filter sizes in parallel at each stage and concatenate -- let the network pick the useful scale.' },
  { key: 'resnet', year: '2015', label: 'ResNet', innovation: 'Residual/skip connections solve the degradation problem -- enabled networks over 100 layers deep for the first time.' },
  { key: 'densenet', year: '2016', label: 'DenseNet', innovation: 'Every layer receives ALL preceding layers\' feature maps -- maximum feature reuse, at the cost of memory.' },
  { key: 'mobilenet', year: '2017', label: 'MobileNet', innovation: 'Depthwise separable convolutions -- roughly the same representational power at a fraction of the compute, built for phones.' },
  { key: 'efficientnet', year: '2019', label: 'EfficientNet', innovation: 'Compound scaling -- depth, width, and resolution scaled together via one coefficient, for the best accuracy-per-FLOP.' },
  { key: 'convnext', year: '2022', label: 'ConvNeXt', innovation: 'A modernized plain ResNet, borrowing ViT-era design choices -- shows a "pure" CNN can match ViT accuracy without attention.' },
];

/** Ten architectures across 24 years, each solving a specific
 * limitation of the one before -- click through the lineage. */
export default function CnnArchitectureLineageDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(ARCHS.length, 2200, 5);
  const active = ARCHS[cycle.value].key;
  const setActive = (key: string) => cycle.pick(ARCHS.findIndex((arch) => arch.key === key));
  const color = getConceptColor(t, 'attention');
  const a = ARCHS.find((x) => x.key === active)!;

  return (
    <VisualizationContainer footer={a.innovation}>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 10 }}>
        {ARCHS.map((x) => {
          const isActive = active === x.key;
          return (
            <div key={x.key} onClick={() => setActive(x.key)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(x.key); } }} onMouseEnter={() => setActive(x.key)} style={{ cursor: 'pointer', padding: '0.4rem 0.5rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 7.5, color: t.textMuted }}>{x.year}</div>
              <div style={{ fontSize: 8.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</div>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
