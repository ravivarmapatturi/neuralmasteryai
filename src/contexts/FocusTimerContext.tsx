import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  restoreStateFromStorage,
  recordScreenTimeTick,
  mergeFocusSessions,
  todayFocusSeconds,
  formatTodayFocusTime,
  extractSection,
  DEFAULT_PRESET,
  type FocusPreset,
  type FocusPhase,
  type TimerStatus,
  type PausedReason,
  type FocusSession,
  type FocusTimerState,
} from '../lib/focusTimer';
import { useAuth } from './AuthContext';
import { useFocusMusic } from './FocusMusicContext';

const TIMER_STORAGE_KEY = 'nm_focus_timer_state';
const SESSIONS_STORAGE_KEY = 'nm_focus_sessions';
const PENDING_SESSIONS_STORAGE_KEY = 'nm_focus_pending_sync';
const TICK_LOCK_KEY = 'nm_screen_time_last_tick';
const MAX_STORED_SESSIONS = 500;

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is optional / quota exceeded
  }
}

async function loadFirestoreFor(uid: string) {
  const [{ db }, firestore] = await Promise.all([
    import('../lib/firebase'),
    import('firebase/firestore'),
  ]);
  return {
    db,
    progressRef: firestore.doc(db, 'progress', uid),
    getDoc: firestore.getDoc,
    setDoc: firestore.setDoc,
    runTransaction: firestore.runTransaction,
    onSnapshot: firestore.onSnapshot,
  };
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 5, attemptTimeoutMs = 5000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('withRetry: attempt timed out')), attemptTimeoutMs),
        ),
      ]);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** i));
    }
  }
  throw lastErr;
}

async function syncFocusSessionsToRemote(
  uid: string,
  localSessions: FocusSession[],
  pendingSessions: FocusSession[],
): Promise<FocusSession[]> {
  const { db, progressRef, getDoc, setDoc, runTransaction } = await loadFirestoreFor(uid);

  if (typeof runTransaction === 'function') {
    return await withRetry(async () => {
      return await runTransaction(db, async (tx) => {
        const snap = await tx.get(progressRef);
        const remoteSessions: FocusSession[] = snap.exists() && Array.isArray(snap.data()?.focusSessions)
          ? snap.data().focusSessions
          : [];
        const merged = mergeFocusSessions(remoteSessions, [...localSessions, ...pendingSessions]);
        tx.set(progressRef, { focusSessions: merged.slice(-MAX_STORED_SESSIONS) }, { merge: true });
        return merged;
      });
    });
  } else {
    return await withRetry(async () => {
      const snap = await getDoc(progressRef);
      const remoteSessions: FocusSession[] = snap.exists() && Array.isArray(snap.data()?.focusSessions)
        ? snap.data()!.focusSessions
        : [];
      const merged = mergeFocusSessions(remoteSessions, [...localSessions, ...pendingSessions]);
      await setDoc(progressRef, { focusSessions: merged.slice(-MAX_STORED_SESSIONS) }, { merge: true });
      return merged;
    });
  }
}

export interface FocusTimerContextType {
  status: TimerStatus;
  isPaused: boolean;
  todaySeconds: number;
  formattedToday: string;
  sessions: FocusSession[];
  isDistractionFree: boolean;

  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  setDistractionFree: (enabled: boolean) => void;
  toggleDistractionFree: () => void;
  recordSession: (session: FocusSession) => void;

  // Backward compatibility fields
  phase: FocusPhase;
  remainingMs: number;
  targetDurationMs: number;
  endsAt: number | null;
  startedAt: number | null;
  autoStartNext: boolean;
  notificationsEnabled: boolean;
  completedFocusCount: number;
  pausedReason: PausedReason;
  preset: FocusPreset;

  startFocus: (section?: string) => void;
  startBreak: () => void;
  skip: () => void;
  stop: () => void;
  setPreset: (preset: FocusPreset) => void;
  setAutoStartNext: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  dismissAwayPause: () => void;
}

const FocusTimerContext = createContext<FocusTimerContextType | null>(null);

