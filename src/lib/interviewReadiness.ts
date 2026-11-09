import { mergeInterviewLearning, type InterviewLearning } from './interviewLearning';

export const READINESS_ROLES = {
  'applied-ai-engineer': 'Applied AI',
  'agentic-ai-engineer': 'Agentic',
  'inference-engineer': 'Inference',
  'ai-evaluation-reliability-engineer': 'Evaluation',
} as const;
export type ReadinessRole = keyof typeof READINESS_ROLES;
export interface RoleQuestion { id:string; topicId:string; topicTitle:string; roles?:string[] | null }
export interface TopicReadiness { id:string; title:string; total:number; completed:number; gotIt:number; partly:number; missed:number }

/** Coverage counts use the latest explicit self-rating, never a judge's output. */
export function readinessForRole(questions:RoleQuestion[], records:InterviewLearning[], role:ReadinessRole) {
  const pool=[...new Map(questions.filter(q=>(q.roles ?? []).includes(role)).map(q=>[q.id,q])).values()];
  const progress=new Map(mergeInterviewLearning(records).map(r=>[r.questionId,r]));
  const topics=new Map<string,TopicReadiness>();
  for(const q of pool){
    const topic=topics.get(q.topicId) ?? {id:q.topicId,title:q.topicTitle,total:0,completed:0,gotIt:0,partly:0,missed:0};
    topic.total++;
    const record=progress.get(q.id);
    if(record?.completion){
      topic.completed++;
      if(record.rating?.value==='got-it')topic.gotIt++;
      if(record.rating?.value==='partly')topic.partly++;
      if(record.rating?.value==='missed')topic.missed++;
    }
    topics.set(q.topicId,topic);
  }
  const values=[...topics.values()];
  const weakest=values.sort((a,b)=>a.gotIt/a.total-b.gotIt/b.total || b.missed/b.total-a.missed/a.total || b.partly/b.total-a.partly/a.total || a.id.localeCompare(b.id)).slice(0,3);
  return {role,total:pool.length,completed:values.reduce((n,t)=>n+t.completed,0),gotIt:values.reduce((n,t)=>n+t.gotIt,0),weakest};
}
