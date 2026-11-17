import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  installPreloadErrorHandler,
  clearPreloadReloadGuard,
  PRELOAD_RELOAD_KEY,
} from './preloadError';

describe('installPreloadErrorHandler', () => {
  let mockReload: ReturnType<typeof vi.fn>;
  let mockStorage: Record<string, string>;
  let fakeWindow: any;

  beforeEach(() => {
    mockReload = vi.fn();
    mockStorage = {};

    fakeWindow = {
      sessionStorage: {
        getItem: vi.fn((key: string) => mockStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage[key];
        }),
      },
      location: {
        reload: mockReload,
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  it('reloads the window and sets guard flag on the first preload error', () => {
    const cleanup = installPreloadErrorHandler(fakeWindow);

    expect(fakeWindow.addEventListener).toHaveBeenCalledWith(
      'vite:preloadError',
      expect.any(Function),
    );

    const handler = fakeWindow.addEventListener.mock.calls[0][1];
    const event = { preventDefault: vi.fn() };

    handler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(fakeWindow.sessionStorage.setItem).toHaveBeenCalledWith(PRELOAD_RELOAD_KEY, '1');
    expect(mockReload).toHaveBeenCalledTimes(1);

    cleanup();
    expect(fakeWindow.removeEventListener).toHaveBeenCalledWith('vite:preloadError', handler);
  });

  it('prevents reload loops when guard flag is already set in sessionStorage', () => {
    mockStorage[PRELOAD_RELOAD_KEY] = '1';
    installPreloadErrorHandler(fakeWindow);

    const handler = fakeWindow.addEventListener.mock.calls[0][1];
    const event = { preventDefault: vi.fn() };

    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('clears reload guard flag with clearPreloadReloadGuard', () => {
    mockStorage[PRELOAD_RELOAD_KEY] = '1';
    clearPreloadReloadGuard(fakeWindow);

    expect(fakeWindow.sessionStorage.removeItem).toHaveBeenCalledWith(PRELOAD_RELOAD_KEY);
    expect(mockStorage[PRELOAD_RELOAD_KEY]).toBeUndefined();
  });

  it('handles sessionStorage exceptions gracefully without crashing', () => {
    fakeWindow.sessionStorage.getItem = vi.fn(() => {
      throw new Error('Access denied in private window');
    });

    installPreloadErrorHandler(fakeWindow);
    const handler = fakeWindow.addEventListener.mock.calls[0][1];
    const event = { preventDefault: vi.fn() };

    expect(() => handler(event)).not.toThrow();
  });
});
