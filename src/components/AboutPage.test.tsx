import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AboutPage from './AboutPage'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AuthProvider } from '../contexts/AuthContext'
import { GamificationProvider } from '../contexts/GamificationContext'

function renderAbout() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AuthProvider>
          <GamificationProvider>
            <AboutPage />
          </GamificationProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('AboutPage', () => {
  it('states the AI era learning mission and links to the requested X account', () => {
    renderAbout()
    expect(screen.getByRole('heading', { name: /About Neural Mastery/i })).toBeInTheDocument()
    expect(screen.getByText(/what to learn and how to learn in the AI era/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /@NeuralMastery on X/i })
    expect(link).toHaveAttribute('href', 'https://x.com/NeuralMastery')
  })
})
