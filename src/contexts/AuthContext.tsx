import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';

interface AuthContextValue {
  /** null while the initial auth-state check is still in flight, undefined
   * (never) is not a state this uses -- see `loading` for that distinction. */
  user: User | null;
  /** The account data is saved under: the real user, or else the silent guest
   * account every visitor gets automatically. Use this for saving progress;
   * use `user` for anything that shows "signed in" or touches public data. */
  syncUser: User | null;
  /** True while the visitor is on their automatic guest account. */
  isGuest: boolean;
  /** Creates the visitor's guest account if they have none yet. Called on the
   * first action worth saving (XP, love, feedback), not on page load, so
   * readers who only browse, and search-engine crawlers, never create one. */
  ensureAccount: () => Promise<void>;
  /** True only until Firebase's first onAuthStateChanged callback fires --
   * lets a consumer avoid flashing "signed out" UI before the real answer
   * (a persisted session, restored from IndexedDB) is known. */
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  /** Real Firebase email/password sign-up. Deliberately does NOT pre-check
   * fetchSignInMethodsForEmail before calling this -- Firebase's own
   * "one account per email address" project setting (the default, and
   * left untouched here) already rejects createUserWithEmailAndPassword
   * with `auth/email-already-in-use` for an email that's registered under
   * ANY provider, including an existing Google sign-in -- that's the real
   * mechanism that keeps one person from ending up with two disconnected
   * identities, not a client-side check that could race or be bypassed.
   * Callers should catch that error code and point the visitor at Google
   * sign-in instead, never silently retry as a fresh account. */
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Thin wrapper around Firebase Auth's own state -- mounted once at the app
 * root (alongside ProgressProvider, which reads `user` from here to decide
 * whether to sync against Firestore or stay localStorage-only).
 *
 * firebase/auth is loaded via a dynamic import(), not a static one --
 * bundling it statically was confirmed (via a real production build) to
 * grow the app's eager main entry chunk from ~437kB to over 1.1MB, since
 * every visitor would download the full Firebase Auth SDK before first
 * paint regardless of whether they ever sign in. The dynamic import lets
 * Rollup split it into its own chunk that loads in parallel after first
 * paint instead -- the same fix already applied to this app's katex
 * dependency for the same reason. `type User` is erased at compile time
 * (a type-only import), so it costs nothing at runtime either way.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // `account` is whatever Firebase has, guest included; `user` hides guests.
  const [account, setAccount] = useState<User | null>(null);
  // Guests count as signed in (own profile, on the leaderboard); isGuest tells them apart.
  const user = account;
  const isGuest = !!account?.isAnonymous;
  const [loading, setLoading] = useState(true);
  // bumped when a guest gets their Neural_GuestN name, so consumers re-read user.displayName
  const [, setNameTick] = useState(0);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    Promise.all([import('../lib/firebase'), import('firebase/auth')]).then(
      ([{ auth }, { onAuthStateChanged, getRedirectResult }]) => {
        if (cancelled) return;
        getRedirectResult(auth).catch(() => {});

        unsubscribe = onAuthStateChanged(auth, (u) => {
          setAccount(u);
          setLoading(false);
          if (u?.isAnonymous && !u.displayName) {
            import('../lib/guestName').then(({ ensureGuestName }) => ensureGuestName(u))
              .then((name) => { if (name) setNameTick((x) => x + 1); })
              .catch(() => { /* name is cosmetic; Guest_XXXX fallback stays */ });
          }
        });
      },
    );

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const [{ auth }, { GoogleAuthProvider, signInWithPopup, signInWithRedirect, linkWithPopup, linkWithRedirect, signInWithCredential }] = await Promise.all([
      import('../lib/firebase'),
      import('firebase/auth'),
    ]);
    const provider = new GoogleAuthProvider();
    const guest = auth.currentUser?.isAnonymous ? auth.currentUser : null;
    try {
      // A guest is upgraded in place (same account, progress kept). If this
      // Google account already exists, switch to it instead.
      if (guest) {
        const res = await linkWithPopup(guest, provider);
        // swap the guest nickname for the real Google name
        const google = res.user.providerData.find((p) => p.providerId === 'google.com');
        if (google?.displayName) {
          const { updateProfile } = await import('firebase/auth');
          await updateProfile(res.user, { displayName: google.displayName, photoURL: google.photoURL ?? res.user.photoURL });
          setNameTick((x) => x + 1); // re-render with the new name
        }
      }
      else await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (guest && error?.code === 'auth/credential-already-in-use') {
        const cred = GoogleAuthProvider.credentialFromError(err as never);
        if (cred) { await signInWithCredential(auth, cred); return; }
      }
      if (guest && (error?.code === 'auth/popup-blocked' || /iPhone|iPad|iPod|Android/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : ''))) {
        await linkWithRedirect(guest, provider);
        return;
      }
      if (
        error?.code === 'auth/popup-blocked' ||
        error?.code === 'auth/popup-closed-by-user' ||
        /iPhone|iPad|iPod|Android/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
      ) {
        await signInWithRedirect(auth, provider);
      } else {
        throw err;
      }
    }
  }, []);

  const ensureAccount = useCallback(async () => {
    const [{ auth }, { signInAnonymously }] = await Promise.all([import('../lib/firebase'), import('firebase/auth')]);
    if (auth.currentUser) return;
    await signInAnonymously(auth);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const [{ auth }, { createUserWithEmailAndPassword, EmailAuthProvider, linkWithCredential }] = await Promise.all([import('../lib/firebase'), import('firebase/auth')]);
    const guest = auth.currentUser?.isAnonymous ? auth.currentUser : null;
    if (guest) {
      // upgrade the guest in place so its progress stays
      await linkWithCredential(guest, EmailAuthProvider.credential(email, password));
      return;
    }
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const [{ auth }, { signInWithEmailAndPassword }] = await Promise.all([import('../lib/firebase'), import('firebase/auth')]);
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOutUser = useCallback(async () => {
    const [{ auth }, { signOut }] = await Promise.all([import('../lib/firebase'), import('firebase/auth')]);
    await signOut(auth);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('neural-mastery-gamification');
      window.localStorage.removeItem('neural-mastery-progress');
    }
    // Deliberately does NOT call disableNetwork/enableNetwork -- an
    // earlier attempt to force a clean Firestore connection reset here
    // (in either order) was confirmed live to make no difference to a
    // real, reproducible "Missing or insufficient permissions" failure
    // on sign-in (isolated via a raw-SDK A/B repro with no app code:
    // that succeeds every time, with or without touching the network
    // state at all). See withRetry in GamificationContext/ProgressContext
    // for the actual mitigation.
  }, []);

  const value = useMemo(
    () => ({ user, syncUser: account, isGuest, ensureAccount, loading, signInWithGoogle, signUpWithEmail, signInWithEmail, signOutUser }),
    [user, account, isGuest, ensureAccount, loading, signInWithGoogle, signUpWithEmail, signInWithEmail, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
