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
  analyzePageRankStep,
  formatPrScore,
  getOutDegrees,
  PAGERANK_GRAPH_PRESETS,
  runPageRank,
  WORKED_PAGERANK_GRAPH,
  type PageRankEdge,
  type PageRankGraph,
} from '../lib/pageRank';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type FormulaTab = 'update' | 'teleport' | 'trap';

const FORMULA_LATEX: Record<FormulaTab, string> = {
  update: String.raw`PR(u)=\frac{1-d}{N}+d\sum_{v\to u}\frac{PR(v)}{L(v)}`,
  teleport: String.raw`\text{Floor} = \frac{1-d}{N}`,
  trap: String.raw`d=1 \implies PR(D)\to 0`,
};

const PREDICT_OPTIONS = [
  'Page D drains all the way down to 0.0000',
  'Page D stays safely at 0.2500 forever',
  'Page D climbs up to match Page C',
] as const;

const STEP_LABELS = ['Step 0', 'Step 1', 'Step 2', 'Step 3', 'Step 4', 'Converged'] as const;

function PageRankPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipGraphId = useId();
  const clipCurveId = useId();
  const arrowId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [damping, setDamping] = useState<number>(0.85);
  const [edges, setEdges] = useState<PageRankEdge[]>([...WORKED_PAGERANK_GRAPH.edges]);
  const [focusNode, setFocusNode] = useState<string>('C');
  const [activeFormula, setActiveFormula] = useState<FormulaTab>('update');
  const [prediction, setPrediction] = useState<number | null>(null);

  const graph: PageRankGraph = useMemo(
    () => ({ nodes: WORKED_PAGERANK_GRAPH.nodes, edges }),
    [edges],
  );

  // Start at Step 0 (uniform 0.2500 across all 4 nodes); reducedMotion rests at Step 5 (Converged)
  const playback = useStepPlayback(STEP_LABELS.length, 1900, 5, outerVisible);

  const analysis = useMemo(
    () =>
      analyzePageRankStep({
        graph,
        damping,
        stepSlot: playback.step,
        focusNode,
      }),
    [graph, damping, playback.step, focusNode],
  );

  const { history, converged } = useMemo(() => runPageRank(graph, damping, 60, 1e-6), [graph, damping]);
  const outDeg = useMemo(() => getOutDegrees(graph), [graph]);

  const nodeColors: Record<string, string> = {
    A: t.accentSecondary,
    B: t.accentTeal,
    C: t.accentPrimary,
    D: t.accentWarn,
  };
  const floorColor = t.accentDanger;

  const hasEdge = (from: string, to: string) => edges.some((e) => e.from === from && e.to === to);
  const toggleEdge = (from: string, to: string) => {
    setEdges((prev) =>
      prev.some((e) => e.from === from && e.to === to)
        ? prev.filter((e) => !(e.from === from && e.to === to))
        : [...prev, { from, to }],
    );
  };

  const activePresetId =
    PAGERANK_GRAPH_PRESETS.find(
      (p) =>
        p.edges.length === edges.length &&
        p.edges.every((pe) => edges.some((e) => e.from === pe.from && e.to === pe.to)),
    )?.id ?? 'custom';

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
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 212;

    const pos: Record<string, { x: number; y: number }> = {
      A: { x: plotX + plotW * 0.25, y: plotY + 52 },
      B: { x: plotX + plotW * 0.75, y: plotY + 52 },
      C: { x: plotX + plotW * 0.25, y: plotY + 156 },
      D: { x: plotX + plotW * 0.75, y: plotY + 156 },
    };

    const radii: Record<string, number> = {};
    for (const n of graph.nodes) {
      radii[n] = 27 + Math.round((analysis.scores[n] || 0) * 14);
    }

    const edgeColor = (to: string) =>
      to === analysis.focusNode ? nodeColors[analysis.focusNode] : t.border;

    const renderStraightEdge = (
      from: string,
      to: string,
      offsetPerp: number,
      labelOffset: { dx: number; dy: number; anchor?: 'start' | 'middle' | 'end' },
    ) => {
      if (!hasEdge(from, to)) return null;
      const p1 = pos[from];
      const p2 = pos[to];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;

      const x1 = p1.x + ux * (radii[from] + 2) + nx * offsetPerp;
      const y1 = p1.y + uy * (radii[from] + 2) + ny * offsetPerp;
      const x2 = p2.x - ux * (radii[to] + 4) + nx * offsetPerp;
      const y2 = p2.y - uy * (radii[to] + 4) + ny * offsetPerp;

      const mx = (x1 + x2) / 2 + labelOffset.dx;
      const my = (y1 + y2) / 2 + labelOffset.dy;
      const deg = outDeg[from] || 1;
      const shareText = deg === 1 ? '1' : `1/${deg}`;
      const isActive = to === analysis.focusNode;

      return (
        <g key={`${from}-${to}`}>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={edgeColor(to)}
            strokeWidth={isActive ? 2.4 : 1.5}
            markerEnd={`url(#${arrowId}-${isActive ? `hot-${analysis.focusNode}` : 'norm'}-${offsetX})`}
          />
          <text
            x={mx}
            y={my}
            textAnchor={labelOffset.anchor ?? 'middle'}
            fontSize={14}
            fontWeight={700}
            fill={isActive ? nodeColors[analysis.focusNode] : t.textSecondary}
          >
            {shareText}
          </text>
        </g>
      );
    };

    const renderCurvedCD = () => {
      if (!hasEdge('C', 'D')) return null;
      const p1 = pos.C;
      const p2 = pos.D;
      const sx = p1.x + radii.C * 0.7;
      const sy = p1.y + radii.C * 0.7;
      const ex = p2.x - radii.D * 0.7;
      const ey = p2.y + radii.D * 0.7 + 3;
      const cx = (sx + ex) / 2;
      const cy = Math.min(plotY + plotH - 6, p1.y + 52);
      const isActive = analysis.focusNode === 'D';
      const deg = outDeg.C || 1;

      return (
        <g key="C-D">
          <path
            d={`M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`}
            fill="none"
            stroke={isActive ? nodeColors.D : t.border}
            strokeWidth={isActive ? 2.4 : 1.5}
            markerEnd={`url(#${arrowId}-${isActive ? 'hot-D' : 'norm'}-${offsetX})`}
          />
          <text x={cx} y={cy - 10} textAnchor="middle" fontSize={14} fontWeight={700} fill={isActive ? nodeColors.D : t.textSecondary}>
            {deg === 1 ? '1' : `1/${deg}`}
          </text>
        </g>
      );
    };

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Directed web graph (click any page)
        </text>
        <defs>
          <clipPath id={`${clipGraphId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
          <marker id={`${arrowId}-norm-${offsetX}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.border} />
          </marker>
          {graph.nodes.map((n) => (
            <marker key={n} id={`${arrowId}-hot-${n}-${offsetX}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill={nodeColors[n]} />
            </marker>
          ))}
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipGraphId}-${offsetX})`}>
          {renderStraightEdge('A', 'B', 0, { dx: 0, dy: -8 })}
          {renderStraightEdge('A', 'C', 10, { dx: -10, dy: 4, anchor: 'end' })}
          {renderStraightEdge('C', 'A', 10, { dx: 10, dy: 4, anchor: 'start' })}
          {renderStraightEdge('B', 'C', 0, { dx: 12, dy: 12, anchor: 'start' })}
          {renderStraightEdge('D', 'C', 0, { dx: 0, dy: -8 })}
          {renderCurvedCD()}

          {graph.nodes.map((node) => {
            const { x, y } = pos[node];
            const score = analysis.scores[node] || 0;
            const r = radii[node];
            const col = nodeColors[node];
            const isFocus = node === analysis.focusNode;

            return (
              <g key={node} onClick={() => setFocusNode(node)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={isFocus ? `${col}28` : `${col}12`}
                  stroke={col}
                  strokeWidth={isFocus ? 2.8 : 1.6}
                />
                <text x={x} y={y - 3} textAnchor="middle" fontSize={15} fontWeight={700} fill={col}>
                  {node}
                </text>
                <text x={x} y={y + 14} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>
                  {formatPrScore(score)}
                </text>
              </g>
            );
          })}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Numbers on arrows show 1 / out-links L(v) sent per step
        </text>
      </g>
    );
  };

  const renderTrajectoryPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 48;
    const plotY = 34;
    const plotW = panelW - 102;
    const plotH = 194;

    const yMax = 0.7;
    const px = (slot: number) => plotX + (slot / 5) * plotW;
    const py = (val: number) => plotY + plotH - (Math.min(yMax, val) / yMax) * (plotH - 12);

    const slots = [0, 1, 2, 3, 4, 5];
    const scoreAtSlot = (node: string, slot: number) => {
      if (slot >= 5) return converged[node] || 0;
      return (history[Math.min(slot, history.length - 1)]?.[node]) ?? 0;
    };

    // Place right-edge endpoint labels without vertical collision
    const endLabels = graph.nodes
      .map((node) => ({
        node,
        score: analysis.scores[node] || 0,
        y: py(scoreAtSlot(node, playback.step)),
        color: nodeColors[node],
      }))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < endLabels.length; i++) {
      if (endLabels[i].y - endLabels[i - 1].y < 16) {
        endLabels[i].y = Math.min(plotY + plotH - 6, endLabels[i - 1].y + 16);
      }
    }

    const floorY = py(analysis.totalBaseFloor);
    const activeSlotX = px(playback.step);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Page scores over iterations ({analysis.stepLabel})
        </text>
        <defs>
          <clipPath id={`${clipCurveId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        {[0, 0.25, 0.5].map((yv) => (
          <g key={`py-${yv}`}>
            <line x1={plotX - 4} y1={py(yv)} x2={plotX} y2={py(yv)} stroke={t.border} />
            <text x={plotX - 7} y={py(yv) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {yv.toFixed(2)}
            </text>
          </g>
        ))}

        {slots.map((s) => (
          <g key={`px-${s}`}>
            <line x1={px(s)} y1={plotY + plotH} x2={px(s)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(s)} y={plotY + plotH + 20} textAnchor={s === 5 ? 'end' : 'middle'} fontSize={14} fill={s === playback.step ? t.textPrimary : t.textMuted}>
              {s === 5 ? '∞' : `${s}`}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipCurveId}-${offsetX})`}>
          {/* Teleport floor line */}
          <line x1={plotX} y1={floorY} x2={plotX + plotW} y2={floorY} stroke={floorColor} strokeWidth={1.4} strokeDasharray="4 3" />

          {/* Active step vertical guide */}
          <line x1={activeSlotX} y1={plotY} x2={activeSlotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} strokeDasharray="3 3" />

          {graph.nodes.map((node) => {
            const pts = slots
              .slice(0, playback.step + 1)
              .map((s) => `${px(s).toFixed(1)},${py(scoreAtSlot(node, s)).toFixed(1)}`)
              .join(' ');
            const curScore = scoreAtSlot(node, playback.step);
            const isFocus = node === analysis.focusNode;

            return (
              <g key={`line-${node}`}>
                {playback.step > 0 && (
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={nodeColors[node]}
                    strokeWidth={isFocus ? 2.8 : 2}
                    strokeLinejoin="round"
                    opacity={isFocus ? 1 : 0.78}
                  />
                )}
                <circle
                  cx={activeSlotX}
                  cy={py(curScore)}
                  r={isFocus ? 5.5 : 4}
                  fill={nodeColors[node]}
                  stroke={t.background}
                  strokeWidth={1.3}
                />
              </g>
            );
          })}
        </g>

        {/* Crisp right-margin legend labels showing current rank share */}
        {endLabels.map((lbl) => (
          <text
            key={`end-${lbl.node}`}
            x={plotX + plotW + 6}
            y={lbl.y + 5}
            fontSize={14}
            fontWeight={lbl.node === analysis.focusNode ? 700 : 600}
            fill={lbl.color}
          >
            {lbl.node} {(lbl.score * 100).toFixed(0)}%
          </text>
        ))}

        <text x={plotX + plotW / 2} y={plotY + plotH + 38} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Floor (1−d)/N = {formatPrScore(analysis.baseTeleport)} · Sum = {formatPrScore(analysis.totalMass)}
        </text>
      </g>
    );
  };

  const focusFormulaText = useMemo(() => {
    const f = analysis.focusNode;
    if (!analysis.isConverged && playback.step === 0) {
      return `PR₀(${f}) = 1 / 4 = 0.2500 (equal start for all 4 pages)`;
    }
    const floorStr = formatPrScore(analysis.totalBaseFloor);
    const terms =
      analysis.focusContributions.length > 0
        ? analysis.focusContributions
            .map((c) => `${formatPrScore(c.prevScore)}/${c.outDegree}`)
            .join(' + ')
        : '0';
    return `PR(${f}) = ${floorStr} + ${analysis.damping.toFixed(2)}×(${terms}) = ${formatPrScore(analysis.scores[f])}`;
  }, [analysis, playback.step]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="How links decide which web page to trust most"
                description="A page gains trust when trusted pages link to it—and splits that trust across its outgoing links. Step through how scores flow along arrows, or toggle links and random jumps (damping d) to see dead ends and loops."
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
              <PillSelect<number>
                label="Iteration step (0 = start, Converged = steady state)"
                value={playback.step}
                onChange={(val) => playback.setStep(typeof val === 'function' ? val(playback.step) : val)}
                options={STEP_LABELS.map((lbl, idx) => ({ value: idx, label: lbl }))}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Web graph presets"
                value={activePresetId}
                onChange={(id) => {
                  const found = PAGERANK_GRAPH_PRESETS.find((p) => p.id === id);
                  if (found) setEdges([...found.edges]);
                }}
                options={[
                  ...PAGERANK_GRAPH_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom links' }] : []),
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 12, alignItems: 'end' }}>
            <div>
              <Slider
                label="Damping d (follow-link vs random jump)"
                value={damping}
                onChange={(v) => {
                  setDamping(v);
                  setActiveFormula(v >= 0.99 ? 'trap' : 'update');
                }}
                min={0}
                max={1}
                step={0.05}
                format={(v) => v.toFixed(2)}
              />
              <input
                aria-label="Exact damping factor d"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={damping}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) {
                    const clamped = Math.max(0, Math.min(1, Math.round(v * 100) / 100));
                    setDamping(clamped);
                    setActiveFormula(clamped >= 0.99 ? 'trap' : 'update');
                  }
                }}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: -4 }}>
              <PillSelect<string>
                label="Inspect page math"
                value={focusNode}
                onChange={(v) => setFocusNode(typeof v === 'function' ? v(focusNode) : v)}
                options={graph.nodes.map((n) => ({ value: n, label: `Page ${n}` }))}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                aria-pressed={hasEdge('C', 'D')}
                onClick={() => toggleEdge('C', 'D')}
                style={{
                  padding: '6px 12px',
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${hasEdge('C', 'D') ? nodeColors.D : t.border}`,
                  background: hasEdge('C', 'D') ? `${nodeColors.D}20` : 'transparent',
                  color: hasEdge('C', 'D') ? nodeColors.D : t.textPrimary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Link C → D: {hasEdge('C', 'D') ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                aria-pressed={hasEdge('C', 'A')}
                onClick={() => toggleEdge('C', 'A')}
                style={{
                  padding: '6px 12px',
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${hasEdge('C', 'A') ? nodeColors.A : t.border}`,
                  background: hasEdge('C', 'A') ? `${nodeColors.A}20` : 'transparent',
                  color: hasEdge('C', 'A') ? nodeColors.A : t.textPrimary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Link C → A: {hasEdge('C', 'A') ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15 }} aria-label="PageRank page colours">
        {graph.nodes.map((n) => (
          <span key={n}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: nodeColors[n], verticalAlign: 'middle', marginRight: 6 }} />
            Page {n} ({formatPrScore(analysis.scores[n] || 0)})
          </span>
        ))}
        <span>
          <span style={{ display: 'inline-block', width: 16, borderTop: `2px dashed ${floorColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Teleport floor ({formatPrScore(analysis.totalBaseFloor)})
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 294"
            role="img"
            aria-label={`PageRank ${analysis.stepLabel}: C=${formatPrScore(analysis.scores.C)}, A=${formatPrScore(analysis.scores.A)}, B=${formatPrScore(analysis.scores.B)}, D=${formatPrScore(analysis.scores.D)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderGraphPanel(0, 386)}
            {renderTrajectoryPanel(396, 364)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 294" role="img" aria-label="Directed link graph" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderGraphPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 294" role="img" aria-label="PageRank convergence curves" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderTrajectoryPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="PageRank update" latex={FORMULA_LATEX.update} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              A: <strong>{formatPrScore(analysis.scores.A)}</strong> · C: <strong>{formatPrScore(analysis.scores.C)}</strong> · D: <strong>{formatPrScore(analysis.scores.D)}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${STEP_LABELS.length}`} color="blue" tilt={1} live>
            <p>{analysis.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. PageRank update"
              latex={FORMULA_LATEX.update}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'update'}
              onSelect={() => {
                setActiveFormula('update');
                setDamping(0.85);
              }}
            >
              <p style={{ textAlign: 'center' }}>d = follow-link chance, N = 4 pages, L(v) = outgoing links from page v.</p>
            </StickyNote>
            <StickyNote
              title="2. Random jump floor"
              latex={FORMULA_LATEX.teleport}
              color="pink"
              tilt={1}
              active={activeFormula === 'teleport'}
              onSelect={() => {
                setActiveFormula('teleport');
                setDamping(0.5);
              }}
            >
              <p style={{ textAlign: 'center' }}>With chance 1−d, a bored surfer jumps to any of the N = 4 pages at random.</p>
            </StickyNote>
            <StickyNote
              title="3. No-jump trap (d = 1)"
              latex={FORMULA_LATEX.trap}
              color="orange"
              tilt={-1}
              active={activeFormula === 'trap'}
              onSelect={() => {
                setActiveFormula('trap');
                setDamping(1.0);
                playback.setStep(5);
              }}
            >
              <p style={{ textAlign: 'center' }}>Without random jumps, unlinked pages lose all score and drain to 0.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · ${analysis.isConverged ? 'Converged Steady-State' : analysis.stepLabel}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">{focusFormulaText}</p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                A=<strong>{formatPrScore(analysis.scores.A)}</strong> · B=<strong>{formatPrScore(analysis.scores.B)}</strong> · C=<strong>{formatPrScore(analysis.scores.C)}</strong> · D=<strong>{formatPrScore(analysis.scores.D)}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${STEP_LABELS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{analysis.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Nobody links to Page D (In(D) is empty). If you turn off random jumps (d = 1.00) and run to Converged steady state, what happens to Page D's score?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Without random teleports ((1−d)/N = 0), every visit leaves Page D via D → C and no link ever comes back, draining PR(D) to 0.0000."
            actionLabel="Test d = 1.00 at Converged now"
            onAction={() => {
              setEdges([...WORKED_PAGERANK_GRAPH.edges]);
              setDamping(1.0);
              setActiveFormula('trap');
              setFocusNode('D');
              playback.setStep(5);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function PageRankVisualizer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="PageRank Power Iteration Simulator"
      footer="Exact PageRank power iteration on a 4-page directed graph with dangling-node redistribution and adjustable damping factor d."
    >
      <PageRankPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
