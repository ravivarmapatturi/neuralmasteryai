import source from './interviewCatalog.generated.json';
export interface InterviewQuestion {
  id: string; bank: string; area: string; section?: string; title: string; context: string;
  criteria: string[]; answer: string; followup: string; sourceRoute?: string;
  kind: 'explanation' | 'choice' | 'calculation';
  options?: { text: string; why: string }[]; correctOption?: number;
  numericAnswer?: number; tolerance?: number; unit?: string;
}
export const bankQuestions = source.questions as InterviewQuestion[];
export const interviewGuides = source.guides;
