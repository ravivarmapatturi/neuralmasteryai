import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  usePrefersReducedMotion,
  useVizVisible,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from './primitives';
import { blendColor, hexToRgb } from './lib/colorBlend';
import { DATASETS } from './lib/datasets';
import { MLP, type HiddenActivation } from './lib/mlp';
import { PredictChallenge } from './diagrams/playgroundPrimitives';
import { useResponsiveHostWidth } from './diagrams/useStepPlayback';

type DatasetKey = keyof typeof DATASETS;

const DATASET_OPTIONS = (Object.entries(DATASETS) as [DatasetKey, (typeof DATASETS)[DatasetKey]][]).map(
  ([value, d]) => ({ value, label: d.label }),
);

const ACTIVATION_OPTIONS: { value: HiddenActivation; label: string }[] = [
  { value: 'relu', label: 'ReLU (creases)' },
  { value: 'tanh', label: 'tanh (smooth)' },
  { value: 'linear', label: 'Linear (flat)' },
];

const ACTIVATION_LATEX: Record<HiddenActivation, string> = {
  relu: String.raw`\text{ReLU}(z) = \max(0, z)`,
  tanh: String.raw`\tanh(z) = \frac{e^z - e^{-z}}{e^z + e^{-z}}`,
  linear: String.raw`f(z) = z \quad (\text{no bend})`,
};

const ACTIVATION_EXPLAIN: Record<HiddenActivation, string> = {
  relu: 'Folds space along sharp straight creases; zero below 0.',
  tanh: 'Bends smoothly between −1 and +1; great for circles and spirals.',
  linear: 'No bend at all: stacking linear layers stays one straight line.',
};

const PREDICT_OPTIONS = [
  'Only a single straight line — accuracy stays stuck near 50%',
  'A curved X-shape separating all four corners cleanly',
  'Four separate circles around each cluster',
] as const;

const DOMAIN = 1.25;
const GRID_N = 20;
const MAX_AUTO_EPOCHS = 120;
const EPOCHS_PER_TICK = 2;

