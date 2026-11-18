import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { twoProportionPower } from '../lib/humanEval';

const PRESETS = [
  { effectSize: 0.05, n: 20 },
  { effectSize: 0.10, n: 60 },
  { effectSize: 0.03, n: 250 },
  { effectSize: 0.05, n: 180 },
];

export default function StatisticalPowerDiagram() {
  const t = useVizTokens();
  const { value: presetIdx, stop } = useAutoCycle(PRESETS.length, 3000, 0);
  const [userEffect, setUserEffect] = useState<number | null>(null);
  const [userN, setUserN] = useState<number | null>(null);

  const effectSize = userEffect ?? PRESETS[presetIdx].effectSize;
  const n = userN ?? PRESETS[presetIdx].n;

  const power = useMemo(() => twoProportionPower(0.5, 0.5 + effectSize, n), [effectSize, n]);

  const width = 420;
  const height = 160;
  const samples = Array.from({ length: 60 }, (_, i) => 5 + (i / 59) * 495);
  const px = (nn: number) => (nn / 500) * width;
  const py = (v: number) => height - v * height;
  const curve = samples.map((nn) => [px(nn), py(twoProportionPower(0.5, 0.5 + effectSize, nn))]);

  return (
    <VisualizationContainer footer={`Real win-rate difference to detect: ${(effectSize * 100).toFixed(0)} points (50% vs ${(50 + effectSize * 100).toFixed(0)}%). At n=${n} raters per side, real statistical power = ${(power * 100).toFixed(1)}% -- the probability this study actually detects the difference IF it's real. A study "not showing a clear winner" at low power is exactly as likely to mean "underpowered" as "no real difference," and this number is computable BEFORE running the study, not after.`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Slider
          label="real effect size to detect"
          value={effectSize}
          onChange={(v) => { stop(); setUserEffect(v); }}
          min={0.01}
          max={0.2}
          step={0.005}
          format={(v) => `${(v * 100).toFixed(1)} pts`}
        />
        <Slider
          label="sample size (n per group)"
          value={n}
          onChange={(v) => { stop(); setUserN(v); }}
          min={5}
          max={500}
          step={5}
        />
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={0} y1={py(0.8)} x2={width} y2={py(0.8)} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        <text x={4} y={py(0.8) - 4} fontSize={10} fill={t.textMuted}>80% (conventional minimum)</text>
        <polyline points={curve.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        <line x1={px(n)} y1={0} x2={px(n)} y2={height} stroke={t.accentWarn} strokeWidth={1.5} strokeDasharray="3 3" />
        <circle cx={px(n)} cy={py(power)} r={5} fill={t.accentWarn} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        Smaller real effects need dramatically more samples to detect reliably -- exactly why "20 examples looked decisive" is a real statistical trap, not just intuition.
      </div>
    </VisualizationContainer>
  );
}
