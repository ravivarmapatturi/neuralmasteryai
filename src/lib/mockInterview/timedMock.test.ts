import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildTimedMockPlan,
  evaluateCriteriaChecklist,
  formatTime,
  formatDurationHuman,
  readActiveSession,
  saveActiveSession,
  clearActiveSession,
  readRecentQuestionIds,
  recordRecentQuestionIds,
  MOCK_ROLES,
  type MockRole,
  type ActiveMockSession,
} from './timedMock';

describe('Timed Mock Interview logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('buildTimedMockPlan', () => {
    const roles: MockRole[] = ['applied-ai', 'agentic', 'inference', 'evaluation'];

    it.each(roles)('generates a realistic 30-min mix of 5 questions for role %s', (role) => {
      const plan = buildTimedMockPlan(role, 30);
      expect(plan).toHaveLength(5);

      const rounds = plan.map(q => q.round);
      expect(rounds).toEqual(['screen', 'depth', 'system-design', 'debugging', 'behavioral']);

      // Ensure every question has required fields
      for (const q of plan) {
        expect(q.id).toBeTruthy();
        expect(q.title).toBeTruthy();
        expect(q.answer).toBeTruthy();
        expect(q.softLimitSeconds).toBeGreaterThan(0);
        expect(Array.isArray(q.criteria)).toBe(true);
      }
    });

    it.each(roles)('generates a realistic 60-min mix of 10 questions for role %s', (role) => {
      const plan = buildTimedMockPlan(role, 60);
      expect(plan).toHaveLength(10);

      const rounds = plan.map(q => q.round);
      expect(rounds).toEqual([
        'screen', 'depth', 'system-design', 'debugging', 'behavioral',
        'screen', 'depth', 'system-design', 'debugging', 'behavioral',
      ]);

      // Unique questions where possible
      const uniqueIds = new Set(plan.map(q => q.id));
      expect(uniqueIds.size).toBe(10);
    });

    it('avoids recently seen questions when available', () => {
      // First session
      const plan1 = buildTimedMockPlan('applied-ai', 30);
      const recentIds = plan1.map(q => q.id);

      // Second session passing recentIds
      const plan2 = buildTimedMockPlan('applied-ai', 30, { recentQuestionIds: recentIds });
      const plan2Ids = plan2.map(q => q.id);

      // Overlap should be minimal (at most if pool runs out for a rare round like behavioral)
      const overlap = plan2Ids.filter(id => recentIds.includes(id));
      // With hundreds of questions, overlap should be 0 or at most 1 (for behavioral which has 16 items)
      expect(overlap.length).toBeLessThanOrEqual(1);
    });
  });

  describe('evaluateCriteriaChecklist', () => {
    const criteria = [
      'Names the 28-point gap as high variance or overfitting',
      'Proposes tree depth limits or pruning',
      'Suggests random forest or averaging trees',
    ];

    it('marks covered items when candidate transcript contains key points', () => {
      const transcript = 'This is clearly high variance and overfitting because of the gap. I would set tree depth limits and try a random forest.';
      const results = evaluateCriteriaChecklist(transcript, criteria);

      expect(results).toHaveLength(3);
      expect(results[0].covered).toBe(true);
      expect(results[1].covered).toBe(true);
      expect(results[2].covered).toBe(true);
    });

    it('marks not detected when candidate transcript misses key points', () => {
      const transcript = 'I would increase the learning rate and add batch normalization layers.';
      const results = evaluateCriteriaChecklist(transcript, criteria);

      expect(results).toHaveLength(3);
      expect(results[0].covered).toBe(false);
      expect(results[1].covered).toBe(false);
      expect(results[2].covered).toBe(false);
    });

    it('handles empty transcript gracefully', () => {
      const results = evaluateCriteriaChecklist('', criteria);
      expect(results).toHaveLength(3);
      for (const r of results) {
        expect(r.covered).toBe(false);
      }
    });
  });

  describe('storage and session state persistence', () => {
    it('saves and reads active session with reload resumption', () => {
      expect(readActiveSession()).toBeNull();

      const session: ActiveMockSession = {
        id: 'test-session-123',
        role: 'applied-ai',
        roleLabel: MOCK_ROLES['applied-ai'].label,
        targetMinutes: 30,
        startedAt: Date.now(),
        totalElapsedSeconds: 145,
        currentQuestionIndex: 1,
        isPaused: true,
        questions: buildTimedMockPlan('applied-ai', 30),
        answers: [
          {
            questionId: 'q1',
            transcript: 'My answer to question 1',
            seconds: 140,
            selfRating: 'got-it',
          },
        ],
      };

      saveActiveSession(session);
      const loaded = readActiveSession();
      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe('test-session-123');
      expect(loaded?.currentQuestionIndex).toBe(1);
      expect(loaded?.isPaused).toBe(true);
      expect(loaded?.answers[0].selfRating).toBe('got-it');

      clearActiveSession();
      expect(readActiveSession()).toBeNull();
    });

    it('records and reads recent question IDs capped at 50', () => {
      const ids = Array.from({ length: 60 }, (_, i) => `q-${i}`);
      recordRecentQuestionIds(ids);

      const recent = readRecentQuestionIds();
      expect(recent.length).toBe(50);
      expect(recent[0]).toBe('q-0');
    });
  });

  describe('time formatting', () => {
    it('formats mm:ss properly', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(3599)).toBe('59:59');
    });

    it('formats duration human readable', () => {
      expect(formatDurationHuman(45)).toBe('45s');
      expect(formatDurationHuman(120)).toBe('2m');
      expect(formatDurationHuman(155)).toBe('2m 35s');
    });
  });
});
