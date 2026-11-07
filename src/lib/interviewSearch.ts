export interface InterviewHit { id: string; title: string; area: string }

let index: Promise<InterviewHit[]> | null = null;

/** Interview questions whose title or area contains every word of the query. The title list is loaded on first use. */
export async function searchInterviewQuestions(query: string, max = 5): Promise<InterviewHit[]> {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  index ??= import('../data/interviewSearch.generated.json').then((m) => m.default as InterviewHit[]);
  const all = await index;
  return all.filter((q) => { const text = `${q.title} ${q.area}`.toLowerCase(); return words.every((w) => text.includes(w)); }).slice(0, max);
}

export const interviewQuestionRoute = (id: string) => `/interview/questions?id=${encodeURIComponent(id)}`;
