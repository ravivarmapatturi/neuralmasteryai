import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BrandMark from '../brand/BrandMark';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PersonIcon } from '../icons/UiIcons';

/** Real, honest messages for the Firebase Auth error codes a visitor can
 * actually hit here -- never a bare "auth/email-already-in-use" code
 * leaking into the UI. The email-already-in-use case is the one that
 * matters most: it's Firebase's own account-uniqueness guarantee firing
 * (see AuthContext's signUpWithEmail docstring) for an email already
 * registered under ANY provider, including Google -- pointing the
 * visitor at Google sign-in instead is what keeps them from thinking
 * they need a second, disconnected account. */
function messageForAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email already has an account. If you signed up with Google, use "Continue with Google" instead.';
    case 'auth/invalid-email':
      return 'That doesn\'t look like a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts -- please wait a moment and try again.';
    case 'auth/operation-not-allowed':
      // Real, external config gap: Firebase Console -> Authentication ->
      // Sign-in method -> Email/Password is not enabled for this project.
      // No client-side code can fix this -- it needs a project owner with
      // console access to flip that one toggle.
      return 'Email sign-in isn\'t enabled yet -- please use "Continue with Google" for now.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/** The Google button + email/password form shown when a signed-out
 * visitor opens the sign-in panel -- both real options, not Google-only.
 * Mode toggles between "sign in" and "create account" for the email
 * path; Google sign-in is always available as the alternative, right
 * next to the email-already-in-use error, so a visitor who hits that
 * collision has an immediate, obvious next step. */
function SignInPanel({ onClose }: { onClose: () => void }) {
  const { signInWithGoogle, signUpWithEmail, signInWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLButtonElement>('.nm-auth-google')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]') ?? []);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, [onClose]);
  async function handleGoogle() {
    setBusy(true); setError(null);
    try { await signInWithGoogle(); onClose(); }
    catch (err) { setError(messageForAuthError(err)); }
    finally { setBusy(false); }
  }
  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      if (mode === 'signup') await signUpWithEmail(email.trim(), password);
      else await signInWithEmail(email.trim(), password);
      onClose();
    } catch (err) { setError(messageForAuthError(err)); }
    finally { setBusy(false); }
  }
  return createPortal(
    <div className="nm-auth-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialog} className="nm-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="nm-auth-title" aria-describedby="nm-auth-description">
        <button type="button" className="nm-auth-close" aria-label="Close sign in" onClick={onClose}>×</button>
        <div className="nm-auth-brand"><BrandMark size={32} /><span>Neural Mastery</span></div>
        <h2 id="nm-auth-title">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
        <p id="nm-auth-description">{mode === 'signup' ? 'Save your progress and build your understanding of AI.' : 'Pick up where you left off.'}</p>
        <button type="button" className="nm-auth-google" disabled={busy} onClick={handleGoogle}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.06a10 10 0 0 0 0 9.02l3.35-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.35 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>
          Continue with Google
        </button>
        <div className="nm-auth-divider"><span>or use your email</span></div>
        <form onSubmit={handleEmailSubmit} aria-busy={busy}>
          <label htmlFor="nm-auth-email">Email address</label>
          <input id="nm-auth-email" name="email" type="email" required autoComplete="email" placeholder="Email" value={email} disabled={busy} onChange={event => setEmail(event.target.value)} />
          <label htmlFor="nm-auth-password">Password</label>
          <div className="nm-auth-password"><input id="nm-auth-password" name="password" type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="Password" value={password} disabled={busy} onChange={event => setPassword(event.target.value)} /><button type="button" disabled={busy} onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div>
          {mode === 'signup' && <small>Use at least 6 characters.</small>}
          {error && <p className="nm-auth-error" role="alert">{error}</p>}
          <button className="nm-auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>
        <button type="button" className="nm-auth-mode" disabled={busy} onClick={() => { setMode(value => value === 'signin' ? 'signup' : 'signin'); setError(null); setPassword(''); setShowPassword(false); }}>{mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
        <div className="nm-auth-legal"><Link to="/privacy" onClick={onClose}>Privacy</Link><span>·</span><Link to="/terms" onClick={onClose}>Terms</Link></div>
      </div>
    </div>, document.body,
  );
}

/**
 * Sign-in/sign-out control for the navbar. Signed-out visitors see a
 * circular icon button -- same 32px footprint as the theme toggle right
 * next to it, deliberately NOT a wider "Sign in" text pill (an earlier
 * version used one and it pushed the mobile navbar past the viewport
 * width, caught by tests/smoke.spec.ts's "mobile navigation works"
 * overflow check). Clicking it opens a real panel offering BOTH Google
 * and email/password sign-in -- nothing runs unprompted until the
 * visitor picks one and submits. Signed-in visitors see their avatar
 * (initial-letter fallback if no photo, real for both providers) in
 * that same circular slot, which opens a small account menu (email,
 * a View Profile link to /profile, sign-out).
 */
export default function AuthButton() {
  const { user, loading, signOutUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  if (loading) return null; // avoid flashing "Sign in" before the real (likely signed-in) state is known

  if (!user) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Sign in"
          aria-expanded={menuOpen}
          title="Sign in"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            fontSize: 15,
            color: 'var(--nm-text-primary)',
            background: 'transparent',
            border: '1px solid var(--nm-border)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <PersonIcon />
        </button>
        {menuOpen && (
          <>
            <SignInPanel onClose={closeMenu} />
          </>
        )}
      </div>
    );
  }

  const initial = (user.displayName ?? user.email ?? '?').charAt(0).toUpperCase();

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={menuOpen}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '1px solid var(--nm-border)',
          background: 'var(--nm-accent-primary)',
          color: 'var(--nm-bg)',
          cursor: 'pointer',
          padding: 0,
          overflow: 'hidden',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initial
        )}
      </button>

      {menuOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setMenuOpen(false)} />
          <div
            style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              zIndex: 91,
              minWidth: 200,
              padding: '0.6rem',
              borderRadius: 10,
              border: '1px solid var(--nm-border)',
              background: 'var(--nm-surface)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ fontSize: 12.5, color: 'var(--nm-text-secondary)', padding: '0.2rem 0.3rem 0.6rem', wordBreak: 'break-all' }}>
              {user.email}
            </div>
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                fontSize: 13,
                color: 'var(--nm-text-primary)',
                textDecoration: 'none',
                borderRadius: 6,
                padding: '0.4rem 0.3rem',
              }}
            >
              View Profile
            </Link>
            <button
              type="button"
              onClick={async () => {
                setMenuOpen(false);
                await signOutUser();
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                fontSize: 13,
                color: 'var(--nm-text-primary)',
                background: 'transparent',
                border: 'none',
                borderRadius: 6,
                padding: '0.4rem 0.3rem',
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
