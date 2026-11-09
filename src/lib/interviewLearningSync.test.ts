import { it, expect, vi } from 'vitest';
import { getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { syncInterviewLearning } from './interviewLearningSync';
import type { InterviewLearning } from './interviewLearning';
it('transactionally merges by id and writes only its field with merge enabled',async()=>{
 const a:InterviewLearning={questionId:'a',completion:{time:1,attemptId:'a'}};
 const b={questionId:'b',completion:{time:2,attemptId:'b'}};
 vi.mocked(getDoc).mockResolvedValueOnce({data:()=>({focusSessions:[{id:'focus'}],interviewLearning:[a]})} as never);
 const result=await syncInterviewLearning('owner',[a,b]);
 expect(result.map(a=>a.questionId)).toEqual(['a','b']);
 expect(runTransaction).toHaveBeenCalled();
 expect(setDoc).toHaveBeenLastCalledWith(expect.anything(),{interviewLearning:result},{merge:true});
});
