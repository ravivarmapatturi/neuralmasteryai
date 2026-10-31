export interface InterviewReview {
  model: string;
  criteria: { criterion: string; probability: number }[];
}
export async function requestInterviewReview(endpoint: string, question: string, answer: string, criteria: string[], signal?: AbortSignal): Promise<InterviewReview> {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, answer, criteria }), signal });
  if (!response.ok) throw new Error('Review service unavailable. Your answer is still here; use the checklist below.');
  const result = await response.json();
  if (typeof result.model !== 'string' || !Array.isArray(result.criteria) || result.criteria.length !== criteria.length || result.criteria.some((item: { criterion: string; probability: number }, i: number) => item.criterion !== criteria[i] || typeof item.probability !== 'number' || !Number.isFinite(item.probability) || item.probability < 0 || item.probability > 1)) throw new Error('Review service returned an invalid result. Use the checklist below.');
  return result;
}
