export interface User { id: number; name: string; email: string }
export interface LoginInput { email: string; password: string }
export interface RegisterInput extends LoginInput { name: string; password_confirmation: string }
export interface ApiErrorBody { message?: string; errors?: Record<string, string[]> }

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>
  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}
