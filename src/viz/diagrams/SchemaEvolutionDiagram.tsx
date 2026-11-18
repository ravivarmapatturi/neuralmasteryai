import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

type Change = 'safe' | 'breaking';

/** A downstream consumer, and a schema change -- toggle to see whether
 * it keeps working or breaks, based on whether the new field is optional
 * or required. */
export default function SchemaEvolutionDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(2, 3800);
  const change: Change = cyc.value === 0 ? 'breaking' : 'safe';
  const okColor = t.accentPrimary;
  const badColor = t.accentDanger;
  const color = change === 'safe' ? okColor : badColor;

  return (
    <VisualizationContainer
      footer={change === 'safe'
        ? 'New field added as OPTIONAL -- existing consumers that don\'t know about it keep working unchanged. Backward-compatible.'
        : 'New field added as REQUIRED -- every existing consumer that doesn\'t send it now fails validation. A breaking change, silently rolled out.'}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div
          onClick={() => cyc.pick(1)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              cyc.pick(1);
            }
          }}
          onMouseEnter={() => cyc.pick(1)}
          style={{
            flex: 1,
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: 7,
            background: change === 'safe' ? `${okColor}18` : t.surfaceAlt,
            border: `1.5px solid ${change === 'safe' ? okColor : t.border}`,
            boxShadow: change === 'safe' && !reducedMotion ? `0 0 6px ${okColor}33` : 'none',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: change === 'safe' ? okColor : t.textPrimary }}>New field: optional</span>
        </div>
        <div
          onClick={() => cyc.pick(0)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              cyc.pick(0);
            }
          }}
          onMouseEnter={() => cyc.pick(0)}
          style={{
            flex: 1,
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: 7,
            background: change === 'breaking' ? `${badColor}18` : t.surfaceAlt,
            border: `1.5px solid ${change === 'breaking' ? badColor : t.border}`,
            boxShadow: change === 'breaking' && !reducedMotion ? `0 0 6px ${badColor}33` : 'none',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: change === 'breaking' ? badColor : t.textPrimary }}>New field: required</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ padding: '0.6rem', borderRadius: 8, background: `${color}12`, border: `1.5px solid ${color}`, textAlign: 'center', flex: 1, transition: 'all 0.3s ease' }}>
          <div style={{ fontSize: 10.5, color: t.textMuted }}>Producer (new schema)</div>
        </div>
        <div style={{ fontSize: 14, color }}>→</div>
        <div
          style={{
            padding: '0.6rem',
            borderRadius: 8,
            background: `${color}12`,
            border: `1.5px solid ${color}`,
            boxShadow: !reducedMotion ? `0 0 8px ${color}25` : 'none',
            textAlign: 'center',
            flex: 1,
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, color }}>{change === 'safe' ? 'Old consumer: ✓ fine' : 'Old consumer: ✗ breaks'}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        A data contract formalizes exactly this agreement, so this decision is explicit rather than an implicit, easily-broken assumption.
      </div>
    </VisualizationContainer>
  );
}