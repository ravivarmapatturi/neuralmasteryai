import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const VARIANTS = [
  { key: 'vit', label: 'ViT', desc: 'The original -- fixed-size non-overlapping patches, a learned [CLS] token for classification. Needs large-scale pretraining data since it lacks convolution\'s built-in locality bias.' },
  { key: 'deit', label: 'DeiT', desc: 'Trains effectively on much smaller (ImageNet-scale) datasets via strong augmentation plus a distillation token -- a second special token trained to match a CNN teacher\'s predictions, injecting CNN inductive bias through distillation rather than architecture.' },
  { key: 'swin', label: 'Swin', desc: 'Computes attention within local windows (not globally -- avoids plain ViT\'s quadratic cost), then shifts window boundaries between layers so information still flows across edges over depth. The standard backbone when full global attention is too expensive.' },
];

/** Three ViT variants, each solving a different limitation of the
 * base design -- click one for what it changes and why. */
export default function ViTVariantsDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(VARIANTS.length, 2400, VARIANTS.findIndex((variant) => variant.key === 'swin'));
  const active = VARIANTS[cycle.value].key;
  const setActive = (key: string) => cycle.pick(VARIANTS.findIndex((variant) => variant.key === key));
  const color = getConceptColor(t, 'attention');
  const v = VARIANTS.find((x) => x.key === active)!;

  return (
    <VisualizationContainer footer={v.desc}>
      <div style={{ display: 'flex', gap: 5 }}>
        {VARIANTS.map((x) => {
          const isActive = active === x.key;
          return (
            <div key={x.key} onClick={() => setActive(x.key)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(x.key); } }} onMouseEnter={() => setActive(x.key)} style={{ cursor: 'pointer', flex: 1, textAlign: 'center', padding: '0.5rem 0.4rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}>
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
