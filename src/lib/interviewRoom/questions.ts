import rawQuestions from '../../data/interviewRoomQuestions.json';
import type { InterviewRoomQuestion } from './types';

// Raw content notes: Core questions and rubrics are AI-written and not expert-reviewed.
export const interviewRoomQuestions: InterviewRoomQuestion[] = (rawQuestions as any).questions;

export function getQuestionById(id: string): InterviewRoomQuestion | undefined {
  return interviewRoomQuestions.find(q => q.id === id);
}

export function getDefaultQuestion(): InterviewRoomQuestion {
  return interviewRoomQuestions[0];
}
