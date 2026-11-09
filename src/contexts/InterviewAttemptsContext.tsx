import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { attemptsKey, mergeInterviewAttempts, readInterviewAttempts, type InterviewAttempt } from '../lib/interviewAttempts';

type SyncState = 'local' | 'syncing' | 'synced' | 'offline' | 'storage-error';
const Context = createContext<{ attempts: InterviewAttempt[]; save: (attempt: InterviewAttempt) => void; syncState: SyncState } | null>(null);

export function InterviewAttemptsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [history, setHistory] = useState(() => ({ owner: uid, attempts: readInterviewAttempts(uid) }));
  const attempts = history.owner === uid ? history.attempts : [];
  const setAttempts = useCallback((value: InterviewAttempt[]) => setHistory({ owner: uid, attempts: value }), [uid]);
  const [storageFailed, setStorageFailed] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('local');
  const active = useRef(uid);
  active.current = uid;
  const retry = useRef<() => void>(() => {});
  const current = useRef(attempts);
  const persist = useCallback((value: InterviewAttempt[]) => {
    try { localStorage.setItem(attemptsKey(uid), JSON.stringify(value)); setStorageFailed(false); return true; }
    catch { setStorageFailed(true); return false; }
  }, [uid]);

  useEffect(() => {
    let cancelled = false;
    let busy = false;
    let dirty = true;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let local = readInterviewAttempts(uid);
    // Adopt anonymous attempts once, into the first account used on this device.
    if (uid) {
      local = mergeInterviewAttempts(local, readInterviewAttempts());
      if (persist(local)) { try { localStorage.removeItem(attemptsKey()); } catch { setStorageFailed(true); } }
    }
    current.current = local;
    setAttempts(local);
    setSyncState(uid ? 'syncing' : 'local');
    const publish = (remote: InterviewAttempt[]) => {
      if (cancelled) return;
      current.current = mergeInterviewAttempts(current.current, remote);
      persist(current.current);
      setAttempts(current.current);
    };
    const sync = async () => {
      dirty = true;
      if (!uid || busy || cancelled) return;
      busy = true;
      try {
        const api = await import('../lib/interviewAttemptSync');
        if (cancelled) return;
        if (!unsubscribe) unsubscribe = api.watchInterviewAttempts(uid, publish, () => {
          if (cancelled) return;
          unsubscribe?.();
          unsubscribe = undefined;
          setSyncState('offline');
          clearTimeout(timer);
          timer = setTimeout(() => { void sync(); }, 30_000);
        });
        while (dirty && !cancelled) {
          dirty = false;
          setSyncState('syncing');
          const merged = await api.syncInterviewAttempts(uid, current.current);
          if (cancelled) return;
          publish(merged);
        }
        if (!cancelled) setSyncState('synced');
      } catch {
        if (!cancelled) {
          setSyncState('offline');
          clearTimeout(timer);
          timer = setTimeout(() => { void sync(); }, 30_000);
        }
      } finally { busy = false; }
    };
    retry.current = () => { void sync(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === attemptsKey(uid)) { publish(readInterviewAttempts(uid)); void sync(); }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('online', retry.current);
    const onOnline = retry.current;
    if (uid) void sync();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe?.();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', onOnline);
    };
  }, [uid, persist, setAttempts]);

  const save = useCallback((attempt: InterviewAttempt) => {
    // A review finishing after an account switch stays with its original owner.
    const value = mergeInterviewAttempts(readInterviewAttempts(uid), active.current === uid ? current.current : [], [attempt]);
    let saved = true;
    try { localStorage.setItem(attemptsKey(uid), JSON.stringify(value)); }
    catch { saved = false; }
    if (active.current === uid) setStorageFailed(!saved);
    if (active.current !== uid) return;
    current.current = value;
    setAttempts(value);
    retry.current();
  }, [uid, setAttempts]);
  return <Context.Provider value={{ attempts, save, syncState: storageFailed ? 'storage-error' : syncState }}>{children}</Context.Provider>;
}
export function useInterviewAttempts() {
  const value = useContext(Context);
  if (!value) throw new Error('useInterviewAttempts must be used within InterviewAttemptsProvider');
  return value;
}
