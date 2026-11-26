import { describe, expect, it } from 'vitest';
import { analyzeRouterVsSupervisor, REQUEST_PRESETS } from './routerVsSupervisor';

describe('routerVsSupervisor pure calculations', () => {
  it('hand-checks Paris weather + coat request: Router drops 1 of 2 parts (50%) while Supervisor covers 100%', () => {
    const req = REQUEST_PRESETS[0].text;
    const router = analyzeRouterVsSupervisor({ mode: 'router', requestText: req, threshold: 0.25 });
    const supervisor = analyzeRouterVsSupervisor({ mode: 'supervisor', requestText: req, threshold: 0.25 });

    expect(router.topTopic.id).toBe('weather');
    expect(router.topTopic.score).toBe(0.77); // 1 - exp(-0.7 * 2.1) = 0.770
    expect(router.neededTopics).toEqual(['weather', 'advice']);
    expect(router.answeredTopics).toEqual(['weather']);
    expect(router.missedTopics).toEqual(['advice']);
    expect(router.coveragePct).toBe(50);
    expect(router.decisionCalls).toBe(1);
    expect(router.specialistCalls).toBe(1);
    expect(router.trace).toHaveLength(3);

    expect(supervisor.answeredTopics).toEqual(['weather', 'advice']);
    expect(supervisor.missedTopics).toEqual([]);
    expect(supervisor.coveragePct).toBe(100);
    // 2 specialists require 3 supervisor inspection decisions (start, after weather, after advice)
    expect(supervisor.decisionCalls).toBe(3);
    expect(supervisor.specialistCalls).toBe(2);
    expect(supervisor.trace).toHaveLength(5);
  });

  it('hand-checks billing + export crash request and confidence threshold fallback', () => {
    const mixed = analyzeRouterVsSupervisor({
      mode: 'router',
      requestText: 'I was charged twice, and now the export button crashes',
      threshold: 0.25,
    });
    expect(mixed.neededTopics).toEqual(['technical', 'billing']);
    expect(mixed.answeredTopics).toEqual(['technical']);
    expect(mixed.missedTopics).toEqual(['billing']);
    expect(mixed.coveragePct).toBe(50);

    const offTopic = analyzeRouterVsSupervisor({
      mode: 'router',
      requestText: 'Can you help me organize my desk drawer?',
      threshold: 0.25,
    });
    expect(offTopic.fallbackTriggered).toBe(true);
    expect(offTopic.topTopic.score).toBe(0);
    expect(offTopic.missedTopics).toEqual([]);
  });
});
