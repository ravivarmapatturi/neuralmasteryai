import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../theme/vizTokens';
import {
  B_DOMAIN,
  W_DOMAIN,
  X_DOMAIN,
  generateData,
  runLogisticGradientDescent,
  sigmoid,
  statsFor,
  type LossType,
} from './lib/logreg';
import { usePlaygroundPlayback } from './diagrams/usePlaygroundPlayback';
import { PillSelect, Slider, StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton } from './primitives';

type Mode = 'fit' | 'gd';
const STEPS = 80;
const PLOT = { left: 48, top: 28, width: 430, height: 270 } as const;
const LOSS = { left: 540, top: 28, width: 188, height: 270 } as const;

function numberStyle(t: ReturnType<typeof useVizTokens>): React.CSSProperties {
  return { width: '100%', minHeight: 36, boxSizing: 'border-box', padding: '5px 7px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, fontFamily: FONT_FAMILY, fontSize: 15, fontVariantNumeric: 'tabular-nums' };
}

export default function LogisticRegressionStudio({ compact = false }: { compact?: boolean }) {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('gd');
  const [seed, setSeed] = useState(3);
  const [noise, setNoise] = useState(4);
  const [manualW, setManualW] = useState(0.3);
  const [manualB, setManualB] = useState(-1);
  const [startW, setStartW] = useState(-1.5);
  const [startB, setStartB] = useState(8);
  const [lossType, setLossType] = useState<LossType>('ce');
  const [learningRate, setLearningRate] = useState(0.05);
  const [prediction, setPrediction] = useState<LossType>('ce');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);

  const points = useMemo(() => generateData(24, noise, seed), [noise, seed]);
  const trace = useMemo(() => runLogisticGradientDescent(lossType, points, { w: startW, b: startB }, learningRate, STEPS), [lossType, points, startW, startB, learningRate]);
  const playback = usePlaygroundPlayback(mode === 'gd' ? trace.length : 1, 130);
  const training = trace[Math.min(playback.step, trace.length - 1)];
  const manualStats = useMemo(() => statsFor(lossType, points, manualW, manualB), [lossType, points, manualW, manualB]);
  const current = mode === 'gd'
    ? training
    : { step: 0, w: manualW, b: manualB, dw: manualStats.dw, db: manualStats.db, loss: manualStats.loss, accuracy: manualStats.accuracy };
  const divergent = !Number.isFinite(current.loss) || current.loss > 1e5;
  const xMap = (x: number) => PLOT.left + ((x - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0])) * PLOT.width;
  const yMap = (probability: number) => PLOT.top + PLOT.height - probability * PLOT.height;
  const finiteLosses = trace.map((step) => step.loss).filter(Number.isFinite).map((value) => Math.min(value, 5));
  const maxLoss = Math.max(0.7, ...finiteLosses);
  const lossX = (step: number) => LOSS.left + (step / Math.max(1, trace.length - 1)) * LOSS.width;
  const lossY = (loss: number) => LOSS.top + LOSS.height - (Math.min(loss, maxLoss) / maxLoss) * LOSS.height;
  const lossPoints = trace.slice(0, mode === 'gd' ? playback.step + 1 : 1).map((step) => `${lossX(step.step)},${lossY(step.loss)}`).join(' ');
  const curve = Array.from({ length: 81 }, (_, index) => {
    const x = X_DOMAIN[0] + (index / 80) * (X_DOMAIN[1] - X_DOMAIN[0]);
    return `${xMap(x)},${yMap(sigmoid(current.w * x + current.b))}`;
  }).join(' ');
  const boundaryX = Math.abs(current.w) > 1e-9 ? -current.b / current.w : null;
  const first = points[0];
  const firstProbability = sigmoid(current.w * first.x + current.b);
  const firstLoss = lossType === 'ce'
    ? -(first.label * Math.log(firstProbability + 1e-9) + (1 - first.label) * Math.log(1 - firstProbability + 1e-9))
    : (firstProbability - first.label) ** 2;
  const resetTrace = () => { playback.setStep(0); setPredictionResult(null); };
  const setLoss = (next: LossType) => { setLossType(next); resetTrace(); };

  return (
    <VisualizationContainer title="Logistic regression studio" footer={compact ? undefined : 'The sigmoid probabilities, classification boundary, cross-entropy or squared loss, gradients, accuracy, and training path are recomputed from the visible data and controls.'}>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="Turn a score into a probability, then learn where two classes separate"
            description="Logistic regression predicts a probability between 0 and 1. It learns the S-shaped curve that makes observed pass/fail labels least surprising."
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
            <PillSelect<Mode> label="Mode (who moves the curve)" value={mode} onChange={(value) => { setMode(value as Mode); resetTrace(); }} options={[{ value: 'fit', label: 'Fit it yourself' }, { value: 'gd', label: 'Gradient descent' }]} />
            <div style={{ flex: '1 1 170px' }}><Slider label="Label noise (how mixed the classes are)" value={noise} onChange={(value) => { setNoise(value); resetTrace(); }} min={0} max={10} step={1} /></div>
            <VizButton variant="secondary" onClick={() => { setSeed((value) => value + 1); resetTrace(); }}>New dataset</VizButton>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 8 }}>
            {mode === 'fit' ? (
              <>
                <label style={{ fontSize: 15 }}><span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Slope w (curve direction)</span><input aria-label="Logistic slope w" type="number" min={W_DOMAIN[0]} max={W_DOMAIN[1]} step={0.05} value={manualW} onChange={(event) => setManualW(Math.max(W_DOMAIN[0], Math.min(W_DOMAIN[1], Number(event.target.value) || 0)))} style={numberStyle(t)} /></label>
                <label style={{ fontSize: 15 }}><span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Intercept b (horizontal shift)</span><input aria-label="Logistic intercept b" type="number" min={B_DOMAIN[0]} max={B_DOMAIN[1]} step={0.2} value={manualB} onChange={(event) => setManualB(Math.max(B_DOMAIN[0], Math.min(B_DOMAIN[1], Number(event.target.value) || 0)))} style={numberStyle(t)} /></label>
              </>
            ) : (
              <>
                <label style={{ fontSize: 15 }}><span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Starting slope w₀</span><input aria-label="Starting logistic slope" type="number" min={W_DOMAIN[0]} max={W_DOMAIN[1]} step={0.05} value={startW} onChange={(event) => { setStartW(Math.max(W_DOMAIN[0], Math.min(W_DOMAIN[1], Number(event.target.value) || 0))); resetTrace(); }} style={numberStyle(t)} /></label>
                <label style={{ fontSize: 15 }}><span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Starting intercept b₀</span><input aria-label="Starting logistic intercept" type="number" min={B_DOMAIN[0]} max={B_DOMAIN[1]} step={0.2} value={startB} onChange={(event) => { setStartB(Math.max(B_DOMAIN[0], Math.min(B_DOMAIN[1], Number(event.target.value) || 0))); resetTrace(); }} style={numberStyle(t)} /></label>
                <div style={{ minWidth: 160 }}><Slider label="Learning rate η (step size)" value={learningRate} onChange={(value) => { setLearningRate(value); resetTrace(); }} min={0.005} max={0.3} step={0.005} format={(value) => value.toFixed(3)} /></div>
              </>
            )}
            <PillSelect<LossType> label="Loss (how wrong probabilities are scored)" value={lossType} onChange={(value) => setLoss(value as LossType)} options={[{ value: 'ce', label: 'Cross-entropy' }, { value: 'mse', label: 'Squared error (naive)' }]} />
          </div>
        </>
      )}

      <svg width="100%" viewBox="0 0 760 340" role="img" aria-label={`Logistic curve with slope ${current.w.toFixed(2)}, intercept ${current.b.toFixed(2)}, loss ${current.loss.toFixed(3)}, and accuracy ${(current.accuracy * 100).toFixed(0)} percent`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs><clipPath id="logistic-data-clip"><rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} /></clipPath><clipPath id="logistic-loss-clip"><rect x={LOSS.left} y={LOSS.top} width={LOSS.width} height={LOSS.height} /></clipPath></defs>
        <text x={PLOT.left} y={18} fontSize={16} fontWeight={700} fill={t.textPrimary}>Observed classes and predicted probability</text>
        <rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} fill={t.background} stroke={t.border} />
        <g clipPath="url(#logistic-data-clip)">
          <line x1={PLOT.left} y1={yMap(0.5)} x2={PLOT.left + PLOT.width} y2={yMap(0.5)} stroke={t.border} strokeWidth={1.3} strokeDasharray="5 4" />
          {boundaryX !== null && boundaryX >= X_DOMAIN[0] && boundaryX <= X_DOMAIN[1] && <line x1={xMap(boundaryX)} y1={PLOT.top} x2={xMap(boundaryX)} y2={PLOT.top + PLOT.height} stroke={t.accentWarn} strokeWidth={2} strokeDasharray="6 4" />}
          {points.map((point, index) => {
            const probability = sigmoid(current.w * point.x + current.b);
            return <line key={`error-${index}`} x1={xMap(point.x)} y1={yMap(point.label)} x2={xMap(point.x)} y2={yMap(probability)} stroke={t.border} strokeWidth={1.1} />;
          })}
          <polyline points={curve} fill="none" stroke={t.accentSecondary} strokeWidth={3} />
          {points.map((point, index) => <circle key={`class-${index}`} cx={xMap(point.x)} cy={yMap(point.label)} r={5} fill={point.label === 1 ? t.accentPrimary : t.accentDanger} stroke={t.background} strokeWidth={1.5} />)}
        </g>
        <line x1={PLOT.left} y1={PLOT.top + PLOT.height} x2={PLOT.left + PLOT.width} y2={PLOT.top + PLOT.height} stroke={t.border} strokeWidth={1.5} />
        <line x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={PLOT.top + PLOT.height} stroke={t.border} strokeWidth={1.5} />
        <text x={PLOT.left + PLOT.width / 2} y={330} textAnchor="middle" fontSize={15} fill={t.textSecondary}>study hours x →</text>
        <text x={6} y={PLOT.top + 14} fontSize={15} fill={t.textSecondary}>probability p̂ ↑</text>
        <text x={PLOT.left - 8} y={yMap(1) + 5} textAnchor="end" fontSize={14} fill={t.textSecondary}>1</text><text x={PLOT.left - 8} y={yMap(0.5) + 5} textAnchor="end" fontSize={14} fill={t.textSecondary}>0.5</text><text x={PLOT.left - 8} y={yMap(0) + 5} textAnchor="end" fontSize={14} fill={t.textSecondary}>0</text>

        <text x={LOSS.left} y={18} fontSize={16} fontWeight={700} fill={t.textPrimary}>{lossType === 'ce' ? 'Cross-entropy' : 'Squared error'} after each step</text>
        <rect x={LOSS.left} y={LOSS.top} width={LOSS.width} height={LOSS.height} fill={t.background} stroke={t.border} />
        <g clipPath="url(#logistic-loss-clip)">{lossPoints && <polyline points={lossPoints} fill="none" stroke={t.accentPurple} strokeWidth={2.8} strokeLinejoin="round" />}<circle cx={lossX(current.step)} cy={lossY(current.loss)} r={5} fill={t.accentPurple} /></g>
        <text x={LOSS.left - 8} y={LOSS.top + 8} textAnchor="end" fontSize={14} fill={t.textSecondary}>{maxLoss.toFixed(1)}</text><text x={LOSS.left - 8} y={LOSS.top + LOSS.height} textAnchor="end" fontSize={14} fill={t.textSecondary}>0</text>
        <text x={LOSS.left + LOSS.width / 2} y={330} textAnchor="middle" fontSize={15} fill={t.textSecondary}>training step →</text>
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Plot colours">
        <span style={{ color: t.accentDanger }}>● Class 0: fail</span><span style={{ color: t.accentPrimary }}>● Class 1: pass</span><span style={{ color: t.accentSecondary }}>━ Predicted probability p̂</span><span style={{ color: t.accentWarn }}>┊ Boundary p̂ = 0.5</span><span style={{ color: t.accentPurple }}>━ Loss</span>
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={lossType === 'ce' ? 'Cross-entropy loss' : 'Squared error loss'} latex={lossType === 'ce' ? String.raw`L=-\frac1n\sum_i[y_i\log\hat p_i+(1-y_i)\log(1-\hat p_i)]` : String.raw`L=\frac1n\sum_i(y_i-\hat p_i)^2`} color="yellow" tilt={-1}><p>Loss = {current.loss.toFixed(4)}; accuracy = {(current.accuracy * 100).toFixed(0)}%.</p></StickyNote>
          <StickyNote title={`Step ${current.step}`} color="blue" tilt={1} live><p>{divergent ? 'The updates diverged. Lower η and reset.' : `The gradient is (${current.dw.toFixed(3)}, ${current.db.toFixed(3)}), so the next step moves opposite it.`}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Probability from a linear score" latex={String.raw`\hat p=\sigma(wx+b)=\frac{1}{1+e^{-(wx+b)}}`} color="yellow" tilt={-1}><p>p̂ (“p-hat”) is the predicted chance of class 1; w is slope and b is intercept.</p></StickyNote>
            <StickyNote title="Cross-entropy" latex={String.raw`L_{CE}=-\frac1n\sum_i[y_i\log\hat p_i+(1-y_i)\log(1-\hat p_i)]`} color="pink" tilt={1} active={lossType === 'ce'} onSelect={() => setLoss('ce')}><p>Confident wrong probabilities receive a strong penalty and gradient.</p></StickyNote>
            <StickyNote title="Squared error on sigmoid" latex={String.raw`L_{MSE}=\frac1n\sum_i(y_i-\hat p_i)^2`} color="orange" tilt={-1} active={lossType === 'mse'} onSelect={() => setLoss('mse')}><p>The sigmoid slope multiplies its gradient and can make a confidently wrong model barely move.</p></StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={1}><p style={{ fontVariantNumeric: 'tabular-nums' }}>For the first student, x = {first.x.toFixed(2)}, y = {first.label}, p̂ = {firstProbability.toFixed(3)}, so this student's {lossType === 'ce' ? 'cross-entropy' : 'squared-error'} contribution is {firstLoss.toFixed(3)}. Mean loss = {current.loss.toFixed(4)}.</p></StickyNote>
            <StickyNote title={`What just happened · step ${current.step}`} color="blue" tilt={-1} live><p>{mode === 'fit' ? `You set w = ${current.w.toFixed(2)} and b = ${current.b.toFixed(2)}; every probability, class, and loss recomputed.` : divergent ? 'The learning rate made the parameters diverge. Lower η and reset.' : `dL/dw = ${current.dw.toFixed(3)} and dL/db = ${current.db.toFixed(3)}; the curve moved to w = ${current.w.toFixed(3)}, b = ${current.b.toFixed(3)}, with ${(current.accuracy * 100).toFixed(0)}% accuracy.`}</p></StickyNote>
          </StickyRow>
          {mode === 'gd' && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}><VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton><VizButton variant="secondary" onClick={playback.next}>Step →</VizButton><VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton></div>}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${t.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 15 }}>
            <strong style={{ color: t.accentWarn }}>Predict first:</strong><span>From the same confidently wrong start, which loss keeps a stronger gradient?</span>
            <select aria-label="Loss prediction" value={prediction} onChange={(event) => { setPrediction(event.target.value as LossType); setPredictionResult(null); }} style={{ minHeight: 36, font: 'inherit', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary }}><option value="ce">Cross-entropy</option><option value="mse">Squared error</option></select>
            <VizButton variant="secondary" onClick={() => { setMode('gd'); setLossType(prediction); resetTrace(); setPredictionResult(prediction === 'ce'); }}>Run that loss</VizButton>
            {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>{predictionResult ? 'Correct: cross-entropy removes the extra sigmoid-slope factor from its gradient.' : 'Squared error is multiplied by p̂(1−p̂), which is tiny when the sigmoid is saturated.'}</span>}
          </div>
        </>
      )}
    </VisualizationContainer>
  );
}
