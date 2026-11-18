import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** A standard convolution vs. its depthwise-separable factorization
 * -- click to compare the multiply-add cost for a realistic layer
 * shape. */
export default function DepthwiseSeparableConvDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(2, 2600, 1);
  const separable = cycle.value === 1;
  const setSeparable = (value: boolean) => cycle.pick(value ? 1 : 0);
  const color = getConceptColor(t, 'attention');

  const inCh = 32, outCh = 64, k = 3, hw = 112 * 112;
  const standardCost = hw * inCh * outCh * k * k;
  const depthwiseCost = hw * inCh * k * k;
  const pointwiseCost = hw * inCh * outCh;
  const separableCost = depthwiseCost + pointwiseCost;
  const fmt = (n: number) => `${(n / 1e6).toFixed(1)}M`;

  return (
    <VisualizationContainer footer={separable ? `Depthwise (one filter per input channel, spatial only) + 1×1 pointwise (mixes channels) = ${fmt(separableCost)} multiply-adds -- roughly ${(standardCost / separableCost).toFixed(1)}× cheaper than standard, at close to the same representational power.` : `A standard 3×3 convolution mixes ALL input channels into every output channel at every spatial position -- ${fmt(standardCost)} multiply-adds for this layer shape (32→64 channels, 112×112).`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setSeparable(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !separable ? 700 : 500, background: !separable ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!separable ? color : t.border}`, color: !separable ? color : t.textSecondary, cursor: 'pointer' }}>
          Standard conv
        </button>
        <button type="button" onClick={() => setSeparable(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: separable ? 700 : 500, background: separable ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${separable ? color : t.border}`, color: separable ? color : t.textSecondary, cursor: 'pointer' }}>
          Depthwise separable
        </button>
      </div>
      {separable ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, padding: '0.6rem 0.4rem', borderRadius: 7, background: `${color}12`, border: `1px solid ${color}40`, textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color }}>Depthwise</div>
            <div style={{ fontSize: 8, color: t.textMuted, marginTop: 2 }}>1 filter/channel, spatial only — {fmt(depthwiseCost)}</div>
          </div>
          <div style={{ flex: 1, padding: '0.6rem 0.4rem', borderRadius: 7, background: `${color}12`, border: `1px solid ${color}40`, textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color }}>Pointwise (1×1)</div>
            <div style={{ fontSize: 8, color: t.textMuted, marginTop: 2 }}>mixes channels — {fmt(pointwiseCost)}</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0.6rem 0.4rem', borderRadius: 7, background: `${t.accentWarn}12`, border: `1px solid ${t.accentWarn}40`, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: t.accentWarn }}>One 3×3 conv, all channels mixed together</div>
        </div>
      )}
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, fontWeight: 700, color }}>
        total: {separable ? fmt(separableCost) : fmt(standardCost)} multiply-adds
      </div>
    </VisualizationContainer>
  );
}
