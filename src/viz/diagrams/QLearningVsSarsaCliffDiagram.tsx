import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { CLIFF_ROWS, CLIFF_COLS, CLIFF_START, CLIFF_GOAL, isCliff, trainCliffWalker, greedyRollout } from '../lib/rl';

// The classic Cliff Walking task (Sutton & Barto), trained for real: 300
// episodes of real epsilon-greedy tabular Q-learning and SARSA, same
// hyperparameters, same random seed. The resulting greedy policies
// genuinely differ -- this isn't staged.
type Algo = 'qlearning' | 'sarsa';

export default function QLearningVsSarsaCliffDiagram() {
  const t = useVizTokens();
  const ALGOS: Algo[] = ['qlearning', 'sarsa'];
  const { value: autoIdx } = useAutoCycle(ALGOS.length, 3400);
  const [userAlgo, setUserAlgo] = useState<Algo | null>(null);
  const algo = userAlgo ?? ALGOS[autoIdx];

  const { qPath, sarsaPath } = useMemo(() => {
    const Qq = trainCliffWalker('qlearning', 300, 7);
    const Qs = trainCliffWalker('sarsa', 300, 7);
    return { qPath: greedyRollout(Qq), sarsaPath: greedyRollout(Qs) };
  }, []);

  const path = algo === 'qlearning' ? qPath : sarsaPath;
  const color = algo === 'qlearning' ? t.accentDanger : t.accentPrimary;
  const cellSize = 48;

  return (
    <VisualizationContainer footer={
      algo === 'qlearning'
        ? `Q-learning's greedy path hugs the cliff edge (${qPath.length - 1} steps) -- it learned the value of the OPTIMAL policy, which is fine with walking the edge since a perfect policy never actually falls in.`
        : `SARSA's greedy path swings up and away from the cliff (${sarsaPath.length - 1} steps, longer but safer) -- it learned the value of the policy it actually explored WITH, which occasionally stumbles off the edge during training, so it learns to stay further back.`
    }>
      <PillSelect label="Trained policy" value={algo} onChange={(v) => setUserAlgo(v as Algo)} options={[
        { value: 'qlearning', label: 'Q-learning (off-policy)' },
        { value: 'sarsa', label: 'SARSA (on-policy)' },
      ]} />

      <svg width="100%" viewBox={`0 0 ${CLIFF_COLS * cellSize} ${CLIFF_ROWS * cellSize}`} style={{ display: 'block', marginTop: 8, maxWidth: CLIFF_COLS * cellSize, margin: '8px auto 0' }}>
        {Array.from({ length: CLIFF_ROWS }, (_, r) =>
          Array.from({ length: CLIFF_COLS }, (_, c) => {
            const cliff = isCliff(r, c);
            const isStart = r === CLIFF_START[0] && c === CLIFF_START[1];
            const isGoal = r === CLIFF_GOAL[0] && c === CLIFF_GOAL[1];
            return (
              <rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize - 2} height={cellSize - 2}
                fill={cliff ? t.accentDanger : isStart || isGoal ? t.surfaceAlt : t.surface}
                fillOpacity={cliff ? 0.25 : 1} stroke={t.border} strokeWidth={1} />
            );
          }),
        )}
        <text x={CLIFF_START[1] * cellSize + cellSize / 2} y={CLIFF_START[0] * cellSize + cellSize / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.textSecondary}>S</text>
        <text x={CLIFF_GOAL[1] * cellSize + cellSize / 2} y={CLIFF_GOAL[0] * cellSize + cellSize / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.textSecondary}>G</text>
        <text x={2.5 * cellSize} y={3 * cellSize + cellSize / 2 + 4} textAnchor="middle" fontSize={10} fill={t.accentDanger}>cliff (−100)</text>

        <polyline points={path.map(([r, c]) => `${c * cellSize + cellSize / 2},${r * cellSize + cellSize / 2}`).join(' ')} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" />
        {path.map(([r, c], i) => (
          <circle key={i} cx={c * cellSize + cellSize / 2} cy={r * cellSize + cellSize / 2} r={4} fill={color} />
        ))}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        Both trained for the same 300 episodes, same ε=0.1 exploration, same seed -- the only difference is the update rule (max over next actions vs. the actually-taken next action), and it visibly changes the learned policy's shape, not just its numbers.
      </div>
    </VisualizationContainer>
  );
}
