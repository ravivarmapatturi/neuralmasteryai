import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../primitives';

// Numbers from the Agent Skills spec as quoted in the post: ~100 tokens per
// name+description, a SKILL.md body kept under ~5,000 tokens.
const DESCRIPTION_TOKENS = 100;
const BODY_TOKENS = 5000;
const CONTEXT_WINDOW = 200_000;

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n));

export default function SkillContextBudget() {
  const t = useVizTokens();
  const [skills, setSkills] = useState(50);
  const allUpFront = skills * BODY_TOKENS;
  const progressive = skills * DESCRIPTION_TOKENS + BODY_TOKENS; // descriptions + the one skill in use
  const maxScale = Math.max(allUpFront, CONTEXT_WINDOW) * 1.05;
  const W = 520, barX = 150, barW = W - barX - 20;
  const x = (tokens: number) => barX + (tokens / maxScale) * barW;
  const overflow = allUpFront > CONTEXT_WINDOW;

  return (
    <VisualizationContainer
      title="Context budget"
      footer={`With ${skills} skills, loading every instruction up front costs ${fmt(allUpFront)} tokens on every call${overflow ? ', more than a 200k-token context window holds' : ''}. Progressive disclosure costs ${fmt(progressive)}: all descriptions plus the one skill in use. Token counts are the spec's guideline sizes, not measurements.`}
    >
      <VisualizationHeader
        eyebrow="TRY IT"
        title="How many tokens does an agent carry before it starts working?"
        description="Drag the slider to give the agent more skills. Watch which approach still fits in the context window."
      />
      <label style={{ display: 'block', margin: '0.5rem 0 1rem', color: t.textPrimary }}>
        Skills installed: <strong>{skills}</strong>
        <input aria-label="Number of skills installed" type="range" min={1} max={100} value={skills} onChange={e => setSkills(Number(e.target.value))} style={{ display: 'block', width: '100%' }} />
      </label>
      <svg viewBox={`0 0 ${W} 170`} width="100%" role="img" aria-label={`${skills} skills: ${fmt(allUpFront)} tokens if everything is loaded up front, ${fmt(progressive)} tokens with progressive disclosure.`}>
        {/* context window marker */}
        <line x1={x(CONTEXT_WINDOW)} y1={12} x2={x(CONTEXT_WINDOW)} y2={150} stroke={t.textSecondary} strokeWidth={1.5} strokeDasharray="4 4" />
        <text x={x(CONTEXT_WINDOW)} y={164} textAnchor="middle" fontSize={12} fill={t.textSecondary}>200k context window</text>

        <text x={0} y={52} fontSize={13} fill={t.textPrimary}>Everything up front</text>
        <rect x={barX} y={36} width={Math.max(2, x(allUpFront) - barX)} height={26} rx={4} fill={overflow ? t.accentDanger : t.accentSecondary} />
        <text x={Math.min(x(allUpFront) + 6, W - 4)} y={54} textAnchor={x(allUpFront) + 60 > W ? 'end' : 'start'} fontSize={13} fontWeight={700} fill={t.textPrimary}>{fmt(allUpFront)}</text>

        <text x={0} y={112} fontSize={13} fill={t.textPrimary}>Progressive disclosure</text>
        <rect x={barX} y={96} width={Math.max(2, x(skills * DESCRIPTION_TOKENS) - barX)} height={26} rx={4} fill={t.accentPrimary} />
        <rect x={x(skills * DESCRIPTION_TOKENS)} y={96} width={Math.max(2, x(progressive) - x(skills * DESCRIPTION_TOKENS))} height={26} rx={4} fill={t.accentTeal} />
        <text x={x(progressive) + 6} y={114} fontSize={13} fontWeight={700} fill={t.textPrimary}>{fmt(progressive)}</text>
        <text x={barX} y={138} fontSize={11} fill={t.textSecondary}>descriptions ({fmt(skills * DESCRIPTION_TOKENS)}) + one skill body (5k)</text>
      </svg>
    </VisualizationContainer>
  );
}
