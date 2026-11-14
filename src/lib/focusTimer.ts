/**
 * Pure logic for screen time tracking, session recording, and focus stats.
 * Zero React dependencies so it can be tested deterministically.
 */

export interface FocusSession {
  id: string;
  startedAt: string; // ISO string
  endedAt: string; // ISO string
  focusedSeconds: number;
  completed: boolean;
  section: string; // first path segment (e.g. 'learn', 'labs', 'interview', 'home')
  plannedMinutes?: number; // legacy backward compat
}

export type TimerStatus = 'running' | 'paused';
export type FocusPhase = 'focus' | 'idle' | 'shortBreak' | 'longBreak';
export type PausedReason = 'user' | 'away' | null;

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

export interface FocusTimerState {
  status: TimerStatus;
  isPaused: boolean;
  todaySeconds: number;
  currentSection: string;
  lastTickTimestamp: number | null;
  // Legacy fields for backward compat
  phase?: FocusPhase;
  preset?: FocusPreset;
  remainingMs?: number;
  targetDurationMs?: number;
  endsAt?: number | null;
  startedAt?: number | null;
  autoStartNext?: boolean;
  notificationsEnabled?: boolean;
  completedFocusCount?: number;
  pausedReason?: PausedReason;
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

export function createInitialState(_preset?: FocusPreset): FocusTimerState {
  return {
    status: 'running',
    isPaused: false,
    todaySeconds: 0,
    currentSection: 'home',
    lastTickTimestamp: null,
  };
}

export function pauseTimer(state: FocusTimerState, _reason: PausedReason = 'user', _now = Date.now()): FocusTimerState {
  return {
    ...state,
    status: 'paused',
    isPaused: true,
    lastTickTimestamp: null,
    pausedReason: 'user',
  };
}

export function resumeTimer(state: FocusTimerState, now = Date.now()): FocusTimerState {
  return {
    ...state,
    status: 'running',
    isPaused: false,
    lastTickTimestamp: now,
    pausedReason: null,
  };
}

/** Drops old Pomodoro timer properties (phase, preset, autoStartNext, endsAt, etc.) */
export function restoreStateFromStorage(saved: any, _now = Date.now()): FocusTimerState {
  if (!saved || typeof saved !== 'object') {
    return createInitialState();
  }

  const isPaused = Boolean(saved.isPaused || (saved.status === 'paused' && saved.pausedReason !== 'away'));
  const section = saved.currentSection || saved.currentSessionSection || 'home';
  return {
    status: isPaused ? 'paused' : 'running',
    isPaused,
    todaySeconds: typeof saved.todaySeconds === 'number' ? saved.todaySeconds : 0,
    currentSection: typeof section === 'string' ? section : 'home',
    lastTickTimestamp: null,
    pausedReason: isPaused ? 'user' : null,
  };
}

export interface ScreenTimeTabState {
  isVisible: boolean;
  isFocused: boolean;
  isPaused: boolean;
}

/** Counting condition: active tab on Neural Mastery while visible and focused, and not manually paused */
export function shouldCountScreenTime(tab: ScreenTimeTabState): boolean {
  return tab.isVisible && tab.isFocused && !tab.isPaused;
}

export interface RecordTickOptions {
  lockTimestamp?: number;
  lockThresholdMs?: number;
  maxGapMs?: number;
}

/**
 * Pure function to record a screen-time tick across tabs, detecting gaps and midnight rollover.
 * - Tab lock: if another tab ticked within lockThresholdMs, it does not tick (no double counting).
 * - Gap detection: if gap > maxGapMs, time spent away is dropped (no catch-up).
 * - Midnight rollover: if local date changed, a new session is started for the new calendar day.
 */
export function recordScreenTimeTick(
  sessions: FocusSession[],
  section: string,
  now: number,
  lastTickTimestamp: number | null,
  options?: RecordTickOptions,
): {
  sessions: FocusSession[];
  ticked: boolean;
  newLockTimestamp: number;
  newLastTickTimestamp: number;
} {
  const threshold = options?.lockThresholdMs ?? 900;
  const lock = options?.lockTimestamp ?? 0;

  // Multi-tab deduplication: another tab already claimed this interval
  if (now - lock < threshold) {
    return {
      sessions,
      ticked: false,
      newLockTimestamp: lock,
      newLastTickTimestamp: lastTickTimestamp ?? now,
    };
  }

  const nowIso = new Date(now).toISOString();
  const todayStr = localDateString(new Date(now));
  const maxGap = options?.maxGapMs ?? 2000;

  // If a large gap occurred (> maxGap), do not catch up; start fresh
  const isGap = lastTickTimestamp !== null && (now - lastTickTimestamp) > maxGap;

  const currentSec = section || 'home';
  const nextSessions = [...sessions];
  const lastIndex = nextSessions.length - 1;

  if (lastIndex >= 0 && !isGap) {
    const prev = nextSessions[lastIndex];
    const prevDateStr = localDateString(new Date(prev.endedAt));

    // Can extend the previous session if same section and same calendar day
    if (prev.section === currentSec && prevDateStr === todayStr) {
      nextSessions[lastIndex] = {
        ...prev,
        endedAt: nowIso,
        focusedSeconds: prev.focusedSeconds + 1,
      };
      return {
        sessions: nextSessions,
        ticked: true,
        newLockTimestamp: now,
        newLastTickTimestamp: now,
      };
    }
  }

  // Create a new session (first tick, section changed, midnight rollover, or returned after gap)
  nextSessions.push({
    id: generateSessionId(),
    startedAt: nowIso,
    endedAt: nowIso,
    focusedSeconds: 1,
    completed: true,
    section: currentSec,
  });

  return {
    sessions: nextSessions,
    ticked: true,
    newLockTimestamp: now,
    newLastTickTimestamp: now,
  };
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
    if (s.completed && s.focusedSeconds > 0) {
      const splits = splitSessionByLocalDay(s);
      for (const sp of splits) {
        if (sp.seconds > 0) {
          completedDates.add(sp.date);
        }
      }
    }
  }

