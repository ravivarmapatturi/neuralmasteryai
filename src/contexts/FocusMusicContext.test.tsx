import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FocusMusicProvider, useFocusMusic } from './FocusMusicContext';
let player: EventTarget & { paused: boolean; src: string; preload: string; loop: boolean; volume: number; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; load: ReturnType<typeof vi.fn> };
function Controls() { const m = useFocusMusic(); return <><button onClick={m.pause}>Pause</button><button onClick={m.play}>Play</button><button onClick={() => m.setTrackById('white-noise')}>Noise</button><span>{m.currentTrack.id}</span><span>{m.autoplayBlocked ? 'blocked' : 'ready'}</span></>; }
beforeEach(() => {
  localStorage.clear(); vi.useFakeTimers();
  Object.defineProperty(document,'hidden',{configurable:true,value:false});
  vi.stubGlobal('Audio', class extends EventTarget { paused=true; src=''; preload=''; loop=false; volume=0; load=vi.fn(); play=vi.fn(async () => { this.paused=false; this.dispatchEvent(new Event('play')); }); pause=vi.fn(() => { this.paused=true; this.dispatchEvent(new Event('pause')); }); constructor() { super(); player=this; } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('focus playback intent', () => {
  it('attempts bamboo after three seconds and pauses/resumes with visibility', async () => {
    render(<FocusMusicProvider><Controls /></FocusMusicProvider>);
    await act(async () => { vi.advanceTimersByTime(2999); }); expect(player.play).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); }); expect(player.src).toContain('bamboo-collection.m4a'); expect(player.play).toHaveBeenCalledTimes(1);
    Object.defineProperty(document,'hidden',{configurable:true,value:true}); fireEvent(document,new Event('visibilitychange')); expect(player.paused).toBe(true);
    Object.defineProperty(document,'hidden',{configurable:true,value:false}); await act(async () => { fireEvent(document,new Event('visibilitychange')); }); expect(player.play).toHaveBeenCalledTimes(2);
  });
  it('respects manual pause across tab changes and unrelated clicks', async () => {
    render(<FocusMusicProvider><Controls /></FocusMusicProvider>); await act(async () => { vi.advanceTimersByTime(3000); });
    fireEvent.click(screen.getByText('Pause')); fireEvent.pointerDown(window); fireEvent(document,new Event('visibilitychange')); expect(player.play).toHaveBeenCalledTimes(1);
    await act(async () => { fireEvent.click(screen.getByText('Play')); }); expect(player.play).toHaveBeenCalledTimes(2);
  });
  it('keeps saved opt-out and changes the source when selecting a track', async () => {
    localStorage.setItem('nm_focus_music_enabled','false'); render(<FocusMusicProvider><Controls /></FocusMusicProvider>);
    await act(async () => { vi.advanceTimersByTime(3000); }); expect(player.play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Noise')); expect(player.src).toContain('white-noise.ogg'); expect(screen.getByText('white-noise')).toBeInTheDocument();
  });
  it('offers a fallback after browser rejection and retries on a gesture', async () => {
    render(<FocusMusicProvider><Controls /></FocusMusicProvider>); player.play.mockRejectedValueOnce(new DOMException('gesture required','NotAllowedError'));
    await act(async () => { vi.advanceTimersByTime(3000); }); expect(screen.getByText('blocked')).toBeInTheDocument();
    await act(async () => { fireEvent.pointerDown(window); }); expect(screen.getByText('ready')).toBeInTheDocument();
  });
});
