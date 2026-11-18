import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { entropy, expectedValue } from '../lib/advancedRl';

const ACTION_Q = [0.9, 1.0, 0.7, 0.5, 0.3];
const POLICY_PEAKED = [0.05, 0.85, 0.04, 0.03, 0.03];
const POLICY_SPREAD = [0.25, 0.25, 0.2, 0.15, 0.15];

function Bars({ probs, color }: { probs: number[]; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 60 }}>
      {probs.map((p, i) => (
        <div key={i} style={{ flex: 1, height: `${p * 100 * 1.1}%`, background: color, opacity: 0.4 + p * 1.2, borderRadius: 2 }} title={`action ${i}: p=${p}`} />
      ))}
    </div>
  );
}

const ALPHA_PRESETS = [0.05, 0.12, 0.22, 0.38];

export default function SacEntropyDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(ALPHA_PRESETS.length, 3000);
  const [userAlpha, setUserAlpha] = useState<number | null>(null);
  const alpha = userAlpha ?? ALPHA_PRESETS[autoIdx];

  const { meanQA, HA, meanQB, HB, alphaStar } = useMemo(() => {
    const meanQA = expectedValue(POLICY_PEAKED, ACTION_Q);
    const HA = entropy(POLICY_PEAKED);
    const meanQB = expectedValue(POLICY_SPREAD, ACTION_Q);
    const HB = entropy(POLICY_SPREAD);
    const alphaStar = (meanQA - meanQB) / (HB - HA);
    return { meanQA, HA, meanQB, HB, alphaStar };
  }, []);

  const objA = meanQA + alpha * HA;
  const objB = meanQB + alpha * HB;
  const winner = objA >= objB ? 'A' : 'B';

  return (
    <VisualizationContainer footer={`J = E[Q] + α·H(π). At α=${alpha.toFixed(2)}: J(peaked) = ${meanQA.toFixed(3)} + ${alpha.toFixed(2)}×${HA.toFixed(3)} = ${objA.toFixed(3)}; J(spread) = ${meanQB.toFixed(3)} + ${alpha.toFixed(2)}×${HB.toFixed(3)} = ${objB.toFixed(3)}. SAC's objective currently prefers policy ${winner}. Real crossover at α* = ${alphaStar.toFixed(3)} -- push the slider past it and the winner flips.`}>
      <Slider label="entropy coefficient α" value={alpha} onChange={setUserAlpha} min={0} max={0.5} step={0.01} />

      <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180, padding: 10, borderRadius: 8, background: winner === 'A' ? `${t.accentPrimary}18` : t.surfaceAlt, border: `1.5px solid ${winner === 'A' ? t.accentPrimary : t.border}` }}>
          <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary, marginBottom: 6 }}>Peaked policy (near-greedy)</div>
          <Bars probs={POLICY_PEAKED} color={t.accentSecondary} />
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>E[Q]={meanQA.toFixed(3)}, H={HA.toFixed(3)}, J={objA.toFixed(3)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, padding: 10, borderRadius: 8, background: winner === 'B' ? `${t.accentPrimary}18` : t.surfaceAlt, border: `1.5px solid ${winner === 'B' ? t.accentPrimary : t.border}` }}>
          <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary, marginBottom: 6 }}>Spread policy (more exploratory)</div>
          <Bars probs={POLICY_SPREAD} color={t.accentWarn} />
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>E[Q]={meanQB.toFixed(3)}, H={HB.toFixed(3)}, J={objB.toFixed(3)}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Both E[Q] (dot product of the real probabilities above with each action's real Q-value) and H (real Shannon entropy, −Σp·log p) are computed live from the bars, not hand-picked to match the story.
      </div>
    </VisualizationContainer>
  );
}
