import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';

const STAGES = [
  { label: '1. Foundations', href: '/docs/harness-engineering/overview', desc: 'The core cybernetic loop: Agent = Model + Harness. Why prompt engineering fails.' },
  { label: '2. Sandboxing', href: '/docs/harness-engineering/harness-architecture', desc: 'Bubblewrap & gVisor isolation, process groups, and syscall boundaries.' },
  { label: '3. Verification', href: '/docs/harness-engineering/verification-loops', desc: '3-layer deterministic gate eliminating premature victory.' },
  { label: '4. Context & AST', href: '/docs/harness-engineering/context-and-instruction-design', desc: 'AST code compression, repository mapping, and cache alignment.' },
  { label: '5. State & Loops', href: '/docs/harness-engineering/state-continuity-and-memory', desc: 'Atomic JSON persistence, worktree isolation, and supervisor loops.' },
];

export default function HarnessCurriculumDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState(0);
  const color = t.accentPrimary;
  const width = 640;
  const stepX = (i: number) => 55 + i * ((width - 110) / (STAGES.length - 1));
  const y = 40;

  return (
    <VisualizationContainer title="Harness Engineering Curriculum Map" footer={STAGES[active].desc}>
      <svg width="100%" viewBox={`0 0 ${width} 90`} style={{ display: 'block' }} role="img" aria-label="Harness Curriculum Track Diagram">
        <defs>
          <marker id="harness-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STAGES.map((_, i) => i > 0 && (
          <line key={i} x1={stepX(i - 1) + 38} y1={y} x2={stepX(i) - 38} y2={y} stroke={t.border} strokeWidth={1.5} markerEnd="url(#harness-arrow)" />
        ))}
        {STAGES.map((p, i) => {
          const isActive = active === i;
          return (
            <g key={p.label} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} style={{ cursor: 'pointer' }}>
              <circle cx={stepX(i)} cy={y} r={34} fill={isActive ? `${color}25` : t.surfaceAlt} stroke={isActive ? color : t.border} strokeWidth={isActive ? 2.5 : 1.5} />
              <text x={stepX(i)} y={y + 4} textAnchor="middle" fontSize={8} fontWeight={700} fill={isActive ? color : t.textPrimary}>{p.label}</text>
              <text x={stepX(i)} y={y + 46} textAnchor="middle" fontSize={9} fill={t.textSecondary}>Stage {i + 1}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: 11, color: t.textSecondary, marginTop: 4 }}>
        Click any stage to view its learning goals and architectural prerequisites.
      </div>
    </VisualizationContainer>
  );
}
