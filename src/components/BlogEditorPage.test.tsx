import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import BlogEditorPage from './BlogEditorPage'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AuthProvider } from '../contexts/AuthContext'
import { ProgressProvider } from '../contexts/ProgressContext'
import { GamificationProvider } from '../contexts/GamificationContext'

describe('BlogEditorPage', () => {
  it('shows no editor to a visitor who is not signed in as an admin', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/blog/write']}>
          <AuthProvider>
            <ProgressProvider>
              <GamificationProvider>
                <Routes>
                  <Route path="/blog/write" element={<BlogEditorPage />} />
                </Routes>
              </GamificationProvider>
            </ProgressProvider>
          </AuthProvider>
        </MemoryRouter>
      </ThemeProvider>,
    )
    expect(await screen.findByText(/Only admins can write blog posts/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
  })
})
