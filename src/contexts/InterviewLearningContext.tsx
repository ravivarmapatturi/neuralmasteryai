import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { readInterviewAttempts } from '../lib/interviewAttempts';
import { useAuth } from './AuthContext';
import { learningKey, mergeInterviewLearning, readInterviewLearning, type InterviewLearning } from '../lib/interviewLearning';

type SyncState = 'local' | 'syncing' | 'synced' | 'offline' | 'storage-error';
const Context = createContext<{ records: InterviewLearning[]; save: (records: InterviewLearning[]) => void; syncState: SyncState; ready: boolean } | null>(null);

function readLearningWithAttempts(uid?:string) {
  const completions=readInterviewAttempts(uid).filter(a=>a.transcript.trim()).map(a=>({questionId:a.questionId,completion:{time:a.time,attemptId:a.id}}));
  return mergeInterviewLearning(readInterviewLearning(uid),completions);
}

export function InterviewLearningProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [history, setHistory] = useState(() => ({ owner: uid, records: readLearningWithAttempts(uid) }));
  const records = history.owner === uid ? history.records : [];
  const setRecords = useCallback((value: InterviewLearning[]) => setHistory({ owner: uid, records: value }), [uid]);
  const [storageFailed, setStorageFailed] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('local');
  const active = useRef(uid);
  active.current = uid;
  const retry = useRef<() => void>(() => {});
  const current = useRef(records);
  const persist = useCallback((value: InterviewLearning[]) => {
    try { localStorage.setItem(learningKey(uid), JSON.stringify(value)); setStorageFailed(false); return true; }
    catch { setStorageFailed(true); return false; }
  }, [uid]);

  useEffect(() => {
    let cancelled = false;
    let busy = false;
    let dirty = true;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let local = readLearningWithAttempts(uid);
    // Adopt anonymous learning records once, into the first account used on this device.
    if (uid) {
      local = mergeInterviewLearning(local, readLearningWithAttempts());
      if (persist(local)) { try { localStorage.removeItem(learningKey()); } catch { setStorageFailed(true); } }
    }
    persist(local);
    current.current = local;
    setRecords(local);
    setSyncState(uid ? 'syncing' : 'local');
    const publish = (remote: InterviewLearning[]) => {
      if (cancelled) return;
      current.current = mergeInterviewLearning(current.current, remote);
      persist(current.current);
      setRecords(current.current);
    };
    const sync = async () => {
      dirty = true;
      if (!uid || busy || cancelled) return;
      busy = true;
      try {
        const api = await import('../lib/interviewLearningSync');
        if (cancelled) return;
        if (!unsubscribe) unsubscribe = api.watchInterviewLearning(uid, publish, () => {
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
          const merged = await api.syncInterviewLearning(uid, current.current);
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
      if (event.key === learningKey(uid)) { publish(readInterviewLearning(uid)); void sync(); }
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
  }, [uid, persist, setRecords]);

  const save = useCallback((records: InterviewLearning[]) => {
    // A review finishing after an account switch stays with its original owner.
    const value = mergeInterviewLearning(readInterviewLearning(uid), active.current === uid ? current.current : [], records);
    let saved = true;
    try { localStorage.setItem(learningKey(uid), JSON.stringify(value)); }
    catch { saved = false; }
    if (active.current === uid) setStorageFailed(!saved);
    if (active.current !== uid) return;
    current.current = value;
    setRecords(value);
    retry.current();
  }, [uid, setRecords]);
  return <Context.Provider value={{ records, save, ready: history.owner === uid && (!uid || syncState === 'synced' || syncState === 'offline'), syncState: storageFailed ? 'storage-error' : syncState }}>{children}</Context.Provider>;
}
export function useInterviewLearning() {
  const value = useContext(Context);
  if (!value) throw new Error('useInterviewLearning must be used within InterviewLearningProvider');
  return value;
}
