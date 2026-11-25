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
  analyzeCohensKappa,
  KAPPA_PRESETS,
} from '../lib/cohensKappa';
import type { ConfusionCounts } from '../lib/humanEval';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'κ collapses near 0.05 because both raters say Good ~92% of the time anyway',
  'κ stays near 0.86 because 86% raw agreement is high',
  'κ equals 1.0 because disagreements are balanced (7 vs 7)',
] as const;

type KappaFormulaTab = 'po' | 'pe' | 'kappa';

const FORMULA_LATEX: Record<KappaFormulaTab, string> = {
  po: String.raw`p_o = \frac{n_{\text{GG}} + n_{\text{BB}}}{N}`,
  pe: String.raw`p_e = p_{1\text{G}}\,p_{2\text{G}} + p_{1\text{B}}\,p_{2\text{B}}`,
  kappa: String.raw`\kappa = \frac{p_o - p_e}{1 - p_e}`,
};

function CountControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const t = useVizTokens();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Slider
        label={label}
        value={value}
        onChange={onChange}
        min={0}
        max={150}
        step={1}
      />
      <input
        aria-label={`Exact count: ${label}`}
        type="number"
        min={0}
        max={200}
        step={1}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(0, Math.min(200, Math.round(v))));
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 32,
          padding: '3px 7px',
          font: 'inherit',
          fontSize: 15,
          fontVariantNumeric: 'tabular-nums',
          border: `1.5px solid ${t.border}`,
          borderRadius: RADIUS.sm,
          background: t.background,
          color: t.textPrimary,
        }}
      />
    </div>
  );
}

function CohensKappaPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipMatrixId = useId();
  const clipGaugeId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [counts, setCounts] = useState<ConfusionCounts>(KAPPA_PRESETS[0].counts);
  const [activeFormula, setActiveFormula] = useState<KappaFormulaTab>('kappa');
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(() => analyzeCohensKappa(counts), [counts]);
  const playback = useStepPlayback(analysis.trace.length, 2200, 3, outerVisible);
  const activeStep = analysis.trace[playback.step] ?? analysis.trace[3];

  const agreeColor = t.accentPrimary;
  const disagreeColor = t.accentDanger;
  const rawColor = t.accentSecondary;
  const chanceColor = t.accentPurple;
  const warnColor = t.accentWarn;

  const updateCount = (key: keyof ConfusionCounts, val: number) => {
    setCounts((prev) => ({ ...prev, [key]: val }));
  };

  const activePresetId =
    KAPPA_PRESETS.find(
      (p) =>
        p.counts.bothGood === counts.bothGood &&
        p.counts.r1GoodR2Bad === counts.r1GoodR2Bad &&
        p.counts.r1BadR2Good === counts.r1BadR2Good &&
        p.counts.bothBad === counts.bothBad,
    )?.id ?? 'custom';

  const renderMatrixPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 224;

    const labelW = 78;
    const cellW = Math.floor((plotW - labelW - 84) / 2);
    const cellH = 56;
    const gridX = plotX + labelW;
    const gridY = plotY + 42;

    const step = playback.step;
    const showDiagHighlight = step === 0;
    const showMarginals = step >= 1;
    const showChanceCounts = step >= 2;

    const cells = [
      { r: 0, c: 0, val: analysis.counts.bothGood, chance: analysis.expectedBothGood, agree: true, title: 'Both Good' },
      { r: 0, c: 1, val: analysis.counts.r1GoodR2Bad, chance: null, agree: false, title: 'R1 Good / R2 Bad' },
      { r: 1, c: 0, val: analysis.counts.r1BadR2Good, chance: null, agree: false, title: 'R1 Bad / R2 Good' },
      { r: 1, c: 1, val: analysis.counts.bothBad, chance: analysis.expectedBothBad, agree: true, title: 'Both Bad' },
    ];

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. 2×2 Agreement table (N = {analysis.total})
        </text>
        <defs>
          <clipPath id={`${clipMatrixId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipMatrixId}-${offsetX})`}>
          {/* Column headings */}
          <text x={gridX + cellW} y={plotY + 18} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Rater 2 says
          </text>
          <text x={gridX + cellW / 2} y={plotY + 35} textAnchor="middle" fontSize={14} fontWeight={700} fill={agreeColor}>
            Good
          </text>
          <text x={gridX + cellW * 1.5} y={plotY + 35} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textSecondary}>
            Bad
          </text>
          <text x={gridX + cellW * 2 + 34} y={plotY + 35} textAnchor="middle" fontSize={14} fontWeight={700} fill={chanceColor}>
            Row sum
          </text>

          {/* Row headings */}
          <text x={plotX + 10} y={gridY + cellH - 4} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            R1 Good
          </text>
          <text x={plotX + 10} y={gridY + cellH * 1.65} fontSize={14} fontWeight={700} fill={t.textSecondary}>
            R1 Bad
          </text>

          {/* 2x2 Matrix cells */}
          {cells.map((cell) => {
            const x = gridX + cell.c * cellW;
            const y = gridY + cell.r * cellH;
            const col = cell.agree ? agreeColor : disagreeColor;
            const activeRing = showDiagHighlight && cell.agree;
            return (
              <g key={`${cell.r}-${cell.c}`}>
                <rect
                  x={x + 2}
                  y={y + 2}
                  width={cellW - 4}
                  height={cellH - 4}
                  rx={5}
                  fill={`${col}18`}
                  stroke={activeRing ? rawColor : col}
                  strokeWidth={activeRing ? 2.8 : 1.4}
                />
                <text x={x + cellW / 2} y={y + (showChanceCounts && cell.chance !== null ? 24 : 33)} textAnchor="middle" fontSize={16} fontWeight={700} fill={col}>
                  {cell.val}
                </text>
                {showChanceCounts && cell.chance !== null && (
                  <text x={x + cellW / 2} y={y + 44} textAnchor="middle" fontSize={14} fill={chanceColor}>
                    luck: {cell.chance.toFixed(1)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Marginal totals */}
          <g opacity={showMarginals ? 1 : 0.3}>
            <text x={gridX + cellW * 2 + 34} y={gridY + cellH / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={chanceColor}>
              {analysis.r1GoodCount} ({Math.round(analysis.r1GoodRate * 100)}%)
            </text>
            <text x={gridX + cellW * 2 + 34} y={gridY + cellH * 1.5 + 5} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
              {analysis.r1BadCount}
            </text>

            <text x={gridX + cellW / 2} y={gridY + cellH * 2 + 22} textAnchor="middle" fontSize={14} fontWeight={700} fill={chanceColor}>
              {analysis.r2GoodCount} ({Math.round(analysis.r2GoodRate * 100)}%)
            </text>
            <text x={gridX + cellW * 1.5} y={gridY + cellH * 2 + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
              {analysis.r2BadCount}
            </text>
          </g>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Green diagonal = raw matches ({analysis.agreeCount}/{analysis.total})
        </text>
      </g>
    );
  };

  const renderGaugePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 224;
    const barW = plotW - 24;

    const kappaColor = analysis.kappa >= 0.6 ? agreeColor : analysis.kappa >= 0.2 ? warnColor : disagreeColor;
    // Map kappa in [-1, 1] -> [0, barW]
    const kappaFrac = Math.max(0, Math.min(1, (analysis.kappa + 1) / 2));
    const kappaZeroX = plotX + 12 + barW * 0.5;
    const kappaDotX = plotX + 12 + kappaFrac * barW;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Raw agreement vs. lucky overlap vs. κ
        </text>
        <defs>
          <clipPath id={`${clipGaugeId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipGaugeId}-${offsetX})`}>
          {/* Row 1: Raw agreement p_o */}
          <text x={plotX + 12} y={plotY + 24} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Raw agreement (p₀)
          </text>
          <text x={plotX + plotW - 12} y={plotY + 24} textAnchor="end" fontSize={14} fontWeight={700} fill={rawColor}>
            {(analysis.observedAgreement * 100).toFixed(1)}%
          </text>
          <rect x={plotX + 12} y={plotY + 32} width={barW} height={14} rx={3} fill={t.surfaceAlt} />
          <rect x={plotX + 12} y={plotY + 32} width={Math.max(4, analysis.observedAgreement * barW)} height={14} rx={3} fill={rawColor} fillOpacity={0.85} />

          {/* Row 2: Chance agreement p_e */}
          <text x={plotX + 12} y={plotY + 74} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Expected by chance (pₑ)
          </text>
          <text x={plotX + plotW - 12} y={plotY + 74} textAnchor="end" fontSize={14} fontWeight={700} fill={chanceColor}>
            {(analysis.expectedAgreement * 100).toFixed(1)}%
          </text>
          <rect x={plotX + 12} y={plotY + 82} width={barW} height={14} rx={3} fill={t.surfaceAlt} />
          <rect x={plotX + 12} y={plotY + 82} width={Math.max(4, analysis.expectedAgreement * barW)} height={14} rx={3} fill={chanceColor} fillOpacity={0.85} />

          {/* Row 3: Cohen's kappa scale from -1 to +1 */}
          <text x={plotX + 12} y={plotY + 128} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Cohen’s κ
          </text>
          <text x={plotX + plotW - 12} y={plotY + 128} textAnchor="end" fontSize={15} fontWeight={700} fill={kappaColor}>
            {analysis.kappa.toFixed(3)} ({analysis.band})
          </text>

          {/* Scale track */}
          <line x1={plotX + 12} y1={plotY + 154} x2={plotX + 12 + barW} y2={plotY + 154} stroke={t.border} strokeWidth={3} />
          <line x1={kappaZeroX} y1={plotY + 144} x2={kappaZeroX} y2={plotY + 164} stroke={t.textMuted} strokeWidth={1.5} />
          <line
            x1={kappaZeroX}
            y1={plotY + 154}
            x2={kappaDotX}
            y2={plotY + 154}
            stroke={kappaColor}
            strokeWidth={6}
          />
          <circle cx={kappaDotX} cy={plotY + 154} r={7} fill={kappaColor} stroke={t.background} strokeWidth={1.8} />

          {/* Scale ticks */}
          {[
            { val: -1, label: '−1' },
            { val: 0, label: '0 (luck)' },
            { val: 0.6, label: '0.6' },
            { val: 1, label: '+1' },
          ].map((tick) => {
            const tx = plotX + 12 + ((tick.val + 1) / 2) * barW;
            const anchor = tick.val === -1 ? 'start' : tick.val === 1 ? 'end' : 'middle';
            return (
              <text key={tick.val} x={tx} y={plotY + 184} textAnchor={anchor} fontSize={14} fill={t.textSecondary}>
                {tick.label}
              </text>
            );
          })}

          <text x={plotX + plotW / 2} y={plotY + 210} textAnchor="middle" fontSize={14} fontWeight={700} fill={kappaColor}>
            Gain over luck: {(analysis.liftAboveChance * 100).toFixed(1)} pp / {(analysis.maxLiftPossible * 100).toFixed(1)} pp room
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Need κ ≥ 0.60 before trusting human eval labels
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
                title="Why raw agreement tricks you when raters say 'Good' most of the time"
                description="If two human graders mark almost everything 'Good', they will match by pure luck even when flipping coins on the tricky cases. Adjust the four counts below to watch Cohen's κ strip away chance overlap."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ marginBottom: -4 }}>
            <PillSelect<string>
              label="Preset grading scenarios"
              value={activePresetId}
              onChange={(id) => {
                const preset = KAPPA_PRESETS.find((p) => p.id === id);
                if (preset) {
                  setCounts(preset.counts);
                  setPrediction(null);
                }
              }}
              options={[
                ...KAPPA_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom counts' }] : []),
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 12 }}>
            <CountControl label="Both say Good" value={counts.bothGood} onChange={(v) => updateCount('bothGood', v)} />
            <CountControl label="R1 Good, R2 Bad" value={counts.r1GoodR2Bad} onChange={(v) => updateCount('r1GoodR2Bad', v)} />
            <CountControl label="R1 Bad, R2 Good" value={counts.r1BadR2Good} onChange={(v) => updateCount('r1BadR2Good', v)} />
            <CountControl label="Both say Bad" value={counts.bothBad} onChange={(v) => updateCount('bothBad', v)} />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Agreement colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: agreeColor, verticalAlign: 'middle', marginRight: 6 }} />
          Agreement cells
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: disagreeColor, verticalAlign: 'middle', marginRight: 6 }} />
          Disagreement cells
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: rawColor, verticalAlign: 'middle', marginRight: 6 }} />
          Raw agreement p₀
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: chanceColor, verticalAlign: 'middle', marginRight: 6 }} />
          Chance overlap pₑ
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 292"
            role="img"
            aria-label={`Cohen's kappa confusion matrix: raw agreement ${(analysis.observedAgreement * 100).toFixed(1)}%, chance ${(analysis.expectedAgreement * 100).toFixed(1)}%, kappa ${analysis.kappa.toFixed(3)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderMatrixPanel(0, 396)}
            {renderGaugePanel(404, 356)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 292" role="img" aria-label="2x2 rater agreement table" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderMatrixPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 292" role="img" aria-label="Raw agreement vs chance vs Cohen's kappa" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderGaugePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Cohen’s κ (chance-corrected)" latex={FORMULA_LATEX.kappa} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Raw: <strong>{(analysis.observedAgreement * 100).toFixed(1)}%</strong> · Luck: <strong>{(analysis.expectedAgreement * 100).toFixed(1)}%</strong> → κ = <strong>{analysis.kappa.toFixed(3)}</strong>
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
              title="1. Observed agreement p₀"
              latex={FORMULA_LATEX.po}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'po'}
              onSelect={() => {
                setActiveFormula('po');
                playback.setStep(0);
              }}
            >
              <p style={{ textAlign: 'center' }}>Share of all N items where both raters gave the same label.</p>
            </StickyNote>
            <StickyNote
              title="2. Chance overlap pₑ"
              latex={FORMULA_LATEX.pe}
              color="pink"
              tilt={1}
              active={activeFormula === 'pe'}
              onSelect={() => {
                setActiveFormula('pe');
                playback.setStep(2);
              }}
            >
              <p style={{ textAlign: 'center' }}>How often independent guessing matches at each rater's Good/Bad rate.</p>
            </StickyNote>
            <StickyNote
              title="3. Cohen's κ"
              latex={FORMULA_LATEX.kappa}
              color="orange"
              tilt={-1}
              active={activeFormula === 'kappa'}
              onSelect={() => {
                setActiveFormula('kappa');
                playback.setStep(3);
              }}
            >
              <p style={{ textAlign: 'center' }}>How much of the room above luck (1 − pₑ) the raters actually achieved.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · N = ${analysis.total}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                p₀ = ({analysis.counts.bothGood} + {analysis.counts.bothBad}) / {analysis.total} = <strong>{analysis.observedAgreement.toFixed(3)}</strong> · pₑ = <strong>{analysis.expectedAgreement.toFixed(3)}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                κ = ({analysis.observedAgreement.toFixed(3)} − {analysis.expectedAgreement.toFixed(3)}) / (1 − {analysis.expectedAgreement.toFixed(3)}) = <strong>{analysis.kappa.toFixed(3)}</strong> ({analysis.band})
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{activeStep.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Out of 100 answers, both raters mark Good on 85, disagree on 14 (7 + 7), and both mark Bad on 1. Raw agreement is 86%. What happens to Cohen's κ?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Both raters mark Good 92% of the time, so independent guessing already agrees 85.3% of the time—leaving κ = 0.049 (slight)."
            actionLabel="Load 85 / 7 / 7 / 1 trap now"
            onAction={() => {
              setCounts({ bothGood: 85, r1GoodR2Bad: 7, r1BadR2Good: 7, bothBad: 1 });
              setActiveFormula('kappa');
              playback.setStep(3);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function CohensKappaDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Cohen's kappa inter-rater agreement playground"
      footer="Exact 2×2 Cohen's κ calculation comparing observed agreement p₀ against marginal chance agreement pₑ."
    >
      <CohensKappaPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
