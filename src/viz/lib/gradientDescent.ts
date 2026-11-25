// Real pure-TypeScript 2D optimization engine for GradientDescentExplorer.
// Supports three analytical loss surfaces (narrow ravine, round bowl, saddle
// valley) and four genuine update rules (SGD, SGD + Momentum, RMSProp, Adam)
// with per-step gradient, delta, oscillation, convergence, and contour math.

export type Optimizer = 'sgd' | 'momentum' | 'rmsprop' | 'adam';
export type SurfaceId = 'ravine' | 'bowl' | 'saddle';

export interface Point2D {
  x: number;
  y: number;
}

export interface OptState {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  mx?: number;
  my?: number;
  sx?: number;
  sy?: number;
  t?: number;
}

export interface OptStepRecord {
  step: number;
  x: number;
  y: number;
  loss: number;
  gx: number;
  gy: number;
  gradNorm: number;
  dx: number;
  dy: number;
  stepSize: number;
  oscillating: boolean;
  diverged: boolean;
  converged: boolean;
}

export interface SurfaceDef {
  id: SurfaceId;
  label: string;
  formulaLabel: string;
  defaultStart: Point2D;
  minima: Point2D[];
  saddle?: Point2D;
  levels: number[];
  loss: (x: number, y: number) => number;
  grad: (x: number, y: number) => [number, number];
  ellipseRadii?: (level: number) => [number, number];
}

export const X_DOMAIN: [number, number] = [-5, 5];
export const Y_DOMAIN: [number, number] = [-3, 3];

export const DEFAULT_LR: Record<Optimizer, number> = {
  sgd: 0.15,
  momentum: 0.1,
  rmsprop: 0.25,
  adam: 0.25,
};

export const OPTIMIZER_META: Record<Optimizer, { label: string; shortLabel: string }> = {
  sgd: { label: 'SGD', shortLabel: 'SGD' },
  momentum: { label: 'Momentum', shortLabel: 'Mom' },
  rmsprop: { label: 'RMSProp', shortLabel: 'RMS' },
  adam: { label: 'Adam', shortLabel: 'Adam' },
};

export const SURFACES: Record<SurfaceId, SurfaceDef> = {
  ravine: {
    id: 'ravine',
    label: 'Narrow ravine',
    formulaLabel: 'L = 0.1w₁² + 2w₂²',
    defaultStart: { x: -4, y: 2 },
    minima: [{ x: 0, y: 0 }],
    levels: [0.5, 1.5, 3, 6, 10, 15],
    loss: (x, y) => 0.1 * x * x + 2.0 * y * y,
    grad: (x, y) => [0.2 * x || 0, 4.0 * y || 0],
    ellipseRadii: (c) => [Math.sqrt(c / 0.1), Math.sqrt(c / 2.0)],
  },
  bowl: {
    id: 'bowl',
    label: 'Round bowl',
    formulaLabel: 'L = 0.5w₁² + 0.5w₂²',
    defaultStart: { x: -4, y: 2 },
    minima: [{ x: 0, y: 0 }],
    levels: [0.5, 1.5, 3, 6, 10],
    loss: (x, y) => 0.5 * x * x + 0.5 * y * y,
    grad: (x, y) => [x || 0, y || 0],
    ellipseRadii: (c) => [Math.sqrt(c / 0.5), Math.sqrt(c / 0.5)],
  },
  saddle: {
    id: 'saddle',
    label: 'Saddle valley',
    formulaLabel: 'L = 0.15w₁² + 0.45(w₂² − 1)²',
    defaultStart: { x: -3.5, y: 0.25 },
    minima: [
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ],
    saddle: { x: 0, y: 0 },
    levels: [0.15, 0.35, 0.7, 1.4, 2.5, 4.5],
    loss: (x, y) => 0.15 * x * x + 0.45 * (y * y - 1) ** 2,
    grad: (x, y) => [0.3 * x || 0, 1.8 * y * (y * y - 1) || 0],
  },
};

export function evaluateLoss(surfaceId: SurfaceId, x: number, y: number): number {
  return SURFACES[surfaceId].loss(x, y);
}

export function evaluateGrad(surfaceId: SurfaceId, x: number, y: number): [number, number] {
  return SURFACES[surfaceId].grad(x, y);
}

