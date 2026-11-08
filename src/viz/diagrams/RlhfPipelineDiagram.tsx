import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STEPS = [
  { key: 'sample', label: 'Sample outputs', desc: 'The SFT model generates multiple candidate responses to the same prompt.' },
  { key: 'rank', label: 'Human ranking', desc: 'Humans rank the candidate outputs from best to worst.' },
  { key: 'reward', label: 'Train reward model', desc: 'A separate model is trained to predict which output humans would prefer -- turning rankings into a scorable reward signal.' },
  { key: 'ppo', label: 'PPO fine-tune', desc: "The LLM is fine-tuned with reinforcement learning (PPO) to maximize the reward model's score." },
  { key: 'kl', label: 'KL penalty', desc: 'A KL-divergence penalty keeps the fine-tuned model close to the original SFT model, preventing it from degenerating into reward-gaming responses.' },
] as const;

/** RLHF's actual multi-model pipeline -- click a stage to see exactly what
 * happens there, including the KL penalty's specific job (it's not part of
 * "the RL step" in general, it's the guardrail against reward hacking). */
export default function RlhfPipelineDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState<(typeof STEPS)[number]['key']>('reward');
  const color = getConceptColor(t, 'attention');
  const klColor = t.accentWarn;
  const active = STEPS.find((s) => s.key === selected)!;

  const width = 560;
  const height = 100;
  const stepX = (i: number) => 50 + i * ((width - 100) / (STEPS.length - 1));

  return (
    <VisualizationContainer footer={active.desc}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="rlhf-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STEPS.map((s, i) => {
          const x = stepX(i);
          const isSelected = selected === s.key;
          const isKl = s.key === 'kl';
          const c = isKl ? klColor : color;
          return (
            <g key={s.key}>
              {i > 0 && <line x1={stepX(i - 1) + 35} y1={40} x2={x - 41} y2={40} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#rlhf-arrow)" />}
              <g onClick={() => setSelected(s.key)} style={{ cursor: 'pointer' }}>
                <rect x={x - 35} y={24} width={70} height={32} rx={6} fill={isSelected ? `${c}30` : t.surfaceAlt} stroke={c} strokeWidth={isSelected ? 2.5 : 1.5} />
                <text x={x} y={44} textAnchor="middle" fontSize={8.5} fill={c}>{s.label}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Click a stage. The KL penalty (amber) isn't a separate pipeline step -- it's applied throughout the PPO fine-tune step.
      </div>
    </VisualizationContainer>
  );
}
