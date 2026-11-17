import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import * as LiveStats from './home/LiveStats';

vi.mock('./home/LiveStats', () => ({
  reportClientError: vi.fn(),
}));

function Thrower({ message = 'Boom!' }: { message?: string }): React.ReactElement | null {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  let originalReload: typeof window.location.reload;
  const originalConsoleError = console.error;

  beforeEach(() => {
    originalReload = window.location.reload;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: vi.fn() },
    });
    // Suppress expected React error logging during test
    console.error = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: originalReload },
    });
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('catches render error and displays route fallback with "Could not load this page"', () => {
    render(
      <ErrorBoundary level="route">
        <Thrower message="Chunk load failed" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Could not load this page')).toBeInTheDocument();
    expect(
      screen.getByText(/A new version of the site may have been published/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('displays root fallback with "Something went wrong" when level is root', () => {
    render(
      <ErrorBoundary level="root">
        <Thrower message="Fatal error" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
  });

  it('calls window.location.reload when "Reload page" is clicked', () => {
    render(
      <ErrorBoundary level="route">
        <Thrower message="Simulated network failure" />
      </ErrorBoundary>,
    );

    const reloadBtn = screen.getByRole('button', { name: 'Reload page' });
    fireEvent.click(reloadBtn);

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('resets error state when "Try again" is clicked', () => {
    let shouldThrow = true;
    function DynamicThrower() {
      if (shouldThrow) throw new Error('First try failed');
      return <div>Recovered content</div>;
    }

    const { rerender } = render(
      <ErrorBoundary level="route">
        <DynamicThrower />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Could not load this page')).toBeInTheDocument();

    shouldThrow = false;
    const tryAgainBtn = screen.getByRole('button', { name: 'Try again' });
    fireEvent.click(tryAgainBtn);

    rerender(
      <ErrorBoundary level="route">
        <DynamicThrower />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });

  it('supports custom fallback function and passes error and reset', () => {
    render(
      <ErrorBoundary
        fallback={({ error, reset }) => (
          <div>
            <span>Custom: {error.message}</span>
            <button onClick={reset}>Custom Reset</button>
          </div>
        )}
      >
        <Thrower message="Custom error msg" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom: Custom error msg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom Reset' })).toBeInTheDocument();
  });

  it('calls onError callback and reports client error to LiveStats', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary level="route" onError={onError}>
        <Thrower message="Report me" />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
    expect(LiveStats.reportClientError).toHaveBeenCalledWith(
      expect.stringContaining('[ErrorBoundary:route] Report me'),
    );
  });
});

describe('ErrorBoundary + lazyWithRetry integration', () => {
  it('displays the friendly reload fallback when a lazy component fails to load', async () => {
    const error = new TypeError('Failed to fetch dynamically imported module');
    const failingImporter = vi.fn().mockRejectedValue(error);
    const FailingComponent = (await import('../lib/lazyWithRetry')).lazyWithRetry(
      failingImporter,
      { retries: 1, intervalMs: 10 },
    );

    const { Suspense } = await import('react');

    render(
      <ErrorBoundary level="route">
        <Suspense fallback={<div>Loading…</div>}>
          <FailingComponent />
        </Suspense>
      </ErrorBoundary>,
    );

    // After retry fails, ErrorBoundary must catch it and display friendly fallback instead of blank
    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('Could not load this page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(failingImporter).toHaveBeenCalledTimes(2); // initial + 1 retry
  });
});
