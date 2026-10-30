import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { FOCUS_TRACKS, type FocusTrack } from '../data/focusTracks';

interface FocusMusicContextType {
  enabled: boolean;
  playing: boolean;
  volume: number;
  currentTrack: FocusTrack;
  autoplayBlocked: boolean;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => void;
  setVolume: (vol: number) => void;
  setEnabled: (val: boolean) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setTrackById: (id: string) => void;
}

const STORAGE_KEY_ENABLED = 'nm_focus_music_enabled';
const STORAGE_KEY_VOLUME = 'nm_focus_music_volume';
const STORAGE_KEY_TRACK = 'nm_focus_music_track';

const DEFAULT_VOLUME = 0.25; // 25% clear, comfortable ambient volume

const defaultContextValue: FocusMusicContextType = {
  enabled: false,
  playing: false,
  volume: DEFAULT_VOLUME,
  currentTrack: FOCUS_TRACKS[0],
  autoplayBlocked: false,
  play: async () => {},
  pause: () => {},
  toggle: () => {},
  setVolume: () => {},
  setEnabled: () => {},
  nextTrack: () => {},
  previousTrack: () => {},
  setTrackById: () => {},
};

const FocusMusicContext = createContext<FocusMusicContextType | null>(null);

export function useFocusMusic() {
  const context = useContext(FocusMusicContext);
  return context ?? defaultContextValue;
}

export function FocusMusicProvider({ children }: { children: ReactNode }) {
  // 1. Initial State from LocalStorage
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ENABLED);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VOLUME);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
      }
    } catch {}
    return DEFAULT_VOLUME;
  });

  const [trackIndex, setTrackIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRACK);
      if (saved) {
        const found = FOCUS_TRACKS.findIndex((t) => t.id === saved);
        if (found !== -1) return found;
      }
    } catch {}
    return 0;
  });

  const [playing, setPlaying] = useState<boolean>(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);

  // Single persistent HTMLAudioElement
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = FOCUS_TRACKS[trackIndex] || FOCUS_TRACKS[0];

  // Initialize Audio Element once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = volume;
    audio.src = currentTrack.src;
    audioRef.current = audio;

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update track src when currentTrack changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const wasPlaying = playing;
    if (audio.src !== window.location.origin + currentTrack.src && !audio.src.endsWith(currentTrack.src)) {
      audio.src = currentTrack.src;
      audio.load();
      if (wasPlaying && enabled) {
        audio.play().catch(() => {});
      }
    }

    // Media Session metadata update
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: 'Neural Mastery Focus Mode',
        });
      } catch {}
    }
  }, [currentTrack]);

  // Handle Playback
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (!audio.src) {
        audio.src = currentTrack.src;
      }
      audio.volume = volume;
      await audio.play();
      setPlaying(true);
      setAutoplayBlocked(false);
    } catch {
      setAutoplayBlocked(true);
      setPlaying(false);
    }
  }, [volume, currentTrack]);

  // Handle Pause
  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused || !playing) {
      if (!enabled) {
        setEnabledState(true);
        try {
          localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
        } catch {}
      }
      play();
    } else {
      pause();
    }
  }, [playing, enabled, play, pause]);

  // Set Volume
  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, clamped.toString());
    } catch {}
  }, []);

  // Set Enabled / Disabled
  const setEnabled = useCallback((newVal: boolean) => {
    setEnabledState(newVal);
    try {
      localStorage.setItem(STORAGE_KEY_ENABLED, newVal.toString());
    } catch {}
    if (!newVal) {
      pause();
    } else {
      play();
    }
  }, [pause, play]);

  const nextTrack = useCallback(() => {
    setTrackIndex((prev) => {
      const next = (prev + 1) % FOCUS_TRACKS.length;
      try {
        localStorage.setItem(STORAGE_KEY_TRACK, FOCUS_TRACKS[next].id);
      } catch {}
      return next;
    });
  }, []);

  const previousTrack = useCallback(() => {
    setTrackIndex((prev) => {
      const next = (prev - 1 + FOCUS_TRACKS.length) % FOCUS_TRACKS.length;
      try {
        localStorage.setItem(STORAGE_KEY_TRACK, FOCUS_TRACKS[next].id);
      } catch {}
      return next;
    });
  }, []);

  const setTrackById = useCallback((id: string) => {
    const idx = FOCUS_TRACKS.findIndex((t) => t.id === id);
    if (idx !== -1) {
      setTrackIndex(idx);
      try {
        localStorage.setItem(STORAGE_KEY_TRACK, id);
      } catch {}
    }
  }, []);

  // Setup Media Session Action Handlers
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => play());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => previousTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    } catch {}

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      } catch {}
    };
  }, [play, pause, nextTrack, previousTrack]);

  // Initial Autoplay & Graceful Fallback on First Interaction
  useEffect(() => {
    if (!enabled) return;

    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      audio.play().then(() => {
        setPlaying(true);
        setAutoplayBlocked(false);
      }).catch(() => {
        setAutoplayBlocked(true);
        setPlaying(false);
      });
    }

    const onUserInteraction = () => {
      const a = audioRef.current;
      if (a && enabled) {
        a.volume = volume;
        a.play().then(() => {
          setPlaying(true);
          setAutoplayBlocked(false);
        }).catch(() => {});
      }
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('click', onUserInteraction);
      window.removeEventListener('pointerdown', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
    };

    window.addEventListener('click', onUserInteraction, { once: true, passive: true });
    window.addEventListener('pointerdown', onUserInteraction, { once: true, passive: true });
    window.addEventListener('keydown', onUserInteraction, { once: true, passive: true });
    window.addEventListener('touchstart', onUserInteraction, { once: true, passive: true });

    return cleanup;
  }, [enabled, volume]);

  return (
    <FocusMusicContext.Provider
      value={{
        enabled,
        playing,
        volume,
        currentTrack,
        autoplayBlocked,
        play,
        pause,
        toggle,
        setVolume,
        setEnabled,
        nextTrack,
        previousTrack,
        setTrackById,
      }}
    >
      {children}
    </FocusMusicContext.Provider>
  );
}
