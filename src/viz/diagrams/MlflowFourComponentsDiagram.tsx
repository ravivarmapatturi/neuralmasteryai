import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const PARTS = [
  { key: 'tracking', label: 'Tracking', desc: 'Logs params, metrics, artifacts per run -- mlflow.log_param/log_metric/log_artifact -- viewable in a comparison UI.' },
  { key: 'projects', label: 'Projects', desc: 'Packages code in a reusable, reproducible format (an MLproject file) so a run can be repeated exactly.' },
  { key: 'models', label: 'Models', desc: 'A standard format for packaging a trained model -- loadable/servable by many tools without custom glue code per framework.' },
  { key: 'registry', label: 'Model Registry', desc: 'A central store for model versions with stage transitions and lineage back to the run that produced each one.' },
];

/** MLflow's 4 components, click one for its actual job -- these are
 * distinct, composable pieces, not one monolithic tool. */
export default function MlflowFourComponentsDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState('tracking');
  const color = getConceptColor(t, 'attention');
  const info = PARTS.find((p) => p.key === active)!;

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PARTS.map((p) => {
          const isActive = active === p.key;
          return (
            <SketchBox key={p.key} color={isActive ? color : t.border} strokeWidth={isActive ? 2 : 1.3} style={{ flex: '1 1 100px' }}>
              <div onClick={() => setActive(p.key)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(p.key); } }} onMouseEnter={() => setActive(p.key)} style={{ cursor: 'pointer', padding: '0.6rem', borderRadius: 8, background: isActive ? `${color}18` : t.surfaceAlt, textAlign: 'center' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: isActive ? color : t.textPrimary, fontFamily: HAND_FONT }}>{p.label}</span>
              </div>
            </SketchBox>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
