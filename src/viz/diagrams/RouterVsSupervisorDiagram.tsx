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
  analyzeRouterVsSupervisor,
  REQUEST_PRESETS,
  SPECIALISTS,
  type OrchestrationMode,
} from '../lib/routerVsSupervisor';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type FormulaTab = 'router' | 'supervisor' | 'fallback';

const FORMULA_LATEX: Record<FormulaTab, string> = {
  router: String.raw`\text{Route}(x) = \arg\max_k\, s_k(x) \quad (\text{1 pick, exit})`,
  supervisor: String.raw`a_{t+1} = \pi(x,\, y_1,\dots,y_t) \quad (\text{loop until done})`,
  fallback: String.raw`\max_k s_k(x) < \tau \implies \text{Fallback}`,
};

const PREDICT_OPTIONS = [
  'The coat advice is dropped silently — Router exits after Weather replies',
  'Router automatically calls Advice right after Weather replies',
  'Router sends the request to both Weather and Advice at once',
] as const;

function RouterVsSupervisorPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipGraphId = useId();
  const clipBarsId = useId();
  const arrowId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [mode, setMode] = useState<OrchestrationMode>('router');
  const [requestText, setRequestText] = useState<string>(REQUEST_PRESETS[0].text);
  const [threshold, setThreshold] = useState<number>(0.25);
  const [activeFormula, setActiveFormula] = useState<FormulaTab>('router');
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(
    () => analyzeRouterVsSupervisor({ mode, requestText, threshold }),
    [mode, requestText, threshold],
  );

  const playback = useStepPlayback(
    analysis.trace.length,
    2100,
    Math.max(0, analysis.trace.length - 1),
    outerVisible,
  );
  const currentStep = analysis.trace[playback.step] ?? analysis.trace[analysis.trace.length - 1];

  const ctrlColor = t.accentSecondary;
  const doneColor = t.accentPrimary;
  const costColor = t.accentWarn;
  const missColor = t.accentDanger;
  const fallbackColor = t.accentPurple;

  const activePresetId =
    REQUEST_PRESETS.find((p) => p.text === requestText.trim())?.id ?? 'custom';

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

  const selectMode = (nextMode: OrchestrationMode) => {
    setMode(nextMode);
    setActiveFormula(nextMode);
    playback.playFromStart();
  };

  const renderGraphPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 222;

    const reqW = Math.round(plotW * 0.22);
    const ctrlW = Math.round(plotW * 0.30);
    const specW = Math.round(plotW * 0.32);
    const gap = Math.round((plotW - 20 - reqW - ctrlW - specW) / 2);

    const reqX = plotX + 10;
    const ctrlX = reqX + reqW + gap;
    const specX = ctrlX + ctrlW + gap;

    const reqY = plotY + 28;
    const ctrlY = plotY + 24;
    const ctrlH = 54;
    const fbY = plotY + 148;
    const fbH = 44;
    const outY = plotY + 148;

    const isRouter = analysis.mode === 'router';
    const showEnd = playback.step === analysis.trace.length - 1;
    const activeActor = currentStep.actor;
    const chosenId = analysis.topTopic.id;
    const chosenIdx = SPECIALISTS.findIndex((s) => s.id === chosenId);
    const chosenMidY = plotY + 14 + Math.max(0, chosenIdx) * 50 + 20;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. {isRouter ? 'Router: classify once and exit' : 'Supervisor: inspect each reply in a loop'}
        </text>
        <defs>
          <clipPath id={`${clipGraphId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
          <marker id={`${arrowId}-ctrl-${offsetX}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={ctrlColor} />
          </marker>
          <marker id={`${arrowId}-done-${offsetX}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={doneColor} />
          </marker>
          <marker id={`${arrowId}-fb-${offsetX}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={fallbackColor} />
          </marker>
          <marker id={`${arrowId}-miss-${offsetX}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={missColor} />
          </marker>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipGraphId}-${offsetX})`}>
          {/* Request -> Controller arrow */}
          <line
            x1={reqX + reqW}
            y1={reqY + 20}
            x2={ctrlX - 2}
            y2={reqY + 20}
            stroke={ctrlColor}
            strokeWidth={2}
            markerEnd={`url(#${arrowId}-ctrl-${offsetX})`}
          />

          {/* User Request box */}
          <rect x={reqX} y={reqY} width={reqW} height={42} rx={6} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1.4} />
          <text x={reqX + reqW / 2} y={reqY + 19} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Request
          </text>
          <text x={reqX + reqW / 2} y={reqY + 35} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            {analysis.neededTopics.length} part{analysis.neededTopics.length === 1 ? '' : 's'}
          </text>

          {/* Final Output / Exit indicator on bottom-left */}
          <rect
            x={reqX}
            y={outY}
            width={reqW}
            height={fbH}
            rx={6}
            fill={showEnd ? (analysis.missedTopics.length > 0 ? `${missColor}18` : `${doneColor}18`) : t.surfaceAlt}
            stroke={showEnd ? (analysis.missedTopics.length > 0 ? missColor : doneColor) : t.border}
            strokeWidth={showEnd ? 2.2 : 1.2}
          />
          <text
            x={reqX + reqW / 2}
            y={outY + 19}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill={showEnd ? (analysis.missedTopics.length > 0 ? missColor : doneColor) : t.textSecondary}
          >
            Reply
          </text>
          <text
            x={reqX + reqW / 2}
            y={outY + 36}
            textAnchor="middle"
            fontSize={14}
            fill={showEnd && analysis.missedTopics.length > 0 ? missColor : t.textSecondary}
          >
            {showEnd
              ? analysis.missedTopics.length > 0
                ? 'partial!'
                : 'complete'
              : 'waiting'}
          </text>

          {/* Router or Supervisor node */}
          {(() => {
            const isCtrlActive = activeActor === 'Router' || activeActor === 'Supervisor';
            return (
              <g>
                <rect
                  x={ctrlX}
                  y={ctrlY}
                  width={ctrlW}
                  height={ctrlH}
                  rx={6}
                  fill={isCtrlActive ? `${ctrlColor}24` : `${ctrlColor}10`}
                  stroke={ctrlColor}
                  strokeWidth={isCtrlActive ? 2.6 : 1.5}
                />
                <text x={ctrlX + ctrlW / 2} y={ctrlY + 23} textAnchor="middle" fontSize={15} fontWeight={700} fill={ctrlColor}>
                  {isRouter ? 'Router' : 'Supervisor'}
                </text>
                <text x={ctrlX + ctrlW / 2} y={ctrlY + 42} textAnchor="middle" fontSize={14} fill={t.textPrimary}>
                  {isRouter ? '1 pick only' : `${analysis.decisionCalls} checks`}
                </text>
              </g>
            );
          })()}

          {/* Fallback node below controller */}
          {(() => {
            const fbActive = activeActor === 'Fallback' || (analysis.fallbackTriggered && currentStep.activeTarget === 'fallback');
            return (
              <g opacity={analysis.fallbackTriggered ? 1 : 0.45}>
                <line
                  x1={ctrlX + ctrlW / 2}
                  y1={ctrlY + ctrlH}
                  x2={ctrlX + ctrlW / 2}
                  y2={fbY - 2}
                  stroke={analysis.fallbackTriggered ? fallbackColor : t.border}
                  strokeWidth={analysis.fallbackTriggered ? 2 : 1.2}
                  strokeDasharray={analysis.fallbackTriggered ? undefined : '4 3'}
                  markerEnd={analysis.fallbackTriggered ? `url(#${arrowId}-fb-${offsetX})` : undefined}
                />
                <rect
                  x={ctrlX}
                  y={fbY}
                  width={ctrlW}
                  height={fbH}
                  rx={6}
                  fill={fbActive ? `${fallbackColor}22` : t.surfaceAlt}
                  stroke={fbActive ? fallbackColor : t.border}
                  strokeWidth={fbActive ? 2.2 : 1.2}
                />
                <text x={ctrlX + ctrlW / 2} y={fbY + 19} textAnchor="middle" fontSize={14} fontWeight={700} fill={fbActive ? fallbackColor : t.textSecondary}>
                  Fallback
                </text>
                <text x={ctrlX + ctrlW / 2} y={fbY + 36} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
                  {`score < ${analysis.threshold.toFixed(2)}`}
                </text>
              </g>
            );
          })()}

          {/* Final reply arrow: Fallback -> Reply when fallback runs; Supervisor -> Reply in supervisor mode; Chosen specialist -> Reply directly in router mode */}
          {showEnd && analysis.fallbackTriggered && (
            <line
              x1={ctrlX}
              y1={outY + fbH / 2}
              x2={reqX + reqW + 2}
              y2={outY + fbH / 2}
              stroke={fallbackColor}
              strokeWidth={2.2}
              markerEnd={`url(#${arrowId}-fb-${offsetX})`}
            />
          )}
          {showEnd && !analysis.fallbackTriggered && !isRouter && (
            <line
              x1={ctrlX}
              y1={ctrlY + ctrlH - 8}
              x2={reqX + reqW + 2}
              y2={outY + 14}
              stroke={doneColor}
              strokeWidth={2.2}
              markerEnd={`url(#${arrowId}-done-${offsetX})`}
            />
          )}
          {showEnd && !analysis.fallbackTriggered && isRouter && (
            <path
              d={`M ${specX} ${chosenMidY + 10} L ${specX - 10} ${plotY + plotH - 8} L ${reqX + reqW / 2} ${plotY + plotH - 8} L ${reqX + reqW / 2} ${outY + fbH + 2}`}
              fill="none"
              stroke={analysis.missedTopics.length > 0 ? missColor : doneColor}
              strokeWidth={2}
              markerEnd={`url(#${arrowId}-${analysis.missedTopics.length > 0 ? 'miss' : 'done'}-${offsetX})`}
            />
          )}

          {/* 4 Specialist boxes on the right */}
          {SPECIALISTS.map((spec, idx) => {
            const ry = plotY + 14 + idx * 50;
            const boxH = 40;
            const isNeeded = analysis.neededTopics.includes(spec.id);
            const isAnswered = currentStep.answeredSoFar.includes(spec.id);
            const isMissed = showEnd && currentStep.missedAfterFinish.includes(spec.id);
            const isActiveWorker = activeActor === spec.id || currentStep.activeTarget === spec.id;

            const borderColor = isMissed
              ? missColor
              : isAnswered || isActiveWorker
                ? doneColor
                : isNeeded
                  ? ctrlColor
                  : t.border;
            const fillColor = isMissed
              ? `${missColor}18`
              : isActiveWorker
                ? `${doneColor}24`
                : isAnswered
                  ? `${doneColor}12`
                  : t.surfaceAlt;
            const statusText = isMissed
              ? 'dropped!'
              : isAnswered
                ? 'answered'
                : isActiveWorker
                  ? 'running…'
                  : isNeeded
                    ? 'needed'
                    : 'idle';

            const lineStartY = ctrlY + 18 + idx * 8;
            const lineEndY = ry + boxH / 2;
            const drawCallArrow = isActiveWorker || isAnswered;

            return (
              <g key={spec.id} opacity={!isNeeded && !isAnswered && !isActiveWorker ? 0.42 : 1}>
                {/* Forward dispatch arrow from Router/Supervisor -> Specialist */}
                <line
                  x1={ctrlX + ctrlW}
                  y1={lineStartY}
                  x2={specX - 2}
                  y2={lineEndY}
                  stroke={drawCallArrow ? (isActiveWorker ? ctrlColor : doneColor) : t.border}
                  strokeWidth={drawCallArrow ? 2 : 1}
                  strokeDasharray={drawCallArrow ? undefined : '3 3'}
                  markerEnd={drawCallArrow ? `url(#${arrowId}-ctrl-${offsetX})` : undefined}
                />
                {/* Supervisor loop-back return arrow (only in supervisor mode!) */}
                {!isRouter && (isAnswered || (isActiveWorker && currentStep.kind === 'worker')) && (
                  <line
                    x1={specX}
                    y1={lineEndY + 7}
                    x2={ctrlX + ctrlW + 2}
                    y2={lineStartY + 9}
                    stroke={doneColor}
                    strokeWidth={1.8}
                    strokeDasharray="4 2"
                    markerEnd={`url(#${arrowId}-done-${offsetX})`}
                  />
                )}
                <rect
                  x={specX}
                  y={ry}
                  width={specW}
                  height={boxH}
                  rx={6}
                  fill={fillColor}
                  stroke={borderColor}
                  strokeWidth={isActiveWorker || isMissed ? 2.2 : 1.3}
                />
                <text x={specX + specW / 2} y={ry + 17} textAnchor="middle" fontSize={14} fontWeight={700} fill={borderColor === t.border ? t.textPrimary : borderColor}>
                  {spec.shortName}
                </text>
                <text x={specX + specW / 2} y={ry + 33} textAnchor="middle" fontSize={14} fill={isMissed ? missColor : t.textSecondary}>
                  {statusText}
                </text>
              </g>
            );
          })}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {isRouter ? 'No return arrow: Router exits after 1 specialist' : 'Dashed return arrows give Supervisor control back'}
        </text>
      </g>
    );
  };

  const renderMetricsPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 222;

    const labelW = 68;
    const valW = 48;
    const barX = plotX + labelW;
    const barW = Math.max(80, plotW - labelW - valW - 14);
    const threshX = barX + analysis.threshold * barW;
    const showEnd = playback.step === analysis.trace.length - 1;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Match scores vs gate &amp; coverage
        </text>
        <defs>
          <clipPath id={`${clipBarsId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipBarsId}-${offsetX})`}>
          {/* Threshold dashed vertical guide across all 4 topic bars */}
          <line x1={threshX} y1={plotY + 12} x2={threshX} y2={plotY + 124} stroke={fallbackColor} strokeWidth={1.6} strokeDasharray="4 3" />
          <text
            x={Math.min(plotX + plotW - 14, Math.max(barX + 10, threshX + 4))}
            y={plotY + 18}
            fontSize={14}
            fontWeight={700}
            fill={fallbackColor}
          >
            τ = {analysis.threshold.toFixed(2)}
          </text>

          {SPECIALISTS.map((spec, idx) => {
            const sc = analysis.topicScores.find((s) => s.id === spec.id)!;
            const ry = plotY + 26 + idx * 25;
            const isAnswered = currentStep.answeredSoFar.includes(spec.id);
            const isMissed = showEnd && currentStep.missedAfterFinish.includes(spec.id);
            const barColor = isMissed
              ? missColor
              : isAnswered
                ? doneColor
                : sc.needed
                  ? ctrlColor
                  : t.textMuted;

            return (
              <g key={spec.id}>
                <text x={plotX + 8} y={ry + 14} fontSize={14} fontWeight={700} fill={t.textPrimary}>
                  {spec.shortName}
                </text>
                <rect x={barX} y={ry + 3} width={barW} height={13} rx={3} fill={t.surfaceAlt} />
                <rect x={barX} y={ry + 3} width={Math.max(2, sc.score * barW)} height={13} rx={3} fill={barColor} fillOpacity={0.85} />
                <text x={plotX + plotW - 8} y={ry + 14} textAnchor="end" fontSize={14} fontWeight={700} fill={barColor}>
                  {sc.score.toFixed(2)}
                </text>
              </g>
            );
          })}

          <line x1={plotX + 10} y1={plotY + 132} x2={plotX + plotW - 10} y2={plotY + 132} stroke={t.border} strokeWidth={1} />

          {/* Coverage bar */}
          <text x={plotX + 10} y={plotY + 152} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Parts answered
          </text>
          <text
            x={plotX + plotW - 10}
            y={plotY + 152}
            textAnchor="end"
            fontSize={14}
            fontWeight={700}
            fill={analysis.missedTopics.length > 0 ? missColor : doneColor}
          >
            {analysis.neededTopics.length === 0
              ? 'Fallback (safe)'
              : `${analysis.answeredTopics.length}/${analysis.neededTopics.length} (${analysis.coveragePct}%)`}
          </text>
          <rect x={plotX + 10} y={plotY + 159} width={plotW - 20} height={12} rx={3} fill={t.surfaceAlt} />
          <rect
            x={plotX + 10}
            y={plotY + 159}
            width={Math.max(4, (analysis.coveragePct / 100) * (plotW - 20))}
            height={12}
            rx={3}
            fill={analysis.missedTopics.length > 0 ? missColor : doneColor}
            fillOpacity={0.85}
          />

          {/* Decision cost readout */}
          <text x={plotX + 10} y={plotY + 193} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Model calls
          </text>
          <text x={plotX + plotW - 10} y={plotY + 193} textAnchor="end" fontSize={14} fontWeight={700} fill={costColor}>
            {analysis.decisionCalls} dec + {analysis.specialistCalls} agent{analysis.specialistCalls === 1 ? '' : 's'}
          </text>
          <rect x={plotX + 10} y={plotY + 200} width={plotW - 20} height={12} rx={3} fill={t.surfaceAlt} />
          <rect
            x={plotX + 10}
            y={plotY + 200}
            width={Math.max(8, Math.min(1, analysis.totalModelSteps / 7) * (plotW - 20))}
            height={12}
            rx={3}
            fill={costColor}
            fillOpacity={0.85}
          />
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {analysis.neededTopics.length > 1 && isRouter
            ? `Router drops ${analysis.missedTopics.length} part(s) after 1 exit`
            : `Confidence gate τ = ${analysis.threshold.toFixed(2)}`}
        </text>
      </g>
    );
  };

  const isRouter = analysis.mode === 'router';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="Why a fast router drops half of a two-part question"
                description="When an AI system has specialist helpers, a router classifies your request once and exits, while a supervisor checks every reply before deciding what to do next. Type any question to compare coverage against extra decision calls."
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
              <PillSelect<OrchestrationMode>
                label="Decision rule (who routes)"
                value={mode}
                onChange={(val) => {
                  const nextMode = typeof val === 'function' ? val(mode) : val;
                  selectMode(nextMode);
                }}
                options={[
                  { value: 'router', label: 'Router (1-shot, no loop)' },
                  { value: 'supervisor', label: 'Supervisor (loop & inspect)' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Example user requests"
                value={activePresetId}
                onChange={(id) => {
                  const preset = REQUEST_PRESETS.find((p) => p.id === id);
                  if (preset) {
                    setRequestText(preset.text);
                    setPrediction(null);
                    playback.playFromStart();
                  }
                }}
                options={[
                  ...REQUEST_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom request' }] : []),
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12, alignItems: 'end' }}>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>User request (try mixing topics like weather, coat, charged, crash)</span>
              <input
                aria-label="User request text"
                type="text"
                maxLength={120}
                value={requestText}
                onChange={(e) => {
                  setRequestText(e.target.value);
                  playback.setStep(analysis.trace.length - 1);
                }}
                style={inputStyle}
              />
            </label>
            <div>
              <Slider
                label="Confidence gate τ (minimum score to dispatch)"
                value={threshold}
                onChange={(v) => setThreshold(v)}
                min={0.1}
                max={0.85}
                step={0.05}
                format={(v) => v.toFixed(2)}
              />
              <input
                aria-label="Exact confidence threshold tau"
                type="number"
                min={0.1}
                max={0.85}
                step={0.05}
                value={threshold}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setThreshold(Math.max(0.1, Math.min(0.85, v)));
                }}
                style={inputStyle}
              />
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Routing diagram colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: ctrlColor, verticalAlign: 'middle', marginRight: 6 }} />
          Controller / needed
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: doneColor, verticalAlign: 'middle', marginRight: 6 }} />
          Answered
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: costColor, verticalAlign: 'middle', marginRight: 6 }} />
          Extra decision checks
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: missColor, verticalAlign: 'middle', marginRight: 6 }} />
          Dropped sub-topic
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: fallbackColor, verticalAlign: 'middle', marginRight: 6 }} />
          Gate τ / fallback
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 292"
            role="img"
            aria-label={`${isRouter ? 'Router' : 'Supervisor'} handles ${analysis.answeredTopics.length} of ${analysis.neededTopics.length} detected parts in ${analysis.decisionCalls} decision call(s)`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderGraphPanel(0, 436)}
            {renderMetricsPanel(446, 314)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 292" role="img" aria-label="Router vs Supervisor flow graph" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderGraphPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 292" role="img" aria-label="Topic match scores and coverage" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderMetricsPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title={isRouter ? 'Router rule (1-shot)' : 'Supervisor rule (loop)'}
            latex={FORMULA_LATEX[mode]}
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Answered: <strong>{analysis.answeredTopics.length}/{analysis.neededTopics.length} ({analysis.coveragePct}%)</strong> · Checks: <strong>{analysis.decisionCalls}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length}`} color="blue" tilt={1} live>
            <p>{currentStep.detail}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Router (classify once)"
              latex={FORMULA_LATEX.router}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'router'}
              onSelect={() => selectMode('router')}
            >
              <p style={{ textAlign: 'center' }}>Picks top match score s_k(x) once and exits; cheap, but drops extra parts.</p>
            </StickyNote>
            <StickyNote
              title="2. Supervisor (re-decide loop)"
              latex={FORMULA_LATEX.supervisor}
              color="pink"
              tilt={1}
              active={activeFormula === 'supervisor'}
              onSelect={() => selectMode('supervisor')}
            >
              <p style={{ textAlign: 'center' }}>Reads each worker reply y_t and loops until every sub-topic is answered.</p>
            </StickyNote>
            <StickyNote
              title="3. Confidence gate τ"
              latex={FORMULA_LATEX.fallback}
              color="orange"
              tilt={-1}
              active={activeFormula === 'fallback'}
              onSelect={() => {
                setActiveFormula('fallback');
                setRequestText(REQUEST_PRESETS[3].text);
                playback.playFromStart();
              }}
            >
              <p style={{ textAlign: 'center' }}>When every specialist scores under τ, send to Fallback instead of guessing.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · ${isRouter ? 'Router' : 'Supervisor'}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Top match: <strong>{analysis.topTopic.shortName} ({analysis.topTopic.score.toFixed(2)})</strong> vs gate τ = <strong>{analysis.threshold.toFixed(2)}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Coverage: <strong>{analysis.neededTopics.length === 0 ? 'Fallback' : `${analysis.answeredTopics.length}/${analysis.neededTopics.length} (${analysis.coveragePct}%)`}</strong> · Decision calls: <strong>{analysis.decisionCalls}</strong> · Agents called: <strong>{analysis.specialistCalls}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{currentStep.detail}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt='You send "What is the weather in Paris tomorrow, and should I pack a coat?" through a single-label Router at τ = 0.25. What happens to the coat advice?'
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Router classifies once (Weather scores 0.77 >= 0.25), hands control to Weather, and exits — nothing ever reads the reply to spot the unanswered coat question."
            actionLabel="Run 2-part question on Router now"
            onAction={() => {
              setMode('router');
              setActiveFormula('router');
              setRequestText(REQUEST_PRESETS[0].text);
              setThreshold(0.25);
              playback.setStep(2);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function RouterVsSupervisorDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Router vs. supervisor architecture playground"
      footer="Deterministic keyword-similarity scoring comparing one-shot routing (Command(goto=...)) against a tool-calling supervisor loop on single-topic, two-part, and fallback requests."
    >
      <RouterVsSupervisorPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
