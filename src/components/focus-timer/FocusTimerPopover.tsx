import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useFocusTimer } from '../../contexts/FocusTimerContext';

interface FocusTimerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FocusTimerPopover({ isOpen, onClose }: FocusTimerPopoverProps) {
  const timer = useFocusTimer();
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  // Handle escape and outside clicks
  useEffect(() => {
    if (!isOpen) return;

    const prevActive = document.activeElement as HTMLElement | null;
    primaryActionRef.current?.focus();

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!panelRef.current?.contains(target) && !target.closest('.nm-timer-nav-btn')) {
        onClose();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      prevActive?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="nm-timer-popover"
      role="dialog"
      aria-label="Focus timer controls"
    >
      <header className="nm-timer-popover-header">
        <h3 className="nm-timer-popover-title">
          <span aria-hidden="true">⏱</span> Focus Time
        </h3>
        <button
          type="button"
          className="nm-timer-close-btn"
          onClick={onClose}
          aria-label="Close focus timer"
        >
          ×
        </button>
      </header>

      {/* Main screen time card */}
      <div className="nm-timer-display-card">
        <span className={`nm-timer-popover-phase ${timer.isPaused ? 'is-paused' : ''}`}>
          {timer.isPaused ? 'Paused' : 'Active today'}
        </span>
        <div
          className="nm-timer-popover-digits"
          aria-label={`Today's focus time: ${timer.formattedToday}`}
        >
          {timer.formattedToday}
        </div>
        <div className="nm-timer-session-info">
          {timer.isPaused ? 'Counting paused' : 'Counting your active screen time'}
        </div>
      </div>

      {/* Transport control: Pause / Resume */}
      <div className="nm-timer-controls-row">
        {timer.isPaused ? (
          <button
            ref={primaryActionRef}
            type="button"
            className="nm-timer-btn-primary"
            onClick={timer.resume}
            aria-label="Resume timer"
          >
            <span aria-hidden="true">▶</span> Resume
          </button>
        ) : (
          <button
            ref={primaryActionRef}
            type="button"
            className="nm-timer-btn-secondary"
            onClick={timer.pause}
            aria-label="Pause timer"
          >
            <span aria-hidden="true">Ⅱ</span> Pause
          </button>
        )}
      </div>

      {/* Distraction-free switch */}
      <div className="nm-timer-toggles">
        <label className="nm-timer-toggle-item">
          <span className="nm-timer-toggle-label">Distraction-free</span>
          <button
            type="button"
            role="switch"
            aria-label="Distraction-free"
            aria-checked={timer.isDistractionFree}
            className={`nm-timer-switch ${timer.isDistractionFree ? 'is-on' : ''}`}
            onClick={timer.toggleDistractionFree}
          >
            <span className="nm-timer-switch-thumb" />
          </button>
        </label>
      </div>

      <footer className="nm-timer-popover-footer">
        <Link
          to="/focus"
          className="nm-timer-dashboard-link"
          onClick={onClose}
        >
          View focus dashboard & stats →
        </Link>
      </footer>
    </div>
  );
}
