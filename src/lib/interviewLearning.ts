import { REVIEW_INTERVALS_DAYS } from '../contexts/ProgressContext';

export const LEARNING_KEY = 'nm-interview-learning-v1';
export const learningKey = (uid?: string) => `${LEARNING_KEY}:${uid ?? 'guest'}`;
export type SelfRating = 'got-it' | 'partly' | 'missed';
export const RATING_LABELS: Record<SelfRating, string> = { 'got-it': 'Got it', partly: 'Partly', missed: 'Missed it' };
export const DAY = 86_400_000;
export const MAX_LEARNING_RECORDS = 2000;
export const MAX_LEARNING_BYTES = 450_000;
export interface InterviewLearning {
  questionId: string;
  completion?: { time: number; attemptId: string };
  rating?: { time: number; attemptId: string; value: SelfRating; stage: number };
  assignment?: { time: number; kind: 'review' | 'new' };
  skippedAt?: number;
}
export interface LearningQuestion { id: string; topicId: string }
const validTime = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) > 0 && (n as number) <= 8_640_000_000_000_000;
const validId = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.length <= 200;
const newer = <T extends {time:number}>(a?: T, b?: T): T | undefined => !a ? b : !b ? a : a.time !== b.time ? (a.time > b.time ? a : b) : JSON.stringify(a) > JSON.stringify(b) ? a : b;
/** Merge each independent field: a late transcript/judge result cannot erase a rating.
 * Compact records outlive the 100-attempt transcript window. */
export function mergeInterviewLearning(...lists: unknown[]): InterviewLearning[] {
  const records = new Map<string, InterviewLearning>();
  for (const list of lists) if (Array.isArray(list)) for (const raw of list) {
    if (!raw || !validId(raw.questionId)) continue;
    const next: InterviewLearning = {questionId:raw.questionId};
    if (raw.completion && validTime(raw.completion.time) && validId(raw.completion.attemptId)) next.completion = {time:raw.completion.time,attemptId:raw.completion.attemptId};
    if (raw.rating && validTime(raw.rating.time) && validId(raw.rating.attemptId) && ['got-it','partly','missed'].includes(raw.rating.value) && Number.isInteger(raw.rating.stage) && raw.rating.stage >= 0 && raw.rating.stage < REVIEW_INTERVALS_DAYS.length) next.rating = {time:raw.rating.time,attemptId:raw.rating.attemptId,value:raw.rating.value,stage:raw.rating.stage};
    if (raw.assignment && validTime(raw.assignment.time) && ['review','new'].includes(raw.assignment.kind)) next.assignment = {time:raw.assignment.time,kind:raw.assignment.kind};
    if (validTime(raw.skippedAt)) next.skippedAt = raw.skippedAt;
    const old = records.get(next.questionId);
    const completion = newer(old?.completion,next.completion), rating = newer(old?.rating,next.rating), assignment = newer(old?.assignment,next.assignment);
    const skippedAt = Math.max(old?.skippedAt ?? 0, next.skippedAt ?? 0);
    records.set(next.questionId,{questionId:next.questionId,...(completion ? {completion}:{}),...(rating ? {rating}:{}),...(assignment ? {assignment}:{}),...(skippedAt ? {skippedAt}:{})});
  }
  const time = (r:InterviewLearning) => Math.max(r.completion?.time ?? 0,r.rating?.time ?? 0,r.assignment?.time ?? 0,r.skippedAt ?? 0);
  const result = [...records.values()].sort((a,b)=>time(b)-time(a)||a.questionId.localeCompare(b.questionId)).slice(0,MAX_LEARNING_RECORDS);
  while(new TextEncoder().encode(JSON.stringify(result)).length>MAX_LEARNING_BYTES) result.pop();
  // Concurrent devices can each skip locally. Keep one deterministic skip per day.
  const skips=new Map<string,InterviewLearning>();
  for(const r of result)if(r.skippedAt){
    const day=localDay(r.skippedAt),old=skips.get(day);
    if(!old || r.skippedAt<old.skippedAt! || (r.skippedAt===old.skippedAt && r.questionId<old.questionId))skips.set(day,r);
  }
  for(const r of result)if(r.skippedAt && skips.get(localDay(r.skippedAt))!==r)delete r.skippedAt;
  return result.sort((a,b)=>a.questionId.localeCompare(b.questionId));
}
export function readInterviewLearning(uid?:string, storage:Storage=localStorage):InterviewLearning[] {
  try {return mergeInterviewLearning(JSON.parse(storage.getItem(learningKey(uid)) ?? '[]'));} catch {return [];}
}
export function reviewDueAt(record:InterviewLearning):number | undefined {
  const time = record.rating?.time ?? record.completion?.time;
  return time === undefined ? undefined : time + REVIEW_INTERVALS_DAYS[record.rating?.stage ?? 0]*DAY;
}
export function rateQuestion(records:InterviewLearning[], questionId:string, attemptId:string, value:SelfRating, now=Date.now()):InterviewLearning {
  const previous = records.find(r=>r.questionId===questionId);
  const previousRating = previous?.rating;
  // Changing a rating for the same attempt is a correction, not another successful review.
  const advance = previousRating && previousRating.attemptId !== attemptId && (reviewDueAt(previous!) ?? Infinity) <= now;
  const stage = value !== 'got-it' ? 0 : previousRating?.attemptId === attemptId ? previousRating.stage : Math.min((previousRating?.stage ?? -1)+(advance || !previousRating ? 1 : 0), REVIEW_INTERVALS_DAYS.length-1);
  return {questionId,rating:{time:Math.max(now,(previousRating?.time ?? 0)+1),attemptId,value,stage:Math.max(0,stage)}};
}
export const localDay = (time:number) => {const d=new Date(time);return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;};
export function todaysQuestions(questions:LearningQuestion[], records:InterviewLearning[], now:number) {
  const ids=new Set(questions.map(q=>q.id));
  return records.filter(r=>ids.has(r.questionId) && r.assignment && localDay(r.assignment.time)===localDay(now) && (!r.skippedAt || localDay(r.skippedAt)!==localDay(now)))
    .sort((a,b)=>a.assignment!.time-b.assignment!.time||a.questionId.localeCompare(b.questionId)).slice(0,10);
}
/** Freeze ten assignments for the local day. Reserve five places for due reviews
 * and five for unseen questions from topics with the thinnest self-rated coverage. */
