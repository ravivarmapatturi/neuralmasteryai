import { useState } from 'react';

const HAND = "'Kalam', 'Comic Sans MS', cursive";
export const FEEDBACK_TAGS = ['Too hard', 'Too easy', 'Found a mistake', 'Need more examples', 'Visual was unclear'] as const;

/**
 * "Was anything unclear?" box at the end of a Learn page. Quick taps plus an
 * optional note, saved to Firestore pageFeedback (create-only; only admins can
 * read it). Uses the visitor's account, which every visitor has (guest or real).
 */
export default function FeedbackBox({ route }: { route: string }) {
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const toggle = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const send = async () => {
    if (!tags.length && !note.trim()) return;
    setState('sending');
    try {
      const [{ auth, db }, { signInAnonymously }, { addDoc, collection, serverTimestamp }] = await Promise.all([
        import('../../lib/firebase'), import('firebase/auth'), import('firebase/firestore'),
      ]);
      const uid = auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid;
      await addDoc(collection(db, 'pageFeedback'), { page: route, tags, note: note.trim().slice(0, 1000), uid, at: serverTimestamp() });
      setState('sent');
    } catch {
      setState('error');
    }
  };

  const box = { fontFamily: HAND, border: '2px solid var(--nm-text-primary)', borderRadius: '16px 10px 18px 12px', padding: '14px 18px', margin: '1.5rem auto 0.5rem', maxWidth: 860, color: 'var(--nm-text-primary)' } as const;
  if (state === 'sent') {
    return <div style={box} role="status"><b>Thank you.</b> Your note went straight to the person who writes these pages.</div>;
  }
  return (
    <div style={box}>
      <div style={{ fontSize: 19, fontWeight: 700 }}>Was anything unclear?</div>
      <div style={{ fontSize: 15, color: 'var(--nm-text-secondary)', margin: '2px 0 10px' }}>Tap what fits. It takes five seconds and shapes the next version of this page.</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FEEDBACK_TAGS.map((t) => {
          const on = tags.includes(t);
          return (
            <button key={t} type="button" aria-pressed={on} onClick={() => toggle(t)}
              style={{ fontFamily: HAND, fontSize: 16, cursor: 'pointer', padding: '1px 12px', borderRadius: '12px 8px 13px 9px',
                border: `1.8px solid ${on ? 'var(--nm-accent-primary)' : 'var(--nm-border)'}`,
                background: on ? 'var(--nm-accent-primary)' : 'transparent', color: on ? 'var(--nm-surface, #fff)' : 'var(--nm-text-primary)' }}>
              {on ? '✓ ' : ''}{t}
            </button>
          );
        })}
      </div>
      <label htmlFor="nm-feedback-note" style={{ display: 'block', fontSize: 15, marginTop: 12, color: 'var(--nm-text-secondary)' }}>Anything else? (optional)</label>
      <textarea id="nm-feedback-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2}
        placeholder="e.g. the softmax step lost me"
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: HAND, fontSize: 16, padding: '6px 10px', marginTop: 4, borderRadius: 10,
          border: '1.5px solid var(--nm-border)', background: 'transparent', color: 'var(--nm-text-primary)', resize: 'vertical' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={send} disabled={state === 'sending' || (!tags.length && !note.trim())}
          style={{ fontFamily: HAND, fontSize: 16, cursor: 'pointer', padding: '2px 16px', borderRadius: '12px 8px 13px 9px',
            border: '2px solid var(--nm-text-primary)', background: 'var(--nm-text-primary)', color: 'var(--nm-surface, #fff)',
            opacity: state === 'sending' || (!tags.length && !note.trim()) ? 0.4 : 1 }}>
          {state === 'sending' ? 'Sending…' : 'Send feedback'}
        </button>
        {state === 'error' && <span style={{ fontSize: 15, color: 'var(--nm-accent-danger, #b91c1c)' }}>Couldn't send. Check your connection and try again.</span>}
      </div>
    </div>
  );
}
