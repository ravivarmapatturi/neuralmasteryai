import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFocusTimer, useFocusCountdown } from '../../contexts/FocusTimerContext';
import { PRESET_25_5, PRESET_50_10 } from '../../lib/focusTimer';

interface FocusTimerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FocusTimerPopover({ isOpen, onClose }: FocusTimerPopoverProps) {
  const timer = useFocusTimer();
  const { formatted } = useFocusCountdown();
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState('');

  // Keep screen reader updated on phase changes without polling every second
  useEffect(() => {
    if (timer.status === 'running') {
      setAnnouncement(`${timer.phase === 'focus' ? 'Focus' : 'Break'} phase running.`);
    } else if (timer.status === 'paused') {
      setAnnouncement(`Timer paused${timer.pausedReason === 'away' ? ' while you were away' : ''}.`);
    } else if (timer.status === 'phaseEnded') {
      setAnnouncement(`${timer.phase === 'focus' ? 'Focus session' : 'Break'} complete.`);
    }
  }, [timer.status, timer.phase, timer.pausedReason]);

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

  const isBreak = timer.phase === 'shortBreak' || timer.phase === 'longBreak';
  const phaseLabel = timer.status === 'idle'
    ? 'Ready'
    : timer.status === 'paused'
    ? 'Paused'
    : timer.phase === 'focus'
    ? 'Focus'
    : timer.phase === 'longBreak'
    ? 'Long break'
    : 'Short break';

  return (
    <div
      ref={panelRef}
      className="nm-timer-popover"
      role="dialog"
      aria-label="Focus timer controls"
    >
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <header className="nm-timer-popover-header">
        <h3 className="nm-timer-popover-title">
          <span aria-hidden="true">⏱</span> Focus Timer
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

      {/* Main countdown and phase card */}
      <div className="nm-timer-display-card">
        <span
          className={`nm-timer-popover-phase ${isBreak ? 'is-break' : ''} ${timer.status === 'paused' ? 'is-paused' : ''}`}
        >
          {phaseLabel}
        </span>
        <div className="nm-timer-popover-digits" aria-label={`Time remaining: ${formatted}`}>
          {formatted}
        </div>
        <div className="nm-timer-session-info">
          {timer.phase === 'focus'
            ? `Session ${Math.min(4, timer.completedFocusCount + 1)} of 4`
            : timer.status === 'idle'
            ? `${timer.preset.focusMinutes} min session`
            : 'Break time'}
        </div>
      </div>

      {/* Away pause notification */}
      {timer.status === 'paused' && timer.pausedReason === 'away' && (
        <div className="nm-timer-away-alert" role="alert">
          <div>
            <strong>Paused while you were away</strong>
          </div>
          <button
            type="button"
            className="nm-timer-btn-secondary"
            onClick={timer.resume}
          >
            Resume
          </button>
        </div>
      )}

      {/* Break suggestion card */}
      {timer.status === 'phaseEnded' && timer.phase === 'focus' && (
        <div className="nm-timer-break-card" role="region" aria-label="Break card">
          <p className="nm-timer-break-suggestion">
            Step away from the screen, stretch, or rest your eyes.
          </p>
          <div className="nm-timer-break-actions">
            <button
              ref={primaryActionRef}
              type="button"
              className="nm-timer-btn-primary"
              onClick={timer.startBreak}
            >
              Start break
            </button>
            <button
              type="button"
              className="nm-timer-btn-secondary"
              onClick={timer.skip}
            >
              Skip break
            </button>
          </div>
        </div>
      )}

      {/* Transport controls */}
      {timer.status === 'idle' && (
        <>
          <div className="nm-timer-presets-row" role="group" aria-label="Preset duration">
            <button
              type="button"
              className={`nm-timer-preset-btn ${timer.preset.id === '25-5' ? 'is-active' : ''}`}
              onClick={() => timer.setPreset(PRESET_25_5)}
              aria-pressed={timer.preset.id === '25-5'}
            >
              <span>25m / 5m</span>
            </button>
            <button
              type="button"
              className={`nm-timer-preset-btn ${timer.preset.id === '50-10' ? 'is-active' : ''}`}
              onClick={() => timer.setPreset(PRESET_50_10)}
              aria-pressed={timer.preset.id === '50-10'}
            >
              <span>50m / 10m</span>
            </button>
          </div>
          <div className="nm-timer-controls-row">
            <button
              ref={primaryActionRef}
              type="button"
              className="nm-timer-btn-primary"
              onClick={() => timer.startFocus()}
            >
              <span aria-hidden="true">▶</span> Start {timer.preset.focusMinutes}m focus
            </button>
          </div>
        </>
      )}

      {timer.status === 'running' && (
        <div className="nm-timer-controls-row">
          <button
            ref={primaryActionRef}
            type="button"
            className="nm-timer-btn-secondary"
            onClick={timer.pause}
            aria-label="Pause timer"
          >
            <span aria-hidden="true">Ⅱ</span> Pause
          </button>
          <button
            type="button"
            className="nm-timer-btn-secondary"
            onClick={timer.skip}
            aria-label="Skip phase"
          >
            <span aria-hidden="true">⏭</span> Skip
          </button>
          <button
            type="button"
            className="nm-timer-btn-danger"
            onClick={timer.stop}
            aria-label="Stop timer"
          >
            <span aria-hidden="true">⏹</span> Stop
          </button>
        </div>
      )}

      {timer.status === 'paused' && timer.pausedReason !== 'away' && (
        <div className="nm-timer-controls-row">
          <button
            ref={primaryActionRef}
            type="button"
            className="nm-timer-btn-primary"
            onClick={timer.resume}
            aria-label="Resume timer"
          >
            <span aria-hidden="true">▶</span> Resume
          </button>
          <button
            type="button"
            className="nm-timer-btn-secondary"
            onClick={timer.skip}
            aria-label="Skip phase"
          >
            <span aria-hidden="true">⏭</span> Skip
          </button>
          <button
            type="button"
            className="nm-timer-btn-danger"
            onClick={timer.stop}
            aria-label="Stop timer"
          >
            <span aria-hidden="true">⏹</span> Stop
          </button>
        </div>
      )}

      {/* Toggles */}
      <div className="nm-timer-toggles">
        <label className="nm-timer-toggle-item">
          <span className="nm-timer-toggle-label">Auto-start next phase</span>
          <button
            type="button"
            role="switch"
            aria-checked={timer.autoStartNext}
            className={`nm-timer-switch ${timer.autoStartNext ? 'is-on' : ''}`}
            onClick={() => timer.setAutoStartNext(!timer.autoStartNext)}
          >
            <span className="nm-timer-switch-thumb" />
          </button>
        </label>

        <label className="nm-timer-toggle-item">
          <span className="nm-timer-toggle-label">Browser notifications</span>
          <button
            type="button"
            role="switch"
            aria-checked={timer.notificationsEnabled}
            className={`nm-timer-switch ${timer.notificationsEnabled ? 'is-on' : ''}`}
            onClick={() => void timer.setNotificationsEnabled(!timer.notificationsEnabled)}
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
