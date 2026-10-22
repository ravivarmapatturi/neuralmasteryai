import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  type AwardEvent,
  MARK_UNDERSTOOD_POINTS,
  pointsForDifficulty,
  SYSTEM_DESIGN_CHALLENGE_POINTS,
  ARCHITECTURE_COMPLETED_POINTS,
  FLASHCARD_REVEAL_POINTS,
  DAILY_SIGNIN_POINTS,
  REVIEW_COMPLETED_POINTS,
  DEPTH_REVEAL_POINTS,
  BLOG_READ_POINTS,
  hasAward,
  totalPoints,
  weeklyPoints as computeWeeklyPoints,
  weekStartDateString,
  computeStreak,
  mergeEvents,
  localDateString,
  computeDisplayName,
  normalizePracticeProblemPermalink,
} from '../lib/gamification';
import type { User } from 'firebase/auth';
import { showRewardToast } from '../components/ui/Confetti';
import { BADGES } from '../lib/badges';


const STORAGE_KEY = 'neural-mastery-gamification';
/** A user-chosen display name override -- e.g. "neuralmastery" instead of
 * the Firebase Auth-derived "ravivarmapatturi" (email handle) or Google
 * account name. Stored locally for guests; for a signed-in user it's also
 * persisted to progress/{uid}.displayNameOverride (synced across devices,
 * linked to their account) AND mirrored onto leaderboard/{uid}.displayName
 * so the leaderboard shows the same chosen name, not the raw account one. */
const DISPLAY_NAME_KEY = 'neural-mastery-display-name-override';

function readDisplayNameOverride(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DISPLAY_NAME_KEY);
  } catch {
    return null;
  }
}

function writeDisplayNameOverride(name: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISPLAY_NAME_KEY, name);
  } catch {
    // localStorage unavailable -- fail silently, same contract as writeStorage.
  }
}

