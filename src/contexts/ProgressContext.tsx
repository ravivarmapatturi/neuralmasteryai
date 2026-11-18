import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { normalizePracticeProblemPermalink } from '../lib/gamification';

const STORAGE_KEY = 'neural-mastery-progress';

// A simple, well-known Leitner-style ladder -- not full SM-2 with
// per-item difficulty, deliberately kept this simple for v1. Each
// successful "reviewed" click advances one stage; a page never regresses
// (there's no "failed this review" input in this UI, only "reviewed" or
// "not yet due").
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ProgressEntry {
  understood: boolean;
  /** When this page was last marked/reviewed. Absent on entries migrated
   * from the old boolean-only storage format -- those pages are understood
   * but have no review schedule yet (never "due"), not an error case. */
  markedAt?: number;
  /** Index into REVIEW_INTERVALS_DAYS. Absent alongside markedAt for the
   * same legacy reason. */
  stage?: number;
}

type UnderstoodMap = Record<string, ProgressEntry>;

interface ProgressContextValue {
  understood: UnderstoodMap;
  toggle: (permalink: string) => void;
  isUnderstood: (permalink: string) => boolean;
  countWithin: (permalinks: string[]) => number;
  reset: () => void;
  /** Permalinks currently marked understood whose next scheduled review
   * (per REVIEW_INTERVALS_DAYS) has passed. Only pages with a real
   * markedAt are ever eligible -- legacy entries with none are excluded,
   * per the "no review scheduled yet" contract above. */
  dueForReview: string[];
  /** Advance a page to its next review stage (or start it on the ladder
   * if it doesn't have one yet) and reset its due date from now. */
  markReviewed: (permalink: string) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

/** Which of two entries for the SAME permalink represents further-along
 * progress -- higher stage wins; a tie breaks on the more recent markedAt.
 * Used to merge a browser's local progress into a signed-in user's
 * existing Firestore progress on first sign-in (so signing in on a second
 * device can never make a page look LESS understood than it already did on
 * either side), and inside normalize() below for the rare case an old- and
 * new-style practice-problem permalink collide on the same real page after
 * normalization. */
function moreAdvanced(a: ProgressEntry, b: ProgressEntry): ProgressEntry {
  const aStage = a.stage ?? 0;
  const bStage = b.stage ?? 0;
  if (aStage !== bStage) return aStage > bStage ? a : b;
  return (a.markedAt ?? 0) >= (b.markedAt ?? 0) ? a : b;
}

/** Old storage entries were a bare `true`; new ones are a ProgressEntry
 * object. Normalizes either into the current shape so every consumer only
 * ever deals with one shape, without forcing an eager localStorage rewrite
 * on every page load. Also the shape Firestore data is normalized through
 * (a signed-in user's very first sync writes local-format entries there
 * directly, so this same normalizer covers both sources).
 *
 * Also rewrites any old-style /docs/practice-problems/<slug> permalink key
 * to its real, current /practice/<slug> equivalent (see
 * normalizePracticeProblemPermalink's comment in gamification.ts) so a
 * page marked understood before the Learn/Practice IA split doesn't look
 * un-marked once its canonical URL moved. moreAdvanced() resolves the rare
 * case where an old- and new-style permalink both normalize to the same
 * real page. */
function normalize(raw: unknown): UnderstoodMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: UnderstoodMap = {};
  for (const [rawPermalink, value] of Object.entries(raw as Record<string, unknown>)) {
    const permalink = normalizePracticeProblemPermalink(rawPermalink);
    let entry: ProgressEntry | undefined;
    if (value === true) {
      entry = { understood: true };
    } else if (value && typeof value === 'object' && (value as ProgressEntry).understood) {
      const v = value as ProgressEntry;
      entry = { understood: true, markedAt: v.markedAt, stage: v.stage };
    }
    // Anything else (false, malformed) is dropped -- toggle() never
    // persists a `false`/absent-but-present entry in the first place.
    if (entry) out[permalink] = out[permalink] ? moreAdvanced(out[permalink], entry) : entry;
  }
  return out;
}

function readStorage(): UnderstoodMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function writeStorage(value: UnderstoodMap) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) -- fail silently, progress just won't persist.
  }
}

