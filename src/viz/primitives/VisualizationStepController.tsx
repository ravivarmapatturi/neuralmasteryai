import { useCallback, useEffect, useRef, useState } from 'react';
import { useVizTokens, SPACING } from '../../theme/vizTokens';
import { PlaybackControls } from './VisualizationControls';
import { usePrefersReducedMotion } from './VisualizationCanvas';

interface StepControllerState {
  step: number;
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  next: () => void;
  prev: () => void;
  setStep: (n: number) => void;
}

/** Drives step-by-step / animation-timeline mode: shared by every "watch
 * this algorithm run" visualization instead of each one reinventing a
 * step index + play/pause/interval loop. Auto-respects reduced-motion by
 * not auto-advancing (the learner can still step manually). */
export function useStepController(totalSteps: number, intervalMs = 900): StepControllerState {
  const [step, setStepState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!playing || reducedMotion) return undefined;
    timerRef.current = window.setInterval(() => {
      setStepState((s) => {
        if (s >= totalSteps - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, intervalMs);
    return () => window.clearInterval(timerRef.current);
  }, [playing, reducedMotion, totalSteps, intervalMs]);

  const setStep = useCallback((n: number) => setStepState(Math.max(0, Math.min(totalSteps - 1, n))), [totalSteps]);
  const next = useCallback(() => setStep(step + 1), [step, setStep]);
  const prev = useCallback(() => setStep(step - 1), [step, setStep]);
  const reset = useCallback(() => {
    setStepState(0);
    setPlaying(false);
  }, []);
  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);

  return { step, playing, play, pause, toggle, reset, next, prev, setStep };
}

/** Presentational transport bar + scrubber wired to useStepController's state. */
export default function VisualizationStepController({
  controller,
  totalSteps,
  stepLabel,
}: {
  controller: StepControllerState;
  totalSteps: number;
  stepLabel?: (step: number) => string;
}) {
  const t = useVizTokens();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs, flexWrap: 'wrap' }}>
      <PlaybackControls
        playing={controller.playing}
        onTogglePlay={controller.toggle}
        onReset={controller.reset}
        onStepBack={controller.prev}
        onStepForward={controller.next}
        disableBack={controller.step === 0}
        disableForward={controller.step === totalSteps - 1}
      />
      <input
        type="range"
        min={0}
        max={totalSteps - 1}
        step={1}
        value={controller.step}
        aria-label="Step"
        aria-valuetext={stepLabel ? stepLabel(controller.step) : `Step ${controller.step + 1} of ${totalSteps}`}
        onChange={(e) => controller.setStep(Number(e.target.value))}
        style={{ flex: 1, minWidth: 120, accentColor: t.accentPrimary, cursor: 'pointer' }}
      />
      <span style={{ fontSize: 12, color: t.textSecondary, fontVariantNumeric: 'tabular-nums', minWidth: 60, textAlign: 'right' }}>
        {stepLabel ? stepLabel(controller.step) : `${controller.step + 1} / ${totalSteps}`}
      </span>
    </div>
  );
}
