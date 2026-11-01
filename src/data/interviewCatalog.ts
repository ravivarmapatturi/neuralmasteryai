import source from './interviewCatalog.generated.json';
import criteriaOverrides from './interviewCriteria.json';
export interface InterviewQuestion {
  id: string; bank: string; area: string; section?: string; title: string; context: string;
  criteria: string[]; answer: string; followup: string; sourceRoute?: string;
  kind: 'explanation' | 'choice' | 'calculation';
  options?: { text: string; why: string }[]; correctOption?: number;
  numericAnswer?: number; tolerance?: number; unit?: string;
  /** True once the question has hand-written, question-specific criteria. */
  specificCriteria?: boolean;
}
type Override = { criteria: string[]; followup?: string };
const overrides = criteriaOverrides as unknown as Record<string, Override>;
export const bankQuestions = (source.questions as InterviewQuestion[]).map(q => {
  const o = overrides[q.id];
  return o ? { ...q, criteria: o.criteria, followup: o.followup ?? q.followup, specificCriteria: true } : q;
});
export const interviewGuides = source.guides;
