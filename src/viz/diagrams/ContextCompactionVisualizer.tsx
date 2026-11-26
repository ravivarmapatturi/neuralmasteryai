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
  analyzeContextCompaction,
  ANXIETY_THRESHOLD_RATIO,
  COMPACTION_PRESETS,
  MAX_TURNS,
  PLAYBACK_TURNS,
  type CompactionStrategy,
} from '../lib/contextCompaction';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type FormulaTab = 'compacted' | 'sliding' | 'naive';

const FORMULA_LATEX: Record<FormulaTab, string> = {
  compacted: String.raw`T_{\text{comp}} = F + S(t) + W\cdot k_{\text{keep}}`,
  sliding: String.raw`T_{\text{slide}} = F + \min(t,W)\cdot k_{\text{keep}}`,
  naive: String.raw`T_{\text{naive}} = F + t\cdot k_{\text{raw}}`,
};

const PREDICT_OPTIONS = [
  '84.1% full at turn 12 (107,700 tokens), then overflows 128k at turn 15',
  'Stays under 25% because old tool outputs shrink automatically',
  'Uses 17,700 tokens at turn 12',
] as const;

function ContextCompactionPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipBudgetId = useId();
  const clipCurveId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [strategy, setStrategy] = useState<CompactionStrategy>('compacted');
  const [manualTurn, setManualTurn] = useState<number | null>(null);
  const [rawTokensPerTurn, setRawTokensPerTurn] = useState<number>(8500);
  const [windowLimit, setWindowLimit] = useState<number>(128000);
  const [recentTurnsKept, setRecentTurnsKept] = useState<number>(3);
  const [activeFormula, setActiveFormula] = useState<FormulaTab>('compacted');
  const [prediction, setPrediction] = useState<number | null>(null);

  // Reduced-motion starts at Turn 12 (index 3 in PLAYBACK_TURNS = [1, 4, 8, 12, 16, 20])
  const playback = useStepPlayback(PLAYBACK_TURNS.length, 1900, 3, outerVisible);
  const activeTurn = manualTurn ?? PLAYBACK_TURNS[playback.step] ?? 12;

  const analysis = useMemo(
    () =>
      analyzeContextCompaction({
        strategy,
        turn: activeTurn,
        rawTokensPerTurn,
        windowLimit,
        recentTurnsKept,
      }),
    [strategy, activeTurn, rawTokensPerTurn, windowLimit, recentTurnsKept],
  );

  const systemColor = t.accentPurple;
  const toolsColor = t.accentSecondary;
  const stateColor = t.accentTeal;
  const recentColor = t.accentPrimary;
  const rawWarnColor = analysis.overflowing ? t.accentDanger : t.accentWarn;
  const dangerColor = t.accentDanger;

  const activePresetId =
    COMPACTION_PRESETS.find(
      (p) =>
        p.strategy === strategy &&
        p.turn === analysis.turn &&
        p.rawTokensPerTurn === analysis.rawTokensPerTurn &&
        p.windowLimit === analysis.windowLimit,
    )?.id ?? 'custom';

  const selectStrategy = (nextStrategy: CompactionStrategy) => {
    setStrategy(nextStrategy);
    setActiveFormula(nextStrategy);
  };

  const selectTurn = (nextTurn: number) => {
    playback.stop();
    setManualTurn(Math.max(1, Math.min(MAX_TURNS, Math.round(nextTurn))));
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

  const renderBudgetPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 222;
    const barX = plotX + 12;
    const barW = plotW - 24;
    const barY = plotY + 42;
    const barH = 30;

    const scale = (tok: number) => Math.max(0, Math.min(barW, (tok / analysis.windowLimit) * barW));
    const sysW = scale(analysis.systemTokens);
    const toolW = scale(analysis.toolTokens);
    const stateW = scale(analysis.stateArtifactTokens);
    const workW = Math.min(barW - sysW - toolW - stateW, scale(analysis.workingTurnTokens));
    const cliffX = barX + ANXIETY_THRESHOLD_RATIO * barW;

    const healthColor = analysis.overflowing
      ? dangerColor
      : analysis.earlyGoalsLost
        ? dangerColor
        : analysis.inAnxietyZone
          ? rawWarnColor
          : recentColor;

    const shortHealth = analysis.overflowing
      ? 'Overflow!'
      : analysis.earlyGoalsLost
        ? 'Amnesia!'
        : analysis.inAnxietyZone
          ? 'Blur (>65%)'
          : 'Sharp';

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Context window budget at Turn {analysis.turn}
        </text>
        <defs>
          <clipPath id={`${clipBudgetId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipBudgetId}-${offsetX})`}>
          <text x={barX} y={plotY + 26} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Used: {analysis.totalTokens.toLocaleString('en-US')} / {(analysis.windowLimit / 1000).toFixed(0)}k
          </text>
          <text x={barX + barW} y={plotY + 26} textAnchor="end" fontSize={14} fontWeight={700} fill={healthColor}>
            {analysis.rawUsagePct.toFixed(1)}%
          </text>

          {/* Stacked capacity bar */}
          <rect
            x={barX}
            y={barY}
            width={barW}
            height={barH}
            rx={4}
            fill={t.surfaceAlt}
            stroke={analysis.overflowing ? dangerColor : t.border}
            strokeWidth={analysis.overflowing ? 2 : 1}
          />
          <rect x={barX} y={barY} width={sysW} height={barH} fill={systemColor} />
          <rect x={barX + sysW} y={barY} width={toolW} height={barH} fill={toolsColor} />
          {stateW > 0 && <rect x={barX + sysW + toolW} y={barY} width={stateW} height={barH} fill={stateColor} />}
          <rect
            x={barX + sysW + toolW + stateW}
            y={barY}
            width={Math.max(2, workW)}
            height={barH}
            fill={analysis.strategy === 'naive' ? rawWarnColor : recentColor}
          />

          {/* 65% Attention Blur marker */}
          <line x1={cliffX} y1={barY - 6} x2={cliffX} y2={barY + barH + 6} stroke={rawWarnColor} strokeWidth={2} strokeDasharray="4 3" />
          <text x={cliffX} y={barY + barH + 21} textAnchor="middle" fontSize={14} fontWeight={700} fill={rawWarnColor}>
            65% focus cliff
          </text>

          {/* Row 1: Focus / Goal retention */}
          <text x={barX} y={plotY + 116} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Task recall &amp; focus
          </text>
          <text x={barX + barW} y={plotY + 116} textAnchor="end" fontSize={14} fontWeight={700} fill={healthColor}>
            {analysis.focusRetentionPct}% ({shortHealth})
          </text>
          <rect x={barX} y={plotY + 123} width={barW} height={12} rx={3} fill={t.surfaceAlt} />
          <rect x={barX} y={plotY + 123} width={Math.max(4, (analysis.focusRetentionPct / 100) * barW)} height={12} rx={3} fill={healthColor} fillOpacity={0.85} />

          {/* Row 2: Token savings vs Naive */}
          <text x={barX} y={plotY + 158} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Saved vs full logs
          </text>
          <text x={barX + barW} y={plotY + 158} textAnchor="end" fontSize={14} fontWeight={700} fill={analysis.savedPctVsNaive > 0 ? stateColor : t.textSecondary}>
            {analysis.savedPctVsNaive.toFixed(1)}% ({analysis.savedTokensVsNaive.toLocaleString('en-US')})
          </text>
          <rect x={barX} y={plotY + 165} width={barW} height={12} rx={3} fill={t.surfaceAlt} />
          <rect
            x={barX}
            y={plotY + 165}
            width={Math.max(4, (analysis.savedPctVsNaive / 100) * barW)}
            height={12}
            rx={3}
            fill={stateColor}
            fillOpacity={0.85}
          />

          <text x={plotX + plotW / 2} y={plotY + 206} textAnchor="middle" fontSize={14} fontWeight={700} fill={healthColor}>
            {analysis.earlyGoalsLost
              ? 'Early turns fell off sliding window!'
              : analysis.overflowing
                ? 'Prompt exceeds context limit!'
                : analysis.strategy === 'compacted'
                  ? 'State file pins early goals safely'
                  : 'Logs grow toward window limit'}
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Fixed rules = {(analysis.fixedTokens / 1000).toFixed(1)}k · State file = {(analysis.stateArtifactTokens / 1000).toFixed(1)}k
        </text>
      </g>
    );
  };

  const renderCurvePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 48;
    const plotY = 34;
    const plotW = panelW - 60;
    const plotH = 194;

    const maxNaive = analysis.curve[analysis.curve.length - 1]?.naiveTokens ?? analysis.windowLimit;
    const yMax = Math.max(analysis.windowLimit * 1.12, maxNaive);

    const px = (turnVal: number) => plotX + ((turnVal - 1) / (MAX_TURNS - 1)) * plotW;
    const py = (tok: number) => plotY + plotH - (tok / yMax) * (plotH - 10);

    const naivePts = analysis.curve.map((pt) => `${px(pt.turn).toFixed(1)},${py(pt.naiveTokens).toFixed(1)}`).join(' ');
    const activePts = analysis.curve.map((pt) => `${px(pt.turn).toFixed(1)},${py(pt.activeTokens).toFixed(1)}`).join(' ');
    const curX = px(analysis.turn);
    const curY = py(analysis.totalTokens);
    const limitY = py(analysis.windowLimit);
    const cliffY = py(analysis.windowLimit * ANXIETY_THRESHOLD_RATIO);

    const activeColor =
      analysis.strategy === 'compacted'
        ? recentColor
        : analysis.strategy === 'sliding'
          ? stateColor
          : rawWarnColor;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Context size across Turns 1–20
        </text>
        <defs>
          <clipPath id={`${clipCurveId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        {/* Y-axis ticks */}
        {[0, Math.round(analysis.windowLimit / 2), analysis.windowLimit].map((yv) => (
          <g key={`cy-${yv}`}>
            <line x1={plotX - 4} y1={py(yv)} x2={plotX} y2={py(yv)} stroke={t.border} />
            <text x={plotX - 7} y={py(yv) + 5} textAnchor="end" fontSize={14} fill={yv === analysis.windowLimit ? dangerColor : t.textMuted}>
              {yv === 0 ? '0' : `${Math.round(yv / 1000)}k`}
            </text>
          </g>
        ))}

        {/* X-axis ticks */}
        {[1, 5, 10, 15, 20].map((xt) => (
          <g key={`cx-${xt}`}>
            <line x1={px(xt)} y1={plotY + plotH} x2={px(xt)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(xt)} y={plotY + plotH + 20} textAnchor={xt === 20 ? 'end' : 'middle'} fontSize={14} fill={t.textMuted}>
              {xt}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipCurveId}-${offsetX})`}>
          {/* 100% limit ceiling */}
          <line x1={plotX} y1={limitY} x2={plotX + plotW} y2={limitY} stroke={dangerColor} strokeWidth={1.6} strokeDasharray="5 3" />
          <text x={plotX + 6} y={Math.max(plotY + 14, limitY - 5)} fontSize={14} fontWeight={700} fill={dangerColor}>
            {(analysis.windowLimit / 1000).toFixed(0)}k limit
          </text>

          {/* 65% anxiety line */}
          <line x1={plotX} y1={cliffY} x2={plotX + plotW} y2={cliffY} stroke={rawWarnColor} strokeWidth={1.2} strokeDasharray="3 3" />
          {Math.abs(cliffY - limitY) >= 18 && (
            <text x={plotX + 6} y={cliffY - 5} fontSize={14} fill={rawWarnColor}>
              65% blur
            </text>
          )}

          {/* Naive baseline curve (dashed) */}
          {analysis.strategy !== 'naive' && (
            <polyline points={naivePts} fill="none" stroke={dangerColor} strokeWidth={1.8} strokeDasharray="4 4" opacity={0.7} />
          )}

          {/* Active strategy curve */}
          <polyline points={activePts} fill="none" stroke={activeColor} strokeWidth={2.6} strokeLinejoin="round" />

          {/* Current turn marker */}
          <line x1={curX} y1={plotY} x2={curX} y2={plotY + plotH} stroke={t.textSecondary} strokeWidth={1.2} strokeDasharray="3 3" />
          <circle cx={curX} cy={curY} r={5.5} fill={activeColor} stroke={t.background} strokeWidth={1.5} />
          <text
            x={curX > plotX + plotW - 92 ? curX - 8 : curX + 8}
            y={Math.max(plotY + 18, Math.min(plotY + plotH - 10, curY - 10))}
            textAnchor={curX > plotX + plotW - 92 ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={activeColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            {(analysis.totalTokens / 1000).toFixed(1)}k
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 38} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Agent conversation turn (1 to 20)
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
                title="Why agents write progress to a checklist instead of keeping every raw log"
                description="Every tool call dumps long terminal output into the prompt. Keeping everything overflows the window and blurs attention; blindly deleting old turns causes amnesia. Compare both against saving a small state checklist on disk."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton
                onClick={() => {
                  setManualTurn(null);
                  playback.toggle();
                }}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualTurn(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualTurn(null);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<CompactionStrategy>
                label="Memory strategy (how old turns are handled)"
                value={strategy}
                onChange={(val) => {
                  const next = typeof val === 'function' ? val(strategy) : val;
                  selectStrategy(next);
                }}
                options={[
                  { value: 'compacted', label: 'Artifact + window (best)' },
                  { value: 'sliding', label: 'Sliding window only' },
                  { value: 'naive', label: 'Naive (keep all logs)' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Quick presets"
                value={activePresetId}
                onChange={(id) => {
                  const found = COMPACTION_PRESETS.find((p) => p.id === id);
                  if (found) {
                    selectStrategy(found.strategy);
                    selectTurn(found.turn);
                    setRawTokensPerTurn(found.rawTokensPerTurn);
                    setWindowLimit(found.windowLimit);
                    setRecentTurnsKept(found.recentTurnsKept);
                    setPrediction(null);
                  }
                }}
                options={[
                  ...COMPACTION_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom setup' }] : []),
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12, alignItems: 'end' }}>
            <div>
              <Slider
                label="Turn count t (steps taken)"
                value={analysis.turn}
                onChange={selectTurn}
                min={1}
                max={20}
                step={1}
                format={(v) => `Turn ${v}`}
              />
              <input
                aria-label="Exact conversation turn"
                type="number"
                min={1}
                max={20}
                step={1}
                value={analysis.turn}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) selectTurn(v);
                }}
                style={inputStyle}
              />
            </div>

            <div>
              <Slider
                label="Raw log tokens added per turn (k_raw)"
                value={rawTokensPerTurn}
                onChange={(v) => setRawTokensPerTurn(v)}
                min={2000}
                max={14000}
                step={500}
                format={(v) => `${(v / 1000).toFixed(1)}k`}
              />
              <input
                aria-label="Exact raw tokens per turn"
                type="number"
                min={1000}
                max={16000}
                step={500}
                value={rawTokensPerTurn}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setRawTokensPerTurn(Math.max(1000, Math.min(16000, Math.round(v))));
                }}
                style={inputStyle}
              />
            </div>

            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Context window limit (tokens)</span>
              <input
                aria-label="Exact context window limit"
                type="number"
                min={16000}
                max={256000}
                step={8000}
                value={windowLimit}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setWindowLimit(Math.max(16000, Math.min(256000, Math.round(v))));
                }}
                style={inputStyle}
              />
            </label>

            <Slider
              label="Recent full turns kept (W)"
              value={recentTurnsKept}
              onChange={(v) => setRecentTurnsKept(v)}
              min={1}
              max={6}
              step={1}
              format={(v) => `${v} turns`}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15 }} aria-label="Context token colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: systemColor, verticalAlign: 'middle', marginRight: 6 }} />
          System ({(analysis.systemTokens / 1000).toFixed(1)}k)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: toolsColor, verticalAlign: 'middle', marginRight: 6 }} />
          Tools ({(analysis.toolTokens / 1000).toFixed(1)}k)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: stateColor, verticalAlign: 'middle', marginRight: 6 }} />
          State file
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: recentColor, verticalAlign: 'middle', marginRight: 6 }} />
          Recent turns
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: dangerColor, verticalAlign: 'middle', marginRight: 6 }} />
          Naive raw logs / limit
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 292"
            role="img"
            aria-label={`At Turn ${analysis.turn}, ${analysis.strategy} uses ${analysis.totalTokens} of ${analysis.windowLimit} tokens (${analysis.rawUsagePct.toFixed(1)}%)`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderBudgetPanel(0, 386)}
            {renderCurvePanel(396, 364)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 292" role="img" aria-label="Context window capacity bar" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderBudgetPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 292" role="img" aria-label="Context usage curve over 20 turns" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCurvePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Compacted context formula" latex={FORMULA_LATEX.compacted} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Turn {analysis.turn}: <strong>{analysis.totalTokens.toLocaleString('en-US')}</strong> vs Naive <strong>{analysis.naiveTotalTokens.toLocaleString('en-US')}</strong> ({analysis.savedPctVsNaive.toFixed(1)}% saved)
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${PLAYBACK_TURNS.length}`} color="blue" tilt={1} live>
            <p>{analysis.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Artifact + window"
              latex={FORMULA_LATEX.compacted}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'compacted'}
              onSelect={() => selectStrategy('compacted')}
            >
              <p style={{ textAlign: 'center' }}>F = fixed rules (5,700), S(t) = state file, W = kept turns (k_keep = 3,200).</p>
            </StickyNote>
            <StickyNote
              title="2. Sliding window only"
              latex={FORMULA_LATEX.sliding}
              color="pink"
              tilt={1}
              active={activeFormula === 'sliding'}
              onSelect={() => selectStrategy('sliding')}
            >
              <p style={{ textAlign: 'center' }}>Stays small, but drops older turns with no state file — causes amnesia.</p>
            </StickyNote>
            <StickyNote
              title="3. Naive full history"
              latex={FORMULA_LATEX.naive}
              color="orange"
              tilt={-1}
              active={activeFormula === 'naive'}
              onSelect={() => selectStrategy('naive')}
            >
              <p style={{ textAlign: 'center' }}>Every turn adds k_raw log tokens until the 128k window overflows.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · Turn ${analysis.turn}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Fixed F = <strong>{analysis.fixedTokens.toLocaleString('en-US')}</strong> + State = <strong>{analysis.stateArtifactTokens.toLocaleString('en-US')}</strong> + Turns = <strong>{analysis.workingTurnTokens.toLocaleString('en-US')}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Total = <strong>{analysis.totalTokens.toLocaleString('en-US')}</strong> ({analysis.rawUsagePct.toFixed(1)}%) · Naive = <strong>{analysis.naiveTotalTokens.toLocaleString('en-US')}</strong> · Saved: <strong>{analysis.savedPctVsNaive.toFixed(1)}%</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${PLAYBACK_TURNS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{analysis.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="With 5,700 fixed tokens and 8,500 raw log tokens per turn, how full is a 128,000-token window at Turn 12 under Naive history?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="5,700 + 12 × 8,500 = 107,700 tokens (84.1%), deep inside the attention-blur zone—and by turn 15 it reaches 133,200 tokens (>128k overflow). Artifact compaction stays at 17,700 (83.6% smaller)."
            actionLabel="Test Turn 12 Naive (107.7k) now"
            onAction={() => {
              selectStrategy('naive');
              setRawTokensPerTurn(8500);
              setWindowLimit(128000);
              setRecentTurnsKept(3);
              selectTurn(12);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function ContextCompactionVisualizer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Context compaction strategy playground"
      footer="Exact token accounting across Turns 1–20 comparing externalized state artifacts (feature_list.json), naive full-history retention, and raw sliding windows."
    >
      <ContextCompactionPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
