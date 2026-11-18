import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { domainRandomizedOptimalGain, simOnlyGain, relativeError } from '../lib/domainApplications';

const SIM_PARAM = 1.0;
const RAND_LOW = 0.8, RAND_HIGH = 1.4;
const REAL_PARAM_PRESETS = [1.2, 0.9, 1.5, 0.7];

export default function SimToRealGapDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(REAL_PARAM_PRESETS.length, 3000, 0);
  const [userReal, setUserReal] = useState<number | null>(null);
  const realParam = userReal ?? REAL_PARAM_PRESETS[autoIdx];

  const wSimOnly = useMemo(() => simOnlyGain(SIM_PARAM), []);
  const wRandomized = useMemo(() => domainRandomizedOptimalGain(RAND_LOW, RAND_HIGH), []);
  const errSimOnly = relativeError(wSimOnly, realParam);
  const errRandomized = relativeError(wRandomized, realParam);
  const inRange = realParam >= RAND_LOW && realParam <= RAND_HIGH;

  const width = 380, height = 60;
  const domain: [number, number] = [0.6, 1.6];
  const px = (v: number) => ((v - domain[0]) / (domain[1] - domain[0])) * width;

  return (
    <VisualizationContainer footer={`Real closed-form controller gains: a sim-only policy tuned to exactly match a single simulator (friction=${SIM_PARAM}) gets w=${wSimOnly.toFixed(3)} -- perfect in sim, ${(errSimOnly * 100).toFixed(1)}% real error at friction=${realParam.toFixed(2)}. A policy trained across REAL randomized friction (${RAND_LOW}–${RAND_HIGH}, deliberately wide because the true value is unknown in advance) converges to the real optimal w=${wRandomized.toFixed(3)} for that whole range -- ${(errRandomized * 100).toFixed(1)}% real error at the same real friction. ${inRange ? 'The randomization range happens to cover the real value -- exactly why practitioners pick a wide range: they don\'t know it in advance.' : 'Real friction is OUTSIDE the randomization range here -- even domain randomization can\'t fully save you if reality falls outside what you hedged against.'}`}>
      <Slider
        label="true real-world friction"
        value={realParam}
        onChange={(v) => {
          stop();
          setUserReal(v);
        }}
        min={0.65}
        max={1.55}
        step={0.02}
      />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <rect x={px(RAND_LOW)} y={10} width={px(RAND_HIGH) - px(RAND_LOW)} height={20} fill={t.accentPrimary} fillOpacity={0.15} />
        <text x={(px(RAND_LOW) + px(RAND_HIGH)) / 2} y={8} textAnchor="middle" fontSize={9} fill={t.accentPrimary}>randomization range</text>
        <circle cx={px(SIM_PARAM)} cy={20} r={4} fill={t.accentSecondary} />
        <text x={px(SIM_PARAM)} y={45} textAnchor="middle" fontSize={9} fill={t.accentSecondary}>sim</text>
        <circle cx={px(realParam)} cy={20} r={5} fill={inRange ? t.accentPrimary : t.accentDanger} />
        <text x={px(realParam)} y={45} textAnchor="middle" fontSize={9} fontWeight={700} fill={inRange ? t.accentPrimary : t.accentDanger}>real</text>
      </svg>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 30, marginTop: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: t.accentSecondary, fontFamily: 'monospace' }}>{(errSimOnly * 100).toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: t.textMuted }}>sim-only real error</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: t.accentPrimary, fontFamily: 'monospace' }}>{(errRandomized * 100).toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: t.textMuted }}>domain-randomized real error</div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
