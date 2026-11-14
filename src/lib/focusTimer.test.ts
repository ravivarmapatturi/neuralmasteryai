import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  pauseTimer,
  resumeTimer,
  restoreStateFromStorage,
  shouldCountScreenTime,
  recordScreenTimeTick,
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
  formatTodayFocusTime,
  extractSection,
  localDateString,
  splitSessionByLocalDay,
  type FocusSession,
} from './focusTimer';

describe('screenTime / focusTimer pure logic', () => {
  it('extracts section correctly from route path', () => {
    expect(extractSection('')).toBe('home');
    expect(extractSection('/')).toBe('home');
    expect(extractSection('/learn')).toBe('learn');
    expect(extractSection('/labs/dot-product')).toBe('labs');
    expect(extractSection('interview/q/1')).toBe('interview');
  });

  describe('counting conditions: visible, focused, pause/resume', () => {
    it('counts only while visible and focused', () => {
      expect(shouldCountScreenTime({ isVisible: true, isFocused: true, isPaused: false })).toBe(true);

      // Hidden tab: false
      expect(shouldCountScreenTime({ isVisible: false, isFocused: true, isPaused: false })).toBe(false);

      // Blurred window: false
      expect(shouldCountScreenTime({ isVisible: true, isFocused: false, isPaused: false })).toBe(false);

      // Both hidden and blurred: false
      expect(shouldCountScreenTime({ isVisible: false, isFocused: false, isPaused: false })).toBe(false);
    });

    it('stops on hidden or blur', () => {
      // Hidden stops
      expect(shouldCountScreenTime({ isVisible: false, isFocused: true, isPaused: false })).toBe(false);

      // Blur stops
      expect(shouldCountScreenTime({ isVisible: true, isFocused: false, isPaused: false })).toBe(false);
    });

    it('stops counting when manually paused and resumes when resumed', () => {
      // Paused stops counting even when visible and focused
      expect(shouldCountScreenTime({ isVisible: true, isFocused: true, isPaused: true })).toBe(false);

      const initial = createInitialState();
      expect(initial.isPaused).toBe(false);
      expect(initial.status).toBe('running');

      const paused = pauseTimer(initial);
      expect(paused.isPaused).toBe(true);
      expect(paused.status).toBe('paused');
      expect(paused.lastTickTimestamp).toBeNull();
      expect(shouldCountScreenTime({ isVisible: true, isFocused: true, isPaused: paused.isPaused })).toBe(false);

      const resumed = resumeTimer(paused);
      expect(resumed.isPaused).toBe(false);
      expect(resumed.status).toBe('running');
      expect(shouldCountScreenTime({ isVisible: true, isFocused: true, isPaused: resumed.isPaused })).toBe(true);
    });
  });

  describe('no catch-up after a gap (closing tab or sleeping laptop)', () => {
    it('never adds elapsed time for gaps when sleeping or closed', () => {
      const t0 = 1000000;
      let sessions: FocusSession[] = [];

      // First tick on learn
      const tick1 = recordScreenTimeTick(sessions, 'learn', t0, null);
      sessions = tick1.sessions;
      expect(sessions.length).toBe(1);
      expect(sessions[0].focusedSeconds).toBe(1);

      // 1 second later: normal tick
      const tick2 = recordScreenTimeTick(sessions, 'learn', t0 + 1000, tick1.newLastTickTimestamp);
      sessions = tick2.sessions;
      expect(sessions[0].focusedSeconds).toBe(2);

      // Laptop closed or user away for 2 hours (7,200,000 ms gap)
      const tAfter2Hours = t0 + 1000 + 7200000;
      const tickAfterGap = recordScreenTimeTick(
        sessions,
        'learn',
        tAfter2Hours,
        tick2.newLastTickTimestamp,
      );
      sessions = tickAfterGap.sessions;

      // Crucial: The 2 hours were NOT added! Only 1 second was recorded for the resume tick.
      const totalSeconds = allTimeFocusSeconds(sessions);
      expect(totalSeconds).toBe(3); // 2 + 1 = 3 seconds, not 7202 seconds!
    });
  });

  describe('two tabs do not double count', () => {
    it('prevents double counting across two open tabs using the timestamp lock', () => {
      const t0 = 2000000;
      let sessions: FocusSession[] = [];
      let lockTimestamp = 0;

      // Tab A ticks at t0
      const tabA = recordScreenTimeTick(sessions, 'learn', t0, null, {
        lockTimestamp,
        lockThresholdMs: 900,
      });
      expect(tabA.ticked).toBe(true);
      sessions = tabA.sessions;
      lockTimestamp = tabA.newLockTimestamp;
      expect(sessions[0].focusedSeconds).toBe(1);

      // Tab B tries to tick 200ms later at t0 + 200ms
      const tabB = recordScreenTimeTick(sessions, 'learn', t0 + 200, null, {
        lockTimestamp,
        lockThresholdMs: 900,
      });
      // Tab B is blocked because Tab A already counted this second!
      expect(tabB.ticked).toBe(false);
      expect(tabB.sessions[0].focusedSeconds).toBe(1); // Not incremented

      // Another 1000ms later, Tab B ticks
      const tabBNext = recordScreenTimeTick(sessions, 'learn', t0 + 1000, null, {
        lockTimestamp,
        lockThresholdMs: 900,
      });
      expect(tabBNext.ticked).toBe(true);
      sessions = tabBNext.sessions;
      expect(sessions[0].focusedSeconds).toBe(2);
    });
  });

  describe('midnight rollover', () => {
    it('splits time crossing midnight into two days for navbar and stats', () => {
      // 30 seconds before midnight to 30 seconds after midnight local time
      const beforeMidnight = new Date('2026-11-14T23:59:30.000');
      const afterMidnight = new Date('2026-11-15T00:00:30.000');

      const crossingSession: FocusSession = {
        id: 'cross-1',
        startedAt: beforeMidnight.toISOString(),
        endedAt: afterMidnight.toISOString(),
        focusedSeconds: 60,
        completed: true,
        section: 'learn',
      };

      const splits = splitSessionByLocalDay(crossingSession);
      expect(splits.length).toBe(2);
      expect(splits[0].date).toBe('2026-11-14');
      expect(splits[0].seconds).toBe(30);
      expect(splits[1].date).toBe('2026-11-15');
      expect(splits[1].seconds).toBe(30);

      // Today's focus time on Nov 15 evaluates only the time after midnight
      const nowNov15 = afterMidnight.getTime();
      expect(todayFocusSeconds([crossingSession], nowNov15)).toBe(30);

      // On Nov 14, it evaluated only the time before midnight
      const nowNov14 = beforeMidnight.getTime();
      expect(todayFocusSeconds([crossingSession], nowNov14)).toBe(30);
    });

    it('starts a new session when ticking past midnight so today focus resets to 0', () => {
      // Local time: 23:59:59 on Nov 14
      const t1 = new Date('2026-11-14T23:59:59.000').getTime();
      const tick1 = recordScreenTimeTick([], 'learn', t1, null);
      expect(todayFocusSeconds(tick1.sessions, t1)).toBe(1);

      // Next tick at 00:00:00 on Nov 15 (midnight rollover)
      const t2 = new Date('2026-11-15T00:00:00.000').getTime();
      const tick2 = recordScreenTimeTick(tick1.sessions, 'learn', t2, tick1.newLastTickTimestamp);

      // Previous session remained on 2026-11-14, new session is on 2026-11-15
      expect(todayFocusSeconds(tick2.sessions, t2)).toBe(1);
      // Yesterday's session on 2026-11-14 still holds 1 second
      expect(todayFocusSeconds(tick2.sessions, t1)).toBe(1);
    });
  });

  describe('data migration from old Pomodoro state', () => {
    it('loads old Pomodoro timer state without error and drops Pomodoro properties', () => {
      const oldState = {
        phase: 'focus',
        preset: { id: '25-5', focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 },
        autoStartNext: true,
        endsAt: 1731500000000,
        remainingMs: 1200000,
        targetDurationMs: 1500000,
        completedFocusCount: 2,
        currentSessionId: 'old-sess',
        currentSessionSection: 'learn',
        status: 'running',
        todaySeconds: 150,
      };

      const restored = restoreStateFromStorage(oldState);
      expect(restored.status).toBe('running');
      expect(restored.isPaused).toBe(false);
      expect(restored.todaySeconds).toBe(150);
      expect(restored.currentSection).toBe('learn');

      // Pomodoro properties dropped:
      expect((restored as any).phase).toBeUndefined();
      expect((restored as any).preset).toBeUndefined();
      expect((restored as any).endsAt).toBeUndefined();
      expect((restored as any).remainingMs).toBeUndefined();
      expect((restored as any).targetDurationMs).toBeUndefined();
      expect((restored as any).autoStartNext).toBeUndefined();
    });

    it('preserves user pause across migration and reload', () => {
      const pausedOldState = {
        status: 'paused',
        pausedReason: 'user',
        phase: 'focus',
        endsAt: 1731500000000,
      };

      const restored = restoreStateFromStorage(pausedOldState);
      expect(restored.isPaused).toBe(true);
      expect(restored.status).toBe('paused');
    });

    it('past focus sessions in localStorage are preserved and display in stats', () => {
      const historicalSessions: FocusSession[] = [
        {
          id: 's1',
          startedAt: '2026-11-13T10:00:00.000Z',
          endedAt: '2026-11-13T10:25:00.000Z',
          focusedSeconds: 1500, // 25 min
          completed: true,
          section: 'learn',
        },
        {
          id: 's2',
          startedAt: '2026-11-14T11:00:00.000Z',
          endedAt: '2026-11-14T11:20:00.000Z',
          focusedSeconds: 1200, // 20 min
          completed: true,
          section: 'labs',
        },
      ];

      expect(allTimeFocusSeconds(historicalSessions)).toBe(2700);
      expect(completedSessionCount(historicalSessions)).toBe(2);
      expect(sectionBreakdownStats(historicalSessions).length).toBe(2);
    });
  });

  describe('formatters', () => {
    it('formatTodayFocusTime formats mm:ss under 1 hour and Xh Ym at or above 1 hour', () => {
      expect(formatTodayFocusTime(0)).toBe('00:00');
      expect(formatTodayFocusTime(5)).toBe('00:05');
      expect(formatTodayFocusTime(72)).toBe('01:12');
      expect(formatTodayFocusTime(3599)).toBe('59:59');
      expect(formatTodayFocusTime(3600)).toBe('1h');
      expect(formatTodayFocusTime(4320)).toBe('1h 12m');
    });

    it('formatFocusTime formats into human readable time', () => {
      expect(formatFocusTime(0)).toBe('0m');
      expect(formatFocusTime(1500)).toBe('25m');
      expect(formatFocusTime(3600)).toBe('1h');
      expect(formatFocusTime(4320)).toBe('1h 12m');
    });

    it('formatClockTime formats ms into MM:SS', () => {
      expect(formatClockTime(0)).toBe('00:00');
      expect(formatClockTime(65000)).toBe('01:05');
      expect(formatClockTime(1500000)).toBe('25:00');
    });
  });

  describe('statistics calculations', () => {
    const fixedSessions: FocusSession[] = [
      {
        id: 'day-1',
        startedAt: '2026-11-09T10:00:00.000Z',
        endedAt: '2026-11-09T10:30:00.000Z',
        focusedSeconds: 1800,
        completed: true,
        section: 'learn',
      },
      {
        id: 'day-2',
        startedAt: '2026-11-10T14:00:00.000Z',
        endedAt: '2026-11-10T14:45:00.000Z',
        focusedSeconds: 2700,
        completed: true,
        section: 'labs',
      },
      {
        id: 'day-3',
        startedAt: '2026-11-11T09:00:00.000Z',
        endedAt: '2026-11-11T09:20:00.000Z',
        focusedSeconds: 1200,
        completed: true,
        section: 'interview',
      },
    ];

    it('computes 7-day bar chart stats and 12-week heatmap stats', () => {
      const nov11 = new Date('2026-11-11T12:00:00.000Z').getTime();
      expect(localDateString(new Date(nov11))).toBe('2026-11-11');
      expect(weekFocusSeconds(fixedSessions, nov11)).toBe(5700);

      const bars = sevenDayBarStats(fixedSessions, nov11);
      expect(bars.length).toBe(7);

      const heatmap = twelveWeekHeatmapStats(fixedSessions, nov11);
      expect(heatmap.length).toBe(84);
    });

    it('computes section breakdown statistics', () => {
      const breakdown = sectionBreakdownStats(fixedSessions);
      expect(breakdown.length).toBe(3);
      expect(breakdown[0].section).toBe('labs'); // 2700s is highest
      expect(breakdown[1].section).toBe('learn'); // 1800s
      expect(breakdown[2].section).toBe('interview'); // 1200s
    });

    it('computes streak', () => {
      const streak = focusStreak(fixedSessions, new Date('2026-11-11T12:00:00.000Z').getTime());
      expect(streak).toBe(3);
    });

    it('merges remote and local focus sessions', () => {
      const remote = [fixedSessions[0]];
      const local = [fixedSessions[0], fixedSessions[1]];
      const merged = mergeFocusSessions(remote, local);
      expect(merged.length).toBe(2);
    });
  });
});
