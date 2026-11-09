import { expect, it, vi } from 'vitest';
import { canUseHighEndSpeech } from './speechDevice';
it('offers High accuracy for at least 8 GB RAM OR a usable WebGPU adapter', async () => {
  expect(await canUseHighEndSpeech({ deviceMemory: 8 } as any)).toBe(true);
  expect(await canUseHighEndSpeech({ deviceMemory: 16 } as any)).toBe(true);
  expect(await canUseHighEndSpeech({ deviceMemory: 4 } as any)).toBe(false);
  const requestAdapter = vi.fn(async () => ({}));
  expect(await canUseHighEndSpeech({ deviceMemory: 4, gpu: {requestAdapter} } as any)).toBe(true);
  requestAdapter.mockResolvedValueOnce(null as any);
  expect(await canUseHighEndSpeech({ gpu: {requestAdapter} } as any)).toBe(false);
  requestAdapter.mockRejectedValueOnce(Error('unavailable'));
  expect(await canUseHighEndSpeech({ gpu: {requestAdapter} } as any)).toBe(false);
});
