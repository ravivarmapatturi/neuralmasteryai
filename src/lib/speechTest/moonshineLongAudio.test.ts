import { expect, it, vi } from 'vitest';
import { transcribeMoonshineLongAudio } from './moonshineLongAudio';
it('bounds long-answer inference and merges only known overlapping boundaries', async()=>{
  const pipe=vi.fn().mockResolvedValueOnce({text:'RAG retrieves documents'}).mockResolvedValueOnce({text:'retrieves documents before generation'}).mockResolvedValueOnce({text:'before generation improves grounding'});
  const result=await transcribeMoonshineLongAudio(pipe,new Float32Array(16000*22));
  expect(pipe).toHaveBeenCalledTimes(3);
  expect(pipe.mock.calls.every(([audio])=>audio.length<=136000)).toBe(true);
  expect(result.text).toBe('RAG retrieves documents before generation improves grounding');
});
