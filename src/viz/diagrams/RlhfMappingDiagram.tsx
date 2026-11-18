import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const TERMS = [
  { rl: 'Policy π', llm: 'The LLM itself', detail: 'The thing being optimized -- in standard RL a mapping states→actions, here the model\'s own next-token distribution.' },
  { rl: 'State s', llm: 'Prompt + tokens generated so far', detail: 'Everything the policy conditions on to pick its next move.' },
  { rl: 'Action a', llm: 'The next token (or a full response)', detail: 'What the policy actually outputs at each decision point.' },
  { rl: 'Reward R(s,a)', llm: 'Reward model score (RLHF) or AI judge score (RLAIF)', detail: 'RLAIF swaps the human preference-labeling step for another model\'s judgment -- same mechanism, different reward source.' },
  { rl: 'Environment', llm: 'The reward model / judge + the KL penalty toward the reference model', detail: 'What actually determines the reward the policy sees during training.' },
  { rl: 'Policy-gradient algorithm', llm: 'PPO or GRPO', detail: 'The specific algorithm used to update the LLM\'s weights against the reward signal -- see Training Pipeline for the full mechanics.' },
];

export default function RlhfMappingDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(TERMS.length, 2800);
  const [userSelected, setUserSelected] = useState<number | null>(null);
  const selected = userSelected ?? autoIdx;
  const active = TERMS[selected];

  return (
    <VisualizationContainer footer={active.detail}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {TERMS.map((term, i) => {
          const isSelected = selected === i;
          return (
            <div
              key={term.rl}
              onClick={() => setUserSelected(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '0.55rem 0.8rem', borderRadius: 8,
                background: isSelected ? `${t.accentPrimary}18` : t.surfaceAlt, border: `1.5px solid ${isSelected ? t.accentPrimary : t.border}`,
              }}
            >
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: isSelected ? t.accentPrimary : t.textPrimary }}>{term.rl}</div>
              <div style={{ fontSize: 11, color: t.textMuted }}>→</div>
              <div style={{ flex: 1.4, fontSize: 12, color: t.textSecondary }}>{term.llm}</div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Once every row here reads as "just RL," the KL-divergence penalty, reward hacking, and GRPO's critic-free design all stop being LLM-specific magic and become specific engineering responses to specific, generic RL problems.
      </div>
    </VisualizationContainer>
  );
}
