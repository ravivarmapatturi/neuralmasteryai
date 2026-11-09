import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InterviewLearningProvider, useInterviewLearning } from './InterviewLearningContext';
import { learningKey, type InterviewLearning } from '../lib/interviewLearning';
const mocks = vi.hoisted(() => ({ uid: undefined as string | undefined, sync: vi.fn(), watch: vi.fn() }));
vi.mock('./AuthContext',()=>({useAuth:()=>({user:mocks.uid ? {uid:mocks.uid}:null})}));
vi.mock('../lib/interviewLearningSync',()=>({syncInterviewLearning:mocks.sync,watchInterviewLearning:mocks.watch}));
const a = (id:string):InterviewLearning => ({questionId:id,completion:{time:1,attemptId:id}});
function View(){const {records,save,syncState}=useInterviewLearning();return <><output>{records.map(a=>a.questionId).join(',')}:{syncState}</output><button onClick={()=>save([a('local')])}>Save</button></>;}
const tree=()=> <InterviewLearningProvider><View/></InterviewLearningProvider>;
beforeEach(()=>{localStorage.clear();mocks.uid=undefined;mocks.sync.mockReset();mocks.watch.mockReset();mocks.watch.mockReturnValue(vi.fn());mocks.sync.mockImplementation(async(_uid,local)=>local);});
afterEach(cleanup);
it('saves anonymous attempts locally without loading sync',()=>{
 render(tree());fireEvent.click(screen.getByText('Save'));
 expect(JSON.parse(localStorage.getItem(learningKey())!)[0].questionId).toBe('local');
 expect(mocks.sync).not.toHaveBeenCalled();
});
it('adopts guest attempts, merges remote snapshots and isolates account switches',async()=>{
 localStorage.setItem(learningKey(),JSON.stringify([a('guest')]));
 mocks.uid='a';let snapshot:(value:InterviewLearning[])=>void=()=>{};
 mocks.watch.mockImplementation((_uid,next)=>{snapshot=next;return vi.fn();});
 const view=render(tree());
 await waitFor(()=>expect(mocks.sync).toHaveBeenCalledWith('a',[a('guest')]));
 expect(localStorage.getItem(learningKey())).toBeNull();
 act(()=>snapshot([a('remote')]));
 expect(screen.getByRole('status').textContent).toContain('remote');
 mocks.uid='b';view.rerender(tree());
 await waitFor(()=>expect(mocks.sync).toHaveBeenCalledWith('b',[]));
 expect(screen.getByRole('status').textContent).not.toContain('remote');
 mocks.uid=undefined;view.rerender(tree());
 expect(screen.getByRole('status').textContent).toBe(':local');
});
it('keeps local writes during in-flight sync and retries after an offline failure',async()=>{
 mocks.uid='a';let release:(rows:InterviewLearning[])=>void=()=>{};
 mocks.sync.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 render(tree());await waitFor(()=>expect(mocks.sync).toHaveBeenCalledTimes(1));
 fireEvent.click(screen.getByText('Save'));
 await act(async()=>release([a('remote')]));
 await waitFor(()=>expect(mocks.sync).toHaveBeenLastCalledWith('a',expect.arrayContaining([a('local'),a('remote')])));
 mocks.sync.mockRejectedValueOnce(new Error('offline'));
 fireEvent.click(screen.getByText('Save'));
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('offline'));
 act(()=>window.dispatchEvent(new Event('online')));
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('synced'));
 expect(JSON.parse(localStorage.getItem(learningKey('a'))!).map((a:InterviewLearning)=>a.questionId)).toContain('local');
});
it('ignores an old account sync result after switching users',async()=>{
 mocks.uid='a';let release:(rows:InterviewLearning[])=>void=()=>{};
 mocks.sync.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const view=render(tree());await waitFor(()=>expect(mocks.sync).toHaveBeenCalledTimes(1));
 mocks.uid='b';view.rerender(tree());
 await waitFor(()=>expect(mocks.sync).toHaveBeenCalledWith('b',[]));
 await act(async()=>release([a('private-a')]));
 expect(screen.getByRole('status').textContent).not.toContain('private-a');
 expect(localStorage.getItem(learningKey('b'))).not.toContain('private-a');
});
it('keeps storage errors visible when an otherwise successful sync cannot persist locally',async()=>{
 mocks.uid='a';
 const spy=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota');});
 try {
  render(tree());
  await waitFor(()=>expect(mocks.sync).toHaveBeenCalled());
  fireEvent.click(screen.getByText('Save'));
  await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('storage-error'));
 } finally {spy.mockRestore();}
});
it('backfills captured legacy attempts before the first daily plan',()=>{
 localStorage.setItem('nm-interview-attempts-v1:guest',JSON.stringify([{id:'old',questionId:'legacy',time:1,transcript:'A real answer',points:[],source:'rubric',status:'checked'},{id:'empty',questionId:'blank',time:1,transcript:'',points:[],source:'rubric',status:'unchecked'}]));
 render(tree());
 expect(screen.getByRole('status').textContent).toBe('legacy:local');
 expect(JSON.parse(localStorage.getItem(learningKey())!)).toEqual([{questionId:'legacy',completion:{time:1,attemptId:'old'}}]);
});
