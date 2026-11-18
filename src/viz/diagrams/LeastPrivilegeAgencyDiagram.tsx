import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';

const TOOLS = [
  { key: 'search', label: 'Web search', tier: 'auto', desc: 'Read-only, no side effects -- runs with no confirmation.' },
  { key: 'email', label: 'Send email', tier: 'confirm', desc: 'Externally visible, hard to undo -- requires explicit human confirmation before each send.' },
  { key: 'payment', label: 'Execute payment', tier: 'blocked', desc: 'Task didn\'t call for financial capability at all -- never granted, not even behind confirmation. This scope decision happens in advance, not at request time.' },
];

/** Three tools an agent might have access to, scoped to what the task
 * actually needs -- click one to see its access tier, the same
 * least-privilege principle IAM applies to services applied to an
 * agent's own tool access. */
export default function LeastPrivilegeAgencyDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick } = useAutoCycle(TOOLS.length, 2500, 1);
  const active = TOOLS[activeIdx].key;
  const x = TOOLS[activeIdx];
  const tierColor = (tier: string) => (tier === 'auto' ? t.accentPrimary : tier === 'confirm' ? t.accentWarn : t.accentDanger);

  return (
    <VisualizationContainer footer={x.desc}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {TOOLS.map((y, idx) => {
          const isActive = active === y.key;
          const c = tierColor(y.tier);
          return (
            <div key={y.key} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} onMouseEnter={() => pick(idx)} style={{ cursor: 'pointer', flex: 1, textAlign: 'center', padding: '0.5rem 0.5rem', borderRadius: 7, background: isActive ? `${c}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? c : t.border}` }}>
              <div style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? c : t.textPrimary }}>{y.label}</div>
              <div style={{ fontSize: 8, color: c, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>{y.tier}</div>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
