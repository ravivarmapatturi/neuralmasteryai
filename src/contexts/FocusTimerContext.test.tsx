import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FocusMusicProvider } from './FocusMusicContext';
import { FocusTimerProvider, useFocusTimer, useFocusCountdown } from './FocusTimerContext';
import { AuthProvider } from './AuthContext';

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

  it('initializes in idle state and starts focus countdown', async () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    expect(screen.getByTestId('phase').textContent).toBe('idle');
    expect(screen.getByTestId('status').textContent).toBe('idle');
    expect(screen.getByTestId('countdown').textContent).toBe('25:00');

    // Click Start Focus
    fireEvent.click(screen.getByText('Start Focus'));

    expect(screen.getByTestId('phase').textContent).toBe('focus');
    expect(screen.getByTestId('status').textContent).toBe('running');

    // Advance 5 seconds
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

  it('auto-pauses with reason away when tab is hidden for > 60 seconds', async () => {
    render(
      <Wrapper>
        <TestTimerWidget />
      </Wrapper>,
    );

    fireEvent.click(screen.getByText('Start Focus'));
    expect(screen.getByTestId('status').textContent).toBe('running');

    // Tab becomes hidden
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));

    // 70 seconds pass while hidden
    act(() => {
      vi.advanceTimersByTime(70000);
    });

    // Tab becomes visible again
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange'));

    expect(screen.getByTestId('status').textContent).toBe('paused');
    expect(screen.getByTestId('reason').textContent).toBe('away');
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
});
