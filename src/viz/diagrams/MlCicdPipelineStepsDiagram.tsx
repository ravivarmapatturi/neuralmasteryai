import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STEPS = [
  { label: 'Code checks', desc: 'Lint/unit/integration tests -- standard CI.' },
  { label: 'Data validation', desc: 'Schema and range checks on new/changed data.' },
  { label: 'Training run', desc: 'Completes and logs to the experiment tracker.' },
  { label: 'Regression gate', desc: 'Must beat production\'s benchmark metrics -- otherwise the pipeline stops HERE, automatically.' },
  { label: 'Register + containerize', desc: 'Model registered and packaged for deployment.' },
  { label: 'Safe rollout', desc: 'Canary/shadow/blue-green -- not an instant full-traffic swap.' },
  { label: 'Post-deploy monitoring', desc: 'Confirms the new version is healthy before the rollout completes.' },
];

/** All 7 steps, click one -- step 4's gate is visually distinct since
 * it's the one that can stop the whole pipeline automatically. */
export default function MlCicdPipelineStepsDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState(3);
  const color = getConceptColor(t, 'attention');
  const gateColor = t.accentDanger;

  return (
    <VisualizationContainer footer={STEPS[active].desc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {STEPS.map((s, i) => {
          const isActive = active === i;
          const isGate = i === 3;
          const c = isGate ? gateColor : color;
          return (
            <div
              key={s.label}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '0.4rem 0.7rem', borderRadius: 6, background: isActive ? `${c}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? c : t.border}` }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: c, width: 16 }}>{i + 1}</span>
              <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? c : t.textPrimary }}>{s.label}</span>
              {isGate && <span style={{ marginLeft: 'auto', fontSize: 8.5, color: gateColor, fontWeight: 700 }}>can halt pipeline</span>}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        A pipeline that only does step 1 is doing software CI/CD wearing an ML costume.
      </div>
    </VisualizationContainer>
  );
}
