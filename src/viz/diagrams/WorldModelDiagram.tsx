import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** Model-free RL only ever updates from real environment transitions. A
 * world model inserts a learned simulator in the loop: a few real steps
 * train the model, then many cheap "imagined" rollouts inside it do most
 * of the actual policy training -- the real cost is that the policy is
 * now only as good as the model it's dreaming inside. */
export default function WorldModelDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<'model-free' | 'model-based'>('model-based');
  const envColor = getConceptColor(t, 'token');
  const modelColor = t.accentDanger;
  const policyColor = t.accentPrimary;

  return (
    <VisualizationContainer
      footer={
        mode === 'model-free'
          ? 'Model-free: every policy/value update comes from a real environment transition -- accurate (no model-bias risk), but sample-inefficient. Real interaction is often the expensive, slow, or unsafe part.'
          : "Model-based: a few real transitions train a learned world model (dynamics + reward), then the policy trains mostly on cheap, fast rollouts the model itself imagines -- far more sample-efficient, at the cost of the policy only being as good as the model. Same 'confidently wrong on unseen states' risk Offline RL's extrapolation problem and imitation learning's compounding error already show on this page, just moved to the environment model instead."
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['model-free', 'model-based'] as const).map((m) => (
          <div
            key={m}
            onClick={() => setMode(m)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMode(m);
              }
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 11,
              cursor: 'pointer',
              background: mode === m ? t.accentPrimary : t.surfaceAlt,
              color: mode === m ? t.background : t.textSecondary,
              fontWeight: mode === m ? 700 : 400,
            }}
          >
            {m === 'model-free' ? 'MODEL-FREE' : 'MODEL-BASED (WORLD MODEL)'}
          </div>
        ))}
      </div>

      {mode === 'model-free' ? (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center', padding: 16, flexWrap: 'wrap' }}>
          <div style={{ padding: '10px 16px', borderRadius: 8, background: `${envColor}18`, border: `1.5px solid ${envColor}`, fontSize: 11, color: envColor, textAlign: 'center' }}>
            Real environment<br />step
          </div>
          <div style={{ fontSize: 16, color: t.textMuted }}>→</div>
          <div style={{ padding: '10px 16px', borderRadius: 8, background: `${policyColor}18`, border: `1.5px solid ${policyColor}`, fontSize: 11, color: policyColor, textAlign: 'center' }}>
            Policy / value<br />update
          </div>
          <div style={{ fontSize: 16, color: t.textMuted }}>↻ repeat, many real steps needed</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ padding: '10px 16px', borderRadius: 8, background: `${envColor}18`, border: `1.5px solid ${envColor}`, fontSize: 11, color: envColor, textAlign: 'center' }}>
              A few real<br />environment steps
            </div>
            <div style={{ fontSize: 16, color: t.textMuted }}>→</div>
            <div style={{ padding: '10px 16px', borderRadius: 8, background: `${modelColor}18`, border: `1.5px solid ${modelColor}`, fontSize: 11, color: modelColor, textAlign: 'center' }}>
              Learned world model<br />(dynamics + reward)
            </div>
          </div>
          <div style={{ fontSize: 14, color: t.textMuted }}>↓ generates many cheap "imagined" rollouts</div>
          <div style={{ padding: '10px 16px', borderRadius: 8, background: `${policyColor}18`, border: `1.5px solid ${policyColor}`, fontSize: 11, color: policyColor, textAlign: 'center' }}>
            Policy / value update<br />(trained mostly inside the dream)
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>↻ model refreshed with new real data only occasionally</div>
        </div>
      )}
    </VisualizationContainer>
  );
}
