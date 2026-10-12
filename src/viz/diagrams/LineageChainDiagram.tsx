import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const CHAIN = [
  { label: 'Prediction', desc: 'A specific prediction a user saw or an incident report references.' },
  { label: 'Model version', desc: 'Which registered model version produced it -- e.g. v7.' },
  { label: 'Training run', desc: 'Which experiment run (code commit, hyperparameters) produced model v7.' },
  { label: 'Data version', desc: 'Which exact dataset version that run trained on.' },
];

/** Walk backward from a real prediction to the exact data that shaped
 * it -- click a link in the chain. */
export default function LineageChainDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState(2);
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={CHAIN[active].desc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {CHAIN.map((c, i) => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SketchBox color={active === i ? color : t.border} strokeWidth={active === i ? 2 : 1.3} style={{ flex: 1 }}>
              <div onClick={() => setActive(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(i); } }} onMouseEnter={() => setActive(i)} style={{ cursor: 'pointer', padding: '0.5rem 0.8rem', borderRadius: 7, background: active === i ? `${color}18` : t.surfaceAlt, fontSize: 11, fontWeight: active === i ? 700 : 500, color: active === i ? color : t.textPrimary, fontFamily: HAND_FONT }}>
                {c.label}
              </div>
            </SketchBox>
            {i < CHAIN.length - 1 && <span style={{ color: t.textMuted, fontSize: 12 }}>←</span>}
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
