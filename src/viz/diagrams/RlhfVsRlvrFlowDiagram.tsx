import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Stage = 'rlhf-reward' | 'rlvr-verifier' | null;

const DETAILS: Record<'rlhf-reward' | 'rlvr-verifier', string> = {
  'rlhf-reward':
    "The reward model is itself a trained neural network, so it has its own blind spots -- a policy can learn to produce output that scores well on the reward model (confident tone, sycophantic agreement, superficially thorough-looking structure) without actually being more correct or more helpful. That gap between \"scores well\" and \"is actually good\" is exactly what Reward Hacking exploits.",
  'rlvr-verifier':
    'The verifier is a program, not a neural network -- it runs the code against the test suite, or checks the math answer against the known result. There is no learned blind spot to exploit: the policy can only get a high reward by actually producing output that passes the real check, which is why RLVR closes off this entire failure mode for tasks where a ground-truth check like this exists.',
};

/** The two reward-flow shapes side by side: RLHF routes the policy's output
 * through a learned, fallible reward model; RLVR routes it through a
 * verifier program with no learned blind spot to exploit. Click either
 * middle box to see exactly what that difference buys (or costs) you. */
export default function RlhfVsRlvrFlowDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState<Stage>(null);

  const policyColor = getConceptColor(t, 'token');
  const rewardModelColor = t.accentDanger;
  const verifierColor = getConceptColor(t, 'attention');

  const lane = (
    label: string,
    stageKey: 'rlhf-reward' | 'rlvr-verifier',
    stageLabel: string,
    stageColor: string,
    rewardLabel: string,
  ) => {
    const isActive = active === stageKey;
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>{label}</div>
        <div style={{ padding: '8px 14px', borderRadius: 8, background: `${policyColor}18`, border: `1.5px solid ${policyColor}`, fontSize: 12, color: t.textPrimary, textAlign: 'center', width: '100%' }}>
          Policy output
        </div>
        <div style={{ fontSize: 14, color: t.textMuted }}>↓</div>
        <div
          onClick={() => setActive(isActive ? null : stageKey)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActive(isActive ? null : stageKey);
            }
          }}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            cursor: 'pointer',
            textAlign: 'center',
            width: '100%',
            background: isActive ? `${stageColor}30` : `${stageColor}18`,
            border: `1.5px solid ${stageColor}`,
            color: stageColor,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {stageLabel}
        </div>
        <div style={{ fontSize: 14, color: t.textMuted }}>↓</div>
        <div style={{ padding: '8px 14px', borderRadius: 8, background: t.surfaceAlt, border: `1.5px solid ${t.border}`, fontSize: 12, color: t.textSecondary, textAlign: 'center', width: '100%' }}>
          {rewardLabel}
        </div>
      </div>
    );
  };

  return (
    <VisualizationContainer
      footer={
        active
          ? DETAILS[active]
          : 'Click the reward model or verifier box in either lane to see exactly where RLVR closes off the reward-hacking failure mode RLHF is exposed to.'
      }
    >
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {lane('RLHF', 'rlhf-reward', 'Learned reward model', rewardModelColor, 'Scalar reward (gameable)')}
        {lane('RLVR', 'rlvr-verifier', 'Verifier (program)', verifierColor, 'Scalar reward (checked against ground truth)')}
      </div>
    </VisualizationContainer>
  );
}
