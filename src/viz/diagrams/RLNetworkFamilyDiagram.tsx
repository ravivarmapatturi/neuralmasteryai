import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const METHODS = [
  { key: 'dqn', label: 'DQN', desc: 'Approximates the Q-function with a network, plus experience replay (breaks correlation between consecutive samples) and a target network (stabilizes bootstrapped value estimates). First to match human-level Atari performance from raw pixels.' },
  { key: 'pg', label: 'Policy Gradient', desc: 'Directly parameterizes and optimizes the policy via gradient ascent on expected reward -- necessary for continuous action spaces where "take the argmax over actions" isn\'t well-defined.' },
  { key: 'ac', label: 'Actor-Critic', desc: 'An actor outputs the policy; a critic estimates the value function to reduce the variance of the actor\'s gradient estimates -- sample efficiency of value-based methods, flexibility of policy-based methods.' },
  { key: 'ppo', label: 'PPO', desc: 'Constrains each policy update to a small "trust region" via a clipped objective -- prevents the destructively large updates that made earlier policy gradient methods unstable. The default RL algorithm today, including behind RLHF for LLM alignment.' },
];

/** Four RL network families, each solving a problem with the one
 * before -- click through the lineage. */
export default function RLNetworkFamilyDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(METHODS.length, 2600, METHODS.length - 1);
  const active = METHODS[cycle.value].key;
  const setActive = (key: string) => cycle.pick(METHODS.findIndex((method) => method.key === key));
  const color = getConceptColor(t, 'attention');
  const m = METHODS.find((x) => x.key === active)!;

  return (
    <VisualizationContainer footer={m.desc}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        {METHODS.map((x, i) => {
          const isActive = active === x.key;
          return (
            <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div onClick={() => setActive(x.key)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(x.key); } }} onMouseEnter={() => setActive(x.key)} style={{ cursor: 'pointer', padding: '0.5rem 0.6rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}>
                <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
              </div>
              {i < METHODS.length - 1 && <span style={{ color: t.textMuted, fontSize: 11 }}>→</span>}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
