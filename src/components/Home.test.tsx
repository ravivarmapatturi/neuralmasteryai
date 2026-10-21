import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, beforeEach } from 'vitest'
import Home from './Home'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AuthProvider } from '../contexts/AuthContext'
import { ProgressProvider } from '../contexts/ProgressContext'
import { GamificationProvider } from '../contexts/GamificationContext'
import { getFlatPages } from '../lib/contentTree'
import { SECTION_META, SECTION_ORDER } from '../data/sectionMeta'

const STORAGE_KEY = 'neural-mastery-progress'

function renderHome() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AuthProvider>
          <ProgressProvider>
            <GamificationProvider>
              <Home />
            </GamificationProvider>
          </ProgressProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('Home', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('opens straight onto the topic index for a first-time visitor, with no hero or continue line', () => {
    renderHome()
    expect(screen.getByRole('heading', { level: 1, name: 'All topics' })).toBeInTheDocument()
    expect(screen.queryByText(/^Continue: /)).not.toBeInTheDocument()
    expect(screen.queryByText(/Attention Step-Through/)).not.toBeInTheDocument()
  })

  it('adds a real continue link once a page is marked understood', () => {
    // A real page from the first (in SECTION_ORDER) group's first subsection,
    // so it's guaranteed to be the group nextUnstartedPage should skip past.
    const firstGroupKey = SECTION_ORDER[0]
    const firstDir = SECTION_META[firstGroupKey].subsections[0].dir
    const firstPageInGroup = getFlatPages().find((p) => p.route.includes(`/docs/${firstDir}/`))!

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ [firstPageInGroup.route]: { understood: true, markedAt: Date.now(), stage: 0 } }),
    )

    renderHome()

    // The continue CTA should point at some other real page in the same
    // group, not back at the one already marked understood.
    const continueLink = screen.getByText(/^Continue: /)
    expect(continueLink).toBeInTheDocument()
    expect(continueLink.textContent).not.toContain(firstPageInGroup.title)
  })

  it('never recommends a roadmap.mdx checklist page as the "Continue" target', () => {
    // Every subsection follows the same overview.mdx -> roadmap.mdx (right
    // after it) convention across the site -- marking every real page up to
    // (not including) a group's roadmap.mdx understood is the exact
    // real-world setup that would otherwise surface the checklist page next.
    const groupKey = SECTION_ORDER[0]
    const meta = SECTION_META[groupKey]
    const groupPages = getFlatPages().filter((p) => meta.subsections.some((s) => p.route.includes(`/docs/${s.dir}/`)))
    const roadmapIndex = groupPages.findIndex((p) => p.route.endsWith('/roadmap'))
    expect(roadmapIndex).toBeGreaterThan(-1) // sanity: this group really has one

    const understood: Record<string, unknown> = {}
    for (const p of groupPages.slice(0, roadmapIndex)) {
      understood[p.route] = { understood: true, markedAt: Date.now(), stage: 0 }
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(understood))

    renderHome()

    const continueLink = screen.getByText(/^Continue: /).closest('a')!
    expect(continueLink.getAttribute('href')).not.toMatch(/\/roadmap$/)
  })

  it('falls back to the first-time view when the only marked entry is for a page that no longer exists', () => {
    // Mirrors ProgressPage's own titleFor comment: a stored permalink can
    // stop matching any current page (renamed/removed content) -- that
    // shouldn't read as "you've understood 0 pages".
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ '/docs/some-removed-section/gone-page': { understood: true, markedAt: Date.now(), stage: 0 } }),
    )

    renderHome()

    expect(screen.queryByText(/^Continue: /)).not.toBeInTheDocument()
  })

  it('surfaces a due-for-review count and links to the progress page once one exists', () => {
    const oldMarkedAt = Date.now() - 2 * 24 * 60 * 60 * 1000 // 2 days ago -> past the 1-day first interval
    const somePage = getFlatPages()[0]

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ [somePage.route]: { understood: true, markedAt: oldMarkedAt, stage: 0 } }),
    )

    renderHome()

    const reviewLink = screen.getByText('Review 1 due page →')
    expect(reviewLink.closest('a')).toHaveAttribute('href', '/progress')
  })

  it('does not render the removed Test Yourself section', () => {
    renderHome()

    // "Test yourself" QA section removed
    expect(screen.queryByText('Test yourself')).not.toBeInTheDocument()
    expect(screen.queryByText(/What is a KV cache/)).not.toBeInTheDocument()
  })
})
