import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  startPhase,
  pauseTimer,
  resumeTimer,
  skipPhase,
  stopSession,
  restoreStateFromStorage,
  rolloverTimer,
  tickTimer,
  createInitialState,
  updatePreset,
  mergeFocusSessions,
  formatClockTime,
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

export function playChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
    gain2.gain.setValueAtTime(0.12, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.9);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch {
    // Audio unsupported or restricted
  }
}

export function notifyPhaseEnded(phase: FocusPhase) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = phase === 'focus' ? 'Focus session completed' : 'Break completed';
  const body =
    phase === 'focus'
      ? 'Great work! Take a breath and step away for a break.'
      : 'Break finished. Ready to focus again?';

  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
    });
  } catch {
    // Notifications unavailable
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
  phase: FocusPhase;
  status: TimerStatus;
  preset: FocusPreset;
  completedFocusCount: number;
  remainingMs: number;
  targetDurationMs: number;
  endsAt: number | null;
  startedAt: number | null;
  autoStartNext: boolean;
  notificationsEnabled: boolean;
  pausedReason: PausedReason;
  sessions: FocusSession[];

  startFocus: (section?: string) => void;
  startBreak: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  stop: () => void;
  setPreset: (preset: FocusPreset) => void;
  setAutoStartNext: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  dismissAwayPause: () => void;
  recordSession: (session: FocusSession) => void;
}

const FocusTimerContext = createContext<FocusTimerContextType | null>(null);

interface InitialFocusData {
  timerState: FocusTimerState;
  sessions: FocusSession[];
  reloadCompletedSession: FocusSession | null;
}

