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
  handleVisibilityChange,
  completePhase,
  skipPhase,
  stopSession,
  restoreStateFromStorage,
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
  const [{ db }, { doc, getDoc, setDoc }] = await Promise.all([
    import('../lib/firebase'),
    import('firebase/firestore'),
  ]);
  return { progressRef: doc(db, 'progress', uid), getDoc, setDoc };
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

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { enabled: musicEnabled, playing: musicPlaying, play: playMusic, pause: pauseMusic } = useFocusMusic();

  const [state, setState] = useState<FocusTimerState>(() => {
    const saved = readStorage<Partial<FocusTimerState>>(TIMER_STORAGE_KEY);
    return restoreStateFromStorage(saved);
  });

  const [sessions, setSessions] = useState<FocusSession[]>(() => {
    const saved = readStorage<FocusSession[]>(SESSIONS_STORAGE_KEY);
    return Array.isArray(saved) ? saved : [];
  });

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

  // Sync with Firestore for signed-in users
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const local = readStorage<FocusSession[]>(SESSIONS_STORAGE_KEY);
      if (Array.isArray(local)) updateSessions(local);
      return;
    }

    let cancelled = false;

    user.getIdToken(true).then(() => {
      if (cancelled) return;
      loadFirestoreFor(user.uid).then(async ({ progressRef, getDoc, setDoc }) => {
        if (cancelled) return;
        try {
          const snap = await withRetry(() => getDoc(progressRef));
          const remoteSessions: FocusSession[] = snap.exists() && Array.isArray(snap.data()?.focusSessions)
            ? snap.data()!.focusSessions
            : [];
          const localSessions = readStorage<FocusSession[]>(SESSIONS_STORAGE_KEY) || [];
          const merged = mergeFocusSessions(remoteSessions, localSessions);

          if (cancelled) return;
          await withRetry(() =>
            setDoc(progressRef, { focusSessions: merged.slice(-MAX_STORED_SESSIONS) }, { merge: true }),
          );

          if (cancelled) return;
          updateSessions(merged);
        } catch (err) {
          console.warn('Focus timer: failed to sync with Firestore', err);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, updateSessions]);

  const recordSession = useCallback(
    (session: FocusSession) => {
      const merged = mergeFocusSessions(sessionsRef.current, [session]);
      updateSessions(merged);

      if (user) {
        loadFirestoreFor(user.uid).then(async ({ progressRef, setDoc }) => {
          try {
            await withRetry(() =>
              setDoc(progressRef, { focusSessions: merged.slice(-MAX_STORED_SESSIONS) }, { merge: true }),
            );
          } catch {
            // will re-sync next cycle
          }
        });
      }
    },
    [user, updateSessions],
  );

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

  // Tab visibility: 60-second background tab away rule
  useEffect(() => {
    let hiddenAt: number | null = null;

    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else {
        if (hiddenAt !== null) {
          const duration = Date.now() - hiddenAt;
          hiddenAt = null;
          if (stateRef.current.status === 'running') {
            const result = handleVisibilityChange(stateRef.current, duration, Date.now());
            if (result.autoPaused) {
              setState(result.state);
            }
          }
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Phase completion timer effect
  useEffect(() => {
    if (state.status !== 'running' || state.endsAt === null) {
      return;
    }

    const msUntilEnd = Math.max(0, state.endsAt - Date.now());
    const timeout = setTimeout(() => {
      const next = completePhase(stateRef.current, Date.now());
      playChime();
      if (stateRef.current.notificationsEnabled) {
        notifyPhaseEnded(stateRef.current.phase);
      }

      // If phase was focus and finished, save session
      if (stateRef.current.phase === 'focus') {
        const { completedSession } = stopSession(stateRef.current, Date.now());
        if (completedSession) {
          recordSession({ ...completedSession, completed: true });
        }
      }

      setState(next);
    }, msUntilEnd);

    return () => {
      clearTimeout(timeout);
    };
  }, [state.status, state.endsAt, state.phase, recordSession]);

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

  const setAutoStartNext = useCallback((autoStartNext: boolean) => {
    setState((prev) => ({ ...prev, autoStartNext }));
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
  autoStartNext: false,
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
