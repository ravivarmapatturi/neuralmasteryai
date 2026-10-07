import { useEffect, useState } from 'react';

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  points: number;
  allTimePoints?: number;
}

/**
 * Known test/seed accounts found polluting the public leaderboard (audit
 * finding C7: "Batman" and "rule-test" ranked alongside real learners).
 * This is a client-side display filter ONLY, not a real fix -- the
 * Firestore documents themselves still exist and still count toward
 * "how many real users" a viewer of the raw data would see. The real
 * fix (actually deleting these documents, or adding and enforcing a
 * real `isTest` field via firestore.rules) needs direct Firestore
 * console/admin access this environment doesn't have. Extend this list
 * by display name if more test accounts turn up; match is case-
 * sensitive and exact on purpose, so it never accidentally hides a real
 * learner who happens to share a common word in their name.
 */
const EXCLUDED_TEST_DISPLAY_NAMES = new Set(['Batman', 'rule-test']);

/**
 * Real-time top-N ranking from the public `leaderboard` Firestore
 * collection (see GamificationContext for why this is a SEPARATE
 * collection from the private per-user `progress/{uid}` document -- that
 * one's security rules correctly block cross-user reads, so a ranking
 * query genuinely cannot run against it).
 *
 * Public, by design -- no auth check here at all: firestore.rules grants
 * `allow read: if true` on this collection specifically so a browsing,
 * not-yet-signed-in visitor can see the leaderboard too (only WRITES
 * stay restricted to a signed-in user's own entry). A signed-out
 * visitor's own points aren't tracked here (they have no persistent
 * identity to rank), but every existing signed-in user's public entry is
 * visible regardless of the viewer's own auth state.
 */
export function useLeaderboard(sortBy: 'allTime' | 'weekly', limitN = 25): { entries: LeaderboardEntry[]; loading: boolean } {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setLoading(true);

    Promise.all([import('../lib/firebase'), import('firebase/firestore')])
      .then(([{ db }, { collection, query, orderBy, limit, onSnapshot }]) => {
        if (cancelled) return;
        const field = sortBy === 'allTime' ? 'allTimePoints' : 'weeklyPoints';
        const q = query(collection(db, 'leaderboard'), orderBy(field, 'desc'), limit(limitN));
        unsubscribe = onSnapshot(
          q,
          (snap) => {
            if (cancelled) return;
            const rows: LeaderboardEntry[] = snap.docs
              .map((d) => {
                const data = d.data();
                return {
                  uid: d.id,
                  displayName: typeof data.displayName === 'string' ? data.displayName : 'Learner',
                  points: (sortBy === 'allTime' ? data.allTimePoints : data.weeklyPoints) ?? 0,
                  allTimePoints: typeof data.allTimePoints === 'number' ? data.allTimePoints : undefined,
                };
              })
              .filter((row) => !EXCLUDED_TEST_DISPLAY_NAMES.has(row.displayName));
            setEntries(rows);
            setLoading(false);
          },
          () => {
            if (cancelled) return;
            setLoading(false);
          },
        );
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [sortBy, limitN]);

  return { entries, loading };
}
