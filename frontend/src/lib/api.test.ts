import { afterEach, expect, it, vi } from 'vitest'
import { authApi } from './api'
import { ApiError } from '../types/api'

afterEach(() => { vi.unstubAllGlobals(); document.cookie = 'XSRF-TOKEN=; Max-Age=0' })

it('gets a CSRF cookie and sends the decoded token with credentials', async () => {
  document.cookie = 'XSRF-TOKEN=abc%3D'
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 204 })
    .mockResolvedValueOnce({ ok: true, status: 204 })
  vi.stubGlobal('fetch', fetchMock)
  await authApi.login({ email: 'user@example.test', password: 'synthetic-password' })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[0][0]).toContain('/sanctum/csrf-cookie')
  expect(fetchMock.mock.calls[1][1]).toMatchObject({ credentials: 'include', method: 'POST', headers: { 'X-XSRF-TOKEN': 'abc=', Accept: 'application/json', 'Content-Type': 'application/json' } })
})

it('parses Laravel validation errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ message: 'Validation failed.', errors: { email: ['Invalid email.'] } }) }))
  await expect(authApi.currentUser()).rejects.toMatchObject({ status: 422, errors: { email: ['Invalid email.'] } })
})

it('hides server details and reports network failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ message: 'Internal path /var/www/app' }) }))
  await expect(authApi.currentUser()).rejects.toMatchObject({ status: 500, message: 'Something went wrong. Please try again.' })
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
  await expect(authApi.currentUser()).rejects.toBeInstanceOf(ApiError)
})
