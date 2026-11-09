import { it, expect, vi } from 'vitest';
import { getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { syncInterviewAttempts } from './interviewAttemptSync';
import type { InterviewAttempt } from './interviewAttempts';
it('transactionally merges by id and writes only its field with merge enabled',async()=>{
 const a:InterviewAttempt={id:'a',questionId:'q',time:1,transcript:'First',points:[],source:'rubric',status:'unchecked'};
 const b={...a,id:'b',time:2};
 vi.mocked(getDoc).mockResolvedValueOnce({data:()=>({focusSessions:[{id:'focus'}],interviewAttempts:[a]})} as never);
 const result=await syncInterviewAttempts('owner',[a,b]);
 expect(result.map(a=>a.id)).toEqual(['a','b']);
 expect(runTransaction).toHaveBeenCalled();
 expect(setDoc).toHaveBeenLastCalledWith(expect.anything(),{interviewAttempts:result},{merge:true});
});
