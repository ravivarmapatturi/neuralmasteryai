import { screen } from '@testing-library/react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, beforeEach } from 'vitest'
import Sidebar from './Sidebar'
import { ThemeProvider } from '../../theme/ThemeProvider'
import { getSidebar } from '../../lib/contentTree'

// A real, currently-existing route this session worked on directly --
// using real content (not a mock) matches how sectionMeta.test.ts already
// validates against the live content tree, and catches a route rename
// the same way that test does.
const REAL_ROUTE = '/docs/llms-genai/rag'
const realSection = getSidebar().find((s) => s.pages.some((p) => p.route === REAL_ROUTE))!

// Nav links show the short navLabel ("Overview"), which repeats across
// sections, so find a page's link by its address rather than its text.
const linkTo = (route: string) => document.querySelector(`a[href="${route}"]`)

function renderSidebar(initialRoute = '/') {
  window.localStorage.clear()
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Sidebar />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders every real top-level sidebar section label', () => {
    renderSidebar()
    for (const section of getSidebar()) {
      expect(screen.getByText(section.label)).toBeInTheDocument()
    }
  })

  it('auto-expands the section containing the current route on mount, without any click', () => {
    renderSidebar(REAL_ROUTE)
    // A page from the active route's own section should be visible as a nav link.
    const activePage = realSection.pages.find((p) => p.route === REAL_ROUTE)!
    expect(linkTo(activePage.route)).toHaveTextContent(activePage.navLabel)
  })

  it('auto-expands correctly even with a trailing slash on the route (GitHub Pages redirects a direct/bookmarked URL to this form; stored routes never have one)', () => {
    renderSidebar(`${REAL_ROUTE}/`)
    const activePage = realSection.pages.find((p) => p.route === REAL_ROUTE)!
    expect(linkTo(activePage.route)).toHaveTextContent(activePage.navLabel)
  })

  it('is an accordion: opening a second section closes the first', async () => {
    const user = userEvent.setup()
    renderSidebar(REAL_ROUTE) // starts with realSection open
    const activePage = realSection.pages.find((p) => p.route === REAL_ROUTE)!
    expect(linkTo(activePage.route)).toHaveTextContent(activePage.navLabel)

    // Open a different section (any other one).
    const otherSection = getSidebar().find((s) => s.id !== realSection.id)!
    await user.click(screen.getByText(otherSection.label))

    // The first section's page link should no longer be rendered (collapsed).
    expect(linkTo(activePage.route)).toBeNull()
    // The newly clicked section's first page should now show.
    expect(linkTo(otherSection.pages[0].route)).toHaveTextContent(otherSection.pages[0].navLabel)
  })

  it('clicking the currently-open section header collapses it (toggle closed)', async () => {
    const user = userEvent.setup()
    renderSidebar(REAL_ROUTE)
    const activePage = realSection.pages.find((p) => p.route === REAL_ROUTE)!
    expect(linkTo(activePage.route)).toHaveTextContent(activePage.navLabel)

    await user.click(screen.getByText(realSection.label))
    expect(linkTo(activePage.route)).toBeNull()
  })

  it('persists the open section to localStorage under the expected key', async () => {
    const user = userEvent.setup()
    renderSidebar('/')
    const otherSection = getSidebar()[0]
    await user.click(screen.getByText(otherSection.label))
    expect(window.localStorage.getItem('neural-mastery-sidebar-expanded-sections')).toBe(otherSection.id)
  })
})
