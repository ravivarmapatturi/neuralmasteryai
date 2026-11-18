import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STAGES = [
  { key: 'master', label: 'FP32 master weights', precision: 'fp32', desc: 'The authoritative copy of the weights, kept at full precision to avoid accumulating rounding error over many small updates.' },
  { key: 'forward', label: 'Forward/backward pass', precision: 'fp16/bf16', desc: 'Most compute happens in half precision -- half the memory, and makes full use of Tensor cores, which are dramatically faster at this precision.' },
  { key: 'gradients', label: 'Gradient computation', precision: 'fp16/bf16 → fp32', desc: 'Gradients computed in half precision, then often scaled and accumulated in FP32 to avoid underflow (very small gradient values rounding to zero in FP16).' },
  { key: 'update', label: 'Optimizer step', precision: 'fp32', desc: 'The actual weight update applies to the FP32 master copy -- small updates that would round away to nothing in FP16 are preserved.' },
];

/** Where precision actually switches across one training step -- click a
 * stage to see why THAT part needs the precision it uses. */
export default function MixedPrecisionDiagram() {
  const t = useVizTokens();
  const { value: activeIndex, pick } = useAutoCycle(STAGES.length, 2600, 1);
  const fp32Color = getConceptColor(t, 'query');
  const fp16Color = getConceptColor(t, 'attention');
  const info = STAGES[activeIndex];

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {STAGES.map((s, idx) => {
          const isSelected = activeIndex === idx;
          const color = s.precision === 'fp32' ? fp32Color : s.precision.includes('16') && !s.precision.includes('32') ? fp16Color : t.accentWarn;
          return (
            <div key={s.key} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} onMouseEnter={() => pick(idx)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.8rem', borderRadius: 7, background: isSelected ? `${color}20` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}`, transition: 'all 200ms ease' }}>
              <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? color : t.textPrimary }}>{isSelected ? `▶ ${s.label}` : s.label}</span>
              <span style={{ fontSize: 10.5, fontFamily: 'monospace', color, fontWeight: isSelected ? 700 : 500 }}>{s.precision}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: DIAGRAM_TYPE.caption.size }}>
        <span style={{ color: fp32Color }}>● FP32 (stability)</span>
        <span style={{ color: fp16Color }}>● FP16/BF16 (speed + memory)</span>
      </div>
    </VisualizationContainer>
  );
}