function getInitialFocusTimerStateAndSessions(): InitialFocusData {
  const savedTimer = readStorage<Partial<FocusTimerState> & { lastHandledSessionId?: string }>(TIMER_STORAGE_KEY);
  const savedSessions = readStorage<FocusSession[]>(SESSIONS_STORAGE_KEY);
  let sessions: FocusSession[] = Array.isArray(savedSessions) ? savedSessions : [];
  let reloadCompletedSession: FocusSession | null = null;

  const now = Date.now();
  if (savedTimer) {
    savedTimer.autoStartNext = true;
    if (savedTimer.pausedReason === 'away') {
      savedTimer.pausedReason = null;
      savedTimer.status = 'running';
    }
  }

  const isExpired =
    savedTimer &&
    (savedTimer.status === 'running' || savedTimer.status === 'phaseEnded') &&
    savedTimer.endsAt !== null &&
    now >= savedTimer.endsAt;
  const isStalePhaseEnded = savedTimer && savedTimer.status === 'phaseEnded';

  if (isExpired || isStalePhaseEnded) {
    const fullState: FocusTimerState = {
      ...createInitialState(savedTimer.preset || DEFAULT_PRESET),
      ...savedTimer,
      status: 'running',
      autoStartNext: true,
      endsAt: savedTimer.endsAt ?? now,
    };
    const { nextState, completedSessions } = rolloverTimer(fullState, now);
    if (completedSessions.length > 0) {
      const newSessions = completedSessions.filter(
        (cs) => !sessions.some((s) => s.id === cs.id) && savedTimer.lastHandledSessionId !== cs.id,
      );
      if (newSessions.length > 0) {
        sessions = mergeFocusSessions(sessions, newSessions);
        writeStorage(SESSIONS_STORAGE_KEY, sessions);
        const pending = readStorage<FocusSession[]>(PENDING_SESSIONS_STORAGE_KEY) || [];
        writeStorage(PENDING_SESSIONS_STORAGE_KEY, mergeFocusSessions(pending, newSessions));
        reloadCompletedSession = newSessions[newSessions.length - 1];
      }
    }
    const lastSessionId = completedSessions[completedSessions.length - 1]?.id || savedTimer.lastHandledSessionId;
    writeStorage(TIMER_STORAGE_KEY, { ...nextState, lastHandledSessionId: lastSessionId });
    return { timerState: nextState, sessions, reloadCompletedSession };
  }

  const timerState = restoreStateFromStorage(savedTimer, now);
  return { timerState, sessions, reloadCompletedSession };
}

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { enabled: musicEnabled, playing: musicPlaying, play: playMusic, pause: pauseMusic } = useFocusMusic();

  const [initialData] = useState<InitialFocusData>(() => getInitialFocusTimerStateAndSessions());
  const [state, setState] = useState<FocusTimerState>(initialData.timerState);
  const [sessions, setSessions] = useState<FocusSession[]>(initialData.sessions);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
    writeStorage(TIMER_STORAGE_KEY, state);
  }, [state]);

  const sessionsRef = useRef(sessions);
  const updateSessions = useCallback((next: FocusSession[]) => {
    // Keep stored data bounded to last 500 sessions
    const bounded = next.length > MAX_STORED_SESSIONS ? next.slice(-MAX_STORED_SESSIONS) : next;
    sessionsRef.current = bounded;
    setSessions(bounded);
    writeStorage(SESSIONS_STORAGE_KEY, bounded);
  }, []);

  // Sync with Firestore for signed-in users (initial fetch, retry pending, and live onSnapshot)
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

  // Phase completion deduplication ref
  const phaseEndHandledRef = useRef<string | null>(
    initialData.reloadCompletedSession
      ? `${initialData.reloadCompletedSession.id}_${new Date(initialData.reloadCompletedSession.endedAt).getTime()}`
      : null,
  );

  const handlePhaseEnd = useCallback(
    (currentState: FocusTimerState, now: number) => {
      if (currentState.status !== 'running' || currentState.endsAt === null) return;
      if (now < currentState.endsAt) return;

      const phaseKey = `${currentState.currentSessionId || currentState.phase}_${currentState.endsAt}`;
      if (phaseEndHandledRef.current === phaseKey) return;
      phaseEndHandledRef.current = phaseKey;

      const { nextState, completedSessions, phaseChangesCount } = rolloverTimer(currentState, now);
      if (phaseChangesCount === 0) return;

      playChime();
      if (currentState.notificationsEnabled) {
        notifyPhaseEnded(currentState.phase);
      }

      for (const session of completedSessions) {
        recordSession(session);
      }

      setState(nextState);
      const lastSessionId = completedSessions[completedSessions.length - 1]?.id || currentState.currentSessionId;
      writeStorage(TIMER_STORAGE_KEY, { ...nextState, lastHandledSessionId: lastSessionId });
    },
    [recordSession],
  );

  // If a session completed while tab was reloaded or closed, chime and notify once on mount
  useEffect(() => {
    if (initialData.reloadCompletedSession) {
      playChime();
      if (initialData.timerState.notificationsEnabled) {
        notifyPhaseEnded('focus');
      }
    }
  }, [initialData]);

  // Music coordination:
  // "Focus music: if music is enabled, play during focus and pause during breaks, through the existing useFocusMusic. Do not change music behaviour when the timer is not running."
  useEffect(() => {
    if (state.status === 'running') {
      if (state.phase === 'focus') {
        if (musicEnabled && !musicPlaying) {
          void playMusic();
        }
      } else if (state.phase === 'shortBreak' || state.phase === 'longBreak') {
        if (musicPlaying) {
          pauseMusic();
        }
      }
    } else if (state.status === 'phaseEnded' && state.phase === 'focus') {
      if (musicPlaying) {
        pauseMusic();
      }
    }
  }, [state.status, state.phase, musicEnabled, musicPlaying, playMusic, pauseMusic]);

  // Focus time starts on its own when the site opens:
  useEffect(() => {
    const now = Date.now();
    const current = stateRef.current;
    if (current.status === 'paused' && current.pausedReason === 'user') {
      // User explicitly paused: do not restart
      return;
    }
    if (current.status === 'paused' && current.pausedReason === 'away') {
      setState((prev) => resumeTimer(prev, now));
    } else if (current.status === 'idle' || current.status === 'phaseEnded') {
      const sec = typeof window !== 'undefined'
        ? window.location.pathname.replace(/^\/+/, '').split('/')[0] || 'home'
        : 'home';
      setState((prev) => startPhase(prev, 'focus', sec));
    }
  }, []);

  useEffect(() => {
    // visibilitychange covers switching tabs, minimising the window and locking the screen;
    // pagehide/pageshow cover closing the tab and the back-forward cache.
    // Timer runs continuously without pausing when tab is hidden, calculating elapsed phases from timestamps.
    const onVisibilityChange = (event?: Event) => {
      const now = Date.now();
      const current = stateRef.current;
      if (document.hidden || event?.type === 'pagehide') {
        if (current.status === 'running' && current.endsAt !== null && now >= current.endsAt) {
          handlePhaseEnd(current, now);
        }
        return;
      }
      // Tab visible again / pageshow
      if (current.status === 'running' && current.endsAt !== null) {
        if (now >= current.endsAt) {
          handlePhaseEnd(current, now);
        } else {
          setState((prev) => tickTimer(prev, now));
        }
      }
      if (current.status === 'paused' && current.pausedReason === 'away') {
        setState((prev) => resumeTimer(prev, now));
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onVisibilityChange);
    window.addEventListener('pageshow', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onVisibilityChange);
      window.removeEventListener('pageshow', onVisibilityChange);
    };
  }, [handlePhaseEnd]);

  // Phase completion timer effect
  useEffect(() => {
    if (state.status !== 'running' || state.endsAt === null) {
      return;
    }

    const msUntilEnd = Math.max(0, state.endsAt - Date.now());
    const timeout = setTimeout(() => {
      handlePhaseEnd(stateRef.current, Date.now());
    }, msUntilEnd);

    return () => {
      clearTimeout(timeout);
    };
  }, [state.status, state.endsAt, state.phase, handlePhaseEnd]);

  // Document title updater while running
  useEffect(() => {
    if (state.status !== 'running' || !state.endsAt) {
      return;
    }

    const prevTitle = document.title;
    const updateTitle = () => {
      if (stateRef.current.status !== 'running' || !stateRef.current.endsAt) return;
      const rem = Math.max(0, stateRef.current.endsAt - Date.now());
      const label = stateRef.current.phase === 'focus' ? 'Focus' : 'Break';
      document.title = `(${formatClockTime(rem)}) ${label} — NeuralMastery`;
    };

    updateTitle();
    const interval = setInterval(updateTitle, 1000);

    return () => {
      clearInterval(interval);
      document.title = prevTitle;
    };
  }, [state.status, state.phase, state.endsAt]);

  const startFocus = useCallback((section?: string) => {
    const sec = section || (typeof window !== 'undefined' ? window.location.pathname.replace(/^\/+/, '').split('/')[0] : 'home');
    setState((prev) => startPhase(prev, 'focus', sec || 'home'));
  }, []);

  const startBreak = useCallback(() => {
    const isLong = stateRef.current.completedFocusCount >= 4;
    setState((prev) => startPhase(prev, isLong ? 'longBreak' : 'shortBreak', prev.currentSessionSection));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => pauseTimer(prev, 'user'));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => resumeTimer(prev));
  }, []);

  const skip = useCallback(() => {
    setState((prev) => skipPhase(prev, prev.currentSessionSection));
  }, []);

  const stop = useCallback(() => {
    const { nextState, completedSession } = stopSession(stateRef.current);
    if (completedSession) {
      recordSession(completedSession);
    }
    setState(nextState);
  }, [recordSession]);

  const setPreset = useCallback((preset: FocusPreset) => {
    setState((prev) => updatePreset(prev, preset));
  }, []);

  const setAutoStartNext = useCallback((_autoStartNext: boolean) => {
    // Continuous running is always on
    setState((prev) => ({ ...prev, autoStartNext: true }));
  }, []);

  const setNotificationsEnabled = useCallback(async (enable: boolean) => {
    if (!enable) {
      setState((prev) => ({ ...prev, notificationsEnabled: false }));
      return false;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch {
        return false;
      }
    }

    const granted = permission === 'granted';
    setState((prev) => ({ ...prev, notificationsEnabled: granted }));
    return granted;
  }, []);

  const dismissAwayPause = useCallback(() => {
    setState((prev) => ({ ...prev, pausedReason: null }));
  }, []);

  const value: FocusTimerContextType = {
    phase: state.phase,
    status: state.status,
    preset: state.preset,
    completedFocusCount: state.completedFocusCount,
    remainingMs: state.remainingMs,
    targetDurationMs: state.targetDurationMs,
    endsAt: state.endsAt,
    startedAt: state.startedAt,
    autoStartNext: state.autoStartNext,
    notificationsEnabled: state.notificationsEnabled,
    pausedReason: state.pausedReason,
    sessions,
    startFocus,
    startBreak,
    pause,
    resume,
    skip,
    stop,
    setPreset,
    setAutoStartNext,
    setNotificationsEnabled,
    dismissAwayPause,
    recordSession,
  };

  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>;
}

