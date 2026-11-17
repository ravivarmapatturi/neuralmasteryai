/**
 * Guarded listener for Vite dynamic import preload errors (`vite:preloadError`).
 *
 * When a deployment replaces hashed asset chunks, clients on stale HTML/JS
 * encounter 404s when lazy-loading chunks. Vite emits `vite:preloadError` on `window`.
 *
 * To fix this without an endless reload loop (if an asset is genuinely missing or broken),
 * we record a flag in `sessionStorage`. On first preload error, we reload once.
 * If another error occurs within the same session without being cleared, we do not reload,
 * allowing the ErrorBoundary to display the user-facing fallback.
 */

export const PRELOAD_RELOAD_KEY = 'nm:preload-reload';

export function installPreloadErrorHandler(win: Window = window): () => void {
  const handler = (event: Event) => {
    try {
      const alreadyReloaded = win.sessionStorage?.getItem(PRELOAD_RELOAD_KEY);
      if (!alreadyReloaded) {
        win.sessionStorage?.setItem(PRELOAD_RELOAD_KEY, '1');
        event.preventDefault();
        win.location.reload();
        return;
      }
    } catch {
      // sessionStorage may throw in restricted sandboxes / private browsing; fallback to reload once
    }
  };

  win.addEventListener('vite:preloadError', handler);
  return () => {
    win.removeEventListener('vite:preloadError', handler);
  };
}

export function clearPreloadReloadGuard(win: Window = window): void {
  try {
    win.sessionStorage?.removeItem(PRELOAD_RELOAD_KEY);
  } catch {
    // Ignore storage errors
  }
}
