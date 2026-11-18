import { useMemo, useState } from 'react';
import { useVizTokens, SPACING, getFeatureColors } from '../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider, VizButton, ControlRow, useAutoCycle } from './primitives';
import RegularizationPathChart from './patterns/RegularizationPathChart';
import { FEATURE_NAMES, LAMBDA_MAX, generateData, elasticNetSolve, mse, regularizationPath } from './lib/elasticNet';

export default function ElasticNetStudio() {
  const t = useVizTokens();
  const [seed, setSeed] = useState(5);
  const [correlation, setCorrelation] = useState(0.9);
  const lambdaCycle = useAutoCycle(Math.round(LAMBDA_MAX / 0.05) + 1, 100, 20);
  const lambda = lambdaCycle.value * 0.05;
  const [alpha, setAlpha] = useState(0.5);

  const rows = useMemo(() => generateData(40, correlation, 1.5, seed), [correlation, seed]);
  const path = useMemo(() => regularizationPath(rows, alpha, 40), [rows, alpha]);
  const current = useMemo(() => elasticNetSolve(rows, lambda, alpha), [rows, lambda, alpha]);
  const currentMse = useMemo(() => mse(rows, current.b, current.w), [rows, current]);
  const zeroCount = current.w.filter((w) => Math.abs(w) < 1e-3).length;

  const colors = getFeatureColors(t);

  return (
    <VisualizationContainer footer="A real coordinate-descent Elastic Net solve on the same synthetic correlated-feature dataset as the Ridge and Lasso studios -- alpha=0 recovers ridge's path exactly, alpha=1 recovers lasso's, and every value between blends the two.">
      <VisualizationHeader eyebrow="Interactive" title="Elastic Net Studio" />
      <ControlRow>
        <div style={{ minWidth: 200 }}>
          <Slider label="Correlation (x1, x2)" value={correlation} onChange={(value) => { lambdaCycle.stop(); setCorrelation(value); }} min={0} max={0.98} step={0.02} format={(v) => v.toFixed(2)} />
        </div>
        <VizButton variant="secondary" onClick={() => { lambdaCycle.stop(); setSeed((s) => s + 1); }}>New Dataset</VizButton>
      </ControlRow>
      <ControlRow>
        <div style={{ minWidth: 200 }}>
          <Slider label="α (0=ridge, 1=lasso)" value={alpha} onChange={(value) => { lambdaCycle.stop(); setAlpha(value); }} min={0} max={1} step={0.05} format={(v) => v.toFixed(2)} />
        </div>
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
        <span style={{ color: t.textSecondary }}>{zeroCount} of 4 weights exactly zero</span>
        <span style={{ color: t.textSecondary }}>x1 + x2 = {(current.w[0] + current.w[1]).toFixed(2)} (true combined effect ≈ 6.0)</span>
      </div>
      <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
        Push α to 1 with correlation high -- watch x1/x2 fight for credit exactly like pure Lasso. Now dial α down toward 0.3 or so, same λ -- watch them settle toward each other again, while x3 (genuinely useless) still gets zeroed. That's the real blend the mix hyperparameter buys you.
      </div>
    </VisualizationContainer>
  );
}
