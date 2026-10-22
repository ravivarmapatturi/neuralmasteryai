import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3';
import { useVizTokens, SPACING } from '../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, VisualizationCanvas, Slider, PillSelect, VizButton, ControlRow } from './primitives';

// The same elongated ("ravine") bowl used in the site's static/animated
// optimizer-race chart: f(x, y) = 0.1x^2 + 2y^2 -- steep in one direction,
// shallow in the other, which is exactly what makes plain SGD struggle and
// motivates momentum/Adam.
const A = 0.1;
const B = 2.0;
const f = (x: number, y: number) => A * x * x + B * y * y;
const grad = (x: number, y: number): [number, number] => [2 * A * x, 2 * B * y];

const X_DOMAIN: [number, number] = [-5, 5];
const Y_DOMAIN: [number, number] = [-3, 3];

type Optimizer = 'sgd' | 'momentum' | 'adam';

const OPTIMIZERS: { value: Optimizer; label: string }[] = [
  { value: 'sgd', label: 'SGD' },
  { value: 'momentum', label: 'SGD + Momentum' },
  { value: 'adam', label: 'Adam' },
];

interface OptState {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  mx?: number;
  my?: number;
  t?: number;
}

function makeStepper(optimizer: Optimizer, lr: number): (s: OptState) => OptState {
  // Returns a function (state) -> nextState, where state carries whatever
  // per-optimizer accumulators (velocity, moment estimates) it needs,
  // mirroring the exact update rules from optimizers.md / the static chart.
  if (optimizer === 'sgd') {
    return (s) => {
      const [gx, gy] = grad(s.x, s.y);
      return { ...s, x: s.x - lr * gx, y: s.y - lr * gy };
    };
  }
  if (optimizer === 'momentum') {
    const beta = 0.85;
    return (s) => {
      const [gx, gy] = grad(s.x, s.y);
      const vx = beta * (s.vx ?? 0) - lr * gx;
      const vy = beta * (s.vy ?? 0) - lr * gy;
      return { ...s, x: s.x + vx, y: s.y + vy, vx, vy };
    };
  }
  // adam
  const b1 = 0.9;
  const b2 = 0.999;
  const eps = 1e-8;
  return (s) => {
    const [gx, gy] = grad(s.x, s.y);
    const t = (s.t ?? 0) + 1;
    const mx = b1 * (s.mx ?? 0) + (1 - b1) * gx;
    const my = b1 * (s.my ?? 0) + (1 - b1) * gy;
    const vx = b2 * (s.vx ?? 0) + (1 - b2) * gx * gx;
    const vy = b2 * (s.vy ?? 0) + (1 - b2) * gy * gy;
    const mxHat = mx / (1 - b1 ** t);
    const myHat = my / (1 - b1 ** t);
    const vxHat = vx / (1 - b2 ** t);
    const vyHat = vy / (1 - b2 ** t);
    return {
      ...s,
      x: s.x - (lr * mxHat) / (Math.sqrt(vxHat) + eps),
      y: s.y - (lr * myHat) / (Math.sqrt(vyHat) + eps),
      mx,
      my,
      vx,
      vy,
      t,
    };
  };
}

const DEFAULT_LR: Record<Optimizer, number> = { sgd: 0.15, momentum: 0.1, adam: 0.4 };

