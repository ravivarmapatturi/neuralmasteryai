/**
 * Pure logic for the Pomodoro focus timer, session recording, and focus stats.
 * Zero React dependencies so it can be tested deterministically.
 */

export interface FocusPreset {
  id: '25-5' | '50-10' | 'custom';
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

export const PRESET_25_5: FocusPreset = {
  id: '25-5',
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

export const PRESET_50_10: FocusPreset = {
  id: '50-10',
  focusMinutes: 50,
  shortBreakMinutes: 10,
  longBreakMinutes: 30,
};

export const DEFAULT_PRESET: FocusPreset = PRESET_25_5;

export type FocusPhase = 'idle' | 'focus' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'phaseEnded';
export type PausedReason = 'user' | 'away' | null;

export interface FocusSession {
  id: string;
  startedAt: string; // ISO string
  endedAt: string; // ISO string
  plannedMinutes: number;
  focusedSeconds: number;
  completed: boolean;
  section: string; // first path segment (e.g. 'learn', 'labs', 'interview', 'home')
}

export interface FocusTimerState {
  phase: FocusPhase;
  status: TimerStatus;
  preset: FocusPreset;
  completedFocusCount: number; // 0..4 in current cycle
  startedAt: number | null; // epoch ms of phase start
  endsAt: number | null; // epoch ms when phase is scheduled to end
  remainingMs: number; // ms remaining
  targetDurationMs: number;
  autoStartNext: boolean;
  notificationsEnabled: boolean;
  currentSessionId: string | null;
  currentSessionSection: string;
  accumulatedFocusMs: number;
  lastTickTimestamp: number | null;
  pausedReason: PausedReason;
}

/** Helper to generate UUIDs in browser or node environments */
export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Extract first path segment from route path */
export function extractSection(pathname: string): string {
  if (!pathname) return 'home';
  const clean = pathname.replace(/^\/+/, '').split('/')[0];
  return clean || 'home';
}

export function createInitialState(preset: FocusPreset = DEFAULT_PRESET): FocusTimerState {
  const targetMs = preset.focusMinutes * 60 * 1000;
  return {
    phase: 'idle',
    status: 'idle',
    preset,
    completedFocusCount: 0,
    startedAt: null,
    endsAt: null,
    remainingMs: targetMs,
    targetDurationMs: targetMs,
    autoStartNext: true,
    notificationsEnabled: false,
    currentSessionId: null,
    currentSessionSection: 'home',
    accumulatedFocusMs: 0,
    lastTickTimestamp: null,
    pausedReason: null,
  };
}

export function startPhase(
  state: FocusTimerState,
  phase: 'focus' | 'shortBreak' | 'longBreak',
  section: string,
  now = Date.now(),
): FocusTimerState {
  let minutes = state.preset.focusMinutes;
  if (phase === 'shortBreak') minutes = state.preset.shortBreakMinutes;
  if (phase === 'longBreak') minutes = state.preset.longBreakMinutes;

  const targetDurationMs = minutes * 60 * 1000;
  const isFocus = phase === 'focus';

  return {
    ...state,
    phase,
    status: 'running',
    startedAt: now,
    endsAt: now + targetDurationMs,
    remainingMs: targetDurationMs,
    targetDurationMs,
    pausedReason: null,
    currentSessionId: isFocus ? (state.currentSessionId || generateSessionId()) : state.currentSessionId,
    currentSessionSection: isFocus ? (section || state.currentSessionSection || 'home') : state.currentSessionSection,
    lastTickTimestamp: isFocus ? now : null,
  };
}

/** Pause the timer */
export function pauseTimer(state: FocusTimerState, reason: PausedReason = 'user', now = Date.now()): FocusTimerState {
  if (state.status !== 'running') return state;

  let accumulated = state.accumulatedFocusMs;
  let remainingMs = state.remainingMs;

  if (state.endsAt !== null) {
    remainingMs = Math.max(0, state.endsAt - now);
  }

  if (state.phase === 'focus' && state.lastTickTimestamp !== null) {
    const elapsed = Math.max(0, now - state.lastTickTimestamp);
    accumulated += elapsed;
  }

  return {
    ...state,
    status: 'paused',
    remainingMs,
    accumulatedFocusMs: accumulated,
    lastTickTimestamp: null,
    pausedReason: reason,
  };
}

/** Resume the timer */
export function resumeTimer(state: FocusTimerState, now = Date.now()): FocusTimerState {
  if (state.status !== 'paused' || state.remainingMs <= 0) return state;

  return {
    ...state,
    status: 'running',
    startedAt: now - (state.targetDurationMs - state.remainingMs),
    endsAt: now + state.remainingMs,
    lastTickTimestamp: state.phase === 'focus' ? now : null,
    pausedReason: null,
  };
}

export interface RolloverResult {
  nextState: FocusTimerState;
  completedSessions: FocusSession[];
  phaseChangesCount: number;
}

/**
 * Calculates phase transitions and records completed sessions across wall-clock time gaps
 * (background tabs, sleep/wake, page reloads).
 * Runs continuously through all elapsed phases until reaching the currently active phase.
 */
export function rolloverTimer(state: FocusTimerState, now = Date.now()): RolloverResult {
  if (state.status !== 'running' || state.endsAt === null) {
    return { nextState: state, completedSessions: [], phaseChangesCount: 0 };
  }

  if (now < state.endsAt) {
    const remainingMs = state.endsAt - now;
    let accumulated = state.accumulatedFocusMs;
    if (state.phase === 'focus' && state.lastTickTimestamp !== null) {
      const elapsed = Math.max(0, now - state.lastTickTimestamp);
      accumulated = Math.min(state.targetDurationMs, accumulated + elapsed);
    }
    return {
      nextState: {
        ...state,
        remainingMs,
        accumulatedFocusMs: accumulated,
        lastTickTimestamp: state.phase === 'focus' ? now : null,
      },
      completedSessions: [],
      phaseChangesCount: 0,
    };
  }

  // One or more phases have completed
  let curPhase = state.phase;
  let curCount = state.completedFocusCount;
  let curEndsAt = state.endsAt;
  let curStartedAt = state.startedAt ?? (curEndsAt - state.targetDurationMs);
  let curSessionId = state.currentSessionId;
  const curSection = state.currentSessionSection || 'home';
  const completedSessions: FocusSession[] = [];
  let phaseChangesCount = 0;

  const MAX_ROLLOVER_STEPS = 500;
  let steps = 0;

  while (now >= curEndsAt && steps < MAX_ROLLOVER_STEPS) {
    steps++;
    phaseChangesCount++;

    if (curPhase === 'focus') {
      const plannedMinutes = state.preset.focusMinutes;
      const targetMs = plannedMinutes * 60 * 1000;
      const focusedSeconds = Math.floor(targetMs / 1000);
      const startedIso = new Date(curStartedAt).toISOString();
      const endedIso = new Date(curEndsAt).toISOString();
      const sessionId = curSessionId || generateSessionId();

      completedSessions.push({
        id: sessionId,
        startedAt: startedIso,
        endedAt: endedIso,
        plannedMinutes,
        focusedSeconds,
        completed: true,
        section: curSection,
      });

      const nextCompletedCount = curCount + 1;
      const isLongBreak = nextCompletedCount >= 4;
      curPhase = isLongBreak ? 'longBreak' : 'shortBreak';
      curCount = isLongBreak ? 0 : nextCompletedCount;
      const breakMinutes = isLongBreak ? state.preset.longBreakMinutes : state.preset.shortBreakMinutes;
      const breakDurationMs = breakMinutes * 60 * 1000;

      curStartedAt = curEndsAt;
      curEndsAt = curStartedAt + breakDurationMs;
      curSessionId = null;
    } else {
      // Break phase ended -> start next focus session
      curPhase = 'focus';
      const focusMinutes = state.preset.focusMinutes;
      const focusDurationMs = focusMinutes * 60 * 1000;

      curStartedAt = curEndsAt;
      curEndsAt = curStartedAt + focusDurationMs;
      curSessionId = generateSessionId();
    }
  }

  // Active phase reached
  const targetDurationMs = curPhase === 'focus'
    ? state.preset.focusMinutes * 60 * 1000
    : (curPhase === 'longBreak' ? state.preset.longBreakMinutes * 60 * 1000 : state.preset.shortBreakMinutes * 60 * 1000);

  const remainingMs = Math.max(0, curEndsAt - now);
  const elapsedInPhase = Math.max(0, now - curStartedAt);
  const accumulatedFocusMs = curPhase === 'focus' ? Math.min(targetDurationMs, elapsedInPhase) : 0;
  const lastTickTimestamp = curPhase === 'focus' ? now : null;

  const nextState: FocusTimerState = {
    ...state,
    phase: curPhase,
    status: 'running',
    completedFocusCount: curCount,
    startedAt: curStartedAt,
    endsAt: curEndsAt,
    remainingMs,
    targetDurationMs,
    currentSessionId: curSessionId,
    accumulatedFocusMs,
    lastTickTimestamp,
    pausedReason: null,
  };

  return {
    nextState,
    completedSessions,
    phaseChangesCount,
  };
}

/** Handle background tab visibility change: computes rollover from timestamp */
export function handleVisibilityChange(
  state: FocusTimerState,
  _hiddenDurationMs: number,
  now = Date.now(),
): { state: FocusTimerState; autoPaused: boolean; completedSessions: FocusSession[] } {
  if (state.status !== 'running') {
    return { state, autoPaused: false, completedSessions: [] };
  }

  const { nextState, completedSessions } = rolloverTimer(state, now);
  return { state: nextState, autoPaused: false, completedSessions };
}

/** Recalculate remaining time and accumulated focus on a clock tick */
export function tickTimer(state: FocusTimerState, now = Date.now()): FocusTimerState {
  if (state.status !== 'running' || state.endsAt === null) {
    return state;
  }

  if (now >= state.endsAt) {
    const { nextState } = rolloverTimer(state, now);
    return nextState;
  }

  const remainingMs = Math.max(0, state.endsAt - now);
  let accumulated = state.accumulatedFocusMs;

  if (state.phase === 'focus' && state.lastTickTimestamp !== null) {
    const elapsed = Math.max(0, now - state.lastTickTimestamp);
    accumulated = Math.min(state.targetDurationMs, accumulated + elapsed);
  }

  return {
    ...state,
    remainingMs,
    accumulatedFocusMs: accumulated,
    lastTickTimestamp: state.phase === 'focus' ? now : null,
  };
}

/** Transition when current phase ends */
export function completePhase(state: FocusTimerState, now = Date.now()): FocusTimerState {
  const currentPhase = state.phase;

  if (currentPhase === 'focus') {
    const nextCompletedCount = state.completedFocusCount + 1;
    const isLongBreak = nextCompletedCount >= 4;
    const nextPhase: FocusPhase = isLongBreak ? 'longBreak' : 'shortBreak';
    const breakMinutes = isLongBreak ? state.preset.longBreakMinutes : state.preset.shortBreakMinutes;
    const breakDurationMs = breakMinutes * 60 * 1000;

    return {
      ...state,
      phase: nextPhase,
      status: 'running',
      autoStartNext: true,
      completedFocusCount: isLongBreak ? 0 : nextCompletedCount,
      startedAt: now,
      endsAt: now + breakDurationMs,
      remainingMs: breakDurationMs,
      targetDurationMs: breakDurationMs,
      lastTickTimestamp: null,
      pausedReason: null,
    };
  }

  // Break phase ended -> start next focus session
  const focusDurationMs = state.preset.focusMinutes * 60 * 1000;
  return {
    ...state,
    phase: 'focus',
    status: 'running',
    autoStartNext: true,
    startedAt: now,
    endsAt: now + focusDurationMs,
    remainingMs: focusDurationMs,
    targetDurationMs: focusDurationMs,
    currentSessionId: generateSessionId(),
    accumulatedFocusMs: 0,
    lastTickTimestamp: now,
    pausedReason: null,
  };
}

/** Skip current phase to next */
export function skipPhase(state: FocusTimerState, section: string, now = Date.now()): FocusTimerState {
  if (state.phase === 'focus') {
    const nextCompletedCount = state.completedFocusCount + 1;
    const isLongBreak = nextCompletedCount >= 4;
    const nextPhase: FocusPhase = isLongBreak ? 'longBreak' : 'shortBreak';
    return startPhase(
      {
        ...state,
        completedFocusCount: isLongBreak ? 0 : nextCompletedCount,
      },
      nextPhase,
      section,
      now,
    );
  }

  // In break or idle -> start focus
  return startPhase(
    {
      ...state,
      accumulatedFocusMs: 0,
      currentSessionId: generateSessionId(),
    },
    'focus',
    section,
    now,
  );
}

/** Stop current session */
export function stopSession(state: FocusTimerState, now = Date.now()): {
  nextState: FocusTimerState;
  completedSession: FocusSession | null;
} {
  let session: FocusSession | null = null;
  const isFocus = state.phase === 'focus';
  const effectiveNow = state.endsAt !== null ? Math.min(now, state.endsAt) : now;
  let totalFocusedMs = state.accumulatedFocusMs;

  if (isFocus && state.status === 'running' && state.lastTickTimestamp !== null) {
    totalFocusedMs += Math.max(0, effectiveNow - state.lastTickTimestamp);
  }

  // Focused time is capped by targetDurationMs for focus phases
  if (isFocus && state.targetDurationMs > 0) {
    totalFocusedMs = Math.min(state.targetDurationMs, totalFocusedMs);
  }

  const focusedSeconds = Math.floor(totalFocusedMs / 1000);

  // A session is saved when it completes or is stopped, if it has at least 1 minute (60s) of focus
  if (focusedSeconds >= 60 && state.currentSessionId) {
    const started = state.startedAt ? new Date(state.startedAt).toISOString() : new Date(now - totalFocusedMs).toISOString();
    const sessionEndedAt = (state.endsAt !== null && now >= state.endsAt)
      ? new Date(state.endsAt).toISOString()
      : new Date(effectiveNow).toISOString();

    session = {
      id: state.currentSessionId,
      startedAt: started,
      endedAt: sessionEndedAt,
      plannedMinutes: state.preset.focusMinutes,
      focusedSeconds,
      completed: state.remainingMs <= 0 || (state.endsAt !== null && now >= state.endsAt),
      section: state.currentSessionSection || 'home',
    };
  }

  const resetTargetMs = state.preset.focusMinutes * 60 * 1000;
  const nextState: FocusTimerState = {
    ...state,
    phase: 'idle',
    status: 'idle',
    startedAt: null,
    endsAt: null,
    remainingMs: resetTargetMs,
    targetDurationMs: resetTargetMs,
    currentSessionId: null,
    accumulatedFocusMs: 0,
    lastTickTimestamp: null,
    pausedReason: null,
  };

  return { nextState, completedSession: session };
}

/** Finalize a completed focus session into a FocusSession record if eligible (>= 60s) */
export function finalizeFocusSession(
  state: FocusTimerState,
  completed: boolean,
  now = Date.now(),
): FocusSession | null {
  const focusedSeconds = Math.floor(state.accumulatedFocusMs / 1000);
  if (focusedSeconds < 60 || !state.currentSessionId) {
    return null;
  }

  const started = state.startedAt ? new Date(state.startedAt).toISOString() : new Date(now - state.accumulatedFocusMs).toISOString();

  return {
    id: state.currentSessionId,
    startedAt: started,
    endedAt: new Date(now).toISOString(),
    plannedMinutes: state.preset.focusMinutes,
    focusedSeconds,
    completed,
    section: state.currentSessionSection || 'home',
  };
}

/** Update preset */
export function updatePreset(state: FocusTimerState, preset: FocusPreset): FocusTimerState {
  if (state.status === 'idle') {
    const targetMs = preset.focusMinutes * 60 * 1000;
    return {
      ...state,
      preset,
      remainingMs: targetMs,
      targetDurationMs: targetMs,
    };
  }
  // The focus phase that is already running takes the new length, keeping the time already focused.
  if (state.phase === 'focus' && (state.status === 'running' || state.status === 'paused')) {
    const now = Date.now();
    const remainingNow = state.status === 'running' && state.endsAt !== null ? Math.max(0, state.endsAt - now) : state.remainingMs;
    const elapsed = state.targetDurationMs - remainingNow;
    const targetMs = preset.focusMinutes * 60 * 1000;
    const remainingMs = Math.max(60 * 1000, targetMs - elapsed);
    return {
      ...state,
      preset,
      targetDurationMs: targetMs,
      remainingMs,
      endsAt: state.status === 'running' ? now + remainingMs : state.endsAt,
    };
  }
  return {
    ...state,
    preset,
  };
}

/** Resume timer state from persisted localStorage payload after page reload */
export function restoreStateFromStorage(saved: Partial<FocusTimerState> | null, now = Date.now()): FocusTimerState {
  if (!saved || !saved.preset) {
    return createInitialState();
  }

  const base = createInitialState(saved.preset);
  const state: FocusTimerState = {
    ...base,
    ...saved,
    autoStartNext: true, // Always migrate old states with autoStartNext: false to true
  };

  if (state.pausedReason === 'away') {
    state.pausedReason = null;
    state.status = 'running';
  }

  // If saved state was phaseEnded (or running past endsAt), roll over to the active continuous phase
  if (state.status === 'phaseEnded' || (state.status === 'running' && state.endsAt !== null && now >= state.endsAt)) {
    const rolloverBase: FocusTimerState = {
      ...state,
      status: 'running',
      endsAt: state.endsAt ?? now,
    };
    const { nextState } = rolloverTimer(rolloverBase, now);
    return nextState;
  }

  if (state.status === 'running' && state.endsAt !== null) {
    // Still running: recalculate remainingMs from timestamp
    const remainingMs = Math.max(0, state.endsAt - now);
    const elapsedSinceLastTick = state.lastTickTimestamp !== null ? Math.max(0, now - state.lastTickTimestamp) : 0;
    const accumulatedFocusMs = state.phase === 'focus'
      ? Math.min(state.targetDurationMs, state.accumulatedFocusMs + elapsedSinceLastTick)
      : state.accumulatedFocusMs;

    return {
      ...state,
      remainingMs,
      accumulatedFocusMs,
      lastTickTimestamp: state.phase === 'focus' ? now : null,
    };
  }

  return state;
}

// -------------------------------------------------------------
// Focus Statistics and Analytics (Pure functions)
// -------------------------------------------------------------

export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Splits a session's focusedSeconds across local calendar days.
 * Rule: Focus time crossing local midnight (00:00) is split proportionally between
 * the calendar day before midnight and the calendar day after midnight based on elapsed time.
 */
export function splitSessionByLocalDay(session: FocusSession): Array<{ date: string; seconds: number }> {
  if (!session || !session.startedAt || !session.endedAt || session.focusedSeconds <= 0) {
    return [];
  }

  const startMs = new Date(session.startedAt).getTime();
  const endMs = new Date(session.endedAt).getTime();

  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
    const dStr = localDateString(new Date(session.endedAt || session.startedAt));
    return [{ date: dStr, seconds: session.focusedSeconds }];
  }

  const startDateStr = localDateString(new Date(startMs));
  const endDateStr = localDateString(new Date(endMs));

  if (startDateStr === endDateStr) {
    return [{ date: startDateStr, seconds: session.focusedSeconds }];
  }

  // Crosses local midnight (or multiple midnights)
  const totalDurationMs = endMs - startMs;
  const result: Array<{ date: string; seconds: number }> = [];
  let currentStartMs = startMs;
  let remainingSeconds = session.focusedSeconds;

  while (currentStartMs < endMs) {
    const curDate = new Date(currentStartMs);
    const dateStr = localDateString(curDate);

    // Find next midnight in local timezone
    const nextMidnight = new Date(curDate);
    nextMidnight.setHours(24, 0, 0, 0);
    const nextMidnightMs = nextMidnight.getTime();

    const segmentEndMs = Math.min(endMs, nextMidnightMs);
    const segmentDurationMs = segmentEndMs - currentStartMs;

    // Proportion of this segment relative to total elapsed time
    const ratio = segmentDurationMs / totalDurationMs;
    const segmentSeconds = Math.min(remainingSeconds, Math.round(session.focusedSeconds * ratio));

    if (segmentSeconds > 0) {
      result.push({ date: dateStr, seconds: segmentSeconds });
      remainingSeconds -= segmentSeconds;
    }

    currentStartMs = segmentEndMs;
  }

  // Assign any rounding difference to the last segment
  if (remainingSeconds > 0 && result.length > 0) {
    result[result.length - 1].seconds += remainingSeconds;
  }

  return result;
}

/** Merge two session lists by id, de-duplicating and sorting chronologically */
export function mergeFocusSessions(remote: FocusSession[], local: FocusSession[]): FocusSession[] {
  const map = new Map<string, FocusSession>();

  for (const s of [...remote, ...local]) {
    if (!s || !s.id) continue;
    const existing = map.get(s.id);
    if (!existing) {
      map.set(s.id, s);
    } else {
      // Keep version with more focused seconds or marked completed
      if (s.focusedSeconds > existing.focusedSeconds || (!existing.completed && s.completed)) {
        map.set(s.id, s);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
}

/** Total focused seconds for today in user's local timezone */
export function todayFocusSeconds(sessions: FocusSession[], now = Date.now()): number {
  const todayStr = localDateString(new Date(now));
  let total = 0;
  for (const s of sessions) {
    const splits = splitSessionByLocalDay(s);
    for (const split of splits) {
      if (split.date === todayStr) {
        total += split.seconds;
      }
    }
  }
  return total;
}

/** Total focused seconds for current week (Monday through Sunday) */
export function weekFocusSeconds(sessions: FocusSession[], now = Date.now()): number {
  const d = new Date(now);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const mondayStr = localDateString(monday);
  const sundayStr = localDateString(sunday);

  let total = 0;
  for (const s of sessions) {
    const splits = splitSessionByLocalDay(s);
    for (const split of splits) {
      if (split.date >= mondayStr && split.date <= sundayStr) {
        total += split.seconds;
      }
    }
  }
  return total;
}

/** Total focused seconds all-time */
export function allTimeFocusSeconds(sessions: FocusSession[]): number {
  let total = 0;
  for (const s of sessions) {
    total += s.focusedSeconds;
  }
  return total;
}

/** Total completed focus sessions */
export function completedSessionCount(sessions: FocusSession[]): number {
  return sessions.filter((s) => s.completed).length;
}

/** Current streak in days (consecutive days with at least 1 completed session) */
export function focusStreak(sessions: FocusSession[], now = Date.now()): number {
  const completedDates = new Set<string>();
  for (const s of sessions) {
    if (s.completed) {
      completedDates.add(localDateString(new Date(s.endedAt)));
    }
  }

  if (completedDates.size === 0) return 0;

  const today = new Date(now);
  const todayStr = localDateString(today);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = localDateString(yesterday);

  // Streak must include either today or yesterday to be active
  let currentCheckDate: Date;
  if (completedDates.has(todayStr)) {
    currentCheckDate = today;
  } else if (completedDates.has(yesterdayStr)) {
    currentCheckDate = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  const cursor = new Date(currentCheckDate);

  while (completedDates.has(localDateString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export interface DayBarStat {
  date: string;
  dayLabel: string; // 'Mon', 'Tue', etc.
  focusMinutes: number;
}

/** 7-day bar chart stats for the last 7 calendar days up to today */
export function sevenDayBarStats(sessions: FocusSession[], now = Date.now()): DayBarStat[] {
  const days: DayBarStat[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Map dates to total seconds using proportional midnight splitting
  const dateToSeconds: Record<string, number> = {};
  for (const s of sessions) {
    const splits = splitSessionByLocalDay(s);
    for (const split of splits) {
      dateToSeconds[split.date] = (dateToSeconds[split.date] || 0) + split.seconds;
    }
  }

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = localDateString(d);
    const dayLabel = dayNames[d.getDay()];

    const seconds = dateToSeconds[dateStr] || 0;

    days.push({
      date: dateStr,
      dayLabel,
      focusMinutes: Math.round(seconds / 60),
    });
  }

  return days;
}

export interface HeatmapDay {
  date: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  focusMinutes: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

/** 12-week heatmap stats (12 weeks * 7 days = 84 days ending on Saturday of current week) */
export function twelveWeekHeatmapStats(sessions: FocusSession[], now = Date.now()): HeatmapDay[] {
  const current = new Date(now);
  const currentDayOfWeek = current.getDay(); // 0 is Sun, 6 is Sat
  // End on the coming Saturday (or today if Saturday)
  const endDate = new Date(current);
  endDate.setDate(current.getDate() + (6 - currentDayOfWeek));

  const totalDays = 12 * 7;
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (totalDays - 1));

  const dateToSeconds: Record<string, number> = {};
  for (const s of sessions) {
    const splits = splitSessionByLocalDay(s);
    for (const split of splits) {
      dateToSeconds[split.date] = (dateToSeconds[split.date] || 0) + split.seconds;
    }
  }

  const result: HeatmapDay[] = [];
  const iter = new Date(startDate);

  for (let i = 0; i < totalDays; i++) {
    const dStr = localDateString(iter);
    const secs = dateToSeconds[dStr] || 0;
    const mins = Math.round(secs / 60);

    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (mins >= 60) intensity = 4;
    else if (mins >= 30) intensity = 3;
    else if (mins >= 15) intensity = 2;
    else if (mins > 0) intensity = 1;

    result.push({
      date: dStr,
      dayOfWeek: iter.getDay(),
      focusMinutes: mins,
      intensity,
    });

    iter.setDate(iter.getDate() + 1);
  }

  return result;
}

export interface SectionStat {
  section: string;
  label: string;
  focusedSeconds: number;
  focusMinutes: number;
  percentage: number;
}

const SECTION_LABELS: Record<string, string> = {
  learn: 'Learn',
  labs: 'Labs',
  interview: 'Interview',
  'study-plans': 'Study Plans',
  research: 'Research',
  projects: 'Projects',
  atlas: 'Atlas',
  blog: 'Blog',
  glossary: 'Glossary',
  progress: 'Progress',
  focus: 'Focus',
  home: 'Home',
};

/** Breakdown of focus time by site section */
export function sectionBreakdownStats(sessions: FocusSession[]): SectionStat[] {
  const sectionTotals: Record<string, number> = {};
  let grandTotal = 0;

  for (const s of sessions) {
    const sec = s.section || 'home';
    sectionTotals[sec] = (sectionTotals[sec] || 0) + s.focusedSeconds;
    grandTotal += s.focusedSeconds;
  }

  if (grandTotal === 0) return [];

  const list: SectionStat[] = Object.entries(sectionTotals).map(([section, secCount]) => {
    const focusMinutes = Math.round(secCount / 60);
    const percentage = Math.round((secCount / grandTotal) * 100);
    return {
      section,
      label: SECTION_LABELS[section] || (section.charAt(0).toUpperCase() + section.slice(1)),
      focusedSeconds: secCount,
      focusMinutes,
      percentage,
    };
  });

  return list.sort((a, b) => b.focusedSeconds - a.focusedSeconds);
}

/** Formatter for seconds into "Xh Ym" or "Xm" */
export function formatFocusTime(totalSeconds: number): string {
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/** Formatter for remaining milliseconds into MM:SS */
export function formatClockTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
