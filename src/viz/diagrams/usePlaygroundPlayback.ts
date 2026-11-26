import { useCallback, useEffect, useState } from 'react';
import { usePrefersReducedMotion, useVizVisible } from '../primitives';
import { useAutoplayDefault } from '../primitives/autoplayDefault';

/** Autoplays a short teaching trace, loops, and suspends its timer whenever
 * the surrounding VisualizationContainer is outside the viewport. */
export function usePlaygroundPlayback(totalSteps: number, intervalMs: number) {
  const reducedMotion = usePrefersReducedMotion();
  const visible = useVizVisible();
  const [step, setStepState] = useState(0);
  const autoplayDefault = useAutoplayDefault();
  const [playing, setPlaying] = useState(() => autoplayDefault && !reducedMotion);

  useEffect(() => {
    setStepState((current) => Math.min(current, Math.max(0, totalSteps - 1)));
  }, [totalSteps]);

  useEffect(() => {
    if (reducedMotion) setPlaying(false);
  }, [reducedMotion]);

  useEffect(() => {
    if (!playing || reducedMotion || !visible || totalSteps < 2) return undefined;
    const timer = window.setTimeout(() => {
      setStepState((current) => (current + 1) % totalSteps);
    }, intervalMs);
    return () => window.clearTimeout(timer);
  }, [playing, reducedMotion, visible, totalSteps, intervalMs, step]);

  const setStep = useCallback((next: number) => {
    setPlaying(false);
    setStepState(Math.max(0, Math.min(totalSteps - 1, next)));
  }, [totalSteps]);
  const next = useCallback(() => {
    setPlaying(false);
    setStepState((current) => (current + 1) % Math.max(1, totalSteps));
  }, [totalSteps]);
  const reset = useCallback(() => {
    setPlaying(false);
    setStepState(0);
  }, []);
  const toggle = useCallback(() => setPlaying((current) => !current), []);

  return { step, playing: playing && !reducedMotion, setStep, next, reset, toggle };
}
