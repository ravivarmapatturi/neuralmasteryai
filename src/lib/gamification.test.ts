import { describe, expect, it } from 'vitest'
import {
  localDateString,
  weekStartDateString,
  weeklyPoints,
  computeStreak,
  hasAward,
  totalPoints,
  mergeEvents,
  computeDisplayName,
  totalXpForLevel,
  levelForPoints,
  topicBreakdown,
  activityCounts,
  normalizePracticeProblemPermalink,
  MARK_UNDERSTOOD_POINTS,
  PROBLEM_COMPLETED_POINTS_MEDIUM,
  PROBLEM_COMPLETED_POINTS_EASY,
  PROBLEM_COMPLETED_POINTS_HARD,
  PROBLEM_COMPLETED_POINTS_DEFAULT,
  pointsForDifficulty,
  computeRLValuation,
  getArchitectureAward,
  ARCHITECTURE_COMPLETED_POINTS,
  type AwardEvent,
} from './gamification'


describe('localDateString', () => {
  it('formats as local YYYY-MM-DD, zero-padded', () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05') // month is 0-indexed in the Date constructor
    expect(localDateString(new Date(2026, 10, 23))).toBe('2026-11-23')
  })

  it('uses LOCAL getters, not UTC -- a date built from local Y/M/D round-trips exactly regardless of the runner\'s timezone', () => {
    const d = new Date(2026, 5, 15, 23, 59, 59) // 11:59:59pm local
    expect(localDateString(d)).toBe('2026-06-15')
  })
})

describe('weekStartDateString', () => {
  it('anchors to Monday for every day of a real week', () => {
    // 2026-09-07 is a real Monday (verified: Sep 2026 starts on a Tuesday).
    const monday = new Date(2026, 8, 7)
    expect(weekStartDateString(monday)).toBe('2026-09-07')
    expect(weekStartDateString(new Date(2026, 8, 8))).toBe('2026-09-07') // Tuesday
    expect(weekStartDateString(new Date(2026, 8, 10))).toBe('2026-09-07') // Thursday
    expect(weekStartDateString(new Date(2026, 8, 13))).toBe('2026-09-07') // Sunday -- still the SAME week as the Monday before it
    expect(weekStartDateString(new Date(2026, 8, 14))).toBe('2026-09-14') // next Monday -- new week
  })
})

describe('weeklyPoints', () => {
  it('sums only events dated within the current local week', () => {
    const today = new Date(2026, 8, 10) // Thursday, week starts 2026-09-07
    const events: AwardEvent[] = [
      { permalink: '/a', kind: 'mark', date: '2026-09-07', points: 10 }, // this week (Monday)
      { permalink: '/b', kind: 'mark', date: '2026-09-09', points: 10 }, // this week (Wednesday)
      { permalink: '/c', kind: 'complete', date: '2026-09-06', points: 50 }, // LAST week (Sunday before)
      { permalink: '/d', kind: 'complete', date: '2026-08-01', points: 50 }, // long ago
    ]
    expect(weeklyPoints(events, today)).toBe(20)
  })

  it('is 0 for an empty event log', () => {
    expect(weeklyPoints([], new Date(2026, 8, 10))).toBe(0)
  })
})

describe('computeStreak', () => {
  it('is 0 with no activity at all', () => {
    expect(computeStreak([], new Date(2026, 8, 10))).toBe(0)
  })

  it('counts today alone as a 1-day streak', () => {
    expect(computeStreak(['2026-09-10'], new Date(2026, 8, 10))).toBe(1)
  })

  it('counts N genuinely consecutive days ending today', () => {
    const dates = ['2026-09-08', '2026-09-09', '2026-09-10']
    expect(computeStreak(dates, new Date(2026, 8, 10))).toBe(3)
  })

  it('stays "alive" (does not show 0) when today has no activity yet but yesterday did', () => {
    const dates = ['2026-09-08', '2026-09-09'] // last active yesterday (the 9th), today is the 10th
    expect(computeStreak(dates, new Date(2026, 8, 10))).toBe(2)
  })

  it('resets to 0 on a genuinely missed day (gap before yesterday too)', () => {
    const dates = ['2026-09-05', '2026-09-06'] // nothing on the 7th, 8th, or 9th -- today is the 10th
    expect(computeStreak(dates, new Date(2026, 8, 10))).toBe(0)
  })

  it('a gap in the MIDDLE of the history stops the backward count exactly at the gap', () => {
    // Active today, yesterday, then a gap, then more (older, disconnected) activity.
    const dates = ['2026-09-01', '2026-09-02', '2026-09-09', '2026-09-10']
    expect(computeStreak(dates, new Date(2026, 8, 10))).toBe(2) // only the 9th+10th are consecutive-to-today
  })

  it('is correct across a real month boundary (no off-by-one from days-in-month)', () => {
    const dates = ['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02']
    expect(computeStreak(dates, new Date(2026, 8, 2))).toBe(4)
  })

  it('duplicate dates in the log do not inflate the streak', () => {
    const dates = ['2026-09-10', '2026-09-10', '2026-09-09']
    expect(computeStreak(dates, new Date(2026, 8, 10))).toBe(2)
  })
})

