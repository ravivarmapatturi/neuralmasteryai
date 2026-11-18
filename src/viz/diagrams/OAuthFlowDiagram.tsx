import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STEPS = [
  { label: 'App redirects user to provider', desc: 'The requesting app sends the user\'s browser to the provider (e.g. "Sign in with Google"), not to itself.' },
  { label: 'User approves access, at the provider', desc: 'The user logs in and approves scopes DIRECTLY with the provider. The requesting app never sees the password.' },
  { label: 'Provider redirects back with an auth code', desc: 'A short-lived, single-use authorization code -- not yet an access token.' },
  { label: 'App exchanges code for an access token', desc: 'Server-to-server, using the app\'s own client secret -- this step never touches the user\'s browser.' },
  { label: 'App calls the API using the access token', desc: 'The app can now act on the user\'s behalf, scoped to whatever was approved in step 2.' },
];

/** OAuth's authorization-code flow, step through it -- the crucial
 * property is that the app's own secret is only ever used server-to-server
 * (step 4), and the user's password is never seen by the requesting app
 * at any point. */
export default function OAuthFlowDiagram() {
  const t = useVizTokens();
  const { value: step, pick: setStep, stop } = useAutoCycle(STEPS.length, 3000, 1);
  const color = getConceptColor(t, 'key');

  return (
    <VisualizationContainer footer={STEPS[step].desc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {STEPS.map((s, i) => {
          const isActive = step === i;
          const isPast = i < step;
          return (
            <div
              key={i}
              onClick={() => { stop(); setStep(i); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '0.5rem 0.7rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}`, opacity: isPast || isActive ? 1 : 0.55 }}
            >
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: isActive || isPast ? color : t.border, color: t.background, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontSize: 12, color: isActive ? color : t.textSecondary, fontWeight: isActive ? 700 : 400 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
        <button type="button" onClick={() => { stop(); setStep(Math.max(0, step - 1)); }} disabled={step === 0} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSecondary, cursor: step === 0 ? 'default' : 'pointer' }}>← prev</button>
        <button type="button" onClick={() => { stop(); setStep(Math.min(STEPS.length - 1, step + 1)); }} disabled={step === STEPS.length - 1} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSecondary, cursor: step === STEPS.length - 1 ? 'default' : 'pointer' }}>next →</button>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        Step {step + 1} of {STEPS.length} -- the authorization-code flow.
      </div>
    </VisualizationContainer>
  );
}
