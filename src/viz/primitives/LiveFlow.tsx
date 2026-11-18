import { usePrefersReducedMotion } from './VisualizationCanvas';

/**
 * Live motion for diagrams. FlowDots: small dots that travel along a path,
 * forever, so a reader sees data moving through the drawing. Pulse: a soft
 * ring that breathes around a node to show where work happens.
 * Both render nothing when the reader prefers reduced motion.
 */
export function FlowDots({ d, color, dur = 2.4, count = 3, r = 4, delay = 0 }: {
  d: string; color: string; dur?: number; count?: number; r?: number; delay?: number;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;
  return (
    <g aria-hidden pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} r={r} fill={color} opacity={0}>
          <animateMotion path={d} dur={`${dur}s`} begin={`${delay + (i * dur) / count}s`} repeatCount="indefinite" rotate="auto" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur={`${dur}s`} begin={`${delay + (i * dur) / count}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

/** Straight-line path helper: "M x1,y1 L x2,y2". */
export const line = (x1: number, y1: number, x2: number, y2: number) => `M ${x1},${y1} L ${x2},${y2}`;

export function Pulse({ cx, cy, r, color, dur = 2, delay = 0 }: { cx: number; cy: number; r: number; color: string; dur?: number; delay?: number }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;
  return (
    <circle aria-hidden pointerEvents="none" cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={2} opacity={0}>
      <animate attributeName="r" values={`${r};${r * 1.35}`} dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.6;0" dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
    </circle>
  );
}

/** Box version of Pulse for rectangular nodes. */
export function PulseRect({ x, y, w, h, color, dur = 2, delay = 0, blink = false }: { x: number; y: number; w: number; h: number; color: string; dur?: number; delay?: number; blink?: boolean }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;
  return (
    <rect aria-hidden pointerEvents="none" x={x} y={y} width={w} height={h} rx={6} fill={color} opacity={0}>
      {blink
        ? <animate attributeName="opacity" values="0;0.3;0;0" keyTimes="0;0.06;0.2;1" dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
        : <animate attributeName="opacity" values="0;0.18;0" dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />}
    </rect>
  );
}
