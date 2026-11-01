import { useState } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../../primitives';

// Illustrative 3-D "embeddings" of screen types, so the cosine is computed for real.
const SCREENS = {
  order: { label: 'Order details page', z: [0.9, 0.2, 0.1] },
  login: { label: 'Login form', z: [0.1, 0.95, 0.2] },
  home: { label: 'Home screen', z: [0.3, 0.2, 0.93] },
} as const;
type Screen = keyof typeof SCREENS;
const ACTIONS: { id: string; label: string; expects: Screen }[] = [
  { id: 'view', label: 'Tap “View order”', expects: 'order' },
  { id: 'signin', label: 'Tap “Sign in”', expects: 'login' },
  { id: 'back', label: 'Tap “Home”', expects: 'home' },
];
const cos = (a: readonly number[], b: readonly number[]) => a.reduce((s, x, i) => s + x * b[i], 0) / (Math.hypot(...a) * Math.hypot(...b));
export const suspicion = (expected: Screen, observed: Screen) => 1 - cos(SCREENS[expected].z, SCREENS[observed].z);

export default function TransitionSuspicion() {
  const t = useVizTokens();
  const [action, setAction] = useState(ACTIONS[0]);
  const [observed, setObserved] = useState<Screen>('login');
  const q = suspicion(action.expects, observed);
  const high = q > 0.3;
  return (
    <VisualizationContainer title="Transition check" footer={`q = 1 − cos(predicted, observed) = ${q.toFixed(2)}. The agent predicted a “${SCREENS[action.expects].label}” after “${action.label.replace('Tap ', '')}” and saw a “${SCREENS[observed].label}”. Illustrative 3-dimensional embeddings; the real verifier compares patch embeddings from a trained encoder.`}>
      <VisualizationHeader eyebrow="TRY IT" title="Did this action do what it should?" description="Pick what the agent did and what appeared. The check compares the screen it expected with the screen it got." />
      <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', color: t.textPrimary }}>
        <fieldset style={{ border: `1px solid ${t.border}`, borderRadius: 10, padding: '0.5rem 0.75rem' }}><legend>The agent…</legend>
          {ACTIONS.map(a => <label key={a.id} style={{ display: 'block', padding: '0.2rem 0' }}><input type="radio" name="tsa" checked={action.id === a.id} onChange={() => setAction(a)} /> {a.label}</label>)}
        </fieldset>
        <fieldset style={{ border: `1px solid ${t.border}`, borderRadius: 10, padding: '0.5rem 0.75rem' }}><legend>…and the screen shows</legend>
          {(Object.keys(SCREENS) as Screen[]).map(s => <label key={s} style={{ display: 'block', padding: '0.2rem 0' }}><input type="radio" name="tso" checked={observed === s} onChange={() => setObserved(s)} /> {SCREENS[s].label}</label>)}
        </fieldset>
      </div>
      <svg viewBox="0 0 520 70" width="100%" role="img" aria-label={`Suspicion score ${q.toFixed(2)}: ${high ? 'stop and ask the user' : 'continue'}.`} style={{ marginTop: '0.75rem' }}>
        <rect x={0} y={20} width={520} height={18} rx={9} fill={t.surfaceAlt} stroke={t.border} />
        <rect x={0} y={20} width={Math.max(10, q * 520)} height={18} rx={9} fill={high ? t.accentDanger : t.accentPrimary} />
        <text x={0} y={60} fontSize={12} fill={t.textSecondary}>0 · what the action should produce</text>
        <text x={520} y={60} fontSize={12} textAnchor="end" fill={t.textSecondary}>1 · unrelated screen</text>
        <text x={Math.min(500, Math.max(20, q * 520))} y={14} fontSize={13} fontWeight={700} textAnchor="middle" fill={t.textPrimary}>{q.toFixed(2)}</text>
      </svg>
      <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: high ? t.accentDanger : t.accentPrimary }}>{high ? 'Unexpected transition: stop and ask the user.' : 'Matches the prediction: continue.'}</p>
    </VisualizationContainer>
  );
}
