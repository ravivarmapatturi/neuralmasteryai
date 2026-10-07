import { describe, expect, it } from 'vitest';
import { BADGES, RARITY_CONFIGS, getUnlockedBadges, computeBadgeStats, type BadgeRarity, type BadgeCategory } from './badges';

describe('BADGES definition & unlock logic', () => {
  it('defines unique badge IDs and valid properties', () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(BADGES.length);
    BADGES.forEach((b) => {
      expect(b.title).toBeTruthy();
      expect(b.icon).toBeTruthy();
      expect(b.description).toBeTruthy();
      expect(b.rarity).toBeTruthy();
      expect(b.category).toBeTruthy();
      expect(b.requirementText).toBeTruthy();
    });
  });

  it('covers all 6 rarity tiers and all 5 specified categories', () => {
    const rarities = new Set<BadgeRarity>(BADGES.map((b) => b.rarity));
    expect(rarities).toEqual(new Set(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']));

    const categories = new Set<BadgeCategory>(BADGES.map((b) => b.category));
    expect(categories).toEqual(new Set(['learning', 'practice', 'difficulty', 'consistency', 'mastery']));

    for (const r of ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as BadgeRarity[]) {
      expect(RARITY_CONFIGS[r]).toBeDefined();
      expect(RARITY_CONFIGS[r].color).toBeTruthy();
    }
  });

  it('every badge has getProgress that returns non-negative current and target', () => {
    const stats = {
      totalXP: 120,
      streak: 4,
      pagesUnderstood: 8,
      problemsSolved: 3,
      systemDesignSolved: 1,
      isSignedIn: true,
      independentSolves: 2,
      hardSolved: 0,
      reviewsCompleted: 1,
      depthRevealed: 2,
    };
    for (const badge of BADGES) {
      const p = badge.getProgress(stats);
      expect(p.target).toBeGreaterThan(0);
      expect(p.current).toBeGreaterThanOrEqual(0);
      expect(p.unit).toBeTruthy();
    }
  });

  it('correctly locks all badges for a brand-new user with 0 stats', () => {
    const unlocked = getUnlockedBadges({
      totalXP: 0,
      streak: 0,
      pagesUnderstood: 0,
      problemsSolved: 0,
      systemDesignSolved: 0,
      isSignedIn: false,
    });
    expect(unlocked).toHaveLength(0);
  });

  it('unlocks First Step badge as soon as user earns first XP points', () => {
    const unlocked = getUnlockedBadges({
      totalXP: 10,
      streak: 1,
      pagesUnderstood: 1,
      problemsSolved: 0,
      systemDesignSolved: 0,
      isSignedIn: false,
    });
    expect(unlocked.some((b) => b.id === 'first-step')).toBe(true);
  });

  it('unlocks streak and tier milestone badges as criteria are met', () => {
    const unlocked = getUnlockedBadges({
      totalXP: 300,
      streak: 7,
      pagesUnderstood: 12,
      problemsSolved: 5,
      systemDesignSolved: 1,
      isSignedIn: false,
    });

    const unlockedIds = unlocked.map((b) => b.id);
    expect(unlockedIds).toContain('first-step');
    expect(unlockedIds).toContain('streak-3');
    expect(unlockedIds).toContain('streak-7');
    expect(unlockedIds).toContain('xp-novice');
    expect(unlockedIds).toContain('xp-apprentice');
    expect(unlockedIds).toContain('deep-reader');
    expect(unlockedIds).toContain('problem-solver');
    expect(unlockedIds).toContain('system-architect');
    expect(unlockedIds).not.toContain('xp-master'); // 1000 XP required
  });

  it('computeBadgeStats derives accurate breakdown from events and catalogue', () => {
    const mockProblems = [
      { route: '/practice/prob-1', title: 'P1', difficulty: 'easy' } as any,
      { route: '/practice/prob-2', title: 'P2', difficulty: 'hard' } as any,
    ];
    const mockEvents = [
      { permalink: '/practice/prob-1', kind: 'complete' as const, date: '2026-09-10', points: 25, hintUsed: false },
      { permalink: '/practice/prob-2', kind: 'complete' as const, date: '2026-09-10', points: 100, hintUsed: true },
      { permalink: '/docs/math', kind: 'mark' as const, date: '2026-09-10', points: 10 },
      { permalink: 'depth:1', kind: 'depth' as const, date: '2026-09-10', points: 2 },
      { permalink: 'review:1', kind: 'review' as const, date: '2026-09-10', points: 10 },
    ];
    const stats = computeBadgeStats(mockEvents, 147, 1, true, mockProblems);
    expect(stats.problemsSolved).toBe(2);
    expect(stats.pagesUnderstood).toBe(1);
    expect(stats.easySolved).toBe(1);
    expect(stats.hardSolved).toBe(1);
    expect(stats.independentSolves).toBe(1); // prob-1 was hintUsed: false
    expect(stats.depthRevealed).toBe(1);
    expect(stats.reviewsCompleted).toBe(1);
  });

  it('does not count a stale completion event for a problem no longer in the catalogue (C6 regression)', () => {
    // Real scenario this guards against: a problem gets renamed/removed
    // from the catalogue after a learner already solved it under its old
    // route. The old 'complete' event never disappears from their saved
    // history, but it should stop counting toward problemsSolved once
    // nothing in the current catalogue matches it -- otherwise this
    // number silently drifts above (and never matches) the Progress
    // page's own "Practice Solved" count, which IS filtered against the
    // current catalogue (practiceStats()).
    const mockProblems = [{ route: '/practice/prob-1', title: 'P1', difficulty: 'easy' } as any];
    const mockEvents = [
      { permalink: '/practice/prob-1', kind: 'complete' as const, date: '2026-09-10', points: 25 },
      { permalink: '/practice/prob-2-renamed-away', kind: 'complete' as const, date: '2026-08-01', points: 25 },
    ];
    const stats = computeBadgeStats(mockEvents, 50, 1, true, mockProblems);
    expect(stats.problemsSolved).toBe(1); // not 2 -- the raw event count would wrongly say 2
  });
});
