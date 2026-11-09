import type { PointResult } from './answerJudge';

// Prefer a follow-up sharing substantive terms with an undetected point. This
// is a routing heuristic, not another correctness check; ties keep bank order.
const words = (text: string) => new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
  .filter(word => word.length > 3 && !new Set(['that', 'this', 'with', 'from', 'what', 'when', 'would', 'does', 'which', 'have', 'your', 'explain', 'their', 'than', 'will', 'into']).has(word))
  .map(word => word.replace(/(?:ing|es|s)$/, '')));
export function selectInterviewFollowUp(followUps: string[], points: PointResult[] = []): string | undefined {
  const targets = points.filter(point => point.verdict !== 'covered').map(point => words(point.point));
  let best = followUps[0];
  let bestScore = 0;
  for (const followUp of followUps) {
    const terms = words(followUp);
    const score = Math.max(0, ...targets.map(target => [...terms].filter(term => target.has(term)).length));
    if (score > bestScore) { best = followUp; bestScore = score; }
  }
  // Some source banks append expected answers; ask only the prompt.
  return best?.replace(/^Level \d+:\s*/i, '').split(/\s+Expected:/i)[0].trim();
}
