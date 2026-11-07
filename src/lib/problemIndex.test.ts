import { describe, expect, it } from 'vitest'
import { dailyProblem, dayNumber, getProblemRows, relatedProblems } from './problemIndex'

describe('problemIndex', () => {
  const rows = getProblemRows()

  it('lists each curated problem once with points by difficulty', () => {
    expect(rows.length).toBeGreaterThan(100)
    expect(new Set(rows.map((r) => r.page.route)).size).toBe(rows.length)
    for (const r of rows) {
      if (r.page.difficulty === 'easy') expect(r.points).toBe(25)
      if (r.page.difficulty === 'hard') expect(r.points).toBe(100)
    }
  })

  it('gives the same daily problem all day and a different one tomorrow', () => {
    const a = dailyProblem(rows, new Date('2026-11-07T01:00:00Z'))
    const b = dailyProblem(rows, new Date('2026-11-07T23:00:00Z'))
    const c = dailyProblem(rows, new Date('2026-11-08T01:00:00Z'))
    expect(a).toBe(b)
    expect(c).not.toBe(a)
    expect(dayNumber(new Date('1970-01-02T05:00:00Z'))).toBe(1)
  })

  it('suggests the next problems in the same track first', () => {
    const related = relatedProblems('/practice/agent-loop')
    expect(related.length).toBeGreaterThan(0)
    expect(related[0].track.slug).toBe('build-an-agent')
    expect(related.some((r) => r.page.route === '/practice/agent-loop')).toBe(false)
  })
})
