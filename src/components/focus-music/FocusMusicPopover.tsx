import { useEffect, useRef } from 'react';
import { useFocusMusic } from '../../contexts/FocusMusicContext';

interface FocusMusicPopoverProps { isOpen: boolean; onClose: () => void }
const sounds = [
  { id: 'bamboo-flute', label: 'Bamboo', mark: '〰' },
  { id: 'lofi-study', label: 'Lo-fi', mark: '♫' },
  { id: 'white-noise', label: 'White noise', mark: '≋' },
];
export default function FocusMusicPopover({ isOpen, onClose }: FocusMusicPopoverProps) {
  const { playing, volume, currentTrack, autoplayBlocked, error, play, setVolume, setEnabled, setTrackById } = useFocusMusic();
  const panel = useRef<HTMLDivElement>(null);
  const firstChoice = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    firstChoice.current?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!panel.current?.contains(target) && !target.closest('.nm-focus-nav-btn')) onClose();
    };
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keyboard);
      previous?.focus();
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return <div ref={panel} className="nm-focus-popover nm-sound-panel" role="dialog" aria-label="Focus sound">
    <header><strong>Focus sound</strong><button type="button" onClick={onClose} aria-label="Close focus sound">×</button></header>
    <div className="nm-sound-choices" role="group" aria-label="Choose a sound">
      {sounds.map((sound, index) => <button ref={index === 0 ? firstChoice : undefined} key={sound.id} type="button" aria-pressed={currentTrack.id === sound.id} onClick={() => { setTrackById(sound.id); void play(); }}><span aria-hidden="true">{sound.mark}</span>{sound.label}</button>)}
    </div>
    <div className="nm-sound-playback"><button type="button" className="nm-sound-play" onClick={() => playing ? setEnabled(false) : void play()} aria-label={playing ? 'Pause focus sound' : 'Play focus sound'}>{playing ? 'Ⅱ' : '▶'}</button><label><span className="sr-only">Volume</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} aria-label="Focus sound volume" /></label><span>{Math.round(volume * 100)}%</span></div>
    {(autoplayBlocked || error) && <p className="nm-sound-status" role="status">{error ? 'Unable to play. Try another sound.' : 'Press Play to start.'}</p>}
    <footer><span>Pauses when you leave this tab</span><a href="/audio/ATTRIBUTION.md" target="_blank" rel="noreferrer" aria-label="Audio credits">Credits ↗</a></footer>
  </div>;
}
