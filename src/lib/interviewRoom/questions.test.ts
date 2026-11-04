import { describe, it, expect } from 'vitest';
import {
  interviewRoomQuestions,
  spokenTransitions,
  pickSessionQuestions,
  getQuestionById,
  getDefaultQuestion,
} from './questions';

describe('Interview Room Questions & Session Selection', () => {
  it('loads all 20 questions and 5 transitions', () => {
    expect(interviewRoomQuestions.length).toBe(20);
    expect(spokenTransitions.length).toBe(5);
  });

  it('provides valid default question', () => {
    const q = getDefaultQuestion();
    expect(q).toBeDefined();
    expect(q.id).toBe('genai-fm-fundamentals');
    expect(q.points.length).toBe(4);
  });

  it('retrieves questions by id', () => {
    const q = getQuestionById('genai-rag-vs-finetuning');
    expect(q).toBeDefined();
    expect(q?.title).toContain('Retrieval-Augmented Generation');
  });

  it('picks 4 questions by default (20 min session)', () => {
    const picked = pickSessionQuestions(interviewRoomQuestions, 4, 0);
    expect(picked.length).toBe(4);
    const ids = picked.map(q => q.id);
    expect(new Set(ids).size).toBe(4);
  });

  it('picks 2 questions for short length (10 min session)', () => {
    const picked = pickSessionQuestions(interviewRoomQuestions, 2, 0);
    expect(picked.length).toBe(2);
    const ids = picked.map(q => q.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('varies questions between sessions', () => {
    const session0 = pickSessionQuestions(interviewRoomQuestions, 4, 0);
    const session1 = pickSessionQuestions(interviewRoomQuestions, 4, 1);
    const ids0 = session0.map(q => q.id);
    const ids1 = session1.map(q => q.id);
    expect(ids0).not.toEqual(ids1);
  });

  it('guarantees seed question is first if specified', () => {
    const seed = 'genai-lora-production-serving';
    const picked = pickSessionQuestions(interviewRoomQuestions, 4, 0, seed);
    expect(picked.length).toBe(4);
    expect(picked[0].id).toBe(seed);
    const ids = picked.map(q => q.id);
    expect(new Set(ids).size).toBe(4);
  });
});
