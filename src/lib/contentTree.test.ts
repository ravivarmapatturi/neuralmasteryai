import { describe, expect, it } from 'vitest'
import { getSidebar, getPageByRoute, getPracticeProblems, getAllPracticeProblems, getFlatPages, legacyPracticeRedirect } from './contentTree'
import { getPracticeProblem } from './practiceProblem'

describe('contentTree: practice-problems -> /practice IA split', () => {
  it('a real practice-problem page resolves by its NEW /practice/<slug> route', () => {
    const page = getPageByRoute('/practice/dot-product')
    expect(page).toBeDefined()
    expect(page!.route).toBe('/practice/dot-product')
    expect(page!.section).toBe('practice-problems')
  })

  it('the OLD /docs/practice-problems/<slug> route no longer resolves to anything -- the URL moved, not the content', () => {
    expect(getPageByRoute('/docs/practice-problems/dot-product')).toBeUndefined()
  })

  it('overview.mdx is gone entirely -- neither its old nor a hypothetical new route resolves', () => {
    expect(getPageByRoute('/docs/practice-problems/overview')).toBeUndefined()
    expect(getPageByRoute('/practice/overview')).toBeUndefined()
  })

  it('getSidebar() excludes practice-problems -- it is a top-level destination now, not a docs sidebar section', () => {
    const ids = getSidebar().map((s) => s.id)
    expect(ids).not.toContain('practice-problems')
  })

  it('getFlatPages() (derived from getSidebar()) also excludes practice-problems, so PrevNext/ProgressPage never see them', () => {
    const routes = getFlatPages().map((p) => p.route)
    expect(routes.some((r) => r.startsWith('/practice/'))).toBe(false)
  })

  it('getPracticeProblems() returns every real practice problem, independent of the docs sidebar', () => {
    const problems = getPracticeProblems()
    expect(problems.length).toBeGreaterThan(40) // real count is 53; a loose floor so unrelated content edits don't break this
    expect(problems.every((p) => p.route.startsWith('/practice/'))).toBe(true)
    expect(problems.some((p) => p.route === '/practice/overview')).toBe(false)
  })

  it('every curated practice problem carries a topic and a difficulty', () => {
    const problems = getPracticeProblems()
    expect(problems.every((p) => p.topic)).toBe(true)
    expect(problems.every((p) => p.difficulty)).toBe(true)
  })

  it('every curated practice problem resolves, by its public slug, to structured test data for the IDE workspace', () => {
    const problems = getPracticeProblems()
    expect(problems.length).toBeGreaterThan(200)
    for (const prob of problems) {
      const slug = prob.route.replace(/^\/practice\//, '')
      const structured = getPracticeProblem(slug)
      expect(structured).toBeDefined()
      expect(structured!.id).toBe(prob.problemId)
      expect(structured!.title).toBeTruthy()
      expect(structured!.functionName).toBeTruthy()
      expect(structured!.starterCode).toContain('def ')
      expect(structured!.libraryPolicyText).toBeTruthy()
      expect(structured!.testCases.length).toBeGreaterThan(1)
    }
  })

  it('curated problems get descriptive URLs, and old file-id URLs and hidden duplicates redirect to them', () => {
    expect(getPracticeProblems().some((p) => p.route === '/practice/reverse-a-singly-linked-list')).toBe(true)
    expect(legacyPracticeRedirect('/practice/ll-queue-prob-1')).toBe('/practice/reverse-a-singly-linked-list')
    expect(legacyPracticeRedirect('/practice/ds-algo-prob-1')).toBe('/practice/reverse-a-singly-linked-list')
    expect(legacyPracticeRedirect('/practice/reverse-a-singly-linked-list')).toBeUndefined()
    expect(legacyPracticeRedirect('/practice/agent-loop')).toBeUndefined()
  })

  it('hidden problems keep their pages but stay out of the curated list', () => {
    expect(getPageByRoute('/practice/agent-loop-prob-2')).toBeDefined()
    expect(getPracticeProblems().some((p) => p.problemId === 'agent-loop-prob-2')).toBe(false)
    expect(getAllPracticeProblems().length).toBeGreaterThan(getPracticeProblems().length)
  })

  it('strips generator boilerplate from practice titles', () => {
    for (const p of getAllPracticeProblems()) {
      expect(p.title).not.toMatch(/^Practice:/)
      expect(p.title).not.toMatch(/^#\d+\./)
    }
  })
})
