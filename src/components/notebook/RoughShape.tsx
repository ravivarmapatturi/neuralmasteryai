import { useMemo } from 'react';
import rough from 'roughjs';
import type { Drawable } from 'roughjs/bin/core';

/** Shared seed so every sketchy shape on a page redraws with the same
 * "hand", not a different random wobble per shape -- a real hand-drawn
 * page reuses one pen, not a new random artist for every box. Any fixed
 * integer works; this one has no special meaning. */
const PEN_SEED = 42;

const generator = rough.generator();

/** React can't render roughjs output by handing it a <canvas> ref during
 * SSR-less static generation reliably, and canvas output can't be styled
 * with CSS or inherit currentColor -- so every notebook primitive renders
 * through generator.toPaths() instead, turning a Drawable into plain SVG
 * <path> elements React already knows how to diff and theme. */
function toPathElements(drawable: Drawable, keyPrefix: string) {
  return generator.toPaths(drawable).map((p, i) => (
    <path
      key={`${keyPrefix}-${i}`}
      d={p.d}
      stroke={p.stroke === 'none' ? undefined : p.stroke}
      strokeWidth={p.strokeWidth}
      fill={p.fill ?? 'none'}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ));
}

interface SketchRectProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fillColor?: string;
  roughness?: number;
  strokeWidth?: number;
  /** Border-only opacity, independent of any sibling data-fill rect drawn
   * underneath (e.g. DiagramMatrix's unhighlighted cells) -- a wrapping <g>,
   * not a stroke-opacity property rough.js's generator doesn't expose. */
  opacity?: number;
  id?: string;
}

/** A hand-drawn-style rectangle -- the notebook equivalent of a plain
 * bordered <div>/<rect>. Used for node boxes, annotation callouts, and
 * table cells throughout the notebook-themed pilot pages. */
export function SketchRect({ x, y, width, height, color, fillColor, roughness = 1.6, strokeWidth = 1.8, opacity, id }: SketchRectProps) {
  const drawable = useMemo(
    () =>
      generator.rectangle(x, y, width, height, {
        stroke: color,
        strokeWidth,
        roughness,
        seed: PEN_SEED,
        fill: fillColor,
        fillStyle: 'hachure',
        fillWeight: 1,
        hachureGap: 5,
      }),
    [x, y, width, height, color, fillColor, roughness, strokeWidth],
  );
  const elements = toPathElements(drawable, id ?? `rect-${x}-${y}`);
  return opacity === undefined ? <>{elements}</> : <g opacity={opacity}>{elements}</g>;
}

interface SketchEllipseProps {
  cx: number;
  cy: number;
  width: number;
  height: number;
  color: string;
  fillColor?: string;
  roughness?: number;
  strokeWidth?: number;
  id?: string;
}

export function SketchEllipse({ cx, cy, width, height, color, fillColor, roughness = 1.6, strokeWidth = 1.8, id }: SketchEllipseProps) {
  const drawable = useMemo(
    () =>
      generator.ellipse(cx, cy, width, height, {
        stroke: color,
        strokeWidth,
        roughness,
        seed: PEN_SEED,
        fill: fillColor,
        fillStyle: 'hachure',
        fillWeight: 1,
        hachureGap: 5,
      }),
    [cx, cy, width, height, color, fillColor, roughness, strokeWidth],
  );
  return <>{toPathElements(drawable, id ?? `ellipse-${cx}-${cy}`)}</>;
}

interface SketchArrowProps {
  points: [number, number][];
  color: string;
  strokeWidth?: number;
  roughness?: number;
  id?: string;
  /** Arrowhead drawn as two short hand-drawn strokes at the final point,
   * angled back toward the second-to-last point -- the same construction
   * a hand-drawn arrow actually uses, not a filled marker triangle. */
  arrowhead?: boolean;
}

/** A hand-drawn connector line/curve between nodes, with an optional
 * sketchy arrowhead -- the notebook equivalent of an SVG <line>/<path>
 * with markerEnd. */
export function SketchArrow({ points, color, strokeWidth = 1.8, roughness = 1.8, id, arrowhead = true }: SketchArrowProps) {
  const drawable = useMemo(
    () => generator.curve(points, { stroke: color, strokeWidth, roughness, seed: PEN_SEED }),
    [points, color, strokeWidth, roughness],
  );
  const head = useMemo(() => {
    if (!arrowhead || points.length < 2) return null;
    const [x2, y2] = points[points.length - 1];
    const [x1, y1] = points[points.length - 2];
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = 9;
    const spread = 0.48;
    const leftX = x2 - len * Math.cos(angle - spread);
    const leftY = y2 - len * Math.sin(angle - spread);
    const rightX = x2 - len * Math.cos(angle + spread);
    const rightY = y2 - len * Math.sin(angle + spread);
    return generator.linearPath(
      [
        [leftX, leftY],
        [x2, y2],
        [rightX, rightY],
      ],
      { stroke: color, strokeWidth, roughness: roughness * 0.6, seed: PEN_SEED },
    );
  }, [arrowhead, points, color, strokeWidth, roughness]);

  return (
    <>
      {toPathElements(drawable, id ?? `arrow-${points[0]?.join(',')}`)}
      {head && toPathElements(head, `${id ?? 'arrow'}-head`)}
    </>
  );
}

interface SketchPathProps {
  d: string;
  color: string;
  fillColor?: string;
  roughness?: number;
  strokeWidth?: number;
  id?: string;
}

/** An arbitrary hand-drawn shape from an SVG path-data string -- for shapes
 * rough.js has no dedicated primitive for (diamonds, custom polygons). */
export function SketchPath({ d, color, fillColor, roughness = 1.6, strokeWidth = 1.8, id }: SketchPathProps) {
  const drawable = useMemo(
    () =>
      generator.path(d, {
        stroke: color,
        strokeWidth,
        roughness,
        seed: PEN_SEED,
        fill: fillColor,
        fillStyle: 'hachure',
        fillWeight: 1,
        hachureGap: 5,
      }),
    [d, color, fillColor, roughness, strokeWidth],
  );
  return <>{toPathElements(drawable, id ?? `path-${d.slice(0, 12)}`)}</>;
}

interface SketchUnderlineProps {
  x: number;
  y: number;
  width: number;
  color: string;
  strokeWidth?: number;
  id?: string;
}

/** A single hand-drawn horizontal stroke -- underlines for headings,
 * emphasis marks, small dividers. */
export function SketchUnderline({ x, y, width, color, strokeWidth = 2.5, id }: SketchUnderlineProps) {
  const drawable = useMemo(
    () => generator.line(x, y, x + width, y, { stroke: color, strokeWidth, roughness: 1.4, seed: PEN_SEED }),
    [x, y, width, color, strokeWidth],
  );
  return <>{toPathElements(drawable, id ?? `underline-${x}-${y}`)}</>;
}
