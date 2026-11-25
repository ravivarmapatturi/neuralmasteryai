import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { SketchRect } from '../../components/notebook/RoughShape';
import { Slider, VisualizationContainer, useVizVisible } from '../primitives';
import {
  MAX_SCREENING_N,
  SCREENING_STAGES,
  explainScreeningStage,
  formatScreeningFormula,
  formatUsdCompact,
  generateLibraryWithHits,
  runScreeningFunnel,
  type ScreeningStage,
} from '../lib/screeningFunnel';
import {
  FormulaStrip,
  PlaygroundHeaderBar,
  PredictChallenge,
  StepCaptionStrip,
} from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const BASE_LIBRARY = generateLibraryWithHits(MAX_SCREENING_N);

const PREDICT_OPTIONS = [
  'Recall plunges (~40% vs 95%) — real hits get filtered out',
  'Recall rises to 100%',
  'Passed candidate count grows',
] as const;

function ScreeningFunnelPlayground({ outerVisible }: { outerVisible: boolean }) {
  const t = useVizTokens();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(700);

  const [librarySize, setLibrarySize] = useState(200_000);
  const [threshold, setThreshold] = useState(0.7);
  const [shortlistBudget, setShortlistBudget] = useState(20);
  const [assayCostUsd, setAssayCostUsd] = useState(2_500);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(SCREENING_STAGES.length, 2100, 3, outerVisible);
  const stage = playback.step as ScreeningStage;

  const res = useMemo(
    () => runScreeningFunnel({ librarySize, threshold, shortlistBudget, assayCostUsd }, BASE_LIBRARY),
    [librarySize, threshold, shortlistBudget, assayCostUsd],
  );

  const caption = explainScreeningStage(stage, res);
  const formula = formatScreeningFormula(stage, res);

  const renderHistogramPanel = (offsetX: number, panelW: number, panelH: number) => {
    const padL = offsetX + 42;
    const padR = offsetX + panelW - 12;
    const padT = 32;
    const padB = panelH - 42;
    const plotW = padR - padL;
    const plotH = padB - padT;
    const maxBin = Math.max(1, ...res.histogram.map((b) => b.totalCount));
    const colW = plotW / res.histogram.length;
    const cutX = padL + res.threshold * plotW;

    return (
      <g>
        <text x={padL} y={16} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          ML score spread (N = {res.librarySize.toLocaleString('en-US')})
        </text>
        <text x={offsetX + 4} y={29} fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Count ↑
        </text>
        <line x1={padL} y1={padT} x2={padL} y2={padB} stroke={t.border} strokeWidth={1.3} />
        <line x1={padL} y1={padB} x2={padR} y2={padB} stroke={t.border} strokeWidth={1.3} />

        {res.histogram.map((bin, idx) => {
          const bx = padL + idx * colW + 2;
          const bw = Math.max(8, colW - 4);
          const bh = Math.max(3, (bin.totalCount / maxBin) * plotH);
          const pass = bin.min >= res.threshold || bin.max > res.threshold;
          return (
            <rect
              key={idx}
              x={bx}
              y={padB - bh}
              width={bw}
              height={bh}
              rx={2}
              fill={pass ? t.accentSecondary : t.textMuted}
              opacity={pass ? 0.9 : 0.45}
            />
          );
        })}

        <line x1={cutX} y1={padT} x2={cutX} y2={padB} stroke={t.accentPrimary} strokeWidth={2.2} strokeDasharray="4 3" />
        <text
          x={Math.min(padR - 36, Math.max(padL + 36, cutX))}
          y={padT + 14}
          textAnchor="middle"
          fontSize={13.5}
          fontWeight={700}
          fontFamily="monospace"
          fill={t.accentPrimary}
        >
          τ={res.threshold.toFixed(2)}
        </text>

        {[0, 0.5, 1].map((tick) => (
          <text
            key={tick}
            x={padL + tick * plotW}
            y={padB + 17}
            textAnchor={tick === 0 ? 'start' : tick === 1 ? 'end' : 'middle'}
            fontSize={13.5}
            fontFamily={FONT_FAMILY}
            fill={t.textMuted}
          >
            {tick.toFixed(1)}
          </text>
        ))}
        <text x={(padL + padR) / 2} y={panelH - 6} textAnchor="middle" fontSize={13.5} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          ML property score (gray = dropped, blue = passed) →
        </text>
      </g>
    );
  };

  const renderFunnelPanel = (offsetX: number, panelW: number, panelH: number) => {
    const x0 = offsetX + 8;
    const barW = panelW - 16;
    const rows = [
      {
        stageIdx: 0,
        label: `1. Library: ${res.librarySize.toLocaleString('en-US')} (${res.totalTrueHits.toLocaleString('en-US')} hits)`,
        frac: 1,
        color: t.textMuted,
      },
      {
        stageIdx: 1,
        label: `2. ML pass ≥ ${res.threshold.toFixed(2)}: ${res.passedMl.toLocaleString('en-US')} (${res.recallPct.toFixed(1)}% recall)`,
        frac: res.passedMl / res.librarySize,
        color: t.accentSecondary,
      },
      {
        stageIdx: 2,
        label: `3. Top-${res.shortlistBudget} wet lab: ${res.shortlist} (${formatUsdCompact(res.mlFunnelCostUsd)})`,
        frac: Math.max(0.03, res.shortlist / res.librarySize),
        color: t.accentPrimary,
      },
      {
        stageIdx: 3,
        label: `4. True hits found: ${res.hitsInShortlist}/${res.shortlist} (${res.enrichmentFactor.toFixed(1)}× random)`,
        frac: res.shortlist > 0 ? res.hitsInShortlist / res.shortlist : 0,
        color: t.accentWarn,
      },
    ];

    return (
      <g>
        <text x={x0} y={16} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Funnel reduction &amp; yield (stage {stage + 1}/4)
        </text>
        {rows.map((r, i) => {
          const ry = 32 + i * 44;
          const active = stage === r.stageIdx;
          return (
            <g key={r.stageIdx} onClick={() => playback.setStep(r.stageIdx)} style={{ cursor: 'pointer' }}>
              {active && (
                <SketchRect
                  x={x0 - 4}
                  y={ry - 3}
                  width={barW + 8}
                  height={38}
                  color={r.color}
                  strokeWidth={1.8}
                  roughness={1}
                  id={`funnel-stage-${i}`}
                />
              )}
              <text x={x0 + 2} y={ry + 12} fontSize={13.5} fontWeight={active ? 700 : 500} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
                {r.label}
              </text>
              <rect x={x0 + 2} y={ry + 18} width={barW - 4} height={12} rx={3} fill={t.surfaceAlt} />
              <rect
                x={x0 + 2}
                y={ry + 18}
                width={Math.max(4, Math.min(1, r.frac) * (barW - 4))}
                height={12}
                rx={3}
                fill={r.color}
              />
            </g>
          );
        })}
        <text x={x0} y={panelH - 4} fontSize={13.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.accentPrimary}>
          Saved vs testing all {res.librarySize.toLocaleString('en-US')}: {formatUsdCompact(res.costSavedUsd)} ({res.savingsPct.toFixed(2)}%)
        </text>
      </g>
    );
  };

  return (
    <>
      <PlaygroundHeaderBar
        eyebrow="Live playground"
        title="Scientific screening funnel"
        description="Set the library size, ML property filter threshold τ, and wet-lab budget to see how fast ML pre-screening concentrates real hits and slashes cost."
        playing={playback.playing}
        onToggle={playback.toggle}
        onNext={playback.next}
        onReset={playback.reset}
      />

      {/* Row 1: Threshold slider + free numeric controls */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ flex: '1 1 200px', minWidth: 165 }}>
          <Slider
            label="ML property threshold τ"
            value={threshold}
            onChange={(v) => {
              playback.stop();
              setThreshold(v);
            }}
            min={0.05}
            max={0.98}
            step={0.01}
            format={(v) => v.toFixed(2)}
          />
        </div>
        <label htmlFor="sf-library-size" style={{ fontSize: 14, color: t.textSecondary }}>
          Library N:
          <input
            id="sf-library-size"
            type="number"
            min={500}
            max={MAX_SCREENING_N}
            step={1000}
            value={librarySize}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              playback.stop();
              setLibrarySize(Math.max(500, Math.min(MAX_SCREENING_N, Math.round(v))));
            }}
            style={{
              width: 82,
              marginLeft: 6,
              padding: '4px 6px',
              borderRadius: RADIUS.sm,
              border: `1px solid ${t.border}`,
              background: t.background,
              color: t.textPrimary,
              fontFamily: 'monospace',
              fontSize: 14,
            }}
          />
        </label>
        <label htmlFor="sf-wetlab-k" style={{ fontSize: 14, color: t.textSecondary }}>
          Wet-lab slots K:
          <input
            id="sf-wetlab-k"
            type="number"
            min={5}
            max={200}
            step={5}
            value={shortlistBudget}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              playback.stop();
              setShortlistBudget(Math.max(5, Math.min(200, Math.round(v))));
            }}
            style={{
              width: 60,
              marginLeft: 6,
              padding: '4px 6px',
              borderRadius: RADIUS.sm,
              border: `1px solid ${t.border}`,
              background: t.background,
              color: t.textPrimary,
              fontFamily: 'monospace',
              fontSize: 14,
            }}
          />
        </label>
        <label htmlFor="sf-assay-cost" style={{ fontSize: 14, color: t.textSecondary }}>
          Assay $/test:
          <input
            id="sf-assay-cost"
            type="number"
            min={100}
            max={50_000}
            step={100}
            value={assayCostUsd}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              playback.stop();
              setAssayCostUsd(Math.max(100, Math.min(50_000, Math.round(v))));
            }}
            style={{
              width: 72,
              marginLeft: 6,
              padding: '4px 6px',
              borderRadius: RADIUS.sm,
              border: `1px solid ${t.border}`,
              background: t.background,
              color: t.textPrimary,
              fontFamily: 'monospace',
              fontSize: 14,
            }}
          />
        </label>
      </div>

      {/* Stage pills + Live readout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SCREENING_STAGES.map((st) => {
            const active = stage === st.id;
            return (
              <button
                key={st.id}
                type="button"
                aria-pressed={active}
                onClick={() => playback.setStep(st.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${active ? t.accentPrimary : t.border}`,
                  background: active ? t.accentPrimary : 'transparent',
                  color: active ? t.background : t.textSecondary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {st.shortLabel}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 14, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
          Pass: <strong style={{ color: t.accentSecondary }}>{res.passedMl.toLocaleString('en-US')}</strong> ({res.passedPct.toFixed(2)}%) · Recall:{' '}
          <strong style={{ color: t.textPrimary }}>{res.recallPct.toFixed(1)}%</strong> · Enrichment:{' '}
          <strong style={{ color: t.accentPrimary }}>{res.enrichmentFactor.toFixed(1)}×</strong>
        </div>
      </div>

      <StepCaptionStrip caption={caption} accentColor={t.accentPrimary} />

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 700 232"
            role="img"
            aria-label={`Screening funnel: ${res.passedMl.toLocaleString('en-US')} of ${res.librarySize.toLocaleString('en-US')} candidates pass threshold ${res.threshold.toFixed(2)}, yielding ${res.hitsInShortlist} hits in top ${res.shortlist}`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            {renderHistogramPanel(0, 340, 232)}
            {renderFunnelPanel(354, 344, 232)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg
              width="100%"
              viewBox="0 0 340 212"
              role="img"
              aria-label="Long-tailed ML score distribution and cutoff line"
              style={{ display: 'block', overflow: 'visible' }}
            >
              {renderHistogramPanel(0, 340, 212)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 340 242"
              role="img"
              aria-label="Three-stage scientific screening funnel and wet-lab hit yield"
              style={{ display: 'block', overflow: 'visible' }}
            >
              {renderFunnelPanel(0, 340, 242)}
            </svg>
          </div>
        )}
      </div>

      <FormulaStrip general={formula.general} worked={formula.worked} />

      <PredictChallenge
        prompt="Raise threshold τ from 0.70 to 0.93 — what happens to the share of real hits surviving the ML filter (Recall)?"
        options={PREDICT_OPTIONS}
        correctIndex={0}
        selected={prediction}
        onSelect={setPrediction}
        explanation="Raising τ cuts more false positives, but it also rejects real active hits scoring 0.70–0.92, dropping recall from ~95% to ~40%."
        actionLabel="Test τ = 0.93 now"
        onAction={() => {
          playback.stop();
          setThreshold(0.93);
          playback.setStep(1);
        }}
      />
    </>
  );
}

export default function ScreeningFunnelDiagram() {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Scientific Screening Funnel Playground"
      footer="Deterministic long-tailed score library (up to 200,000 candidates with rare ~1.3% true actives). ML pre-screening concentrates true hits in the top-K wet-lab budget while showing the recall trade-off."
    >
      <ScreeningFunnelPlayground outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
