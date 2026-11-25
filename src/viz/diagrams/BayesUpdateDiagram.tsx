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
  analyzeBayesUpdate,
  BAYES_PRESETS,
  formatCount,
  type BayesOutcome,
} from '../lib/bayesUpdate';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'About 95% (matches the test accuracy)',
  'About 16% (healthy false alarms outnumber true catches)',
  'About 50% (an even toss-up)',
] as const;

type BayesFormulaTab = 'posterior' | 'counts' | 'evidence';

const FORMULA_LATEX: Record<BayesFormulaTab, string> = {
  posterior: String.raw`P(A \mid E) = \frac{P(E \mid A)\,P(A)}{P(E)}`,
  counts: String.raw`\begin{gathered} \text{TP} = N\,P(A)\,P(E\mid A) \\ \text{FP} = N\,P(\neg A)\,P(E\mid\neg A) \end{gathered}`,
  evidence: String.raw`P(E) = P(E\mid A)P(A) + P(E\mid\neg A)P(\neg A)`,
};

function BayesUpdatePlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipPoolId = useId();
  const clipBarsId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [prior, setPrior] = useState<number>(0.01);
  const [tpr, setTpr] = useState<number>(0.95);
  const [fpr, setFpr] = useState<number>(0.05);
  const [population, setPopulation] = useState<number>(1000);
  const [outcome, setOutcome] = useState<BayesOutcome>('positive');
  const [activeFormula, setActiveFormula] = useState<BayesFormulaTab>('posterior');
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(
    () => analyzeBayesUpdate({ prior, tpr, fpr, population, outcome }),
    [prior, tpr, fpr, population, outcome],
  );

  const playback = useStepPlayback(analysis.trace.length, 2200, 2, outerVisible);
  const activeStep = analysis.trace[playback.step] ?? analysis.trace[2];

  const trueHitColor = t.accentPrimary;
  const falseHitColor = t.accentDanger;
  const priorColor = t.accentPurple;
  const postColor = t.accentSecondary;

  const signSymbol = outcome === 'positive' ? '+' : '−';
  const signWord = outcome === 'positive' ? 'positive (+)' : 'negative (−)';

  const activePresetId =
    BAYES_PRESETS.find(
      (p) =>
        Math.abs(p.prior - prior) < 1e-4 &&
        Math.abs(p.tpr - tpr) < 1e-4 &&
        Math.abs(p.fpr - fpr) < 1e-4 &&
        p.population === population,
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

  const renderPoolPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 14;
    const plotY = 36;
    const plotW = panelW - 28;
    const plotH = 216;

    const totalBarW = plotW - 24;
    const barX = plotX + 12;
    const sickBarW = Math.max(12, Math.min(totalBarW - 24, totalBarW * analysis.prior));
    const healthyBarW = totalBarW - sickBarW;

    const poolSickW = Math.max(8, Math.min(totalBarW - 8, totalBarW * analysis.posterior1));
    const poolHealthyW = totalBarW - poolSickW;
    const halfBoxW = (totalBarW - 12) / 2;

    const showCounts = playback.step >= 1;
    const showPool = playback.step >= 2;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Out of {analysis.population.toLocaleString('en-US')} people, who tests {signWord}?
        </text>
        <defs>
          <clipPath id={`${clipPoolId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipPoolId}-${offsetX})`}>
          {/* Row 1: Base population split (Prior) */}
          <text x={barX} y={plotY + 20} fontSize={14} fontWeight={700} fill={priorColor}>
            Prior split: {formatCount(analysis.sickCount)} sick vs {formatCount(analysis.healthyCount)} healthy
          </text>
          <rect x={barX} y={plotY + 26} width={sickBarW} height={24} rx={3} fill={trueHitColor} fillOpacity={0.85} />
          <rect x={barX + sickBarW} y={plotY + 26} width={healthyBarW} height={24} rx={3} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1} />

          {/* Row 2: Counts getting this test result */}
          <g opacity={showCounts ? 1 : 0.3}>
            <rect
              x={barX}
              y={plotY + 68}
              width={halfBoxW}
              height={54}
              rx={5}
              fill={trueHitColor}
              fillOpacity={0.12}
              stroke={trueHitColor}
              strokeWidth={1.6}
            />
            <text x={barX + 10} y={plotY + 90} fontSize={14} fontWeight={700} fill={trueHitColor}>
              Sick &amp; {signSymbol}: {formatCount(analysis.conditionMatchCount)}
            </text>
            <text x={barX + 10} y={plotY + 111} fontSize={14} fill={t.textSecondary}>
              {(analysis.likelihoodCondition * 100).toFixed(1)}% of {formatCount(analysis.sickCount)}
            </text>

            <rect
              x={barX + halfBoxW + 12}
              y={plotY + 68}
              width={halfBoxW}
              height={54}
              rx={5}
              fill={falseHitColor}
              fillOpacity={0.12}
              stroke={falseHitColor}
              strokeWidth={1.6}
            />
            <text x={barX + halfBoxW + 22} y={plotY + 90} fontSize={14} fontWeight={700} fill={falseHitColor}>
              Healthy &amp; {signSymbol}: {formatCount(analysis.healthyMatchCount)}
            </text>
            <text x={barX + halfBoxW + 22} y={plotY + 111} fontSize={14} fill={t.textSecondary}>
              {(analysis.likelihoodHealthy * 100).toFixed(1)}% of {formatCount(analysis.healthyCount)}
            </text>
          </g>

          {/* Row 3: Zoom into the matching pool ONLY */}
          <g opacity={showPool ? 1 : 0.3}>
            <text x={barX} y={plotY + 148} fontSize={14} fontWeight={700} fill={postColor}>
              Keep only the {formatCount(analysis.totalMatchCount)} {signSymbol} tests:
            </text>
            <rect x={barX} y={plotY + 156} width={poolSickW} height={28} rx={3} fill={trueHitColor} fillOpacity={0.88} />
            <rect x={barX + poolSickW} y={plotY + 156} width={poolHealthyW} height={28} rx={3} fill={falseHitColor} fillOpacity={0.82} />
            <text x={barX} y={plotY + 203} fontSize={14} fontWeight={700} fill={trueHitColor}>
              {(analysis.posterior1 * 100).toFixed(1)}% sick
            </text>
            <text x={barX + totalBarW} y={plotY + 203} textAnchor="end" fontSize={14} fontWeight={700} fill={falseHitColor}>
              {((1 - analysis.posterior1) * 100).toFixed(1)}% healthy
            </text>
          </g>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {formatCount(analysis.conditionMatchCount)} ÷ {formatCount(analysis.totalMatchCount)} = {(analysis.posterior1 * 100).toFixed(2)}% posterior
        </text>
      </g>
    );
  };

  const renderBeliefBarsPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 16;
    const plotY = 36;
    const plotW = panelW - 32;
    const plotH = 216;
    const barW = plotW - 24;

    const rows = [
      {
        label: 'Prior belief (before test)',
        prob: analysis.prior,
        color: priorColor,
        activeAt: 0,
        revealed: true,
      },
      {
        label: `Posterior after 1st (${signSymbol})`,
        prob: analysis.posterior1,
        color: postColor,
        activeAt: 2,
        revealed: playback.step >= 2,
      },
      {
        label: `After 2nd (${signSymbol}) test`,
        prob: analysis.posterior2,
        color: trueHitColor,
        activeAt: 3,
        revealed: playback.step >= 3,
      },
      {
        label: `After 3rd (${signSymbol}) test`,
        prob: analysis.posterior3,
        color: t.accentTeal,
        activeAt: 3,
        revealed: playback.step >= 3,
      },
    ];

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. How evidence updates your belief
        </text>
        <defs>
          <clipPath id={`${clipBarsId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipBarsId}-${offsetX})`}>
          {rows.map((row, idx) => {
            const ry = plotY + 18 + idx * 50;
            const fillW = Math.max(4, row.prob * barW);
            const isHighlighted = playback.step === row.activeAt;
            return (
              <g key={row.label} opacity={row.revealed ? 1 : 0.35}>
                <text x={plotX + 12} y={ry + 6} fontSize={14} fontWeight={isHighlighted ? 700 : 600} fill={t.textPrimary}>
                  {row.label}
                </text>
                <text x={plotX + plotW - 12} y={ry + 6} textAnchor="end" fontSize={15} fontWeight={700} fill={row.color}>
                  {(row.prob * 100).toFixed(2)}%
                </text>
                <rect x={plotX + 12} y={ry + 14} width={barW} height={16} rx={4} fill={t.surfaceAlt} />
                <rect x={plotX + 12} y={ry + 14} width={fillW} height={16} rx={4} fill={row.color} fillOpacity={0.85} />
              </g>
            );
          })}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Each posterior becomes the next prior
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
                title="Why a 95%-accurate positive test can still be mostly false alarms"
                description="When a condition is rare, healthy people vastly outnumber sick people—so even a small false-alarm rate creates more false positives than true catches. Bayes' theorem updates your starting belief by comparing real counts in the test pool."
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
              <PillSelect<string>
                label="Case presets"
                value={activePresetId}
                onChange={(id) => {
                  const found = BAYES_PRESETS.find((p) => p.id === id);
                  if (found) {
                    setPrior(found.prior);
                    setTpr(found.tpr);
                    setFpr(found.fpr);
                    setPopulation(found.population);
                  }
                }}
                options={[
                  ...BAYES_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom rates' }] : []),
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<BayesOutcome>
                label="Observed test evidence E"
                value={outcome}
                onChange={(val) => setOutcome(val)}
                options={[
                  { value: 'positive', label: 'Test is positive (+)' },
                  { value: 'negative', label: 'Test is negative (−)' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12, alignItems: 'end' }}>
            <Slider
              label="Prior P(A): chance before testing"
              value={prior}
              onChange={(v) => setPrior(v)}
              min={0.001}
              max={0.5}
              step={0.001}
              format={(v) => `${(v * 100).toFixed(2)}%`}
            />
            <Slider
              label="Sensitivity P(+ | A): true catch rate"
              value={tpr}
              onChange={(v) => setTpr(v)}
              min={0.5}
              max={0.999}
              step={0.005}
              format={(v) => `${(v * 100).toFixed(1)}%`}
            />
            <Slider
              label="False alarm P(+ | not A): false positive rate"
              value={fpr}
              onChange={(v) => setFpr(v)}
              min={0.001}
              max={0.3}
              step={0.001}
              format={(v) => `${(v * 100).toFixed(1)}%`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>People tested (N)</span>
              <input
                aria-label="Population size N tested"
                type="number"
                min={100}
                max={100000}
                step={100}
                value={population}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setPopulation(Math.max(100, Math.min(100000, Math.round(v))));
                }}
                style={inputStyle}
              />
            </label>
          </div>

          <p aria-live="polite" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            Starting belief P(A) {(analysis.prior * 100).toFixed(2)}% → Posterior after 1 {signWord} test: {(analysis.posterior1 * 100).toFixed(2)}%
          </p>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Bayes diagram colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: priorColor, verticalAlign: 'middle', marginRight: 6 }} />
          Starting base rate P(A)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: trueHitColor, verticalAlign: 'middle', marginRight: 6 }} />
          Condition present in pool
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: falseHitColor, verticalAlign: 'middle', marginRight: 6 }} />
          Healthy in pool ({outcome === 'positive' ? 'false alarms' : 'true clears'})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: postColor, verticalAlign: 'middle', marginRight: 6 }} />
          Posterior belief P(A | E)
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 296"
            role="img"
            aria-label={`Prior ${(analysis.prior * 100).toFixed(2)}% updates to ${(analysis.posterior1 * 100).toFixed(2)}% after one ${signWord} result`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderPoolPanel(0, 404)}
            {renderBeliefBarsPanel(416, 344)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Population split and matching test pool" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderPoolPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Prior to posterior belief bars" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderBeliefBarsPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Bayes' theorem · Base rate → Posterior" latex={FORMULA_LATEX.posterior} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              {(analysis.prior * 100).toFixed(2)}% → <strong>{(analysis.posterior1 * 100).toFixed(2)}%</strong> ({formatCount(analysis.conditionMatchCount)} / {formatCount(analysis.totalMatchCount)})
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
              title="1. Bayes' update rule"
              latex={FORMULA_LATEX.posterior}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'posterior'}
              onSelect={() => setActiveFormula('posterior')}
            >
              <p style={{ textAlign: 'center' }}>Turns a starting belief P(A) into an updated posterior P(A | E) after evidence E.</p>
            </StickyNote>
            <StickyNote
              title="2. Natural counts (TP vs FP)"
              latex={FORMULA_LATEX.counts}
              color="pink"
              tilt={1}
              active={activeFormula === 'counts'}
              onSelect={() => setActiveFormula('counts')}
            >
              <p style={{ textAlign: 'center' }}>Splits N people into true matches from sick vs healthy people.</p>
            </StickyNote>
            <StickyNote
              title="3. Total evidence P(E)"
              latex={FORMULA_LATEX.evidence}
              color="orange"
              tilt={-1}
              active={activeFormula === 'evidence'}
              onSelect={() => setActiveFormula('evidence')}
            >
              <p style={{ textAlign: 'center' }}>Sums both ways of getting result E, forming the denominator.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · N = ${analysis.population.toLocaleString('en-US')}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Sick &amp; {signSymbol}: <strong>{formatCount(analysis.conditionMatchCount)}</strong> · Healthy &amp; {signSymbol}: <strong>{formatCount(analysis.healthyMatchCount)}</strong> · Total {signSymbol}: <strong>{formatCount(analysis.totalMatchCount)}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                P(A | {signSymbol}) = {formatCount(analysis.conditionMatchCount)} / {formatCount(analysis.totalMatchCount)} = <strong>{(analysis.posterior1 * 100).toFixed(2)}%</strong> · 2nd test: <strong>{(analysis.posterior2 * 100).toFixed(2)}%</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{activeStep.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Only 1% of 1,000 people have a disease. A test catches 95% of sick people and falsely flags 5% of healthy people. You test positive once — roughly what is your real chance of having it?"
            options={PREDICT_OPTIONS}
            correctIndex={1}
            selected={prediction}
            onSelect={setPrediction}
            explanation="5% of 990 healthy people gives 49.5 false alarms, while 95% of 10 sick people gives 9.5 catches — so 9.5 / 59.0 = 16.10%."
            actionLabel="Run 1% / 95% / 5% case now"
            onAction={() => {
              setPrior(0.01);
              setTpr(0.95);
              setFpr(0.05);
              setPopulation(1000);
              setOutcome('positive');
              playback.setStep(2);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function BayesUpdateDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Bayes belief updater playground"
      footer="Exact Bayes' theorem update computed over natural population frequencies N. Low base rates let small false-alarm rates outnumber true catches."
    >
      <BayesUpdatePlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
