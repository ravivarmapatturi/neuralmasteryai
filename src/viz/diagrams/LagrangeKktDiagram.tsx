import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { constrainedSolution } from '../lib/calculus';

type Mode = 'active' | 'inactive';
// minimize x^2+y^2 s.t. x+y <= target. Unconstrained min is (0,0), which
// satisfies x+y<=target whenever target>=0 -- constraint INACTIVE. Push
// target negative and the unconstrained min violates it -- constraint
// becomes ACTIVE, and the real solution moves onto the boundary line.
const TARGETS: Record<Mode, number> = { active: -2, inactive: 2 };

const MODES: Mode[] = ['active', 'inactive'];

export default function LagrangeKktDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(MODES.length, 3400);
  const [userMode, setUserMode] = useState<Mode | null>(null);
  const mode = userMode ?? MODES[autoIdx];
  const target = TARGETS[mode];
  const unconstrainedMin: [number, number] = [0, 0];
  const violatesConstraint = unconstrainedMin[0] + unconstrainedMin[1] > target;
  const solution = useMemo(() => (violatesConstraint ? constrainedSolution(target) : { x: 0, y: 0, lambda: 0 }), [target, violatesConstraint]);

  const width = 280, height = 280, scale = 45, ox = width / 2, oy = height / 2;
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy - y * scale;

  const grid = useMemo(() => {
    const cells: { x: number; y: number; v: number }[] = [];
    for (let x = -3; x <= 3; x += 0.25) for (let y = -3; y <= 3; y += 0.25) cells.push({ x, y, v: x * x + y * y });
    return cells;
  }, []);
  const maxV = Math.max(...grid.map((c) => c.v));

  return (
    <VisualizationContainer footer={
      violatesConstraint
        ? `Constraint ACTIVE: the unconstrained minimum (0,0) violates x+y ≤ ${target}, so the real solution sits exactly ON the boundary at (${solution.x.toFixed(2)}, ${solution.y.toFixed(2)}), with a real λ=${solution.lambda.toFixed(2)} > 0 -- complementary slackness's "constraint tight, multiplier nonzero" case.`
        : `Constraint INACTIVE: the unconstrained minimum (0,0) already satisfies x+y ≤ ${target}, so the constraint contributes nothing -- real λ=0, complementary slackness's "constraint slack, multiplier zero" case. This is exactly why non-support-vector points don't affect an SVM's decision boundary.`
    }>
      <PillSelect label="Constraint state" value={mode} onChange={(v) => setUserMode(v as Mode)} options={[
        { value: 'active', label: 'Active (binding)' },
        { value: 'inactive', label: 'Inactive (slack)' },
      ]} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 280, margin: '8px auto 0' }}>
        {grid.map((c, i) => <rect key={i} x={px(c.x) - 6} y={py(c.y) - 6} width={13} height={13} fill={t.accentSecondary} fillOpacity={(1 - c.v / maxV) * 0.4} />)}
        {/* constraint boundary line x+y=target */}
        <line x1={px(target - 3)} y1={py(3)} x2={px(target + 3)} y2={py(-3)} stroke={t.accentWarn} strokeWidth={2} />
        <circle cx={px(0)} cy={py(0)} r={4} fill="none" stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="2 2" />
        <circle cx={px(solution.x)} cy={py(solution.y)} r={6} fill={violatesConstraint ? t.accentDanger : t.accentPrimary} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        Blue shading = objective x²+y² (darker = smaller). Amber line = constraint boundary. Dashed circle = unconstrained minimum. Filled dot = the real constrained solution.
      </div>
    </VisualizationContainer>
  );
}