describe('hasAward / totalPoints', () => {
  it('hasAward is true only for a matching permalink+kind pair', () => {
    const events: AwardEvent[] = [{ permalink: '/a', kind: 'mark', date: '2026-01-01', points: 10 }]
    expect(hasAward(events, '/a', 'mark')).toBe(true)
    expect(hasAward(events, '/a', 'complete')).toBe(false) // same permalink, different kind
    expect(hasAward(events, '/b', 'mark')).toBe(false)
  })

  it('totalPoints sums every event\'s recorded points', () => {
    const events: AwardEvent[] = [
      { permalink: '/a', kind: 'mark', date: '2026-01-01', points: MARK_UNDERSTOOD_POINTS },
      { permalink: '/b', kind: 'complete', date: '2026-01-01', points: PROBLEM_COMPLETED_POINTS_MEDIUM },
    ]
    expect(totalPoints(events)).toBe(MARK_UNDERSTOOD_POINTS + PROBLEM_COMPLETED_POINTS_MEDIUM)
  })
})

describe('pointsForDifficulty', () => {
  it('scales the award by real problem difficulty, not one flat value', () => {
    expect(pointsForDifficulty('easy')).toBe(PROBLEM_COMPLETED_POINTS_EASY)
    expect(pointsForDifficulty('medium')).toBe(PROBLEM_COMPLETED_POINTS_MEDIUM)
    expect(pointsForDifficulty('hard')).toBe(PROBLEM_COMPLETED_POINTS_HARD)
  })

  it('falls back to the default (medium-equivalent) value for a problem with no difficulty frontmatter', () => {
    expect(pointsForDifficulty(undefined)).toBe(PROBLEM_COMPLETED_POINTS_DEFAULT)
  })

  it('the three real tiers are genuinely different values, not a token gesture', () => {
    expect(PROBLEM_COMPLETED_POINTS_EASY).toBeLessThan(PROBLEM_COMPLETED_POINTS_MEDIUM)
    expect(PROBLEM_COMPLETED_POINTS_MEDIUM).toBeLessThan(PROBLEM_COMPLETED_POINTS_HARD)
  })
})

describe('mergeEvents', () => {
  it('unions two devices\' logs without dropping either side\'s unique events', () => {
    const a: AwardEvent[] = [{ permalink: '/a', kind: 'mark', date: '2026-01-01', points: 10 }]
    const b: AwardEvent[] = [{ permalink: '/b', kind: 'mark', date: '2026-01-02', points: 10 }]
    const merged = mergeEvents(a, b)
    expect(merged).toHaveLength(2)
    expect(hasAward(merged, '/a', 'mark')).toBe(true)
    expect(hasAward(merged, '/b', 'mark')).toBe(true)
  })

  it('the exact double-counting bug this exists to prevent: the SAME page marked understood on two devices before they ever synced must count ONCE, not twice', () => {
    const deviceA: AwardEvent[] = [{ permalink: '/same-page', kind: 'mark', date: '2026-01-01', points: 10 }]
    const deviceB: AwardEvent[] = [{ permalink: '/same-page', kind: 'mark', date: '2026-01-02', points: 10 }] // different date -- still a dupe by permalink+kind
    const merged = mergeEvents(deviceA, deviceB)
    expect(merged).toHaveLength(1)
    expect(totalPoints(merged)).toBe(10) // not 20
  })

  it('a page marked AND separately completed (different kinds) both survive the merge -- not the same award', () => {
    const a: AwardEvent[] = [{ permalink: '/p', kind: 'mark', date: '2026-01-01', points: 10 }]
    const b: AwardEvent[] = [{ permalink: '/p', kind: 'complete', date: '2026-01-01', points: 50 }]
    const merged = mergeEvents(a, b)
    expect(merged).toHaveLength(2)
    expect(totalPoints(merged)).toBe(60)
  })
})