const defaultTimerContext: FocusTimerContextType = {
  phase: 'idle',
  status: 'idle',
  preset: DEFAULT_PRESET,
  completedFocusCount: 0,
  remainingMs: 25 * 60 * 1000,
  targetDurationMs: 25 * 60 * 1000,
  endsAt: null,
  startedAt: null,
  autoStartNext: true,
  notificationsEnabled: false,
  pausedReason: null,
  sessions: [],
  startFocus: () => {},
  startBreak: () => {},
  pause: () => {},
  resume: () => {},
  skip: () => {},
  stop: () => {},
  setPreset: () => {},
  setAutoStartNext: () => {},
  setNotificationsEnabled: async () => false,
  dismissAwayPause: () => {},
  recordSession: () => {},
};

export function useFocusTimer(): FocusTimerContextType {
  const context = useContext(FocusTimerContext);
  return context ?? defaultTimerContext;
}

/**
 * Lightweight hook for timer display components that updates countdown each second.
 * Does NOT cause the entire app or un-subscribed components to re-render.
 */
export function useFocusCountdown() {
  const { status, endsAt, remainingMs: staticRemainingMs, targetDurationMs } = useFocusTimer();

  const calculateRemaining = useCallback(() => {
    if (status === 'running' && endsAt !== null) {
      return Math.max(0, endsAt - Date.now());
    }
    return staticRemainingMs;
  }, [status, endsAt, staticRemainingMs]);

  const [remainingMs, setRemainingMs] = useState(calculateRemaining);

  useEffect(() => {
    setRemainingMs(calculateRemaining());
    if (status !== 'running' || endsAt === null) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingMs(calculateRemaining());
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [status, endsAt, calculateRemaining]);

  const progress = targetDurationMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / targetDurationMs)) : 0;
  const formatted = formatClockTime(remainingMs);

  return { remainingMs, formatted, progress };
}