export function planTodaysTen(questions:LearningQuestion[], records:InterviewLearning[], now:number):InterviewLearning[] {
  const assigned=todaysQuestions(questions,records,now);
  if(assigned.length===10)return [];
  const byId=new Map(records.map(r=>[r.questionId,r]));
  const excluded=new Set(records.filter(r=>(r.assignment && localDay(r.assignment.time)===localDay(now)) || (r.skippedAt && localDay(r.skippedAt)===localDay(now))).map(r=>r.questionId));
  const pool=questions.filter(q=>!excluded.has(q.id));
  const due=pool.filter(q=>(reviewDueAt(byId.get(q.id) ?? {questionId:q.id}) ?? Infinity)<=now)
    .sort((a,b)=>reviewDueAt(byId.get(a.id)!)!-reviewDueAt(byId.get(b.id)!)!||a.id.localeCompare(b.id));
  const unseen=pool.filter(q=>!byId.get(q.id)?.completion && !byId.get(q.id)?.rating);
  const totals=new Map<string,number>(),covered=new Map<string,number>(),picked=new Map<string,number>();
  for(const q of questions){totals.set(q.topicId,(totals.get(q.topicId)??0)+1);if(byId.get(q.id)?.rating?.value==='got-it')covered.set(q.topicId,(covered.get(q.topicId)??0)+1);}
  const fresh:LearningQuestion[]=[];
  while(unseen.length){
    unseen.sort((a,b)=>((covered.get(a.topicId)??0)+(picked.get(a.topicId)??0))/(totals.get(a.topicId)??1)-((covered.get(b.topicId)??0)+(picked.get(b.topicId)??0))/(totals.get(b.topicId)??1)||a.id.localeCompare(b.id));
    const q=unseen.shift()!;fresh.push(q);picked.set(q.topicId,(picked.get(q.topicId)??0)+1);
    if(fresh.length>=10)break;
  }
  const selected=[...due.slice(0,5).map(q=>({q,kind:'review' as const})),...fresh.slice(0,5).map(q=>({q,kind:'new' as const})),...due.slice(5).map(q=>({q,kind:'review' as const})),...fresh.slice(5).map(q=>({q,kind:'new' as const}))];
  return selected.slice(0,10-assigned.length).map(({q,kind},i)=>({questionId:q.id,assignment:{time:now+i,kind}}));
}
