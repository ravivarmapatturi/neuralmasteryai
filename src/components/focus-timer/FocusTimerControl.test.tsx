import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import FocusTimerControl from './FocusTimerControl';
import { FocusTimerProvider } from '../../contexts/FocusTimerContext';
import { FocusMusicProvider } from '../../contexts/FocusMusicContext';
import { AuthProvider } from '../../contexts/AuthContext';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FocusMusicProvider>
          <FocusTimerProvider>{children}</FocusTimerProvider>
        </FocusMusicProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('FocusTimerControl and Popover', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => true });

    // Mock requestFullscreen and exitFullscreen
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

  it("shows today's time in the navbar control and opens the popover on click", () => {
    render(
      <Wrapper>
        <FocusTimerControl />
      </Wrapper>,
    );

    // Initial today focus time starts at 00:00
    expect(screen.getByText('00:00')).toBeInTheDocument();
    const navBtn = screen.getByRole('button', { name: /focus timer running/i });
    expect(navBtn).toBeInTheDocument();

    // Open popover
    fireEvent.click(navBtn);
    expect(screen.getByRole('dialog', { name: 'Focus timer controls' })).toBeInTheDocument();
  });

  it('toggles Pause and Resume in the popover', () => {
    render(
      <Wrapper>
        <FocusTimerControl />
      </Wrapper>,
    );

    const navBtn = screen.getByRole('button', { name: /focus timer running/i });
    fireEvent.click(navBtn);

    // Click Pause
    const pauseBtn = screen.getByRole('button', { name: 'Pause timer' });
    fireEvent.click(pauseBtn);

    // Popover shows Resume button and status is paused
    expect(screen.getByRole('button', { name: 'Resume timer' })).toBeInTheDocument();
    expect(screen.getByText('Counting paused')).toBeInTheDocument();

    // Click Resume
    const resumeBtn = screen.getByRole('button', { name: 'Resume timer' });
    fireEvent.click(resumeBtn);
    expect(screen.getByRole('button', { name: 'Pause timer' })).toBeInTheDocument();
  });

  it('Distraction-free switch calls requestFullscreen, adds class, and reacts to fullscreenchange', async () => {
    render(
      <Wrapper>
        <FocusTimerControl />
      </Wrapper>,
    );

    // Open popover
    const navBtn = screen.getByRole('button', { name: /focus timer running/i });
    fireEvent.click(navBtn);

    const dfSwitch = screen.getByRole('switch', { name: 'Distraction-free' });
    expect(dfSwitch).toHaveAttribute('aria-checked', 'false');

    // Click switch
    await act(async () => {
      fireEvent.click(dfSwitch);
    });

    // Check requestFullscreen was called
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    expect(document.documentElement.classList.contains('distraction-free')).toBe(true);

    // When distraction-free is active, navbar control displays Exit distraction-free button
    const exitBtn = screen.getByRole('button', { name: 'Exit distraction-free' });
    expect(exitBtn).toBeInTheDocument();

    // Simulate leaving full screen via Esc or F11 (fullscreenchange with fullscreenElement = null)
    await act(async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: null,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(document.documentElement.classList.contains('distraction-free')).toBe(false);
    expect(screen.queryByRole('button', { name: 'Exit distraction-free' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /focus timer running/i })).toBeInTheDocument();
  });
});
