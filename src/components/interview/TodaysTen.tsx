import { useEffect, useMemo, useState } from 'react';
import { useInterviewLearning } from '../../contexts/InterviewLearningContext';
import { localDay, planTodaysTen, todaysQuestions, type LearningQuestion } from '../../lib/interviewLearning';

interface Question extends LearningQuestion { title:string }
export function TodaysTen({questions,onStart}:{questions:Question[];onStart:(id:string,session:string[])=>void}) {
  const {records,save,syncState,ready}=useInterviewLearning();
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60_000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{if(ready===false)return;const plan=planTodaysTen(questions,records,now);if(plan.length)save(plan);},[questions,records,now,save,ready]);
  const byId=useMemo(()=>new Map(questions.map(q=>[q.id,q])),[questions]);
  const today=todaysQuestions(questions,records,now);
  const completed=(r:typeof today[number]) => Boolean(r.completion && r.completion.time>=r.assignment!.time);
  const next=today.find(r=>!completed(r));
  const skipped=records.some(r=>r.skippedAt && localDay(r.skippedAt)===localDay(now));
  return <section className="si-learning-section" aria-label="Today's 10">
    <h2>Today’s 10</h2>
    <p>Revisit due questions and try new ones from topics you have covered least. Your self-rating sets the next review.</p>
    <p className="si-today-count" role="status">{today.filter(completed).length} of {today.length} completed today · {today.filter(r=>r.assignment?.kind==='review').length} due reviews · {today.filter(r=>r.assignment?.kind==='new').length} new</p>
    <div className="si-actions">
      {next ? <button className="si-secondary" onClick={()=>onStart(next.questionId,today.map(r=>r.questionId))}>Continue today’s 10</button> : <p>{today.length ? 'Today’s questions are complete.' : 'No new questions or due reviews today.'}</p>}
      <button disabled={skipped || !next} onClick={()=>{if(next){save([{questionId:next.questionId,skippedAt:Date.now()}]);setNow(Date.now());}}}>Skip one question today</button>
    </div>
    {skipped && <p className="si-status">One question skipped from today’s 10. It remains in the question list.</p>}
    <details><summary>Show today’s questions</summary><ol className="si-today-list">{today.map(r=><li key={r.questionId}>
      <button onClick={()=>onStart(r.questionId,today.map(item=>item.questionId))}>{byId.get(r.questionId)?.title}</button>
      <span>{completed(r) ? 'Completed today' : r.assignment?.kind==='review' ? 'Due review' : 'New question'}</span>
    </li>)}</ol></details>
    {syncState === 'syncing' && <p className="si-status">Syncing review progress…</p>}
    {syncState === 'synced' && <p className="si-status">Review progress synced.</p>}
  </section>;
}