function isDue(entry: ProgressEntry, now: number): boolean {
  if (entry.markedAt === undefined) return false; // legacy entry, no schedule yet
  const stage = entry.stage ?? 0;
  const intervalDays = REVIEW_INTERVALS_DAYS[Math.min(stage, REVIEW_INTERVALS_DAYS.length - 1)];
  return now - entry.markedAt >= intervalDays * DAY_MS;
}

/** Union of two understood-maps, keeping the more-advanced entry per page
 * where both sides have one. Never drops a page that exists on only one
 * side -- this is the "merge, don't wipe" contract for first sign-in. */
function mergeProgress(a: UnderstoodMap, b: UnderstoodMap): UnderstoodMap {
  const merged: UnderstoodMap = { ...a };
  for (const [permalink, entry] of Object.entries(b)) {
    merged[permalink] = merged[permalink] ? moreAdvanced(merged[permalink], entry) : entry;
  }
  return merged;
}

/** Loads firebase/firestore (and the initialized app from ../lib/firebase)
 * via a dynamic import, resolved only where this is actually called -- the
 * Firestore-sync effect and commit() below, both of which only ever run
 * for a signed-in user. A static top-level import here was confirmed (via
 * a real production build) to bundle the whole Firestore SDK into every
 * visitor's eager main chunk regardless of whether they ever sign in,
 * growing it from ~437kB to over 1.1MB -- the same class of bug this app's
 * katex dependency had, fixed the same way. */
async function loadFirestoreFor(uid: string) {
  const [{ db }, { doc, getDoc, setDoc, onSnapshot }] = await Promise.all([import('../lib/firebase'), import('firebase/firestore')]);
  return { ref: doc(db, 'progress', uid), getDoc, setDoc, onSnapshot };
}

