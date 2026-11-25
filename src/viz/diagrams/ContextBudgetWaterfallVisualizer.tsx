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
  CONTEXT_MAX_TURNS,
  CONTEXT_PRESETS,
  CONTEXT_TRACE_TURNS,
  simulateContextWaterfall,
  type ContextPresetId,
} from '../lib/contextBudgetWaterfall';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Just 80,200 tokens once',
  'Over 1.3 million cumulative tokens because every earlier token is re-sent each turn',
  'The model automatically strips old turns at zero cost',
] as const;

const FORMULA_LATEX = {
  usable: String.raw`B_{\text{usable}} = W - B_{\text{gen}}`,
  watermark: String.raw`B_{\text{used}} \ge r_{\text{wm}} \cdot B_{\text{usable}} \;\Rightarrow\; \text{compact}`,
  billed: String.raw`C_{\text{total}} = \sum_{t=1}^{T} \left(B_{\text{prefix}} + B_{\text{tools}} + B_{\text{files}} + B_{\text{hist}}(t)\right)`,
} as const;

function ContextBudgetWaterfallPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipBarId = useId();
  const clipTrendId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [presetId, setPresetId] = useState<ContextPresetId>('engineered');
  const [windowLimit, setWindowLimit] = useState<number>(CONTEXT_PRESETS.engineered.config.windowLimit);
  const [outputReserve, setOutputReserve] = useState<number>(CONTEXT_PRESETS.engineered.config.outputReserve);
  const [prefixTokens, setPrefixTokens] = useState<number>(CONTEXT_PRESETS.engineered.config.prefixTokens);
  const [toolTokens, setToolTokens] = useState<number>(CONTEXT_PRESETS.engineered.config.toolTokens);
  const [fileTokens, setFileTokens] = useState<number>(CONTEXT_PRESETS.engineered.config.fileTokens);
  const [tokensPerTurn, setTokensPerTurn] = useState<number>(CONTEXT_PRESETS.engineered.config.tokensPerTurn);
  const [autoCompact, setAutoCompact] = useState<boolean>(CONTEXT_PRESETS.engineered.config.autoCompact);
  const [watermarkRatio, setWatermarkRatio] = useState<number>(CONTEXT_PRESETS.engineered.config.watermarkRatio);
  const [manualTurn, setManualTurn] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(CONTEXT_TRACE_TURNS.length, 2000, 2, outerVisible);
  const activeTurn = manualTurn ?? CONTEXT_TRACE_TURNS[playback.step] ?? 8;

  const snapshots = useMemo(
    () =>
      simulateContextWaterfall(
        {
          windowLimit,
          outputReserve,
          prefixTokens,
          toolTokens,
          fileTokens,
          tokensPerTurn,
          autoCompact,
          watermarkRatio,
        },
        CONTEXT_MAX_TURNS,
      ),
    [windowLimit, outputReserve, prefixTokens, toolTokens, fileTokens, tokensPerTurn, autoCompact, watermarkRatio],
  );
  const snap = snapshots[Math.max(0, Math.min(snapshots.length - 1, activeTurn - 1))];

  const prefixColor = t.accentSecondary;
  const toolsColor = t.accentPurple;
  const filesColor = t.accentWarn;
  const historyColor = snap.regime === 'overflow' ? t.accentDanger : t.accentTeal;
  const reserveColor = t.accentPrimary;
  const dangerColor = t.accentDanger;

  const applyPreset = (id: ContextPresetId) => {
    const cfg = CONTEXT_PRESETS[id].config;
    setPresetId(id);
    setWindowLimit(cfg.windowLimit);
    setOutputReserve(cfg.outputReserve);
    setPrefixTokens(cfg.prefixTokens);
    setToolTokens(cfg.toolTokens);
    setFileTokens(cfg.fileTokens);
    setTokensPerTurn(cfg.tokensPerTurn);
    setAutoCompact(cfg.autoCompact);
    setWatermarkRatio(cfg.watermarkRatio);
  };

  const selectTurn = (turn: number) => {
    playback.stop();
    setManualTurn(Math.max(1, Math.min(CONTEXT_MAX_TURNS, Math.round(turn))));
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

  const renderWaterfallAndBreakdown = (panelW: number) => {
    const barX = 24;
    const barY = 46;
    const barW = panelW - 48;
    const barH = 34;

    const totalScale = Math.max(windowLimit, snap.inputUsed + snap.outputReserve);
    const sx = (tok: number) => (tok / totalScale) * barW;

    const segments = [
      { label: 'System rules', tokens: snap.prefixTokens, color: prefixColor },
      { label: presetId === 'unmanaged' ? '40 pasted tool schemas' : 'Tool definitions', tokens: snap.toolTokens, color: toolsColor },
      { label: presetId === 'unmanaged' ? 'Raw pasted files' : 'File signatures / docs', tokens: snap.fileTokens, color: filesColor },
      { label: 'Turn conversation logs', tokens: snap.historyTokens, color: historyColor },
    ];

    const watermarkX = barX + sx(snap.watermarkTokens);
    const limitX = barX + sx(windowLimit);

    // Sub-panel 1 (left on desktop): Turn-by-turn growth chart
    const isNarrow = panelW < 500;
    const chartX = 52;
    const chartY = 136;
    const chartW = isNarrow ? panelW - 72 : 362;
    const chartH = 118;
    const maxY = Math.max(windowLimit, ...snapshots.map((s) => s.inputUsed)) * 1.05;
    const ty = (tok: number) => chartY + chartH - (tok / maxY) * (chartH - 10);
    const colW = chartW / CONTEXT_MAX_TURNS;

    // Sub-panel 2 (right on desktop, below on phone): Zone breakdown list
    const listX = isNarrow ? 24 : 448;
    const listY = isNarrow ? 296 : 130;

    return (
      <g>
        <text x={panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Turn {snap.turn} memory window: {snap.inputUsed.toLocaleString('en-US')} / {windowLimit.toLocaleString('en-US')} tokens ({snap.utilizationPct.toFixed(1)}%)
        </text>

        <defs>
          <clipPath id={`${clipBarId}-${panelW}`}>
            <rect x={barX} y={barY} width={barW} height={barH} rx={5} />
          </clipPath>
          <clipPath id={`${clipTrendId}-${panelW}`}>
            <rect x={chartX} y={chartY} width={chartW} height={chartH} />
          </clipPath>
        </defs>

        {/* Window bar background */}
        <rect x={barX} y={barY} width={barW} height={barH} rx={5} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1.2} />
        <g clipPath={`url(#${clipBarId}-${panelW})`}>
          {(() => {
            let cursor = barX;
            return segments.map((seg) => {
              const w = Math.max(0, sx(seg.tokens));
              const x = cursor;
              cursor += w;
              return <rect key={seg.label} x={x} y={barY} width={w} height={barH} fill={seg.color} fillOpacity={0.88} />;
            });
          })()}
          {snap.outputReserve > 0 && (
            <rect
              x={Math.max(barX, limitX - sx(snap.outputReserve))}
              y={barY}
              width={sx(snap.outputReserve)}
              height={barH}
              fill={reserveColor}
              fillOpacity={0.32}
              stroke={reserveColor}
              strokeWidth={1.6}
            />
          )}
        </g>

        {/* Watermark line & Hard window ceiling */}
        <line x1={watermarkX} y1={barY - 6} x2={watermarkX} y2={barY + barH + 6} stroke={dangerColor} strokeWidth={1.8} strokeDasharray="4 3" />
        <text
          x={Math.min(panelW - 24, Math.max(barX + 52, watermarkX))}
          y={barY + barH + 20}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fill={dangerColor}
        >
          compact trigger ({Math.round(watermarkRatio * 100)}%)
        </text>

        {snap.overflowTokens > 0 && (
          <line x1={limitX} y1={barY - 6} x2={limitX} y2={barY + barH + 6} stroke={dangerColor} strokeWidth={2.2} />
        )}

        {/* Turn-by-turn trajectory */}
        <text x={chartX + chartW / 2} y={chartY - 10} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>
          Growth over turns 1 → 16 (click bar to jump)
        </text>
        <rect x={chartX} y={chartY} width={chartW} height={chartH} fill={t.background} rx={4} />
        <line x1={chartX} y1={chartY} x2={chartX} y2={chartY + chartH} stroke={t.border} strokeWidth={1.2} />
        <line x1={chartX} y1={chartY + chartH} x2={chartX + chartW} y2={chartY + chartH} stroke={t.border} strokeWidth={1.2} />
        <text x={chartX - 6} y={ty(windowLimit) + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
          {Math.round(windowLimit / 1000)}k
        </text>
        <text x={chartX - 6} y={chartY + chartH + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
          0
        </text>

        <g clipPath={`url(#${clipTrendId}-${panelW})`}>
          <line x1={chartX} y1={ty(snap.usableBudget)} x2={chartX + chartW} y2={ty(snap.usableBudget)} stroke={reserveColor} strokeWidth={1.4} strokeDasharray="3 3" />
          <line x1={chartX} y1={ty(snap.watermarkTokens)} x2={chartX + chartW} y2={ty(snap.watermarkTokens)} stroke={dangerColor} strokeWidth={1.4} strokeDasharray="5 3" />
          {snapshots.map((s, idx) => {
            const bx = chartX + idx * colW + 2;
            const bw = Math.max(4, colW - 4);
            const topY = ty(s.inputUsed);
            const h = Math.max(2, chartY + chartH - topY);
            const isSel = s.turn === snap.turn;
            const fill = s.regime === 'overflow' ? dangerColor : s.regime === 'warning' ? filesColor : prefixColor;
            return (
              <rect
                key={`tb-${s.turn}`}
                x={bx}
                y={topY}
                width={bw}
                height={h}
                rx={2}
                fill={fill}
                fillOpacity={isSel ? 1 : 0.45}
                stroke={isSel ? t.textPrimary : 'none'}
                strokeWidth={isSel ? 1.5 : 0}
                onClick={() => selectTurn(s.turn)}
                style={{ cursor: 'pointer' }}
              >
                <title>{`Turn ${s.turn}: ${s.inputUsed.toLocaleString('en-US')} tokens`}</title>
              </rect>
            );
          })}
        </g>

        {[1, 8, 16].map((tk) => (
          <text key={`tx-${tk}`} x={chartX + (tk - 0.5) * colW} y={chartY + chartH + 18} textAnchor="middle" fontSize={14} fill={t.textMuted}>
            T{tk}
          </text>
        ))}

        {/* Breakdown rows */}
        <g>
          <text x={listX} y={listY} fontSize={15} fontWeight={700} fill={t.textPrimary}>
            Turn {snap.turn} breakdown
          </text>
          {[
            ...segments,
            { label: 'Reserved for reply', tokens: snap.outputReserve, color: reserveColor },
            { label: snap.overflowTokens > 0 ? 'OVERFLOW' : 'Free headroom', tokens: snap.overflowTokens > 0 ? snap.overflowTokens : snap.freeHeadroom, color: snap.overflowTokens > 0 ? dangerColor : t.textMuted },
          ].map((row, idx) => {
            const ry = listY + 24 + idx * 24;
            return (
              <g key={row.label}>
                <rect x={listX} y={ry - 11} width={12} height={12} rx={2} fill={row.color} fillOpacity={0.9} />
                <text x={listX + 18} y={ry} fontSize={14} fill={t.textPrimary}>
                  {row.label}
                </text>
                <text x={panelW - 24} y={ry} textAnchor="end" fontSize={14} fontWeight={700} fill={row.color}>
                  {row.tokens.toLocaleString('en-US')}
                </text>
              </g>
            );
          })}
        </g>
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
                title="Why pasting everything into a prompt breaks an AI's working memory"
                description="An LLM's context window holds instructions, tools, files, chat logs, and room for its reply. When bloated context fills past ~70%, the model loses track of earlier rules and re-pays for every token on every turn."
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
              <PillSelect<ContextPresetId>
                label="Context strategy"
                value={presetId}
                onChange={(id) => applyPreset(typeof id === 'function' ? id(presetId) : id)}
                options={[
                  { value: 'engineered', label: CONTEXT_PRESETS.engineered.label },
                  { value: 'unmanaged', label: CONTEXT_PRESETS.unmanaged.label },
                  { value: 'tight-32k', label: CONTEXT_PRESETS['tight-32k'].label },
                ]}
              />
            </div>
            <button
              type="button"
              aria-pressed={autoCompact}
              onClick={() => setAutoCompact((v) => !v)}
              style={{
                padding: '6px 12px',
                borderRadius: RADIUS.sm,
                border: `1.5px solid ${autoCompact ? reserveColor : t.border}`,
                background: autoCompact ? t.surfaceAlt : 'transparent',
                color: autoCompact ? reserveColor : t.textPrimary,
                fontFamily: FONT_FAMILY,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Auto-compact at {Math.round(watermarkRatio * 100)}%: {autoCompact ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 12, alignItems: 'end' }}>
            <Slider
              label="Conversation turn T"
              value={snap.turn}
              onChange={(v) => selectTurn(v)}
              min={1}
              max={CONTEXT_MAX_TURNS}
              step={1}
              format={(v) => `Turn ${v}`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Window limit W</span>
              <input
                aria-label="Context window limit W"
                type="number"
                min={8000}
                max={256000}
                step={4000}
                value={windowLimit}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setWindowLimit(Math.max(8000, Math.min(256000, Math.round(v))));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Reply reserve B_gen</span>
              <input
                aria-label="Reply reserve tokens"
                type="number"
                min={0}
                max={32000}
                step={500}
                value={outputReserve}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setOutputReserve(Math.max(0, Math.min(32000, Math.round(v))));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Files / docs tokens</span>
              <input
                aria-label="Files tokens"
                type="number"
                min={0}
                max={80000}
                step={1000}
                value={fileTokens}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setFileTokens(Math.max(0, Math.min(80000, Math.round(v))));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15 }} aria-label="Budget zone legend">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: prefixColor, verticalAlign: 'middle', marginRight: 6 }} />
          System rules
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: toolsColor, verticalAlign: 'middle', marginRight: 6 }} />
          Tools
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: filesColor, verticalAlign: 'middle', marginRight: 6 }} />
          Files
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: historyColor, verticalAlign: 'middle', marginRight: 6 }} />
          Turn logs
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: reserveColor, opacity: 0.5, border: `1.5px solid ${reserveColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Reply reserve
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 292"
            role="img"
            aria-label={`Turn ${snap.turn}: ${snap.inputUsed.toLocaleString('en-US')} of ${windowLimit.toLocaleString('en-US')} tokens used (${snap.utilizationPct.toFixed(1)}%)`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderWaterfallAndBreakdown(760)}
          </svg>
        ) : (
          <svg
            width="100%"
            viewBox="0 0 370 472"
            role="img"
            aria-label={`Turn ${snap.turn} context waterfall`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderWaterfallAndBreakdown(370)}
          </svg>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Usable input budget" latex={FORMULA_LATEX.usable} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Turn {snap.turn}: {snap.inputUsed.toLocaleString('en-US')} used · {snap.freeHeadroom.toLocaleString('en-US')} free headroom
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${CONTEXT_TRACE_TURNS.length}`} color="blue" tilt={1} live>
            <p>{snap.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Usable input budget" latex={FORMULA_LATEX.usable} color="yellow" tilt={-1}>
              <p style={{ textAlign: 'center' }}>Subtract reserved reply tokens B_gen first so long outputs never get cut off mid-sentence.</p>
            </StickyNote>
            <StickyNote
              title="Compaction watermark"
              latex={FORMULA_LATEX.watermark}
              color="pink"
              tilt={1}
              active={autoCompact}
              onSelect={() => setAutoCompact((v) => !v)}
            >
              <p style={{ textAlign: 'center' }}>Fold old tool logs into a short checklist once input crosses {Math.round(watermarkRatio * 100)}% of usable space.</p>
            </StickyNote>
            <StickyNote title="Multi-turn billed cost" latex={FORMULA_LATEX.billed} color="orange" tilt={-1}>
              <p style={{ textAlign: 'center' }}>Every turn re-sends the whole prefix plus history, so bloated prompts multiply API bills fast.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · Turn ${snap.turn}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Input = {snap.prefixTokens.toLocaleString('en-US')} + {snap.toolTokens.toLocaleString('en-US')} + {snap.fileTokens.toLocaleString('en-US')} + {snap.historyTokens.toLocaleString('en-US')} = <strong>{snap.inputUsed.toLocaleString('en-US')}</strong> ({snap.utilizationPct.toFixed(1)}%)
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Free headroom = <strong>{snap.freeHeadroom.toLocaleString('en-US')}</strong> · Compactions = <strong>{snap.compactionsSoFar}</strong> · Cumulative billed ({snap.turn} turns) = <strong>{snap.cumulativeBilledTokens.toLocaleString('en-US')}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${CONTEXT_TRACE_TURNS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{snap.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="An unmanaged 128k agent starts with 44,200 tokens of rules, 40 tool schemas, and raw files, then adds 4,500 tokens each turn for 16 turns. Roughly how many input tokens get billed across all 16 turns?"
            options={PREDICT_OPTIONS}
            correctIndex={1}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Because the prompt prefix and all earlier turns are re-sent on every turn, 16 unmanaged turns add up to 1,319,200 cumulative input tokens."
            actionLabel="Run 16 unmanaged turns now"
            onAction={() => {
              applyPreset('unmanaged');
              selectTurn(16);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function ContextBudgetWaterfallVisualizer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Context budget waterfall playground"
      footer="Exact turn-by-turn token accounting for instructions, tool schemas, files, conversation history, and reply reserve."
    >
      <ContextBudgetWaterfallPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
