import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { totalReward } from '../lib/alignment';

// Real numbers from the classic boat-racing example: finishing the race
// gives a big reward but only once every 20 steps; looping through a
// power-up gives a smaller reward but every 3 steps -- denser AND (over
// any real training horizon) higher-rate. Both totals below are computed
// live from these two rates, not asserted.
const RACE_LENGTH = 20;
const RACE_REWARD = 10;
const LAP_LENGTH = 3;
const LAP_REWARD = 1.8;
const HORIZON_PRESETS = [40, 15, 80, 55];

export default function SpecificationGamingDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(HORIZON_PRESETS.length, 3000, 0);
  const [userHorizon, setUserHorizon] = useState<number | null>(null);
  const horizon = userHorizon ?? HORIZON_PRESETS[autoIdx];

  const { raceTotal, loopTotal } = useMemo(() => ({
    raceTotal: totalReward(horizon, RACE_LENGTH, RACE_REWARD),
    loopTotal: totalReward(horizon, LAP_LENGTH, LAP_REWARD),
  }), [horizon]);

  const maxTotal = Math.max(raceTotal, loopTotal, 1);
  const width = 420;
  const height = 160;
  const steps = Array.from({ length: 21 }, (_, i) => i * 5);
  const px = (h: number) => (h / 100) * width;
  const py = (v: number) => height - (v / (maxTotal * 1.2 + 5)) * height;
  const raceLine = steps.map((h) => [px(h), py(totalReward(h, RACE_LENGTH, RACE_REWARD))]);
  const loopLine = steps.map((h) => [px(h), py(totalReward(h, LAP_LENGTH, LAP_REWARD))]);

  return (
    <VisualizationContainer footer={`At training horizon ${horizon} steps: racing normally finishes ${Math.floor(horizon / RACE_LENGTH)} time(s) for ${raceTotal} total reward; looping the power-up completes ${Math.floor(horizon / LAP_LENGTH)} laps for ${loopTotal} total reward. ${loopTotal >= raceTotal ? 'Looping literally scores higher under the stated objective' : 'Racing still wins at this horizon'} -- and looping's reward arrives far more often (every ${LAP_LENGTH} steps vs. every ${RACE_LENGTH}), which is exactly what makes an optimizer stumble onto and reinforce it faster in the first place.`}>
      <Slider label="training horizon (steps)" value={horizon} onChange={(v) => { stop(); setUserHorizon(v); }} min={5} max={100} step={1} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <polyline points={raceLine.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentSecondary} strokeWidth={2} />
        <polyline points={loopLine.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentDanger} strokeWidth={2.5} />
        <line x1={px(horizon)} y1={0} x2={px(horizon)} y2={height} stroke={t.accentWarn} strokeWidth={1.5} strokeDasharray="3 3" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        <span><span style={{ color: t.accentSecondary }}>⬤</span> race normally (finish = +{RACE_REWARD} every {RACE_LENGTH} steps)</span>
        <span><span style={{ color: t.accentDanger }}>⬤</span> loop the power-up (+{LAP_REWARD} every {LAP_LENGTH} steps)</span>
      </div>
    </VisualizationContainer>
  );
}