/** A read or write issued immediately after sign-in/sign-up can hit a
 * real, documented Firebase race: the Firestore SDK's internal credential
 * listener can lag a tick behind `auth.currentUser` actually updating, so
 * the request goes out unauthenticated and fails with
 * "Missing or insufficient permissions" even though the user genuinely is
 * signed in. Confirmed live via direct trace logging (in
 * GamificationContext's sibling write to the same document) that the
 * FAILURE MODE isn't always a rejection: a setDoc() call was observed to
 * never resolve OR reject at all for over 40 real seconds (the Firestore
 * doc itself, verified via a direct SDK read, had the correct data the
 * whole time -- this is a client-side hang, never real data loss). A bare
 * retry loop that only reacts to rejection waits forever on a hung first
 * attempt and never even reaches a second one -- so each attempt here is
 * raced against its own timeout, which is what actually lets the retry
 * loop make progress. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 7, attemptTimeoutMs = 6000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('withRetry: attempt timed out')), attemptTimeoutMs)),
      ]);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** i));
    }
  }
  throw lastErr;
}

/**
 * Local-only (no account, nothing sent anywhere) "have I marked this page
 * understood" tracker, keyed by permalink -- UNLESS the visitor is signed
 * in (see AuthContext), in which case this same map syncs against
 * Firestore instead, keyed by their UID, and becomes readable/writable
 * from any device. Mounted once at the app root so every page shares the
 * same state without prop drilling. Also drives a simple spaced-repetition
 * review schedule on top of the same mark data (see REVIEW_INTERVALS_DAYS)
 * -- a page you marked understood becomes eligible for a "due for review"
 * nudge once its current interval elapses.
 *
 * Signed-out contract (must never regress): reads/writes go straight to
 * localStorage, exactly as before Firebase existed here -- no network
 * call is made, no sign-in wall, nothing changes for a visitor who never
 * signs in.
 *
 * Signed-in contract: on the transition to signed-in, this browser's
 * current localStorage map is merged (see mergeProgress, never a silent
 * overwrite) into whatever's already in Firestore for that UID, the
 * merged result is written back, and from that point on Firestore is the
 * single source of truth -- every write goes to Firestore first, and a
 * live onSnapshot subscription is what actually updates `understood`
 * (never a direct local setState from a write), so every open tab/device
 * for that user converges on the same state. localStorage is still kept
 * mirrored while signed in purely as a fresh fallback for if/when they
 * sign out on this browser.
 */
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { syncUser: user, loading: authLoading } = useAuth(); // guests save too
  const [understood, setUnderstood] = useState<UnderstoodMap>({});

  // Anonymous baseline -- always loaded once on mount, so there's an
  // immediate, correct value before Firebase's own auth check resolves.
  useEffect(() => {
    setUnderstood(readStorage());
  }, []);

  // Firestore sync -- only ever runs for a real signed-in user, which is
  // also exactly when loadFirestoreFor's dynamic import actually resolves
  // (never touched at all for the common signed-out case).
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setUnderstood(readStorage());
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    // See GamificationContext's identical call for why this is here --
    // `onAuthStateChanged` firing does not guarantee Firestore's own
    // internal credentials listener has picked up the new token yet.
    user.getIdToken(true).then(() => {
      if (cancelled) return;
      loadFirestoreFor(user.uid).then(async ({ ref, getDoc, setDoc, onSnapshot }) => {
        if (cancelled) return;
        const snap = await withRetry(() => getDoc(ref));
        const remote = snap.exists() ? normalize(snap.data()?.understood) : {};
        const merged = mergeProgress(remote, readStorage());
        if (cancelled) return;

        await withRetry(() => setDoc(ref, { understood: merged }, { merge: true }));
        if (cancelled) return;

        setUnderstood(merged);
        writeStorage(merged);

        unsubscribe = onSnapshot(
          ref,
          (snap) => {
            if (cancelled) return;
            const remote = snap.exists() ? normalize(snap.data()?.understood) : {};
            const currentMerged = mergeProgress(remote, readStorage());
            setUnderstood(currentMerged);
            writeStorage(currentMerged);
          },
          // See GamificationContext's identical onSnapshot error handler
          // for why this exists -- a transient listener error must never
          // mutate `understood` away from its last-known-good state.
          (err) => {
            console.error('Progress live sync listener error (local state unaffected):', err);
          },
        );
      }).catch((err) => {
        // Belt-and-suspenders: withRetry above already gives this many
        // chances to recover from the same auth-token race, but if it's
        // still exhausted, fail loudly (console) instead of as a silent,
        // stackless unhandled rejection.
        console.error('Progress sign-in sync failed after retrying:', err);
      });
    }).catch((err) => {
      console.error('Progress: forced ID token refresh failed:', err);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user, authLoading]);

  const commit = useCallback(
    (next: UnderstoodMap) => {
      setUnderstood(next);
      writeStorage(next);

      if (user) {
        user.getIdToken(true).then(() => {
          loadFirestoreFor(user.uid).then(async ({ ref, getDoc, setDoc }) => {
            const snap = await withRetry(() => getDoc(ref)).catch(() => null);
            const remoteMap = snap?.exists() ? normalize(snap.data()?.understood) : {};
            const merged = mergeProgress(remoteMap, next);
            setUnderstood(merged);
            writeStorage(merged);

            void withRetry(() => setDoc(ref, { understood: merged }, { merge: true })).catch((err) =>
              console.error('Failed to sync progress to the server after retrying:', err),
            );
          });
        });
      }
    },
    [user],
  );

  const toggle = useCallback(
    (permalink: string) => {
      const next = { ...understood };
      if (next[permalink]) {
        delete next[permalink];
      } else {
        next[permalink] = { understood: true, markedAt: Date.now(), stage: 0 };
      }
      commit(next);
    },
    [understood, commit],
  );

  const isUnderstood = useCallback((permalink: string) => !!understood[permalink]?.understood, [understood]);

  const countWithin = useCallback(
    (permalinks: string[]) => permalinks.filter((p) => understood[p]?.understood).length,
    [understood],
  );

  const reset = useCallback(() => {
    commit({});
  }, [commit]);

  const markReviewed = useCallback(
    (permalink: string) => {
      const existing = understood[permalink];
      if (!existing) return; // can't review a page that was never marked understood
      const nextStage = Math.min((existing.stage ?? 0) + 1, REVIEW_INTERVALS_DAYS.length - 1);
      commit({ ...understood, [permalink]: { understood: true, markedAt: Date.now(), stage: nextStage } });
    },
    [understood, commit],
  );

  const dueForReview = Object.keys(understood).filter((p) => isDue(understood[p], Date.now()));

  return (
    <ProgressContext.Provider value={{ understood, toggle, isUnderstood, countWithin, reset, dueForReview, markReviewed }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error('useProgress must be used within ProgressProvider');
  }
  return ctx;
}
