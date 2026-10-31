import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import AuthButton from './AuthButton'
import { AuthProvider } from '../../contexts/AuthContext'

function renderButton() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AuthButton />
      </AuthProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('AuthButton: signed-out sign-in panel', () => {
  it('opening the sign-in button shows BOTH Google and email/password options, not Google-only', async () => {
    renderButton()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('clicking "Continue with Google" calls the real Google sign-in path', async () => {
    renderButton()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sign in' }))
    await user.click(screen.getByRole('button', { name: /Continue with Google/i }))
    await waitFor(() => expect(signInWithPopup).toHaveBeenCalled())
  })

  it('defaults to sign-in mode and can toggle to create-account mode', async () => {
    renderButton()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sign in' }))
    // Two "Sign in"-labeled buttons now exist: the trigger (already clicked,
    // still present) and the panel's own submit button -- both real, expected.
    expect(screen.getAllByRole('button', { name: 'Sign in' })).toHaveLength(2)
    await user.click(screen.getByText(/New here\? Create an account/i))
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  })

  it('submitting the email form in sign-up mode calls createUserWithEmailAndPassword with the typed credentials', async () => {
    renderButton()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sign in' }))
    await user.click(screen.getByText(/New here\? Create an account/i))
    await user.type(screen.getByPlaceholderText('Email'), 'newuser@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'realpassword123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(createUserWithEmailAndPassword).toHaveBeenCalled())
    const call = vi.mocked(createUserWithEmailAndPassword).mock.calls[0]
    expect(call[1]).toBe('newuser@example.com')
    expect(call[2]).toBe('realpassword123')
  })

  it('submitting in sign-in mode calls signInWithEmailAndPassword, not create-account', async () => {
    renderButton()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sign in' }))
    await user.type(screen.getByPlaceholderText('Email'), 'existing@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'realpassword123')
    // Two "Sign in" buttons exist now (the trigger, hidden behind the panel, and the submit) --
    // scope to the form's real submit button by role+type via the accessible name still being unique
    // among BUTTON elements is safe here since the trigger button is the panel's own toggle, already clicked.
    const submitButtons = screen.getAllByRole('button', { name: 'Sign in' })
    await user.click(submitButtons[submitButtons.length - 1])
    await waitFor(() => expect(signInWithEmailAndPassword).toHaveBeenCalled())
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled()
  })

  it('shows a real, human-readable message pointing to Google sign-in when the Email/Password provider itself is disabled in the Firebase console (auth/operation-not-allowed) -- a real config gap this repo hit, not a hypothetical', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce(
      Object.assign(new Error('not allowed'), { code: 'auth/operation-not-allowed' }),
    )
    renderButton()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sign in' }))
    await user.click(screen.getByText(/New here\? Create an account/i))
    await user.type(screen.getByPlaceholderText('Email'), 'someone@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'realpassword123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText(/isn't enabled yet/i)).toBeInTheDocument()
  })

  it('shows a real, human-readable message (not a bare error code) and points to Google sign-in on an email-already-in-use collision', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce(
      Object.assign(new Error('in use'), { code: 'auth/email-already-in-use' }),
    )
    renderButton()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sign in' }))
    await user.click(screen.getByText(/New here\? Create an account/i))
    await user.type(screen.getByPlaceholderText('Email'), 'taken@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'realpassword123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText(/already has an account/i)).toBeInTheDocument()
    expect(screen.getByText(/already has an account/i).textContent).toMatch(/Google/i)
  })
})

it('offers labeled inputs and a password visibility control in a dismissible dialog', async () => {
  renderButton()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Sign in' }))
  expect(screen.getByRole('dialog', { name: 'Welcome back' })).toBeInTheDocument()
  expect(screen.getByLabelText('Email address')).toHaveAttribute('type', 'email')
  const password = screen.getByLabelText('Password', { exact: true })
  expect(password).toHaveAttribute('type', 'password')
  await user.click(screen.getByRole('button', { name: 'Show password' }))
  expect(password).toHaveAttribute('type', 'text')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign in' })).toHaveFocus()
})
