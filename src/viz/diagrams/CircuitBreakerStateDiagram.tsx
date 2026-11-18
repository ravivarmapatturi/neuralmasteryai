import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';

const STATES = [
  { key: 'closed', label: 'Closed', desc: 'Requests flow normally. The breaker is tracking the dependency\'s recent failure rate in the background.', next: 'Failure rate crosses threshold →' },
  { key: 'open', label: 'Open', desc: 'Requests fail instantly, without even attempting the call -- no wasted time waiting on a dependency that\'s clearly down. Stays open for a cooldown period.', next: 'Cooldown elapses →' },
  { key: 'half-open', label: 'Half-open', desc: 'A small number of test requests are let through to check whether the dependency has recovered, while most traffic still fails fast.', next: 'Test requests succeed → closed again  ·  fail → back to open' },
];

/** The three-state circuit breaker machine -- click through
 * closed → open → half-open to see what each state actually does. */
export default function CircuitBreakerStateDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick } = useAutoCycle(STATES.length, 2500, 1);
  const active = STATES[activeIdx].key;
  const s = STATES[activeIdx];

  const stateColor = (k: string) => (k === 'closed' ? t.accentPrimary : k === 'open' ? t.accentDanger : t.accentWarn);

  return (
    <VisualizationContainer footer={`${s.desc} ${s.next}`}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {STATES.map((x, i) => {
          const isActive = active === x.key;
          const c = stateColor(x.key);
          return (
            <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <div onClick={() => pick(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } }} onMouseEnter={() => pick(i)} style={{ cursor: 'pointer', flex: 1, textAlign: 'center', padding: '0.6rem 0.4rem', borderRadius: 7, background: isActive ? `${c}20` : t.surfaceAlt, border: `1.5px solid ${isActive ? c : t.border}` }}>
                <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? c : t.textPrimary }}>{x.label}</span>
              </div>
              {i < STATES.length - 1 && <span style={{ color: t.textMuted, fontSize: 12 }}>→</span>}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