interface GamificationContextValue {
  points: number;
  weeklyPoints: number;
  streak: number;
  /** Real underlying award-event log -- exposed (not just the derived
   * totals above) so pages that need a per-topic or per-day breakdown
   * (topicBreakdown, activityCounts in lib/gamification.ts) can compute
   * it themselves without a second, parallel data path. */
  events: AwardEvent[];
  /** The resolved display name to show anywhere a user's identity appears
   * (profile header, leaderboard) -- a user-chosen override if one has
   * been set (see updateDisplayName), otherwise computeDisplayName's
   * Firebase Auth-derived default. Every page should read this instead of
   * calling computeDisplayName(user) directly, so an override is honored
   * everywhere consistently. */
  displayName: string;
  /** Sets a user-chosen display name, persisted to this account (and
   * mirrored onto the public leaderboard entry) for a signed-in user, or
   * to this browser only for a signed-out guest. See its own comment
   * above for the full sync contract. */
  updateDisplayName: (name: string) => void;
  awardMarkUnderstood: (permalink: string) => void;
  /** difficulty: the problem's real frontmatter difficulty ('easy' |
   * 'medium' | 'hard' | undefined) -- see pointsForDifficulty in
   * lib/gamification.ts for why this scales the award instead of every
   * problem paying out the same flat value. */
  awardProblemCompleted: (permalink: string, difficulty: string | undefined, bonusPoints?: number, hintUsed?: boolean) => void;
  awardSystemDesignCompleted: (permalink: string) => void;
  /** id: a stable, synthetic (non-URL) identifier for one flashcard --
   * e.g. "flashcard:home-kv-cache" -- not a real page permalink, so it's
   * deliberately excluded from topicBreakdown's by-topic pie (which only
   * recognizes real /docs or /practice permalinks) while still counting
   * toward total points, level, and streak. First-reveal-only, same
   * no-double-award contract as every other award kind (see `award`). */
  awardFlashcardRevealed: (id: string) => void;
  /** Small once-per-real-calendar-day reward for a real sign-in --
   * complements (never replaces) the streak mechanic. Idempotent, same
   * as every other award kind: safe to call on every sign-in, every
   * page load while signed in -- see lib/gamification.ts's
   * DAILY_SIGNIN_POINTS for why the de-dupe needs no separate
   * date-boundary logic of its own. */
  awardDailySignIn: () => void;
  /** stage: the review stage just REACHED (post-increment), not the one
   * before -- see ProgressContext's REVIEW_INTERVALS_DAYS. Awarded per
   * real stage transition (synthetic `review:<permalink>:<stage>`
   * permalink), so a page's full spaced-repetition lifecycle can earn
   * this multiple real times, never more than once per actual
   * transition -- see lib/gamification.ts's REVIEW_COMPLETED_POINTS. */
  awardReviewCompleted: (permalink: string, stage: number) => void;
  /** id: a stable, synthetic identifier for one ELI5/Deep-Dive block
   * (see ExpandableDepth.tsx) -- same first-reveal-only contract as
   * awardFlashcardRevealed. */
  awardDepthRevealed: (id: string) => void;
  /** Awards points for correctly designing and verifying an agent architecture canvas. */
  awardArchitectureCompleted: (permalink: string, points?: number) => void;
  /** Marking a blog post read (BlogPostPage): once per post. */
  awardBlogRead: (slug: string) => void;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

/** Rewrites any old-style /docs/practice-problems/<slug> permalink to its
 * real, current /practice/<slug> equivalent (see normalizePracticeProblemPermalink's
 * own comment in gamification.ts for why), then dedupes by permalink+kind
 * via mergeEvents -- covers the edge case where an old-style and a
 * genuinely new-style event for the same problem+kind both ended up in one
 * source (e.g. a pre-migration award plus a same-session re-award before
 * this normalization existed). Applied to every raw AwardEvent[] the
 * instant it's read (local storage AND both Firestore read points below)
 * so `events` in React state is always already in current-URL form -- a
 * later award() call's hasAward() check then naturally sees the migrated
 * permalink and won't double-award it. */
function normalizeEvents(events: AwardEvent[]): AwardEvent[] {
  return mergeEvents(
    [],
    events.map((e) => ({ ...e, permalink: normalizePracticeProblemPermalink(e.permalink) })),
  );
}

function readStorage(): AwardEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeEvents(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

function writeStorage(events: AwardEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // localStorage unavailable -- fail silently, same contract as ProgressContext.
  }
}

/** Same dynamic-import-for-bundle-size reason as ProgressContext's own
 * loadFirestoreFor -- ships firebase/firestore only when actually needed
 * (a signed-in user), never in the eager main chunk. Duplicated rather
 * than shared with ProgressContext on purpose: these are two independent
 * concerns that happen to sync fields on the same document, and coupling
 * their Firestore-loading internals together for a few duplicated lines
 * isn't worth the cross-context dependency. */
async function loadFirestoreFor(uid: string) {
  const [{ db }, { doc, getDoc, setDoc, onSnapshot }] = await Promise.all([import('../lib/firebase'), import('firebase/firestore')]);
  return { progressRef: doc(db, 'progress', uid), leaderboardRef: doc(db, 'leaderboard', uid), getDoc, setDoc, onSnapshot };
}

/** A read or write issued immediately after sign-in/sign-up can hit a
 * real, documented Firebase race: the Firestore SDK's internal credential
 * listener can lag a tick behind `auth.currentUser` actually updating, so
 * the request goes out unauthenticated and fails with
 * "Missing or insufficient permissions" even though the user genuinely is
 * signed in. Confirmed live via direct trace logging that the FAILURE
 * MODE isn't always a rejection: after a sign-out/sign-in cycle, a
 * setDoc() call was observed to never resolve OR reject at all for over
 * 40 real seconds (the Firestore doc itself, verified via a direct SDK
 * read, had the correct data the whole time -- this is a client-side
 * hang, never real data loss). A bare retry loop that only reacts to
 * rejection waits forever on a hung first attempt and never even reaches
 * a second one -- so each attempt here is raced against its own timeout,
 * which is what actually lets the retry loop make progress. */
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

/** Builds the public leaderboard document's fields from a real event log --
 * co-located with (not a separate reactive effect off of) every place the
 * private progress doc's gamificationEvents actually get written, so the
 * two are always written together, in the same async call, using the SAME
 * `events` value -- no separate effect racing against its own stale
 * closure of `events` from a prior render. */
function leaderboardFields(user: User, events: AwardEvent[], now: number, displayNameOverride?: string | null) {
  return {
    displayName: displayNameOverride || computeDisplayName(user),
    allTimePoints: totalPoints(events),
    weeklyPoints: computeWeeklyPoints(events, new Date(now)),
    weekStart: weekStartDateString(new Date(now)),
    updatedAt: now,
  };
}

/**
 * Points, weekly points, and streak -- all derived (see src/lib/gamification.ts
 * for why) from a real per-award event log stored alongside ProgressContext's
 * own `understood` map, as a sibling `gamificationEvents` field on the same
 * Firestore `progress/{uid}` document (or, signed-out, a separate localStorage
 * key -- never touching ProgressContext's own storage format).
 *
 * Same signed-out/signed-in contract as ProgressContext: signed-out visitors
 * get localStorage-only points/streak with zero network calls; on sign-in,
 * this browser's local event log is merged (union, deduped by permalink+kind,
 * see mergeEvents) into whatever Firestore already has, and Firestore becomes
 * the source of truth from then on via a live onSnapshot subscription.
 *
 * Also writes a denormalized snapshot to a SEPARATE `leaderboard/{uid}`
 * document alongside every progress-doc write -- the private `progress/{uid}`
 * document's security rules correctly block cross-user reads (verified via
 * the emulator), so a leaderboard genuinely cannot be computed from it; a
 * deliberately public-readable (but only self-writable) sibling collection
 * is what makes ranking possible without weakening that privacy guarantee.
 *
 * Every "what day is it" computation below explicitly threads `Date.now()`
 * through as an argument (`new Date(Date.now())`), never relying on a bare
 * `new Date()`'s own default -- confirmed directly (not assumed) that
 * `vi.spyOn(Date, 'now')` does NOT make a no-argument `new Date()`
 * deterministic in tests, even without fake timers involved at all.
 */
export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<AwardEvent[]>([]);
  // `award()` reads this ref, never the `events` state closure directly.
  // React batches/defers state updates, so two award() calls firing back
  // to back (e.g. submitting two problems within the same tick, or a
  // double-invoked handler) can both capture the SAME pre-update `events`
  // snapshot -- each then computes nextEvents missing the other's new
  // entry, and each independently commits its own get-merge-set round
  // trip to Firestore. Because `{merge: true}` replaces an array FIELD
  // wholesale rather than merging its elements, whichever round trip's
  // setDoc lands last silently overwrites the other's write, permanently
  // losing that event (this is the real cause of a real reported bug:
  // "solved count stuck at 1 despite solving more"). Updating this ref
  // synchronously on every real change -- before the async Firestore
  // work in commit()/the sign-in effect even starts -- means a same-tick
  // second call always sees the first call's addition, matching the
  // pre-existing displayNameOverrideRef pattern just below for the same
  // class of stale-closure bug.
  const eventsRef = useRef<AwardEvent[]>([]);
  const updateEvents = useCallback((next: AwardEvent[]) => {
    eventsRef.current = next;
    setEvents(next);
  }, []);
  const [displayNameOverride, setDisplayNameOverride] = useState<string | null>(null);
  // Read via a ref (not the state closure) inside commit()/the sign-in
  // effect below -- those callbacks are created once per `user` change and
  // otherwise capture a stale `displayNameOverride` from whenever they were
  // last recreated, which would silently re-overwrite a freshly-changed
  // name back to an older value on the very next award.
  const displayNameOverrideRef = useRef<string | null>(null);
  useEffect(() => {
    displayNameOverrideRef.current = displayNameOverride;
  }, [displayNameOverride]);

