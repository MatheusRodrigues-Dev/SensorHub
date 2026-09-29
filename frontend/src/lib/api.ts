import { ApiError, type ApiErrorBody, type LoginInput, type RegisterInput, type User } from '../types/api'
import { notifySessionExpired } from './sessionEvents'

const configuredBase = import.meta.env.VITE_API_URL || '/api/v1'
const apiBase = configuredBase.replace(/\/$/, '')

function xsrfToken(): string | undefined {
  const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='))
  return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : undefined
}

export async function apiRequest<T>(path: string, method = 'GET', body?: object, domain = false): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    const token = xsrfToken()
    if (token) headers['X-XSRF-TOKEN'] = token
  }
  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      method, headers, credentials: 'include', body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Could not connect to SensorHub. Check your connection and try again.')
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as ApiErrorBody
    const fallback = response.status === 401 ? 'Your session has ended. Please sign in again.' : response.status === 419 ? 'Your secure session expired. Please try again.' : 'Something went wrong. Please try again.'
    if (domain && response.status === 401) notifySessionExpired()
    throw new ApiError(response.status, response.status >= 500 || response.status === 419 ? fallback : (payload.message || fallback), payload.errors || {})
  }
  return response.status === 204 ? undefined as T : await response.json() as T
}

async function csrfCookie(): Promise<void> {
  const url = new URL(apiBase, window.location.origin)
  try {
    const response = await fetch(`${url.origin}/sanctum/csrf-cookie`, { credentials: 'include', headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error('CSRF request failed')
  } catch {
    throw new ApiError(0, 'Could not start a secure session. Please try again.')
  }
}

export const authApi = {
  currentUser: async () => (await apiRequest<{ data: User }>('/auth/user')).data,
  register: async (input: RegisterInput) => { await csrfCookie(); return (await apiRequest<{ data: User }>('/auth/register', 'POST', input)).data },
  login: async (input: LoginInput) => { await csrfCookie(); await apiRequest<void>('/auth/login', 'POST', input) },
  logout: async () => { await apiRequest<void>('/auth/logout', 'POST') },
}
