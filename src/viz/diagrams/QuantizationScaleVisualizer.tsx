import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from '../primitives';
import {
  parseQuantizationValues,
  quantizeValues,
  type QuantizationScope,
} from '../lib/quantizationScale';
import { usePlaygroundPlayback } from './usePlaygroundPlayback';

const SCOPE_NAME: Record<QuantizationScope, string> = {
  tensor: 'One scale for the whole tensor',
  group: 'One scale for each small group',
};

const SCALE_FORMULA: Record<QuantizationScope, string> = {
  tensor: String.raw`S=\frac{\max_i |x_i|}{2^{b-1}-1}`,
  group: String.raw`S_g=\frac{\max_{i\in g}|x_i|}{2^{b-1}-1}`,
};

function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'block', minWidth: 130, fontSize: 15 }}>
      <span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>{label}</span>
      <input aria-label={label} type="number" value={value} min={min} max={max} step={1} onChange={(event) => onChange(Math.max(min, Math.min(max, Math.round(Number(event.target.value) || min))))} style={{ width: '100%', boxSizing: 'border-box', minHeight: 34, padding: '4px 7px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
    </label>
  );
}

function QuantizationPlayground({ compact }: { compact: boolean }) {
  const t = useVizTokens();
  const [valuesText, setValuesText] = useState('-1.0 -0.7 -0.2 0.3 0.5 0.8 1.0 8.0');
  const [bits, setBits] = useState(4);
  const [scope, setScope] = useState<QuantizationScope>('tensor');
  const [groupSize, setGroupSize] = useState(4);
  const [prediction, setPrediction] = useState<QuantizationScope>('group');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);
  const values = useMemo(() => {
    const parsed = parseQuantizationValues(valuesText);
    return parsed.length > 0 ? parsed : [0];
  }, [valuesText]);
  const result = useMemo(() => quantizeValues({ values, bits, scope, groupSize }), [values, bits, scope, groupSize]);
  const comparison = useMemo(() => ({
    tensor: quantizeValues({ values, bits, scope: 'tensor', groupSize }),
    group: quantizeValues({ values, bits, scope: 'group', groupSize }),
  }), [values, bits, groupSize]);
  const playback = usePlaygroundPlayback(result.rows.length, 1100);
  const row = result.rows[playback.step] ?? result.rows[0];
  const bestScope: QuantizationScope = comparison.group.mse <= comparison.tensor.mse ? 'group' : 'tensor';

  const originalColor = t.accentSecondary;
  const reconstructedColor = t.accentPrimary;
  const errorColor = t.accentDanger;
  const groupColor = t.accentPurple;
  const allNumbers = result.rows.flatMap((item) => [item.input, item.reconstructed]);
  const rawMin = Math.min(...allNumbers);
  const rawMax = Math.max(...allNumbers);
  const pad = Math.max(0.5, (rawMax - rawMin) * 0.08);
  const domainMin = rawMin - pad;
  const domainMax = rawMax + pad;
  const mapX = (value: number) => 62 + ((value - domainMin) / Math.max(1e-9, domainMax - domainMin)) * 650;
  const currentX = mapX(row.input);
  const labelX = Math.max(110, Math.min(650, currentX));
  const scales = [...new Map(result.rows.map((item) => [item.group, item.scale])).entries()];

  const resetPlayback = () => {
    setPredictionResult(null);
    playback.reset();
  };

  const happened = `Weight ${playback.step + 1}, x = ${row.input.toFixed(3)}, becomes integer q = ${row.integer}; multiplying by S = ${row.scale.toFixed(4)} reconstructs x̂ = ${row.reconstructed.toFixed(3)}, so the absolute error is ${row.error.toFixed(4)}.`;

  const runPrediction = () => {
    setPredictionResult(prediction === bestScope);
    setScope(bestScope);
    playback.setStep(result.rows.length - 1);
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="Quantization stores nearby weights in a small set of integer buckets"
            description="This solves a memory and bandwidth problem: fewer bits move faster, but a wide scale makes small weights round to coarser values."
          />
          <label style={{ display: 'block', minWidth: 0, marginBottom: 8, fontSize: 15 }}>
            <span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Weights to quantize (type numbers)</span>
            <input aria-label="Weights to quantize" value={valuesText} onChange={(event) => { setValuesText(event.target.value); resetPlayback(); }} style={{ width: '100%', boxSizing: 'border-box', minHeight: 34, padding: '4px 7px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 6 }}>
            <NumberInput label="Bits per weight (b)" value={bits} min={2} max={8} onChange={(value) => { setBits(value); resetPlayback(); }} />
            <NumberInput label="Weights per group" value={groupSize} min={1} max={Math.max(1, values.length)} onChange={(value) => { setGroupSize(value); resetPlayback(); }} />
          </div>
          <PillSelect<QuantizationScope>
            label="Scale scope (which weights share S)"
            value={scope}
            onChange={(next) => { setScope(typeof next === 'function' ? next(scope) : next); resetPlayback(); }}
            options={[
              { value: 'tensor', label: 'One tensor scale' },
              { value: 'group', label: 'Group-wise scales' },
            ]}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 7, fontSize: 15 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span aria-live="polite">Weight <strong>{playback.step + 1}</strong> of {result.rows.length} · MSE <strong style={{ color: errorColor }}>{result.mse.toFixed(5)}</strong> · storage <strong>{result.storageBytes.toFixed(1)} bytes</strong></span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', marginBottom: 4, fontSize: 15 }} aria-label="Quantization plot colours">
            <span><span style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: originalColor }} />Original weight x</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: reconstructedColor, transform: 'rotate(45deg)' }} />Reconstructed weight x̂</span>
            <span><span style={{ display: 'inline-block', width: 22, height: 3, marginRight: 6, background: errorColor, verticalAlign: 'middle' }} />Rounding error</span>
          </div>
        </>
      )}

      <svg width="100%" viewBox="0 0 760 340" role="img" aria-label={`${bits}-bit ${SCOPE_NAME[scope]} quantization has mean squared error ${result.mse.toFixed(5)}`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs><clipPath id="quantization-number-line"><rect x={52} y={98} width={670} height={112} /></clipPath></defs>
        <text x={20} y={22} fontSize={16} fontWeight={700} fill={t.textPrimary}>{bits}-bit signed integers: q from {result.qMin} to {result.qMax}</text>
        <text x={740} y={22} textAnchor="end" fontSize={14} fill={t.textSecondary}>{SCOPE_NAME[scope]}</text>
        <line x1={labelX} y1={58} x2={currentX} y2={112} stroke={originalColor} strokeWidth={1.5} />
        <text x={labelX} y={48} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>current x = {row.input.toFixed(3)}</text>
        <line x1={62} y1={145} x2={712} y2={145} stroke={t.textSecondary} strokeWidth={1.6} />
        <text x={62} y={174} fontSize={14} fill={t.textSecondary}>{domainMin.toFixed(1)}</text>
        <text x={712} y={174} textAnchor="end" fontSize={14} fill={t.textSecondary}>{domainMax.toFixed(1)}</text>
        <g clipPath="url(#quantization-number-line)">
          {result.rows.map((item, index) => {
            const x = mapX(item.input);
            const xr = mapX(item.reconstructed);
            const active = index === playback.step;
            return (
              <g key={index} opacity={index <= playback.step ? 1 : 0.24}>
                <line x1={x} y1={127} x2={xr} y2={163} stroke={errorColor} strokeWidth={active ? 2.5 : 1.2} />
                <rect x={x - (active ? 6 : 4)} y={121 - (active ? 2 : 0)} width={active ? 12 : 8} height={active ? 12 : 8} rx={2} fill={originalColor} />
                <path d={`M${xr} 156 l${active ? 7 : 5} ${active ? 7 : 5} l-${active ? 7 : 5} ${active ? 7 : 5} l-${active ? 7 : 5} -${active ? 7 : 5} Z`} fill={reconstructedColor} />
              </g>
            );
          })}
        </g>
        <text x={62} y={204} fontSize={14} fill={t.textSecondary}>Each red connector is |x − x̂|. A longer connector means more rounding error.</text>
        <text x={20} y={238} fontSize={16} fontWeight={700} fill={groupColor}>Scale values used by the picture</text>
        {scales.slice(0, 8).map(([group, scale], index) => {
          const column = index % 4;
          const rowIndex = Math.floor(index / 4);
          const x = 20 + column * 185;
          const y = 268 + rowIndex * 34;
          return <text key={group} x={x} y={y} fontSize={15} fill={group === row.group ? groupColor : t.textSecondary} fontWeight={group === row.group ? 700 : 400}>{scope === 'tensor' ? 'tensor' : `group ${group + 1}`}: S = {scale.toFixed(4)}</text>;
        })}
        <text x={20} y={328} fontSize={14} fill={t.textSecondary}>MSE = {result.mse.toFixed(5)} · maximum absolute error = {result.maxError.toFixed(4)} · {values.length} weights × {bits} bits = {(values.length * bits).toLocaleString()} bits</text>
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote title={SCOPE_NAME[scope]} latex={SCALE_FORMULA[scope]} color="yellow" tilt={-1}><p>b is bits, x is a weight, g is a group, and S is one bucket step.</p></StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${result.rows.length}`} color="blue" tilt={1} live><p>{happened}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title={SCOPE_NAME.tensor} latex={SCALE_FORMULA.tensor} color="yellow" tilt={-1} active={scope === 'tensor'} onSelect={() => { setScope('tensor'); resetPlayback(); }}><p>The largest absolute weight sets one bucket width for every weight.</p></StickyNote>
            <StickyNote title={SCOPE_NAME.group} latex={SCALE_FORMULA.group} color="pink" tilt={1} active={scope === 'group'} onSelect={() => { setScope('group'); resetPlayback(); }}><p>Each group g gets its own bucket width, so one outlier affects fewer weights.</p></StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={1}>
              <p>q = round({row.input.toFixed(3)} ÷ {row.scale.toFixed(4)}) = <strong>{row.integer}</strong>. x̂ = {row.integer} × {row.scale.toFixed(4)} = <strong>{row.reconstructed.toFixed(3)}</strong>. Error = {row.error.toFixed(4)}.</p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${playback.step + 1}`} color="blue" tilt={-1} live><p>{happened}</p></StickyNote>
          </StickyRow>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: `1px dashed ${t.border}`, fontSize: 15 }}>
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span>For these weights, which scale scope has the smaller mean squared error (MSE)?</span>
            <select aria-label="Predicted lower-error quantization scope" value={prediction} onChange={(event) => { setPrediction(event.target.value as QuantizationScope); setPredictionResult(null); }} style={{ minHeight: 34, border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit' }}>
              <option value="tensor">One tensor scale</option>
              <option value="group">Group-wise scales</option>
            </select>
            <VizButton onClick={runPrediction}>Quantize both ways</VizButton>
            {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>{predictionResult ? 'Correct.' : `${SCOPE_NAME[bestScope]} has the smaller MSE here.`}</span>}
          </div>
        </>
      )}
    </>
  );
}

export default function QuantizationScaleVisualizer({ compact = false }: { compact?: boolean }) {
  return (
    <VisualizationContainer
      title="Quantization scale playground"
      footer="This is exact symmetric uniform quantization. It uses the narrow signed integer range from −(2^(b−1)−1) to +(2^(b−1)−1); every bucket, reconstruction, error, and storage total is computed from the typed weights."
    >
      <QuantizationPlayground compact={compact} />
    </VisualizationContainer>
  );
}