  useEffect(() => {
    updateEvents(readStorage());
    setDisplayNameOverride(readDisplayNameOverride());
  }, [updateEvents]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      updateEvents(readStorage());
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    // Force a fresh ID token before any Firestore call. `onAuthStateChanged`
    // firing in this app does not guarantee Firestore's own internal
    // credentials listener (a separate subscriber on the same Auth
    // instance) has picked up the new token yet -- it can lag by a tick,
    // and issuing a Firestore call before it catches up is a documented
    // source of "Missing or insufficient permissions" even though the
    // user genuinely is signed in. Awaiting a forced refresh here blocks
    // until that listener is caught up before the first Firestore call
    // ever goes out.
    user.getIdToken(true).then(() => {
      if (cancelled) return;
      loadFirestoreFor(user.uid).then(async ({ progressRef, leaderboardRef, getDoc, setDoc, onSnapshot }) => {
        if (cancelled) return;
        const snap = await withRetry(() => getDoc(progressRef));
        const remoteEvents: AwardEvent[] = snap.exists()
          ? normalizeEvents(Array.isArray(snap.data()?.gamificationEvents) ? snap.data()!.gamificationEvents : [])
          : [];
        let merged = mergeEvents(remoteEvents, readStorage());

        // Reconcile a display-name override the same way events merge:
        // Firestore wins if it already has one (another device's edit, or
        // this account's own prior choice); otherwise a name chosen while
        // this browser was still signed out carries over onto the account
        // instead of being silently dropped at sign-in.
        const remoteOverride = typeof snap.data()?.displayNameOverride === 'string' ? (snap.data()!.displayNameOverride as string) : null;
        const resolvedOverride = remoteOverride ?? readDisplayNameOverride();
        if (resolvedOverride) {
          setDisplayNameOverride(resolvedOverride);
          displayNameOverrideRef.current = resolvedOverride;
          writeDisplayNameOverride(resolvedOverride);
        }
        // Daily sign-in reward folded directly into this same merge, not
        // a separate award()/commit() call -- an earlier version fired it
        // from its own independent effect, which raced this same
        // read-merge-write cycle (two uncoordinated Firestore round trips
        // both computing "the real events" from their own separate
        // getDoc snapshot, each writing back independently) -- the exact
        // class of bug fixed elsewhere in this file today. Computing it
        // here means there's only ever one read-merge-write per sign-in.
        const todaySignInKey = `signin:${localDateString(new Date(Date.now()))}`;
        if (!hasAward(merged, todaySignInKey, 'signin')) {
          merged = [...merged, { permalink: todaySignInKey, kind: 'signin', date: localDateString(new Date(Date.now())), points: DAILY_SIGNIN_POINTS }];
          showRewardToast({ title: 'Welcome Back!', subtitle: `Great work! Earned +${DAILY_SIGNIN_POINTS} XP`, xp: DAILY_SIGNIN_POINTS, icon: '' });
          void import('../lib/firebase').then(({ trackFeatureEvent }) => trackFeatureEvent('daily_signin_reward', { points: DAILY_SIGNIN_POINTS }));
        }
        if (cancelled) return;

        // The progress write and the leaderboard write are deliberately
        // NOT bundled in a single Promise.all -- confirmed live that the
        // leaderboard write can fail (permission-denied) independently of
        // the progress write succeeding, and Promise.all rejecting on
        // EITHER promise was blocking `setEvents(merged)` below from ever
        // running even when the real, correct progress data had already
        // been written successfully. A leaderboard failure should never
        // prevent a signed-in user's own progress from loading -- this
        // matches commit()'s already-correct independent-write pattern.
        await withRetry(() =>
          setDoc(progressRef, { gamificationEvents: merged, ...(resolvedOverride ? { displayNameOverride: resolvedOverride } : {}) }, { merge: true }),
        );
        if (cancelled) return;
        void withRetry(() => setDoc(leaderboardRef, leaderboardFields(user, merged, Date.now(), resolvedOverride), { merge: true })).catch((err) =>
          console.error('Failed to sync leaderboard entry to the server after retrying:', err),
        );

        updateEvents(merged);
        writeStorage(merged);

        unsubscribe = onSnapshot(
          progressRef,
          (snap) => {
            if (cancelled) return;
            const remote: AwardEvent[] = normalizeEvents(Array.isArray(snap.data()?.gamificationEvents) ? snap.data()!.gamificationEvents : []);
            const currentMerged = mergeEvents(remote, readStorage());
            updateEvents(currentMerged);
            writeStorage(currentMerged);

            const liveOverride = typeof snap.data()?.displayNameOverride === 'string' ? (snap.data()!.displayNameOverride as string) : null;
            if (liveOverride && liveOverride !== displayNameOverrideRef.current) {
              setDisplayNameOverride(liveOverride);
              displayNameOverrideRef.current = liveOverride;
              writeDisplayNameOverride(liveOverride);
            }
          },
          // Without this, a transient listener error (the same auth-token
          // race withRetry above guards against, but on the LIVE
          // subscription rather than a one-shot call) surfaces as an
          // uncaught "Missing or insufficient permissions" -- confirmed
          // live this was still happening even after the getDoc/setDoc
          // calls above were made retry-safe. Never mutate `events` from
          // here: the last-known-good state (from the retried getDoc/setDoc
          // right above) stays in place until the listener recovers on its
          // own, which the SDK does automatically once its connection is
          // healthy again.
          (err) => {
            console.error('Gamification live sync listener error (local state unaffected):', err);
          },
        );
      }).catch((err) => {
        // Belt-and-suspenders: withRetry above already gives this many
        // chances to recover from the same auth-token race, but if it's
        // still exhausted, fail loudly (console) instead of as a silent,
        // stackless unhandled rejection.
        console.error('Gamification sign-in sync failed after retrying:', err);
      });
    }).catch((err) => {
      console.error('Gamification: forced ID token refresh failed:', err);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user, authLoading, updateEvents]);

  const commit = useCallback(
    (next: AwardEvent[]) => {
      const normalized = normalizeEvents(next);
      updateEvents(normalized);
      writeStorage(normalized);

      if (user) {
        user.getIdToken(true).then(() => {
          loadFirestoreFor(user.uid).then(async ({ progressRef, leaderboardRef, getDoc, setDoc }) => {
            const snap = await withRetry(() => getDoc(progressRef)).catch(() => null);
            const remoteEvents: AwardEvent[] = snap?.exists()
              ? normalizeEvents(Array.isArray(snap.data()?.gamificationEvents) ? snap.data()!.gamificationEvents : [])
              : [];
            // Merge against the LATEST local state (ref, not the `normalized`
            // closure captured when this commit() call started) -- if
            // another award() landed while this async round trip was in
            // flight, its event is already in eventsRef.current and must
            // not be dropped by writing an older snapshot here.
            const merged = mergeEvents(remoteEvents, eventsRef.current);
            updateEvents(merged);
            writeStorage(merged);

            void withRetry(() => setDoc(progressRef, { gamificationEvents: merged }, { merge: true })).catch((err) =>
              console.error('Failed to sync gamification progress to the server after retrying:', err),
            );
            void withRetry(() => setDoc(leaderboardRef, leaderboardFields(user, merged, Date.now(), displayNameOverrideRef.current), { merge: true })).catch((err) =>
              console.error('Failed to sync leaderboard entry to the server after retrying:', err),
            );
          });
        });
      }
    },
    [user, updateEvents],
  );

  const award = useCallback(
    (permalink: string, kind: AwardEvent['kind'], points: number, hintUsed?: boolean) => {
      const events = eventsRef.current; // see eventsRef's own comment: never read the `events` state closure here
      if (hasAward(events, permalink, kind)) return; // already awarded once, ever -- no double-counting on repeat marks/reruns
      const now = new Date(Date.now());
      const nextEvents: AwardEvent[] = [
        ...events,
        { permalink, kind, date: localDateString(now), points, ...(hintUsed !== undefined ? { hintUsed } : {}) },
      ];

      const oldStats = {
        totalXP: totalPoints(events),
        streak: computeStreak(events.map((e) => e.date), now),
        pagesUnderstood: events.filter((e) => e.kind === 'mark').length,
        problemsSolved: events.filter((e) => e.kind === 'complete').length,
        systemDesignSolved: events.filter((e) => e.kind === 'design').length,
        isSignedIn: Boolean(user),
      };

      const newStats = {
        totalXP: totalPoints(nextEvents),
        streak: computeStreak(nextEvents.map((e) => e.date), now),
        pagesUnderstood: nextEvents.filter((e) => e.kind === 'mark').length,
        problemsSolved: nextEvents.filter((e) => e.kind === 'complete').length,
        systemDesignSolved: nextEvents.filter((e) => e.kind === 'design').length,
        isSignedIn: Boolean(user),
      };

      // Celebratory Tada Confetti & Toast Notification
      const TOAST_BY_KIND: Record<AwardEvent['kind'], { title: string; icon: string }> = {
        complete: { title: 'Problem Solved!', icon: '' },
        design: { title: 'Design Completed!', icon: '' },
        mark: { title: 'Page Understood!', icon: '' },
        signin: { title: 'Welcome Back!', icon: '' },
        review: { title: 'Review Complete!', icon: '' },
        depth: { title: 'Went Deeper!', icon: '' },
        flashcard: { title: 'Flashcard Revealed!', icon: '' },
        architecture: { title: 'Architecture Verified!', icon: '' },
        blog: { title: 'Post Read', icon: '' },
      };
      const toastMeta = TOAST_BY_KIND[kind];
      showRewardToast({
        title: toastMeta.title,
        subtitle: `Great work! Earned +${points} XP`,
        xp: points,
        icon: toastMeta.icon,
      });

      // Check newly unlocked checkpoint badges
      const newlyUnlocked = BADGES.filter((b) => !b.checkUnlocked(oldStats) && b.checkUnlocked(newStats));
      for (const b of newlyUnlocked) {
        setTimeout(() => {
          showRewardToast({
            title: `Badge Unlocked: ${b.title}`,
            subtitle: b.description,
            type: 'badge',
          });
        }, 600);
      }

      commit(nextEvents);
    },
    [commit, user],
  );


  const awardMarkUnderstood = useCallback((permalink: string) => award(permalink, 'mark', MARK_UNDERSTOOD_POINTS), [award]);
  const awardProblemCompleted = useCallback(
    (permalink: string, difficulty: string | undefined, bonusPoints: number = 0, hintUsed?: boolean) =>
      award(permalink, 'complete', pointsForDifficulty(difficulty) + bonusPoints, hintUsed),
    [award],
  );
  const awardFlashcardRevealed = useCallback((id: string) => award(id, 'flashcard', FLASHCARD_REVEAL_POINTS), [award]);
  const awardReviewCompleted = useCallback(
    (permalink: string, stage: number) => award(`review:${permalink}:${stage}`, 'review', REVIEW_COMPLETED_POINTS),
    [award],
  );
  const awardDepthRevealed = useCallback((id: string) => award(id, 'depth', DEPTH_REVEAL_POINTS), [award]);
  const awardBlogRead = useCallback((slug: string) => award(`/blog/${slug}`, 'blog', BLOG_READ_POINTS), [award]);
  const awardSystemDesignCompleted = useCallback(
    (permalink: string) => award(permalink, 'design', SYSTEM_DESIGN_CHALLENGE_POINTS),
    [award],
  );
  const awardArchitectureCompleted = useCallback(
    (permalink: string, points: number = ARCHITECTURE_COMPLETED_POINTS) =>
      award(permalink, 'architecture', points),
    [award],
  );
  // Synthetic, non-URL permalink encoding today's real local date -- the
  // same `hasAward` de-dupe every other award kind already uses makes
  // this naturally once-per-real-calendar-day with no separate gating
  // logic: calling it again today is a no-op, and it fires fresh again
  // once tomorrow's local date rolls over. The automatic on-sign-in
  // award is folded directly into the sign-in sync effect's own merge
  // above (not fired from here) -- see that effect's comment for why a
  // separate, independently-racing effect calling this on every sign-in
  // was the wrong design. This stays exposed for a signed-in user acting
  // within the same session (award()'s own local-state path handles that
  // case correctly, since there's no competing read-merge-write then).
  const awardDailySignIn = useCallback(() => award(`signin:${localDateString(new Date(Date.now()))}`, 'signin', DAILY_SIGNIN_POINTS), [award]);

  /** Sets a user-chosen display name, overriding the Firebase Auth-derived
   * default (see computeDisplayName). Updates local state immediately
   * (works instantly for a signed-out guest, browser-local); for a
   * signed-in user it's additionally persisted to progress/{uid} (synced
   * across devices, linked to their account) and mirrored onto
   * leaderboard/{uid}.displayName so the leaderboard reflects the same
   * chosen name rather than their raw account name/email handle. */
  const updateDisplayName = useCallback(
    (name: string) => {
      const trimmed = name.trim().slice(0, 40);
      if (!trimmed) return;
      setDisplayNameOverride(trimmed);
      displayNameOverrideRef.current = trimmed;
      writeDisplayNameOverride(trimmed);

      if (user) {
        void user
          .getIdToken(true)
          .then(() => loadFirestoreFor(user.uid))
          .then(({ progressRef, leaderboardRef, setDoc }) =>
            Promise.all([
              withRetry(() => setDoc(progressRef, { displayNameOverride: trimmed }, { merge: true })),
              withRetry(() => setDoc(leaderboardRef, { displayName: trimmed }, { merge: true })),
            ]),
          )
          .catch((err) => console.error('Failed to save display name to the server after retrying:', err));
      }
    },
    [user],
  );

  const now = new Date(Date.now());
  const value: GamificationContextValue = {
    points: totalPoints(events),
    weeklyPoints: computeWeeklyPoints(events, now),
    streak: computeStreak(
      events.map((e) => e.date),
      now,
    ),
    events,
    displayName: displayNameOverride || computeDisplayName(user),
    updateDisplayName,
    awardMarkUnderstood,
    awardProblemCompleted,
    awardFlashcardRevealed,
    awardSystemDesignCompleted,
    awardDailySignIn,
    awardReviewCompleted,
    awardDepthRevealed,
    awardArchitectureCompleted,
    awardBlogRead,
  };

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}

export function useGamification(): GamificationContextValue {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return ctx;
}
