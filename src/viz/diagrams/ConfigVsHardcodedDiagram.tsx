import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const ENVS = ['dev', 'staging', 'production'];

/** Deploying the same code to three environments -- click to compare
 * hardcoded values requiring a code change per environment against
 * config-driven values that don't. */
export default function ConfigVsHardcodedDiagram() {
  const t = useVizTokens();
  const { value, pick } = useAutoCycle(2, 4000, 1);
  const configDriven = value === 1;
  const color = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;
  const okColor = t.accentPrimary;

  return (
    <VisualizationContainer footer={configDriven ? 'The same code runs in all three environments -- only the config file changes.' : 'Deploying to staging or production requires editing and re-reviewing the code itself, just to change a batch size or file path.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => pick(0)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !configDriven ? 700 : 500, background: !configDriven ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!configDriven ? color : t.border}`, color: !configDriven ? color : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
          Hardcoded values
        </button>
        <button type="button" onClick={() => pick(1)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: configDriven ? 700 : 500, background: configDriven ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${configDriven ? color : t.border}`, color: configDriven ? color : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
          Config-driven
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {ENVS.map((e) => (
          <div key={e} style={{ flex: 1, textAlign: 'center', padding: '0.5rem 0.4rem', borderRadius: 7, background: configDriven ? `${okColor}12` : `${badColor}12`, border: `1.5px solid ${configDriven ? okColor : badColor}`, transition: 'all 300ms ease' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: configDriven ? okColor : badColor }}>{e}</div>
            <div style={{ fontSize: 8, color: t.textMuted, marginTop: 2 }}>{configDriven ? '✓ config.yaml swap' : '⚠ code edit required'}</div>
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
