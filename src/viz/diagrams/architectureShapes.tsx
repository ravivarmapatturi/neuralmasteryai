// Shared shape grammar for the retrieval-architecture diagrams
// (BiEncoderVsCrossEncoderDiagram, ThreeWayRetrievalArchitecturesDiagram):
// a consistent shape-per-node-type vocabulary so a reader pattern-matches
// what kind of thing a node is at a glance, the same way across every
// architecture diagram on the site, rather than each one inventing its
// own box styling. Modeled directly on a reference bi-encoder/
// cross-encoder architecture figure the user shared: rectangle = input or
// a model/encoding stage, cylinder = a stored intermediate representation
// (an embedding), circle = a scoring/computation step, and a distinct
// bordered output box = the final score -- never reused for anything else.
import type { VizTokens } from '../../theme/vizTokens';
import { SketchArrow, SketchEllipse, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

export interface ShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sublabel?: string;
  color: string;
  t: VizTokens;
  strokeWidth?: number;
}

/** Rectangle: an INPUT (query/document) or a MODEL/ENCODING stage. */
export function RectNode({ x, y, width, height, label, sublabel, color, t, strokeWidth = 1.5 }: ShapeProps) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6} fill={`${color}18`} stroke="none" />
      <SketchRect x={x} y={y} width={width} height={height} color={color} strokeWidth={strokeWidth} id={`rect-node-${x}-${y}`} />
      <text x={x + width / 2} y={y + height / 2 + (sublabel ? -1 : 4)} textAnchor="middle" fontSize={10} fontWeight={600} fontFamily={HAND_FONT} fill={color}>
        {label}
      </text>
      {sublabel && (
        <text x={x + width / 2} y={y + height / 2 + 12} textAnchor="middle" fontSize={7.5} fontFamily={HAND_FONT} fill={t.textMuted}>
          {sublabel}
        </text>
      )}
    </g>
  );
}

/** Cylinder: a STORED intermediate representation -- an embedding, a set
 * of token vectors -- data that gets kept around, not a live computation.
 * Deliberately NOT converted to rough.js hand-drawn rendering like the
 * other node shapes in this file -- its 3-part layered fill (dim bottom
 * ellipse, bright top ellipse, mid-tone body) is real visual information
 * forming the 3D-cylinder illusion, not decoration, and this exact shape
 * already had one real, hand-tuned legibility bug fixed here (see the
 * label-positioning comment below). Reshaping it under rough.js without a
 * very careful dedicated pass (and re-verifying all 6 consumer diagrams)
 * risks silently breaking that illusion or reintroducing the old bug. */
export function CylinderNode({ x, y, width, height, label, color, strokeWidth = 1.5 }: Omit<ShapeProps, 't'>) {
  const rx = width / 2;
  const ry = Math.min(7, height * 0.22);
  const cx = x + width / 2;
  return (
    <g>
      <path
        d={`M ${x},${y + ry} L ${x},${y + height - ry} A ${rx},${ry} 0 0 0 ${x + width},${y + height - ry} L ${x + width},${y + ry}`}
        fill={`${color}18`}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <ellipse cx={cx} cy={y + height - ry} rx={rx} ry={ry} fill={`${color}12`} stroke={color} strokeWidth={strokeWidth} />
      <ellipse cx={cx} cy={y + ry} rx={rx} ry={ry} fill={`${color}30`} stroke={color} strokeWidth={strokeWidth} />
      {/* Label sits in the cylinder's straight-walled midsection, clear of
          both ellipse arcs (each spans +/-ry from its center) -- placing it
          at height/2 + a large offset previously put it inside the bottom
          ellipse's own vertical extent, rendering as text crossed out by
          the ellipse's stroke. +3 is a small optical-centering nudge for
          the text baseline, not a collision risk: the straight section
          alone (2*ry tall on each end excluded) is height - 4*ry, comfortably
          bigger than the ~9px this text needs at every cylinder height used
          on this site. */}
      <text x={cx} y={y + height / 2 + 3} textAnchor="middle" fontSize={8.5} fontWeight={600} fill={color}>
        {label}
      </text>
    </g>
  );
}

/** Circle: a SCORING / computation step -- something that produces a
 * number from what came before it, not a stage that itself holds data. */
export function CircleNode({ x, y, width, label, color, t, strokeWidth = 2 }: Omit<ShapeProps, 'height'>) {
  const r = width / 2;
  const cx = x + r;
  const cy = y + r;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={t.surface} stroke="none" />
      <SketchEllipse cx={cx} cy={cy} width={width} height={width} color={color} strokeWidth={strokeWidth} id={`circle-node-${x}-${y}`} />
      <text x={cx} y={cy + 3} textAnchor="middle" fontSize={8} fontWeight={700} fontFamily={HAND_FONT} fill={color}>
        {label}
      </text>
    </g>
  );
}

/** Distinct final-output box -- always this shape+treatment for "the
 * number the whole pipeline was built to produce," never reused for an
 * intermediate step. */
export function OutputNode({ x, y, width, height, label, color, strokeWidth = 2.5 }: Omit<ShapeProps, 't'>) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6} fill={`${color}30`} stroke="none" />
      <SketchRect x={x} y={y} width={width} height={height} color={color} strokeWidth={strokeWidth} id={`output-node-${x}-${y}`} />
      <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fontSize={9.5} fontWeight={700} fontFamily={HAND_FONT} fill={color}>
        {label}
      </text>
    </g>
  );
}

export function FlowArrow({
  x1,
  y1,
  x2,
  y2,
  color,
  markerId,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  markerId: string;
}) {
  // markerId is kept in the prop signature so every existing call site
  // (6 consumer diagrams) stays unchanged -- SketchArrow draws its own
  // hand-drawn arrowhead and ignores it. Callers still safely render their
  // own <ArrowMarker id={markerId} .../> inside <defs>; it's just unused
  // dead markup now, not a conflict.
  return <SketchArrow points={[[x1, y1], [x2, y2]]} color={color} strokeWidth={1.5} id={`flow-arrow-${markerId}-${x1}-${y1}-${x2}-${y2}`} />;
}

export function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill={color} />
    </marker>
  );
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The point where a straight line between two boxes' centers crosses THIS
 * box's own perimeter, facing the other box -- never the box's own center,
 * where the label text sits. Use for both ends of any connector between
 * two shapes so a line can never be drawn starting or landing on top of a
 * label, no matter how the boxes are arranged relative to each other. */
export function edgePoint(box: Box, towardX: number, towardY: number): { x: number; y: number } {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = box.w / 2;
  const hh = box.h / 2;
  const t = Math.min(dx !== 0 ? hw / Math.abs(dx) : Infinity, dy !== 0 ? hh / Math.abs(dy) : Infinity);
  return { x: cx + dx * t, y: cy + dy * t };
}

/** The full segment between two boxes, clipped at both boxes' own
 * perimeters so it never enters either one's interior. */
export function edgeToEdge(a: Box, b: Box) {
  const bCenter = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const aCenter = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  return { from: edgePoint(a, bCenter.x, bCenter.y), to: edgePoint(b, aCenter.x, aCenter.y) };
}
