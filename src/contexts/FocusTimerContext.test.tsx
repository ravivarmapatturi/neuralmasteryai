import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';
import { FocusMusicProvider } from './FocusMusicContext';
import { FocusTimerProvider, useFocusTimer, useFocusCountdown } from './FocusTimerContext';
import { AuthProvider } from './AuthContext';
import type { FocusSession } from '../lib/focusTimer';

function TestTimerWidget() {
  const timer = useFocusTimer();
  const countdown = useFocusCountdown();

  return (
    <div>
      <span data-testid="phase">{timer.phase}</span>
      <span data-testid="status">{timer.status}</span>
      <span data-testid="countdown">{countdown.formatted}</span>
      <span data-testid="reason">{timer.pausedReason || 'none'}</span>
      <span data-testid="sessions-count">{timer.sessions.length}</span>

      <button onClick={() => timer.startFocus('learn')}>Start Focus</button>
      <button onClick={timer.pause}>Pause</button>
      <button onClick={timer.resume}>Resume</button>
      <button onClick={timer.stop}>Stop</button>
      <button onClick={timer.skip}>Skip</button>
      <button
        onClick={() =>
          timer.recordSession({
            id: 'device-a-session',
            startedAt: new Date(Date.now() - 1500000).toISOString(),
            endedAt: new Date().toISOString(),
            plannedMinutes: 25,
            focusedSeconds: 1500,
            completed: true,
            section: 'learn',
          })
        }
      >
        Record Device A
      </button>
      <button
        onClick={() =>
          timer.recordSession({
            id: 'session-retry-1',
            startedAt: new Date(Date.now() - 3000000).toISOString(),
            endedAt: new Date(Date.now() - 1500000).toISOString(),
            plannedMinutes: 25,
            focusedSeconds: 1500,
            completed: true,
            section: 'learn',
          })
        }
      >
        Record Retry 1
      </button>
      <button
        onClick={() =>
          timer.recordSession({
            id: 'session-retry-2',
            startedAt: new Date(Date.now() - 1500000).toISOString(),
            endedAt: new Date().toISOString(),
            plannedMinutes: 25,
            focusedSeconds: 1500,
            completed: true,
            section: 'learn',
          })
        }
      >
        Record Retry 2
      </button>
    </div>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FocusMusicProvider>
        <FocusTimerProvider>{children}</FocusTimerProvider>
      </FocusMusicProvider>
    </AuthProvider>
  );
}

