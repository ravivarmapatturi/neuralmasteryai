import { useCallback, useState } from 'react';
import { useFocusMusic } from '../../contexts/FocusMusicContext';
import FocusMusicPopover from './FocusMusicPopover';

export default function FocusMusicControl() {
  const { enabled, playing, autoplayBlocked } = useFocusMusic();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setPopoverOpen(false), []);

  return (
    <div className="nm-focus-control-wrapper">
      <button
        type="button"
        className={`nm-focus-nav-btn ${playing ? 'is-playing' : ''} ${!enabled ? 'is-disabled' : ''}`}
        onClick={() => {
          setPopoverOpen((prev) => !prev);
        }}
        aria-label={playing ? 'Focus music is playing. Open settings' : 'Focus music is paused. Open settings'}
        aria-expanded={popoverOpen}
        title="Focus Mode (Ambient Sound)"
      >
        <span className="nm-focus-icon" aria-hidden="true">♫</span>
        <span className="nm-focus-label">{autoplayBlocked ? 'Play sound' : 'Focus'}</span>

        {/* Gentle 3-Bar Equalizer Waveform */}
        <span className={`nm-focus-bars ${playing ? 'is-animating' : ''}`} aria-hidden="true">
          <span className="nm-fbar b1" />
          <span className="nm-fbar b2" />
          <span className="nm-fbar b3" />
        </span>
      </button>

      <FocusMusicPopover isOpen={popoverOpen} onClose={closePopover} />
    </div>
  );
}
