import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  useVizVisible,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from '../primitives';
import {
  analyzeBenchmarkDimensions,
  parseRelevantRanks,
  SERVED_MODELS,
  type BenchmarkSystemType,
  type RetrievalPipelineId,
  type ServedModelId,
} from '../lib/benchmarkDimensions';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'TTFT (time waiting before word 1 starts)',
  'TPOT (time between streamed output words)',
  'Both stay completely unchanged',
] as const;

const FORMULA_LATEX: Record<'served' | 'retrieval' | 'cost', string> = {
  served: String.raw`\text{E2E} = \text{TTFT} + N_{\text{out}}\cdot\text{TPOT},\quad \text{VRAM} = W + C\cdot\text{KV}`,
  retrieval: String.raw`\text{NDCG}@k = \frac{\text{DCG}@k}{\text{IDCG}@k},\quad \text{MRR} = \frac{1}{r_{\text{first}}}`,
  cost: String.raw`\text{Cost per 1M} = \frac{\text{GPU \$/hr}}{3600 \cdot \text{rate}} \times 10^6`,
};

function BenchmarkDimensionsPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipAxesId = useId();
  const clipDetailId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [system, setSystem] = useState<BenchmarkSystemType>('served');
  const [servedModelId, setServedModelId] = useState<ServedModelId>('balanced-70b');
  const [promptTokens, setPromptTokens] = useState<number>(1200);
  const [outputTokens, setOutputTokens] = useState<number>(128);
  const [concurrency, setConcurrency] = useState<number>(4);

  const [retrievalPipeline, setRetrievalPipeline] = useState<RetrievalPipelineId>('hybrid-rerank');
  const [topK, setTopK] = useState<number>(5);
  const [rerankCandidates, setRerankCandidates] = useState<number>(20);
  const [ranksText, setRanksText] = useState<string>('1, 3, 7');

  const [prediction, setPrediction] = useState<number | null>(null);

  const relevantRanks = useMemo(() => parseRelevantRanks(ranksText), [ranksText]);
  const analysis = useMemo(
    () =>
      analyzeBenchmarkDimensions({
        system,
        servedModelId,
        promptTokens,
        outputTokens,
        concurrency,
        retrievalPipeline,
        topK,
        rerankCandidates,
        relevantRanks,
      }),
    [system, servedModelId, promptTokens, outputTokens, concurrency, retrievalPipeline, topK, rerankCandidates, relevantRanks],
  );

  const playback = useStepPlayback(analysis.trace.length, 2300, 0, outerVisible);
  const activeStep = analysis.trace[playback.step] ?? analysis.trace[0];

  const latencyColor = t.accentSecondary;
  const qualityColor = t.accentPrimary;
  const resourceColor = t.accentPurple;
  const costColor = t.accentWarn;
  const dangerColor = t.accentDanger;

  const axisColor = (id: 'latency' | 'core' | 'resource' | 'cost') =>
    id === 'latency' ? latencyColor : id === 'core' ? qualityColor : id === 'resource' ? resourceColor : costColor;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 34,
    padding: '4px 8px',
    font: 'inherit',
    fontSize: 15,
    fontVariantNumeric: 'tabular-nums',
    border: `1.5px solid ${t.border}`,
    borderRadius: RADIUS.sm,
    background: t.background,
    color: t.textPrimary,
  };

  const renderAxesPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 12;
    const plotY = 36;
    const plotW = panelW - 24;
    const plotH = 216;
    const barW = plotW - 24;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. The 4 axes for {system === 'served' ? 'a served LLM' : 'retrieval / search'}
        </text>
        <defs>
          <clipPath id={`${clipAxesId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipAxesId}-${offsetX})`}>
          {analysis.dimensions.map((dim, idx) => {
            const ry = plotY + 12 + idx * 51;
            const active = idx === playback.step;
            const col = axisColor(dim.id);
            const fillW = Math.max(6, dim.gaugeFraction * barW);
            return (
              <g key={dim.id} onClick={() => playback.setStep(idx)} style={{ cursor: 'pointer' }}>
                {active && (
                  <rect x={plotX + 6} y={ry - 4} width={plotW - 12} height={46} rx={5} fill={col} fillOpacity={0.12} />
                )}
                <text x={plotX + 12} y={ry + 12} fontSize={14} fontWeight={700} fill={col}>
                  {dim.title}
                </text>
                <text x={plotX + plotW - 12} y={ry + 12} textAnchor="end" fontSize={14} fontWeight={700} fill={dim.passesTarget ? t.textPrimary : dangerColor}>
                  {dim.valueLabel}
                </text>
                <rect x={plotX + 12} y={ry + 21} width={barW} height={11} rx={3} fill={t.surfaceAlt} />
                <rect x={plotX + 12} y={ry + 21} width={fillW} height={11} rx={3} fill={dim.passesTarget ? col : dangerColor} fillOpacity={0.85} />
              </g>
            );
          })}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Click any metric row above to inspect its formula
        </text>
      </g>
    );
  };

  const renderDetailPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 14;
    const plotY = 36;
    const plotW = panelW - 28;
    const plotH = 216;
    const barW = plotW - 24;

    if (system === 'served') {
      const totalMs = Math.max(1, analysis.e2eMs);
      const ttftW = Math.max(8, (analysis.ttftMs / totalMs) * barW);
      const decodeW = Math.max(6, barW - ttftW);

      const maxMem = Math.max(analysis.servedModel.vramBudgetGib * 1.15, analysis.totalVramGib * 1.05);
      const weightsW = (analysis.servedModel.weightsGib / maxMem) * barW;
      const kvW = (analysis.kvCacheGib / maxMem) * barW;
      const budgetX = plotX + 12 + (analysis.servedModel.vramBudgetGib / maxMem) * barW;

      return (
        <g>
          <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
            2. Request timeline &amp; GPU VRAM budget
          </text>
          <defs>
            <clipPath id={`${clipDetailId}-${offsetX}`}>
              <rect x={plotX} y={plotY} width={plotW} height={plotH} />
            </clipPath>
          </defs>
          <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

          <g clipPath={`url(#${clipDetailId}-${offsetX})`}>
            <text x={plotX + 12} y={plotY + 24} fontSize={14} fontWeight={700} fill={latencyColor}>
              End-to-end wait = {(analysis.e2eMs / 1000).toFixed(2)} s
            </text>
            <rect x={plotX + 12} y={plotY + 34} width={ttftW} height={26} rx={4} fill={latencyColor} fillOpacity={0.85} />
            <rect x={plotX + 12 + ttftW} y={plotY + 34} width={decodeW} height={26} rx={4} fill={qualityColor} fillOpacity={0.85} />
            <text x={plotX + 12} y={plotY + 80} fontSize={14} fill={latencyColor}>
              Prefill (TTFT): {analysis.ttftMs.toFixed(0)} ms
            </text>
            <text x={plotX + plotW - 12} y={plotY + 80} textAnchor="end" fontSize={14} fill={qualityColor}>
              Decode: {analysis.outputTokens} × {analysis.tpotMs.toFixed(1)} ms
            </text>

            <line x1={plotX + 12} y1={plotY + 98} x2={plotX + plotW - 12} y2={plotY + 98} stroke={t.border} strokeWidth={1} />

            <text x={plotX + 12} y={plotY + 122} fontSize={14} fontWeight={700} fill={analysis.fitsGpu ? resourceColor : dangerColor}>
              VRAM: {analysis.totalVramGib.toFixed(1)} GiB ({analysis.fitsGpu ? 'fits' : 'OOM >'} {analysis.servedModel.vramBudgetGib} GiB)
            </text>
            <rect x={plotX + 12} y={plotY + 132} width={barW} height={26} rx={4} fill={t.surfaceAlt} />
            <rect x={plotX + 12} y={plotY + 132} width={weightsW} height={26} rx={4} fill={resourceColor} fillOpacity={0.85} />
            <rect x={plotX + 12 + weightsW} y={plotY + 132} width={kvW} height={26} rx={3} fill={costColor} fillOpacity={0.9} />
            <line x1={budgetX} y1={plotY + 126} x2={budgetX} y2={plotY + 164} stroke={dangerColor} strokeWidth={2} strokeDasharray="4 3" />
            <text x={plotX + 12} y={plotY + 180} fontSize={14} fill={resourceColor}>
              Weights: {analysis.servedModel.weightsGib} GiB
            </text>
            <text x={plotX + plotW - 12} y={plotY + 180} textAnchor="end" fontSize={14} fill={costColor}>
              KV ({analysis.concurrency} users): {analysis.kvCacheGib.toFixed(2)} GiB
            </text>
          </g>

          <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            Cost = ${analysis.costPer1MTokens.toFixed(2)} / 1M output tokens
          </text>
        </g>
      );
    }

    const slotCount = analysis.topK;
    const slotW = Math.floor((barW - (slotCount - 1) * 4) / slotCount);
    const maxLat = Math.max(60, analysis.retrievalLatencyMs);
    const embW = (analysis.embedMs / maxLat) * barW;
    const annW = (analysis.annMs / maxLat) * barW;
    const rerankW = (analysis.rerankMs / maxLat) * barW;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Top-{analysis.topK} retrieved slots &amp; query latency
        </text>
        <defs>
          <clipPath id={`${clipDetailId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipDetailId}-${offsetX})`}>
          <text x={plotX + 12} y={plotY + 24} fontSize={14} fontWeight={700} fill={qualityColor}>
            Relevant ranks inside top {analysis.topK}: {analysis.hitsInTopK} of {analysis.relevantRanks.length}
          </text>
          {Array.from({ length: slotCount }, (_, i) => {
            const rank = i + 1;
            const isHit = analysis.relevantRanks.includes(rank);
            const sx = plotX + 12 + i * (slotW + 4);
            const gain = 1 / Math.log2(rank + 1);
            const h = Math.round(gain * 46);
            return (
              <g key={`rank-${rank}`}>
                <rect x={sx} y={plotY + 34} width={slotW} height={50} rx={4} fill={t.surfaceAlt} />
                <rect
                  x={sx}
                  y={plotY + 84 - h}
                  width={slotW}
                  height={h}
                  rx={3}
                  fill={isHit ? qualityColor : t.border}
                  fillOpacity={isHit ? 0.88 : 0.4}
                />
                <text x={sx + slotW / 2} y={plotY + 102} textAnchor="middle" fontSize={14} fontWeight={isHit ? 700 : 400} fill={isHit ? qualityColor : t.textMuted}>
                  #{rank}
                </text>
              </g>
            );
          })}

          <line x1={plotX + 12} y1={plotY + 114} x2={plotX + plotW - 12} y2={plotY + 114} stroke={t.border} strokeWidth={1} />

          <text x={plotX + 12} y={plotY + 136} fontSize={14} fontWeight={700} fill={latencyColor}>
            Query latency = {analysis.retrievalLatencyMs.toFixed(1)} ms
          </text>
          <rect x={plotX + 12} y={plotY + 146} width={barW} height={24} rx={4} fill={t.surfaceAlt} />
          <rect x={plotX + 12} y={plotY + 146} width={embW} height={24} rx={3} fill={latencyColor} fillOpacity={0.85} />
          <rect x={plotX + 12 + embW} y={plotY + 146} width={annW} height={24} rx={3} fill={resourceColor} fillOpacity={0.85} />
          {rerankW > 0 && (
            <rect x={plotX + 12 + embW + annW} y={plotY + 146} width={rerankW} height={24} rx={3} fill={costColor} fillOpacity={0.88} />
          )}
          <text x={plotX + 12} y={plotY + 190} fontSize={14} fill={t.textSecondary}>
            Embed {analysis.embedMs}ms · ANN {analysis.annMs}ms · Rerank {analysis.rerankMs.toFixed(0)}ms
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          NDCG@{analysis.topK} = {(analysis.ndcgAtK * 100).toFixed(1)}% · Cost ${analysis.costPer1kQueries.toFixed(3)} / 1k queries
        </text>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="Why serving an LLM and running search need completely different benchmarks"
                description="Measuring tokens-per-second on a vector search index makes no sense, and measuring Recall@k on a chat model misses GPU memory bottlenecks. Switch systems to see which metrics matter and how workload inputs shift them."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<BenchmarkSystemType>
                label="System type (what you are evaluating)"
                value={system}
                onChange={(val) => setSystem(val)}
                options={[
                  { value: 'served', label: 'Any served model' },
                  { value: 'retrieval', label: 'Retrieval (embedding/reranker)' },
                ]}
              />
            </div>
            {system === 'served' ? (
              <div style={{ marginBottom: -8 }}>
                <PillSelect<ServedModelId>
                  label="Model profile"
                  value={servedModelId}
                  onChange={(val) => setServedModelId(val)}
                  options={Object.values(SERVED_MODELS).map((m) => ({ value: m.id, label: m.label }))}
                />
              </div>
            ) : (
              <div style={{ marginBottom: -8 }}>
                <PillSelect<RetrievalPipelineId>
                  label="Retrieval stages"
                  value={retrievalPipeline}
                  onChange={(val) => setRetrievalPipeline(val)}
                  options={[
                    { value: 'bi-encoder', label: 'Bi-encoder ANN only' },
                    { value: 'hybrid-rerank', label: 'ANN + Cross-encoder rerank' },
                  ]}
                />
              </div>
            )}
          </div>

          {system === 'served' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12, alignItems: 'end' }}>
              <Slider
                label="Prompt length (input tokens)"
                value={promptTokens}
                onChange={(v) => setPromptTokens(v)}
                min={128}
                max={8192}
                step={128}
                format={(v) => `${v} tok`}
              />
              <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
                <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Output tokens generated</span>
                <input
                  aria-label="Output tokens generated"
                  type="number"
                  min={16}
                  max={2048}
                  step={16}
                  value={outputTokens}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setOutputTokens(Math.max(16, Math.min(2048, Math.round(v))));
                  }}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
                <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Concurrent users C</span>
                <input
                  aria-label="Concurrent users C"
                  type="number"
                  min={1}
                  max={64}
                  step={1}
                  value={concurrency}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setConcurrency(Math.max(1, Math.min(64, Math.round(v))));
                  }}
                  style={inputStyle}
                />
              </label>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12, alignItems: 'end' }}>
              <Slider
                label="Cutoff k (results returned)"
                value={topK}
                onChange={(v) => setTopK(v)}
                min={1}
                max={10}
                step={1}
                format={(v) => `top ${v}`}
              />
              <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
                <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>True relevant ranks</span>
                <input
                  aria-label="True relevant document ranks"
                  type="text"
                  value={ranksText}
                  onChange={(e) => setRanksText(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <Slider
                label="Candidates reranked"
                value={rerankCandidates}
                onChange={(v) => setRerankCandidates(v)}
                min={5}
                max={60}
                step={5}
                format={(v) => `${v} docs`}
              />
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Dimension colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: latencyColor, verticalAlign: 'middle', marginRight: 6 }} />
          Latency
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: qualityColor, verticalAlign: 'middle', marginRight: 6 }} />
          {system === 'served' ? 'Throughput & decode' : 'Rank order (MRR / NDCG)'}
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: resourceColor, verticalAlign: 'middle', marginRight: 6 }} />
          {system === 'served' ? 'Model weights' : 'ANN index / Recall@k'}
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: costColor, verticalAlign: 'middle', marginRight: 6 }} />
          {system === 'served' ? 'KV cache & unit cost' : 'Rerank & query cost'}
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 296"
            role="img"
            aria-label={
              system === 'served'
                ? `Served LLM: TTFT ${analysis.ttftMs.toFixed(0)} ms, VRAM ${analysis.totalVramGib.toFixed(1)} GiB`
                : `Retrieval: NDCG@${analysis.topK} ${(analysis.ndcgAtK * 100).toFixed(1)}%, latency ${analysis.retrievalLatencyMs.toFixed(1)} ms`
            }
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderAxesPanel(0, 372)}
            {renderDetailPanel(388, 372)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Benchmark axes summary" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderAxesPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Workload breakdown" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderDetailPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title={system === 'served' ? 'Served LLM axes' : 'Retrieval axes'}
            latex={FORMULA_LATEX[system]}
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              {system === 'served'
                ? `TTFT ${analysis.ttftMs.toFixed(0)} ms · ${analysis.totalVramGib.toFixed(1)} GiB · $${analysis.costPer1MTokens.toFixed(2)}/1M`
                : `MRR ${analysis.mrr.toFixed(2)} · NDCG ${(analysis.ndcgAtK * 100).toFixed(1)}% · ${analysis.retrievalLatencyMs.toFixed(0)} ms`}
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length}`} color="blue" tilt={1} live>
            <p>{activeStep.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Any served model (LLM)"
              latex={FORMULA_LATEX.served}
              color="yellow"
              tilt={-1}
              active={system === 'served'}
              onSelect={() => setSystem('served')}
            >
              <p style={{ textAlign: 'center' }}>Splits wait into prefill (TTFT) + decode (TPOT) and tracks VRAM + $/1M tokens.</p>
            </StickyNote>
            <StickyNote
              title="Retrieval (search / RAG)"
              latex={FORMULA_LATEX.retrieval}
              color="pink"
              tilt={1}
              active={system === 'retrieval'}
              onSelect={() => setSystem('retrieval')}
            >
              <p style={{ textAlign: 'center' }}>Scores top-k hit order via Recall@k, MRR, NDCG, and query latency.</p>
            </StickyNote>
            <StickyNote title="Shared axis: Unit cost" latex={FORMULA_LATEX.cost} color="orange" tilt={-1}>
              <p style={{ textAlign: 'center' }}>Every system turns compute time per unit work into real dollar cost.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote
              title={system === 'served' ? `Worked numbers · ${analysis.servedModel.label}` : `Worked numbers · top ${analysis.topK}`}
              color="green"
              tilt={1}
            >
              {system === 'served' ? (
                <>
                  <p className="nm-sticky__mono">
                    E2E = {analysis.ttftMs.toFixed(0)} ms + {analysis.outputTokens}×{analysis.tpotMs.toFixed(1)} ms = <strong>{(analysis.e2eMs / 1000).toFixed(2)} s</strong>
                  </p>
                  <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                    VRAM = {analysis.servedModel.weightsGib} + {analysis.kvCacheGib.toFixed(2)} = <strong>{analysis.totalVramGib.toFixed(1)} GiB</strong> · <strong>{analysis.throughputTokPerSec.toFixed(0)} tok/s</strong>
                  </p>
                </>
              ) : (
                <>
                  <p className="nm-sticky__mono">
                    Hits in top {analysis.topK}: <strong>{analysis.hitsInTopK}/{analysis.relevantRanks.length}</strong> · R@{analysis.topK} = <strong>{(analysis.recallAtK * 100).toFixed(0)}%</strong> · P@{analysis.topK} = <strong>{(analysis.precisionAtK * 100).toFixed(0)}%</strong>
                  </p>
                  <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                    MRR = <strong>{analysis.mrr.toFixed(2)}</strong> · NDCG@{analysis.topK} = <strong>{(analysis.ndcgAtK * 100).toFixed(1)}%</strong> · Latency = <strong>{analysis.retrievalLatencyMs.toFixed(1)} ms</strong>
                  </p>
                </>
              )}
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length} · ${activeStep.title}`} color="blue" tilt={-1} live>
              <p>{activeStep.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="On a served 70B LLM with 128 output tokens fixed, you jump prompt length from 1,000 to 4,000 tokens. Which latency metric rises steeply first?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="The model must process all 4,000 prompt tokens before emitting token #1, raising TTFT directly while TPOT between output words barely changes."
            actionLabel="Test 4,000-token prompt now"
            onAction={() => {
              setSystem('served');
              setServedModelId('balanced-70b');
              setPromptTokens(4000);
              setOutputTokens(128);
              playback.setStep(0);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function BenchmarkDimensionsSelectorDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Benchmark dimensions playground"
      footer="Illustrative single-node serving latencies and exact Recall@k, Precision@k, MRR, and NDCG@k metrics computed live from your inputs."
    >
      <BenchmarkDimensionsPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
