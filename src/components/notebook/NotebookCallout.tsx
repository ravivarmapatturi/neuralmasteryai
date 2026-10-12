import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { SketchRect } from './RoughShape';

export type NotebookColor = 'cobalt' | 'teal' | 'mint' | 'amber' | 'coral' | 'lavender' | 'green';

const COLOR_VAR: Record<NotebookColor, string> = {
  cobalt: 'var(--nb-cobalt)',
  teal: 'var(--nb-teal)',
  mint: 'var(--nb-mint)',
  amber: 'var(--nb-amber)',
  coral: 'var(--nb-coral)',
  lavender: 'var(--nb-lavender)',
  green: 'var(--nb-green)',
};

interface NotebookCalloutProps {
  color: NotebookColor;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
}

/** A hand-drawn-bordered annotation box -- the direct equivalent of the
 * reference image's colored, boxed margin notes ("What is LangGraph?",
 * "In short: ..."). The border is a real rough.js rectangle (see
 * RoughShape.tsx), sized via ResizeObserver to the box's actual rendered
 * pixel dimensions (1:1 viewBox, no stretching) so the sketchy stroke
 * reads correctly whether the callout holds one line or several
 * paragraphs. Color picks both the stroke and a semantic fill tint from
 * notebook.css's --nb-color-* custom properties. */
export default function NotebookCallout({ color, title, icon, children }: NotebookCalloutProps) {
  const stroke = COLOR_VAR[color];
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 400, height: 120 });

  useLayoutEffect(() => {
    const el = ref.current;
    // Not in every test/runtime environment (jsdom has no ResizeObserver) --
    // falls back to the fixed initial size above rather than throwing, so
    // the border still renders, just without live content-size tracking.
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`nb-callout nb-color-${color}`}>
      <svg
        className="nb-callout-svg"
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <SketchRect
          x={5}
          y={5}
          width={Math.max(size.width - 10, 10)}
          height={Math.max(size.height - 10, 10)}
          color={stroke}
          roughness={1.4}
          strokeWidth={1.6}
          id={`callout-${color}-${title ?? 'box'}`}
        />
      </svg>
      <div className="nb-callout-body">
        {title && (
          <p className="nb-callout-title">
            {icon}
            {title}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
