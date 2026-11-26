export interface DeploymentStageInput {
  name: string;
  interactions: number;
}

export interface DeploymentStageResult extends DeploymentStageInput {
  stageProbability: number;
  cumulativeProbability: number;
  cumulativeInteractions: number;
  expectedIssues: number;
  expectedIssuesCumulative: number;
}

/** Chance of seeing at least one independent issue across n interactions. */
export function detectionProbability(issueRate: number, interactions: number): number {
  const p = Math.max(0, Math.min(1, issueRate));
  const n = Math.max(0, Math.round(interactions));
  if (p === 1) return n > 0 ? 1 : 0;
  return -Math.expm1(n * Math.log1p(-p));
}

export function analyzeDeploymentStages(
  issueRate: number,
  stages: readonly DeploymentStageInput[],
): DeploymentStageResult[] {
  let cumulativeInteractions = 0;
  return stages.map((stage) => {
    const interactions = Math.max(0, Math.round(stage.interactions));
    cumulativeInteractions += interactions;
    return {
      ...stage,
      interactions,
      stageProbability: detectionProbability(issueRate, interactions),
      cumulativeProbability: detectionProbability(issueRate, cumulativeInteractions),
      cumulativeInteractions,
      expectedIssues: issueRate * interactions,
      expectedIssuesCumulative: issueRate * cumulativeInteractions,
    };
  });
}

export function explainDeploymentStage(
  stage: DeploymentStageResult,
  index: number,
  total: number,
): string {
  return `Stage ${index + 1} of ${total}, ${stage.name}: ${stage.interactions.toLocaleString('en-US')} new interactions bring cumulative detection odds to ${(stage.cumulativeProbability * 100).toFixed(1)}%; pausing here caps the observed rollout at ${stage.cumulativeInteractions.toLocaleString('en-US')} interactions.`;
}
