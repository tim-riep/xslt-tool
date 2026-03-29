import type { ApiRequest } from '../contexts/useApi'

export interface User {
    id: number
    email: string | null
    firstName: string | null
    lastName: string
}

/** Fetches the currently authenticated user's details. */
export const getMe = (request: ApiRequest): Promise<User> =>
    request<User>('/users/me')
