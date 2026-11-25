import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton } from '../primitives';
import { buildAgentTrace, type AgentSpanKind, type AgentTraceConfig } from '../lib/agentTrace';
import { usePlaygroundPlayback } from './usePlaygroundPlayback';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";
const DEFAULT_CONFIG: AgentTraceConfig = {
  task: 'Fix the login timeout',
  planInputTokens: 600,
  planOutputTokens: 420,
  patchInputTokens: 1_200,
  patchOutputTokens: 850,
  tokensPerSecond: 80,
  toolLatencyMs: 220,
  verificationMs: 900,
  retries: 1,
  inputPricePerMillion: 3,
  outputPricePerMillion: 15,
};

const money = (value: number) => `$${value.toFixed(value >= 0.01 ? 3 : 5)}`;
const elapsed = (value: number) => value >= 1_000 ? `${(value / 1_000).toFixed(2)} s` : `${Math.round(value)} ms`;
const shortLabel = (value: string) => value.length > 22 ? `${value.slice(0, 21)}…` : value;

function NumberControl({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void;
}) {
  const t = useVizTokens();
  return <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
    <span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>{label}</span>
    <input aria-label={label} type="number" value={value} min={min} max={max} step={step}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, next)));
      }}
      style={{ width: '100%', boxSizing: 'border-box', minHeight: 34, padding: '4px 7px', border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
  </label>;
}

export default function AgentTraceWaterfallVisualizer({ compact = false }: { compact?: boolean }) {
  const t = useVizTokens();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const trace = useMemo(() => buildAgentTrace(config), [config]);
  const childSpans = trace.spans.slice(1);
  const playback = usePlaygroundPlayback(childSpans.length, 1500);
  const current = childSpans[playback.step] ?? childSpans[0];
  const modelSpans = childSpans.filter((span) => span.kind === 'model' || span.kind === 'retry');
  const mostExpensive = [...modelSpans].sort((a, b) => b.costUsd - a.costUsd)[0];
  const [prediction, setPrediction] = useState('patch');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);
  const update = <K extends keyof AgentTraceConfig>(key: K, value: AgentTraceConfig[K]) => {
    setConfig((previous) => ({ ...previous, [key]: value }));
    setPredictionResult(null);
  };

  const colors: Record<AgentSpanKind, string> = {
    session: t.accentPrimary, model: t.accentSecondary, tool: t.accentTeal, retry: t.accentWarn, verify: t.accentDanger,
  };
  const legend = [['model', 'Model writes'], ['tool', 'Tools run'], ['retry', 'Repair attempt'], ['verify', 'Verification']] as const;
  const width = 760;
  const labelWidth = 190;
  const plotWidth = width - labelWidth - 24;
  const rowHeight = 40;
  const waterfallHeight = 76 + trace.spans.length * rowHeight;
  const safeTotal = Math.max(1, trace.totalDurationMs);
  const x = (ms: number) => labelWidth + (ms / safeTotal) * plotWidth;
  const maxCost = Math.max(0.000001, ...modelSpans.map((span) => span.costUsd));
  const costHeight = 54 + modelSpans.length * 42;
  const currentText = `${current.label} starts at ${elapsed(current.startMs)}, lasts ${elapsed(current.durationMs)}, and ${current.costUsd > 0 ? `costs ${money(current.costUsd)}` : 'has no token charge in this model'}.`;

  return <VisualizationContainer title="Agent trace waterfall playground"
    footer="Every bar, timestamp, token total, and cost is calculated from the editable inputs. The timing model adds 120 ms of model overhead and generated tokens divided by tokens per second; it is an illustrative trace, not a production benchmark.">
    {!compact && <>
      <VisualizationHeader eyebrow="Live playground" title="Find the slow or expensive step in an agent run"
        description="This solves a common debugging problem: an agent feels slow or costly, but a trace shows exactly which model call, tool, repair, or check used the time and money." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <label style={{ display: 'block', gridColumn: '1 / -1', fontSize: 15 }}>
          <span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Task name (the root trace)</span>
          <input aria-label="Task name (the root trace)" value={config.task} maxLength={42}
            onChange={(event) => update('task', event.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', minHeight: 34, padding: '4px 7px', border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit' }} />
        </label>
        <NumberControl label="Model speed (output tokens/second)" value={config.tokensPerSecond} min={1} max={500} onChange={(value) => update('tokensPerSecond', value)} />
        <NumberControl label="Planning output tokens" value={config.planOutputTokens} min={1} max={8_000} onChange={(value) => update('planOutputTokens', value)} />
        <NumberControl label="Patch output tokens" value={config.patchOutputTokens} min={1} max={12_000} onChange={(value) => update('patchOutputTokens', value)} />
        <NumberControl label="Tool time (milliseconds)" value={config.toolLatencyMs} min={0} max={10_000} onChange={(value) => update('toolLatencyMs', value)} />
        <NumberControl label="Verification time (milliseconds)" value={config.verificationMs} min={0} max={30_000} onChange={(value) => update('verificationMs', value)} />
        <NumberControl label="Repair attempts after a failed check" value={config.retries} min={0} max={4} onChange={(value) => update('retries', Math.round(value))} />
        <NumberControl label="Input price (dollars/million tokens)" value={config.inputPricePerMillion} min={0} max={200} step={0.5} onChange={(value) => update('inputPricePerMillion', value)} />
        <NumberControl label="Output price (dollars/million tokens)" value={config.outputPricePerMillion} min={0} max={400} step={0.5} onChange={(value) => update('outputPricePerMillion', value)} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 15 }}>
        <strong style={{ color: t.accentWarn }}>Predict first:</strong><span>Which model-writing span costs the most?</span>
        <select aria-label="Predicted most expensive span" value={prediction}
          onChange={(event) => { setPrediction(event.target.value); setPredictionResult(null); }}
          style={{ minHeight: 34, border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary, font: 'inherit' }}>
          {modelSpans.map((span) => <option key={span.id} value={span.id}>{span.label}</option>)}
        </select>
        <VizButton onClick={() => setPredictionResult(prediction === mostExpensive.id)}>Run prediction</VizButton>
        {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>
          {predictionResult ? 'Correct.' : `The largest token bill is ${mostExpensive.label}: ${money(mostExpensive.costUsd)}.`}
        </span>}
      </div>
    </>}

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', fontSize: 15, marginTop: compact ? 0 : 10 }} aria-label="Span colour legend">
      {legend.map(([kind, label]) => <span key={kind}><span style={{ display: 'inline-block', width: 20, height: 5, marginRight: 6, verticalAlign: 'middle', background: colors[kind] }} />{label}</span>)}
    </div>

    <svg width="100%" viewBox={`0 0 ${width} ${waterfallHeight}`} role="img"
      aria-label={`Trace for ${config.task}: ${childSpans.length} child spans take ${elapsed(trace.totalDurationMs)} and cost ${money(trace.totalCostUsd)}`}
      style={{ display: 'block', fontFamily: HAND_FONT }}>
      <defs><clipPath id="agent-trace-plot"><rect x={labelWidth} y={34} width={plotWidth} height={waterfallHeight - 70} /></clipPath></defs>
      <text x={14} y={22} fontSize={16} fontWeight={700} fill={t.textPrimary}>Span</text>
      <text x={labelWidth} y={22} fontSize={16} fontWeight={700} fill={t.textPrimary}>Elapsed from trace start →</text>
      <g clipPath="url(#agent-trace-plot)">
        {trace.spans.map((span, index) => {
          const rowY = 38 + index * rowHeight;
          const barWidth = Math.max(4, (span.durationMs / safeTotal) * plotWidth);
          const revealed = index === 0 || index - 1 <= playback.step;
          const active = span.id === current.id;
          return <rect key={span.id} x={x(span.startMs)} y={rowY} width={barWidth} height={25} rx={5}
            opacity={revealed ? 1 : 0.18} fill={colors[span.kind]} fillOpacity={span.kind === 'session' ? 0.42 : 0.82}
            stroke={active ? t.textPrimary : colors[span.kind]} strokeWidth={active ? 2.5 : 1.2} />;
        })}
      </g>
      {trace.spans.map((span, index) => {
        const rowY = 38 + index * rowHeight;
        const barEnd = x(span.endMs);
        const revealed = index === 0 || index - 1 <= playback.step;
        return <g key={`label-${span.id}`} opacity={revealed ? 1 : 0.18}>
          <text x={14} y={rowY + 18} fontSize={15} fontWeight={span.id === current.id ? 700 : 400} fill={span.id === current.id ? colors[span.kind] : t.textPrimary}>{shortLabel(span.label)}</text>
          <text x={Math.min(width - 8, barEnd + 7)} y={rowY + 18} textAnchor={barEnd > width - 90 ? 'end' : 'start'} fontSize={14} fontWeight={700} fill={t.textSecondary}>{elapsed(span.durationMs)}</text>
        </g>;
      })}
      {[0, 0.5, 1].map((fraction) => <g key={fraction}>
        <line x1={labelWidth + fraction * plotWidth} y1={waterfallHeight - 34} x2={labelWidth + fraction * plotWidth} y2={waterfallHeight - 27} stroke={t.border} strokeWidth={1.5} />
        <text x={labelWidth + fraction * plotWidth} y={waterfallHeight - 8} textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'} fontSize={14} fill={t.textSecondary}>{elapsed(trace.totalDurationMs * fraction)}</text>
      </g>)}
    </svg>

    {!compact && <>
      <h4 style={{ margin: '0.25rem 0 0', fontSize: 18 }}>Token cost by model call</h4>
      <svg width="100%" viewBox={`0 0 ${width} ${costHeight}`} role="img" aria-label="Calculated token cost for every model call" style={{ display: 'block', fontFamily: HAND_FONT }}>
        {modelSpans.map((span, index) => {
          const y = 30 + index * 42;
          const active = span.id === current.id;
          return <g key={span.id}>
            <text x={14} y={y + 17} fontSize={15} fontWeight={active ? 700 : 400} fill={active ? colors[span.kind] : t.textPrimary}>{span.label}</text>
            <rect x={220} y={y} width={(span.costUsd / maxCost) * 430} height={22} rx={5} fill={colors[span.kind]} fillOpacity={0.82} />
            <text x={664} y={y + 17} fontSize={15} fontWeight={700} fill={t.textSecondary}>{money(span.costUsd)}</text>
          </g>;
        })}
      </svg>
    </>}

    {compact ? <StickyRow>
      <StickyNote title="Worked total" color="green" tilt={-1}><p>{trace.totalTokens.toLocaleString()} tokens · {elapsed(trace.totalDurationMs)} · <strong>{money(trace.totalCostUsd)}</strong></p></StickyNote>
      <StickyNote title={`Step ${playback.step + 1} of ${childSpans.length}`} color="blue" tilt={1} live><p>{currentText}</p></StickyNote>
    </StickyRow> : <>
      <StickyRow>
        <StickyNote title="Model time" latex={String.raw`t_{\mathrm{model}}=120\,\mathrm{ms}+\frac{n_{\mathrm{out}}}{r}\times1000`} color="yellow" tilt={-1}>
          <p>n_out = generated tokens; r = output tokens each second.</p>
        </StickyNote>
        <StickyNote title="Token cost" latex={String.raw`C=\frac{n_{\mathrm{in}}p_{\mathrm{in}}+n_{\mathrm{out}}p_{\mathrm{out}}}{1{,}000{,}000}`} color="pink" tilt={1}>
          <p>p_in and p_out are the prices per million input and output tokens.</p>
        </StickyNote>
      </StickyRow>
      <StickyRow>
        <StickyNote title="Worked total" color="green" tilt={-1}><p>{trace.totalTokens.toLocaleString()} tokens across {childSpans.length} child spans = {elapsed(trace.totalDurationMs)} and <strong>{money(trace.totalCostUsd)}</strong>.</p></StickyNote>
        <StickyNote title={`What just happened · step ${playback.step + 1}`} color="blue" tilt={1} live><p>{currentText}</p></StickyNote>
      </StickyRow>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
        <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
        <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
      </div>
    </>}
  </VisualizationContainer>;
}
