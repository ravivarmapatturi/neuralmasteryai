import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  startPhase,
  pauseTimer,
  resumeTimer,
  handleVisibilityChange,
  tickTimer,
  completePhase,
  skipPhase,
  stopSession,
  restoreStateFromStorage,
  mergeFocusSessions,
  todayFocusSeconds,
  weekFocusSeconds,
  allTimeFocusSeconds,
  completedSessionCount,
  focusStreak,
  sevenDayBarStats,
  twelveWeekHeatmapStats,
  sectionBreakdownStats,
  formatFocusTime,
  formatClockTime,
  extractSection,
  DEFAULT_PRESET,
  PRESET_50_10,
  type FocusSession,
  type FocusTimerState,
} from './focusTimer';

describe('focusTimer pure logic', () => {
  it('extracts section correctly from route path', () => {
    expect(extractSection('')).toBe('home');
    expect(extractSection('/')).toBe('home');
    expect(extractSection('/learn')).toBe('learn');
    expect(extractSection('/labs/dot-product')).toBe('labs');
    expect(extractSection('interview/q/1')).toBe('interview');
  });

  it('starts initial state with default 25/5/15 preset in idle mode', () => {
    const state = createInitialState();
    expect(state.phase).toBe('idle');
    expect(state.status).toBe('idle');
    expect(state.remainingMs).toBe(25 * 60 * 1000);
    expect(state.completedFocusCount).toBe(0);

    const state50 = createInitialState(PRESET_50_10);
    expect(state50.remainingMs).toBe(50 * 60 * 1000);
  });

  it('starts focus phase with correct durations and session ID', () => {
    const t0 = 1000000;
    const initial = createInitialState();
    const started = startPhase(initial, 'focus', 'learn', t0);

    expect(started.phase).toBe('focus');
    expect(started.status).toBe('running');
    expect(started.startedAt).toBe(t0);
    expect(started.endsAt).toBe(t0 + 25 * 60 * 1000);
    expect(started.remainingMs).toBe(25 * 60 * 1000);
    expect(started.currentSessionSection).toBe('learn');
    expect(started.currentSessionId).toBeTruthy();
  });

  it('handles pause and resume without losing focus accumulation', () => {
    const t0 = 1000000;
    let state = startPhase(createInitialState(), 'focus', 'labs', t0);

    // 10 seconds pass
    state = tickTimer(state, t0 + 10000);
    expect(state.accumulatedFocusMs).toBe(10000);
    expect(state.remainingMs).toBe(25 * 60 * 1000 - 10000);

    // Pause timer
    const tPause = t0 + 10000;
    state = pauseTimer(state, 'user', tPause);
    expect(state.status).toBe('paused');
    expect(state.pausedReason).toBe('user');
    expect(state.lastTickTimestamp).toBeNull();
    expect(state.accumulatedFocusMs).toBe(10000);

    // 5 minutes pause (should not count!)
    const tResume = tPause + 300000;
    state = resumeTimer(state, tResume);
    expect(state.status).toBe('running');
    expect(state.pausedReason).toBeNull();
    expect(state.remainingMs).toBe(25 * 60 * 1000 - 10000);
    expect(state.endsAt).toBe(tResume + (25 * 60 * 1000 - 10000));

    // Another 10 seconds pass while running
    state = tickTimer(state, tResume + 10000);
    expect(state.accumulatedFocusMs).toBe(20000);
  });

  it('enforces the 60-second background tab away rule', () => {
    const t0 = 1000000;
    let state = startPhase(createInitialState(), 'focus', 'labs', t0);

    // Tab hidden for 30s: counts towards focus and does not auto-pause
    const resultShort = handleVisibilityChange(state, 30000, t0 + 30000);
    expect(resultShort.autoPaused).toBe(false);
    expect(resultShort.state.status).toBe('running');

    // Tab hidden for 90s (> 60s): credits only 60s, then auto-pauses
    state = startPhase(createInitialState(), 'focus', 'labs', t0);
    const resultLong = handleVisibilityChange(state, 90000, t0 + 90000);
    expect(resultLong.autoPaused).toBe(true);
    expect(resultLong.state.status).toBe('paused');
    expect(resultLong.state.pausedReason).toBe('away');
    expect(resultLong.state.accumulatedFocusMs).toBe(60000);
    expect(resultLong.state.remainingMs).toBe(25 * 60 * 1000 - 60000);
  });

  it('triggers long break after 4 focus sessions', () => {
    const t0 = 1000000;
    let state = startPhase(createInitialState(), 'focus', 'learn', t0);

    // Finish session 1 -> short break
    state = completePhase({ ...state, remainingMs: 0 }, t0 + 25 * 60 * 1000);
    expect(state.completedFocusCount).toBe(1);
    expect(state.status).toBe('phaseEnded');

    // Start & finish break 1
    state = startPhase(state, 'shortBreak', 'learn', t0 + 25 * 60 * 1000);
    state = completePhase({ ...state, remainingMs: 0 });

    // Session 2
    state = startPhase(state, 'focus', 'learn');
    state = completePhase({ ...state, remainingMs: 0 });
    expect(state.completedFocusCount).toBe(2);

    // Break 2
    state = startPhase(state, 'shortBreak', 'learn');
    state = completePhase({ ...state, remainingMs: 0 });

    // Session 3
    state = startPhase(state, 'focus', 'learn');
    state = completePhase({ ...state, remainingMs: 0 });
    expect(state.completedFocusCount).toBe(3);

    // Break 3
    state = startPhase(state, 'shortBreak', 'learn');
    state = completePhase({ ...state, remainingMs: 0 });

    // Session 4
    state = startPhase(state, 'focus', 'learn');
    // When autoStartNext is true, check transition directly to longBreak
    state.autoStartNext = true;
    state = completePhase({ ...state, remainingMs: 0 }, t0 + 100000);
    expect(state.phase).toBe('longBreak');
    expect(state.status).toBe('running');
    expect(state.remainingMs).toBe(15 * 60 * 1000);
    expect(state.completedFocusCount).toBe(0); // Cycle reset
  });

  it('skips phase correctly', () => {
    const t0 = 1000000;
    let state = startPhase(createInitialState(), 'focus', 'learn', t0);
    state = skipPhase(state, 'learn', t0 + 5000);
    expect(state.phase).toBe('shortBreak');
    expect(state.status).toBe('running');
    expect(state.completedFocusCount).toBe(1);

    // Skipping break starts focus
    state = skipPhase(state, 'learn', t0 + 10000);
    expect(state.phase).toBe('focus');
    expect(state.status).toBe('running');
  });

  it('resumes correctly after page reload from localStorage state', () => {
    const t0 = 1000000;
    const runningState: Partial<FocusTimerState> = {
      preset: DEFAULT_PRESET,
      phase: 'focus',
      status: 'running',
      startedAt: t0,
      endsAt: t0 + 25 * 60 * 1000,
      targetDurationMs: 25 * 60 * 1000,
      accumulatedFocusMs: 30000,
      completedFocusCount: 1,
    };

    // Reload 5 minutes into the session
    const reloadTime = t0 + 5 * 60 * 1000;
    const restored = restoreStateFromStorage(runningState, reloadTime);

    expect(restored.status).toBe('running');
    expect(restored.phase).toBe('focus');
    expect(restored.remainingMs).toBe(20 * 60 * 1000);
    expect(restored.completedFocusCount).toBe(1);

    // Reload after session has already finished while away
    const lateReloadTime = t0 + 30 * 60 * 1000;
    const finishedRestored = restoreStateFromStorage(runningState, lateReloadTime);
    expect(finishedRestored.status).toBe('phaseEnded');
    expect(finishedRestored.completedFocusCount).toBe(2);
  });

  it('stops session and saves record if focused >= 60 seconds', () => {
    const t0 = 1000000;
    let state = startPhase(createInitialState(), 'focus', 'interview', t0);

    // Less than 60s focus: not saved
    const stoppedEarly = stopSession(state, t0 + 30000);
    expect(stoppedEarly.completedSession).toBeNull();
    expect(stoppedEarly.nextState.status).toBe('idle');

    // 3 minutes focus: saved with session details
    state = startPhase(createInitialState(), 'focus', 'interview', t0);
    const stoppedValid = stopSession(state, t0 + 180000);
    expect(stoppedValid.completedSession).not.toBeNull();
    expect(stoppedValid.completedSession?.focusedSeconds).toBe(180);
    expect(stoppedValid.completedSession?.plannedMinutes).toBe(25);
    expect(stoppedValid.completedSession?.section).toBe('interview');
    expect(stoppedValid.completedSession?.completed).toBe(false);
  });
});

