import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import ProfilePage from './ProfilePage'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AuthProvider } from '../contexts/AuthContext'
import { GamificationProvider } from '../contexts/GamificationContext'
import { ProgressProvider } from '../contexts/ProgressContext'

const STORAGE_KEY = 'neural-mastery-gamification'

function renderProfile() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AuthProvider>
          <ProgressProvider>
            <GamificationProvider>
              <ProfilePage />
            </GamificationProvider>
          </ProgressProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.spyOn(Date, 'now').mockImplementation(() => new Date(2026, 8, 10).getTime())
  })

  it('renders a real identity, level 1, and 0 points/streak for a brand-new signed-out visitor', () => {
    renderProfile()
    expect(screen.getByRole('heading', { name: /Guest Learner/i })).toBeInTheDocument()
    expect(screen.getByText(/^Level 1$/)).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThan(0) // points and measured mastery start at zero
    expect(screen.getByText(/sign in to keep it across devices/i)).toBeInTheDocument()
    // Real user report this guards against: a signed-in visitor sees a bare
    // "0 days" with no explanation and assumes it's a bug. A visitor who has
    // genuinely never earned an award gets the "start your streak" message,
    // not the "reset" one -- those are different real situations.
    expect(screen.getByText(/mark a page understood or solve a practice problem to start your streak/i)).toBeInTheDocument()
  })

  it('shows a "streak reset" message, not "start your streak", when past activity exists but the streak already broke', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      // "now" is mocked to 2026-09-10; this award is 5 days stale, well past
      // the "still alive until midnight" 1-day grace computeStreak allows.
      JSON.stringify([{ permalink: '/docs/deep-learning/attention-transformers', kind: 'mark', date: '2026-09-05', points: 10 }]),
    )
    renderProfile()
    expect(screen.getByText(/^0 days$/)).toBeInTheDocument()
    expect(screen.getByText(/streak reset — do that again today to start a new one/i)).toBeInTheDocument()
    expect(screen.queryByText(/mark a page understood or solve a practice problem to start your streak/i)).not.toBeInTheDocument()
  })

  it('reflects real earned points as level/XP progress and a topic breakdown, not zeros', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ permalink: '/docs/deep-learning/attention-transformers', kind: 'complete', date: '2026-09-10', points: 50 }]),
    )
    renderProfile()
    expect(screen.getByText(/^Level 2$/)).toBeInTheDocument() // 50 points crosses the level-2 threshold
    expect(screen.getByText('50')).toBeInTheDocument() // points stat
    expect(screen.getByText(/50 pts · 100%/)).toBeInTheDocument() // sole topic group gets 100% of the pie
  })

  it('shows the real current rank prominently for a brand-new learner -- real Initiate, not "unranked"', () => {
    renderProfile()
    expect(screen.getByText('Rank')).toBeInTheDocument()
    expect(screen.getByText('Initiate')).toBeInTheDocument()
    expect(screen.getByText(/levels? to/i)).toBeInTheDocument()
    expect(screen.getByText('Apprentice')).toBeInTheDocument() // the real next tier shown
  })

  it('rank updates to the real next tier once level actually crosses that tier\'s boundary', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      // Level for 20000 points: floor(1 + sqrt(20000/50)) = floor(1+20) = 21 -- real Specialist tier (minLevel 21).
      JSON.stringify([{ permalink: '/docs/deep-learning/attention-transformers', kind: 'complete', date: '2026-09-10', points: 20000 }]),
    )
    renderProfile()
    expect(screen.getByText('Specialist')).toBeInTheDocument()
  })

  it('cross-links to /progress instead of duplicating the page-by-page checklist', () => {
    renderProfile()
    const link = screen.getByText(/checklist and review queue are on/i).querySelector('a')
    expect(link).toHaveAttribute('href', '/progress')
  })

  it('renders the pseudo-3D avatar and no specialization title before any practice problem is solved', () => {
    renderProfile()
    expect(screen.getByTestId('pseudo-3d-avatar')).toBeInTheDocument()
    expect(screen.queryByText(/most solves in/i)).not.toBeInTheDocument()
  })

  it('genuinely derives the learner identity title from real practice history', () => {
    // When deep-learning has the most solves -> Deep Learning Specialist
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { permalink: '/practice/adamw-optimizer', kind: 'complete', date: '2026-09-10', points: 30 },
      ]),
    )
    renderProfile()
    expect(screen.getByText(/^Deep Learning Specialist · most solves in/i)).toBeInTheDocument()
  })

  it('shifts learner identity title when another track becomes dominant', () => {
    // 2 solves in transformers-llms vs 1 in deep-learning
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { permalink: '/practice/adamw-optimizer', kind: 'complete', date: '2026-09-10', points: 30 },
        { permalink: '/practice/llm-internals-prob-1', kind: 'complete', date: '2026-09-10', points: 30 },
        { permalink: '/practice/llm-internals-prob-10', kind: 'complete', date: '2026-09-10', points: 30 },
      ]),
    )
    renderProfile()
    expect(screen.getByText(/^Transformer Architect · most solves in/i)).toBeInTheDocument()
  })

  it('prominently renders all real stats in the player card', () => {
    renderProfile()
    expect(screen.getByText('Pages understood')).toBeInTheDocument()
    expect(screen.getByText('Problems solved')).toBeInTheDocument()
    expect(screen.getByText('Streak')).toBeInTheDocument()
    expect(screen.getAllByText('Badges')).toHaveLength(2) // stat label + the showcase heading
  })
})
