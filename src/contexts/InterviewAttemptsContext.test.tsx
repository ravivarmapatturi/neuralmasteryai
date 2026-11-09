import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InterviewAttemptsProvider, useInterviewAttempts } from './InterviewAttemptsContext';
import { attemptsKey, type InterviewAttempt } from '../lib/interviewAttempts';
const mocks = vi.hoisted(() => ({ uid: undefined as string | undefined, sync: vi.fn(), watch: vi.fn() }));
vi.mock('./AuthContext',()=>({useAuth:()=>({user:mocks.uid ? {uid:mocks.uid}:null})}));
vi.mock('../lib/interviewAttemptSync',()=>({syncInterviewAttempts:mocks.sync,watchInterviewAttempts:mocks.watch}));
const a = (id:string):InterviewAttempt => ({id,questionId:'q',time:1,transcript:id,points:[],source:'rubric',status:'unchecked'});
function View(){const {attempts,save,syncState}=useInterviewAttempts();return <><output>{attempts.map(a=>a.id).join(',')}:{syncState}</output><button onClick={()=>save(a('local'))}>Save</button></>;}
const tree=()=> <InterviewAttemptsProvider><View/></InterviewAttemptsProvider>;
beforeEach(()=>{localStorage.clear();mocks.uid=undefined;mocks.sync.mockReset();mocks.watch.mockReset();mocks.watch.mockReturnValue(vi.fn());mocks.sync.mockImplementation(async(_uid,local)=>local);});
afterEach(cleanup);
it('saves anonymous attempts locally without loading sync',()=>{
 render(tree());fireEvent.click(screen.getByText('Save'));
 expect(JSON.parse(localStorage.getItem(attemptsKey())!)[0].id).toBe('local');
 expect(mocks.sync).not.toHaveBeenCalled();
});
it('adopts guest attempts, merges remote snapshots and isolates account switches',async()=>{
 localStorage.setItem(attemptsKey(),JSON.stringify([a('guest')]));
 mocks.uid='a';let snapshot:(value:InterviewAttempt[])=>void=()=>{};
 mocks.watch.mockImplementation((_uid,next)=>{snapshot=next;return vi.fn();});
 const view=render(tree());
 await waitFor(()=>expect(mocks.sync).toHaveBeenCalledWith('a',[a('guest')]));
 expect(localStorage.getItem(attemptsKey())).toBeNull();
 act(()=>snapshot([a('remote')]));
 expect(screen.getByRole('status').textContent).toContain('remote');
 mocks.uid='b';view.rerender(tree());
 await waitFor(()=>expect(mocks.sync).toHaveBeenCalledWith('b',[]));
 expect(screen.getByRole('status').textContent).not.toContain('remote');
 mocks.uid=undefined;view.rerender(tree());
 expect(screen.getByRole('status').textContent).toBe(':local');
});
it('keeps local writes during in-flight sync and retries after an offline failure',async()=>{
 mocks.uid='a';let release:(rows:InterviewAttempt[])=>void=()=>{};
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
 expect(JSON.parse(localStorage.getItem(attemptsKey('a'))!).map((a:InterviewAttempt)=>a.id)).toContain('local');
});
it('ignores an old account sync result after switching users',async()=>{
 mocks.uid='a';let release:(rows:InterviewAttempt[])=>void=()=>{};
 mocks.sync.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const view=render(tree());await waitFor(()=>expect(mocks.sync).toHaveBeenCalledTimes(1));
 mocks.uid='b';view.rerender(tree());
 await waitFor(()=>expect(mocks.sync).toHaveBeenCalledWith('b',[]));
 await act(async()=>release([a('private-a')]));
 expect(screen.getByRole('status').textContent).not.toContain('private-a');
 expect(localStorage.getItem(attemptsKey('b'))).not.toContain('private-a');
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