describe('computeDisplayName', () => {
  it('uses the real Google display name when present', () => {
    expect(computeDisplayName({ displayName: 'Ravi Varma', uid: 'abc123def456' })).toBe('Ravi Varma')
  })

  it('uses email handle when display name is null', () => {
    expect(computeDisplayName({ displayName: null, email: 'ravivarma@gmail.com', uid: 'abc123def456' })).toBe('ravivarma')
  })

  it('falls back to a generic Learner_<id> when no display name or email is set', () => {
    expect(computeDisplayName({ displayName: null, email: null, uid: 'abc123def456' })).toBe('Learner_abc123')
  })

  it('handles a null/undefined user returning Guest Learner', () => {
    expect(computeDisplayName(null)).toBe('Guest Learner')
    expect(computeDisplayName(undefined)).toBe('Guest Learner')
  })
})

describe('totalXpForLevel / levelForPoints', () => {
  it('level 1 starts at 0 XP', () => {
    expect(totalXpForLevel(1)).toBe(0)
    expect(levelForPoints(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 50 })
  })

  it('the XP needed for the next level grows by a constant 100 each time (50, 150, 250, ...)', () => {
    expect(totalXpForLevel(2)).toBe(50)
    expect(totalXpForLevel(3)).toBe(200)
    expect(totalXpForLevel(4)).toBe(450)
    expect(totalXpForLevel(5)).toBe(800)
  })

  it('one point below a level threshold stays at the lower level', () => {
    expect(levelForPoints(49)).toEqual({ level: 1, xpIntoLevel: 49, xpForNextLevel: 50 })
  })

  it('exactly at a level threshold advances to the new level with 0 XP into it', () => {
    expect(levelForPoints(50)).toEqual({ level: 2, xpIntoLevel: 0, xpForNextLevel: 150 })
    expect(levelForPoints(200)).toEqual({ level: 3, xpIntoLevel: 0, xpForNextLevel: 250 })
  })

  it('mid-level points report real progress toward the next level', () => {
    // Level 3 spans [200, 450); 325 is exactly halfway through its 250-point span.
    expect(levelForPoints(325)).toEqual({ level: 3, xpIntoLevel: 125, xpForNextLevel: 250 })
  })
})

describe('topicBreakdown', () => {
  it('is empty for no points earned yet, not a list of zeros', () => {
    expect(topicBreakdown([])).toEqual([])
  })

  it('aggregates points by real top-level group and computes a real percentage of the total', () => {
    const events: AwardEvent[] = [
      { permalink: '/docs/deep-learning/attention-transformers', kind: 'mark', date: '2026-01-01', points: 10 },
      { permalink: '/docs/deep-learning/sequence-models', kind: 'mark', date: '2026-01-01', points: 10 },
      { permalink: '/docs/mlops/observability', kind: 'complete', date: '2026-01-01', points: 50 },
    ]
    const breakdown = topicBreakdown(events)
    // 20 points from deep-learning (-> "Models" group), 50 from mlops (-> "Systems & Infrastructure"), 70 total.
    const models = breakdown.find((b) => b.groupKey === '/docs/category/models')!
    const systems = breakdown.find((b) => b.groupKey === '/docs/category/systems--infrastructure')!
    expect(models.points).toBe(20)
    expect(models.pct).toBeCloseTo(20 / 70)
    expect(systems.points).toBe(50)
    expect(systems.pct).toBeCloseTo(50 / 70)
  })

  it('sorts by points descending and omits groups with zero points', () => {
    const events: AwardEvent[] = [
      { permalink: '/docs/mlops/observability', kind: 'complete', date: '2026-01-01', points: 50 },
      { permalink: '/docs/deep-learning/attention-transformers', kind: 'mark', date: '2026-01-01', points: 10 },
    ]
    const breakdown = topicBreakdown(events)
    expect(breakdown[0].groupKey).toBe('/docs/category/systems--infrastructure') // 50 > 10
    expect(breakdown).toHaveLength(2) // only groups with real points, not all 7
  })
})

