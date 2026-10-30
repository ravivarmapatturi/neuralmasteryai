import { useEffect, useRef } from 'react';
import { useFocusMusic } from '../../contexts/FocusMusicContext';
import { FOCUS_TRACKS } from '../../data/focusTracks';

interface FocusMusicPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FocusMusicPopover({ isOpen, onClose }: FocusMusicPopoverProps) {
  const {
    enabled,
    playing,
    volume,
    currentTrack,
    play,
    toggle,
    setVolume,
    setEnabled,
    nextTrack,
    previousTrack,
    setTrackById,
  } = useFocusMusic();

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const volumePct = Math.round(volume * 100);

  return (
    <div
      ref={popoverRef}
      className="nm-focus-popover"
      role="dialog"
      aria-label="Focus Mode Settings"
    >
      <div className="nm-focus-popover-header">
        <div className="nm-focus-title-group">
          <span className="nm-focus-eyebrow">FOCUS MODE · LO-FI & CHILL</span>
          <h4 className="nm-focus-track-title">{currentTrack.title}</h4>
          <span className="nm-focus-track-artist">{currentTrack.artist}</span>
        </div>
        <button
          type="button"
          className="nm-focus-close-btn"
          onClick={onClose}
          aria-label="Close Focus Mode popover"
        >
          ✕
        </button>
      </div>

      <p className="nm-focus-microcopy">
        {currentTrack.description}
      </p>

      {/* Transport Controls */}
      <div className="nm-focus-transport">
        <button
          type="button"
          className="nm-focus-tbtn"
          onClick={previousTrack}
          aria-label="Previous focus track"
          title="Previous focus track"
        >
          ◀
        </button>
        <button
          type="button"
          className="nm-focus-tbtn is-play-pause"
          onClick={toggle}
          aria-label={playing ? 'Pause focus music' : 'Play focus music'}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button
          type="button"
          className="nm-focus-tbtn"
          onClick={nextTrack}
          aria-label="Next focus track"
          title="Next focus track"
        >
          ▶
        </button>
      </div>

      {/* Volume Slider */}
      <div className="nm-focus-volume-control">
        <span className="nm-focus-vol-icon" aria-hidden="true">
          {volume === 0 ? '🔇' : volume < 0.3 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          aria-label="Focus music volume slider"
          className="nm-focus-vol-slider"
        />
        <span className="nm-focus-vol-pct">{volumePct}%</span>
      </div>

      {/* 4 Curated Study Stations */}
      <div className="nm-focus-station-list">
        <span className="nm-focus-station-label">STUDY & CHILL TRACKS</span>
        {FOCUS_TRACKS.map((t) => {
          const isSelected = t.id === currentTrack.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`nm-focus-station-item ${isSelected ? 'is-active' : ''}`}
              onClick={() => {
                setTrackById(t.id);
                if (!playing) play();
              }}
            >
              <div className="nm-station-info">
                <strong>{t.title}</strong>
                <span>{t.durationEstimate}</span>
              </div>
              {isSelected && <span className="nm-station-dot">{playing ? '▶ Playing' : 'Selected'}</span>}
            </button>
          );
        })}
      </div>

      {/* Focus Music Toggle Switch (Persistent Preference) */}
      <div className="nm-focus-toggle-row">
        <div className="nm-focus-toggle-label">
          <strong>Focus sound</strong>
          <span>{enabled ? 'Active across pages' : 'Disabled'}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`nm-focus-switch ${enabled ? 'is-on' : 'is-off'}`}
          onClick={() => setEnabled(!enabled)}
          aria-label="Toggle focus music enabled"
        >
          <span className="nm-focus-switch-thumb" />
        </button>
      </div>
    </div>
  );
}