export function makeStepper(
  optimizer: Optimizer,
  lr: number,
  surfaceId: SurfaceId = 'ravine',
  momentumBeta = 0.85,
): (s: OptState) => OptState {
  const surface = SURFACES[surfaceId];
  const safeLr = Math.max(0.001, lr);

  if (optimizer === 'sgd') {
    return (s) => {
      const [gx, gy] = surface.grad(s.x, s.y);
      return { ...s, x: s.x - safeLr * gx, y: s.y - safeLr * gy, t: (s.t ?? 0) + 1 };
    };
  }

  if (optimizer === 'momentum') {
    const beta = Math.max(0, Math.min(0.99, momentumBeta));
    return (s) => {
      const [gx, gy] = surface.grad(s.x, s.y);
      const vx = beta * (s.vx ?? 0) - safeLr * gx;
      const vy = beta * (s.vy ?? 0) - safeLr * gy;
      return { ...s, x: s.x + vx, y: s.y + vy, vx, vy, t: (s.t ?? 0) + 1 };
    };
  }

  if (optimizer === 'rmsprop') {
    const rho = 0.9;
    const eps = 1e-8;
    return (s) => {
      const [gx, gy] = surface.grad(s.x, s.y);
      const sx = rho * (s.sx ?? 0) + (1 - rho) * gx * gx;
      const sy = rho * (s.sy ?? 0) + (1 - rho) * gy * gy;
      return {
        ...s,
        x: s.x - (safeLr * gx) / (Math.sqrt(sx) + eps),
        y: s.y - (safeLr * gy) / (Math.sqrt(sy) + eps),
        sx,
        sy,
        t: (s.t ?? 0) + 1,
      };
    };
  }

  // Adam with standard bias correction
  const b1 = 0.9;
  const b2 = 0.999;
  const eps = 1e-8;
  return (s) => {
    const [gx, gy] = surface.grad(s.x, s.y);
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
      x: s.x - (safeLr * mxHat) / (Math.sqrt(vxHat) + eps),
      y: s.y - (safeLr * myHat) / (Math.sqrt(vyHat) + eps),
      mx,
      my,
      vx,
      vy,
      t,
    };
  };
}

export function createInitialRecord(surfaceId: SurfaceId, start: Point2D): OptStepRecord {
  const surface = SURFACES[surfaceId];
  const loss = surface.loss(start.x, start.y);
  const [gx, gy] = surface.grad(start.x, start.y);
  const gradNorm = Math.hypot(gx, gy);
  return {
    step: 0,
    x: start.x,
    y: start.y,
    loss,
    gx,
    gy,
    gradNorm,
    dx: 0,
    dy: 0,
    stepSize: 0,
    oscillating: false,
    diverged: false,
    converged: loss < 0.01 && gradNorm < 0.15,
  };
}

export function buildStepRecord(
  nextState: OptState,
  prevRecord: OptStepRecord,
  surfaceId: SurfaceId,
): OptStepRecord {
  const surface = SURFACES[surfaceId];
  const x = nextState.x;
  const y = nextState.y;
  const loss = surface.loss(x, y);
  const [gx, gy] = surface.grad(x, y);
  const gradNorm = Math.hypot(gx, gy);
  const dx = x - prevRecord.x;
  const dy = y - prevRecord.y;
  const stepSize = Math.hypot(dx, dy);
  const diverged = !Number.isFinite(loss) || Math.abs(x) > 25 || Math.abs(y) > 25;
  const oscillating = !diverged && prevRecord.step > 0 && prevRecord.gy * gy < -1e-4 && Math.abs(dy) > 0.08;
  const converged = !diverged && loss < 0.01 && gradNorm < 0.15;

  return {
    step: prevRecord.step + 1,
    x,
    y,
    loss,
    gx,
    gy,
    gradNorm,
    dx,
    dy,
    stepSize,
    oscillating,
    diverged,
    converged,
  };
}

export function runTrajectory({
  optimizer,
  lr,
  start,
  surface = 'ravine',
  steps = 60,
  momentumBeta = 0.85,
}: {
  optimizer: Optimizer;
  lr: number;
  start: Point2D;
  surface?: SurfaceId;
  steps?: number;
  momentumBeta?: number;
}): OptStepRecord[] {
  const stepper = makeStepper(optimizer, lr, surface, momentumBeta);
  let state: OptState = { x: start.x, y: start.y };
  const initial = createInitialRecord(surface, start);
  const records: OptStepRecord[] = [initial];

  for (let i = 0; i < steps; i++) {
    const prev = records[records.length - 1];
    if (prev.diverged) break;
    state = stepper(state);
    const rec = buildStepRecord(state, prev, surface);
    records.push(rec);
  }
  return records;
}

export type ContourSegment = [[number, number], [number, number]];

/**
 * Computes line segments along `loss(x, y) = level` using marching squares so
 * even non-elliptical surfaces (like the double-well saddle) draw true isolines.
 */
