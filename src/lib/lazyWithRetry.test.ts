import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryImport } from './lazyWithRetry';
import { PRELOAD_RELOAD_KEY } from './preloadError';

describe('retryImport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.sessionStorage.clear();
  });

  it('resolves immediately when the importer succeeds on first attempt', async () => {
    const importer = vi.fn().mockResolvedValue({ default: 'MyComponent' });

    const resultPromise = retryImport(importer, 2, 100);
    const result = await resultPromise;

    expect(result).toEqual({ default: 'MyComponent' });
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds when a subsequent attempt resolves', async () => {
    const error = new TypeError('Failed to fetch dynamically imported module: chunk-123.js');
    const importer = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ default: 'RecoveredComponent' });

    const resultPromise = retryImport(importer, 2, 100);

    // Fast-forward through the backoff timer
    await vi.runAllTimersAsync();

    const result = await resultPromise;
    expect(result).toEqual({ default: 'RecoveredComponent' });
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('exhausts all retries and rethrows the final error if all attempts fail', async () => {
    const error = new TypeError('Failed to fetch dynamically imported module: chunk-dead.js');
    const importer = vi.fn().mockRejectedValue(error);

    const resultPromise = retryImport(importer, 2, 50);

    // Attach rejection catcher so unhandled rejection isn't thrown in the middle of timer advance
    const outcome = expect(resultPromise).rejects.toThrow(
      'Failed to fetch dynamically imported module',
    );

    await vi.runAllTimersAsync();
    await outcome;

    expect(importer).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('clears reload guard flag on successful import', async () => {
    window.sessionStorage.setItem(PRELOAD_RELOAD_KEY, '1');
    const importer = vi.fn().mockResolvedValue({ default: 'MyComponent' });

    await retryImport(importer, 2, 100);

    expect(window.sessionStorage.getItem(PRELOAD_RELOAD_KEY)).toBeNull();
  });

  it('leaves reload guard flag in place when import fails all retries', async () => {
    window.sessionStorage.setItem(PRELOAD_RELOAD_KEY, '1');
    const error = new TypeError('Failed to fetch dynamically imported module: chunk-dead.js');
    const importer = vi.fn().mockRejectedValue(error);

    const resultPromise = retryImport(importer, 1, 50);
    const outcome = expect(resultPromise).rejects.toThrow(
      'Failed to fetch dynamically imported module',
    );

    await vi.runAllTimersAsync();
    await outcome;

    expect(window.sessionStorage.getItem(PRELOAD_RELOAD_KEY)).toBe('1');
  });

  it('clears reload guard flag after recovering from an earlier retry failure', async () => {
    window.sessionStorage.setItem(PRELOAD_RELOAD_KEY, '1');
    const error = new TypeError('Failed to fetch dynamically imported module: transient.js');
    const importer = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ default: 'RecoveredComponent' });

    const resultPromise = retryImport(importer, 2, 50);

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ default: 'RecoveredComponent' });
    expect(window.sessionStorage.getItem(PRELOAD_RELOAD_KEY)).toBeNull();
  });
});
