import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, beforeEach } from 'vitest'
import PracticeListPage from './PracticeListPage'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AuthProvider } from '../contexts/AuthContext'
import { GamificationProvider } from '../contexts/GamificationContext'
import { ProgressProvider } from '../contexts/ProgressContext'
import { CATALOG } from '../data/practiceCatalog'
import { getPracticeProblems } from '../lib/contentTree'

const STORAGE_KEY = 'neural-mastery-gamification'

function renderList() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AuthProvider>
          <ProgressProvider>
            <GamificationProvider>
              <PracticeListPage />
            </GamificationProvider>
          </ProgressProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('PracticeListPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('states the real curated count, not every generated file', () => {
    renderList()
    const total = getPracticeProblems().length
    expect(screen.getByText(new RegExp(`${total}`))).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Practice engineering/i)
    expect(document.body.textContent).not.toMatch(/1549|1,549|Real, Hands-On/)
  })

  it('lists every track, each linking to its own page', () => {
    renderList()
    for (const track of CATALOG) {
      expect(document.querySelector(`a[href="/practice/track/${track.slug}"]`)).not.toBeNull()
    }
  })

  it('lists all 12 Build an Agent stages and marks a passed one', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ permalink: '/practice/agent-loop', kind: 'complete', date: '2026-10-15', points: 20 }]),
    )
    renderList()
    const stageLink = screen.getAllByRole('link', { name: /The Agent Loop/ })[0]
    expect(stageLink).toHaveAttribute('href', '/practice/agent-loop')
    expect(stageLink).toHaveTextContent('✓')
    expect(screen.getByText(/solved solutions/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Continue Build an Agent/ })).toBeInTheDocument()
  })

  it('search finds curated problems by title', async () => {
    renderList()
    await userEvent.type(screen.getByLabelText(/Search problems/i), 'linked list')
    expect(screen.getAllByText(/Reverse a Singly Linked List/i).length).toBeGreaterThan(0)
  })
})
