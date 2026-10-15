import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, beforeEach } from 'vitest'
import ProgressPage from './ProgressPage'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AuthProvider } from '../contexts/AuthContext'
import { ProgressProvider } from '../contexts/ProgressContext'
import { GamificationProvider } from '../contexts/GamificationContext'
import { REVIEW_COMPLETED_POINTS } from '../lib/gamification'

const GAMIFICATION_STORAGE_KEY = 'neural-mastery-gamification'
const PROGRESS_STORAGE_KEY = 'neural-mastery-progress'

function renderProgressPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AuthProvider>
          <ProgressProvider>
            <GamificationProvider>
              <ProgressPage />
            </GamificationProvider>
          </ProgressProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('ProgressPage layout', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders a plain summary, the next step, and lessons vs practice side by side -- no rank ladder or badge wall', () => {
    renderProgressPage()
    expect(screen.getByRole('heading', { name: 'Your progress' })).toBeInTheDocument()
    expect(screen.getByText(/pages understood and solved/i)).toBeInTheDocument()
    expect(screen.getByText('Up next')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lessons' })).toBeInTheDocument()
    expect(screen.getByText('By section')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Practice' })).toBeInTheDocument()
    expect(screen.getByText('By track')).toBeInTheDocument()
    expect(screen.queryByText('Rank ladder')).not.toBeInTheDocument()
    expect(screen.queryByText('Badges')).not.toBeInTheDocument()
  })
})

describe('ProgressPage: real reward-gap fix -- completing a scheduled review earns real points', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('clicking a real due-for-review page awards REVIEW_COMPLETED_POINTS, on top of whatever it already had', async () => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ '/docs/deep-learning/attention-transformers': { understood: true, markedAt: twoDaysAgo, stage: 0 } }),
    )
    renderProgressPage()
    expect(screen.getByText('Due for review')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /reviewed/i }))

    // The button click both advances the real spaced-repetition schedule
    // (ProgressContext's own concern) AND awards real points for the
    // same real action (GamificationContext's concern) -- two real,
    // independent effects of one real click, not a fabricated trigger.
    const events = JSON.parse(window.localStorage.getItem(GAMIFICATION_STORAGE_KEY) ?? '[]')
    const reviewEvents = events.filter((e: { kind: string }) => e.kind === 'review')
    expect(reviewEvents).toHaveLength(1)
    expect(reviewEvents[0].points).toBe(REVIEW_COMPLETED_POINTS)
    expect(reviewEvents[0].permalink).toBe('review:/docs/deep-learning/attention-transformers:1') // stage 0 -> 1
  })
})
