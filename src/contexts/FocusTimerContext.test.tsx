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
      <span data-testid="status">{timer.status}</span>
      <span data-testid="is-paused">{String(timer.isPaused)}</span>
      <span data-testid="today-formatted">{timer.formattedToday}</span>
      <span data-testid="countdown">{countdown.formatted}</span>
      <span data-testid="distraction-free">{String(timer.isDistractionFree)}</span>
      <span data-testid="sessions-count">{timer.sessions.length}</span>

      <button onClick={timer.pause}>Pause</button>
      <button onClick={timer.resume}>Resume</button>
      <button onClick={timer.toggleDistractionFree}>Toggle Distraction Free</button>
      <button
        onClick={() =>
          timer.recordSession({
            id: 'device-a-session',
            startedAt: new Date(Date.now() - 1500000).toISOString(),
            endedAt: new Date().toISOString(),
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

describe('FocusTimerContext (Screen Time)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => true });

    document.documentElement.requestFullscreen = vi.fn().mockImplementation(async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: document.documentElement,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    document.exitFullscreen = vi.fn().mockImplementation(async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: null,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    });

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
    document.documentElement.classList.remove('distraction-free');
  });

  it('starts running on its own when site opens and counts up while visible and focused', () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('is-paused').textContent).toBe('false');
    expect(screen.getByTestId('today-formatted').textContent).toBe('00:00');

    // Advance 5 seconds while visible and focused
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByTestId('today-formatted').textContent).toBe('00:05');
  });

  it('pauses and resumes counting', () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('today-formatted').textContent).toBe('00:03');

    // Pause timer
    fireEvent.click(screen.getByText('Pause'));
    expect(screen.getByTestId('status').textContent).toBe('paused');
    expect(screen.getByTestId('is-paused').textContent).toBe('true');

    // Time does not count while paused
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId('today-formatted').textContent).toBe('00:03');

    // Resume
    fireEvent.click(screen.getByText('Resume'));
    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('is-paused').textContent).toBe('false');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('today-formatted').textContent).toBe('00:05');
  });

  it('stops counting when tab is hidden or window blurs and resumes when focused', () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('today-formatted').textContent).toBe('00:02');

    // Tab hidden
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // 10s pass while hidden: must NOT count!
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId('today-formatted').textContent).toBe('00:02');

    // Tab visible again and focused
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });

    // Resumes counting 1s per tick
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('today-formatted').textContent).toBe('00:05');

    // Window blurs
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    // 10s pass while blurred: must NOT count!
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId('today-formatted').textContent).toBe('00:05');
  });

  it('distraction-free toggle calls requestFullscreen and reacts to fullscreenchange', async () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    expect(screen.getByTestId('distraction-free').textContent).toBe('false');

    // Toggle on
    await act(async () => {
      fireEvent.click(screen.getByText('Toggle Distraction Free'));
    });

    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    expect(document.documentElement.classList.contains('distraction-free')).toBe(true);
    expect(screen.getByTestId('distraction-free').textContent).toBe('true');

    // Fullscreen exit via Esc (fullscreenElement becomes null)
    await act(async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: null,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(document.documentElement.classList.contains('distraction-free')).toBe(false);
    expect(screen.getByTestId('distraction-free').textContent).toBe('false');
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

  it('migrates a saved state with old Pomodoro properties cleanly', async () => {
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

    // Should migrate from phaseEnded to running screen time
    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('is-paused').textContent).toBe('false');
  });
});
