import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { authApi } from './lib/api'
import { ApiError } from './types/api'

vi.mock('./lib/api', () => ({ authApi: { currentUser: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() } }))
const user = { id: 1, name: 'Alex Sensor', email: 'alex@example.test' }
const currentUser = vi.mocked(authApi.currentUser)
const login = vi.mocked(authApi.login)
const register = vi.mocked(authApi.register)
const logout = vi.mocked(authApi.logout)

function visit(path: string) { window.history.replaceState({}, '', path); return render(<App />) }

beforeEach(() => { vi.resetAllMocks(); currentUser.mockRejectedValue(new ApiError(401, 'Unauthenticated.')) })
afterEach(cleanup)

describe('SPA authentication', () => {
  it('waits for session restoration before rendering a route', async () => {
    currentUser.mockReturnValue(new Promise(() => {}))
    visit('/app')
    expect(screen.getByRole('status')).toHaveTextContent('Loading SensorHub')
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated users from the protected route', async () => {
    visit('/app')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it('shows a retry state for a session network failure', async () => {
    currentUser.mockRejectedValueOnce(new ApiError(0, 'Network error')).mockRejectedValueOnce(new ApiError(401, 'Unauthenticated.'))
    visit('/app')
    expect(await screen.findByText('Could not load your session')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('restores the user and redirects authenticated visitors away from login', async () => {
    currentUser.mockResolvedValue(user)
    visit('/login')
    expect(await screen.findByText('Welcome, Alex Sensor.')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/app')
  })

  it('submits login and displays the authenticated shell', async () => {
    currentUser.mockRejectedValueOnce(new ApiError(401, 'Unauthenticated.')).mockResolvedValue(user)
    login.mockResolvedValue()
    visit('/login')
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: user.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Welcome, Alex Sensor.')).toBeInTheDocument()
    expect(login).toHaveBeenCalledWith({ email: user.email, password: 'password123' })
  })

  it('shows invalid credentials without exposing a raw API error', async () => {
    login.mockRejectedValue(new ApiError(401, 'Invalid credentials.'))
    visit('/login')
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: user.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
  })

  it('shows Laravel field validation errors during registration', async () => {
    register.mockRejectedValue(new ApiError(422, 'Validation failed.', { email: ['The email has already been taken.'] }))
    visit('/register')
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Alex' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('The email has already been taken.')).toBeInTheDocument()
  })

  it('registers, starts a session and signs out', async () => {
    register.mockResolvedValue(user)
    login.mockResolvedValue()
    currentUser.mockRejectedValueOnce(new ApiError(401, 'Unauthenticated.')).mockResolvedValue(user)
    logout.mockResolvedValue()
    visit('/register')
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: user.name } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Welcome, Alex Sensor.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(window.location.pathname).toBe('/login'))
    expect(logout).toHaveBeenCalledOnce()
  })
})
