import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, beforeEach } from 'vitest'
import BadgeShowcase from './BadgeShowcase'
import { BADGES } from '../../lib/badges'
import { ThemeProvider } from '../../theme/ThemeProvider'
import { AuthProvider } from '../../contexts/AuthContext'
import { GamificationProvider } from '../../contexts/GamificationContext'

const STORAGE_KEY = 'neural-mastery-gamification'

function renderShowcase() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AuthProvider>
          <GamificationProvider>
            <BadgeShowcase />
          </GamificationProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('BadgeShowcase (spec v2 Part 4)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows earned badges by default, and every badge with real progress under All', async () => {
    renderShowcase()
    expect(screen.getByText(`You've earned 0 of ${BADGES.length}.`)).toBeInTheDocument()
    // Only earned badges show by default -- a new learner sees an empty state, not a wall of locks
    expect(screen.queryAllByText('LOCKED')).toHaveLength(0)
    expect(screen.getByText(/None yet/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: `All (${BADGES.length})` }))
    // Locked badges are shown with LOCKED tags
    const lockedPills = screen.getAllByText('LOCKED')
    expect(lockedPills.length).toBe(BADGES.length)

    // Check that real unlock progress is displayed
    const progressLabels = screen.getAllByText('Progress:')
    expect(progressLabels.length).toBeGreaterThan(0)
  })

  it('displays unlocked badge with rarity tier when earned, alongside locked badges with progress', async () => {
    // 50 XP -> unlocks "Curious Mind" (first-step)
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ permalink: '/practice/dot-product', kind: 'complete', date: '2026-09-10', points: 50 }]),
    )
    renderShowcase()

    expect(screen.getByText(`You've earned 2 of ${BADGES.length}.`)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: `All (${BADGES.length})` }))
    expect(screen.getByText('Curious Mind')).toBeInTheDocument()
    expect(screen.getByText('First Code')).toBeInTheDocument()
    // Unlocked badge displays rarity label
    const commonLabels = screen.getAllByText('Common')
    expect(commonLabels.length).toBeGreaterThan(0)

    // Other badges remain locked with progress
    expect(screen.getByText('Code Ninja')).toBeInTheDocument()
    expect(screen.getAllByText('LOCKED').length).toBe(BADGES.length - 2)
  })

  it('filters badges by category and status', async () => {
    const user = userEvent.setup()
    renderShowcase()
    await user.click(screen.getByRole('button', { name: `All (${BADGES.length})` }))

    // Click "Learning" category tab
    await user.click(screen.getByRole('button', { name: 'Learning' }))
    const learningBadges = BADGES.filter((b) => b.category === 'learning')
    for (const b of learningBadges) {
      expect(screen.getByText(b.title)).toBeInTheDocument()
    }

    // Practice badge should not be in learning tab
    expect(screen.queryByText('Code Ninja')).not.toBeInTheDocument()

    // Click "All" tab again
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('Code Ninja')).toBeInTheDocument()
  })
})
