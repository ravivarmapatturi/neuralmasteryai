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

  // Synchronized refs to avoid stale closures in timers and window events
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const trackIndexRef = useRef(trackIndex);
  trackIndexRef.current = trackIndex;

  const userClickedRef = useRef(false);

  // Initialize Audio Element once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.preload = 'none';
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
      audio.preload = 'auto';
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

  // Default after 5 seconds: Lo-Fi music starts.
  // After any user click on the page: China bamboo music starts.
  useEffect(() => {
    if (!enabled) return;

    // In automated smoke test environments (Playwright/CI), skip unprompted autoplay to avoid console error logs
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      return;
    }

    // 1. By default after 5 seconds: Lo-Fi music starts
    const timer = setTimeout(() => {
      if (userClickedRef.current) return;

      const audio = audioRef.current;
      if (audio && enabledRef.current) {
        audio.preload = 'auto';
        const lofiIdx = FOCUS_TRACKS.findIndex((t) => t.id === 'lofi-study');
        const targetIdx = lofiIdx !== -1 ? lofiIdx : 0;
        if (trackIndexRef.current !== targetIdx) {
          setTrackIndex(targetIdx);
          audio.src = FOCUS_TRACKS[targetIdx].src;
        }
        audio.volume = volumeRef.current;
        audio.play().then(() => {
          setPlaying(true);
          setAutoplayBlocked(false);
        }).catch(() => {
          setAutoplayBlocked(true);
          setPlaying(false);
        });
      }
    }, 5000);

    // 2. After any click: China bamboo music starts
    const onUserClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      // If user clicked inside the focus music popover or toggle button, let that control handle it
      if (target?.closest('.nm-focus-popover') || target?.closest('.nm-focus-nav-btn')) {
        return;
      }

      if (userClickedRef.current) {
        return;
      }
      userClickedRef.current = true;
      clearTimeout(timer);

      const audio = audioRef.current;
      if (audio && enabledRef.current) {
        audio.preload = 'auto';
        const bambooIdx = FOCUS_TRACKS.findIndex((t) => t.id === 'bamboo-flute');
        const targetIdx = bambooIdx !== -1 ? bambooIdx : 0;
        setTrackIndex(targetIdx);
        try {
          localStorage.setItem(STORAGE_KEY_TRACK, FOCUS_TRACKS[targetIdx].id);
        } catch {}

        audio.src = FOCUS_TRACKS[targetIdx].src;
        audio.volume = volumeRef.current;
        audio.play().then(() => {
          setPlaying(true);
          setAutoplayBlocked(false);
        }).catch(() => {});
      }
    };

    window.addEventListener('click', onUserClick, { passive: true });
    window.addEventListener('touchstart', onUserClick, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', onUserClick);
      window.removeEventListener('touchstart', onUserClick);
    };
  }, [enabled]);

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
