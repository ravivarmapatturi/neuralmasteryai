import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Strategy = 'ab' | 'shadow' | 'canary';
const STRATEGIES: Strategy[] = ['ab', 'shadow', 'canary'];

/** Three deployment testing strategies, drawn as what traffic actually
 * touches which model and whether the new model's output affects the
 * user -- the axis that actually distinguishes them. */
export default function ABShadowCanaryDiagram() {
  const t = useVizTokens();
  const { value: stratIdx, pick, stop } = useAutoCycle(STRATEGIES.length, 3000, 2);
  const strategy = STRATEGIES[stratIdx];
  const oldColor = getConceptColor(t, 'query');
  const newColor = getConceptColor(t, 'attention');
  const width = 560;

  const desc: Record<Strategy, string> = {
    ab: 'A/B test: traffic is SPLIT -- some users get the old model\'s output, some get the new model\'s output, both affecting what those users actually see. Comparison is a real experiment.',
    shadow: 'Shadow deployment: ALL traffic still gets the old model\'s output -- the new model runs alongside on the same requests, but its output is only logged, never shown to users. Zero user-facing risk.',
    canary: 'Canary rollout: a SMALL, growing percentage of traffic gets the new model\'s real output, watched closely -- ramping toward 100% only if no regressions appear at each stage.',
  };

  const newPct: Record<Strategy, number> = { ab: 50, shadow: 0, canary: 15 };
  const shadowMode = strategy === 'shadow';

  return (
    <VisualizationContainer footer={desc[strategy]}>
      <PillSelect<Strategy>
        label="Strategy"
        value={strategy}
        onChange={(val) => {
          const next = typeof val === 'function' ? val(strategy) : val;
          const idx = STRATEGIES.indexOf(next);
          if (idx >= 0) pick(idx);
          stop();
        }}
        options={[{ value: 'ab', label: 'A/B test' }, { value: 'shadow', label: 'Shadow' }, { value: 'canary', label: 'Canary' }]}
      />
      <svg width="100%" viewBox={`0 0 ${width} 100`} style={{ display: 'block', marginTop: 10 }}>
        <text x={20} y={20} fontSize={9} fill={t.textMuted}>traffic</text>
        <rect x={20} y={30} width={200} height={26} rx={5} fill={oldColor} opacity={0.25} />
        <rect x={20} y={30} width={200 * (1 - newPct[strategy] / 100)} height={26} rx={5} fill={oldColor} opacity={0.7} style={{ transition: 'width 0.3s ease' }} />
        <rect x={20 + 200 * (1 - newPct[strategy] / 100)} y={30} width={200 * (newPct[strategy] / 100)} height={26} rx={5} fill={newColor} opacity={0.7} style={{ transition: 'all 0.3s ease' }} />
        <text x={20} y={72} fontSize={8.5} fill={oldColor}>■ old model (user-facing)</text>
        <text x={20} y={86} fontSize={8.5} fill={newColor}>■ new model {shadowMode ? '(shadow -- logged only, not shown)' : '(user-facing)'}</text>
        {shadowMode && (
          <>
            <rect x={20} y={30} width={200} height={26} rx={5} fill="none" stroke={newColor} strokeWidth={1.5} strokeDasharray="3 2" />
            <text x={230} y={47} fontSize={8} fill={newColor}>← runs on same requests, logged</text>
          </>
        )}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        The axis that matters: does the new model's output actually reach the user, and how much of the traffic.
      </div>
    </VisualizationContainer>
  );
}
