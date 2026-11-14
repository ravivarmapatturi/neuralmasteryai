import { useCallback, useState } from 'react';
import { useFocusTimer } from '../../contexts/FocusTimerContext';
import FocusTimerPopover from './FocusTimerPopover';
import './focusTimer.css';

export default function FocusTimerControl() {
  const timer = useFocusTimer();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setPopoverOpen(false), []);

  if (timer.isDistractionFree) {
    return (
      <div className="nm-distraction-free-bar">
        <span
          className="nm-distraction-free-time"
          aria-label={`Today's focus time: ${timer.formattedToday}`}
        >
          {timer.formattedToday}
        </span>
        <button
          type="button"
          className="nm-exit-distraction-free-btn"
          onClick={() => timer.setDistractionFree(false)}
          aria-label="Exit distraction-free"
        >
          Exit distraction-free
        </button>
      </div>
    );
  }

  const isRunning = !timer.isPaused;
  const statusClass = timer.isPaused ? 'is-paused' : 'is-running';
  const phaseText = timer.isPaused ? 'Paused' : 'Focus';

  return (
    <div className="nm-timer-control-wrapper">
      <button
        type="button"
        className={`nm-timer-nav-btn ${statusClass}`}
        onClick={() => setPopoverOpen((prev) => !prev)}
        aria-label={
          isRunning
            ? `Focus timer running: ${timer.formattedToday} today. Open controls`
            : `Focus timer paused: ${timer.formattedToday} today. Open controls`
        }
        aria-expanded={popoverOpen}
        title="Focus Time"
      >
        <span className="nm-timer-nav-icon" aria-hidden="true">⏱</span>
        <span className="nm-timer-nav-countdown">{timer.formattedToday}</span>
        <span className="nm-timer-nav-phase">{phaseText}</span>
      </button>

      <FocusTimerPopover isOpen={popoverOpen} onClose={closePopover} />
    </div>
  );
}
