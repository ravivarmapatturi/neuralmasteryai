import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusTimer } from '../../contexts/FocusTimerContext';
import { SIGN_IN_DIALOG_OPEN_EVENT } from '../../lib/signInDialog';
import './signInNudge.css';

const DISMISS_KEY = 'nm_signin_nudge_dismissed_at';
const CONVERT_KEY = 'nm_signin_nudge_converted';
const SHOWN_KEY = 'nm_signin_nudge_shown';
const SEVEN_DAYS_MS = 604800000;

function isStorageDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    const now = Date.now();
    if (ts > now) return false;
    const age = now - ts;
    return age >= 0 && age < SEVEN_DAYS_MS;
  } catch {
    return false;
  }
}

function isStorageConverted(): boolean {
  try {
    return window.localStorage.getItem(CONVERT_KEY) === '1';
  } catch {
    return false;
  }
}

function isStorageShown(): boolean {
  try {
    return window.sessionStorage.getItem(SHOWN_KEY) === '1';
  } catch {
    return false;
  }
}

export function isPathEligible(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/interview') return false;
  if (clean === '/interview/q' || clean.startsWith('/interview/q/')) return false;
  if (clean === '/blog/write' || clean.startsWith('/blog/write/')) return false;
  if (clean === '/signin' || clean.startsWith('/signin/')) return false;
  if (clean === '/sign-in' || clean.startsWith('/sign-in/')) return false;
  if (clean === '/login' || clean.startsWith('/login/')) return false;
  return true;
}

export function isDomBlocked(pathname: string): boolean {
  if (typeof document === 'undefined') return false;
  const dialog = document.querySelector('[role="dialog"]:not([aria-hidden="true"]), dialog[open]');
  if (dialog) return true;

  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/interview/mock' || clean.startsWith('/interview/mock/')) {
    if (document.querySelector('[data-nm-mock-recording="true"]')) return true;
  }

  if (clean === '/practice' || clean.startsWith('/practice/')) {
    if (document.querySelector('[data-nm-practice-running="true"]')) return true;
  }

  return false;
}

export default function SignInNudge() {
  const { user: account, isGuest, loading, signInWithGoogle } = useAuth();
  // guests are still nudged to save their progress with a real sign-in
  const user = isGuest ? null : account;
  const { isDistractionFree } = useFocusTimer();
  const location = useLocation();

  const [timerElapsed, setTimerElapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isConvertedState, setIsConvertedState] = useState(false);
  const [domTick, setDomTick] = useState(0);
  const [activeSessionShow, setActiveSessionShow] = useState(false);

  const shownThisSessionRef = useRef(false);

  // 5000ms timer starts on mount and does not restart on route changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimerElapsed(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // MutationObserver for dialogs and activity attributes
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return;
    const observer = new MutationObserver(() => {
      setDomTick((t) => t + 1);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'open', 'aria-hidden', 'data-nm-mock-recording', 'data-nm-practice-running'],
    });
    return () => observer.disconnect();
  }, []);

  // Non-null user marks converted and suppresses
  useEffect(() => {
    if (user) {
      try {
        window.localStorage.setItem(CONVERT_KEY, '1');
      } catch {}
      setIsConvertedState(true);
    }
  }, [user]);

  const handleDismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setIsDismissed(true);
    setActiveSessionShow(false);
  }, []);

  const markConverted = useCallback(() => {
    try {
      window.localStorage.setItem(CONVERT_KEY, '1');
    } catch {}
    setIsConvertedState(true);
    setActiveSessionShow(false);
  }, []);

  const handleGoogle = useCallback(async () => {
    markConverted();
    try {
      await signInWithGoogle();
    } catch {
      // Handle rejected promise without an uncaught exception and do not restore the note
    }
  }, [markConverted, signInWithGoogle]);

  const handleEmail = useCallback(() => {
    markConverted();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(SIGN_IN_DIALOG_OPEN_EVENT));
    }
  }, [markConverted]);

  // Evaluate eligibility and show state
  useEffect(() => {
    if (activeSessionShow) {
      if (
        user ||
        isDistractionFree ||
        !isPathEligible(location.pathname) ||
        isDomBlocked(location.pathname) ||
        isDismissed ||
        isConvertedState
      ) {
        setActiveSessionShow(false);
      }
    } else {
      const alreadyShown = shownThisSessionRef.current || isStorageShown();
      if (
        timerElapsed &&
        !loading &&
        !user &&
        !alreadyShown &&
        !isDistractionFree &&
        !isDismissed &&
        !isConvertedState &&
        !isStorageDismissed() &&
        !isStorageConverted() &&
        isPathEligible(location.pathname) &&
        !isDomBlocked(location.pathname)
      ) {
        shownThisSessionRef.current = true;
        try {
          window.sessionStorage.setItem(SHOWN_KEY, '1');
        } catch {}
        setActiveSessionShow(true);
      }
    }
  }, [
    activeSessionShow,
    timerElapsed,
    loading,
    user,
    isDistractionFree,
    location.pathname,
    domTick,
    isDismissed,
    isConvertedState,
  ]);

  // Escape key dismisses only while visible
  useEffect(() => {
    if (!activeSessionShow) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSessionShow, handleDismiss]);

  if (!activeSessionShow) {
    return null;
  }

  return (
    <aside
      className="nm-signin-nudge"
      aria-labelledby="nm-signin-nudge-title"
    >
      <button
        type="button"
        className="nm-signin-nudge-close"
        aria-label="Close"
        onClick={handleDismiss}
      >
        ×
      </button>
      <h2 id="nm-signin-nudge-title" className="nm-signin-nudge-title">
        Save your progress
      </h2>
      <p className="nm-signin-nudge-body">
        Sign in to keep your points, streak and interview progress on every device.
      </p>
      <div className="nm-signin-nudge-actions">
        <button
          type="button"
          className="nm-signin-nudge-btn-primary"
          onClick={handleGoogle}
        >
          Sign in with Google
        </button>
        <button
          type="button"
          className="nm-signin-nudge-btn-secondary"
          onClick={handleEmail}
        >
          Use email
        </button>
      </div>
    </aside>
  );
}