function NeuralNetworkPlaygroundInner({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const visible = useVizVisible() && outerVisible;
  const clipNetId = useId();
  const clipLossId = useId();
  const clipGridId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [dataset, setDataset] = useState<DatasetKey>('xor');
  const [activation, setActivation] = useState<HiddenActivation>('tanh');
  const [layers, setLayers] = useState<number>(2);
  const [neurons, setNeurons] = useState<number>(5);
  const [lr, setLr] = useState<number>(1.2);
  const [l2, setL2] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(!reducedMotion);
  const [autoLoop, setAutoLoop] = useState<boolean>(!reducedMotion);
  const [prediction, setPrediction] = useState<number | null>(null);

  const data = useMemo(() => DATASETS[dataset].generate(140, 7), [dataset]);
  const shape = useMemo(() => [2, ...Array(layers).fill(neurons), 1], [layers, neurons]);

  const initialModel = useMemo(() => {
    const mlp = new MLP([2, 5, 5, 1], 'tanh', 42);
    if (!reducedMotion) {
      const ev = mlp.evaluate(data.X, data.y, 0);
      return { mlp, epoch: 0, loss: ev.loss, accuracy: ev.accuracy, history: [ev.loss] };
    }
    const history: number[] = [];
    for (let i = 0; i < 60; i++) history.push(mlp.step(data.X, data.y, 1.2, 0));
    const ev = mlp.evaluate(data.X, data.y, 0);
    return { mlp, epoch: 60, loss: ev.loss, accuracy: ev.accuracy, history };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const netRef = useRef<MLP>(initialModel.mlp);
  const [epoch, setEpoch] = useState<number>(initialModel.epoch);
  const [lossHistory, setLossHistory] = useState<number[]>(initialModel.history);
  const [accuracy, setAccuracy] = useState<number>(initialModel.accuracy);
  const [loss, setLoss] = useState<number>(initialModel.loss);

  const resetNetwork = (
    nextDataset: DatasetKey,
    nextAct: HiddenActivation,
    nextLayers: number,
    nextNeurons: number,
    nextLr: number,
    nextL2: number,
    shouldPlay: boolean,
  ) => {
    const d = DATASETS[nextDataset].generate(140, 7);
    const nextShape = [2, ...Array(nextLayers).fill(nextNeurons), 1];
    const mlp = new MLP(nextShape, nextAct, 42);
    if (reducedMotion) {
      const hist: number[] = [];
      for (let i = 0; i < 60; i++) {
        hist.push(mlp.step(d.X, d.y, nextLr, nextL2));
      }
      const ev = mlp.evaluate(d.X, d.y, nextL2);
      netRef.current = mlp;
      setEpoch(60);
      setLoss(ev.loss);
      setAccuracy(ev.accuracy);
      setLossHistory(hist);
      setPlaying(false);
    } else {
      const ev = mlp.evaluate(d.X, d.y, nextL2);
      netRef.current = mlp;
      setEpoch(0);
      setLoss(ev.loss);
      setAccuracy(ev.accuracy);
      setLossHistory([ev.loss]);
      setPlaying(shouldPlay);
    }
  };

  useEffect(() => {
    if (!reducedMotion) return;
    setPlaying(false);
    setAutoLoop(false);
    resetNetwork(dataset, activation, layers, neurons, lr, l2, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const stepEpochs = (count = EPOCHS_PER_TICK) => {
    const mlp = netRef.current;
    let latestLoss = loss;
    const added: number[] = [];
    for (let i = 0; i < count; i++) {
      latestLoss = mlp.step(data.X, data.y, lr, l2);
      added.push(latestLoss);
    }
    const ev = mlp.evaluate(data.X, data.y, l2);
    setEpoch((e) => e + count);
    setLoss(ev.loss);
    setAccuracy(ev.accuracy);
    setLossHistory((h) => [...h, ...added].slice(-120));
  };

  const finishedAuto = epoch >= MAX_AUTO_EPOCHS;

  useEffect(() => {
    if (!playing || !visible || reducedMotion) return undefined;
    if (finishedAuto) {
      if (!autoLoop) {
        setPlaying(false);
        return undefined;
      }
      const restartId = window.setTimeout(() => {
        resetNetwork(dataset, activation, layers, neurons, lr, l2, true);
      }, 1500);
      return () => window.clearTimeout(restartId);
    }
    const id = window.setInterval(() => stepEpochs(EPOCHS_PER_TICK), 95);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, visible, reducedMotion, finishedAuto, autoLoop, dataset, activation, layers, neurons, lr, l2, data]);

  // Compute SVG heatmap cells + probe point prediction from current netRef
  const class0Color = t.accentDanger;
  const class1Color = t.accentPrimary;
  const posWeightColor = t.accentSecondary;
  const negWeightColor = t.accentDanger;

  const rgb0 = hexToRgb(class0Color);
  const rgb1 = hexToRgb(class1Color);

  const heatmapCells = useMemo(() => {
    const net = netRef.current;
    const cells: { gx: number; gy: number; fill: string }[] = [];
    for (let gx = 0; gx < GRID_N; gx++) {
      for (let gy = 0; gy < GRID_N; gy++) {
        const x = ((gx + 0.5) / GRID_N) * (2 * DOMAIN) - DOMAIN;
        const y = DOMAIN - ((gy + 0.5) / GRID_N) * (2 * DOMAIN);
        const p = net.predict([x, y]);
        cells.push({ gx, gy, fill: blendColor(rgb0, rgb1, p) });
      }
    }
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epoch, dataset, activation, layers, neurons, t]);

  const probePred = netRef.current.predict([0.5, 0.5]);

  const whatHappened = useMemo(() => {
    if (epoch === 0) {
      return `Started with random weights on ${DATASETS[dataset].label} (${activation} activation): accuracy is ${(accuracy * 100).toFixed(0)}% before training.`;
    }
    if (activation === 'linear') {
      return `Epoch ${epoch}: with Linear activation, every layer collapses to one straight cut — accuracy stays around ${(accuracy * 100).toFixed(0)}% on ${DATASETS[dataset].label}.`;
    }
    if (accuracy >= 0.92) {
      return `Epoch ${epoch}: the ${layers}-layer ${activation} network bent its boundary cleanly around ${DATASETS[dataset].label} (${(accuracy * 100).toFixed(0)}% accuracy, loss ${loss.toFixed(3)}).`;
    }
    return `Epoch ${epoch}: backprop nudged ${netRef.current.weights.flat(2).length} weights with step η = ${lr.toFixed(2)}; loss is ${loss.toFixed(3)} (${(accuracy * 100).toFixed(0)}% right).`;
  }, [epoch, dataset, activation, accuracy, layers, loss, lr]);

  const renderLeftPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const netY = 34;
    const netH = 152;
    const lossY = 214;
    const lossH = 104;
    const plotW = panelW - 20;

    const net = netRef.current;
    const layerCount = shape.length;
    const colPositions = shape.map((_, l) => plotX + 28 + (l / Math.max(1, layerCount - 1)) * (plotW - 56));
    const nodeCoords = shape.map((count, l) => {
      const topPad = 24;
      const avail = netH - 40;
      return Array.from({ length: count }, (_, idx) => {
        const y = count === 1 ? netY + topPad + avail / 2 : netY + topPad + (idx / (count - 1)) * avail;
        return { x: colPositions[l], y };
      });
    });

    const maxLoss = Math.max(0.8, ...lossHistory);
    const padL = 44;
    const padR = 14;
    const padT = 14;
    const padB = 26;
    const lW = plotW - padL - padR;
    const lH = lossH - padT - padB;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Network weights ({shape.join(' → ')})
        </text>
        <defs>
          <clipPath id={`${clipNetId}-${offsetX}`}>
            <rect x={plotX} y={netY} width={plotW} height={netH} />
          </clipPath>
          <clipPath id={`${clipLossId}-${offsetX}`}>
            <rect x={plotX} y={lossY} width={plotW} height={lossH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={netY} width={plotW} height={netH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />
        <g clipPath={`url(#${clipNetId}-${offsetX})`}>
          {net.weights.map((W, l) =>
            W.map((row, j) =>
              row.map((w, k) => {
                const p1 = nodeCoords[l]?.[k];
                const p2 = nodeCoords[l + 1]?.[j];
                if (!p1 || !p2) return null;
                return (
                  <line
                    key={`w-${l}-${j}-${k}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={w >= 0 ? posWeightColor : negWeightColor}
                    strokeWidth={Math.max(0.8, Math.min(3.5, Math.abs(w) * 1.1))}
                    strokeOpacity={Math.min(0.9, 0.25 + Math.abs(w) * 0.35)}
                  />
                );
              }),
            ),
          )}
          {nodeCoords.map((col, l) =>
            col.map((pt, idx) => (
              <circle
                key={`n-${l}-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={l === 0 || l === layerCount - 1 ? 8 : 6.5}
                fill={l === layerCount - 1 ? class1Color : l === 0 ? posWeightColor : t.surface}
                stroke={t.textPrimary}
                strokeWidth={1.5}
              />
            )),
          )}
          <text x={colPositions[0]} y={netY + netH - 6} textAnchor="middle" fontSize={14} fill={t.textSecondary}>x₁, x₂</text>
          <text x={colPositions[layerCount - 1]} y={netY + netH - 6} textAnchor="middle" fontSize={14} fill={class1Color}>ŷ</text>
        </g>

        <text x={offsetX + panelW / 2} y={lossY - 6} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Loss over epochs (lower is better)
        </text>
        <rect x={plotX} y={lossY} width={plotW} height={lossH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />
        <g clipPath={`url(#${clipLossId}-${offsetX})`}>
          <line x1={plotX + padL} y1={lossY + padT} x2={plotX + padL} y2={lossY + padT + lH} stroke={t.border} strokeWidth={1.2} />
          <line x1={plotX + padL} y1={lossY + padT + lH} x2={plotX + padL + lW} y2={lossY + padT + lH} stroke={t.border} strokeWidth={1.2} />
          <text x={plotX + padL - 6} y={lossY + padT + 10} textAnchor="end" fontSize={14} fill={t.textMuted}>{maxLoss.toFixed(1)}</text>
          <text x={plotX + padL - 6} y={lossY + padT + lH + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>0</text>
          <text x={plotX + padL + lW / 2} y={lossY + lossH - 4} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            Epoch {epoch} · Loss {loss.toFixed(3)}
          </text>
          {lossHistory.length > 1 && (
            <polyline
              points={lossHistory
                .map((lVal, i) => {
                  const px = plotX + padL + (i / Math.max(1, lossHistory.length - 1)) * lW;
                  const py = lossY + padT + lH - Math.min(1, lVal / maxLoss) * lH;
                  return `${px},${py}`;
                })
                .join(' ')}
              fill="none"
              stroke={posWeightColor}
              strokeWidth={2.4}
              strokeLinejoin="round"
            />
          )}
        </g>
      </g>
    );
  };

  const renderBoundaryPanel = (offsetX: number, panelW: number) => {
    const plotSize = Math.min(256, panelW - 88);
    const plotX = offsetX + Math.round((panelW - plotSize) / 2);
    const plotY = 34;
    const cell = plotSize / GRID_N;
    const toPx = (x: number, y: number): [number, number] => [
      plotX + ((x + DOMAIN) / (2 * DOMAIN)) * plotSize,
      plotY + ((DOMAIN - y) / (2 * DOMAIN)) * plotSize,
    ];

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          3. Learned decision boundary ({(accuracy * 100).toFixed(0)}% right)
        </text>
        <defs>
          <clipPath id={`${clipGridId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotSize} height={plotSize} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotSize} height={plotSize} fill={t.background} stroke={t.border} strokeWidth={1.2} rx={4} />

        <g clipPath={`url(#${clipGridId}-${offsetX})`}>
          {heatmapCells.map((c) => (
            <rect
              key={`${c.gx}-${c.gy}`}
              x={plotX + c.gx * cell}
              y={plotY + c.gy * cell}
              width={cell + 0.6}
              height={cell + 0.6}
              fill={c.fill}
              fillOpacity={0.48}
            />
          ))}
          {data.X.map(([x, y], idx) => {
            const [px, py] = toPx(x, y);
            return (
              <circle
                key={`pt-${idx}`}
                cx={px}
                cy={py}
                r={3.5}
                fill={data.y[idx] === 1 ? class1Color : class0Color}
                stroke={t.background}
                strokeWidth={1}
              />
            );
          })}
        </g>

        <text x={plotX} y={plotY + plotSize + 18} textAnchor="middle" fontSize={14} fill={t.textMuted}>−1</text>
        <text x={plotX + plotSize / 2} y={plotY + plotSize + 18} textAnchor="middle" fontSize={14} fill={t.textSecondary}>input x₁</text>
        <text x={plotX + plotSize} y={plotY + plotSize + 18} textAnchor="middle" fontSize={14} fill={t.textMuted}>+1</text>
        <text x={plotX - 8} y={plotY + 14} textAnchor="end" fontSize={14} fill={t.textMuted}>+1</text>
        <text x={plotX - 8} y={plotY + plotSize / 2 + 4} textAnchor="end" fontSize={14} fill={t.textSecondary}>x₂</text>
        <text x={plotX - 8} y={plotY + plotSize} textAnchor="end" fontSize={14} fill={t.textMuted}>−1</text>
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
                title="Why hidden layers and nonlinear bends separate tangled data"
                description="This solves how a network draws curved boundaries around clusters: each hidden neuron bends space, and backprop tunes every weight link to drop binary cross-entropy loss."
              />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton
                onClick={() => {
                  if (!playing && finishedAuto) {
                    resetNetwork(dataset, activation, layers, neurons, lr, l2, true);
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
                  stepEpochs(1);
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setAutoLoop(false);
                  resetNetwork(dataset, activation, layers, neurons, lr, l2, false);
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
            <PillSelect<DatasetKey>
              label="Dataset (2D shape to separate)"
              value={dataset}
              onChange={(next) => {
                const val = typeof next === 'function' ? next(dataset) : next;
                setDataset(val);
                setAutoLoop(false);
                setPrediction(null);
                resetNetwork(val, activation, layers, neurons, lr, l2, !reducedMotion);
              }}
              options={DATASET_OPTIONS}
            />
            <PillSelect<HiddenActivation>
              label="Activation (how neurons bend)"
              value={activation}
              onChange={(next) => {
                const val = typeof next === 'function' ? next(activation) : next;
                setActivation(val);
                setAutoLoop(false);
                setPrediction(null);
                resetNetwork(dataset, val, layers, neurons, lr, l2, !reducedMotion);
              }}
              options={ACTIVATION_OPTIONS}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <Slider
                label="Hidden layers"
                value={layers}
                onChange={(v) => {
                  setLayers(v);
                  setAutoLoop(false);
                  resetNetwork(dataset, activation, v, neurons, lr, l2, !reducedMotion);
                }}
                min={1}
                max={3}
                step={1}
              />
            </div>
            <div>
              <Slider
                label="Neurons / layer"
                value={neurons}
                onChange={(v) => {
                  setNeurons(v);
                  setAutoLoop(false);
                  resetNetwork(dataset, activation, layers, v, lr, l2, !reducedMotion);
                }}
                min={2}
                max={8}
                step={1}
              />
            </div>
            <div>
              <Slider
                label="Learning rate η"
                value={lr}
                onChange={(v) => {
                  setAutoLoop(false);
                  setLr(v);
                }}
                min={0.05}
                max={3.0}
                step={0.05}
                format={(v) => v.toFixed(2)}
              />
            </div>
            <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', fontWeight: 700, marginBottom: 4 }}>L2 penalty λ</span>
              <input
                aria-label="L2 regularization penalty"
                type="number"
                min={0}
                max={0.1}
                step={0.005}
                value={l2}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) {
                    setAutoLoop(false);
                    setL2(Math.max(0, Math.min(0.1, v)));
                  }
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
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', fontSize: 15 }} aria-label="Neural network colours">
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: class1Color, verticalAlign: 'middle', marginRight: 6 }} />Class 1 (y = 1)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: class0Color, verticalAlign: 'middle', marginRight: 6 }} />Class 0 (y = 0) / negative weight</span>
        <span><span style={{ display: 'inline-block', width: 18, height: 3, background: posWeightColor, verticalAlign: 'middle', marginRight: 6 }} />Positive weight / Loss curve</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 326"
            role="img"
            aria-label={`Neural network (${shape.join(' to ')}, ${activation}) on ${DATASETS[dataset].label}: epoch ${epoch}, accuracy ${(accuracy * 100).toFixed(0)}%`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderLeftPanel(0, 360)}
            {renderBoundaryPanel(370, 390)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 326" role="img" aria-label="Network architecture and loss curve" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderLeftPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 326" role="img" aria-label="2D decision boundary" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderBoundaryPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={`Activation · ${activation}`} latex={ACTIVATION_LATEX[activation]} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Epoch <strong>{epoch}</strong> · Accuracy <strong>{(accuracy * 100).toFixed(0)}%</strong> · Loss <strong>{loss.toFixed(3)}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step · epoch ${epoch}`} color="blue" tilt={1} live>
            <p>{whatHappened}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            {(['relu', 'tanh', 'linear'] as HiddenActivation[]).map((actKey, idx) => (
              <StickyNote
                key={actKey}
                title={actKey === 'relu' ? '1. ReLU activation' : actKey === 'tanh' ? '2. tanh activation' : '3. Linear (no bend)'}
                latex={ACTIVATION_LATEX[actKey]}
                color={idx === 0 ? 'yellow' : idx === 1 ? 'pink' : 'orange'}
                tilt={idx % 2 ? 1 : -1}
                active={activation === actKey}
                onSelect={() => {
                  setActivation(actKey);
                  setAutoLoop(false);
                  resetNetwork(dataset, actKey, layers, neurons, lr, l2, !reducedMotion);
                }}
              >
                <p style={{ textAlign: 'center' }}>{ACTIVATION_EXPLAIN[actKey]}</p>
              </StickyNote>
            ))}
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · epoch ${epoch}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Shape: <strong>{shape.join(' → ')}</strong> · Accuracy: <strong>{(accuracy * 100).toFixed(1)}%</strong> · Loss: <strong>{loss.toFixed(4)}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Sample input (0.5, 0.5) → ŷ = <strong>{probePred.toFixed(3)}</strong> (class {probePred >= 0.5 ? '1' : '0'})
              </p>
            </StickyNote>
            <StickyNote title={`Epoch ${epoch} · What just happened`} color="blue" tilt={-1} live>
              <p>{whatHappened}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="On XOR with Linear activation (even with 2 hidden layers of 5 neurons), what shape can the network learn?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Without a nonlinear bend, stacked matrix multiplies collapse to W_total·x + b_total — a single straight cut that can never separate opposite XOR corners."
            actionLabel="Run XOR + Linear now"
            onAction={() => {
              setDataset('xor');
              setActivation('linear');
              setAutoLoop(false);
              resetNetwork('xor', 'linear', layers, neurons, lr, l2, !reducedMotion);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function NeuralNetworkPlayground({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Neural Network Playground"
      footer="Exact hand-written forward pass, binary cross-entropy loss, and full-batch backpropagation running live in your browser (2D toy datasets, no external ML framework)."
    >
      <NeuralNetworkPlaygroundInner compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