function getInitialStateAndSessions(): { timerState: FocusTimerState; sessions: FocusSession[] } {
  const savedTimer = readStorage<any>(TIMER_STORAGE_KEY);
  const savedSessions = readStorage<FocusSession[]>(SESSIONS_STORAGE_KEY);
  const sessions: FocusSession[] = Array.isArray(savedSessions) ? savedSessions : [];
  const timerState = restoreStateFromStorage(savedTimer);
  // Persist clean migrated timer state
  writeStorage(TIMER_STORAGE_KEY, { status: timerState.status, isPaused: timerState.isPaused });
  return { timerState, sessions };
}

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { enabled: musicEnabled, playing: musicPlaying, play: playMusic, pause: pauseMusic } = useFocusMusic();

  const [initialData] = useState(() => getInitialStateAndSessions());
  const [isPaused, setIsPaused] = useState(initialData.timerState.isPaused);
  const [sessions, setSessions] = useState<FocusSession[]>(initialData.sessions);
  const [isDistractionFree, setIsDistractionFree] = useState(false);

  // Active tracking state: visible and focused
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === 'undefined') return true;
    return document.visibilityState === 'visible';
  });

  const [isFocused, setIsFocused] = useState(() => {
    if (typeof document === 'undefined') return true;
    return typeof document.hasFocus === 'function' ? document.hasFocus() : true;
  });

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;

  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;

  const lastTickRef = useRef<number | null>(null);

  // Multi-tab BroadcastChannel
  const channelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('nm_screen_time_sync');
    channelRef.current = ch;

    ch.onmessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'TICK' && Array.isArray(msg.sessions)) {
        sessionsRef.current = msg.sessions;
        setSessions(msg.sessions);
      } else if (msg.type === 'PAUSE') {
        setIsPaused(true);
      } else if (msg.type === 'RESUME') {
        setIsPaused(false);
      }
    };

    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, []);

  const updateSessions = useCallback((next: FocusSession[]) => {
    const bounded = next.length > MAX_STORED_SESSIONS ? next.slice(-MAX_STORED_SESSIONS) : next;
    sessionsRef.current = bounded;
    setSessions(bounded);
    writeStorage(SESSIONS_STORAGE_KEY, bounded);
  }, []);

  const broadcastTick = useCallback((nextSessions: FocusSession[]) => {
    try {
      channelRef.current?.postMessage({ type: 'TICK', sessions: nextSessions });
    } catch {
      // Ignore broadcast errors
    }
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
    writeStorage(TIMER_STORAGE_KEY, { status: 'paused', isPaused: true });
    try {
      channelRef.current?.postMessage({ type: 'PAUSE' });
    } catch {}
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    lastTickRef.current = Date.now();
    writeStorage(TIMER_STORAGE_KEY, { status: 'running', isPaused: false });
    try {
      channelRef.current?.postMessage({ type: 'RESUME' });
    } catch {}
  }, []);

  const togglePause = useCallback(() => {
    if (isPausedRef.current) {
      resume();
    } else {
      pause();
    }
  }, [pause, resume]);

  // Window focus & document visibility listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onFocus = () => {
      setIsFocused(true);
      setIsVisible(document.visibilityState === 'visible');
      lastTickRef.current = Date.now();
    };

    const onBlur = () => {
      setIsFocused(false);
      lastTickRef.current = null;
    };

    const onVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      if (visible) {
        setIsFocused(typeof document.hasFocus === 'function' ? document.hasFocus() : true);
        lastTickRef.current = Date.now();
      } else {
        lastTickRef.current = null;
      }
    };

    const onPageHide = () => {
      setIsVisible(false);
      setIsFocused(false);
      lastTickRef.current = null;
    };

    const onPageShow = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      setIsFocused(typeof document.hasFocus === 'function' ? document.hasFocus() : true);
      lastTickRef.current = Date.now();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  // Multi-tab storage event sync fallback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSIONS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            sessionsRef.current = parsed;
            setSessions(parsed);
          }
        } catch {}
      } else if (e.key === TIMER_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (typeof parsed?.isPaused === 'boolean') {
            setIsPaused(parsed.isPaused);
          } else if (parsed?.status === 'paused') {
            setIsPaused(true);
          } else if (parsed?.status === 'running') {
            setIsPaused(false);
          }
        } catch {}
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Main screen-time clock tick:
  // Counts while document is visible, window has focus, and timer is not manually paused.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const interval = setInterval(() => {
      const isActivelyCounting = isVisibleRef.current && isFocusedRef.current && !isPausedRef.current;
      if (!isActivelyCounting) {
        lastTickRef.current = null;
        return;
      }

      const now = Date.now();
      const currentSection = extractSection(window.location.pathname);
      const lockVal = Number(window.localStorage.getItem(TICK_LOCK_KEY) || 0);

      const result = recordScreenTimeTick(
        sessionsRef.current,
        currentSection,
        now,
        lastTickRef.current,
        { lockTimestamp: lockVal },
      );

      if (result.ticked) {
        lastTickRef.current = result.newLastTickTimestamp;
        try {
          window.localStorage.setItem(TICK_LOCK_KEY, String(result.newLockTimestamp));
        } catch {}
        updateSessions(result.sessions);
        broadcastTick(result.sessions);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [updateSessions, broadcastTick]);

  // Distraction-free mode handling
  const setDistractionFree = useCallback((enable: boolean) => {
    setIsDistractionFree(enable);
    if (typeof document === 'undefined') return;

    if (enable) {
      document.documentElement.classList.add('distraction-free');
      try {
        if (document.documentElement.requestFullscreen) {
          const promise = document.documentElement.requestFullscreen();
          if (promise && typeof promise.catch === 'function') {
            promise.catch(() => {});
          }
        }
      } catch {
        // Refused or unsupported
      }
    } else {
      document.documentElement.classList.remove('distraction-free');
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          const promise = document.exitFullscreen();
          if (promise && typeof promise.catch === 'function') {
            promise.catch(() => {});
          }
        }
      } catch {
        // Refused or unsupported
      }
    }
  }, []);

  const toggleDistractionFree = useCallback(() => {
    setDistractionFree(!isDistractionFree);
  }, [isDistractionFree, setDistractionFree]);

  // React to fullscreen change (e.g. Esc or F11 keypress)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        document.documentElement.classList.remove('distraction-free');
        setIsDistractionFree(false);
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.documentElement.classList.remove('distraction-free');
    };
  }, []);

  // Firestore sync for signed in users
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const local = readStorage<FocusSession[]>(SESSIONS_STORAGE_KEY);
      if (Array.isArray(local)) updateSessions(local);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    user.getIdToken(true).then(() => {
      if (cancelled) return;
      const localSessions = readStorage<FocusSession[]>(SESSIONS_STORAGE_KEY) || [];
      const pendingSessions = readStorage<FocusSession[]>(PENDING_SESSIONS_STORAGE_KEY) || [];

      syncFocusSessionsToRemote(user.uid, localSessions, pendingSessions)
        .then((merged) => {
          if (cancelled) return;
          writeStorage(PENDING_SESSIONS_STORAGE_KEY, []);
          updateSessions(merged);
        })
        .catch((err) => {
          console.warn('Focus timer: failed to sync with Firestore on sign-in, will retry next save', err);
        });

      loadFirestoreFor(user.uid)
        .then(({ progressRef, onSnapshot }) => {
          if (cancelled) return;
          unsubscribe = onSnapshot(
            progressRef,
            (snap) => {
              if (cancelled) return;
              const remoteSessions: FocusSession[] = snap.exists() && Array.isArray(snap.data()?.focusSessions)
                ? snap.data()!.focusSessions
                : [];
              const local = readStorage<FocusSession[]>(SESSIONS_STORAGE_KEY) || [];
              const pending = readStorage<FocusSession[]>(PENDING_SESSIONS_STORAGE_KEY) || [];
              const merged = mergeFocusSessions(remoteSessions, [...local, ...pending]);
              updateSessions(merged);
            },
            (err) => {
              console.error('Focus timer live sync error:', err);
            },
          );
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [user, authLoading, updateSessions]);

  const recordSession = useCallback(
    (session: FocusSession) => {
      const merged = mergeFocusSessions(sessionsRef.current, [session]);
      updateSessions(merged);

      const pending = readStorage<FocusSession[]>(PENDING_SESSIONS_STORAGE_KEY) || [];
      const nextPending = mergeFocusSessions(pending, [session]);
      writeStorage(PENDING_SESSIONS_STORAGE_KEY, nextPending);

      if (user) {
        user.getIdToken(true).then(() => {
          syncFocusSessionsToRemote(user.uid, merged, nextPending)
            .then((syncedMerged) => {
              writeStorage(PENDING_SESSIONS_STORAGE_KEY, []);
              updateSessions(syncedMerged);
            })
            .catch((err) => {
              console.warn('Focus timer: save failed, queued in pending sync for next retry', err);
            });
        }).catch(() => {});
      }
    },
    [user, updateSessions],
  );

  // Focus music coordination
  useEffect(() => {
    if (!musicEnabled) return;
    if (!isPaused && !musicPlaying) {
      void playMusic();
    } else if (isPaused && musicPlaying) {
      pauseMusic();
    }
  }, [isPaused, musicEnabled, musicPlaying, playMusic, pauseMusic]);

  // Derived calculations
  const todaySeconds = useMemo(() => todayFocusSeconds(sessions), [sessions]);
  const formattedToday = useMemo(() => formatTodayFocusTime(todaySeconds), [todaySeconds]);

  // Update document title
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevTitle = document.title;
    if (isPaused) {
      document.title = `(Paused) Focus — NeuralMastery`;
    } else {
      document.title = `(${formattedToday}) Focus — NeuralMastery`;
    }
    return () => {
      document.title = prevTitle;
    };
  }, [isPaused, formattedToday]);

  const value: FocusTimerContextType = {
    status: isPaused ? 'paused' : 'running',
    isPaused,
    todaySeconds,
    formattedToday,
    sessions,
    isDistractionFree,

    pause,
    resume,
    togglePause,
    setDistractionFree,
    toggleDistractionFree,
    recordSession,

    // Backward compatibility fields
    phase: 'focus',
    remainingMs: todaySeconds * 1000,
    targetDurationMs: 0,
    endsAt: null,
    startedAt: null,
    autoStartNext: true,
    notificationsEnabled: false,
    completedFocusCount: sessions.length,
    pausedReason: isPaused ? 'user' : null,
    preset: DEFAULT_PRESET,

    startFocus: () => resume(),
    startBreak: () => {},
    skip: () => {},
    stop: () => pause(),
    setPreset: () => {},
    setAutoStartNext: () => {},
    setNotificationsEnabled: async () => false,
    dismissAwayPause: () => {},
  };

  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>;
}

