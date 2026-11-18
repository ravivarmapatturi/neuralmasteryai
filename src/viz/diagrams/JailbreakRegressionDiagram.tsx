import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';

const TIMELINE = [
  { label: 'v1: jailbreak works', blocked: false },
  { label: 'Patched', blocked: true },
  { label: 'v2: model update', blocked: true },
  { label: 'v3: prompt tweak', blocked: false },
];

/** A jailbreak that was patched, then silently starts working again
 * after an unrelated model update -- click through the timeline. */
export default function JailbreakRegressionDiagram() {
  const t = useVizTokens();
  const { value: step, pick } = useAutoCycle(TIMELINE.length, 2500, 3);
  const okColor = t.accentPrimary;
  const badColor = t.accentDanger;

  return (
    <VisualizationContainer footer={TIMELINE[step].blocked ? 'Blocked -- the jailbreak test suite confirms the patch still holds.' : 'REGRESSED -- an unrelated change (model update, prompt tweak) silently reopened a previously-patched jailbreak. Only running this test continuously, not just once pre-launch, catches this.'}>
      <div style={{ display: 'flex', gap: 4 }}>
        {TIMELINE.map((s, i) => {
          const isActive = step === i;
          const c = s.blocked ? okColor : badColor;
          return (
            <div key={s.label} onClick={() => pick(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } }} onMouseEnter={() => pick(i)} style={{ flex: 1, cursor: 'pointer', padding: '0.5rem', borderRadius: 7, textAlign: 'center', background: isActive ? `${c}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? c : t.border}` }}>
              <div style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, color: isActive ? c : t.textPrimary }}>{s.label}</div>
              <div style={{ fontSize: 8, color: c, marginTop: 2 }}>{s.blocked ? '✓ blocked' : '✗ works again'}</div>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
