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
  it('compares newly detected points only for matching, checked rubrics', () => {
    const a = attempt('a');
    const b = {...attempt('b'), points: [{...a.points[0],verdict:'missed' as const}]};
    expect(compareAttempts(a,b)).toEqual({comparable:true,gained:[]});
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
it('merges a follow-up independently of a late review in either order', () => {
  const reviewed = {...attempt('a'), revision:2};
  const followUp = {question:'Why use masks?',transcript:'They prevent coadaptation.',status:'saved' as const,revision:4};
  const answered = {...attempt('a'),status:'unchecked' as const,revision:1,points:[],followUp};
  const expected = {...reviewed,followUp};
  expect(mergeInterviewAttempts([answered],[reviewed])).toEqual([expected]);
  expect(mergeInterviewAttempts([reviewed],[answered])).toEqual([expected]);
  const draft = {...answered,followUp:{...followUp,status:'draft' as const,revision:999,transcript:'stale'}};
  expect(mergeInterviewAttempts([expected],[draft])).toEqual([expected]);
});
it('keeps the latest follow-up draft and bounds untrusted follow-up fields', () => {
  const old = {...attempt('a'),followUp:{question:'Q',transcript:'Z partial',status:'draft' as const,revision:1}};
  const next = {...old,followUp:{...old.followUp,transcript:'A corrected draft',revision:2}};
  expect(mergeInterviewAttempts([next],[old])[0].followUp).toEqual(next.followUp);
  const large = {...next,followUp:{...next.followUp,question:'Q'.repeat(5000),transcript:'界'.repeat(9000)}};
  const normalized = mergeInterviewAttempts([large])[0].followUp!;
  expect(normalized.question).toHaveLength(1000);
  expect(normalized.transcript).toHaveLength(4000);
  localStorage.setItem(attemptsKey(),JSON.stringify([next]));
  const backup = collectProgress();localStorage.clear();restoreProgress(JSON.stringify(backup));
  expect(readInterviewAttempts()[0].followUp).toEqual(next.followUp);
});
it('does not let follow-up merging change which main transcript wins', () => {
  const a = {...attempt('a'),transcript:'A main answer',followUp:{question:'Q',transcript:'Z follow-up',status:'draft' as const,revision:1}};
  const b = {...attempt('a'),transcript:'B main answer'};
  const c = {...attempt('a'),transcript:'C main answer'};
  const all = mergeInterviewAttempts([a,b,c]);
  expect(mergeInterviewAttempts(mergeInterviewAttempts([a,b]),[c])).toEqual(all);
  expect(all[0].transcript).toBe('C main answer');
});

it('preserves matching user evidence with bounds in history and JSON backup', () => {
  const saved={...attempt('quoted'),points:[{...attempt('quoted').points[0],evidence:'My matching sentence. '+ 'x'.repeat(2000)}]};
  const bounded=mergeInterviewAttempts([saved]);
  expect(bounded[0].points[0].evidence).toHaveLength(1000);
  localStorage.setItem(attemptsKey(),JSON.stringify(bounded));
  const backup=collectProgress();localStorage.clear();restoreProgress(JSON.stringify(backup));
  expect(readInterviewAttempts()[0].points[0].evidence).toBe(bounded[0].points[0].evidence);
});

it('preserves delivery measurements through draft/review/follow-up merge and backup restore', () => {
  const delivery = {durationSeconds:120,speakingSeconds:90,longPauses:2,wordCount:240,wordsPerMinute:120,
    fillers:{um:2,uh:1,like:1,'you know':1,basically:0,actually:1}};
  const final = {...attempt('delivery'),revision:1,delivery};
  const reviewed = {...final,revision:2,status:'checked' as const};
  const rows = mergeInterviewAttempts([reviewed], [final], [{...final,revision:0,followUp:{question:'Why?',transcript:'Because',status:'saved',revision:1}}]);
  expect(rows[0].followUp?.transcript).toBe('Because');
  expect(rows[0].delivery).toEqual(delivery);
  localStorage.setItem(attemptsKey(), JSON.stringify(rows));
  const backup = collectProgress();
  localStorage.clear();
  restoreProgress(JSON.stringify(backup));
  expect(readInterviewAttempts()[0].delivery).toEqual(delivery);
  expect(mergeInterviewAttempts([{...final,delivery:{...delivery,longPauses:-1}}])[0].delivery).toBeUndefined();
  expect(mergeInterviewAttempts([attempt('legacy')])[0].delivery).toBeUndefined();
});
