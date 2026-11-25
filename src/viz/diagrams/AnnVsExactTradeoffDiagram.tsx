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
  analyzeAnnTradeoff,
  ANN_DATASET_PRESETS,
  ANN_TRACE_EFS,
  type AnnIndexKind,
} from '../lib/annVsExact';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Always build an HNSW graph — graphs are faster at every size',
  'Run a plain exact scan — on 10k items it takes < 1 ms with 100% recall',
  'Exact scan fails below 100k vectors',
] as const;

const FORMULA_LATEX = {
  hnsw: String.raw`T_{\text{HNSW}} \approx a\log_2 N + b\cdot \mathit{ef}`,
  ivf: String.raw`T_{\text{IVF}} \approx a + c\cdot N \cdot \mathit{ef}`,
  exact: String.raw`T_{\text{exact}} = c_0 \cdot N,\quad \text{Speedup} = \frac{T_{\text{exact}}}{T_{\text{ANN}}}`,
} as const;

function formatVectorsCount(millions: number): string {
  const total = Math.round(millions * 1_000_000);
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(total % 1_000_000 === 0 ? 0 : 1)}M`;
  return `${Math.round(total / 1000)}k`;
}

function formatMs(ms: number): string {
  return ms < 10 ? ms.toFixed(2) : ms.toFixed(1);
}

function AnnVsExactPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipMapId = useId();
  const clipCurveId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [manualEf, setManualEf] = useState<number | null>(null);
  const [datasetMillions, setDatasetMillions] = useState<number>(10);
  const [indexKind, setIndexKind] = useState<AnnIndexKind>('hnsw');
  const [queryX, setQueryX] = useState<number>(0.95);
  const [queryY, setQueryY] = useState<number>(0.85);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(ANN_TRACE_EFS.length, 2000, 2, outerVisible);
  const ef = manualEf ?? ANN_TRACE_EFS[playback.step] ?? 60;

  const analysis = useMemo(
    () =>
      analyzeAnnTradeoff({
        ef,
        datasetMillions,
        indexKind,
        query: [queryX, queryY],
        topK: 3,
      }),
    [ef, datasetMillions, indexKind, queryX, queryY],
  );

  const annColor = t.accentSecondary;
  const foundColor = t.accentPrimary;
  const exactColor = t.accentDanger;
  const queryColor = t.accentPurple;

  const selectEf = (nextEf: number) => {
    playback.stop();
    setManualEf(Math.max(1, Math.min(300, Math.round(nextEf))));
  };

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

  const renderGraphPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 18;
    const plotY = 36;
    const plotW = panelW - 32;
    const plotH = 200;
    const domMin = -1.8;
    const domMax = 1.8;

    const px = (x: number) => plotX + ((x - domMin) / (domMax - domMin)) * plotW;
    const py = (y: number) => plotY + plotH - ((y - domMin) / (domMax - domMin)) * plotH;

    const visitedSet = new Set(analysis.visitedIds);
    const exactSet = new Set(analysis.exactTopKIds);
    const annSet = new Set(analysis.annTopKIds);

    const handleClick = (e: React.MouseEvent<SVGGElement>) => {
      const svg = e.currentTarget.ownerSVGElement;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const vx = ((e.clientX - rect.left) / rect.width) * vb.width;
      const vy = ((e.clientY - rect.top) / rect.height) * vb.height;
      if (vx < plotX || vx > plotX + plotW || vy < plotY || vy > plotY + plotH) return;
      const nx = domMin + ((vx - plotX) / plotW) * (domMax - domMin);
      const ny = domMax - ((vy - plotY) / plotH) * (domMax - domMin);
      setQueryX(Number(Math.max(-1.6, Math.min(1.6, nx)).toFixed(2)));
      setQueryY(Number(Math.max(-1.6, Math.min(1.6, ny)).toFixed(2)));
    };

    const qPx = px(queryX);
    const qPy = py(queryY);

    return (
      <g onClick={handleClick} style={{ cursor: 'crosshair' }}>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Graph search: {analysis.visitedIds.length}/{analysis.nodes.length} visited (click to move)
        </text>
        <defs>
          <clipPath id={`${clipMapId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipMapId}-${offsetX})`}>
          {/* Graph links */}
          {analysis.nodes.map((node) =>
            node.neighbors
              .filter((nb) => nb > node.id)
              .map((nb) => {
                const target = analysis.nodes[nb];
                const activeEdge = visitedSet.has(node.id) && visitedSet.has(nb);
                return (
                  <line
                    key={`e-${node.id}-${nb}`}
                    x1={px(node.x)}
                    y1={py(node.y)}
                    x2={px(target.x)}
                    y2={py(target.y)}
                    stroke={activeEdge ? annColor : t.border}
                    strokeWidth={activeEdge ? 1.5 : 0.8}
                    opacity={activeEdge ? 0.55 : 0.28}
                  />
                );
              }),
          )}

          {/* Lines from query to ANN found neighbors */}
          {analysis.annTopKIds.map((id) => {
            const node = analysis.nodes[id];
            const isTrue = exactSet.has(id);
            return (
              <line
                key={`match-${id}`}
                x1={qPx}
                y1={qPy}
                x2={px(node.x)}
                y2={py(node.y)}
                stroke={isTrue ? foundColor : annColor}
                strokeWidth={1.8}
                strokeDasharray="4 3"
              />
            );
          })}

          {/* Indexed points */}
          {analysis.nodes.map((node) => {
            const nx = px(node.x);
            const ny = py(node.y);
            const isTrueTop = exactSet.has(node.id);
            const isAnnTop = annSet.has(node.id);
            const isVisited = visitedSet.has(node.id);

            const fill = isTrueTop && isAnnTop
              ? foundColor
              : isTrueTop
                ? exactColor
                : isVisited
                  ? annColor
                  : t.textMuted;

            return (
              <g key={`pt-${node.id}`}>
                {isTrueTop && !isAnnTop && (
                  <circle cx={nx} cy={ny} r={8.5} fill="none" stroke={exactColor} strokeWidth={1.8} strokeDasharray="3 2" />
                )}
                <circle
                  cx={nx}
                  cy={ny}
                  r={isTrueTop || isAnnTop ? 5.5 : isVisited ? 4 : 3.2}
                  fill={fill}
                  opacity={isVisited || isTrueTop ? 0.95 : 0.38}
                  stroke={t.background}
                  strokeWidth={1.2}
                />
              </g>
            );
          })}

          {/* Entry point indicator */}
          <text
            x={Math.max(plotX + 8, px(analysis.nodes[0].x) + 8)}
            y={Math.min(plotY + plotH - 8, py(analysis.nodes[0].y) + 4)}
            fontSize={14}
            fill={t.textSecondary}
            stroke={t.background}
            strokeWidth={3}
            paintOrder="stroke"
          >
            start
          </text>

          {/* Query diamond */}
          <path
            d={`M${qPx} ${qPy - 8} L${qPx + 8} ${qPy} L${qPx} ${qPy + 8} L${qPx - 8} ${qPy} Z`}
            fill={queryColor}
            stroke={t.background}
            strokeWidth={1.5}
          />
          <text
            x={qPx > plotX + plotW - 65 ? qPx - 11 : qPx + 11}
            y={qPy < plotY + 20 ? qPy + 16 : qPy - 8}
            textAnchor={qPx > plotX + plotW - 65 ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={queryColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            query
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Found {analysis.demoHits}/{analysis.topK} true top-3 neighbors ({analysis.demoRecallPct.toFixed(0)}% demo recall)
        </text>
      </g>
    );
  };

  const renderTradeoffPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 54;
    const plotY = 36;
    const plotW = panelW - 72;
    const plotH = 198;
    const maxLatMs = Math.max(1000, analysis.exactLatencyMs * 1.15, analysis.annLatencyMs * 1.15);

    const xLat = (ms: number) =>
      plotX + (Math.log(Math.max(0.5, ms) + 1) / Math.log(maxLatMs + 1)) * plotW;
    const yRec = (rec: number) => plotY + (1 - Math.max(0, Math.min(100, rec)) / 100) * plotH;

    const curvePath = analysis.curve
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${xLat(pt.annLatencyMs).toFixed(1)},${yRec(pt.recallPct).toFixed(1)}`)
      .join(' ');

    const annX = xLat(analysis.annLatencyMs);
    const annY = yRec(analysis.recallPct);
    const exactX = xLat(analysis.exactLatencyMs);
    const exactY = yRec(100);
    const exactLabelY = exactY + 18;
    const rawAnnLabelY = Math.min(plotY + plotH - 10, Math.max(plotY + 38, annY + 14));
    const labelsClose = Math.abs(annX - exactX) < 160 && Math.abs(rawAnnLabelY - exactLabelY) < 22;
    const annLabelY = labelsClose ? Math.min(plotY + plotH - 10, exactLabelY + 24) : rawAnnLabelY;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. {formatVectorsCount(datasetMillions)} scale: recall vs. latency (ef = {analysis.ef})
        </text>
        <defs>
          <clipPath id={`${clipCurveId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} rx={4} />
        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[0, 50, 95, 100].map((rt) => (
          <g key={`ry-${rt}`}>
            <line x1={plotX - 4} y1={yRec(rt)} x2={plotX} y2={yRec(rt)} stroke={t.border} />
            {rt === 95 && (
              <line x1={plotX} y1={yRec(rt)} x2={plotX + plotW} y2={yRec(rt)} stroke={foundColor} strokeDasharray="3 3" opacity={0.4} />
            )}
            <text x={plotX - 8} y={yRec(rt) + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {rt}%
            </text>
          </g>
        ))}

        {[1, 10, 100, 1000].map((lt) => {
          if (lt > maxLatMs) return null;
          return (
            <g key={`lx-${lt}`}>
              <line x1={xLat(lt)} y1={plotY + plotH} x2={xLat(lt)} y2={plotY + plotH + 4} stroke={t.border} />
              <text x={xLat(lt)} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textMuted}>
                {lt}ms
              </text>
            </g>
          );
        })}

        <g clipPath={`url(#${clipCurveId}-${offsetX})`}>
          <path d={curvePath} fill="none" stroke={annColor} strokeWidth={2.4} />
          <circle cx={exactX} cy={exactY} r={6} fill={exactColor} stroke={t.background} strokeWidth={1.5} />
          <circle cx={annX} cy={annY} r={6.5} fill={annColor} stroke={t.background} strokeWidth={1.5} />
        </g>

        <text
          x={exactX > plotX + plotW - 150 ? exactX - 10 : exactX + 10}
          y={exactLabelY}
          textAnchor={exactX > plotX + plotW - 150 ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fill={exactColor}
          stroke={t.background}
          strokeWidth={4}
          paintOrder="stroke"
        >
          Exact ({formatMs(analysis.exactLatencyMs)} ms)
        </text>
        <text
          x={annX > plotX + plotW - 115 ? annX - 10 : annX + 10}
          y={annLabelY}
          textAnchor={annX > plotX + plotW - 115 ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fill={annColor}
          stroke={t.background}
          strokeWidth={4}
          paintOrder="stroke"
        >
          {indexKind.toUpperCase()} ({analysis.recallPct.toFixed(0)}%, {formatMs(analysis.annLatencyMs)} ms)
        </text>

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Query latency (ms, log scale) →
        </text>
      </g>
    );
  };

  const currentStepIdx = Math.max(0, ANN_TRACE_EFS.findIndex((e) => e >= analysis.ef));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="Why search skips 99% of vectors to stay under 50 ms"
                description="Checking every stored vector guarantees 100% accuracy (exact scan) but takes ~850 ms at 10 million items. Approximate Nearest Neighbor (ANN) search checks only ef graph neighbors, trading a sliver of recall for 10–50× faster answers."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton
                onClick={() => {
                  setManualEf(null);
                  playback.toggle();
                }}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualEf(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualEf(null);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<AnnIndexKind>
                label="Index structure (how candidates are found)"
                value={indexKind}
                onChange={(v) => setIndexKind(v)}
                options={[
                  { value: 'hnsw', label: 'HNSW (navigable graph)' },
                  { value: 'ivf', label: 'IVF (clustered buckets)' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<number>
                label="Collection size N"
                value={datasetMillions}
                onChange={(m) => setDatasetMillions(m)}
                options={ANN_DATASET_PRESETS.map((p) => ({ value: p.millions, label: p.label }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12, alignItems: 'end' }}>
            <Slider
              label="Search beam ef (candidates checked)"
              value={analysis.ef}
              onChange={(v) => selectEf(v)}
              min={1}
              max={300}
              step={1}
              format={(v) => `ef = ${v}`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Exact ef (1–300)</span>
              <input
                aria-label="Exact ef search budget"
                type="number"
                min={1}
                max={300}
                step={5}
                value={analysis.ef}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) selectEf(v);
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Vectors (millions)</span>
              <input
                aria-label="Dataset size in millions"
                type="number"
                min={0.01}
                max={50}
                step={0.5}
                value={datasetMillions}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setDatasetMillions(Math.max(0.005, Math.min(50, v)));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Query x (−1.6..1.6)</span>
              <input
                aria-label="Query x coordinate"
                type="number"
                min={-1.6}
                max={1.6}
                step={0.1}
                value={queryX}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setQueryX(Math.max(-1.6, Math.min(1.6, Number(v.toFixed(2)))));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15 }} aria-label="Search legend">
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, transform: 'rotate(45deg)', background: queryColor, verticalAlign: 'middle', marginRight: 6 }} />
          Query point
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: foundColor, verticalAlign: 'middle', marginRight: 6 }} />
          True match found
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: annColor, verticalAlign: 'middle', marginRight: 6 }} />
          ANN visited ({analysis.visitedIds.length}/{analysis.nodes.length})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: exactColor, verticalAlign: 'middle', marginRight: 6 }} />
          Exact baseline / missed true match
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 286"
            role="img"
            aria-label={`ANN with ef=${analysis.ef} achieves ${analysis.recallPct.toFixed(1)}% recall in ${analysis.annLatencyMs.toFixed(1)} ms versus ${analysis.exactLatencyMs.toFixed(1)} ms exact scan`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderGraphPanel(0, 356)}
            {renderTradeoffPanel(368, 392)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 272" role="img" aria-label="2D navigable graph search" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderGraphPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 286" role="img" aria-label="Recall versus latency tradeoff curve" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderTradeoffPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={`${indexKind.toUpperCase()} vs Exact scan`} latex={FORMULA_LATEX[indexKind]} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              ef = {analysis.ef}: {analysis.recallPct.toFixed(0)}% recall in {analysis.annLatencyMs.toFixed(1)} ms vs {analysis.exactLatencyMs.toFixed(0)} ms exact
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${ANN_TRACE_EFS.length}`} color="blue" tilt={1} live>
            <p>{analysis.trace[playback.step]?.explain ?? analysis.trace[currentStepIdx]?.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="HNSW graph search"
              latex={FORMULA_LATEX.hnsw}
              color="yellow"
              tilt={-1}
              active={indexKind === 'hnsw'}
              onSelect={() => setIndexKind('hnsw')}
            >
              <p style={{ textAlign: 'center' }}>Hops a layered graph in O(log N) plus ef neighbor checks — stays fast at 10M+ items.</p>
            </StickyNote>
            <StickyNote
              title="IVF cluster buckets"
              latex={FORMULA_LATEX.ivf}
              color="pink"
              tilt={1}
              active={indexKind === 'ivf'}
              onSelect={() => setIndexKind('ivf')}
            >
              <p style={{ textAlign: 'center' }}>Probes nearby clusters, so bucket scans still grow linearly with collection size N.</p>
            </StickyNote>
            <StickyNote title="Exact scan & speedup" latex={FORMULA_LATEX.exact} color="orange" tilt={-1}>
              <p style={{ textAlign: 'center' }}>Flat brute-force checks every single vector for 100% recall, costing O(N) time.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · ${formatVectorsCount(datasetMillions)} vectors, ef = ${analysis.ef}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                {indexKind.toUpperCase()}: <strong>{analysis.recallPct.toFixed(1)}%</strong> recall in <strong>{formatMs(analysis.annLatencyMs)} ms</strong> · Exact scan: <strong>100%</strong> in <strong>{formatMs(analysis.exactLatencyMs)} ms</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Speedup = {formatMs(analysis.exactLatencyMs)} / {formatMs(analysis.annLatencyMs)} = <strong>{analysis.speedup.toFixed(1)}×</strong> · 2D demo found <strong>{analysis.demoHits}/{analysis.topK}</strong> true matches visiting {analysis.visitedIds.length}/{analysis.nodes.length} nodes
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${ANN_TRACE_EFS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>
                {analysis.exactWinsAtScale
                  ? `At ${formatVectorsCount(datasetMillions)} vectors, exact scan takes ${analysis.exactLatencyMs.toFixed(2)} ms — faster than ANN graph overhead with 100% recall.`
                  : `At ef = ${analysis.ef}, ${indexKind.toUpperCase()} examines only a small slice of the ${formatVectorsCount(datasetMillions)} index, finishing ${analysis.speedup.toFixed(1)}× faster than brute force at ~${analysis.recallPct.toFixed(1)}% recall.`}
              </p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Your vector collection is small — just 10,000 vectors (0.01M). Should you build an HNSW index or run a plain exact scan?"
            options={PREDICT_OPTIONS}
            correctIndex={1}
            selected={prediction}
            onSelect={setPrediction}
            explanation="At 10k items, a linear scan finishes in ~0.85 ms with guaranteed 100% recall and zero index memory overhead."
            actionLabel="Test 10k vectors now"
            onAction={() => {
              setDatasetMillions(0.01);
              selectEf(60);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function AnnVsExactTradeoffDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="ANN vs. exact vector search playground"
      footer="Left: real greedy beam search on a 32-node 2D navigable graph. Right: calculated scaling model calibrated to 850 ms exact linear scan over 10M vectors (illustrative latency constants, not hardware benchmarks)."
    >
      <AnnVsExactPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
