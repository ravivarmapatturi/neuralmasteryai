import { fireEvent, render, screen } from '@testing-library/react';
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders empty state when there are zero focus sessions', () => {
    render(
      <Wrapper>
        <FocusPage />
      </Wrapper>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Focus' })).toBeInTheDocument();
    expect(screen.getAllByText('25:00').length).toBeGreaterThanOrEqual(1);
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
        plannedMinutes: 25,
        focusedSeconds: 1500, // 25m
        completed: true,
        section: 'learn',
      },
      {
        id: 'sess-2',
        startedAt: new Date(Date.now() - 1800000).toISOString(),
        endedAt: new Date(Date.now() - 600000).toISOString(),
        plannedMinutes: 25,
        focusedSeconds: 1200, // 20m
        completed: false,
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
    expect(screen.getByText('1 session')).toBeInTheDocument();

    // Verify charts and sections are visible
    expect(screen.getByText('Past 7 Days')).toBeInTheDocument();
    expect(screen.getByText('Activity (12 Weeks)')).toBeInTheDocument();
    expect(screen.getByText('Time by Section')).toBeInTheDocument();
    expect(screen.getAllByText('Learn').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Labs').length).toBeGreaterThanOrEqual(1);
  });

  it('allows switching presets and custom duration', () => {
    render(
      <Wrapper>
        <FocusPage />
      </Wrapper>,
    );

    const btn50 = screen.getByRole('button', { name: '50 / 10 / 30' });
    fireEvent.click(btn50);
    expect(screen.getAllByText('50:00').length).toBeGreaterThanOrEqual(1);

    const btnCustom = screen.getByRole('button', { name: 'Custom' });
    fireEvent.click(btnCustom);
    expect(screen.getByLabelText(/focus \(5–120 min\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/break \(1–30 min\)/i)).toBeInTheDocument();
  });
});
