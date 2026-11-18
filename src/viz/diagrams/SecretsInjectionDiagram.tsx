import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** Where a database credential ends up -- click to compare it
 * hardcoded into a git-committed file against injected at runtime
 * from a secrets manager. */
export default function SecretsInjectionDiagram() {
  const t = useVizTokens();
  const { value: modeIdx, pick } = useAutoCycle(2, 3500, 1);
  const correct = modeIdx === 1;
  const color = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;
  const okColor = t.accentPrimary;

  return (
    <VisualizationContainer footer={correct ? 'The secrets manager injects the credential into the running process\'s environment at startup -- it never touches disk, git history, or a Docker layer.' : 'A hardcoded credential in a Dockerfile or .env gets committed to git history (or baked into an image layer) permanently -- rotating it later doesn\'t remove it from history that already leaked.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => pick(0)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !correct ? 700 : 500, background: !correct ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!correct ? color : t.border}`, color: !correct ? color : t.textSecondary, cursor: 'pointer' }}>
          Hardcoded in .env/Dockerfile
        </button>
        <button type="button" onClick={() => pick(1)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: correct ? 700 : 500, background: correct ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${correct ? color : t.border}`, color: correct ? color : t.textSecondary, cursor: 'pointer' }}>
          Secrets manager, runtime injection
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <div style={{ padding: '0.6rem 0.7rem', borderRadius: 7, background: t.surfaceAlt, border: `1.5px solid ${t.border}` }}>
          <span style={{ fontSize: 9.5, color: t.textSecondary }}>{correct ? 'Secrets Manager / Vault' : 'Dockerfile / .env'}</span>
        </div>
        <span style={{ color: t.textMuted, fontSize: 14 }}>→</span>
        <div style={{ padding: '0.6rem 0.7rem', borderRadius: 7, background: `${correct ? okColor : badColor}18`, border: `1.5px solid ${correct ? okColor : badColor}` }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: correct ? okColor : badColor }}>{correct ? 'injected at runtime, in memory only' : 'committed to git history / image layer'}</span>
        </div>
      </div>
    </VisualizationContainer>
  );
}
