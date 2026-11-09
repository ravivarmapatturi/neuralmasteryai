import { fireEvent, render, screen } from '@testing-library/react';
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders "Start focus" button when idle and opens popover on click', () => {
    render(
      <Wrapper>
        <FocusTimerControl />
      </Wrapper>,
    );

    const btn = screen.getByRole('button', { name: /start focus timer/i });
    expect(btn).toBeInTheDocument();
    expect(screen.getByText('Start focus')).toBeInTheDocument();

    // Click opens popover
    fireEvent.click(btn);
    expect(screen.getByRole('dialog', { name: /focus timer controls/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start 25m focus/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view focus dashboard & stats/i })).toHaveAttribute(
      'href',
      '/focus',
    );
  });

  it('starts focus from popover and transitions navbar button to countdown', () => {
    render(
      <Wrapper>
        <FocusTimerControl />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /start focus timer/i }));
    fireEvent.click(screen.getByRole('button', { name: /start 25m focus/i }));

    expect(screen.getAllByText('Focus').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('25:00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /pause timer/i })).toBeInTheDocument();
  });
});
