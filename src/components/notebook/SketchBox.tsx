import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { SketchRect } from './RoughShape';

interface SketchBoxProps {
  color: string;
  strokeWidth?: number;
  roughness?: number;
  style?: CSSProperties;
  children: ReactNode;
}

/** A hand-drawn-bordered wrapper for arbitrary HTML content (a ranked-list
 * item, a card, any plain <div>-based diagram piece that isn't built from
 * SVG shapes) -- generalizes the same measure-then-draw technique
 * NotebookCallout.tsx uses internally, so any diagram with plain HTML
 * cards (not SVG rects) can get the same hand-drawn border without
 * re-deriving the ResizeObserver boilerplate each time. Border only, no
 * fillColor -- callers keep controlling their own background via normal
 * CSS, same text-legibility reasoning as every other Sketch* usage this
 * session (a rough.js hachure fill behind text is a real, already-fixed
 * bug, never reintroduce it here). */
export default function SketchBox({ color, strokeWidth = 1.5, roughness = 1.3, style, children }: SketchBoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 120, height: 40 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <SketchRect
          x={2}
          y={2}
          width={Math.max(size.width - 4, 4)}
          height={Math.max(size.height - 4, 4)}
          color={color}
          strokeWidth={strokeWidth}
          roughness={roughness}
          id={`sketchbox-${color}-${size.width}-${size.height}`}
        />
      </svg>
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}
