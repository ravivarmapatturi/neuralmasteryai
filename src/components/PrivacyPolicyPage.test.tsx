import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PrivacyPolicyPage from './PrivacyPolicyPage'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AuthProvider } from '../contexts/AuthContext'
import { GamificationProvider } from '../contexts/GamificationContext'

function renderPrivacy() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AuthProvider>
          <GamificationProvider>
            <PrivacyPolicyPage />
          </GamificationProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('PrivacyPolicyPage', () => {
  it('discloses the real data sources: Firebase Auth, Firestore, and GA4 -- not generic boilerplate', () => {
    renderPrivacy()
    expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument()
    expect(screen.getByText(/Firebase Authentication with Google/i)).toBeInTheDocument()
    expect(screen.getByText(/Cloud Firestore/i)).toBeInTheDocument()
    expect(screen.getByText(/Google Analytics \(GA4\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Cloudflare Web Analytics/i)).toBeInTheDocument()
    expect(screen.getByText(/denied by default/i)).toBeInTheDocument()
  })
})
