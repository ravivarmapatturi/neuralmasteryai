import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ChooserPage from './ChooserPage'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AuthProvider } from '../contexts/AuthContext'
import { GamificationProvider } from '../contexts/GamificationContext'
import { ProgressProvider } from '../contexts/ProgressContext'
import { groupLandingRoute } from '../data/sectionMeta'

function renderChooser() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AuthProvider>
          <ProgressProvider>
            <GamificationProvider>
              <ChooserPage />
            </GamificationProvider>
          </ProgressProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('ChooserPage', () => {
  it('introduces the product, says how a page works, and routes to both real destinations', () => {
    renderChooser()
    expect(screen.getByRole('heading', { name: /Learn AI from\s*First Principles/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Understand it\. See it work\. Make the decision\./i })).toBeInTheDocument()
    const learnLink = screen.getAllByRole('link', { name: /Start learning/i })[0]
    const playgroundLink = screen.getByRole('link', { name: /Open the Playground/i })
    expect(learnLink).toHaveAttribute('href', '/learn')
    expect(playgroundLink).toHaveAttribute('href', '/playground')
  })

  it('states exact page and problem counts, with no inflating "+"', () => {
    renderChooser()
    const counts = screen.getByRole('list', { name: 'What is on the site' })
    for (const label of ['Learn pages', 'live playgrounds', 'practice problems', 'interview questions']) {
      expect(counts.textContent).toMatch(new RegExp(`\\d+ ?${label}`))
    }
    expect(screen.getByRole('link', { name: /interview questions/ })).toHaveAttribute('href', '/interview/questions')
    expect(screen.queryByText(/\d+\+/)).not.toBeInTheDocument()
  })

  it('surfaces the actual curriculum domains rather than invented feature claims, linking to a REAL page -- not the bare SECTION_META key, which 404s', () => {
    renderChooser()
    expect(screen.getAllByRole('link', { name: /Foundations/i })[0]).toHaveAttribute('href', groupLandingRoute('/docs/category/foundations'))
    expect(screen.getByRole('link', { name: /Systems & Infrastructure/i })).toHaveAttribute(
      'href',
      groupLandingRoute('/docs/category/systems--infrastructure'),
    )
  })

  it('no longer embeds the practice playground (it lives on /practice)', () => {
    renderChooser()
    expect(screen.queryByRole('heading', { name: /Practice the algorithms you just learned/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Run/i })).not.toBeInTheDocument()
  })
})
