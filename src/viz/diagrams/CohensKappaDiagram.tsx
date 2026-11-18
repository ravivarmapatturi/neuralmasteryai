import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { cohensKappa } from '../lib/humanEval';

const PRESETS = [
  { bothGood: 55, r1GoodR2Bad: 15, r1BadR2Good: 10, bothBad: 20 },
  { bothGood: 80, r1GoodR2Bad: 5, r1BadR2Good: 5, bothBad: 10 },
  { bothGood: 35, r1GoodR2Bad: 30, r1BadR2Good: 25, bothBad: 10 },
];

export default function CohensKappaDiagram() {
  const t = useVizTokens();
  const { value: presetIdx, stop } = useAutoCycle(PRESETS.length, 3200, 0);
  const [userBothGood, setUserBothGood] = useState<number | null>(null);
  const [userR1G2B, setUserR1G2B] = useState<number | null>(null);
  const [userR1B2G, setUserR1B2G] = useState<number | null>(null);
  const [userBothBad, setUserBothBad] = useState<number | null>(null);

  const bothGood = userBothGood ?? PRESETS[presetIdx].bothGood;
  const r1GoodR2Bad = userR1G2B ?? PRESETS[presetIdx].r1GoodR2Bad;
  const r1BadR2Good = userR1B2G ?? PRESETS[presetIdx].r1BadR2Good;
  const bothBad = userBothBad ?? PRESETS[presetIdx].bothBad;

  const counts = { bothGood, r1GoodR2Bad, r1BadR2Good, bothBad };
  const { kappa, observedAgreement, expectedAgreement } = useMemo(() => cohensKappa(counts), [bothGood, r1GoodR2Bad, r1BadR2Good, bothBad]);

  const interpretation = kappa < 0.2 ? 'slight' : kappa < 0.4 ? 'fair' : kappa < 0.6 ? 'moderate' : kappa < 0.8 ? 'substantial' : 'near-perfect';

  return (
    <VisualizationContainer footer={`Raw agreement = ${(observedAgreement * 100).toFixed(1)}% -- looks decent on its own. But chance agreement alone (if both raters just guessed independently at their real marginal rates) would already be ${(expectedAgreement * 100).toFixed(1)}%. Real Cohen's κ = (${observedAgreement.toFixed(3)} − ${expectedAgreement.toFixed(3)}) / (1 − ${expectedAgreement.toFixed(3)}) = ${kappa.toFixed(3)} -- "${interpretation}" agreement, a very different verdict than the raw percentage alone suggested.`}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Slider label="both rate GOOD" value={bothGood} onChange={(v) => { stop(); setUserBothGood(v); }} min={0} max={100} step={1} />
        <Slider label="rater 1 GOOD, rater 2 BAD" value={r1GoodR2Bad} onChange={(v) => { stop(); setUserR1G2B(v); }} min={0} max={100} step={1} />
        <Slider label="rater 1 BAD, rater 2 GOOD" value={r1BadR2Good} onChange={(v) => { stop(); setUserR1B2G(v); }} min={0} max={100} step={1} />
        <Slider label="both rate BAD" value={bothBad} onChange={(v) => { stop(); setUserBothBad(v); }} min={0} max={100} step={1} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 30, marginTop: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.textSecondary, fontFamily: 'monospace' }}>{(observedAgreement * 100).toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: t.textMuted }}>raw agreement</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: kappa > 0.4 ? t.accentPrimary : t.accentDanger, fontFamily: 'monospace' }}>{kappa.toFixed(3)}</div>
          <div style={{ fontSize: 11, color: t.textMuted }}>Cohen's κ</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Low κ invalidates the resulting scores regardless of how many raters were used -- it means the "measurement" isn't actually measuring something raters share a consistent understanding of.
      </div>
    </VisualizationContainer>
  );
}