describe('FocusTimerContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    vi.stubGlobal('Audio', class extends EventTarget {
      paused = true;
      src = '';
      preload = '';
      loop = false;
      volume = 0;
      load = vi.fn();
      play = vi.fn(async () => {
        this.paused = false;
        this.dispatchEvent(new Event('play'));
      });
      pause = vi.fn(() => {
        this.paused = true;
        this.dispatchEvent(new Event('pause'));
      });
      constructor() {
        super();
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts focus on its own when the site opens', async () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    expect(screen.getByTestId('phase').textContent).toBe('focus');
    expect(screen.getByTestId('status').textContent).toBe('running');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('countdown').textContent).toBe('24:55');
  });

  it('pauses and resumes timer', async () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    fireEvent.click(screen.getByText('Start Focus'));
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    fireEvent.click(screen.getByText('Pause'));
    expect(screen.getByTestId('status').textContent).toBe('paused');

    // Time does not tick while paused
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId('countdown').textContent).toBe('24:50');

    // Resume
    fireEvent.click(screen.getByText('Resume'));
    expect(screen.getByTestId('status').textContent).toBe('running');

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('countdown').textContent).toBe('24:45');
  });

  it('auto-advances: focus ends then break is running with no action', async () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    expect(screen.getByTestId('phase').textContent).toBe('focus');
    expect(screen.getByTestId('status').textContent).toBe('running');

    // Advance 25 minutes (the entire focus session)
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });

    // Automatically transitions to shortBreak and stays running with no clicks
    expect(screen.getByTestId('phase').textContent).toBe('shortBreak');
    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('countdown').textContent).toBe('05:00');
    expect(screen.getByTestId('sessions-count').textContent).toBe('1');
  });

  it('auto-advances: break ends then next focus is running with no action', async () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    // Advance 25 minutes to complete focus
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });
    expect(screen.getByTestId('phase').textContent).toBe('shortBreak');
    expect(screen.getByTestId('status').textContent).toBe('running');

    // Advance 5 minutes to complete short break
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    // Automatically transitions back to focus and stays running
    expect(screen.getByTestId('phase').textContent).toBe('focus');
    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('countdown').textContent).toBe('25:00');
  });

  it('user pause holds across a phase boundary and stop resets', async () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    expect(screen.getByTestId('phase').textContent).toBe('focus');
    expect(screen.getByTestId('status').textContent).toBe('running');

    // Advance 20 minutes (5m left)
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });
    expect(screen.getByTestId('countdown').textContent).toBe('05:00');

    // User explicitly pauses
    fireEvent.click(screen.getByText('Pause'));
    expect(screen.getByTestId('status').textContent).toBe('paused');
    expect(screen.getByTestId('reason').textContent).toBe('user');

    // Advance 10 minutes past what would have been the phase boundary (endsAt)
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });

    // Phase boundary must NOT have advanced while paused!
    expect(screen.getByTestId('phase').textContent).toBe('focus');
    expect(screen.getByTestId('status').textContent).toBe('paused');
    expect(screen.getByTestId('countdown').textContent).toBe('05:00');

    // Resuming continues the remaining 5 minutes of the focus phase
    fireEvent.click(screen.getByText('Resume'));
    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('countdown').textContent).toBe('05:00');

    // Stop resets to idle
    fireEvent.click(screen.getByText('Stop'));
    expect(screen.getByTestId('phase').textContent).toBe('idle');
    expect(screen.getByTestId('status').textContent).toBe('idle');
  });

  it('a long background gap covering several phases lands in the right phase with the right session count', async () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    expect(screen.getByTestId('phase').textContent).toBe('focus');
    expect(screen.getByTestId('status').textContent).toBe('running');

    // Tab goes into background
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    // Does NOT pause when hidden!
    expect(screen.getByTestId('status').textContent).toBe('running');

    // Simulate 65 minutes passing in background:
    // Focus 1 (25m) -> Break 1 (5m) -> Focus 2 (25m) -> Break 2 (5m) -> 5m into Focus 3 (20m remaining)
    act(() => {
      vi.advanceTimersByTime(65 * 60 * 1000);
    });

    // Tab returns to foreground
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange'));

    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('phase').textContent).toBe('focus');
    expect(screen.getByTestId('countdown').textContent).toBe('20:00');

    // Exactly 2 focus sessions completed and recorded!
    expect(screen.getByTestId('sessions-count').textContent).toBe('2');

    const stored = JSON.parse(localStorage.getItem('nm_focus_sessions') || '[]');
    expect(stored.length).toBe(2);
    expect(stored[0].focusedSeconds).toBe(1500);
    expect(stored[0].completed).toBe(true);
    expect(stored[1].focusedSeconds).toBe(1500);
    expect(stored[1].completed).toBe(true);
  });

  it('saves session on stop if focused >= 60 seconds', async () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    fireEvent.click(screen.getByText('Start Focus'));

    // Advance 65 seconds
    act(() => {
      vi.advanceTimersByTime(65000);
    });

    fireEvent.click(screen.getByText('Stop'));
    expect(screen.getByTestId('status').textContent).toBe('idle');
    expect(screen.getByTestId('sessions-count').textContent).toBe('1');

    // Verify localStorage has the session
    const stored = JSON.parse(localStorage.getItem('nm_focus_sessions') || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].section).toBe('learn');
    expect(stored[0].focusedSeconds).toBeGreaterThanOrEqual(60);
  });

  it('handles reload after endsAt has passed: saves session exactly once with time up to endsAt only', async () => {
    // Simulate user had started a 25m session 27 minutes ago (2 minutes into break), then reloaded the tab
    const now = Date.now();
    const startedAt = now - 27 * 60 * 1000;
    const endsAt = startedAt + 25 * 60 * 1000; // passed 2 minutes ago

    localStorage.setItem(
      'nm_focus_timer_state',
      JSON.stringify({
        phase: 'focus',
        status: 'running',
        preset: { id: '25-5', focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 },
        completedFocusCount: 0,
        startedAt,
        endsAt,
        remainingMs: 0,
        targetDurationMs: 25 * 60 * 1000,
        autoStartNext: false,
        notificationsEnabled: false,
        currentSessionId: 'reload-test-session',
        currentSessionSection: 'learn',
        accumulatedFocusMs: 0,
        lastTickTimestamp: startedAt,
        pausedReason: null,
      }),
    );

    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    // Initial render should restore state into continuous running (break phase) and save the session
    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('phase').textContent).toBe('shortBreak');
    expect(screen.getByTestId('sessions-count').textContent).toBe('1');

    const stored = JSON.parse(localStorage.getItem('nm_focus_sessions') || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe('reload-test-session');
    // Focused time must be 25 minutes (1500s), NOT 30 minutes
    expect(stored[0].focusedSeconds).toBe(1500);
    expect(stored[0].endedAt).toBe(new Date(endsAt).toISOString());
    expect(stored[0].completed).toBe(true);

    // Re-rendering or advancing timers must NOT save a duplicate session
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('sessions-count').textContent).toBe('1');
    const storedAfter = JSON.parse(localStorage.getItem('nm_focus_sessions') || '[]');
    expect(storedAfter.length).toBe(1);
  });

  it('cross-device sync: two devices each save a session and both survive', async () => {
    vi.useRealTimers();
    const fakeUser = { uid: 'user-dual-device', getIdToken: vi.fn().mockResolvedValue('token') } as unknown as User;
    vi.mocked(onAuthStateChanged).mockImplementation((_auth: unknown, cb: (u: User) => void) => {
      cb(fakeUser);
      return () => {};
    });

    const firestoreData: Record<string, unknown> = {
      focusSessions: [
        {
          id: 'device-b-session',
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          endedAt: new Date(Date.now() - 2100000).toISOString(),
          plannedMinutes: 25,
          focusedSeconds: 1500,
          completed: true,
          section: 'interview',
        },
      ],
    };

    vi.mocked(getDoc).mockImplementation(async () => {
      return {
        exists: () => true,
        data: () => firestoreData,
      } as never;
    });

    vi.mocked(setDoc).mockImplementation(async (_ref: unknown, data: Record<string, unknown>) => {
      if (data.focusSessions) {
        firestoreData.focusSessions = data.focusSessions;
      }
    });

    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    // Initial sign-in sync loads Device B session
    await waitFor(() => {
      expect(screen.getByTestId('sessions-count').textContent).toBe('1');
    });

    // Device A saves a session
    fireEvent.click(screen.getByText('Record Device A'));

    // Both Device A and Device B sessions must survive
    await waitFor(() => {
      expect(screen.getByTestId('sessions-count').textContent).toBe('2');
    });

    const sessionsInFirestore = firestoreData.focusSessions as FocusSession[];
    expect(sessionsInFirestore.length).toBe(2);
    expect(sessionsInFirestore.map((s) => s.id)).toContain('device-b-session');
    expect(sessionsInFirestore.map((s) => s.id)).toContain('device-a-session');
  });

  it('retries failed saves on next save rather than dropping them', async () => {
    vi.useRealTimers();
    const fakeUser = { uid: 'user-retry-test', getIdToken: vi.fn().mockResolvedValue('token') } as unknown as User;
    vi.mocked(onAuthStateChanged).mockImplementation((_auth: unknown, cb: (u: User) => void) => {
      cb(fakeUser);
      return () => {};
    });

    const firestoreData: Record<string, unknown> = { focusSessions: [] };
    let shouldFail = true;

    vi.mocked(getDoc).mockImplementation(async () => ({
      exists: () => true,
      data: () => firestoreData,
    }) as never);

    vi.mocked(setDoc).mockImplementation(async (_ref: unknown, data: Record<string, unknown>) => {
      if (shouldFail) {
        throw new Error('Network error writing to Firestore');
      }
      firestoreData.focusSessions = data.focusSessions;
    });

    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    // Save session 1 while offline/failing
    fireEvent.click(screen.getByText('Record Retry 1'));

    // Session 1 is queued in pending sync
    await waitFor(() => {
      const pending = JSON.parse(localStorage.getItem('nm_focus_pending_sync') || '[]');
      expect(pending.length).toBe(1);
    });

    // Network recovers
    shouldFail = false;

    // Save session 2
    fireEvent.click(screen.getByText('Record Retry 2'));

    // Both session 1 and session 2 should be in Firestore, and pending sync cleared
    await waitFor(() => {
      const saved = firestoreData.focusSessions as FocusSession[];
      expect(saved.length).toBe(2);
      expect(JSON.parse(localStorage.getItem('nm_focus_pending_sync') || '[]').length).toBe(0);
    });
  });

  it('starts focus session automatically even if tab is hidden on initial mount', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('phase').textContent).toBe('focus');
  });

  it('migrates a saved state with autoStartNext: false to running continuously', async () => {
    localStorage.setItem(
      'nm_focus_timer_state',
      JSON.stringify({
        phase: 'shortBreak',
        status: 'phaseEnded',
        preset: { id: '25-5', focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 },
        completedFocusCount: 1,
        startedAt: Date.now() - 30 * 60 * 1000,
        endsAt: Date.now() - 5 * 60 * 1000,
        remainingMs: 0,
        targetDurationMs: 5 * 60 * 1000,
        autoStartNext: false,
        notificationsEnabled: false,
        currentSessionId: null,
        currentSessionSection: 'home',
        accumulatedFocusMs: 0,
        lastTickTimestamp: null,
        pausedReason: null,
      }),
    );

    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    // Should migrate from phaseEnded into running continuous focus phase
    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('phase').textContent).toBe('focus');
  });
});
