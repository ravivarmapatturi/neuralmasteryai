import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import TermsOfServicePage from './TermsOfServicePage'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AuthProvider } from '../contexts/AuthContext'
import { GamificationProvider } from '../contexts/GamificationContext'

function renderTerms() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AuthProvider>
          <GamificationProvider>
            <TermsOfServicePage />
          </GamificationProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('TermsOfServicePage', () => {
  it('states educational use, responsible conduct and service limitations', () => {
    renderTerms()
    expect(screen.getByRole('heading', { name: /Terms of Service/i })).toBeInTheDocument()
    expect(screen.getByText(/Neural Mastery is an educational platform/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Responsible use/i })).toBeInTheDocument()
    expect(screen.getByText(/without warranties to the extent permitted by law/i)).toBeInTheDocument()
  })
})
