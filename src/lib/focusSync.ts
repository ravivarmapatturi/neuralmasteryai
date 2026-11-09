import { doc, runTransaction, type Firestore } from 'firebase/firestore';
import { mergeFocusSessions, type FocusSession } from './focusTimer';

export const MAX_STORED_SESSIONS = 500;

async function withRetry<T>(fn: () => Promise<T>, attempts = 5, attemptTimeoutMs = 5000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          timeout = setTimeout(() => reject(new Error('withRetry: attempt timed out')), attemptTimeoutMs),
        ),
      ]);
    } catch (err) {
      lastErr = err;
      if ((err as { code?: string }).code === 'permission-denied') throw err;
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** i));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastErr;
}

/** Atomically merge only the focus field, preserving sibling progress data. */
export async function syncFocusSessions(
  db: Firestore,
  uid: string,
  localSessions: FocusSession[],
  pendingSessions: FocusSession[],
): Promise<FocusSession[]> {
  return withRetry(() => runTransaction(db, async (tx) => {
    const ref = doc(db, 'progress', uid);
    const snap = await tx.get(ref);
    const remote = snap.exists() && Array.isArray(snap.data().focusSessions)
      ? snap.data().focusSessions : [];
    const merged = mergeFocusSessions(remote, [...localSessions, ...pendingSessions])
      .slice(-MAX_STORED_SESSIONS);
    tx.set(ref, { focusSessions: merged }, { merge: true });
    return merged;
  }));
}
