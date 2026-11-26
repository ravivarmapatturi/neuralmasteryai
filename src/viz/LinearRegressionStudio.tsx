import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../theme/vizTokens';
import {
  B_DOMAIN,
  OUTLIER_POINT,
  W_DOMAIN,
  X_DOMAIN,
  Y_DOMAIN,
  computeStats,
  generateData,
  runLinearGradientDescent,
} from './lib/linreg';
import { usePlaygroundPlayback } from './diagrams/usePlaygroundPlayback';
import { PillSelect, Slider, StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton } from './primitives';

type Mode = 'fit' | 'gd';
const STEPS = 70;
const PLOT = { left: 48, top: 28, width: 430, height: 270 } as const;
const LOSS = { left: 540, top: 28, width: 188, height: 270 } as const;

function numberStyle(t: ReturnType<typeof useVizTokens>): React.CSSProperties {
  return { width: '100%', minHeight: 36, boxSizing: 'border-box', padding: '5px 7px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, fontVariantNumeric: 'tabular-nums' };
}

export default function LinearRegressionStudio({ compact = false }: { compact?: boolean }) {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('gd');
  const [seed, setSeed] = useState(3);
  const [noise, setNoise] = useState(6);
  const [outlierOn, setOutlierOn] = useState(false);
  const [manualW, setManualW] = useState(3);
  const [manualB, setManualB] = useState(45);
  const [startW, setStartW] = useState(0);
  const [startB, setStartB] = useState(0);
  const [learningRate, setLearningRate] = useState(0.012);
  const [prediction, setPrediction] = useState('rises');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);

  const basePoints = useMemo(() => generateData(16, noise, seed), [noise, seed]);
  const points = useMemo(() => outlierOn ? [...basePoints, OUTLIER_POINT] : basePoints, [basePoints, outlierOn]);
  const trace = useMemo(() => runLinearGradientDescent(points, { w: startW, b: startB }, learningRate, STEPS), [points, startW, startB, learningRate]);
  const playback = usePlaygroundPlayback(mode === 'gd' ? trace.length : 1, 130);
  const training = trace[Math.min(playback.step, trace.length - 1)];
  const manualStats = useMemo(() => computeStats(points, manualW, manualB), [points, manualW, manualB]);
  const current = mode === 'gd'
    ? training
    : { step: 0, w: manualW, b: manualB, dw: manualStats.dw, db: manualStats.db, mse: manualStats.mse };
  const divergent = !Number.isFinite(current.mse) || current.mse > 1e8;

  const xMap = (x: number) => PLOT.left + ((x - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0])) * PLOT.width;
  const yMap = (y: number) => PLOT.top + PLOT.height - ((y - Y_DOMAIN[0]) / (Y_DOMAIN[1] - Y_DOMAIN[0])) * PLOT.height;
  const finiteLosses = trace.map((step) => step.mse).filter(Number.isFinite).map((value) => Math.min(value, 8000));
  const maxLoss = Math.max(1, ...finiteLosses);
  const lossX = (step: number) => LOSS.left + (step / Math.max(1, trace.length - 1)) * LOSS.width;
  const lossY = (loss: number) => LOSS.top + LOSS.height - (Math.min(loss, maxLoss) / maxLoss) * LOSS.height;
  const lossPoints = trace.slice(0, mode === 'gd' ? playback.step + 1 : 1).map((step) => `${lossX(step.step)},${lossY(step.mse)}`).join(' ');
  const first = points[0];
  const firstPrediction = current.w * first.x + current.b;
  const firstResidual = first.y - firstPrediction;
  const resetTrace = () => { playback.setStep(0); setPredictionResult(null); };

  return (
    <VisualizationContainer title="Linear regression studio" footer={compact ? undefined : 'The points are deterministic from the selected seed and noise. The line, residuals, MSE, gradients, and gradient-descent path are computed from those exact points.'}>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="Fit one line that makes many prediction mistakes as small as possible"
            description="Linear regression predicts a number with a straight line. The vertical gaps are residuals: the mistakes the model must reduce."
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
            <PillSelect<Mode> label="Mode (who moves the line)" value={mode} onChange={(value) => { setMode(value as Mode); resetTrace(); }} options={[{ value: 'fit', label: 'Fit it yourself' }, { value: 'gd', label: 'Gradient descent' }]} />
            <div style={{ flex: '1 1 170px' }}><Slider label="Noise (point scatter)" value={noise} onChange={(value) => { setNoise(value); resetTrace(); }} min={0} max={18} step={1} /></div>
            <PillSelect<string> label="Outlier (one unusual point)" value={outlierOn ? 'on' : 'off'} onChange={(value) => { setOutlierOn(value === 'on'); resetTrace(); }} options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]} />
            <VizButton variant="secondary" onClick={() => { setSeed((value) => value + 1); resetTrace(); }}>New dataset</VizButton>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 8 }}>
            {mode === 'fit' ? (
              <>
                <label style={{ fontSize: 15 }}><span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Slope w (rise per hour)</span><input aria-label="Slope w" type="number" min={W_DOMAIN[0]} max={W_DOMAIN[1]} step={0.1} value={manualW} onChange={(event) => setManualW(Math.max(W_DOMAIN[0], Math.min(W_DOMAIN[1], Number(event.target.value) || 0)))} style={numberStyle(t)} /></label>
                <label style={{ fontSize: 15 }}><span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Intercept b (score at 0 hours)</span><input aria-label="Intercept b" type="number" min={B_DOMAIN[0]} max={B_DOMAIN[1]} step={0.5} value={manualB} onChange={(event) => setManualB(Math.max(B_DOMAIN[0], Math.min(B_DOMAIN[1], Number(event.target.value) || 0)))} style={numberStyle(t)} /></label>
              </>
            ) : (
              <>
                <label style={{ fontSize: 15 }}><span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Starting slope w₀</span><input aria-label="Starting slope" type="number" min={W_DOMAIN[0]} max={W_DOMAIN[1]} step={0.1} value={startW} onChange={(event) => { setStartW(Math.max(W_DOMAIN[0], Math.min(W_DOMAIN[1], Number(event.target.value) || 0))); resetTrace(); }} style={numberStyle(t)} /></label>
                <label style={{ fontSize: 15 }}><span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Starting intercept b₀</span><input aria-label="Starting intercept" type="number" min={B_DOMAIN[0]} max={B_DOMAIN[1]} step={0.5} value={startB} onChange={(event) => { setStartB(Math.max(B_DOMAIN[0], Math.min(B_DOMAIN[1], Number(event.target.value) || 0))); resetTrace(); }} style={numberStyle(t)} /></label>
                <div style={{ minWidth: 160 }}><Slider label="Learning rate η (step size)" value={learningRate} onChange={(value) => { setLearningRate(value); resetTrace(); }} min={0.0005} max={0.03} step={0.0005} format={(value) => value.toFixed(4)} /></div>
              </>
            )}
          </div>
        </>
      )}

      <svg width="100%" viewBox="0 0 760 340" role="img" aria-label={`Study hours and scores with fitted line y hat equals ${current.w.toFixed(2)} x plus ${current.b.toFixed(2)}, MSE ${current.mse.toFixed(2)}`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs>
          <clipPath id="linear-data-clip"><rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} /></clipPath>
          <clipPath id="linear-loss-clip"><rect x={LOSS.left} y={LOSS.top} width={LOSS.width} height={LOSS.height} /></clipPath>
        </defs>
        <text x={PLOT.left} y={18} fontSize={16} fontWeight={700} fill={t.textPrimary}>Data and fitted line</text>
        <rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} fill={t.background} stroke={t.border} />
        <g clipPath="url(#linear-data-clip)">
          {points.map((point, index) => {
            const predictionY = current.w * point.x + current.b;
            const outlier = point === OUTLIER_POINT;
            return <line key={`residual-${index}`} x1={xMap(point.x)} y1={yMap(point.y)} x2={xMap(point.x)} y2={yMap(predictionY)} stroke={outlier ? t.accentDanger : t.accentWarn} strokeWidth={1.5} />;
          })}
          <line x1={xMap(X_DOMAIN[0])} y1={yMap(current.w * X_DOMAIN[0] + current.b)} x2={xMap(X_DOMAIN[1])} y2={yMap(current.w * X_DOMAIN[1] + current.b)} stroke={t.accentSecondary} strokeWidth={3} />
          {points.map((point, index) => <circle key={`point-${index}`} cx={xMap(point.x)} cy={yMap(point.y)} r={point === OUTLIER_POINT ? 6 : 5} fill={point === OUTLIER_POINT ? t.accentDanger : t.accentPrimary} stroke={t.background} strokeWidth={1.5} />)}
        </g>
        <line x1={PLOT.left} y1={PLOT.top + PLOT.height} x2={PLOT.left + PLOT.width} y2={PLOT.top + PLOT.height} stroke={t.border} strokeWidth={1.5} />
        <line x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={PLOT.top + PLOT.height} stroke={t.border} strokeWidth={1.5} />
        <text x={PLOT.left + PLOT.width / 2} y={330} textAnchor="middle" fontSize={15} fill={t.textSecondary}>study hours x →</text>
        <text x={8} y={PLOT.top + 14} fontSize={15} fill={t.textSecondary}>exam score y ↑</text>

        <text x={LOSS.left} y={18} fontSize={16} fontWeight={700} fill={t.textPrimary}>MSE after each step</text>
        <rect x={LOSS.left} y={LOSS.top} width={LOSS.width} height={LOSS.height} fill={t.background} stroke={t.border} />
        <g clipPath="url(#linear-loss-clip)">
          {lossPoints && <polyline points={lossPoints} fill="none" stroke={t.accentPurple} strokeWidth={2.8} strokeLinejoin="round" />}
          <circle cx={lossX(current.step)} cy={lossY(current.mse)} r={5} fill={t.accentPurple} />
        </g>
        <text x={LOSS.left - 8} y={LOSS.top + 8} textAnchor="end" fontSize={14} fill={t.textSecondary}>{maxLoss.toFixed(0)}</text>
        <text x={LOSS.left - 8} y={LOSS.top + LOSS.height} textAnchor="end" fontSize={14} fill={t.textSecondary}>0</text>
        <text x={LOSS.left + LOSS.width / 2} y={330} textAnchor="middle" fontSize={15} fill={t.textSecondary}>training step →</text>
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Plot colours">
        <span style={{ color: t.accentPrimary }}>● Observed data</span><span style={{ color: t.accentSecondary }}>━ Prediction line ŷ</span><span style={{ color: t.accentWarn }}>│ Residual y−ŷ</span><span style={{ color: t.accentPurple }}>━ Mean squared error</span>{outlierOn && <span style={{ color: t.accentDanger }}>● Outlier</span>}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Prediction line" latex={String.raw`\hat y=wx+b`} color="yellow" tilt={-1}><p>Here w = {current.w.toFixed(2)}, b = {current.b.toFixed(2)}, and MSE = {current.mse.toFixed(2)}.</p></StickyNote>
          <StickyNote title={`Step ${current.step}`} color="blue" tilt={1} live><p>{divergent ? 'The step size is too large, so the line is diverging.' : `The gradient is (${current.dw.toFixed(2)}, ${current.db.toFixed(2)}); the next step moves opposite it.`}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Prediction line" latex={String.raw`\hat y=wx+b`} color="yellow" tilt={-1}><p>ŷ (“y-hat”) is the predicted score; x is study hours; w is slope; b is the starting score.</p></StickyNote>
            <StickyNote title="Mean squared error" latex={String.raw`MSE=\frac{1}{n}\sum_{i=1}^{n}(y_i-\hat y_i)^2`} color="pink" tilt={1}><p>n is the number of students. Squaring makes a large miss count much more than a small miss.</p></StickyNote>
            <StickyNote title="Gradient descent update" latex={String.raw`w\leftarrow w-\eta\frac{\partial MSE}{\partial w},\quad b\leftarrow b-\eta\frac{\partial MSE}{\partial b}`} color="orange" tilt={-1}><p>η (“eta”) is the learning rate: how far the line moves each step.</p></StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={1}><p style={{ fontVariantNumeric: 'tabular-nums' }}>For the first point, x = {first.x.toFixed(2)}, y = {first.y.toFixed(2)}, ŷ = {firstPrediction.toFixed(2)}, so residual y−ŷ = {firstResidual.toFixed(2)}. Across all {points.length} points, MSE = {current.mse.toFixed(2)}.</p></StickyNote>
            <StickyNote title={`What just happened · step ${current.step}`} color="blue" tilt={-1} live><p>{mode === 'fit' ? `You set w = ${current.w.toFixed(2)} and b = ${current.b.toFixed(2)}; every residual and the MSE recomputed.` : divergent ? 'The update overshot so far that the loss exploded. Lower η and reset.' : `∂MSE/∂w = ${current.dw.toFixed(2)} and ∂MSE/∂b = ${current.db.toFixed(2)}; subtracting η times those slopes moved the line to w = ${current.w.toFixed(3)}, b = ${current.b.toFixed(3)}.`}</p></StickyNote>
          </StickyRow>
          {mode === 'gd' && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}><VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton><VizButton variant="secondary" onClick={playback.next}>Step →</VizButton><VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton></div>}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${t.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 15 }}>
            <strong style={{ color: t.accentWarn }}>Predict first:</strong><span>What happens to MSE when we add one large outlier?</span>
            <select aria-label="Outlier prediction" value={prediction} onChange={(event) => { setPrediction(event.target.value); setPredictionResult(null); }} style={{ minHeight: 36, font: 'inherit', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary }}><option value="rises">It rises sharply</option><option value="falls">It falls</option><option value="same">It stays the same</option></select>
            <VizButton variant="secondary" onClick={() => { setOutlierOn(true); resetTrace(); setPredictionResult(prediction === 'rises'); }}>Run with outlier</VizButton>
            {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>{predictionResult ? 'Correct: the large residual is squared, so it contributes heavily.' : 'The outlier creates one large residual; squaring it makes MSE rise.'}</span>}
          </div>
        </>
      )}
    </VisualizationContainer>
  );
}
