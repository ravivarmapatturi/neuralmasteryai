import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../theme/vizTokens';
import { SketchArrow } from '../components/notebook/RoughShape';
import {
  PillSelect,
  StickyNote,
  StickyRow,
  Slider,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  usePrefersReducedMotion,
  useVizVisible,
} from './primitives';
import {
  buildStepRecord,
  computeContourSegments,
  createInitialRecord,
  DEFAULT_LR,
  explainOptimizationStep,
  makeStepper,
  OPTIMIZER_META,
  runTrajectory,
  SURFACES,
  X_DOMAIN,
  Y_DOMAIN,
  type Optimizer,
  type OptState,
  type OptStepRecord,
  type Point2D,
  type SurfaceId,
} from './lib/gradientDescent';

const OPTIMIZERS: { value: Optimizer; label: string }[] = [
  { value: 'sgd', label: 'SGD' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'rmsprop', label: 'RMSProp' },
  { value: 'adam', label: 'Adam' },
];

const SURFACE_OPTIONS: { value: SurfaceId; label: string }[] = [
  { value: 'ravine', label: 'Ravine' },
  { value: 'bowl', label: 'Round bowl' },
  { value: 'saddle', label: 'Saddle' },
];

const SURFACE_LATEX: Record<SurfaceId, string> = {
  ravine: 'L(w)=0.1\\,w_1^2+2\\,w_2^2',
  bowl: 'L(w)=0.5\\,w_1^2+0.5\\,w_2^2',
  saddle: 'L(w)=0.15\\,w_1^2+0.45\\,(w_2^2-1)^2',
};
const UPDATE_LATEX: Record<Optimizer, string> = {
  sgd: 'w \\leftarrow w-\\eta\\,\\nabla L',
  momentum: 'v \\leftarrow \\beta v-\\eta\\,\\nabla L,\\quad w \\leftarrow w+v',
  rmsprop: 'w \\leftarrow w-\\frac{\\eta\\,\\nabla L}{\\sqrt{s}+\\epsilon}',
  adam: 'w \\leftarrow w-\\eta\\,\\frac{\\hat m}{\\sqrt{\\hat v}+\\epsilon}',
};
const UPDATE_PLAIN: Record<Optimizer, string> = {
  sgd: 'Take a step of size η straight downhill.',
  momentum: 'Keep a running velocity v, so steps build speed along a steady slope.',
  rmsprop: 's is a running average of squared slopes; steep directions get smaller steps.',
  adam: 'm̂ = average slope, v̂ = average squared slope: momentum plus per-direction step sizes.',
};

const PREDICT_OPTIONS = [
  'Bounces across the steep w₂ wall',
  'Glides straight to (0, 0) in 2 steps',
  'Stalls immediately at start',
];

const MAX_AUTO_STEPS = 55;

