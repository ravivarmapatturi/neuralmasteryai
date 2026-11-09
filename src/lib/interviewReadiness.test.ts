import { expect,it,beforeEach } from 'vitest';
import { readinessForRole, READINESS_ROLES, type RoleQuestion, type ReadinessRole } from './interviewReadiness';
import { learningKey, readInterviewLearning, type InterviewLearning } from './interviewLearning';
import { collectProgress,restoreProgress } from './progressExport';
import practice from '../data/interviewPractice.json';
const applied='applied-ai-engineer' as const;
const q=(id:string,topic:string):RoleQuestion=>({id,topicId:topic,topicTitle:topic,roles:[applied]});
const record=(questionId:string,value:'got-it'|'partly'|'missed',time=2):InterviewLearning=>({questionId,completion:{time:1,attemptId:questionId},rating:{time,attemptId:questionId,value,stage:0}});
beforeEach(()=>localStorage.clear());
it('counts unique completed questions and latest self-rated Got it, and ranks three real gaps',()=>{
 const questions=[q('a1','A'),q('a2','A'),q('b','B'),q('c','C'),q('d','D')];
 const records=[record('a1','got-it'),record('a2','partly'),record('b','missed'),record('d','got-it')];
 const coverage=readinessForRole([...questions,questions[0]],records,applied);
 expect(coverage).toMatchObject({total:5,completed:4,gotIt:2});
 expect(coverage.weakest.map(t=>t.id)).toEqual(['B','C','A']);
 const updated=readinessForRole(questions,[...records,record('a1','missed',3)],applied);
 expect(updated).toMatchObject({total:5,completed:4,gotIt:1});
 expect(updated.weakest.map(t=>t.id)).toEqual(['B','A','C']);
 expect(readinessForRole(questions,records,'inference-engineer')).toMatchObject({total:0,completed:0,gotIt:0,weakest:[]});
});
it('does not infer mastery from a completion, an imported judge score or a rating without completion',()=>{
 const judged={questionId:'a',completion:{time:1,attemptId:'a'},score:100,points:[{verdict:'covered'}]};
 const orphan={questionId:'b',rating:{time:2,attemptId:'b',value:'got-it' as const,stage:0}};
 expect(readinessForRole([q('a','A'),q('b','B')],[judged,orphan],applied)).toMatchObject({total:2,completed:1,gotIt:0});
});
it('uses each role’s actual tagged total and reproduces all four role counts after JSON restore',()=>{
 const questions=practice.topics.flatMap(t=>t.questions.map(q=>({...q,topicId:t.id,topicTitle:t.title}))) as RoleQuestion[];
 const records=questions.map((q,i)=>record(q.id,i%2 ? 'partly':'got-it'));
 const roles=Object.keys(READINESS_ROLES) as ReadinessRole[];
 const before=roles.map(role=>readinessForRole(questions,records,role));
 for(const coverage of before){
   const expected=new Set(questions.filter(q=>(q.roles ?? []).includes(coverage.role)).map(q=>q.id)).size;
   expect(coverage.total).toBe(expected);expect(coverage.completed).toBe(expected);
   expect(coverage.weakest).toHaveLength(3);expect(coverage.gotIt).toBeLessThanOrEqual(expected);
 }
 localStorage.setItem(learningKey('owner'),JSON.stringify(records));
 const backup=collectProgress();localStorage.clear();restoreProgress(JSON.stringify(backup));
 expect(roles.map(role=>readinessForRole(questions,readInterviewLearning('owner'),role))).toEqual(before);
 expect(readInterviewLearning('other')).toEqual([]);
});
