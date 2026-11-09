import { useCallback, useState } from 'react';
import { useFocusTimer, useFocusCountdown } from '../../contexts/FocusTimerContext';
import FocusTimerPopover from './FocusTimerPopover';
import './focusTimer.css';

export default function FocusTimerControl() {
  const timer = useFocusTimer();
  const { formatted } = useFocusCountdown();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setPopoverOpen(false), []);

  const isIdle = timer.status === 'idle';
  const isRunning = timer.status === 'running';
  const isPaused = timer.status === 'paused';
  const isBreak = timer.phase === 'shortBreak' || timer.phase === 'longBreak';

  let statusClass = '';
  if (isRunning) statusClass = isBreak ? 'is-break' : 'is-running';
  else if (isPaused) statusClass = 'is-paused';

  const phaseText = isBreak ? 'Break' : 'Focus';

  return (
    <div className={`nm-timer-control-wrapper${isIdle ? " is-idle" : ""}`}>
      <button
        type="button"
        className={`nm-timer-nav-btn ${statusClass}`}
        onClick={() => setPopoverOpen((prev) => !prev)}
        aria-label={
          isIdle
            ? 'Start focus timer'
            : isRunning
            ? `${phaseText} timer running: ${formatted} remaining. Open settings`
            : `${phaseText} timer paused. Open settings`
        }
        aria-expanded={popoverOpen}
        title="Focus Timer"
      >
        <span className="nm-timer-nav-icon" aria-hidden="true">⏱</span>
        {isIdle ? (
          <span>Start focus</span>
        ) : (
          <>
            <span className="nm-timer-nav-countdown">{formatted}</span>
            <span className="nm-timer-nav-phase">{isPaused ? 'Paused' : phaseText}</span>
          </>
        )}
      </button>

      <FocusTimerPopover isOpen={popoverOpen} onClose={closePopover} />
    </div>
  );
}
