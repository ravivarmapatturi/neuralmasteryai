import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { BankScore, Calc, Choice, parseNumber, withinTolerance } from './InterviewCheck'

const OPTIONS = [
  { text: 'Lower the learning rate', why: 'Steps that are too large overshoot.' },
  { text: 'Raise the learning rate', why: 'That makes the bouncing worse.' },
  { text: 'Use a bigger model', why: 'Capacity is not the problem.' },
]

describe('parseNumber / withinTolerance', () => {
  it('accepts the ways people type numbers', () => {
    expect(parseNumber('1,500')).toBe(1500)
    expect(parseNumber(' 1.5e3 ')).toBe(1500)
    expect(parseNumber('0.75')).toBe(0.75)
    expect(parseNumber('75%')).toBe(75)
    expect(parseNumber('.5')).toBe(0.5)
    expect(parseNumber('about 3')).toBeNull()
    expect(parseNumber('')).toBeNull()
  })

  it('checks within a relative tolerance, and exactly when the tolerance is 0', () => {
    expect(withinTolerance(0.429, 0.4286, 0.01)).toBe(true)
    expect(withinTolerance(0.45, 0.4286, 0.01)).toBe(false)
    expect(withinTolerance(8000, 8000, 0)).toBe(true)
    expect(withinTolerance(8001, 8000, 0)).toBe(false)
  })
})

describe('Choice', () => {
  beforeEach(() => window.localStorage.clear())

  it('hides the worked answer until the right option is picked, and explains a wrong pick', async () => {
    const user = userEvent.setup()
    render(<Choice id="t-choice" q="Loss oscillates. What first?" options={OPTIONS} answer={0}>Worked answer here</Choice>)
    expect(screen.queryByText('Worked answer here')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Raise the learning rate' }))
    expect(screen.getByRole('status')).toHaveTextContent('Not quite. That makes the bouncing worse.')
    expect(screen.queryByText('Worked answer here')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Lower the learning rate' }))
    expect(screen.getByRole('status')).toHaveTextContent('Right.')
    expect(screen.getByText('Worked answer here')).toBeInTheDocument()
  })

  it('"Show the answer" opens the worked answer without counting as correct', async () => {
    const user = userEvent.setup()
    render(<Choice id="t-reveal" q="Q?" options={OPTIONS} answer={0}>Worked</Choice>)
    await user.click(screen.getByRole('button', { name: 'Show the answer' }))
    expect(screen.getByText('Worked')).toBeInTheDocument()
    expect(window.localStorage.getItem('nm-interview-checks:v1')).toBeNull()
  })
})

describe('Calc and BankScore', () => {
  beforeEach(() => window.localStorage.clear())

  it('checks a typed number and keeps score of first tries', async () => {
    const user = userEvent.setup()
    render(
      <>
        <BankScore />
        <Calc id="t-calc" q="Precision?" answer={0.3}>Worked calc</Calc>
      </>,
    )
    expect(screen.getByText(/1 checkable question on this page/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Your answer'), '0.25')
    await user.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByRole('status')).toHaveTextContent('Not quite.')

    await user.clear(screen.getByLabelText('Your answer'))
    await user.type(screen.getByLabelText('Your answer'), '0.3')
    await user.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByRole('status')).toHaveTextContent('Right.')
    expect(screen.getByText('Worked calc')).toBeInTheDocument()
    expect(screen.getByText(/answered 1 of the 1 checkable questions, 0 right on the first try/)).toBeInTheDocument()
  })
})
