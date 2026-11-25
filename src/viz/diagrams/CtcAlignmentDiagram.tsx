import { useId, useMemo, useState, type ReactElement } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  StickyNote,
  StickyRow,
  useVizVisible,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from '../primitives';
import {
  analyzeCtcAlignment,
  CTC_BLANK,
  CTC_PRESETS,
} from '../lib/ctcAlignment';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Both LL runs merge into one L, turning HELLO into HELO',
  'You still get HELLO with two Ls',
  'The word keeps all blanks as spaces',
] as const;

type CtcFormulaTab = 'collapse' | 'broken' | 'paths';

const FORMULA_LATEX: Record<CtcFormulaTab, string> = {
  collapse: String.raw`\mathcal{B}(\pi) = \mathrm{drop}_{-}\!\big(\mathrm{merge}(\pi)\big)`,
  broken: String.raw`\mathrm{broken}(\pi) = \mathrm{merge}\!\big(\mathrm{drop}_{-}(\pi)\big)`,
  paths: String.raw`\alpha_t(s) = \textstyle\sum_{k=0}^{2} \alpha_{t-1}(s-k)`,
};

function CtcAlignmentPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipCollapseId = useId();
  const clipLatticeId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [framesText, setFramesText] = useState<string>(CTC_PRESETS[0].framesText);
  const [targetWord, setTargetWord] = useState<string>(CTC_PRESETS[0].target);
  const [dropBlanksFirst, setDropBlanksFirst] = useState<boolean>(false);
  const [activeFormula, setActiveFormula] = useState<CtcFormulaTab>('collapse');
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(
    () => analyzeCtcAlignment({ framesText, targetWord, dropBlanksFirst }),
    [framesText, targetWord, dropBlanksFirst],
  );

  const playback = useStepPlayback(analysis.trace.length, 2150, 2, outerVisible);
  const activeStep = analysis.trace[playback.step] ?? analysis.trace[2];

  const letterColor = t.accentSecondary;
  const blankColor = t.textMuted;
  const goodColor = t.accentPrimary;
  const badColor = t.accentDanger;
  const sepBlankColor = t.accentWarn;
  const pathColor = t.accentPurple;

  const activePresetId =
    CTC_PRESETS.find(
      (p) =>
        p.framesText.replace(/\s+/g, '') === framesText.replace(/\s+/g, '').toUpperCase() &&
        p.target === targetWord.toUpperCase().replace(/[^A-Z]/g, ''),
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

  const renderCollapsePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 224;

    const showStep1 = playback.step >= 1;
    const showStep2 = playback.step >= 2;

    const drawStrip = (symbols: readonly string[], y: number, active: boolean, highlightDoubleBlanks: boolean) => {
      const count = Math.max(1, symbols.length);
      const maxWidth = plotW - 24;
      const cellW = Math.min(26, Math.max(16, Math.floor(maxWidth / count)));
      const cellH = 26;
      const startX = plotX + 12;

      return (
        <g opacity={active ? 1 : 0.28}>
          {symbols.map((sym, idx) => {
            const isBlank = sym === CTC_BLANK;
            const isSeparator =
              highlightDoubleBlanks &&
              isBlank &&
              idx > 0 &&
              idx < symbols.length - 1 &&
              symbols[idx - 1] !== CTC_BLANK &&
              symbols[idx - 1] === symbols[idx + 1];
            const color = isSeparator ? sepBlankColor : isBlank ? blankColor : letterColor;
            return (
              <g key={`${idx}-${sym}`}>
                <rect
                  x={startX + idx * cellW}
                  y={y}
                  width={cellW - 2}
                  height={cellH}
                  rx={3}
                  fill={isSeparator ? `${sepBlankColor}25` : isBlank ? t.surfaceAlt : `${letterColor}18`}
                  stroke={isSeparator ? sepBlankColor : isBlank ? t.border : letterColor}
                  strokeWidth={isSeparator ? 1.8 : 1.1}
                />
                <text
                  x={startX + idx * cellW + (cellW - 2) / 2}
                  y={y + 18}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={700}
                  fill={color}
                >
                  {sym}
                </text>
              </g>
            );
          })}
        </g>
      );
    };

    const resultColor = analysis.matchesTarget ? goodColor : badColor;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Collapse audio slices into text ({analysis.dropBlanksFirst ? 'broken order' : 'real CTC'})
        </text>
        <defs>
          <clipPath id={`${clipCollapseId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipCollapseId}-${offsetX})`}>
          <text x={plotX + 12} y={plotY + 20} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Raw slices ({analysis.frames.length} time steps)
          </text>
          {drawStrip(analysis.frames, plotY + 26, true, false)}

          <text x={plotX + 12} y={plotY + 76} fontSize={14} fontWeight={700} fill={analysis.dropBlanksFirst ? badColor : t.textPrimary}>
            {analysis.dropBlanksFirst
              ? `Step 1 (wrong): drop '-' blanks first (${analysis.afterStep1.length})`
              : `Step 1: merge repeated neighbors (${analysis.afterStep1.length})`}
          </text>
          {drawStrip(analysis.afterStep1, plotY + 82, showStep1, !analysis.dropBlanksFirst)}

          <text x={plotX + 12} y={plotY + 132} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            {analysis.dropBlanksFirst
              ? 'Step 2: merge touching duplicates → output'
              : "Step 2: drop all '-' blanks → final text"}
          </text>
          <g opacity={showStep2 ? 1 : 0.3}>
            <rect
              x={plotX + 12}
              y={plotY + 140}
              width={plotW - 24}
              height={42}
              rx={6}
              fill={`${resultColor}16`}
              stroke={resultColor}
              strokeWidth={1.8}
            />
            <text x={plotX + 24} y={plotY + 167} fontSize={16} fontWeight={700} fill={resultColor}>
              {analysis.decoded || '(empty)'}
            </text>
            <text x={plotX + plotW - 22} y={plotY + 166} textAnchor="end" fontSize={14} fontWeight={700} fill={resultColor}>
              {analysis.matchesTarget ? `Matches "${analysis.target}"` : `Target is "${analysis.target}"`}
            </text>
          </g>

          <text x={plotX + 12} y={plotY + 206} fontSize={14} fill={sepBlankColor}>
            {analysis.separatorBlanks > 0
              ? `Amber '-' separates repeated letters (${analysis.separatorBlanks} found)`
              : 'No separator blank between repeated letters'}
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Merge repeats first so '-' keeps double letters like LL separate
        </text>
      </g>
    );
  };

  // Official Graves (2006) CTC forward-alignment trellis over blank-interleaved labels
  const renderLatticePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 224;

    const ext = analysis.extendedTarget;
    const T = Math.min(16, analysis.frames.length);
    const S = Math.min(11, ext.length);
    const leftPad = 32;
    const rightPad = 14;
    const topPad = 20;
    const botPad = 32;
    const stepX = T > 1 ? (plotW - leftPad - rightPad) / (T - 1) : 0;
    const stepY = S > 1 ? (plotH - topPad - botPad) / (S - 1) : 0;

    const nodeX = (col: number) => plotX + leftPad + col * stepX;
    const nodeY = (row: number) => plotY + topPad + row * stepY;
    const pathStates = analysis.alignedPathStates;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Graves (2006) CTC alignment trellis
        </text>
        <defs>
          <clipPath id={`${clipLatticeId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipLatticeId}-${offsetX})`}>
          {/* Row labels for blank-interleaved extended sequence l' */}
          {ext.slice(0, S).map((sym, s) => (
            <text
              key={`row-${s}`}
              x={plotX + 18}
              y={nodeY(s) + 5}
              textAnchor="middle"
              fontSize={14}
              fontWeight={sym === CTC_BLANK ? 400 : 700}
              fill={sym === CTC_BLANK ? blankColor : letterColor}
            >
              {sym}
            </text>
          ))}

          {/* Valid CTC forward transitions (light background grid) */}
          {Array.from({ length: Math.max(0, T - 1) }, (_, col) =>
            Array.from({ length: S }, (__, s) => {
              const lines: ReactElement[] = [];
              // Stay on same state
              lines.push(
                <line
                  key={`st-${col}-${s}`}
                  x1={nodeX(col)}
                  y1={nodeY(s)}
                  x2={nodeX(col + 1)}
                  y2={nodeY(s)}
                  stroke={t.border}
                  strokeWidth={0.9}
                  opacity={0.4}
                />,
              );
              // Step to s + 1
              if (s + 1 < S) {
                lines.push(
                  <line
                    key={`adv-${col}-${s}`}
                    x1={nodeX(col)}
                    y1={nodeY(s)}
                    x2={nodeX(col + 1)}
                    y2={nodeY(s + 1)}
                    stroke={t.border}
                    strokeWidth={0.9}
                    opacity={0.4}
                  />,
                );
              }
              return lines;
            }),
          )}

          {/* Lattice dots */}
          {Array.from({ length: T }, (_, col) =>
            Array.from({ length: S }, (__, s) => (
              <circle key={`dot-${col}-${s}`} cx={nodeX(col)} cy={nodeY(s)} r={2.3} fill={t.border} opacity={0.65} />
            )),
          )}

          {/* Highlighted aligned path if frames spell target */}
          {pathStates && playback.step >= 1 && (
            <>
              <polyline
                points={pathStates
                  .slice(0, T)
                  .map((s, col) => `${nodeX(col)},${nodeY(Math.min(S - 1, s))}`)
                  .join(' ')}
                fill="none"
                stroke={pathColor}
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
              {pathStates.slice(0, T).map((s, col) => (
                <circle
                  key={`pdot-${col}`}
                  cx={nodeX(col)}
                  cy={nodeY(Math.min(S - 1, s))}
                  r={4.2}
                  fill={ext[s] === CTC_BLANK ? sepBlankColor : pathColor}
                  stroke={t.background}
                  strokeWidth={1.2}
                />
              ))}
            </>
          )}

          <text x={plotX + plotW / 2} y={plotY + plotH - 5} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            Time slices t = 1 → {analysis.frames.length}
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={pathColor}>
          {analysis.validPathCount.toLocaleString('en-US')} valid paths spell “{analysis.target}”
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
                title="How speech models emit double letters without time labels"
                description="A speech model guesses one symbol (a letter or '-' blank) for every tiny audio slice. Edit the slice symbols or flip the collapse order to see why CTC merges duplicates before erasing blanks."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Example audio phrases"
                value={activePresetId}
                onChange={(id) => {
                  const preset = CTC_PRESETS.find((p) => p.id === id);
                  if (preset) {
                    setFramesText(preset.framesText);
                    setTargetWord(preset.target);
                    setPrediction(null);
                  }
                }}
                options={[
                  ...CTC_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom frames' }] : []),
                ]}
              />
            </div>
            <button
              type="button"
              aria-pressed={dropBlanksFirst}
              onClick={() => {
                setDropBlanksFirst((b) => {
                  const next = !b;
                  setActiveFormula(next ? 'broken' : 'collapse');
                  return next;
                });
              }}
              style={{
                padding: '6px 12px',
                borderRadius: RADIUS.sm,
                border: `1.5px solid ${dropBlanksFirst ? badColor : goodColor}`,
                background: dropBlanksFirst ? `${badColor}16` : `${goodColor}14`,
                color: dropBlanksFirst ? badColor : goodColor,
                fontFamily: FONT_FAMILY,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Collapse rule: {dropBlanksFirst ? 'Drop blanks first (broken!)' : 'Merge repeats first (real CTC)'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 12, alignItems: 'end' }}>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Per-frame predictions (letters and '-' blanks)</span>
              <input
                aria-label="Per-frame CTC symbols"
                type="text"
                maxLength={60}
                value={framesText}
                onChange={(e) => setFramesText(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Target transcript word</span>
              <input
                aria-label="Target transcript word"
                type="text"
                maxLength={10}
                value={targetWord}
                onChange={(e) => setTargetWord(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="CTC alignment colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: letterColor, verticalAlign: 'middle', marginRight: 6 }} />
          Letter symbol
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: sepBlankColor, verticalAlign: 'middle', marginRight: 6 }} />
          Separator '-' blank (keeps LL / EE)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: pathColor, verticalAlign: 'middle', marginRight: 6 }} />
          Frame path through CTC lattice
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 294"
            role="img"
            aria-label={`CTC collapses ${analysis.frames.length} frames to ${analysis.decoded} (${analysis.validPathCount} total alignments for ${analysis.target})`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderCollapsePanel(0, 444)}
            {renderLatticePanel(452, 308)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 294" role="img" aria-label="CTC frame collapse steps" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCollapsePanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 294" role="img" aria-label="Graves CTC forward alignment trellis" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderLatticePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="CTC collapse rule" latex={FORMULA_LATEX.collapse} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              {analysis.frames.length} slices → <strong>“{analysis.decoded}”</strong> ({analysis.separatorBlanks} separator blank)
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
              title="1. Real CTC collapse"
              latex={FORMULA_LATEX.collapse}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'collapse'}
              onSelect={() => {
                setDropBlanksFirst(false);
                setActiveFormula('collapse');
              }}
            >
              <p style={{ textAlign: 'center' }}>Merge adjacent duplicates first, then drop '-' blanks so LL survives.</p>
            </StickyNote>
            <StickyNote
              title="2. Broken order (drop first)"
              latex={FORMULA_LATEX.broken}
              color="pink"
              tilt={1}
              active={activeFormula === 'broken'}
              onSelect={() => {
                setDropBlanksFirst(true);
                setActiveFormula('broken');
              }}
            >
              <p style={{ textAlign: 'center' }}>Deleting blanks first lets double letters touch and merge into one.</p>
            </StickyNote>
            <StickyNote
              title="3. Forward alignment DP"
              latex={FORMULA_LATEX.paths}
              color="orange"
              tilt={-1}
              active={activeFormula === 'paths'}
              onSelect={() => {
                setActiveFormula('paths');
                playback.setStep(3);
              }}
            >
              <p style={{ textAlign: 'center' }}>Sums every valid frame path. The k = 2 skip is allowed only when it jumps a blank between two different letters.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · "${analysis.target}"`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Slices: <strong>{analysis.frames.length}</strong> ({analysis.blankCount} blanks) → Step 1: <strong>{analysis.afterStep1.length}</strong> → Output: <strong>“{analysis.decoded}”</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Valid CTC paths of length {analysis.frames.length} for “{analysis.target}”: <strong>{analysis.validPathCount.toLocaleString('en-US')}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{activeStep.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt='Frames 7–12 emit L, L, -, L, L. What happens if you drop the "-" blank BEFORE merging adjacent duplicates?'
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation='Removing the "-" blank lets the two L runs touch, so merging after turns "LL-LL" into a single "L" → "HELO".'
            actionLabel='Test broken order on "HELLO" now'
            onAction={() => {
              setFramesText(CTC_PRESETS[0].framesText);
              setTargetWord('HELLO');
              setDropBlanksFirst(true);
              setActiveFormula('broken');
              playback.setStep(2);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function CtcAlignmentDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="CTC frame alignment & collapse playground"
      footer="Exact CTC symbol collapse and Graves (2006) dynamic-programming path counts over the blank-interleaved target sequence."
    >
      <CtcAlignmentPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