export function computeContourSegments(
  surfaceId: SurfaceId,
  level: number,
  cols = 42,
  rows = 26,
): ContourSegment[] {
  const surface = SURFACES[surfaceId];
  const [xMin, xMax] = X_DOMAIN;
  const [yMin, yMax] = Y_DOMAIN;
  const dx = (xMax - xMin) / cols;
  const dy = (yMax - yMin) / rows;
  const segs: ContourSegment[] = [];

  const interp = (a: number, b: number, va: number, vb: number) => {
    const denom = vb - va;
    if (Math.abs(denom) < 1e-9) return (a + b) * 0.5;
    const t = Math.max(0, Math.min(1, (level - va) / denom));
    return a + t * (b - a);
  };

  for (let r = 0; r < rows; r++) {
    const y0 = yMin + r * dy;
    const y1 = y0 + dy;
    for (let c = 0; c < cols; c++) {
      const x0 = xMin + c * dx;
      const x1 = x0 + dx;
      const v00 = surface.loss(x0, y0);
      const v10 = surface.loss(x1, y0);
      const v11 = surface.loss(x1, y1);
      const v01 = surface.loss(x0, y1);

      const hits: [number, number][] = [];
      if ((v00 >= level) !== (v10 >= level)) hits.push([interp(x0, x1, v00, v10), y0]);
      if ((v10 >= level) !== (v11 >= level)) hits.push([x1, interp(y0, y1, v10, v11)]);
      if ((v11 >= level) !== (v01 >= level)) hits.push([interp(x1, x0, v11, v01), y1]);
      if ((v01 >= level) !== (v00 >= level)) hits.push([x0, interp(y1, y0, v01, v00)]);

      if (hits.length === 2) {
        segs.push([hits[0], hits[1]]);
      } else if (hits.length === 4) {
        segs.push([hits[0], hits[1]], [hits[2], hits[3]]);
      }
    }
  }
  return segs;
}

/**
 * Generates one plain-English sentence explaining what just happened on this
 * optimization step and why, citing the exact live numbers.
 */
export function explainOptimizationStep(
  current: OptStepRecord,
  prev: OptStepRecord | undefined,
  optimizer: Optimizer,
  lr: number,
  surfaceId: SurfaceId,
): string {
  const name = OPTIMIZER_META[optimizer].label;
  if (current.diverged) {
    return `${name} exploded off the map at step ${current.step} because η = ${lr.toFixed(2)} overshot the steep wall — lower η or switch to Adam.`;
  }
  if (current.step === 0 || !prev) {
    const steepNote =
      surfaceId === 'ravine'
        ? `steep wall ∂L/∂w₂ = ${current.gy.toFixed(2)} vs flat ∂L/∂w₁ = ${current.gx.toFixed(2)}`
        : surfaceId === 'saddle'
          ? `near the saddle ridge where gradient is (${current.gx.toFixed(2)}, ${current.gy.toFixed(2)})`
          : `gradient points uphill (${current.gx.toFixed(2)}, ${current.gy.toFixed(2)}), so we step the opposite way`;
    return `Start at (${current.x.toFixed(2)}, ${current.y.toFixed(2)}), loss ${current.loss.toFixed(2)}: ${steepNote}.`;
  }
  if (current.converged) {
    return `${name} reached the valley floor at step ${current.step}: loss = ${current.loss.toFixed(4)}, remaining gradient |∇L| = ${current.gradNorm.toFixed(3)}.`;
  }
  if (current.oscillating) {
    return `${name} bounced across the steep w₂ wall (${prev.y.toFixed(2)} → ${current.y.toFixed(2)}) because |∂L/∂w₂| = ${Math.abs(prev.gy).toFixed(2)} × η=${lr.toFixed(2)} jumped past zero.`;
  }
  if (optimizer === 'adam' || optimizer === 'rmsprop') {
    return `${name} scaled each axis separately at step ${current.step}: took Δw₁=${current.dx >= 0 ? '+' : ''}${current.dx.toFixed(2)} along the flat axis, loss ${prev.loss.toFixed(2)} → ${current.loss.toFixed(2)}.`;
  }
  if (optimizer === 'momentum') {
    return `Momentum carried speed forward at step ${current.step} (Δ = ${current.dx >= 0 ? '+' : ''}${current.dx.toFixed(2)}, ${current.dy >= 0 ? '+' : ''}${current.dy.toFixed(2)}), dropping loss from ${prev.loss.toFixed(2)} to ${current.loss.toFixed(2)}.`;
  }
  return `SGD stepped opposite gradient by −η·∇L = (${current.dx >= 0 ? '+' : ''}${current.dx.toFixed(2)}, ${current.dy >= 0 ? '+' : ''}${current.dy.toFixed(2)}), loss ${prev.loss.toFixed(2)} → ${current.loss.toFixed(2)}.`;
}
