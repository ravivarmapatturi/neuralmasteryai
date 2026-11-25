import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion, useVizVisible } from '../primitives';

/** Track container width via ResizeObserver so SVGs switch cleanly between desktop (700) and phone (340). */
export function useResponsiveHostWidth(defaultWidth = 700) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(defaultWidth);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? defaultWidth;
      if (w > 0) setHostWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [defaultWidth]);

  return { hostRef, hostWidth, isCompactPhone: hostWidth < 540 };
}

/**
 * Shared live playback state for interactive playgrounds:
 * - Autoplays and loops on mount when visible and reduced-motion is off
 * - Automatically pauses off-screen (respecting both outer and container visibility)
 * - Starts static on `reducedMotionStep` when prefers-reduced-motion is enabled
 */
export function useStepPlayback(
  totalSteps: number,
  intervalMs: number,
  reducedMotionStep = 0,
  outerVisible = true,
) {
  const reducedMotion = usePrefersReducedMotion();
  const containerVisible = useVizVisible();
  const visible = outerVisible && containerVisible;

  const maxIdx = Math.max(0, totalSteps - 1);
  const clampedReducedStep = Math.max(0, Math.min(maxIdx, reducedMotionStep));
  const [step, setStepState] = useState<number>(0);
  const [userStepped, setUserStepped] = useState(false);
  const [playing, setPlaying] = useState<boolean>(true);

  const effectiveStep =
    reducedMotion && !userStepped ? clampedReducedStep : Math.max(0, Math.min(maxIdx, step));
  const effectivePlaying = playing && !reducedMotion;

  useEffect(() => {
    if (!effectivePlaying || !visible || totalSteps < 2) return undefined;
    const id = window.setTimeout(() => {
      setStepState((curr) => (Math.min(maxIdx, curr) + 1) % totalSteps);
    }, intervalMs);
    return () => window.clearTimeout(id);
  }, [effectivePlaying, visible, totalSteps, maxIdx, intervalMs, effectiveStep]);

  const stop = useCallback(() => setPlaying(false), []);

  const setStep = useCallback(
    (nextStep: number) => {
      setPlaying(false);
      setUserStepped(true);
      setStepState(Math.max(0, Math.min(maxIdx, nextStep)));
    },
    [maxIdx],
  );

  const next = useCallback(() => {
    setPlaying(false);
    setUserStepped(true);
    setStepState((curr) => {
      const base = reducedMotion && !userStepped ? clampedReducedStep : curr;
      return (Math.min(maxIdx, base) + 1) % Math.max(1, totalSteps);
    });
  }, [totalSteps, maxIdx, reducedMotion, userStepped, clampedReducedStep]);

  const reset = useCallback(() => {
    setPlaying(false);
    setUserStepped(true);
    setStepState(0);
  }, []);

  const toggle = useCallback(() => {
    setUserStepped(true);
    setPlaying((curr) => !curr);
  }, []);

  const playFromStart = useCallback(() => {
    setUserStepped(true);
    setStepState(0);
    setPlaying(true);
  }, []);

  return {
    step: effectiveStep,
    playing: effectivePlaying,
    reducedMotion,
    visible,
    setStep,
    next,
    reset,
    toggle,
    stop,
    playFromStart,
  };
}
