import { useState } from 'react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch {
      // Popup closed/blocked, or a real network failure -- either way
      // there's nothing more useful to do than let the visitor retry.
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') await signUpWithEmail(email, password);
      else await signInWithEmail(email, password);
      onClose();
    } catch (err) {
      setError(messageForAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '110%',
        right: 0,
        zIndex: 91,
        width: 260,
        padding: '0.9rem',
        borderRadius: 10,
        border: '1px solid var(--nm-border)',
        background: 'var(--nm-surface)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      }}
    >
      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--nm-text-primary)',
          background: 'transparent',
          border: '1px solid var(--nm-border)',
          borderRadius: 8,
          padding: '0.5rem 0.6rem',
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        Continue with Google
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0.75rem 0', fontSize: 11, color: 'var(--nm-text-muted)' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--nm-border)' }} />
        or
        <div style={{ flex: 1, height: 1, background: 'var(--nm-border)' }} />
      </div>

      <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ fontSize: 13, padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid var(--nm-border)', background: 'var(--nm-bg)', color: 'var(--nm-text-primary)' }}
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ fontSize: 13, padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid var(--nm-border)', background: 'var(--nm-bg)', color: 'var(--nm-text-primary)' }}
        />
        {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--nm-accent-danger)', lineHeight: 1.4 }}>{error}</p>}
        <button
          type="submit"
          disabled={busy}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--nm-bg)',
            background: 'var(--nm-accent-primary)',
            border: 'none',
            borderRadius: 8,
            padding: '0.5rem 0.6rem',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
          setError(null);
        }}
        style={{ marginTop: 8, width: '100%', textAlign: 'center', fontSize: 12, color: 'var(--nm-accent-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        {mode === 'signup' ? 'Already have an account? Sign in' : "New here? Create an account"}
      </button>
    </div>
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
            <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setMenuOpen(false)} />
            <SignInPanel onClose={() => setMenuOpen(false)} />
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
