import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** A server needing a config change -- click to compare mutating it
 * in place (config management) against replacing it entirely
 * (immutable infrastructure). */
export default function ImmutableVsConfigMgmtDiagram() {
  const t = useVizTokens();
  const { value, pick } = useAutoCycle(2, 3500, 1);
  const immutable = value === 1;
  const color = getConceptColor(t, 'attention');
  const okColor = t.accentPrimary;

  return (
    <VisualizationContainer footer={immutable ? 'A new image/container is built with the change baked in, and replaces the old instance entirely -- the model containers and most cloud-native infra default to, eliminating "it drifted from what the config says" bugs.' : 'Ansible/Chef/Puppet mutate the running server into the desired state -- install a package, edit a config file, restart a service. The server persists and gets updated in place.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => pick(0)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !immutable ? 700 : 500, background: !immutable ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!immutable ? color : t.border}`, color: !immutable ? color : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
          Configuration management
        </button>
        <button type="button" onClick={() => pick(1)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: immutable ? 700 : 500, background: immutable ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${immutable ? color : t.border}`, color: immutable ? color : t.textSecondary, cursor: 'pointer', transition: 'all 200ms ease' }}>
          Immutable infrastructure
        </button>
      </div>
      {immutable ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <div style={{ padding: '0.6rem 0.8rem', borderRadius: 7, background: t.surfaceAlt, border: `1.5px solid ${t.border}`, opacity: 0.4, textDecoration: 'line-through' }}>
            <span style={{ fontSize: 10, color: t.textMuted }}>old instance</span>
          </div>
          <span style={{ color: t.textMuted, fontSize: 14 }}>→</span>
          <div style={{ padding: '0.6rem 0.8rem', borderRadius: 7, background: `${okColor}18`, border: `1.5px solid ${okColor}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: okColor }}>new instance (change baked in)</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ padding: '0.6rem 0.8rem', borderRadius: 7, background: `${okColor}18`, border: `1.5px solid ${okColor}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: okColor }}>same instance, mutated in place</span>
          </div>
        </div>
      )}
    </VisualizationContainer>
  );
}
