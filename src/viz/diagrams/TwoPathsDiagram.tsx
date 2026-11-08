import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

/** Both paths start from the same point in (w,b)-space and land on the
 * exact same global minimum -- J's convexity guarantees there's only one
 * to find. The normal equation gets there in a single jump; gradient
 * descent gets there iteratively, one step at a time. */
export default function TwoPathsDiagram() {
  const t = useVizTokens();
  const [show, setShow] = useState<'both' | 'normal' | 'gd'>('both');
  const normalColor = t.accentSecondary;
  const gdColor = t.accentWarn;

  const width = 420;
  const height = 260;
  const cx = width / 2;
  const cy = height / 2 + 10;
  const startX = cx - 140;
  const startY = cy - 90;

  // A few illustrative GD hops from start toward the minimum -- a realistic
  // zigzag (elongated contours mean the gradient rarely points straight at
  // the minimum) with decaying step size, kept visually distinct from the
  // normal equation's direct line rather than nearly retracing it.
  const gdPoints = [
    { x: startX, y: startY },
    { x: startX + 70, y: startY + 8 },
    { x: startX + 108, y: startY + 40 },
    { x: startX + 128, y: startY + 68 },
    { x: cx, y: cy },
  ];

  return (
    <VisualizationContainer footer="Both paths start in the same place and land on the identical minimum -- convexity guarantees there's only one to find. The difference is entirely in how they get there, not where they end up.">
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
        <VizButton variant={show === 'both' ? 'primary' : 'secondary'} onClick={() => setShow('both')}>Both</VizButton>
        <VizButton variant={show === 'normal' ? 'primary' : 'secondary'} onClick={() => setShow('normal')}>Normal Equation</VizButton>
        <VizButton variant={show === 'gd' ? 'primary' : 'secondary'} onClick={() => setShow('gd')}>Gradient Descent</VizButton>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="tp-arrow-normal" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={normalColor} />
          </marker>
          <marker id="tp-arrow-gd" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={gdColor} />
          </marker>
        </defs>

        {/* contour ellipses -- level sets of the convex cost surface */}
        {[1, 0.72, 0.48, 0.28, 0.12].map((s, i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={150 * s} ry={95 * s} fill="none" stroke={t.border} strokeWidth={1} />
        ))}
        <text x={cx + 152} y={cy + 4} fontSize={9} fill={t.textMuted}>J(w,b) contours</text>

        {(show === 'both' || show === 'normal') && (
          <line x1={startX} y1={startY} x2={cx - 11} y2={cy - 7} stroke={normalColor} strokeWidth={2.5} markerEnd="url(#tp-arrow-normal)" />
        )}

        {(show === 'both' || show === 'gd') &&
          gdPoints.slice(0, -1).map((p, i) => {
            const next = gdPoints[i + 1];
            const dx = next.x - p.x;
            const dy = next.y - p.y;
            const dist = Math.hypot(dx, dy);
            const trim = i === gdPoints.length - 2 ? 12 : 6;
            const x2 = dist > trim ? next.x - (dx / dist) * trim : next.x;
            const y2 = dist > trim ? next.y - (dy / dist) * trim : next.y;
            return <line key={i} x1={p.x} y1={p.y} x2={x2} y2={y2} stroke={gdColor} strokeWidth={2} markerEnd="url(#tp-arrow-gd)" />;
          })}
        {(show === 'both' || show === 'gd') &&
          gdPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={gdColor} />)}

        <circle cx={startX} cy={startY} r={5} fill={t.textSecondary} stroke={t.surface} strokeWidth={1.5} />
        <text x={startX - 8} y={startY - 10} textAnchor="middle" fontSize={9} fill={t.textMuted}>start (w₀, b₀)</text>

        <circle cx={cx} cy={cy} r={6} fill={t.accentPrimary} stroke={t.surface} strokeWidth={2} />
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize={9} fontWeight={700} fill={t.accentPrimary}>global minimum</text>
      </svg>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 4, fontSize: DIAGRAM_TYPE.caption.size }}>
        <span style={{ color: normalColor, fontWeight: 700 }}>— Normal equation: one jump, O(d³)</span>
        <span style={{ color: gdColor, fontWeight: 700 }}>— Gradient descent: iterative, O(nd) per step</span>
      </div>
    </VisualizationContainer>
  );
}