describe('focus stats and merge logic', () => {
  const baseDate = new Date('2026-11-09T10:00:00Z');
  const baseMs = baseDate.getTime();

  const sessions: FocusSession[] = [
    {
      id: 'sess-1',
      startedAt: new Date(baseMs - 7200000).toISOString(),
      endedAt: new Date(baseMs - 5700000).toISOString(),
      plannedMinutes: 25,
      focusedSeconds: 1500, // 25 min
      completed: true,
      section: 'learn',
    },
    {
      id: 'sess-2',
      startedAt: new Date(baseMs - 3600000).toISOString(),
      endedAt: new Date(baseMs - 2400000).toISOString(),
      plannedMinutes: 25,
      focusedSeconds: 1200, // 20 min
      completed: false,
      section: 'labs',
    },
  ];

  it('computes today and all-time focus seconds and completed count', () => {
    expect(todayFocusSeconds(sessions, baseMs)).toBe(2700); // 45m
    expect(weekFocusSeconds(sessions, baseMs)).toBe(2700);
    expect(allTimeFocusSeconds(sessions)).toBe(2700);
    expect(completedSessionCount(sessions)).toBe(1);
    expect(formatFocusTime(2700)).toBe('45m');
    expect(formatFocusTime(3600 + 1500)).toBe('1h 25m');
    expect(formatClockTime(65000)).toBe('01:05');
  });

  it('merges sessions by ID without duplicates', () => {
    const local: FocusSession[] = [
      {
        id: 'sess-1',
        startedAt: sessions[0].startedAt,
        endedAt: sessions[0].endedAt,
        plannedMinutes: 25,
        focusedSeconds: 1500,
        completed: true,
        section: 'learn',
      },
      {
        id: 'sess-local-new',
        startedAt: new Date(baseMs).toISOString(),
        endedAt: new Date(baseMs + 1500000).toISOString(),
        plannedMinutes: 25,
        focusedSeconds: 1500,
        completed: true,
        section: 'interview',
      },
    ];

    const merged = mergeFocusSessions(sessions, local);
    expect(merged.length).toBe(3);
    expect(merged.map((s) => s.id)).toContain('sess-1');
    expect(merged.map((s) => s.id)).toContain('sess-2');
    expect(merged.map((s) => s.id)).toContain('sess-local-new');
  });

  it('computes streak correctly with day boundaries', () => {
    const today = new Date(baseMs);
    const yesterday = new Date(baseMs);
    yesterday.setDate(yesterday.getDate() - 1);

    const twoDaysAgo = new Date(baseMs);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const streakSessions: FocusSession[] = [
      {
        id: 's-1',
        startedAt: twoDaysAgo.toISOString(),
        endedAt: twoDaysAgo.toISOString(),
        plannedMinutes: 25,
        focusedSeconds: 1500,
        completed: true,
        section: 'learn',
      },
      {
        id: 's-2',
        startedAt: yesterday.toISOString(),
        endedAt: yesterday.toISOString(),
        plannedMinutes: 25,
        focusedSeconds: 1500,
        completed: true,
        section: 'labs',
      },
      {
        id: 's-3',
        startedAt: today.toISOString(),
        endedAt: today.toISOString(),
        plannedMinutes: 25,
        focusedSeconds: 1500,
        completed: true,
        section: 'interview',
      },
    ];

    expect(focusStreak(streakSessions, baseMs)).toBe(3);

    // If no session today, but session yesterday, streak is still alive
    const withoutToday = streakSessions.slice(0, 2);
    expect(focusStreak(withoutToday, baseMs)).toBe(2);

    // If gap between yesterday and today (e.g. only 2 days ago), streak is 0
    const brokenStreak = [streakSessions[0]];
    expect(focusStreak(brokenStreak, baseMs)).toBe(0);
  });

  it('computes 7-day bar chart and 12-week heatmap stats', () => {
    const bars = sevenDayBarStats(sessions, baseMs);
    expect(bars.length).toBe(7);
    expect(bars[6].focusMinutes).toBe(45); // today's 45m

    const heatmap = twelveWeekHeatmapStats(sessions, baseMs);
    expect(heatmap.length).toBe(84); // 12 * 7
  });

  it('computes section breakdown stats', () => {
    const breakdown = sectionBreakdownStats(sessions);
    expect(breakdown.length).toBe(2);
    expect(breakdown[0].section).toBe('learn');
    expect(breakdown[0].percentage).toBe(56); // 1500 / 2700 ~ 55.5% -> 56%
    expect(breakdown[1].section).toBe('labs');
    expect(breakdown[1].percentage).toBe(44); // 1200 / 2700 ~ 44.4% -> 44%
  });

  it('splits session crossing midnight proportionally across local day boundaries', () => {
    // Session starting 15 minutes before local midnight and ending 10 minutes after midnight
    // Rule chosen: Proportional splitting at local 00:00 boundary.
    // 15 min before midnight (900s) belongs to Day 1.
    // 10 min after midnight (600s) belongs to Day 2.
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const start = new Date(midnight.getTime() - 15 * 60 * 1000); // 23:45
    const end = new Date(midnight.getTime() + 10 * 60 * 1000);   // 00:10

    const crossMidnightSession: FocusSession = {
      id: 'midnight-sess-1',
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      plannedMinutes: 25,
      focusedSeconds: 1500, // 25 minutes
      completed: true,
      section: 'learn',
    };

    // When evaluated at end (Day 2, after midnight):
    const todayAtEnd = todayFocusSeconds([crossMidnightSession], end.getTime());
    expect(todayAtEnd).toBe(600); // exactly 10 minutes for Day 2

    // When evaluated at start (Day 1, before midnight):
    const todayAtStart = todayFocusSeconds([crossMidnightSession], start.getTime());
    expect(todayAtStart).toBe(900); // exactly 15 minutes for Day 1

    // Bar chart should distribute 15m to Day 1 and 10m to Day 2
    const bars = sevenDayBarStats([crossMidnightSession], end.getTime());
    const day2Bar = bars[6]; // today (Day 2)
    const day1Bar = bars[5]; // yesterday (Day 1)
    expect(day2Bar.focusMinutes).toBe(10);
    expect(day1Bar.focusMinutes).toBe(15);
  });

  it('caps focused time to endsAt when stopping or restoring after endsAt has passed', () => {
    const t0 = 1000000;
    const initial = createInitialState();
    const running = startPhase(initial, 'focus', 'learn', t0);
    const endsAt = running.endsAt!;
    expect(endsAt).toBe(t0 + 25 * 60 * 1000);

    // Stop 30 minutes after endsAt (55 minutes after start)
    const lateNow = endsAt + 30 * 60 * 1000;
    const { completedSession } = stopSession(running, lateNow);

    expect(completedSession).not.toBeNull();
    // Must be capped at planned 25 minutes (1500s), NOT 55 minutes
    expect(completedSession?.focusedSeconds).toBe(1500);
    expect(completedSession?.endedAt).toBe(new Date(endsAt).toISOString());
    expect(completedSession?.completed).toBe(true);

    // Test restoreStateFromStorage after endsAt has passed
    const restored = restoreStateFromStorage(running, lateNow);
    expect(restored.status).toBe('phaseEnded');
    expect(restored.accumulatedFocusMs).toBe(25 * 60 * 1000);
    expect(restored.remainingMs).toBe(0);
  });
});
