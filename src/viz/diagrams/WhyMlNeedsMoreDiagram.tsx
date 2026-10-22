import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

/** Regular CI's assumption ("tests pass = safe to ship") breaks for ML
 * because the model is a function of code AND data -- click to see a
 * change pass every code check while still shipping silent degradation. */
export default function WhyMlNeedsMoreDiagram() {
  const t = useVizTokens();
  const [revealed, setRevealed] = useState(true);
  const passColor = t.accentPrimary;
  const hiddenColor = t.accentDanger;

  return (
    <VisualizationContainer footer={revealed ? 'All code checks pass -- but the model\'s actual accuracy on real (drifted) inputs is invisible to every one of them. This is the gap ML CI/CD checks (drift, model regression) exist to close.' : 'Click "check what code CI actually sees" -- lint, unit tests, build all report green.'}>
      <button type="button" onClick={() => setRevealed((r) => !r)} style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${passColor}`, background: 'transparent', color: passColor, cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}>
        {revealed ? 'Hide model accuracy' : 'Reveal model accuracy'}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {['Lint', 'Unit tests', 'Build'].map((check) => (
          <div key={check} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.7rem', borderRadius: 6, background: `${passColor}12` }}>
            <span style={{ fontSize: 11, color: t.textPrimary }}>{check}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: passColor }}>✓ pass</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.7rem', borderRadius: 6, background: revealed ? `${hiddenColor}15` : t.surfaceAlt, opacity: revealed ? 1 : 0.4 }}>
          <span style={{ fontSize: 11, color: revealed ? hiddenColor : t.textMuted }}>Model accuracy on real inputs</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: revealed ? hiddenColor : t.textMuted }}>{revealed ? 'degrading, invisible to code CI' : '(not checked by code CI)'}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        "Passes unit tests" says nothing about whether the model is still accurate -- these are structurally different questions.
      </div>
    </VisualizationContainer>
  );
}
