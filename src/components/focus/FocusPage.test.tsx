import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import FocusPage from './FocusPage';
import { FocusTimerProvider } from '../../contexts/FocusTimerContext';
import { FocusMusicProvider } from '../../contexts/FocusMusicContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { GamificationProvider } from '../../contexts/GamificationContext';
import { ProgressProvider } from '../../contexts/ProgressContext';
import { ThemeProvider } from '../../theme/ThemeProvider';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ProgressProvider>
            <GamificationProvider>
              <FocusMusicProvider>
                <FocusTimerProvider>{children}</FocusTimerProvider>
              </FocusMusicProvider>
            </GamificationProvider>
          </ProgressProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

describe('FocusPage Component', () => {
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
  });

  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.classList.remove('distraction-free');
  });

  it('renders empty state when there are zero focus sessions', () => {
    render(
      <Wrapper>
        <FocusPage />
      </Wrapper>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Focus' })).toBeInTheDocument();
    expect(screen.getAllByText('00:00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('No focus sessions recorded yet')).toBeInTheDocument();
    expect(screen.getAllByText('0m').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0 days')).toBeInTheDocument();
    expect(screen.getByText('0 sessions')).toBeInTheDocument();
  });

  it('renders filled stats when focus sessions exist', () => {
    const fakeSessions = [
      {
        id: 'sess-1',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        endedAt: new Date(Date.now() - 2100000).toISOString(),
        focusedSeconds: 1500, // 25m
        completed: true,
        section: 'learn',
      },
      {
        id: 'sess-2',
        startedAt: new Date(Date.now() - 1800000).toISOString(),
        endedAt: new Date(Date.now() - 600000).toISOString(),
        focusedSeconds: 1200, // 20m
        completed: true,
        section: 'labs',
      },
    ];
    localStorage.setItem('nm_focus_sessions', JSON.stringify(fakeSessions));

    render(
      <Wrapper>
        <FocusPage />
      </Wrapper>,
    );

    expect(screen.queryByText('No focus sessions recorded yet')).not.toBeInTheDocument();
    expect(screen.getAllByText('45m').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.getByText('2 sessions')).toBeInTheDocument();

    // Verify charts and sections are visible
    expect(screen.getByText('Past 7 Days')).toBeInTheDocument();
    expect(screen.getByText('Activity (12 Weeks)')).toBeInTheDocument();
    expect(screen.getByText('Time by Section')).toBeInTheDocument();
    expect(screen.getAllByText('Learn').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Labs').length).toBeGreaterThanOrEqual(1);
  });

  it('toggles Pause / Resume and Distraction-free switch on the Focus page', async () => {
    render(
      <Wrapper>
        <FocusPage />
      </Wrapper>,
    );

    // Initial state is running -> shows Pause button
    const pauseBtn = screen.getByRole('button', { name: 'Pause timer' });
    expect(pauseBtn).toBeInTheDocument();

    fireEvent.click(pauseBtn);

    // Now paused -> shows Resume button and status
    expect(screen.getByRole('button', { name: 'Resume timer' })).toBeInTheDocument();
    expect(screen.getByText('Counting paused')).toBeInTheDocument();

    // Click Resume
    fireEvent.click(screen.getByRole('button', { name: 'Resume timer' }));
    expect(screen.getByRole('button', { name: 'Pause timer' })).toBeInTheDocument();

    // Toggle distraction-free switch
    const dfSwitch = screen.getByRole('switch', { name: 'Distraction-free' });
    await act(async () => {
      fireEvent.click(dfSwitch);
    });

    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    expect(document.documentElement.classList.contains('distraction-free')).toBe(true);
  });
});
