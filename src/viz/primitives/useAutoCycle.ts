import { useCallback, useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './VisualizationCanvas';
import { useVizVisible } from './vizVisibility';

/**
 * Keeps a diagram alive: steps a value 0..n-1 on a timer, looping, until the
 * reader takes over (call `stop`, e.g. from onPointerDown on the diagram, or
 * `pick` to choose a value, which also stops it). Reduced motion: never moves.
 */
export function useAutoCycle(n: number, ms: number, start = 0) {
  const reduced = usePrefersReducedMotion();
  const visible = useVizVisible(); // paused while the diagram is off screen
  const [value, setValue] = useState(start);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (reduced || !auto || !visible || n < 2) return;
    const id = window.setInterval(() => setValue((v) => (v + 1) % n), ms);
    return () => window.clearInterval(id);
  }, [reduced, auto, visible, n, ms]);
  const stop = useCallback(() => setAuto(false), []);
  const pick = useCallback((v: number) => { setAuto(false); setValue(v); }, []);
  return { value: Math.min(value, Math.max(0, n - 1)), pick, stop, auto: auto && !reduced };
}