  if (completedDates.size === 0) return 0;

  const today = new Date(now);
  const todayStr = localDateString(today);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = localDateString(yesterday);

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
  const currentDayOfWeek = current.getDay();
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

/**
 * Formatter for today's focus time in the navbar control:
 * e.g. "mm:ss" under an hour, or "1h 12m" / "1h" at or above 1 hour.
 */
export function formatTodayFocusTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 3600) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

// -------------------------------------------------------------
// Legacy compatibility stubs
// -------------------------------------------------------------
export function startPhase(state: FocusTimerState, _phase: any, section: string, _now = Date.now()): FocusTimerState {
  return { ...state, status: 'running', isPaused: false, currentSection: section || 'home' };
}
export function skipPhase(state: FocusTimerState, _section: string, _now = Date.now()): FocusTimerState {
  return state;
}
export function stopSession(state: FocusTimerState, _now = Date.now()): { nextState: FocusTimerState; completedSession: FocusSession | null } {
  return { nextState: state, completedSession: null };
}
export function updatePreset(state: FocusTimerState, preset: FocusPreset): FocusTimerState {
  return { ...state, preset };
}
export function tickTimer(state: FocusTimerState, now = Date.now()): FocusTimerState {
  return state.isPaused ? state : { ...state, lastTickTimestamp: now };
}
export function rolloverTimer(state: FocusTimerState, _now = Date.now()): { nextState: FocusTimerState; completedSessions: FocusSession[]; phaseChangesCount: number } {
  return { nextState: state, completedSessions: [], phaseChangesCount: 0 };
}
export function handleVisibilityChange(state: FocusTimerState, _hiddenDurationMs: number, _now = Date.now()): { state: FocusTimerState; autoPaused: boolean; completedSessions: FocusSession[] } {
  return { state, autoPaused: false, completedSessions: [] };
}
export function completePhase(state: FocusTimerState, _now = Date.now()): FocusTimerState {
  return state;
}
