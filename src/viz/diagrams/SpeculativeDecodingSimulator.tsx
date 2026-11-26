import { useEffect, useId, useMemo, useState } from 'react';
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
  analyzeSpeculativeDecoding,
  SPECULATIVE_SCENARIOS,
  type SpeculativeScenarioId,
} from '../lib/speculativeDecoding';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type SpecFormulaTab = 'expected' | 'accept' | 'speedup';

const FORMULA_LATEX: Record<SpecFormulaTab, string> = {
  expected: String.raw`\mathbb{E}[N] = \sum_{i=0}^{K} \alpha^i`,
  accept: String.raw`P(\text{accept } x_i) = \min\!\left(1,\, \frac{p(x_i)}{q(x_i)}\right)`,
  speedup: String.raw`\text{Speedup} = \frac{\mathbb{E}[N]\cdot T_{\text{target}}}{T_{\text{target}} + K\cdot T_{\text{draft}}}`,
};

const PREDICT_OPTIONS = [
  'No — speedup drops to 0.83× (slower than running the big model alone)',
  'Yes — guessing 5 tokens always gives 5× speedup',
  'It breaks even at exactly 1.00× speedup',
] as const;

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
      <span style={{ display: 'block', fontWeight: 700, color: t.textPrimary }}>{label}</span>
      <span style={{ display: 'block', fontSize: 14, color: t.textSecondary, marginBottom: 4 }}>{hint}</span>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 34,
          padding: '4px 8px',
          border: `1.5px solid ${t.border}`,
          borderRadius: RADIUS.sm,
          background: t.background,
          color: t.textPrimary,
          fontFamily: FONT_FAMILY,
          fontSize: 15,
          fontVariantNumeric: 'tabular-nums',
        }}
      />
    </label>
  );
}

function shortWord(tok: string, maxLen = 8): string {
  return tok.length > maxLen ? `${tok.slice(0, maxLen - 1)}…` : tok;
}

function SpeculativeDecodingPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipLeftId = useId();
  const clipRightId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [scenarioId, setScenarioId] = useState<SpeculativeScenarioId>('python');
  const [customDraftText, setCustomDraftText] = useState<string>(SPECULATIVE_SCENARIOS[1].draftText);
  const [draftHorizon, setDraftHorizon] = useState<number>(4);
  const [acceptanceAlpha, setAcceptanceAlpha] = useState<number>(0.75);
  const [draftLatencyMs, setDraftLatencyMs] = useState<number>(3);
  const [targetLatencyMs, setTargetLatencyMs] = useState<number>(30);
  const [checkRoll, setCheckRoll] = useState<number>(0.5);
  const [activeFormula, setActiveFormula] = useState<SpecFormulaTab>('speedup');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [jumpToEnd, setJumpToEnd] = useState(false);

  const analysis = useMemo(
    () =>
      analyzeSpeculativeDecoding({
        scenarioId,
        customDraftText,
        draftHorizon,
        acceptanceAlpha,
        draftLatencyMs,
        targetLatencyMs,
        checkRoll,
      }),
    [scenarioId, customDraftText, draftHorizon, acceptanceAlpha, draftLatencyMs, targetLatencyMs, checkRoll],
  );

  const playback = useStepPlayback(
    analysis.frames.length,
    1500,
    Math.max(0, analysis.frames.length - 1),
    outerVisible,
  );
  useEffect(() => {
    if (!jumpToEnd) return;
    playback.setStep(analysis.frames.length - 1);
    setJumpToEnd(false);
  }, [jumpToEnd, analysis.frames.length, playback]);
  const frame = analysis.frames[playback.step] ?? analysis.frames[analysis.frames.length - 1];

  const draftColor = t.accentPurple;
  const acceptColor = t.accentPrimary;
  const rejectColor = t.accentDanger;
  const curveColor = t.accentSecondary;
  const warnColor = t.accentWarn;

  const selectScenario = (nextId: SpeculativeScenarioId | ((curr: SpeculativeScenarioId) => SpeculativeScenarioId)) => {
    const val = typeof nextId === 'function' ? nextId(scenarioId) : nextId;
    setScenarioId(val);
    const preset = SPECULATIVE_SCENARIOS.find((s) => s.id === val);
    if (preset) {
      setCustomDraftText(preset.draftText);
      if (val === 'code') setAcceptanceAlpha(0.9);
      else if (val === 'python') setAcceptanceAlpha(0.75);
      else setAcceptanceAlpha(0.45);
    }
    setPrediction(null);
    playback.playFromStart();
  };

  const renderPipelinePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 246;
    const k = analysis.draftHorizon;
    const chipGap = 6;
    const chipW = Math.floor((plotW - 24 - (k - 1) * chipGap) / k);
    const isVerify = frame.phase === 'verify';

    const maxBarMs = Math.max(analysis.stepLatencyMs, analysis.actualBaselineMs, targetLatencyMs);
    const barMaxW = plotW - 140;
    const specBarW = Math.max(8, (analysis.stepLatencyMs / maxBarMs) * barMaxW);
    const baseBarW = Math.max(8, (analysis.actualBaselineMs / maxBarMs) * barMaxW);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Fast draft guesses → 1 big-model check
        </text>
        <defs>
          <clipPath id={`${clipLeftId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipLeftId}-${offsetX})`}>
          <text x={plotX + 12} y={plotY + 20} fontSize={14} fontWeight={700} fill={draftColor}>
            Draft model (q = confidence, {analysis.draftLatencyMs.toFixed(0)} ms each)
          </text>

          {analysis.tokens.map((tok, idx) => {
            const x = plotX + 12 + idx * (chipW + chipGap);
            const y = plotY + 28;
            const revealed = idx < frame.draftedCount;
            const active = !isVerify && idx === frame.activeDraftIndex;
            return (
              <g key={`draft-${idx}`} opacity={revealed ? 1 : 0.25}>
                <rect
                  x={x}
                  y={y}
                  width={chipW}
                  height={44}
                  rx={5}
                  fill={active ? `${draftColor}28` : t.surfaceAlt}
                  stroke={active ? draftColor : t.border}
                  strokeWidth={active ? 2 : 1.2}
                />
                <text x={x + chipW / 2} y={y + 20} textAnchor="middle" fontSize={14} fontWeight={700} fill={draftColor}>
                  {shortWord(tok.token, k >= 5 ? 5 : 7)}
                </text>
                <text x={x + chipW / 2} y={y + 37} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
                  q={tok.draftProb.toFixed(2)}
                </text>
              </g>
            );
          })}

          <line x1={plotX + plotW / 2} y1={plotY + 76} x2={plotX + plotW / 2} y2={plotY + 98} stroke={isVerify ? acceptColor : t.border} strokeWidth={2} />
          <text x={plotX + plotW / 2} y={plotY + 94} textAnchor="middle" fontSize={14} fontWeight={700} fill={isVerify ? acceptColor : t.textSecondary} stroke={t.background} strokeWidth={4} paintOrder="stroke">
            all {k} checked together in 1 pass ({analysis.targetLatencyMs.toFixed(0)} ms)
          </text>

          <text x={plotX + 12} y={plotY + 116} fontSize={14} fontWeight={700} fill={acceptColor}>
            Big target model (checks p / q ≥ {analysis.checkRoll.toFixed(2)} in parallel)
          </text>

          {analysis.tokens.map((tok, idx) => {
            const x = plotX + 12 + idx * (chipW + chipGap);
            const y = plotY + 124;
            const col =
              !isVerify
                ? t.textMuted
                : tok.status === 'accepted'
                  ? acceptColor
                  : tok.status === 'rejected'
                    ? rejectColor
                    : t.textMuted;
            const bg =
              !isVerify
                ? t.surfaceAlt
                : tok.status === 'accepted'
                  ? `${acceptColor}20`
                  : tok.status === 'rejected'
                    ? `${rejectColor}20`
                    : t.surfaceAlt;
            const topText = !isVerify
              ? '?'
              : tok.status === 'accepted'
                ? `✓ ${shortWord(tok.token, k >= 5 ? 4 : 6)}`
                : tok.status === 'rejected'
                  ? `✗→${shortWord(tok.correctionToken ?? 'alt', 4)}`
                  : 'drop';
            const subText = !isVerify ? 'waiting' : `p=${tok.targetProb.toFixed(2)}`;
            return (
              <g key={`verify-${idx}`} opacity={isVerify ? (tok.status === 'discarded' ? 0.45 : 1) : 0.35}>
                <rect x={x} y={y} width={chipW} height={44} rx={5} fill={bg} stroke={col} strokeWidth={isVerify ? 1.8 : 1} />
                <text x={x + chipW / 2} y={y + 20} textAnchor="middle" fontSize={14} fontWeight={700} fill={col}>
                  {topText}
                </text>
                <text x={x + chipW / 2} y={y + 37} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
                  {subText}
                </text>
              </g>
            );
          })}

          {/* Wall-clock comparison bars */}
          <text x={plotX + 12} y={plotY + 194} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Speculative ({analysis.stepLatencyMs.toFixed(0)} ms)
          </text>
          <rect x={plotX + 128} y={plotY + 180} width={specBarW} height={16} rx={3} fill={analysis.actualSpeedup >= 1 ? acceptColor : rejectColor} />

          <text x={plotX + 12} y={plotY + 220} fontSize={14} fill={t.textSecondary}>
            Normal {analysis.emittedTokens}× ({analysis.actualBaselineMs.toFixed(0)} ms)
          </text>
          <rect x={plotX + 128} y={plotY + 206} width={baseBarW} height={16} rx={3} fill={curveColor} fillOpacity={0.75} />

          <text x={plotX + 12} y={plotY + 240} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Emits {analysis.emittedTokens} word{analysis.emittedTokens === 1 ? '' : 's'} ({analysis.acceptedCount} draft + 1 target)
          </text>
        </g>
      </g>
    );
  };

  const renderCurvePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 246;
    const padL = 48;
    const padR = 16;
    const padT = 22;
    const padB = 38;
    const innerW = plotW - padL - padR;
    const innerH = plotH - padT - padB;

    const maxSpeedup = Math.max(3, Math.ceil(Math.max(...analysis.curve.map((c) => c.speedup)) * 1.15));
    const mapX = (kVal: number) => plotX + padL + ((kVal - 1) / 5) * innerW;
    const mapY = (s: number) => plotY + padT + innerH - (Math.min(maxSpeedup, s) / maxSpeedup) * innerH;
    const oneY = mapY(1);
    const activePt = analysis.curve.find((c) => c.k === analysis.draftHorizon) ?? analysis.curve[0];
    const ax = mapX(activePt.k);
    const ay = mapY(activePt.speedup);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Expected speedup across draft horizon K
        </text>
        <defs>
          <clipPath id={`${clipRightId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipRightId}-${offsetX})`}>
          {/* Axes */}
          <line x1={plotX + padL} y1={plotY + padT} x2={plotX + padL} y2={plotY + padT + innerH} stroke={t.border} strokeWidth={1.3} />
          <line x1={plotX + padL} y1={plotY + padT + innerH} x2={plotX + padL + innerW} y2={plotY + padT + innerH} stroke={t.border} strokeWidth={1.3} />

          {/* Break-even 1.0x line */}
          <line x1={plotX + padL} y1={oneY} x2={plotX + padL + innerW} y2={oneY} stroke={warnColor} strokeWidth={1.5} strokeDasharray="5 4" />
          <text x={plotX + padL + innerW - 2} y={oneY - 6} textAnchor="end" fontSize={14} fontWeight={700} fill={warnColor}>
            1.0× break-even
          </text>

          <text x={plotX + padL - 6} y={plotY + padT + 10} textAnchor="end" fontSize={14} fill={t.textMuted}>
            {maxSpeedup}×
          </text>
          <text x={plotX + padL - 6} y={plotY + padT + innerH + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
            0×
          </text>

          {analysis.curve.map((pt) => (
            <text key={`xt-${pt.k}`} x={mapX(pt.k)} y={plotY + padT + innerH + 18} textAnchor="middle" fontSize={14} fill={pt.k === analysis.draftHorizon ? curveColor : t.textMuted} fontWeight={pt.k === analysis.draftHorizon ? 700 : 400}>
              K={pt.k}
            </text>
          ))}
          <text x={plotX + padL + innerW / 2} y={plotY + plotH - 4} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            Draft horizon K (guesses per check)
          </text>

          <polyline
            points={analysis.curve.map((pt) => `${mapX(pt.k)},${mapY(pt.speedup)}`).join(' ')}
            fill="none"
            stroke={curveColor}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {analysis.curve.map((pt) => (
            <circle
              key={`pt-${pt.k}`}
              cx={mapX(pt.k)}
              cy={mapY(pt.speedup)}
              r={pt.k === analysis.draftHorizon ? 7 : 4.5}
              fill={pt.k === analysis.draftHorizon ? (pt.speedup >= 1 ? acceptColor : rejectColor) : curveColor}
              stroke={t.background}
              strokeWidth={1.5}
            />
          ))}
          <text
            x={activePt.k >= 5 ? ax - 10 : ax + 10}
            y={Math.max(plotY + padT + 16, ay - 10)}
            textAnchor={activePt.k >= 5 ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fill={activePt.speedup >= 1 ? acceptColor : rejectColor}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            {activePt.speedup.toFixed(2)}×
          </text>
        </g>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 280px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="A small guesser lets a giant model write several words in one trip"
                description="This solves the slow word-by-word wait of large models: a tiny fast model guesses K words ahead, and the big model verifies all K guesses in parallel in one memory read — with zero quality loss."
              />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
            <PillSelect<SpeculativeScenarioId>
              label="Text style (how predictable the next words are)"
              value={scenarioId}
              onChange={selectScenario}
              options={[
                { value: 'code', label: 'Code syntax' },
                { value: 'python', label: 'Standard Python' },
                { value: 'reasoning', label: 'Creative reasoning' },
              ]}
            />
            <label style={{ flex: '1 1 210px', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', fontWeight: 700, marginBottom: 4 }}>Draft guesses (type up to 6 words)</span>
              <input
                aria-label="Draft guesses"
                value={customDraftText}
                maxLength={60}
                onChange={(e) => {
                  setScenarioId('custom');
                  setCustomDraftText(e.target.value);
                  setPrediction(null);
                  playback.playFromStart();
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 34,
                  padding: '4px 8px',
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 15,
                }}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <Slider
                label="Draft horizon K (guesses)"
                value={draftHorizon}
                onChange={(v) => {
                  setDraftHorizon(v);
                  setPrediction(null);
                  playback.playFromStart();
                }}
                min={1}
                max={6}
                step={1}
              />
            </div>
            <div>
              <Slider
                label="Match rate α (agreement)"
                value={acceptanceAlpha}
                onChange={(v) => {
                  setAcceptanceAlpha(v);
                  setPrediction(null);
                }}
                min={0.1}
                max={1.0}
                step={0.05}
                format={(v) => v.toFixed(2)}
              />
            </div>
            <NumberField
              label="Draft step time (ms)"
              hint="Time for 1 small guess"
              value={draftLatencyMs}
              min={1}
              max={20}
              step={1}
              onChange={(v) => {
                setDraftLatencyMs(v);
                setPrediction(null);
              }}
            />
            <NumberField
              label="Target check time (ms)"
              hint="Time for 1 big check"
              value={targetLatencyMs}
              min={5}
              max={100}
              step={5}
              onChange={(v) => {
                setTargetLatencyMs(v);
                setPrediction(null);
              }}
            />
            <NumberField
              label="Random check roll r"
              hint="Accepts if r ≤ p / q"
              value={checkRoll}
              min={0.05}
              max={0.95}
              step={0.05}
              onChange={(v) => {
                setCheckRoll(v);
                setPrediction(null);
              }}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', fontSize: 15 }} aria-label="Speculative decoding colours">
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: draftColor, verticalAlign: 'middle', marginRight: 6 }} />Draft guesses (q)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: acceptColor, verticalAlign: 'middle', marginRight: 6 }} />Accepted by target</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: rejectColor, verticalAlign: 'middle', marginRight: 6 }} />First rejection (target fixes it)</span>
        <span><span style={{ display: 'inline-block', width: 18, height: 3, background: curveColor, verticalAlign: 'middle', marginRight: 6 }} />Expected speedup</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 295"
            role="img"
            aria-label={`Speculative decoding K=${analysis.draftHorizon}, alpha=${analysis.acceptanceAlpha.toFixed(2)}: ${analysis.expectedSpeedup.toFixed(2)}x expected speedup`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderPipelinePanel(0, 412)}
            {renderCurvePanel(420, 340)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 295" role="img" aria-label="Draft and target verify timeline" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderPipelinePanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 295" role="img" aria-label="Expected speedup curve" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCurvePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Wall-clock speedup" latex={FORMULA_LATEX.speedup} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Expected: <strong>{analysis.expectedTokensPerStep.toFixed(2)}</strong> words in <strong>{analysis.stepLatencyMs.toFixed(0)} ms</strong> = <strong>{analysis.expectedSpeedup.toFixed(2)}×</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${analysis.frames.length}`} color="blue" tilt={1} live>
            <p>{frame.summary}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Expected tokens per check"
              latex={FORMULA_LATEX.expected}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'expected'}
              onSelect={() => setActiveFormula('expected')}
            >
              <p style={{ textAlign: 'center' }}>α = match rate, K = draft guesses. The 1 is the guaranteed target word.</p>
            </StickyNote>
            <StickyNote
              title="2. Lossless accept rule"
              latex={FORMULA_LATEX.accept}
              color="pink"
              tilt={1}
              active={activeFormula === 'accept'}
              onSelect={() => setActiveFormula('accept')}
            >
              <p style={{ textAlign: 'center' }}>p = big-model prob, q = draft prob. Guarantees identical quality to the big model.</p>
            </StickyNote>
            <StickyNote
              title="3. Expected speedup"
              latex={FORMULA_LATEX.speedup}
              color="orange"
              tilt={-1}
              active={activeFormula === 'speedup'}
              onSelect={() => setActiveFormula('speedup')}
            >
              <p style={{ textAlign: 'center' }}>Faster than 1× only when α exceeds draft ÷ target time ({analysis.breakEvenAlpha.toFixed(2)}).</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · K = ${analysis.draftHorizon}, α = ${analysis.acceptanceAlpha.toFixed(2)}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Expected: E[N] = <strong>{analysis.expectedTokensPerStep.toFixed(2)}</strong> words × {analysis.targetLatencyMs.toFixed(0)} ms = {analysis.expectedBaselineMs.toFixed(1)} ms normal ÷ <strong>{analysis.stepLatencyMs.toFixed(1)} ms</strong> step = <strong>{analysis.expectedSpeedup.toFixed(2)}×</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                This run: kept {analysis.acceptedCount} + 1 target = <strong>{analysis.emittedTokens} words</strong> ({analysis.actualSpeedup.toFixed(2)}×)
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.frames.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{frame.summary}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="With T_target = 30 ms and T_draft = 3 ms, if agreement α drops to 0.20 while guessing K = 5 tokens, does speculative decoding still beat normal decoding?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="At α = 0.20, E[N] = 1.25 tokens (37.5 ms normal), while 5 drafts + 1 verify costs 45.0 ms — giving 37.5 ÷ 45.0 = 0.83× (slower!)."
            actionLabel="Run α = 0.20, K = 5 now"
            onAction={() => {
              setScenarioId('reasoning');
              setCustomDraftText(SPECULATIVE_SCENARIOS[2].draftText);
              setDraftHorizon(5);
              setAcceptanceAlpha(0.2);
              setDraftLatencyMs(3);
              setTargetLatencyMs(30);
              setActiveFormula('speedup');
              setJumpToEnd(true);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function SpeculativeDecodingSimulator({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Speculative Decoding simulator playground"
      footer="Expected tokens and speedup use the exact geometric acceptance sum from Leviathan et al. (2022); draft and target token probabilities are illustrative values scaled smoothly by the agreement rate."
    >
      <SpeculativeDecodingPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
