import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import SignInNudge from './SignInNudge';
import { SIGN_IN_DIALOG_OPEN_EVENT } from '../../lib/signInDialog';

const mockSignInWithGoogle = vi.fn().mockResolvedValue(undefined);
let mockAuth = {
  user: null as any,
  loading: false,
  signInWithGoogle: mockSignInWithGoogle,
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signOutUser: vi.fn(),
};

let mockFocusTimer = {
  isDistractionFree: false,
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('../../contexts/FocusTimerContext', () => ({
  useFocusTimer: () => mockFocusTimer,
}));

function renderNudge(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SignInNudge />
    </MemoryRouter>,
  );
}

describe('SignInNudge component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    mockSignInWithGoogle.mockClear();
    mockAuth = {
      user: null,
      loading: false,
      signInWithGoogle: mockSignInWithGoogle,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      signOutUser: vi.fn(),
    };
    mockFocusTimer = {
      isDistractionFree: false,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    // clean up any test-injected dom elements
    document.body.innerHTML = '';
  });

  it('1. Signed-in user never sees the nudge', () => {
    mockAuth.user = { uid: 'u1', email: 'user@example.com' };
    renderNudge('/');
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();
  });

  it('2. Signed-out user sees it only after advancing 5000ms', () => {
    renderNudge('/');
    act(() => {
      vi.advanceTimersByTime(4900);
    });
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('Save your progress')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to keep your points, streak and interview progress on every device.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('3. Clicking close stores dismissal time; remount within 7 days does not show it', () => {
    const { unmount } = renderNudge('/');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Save your progress')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();

    const dismissed = localStorage.getItem('nm_signin_nudge_dismissed_at');
    expect(dismissed).toBeTruthy();
    expect(Number(dismissed)).toBeGreaterThan(0);

    unmount();
    sessionStorage.clear(); // clear session storage to verify local storage dismissal suppresses it

    // Remount 3 days later
    act(() => {
      vi.advanceTimersByTime(3 * 24 * 60 * 60 * 1000);
    });
    renderNudge('/');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();
  });

  it('4. isDistractionFree=true prevents it from showing', () => {
    mockFocusTimer.isDistractionFree = true;
    renderNudge('/');
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();
  });

  it('5. /signin does not show it', () => {
    renderNudge('/signin');
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();
  });

  it('6. /interview is excluded but /interview/questions is allowed', () => {
    const view1 = renderNudge('/interview');
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();
    view1.unmount();

    sessionStorage.clear();
    const view2 = renderNudge('/interview/questions');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Save your progress')).toBeInTheDocument();
    view2.unmount();
  });

  it('7. Open dialog hides/suppresses the note', async () => {
    renderNudge('/');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Save your progress')).toBeInTheDocument();

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    await act(async () => {
      document.body.appendChild(dialog);
    });
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();
  });

  it('8. /practice/example is suppressed only with the running marker; /interview/mock is suppressed only with the recording marker', () => {
    // /practice/example without marker -> allowed
    const view1 = renderNudge('/practice/example');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Save your progress')).toBeInTheDocument();
    view1.unmount();
    sessionStorage.clear();

    // /practice/example with running marker -> suppressed
    const practiceDiv = document.createElement('div');
    practiceDiv.setAttribute('data-nm-practice-running', 'true');
    document.body.appendChild(practiceDiv);

    const view2 = renderNudge('/practice/example');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();
    view2.unmount();
    document.body.removeChild(practiceDiv);
    sessionStorage.clear();

    // /interview/mock without recording marker -> allowed
    const view3 = renderNudge('/interview/mock');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Save your progress')).toBeInTheDocument();
    view3.unmount();
    sessionStorage.clear();

    // /interview/mock with recording marker -> suppressed
    const mockDiv = document.createElement('div');
    mockDiv.setAttribute('data-nm-mock-recording', 'true');
    document.body.appendChild(mockDiv);

    const view4 = renderNudge('/interview/mock');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();
    view4.unmount();
    document.body.removeChild(mockDiv);
  });

  it('9. Google calls the existing mock signInWithGoogle; email dispatches the event and hides', () => {
    // Google action
    const view1 = renderNudge('/');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Save your progress')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('nm_signin_nudge_converted')).toBe('1');
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();
    view1.unmount();

    // Reset storage for email test
    localStorage.clear();
    sessionStorage.clear();

    const emailListener = vi.fn();
    window.addEventListener(SIGN_IN_DIALOG_OPEN_EVENT, emailListener);

    renderNudge('/');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Save your progress')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Use email' }));
    expect(emailListener).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('nm_signin_nudge_converted')).toBe('1');
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();

    window.removeEventListener(SIGN_IN_DIALOG_OPEN_EVENT, emailListener);
  });

  it('10. Escape dismisses only while visible', () => {
    // When visible, Escape dismisses
    renderNudge('/');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Save your progress')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Save your progress')).not.toBeInTheDocument();
    expect(localStorage.getItem('nm_signin_nudge_dismissed_at')).toBeTruthy();

    // When not visible, Escape does not record dismissal
    localStorage.clear();
    sessionStorage.clear();
    renderNudge('/signin');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(localStorage.getItem('nm_signin_nudge_dismissed_at')).toBeNull();
  });
});
