import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { StickyNote, StickyRow, VisualizationContainer, VizButton } from '../primitives';
import {
  compareBatching,
  explainBatchingStep,
  parseRequestLengths,
  type BatchingMode,
  type BatchingSimulation,
  type QueuePolicy,
} from '../lib/continuousBatching';
import { PredictChallenge } from './playgroundPrimitives';
import { useStepPlayback } from './useStepPlayback';

const DEFAULT_LENGTHS = [2, 4, 1, 3] as const;
const PREDICT_OPTIONS = [
  'Continuous batching, because it refills a slot as soon as one request ends',
  'Static batching, because an empty slot is faster',
  'They always finish at the same time',
] as const;

function ContinuousBatchingPlayground({ compact }: { compact: boolean }) {
  const t = useVizTokens();
  const [lengthInput, setLengthInput] = useState(DEFAULT_LENGTHS.join(', '));
  const [capacity, setCapacity] = useState(2);
  const [arrivalGap, setArrivalGap] = useState(0);
  const [policy, setPolicy] = useState<QueuePolicy>('fifo');
  const [mode, setMode] = useState<BatchingMode>('continuous');
  const [prediction, setPrediction] = useState<number | null>(null);
  const lengths = useMemo(() => parseRequestLengths(lengthInput, DEFAULT_LENGTHS), [lengthInput]);
  const comparison = useMemo(() => compareBatching(lengths, capacity, arrivalGap, policy), [lengths, capacity, arrivalGap, policy]);
  const maxMakespan = Math.max(comparison.staticBatching.makespan, comparison.continuousBatching.makespan);
  const playback = useStepPlayback(maxMakespan, 900, maxMakespan - 1);
  const selected = mode === 'static' ? comparison.staticBatching : comparison.continuousBatching;
  const tick = Math.min(playback.step, selected.makespan - 1);
  const caption = explainBatchingStep(selected, tick);
  const requestColors = [t.accentSecondary, t.accentPurple, t.accentPrimary, t.accentWarn, t.accentDanger, t.accentTeal];
  const markerColor = t.textPrimary;
  const staticColor = t.accentPurple;
  const continuousColor = t.accentPrimary;
  const inputStyle = { width: '100%', boxSizing: 'border-box' as const, minHeight: 38, padding: '6px 8px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, fontVariantNumeric: 'tabular-nums' as const };
  const gridLeft = 96;
  const gridRight = 746;
  const gridWidth = gridRight - gridLeft;
  const cellWidth = gridWidth / maxMakespan;
  const rowHeight = 31;
  const panelHeight = 70 + selected.capacity * rowHeight;
  const svgHeight = 44 + panelHeight * 2 + 54;

  const updateNumber = (setter: (value: number) => void, value: number, min: number, max: number) => {
    setter(Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value : min))));
    setPrediction(null);
    playback.setStep(0);
  };

  const renderSchedule = (simulation: BatchingSimulation, y0: number, color: string, label: string) => {
    const active = simulation.mode === mode;
    return (
      <g opacity={active ? 1 : 0.62} onClick={() => setMode(simulation.mode)} style={{ cursor: 'pointer' }}>
        <text x="14" y={y0 + 18} fontSize="16" fontWeight={active ? 700 : 400} fill={color}>{label}</text>
        <text x="14" y={y0 + 38} fontSize="14" fill={t.textSecondary}>finish {simulation.makespan} · average latency {simulation.averageLatency.toFixed(2)} · utilization {(simulation.utilization * 100).toFixed(0)}%</text>
        {Array.from({ length: maxMakespan }, (_, time) => {
          const show = cellWidth >= 30 || time % Math.max(1, Math.ceil(30 / cellWidth)) === 0;
          return show ? <text key={`${simulation.mode}-time-${time}`} x={gridLeft + time * cellWidth + cellWidth / 2} y={y0 + 60} textAnchor="middle" fontSize="14" fill={t.textMuted}>{time + 1}</text> : null;
        })}
        {simulation.timeline.map((row, slot) => {
          const y = y0 + 68 + slot * rowHeight;
          return (
            <g key={`${simulation.mode}-slot-${slot}`}>
              <text x="14" y={y + 20} fontSize="14" fill={t.textSecondary}>slot {slot + 1}</text>
              {Array.from({ length: maxMakespan }, (_, time) => {
                const cell = row[time];
                const requestId = cell?.requestId ?? null;
                const revealed = time <= playback.step;
                const fill = requestId === null ? t.background : requestColors[requestId % requestColors.length];
                return (
                  <g key={`${simulation.mode}-${slot}-${time}`} opacity={revealed ? 1 : 0.18}>
                    <rect x={gridLeft + time * cellWidth + 1} y={y} width={Math.max(1, cellWidth - 2)} height={25} rx={3} fill={fill} fillOpacity={requestId === null ? 1 : 0.82} stroke={requestId === null ? t.textMuted : fill} strokeWidth={1.1} strokeDasharray={requestId === null ? '4 3' : undefined} />
                    {requestId !== null && cellWidth >= 29 && <text x={gridLeft + time * cellWidth + cellWidth / 2} y={y + 18} textAnchor="middle" fontSize="14" fontWeight={700} fill={t.background}>R{requestId + 1}</text>}
                  </g>
                );
              })}
            </g>
          );
        })}
        <line x1={gridLeft + Math.min(playback.step + 1, maxMakespan) * cellWidth} y1={y0 + 48} x2={gridLeft + Math.min(playback.step + 1, maxMakespan) * cellWidth} y2={y0 + 68 + simulation.capacity * rowHeight - 6} stroke={markerColor} strokeWidth={active ? 2.2 : 1.2} />
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Continuous batching simulator</div>
            <p style={{ margin: '2px 0 0', fontSize: 15, lineHeight: 1.5, color: t.textSecondary }}>
              An LLM server wastes capacity when a short response leaves a batch slot empty; continuous batching refills that slot with a waiting request on the next token step.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <label style={{ minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Output length of each request (tokens)</span>
              <input aria-label="Output length of each request" value={lengthInput} onChange={(event) => { setLengthInput(event.target.value); playback.setStep(0); }} style={inputStyle} />
            </label>
            <label style={{ minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Batch slots</span>
              <input aria-label="Batch slots" type="number" min={1} max={4} step={1} value={capacity} onChange={(event) => updateNumber(setCapacity, Number(event.target.value), 1, 4)} style={inputStyle} />
            </label>
            <label style={{ minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Steps between arrivals</span>
              <input aria-label="Steps between request arrivals" type="number" min={0} max={6} step={1} value={arrivalGap} onChange={(event) => updateNumber(setArrivalGap, Number(event.target.value), 0, 6)} style={inputStyle} />
            </label>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, marginTop: 9 }}>
            <fieldset style={{ border: 0, padding: 0, margin: 0, fontSize: 15 }}>
              <legend style={{ marginBottom: 4, fontWeight: 700 }}>Waiting-line policy</legend>
              <div style={{ display: 'flex', gap: 6 }}>
                {([
                  ['fifo', 'First arrived first'],
                  ['shortest-first', 'Shortest output first'],
                ] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={policy === id} onClick={() => { setPolicy(id); playback.setStep(0); }} style={{ minHeight: 38, padding: '6px 10px', borderRadius: RADIUS.sm, border: `1px solid ${policy === id ? t.accentSecondary : t.border}`, background: policy === id ? t.accentSecondary : 'transparent', color: policy === id ? t.background : t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{label}</button>)}
              </div>
            </fieldset>
            <fieldset style={{ border: 0, padding: 0, margin: 0, fontSize: 15 }}>
              <legend style={{ marginBottom: 4, fontWeight: 700 }}>Schedule to explain</legend>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" aria-pressed={mode === 'static'} onClick={() => setMode('static')} style={{ minHeight: 38, padding: '6px 10px', borderRadius: RADIUS.sm, border: `1px solid ${mode === 'static' ? staticColor : t.border}`, background: mode === 'static' ? staticColor : 'transparent', color: mode === 'static' ? t.background : t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Static batches</button>
                <button type="button" aria-pressed={mode === 'continuous'} onClick={() => setMode('continuous')} style={{ minHeight: 38, padding: '6px 10px', borderRadius: RADIUS.sm, border: `1px solid ${mode === 'continuous' ? continuousColor : t.border}`, background: mode === 'continuous' ? continuousColor : 'transparent', color: mode === 'continuous' ? t.background : t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Continuous batching</button>
              </div>
            </fieldset>
          </div>
        </>
      )}

      <svg width="100%" viewBox={`0 0 760 ${svgHeight}`} role="img" aria-label={`Static batching finishes at ${comparison.staticBatching.makespan}; continuous batching finishes at ${comparison.continuousBatching.makespan}`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <text x="14" y="24" fontSize="15" fontWeight="700" fill={t.textPrimary}>Each colored strip is one request generating one token per time step</text>
        {renderSchedule(comparison.staticBatching, 34, staticColor, 'Static batching: wait for the whole batch before refilling')}
        {renderSchedule(comparison.continuousBatching, 34 + panelHeight, continuousColor, 'Continuous batching: refill each free slot immediately')}
        <text x="14" y={svgHeight - 14} fontSize="14" fill={markerColor}>│ current time</text>
        <text x="158" y={svgHeight - 14} fontSize="14" fill={t.textMuted}>□ idle slot</text>
        <text x="284" y={svgHeight - 14} fontSize="14" fill={staticColor}>■ static schedule</text>
        <text x="488" y={svgHeight - 14} fontSize="14" fill={continuousColor}>■ continuous schedule</text>
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', fontSize: 15 }} aria-label="Request colours">
        {comparison.requests.map((request) => <span key={request.id} style={{ color: requestColors[request.id % requestColors.length] }}>■ R{request.id + 1}: {request.length} token{request.length === 1 ? '' : 's'}, arrives {request.arrival}</span>)}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={`${mode === 'static' ? 'Static' : 'Continuous'} throughput`} latex={String.raw`\text{throughput}=\frac{n}{T}`} color={mode === 'static' ? 'pink' : 'green'} tilt={-1}>
            <p>{selected.completions.length}/{selected.makespan} = <strong>{selected.throughput.toFixed(3)} requests per step</strong>.</p>
          </StickyNote>
          <StickyNote title={`What just happened · time ${tick + 1}/${selected.makespan}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Static batching" latex={String.raw`\text{throughput}_{\mathrm{static}}=\frac{n}{T_{\mathrm{static}}}`} color="pink" tilt={-1} active={mode === 'static'} onSelect={() => setMode('static')}>
              <p>n is completed requests and T is final completion time. {comparison.staticBatching.completions.length}/{comparison.staticBatching.makespan} = {comparison.staticBatching.throughput.toFixed(3)} per step.</p>
            </StickyNote>
            <StickyNote title="Continuous batching" latex={String.raw`\text{throughput}_{\mathrm{cont}}=\frac{n}{T_{\mathrm{cont}}}`} color="green" tilt={1} active={mode === 'continuous'} onSelect={() => setMode('continuous')}>
              <p>n is completed requests and T is final completion time. {comparison.continuousBatching.completions.length}/{comparison.continuousBatching.makespan} = {comparison.continuousBatching.throughput.toFixed(3)} per step.</p>
            </StickyNote>
            <StickyNote title="Average request latency" latex={String.raw`\bar L=\frac{1}{n}\sum_i(C_i-A_i)`} color="yellow" tilt={-1}>
              <p>Cᵢ is completion time and Aᵢ is arrival time. Here {mode} latency = <strong>{selected.averageLatency.toFixed(2)} steps</strong>.</p>
            </StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="orange" tilt={1}>
              <p>Static completion times: {comparison.staticBatching.completions.map((request) => request.completion).join(', ')}.</p>
              <p>Continuous completion times: {comparison.continuousBatching.completions.map((request) => request.completion).join(', ')}.</p>
              <p><strong>Final completion: {comparison.staticBatching.makespan} vs {comparison.continuousBatching.makespan} steps.</strong></p>
            </StickyNote>
            <StickyNote title={`What just happened · time ${tick + 1}/${selected.makespan}`} color="blue" tilt={-1} live><p>{caption}</p></StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Requests need 2, 4, 1, and 3 tokens in two slots. Which scheduler finishes all four first?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Static batching leaves R1's slot empty from time 2 to 4; continuous batching uses those steps for R3, then R4."
            actionLabel="Run the four requests"
            onAction={() => { setLengthInput(DEFAULT_LENGTHS.join(', ')); setCapacity(2); setArrivalGap(0); setPolicy('fifo'); setMode('continuous'); playback.playFromStart(); }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>One step means one decode pass that can produce one token in every active slot.</span>
          </div>
        </>
      )}
    </>
  );
}

export default function ContinuousBatchingSimulationDiagram({ compact = false }: { compact?: boolean } = {}) {
  return (
    <VisualizationContainer title="Continuous batching simulator" footer="This discrete scheduler computes every admission, token step, completion, latency, and idle slot from your request lengths. It models scheduling mechanics, not hardware latency or a particular serving engine.">
      <ContinuousBatchingPlayground compact={compact} />
    </VisualizationContainer>
  );
}
