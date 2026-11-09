import { describe, it, expect, beforeEach } from 'vitest';
import { attemptsKey, compareAttempts, mergeInterviewAttempts, readInterviewAttempts, MAX_ATTEMPT_BYTES, type InterviewAttempt } from './interviewAttempts';
import { collectProgress, restoreProgress } from './progressExport';
const attempt = (id: string, time = 1, questionId = 'q'): InterviewAttempt => ({ id, time, questionId, transcript: 'My answer', source: 'rubric', status: 'checked', points: [{ point: 'One claim', verdict: 'covered', confidence: 90 }] });
beforeEach(() => localStorage.clear());
describe('attempt history', () => {
  it('merges by id commutatively, keeping the checked version over a draft', () => {
    const checked = attempt('a'); const draft = { ...checked, status: 'unchecked' as const, points: [] };
    expect(mergeInterviewAttempts([checked], [draft])).toEqual([checked]);
    expect(mergeInterviewAttempts([draft], [checked])).toEqual([checked]);
    const b = attempt('b', 2);
    expect(mergeInterviewAttempts([b,checked], [draft,b])).toEqual([checked,b]);
  });
  it('keeps final transcription over a draft even when text sorts earlier', () => {
    const draft = { ...attempt('a'), status: 'unchecked' as const, revision: 0, transcript: 'Zebra partial' };
    const final = { ...draft, revision: 1, transcript: 'A corrected final transcript' };
    expect(mergeInterviewAttempts([final], [draft])[0].transcript).toBe(final.transcript);
  });
  it('bounds question count, global count, transcript length and encoded byte size', () => {
    expect(mergeInterviewAttempts(Array.from({length:20},(_,i)=>attempt(String(i),i)))).toHaveLength(10);
    const rows = Array.from({length:150},(_,i)=>({...attempt(String(i),i,String(i)),transcript:'界'.repeat(9000)}));
    const bounded = mergeInterviewAttempts(rows);
    expect(bounded.length).toBeLessThanOrEqual(100);
    expect(bounded.at(-1)?.id).toBe('149');
    expect(bounded.every(a=>a.transcript.length<=4000)).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(bounded)).length).toBeLessThanOrEqual(MAX_ATTEMPT_BYTES);
  });
  it('rejects corrupt records and isolates account and guest storage', () => {
    localStorage.setItem(attemptsKey(), '{broken');
    expect(readInterviewAttempts()).toEqual([]);
    localStorage.setItem(attemptsKey('a'), JSON.stringify([attempt('a'), {id:'bad'}, {...attempt('bad-time'),time:1e30}]));
    expect(readInterviewAttempts('a')).toEqual([attempt('a')]);
    expect(readInterviewAttempts('b')).toEqual([]);
  });
  it('compares gains and losses only for matching, checked rubrics', () => {
    const a = attempt('a');
    const b = {...attempt('b'), points: [{...a.points[0],verdict:'missed' as const}]};
    expect(compareAttempts(a,b)).toEqual({comparable:true,gained:[],lost:['One claim']});
    expect(compareAttempts(b,a).gained).toEqual(['One claim']);
    expect(compareAttempts(a,{...b,status:'failed'}).comparable).toBe(false);
    expect(compareAttempts(a,{...b,points:[]} ).comparable).toBe(false);
  });
  it('includes complete attempts in JSON export and restore', () => {
    localStorage.setItem(attemptsKey('user'),JSON.stringify([attempt('a')]));
    const exported = collectProgress();
    localStorage.clear();
    expect(restoreProgress(JSON.stringify(exported))).toBe(1);
    expect(readInterviewAttempts('user')).toEqual([attempt('a')]);
  });
});
