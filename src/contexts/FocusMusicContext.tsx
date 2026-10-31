import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { FOCUS_TRACKS, type FocusTrack } from '../data/focusTracks';
interface FocusMusicContextType {
  enabled: boolean; playing: boolean; volume: number; currentTrack: FocusTrack; autoplayBlocked: boolean; error: string;
  play: () => Promise<void>; pause: () => void; toggle: () => void;
  setVolume: (volume: number) => void; setEnabled: (enabled: boolean) => void;
  nextTrack: () => void; previousTrack: () => void; setTrackById: (id: string) => void;
}
const KEYS = { enabled:'nm_focus_music_enabled', volume:'nm_focus_music_volume', track:'nm_focus_music_track' };
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key: string, value: string) => { try { localStorage.setItem(key,value); } catch { /* Storage is optional. */ } };
const defaults: FocusMusicContextType = { enabled:false, playing:false, volume:.15, currentTrack:FOCUS_TRACKS[0], autoplayBlocked:false, error:'', play:async () => {}, pause:() => {}, toggle:() => {}, setVolume:() => {}, setEnabled:() => {}, nextTrack:() => {}, previousTrack:() => {}, setTrackById:() => {} };
const Context = createContext<FocusMusicContextType | null>(null);
export const useFocusMusic = () => useContext(Context) ?? defaults;
export function FocusMusicProvider({ children }: { children: ReactNode }) {
  const [enabled, updateEnabled] = useState(() => read(KEYS.enabled) !== 'false');
  const [volume, updateVolume] = useState(() => { const value = read(KEYS.volume); const n = value === null ? .15 : Number(value); return Number.isFinite(n) && n >= 0 && n <= 1 ? n : .15; });
  const [trackIndex, updateTrack] = useState(() => Math.max(0, FOCUS_TRACKS.findIndex(t => t.id === read(KEYS.track))));
  const [playing, setPlaying] = useState(false);
  const [autoplayBlocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const desired = useRef(enabled);
  const enabledRef = useRef(enabled);
  const ready = useRef(false);
  const selected = useRef(trackIndex);
  const attemptId = useRef(0);
  const currentTrack = FOCUS_TRACKS[trackIndex];
  const attempt = useCallback(async () => {
    const player = audio.current;
    if (!player || document.hidden || !enabledRef.current || !desired.current) return;
    const id = ++attemptId.current;
    player.preload = 'auto';
    try {
      await player.play();
      if (id !== attemptId.current) return;
      if (document.hidden || !desired.current || !enabledRef.current) { player.pause(); return; }
      setBlocked(false); setError('');
    } catch (cause) {
      if (id !== attemptId.current) return;
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      const blocked = cause instanceof DOMException && cause.name === 'NotAllowedError';
      setBlocked(blocked);
      if (!blocked) setError('This sound could not load. Try another track.');
      setPlaying(false);
    }
  }, []);
  useEffect(() => {
    const player = new Audio();
    player.preload = 'none'; player.loop = true; player.volume = volume; player.src = import.meta.env.BASE_URL + FOCUS_TRACKS[selected.current].src.replace(/^\//,'');
    audio.current = player;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => { setPlaying(false); setError('This sound could not load. Try another track.'); };
    player.addEventListener('play',onPlay); player.addEventListener('pause',onPause); player.addEventListener('error',onError);
    const timer = window.setTimeout(() => { ready.current = true; void attempt(); },3000);
    const visibility = () => { if (document.hidden) { ++attemptId.current; player.pause(); } else if (ready.current) void attempt(); };
    const gesture = () => { if (ready.current && player.paused) void attempt(); };
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pointerdown',gesture); window.addEventListener('keydown',gesture);
    return () => {
      clearTimeout(timer); ready.current = false; ++attemptId.current;
      document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('pointerdown',gesture); window.removeEventListener('keydown',gesture);
      player.removeEventListener('play',onPlay); player.removeEventListener('pause',onPause); player.removeEventListener('error',onError);
      player.pause(); player.src = ''; audio.current = null;
    };
  }, [attempt]);
  const play = useCallback(async () => { desired.current = true; enabledRef.current = true; updateEnabled(true); save(KEYS.enabled,'true'); await attempt(); }, [attempt]);
  const pause = useCallback(() => { desired.current = false; ++attemptId.current; audio.current?.pause(); setPlaying(false); }, []);
  const toggle = useCallback(() => { if (audio.current && !audio.current.paused) pause(); else void play(); }, [pause,play]);
  const setEnabled = useCallback((value: boolean) => { enabledRef.current = value; updateEnabled(value); save(KEYS.enabled,String(value)); if (value) void play(); else pause(); }, [pause,play]);
  const setVolume = useCallback((value: number) => { if (!Number.isFinite(value)) return; const clamped = Math.max(0,Math.min(1,value)); updateVolume(clamped); if (audio.current) audio.current.volume = clamped; save(KEYS.volume,String(clamped)); }, []);
  const select = useCallback((index: number) => {
    selected.current = index; updateTrack(index); save(KEYS.track,FOCUS_TRACKS[index].id); setError(''); setBlocked(false); ++attemptId.current;
    if (audio.current) { audio.current.src = import.meta.env.BASE_URL + FOCUS_TRACKS[index].src.replace(/^\//,''); audio.current.load(); }
    if (desired.current) void attempt();
  }, [attempt]);
  const nextTrack = useCallback(() => select((selected.current+1)%FOCUS_TRACKS.length), [select]);
  const previousTrack = useCallback(() => select((selected.current-1+FOCUS_TRACKS.length)%FOCUS_TRACKS.length), [select]);
  const setTrackById = useCallback((id: string) => { const index = FOCUS_TRACKS.findIndex(t => t.id === id); if (index >= 0) select(index); }, [select]);
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title:currentTrack.title,artist:currentTrack.artist,album:'Neural Mastery Focus' });
    try { navigator.mediaSession.setActionHandler('play',play); navigator.mediaSession.setActionHandler('pause',pause); navigator.mediaSession.setActionHandler('nexttrack',nextTrack); navigator.mediaSession.setActionHandler('previoustrack',previousTrack); } catch { /* Optional browser feature. */ }
    return () => { for (const action of ['play','pause','nexttrack','previoustrack'] as const) { try { navigator.mediaSession.setActionHandler(action,null); } catch { /* Optional browser feature. */ } } };
  }, [currentTrack,play,pause,nextTrack,previousTrack]);
  return <Context.Provider value={{enabled,playing,volume,currentTrack,autoplayBlocked,error,play,pause,toggle,setEnabled,setVolume,nextTrack,previousTrack,setTrackById}}>{children}</Context.Provider>;
}
