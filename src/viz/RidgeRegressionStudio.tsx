import { useMemo, useState } from 'react';
import { useVizTokens, SPACING, FONT_FAMILY, getFeatureColors } from '../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider, VizButton, ControlRow, useAutoCycle } from './primitives';
import RegularizationPathChart from './patterns/RegularizationPathChart';
import { FEATURE_NAMES, LAMBDA_MAX, generateData, ridgeSolve, mse, regularizationPath } from './lib/ridge';

export default function RidgeRegressionStudio() {
  const t = useVizTokens();
  const [seed, setSeed] = useState(5);
  const [correlation, setCorrelation] = useState(0.9);
  const [noise, setNoise] = useState(1.5);
  const lambdaCycle = useAutoCycle(Math.round(LAMBDA_MAX / 0.05) + 1, 100, 20);
  const lambda = lambdaCycle.value * 0.05;

  const rows = useMemo(() => generateData(40, correlation, noise, seed), [correlation, noise, seed]);
  const path = useMemo(() => regularizationPath(rows, 40), [rows]);
  const current = useMemo(() => ridgeSolve(rows, lambda), [rows, lambda]);
  const currentMse = useMemo(() => mse(rows, current.b, current.w), [rows, current]);

  const colors = getFeatureColors(t);

  return (
    <VisualizationContainer footer="A real 4-feature synthetic dataset (x1 and x2 deliberately correlated) and a real, from-scratch closed-form ridge solve -- w(lambda) = (X^TX + lambda*P)^-1 X^Ty -- recomputed live as you move lambda.">
      <VisualizationHeader eyebrow="Interactive" title="Ridge Regression Studio" />
      <ControlRow>
        <div style={{ minWidth: 200 }}>
          <Slider label="Correlation (x1, x2)" value={correlation} onChange={(value) => { lambdaCycle.stop(); setCorrelation(value); }} min={0} max={0.98} step={0.02} format={(v) => v.toFixed(2)} />
        </div>
        <div style={{ minWidth: 160 }}>
          <Slider label="Noise" value={noise} onChange={(value) => { lambdaCycle.stop(); setNoise(value); }} min={0.2} max={4} step={0.1} format={(v) => v.toFixed(1)} />
        </div>
        <VizButton variant="secondary" onClick={() => { lambdaCycle.stop(); setSeed((s) => s + 1); }}>
          New Dataset
        </VizButton>
      </ControlRow>
      <ControlRow>
        <div style={{ minWidth: 260, flex: 1 }}>
          <Slider label="λ (regularization strength)" value={lambda} onChange={(value) => lambdaCycle.pick(Math.round(value / 0.05))} min={0} max={LAMBDA_MAX} step={0.05} format={(v) => v.toFixed(2)} />
        </div>
      </ControlRow>

      <RegularizationPathChart path={path} lambda={lambda} lambdaMax={LAMBDA_MAX} currentW={current.w} featureNames={FEATURE_NAMES} colors={colors} t={t} />

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, marginTop: 6 }}>
        {FEATURE_NAMES.map((name, j) => (
          <span key={name} style={{ color: t.textSecondary }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: colors[j], marginRight: 4 }} />
            {name} = {current.w[j].toFixed(2)}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: SPACING.md, fontSize: 14, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: t.textPrimary }}>MSE {currentMse.toFixed(3)}</span>
        <span style={{ color: t.textSecondary }}>x1 + x2 = {(current.w[0] + current.w[1]).toFixed(2)} (true combined effect ≈ 6.0)</span>
      </div>
      <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, fontFamily: FONT_FAMILY }}>
        Drag λ to 0 (plain OLS) and push Correlation up -- watch x1 and x2 swing individually while their sum barely moves. Now increase λ and watch them settle toward each other, with MSE barely changing.
      </div>
    </VisualizationContainer>
  );
}
