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
  compareExecutionModels,
  type ExecutionModel,
  type ParallelExecutionConfig,
} from '../lib/parallelExecution';
import { usePlaygroundPlayback } from './usePlaygroundPlayback';

const MODEL_LABEL: Record<ExecutionModel, string> = {
  threads: 'Threads (shared Python process)',
  processes: 'Processes (separate Python processes)',
};

function NumberInput({ label, value, min, max, step = 1, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'block', minWidth: 112, fontSize: 15 }}>
      <span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>{label}</span>
      <input
        aria-label={label}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))}
        style={{ width: '100%', boxSizing: 'border-box', minHeight: 34, padding: '4px 7px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }}
      />
    </label>
  );
}

function ThreadingPlayground({ compact }: { compact: boolean }) {
  const t = useVizTokens();
  const [model, setModel] = useState<ExecutionModel>('threads');
  const [config, setConfig] = useState<Omit<ParallelExecutionConfig, 'model'>>({
    taskCount: 6,
    workerCount: 3,
    cores: 3,
    cpuMs: 20,
    ioMs: 80,
    processStartupMs: 45,
  });
  const [prediction, setPrediction] = useState<ExecutionModel>('threads');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);
  const comparison = useMemo(() => compareExecutionModels(config), [config]);
  const active = comparison[model];
  const playback = usePlaygroundPlayback(config.taskCount, 1150);
  const shownTasks = Math.min(config.taskCount, playback.step + 1);
  const visibleSegments = active.segments.filter((segment) => segment.task < 0 || segment.task < shownTasks);
  const elapsed = Math.max(0, ...visibleSegments.map((segment) => segment.endMs));
  const winner: ExecutionModel = comparison.threads.totalMs <= comparison.processes.totalMs ? 'threads' : 'processes';

  const colors: Record<ExecutionModel, string> = {
    threads: t.accentPurple,
    processes: t.accentTeal,
  };
  const activeColor = colors[model];
  const maxMs = Math.max(comparison.threads.totalMs, comparison.processes.totalMs, 1);
  const W = 760;
  const timelineTop = 170;
  const laneHeight = 42;
  const H = timelineTop + active.laneCount * laneHeight + 42;
  const mapX = (milliseconds: number) => 106 + (milliseconds / maxMs) * 630;

  const update = (key: keyof typeof config, value: number) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setPredictionResult(null);
    playback.reset();
  };

  const currentTaskSegments = visibleSegments.filter((segment) => segment.task === shownTasks - 1);
  const currentKinds = currentTaskSegments.map((segment) => segment.kind);
  const stepText = currentKinds.length === 0
    ? 'The selected worker is ready for the next task.'
    : `${MODEL_LABEL[model]} ran task ${shownTasks}: ${currentKinds.includes('cpu') ? `${config.cpuMs} ms of Python CPU work` : 'no CPU work'}${config.ioMs > 0 ? `, then ${config.ioMs} ms waiting for I/O` : ''}.`;

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="Threads overlap waiting; processes split CPU work"
            description="This solves a scheduling choice: use threads when Python mostly waits for files or networks, and processes when Python must keep several CPU cores busy."
          />

          <PillSelect<ExecutionModel>
            label="Execution model (how workers share Python)"
            value={model}
            onChange={(next) => {
              const value = typeof next === 'function' ? next(model) : next;
              setModel(value);
              playback.reset();
            }}
            options={[
              { value: 'threads', label: 'Threads' },
              { value: 'processes', label: 'Processes' },
            ]}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 8 }}>
            <NumberInput label="Tasks to finish" value={config.taskCount} min={1} max={10} onChange={(value) => update('taskCount', Math.round(value))} />
            <NumberInput label="Workers" value={config.workerCount} min={1} max={6} onChange={(value) => update('workerCount', Math.round(value))} />
            <NumberInput label="CPU cores" value={config.cores} min={1} max={6} onChange={(value) => update('cores', Math.round(value))} />
            <NumberInput label="CPU work / task (ms)" value={config.cpuMs} min={0} max={300} step={5} onChange={(value) => update('cpuMs', value)} />
            <NumberInput label="I/O wait / task (ms)" value={config.ioMs} min={0} max={300} step={5} onChange={(value) => update('ioMs', value)} />
            <NumberInput label="Process startup (ms)" value={config.processStartupMs} min={0} max={200} step={5} onChange={(value) => update('processStartupMs', value)} />
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8, fontSize: 15 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span aria-live="polite" style={{ fontVariantNumeric: 'tabular-nums' }}>
              Showing task <strong>{shownTasks}</strong> of {config.taskCount} · elapsed <strong style={{ color: activeColor }}>{elapsed.toFixed(0)} ms</strong>
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', marginBottom: 4, fontSize: 15 }} aria-label="Timeline legend">
            <span><span style={{ display: 'inline-block', width: 22, height: 5, marginRight: 6, verticalAlign: 'middle', background: activeColor }} />CPU work holds a Python worker</span>
            <span><span style={{ display: 'inline-block', width: 22, height: 12, marginRight: 6, verticalAlign: 'middle', border: `2px dashed ${activeColor}`, boxSizing: 'border-box' }} />I/O wait releases the CPU</span>
          </div>
        </>
      )}

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${MODEL_LABEL[model]} completes ${config.taskCount} tasks in ${active.totalMs.toFixed(0)} milliseconds`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs>
          <clipPath id="thread-process-timeline-clip"><rect x={104} y={timelineTop - 12} width={638} height={active.laneCount * laneHeight + 12} /></clipPath>
        </defs>
        <text x={106} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>Finished time for the same {config.taskCount} tasks</text>
        {(['threads', 'processes'] as const).map((series, index) => {
          const y = 42 + index * 44;
          const value = comparison[series].totalMs;
          return (
            <g key={series}>
              <text x={100} y={y + 18} textAnchor="end" fontSize={15} fill={colors[series]}>{series === 'threads' ? 'Threads' : 'Processes'}</text>
              <rect x={106} y={y} width={(value / maxMs) * 560} height={24} rx={5} fill={colors[series]} fillOpacity={model === series ? 0.8 : 0.3} />
              <text x={116 + (value / maxMs) * 560} y={y + 18} fontSize={15} fontWeight={700} fill={colors[series]}>{value.toFixed(0)} ms</text>
            </g>
          );
        })}
        <text x={106} y={142} fontSize={16} fontWeight={700} fill={activeColor}>{MODEL_LABEL[model]} timeline</text>
        <text x={742} y={142} textAnchor="end" fontSize={14} fill={t.textSecondary}>time moves left → right</text>
        <g clipPath="url(#thread-process-timeline-clip)">
          {Array.from({ length: active.laneCount }, (_, lane) => {
            const y = timelineTop + lane * laneHeight;
            return (
              <g key={lane}>
                <line x1={106} y1={y + 16} x2={736} y2={y + 16} stroke={t.border} strokeWidth={1} />
                {visibleSegments.filter((segment) => segment.lane === lane).map((segment, index) => {
                  const x = mapX(segment.startMs);
                  const width = Math.max(3, mapX(segment.endMs) - x);
                  return (
                    <g key={`${segment.task}-${segment.kind}-${index}`}>
                      <rect
                        x={x}
                        y={y + 3}
                        width={width}
                        height={26}
                        rx={4}
                        fill={segment.kind === 'wait' ? t.surface : activeColor}
                        fillOpacity={segment.kind === 'startup' ? 0.35 : 0.8}
                        stroke={activeColor}
                        strokeWidth={1.5}
                        strokeDasharray={segment.kind === 'wait' ? '5 4' : undefined}
                      />
                      {width > 42 && <text x={x + width / 2} y={y + 21} textAnchor="middle" fontSize={14} fill={segment.kind === 'wait' ? activeColor : t.background}>{segment.kind === 'startup' ? 'start' : segment.kind === 'wait' ? `wait ${segment.task + 1}` : `CPU ${segment.task + 1}`}</text>}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
        {Array.from({ length: active.laneCount }, (_, lane) => (
          <text key={lane} x={96} y={timelineTop + lane * laneHeight + 21} textAnchor="end" fontSize={14} fill={t.textSecondary}>worker {lane + 1}</text>
        ))}
        <line x1={mapX(elapsed)} y1={timelineTop - 8} x2={mapX(elapsed)} y2={timelineTop + active.laneCount * laneHeight} stroke={t.accentDanger} strokeWidth={2} />
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote title={model === 'threads' ? 'CPU time with threads' : 'CPU time with processes'} latex={model === 'threads' ? String.raw`T_{\text{CPU}}=\sum_i C_i` : String.raw`T_{\text{CPU}}=S+\max_k\sum_{i\in k} C_i`} color="yellow" tilt={-1}>
            <p>{model === 'threads' ? 'The GIL lets one thread run Python CPU code at a time.' : 'S is startup; each process can run on a separate core.'}</p>
          </StickyNote>
          <StickyNote title={`Step ${shownTasks} of ${config.taskCount}`} color="blue" tilt={1} live><p>{stepText}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="CPU time with threads" latex={String.raw`T_{\text{CPU}}=\sum_i C_i`} color="yellow" tilt={-1} active={model === 'threads'} onSelect={() => { setModel('threads'); playback.reset(); }}>
              <p>Cᵢ is task i’s Python CPU time. The GIL serializes these CPU sections.</p>
            </StickyNote>
            <StickyNote title="CPU time with processes" latex={String.raw`T_{\text{CPU}}=S+\max_k\sum_{i\in k} C_i`} color="pink" tilt={1} active={model === 'processes'} onSelect={() => { setModel('processes'); playback.reset(); }}>
              <p>S is process startup. k is one core, so the slowest core determines the finish time.</p>
            </StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={1}>
              <p>{config.taskCount} tasks × ({config.cpuMs} ms CPU + {config.ioMs} ms wait). Threads finish in <strong>{comparison.threads.totalMs.toFixed(0)} ms</strong>; processes finish in <strong>{comparison.processes.totalMs.toFixed(0)} ms</strong>.</p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${shownTasks}`} color="blue" tilt={-1} live><p>{stepText}</p></StickyNote>
          </StickyRow>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: `1px dashed ${t.border}`, fontSize: 15 }}>
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span>Which model finishes this workload first?</span>
            <select aria-label="Predicted faster execution model" value={prediction} onChange={(event) => { setPrediction(event.target.value as ExecutionModel); setPredictionResult(null); }} style={{ minHeight: 34, border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit' }}>
              <option value="threads">Threads</option>
              <option value="processes">Processes</option>
            </select>
            <VizButton onClick={() => { setPredictionResult(prediction === winner); setModel(winner); }}>Run prediction</VizButton>
            {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>{predictionResult ? 'Correct.' : `Not this time: ${winner} finish first.`}</span>}
          </div>
        </>
      )}
    </>
  );
}

export default function ThreadingVsMultiprocessingDiagram({ compact = false }: { compact?: boolean }) {
  return (
    <VisualizationContainer
      title="Threading versus multiprocessing playground"
      footer="This is a deterministic CPython scheduling model: thread CPU sections share one GIL, I/O waits overlap, and process CPU sections use the available cores after editable startup time. The values are calculated timings, not a benchmark of this browser."
    >
      <ThreadingPlayground compact={compact} />
    </VisualizationContainer>
  );
}
