import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, beforeEach } from 'vitest'
import PracticeTrackPage from './PracticeTrackPage'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AuthProvider } from '../contexts/AuthContext'
import { GamificationProvider } from '../contexts/GamificationContext'
import { ProgressProvider } from '../contexts/ProgressContext'
import { CATALOG } from '../data/practiceCatalog'

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>
}

function renderTrack(topicSlug: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[`/practice/track/${topicSlug}`]}>
        <AuthProvider>
          <ProgressProvider>
            <GamificationProvider>
              <Routes>
                <Route path="/practice/track/:topicSlug" element={<><PracticeTrackPage /><Where /></>} />
                <Route path="/practice" element={<div>practice list</div>} />
              </Routes>
            </GamificationProvider>
          </ProgressProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('PracticeTrackPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('lists the curated track in order, with its title and real problem count', () => {
    renderTrack('build-an-agent')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Build an Agent')
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/practice/agent-'))
    expect(links.map((a) => a.getAttribute('href'))).toEqual(CATALOG[0].problems.map((id) => `/practice/${id}`))
    expect(screen.getByText(/12 problems · 0 passed/)).toBeInTheDocument()
    expect(screen.getByText(/one program built in stages/i)).toBeInTheDocument()
  })

  it('redirects an old raw-topic track URL to the curated track that absorbed it', () => {
    renderTrack('agent-loop-engineering')
    expect(screen.getByTestId('where')).toHaveTextContent('/practice/track/build-an-agent')
  })

  it('sends an unknown track back to /practice', () => {
    renderTrack('not-a-track')
    expect(screen.getByText('practice list')).toBeInTheDocument()
  })
})
