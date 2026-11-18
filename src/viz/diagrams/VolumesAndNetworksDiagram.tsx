import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** A container's own filesystem is ephemeral -- click "remove container"
 * to see it vanish, while a mounted volume survives untouched. Alongside,
 * the network connecting multiple containers together. */
export default function VolumesAndNetworksDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(2, 3800);
  const removed = cyc.value === 1;
  const containerColor = getConceptColor(t, 'attention');
  const volumeColor = getConceptColor(t, 'query');

  return (
    <VisualizationContainer footer={removed ? 'Container removed -- its own filesystem is gone. The volume, mounted from OUTSIDE the container, is untouched and ready to be mounted into a new container.' : 'A container writes to both its own ephemeral filesystem and a mounted volume. Click "remove container" to see which survives.'}>
      <button
        type="button"
        onClick={() => cyc.pick(removed ? 0 : 1)}
        style={{
          marginBottom: 10,
          padding: '6px 12px',
          borderRadius: 6,
          border: `1px solid ${t.accentDanger}`,
          background: removed ? `${t.accentDanger}15` : 'transparent',
          color: t.accentDanger,
          boxShadow: removed && !reducedMotion ? `0 0 6px ${t.accentDanger}33` : 'none',
          cursor: 'pointer',
          fontSize: 11.5,
          fontWeight: 700,
          transition: 'all 0.2s ease',
        }}
      >
        {removed ? 'Recreate container' : 'Remove container'}
      </button>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, opacity: removed ? 0.2 : 1, transition: 'opacity 300ms', padding: '0.8rem', borderRadius: 10, background: `${containerColor}18`, border: `2px solid ${containerColor}`, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: containerColor }}>Container</div>
          <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>own filesystem: {removed ? 'GONE' : 'ephemeral'}</div>
        </div>
        <div style={{ fontSize: 16, color: t.textMuted }}>↔</div>
        <div
          style={{
            flex: 1,
            padding: '0.8rem',
            borderRadius: 10,
            background: `${volumeColor}18`,
            border: `2px solid ${volumeColor}`,
            textAlign: 'center',
            boxShadow: removed && !reducedMotion ? `0 0 10px ${volumeColor}44` : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: volumeColor }}>Volume</div>
          <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>persists regardless</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Networks work the same way conceptually -- external to any one container, connecting multiple containers (an API + a Postgres + a Redis) and controlling what's exposed to the host.
      </div>
    </VisualizationContainer>
  );
}