const defaultTimerContext: FocusTimerContextType = {
  status: 'running',
  isPaused: false,
  todaySeconds: 0,
  formattedToday: '00:00',
  sessions: [],
  isDistractionFree: false,

  pause: () => {},
  resume: () => {},
  togglePause: () => {},
  setDistractionFree: () => {},
  toggleDistractionFree: () => {},
  recordSession: () => {},

  phase: 'focus',
  remainingMs: 0,
  targetDurationMs: 0,
  endsAt: null,
  startedAt: null,
  autoStartNext: true,
  notificationsEnabled: false,
  completedFocusCount: 0,
  pausedReason: null,
  preset: DEFAULT_PRESET,

  startFocus: () => {},
  startBreak: () => {},
  skip: () => {},
  stop: () => {},
  setPreset: () => {},
  setAutoStartNext: () => {},
  setNotificationsEnabled: async () => false,
  dismissAwayPause: () => {},
};

export function useFocusTimer(): FocusTimerContextType {
  const context = useContext(FocusTimerContext);
  return context ?? defaultTimerContext;
}

export function useFocusCountdown() {
  const { formattedToday, todaySeconds } = useFocusTimer();
  return {
    formatted: formattedToday,
    remainingMs: todaySeconds * 1000,
    progress: 0,
  };
}
