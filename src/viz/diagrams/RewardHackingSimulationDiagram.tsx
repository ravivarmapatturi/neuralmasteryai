import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  usePrefersReducedMotion,
  useVizVisible,
} from '../primitives';
import {
  CANDIDATE_LENGTHS,
  TOTAL_OPT_STEPS,
  explainRewardStep,
  proxyAtLength,
  qualityAtLength,
  simulateRewardHacking,
} from '../lib/rewardHacking';

type ScenarioId = 'hacker' | 'tethered' | 'unbiased';

const SCENARIO_OPTIONS: { value: ScenarioId; label: string }[] = [
  { value: 'hacker', label: 'Length hacker' },
  { value: 'tethered', label: 'KL-tethered' },
  { value: 'unbiased', label: 'Unbiased judge' },
];

const PREDICT_OPTIONS = [
  'Stays high (~8.7/10) — KL stops padding',
  'Collapses near 0/10 anyway',
  'Proxy reward doubles to 28',
] as const;

function RewardHackingPlayground({ compact = false, outerVisible = true }: { compact?: boolean; outerVisible?: boolean }) {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const innerVisible = useVizVisible();
  const visible = outerVisible && innerVisible;

  const hostRef = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(760);
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 760;
      if (w > 0) setHostWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const isCompactPhone = hostWidth < 540;

  const [lengthBias, setLengthBias] = useState(1.6);
  const [klFloor, setKlFloor] = useState(0.25);
  const [idealLength, setIdealLength] = useState(150);
  const [prediction, setPrediction] = useState<number | null>(null);

  const sim = useMemo(
    () => simulateRewardHacking({ lengthBias, klFloor, idealLength }),
    [lengthBias, klFloor, idealLength],
  );

  const totalSteps = sim.trace.length;
  const [step, setStep] = useState(() => (reducedMotion ? TOTAL_OPT_STEPS : 0));
  const [playing, setPlaying] = useState(() => !reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setPlaying(false);
      setStep(TOTAL_OPT_STEPS);
    }
  }, [reducedMotion]);

  useEffect(() => {
    if (!playing || !visible || reducedMotion || totalSteps < 2) return undefined;
    const id = window.setTimeout(() => {
      setStep((curr) => (curr + 1) % totalSteps);
    }, 750);
    return () => window.clearTimeout(id);
  }, [playing, visible, reducedMotion, totalSteps, step]);

  const safeStep = Math.min(step, totalSteps - 1);
  const current = sim.trace[safeStep];
  const prev = safeStep > 0 ? sim.trace[safeStep - 1] : undefined;

  const activeScenario: ScenarioId =
    lengthBias < 0.05 ? 'unbiased' : klFloor >= 1.5 ? 'tethered' : 'hacker';

  const applyScenario = (nextId: ScenarioId | ((p: ScenarioId) => ScenarioId)) => {
    const id = typeof nextId === 'function' ? nextId(activeScenario) : nextId;
    if (id === 'unbiased') {
      setLengthBias(0);
      setKlFloor(0.25);
    } else if (id === 'tethered') {
      setLengthBias(1.6);
      setKlFloor(2.0);
    } else {
      setLengthBias(1.6);
      setKlFloor(0.25);
    }
    setStep(0);
    setPlaying(!reducedMotion);
  };

  // One distinct colour per series EVERYWHERE (never mix up or use two close reds/oranges)
  const proxyColor = t.accentDanger;
  const qualityColor = t.accentPrimary;
  const gapColor = t.accentPurple;
  const distColor = t.accentSecondary;

  const caption = explainRewardStep(current, { lengthBias, klFloor, idealLength }, prev);
  const avgLengthRounded = Math.round(current.expectedLength);
  const biasBonusPts = lengthBias * (avgLengthRounded / 100);
  const betaDisplay = Number.isFinite(current.effectiveBeta) ? current.effectiveBeta.toFixed(2) : '∞';

  // Shared Y scale across BOTH top plots so identical values sit at identical heights
  const sharedMaxY = Math.ceil(Math.max(15, ...sim.proxyCurve, ...sim.trace.map((r) => r.expectedProxyReward)) / 5) * 5;
  const yTicks = Array.from({ length: Math.floor(sharedMaxY / 5) + 1 }, (_, i) => i * 5);

  const renderCurvePanel = (offsetX: number, panelW: number, panelH: number) => {
    const padL = offsetX + 46;
    const padR = offsetX + panelW - 14;
    const padT = 34;
    const padB = panelH - 46;
    const sx = scaleLinear().domain([40, 900]).range([padL, padR]);
    const sy = scaleLinear().domain([0, sharedMaxY]).range([padB, padT]);

    const truePts = sim.curveLengths.map((L, i) => `${sx(L)},${sy(sim.trueCurve[i])}`).join(' ');
    const proxyPts = sim.curveLengths.map((L, i) => `${sx(L)},${sy(sim.proxyCurve[i])}`).join(' ');
    const curL = current.expectedLength;
    const curQCurve = qualityAtLength(curL, idealLength);
    const curRCurve = proxyAtLength(curL, lengthBias, idealLength);
    const clipId = `rh-curve-clip-${offsetX}-${panelW}`;
    const onRightHalf = sx(curL) > (padL + padR) / 2;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT} width={padR - padL} height={padB - padT} />
          </clipPath>
        </defs>
        <text x={padL} y={20} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Score vs. response length
        </text>
        <text x={offsetX + 6} y={padT + 10} fontSize={14} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Score ↑
        </text>

        <rect x={padL} y={padT} width={padR - padL} height={padB - padT} fill={t.background} rx={4} />
        <line x1={padL} y1={padT} x2={padL} y2={padB} stroke={t.border} strokeWidth={1.3} />
        <line x1={padL} y1={padB} x2={padR} y2={padB} stroke={t.border} strokeWidth={1.3} />

        {yTicks.map((tick) => (
          <text key={`yt-${tick}`} x={padL - 6} y={sy(tick) + 5} textAnchor="end" fontSize={14} fontFamily={FONT_FAMILY} fill={t.textMuted}>
            {tick}
          </text>
        ))}
        {[100, 300, 500, 700, 900].map((tick) => (
          <text key={`xt-${tick}`} x={sx(tick)} y={padB + 18} textAnchor="middle" fontSize={14} fontFamily={FONT_FAMILY} fill={t.textMuted}>
            {tick}
          </text>
        ))}
        <text x={(padL + padR) / 2} y={panelH - 6} textAnchor="middle" fontSize={14} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Answer length (words) →
        </text>

        <g clipPath={`url(#${clipId})`}>
          <polyline points={truePts} fill="none" stroke={qualityColor} strokeWidth={2.4} strokeDasharray="6 3" />
          <polyline points={proxyPts} fill="none" stroke={proxyColor} strokeWidth={2.6} />
          <line x1={sx(curL)} y1={padT} x2={sx(curL)} y2={padB} stroke={gapColor} strokeWidth={1.8} strokeDasharray="3 3" />
        </g>

        <circle cx={sx(curL)} cy={sy(curRCurve)} r={4.5} fill={proxyColor} stroke={t.background} strokeWidth={1.3} />
        <circle cx={sx(curL)} cy={sy(curQCurve)} r={4.5} fill={qualityColor} stroke={t.background} strokeWidth={1.3} />
        <text
          x={onRightHalf ? sx(curL) - 8 : sx(curL) + 8}
          y={padT + 16}
          textAnchor={onRightHalf ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fontFamily="monospace"
          fill={gapColor}
        >
          Avg L = {avgLengthRounded}w
        </text>
      </g>
    );
  };

  const renderTrajectoryPanel = (offsetX: number, panelW: number, panelH: number) => {
    const padL = offsetX + 46;
    const padR = offsetX + panelW - 14;
    const padT = 34;
    const padB = panelH - 46;
    const sx = scaleLinear().domain([0, TOTAL_OPT_STEPS]).range([padL, padR]);
    const sy = scaleLinear().domain([0, sharedMaxY]).range([padB, padT]);

    const visibleTrace = sim.trace.slice(0, safeStep + 1);
    const truePath = visibleTrace.map((r) => `${sx(r.step)},${sy(r.expectedTrueQuality)}`).join(' ');
    const proxyPath = visibleTrace.map((r) => `${sx(r.step)},${sy(r.expectedProxyReward)}`).join(' ');
    const cx = sx(current.step);
    const cyQ = sy(current.expectedTrueQuality);
    const cyR = sy(current.expectedProxyReward);
    const clipId = `rh-traj-clip-${offsetX}-${panelW}`;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT} width={padR - padL} height={padB - padT} />
          </clipPath>
        </defs>
        <text x={padL} y={20} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Overoptimization over steps (Gao et al. 2022)
        </text>
        <text x={offsetX + 6} y={padT + 10} fontSize={14} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Score ↑
        </text>

        <rect x={padL} y={padT} width={padR - padL} height={padB - padT} fill={t.background} rx={4} />
        <line x1={padL} y1={padT} x2={padL} y2={padB} stroke={t.border} strokeWidth={1.3} />
        <line x1={padL} y1={padB} x2={padR} y2={padB} stroke={t.border} strokeWidth={1.3} />

        {yTicks.map((tick) => (
          <text key={`ty-${tick}`} x={padL - 6} y={sy(tick) + 5} textAnchor="end" fontSize={14} fontFamily={FONT_FAMILY} fill={t.textMuted}>
            {tick}
          </text>
        ))}
        {[0, 2, 4, 6, 8, 10].map((tick) => (
          <text key={`tx-${tick}`} x={sx(tick)} y={padB + 18} textAnchor="middle" fontSize={14} fontFamily={FONT_FAMILY} fill={t.textMuted}>
            {tick}
          </text>
        ))}
        <text x={(padL + padR) / 2} y={panelH - 6} textAnchor="middle" fontSize={14} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Training step (KL drift increases →)
        </text>

        <g clipPath={`url(#${clipId})`}>
          {visibleTrace.length > 1 && (
            <>
              <polyline points={truePath} fill="none" stroke={qualityColor} strokeWidth={2.4} strokeDasharray="6 3" />
              <polyline points={proxyPath} fill="none" stroke={proxyColor} strokeWidth={2.6} />
            </>
          )}
          {current.hackingGap > 1.5 && (
            <line x1={cx} y1={cyR} x2={cx} y2={cyQ} stroke={gapColor} strokeWidth={2} strokeDasharray="3 3" />
          )}
        </g>

        <circle cx={cx} cy={cyR} r={4.5} fill={proxyColor} stroke={t.background} strokeWidth={1.3} />
        <circle cx={cx} cy={cyQ} r={4.5} fill={qualityColor} stroke={t.background} strokeWidth={1.3} />

        {current.hackingGap > 1.5 && (
          <text
            x={cx > (padL + padR) / 2 ? cx - 10 : cx + 10}
            y={(cyR + cyQ) / 2 + 5}
            textAnchor={cx > (padL + padR) / 2 ? 'end' : 'start'}
            fontSize={14}
            fontWeight={700}
            fontFamily="monospace"
            fill={gapColor}
          >
            Gap +{current.hackingGap.toFixed(1)}
          </text>
        )}
      </g>
    );
  };

  // ---- Policy probability distribution across candidate lengths ----
  const renderDistributionStrip = (panelW: number, topY: number) => {
    const padL = 46;
    const padR = panelW - 14;
    const colW = (padR - padL) / CANDIDATE_LENGTHS.length;
    const barW = Math.min(44, Math.floor(colW * 0.56));
    const baselineY = topY + 78;
    const maxBarH = 44;
    const clipId = `rh-dist-clip-${panelW}`;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={baselineY - maxBarH} width={padR - padL} height={maxBarH} />
          </clipPath>
        </defs>
        <text x={padL} y={topY + 14} fontSize={14.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Where the AI puts its probability at Step {current.step} (% of answers per length)
        </text>
        <line x1={padL} y1={baselineY} x2={padR} y2={baselineY} stroke={t.border} strokeWidth={1.2} />
        {CANDIDATE_LENGTHS.map((len, idx) => {
          const prob = current.policyProbs[idx] ?? 0;
          const cx = padL + idx * colW + colW / 2;
          const bh = Math.max(2, prob * maxBarH);
          const pct = Math.round(prob * 100);
          return (
            <g key={len}>
              <g clipPath={`url(#${clipId})`}>
                <rect x={cx - barW / 2} y={baselineY - bh} width={barW} height={bh} rx={3} fill={distColor} fillOpacity={0.85} />
              </g>
              <text x={cx} y={baselineY - bh - 5} textAnchor="middle" fontSize={14} fontFamily="monospace" fontWeight={pct >= 25 ? 700 : 400} fill={pct >= 25 ? distColor : t.textSecondary}>
                {pct}%
              </text>
              <text x={cx} y={baselineY + 18} textAnchor="middle" fontSize={14} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
                {len}w
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="Why chasing a flawed score breaks AI helpfulness (Goodhart's Law)"
            description={
              <span style={{ fontSize: 15 }}>
                When an AI trains against a scoring model (proxy reward R) instead of human judgment on every step, it finds and exploits shortcuts. Here the scorer rewards extra length — watch the AI pad answers into 900-word fluff while real helpfulness crashes.
              </span>
            }
          />

          {/* Control Group 1: Training scenario presets + Ideal length L* + live readout */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<ScenarioId>
                label="Training setup (choose scenario)"
                value={activeScenario}
                onChange={applyScenario}
                options={SCENARIO_OPTIONS}
              />
            </div>
            <label htmlFor="rh-ideal-len" style={{ fontSize: 15, color: t.textSecondary }}>
              Ideal length L*:
              <input
                id="rh-ideal-len"
                type="number"
                min={60}
                max={300}
                step={10}
                value={idealLength}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  setIdealLength(Math.max(60, Math.min(300, Math.round(v))));
                  setStep(0);
                  setPlaying(!reducedMotion);
                }}
                style={{
                  width: 72,
                  marginLeft: 6,
                  minHeight: 34,
                  padding: '4px 6px',
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${t.border}`,
                  background: t.background,
                  color: t.textPrimary,
                  fontFamily: 'monospace',
                  fontSize: 15,
                }}
              />
            </label>
            <div style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
              Step <strong style={{ color: t.textPrimary }}>{current.step}/10</strong> · Proxy R{' '}
              <strong style={{ color: proxyColor }}>{current.expectedProxyReward.toFixed(2)}</strong> · True Q{' '}
              <strong style={{ color: qualityColor }}>{current.expectedTrueQuality.toFixed(2)}/10</strong> · KL{' '}
              <strong style={{ color: t.textPrimary }}>{current.klDivergence.toFixed(2)}</strong>
            </div>
          </div>

          {/* Control Group 2: Two sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginBottom: 6 }}>
            <Slider
              label="Length bonus w_len (points added per 100 words)"
              value={lengthBias}
              onChange={(v) => {
                setLengthBias(v);
                setStep(0);
                setPlaying(!reducedMotion);
              }}
              min={0}
              max={2.2}
              step={0.1}
              format={(v) => `+${v.toFixed(1)}`}
            />
            <Slider
              label="KL tether β (higher = stays closer to initial model)"
              value={klFloor}
              onChange={(v) => {
                setKlFloor(v);
                setStep(0);
                setPlaying(!reducedMotion);
              }}
              min={0.15}
              max={4.0}
              step={0.05}
              format={(v) => v.toFixed(2)}
            />
          </div>
        </>
      )}

      {/* HTML Colour Legend (consistent everywhere) */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, color: t.textSecondary, marginBottom: 4 }}
        aria-label="Chart series colours"
      >
        <span>
          <span style={{ display: 'inline-block', width: 20, height: 4, background: proxyColor, verticalAlign: 'middle', marginRight: 6 }} />
          Proxy reward R (what the AI maximizes)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 20, borderTop: `3px dashed ${qualityColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          True quality Q (real helpfulness)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 20, borderTop: `3px dashed ${gapColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Avg length &amp; hacking gap (R − Q)
        </span>
        {!compact && (
          <span>
            <span style={{ display: 'inline-block', width: 14, height: 11, background: distColor, verticalAlign: 'middle', marginRight: 6 }} />
            Answer share π*(y)
          </span>
        )}
      </div>

      {/* Main SVG visual */}
      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox={compact ? '0 0 760 238' : '0 0 760 356'}
            role="img"
            aria-label={`At step ${current.step}, expected length is ${avgLengthRounded} words, proxy reward ${current.expectedProxyReward.toFixed(2)}, true quality ${current.expectedTrueQuality.toFixed(2)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderCurvePanel(0, 366, 236)}
            {renderTrajectoryPanel(390, 366, 236)}
            {!compact && renderDistributionStrip(756, 248)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <svg
              width="100%"
              viewBox="0 0 380 232"
              role="img"
              aria-label="True quality versus length-biased proxy reward curves"
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderCurvePanel(0, 380, 232)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 380 232"
              role="img"
              aria-label="Proxy reward versus true quality over RLHF optimization steps"
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderTrajectoryPanel(0, 380, 232)}
            </svg>
            {!compact && (
              <svg
                width="100%"
                viewBox="0 0 380 112"
                role="img"
                aria-label="Answer probability distribution across candidate word lengths"
                style={{ display: 'block', fontFamily: FONT_FAMILY }}
              >
                {renderDistributionStrip(380, 2)}
              </svg>
            )}
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="RLHF objective (with KL tether β)" latex={'\\max_{\\pi}\\;\\mathbb{E}_{\\pi}[R(y)] - \\beta\\,\\mathrm{KL}(\\pi\\,\\|\\,\\pi_{\\mathrm{ref}})'} color="pink" tilt={-1}>
            <p style={{ textAlign: 'center' }}>Small β lets the policy exploit proxy flaws; large β holds it near π_ref.</p>
          </StickyNote>
          <StickyNote title={`Step ${current.step}/10 · Q=${current.expectedTrueQuality.toFixed(2)}/10`} color="blue" tilt={1} live>
            <p>{caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Flawed scorer (proxy R)" latex={'R(L) = Q_{\\text{true}}(L) + w_{\\text{len}} \\cdot \\frac{L}{100}'} color="yellow" tilt={-1}>
              <p style={{ textAlign: 'center' }}>True quality peaks at L* = {idealLength}w, while w_len keeps paying for fluff.</p>
            </StickyNote>
            <StickyNote title="RLHF policy update (tether β)" latex={'\\pi^*(y) \\propto \\pi_{\\text{ref}}(y)\\exp\\!\\left(\\frac{R(y)}{\\beta}\\right)'} color="pink" tilt={1}>
              <p style={{ textAlign: 'center' }}>Lower β pushes harder on R(y); larger β keeps KL drift small.</p>
            </StickyNote>
            <StickyNote title={`Worked numbers · Step ${current.step}`} color="green" tilt={-1}>
              <p className="nm-sticky__mono">
                β = {betaDisplay} · KL = {current.klDivergence.toFixed(2)} · E[L] = {avgLengthRounded}w
              </p>
              <p className="nm-sticky__mono">
                Bonus +{biasBonusPts.toFixed(2)} · Proxy R = {current.expectedProxyReward.toFixed(2)} · True Q = {current.expectedTrueQuality.toFixed(2)}/10
              </p>
            </StickyNote>
            <StickyNote title={`Step ${current.step} of 10 · What just happened`} color="blue" tilt={1} live>
              <p>{caption}</p>
            </StickyNote>
          </StickyRow>

          {/* Predict-then-run challenge */}
          <div
            style={{
              marginTop: 6,
              paddingTop: 8,
              borderTop: `1px dashed ${t.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px 10px',
              fontSize: 15,
            }}
          >
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span style={{ color: t.textPrimary }}>
              Keep length bias at +1.6/100w, but raise KL tether β from 0.25 to 2.0 — what happens to True Quality?
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREDICT_OPTIONS.map((opt, idx) => {
                const picked = prediction === idx;
                const correct = idx === 0;
                const revealed = prediction !== null;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrediction(idx)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${
                        revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : t.border
                      }`,
                      background:
                        revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : 'transparent',
                      color: revealed && (correct || picked) ? t.background : t.textPrimary,
                      fontFamily: FONT_FAMILY,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {prediction !== null && (
              <span role="status" style={{ color: prediction === 0 ? t.accentPrimary : t.accentWarn, fontSize: 15 }}>
                {prediction === 0 ? 'Right — ' : 'Try it — '}
                higher β penalizes drifting into padded 900-word answers, keeping True Quality around 8.7/10.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setLengthBias(1.6);
                    setKlFloor(2.0);
                    setStep(0);
                    setPlaying(!reducedMotion);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: t.accentSecondary,
                    textDecoration: 'underline',
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Test β = 2.0 now
                </button>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <VizButton onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton
              variant="secondary"
              onClick={() => {
                setPlaying(false);
                setStep((s) => (s + 1) % totalSteps);
              }}
            >
              Step →
            </VizButton>
            <VizButton
              variant="secondary"
              onClick={() => {
                setPlaying(false);
                setStep(0);
              }}
            >
              Reset
            </VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>
              Exact closed-form KL policy over 7 candidate answer lengths (40w–900w).
            </span>
          </div>
        </>
      )}
    </>
  );
}

export default function RewardHackingSimulationDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Reward Hacking & Goodhart's Law Playground"
      footer="Uses exact closed-form KL-regularized RLHF policies π*(y) ∝ π_ref(y)·exp(R(y)/β) over candidate lengths 40–900 words. Lowering β lets the policy exploit the proxy's length bias."
    >
      <RewardHackingPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
