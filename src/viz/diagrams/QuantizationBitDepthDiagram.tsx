import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const PRECISIONS = [
  { bits: 32, label: 'fp32' },
  { bits: 16, label: 'fp16/bf16' },
  { bits: 8, label: 'int8' },
  { bits: 4, label: 'int4' },
] as const;

const PARAM_COUNT_B = 7; // a 7B-parameter model, for a concrete memory number

/** Cutting numerical precision, made concrete: pick a precision and see
 * the actual memory footprint for a 7B-parameter model, plus how coarse
 * the representable value grid gets at that bit depth. */
export default function QuantizationBitDepthDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(PRECISIONS.length, 3000, 2);
  const bits = PRECISIONS[cycle.value].bits;
  const setBits = (next: 8 | 32 | 16 | 4) => cycle.pick(PRECISIONS.findIndex((precision) => precision.bits === next));
  const color = getConceptColor(t, 'attention');
  const gbMemory = (PARAM_COUNT_B * 1e9 * bits) / 8 / 1e9;
  const levels = Math.pow(2, bits);

  const width = 400;
  const height = 40;
  const showLevels = Math.min(levels, 16);

  return (
    <VisualizationContainer footer={`A ${PARAM_COUNT_B}B-parameter model at ${bits}-bit precision needs ≈${gbMemory.toFixed(1)} GB just to store weights -- ${levels.toLocaleString()} distinct representable values per weight. Lower precision means a coarser value grid (quantization error), at real memory and speed savings.`}>
      <PillSelect<8 | 32 | 16 | 4> label="Precision" value={bits} onChange={setBits} options={PRECISIONS.map((p) => ({ value: p.bits, label: p.label }))} />
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color }}>{gbMemory.toFixed(1)} GB</div>
          <div style={{ fontSize: 10, color: t.textMuted }}>weight memory ({PARAM_COUNT_B}B params)</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color }}>{levels.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: t.textMuted }}>representable values per weight</div>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 10 }}>
        <line x1={20} y1={20} x2={width - 20} y2={20} stroke={t.border} strokeWidth={1.5} />
        {Array.from({ length: showLevels + 1 }, (_, i) => (
          <line key={i} x1={20 + (i / showLevels) * (width - 40)} y1={12} x2={20 + (i / showLevels) * (width - 40)} y2={28} stroke={color} strokeWidth={1.5} />
        ))}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        value grid at this precision {levels > 16 ? '(showing 16 of many)' : ''}
      </div>
    </VisualizationContainer>
  );
}
