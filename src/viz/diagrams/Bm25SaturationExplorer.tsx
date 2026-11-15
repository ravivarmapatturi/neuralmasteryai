import { useState } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider } from '../primitives';
import {
  bm25Idf,
  bm25LengthNorm,
  bm25OneTermBreakdown,
  bm25TermFrequencySaturation,
} from '../lib/bm25';

type ViewMode = 'chart' | 'calculator';

export default function Bm25SaturationExplorer() {
  const t = useVizTokens();
  const [activeTab, setActiveTab] = useState<ViewMode>('calculator');

  // Saturation curve state
  const [chartK1, setChartK1] = useState<number>(1.2);

  // One-term calculator state (defaults match brief fixture: N=1000, df=100, avgdl=100, tf=3, docLength=100, k1=1.2, b=0.75)
  const N = 1000;
  const df = 100;
  const avgdl = 100;
  const [calcTf, setCalcTf] = useState<number>(3);
  const [calcDocLen, setCalcDocLen] = useState<number>(100);
  const [calcK1, setCalcK1] = useState<number>(1.2);
  const [calcB, setCalcB] = useState<number>(0.75);

  // Compute breakdown for one-term calculator
  const calcResult = bm25OneTermBreakdown(calcTf, calcDocLen, avgdl, df, N, calcK1, calcB);
  const lenNormB = bm25LengthNorm(calcDocLen, avgdl, calcB);

  // Saturation chart geometry
  const width = 560;
  const height = 220;
  const chartLeft = 45;
  const chartRight = width - 25;
  const chartTop = 25;
  const chartBottom = height - 35;
  const maxTf = 20;
  const maxScore = chartK1 + 1.5;

  const xFor = (v: number) => chartLeft + (v / maxTf) * (chartRight - chartLeft);
  const yForScore = (v: number) => chartBottom - (v / maxScore) * (chartBottom - chartTop);

  // Generate SVG path for BM25 saturation curve
  const curvePoints: string[] = [];
  for (let i = 0; i <= maxTf; i += 0.5) {
    const val = bm25TermFrequencySaturation(i, chartK1);
    curvePoints.push(`${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)},${yForScore(val).toFixed(1)}`);
  }
  const bm25Path = curvePoints.join(' ');

  // Generate SVG path for linear raw TF (scaled to pass through tf=1 with same initial value)
  const linearPoints: string[] = [];
  for (let i = 0; i <= maxTf; i += 1) {
    // Linear curve with slope = 1.0 (or matching tf)
    const val = i;
    const clampedY = Math.max(chartTop, yForScore(val));
    linearPoints.push(`${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)},${clampedY.toFixed(1)}`);
  }
  const linearPath = linearPoints.join(' ');

  const ceilingY = yForScore(chartK1 + 1);

  return (
    <VisualizationContainer
      title="Interactive BM25 Saturation & Calculator"
      footer={
        activeTab === 'calculator'
          ? `Fixed corpus: N=1,000 documents, query term df=100, avgdl=100 words. ` +
            `IDF variant: smoothed Robertson/Lucene ln(1 + (N - df + 0.5) / (df + 0.5)) = ${calcResult.idf.toFixed(3)}. ` +
            `At baseline (tf=3, |D|=100, k1=1.2, b=0.75), TF factor = ${calcResult.tfFactor.toFixed(3)} and score = ${calcResult.score.toFixed(3)}.`
          : `BM25 term-frequency saturation: (k1 + 1) * tf / (tf + k1). ` +
            `As tf grows large, the score contribution approaches an asymptote of k1 + 1 = ${(chartK1 + 1).toFixed(1)}. ` +
            `Linear raw TF grows without bound, allowing keyword stuffers to dominate results.`
      }
    >
      <VisualizationHeader
        eyebrow="Probabilistic Retrieval & Term Saturation"
        title="BM25 vs. TF-IDF: Saturation Curve & Score Calculator"
        description="Inspect how BM25 caps the marginal impact of repeated terms via k1, and how document-length normalization b penalizes verbose text."
      />

      {/* View Mode Toggle */}
      <div style={{ marginTop: SPACING.md, display: 'flex', gap: SPACING.sm }}>
        <button
          type="button"
          onClick={() => setActiveTab('calculator')}
          aria-pressed={activeTab === 'calculator'}
          style={{
            padding: `${SPACING.xs}px ${SPACING.md}px`,
            borderRadius: RADIUS.md,
            border: `1.5px solid ${activeTab === 'calculator' ? t.accentPrimary : t.border}`,
            backgroundColor: activeTab === 'calculator' ? t.surfaceAlt : t.surface,
            color: activeTab === 'calculator' ? t.accentPrimary : t.textPrimary,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: activeTab === 'calculator' ? 700 : 500,
            cursor: 'pointer',
          }}
        >
          1. One-Term BM25 Calculator
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chart')}
          aria-pressed={activeTab === 'chart'}
          style={{
            padding: `${SPACING.xs}px ${SPACING.md}px`,
            borderRadius: RADIUS.md,
            border: `1.5px solid ${activeTab === 'chart' ? t.accentPrimary : t.border}`,
            backgroundColor: activeTab === 'chart' ? t.surfaceAlt : t.surface,
            color: activeTab === 'chart' ? t.accentPrimary : t.textPrimary,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: activeTab === 'chart' ? 700 : 500,
            cursor: 'pointer',
          }}
        >
          2. TF vs. BM25 Saturation Chart
        </button>
      </div>

      {activeTab === 'calculator' ? (
        <div style={{ marginTop: SPACING.lg }}>
          {/* Preset Buttons */}
          <div style={{ marginBottom: SPACING.md }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: t.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: SPACING.xs,
              }}
            >
              Try Preset Scenarios:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.xs }}>
              <button
                type="button"
                onClick={() => {
                  setCalcTf(3);
                  setCalcDocLen(100);
                  setCalcK1(1.2);
                  setCalcB(0.75);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${calcTf === 3 && calcDocLen === 100 && calcB === 0.75 ? t.accentPrimary : t.border}`,
                  backgroundColor: t.surface,
                  color: t.textPrimary,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Baseline (tf=3, |D|=100)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCalcTf(30);
                  setCalcDocLen(100);
                  setCalcK1(1.2);
                  setCalcB(0.75);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${calcTf === 30 ? t.accentPrimary : t.border}`,
                  backgroundColor: t.surface,
                  color: t.textPrimary,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Keyword Saturation (tf=30)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCalcTf(3);
                  setCalcDocLen(500);
                  setCalcK1(1.2);
                  setCalcB(0.75);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${calcDocLen === 500 && calcB === 0.75 ? t.accentPrimary : t.border}`,
                  backgroundColor: t.surface,
                  color: t.textPrimary,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Long Document (|D|=500)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCalcTf(3);
                  setCalcDocLen(500);
                  setCalcK1(1.2);
                  setCalcB(0.0);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${calcB === 0.0 ? t.accentPrimary : t.border}`,
                  backgroundColor: t.surface,
                  color: t.textPrimary,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Disable Length Penalty (b=0)
              </button>
            </div>
          </div>

          {/* Sliders Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: SPACING.md,
              padding: SPACING.md,
              backgroundColor: t.surfaceAlt,
              borderRadius: RADIUS.md,
              border: `1px solid ${t.border}`,
            }}
          >
            <Slider
              label="Term Frequency (tf)"
              value={calcTf}
              onChange={setCalcTf}
              min={0}
              max={50}
              step={1}
              format={(v) => `${v} occurrences`}
            />
            <Slider
              label="Document Length (|D|)"
              value={calcDocLen}
              onChange={setCalcDocLen}
              min={10}
              max={500}
              step={10}
              format={(v) => `${v} words (avgdl=100)`}
            />
            <Slider
              label="TF Saturation (k1)"
              value={calcK1}
              onChange={setCalcK1}
              min={0.0}
              max={3.0}
              step={0.1}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Length Normalization (b)"
              value={calcB}
              onChange={setCalcB}
              min={0.0}
              max={1.0}
              step={0.05}
              format={(v) => v.toFixed(2)}
            />
          </div>

          {/* Computed Score Output Cards */}
          <div
            style={{
              marginTop: SPACING.lg,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: SPACING.sm,
            }}
          >
            <div
              style={{
                padding: SPACING.md,
                borderRadius: RADIUS.md,
                backgroundColor: t.surface,
                border: `1px solid ${t.border}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                Smoothed IDF
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, marginTop: 4 }}>
                {calcResult.idf.toFixed(3)}
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                ln(1 + 900.5 / 100.5)
              </div>
            </div>

            <div
              style={{
                padding: SPACING.md,
                borderRadius: RADIUS.md,
                backgroundColor: t.surface,
                border: `1px solid ${t.border}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                Length Factor B
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, marginTop: 4 }}>
                {lenNormB.toFixed(3)}
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                1 - b + b*(|D|/avgdl)
              </div>
            </div>

            <div
              style={{
                padding: SPACING.md,
                borderRadius: RADIUS.md,
                backgroundColor: t.surface,
                border: `1px solid ${t.border}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                TF Factor
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: t.accentPrimary, marginTop: 4 }}>
                {calcResult.tfFactor.toFixed(3)}
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                tf*(k1+1)/(tf+k1*B)
              </div>
            </div>

            <div
              style={{
                padding: SPACING.md,
                borderRadius: RADIUS.md,
                backgroundColor: t.surfaceAlt,
                border: `2px solid ${t.accentPrimary}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: t.accentPrimary, textTransform: 'uppercase', fontWeight: 700 }}>
                BM25 Term Score
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: t.accentPrimary, marginTop: 2 }}>
                {calcResult.score.toFixed(3)}
              </div>
              <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
                IDF &times; TF factor
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: SPACING.lg }}>
          {/* Chart Controls */}
          <div
            style={{
              padding: SPACING.md,
              backgroundColor: t.surfaceAlt,
              borderRadius: RADIUS.md,
              border: `1px solid ${t.border}`,
              marginBottom: SPACING.md,
            }}
          >
            <Slider
              label="Saturation Constant (k1)"
              value={chartK1}
              onChange={setChartK1}
              min={0.2}
              max={3.0}
              step={0.1}
              format={(v) => `${v.toFixed(1)} (Ceiling: ${(v + 1).toFixed(1)})`}
            />
          </div>

          {/* SVG Saturation Chart */}
          <div
            style={{
              backgroundColor: t.surface,
              borderRadius: RADIUS.md,
              border: `1px solid ${t.border}`,
              padding: SPACING.sm,
              overflowX: 'auto',
            }}
          >
            <svg
              width="100%"
              viewBox={`0 0 ${width} ${height}`}
              style={{ display: 'block', maxWidth: '100%' }}
              role="img"
              aria-label="BM25 term frequency saturation curve versus raw linear term frequency"
            >
              {/* Axes */}
              <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke={t.border} strokeWidth={1.5} />
              <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={t.border} strokeWidth={1.5} />

              {/* Grid Lines and Ticks */}
              {[0, 5, 10, 15, 20].map((tickTf) => (
                <g key={tickTf}>
                  <line
                    x1={xFor(tickTf)}
                    y1={chartBottom}
                    x2={xFor(tickTf)}
                    y2={chartBottom + 5}
                    stroke={t.border}
                    strokeWidth={1}
                  />
                  <text
                    x={xFor(tickTf)}
                    y={chartBottom + 18}
                    textAnchor="middle"
                    fontSize={11}
                    fill={t.textSecondary}
                  >
                    {tickTf}
                  </text>
                </g>
              ))}

              {/* Asymptote Ceiling Line */}
              <line
                x1={chartLeft}
                y1={ceilingY}
                x2={chartRight}
                y2={ceilingY}
                stroke={t.textMuted}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={chartRight}
                y={ceilingY - 5}
                textAnchor="end"
                fontSize={10}
                fill={t.textMuted}
                fontStyle="italic"
              >
                Asymptote ceiling: k1 + 1 = {(chartK1 + 1).toFixed(1)}
              </text>

              {/* Raw TF curve (Dashed gray/muted) */}
              <path
                d={linearPath}
                fill="none"
                stroke={t.textMuted}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />

              {/* BM25 Saturation curve (Solid accent) */}
              <path
                d={bm25Path}
                fill="none"
                stroke={t.accentPrimary}
                strokeWidth={2.5}
              />

              {/* Sample Points along BM25 curve */}
              {[1, 2, 5, 10, 20].map((sampleTf) => {
                const scoreVal = bm25TermFrequencySaturation(sampleTf, chartK1);
                return (
                  <circle
                    key={sampleTf}
                    cx={xFor(sampleTf)}
                    cy={yForScore(scoreVal)}
                    r={4}
                    fill={t.accentPrimary}
                  />
                );
              })}

              {/* Axis Labels */}
              <text
                x={chartLeft}
                y={chartTop - 8}
                fontSize={11}
                fill={t.textSecondary}
                fontWeight={600}
              >
                Score Contribution &uarr;
              </text>
              <text
                x={chartRight}
                y={chartBottom + 30}
                textAnchor="end"
                fontSize={11}
                fill={t.textSecondary}
                fontWeight={600}
              >
                Term Frequency (tf) &rarr;
              </text>
            </svg>
          </div>

          {/* Legend and Analysis */}
          <div
            style={{
              marginTop: SPACING.sm,
              display: 'flex',
              flexWrap: 'wrap',
              gap: SPACING.md,
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: t.textSecondary,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 3, backgroundColor: t.accentPrimary, display: 'inline-block' }} />
              <strong>BM25 Saturation:</strong> tf*(k1+1)/(tf+k1)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 2, borderTop: `2px dashed ${t.textMuted}`, display: 'inline-block' }} />
              <strong>Raw Linear TF:</strong> Unbounded growth
            </div>
          </div>
        </div>
      )}
    </VisualizationContainer>
  );
}