export default function GradientDescentExplorer({ defaultOptimizer = 'adam' as Optimizer, compact = false }: { defaultOptimizer?: Optimizer; compact?: boolean } = {}) {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const visible = useVizVisible();

  const [surface, setSurface] = useState<SurfaceId>('ravine');
  const [optimizer, setOptimizer] = useState<Optimizer>(defaultOptimizer);
  const [lr, setLr] = useState<number>(DEFAULT_LR[defaultOptimizer]);
  const [start, setStart] = useState<Point2D>(SURFACES.ravine.defaultStart);
  const [compareAll, setCompareAll] = useState(true);
  const [playing, setPlaying] = useState(!reducedMotion);
  const [autoLoop, setAutoLoop] = useState(!reducedMotion);
  const [prediction, setPrediction] = useState<number | null>(null);

  const [records, setRecords] = useState<OptStepRecord[]>(() =>
    reducedMotion
      ? runTrajectory({ optimizer: defaultOptimizer, lr: DEFAULT_LR[defaultOptimizer], start: SURFACES.ravine.defaultStart, surface: 'ravine', steps: 28 })
      : [createInitialRecord('ravine', SURFACES.ravine.defaultStart)],
  );
  const stateRef = useRef<OptState>(
    reducedMotion
      ? { x: SURFACES.ravine.defaultStart.x, y: SURFACES.ravine.defaultStart.y }
      : { x: SURFACES.ravine.defaultStart.x, y: SURFACES.ravine.defaultStart.y },
  );

  const svgHostRef = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(700);

  useEffect(() => {
    const el = svgHostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 700;
      if (w > 0) setHostWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stepper = useMemo(() => makeStepper(optimizer, lr, surface), [optimizer, lr, surface]);

  const restartFrom = (newStart: Point2D, newSurface = surface, keepPlaying = false) => {
    stateRef.current = { x: newStart.x, y: newStart.y };
    setRecords([createInitialRecord(newSurface, newStart)]);
    setPlaying(keepPlaying);
  };

  const stepOnce = () => {
    setRecords((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.diverged || prev.length > 250) return prev;
      const nextState = stepper(stateRef.current);
      stateRef.current = nextState;
      return [...prev, buildStepRecord(nextState, last, surface)];
    });
  };

  // Live animation loop: runs automatically on mount, pauses off screen, and loops
  // gracefully in showcase mode until the learner pauses or clicks manually.
  const current = records[records.length - 1];
  const prevRec = records.length > 1 ? records[records.length - 2] : undefined;
  const finishedRun = current.converged || current.diverged || current.step >= MAX_AUTO_STEPS;

  useEffect(() => {
    if (!reducedMotion) return;
    setPlaying(false);
    setAutoLoop(false);
    const traj = runTrajectory({ optimizer, lr, start, surface, steps: 28 });
    setRecords(traj);
    const last = traj[traj.length - 1];
    stateRef.current = { x: last.x, y: last.y };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  useEffect(() => {
    if (!playing || !visible || reducedMotion) return undefined;
    if (finishedRun) {
      if (!autoLoop) {
        setPlaying(false);
        return undefined;
      }
      const restartTimer = window.setTimeout(() => {
        stateRef.current = { x: start.x, y: start.y };
        setRecords([createInitialRecord(surface, start)]);
      }, 1400);
      return () => window.clearTimeout(restartTimer);
    }
    const id = window.setInterval(stepOnce, 110);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, visible, reducedMotion, finishedRun, autoLoop, stepper, start, surface]);

  // Synchronized comparison trajectories for SGD and Momentum/Adam from the exact same start
  // One clearly different colour per optimizer, used everywhere (paths, loss curves, legend).
  const optColor = useMemo<Record<Optimizer, string>>(() => ({ sgd: t.accentDanger, momentum: t.accentSecondary, rmsprop: t.accentPurple, adam: t.accentPrimary }), [t]);
  const racePaths = useMemo(() => {
    if (!compareAll) return [];
    const targetSteps = Math.max(12, current.step);
    const competitors: { id: Optimizer; color: string; label: string }[] = (['sgd', 'momentum', 'rmsprop', 'adam'] as Optimizer[])
      .map((id) => ({ id, color: optColor[id], label: OPTIMIZER_META[id].shortLabel }));
    return competitors
      .filter((c) => c.id !== optimizer)
      .map((c) => ({
        ...c,
        records: runTrajectory({ optimizer: c.id, lr, start, surface, steps: targetSteps }),
      }));
  }, [compareAll, current.step, optimizer, lr, start, surface, optColor]);

  const saddleContours = useMemo(() => {
    if (surface !== 'saddle') return [];
    return SURFACES.saddle.levels.map((level) => ({
      level,
      segs: computeContourSegments('saddle', level),
    }));
  }, [surface]);

  const surfDef = SURFACES[surface];
  const caption = explainOptimizationStep(current, prevRec, optimizer, lr, surface);
  const statusLabel = current.diverged
    ? 'Diverged'
    : current.converged
      ? 'Converged'
      : current.oscillating
        ? 'Oscillating'
        : 'Descending';
  const statusColor = current.diverged
    ? t.accentDanger
    : current.converged
      ? t.accentPrimary
      : current.oscillating
        ? t.accentWarn
        : t.accentSecondary;

  const isCompactPhone = hostWidth < 540;

  // Contour plot renderer inside SVG
  const renderContourPanel = (panelW: number, panelH: number) => {
    const padL = 46;
    const padR = 12;
    const padT = 22;
    const padB = 30;
    const xScale = scaleLinear().domain(X_DOMAIN).range([padL, panelW - padR]);
    const yScale = scaleLinear().domain(Y_DOMAIN).range([panelH - padB, padT]);

    const handlePlotClick = (e: React.MouseEvent<SVGSVGElement | SVGGElement>) => {
      const svg = e.currentTarget.ownerSVGElement ?? (e.currentTarget as SVGSVGElement);
      const rect = svg.getBoundingClientRect();
      const vb = (svg as SVGSVGElement).viewBox.baseVal;
      const viewBoxW = vb.width;
      const viewBoxH = vb.height;
      const vx = ((e.clientX - rect.left) / rect.width) * viewBoxW;
      const vy = ((e.clientY - rect.top) / rect.height) * viewBoxH;
      if (vx < padL || vx > panelW - padR || vy < padT || vy > panelH - padB) return;
      const nx = Number(Math.max(-4.8, Math.min(4.8, xScale.invert(vx))).toFixed(2));
      const ny = Number(Math.max(-2.8, Math.min(2.8, yScale.invert(vy))).toFixed(2));
      const nextStart = { x: nx, y: ny };
      setAutoLoop(false);
      setStart(nextStart);
      restartFrom(nextStart, surface, true);
    };

    const clampPx = (x: number, y: number): [number, number] => [
      Math.max(padL, Math.min(panelW - padR, xScale(x))),
      Math.max(padT, Math.min(panelH - padB, yScale(y))),
    ];

    const mainPoints = records.map((r) => clampPx(r.x, r.y).join(',')).join(' ');
    const [curPx, curPy] = clampPx(current.x, current.y);
    const gScale = 0.25;
    const negGradTip = clampPx(
      current.x - Math.max(-1.8, Math.min(1.8, current.gx * gScale)),
      current.y - Math.max(-1.2, Math.min(1.2, current.gy * gScale)),
    );

    return (
      <g onClick={handlePlotClick} style={{ cursor: 'crosshair' }}>
        <rect x={padL} y={padT} width={panelW - padL - padR} height={panelH - padT - padB} fill={t.background} rx={4} />

        {/* Axes */}
        <line x1={padL} y1={panelH - padB} x2={panelW - padR} y2={panelH - padB} stroke={t.border} strokeWidth={1.5} />
        <line x1={padL} y1={padT} x2={padL} y2={panelH - padB} stroke={t.border} strokeWidth={1.5} />

        {[-4, -2, 0, 2, 4].map((tick) => (
          <g key={`xt-${tick}`}>
            <line x1={xScale(tick)} y1={panelH - padB} x2={xScale(tick)} y2={panelH - padB + 4} stroke={t.border} />
            <text x={xScale(tick)} y={panelH - padB + 16} textAnchor="middle" fontSize={13} fontFamily={FONT_FAMILY} fill={t.textMuted}>
              {tick}
            </text>
          </g>
        ))}
        {[-2, 0, 2].map((tick) => (
          <g key={`yt-${tick}`}>
            <line x1={padL - 4} y1={yScale(tick)} x2={padL} y2={yScale(tick)} stroke={t.border} />
            <text x={padL - 8} y={yScale(tick) + 4} textAnchor="end" fontSize={13} fontFamily={FONT_FAMILY} fill={t.textMuted}>
              {tick}
            </text>
          </g>
        ))}
        <text x={(padL + panelW - padR) / 2} y={panelH - 2} textAnchor="middle" fontSize={13} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          weight w₁   (click to pick a start)
        </text>
        <text x={14} y={padT + 8} textAnchor="middle" fontSize={13} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          w₂
        </text>

        <defs>
          <clipPath id={`gd-clip-${panelW}`}><rect x={padL} y={padT} width={panelW - padL - padR} height={panelH - padT - padB} /></clipPath>
        </defs>
        <g clipPath={`url(#gd-clip-${panelW})`}>
        {/* Contours */}
        {surfDef.ellipseRadii
          ? surfDef.levels.map((level) => {
              const [rxDom, ryDom] = surfDef.ellipseRadii!(level);
              const rx = Math.abs(xScale(rxDom) - xScale(0));
              const ry = Math.abs(yScale(0) - yScale(ryDom));
              return (
                <ellipse
                  key={level}
                  cx={xScale(0)}
                  cy={yScale(0)}
                  rx={rx}
                  ry={ry}
                  fill="none"
                  stroke={t.border}
                  strokeWidth={1.1}
                  opacity={0.7}
                />
              );
            })
          : saddleContours.map((group) =>
              group.segs.map(([p1, p2], idx) => (
                <line
                  key={`${group.level}-${idx}`}
                  x1={xScale(p1[0])}
                  y1={yScale(p1[1])}
                  x2={xScale(p2[0])}
                  y2={yScale(p2[1])}
                  stroke={t.border}
                  strokeWidth={1.1}
                  opacity={0.75}
                />
              )),
            )}

        {/* Minima & saddle markers */}
        {surfDef.minima.map((m, i) => (
          <g key={`min-${i}`}>
            <circle cx={xScale(m.x)} cy={yScale(m.y)} r={5} fill="none" stroke={t.accentPrimary} strokeWidth={2} />
            <text x={xScale(m.x) + 9} y={yScale(m.y) - 9} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.accentPrimary} stroke={t.background} strokeWidth={4} paintOrder="stroke">
              minimum
            </text>
          </g>
        ))}
        {surfDef.saddle && (
          <text x={xScale(surfDef.saddle.x) + 6} y={yScale(surfDef.saddle.y) - 6} fontSize={13} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.accentWarn}>
            Saddle
          </text>
        )}

        {/* Comparison trajectories */}
        {racePaths.map((race) => (
          <g key={race.id} opacity={0.78}>
            <polyline
              points={race.records.map((r) => clampPx(r.x, r.y).join(',')).join(' ')}
              fill="none"
              stroke={race.color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {race.records.length > 0 && (
              <circle
                cx={clampPx(race.records[race.records.length - 1].x, race.records[race.records.length - 1].y)[0]}
                cy={clampPx(race.records[race.records.length - 1].x, race.records[race.records.length - 1].y)[1]}
                r={4}
                fill={race.color}
              />
            )}
          </g>
        ))}

        {/* Active optimizer trajectory */}
        <rect x={xScale(start.x) - 4} y={yScale(start.y) - 4} width={8} height={8} fill={t.textSecondary} />
        <text x={xScale(start.x)} y={yScale(start.y) - 8} textAnchor="middle" fontSize={13} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Start
        </text>
        {records.length > 1 && (
          <polyline points={mainPoints} fill="none" stroke={optColor[optimizer]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Negative gradient vector (-∇L) */}
        {!current.converged && !current.diverged && Math.hypot(negGradTip[0] - curPx, negGradTip[1] - curPy) > 6 && (
          <SketchArrow
            points={[
              [curPx, curPy],
              negGradTip,
            ]}
            color={t.accentDanger}
            strokeWidth={1.8}
            roughness={0.8}
            id="gd-neg-grad"
          />
        )}

        <circle cx={curPx} cy={curPy} r={6.5} fill={statusColor} stroke={t.background} strokeWidth={1.5} />
        </g>
      </g>
    );
  };

  // Loss curve + live update numbers panel inside SVG
  const renderLossPanel = (offsetX: number, panelW: number, panelH: number) => {
    const plotX0 = offsetX + 46;
    const plotX1 = offsetX + panelW - 10;
    const plotY0 = 20;
    const plotY1 = panelH - 30;
    const maxStep = Math.max(15, current.step, MAX_AUTO_STEPS * (playing ? 0.5 : 0));
    const maxLoss = Math.max(1, records[0]?.loss ?? 10, ...records.map((r) => (Number.isFinite(r.loss) ? Math.min(30, r.loss) : 30)));
    const sx = scaleLinear().domain([0, maxStep]).range([plotX0, plotX1]);
    const sy = scaleLinear().domain([0, maxLoss]).range([plotY1, plotY0]);

    const mainCurve = records
      .filter((r) => Number.isFinite(r.loss))
      .map((r) => `${sx(Math.min(maxStep, r.step))},${sy(Math.min(maxLoss, r.loss))}`)
      .join(' ');

    return (
      <g>
        {/* Loss curve chart */}
        <line x1={plotX0} y1={plotY0} x2={plotX0} y2={plotY1} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX0} y1={plotY1} x2={plotX1} y2={plotY1} stroke={t.border} strokeWidth={1.3} />
        <text x={plotX0 - 6} y={plotY0 + 8} textAnchor="end" fontSize={13} fontFamily={FONT_FAMILY} fill={t.textMuted}>
          {maxLoss.toFixed(0)}
        </text>
        <text x={plotX0 - 6} y={plotY1 + 4} textAnchor="end" fontSize={13} fontFamily={FONT_FAMILY} fill={t.textMuted}>
          0
        </text>
        <text x={(plotX0 + plotX1) / 2} y={panelH - 6} textAnchor="middle" fontSize={13} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Loss after each step
        </text>

        {racePaths.map((race) => (
          <polyline
            key={`loss-${race.id}`}
            points={race.records
              .filter((r) => Number.isFinite(r.loss))
              .map((r) => `${sx(Math.min(maxStep, r.step))},${sy(Math.min(maxLoss, r.loss))}`)
              .join(' ')}
            fill="none"
            stroke={race.color}
            strokeWidth={1.8}
            opacity={0.9}
          />
        ))}
        {records.length > 1 && (
          <polyline points={mainCurve} fill="none" stroke={optColor[optimizer]} strokeWidth={2.4} strokeLinecap="round" />
        )}
        <circle cx={sx(Math.min(maxStep, current.step))} cy={sy(Math.min(maxLoss, current.loss))} r={4.5} fill={statusColor} />

      </g>
    );
  };

  return (
    <VisualizationContainer
      title="Gradient Descent Optimizer Explorer"
      footer="Exact SGD, Momentum, RMSProp, and Adam update rules running live on analytical loss surfaces. Click the plot or type w₁, w₂ to move the starting point."
    >
      {!compact && (<>
      {/* Header + transport on one compact row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <div style={{ marginBottom: -14 }}>
          <VisualizationHeader title="Gradient Descent Explorer" />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <VizButton
            onClick={() => {
              if (!playing && finishedRun) {
                restartFrom(start, surface, true);
                return;
              }
              setAutoLoop(false);
              setPlaying((p) => !p);
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </VizButton>
          <VizButton
            variant="secondary"
            onClick={() => {
              setAutoLoop(false);
              setPlaying(false);
              stepOnce();
            }}
          >
            Step
          </VizButton>
          <VizButton
            variant="secondary"
            onClick={() => {
              setAutoLoop(false);
              restartFrom(start, surface, false);
            }}
          >
            Reset
          </VizButton>
        </div>
      </div>

      {/* Controls row 1: Optimizer + Surface + Compare toggle */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ marginBottom: -8 }}>
          <PillSelect<Optimizer>
            label="Optimizer (how it steps)"
            value={optimizer}
            onChange={(nextOpt) => {
              const val = typeof nextOpt === 'function' ? nextOpt(optimizer) : nextOpt;
              setAutoLoop(false);
              setOptimizer(val);
              setLr(DEFAULT_LR[val]);
              restartFrom(start, surface, true);
            }}
            options={OPTIMIZERS}
          />
        </div>
        <div style={{ marginBottom: -8 }}>
          <PillSelect<SurfaceId>
            label="Loss surface (the hill)"
            value={surface}
            onChange={(nextSurf) => {
              const val = typeof nextSurf === 'function' ? nextSurf(surface) : nextSurf;
              const s0 = SURFACES[val].defaultStart;
              setAutoLoop(false);
              setSurface(val);
              setStart(s0);
              restartFrom(s0, val, true);
            }}
            options={SURFACE_OPTIONS}
          />
        </div>
        <button
          type="button"
          aria-pressed={compareAll}
          onClick={() => setCompareAll((c) => !c)}
          style={{
            padding: '6px 10px',
            borderRadius: RADIUS.sm,
            border: `1px solid ${compareAll ? t.accentSecondary : t.border}`,
            background: compareAll ? t.surfaceAlt : 'transparent',
            color: compareAll ? t.accentSecondary : t.textPrimary,
            fontFamily: FONT_FAMILY,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Compare all optimizers: {compareAll ? 'on' : 'off'}
        </button>
      </div>

      {/* Controls row 2: Learning rate slider + Free numeric Start (w1, w2) inputs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ flex: '1 1 180px', minWidth: 160 }}>
          <Slider
            label="Learning rate η"
            value={lr}
            onChange={(v) => {
              setAutoLoop(false);
              setLr(v);
              restartFrom(start, surface, true);
            }}
            min={0.02}
            max={0.8}
            step={0.01}
            format={(v) => v.toFixed(2)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor="gd-start-x" style={{ fontSize: 14, color: t.textSecondary }}>
            Start w₁:
            <input
              id="gd-start-x"
              type="number"
              step={0.25}
              min={-4.8}
              max={4.8}
              value={start.x}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!Number.isFinite(val)) return;
                const clamped = Math.max(-4.8, Math.min(4.8, val));
                const next = { ...start, x: clamped };
                setAutoLoop(false);
                setStart(next);
                restartFrom(next, surface, false);
              }}
              style={{
                width: 66,
                marginLeft: 6,
                padding: '4px 6px',
                borderRadius: RADIUS.sm,
                border: `1px solid ${t.border}`,
                background: t.background,
                color: t.textPrimary,
                fontVariantNumeric: 'tabular-nums',
                fontSize: 14,
              }}
            />
          </label>
          <label htmlFor="gd-start-y" style={{ fontSize: 14, color: t.textSecondary }}>
            w₂:
            <input
              id="gd-start-y"
              type="number"
              step={0.25}
              min={-2.8}
              max={2.8}
              value={start.y}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!Number.isFinite(val)) return;
                const clamped = Math.max(-2.8, Math.min(2.8, val));
                const next = { ...start, y: clamped };
                setAutoLoop(false);
                setStart(next);
                restartFrom(next, surface, false);
              }}
              style={{
                width: 66,
                marginLeft: 6,
                padding: '4px 6px',
                borderRadius: RADIUS.sm,
                border: `1px solid ${t.border}`,
                background: t.background,
                color: t.textPrimary,
                fontVariantNumeric: 'tabular-nums',
                fontSize: 14,
              }}
            />
          </label>
        </div>
        <div style={{ fontSize: 14, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
          Step <strong style={{ color: t.textPrimary }}>{current.step}</strong> · Loss{' '}
          <strong style={{ color: t.textPrimary }}>{current.loss.toFixed(4)}</strong> ·{' '}
          <strong style={{ color: statusColor }}>{statusLabel}</strong>
        </div>
      </div>


      {/* Main SVG (contour + loss chart side-by-side at 760px, stacked at 375px) */}
      </>)}
      {compareAll && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Path colours">
          <span><span style={{ display: 'inline-block', width: 22, height: 4, background: optColor[optimizer], verticalAlign: 'middle', marginRight: 6 }} />{OPTIMIZER_META[optimizer].label} (selected)</span>
          {racePaths.map((r) => (
            <span key={r.id}><span style={{ display: 'inline-block', width: 22, height: 3, background: r.color, verticalAlign: 'middle', marginRight: 6 }} />{OPTIMIZER_META[r.id].label}</span>
          ))}
        </div>
      )}
      <div ref={svgHostRef} style={{ width: '100%', display: 'grid', gridTemplateColumns: isCompactPhone ? '1fr' : compact ? 'minmax(0, 2.3fr) minmax(0, 1fr)' : 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        <svg width="100%" viewBox="0 0 520 330" role="img" aria-label={`2D loss surface for ${surfDef.label}`} style={{ display: 'block' }}>
          {renderContourPanel(520, 330)}
        </svg>
        <svg width="100%" viewBox="0 0 300 260" role="img" aria-label={`Loss over steps for ${optimizer}`} style={{ display: 'block' }}>
          {renderLossPanel(0, 300, 260)}
        </svg>
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={`Update rule · ${OPTIMIZER_META[optimizer].label}`} latex={UPDATE_LATEX[optimizer]} color="pink" tilt={-1}>
            <p style={{ textAlign: 'center' }}>{UPDATE_PLAIN[optimizer]}</p>
          </StickyNote>
          <StickyNote title={`Step ${current.step} · loss ${current.loss.toFixed(3)}`} color="blue" tilt={1} live>
            <p>{caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
      <StickyRow>
        <StickyNote title={`Loss surface · ${surfDef.label}`} latex={SURFACE_LATEX[surface]} color="yellow" tilt={-1}>
          <p style={{ textAlign: 'center' }}>The rings are heights of this loss; the goal is the lowest point.</p>
        </StickyNote>
        <StickyNote title={`Update rule · ${OPTIMIZER_META[optimizer].label}`} latex={UPDATE_LATEX[optimizer]} color="pink" tilt={1}>
          <p style={{ textAlign: 'center' }}>{UPDATE_PLAIN[optimizer]}</p>
        </StickyNote>
        <StickyNote title={`Live numbers · step ${current.step}`} color="green" tilt={-1}>
          <p className="nm-sticky__mono">w = ({current.x.toFixed(2)}, {current.y.toFixed(2)})</p>
          <p className="nm-sticky__mono">∇L = ({current.gx.toFixed(2)}, {current.gy.toFixed(2)})</p>
          <p className="nm-sticky__mono"><strong>L = {current.loss.toFixed(4)}</strong> · {statusLabel}</p>
        </StickyNote>
        <StickyNote title="What just happened" color="blue" tilt={1} live>
          <p>{caption}</p>
          <p style={{ color: t.textSecondary }}>The red arrow is −∇L: the downhill direction at the current point.</p>
        </StickyNote>
      </StickyRow>
      )}

      {!compact && (<>
      {/* Inline Predict-then-run challenge (no nested card border) */}
      <div
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: `1px dashed ${t.border}`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px 10px',
          fontSize: 14,
        }}
      >
        <span style={{ fontWeight: 700, color: t.accentWarn }}>Predict first:</span>
        <span style={{ color: t.textPrimary }}>On Ravine from (−4, 2) with SGD at η = 0.45, what happens?</span>
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
                  padding: '4px 10px',
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${
                    revealed && correct
                      ? t.accentPrimary
                      : revealed && picked
                        ? t.accentDanger
                        : t.border
                  }`,
                  background:
                    revealed && correct
                      ? t.accentPrimary
                      : revealed && picked
                        ? t.accentDanger
                        : 'transparent',
                  color: revealed && (correct || picked) ? t.background : t.textPrimary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 13.5,
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
          <span style={{ color: prediction === 0 ? t.accentPrimary : t.accentWarn, fontSize: 13.5 }}>
            {prediction === 0 ? 'Correct — ' : 'Watch — '}
            the steep w₂ slope (4·w₂ = 8) makes η = 0.45 overshoot w₂ = 0 every step.{' '}
            <button
              type="button"
              onClick={() => {
                const s0 = SURFACES.ravine.defaultStart;
                setAutoLoop(false);
                setSurface('ravine');
                setOptimizer('sgd');
                setLr(0.45);
                setStart(s0);
                restartFrom(s0, 'ravine', true);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: t.accentSecondary,
                textDecoration: 'underline',
                fontFamily: FONT_FAMILY,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Run η = 0.45 SGD now
            </button>
          </span>
        )}
      </div>
      </>)}
    </VisualizationContainer>
  );
}
