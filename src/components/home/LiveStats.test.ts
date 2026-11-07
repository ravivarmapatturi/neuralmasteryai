import { afterEach, describe, expect, it, vi } from 'vitest';
import { countPageView, reportClientError, topicForPath } from './LiveStats';

describe('topicForPath', () => {
  it('maps routes to the topic they belong to', () => {
    expect(topicForPath('/docs/deep-learning/attention-transformers')).toBe('deep-learning');
    expect(topicForPath('/practice/softmax')).toBe('labs');
    expect(topicForPath('/interview/questions')).toBe('interview');
    expect(topicForPath('/')).toBe('');
  });
});

describe('beacons', () => {
  afterEach(() => vi.restoreAllMocks());
  it('send nothing off the production host', () => {
    const beacon = vi.fn();
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    countPageView('/docs/nlp/x');
    reportClientError('boom');
    expect(beacon).not.toHaveBeenCalled();
  });
});
