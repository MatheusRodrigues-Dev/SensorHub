import { useContext } from 'react'
import { Context } from './context'

export function useAuth() {
  const value = useContext(Context)
  if (!value) throw new Error('useAuth requires AuthProvider')
  return { ...value, ...value.state }
}
