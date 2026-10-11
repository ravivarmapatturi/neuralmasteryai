import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { SelectableRow, VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const REWARDS = [0.82, 0.61, 0.35, 0.74, 0.49];

/** PPO needs a learned critic/value network to estimate a baseline reward
 * for computing advantage. GRPO skips it entirely: sample a GROUP of
 * outputs for the same prompt, use the group's own average reward as the
 * baseline. Click a sample to see its advantage relative to the group. */
export default function GrpoVsPpoDiagram() {
  const t = useVizTokens();
  const [method, setMethod] = useState<'ppo' | 'grpo'>('grpo');
  const [hovered, setHovered] = useState<number | null>(2);
  const color = getConceptColor(t, 'attention');
  const criticColor = t.accentDanger;
  const groupAvg = REWARDS.reduce((a, b) => a + b, 0) / REWARDS.length;

  return (
    <VisualizationContainer
      footer={
        method === 'ppo'
          ? 'PPO: a separate learned critic/value network estimates the expected reward baseline for each state -- an extra model to train and maintain.'
          : `GRPO: sample a group of outputs for the SAME prompt, use the group's own average reward (${groupAvg.toFixed(2)}) as the baseline -- no critic network needed. Hover a sample to see its advantage.`
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {(['ppo', 'grpo'] as const).map((m) => (
          <SelectableRow key={m} selected={method === m} label={m.toUpperCase()} onSelect={() => setMethod(m)} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 11, background: method === m ? t.accentPrimary : t.surfaceAlt, color: method === m ? t.background : t.textSecondary, fontWeight: method === m ? 700 : 400 }}>
            {m.toUpperCase()}
          </SelectableRow>
        ))}
      </div>
      {method === 'ppo' ? (
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ padding: '10px 16px', borderRadius: 8, background: `${color}18`, border: `1.5px solid ${color}`, fontSize: 11, color }}>1 sampled output → reward = 0.74</div>
          <div style={{ fontSize: 16, color: t.textMuted }}>−</div>
          <div style={{ padding: '10px 16px', borderRadius: 8, background: `${criticColor}18`, border: `1.5px solid ${criticColor}`, fontSize: 11, color: criticColor }}>critic's learned baseline estimate</div>
          <div style={{ fontSize: 16, color: t.textMuted }}>= advantage</div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {REWARDS.map((r, i) => (
              <div
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '8px 10px', borderRadius: 6, fontSize: 10, fontFamily: 'monospace', cursor: 'pointer', textAlign: 'center',
                  background: hovered === i ? `${color}30` : t.surfaceAlt, border: `1.5px solid ${hovered === i ? color : t.border}`, color: t.textSecondary,
                }}
              >
                sample {i + 1}<br />r={r.toFixed(2)}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 10, color: t.textMuted, marginTop: 8 }}>group average reward (baseline) = {groupAvg.toFixed(3)}</div>
          {hovered !== null && (
            <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color, fontWeight: 700, marginTop: 6 }}>
              sample {hovered + 1} advantage = {REWARDS[hovered].toFixed(2)} − {groupAvg.toFixed(2)} = {(REWARDS[hovered] - groupAvg).toFixed(3)}
            </div>
          )}
        </div>
      )}
    </VisualizationContainer>
  );
}
