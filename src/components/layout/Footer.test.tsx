import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Footer from './Footer'

describe('Footer', () => {
  it('shows the real current year and links to About/Privacy/Terms', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 6))
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    expect(screen.getByText('© 2026 Neural Mastery')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
    expect(screen.getByRole('link', { name: 'Changelog' })).toHaveAttribute('href', '/changelog')
    expect(screen.getByRole('link', { name: 'Credits' })).toHaveAttribute('href', '/credits')
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms')
    const xLink = screen.getByRole('link', { name: /Questions\? Reach out on X/i })
    expect(xLink).toHaveAttribute('href', 'https://x.com/NeuralMastery')
    expect(xLink).toHaveAttribute('target', '_blank')
    expect(xLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('link', { name: 'GitHub' })).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
