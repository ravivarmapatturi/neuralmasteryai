import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProblemNotes, RelatedProblems } from './ProblemNotes'

describe('ProblemNotes', () => {
  it('saves notes per problem in this browser and restores them', () => {
    vi.useFakeTimers()
    window.localStorage.clear()
    const { unmount } = render(<ProblemNotes problemId="agent-loop" />)
    fireEvent.change(screen.getByLabelText(/Your notes/), { target: { value: 'stop when no tool call' } })
    act(() => { vi.advanceTimersByTime(500) })
    expect(window.localStorage.getItem('nm-problem-notes:agent-loop')).toBe('stop when no tool call')
    unmount()
    render(<ProblemNotes problemId="agent-loop" />)
    expect(screen.getByLabelText(/Your notes/)).toHaveValue('stop when no tool call')
    vi.useRealTimers()
  })

  it('links related problems with their points', () => {
    render(<MemoryRouter><RelatedProblems problemId="agent-loop" /></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: 'Related problems' })
    expect(nav.querySelectorAll('a').length).toBeGreaterThan(0)
    expect(nav).toHaveTextContent(/points/)
  })
})