describe('normalizePracticeProblemPermalink', () => {
  it('rewrites an old-style practice-problem permalink to its real, current /practice/<slug> form', () => {
    expect(normalizePracticeProblemPermalink('/docs/practice-problems/dot-product')).toBe('/practice/dot-product')
  })

  it('rewrites the old overview permalink to /practice (the real list page), not a slug-shaped path', () => {
    expect(normalizePracticeProblemPermalink('/docs/practice-problems/overview')).toBe('/practice')
  })

  it('leaves every other permalink -- including one that already uses the new /practice/ prefix -- completely untouched', () => {
    expect(normalizePracticeProblemPermalink('/docs/deep-learning/attention-transformers')).toBe('/docs/deep-learning/attention-transformers')
    expect(normalizePracticeProblemPermalink('/practice/dot-product')).toBe('/practice/dot-product')
  })
})

describe('topicBreakdown: practice-problem permalinks', () => {
  it('a /practice/<slug> permalink (the real, current practice-problem URL) still buckets into a real group, not silently dropped', () => {
    const events: AwardEvent[] = [{ permalink: '/practice/dot-product', kind: 'complete', date: '2026-01-01', points: 50 }]
    const breakdown = topicBreakdown(events)
    expect(breakdown).toHaveLength(1)
    expect(breakdown[0].groupKey).toBe('/docs/category/research--build')
    expect(breakdown[0].points).toBe(50)
  })
})

describe('activityCounts', () => {
  it('counts events per local date, not points', () => {
    const events: AwardEvent[] = [
      { permalink: '/a', kind: 'mark', date: '2026-01-01', points: 10 },
      { permalink: '/b', kind: 'mark', date: '2026-01-01', points: 10 },
      { permalink: '/c', kind: 'complete', date: '2026-01-02', points: 50 },
    ]
    expect(activityCounts(events)).toEqual({ '2026-01-01': 2, '2026-01-02': 1 })
  })

  it('is an empty object for no activity', () => {
    expect(activityCounts([])).toEqual({})
  })
})

describe('computeRLValuation', () => {
  it('calculates discounted return G_t with gamma=0.85 and streak multipliers', () => {
    const valuation = computeRLValuation('complete', 'medium', [], ['2026-09-09'], new Date(2026, 8, 10))
    expect(valuation.immediateReward).toBe(50)
    expect(valuation.gamma).toBe(0.85)
    expect(valuation.streakBonus).toBe(1.1)
    expect(valuation.discountedReturn).toBeGreaterThan(valuation.immediateReward)
  })

  it('handles easy and hard problem difficulty scaling in RL valuation', () => {
    const easyVal = computeRLValuation('complete', 'easy', [], [])
    const hardVal = computeRLValuation('complete', 'hard', [], [])
    expect(easyVal.immediateReward).toBe(25)
    expect(hardVal.immediateReward).toBe(100)
    expect(hardVal.discountedReturn).toBeGreaterThan(easyVal.discountedReturn)
  })

  it('handles architecture action kind in RL valuation', () => {
    const archVal = computeRLValuation('architecture', undefined, [], [])
    expect(archVal.immediateReward).toBe(ARCHITECTURE_COMPLETED_POINTS)
    expect(archVal.immediateReward).toBe(50)
  })
})

describe('getArchitectureAward', () => {
  it('finds architecture award by permalink', () => {
    const events: AwardEvent[] = [
      { permalink: '/practice/react-agent-loop', kind: 'architecture', date: '2026-09-09', points: 50 },
      { permalink: '/practice/react-agent-loop', kind: 'complete', date: '2026-09-09', points: 100 },
    ]
    const award = getArchitectureAward(events, '/practice/react-agent-loop')
    expect(award).toBeDefined()
    expect(award?.kind).toBe('architecture')
    expect(award?.points).toBe(50)
  })

  it('returns undefined if no architecture award exists', () => {
    const events: AwardEvent[] = [
      { permalink: '/practice/react-agent-loop', kind: 'complete', date: '2026-09-09', points: 100 },
    ]
    expect(getArchitectureAward(events, '/practice/react-agent-loop')).toBeUndefined()
  })
})

describe('interview rating points', () => {
  it('gives 10 for got it, 5 for partly and 0 for missed', async () => {
    const { INTERVIEW_RATING_POINTS } = await import('./gamification');
    expect(INTERVIEW_RATING_POINTS).toEqual({ 'got-it': 10, partly: 5, missed: 0 });
  });
});
