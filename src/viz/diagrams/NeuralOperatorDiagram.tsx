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
  analyzeNeuralOperator,
  NEURAL_OP_TIMES,
  SHAPE_META,
  type InitialShapeKind,
} from '../lib/neuralOperator';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'The sharp corners stay crisp until t = 2.0',
  'The sharp corners round off immediately because high-frequency modes decay fastest',
  'The whole pulse drifts sideways across x',
] as const;

const SHAPE_LATEX: Record<InitialShapeKind, string> = {
  'double-bump': String.raw`\sigma = \sqrt{2\,D\,t},\quad K_\sigma(z) \propto e^{-z^2 / (2\sigma^2)}`,
  'single-bump': String.raw`\frac{\partial u}{\partial t} = D\,\frac{\partial^2 u}{\partial x^2},\quad u(\cdot,t)=\mathcal{G}_t(u_0)`,
  square: String.raw`\mathcal{G}(u_0) = \mathcal{F}^{-1}\!\big(R_\theta(k)\,\mathcal{F}(u_0)\big)`,
};

function NeuralOperatorPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipSpaceId = useId();
  const clipSpecId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [kind, setKind] = useState<InitialShapeKind>('double-bump');
  const [manualTime, setManualTime] = useState<number | null>(null);
  const [diffusivity, setDiffusivity] = useState<number>(0.3);
  const [gridCount, setGridCount] = useState<number>(40);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(NEURAL_OP_TIMES.length, 1950, 3, outerVisible);
  const time = manualTime ?? NEURAL_OP_TIMES[playback.step] ?? 1.8;

  const analysis = useMemo(
    () => analyzeNeuralOperator({ kind, time, diffusivity, gridCount }),
    [kind, time, diffusivity, gridCount],
  );

  const inputColor = t.accentPurple;
  const outputColor = t.accentPrimary;
  const kernelColor = t.accentSecondary;
  const stepRec = analysis.trace[playback.step] ?? analysis.trace[0];

  const selectTime = (nextT: number) => {
    playback.stop();
    setManualTime(Math.max(0, Math.min(6, Number(nextT.toFixed(2)))));
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

  const renderSpatialPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 46;
    const plotY = 36;
    const plotW = panelW - 62;
    const plotH = 198;
    const yMax = 1.4;

    const px = (x: number) => plotX + ((x + 5) / 10) * plotW;
    const py = (u: number) => plotY + plotH - (Math.max(0, Math.min(yMax, u)) / yMax) * (plotH - 12);

    const initPath = analysis.points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${px(pt.x).toFixed(1)},${py(pt.u0).toFixed(1)}`)
      .join(' ');
    const evolPath = analysis.points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${px(pt.x).toFixed(1)},${py(pt.ut).toFixed(1)}`)
      .join(' ');

    let peakPt = analysis.points[0];
    for (const pt of analysis.points) {
      if (pt.ut > peakPt.ut) peakPt = pt;
    }
    const pkX = px(peakPt.x);
    const pkY = py(peakPt.ut);
    const labelLeft = pkX > plotX + plotW - 115;
    const dotStride = analysis.points.length > 50 ? 2 : 1;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Input u₀(x) → Operator output u(x, t={analysis.time.toFixed(1)})
        </text>
        <defs>
          <clipPath id={`${clipSpaceId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} rx={4} />
        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[0, 0.5, 1.0].map((yt) => (
          <g key={`uy-${yt}`}>
            <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
            <text x={plotX - 8} y={py(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {yt.toFixed(1)}
            </text>
          </g>
        ))}

        {[-4, 0, 4].map((xt) => (
          <g key={`ux-${xt}`}>
            <line x1={px(xt)} y1={plotY + plotH} x2={px(xt)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(xt)} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {xt}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipSpaceId}-${offsetX})`}>
          <path d={initPath} fill="none" stroke={inputColor} strokeWidth={1.8} strokeDasharray="5 4" opacity={0.85} />
          <path d={evolPath} fill="none" stroke={outputColor} strokeWidth={2.5} strokeLinejoin="round" />

          {analysis.points.map((pt, idx) =>
            idx % dotStride === 0 ? (
              <circle
                key={`g-${idx}`}
                cx={px(pt.x)}
                cy={py(pt.ut)}
                r={2.5}
                fill={outputColor}
                opacity={0.75}
              />
            ) : null,
          )}

          <circle cx={pkX} cy={pkY} r={5.5} fill={kernelColor} stroke={t.background} strokeWidth={1.5} />
        </g>

        <text
          x={labelLeft ? pkX - 10 : pkX + 10}
          y={Math.max(plotY + 16, pkY - 8)}
          textAnchor={labelLeft ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fill={kernelColor}
          stroke={t.background}
          strokeWidth={4}
          paintOrder="stroke"
        >
          peak {peakPt.ut.toFixed(2)}
        </text>

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Position x ({analysis.gridCount} grid points, blur σ = {analysis.sigma.toFixed(2)})
        </text>
      </g>
    );
  };

  const renderSpectrumPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 46;
    const plotY = 36;
    const plotW = panelW - 58;
    const plotH = 198;
    const maxAmp = Math.max(0.75, ...analysis.modes.map((m) => m.initialAmp));
    const slotW = plotW / analysis.modes.length;
    const barW = Math.max(8, slotW * 0.56);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Fourier modes k (high modes damp fastest)
        </text>
        <defs>
          <clipPath id={`${clipSpecId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} rx={4} />
        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[0, 0.4, 0.8].map((yt) => {
          const yy = plotY + plotH - (yt / maxAmp) * (plotH - 14);
          return (
            <g key={`fy-${yt}`}>
              <line x1={plotX - 4} y1={yy} x2={plotX} y2={yy} stroke={t.border} />
              <text x={plotX - 8} y={yy + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
                {yt.toFixed(1)}
              </text>
            </g>
          );
        })}

        <g clipPath={`url(#${clipSpecId}-${offsetX})`}>
          {analysis.modes.map((m, idx) => {
            const bx = plotX + idx * slotW + (slotW - barW) / 2;
            const h0 = Math.max(3, (m.initialAmp / maxAmp) * (plotH - 14));
            const ht = Math.max(2, (m.evolvedAmp / maxAmp) * (plotH - 14));
            const y0 = plotY + plotH - h0;
            const yt = plotY + plotH - ht;

            return (
              <g key={`mode-${m.k}`}>
                <rect
                  x={bx}
                  y={y0}
                  width={barW}
                  height={h0}
                  rx={2}
                  fill="none"
                  stroke={inputColor}
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
                <rect
                  x={bx + 2}
                  y={yt}
                  width={Math.max(4, barW - 4)}
                  height={ht}
                  rx={2}
                  fill={outputColor}
                  fillOpacity={0.85}
                />
              </g>
            );
          })}
        </g>

        {analysis.modes.map((m, idx) => (
          <text
            key={`mk-${m.k}`}
            x={plotX + idx * slotW + slotW / 2}
            y={plotY + plotH + 20}
            textAnchor="middle"
            fontSize={14}
            fill={m.k >= 3 ? kernelColor : t.textPrimary}
          >
            k={m.k}
          </text>
        ))}

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          High modes (k ≥ 3): {analysis.highFreqRetainedPct.toFixed(0)}% remaining
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
                title="One learned operator maps any starting shape forward in time"
                description="A standard neural network only memorizes one fixed curve, so changing the starting shape forces retraining. A neural operator learns the physics rule itself, mapping any u₀(x) to u(x, t) across any grid resolution."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton
                onClick={() => {
                  setManualTime(null);
                  playback.toggle();
                }}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualTime(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualTime(null);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<InitialShapeKind>
                label="Starting condition u₀(x) (same operator runs all three)"
                value={kind}
                onChange={(val) => setKind(val)}
                options={[
                  { value: 'double-bump', label: 'Double bump' },
                  { value: 'single-bump', label: 'Single bump' },
                  { value: 'square', label: 'Square pulse' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<number>
                label="Mesh resolution Nₓ (points sampled)"
                value={gridCount}
                onChange={(val) => setGridCount(val)}
                options={[
                  { value: 20, label: '20 pts (coarse)' },
                  { value: 40, label: '40 pts (medium)' },
                  { value: 80, label: '80 pts (fine)' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 12, alignItems: 'end' }}>
            <Slider
              label="Diffusion time t (seconds)"
              value={analysis.time}
              onChange={(v) => selectTime(v)}
              min={0}
              max={6}
              step={0.1}
              format={(v) => `t = ${v.toFixed(1)}`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Exact time t (0–6)</span>
              <input
                aria-label="Exact diffusion time t"
                type="number"
                min={0}
                max={6}
                step={0.2}
                value={analysis.time}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) selectTime(v);
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Diffusivity D (0.05–1.0)</span>
              <input
                aria-label="Thermal diffusivity D"
                type="number"
                min={0.05}
                max={1.0}
                step={0.05}
                value={diffusivity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setDiffusivity(Math.max(0.05, Math.min(1.0, Number(v.toFixed(2)))));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Heat profile colours">
        <span>
          <span style={{ display: 'inline-block', width: 18, borderTop: `2.5px dashed ${inputColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Initial shape u₀(x) at t = 0
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 4, background: outputColor, verticalAlign: 'middle', marginRight: 6 }} />
          Operator output u(x, t) ({analysis.gridCount} pts)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: kernelColor, verticalAlign: 'middle', marginRight: 6 }} />
          Peak height ({analysis.evolvedPeak.toFixed(2)})
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 286"
            role="img"
            aria-label={`${SHAPE_META[kind].label} evolved to t=${analysis.time.toFixed(1)} with diffusivity D=${analysis.diffusivity.toFixed(2)}, peak ${analysis.evolvedPeak.toFixed(2)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderSpatialPanel(0, 444)}
            {renderSpectrumPanel(456, 304)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 286" role="img" aria-label="1D heat operator output curve" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderSpatialPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 286" role="img" aria-label="Fourier mode damping" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderSpectrumPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={`Operator · ${SHAPE_META[kind].label}`} latex={SHAPE_LATEX[kind]} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              t = {analysis.time.toFixed(1)} · σ = {analysis.sigma.toFixed(2)} · peak {analysis.initialPeak.toFixed(2)} → {analysis.evolvedPeak.toFixed(2)}
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length}`} color="blue" tilt={1} live>
            <p>{stepRec.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Double bump (kernel merge)"
              latex={SHAPE_LATEX['double-bump']}
              color="yellow"
              tilt={-1}
              active={kind === 'double-bump'}
              onSelect={() => setKind('double-bump')}
            >
              <p style={{ textAlign: 'center' }}>{SHAPE_META['double-bump'].shortDesc}</p>
            </StickyNote>
            <StickyNote
              title="Single bump (heat PDE)"
              latex={SHAPE_LATEX['single-bump']}
              color="pink"
              tilt={1}
              active={kind === 'single-bump'}
              onSelect={() => setKind('single-bump')}
            >
              <p style={{ textAlign: 'center' }}>{SHAPE_META['single-bump'].shortDesc}</p>
            </StickyNote>
            <StickyNote
              title="Square pulse (Fourier FNO)"
              latex={SHAPE_LATEX.square}
              color="orange"
              tilt={-1}
              active={kind === 'square'}
              onSelect={() => setKind('square')}
            >
              <p style={{ textAlign: 'center' }}>{SHAPE_META.square.shortDesc}</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · t = ${analysis.time.toFixed(1)}, D = ${analysis.diffusivity.toFixed(2)}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Kernel width σ = √(2 × {analysis.diffusivity.toFixed(2)} × {analysis.time.toFixed(1)}) = <strong>{analysis.sigma.toFixed(2)}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Peak: {analysis.initialPeak.toFixed(2)} → <strong>{analysis.evolvedPeak.toFixed(2)}</strong> · Center u(0) = <strong>{analysis.evolvedCenterVal.toFixed(2)}</strong> · High-mode k≥3 left: <strong>{analysis.highFreqRetainedPct.toFixed(0)}%</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.trace.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{manualTime !== null ? `At t = ${analysis.time.toFixed(1)} with D = ${analysis.diffusivity.toFixed(2)}, Gaussian kernel σ = ${analysis.sigma.toFixed(2)} blurs the ${SHAPE_META[kind].label.toLowerCase()} across ${analysis.gridCount} grid points (peak ${analysis.evolvedPeak.toFixed(2)}).` : stepRec.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Switch the starting shape to Square pulse (sharp 90° corners) and step forward just slightly to t = 0.2. What happens to those corners?"
            options={PREDICT_OPTIONS}
            correctIndex={1}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Sharp edges are made of high-frequency Fourier modes (k ≥ 3), which decay exponentially fastest under diffusion—rounding corners immediately."
            actionLabel="Test Square pulse at t = 0.2 now"
            onAction={() => {
              setKind('square');
              selectTime(0.2);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function NeuralOperatorDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="1D heat-equation neural operator playground"
      footer="Exact closed-form 1D heat equation convolution K_σ with width σ = √(2Dt) paired with its discrete Fourier spectrum. Click any initial shape or change grid count Nₓ without retraining."
    >
      <NeuralOperatorPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
