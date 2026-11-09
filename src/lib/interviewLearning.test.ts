import { expect,it,beforeEach } from 'vitest';
import { DAY, learningKey, localDay, mergeInterviewLearning, planTodaysTen, rateQuestion, readInterviewLearning, reviewDueAt, todaysQuestions, type InterviewLearning } from './interviewLearning';
import { collectProgress,restoreProgress } from './progressExport';
const now=new Date(2026,10,9,12).getTime();
const completed=(id:string,time=now-2*DAY):InterviewLearning=>({questionId:id,completion:{time,attemptId:`attempt-${id}`}});
beforeEach(()=>localStorage.clear());
it('uses the shared ladder, advances only due Got it reviews, and resets other ratings',()=>{
 let record=rateQuestion([],'q','a','got-it',now);
 expect(record.rating?.stage).toBe(0);expect(reviewDueAt(record)).toBe(now+DAY);
 record=rateQuestion([record],'q','b','got-it',now+DAY-1);expect(record.rating?.stage).toBe(0);
 record=rateQuestion([record],'q','c','got-it',now+2*DAY);expect(record.rating?.stage).toBe(1);
 expect(reviewDueAt(record)).toBe(now+5*DAY);
 expect(rateQuestion([record],'q','c','got-it',now+2*DAY+1).rating?.stage).toBe(1);
 expect(rateQuestion([record],'q','d','partly',now+5*DAY).rating?.stage).toBe(0);
 expect(rateQuestion([record],'q','d','missed',now+5*DAY).rating?.stage).toBe(0);
 const last={...record,rating:{...record.rating!,stage:4}};
 expect(rateQuestion([last],'q','last','got-it',now+100*DAY).rating?.stage).toBe(4);
});
it('merges completion, self-rating, assignment and skip independently and commutatively',()=>{
 const a=completed('q'),b=rateQuestion([],'q','attempt-q','missed',now);
 const c:InterviewLearning={questionId:'q',assignment:{time:now,kind:'review'},skippedAt:now+1};
 const expected=mergeInterviewLearning([a,b,c]);
 for(const rows of [[c,b,a],[b,a,c]])expect(mergeInterviewLearning(rows)).toEqual(expected);
 expect(mergeInterviewLearning(mergeInterviewLearning([a,b]),[c])).toEqual(expected);
 expect(mergeInterviewLearning(expected,[a])).toEqual(expected);
});
it('keeps all 917 compact progress records independent of transcript eviction and in export',()=>{
 const rows=Array.from({length:917},(_,i)=>mergeInterviewLearning([completed(`q${i}`),rateQuestion([],`q${i}`,`a${i}`,'got-it',now)])[0]);
 localStorage.setItem(learningKey('owner'),JSON.stringify(rows));
 const backup=collectProgress();localStorage.clear();restoreProgress(JSON.stringify(backup));
 expect(readInterviewLearning('owner')).toHaveLength(917);expect(readInterviewLearning()).toEqual([]);
 expect(readInterviewLearning('other')).toEqual([]);
 expect(new TextEncoder().encode(JSON.stringify(rows)).length).toBeLessThan(450_000);
});
it('freezes a mixed daily plan, fills thin topics, replaces one skip, and resets on the next local day',()=>{
 const questions=[...Array.from({length:8},(_,i)=>({id:`due${i}`,topicId:'old'})),...Array.from({length:12},(_,i)=>({id:`new${i}`,topicId:i<6?'thin':'strong'}))];
 const records=Array.from({length:8},(_,i)=>completed(`due${i}`));
 records.push(rateQuestion([],'new11','old','got-it',now));
 const plan=planTodaysTen(questions,records,now);
 expect(plan).toHaveLength(10);expect(plan.filter(r=>r.assignment?.kind==='review')).toHaveLength(5);
 expect(plan.filter(r=>r.assignment?.kind==='new')).toHaveLength(5);
 expect(plan.filter(r=>r.assignment?.kind==='new').some(r=>r.questionId.startsWith('new') && Number(r.questionId.slice(3))<6)).toBe(true);
 let saved=mergeInterviewLearning(records,plan);
 expect(planTodaysTen(questions,saved,now+100)).toEqual([]);
 saved=mergeInterviewLearning(saved,[{questionId:plan[0].questionId,skippedAt:now+200}]);
 const replacement=planTodaysTen(questions,saved,now+201);expect(replacement).toHaveLength(1);
 saved=mergeInterviewLearning(saved,replacement);expect(todaysQuestions(questions,saved,now)).toHaveLength(10);
 expect(todaysQuestions(questions,saved,now).some(r=>r.questionId===plan[0].questionId)).toBe(false);
 expect(planTodaysTen(questions,saved,now+DAY)).toHaveLength(10);
 expect(localDay(now)).not.toBe(localDay(now+DAY));
});
it('fills small banks without duplicates and rejects malformed imported records',()=>{
 expect(planTodaysTen([{id:'only',topicId:'t'}],[],now)).toHaveLength(1);
 expect(mergeInterviewLearning([{questionId:'q',rating:{time:NaN,attemptId:'x',value:'got-it',stage:10}},null,{questionId:3}])).toEqual([{questionId:'q'}]);
 localStorage.setItem(learningKey(),'{bad');expect(readInterviewLearning()).toEqual([]);
});
it('resolves two devices skipping different questions to one skip for the day',()=>{
 const a={questionId:'a',skippedAt:now},b={questionId:'b',skippedAt:now+1};
 const merged=mergeInterviewLearning([a],[b]);
 expect(merged.filter(r=>r.skippedAt)).toEqual([a]);
 expect(mergeInterviewLearning([b],[a])).toEqual(merged);
});
