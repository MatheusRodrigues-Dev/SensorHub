import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../../lib/api'
import { onSessionExpired } from '../../lib/sessionEvents'
import { ApiError, type LoginInput, type RegisterInput } from '../../types/api'
import { Context, type AuthState } from './context'


export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const queryClient = useQueryClient()
  async function retry() {
    setState({ status: 'loading' })
    try { setState({ status: 'authenticated', user: await authApi.currentUser() }) }
    catch (error) { setState({ status: error instanceof ApiError && error.status === 401 ? 'unauthenticated' : 'error' }) }
  }
  useEffect(() => {
    let active = true
    authApi.currentUser().then(user => { if (active) setState({ status: 'authenticated', user }) })
      .catch(error => { if (active) setState({ status: error instanceof ApiError && error.status === 401 ? 'unauthenticated' : 'error' }) })
    return () => { active = false }
  }, [])
  useEffect(() => onSessionExpired(() => {
    queryClient.clear()
    setState({ status: 'unauthenticated' })
  }), [queryClient])

  async function login(input: LoginInput) {
    await authApi.login(input)
    const user = await authApi.currentUser()
    setState({ status: 'authenticated', user })
  }
  async function register(input: RegisterInput) {
    await authApi.register(input)
    await login({ email: input.email, password: input.password })
  }
  async function logout() {
    try { await authApi.logout() }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error }
    queryClient.clear()
    setState({ status: 'unauthenticated' })
  }

  return <Context.Provider value={{ state, login, register, logout, retry }}>{children}</Context.Provider>
}
