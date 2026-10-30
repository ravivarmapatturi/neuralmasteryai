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
}

const STORAGE_KEY_ENABLED = 'nm_focus_music_enabled';
const STORAGE_KEY_VOLUME = 'nm_focus_music_volume';
const STORAGE_KEY_TRACK = 'nm_focus_music_track';

const DEFAULT_VOLUME = 0.12; // ~12% volume, gentle ambient level

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
      // Default to TRUE for first-time visitors
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

  // Web Audio ambient drone backup (generates warm 432Hz harmonic focus drone)
  const webAudioCtxRef = useRef<AudioContext | null>(null);
  const webAudioGainRef = useRef<GainNode | null>(null);
  const webAudioActiveRef = useRef<boolean>(false);

  const currentTrack = FOCUS_TRACKS[trackIndex] || FOCUS_TRACKS[0];

  // Helper to start the soothing Web Audio ambient drone
  const startWebAudioSynth = useCallback((targetVol: number) => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!webAudioCtxRef.current) {
        webAudioCtxRef.current = new AudioCtx();
      }
      const ctx = webAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (webAudioActiveRef.current) return;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(Math.max(0.001, targetVol * 0.45), ctx.currentTime + 1.2);

      // Low pass filter at 360Hz for deep warm muffled lo-fi presence
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(360, ctx.currentTime);

      // 432Hz Root Harmonic frequencies: A2 (108Hz), E3 (162Hz), A3 (216Hz), C#4 (271.7Hz)
      const freqs = [108.0, 162.0, 216.0, 271.7];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, ctx.currentTime);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.25 / (idx + 1), ctx.currentTime);

        // Gentle chorus LFO
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.12 + idx * 0.05, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(1.5, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start();
      });

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      webAudioGainRef.current = masterGain;
      webAudioActiveRef.current = true;
    } catch {
      // Graceful fallback if Web Audio is unsupported
    }
  }, []);

  const stopWebAudioSynth = useCallback(() => {
    try {
      if (webAudioGainRef.current && webAudioCtxRef.current) {
        const ctx = webAudioCtxRef.current;
        webAudioGainRef.current.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        setTimeout(() => {
          webAudioActiveRef.current = false;
        }, 700);
      }
    } catch {}
  }, []);

  // Initialize Audio Element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    const handleEnded = () => {
      // Loop or advance track
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    const handleError = () => {
      // If static file is missing or not yet uploaded, trigger Web Audio ambient fallback
      if (playing) {
        startWebAudioSynth(volume);
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      stopWebAudioSynth();
    };
  }, []);

  // Update track src when currentTrack changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const wasPlaying = playing;
    audio.src = currentTrack.src;
    audio.load();

    if (wasPlaying && enabled) {
      audio.play().catch(() => {
        startWebAudioSynth(volume);
      });
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

  // Handle Playback with smooth volume ramp
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !enabled) return;

    try {
      audio.volume = Math.max(0.001, volume * 0.1);
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        await playPromise;
      }

      setPlaying(true);
      setAutoplayBlocked(false);

      // Smooth volume fade-in over ~800ms
      const targetVol = volume;
      const startTime = performance.now();
      const fadeIn = (now: number) => {
        const elapsed = (now - startTime) / 800;
        if (elapsed < 1 && audio) {
          audio.volume = Math.min(targetVol, Math.max(0.01, targetVol * elapsed));
          requestAnimationFrame(fadeIn);
        } else if (audio) {
          audio.volume = targetVol;
        }
      };
      requestAnimationFrame(fadeIn);
    } catch (err) {
      // Autoplay blocked by browser policy
      setAutoplayBlocked(true);
      setPlaying(false);
      // Attempt Web Audio synth
      startWebAudioSynth(volume);
      setPlaying(true);
    }
  }, [enabled, volume, startWebAudioSynth]);

  // Handle Pause with smooth volume fade
  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      try {
        const startVol = audio.volume;
        const startTime = performance.now();
        const fadeOut = (now: number) => {
          const elapsed = (now - startTime) / 400;
          if (elapsed < 1 && audio) {
            audio.volume = Math.max(0, startVol * (1 - elapsed));
            requestAnimationFrame(fadeOut);
          } else if (audio) {
            audio.pause();
            audio.volume = volume;
          }
        };
        requestAnimationFrame(fadeOut);
      } catch {
        audio.pause();
      }
    }
    stopWebAudioSynth();
    setPlaying(false);
  }, [volume, stopWebAudioSynth]);

  const toggle = useCallback(() => {
    if (playing) {
      pause();
    } else {
      if (!enabled) {
        setEnabledState(true);
        try {
          localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
        } catch {}
      }
      play();
    }
  }, [playing, enabled, play, pause]);

  // Set Volume
  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (webAudioGainRef.current && webAudioCtxRef.current) {
      webAudioGainRef.current.gain.setValueAtTime(clamped * 0.45, webAudioCtxRef.current.currentTime);
    }
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, clamped.toString());
    } catch {}
  }, []);

  // Set Enabled / Disabled (User Preference Rule)
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
    // If user previously disabled music, respect user choice: do NOT play!
    if (!enabled) return;

    // Attempt initial autoplay
    play().catch(() => {
      setAutoplayBlocked(true);
    });

    // Fallback: Listen for first user interaction if autoplay is blocked
    const handleFirstInteraction = () => {
      if (enabled && (!playing || autoplayBlocked)) {
        play();
      }
      cleanupListeners();
    };

    const cleanupListeners = () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { once: true, passive: true });
    window.addEventListener('click', handleFirstInteraction, { once: true, passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true, passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true, passive: true });

    return cleanupListeners;
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
      }}
    >
      {children}
    </FocusMusicContext.Provider>
  );
}
