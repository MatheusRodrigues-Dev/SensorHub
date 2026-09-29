import { createContext } from 'react'
import type { LoginInput, RegisterInput, User } from '../../types/api'

export type AuthState = { status: 'loading' } | { status: 'unauthenticated' } | { status: 'authenticated'; user: User } | { status: 'error' }
export interface AuthContextValue {
  state: AuthState
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  retry: () => Promise<void>
}
export const Context = createContext<AuthContextValue | null>(null)
