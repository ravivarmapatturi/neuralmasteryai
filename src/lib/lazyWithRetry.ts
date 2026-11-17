import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { clearPreloadReloadGuard } from './preloadError';

export interface RetryOptions {
  retries?: number;
  intervalMs?: number;
}

/**
 * Retries an async dynamic import function if it fails (e.g. transient network errors
 * or asset fetch hiccups).
 *
 * Upon successful module resolution, clears the reload guard in sessionStorage
 * so subsequent stale-chunk failures in future sessions or navigations can trigger
 * a fresh reload attempt.
 */
export async function retryImport<T>(
  importer: () => Promise<T>,
  retries = 2,
  intervalMs = 300,
): Promise<T> {
  try {
    const loaded = await importer();
    clearPreloadReloadGuard();
    return loaded;
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    return retryImport(importer, retries - 1, Math.round(intervalMs * 1.5));
  }
}

/**
 * A drop-in replacement for React.lazy that automatically retries failed module imports
 * before rejecting. When used with Vite code-splitting and an ErrorBoundary, this gives
 * transient network issues multiple attempts to recover before showing the fallback.
 */
export function lazyWithRetry<T extends ComponentType<unknown> | ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  options: RetryOptions = {},
): LazyExoticComponent<T> {
  const { retries = 2, intervalMs = 300 } = options;
  return lazy(() => retryImport(importer, retries, intervalMs));
}