export default function GradientDescentExplorer({ defaultOptimizer = 'adam' as Optimizer } = {}) {
  const t = useVizTokens();
  const [optimizer, setOptimizer] = useState<Optimizer>(defaultOptimizer);
  const [lr, setLr] = useState(DEFAULT_LR[defaultOptimizer]);
  const [start, setStart] = useState({ x: -4, y: 2 });
  const [path, setPath] = useState<{ x: number; y: number }[]>([{ x: -4, y: 2 }]);
  const [playing, setPlaying] = useState(false);
  const stateRef = useRef<OptState>({ x: -4, y: 2 });

  const stepper = useMemo(() => makeStepper(optimizer, lr), [optimizer, lr]);

  const reset = (newStart = start) => {
    setPlaying(false);
    stateRef.current = { x: newStart.x, y: newStart.y };
    setPath([{ x: newStart.x, y: newStart.y }]);
  };

  const step = () => {
    const next = stepper(stateRef.current);
    stateRef.current = next;
    setPath((p) => (p.length > 400 ? p : [...p, { x: next.x, y: next.y }]));
  };

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(step, 60);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, stepper]);

  useEffect(() => {
    reset(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimizer]);

  const last = path[path.length - 1];
  const loss = f(last.x, last.y);
  const converged = loss < 0.01;

  return (
    <VisualizationContainer footer="Click anywhere on the bowl to set a starting point, pick an optimizer, and watch it descend -- the exact update rules from Optimizers, In Full Depth, running live.">
      <VisualizationHeader eyebrow="Interactive" title="Gradient Descent Explorer" />
      <ControlRow>
        <PillSelect<Optimizer> label="Optimizer" value={optimizer} onChange={setOptimizer} options={OPTIMIZERS} />
        <div style={{ minWidth: 200 }}>
          <Slider label="Learning rate" value={lr} onChange={setLr} min={0.01} max={optimizer === 'adam' ? 1.0 : 0.3} step={0.01} format={(v) => v.toFixed(2)} />
        </div>
        <VizButton onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</VizButton>
        <VizButton variant="secondary" onClick={step}>
          Step
        </VizButton>
        <VizButton variant="secondary" onClick={() => reset(start)}>
          Reset
        </VizButton>
      </ControlRow>

      <VisualizationCanvas aspect={9 / 6} minHeight={320} maxHeight={420}>
        {({ width, height }) => {
          const margin = 24;
          const xScale = scaleLinear().domain(X_DOMAIN).range([margin, width - margin]);
          const yScale = scaleLinear().domain(Y_DOMAIN).range([height - margin, margin]);

          const levels = [0.5, 1.5, 3, 5.5, 9, 14, 20];

          const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const nx = xScale.invert(px);
            const ny = yScale.invert(py);
            const newStart = { x: nx, y: ny };
            setStart(newStart);
            reset(newStart);
          };

          const pathPoints = path.map((p) => `${xScale(p.x)},${yScale(p.y)}`).join(' ');

          return (
            <svg width={width} height={height} onClick={handleClick} style={{ cursor: 'crosshair', display: 'block' }}>
              <rect x={0} y={0} width={width} height={height} fill={t.background} />
              {levels.map((c) => {
                const rx = xScale(Math.sqrt(c / A)) - xScale(0);
                const ry = yScale(0) - yScale(Math.sqrt(c / B));
                return <ellipse key={c} cx={xScale(0)} cy={yScale(0)} rx={rx} ry={ry} fill="none" stroke={t.border} strokeWidth={1} opacity={0.9} />;
              })}
              {/* minimum marker */}
              <text x={xScale(0)} y={yScale(0) + 4} textAnchor="middle" fontSize={14} fill={t.textPrimary}>
               
              </text>
              {/* start marker */}
              <rect x={xScale(start.x) - 4} y={yScale(start.y) - 4} width={8} height={8} fill={t.textSecondary} />
              {path.length > 1 && <polyline points={pathPoints} fill="none" stroke={t.accentPrimary} strokeWidth={2} strokeLinecap="round" />}
              <circle cx={xScale(last.x)} cy={yScale(last.y)} r={6} fill={converged ? t.accentPrimary : t.accentWarn} />
            </svg>
          );
        }}
      </VisualizationCanvas>

      <div style={{ display: 'flex', gap: SPACING.md, fontSize: 13, color: t.textSecondary, marginTop: 4 }}>
        <span>Step {path.length - 1}</span>
        <span>Loss {loss.toFixed(4)}</span>
        <span style={{ color: converged ? t.accentPrimary : t.textSecondary, fontWeight: converged ? 700 : 400 }}>{converged ? 'Converged' : 'Descending...'}</span>
      </div>
    </VisualizationContainer>
  );
}
