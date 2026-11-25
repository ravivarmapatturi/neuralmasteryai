import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { StickyNote, StickyRow, VisualizationContainer, VizButton } from '../primitives';
import { buildPipelineSchedule, explainPipelineStep } from '../lib/pipelineBubble';
import { PredictChallenge } from './playgroundPrimitives';
import { useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'The bubble fraction falls because more useful work shares the same fill and drain',
  'The bubble fraction doubles',
  'Nothing changes',
] as const;

function NumberControl({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const t = useVizTokens();
  return (
    <label style={{ flex: '1 1 135px', minWidth: 0, fontSize: 15 }}>
      <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>{label}</span>
      <input aria-label={label} type="number" value={value} min={min} max={max} step={1} onChange={(event) => onChange(Math.max(min, Math.min(max, Math.round(Number(event.target.value) || min))))} style={{ width: '100%', boxSizing: 'border-box', minHeight: 38, padding: '6px 8px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, fontVariantNumeric: 'tabular-nums' }} />
    </label>
  );
}

function PipelineBubblePlayground({ compact }: { compact: boolean }) {
  const t = useVizTokens();
  const [stageCount, setStageCount] = useState(4);
  const [microBatchCount, setMicroBatchCount] = useState(4);
  const [slowStageIndex, setSlowStageIndex] = useState(1);
  const [slowStageTicks, setSlowStageTicks] = useState(1);
  const [prediction, setPrediction] = useState<number | null>(null);
  const schedule = useMemo(() => buildPipelineSchedule({ stageCount, microBatchCount, slowStageIndex, slowStageTicks }), [stageCount, microBatchCount, slowStageIndex, slowStageTicks]);
  const playback = useStepPlayback(schedule.makespan, 850, schedule.makespan - 1);
  const tick = Math.min(playback.step, schedule.makespan - 1);
  const caption = explainPipelineStep(schedule, tick);

  const workColor = t.accentSecondary;
  const bottleneckColor = t.accentDanger;
  const idleColor = t.textMuted;
  const markerColor = t.accentPurple;
  const gridLeft = 108;
  const gridRight = 746;
  const gridWidth = gridRight - gridLeft;
  const cellWidth = gridWidth / schedule.makespan;
  const rowHeight = 42;
  const svgHeight = 78 + schedule.stageDurations.length * rowHeight + 44;
  const setCount = (setter: (value: number) => void, value: number) => {
    setter(value);
    setPrediction(null);
    playback.setStep(0);
  };

  return (
    <>
      {!compact && (
        <>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Pipeline bubble playground</div>
            <p style={{ margin: '2px 0 0', fontSize: 15, lineHeight: 1.5, color: t.textSecondary }}>
              Pipeline parallelism splits a model across devices, but a device sits idle until a micro-batch reaches its stage; those empty time slots are the bubble.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <NumberControl label="Pipeline stages (model pieces)" value={stageCount} min={2} max={8} onChange={(value) => { setCount(setStageCount, value); setSlowStageIndex((current) => Math.min(current, value - 1)); }} />
            <NumberControl label="Micro-batches per training batch" value={microBatchCount} min={1} max={16} onChange={(value) => setCount(setMicroBatchCount, value)} />
            <NumberControl label="Slower stage number" value={slowStageIndex + 1} min={1} max={stageCount} onChange={(value) => setCount((next) => setSlowStageIndex(next - 1), value)} />
            <NumberControl label="Time for slower stage" value={slowStageTicks} min={1} max={4} onChange={(value) => setCount(setSlowStageTicks, value)} />
          </div>
        </>
      )}

      <svg width="100%" viewBox={`0 0 760 ${svgHeight}`} role="img" aria-label={`${stageCount}-stage pipeline uses ${microBatchCount} micro-batches with ${(schedule.bubbleFraction * 100).toFixed(1)} percent idle bubble time`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs><clipPath id="pipeline-grid-clip"><rect x={gridLeft} y="54" width={gridWidth} height={schedule.stageDurations.length * rowHeight} /></clipPath></defs>
        <text x="14" y="24" fontSize="15" fontWeight="700" fill={t.textPrimary}>Standard pipeline schedule: each diagonal band is one micro-batch moving through model stages</text>
        <text x="14" y="46" fontSize="14" fill={t.textSecondary}>time →</text>
        {Array.from({ length: schedule.makespan }, (_, tickIndex) => {
          const show = cellWidth >= 30 || tickIndex % Math.max(1, Math.ceil(30 / cellWidth)) === 0;
          return show ? <text key={`tick-${tickIndex}`} x={gridLeft + tickIndex * cellWidth + cellWidth / 2} y="46" textAnchor="middle" fontSize="14" fill={t.textMuted}>{tickIndex + 1}</text> : null;
        })}

        {schedule.cells.map((row, stageIndex) => {
          const y = 58 + stageIndex * rowHeight;
          const isSlow = stageIndex === slowStageIndex && schedule.stageDurations[stageIndex] > 1;
          return (
            <g key={`stage-${stageIndex}`}>
              <text x="14" y={y + 17} fontSize="15" fontWeight={isSlow ? 700 : 400} fill={isSlow ? bottleneckColor : t.textPrimary}>Stage {stageIndex + 1}</text>
              <text x="14" y={y + 35} fontSize="14" fill={t.textSecondary}>{schedule.stageDurations[stageIndex]} time unit{schedule.stageDurations[stageIndex] === 1 ? '' : 's'}</text>
              <g clipPath="url(#pipeline-grid-clip)">
                {row.map((cell) => {
                  const busy = cell.microBatchIndex !== null;
                  const color = isSlow && busy ? bottleneckColor : workColor;
                  const revealed = cell.tick <= tick;
                  return (
                    <g key={`${stageIndex}-${cell.tick}`} opacity={revealed ? 1 : 0.2}>
                      <rect x={gridLeft + cell.tick * cellWidth + 1} y={y} width={Math.max(1, cellWidth - 2)} height={32} rx={3} fill={busy ? color : t.background} fillOpacity={busy ? 0.8 : 1} stroke={busy ? color : idleColor} strokeWidth={1.2} strokeDasharray={busy ? undefined : '4 3'} />
                      {busy && cellWidth >= 31 && <text x={gridLeft + cell.tick * cellWidth + cellWidth / 2} y={y + 21} textAnchor="middle" fontSize="14" fontWeight={700} fill={t.background}>M{(cell.microBatchIndex ?? 0) + 1}</text>}
                    </g>
                  );
                })}
              </g>
            </g>
          );
        })}

        <line x1={gridLeft + (tick + 1) * cellWidth} y1="52" x2={gridLeft + (tick + 1) * cellWidth} y2={58 + schedule.stageDurations.length * rowHeight - 10} stroke={markerColor} strokeWidth={2.2} />
        <text x={gridLeft + (tick + 1) * cellWidth - 5} y={70 + schedule.stageDurations.length * rowHeight} textAnchor="end" fontSize="14" fontWeight="700" fill={markerColor}>now: time {tick + 1}</text>
        <text x="14" y={svgHeight - 12} fontSize="14" fill={workColor}>■ useful stage work</text>
        <text x="218" y={svgHeight - 12} fontSize="14" fill={idleColor}>□ bubble (idle)</text>
        <text x="404" y={svgHeight - 12} fontSize="14" fill={bottleneckColor}>■ slower-stage work</text>
        <text x="624" y={svgHeight - 12} fontSize="14" fill={markerColor}>│ current time</text>
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote title="Bubble fraction" latex={String.raw`B=1-\frac{\text{busy stage-time}}{S\,T}`} color="yellow" tilt={-1}>
            <p>{schedule.idleStageTicks}/{stageCount * schedule.makespan} = <strong>{(schedule.bubbleFraction * 100).toFixed(1)}% idle</strong>.</p>
          </StickyNote>
          <StickyNote title={`What just happened · time ${tick + 1}/${schedule.makespan}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Stage utilization" latex={String.raw`U=\frac{\text{busy stage-time}}{S\,T}`} color="green" tilt={-1}>
              <p>S means stages and T means total time. {schedule.busyStageTicks}/({stageCount} × {schedule.makespan}) = <strong>{(schedule.utilization * 100).toFixed(1)}%</strong>.</p>
            </StickyNote>
            <StickyNote title="Bubble fraction" latex={String.raw`B=1-U`} color="yellow" tilt={1}>
              <p>1 − {schedule.utilization.toFixed(3)} = <strong>{(schedule.bubbleFraction * 100).toFixed(1)}%</strong> of stage slots idle.</p>
            </StickyNote>
            <StickyNote title="Micro-batch throughput" latex={String.raw`\text{throughput}=\frac{m}{T}`} color="pink" tilt={-1}>
              <p>m means micro-batches and T means total time. {microBatchCount}/{schedule.makespan} = <strong>{schedule.throughput.toFixed(3)} per time unit</strong>.</p>
            </StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="orange" tilt={1}>
              <p>S = {stageCount} stages, m = {microBatchCount} micro-batches, T = {schedule.makespan} time units.</p>
              <p><strong>{schedule.busyStageTicks} busy + {schedule.idleStageTicks} idle = {stageCount * schedule.makespan} stage-time slots.</strong></p>
            </StickyNote>
            <StickyNote title={`What just happened · time ${tick + 1}/${schedule.makespan}`} color="blue" tilt={-1} live><p>{caption}</p></StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Keep four equal stages, then double micro-batches from 4 to 8. What happens to the bubble fraction?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="The opening and closing diagonals still cost three slots, but eight useful micro-batches now share that fixed cost."
            actionLabel="Run 4 stages × 8 micro-batches"
            onAction={() => { setStageCount(4); setMicroBatchCount(8); setSlowStageIndex(1); setSlowStageTicks(1); playback.playFromStart(); }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>M1 means micro-batch 1; each row is one model stage on one device.</span>
          </div>
        </>
      )}
    </>
  );
}

export default function PipelineBubbleDiagram({ compact = false }: { compact?: boolean } = {}) {
  return (
    <VisualizationContainer title="Pipeline bubble playground" footer="The schedule uses real dependency timing: a stage starts a micro-batch only after that micro-batch leaves the prior stage and this stage finishes its prior micro-batch. Timing units are illustrative, not GPU benchmark measurements.">
      <PipelineBubblePlayground compact={compact} />
    </VisualizationContainer>
  );
}
