import { createContext, useContext } from 'react'

export type ApiRequest = <T>(path: string, init?: RequestInit) => Promise<T>

export interface ApiContextValue {
    /** The current access token, or null when not authenticated. */
    accessToken: string | null
    /**
     * False until the initial silent refresh attempt has completed. Consumers
     * gating on `accessToken` should wait for this before redirecting to /login,
     * otherwise a page reload flashes users out even when a refresh cookie is present.
     */
    bootstrapped: boolean
    /**
     * Logs in with email and password. Stores the returned access token
     * automatically. Throws if the credentials are invalid (non-2xx response).
     */
    login: (mail: string, password: string) => Promise<void>
    /**
     * Clears the access token, effectively logging the user out.
     * The protected route will redirect to /login immediately.
     */
    logout: () => void
    /**
     * Makes an authenticated request to the API.
     *
     * Automatically attaches the Bearer token. On a 401 response it attempts
     * a single token refresh via the refresh_token cookie. If the refresh
     * succeeds the original request is retried with the new token. If the
     * refresh also fails, `onUnauthenticated` is called and an error is thrown.
     */
    request: ApiRequest
}

export const ApiContext = createContext<ApiContextValue | null>(null)

/**
 * Returns the API context value. Must be used inside an `<ApiProvider>`.
 */
export function useApi(): ApiContextValue {
    const ctx = useContext(ApiContext)
    if (!ctx) throw new Error('useApi must be called inside <ApiProvider>')
    return ctx
}
