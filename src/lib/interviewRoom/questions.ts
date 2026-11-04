import rawQuestions from '../../data/interviewRoomQuestions.json';
import type { InterviewRoomQuestion } from './types';

// Raw content notes: Core questions and rubrics are AI-written and not expert-reviewed.
export const interviewRoomQuestions: InterviewRoomQuestion[] = (rawQuestions as any).questions;
export const spokenTransitions: string[] = (rawQuestions as any).spoken_transitions || [];

export function getQuestionById(id: string): InterviewRoomQuestion | undefined {
  return interviewRoomQuestions.find(q => q.id === id);
}

export function getDefaultQuestion(): InterviewRoomQuestion {
  return interviewRoomQuestions[0];
}

/**
 * Select questions for a session:
 * - Default: 4 questions (20 min), or 2 questions for short length (10 min).
 * - Rotates through the 20-question pool across sessions so consecutive sessions vary.
 * - If seedQuestionId is provided (e.g. via ?q= param), guarantees that question is first.
 */
export function pickSessionQuestions(
  pool: InterviewRoomQuestion[] = interviewRoomQuestions,
  count: number = 4,
  sessionIndex: number = 0,
  seedQuestionId?: string
): InterviewRoomQuestion[] {
  if (!pool || pool.length === 0) return [];
  if (pool.length <= count) return [...pool];

  if (seedQuestionId) {
    const seedQ = pool.find(q => q.id === seedQuestionId);
    if (seedQ) {
      const remaining = pool.filter(q => q.id !== seedQuestionId);
      const offset = (Math.max(0, sessionIndex) * (count - 1)) % remaining.length;
      const picked: InterviewRoomQuestion[] = [seedQ];
      for (let i = 0; i < count - 1; i++) {
        picked.push(remaining[(offset + i) % remaining.length]);
      }
      return picked;
    }
  }

  const offset = (Math.max(0, sessionIndex) * count) % pool.length;
  const picked: InterviewRoomQuestion[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(pool[(offset + i) % pool.length]);
  }
  return picked;
}
