import { useMemo, useState } from 'react';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';
import { useVizTokens } from '../../theme/vizTokens';
import { PillSelect, Slider, VisualizationContainer, VisualizationHeader, usePrefersReducedMotion } from '../primitives';
import {
  buildPrunedSkillPath,
  ROLES,
  SKILL_MODULES,
  type RoleId,
} from './rolePathBuilder';
import './playgroundTools.css';

const DAG_COORDS: Record<string, { x: number; y: number }> = {
  cs: { x: 40, y: 30 },
  python: { x: 40, y: 120 },
  math: { x: 40, y: 210 },
  ml: { x: 245, y: 195 },
  dl: { x: 245, y: 105 },
  'llm-rag': { x: 445, y: 105 },
  serving: { x: 445, y: 25 },
  agents: { x: 445, y: 195 },
  'eval-safety': { x: 445, y: 270 },
};

const NODE_W = 165;
const NODE_H = 54;

export default function RolePathBuilder() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const [roleId, setRoleId] = useState<RoleId>('ai-engineer');
  const [weeklyHours, setWeeklyHours] = useState(8);
  const [known, setKnown] = useState<string[]>(['cs', 'python']);

  const knownSet = useMemo(() => new Set(known), [known]);
  const plan = useMemo(
    () => buildPrunedSkillPath(roleId, knownSet, weeklyHours),
    [roleId, knownSet, weeklyHours],
  );

  const requiredIds = useMemo(() => new Set(plan.nodes.map((n) => n.module.id)), [plan.nodes]);

  const toggleKnown = (id: string) => {
    setKnown((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <VisualizationContainer
      title="Role-Based Skill Gap & Path Builder"
      footer={`${plan.role.label}: ${plan.remainingModules.length} of ${plan.nodes.length} required modules remain (${plan.remainingHours} study hours, ~${plan.estimatedWeeks} week${plan.estimatedWeeks === 1 ? '' : 's'} at ${weeklyHours} hr/wk).`}
    >
      <div className={`nm-pg${reducedMotion ? ' nm-pg--reduced-motion' : ''}`}>
        <VisualizationHeader
          eyebrow="Prerequisite DAG planner"
          title="Prune what you already know from your target track"
          description="Pick an engineering role, mark completed foundations, and adjust weekly study hours to see the shortest prerequisite path forward."
        />

        <div className="nm-pg__controls" style={{ marginBottom: '1rem' }}>
          <PillSelect<RoleId>
            label="Target role"
            value={roleId}
            onChange={setRoleId}
            options={ROLES.map((r) => ({ value: r.id, label: r.label }))}
          />
          <p className="nm-pg__sub" style={{ margin: 0 }}>{plan.role.summary}</p>

          <div className="nm-pg__grid-equal">
            <div>
              <Slider
                label="Weekly study hours"
                value={weeklyHours}
                onChange={setWeeklyHours}
                min={2}
                max={30}
                step={1}
                format={(v) => `${v} hrs/week`}
              />
            </div>

            <div>
              <div style={{ fontSize: 14, color: t.textSecondary, marginBottom: 6 }}>
                Already known modules (click to toggle)
              </div>
              <div className="nm-pg__checks" role="group" aria-label="Known skill modules">
                {SKILL_MODULES.map((mod) => {
                  const pressed = knownSet.has(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      className="nm-pg__chip-btn"
                      aria-pressed={pressed}
                      onClick={() => toggleKnown(mod.id)}
                    >
                      {pressed ? '✓ ' : ''}{mod.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="nm-pg__kpis" aria-label="Study plan metrics">
          <div className="nm-pg__kpi">
            Required role hours
            <strong>{plan.totalHoursForRole} hrs</strong>
          </div>
          <div className="nm-pg__kpi nm-pg__kpi--good">
            Hours saved by pruning
            <strong>{plan.savedHours} hrs</strong>
          </div>
          <div className="nm-pg__kpi">
            Remaining study hours
            <strong>{plan.remainingHours} hrs</strong>
          </div>
          <div className="nm-pg__kpi">
            Estimated completion
            <strong>{plan.estimatedWeeks} wks</strong>
          </div>
        </div>

        <div className="nm-pg__grid-2">
          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Pruned dependency DAG</h3>
            <svg
              viewBox="0 0 650 350"
              width="100%"
              role="img"
              aria-label={`Skill dependency graph for ${plan.role.label} showing ${plan.remainingModules.length} remaining modules`}
            >
              {SKILL_MODULES.map((mod) =>
                mod.prereqs.map((pre) => {
                  const from = DAG_COORDS[pre];
                  const to = DAG_COORDS[mod.id];
                  if (!from || !to) return null;
                  const activeEdge = requiredIds.has(mod.id) && requiredIds.has(pre);
                  return (
                    <g key={`${pre}-${mod.id}`} opacity={activeEdge ? 0.9 : 0.18}>
                      <SketchArrow
                        points={[
                          [from.x + NODE_W, from.y + NODE_H / 2],
                          [to.x - 4, to.y + NODE_H / 2],
                        ]}
                        color={activeEdge ? t.textSecondary : t.border}
                        strokeWidth={activeEdge ? 1.5 : 1}
                        id={`dag-e-${pre}-${mod.id}`}
                      />
                    </g>
                  );
                }),
              )}

              {SKILL_MODULES.map((mod) => {
                const pos = DAG_COORDS[mod.id];
                if (!pos) return null;
                const node = plan.nodes.find((n) => n.module.id === mod.id);
                const status = node ? node.status : 'skipped';
                const stroke =
                  status === 'known'
                    ? t.accentPrimary
                    : status === 'ready'
                      ? t.accentSecondary
                      : status === 'queued'
                        ? t.accentWarn
                        : t.border;
                const labelText =
                  status === 'known'
                    ? 'Known (pruned)'
                    : status === 'ready'
                      ? `Ready · ${mod.hours}h`
                      : status === 'queued'
                        ? `Blocked · ${mod.hours}h`
                        : 'Optional for role';
                return (
                  <g
                    key={mod.id}
                    opacity={node ? 1 : 0.35}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Toggle ${mod.label} known state`}
                    onClick={() => toggleKnown(mod.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleKnown(mod.id);
                      }
                    }}
                  >
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={NODE_W}
                      height={NODE_H}
                      rx={8}
                      fill={status === 'ready' ? t.surfaceAlt : t.background}
                    />
                    <SketchRect
                      x={pos.x}
                      y={pos.y}
                      width={NODE_W}
                      height={NODE_H}
                      color={stroke}
                      strokeWidth={status === 'ready' ? 2.4 : 1.4}
                      id={`dag-n-${mod.id}`}
                    />
                    <text x={pos.x + 12} y={pos.y + 22} fontSize={14} fontWeight={700} fill={t.textPrimary}>
                      {mod.label}
                    </text>
                    <text x={pos.x + 12} y={pos.y + 42} fontSize={13} fill={stroke}>
                      {labelText}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Ordered study queue</h3>
            {plan.remainingModules.length === 0 ? (
              <p className="nm-pg__sub">
                All modules for {plan.role.label} are marked known. Uncheck any module to review its Learn track or switch roles above.
              </p>
            ) : (
              <ol className="nm-pg__list" style={{ paddingLeft: '1.2rem' }}>
                {plan.nodes
                  .filter((n) => n.status !== 'known')
                  .map((n) => (
                    <li key={n.module.id} style={{ marginBottom: '0.65rem' }}>
                      <strong style={{ color: t.textPrimary }}>{n.module.label}</strong> ({n.module.hours}h) —{' '}
                      <span className={`nm-pg__badge ${n.status === 'ready' ? 'nm-pg__badge--good' : 'nm-pg__badge--warn'}`}>
                        {n.status === 'ready' ? 'Ready now' : 'Waiting on prerequisites'}
                      </span>
                      <div>
                        <a className="nm-pg__link" href={n.module.learnPath}>
                          {n.module.learnTitle} →
                        </a>
                      </div>
                    </li>
                  ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
