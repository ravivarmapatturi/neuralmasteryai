import { describe, expect, it } from 'vitest';
import { computeLearnerTitle, DEFAULT_LEARNER_TITLE } from './learnerIdentity';
import type { DocPage } from './contentTree';
import type { AwardEvent } from './gamification';

describe('computeLearnerTitle', () => {
  const dummyComponent = () => null;
  const mockProblems: DocPage[] = [
    {
      title: 'Attention Implementation',
      navLabel: 'Attention Implementation',
      slug: 'attention-impl',
      route: '/practice/transformers-llms/attention-impl',
      topic: 'transformers-llms',
      difficulty: 'hard',
      sidebarPosition: 1,
      section: 'practice-problems',
      Component: dummyComponent,
    },
    {
      title: 'Feed Forward Network',
      navLabel: 'Feed Forward Network',
      slug: 'ffn',
      route: '/practice/transformers-llms/ffn',
      topic: 'transformers-llms',
      difficulty: 'medium',
      sidebarPosition: 2,
      section: 'practice-problems',
      Component: dummyComponent,
    },
    {
      title: 'Backpropagation from Scratch',
      navLabel: 'Backpropagation from Scratch',
      slug: 'backprop',
      route: '/practice/deep-learning/backprop',
      topic: 'deep-learning',
      difficulty: 'medium',
      sidebarPosition: 3,
      section: 'practice-problems',
      Component: dummyComponent,
    },
    {
      title: 'Conv2d Implementation',
      navLabel: 'Conv2d Implementation',
      slug: 'conv2d',
      route: '/practice/deep-learning/conv2d',
      topic: 'deep-learning',
      difficulty: 'hard',
      sidebarPosition: 4,
      section: 'practice-problems',
      Component: dummyComponent,
    },
    {
      title: 'RNN Cell',
      navLabel: 'RNN Cell',
      slug: 'rnn',
      route: '/practice/deep-learning/rnn',
      topic: 'deep-learning',
      difficulty: 'medium',
      sidebarPosition: 5,
      section: 'practice-problems',
      Component: dummyComponent,
    },
    {
      title: 'Agent Tool Calling',
      navLabel: 'Agent Tool Calling',
      slug: 'tool-calling',
      route: '/practice/agents/tool-calling',
      topic: 'agents,-mcp-systems',
      difficulty: 'medium',
      sidebarPosition: 6,
      section: 'practice-problems',
      Component: dummyComponent,
    },
  ];

  it('falls back honestly to "Neural Learner" when no problems have been solved', () => {
    const emptyEvents: AwardEvent[] = [];
    const result = computeLearnerTitle(mockProblems, emptyEvents);
    expect(result.title).toBe(DEFAULT_LEARNER_TITLE);
    expect(result.topTrackSolves).toBe(0);
    expect(result.topTrackTopic).toBeUndefined();
  });

  it('derives "Transformer Architect" when Transformers & LLMs has the most solves', () => {
    const events: AwardEvent[] = [
      { permalink: '/practice/transformers-llms/attention-impl', kind: 'complete', date: '2026-09-10', points: 50 },
      { permalink: '/practice/transformers-llms/ffn', kind: 'complete', date: '2026-09-10', points: 30 },
      { permalink: '/practice/deep-learning/backprop', kind: 'complete', date: '2026-09-10', points: 30 },
    ];
    const result = computeLearnerTitle(mockProblems, events);
    expect(result.title).toBe('Transformer Architect');
    expect(result.topTrackTopic).toBe('transformers-llms');
    expect(result.topTrackSolves).toBe(2);
  });

  it('updates genuinely when learner history shows another top track', () => {
    // 3 deep-learning solves vs 1 transformer solve
    const events: AwardEvent[] = [
      { permalink: '/practice/transformers-llms/attention-impl', kind: 'complete', date: '2026-09-10', points: 50 },
      { permalink: '/practice/deep-learning/backprop', kind: 'complete', date: '2026-09-10', points: 30 },
      { permalink: '/practice/deep-learning/conv2d', kind: 'complete', date: '2026-09-10', points: 50 },
      { permalink: '/practice/deep-learning/rnn', kind: 'complete', date: '2026-09-10', points: 30 },
    ];
    const result = computeLearnerTitle(mockProblems, events);
    expect(result.title).toBe('Deep Learning Specialist');
    expect(result.topTrackTopic).toBe('deep-learning');
    expect(result.topTrackSolves).toBe(3);
  });

  it('derives "Agent Systems Architect" when Agent systems is the leading track', () => {
    const events: AwardEvent[] = [
      { permalink: '/practice/agents/tool-calling', kind: 'complete', date: '2026-09-10', points: 30 },
    ];
    const result = computeLearnerTitle(mockProblems, events);
    expect(result.title).toBe('Agent Systems Architect');
    expect(result.topTrackTopic).toBe('agents,-mcp-systems');
    expect(result.topTrackSolves).toBe(1);
  });
});
