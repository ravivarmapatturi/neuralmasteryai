import { render as rtlRender, screen, type RenderResult } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ELI5, GoDeeper, QA, Solution } from './ExpandableDepth'
import { ThemeProvider } from '../../theme/ThemeProvider'
import { AuthProvider } from '../../contexts/AuthContext'
import { GamificationProvider, useGamification } from '../../contexts/GamificationContext'
import { DEPTH_REVEAL_POINTS } from '../../lib/gamification'

// ELI5/GoDeeper now award real, first-reveal-only points on open (see
// useDepthRevealHandler in ExpandableDepth.tsx), which needs a real route
// (useLocation) and GamificationProvider -- ThemeProvider alone (this
// file's previous wrapper) is no longer enough. Local to this file rather
// than widening the shared renderWithTheme helper, which many other,
// unrelated tests use and don't need this heavier tree for.
function render(ui: ReactElement): RenderResult {
  return rtlRender(
    <ThemeProvider>
      <MemoryRouter>
        <AuthProvider>
          <GamificationProvider>{ui}</GamificationProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('ELI5', () => {
  it('defaults open -- content is in the DOM without any interaction', () => {
    render(<ELI5>Plain-English explanation text.</ELI5>)
    expect(screen.getByText('Plain-English explanation text.')).toBeInTheDocument()
  })

  it('shows the "Simple Explanation" label, not the raw "ELI5" jargon', () => {
    render(<ELI5>content</ELI5>)
    expect(screen.getByText('Simple explanation')).toBeInTheDocument()
    expect(screen.queryByText(/^ELI5$/)).not.toBeInTheDocument()
  })

  it('collapses on click -- content is actually removed from the DOM, not just visually hidden', async () => {
    const user = userEvent.setup()
    render(<ELI5>Plain-English explanation text.</ELI5>)
    await user.click(screen.getByRole('button'))
    // Conditional render ({open && <div>...}), not CSS display:none -- the
    // exact distinction that mattered for the earlier prerender-timing bug
    // this session's memory records (a Suspense-fallback vs. real content
    // question, same "is it actually there or just hidden" category).
    expect(screen.queryByText('Plain-English explanation text.')).not.toBeInTheDocument()
  })

  it('re-expands on a second click', async () => {
    const user = userEvent.setup()
    render(<ELI5>Plain-English explanation text.</ELI5>)
    const button = screen.getByRole('button')
    await user.click(button)
    await user.click(button)
    expect(screen.getByText('Plain-English explanation text.')).toBeInTheDocument()
  })

  it('accepts a custom title, overriding the default label', () => {
    render(<ELI5 title="Custom on-ramp title">content</ELI5>)
    expect(screen.getByText('Custom on-ramp title')).toBeInTheDocument()
    expect(screen.queryByText('Simple Explanation')).not.toBeInTheDocument()
  })

  it('sets aria-expanded to reflect the real open state', async () => {
    const user = userEvent.setup()
    render(<ELI5>content</ELI5>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('GoDeeper', () => {
  it('defaults CLOSED -- content is not in the DOM until opened', () => {
    render(<GoDeeper>Expert-level extra detail.</GoDeeper>)
    expect(screen.queryByText('Expert-level extra detail.')).not.toBeInTheDocument()
  })

  it('shows the "Go deeper" label', () => {
    render(<GoDeeper>content</GoDeeper>)
    expect(screen.getByText('Go deeper')).toBeInTheDocument()
  })

  it('expands on click, revealing real content', async () => {
    const user = userEvent.setup()
    render(<GoDeeper>Expert-level extra detail.</GoDeeper>)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Expert-level extra detail.')).toBeInTheDocument()
  })

  it('aria-expanded starts false and flips true after opening', async () => {
    const user = userEvent.setup()
    render(<GoDeeper>content</GoDeeper>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('Solution', () => {
  it('defaults CLOSED -- the answer is not in the DOM until the learner asks for it', () => {
    render(<Solution>Reference implementation.</Solution>)
    expect(screen.queryByText('Reference implementation.')).not.toBeInTheDocument()
  })

  it('shows the "Show solution" label by default', () => {
    render(<Solution>content</Solution>)
    expect(screen.getByText('Show solution')).toBeInTheDocument()
  })

  it('expands on click, revealing the real solution content', async () => {
    const user = userEvent.setup()
    render(<Solution>Reference implementation.</Solution>)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Reference implementation.')).toBeInTheDocument()
  })
})

describe('QA', () => {
  it('defaults CLOSED -- the answer is not in the DOM until clicked, so it actually tests recall', () => {
    render(<QA q="What is a Transformer?">A neural network architecture built on self-attention.</QA>)
    expect(screen.queryByText('A neural network architecture built on self-attention.')).not.toBeInTheDocument()
  })

  it('shows the question text as the always-visible header', () => {
    render(<QA q="What is a Transformer?">content</QA>)
    expect(screen.getByText('What is a Transformer?')).toBeInTheDocument()
  })

  it('expands on click, revealing the real answer', async () => {
    const user = userEvent.setup()
    render(<QA q="What is a Transformer?">A neural network architecture built on self-attention.</QA>)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('A neural network architecture built on self-attention.')).toBeInTheDocument()
  })

  it('fires onReveal on every closed->open transition, never on the open->closed transition itself', async () => {
    // The component fires on every reveal, by design -- real once-ever
    // "first reveal only" de-duplication happens one layer up, in
    // GamificationContext's award() (hasAward() check), the same
    // no-double-award contract every other award kind uses. This test
    // only covers what THIS component is responsible for: never firing
    // on close, and firing again on a genuine re-open.
    const user = userEvent.setup()
    const onReveal = vi.fn()
    render(
      <QA q="What is a Transformer?" onReveal={onReveal}>
        content
      </QA>,
    )
    const button = screen.getByRole('button')
    await user.click(button) // open (first reveal)
    expect(onReveal).toHaveBeenCalledTimes(1)
    await user.click(button) // close
    expect(onReveal).toHaveBeenCalledTimes(1) // not called again on collapse
    await user.click(button) // re-open
    expect(onReveal).toHaveBeenCalledTimes(2) // real component behavior: fires again on a genuine re-open
  })

  it('never calls onReveal at all if the card is never opened', () => {
    const onReveal = vi.fn()
    render(
      <QA q="What is a Transformer?" onReveal={onReveal}>
        content
      </QA>,
    )
    expect(onReveal).not.toHaveBeenCalled()
  })
})

function PointsHarness({ children }: { children: ReactNode }) {
  const { points } = useGamification()
  return (
    <div>
      <div data-testid="points">{points}</div>
      {children}
    </div>
  )
}

describe('ELI5/GoDeeper: real reward-gap fix -- opening one earns real points', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('re-opening a closed ELI5 block (a genuine reveal, since it starts open) earns DEPTH_REVEAL_POINTS', async () => {
    const user = userEvent.setup()
    render(
      <PointsHarness>
        <ELI5 title="A real on-ramp">Plain-English text.</ELI5>
      </PointsHarness>,
    )
    expect(screen.getByTestId('points')).toHaveTextContent('0')
    const button = screen.getByRole('button')
    await user.click(button) // close (it starts open)
    await user.click(button) // re-open -- the real reveal transition
    expect(screen.getByTestId('points')).toHaveTextContent(String(DEPTH_REVEAL_POINTS))
  })

  it('opening a GoDeeper block earns DEPTH_REVEAL_POINTS, and re-opening it again does not double-award', async () => {
    const user = userEvent.setup()
    render(
      <PointsHarness>
        <GoDeeper title="A real deep-dive">Advanced detail.</GoDeeper>
      </PointsHarness>,
    )
    expect(screen.getByTestId('points')).toHaveTextContent('0')
    const button = screen.getByRole('button')
    await user.click(button) // open -- first reveal
    expect(screen.getByTestId('points')).toHaveTextContent(String(DEPTH_REVEAL_POINTS))
    await user.click(button) // close
    await user.click(button) // re-open -- onReveal fires again, but award() itself is idempotent
    expect(screen.getByTestId('points')).toHaveTextContent(String(DEPTH_REVEAL_POINTS)) // unchanged, not doubled
  })

  it('two GoDeeper blocks with different titles on the same page each earn their own real reward', async () => {
    const user = userEvent.setup()
    render(
      <PointsHarness>
        <GoDeeper title="First deep-dive">First.</GoDeeper>
        <GoDeeper title="Second deep-dive">Second.</GoDeeper>
      </PointsHarness>,
    )
    const [firstButton, secondButton] = screen.getAllByRole('button')
    await user.click(firstButton)
    expect(screen.getByTestId('points')).toHaveTextContent(String(DEPTH_REVEAL_POINTS))
    await user.click(secondButton)
    expect(screen.getByTestId('points')).toHaveTextContent(String(DEPTH_REVEAL_POINTS * 2))
  })
})
