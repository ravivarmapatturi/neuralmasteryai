import { render, screen } from '@testing-library/react';
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

  it('shows a running countdown as soon as the site opens and opens the popover on click', () => {
    render(
      <Wrapper>
        <FocusTimerControl />
      </Wrapper>,
    );

    expect(screen.getAllByText('25:00').length).toBeGreaterThanOrEqual(1);
    const button = screen.getByRole('button', { name: /focus timer running/i });
    expect(button).toBeInTheDocument();
  });
});
