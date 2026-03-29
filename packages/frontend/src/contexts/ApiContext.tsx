import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
    type ReactNode,
} from 'react'

export type ApiRequest = <T>(path: string, init?: RequestInit) => Promise<T>

interface ApiContextValue {
    /** The current access token, or null when not authenticated. */
    accessToken: string | null
    /** Call this after a successful login to store the access token. */
    setAccessToken: (token: string) => void
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

interface ApiProviderProps {
    /** Base URL of the API, e.g. "http://localhost:3000" */
    baseUrl: string
    /**
     * Called when both the original request and the token refresh return 401.
     * Use this to redirect the user to the sign-in screen.
     */
    onUnauthenticated: () => void
    children: ReactNode
}

const ApiContext = createContext<ApiContextValue | null>(null)

export function ApiProvider({ baseUrl, onUnauthenticated, children }: ApiProviderProps) {
    const [accessToken, setAccessTokenState] = useState<string | null>(null)

    // Mirror of accessToken as a ref so the request closure always reads the
    // latest value without needing to be re-created on every token change.
    const tokenRef = useRef<string | null>(null)

    // Keeps a single in-flight refresh promise so concurrent 401s share one
    // refresh call instead of firing several.
    const refreshPromise = useRef<Promise<string | null> | null>(null)

    // Always call the latest onUnauthenticated without adding it to useCallback
    // dependency arrays (avoids re-creating request on every render cycle).
    const onUnauthenticatedRef = useRef(onUnauthenticated)
    onUnauthenticatedRef.current = onUnauthenticated

    const setAccessToken = useCallback((token: string) => {
        tokenRef.current = token
        setAccessTokenState(token)
    }, [])

    const refresh = useCallback(async (): Promise<string | null> => {
        if (refreshPromise.current) return refreshPromise.current

        refreshPromise.current = (async () => {
            const res = await fetch(`${baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grant_type: 'refresh_cookie' }),
                credentials: 'include',
            })

            if (!res.ok) {
                onUnauthenticatedRef.current()
                return null
            }

            const data = (await res.json()) as { access_token: string }
            setAccessToken(data.access_token)
            return data.access_token
        })().finally(() => {
            refreshPromise.current = null
        })

        return refreshPromise.current
    }, [baseUrl, setAccessToken])

    const request = useCallback(
        async <T,>(path: string, init?: RequestInit): Promise<T> => {
            const buildHeaders = (token: string | null) => {
                const headers = new Headers(init?.headers)
                if (token) headers.set('Authorization', `Bearer ${token}`)
                return headers
            }

            const execute = async (token: string | null) => {
                const res = await fetch(`${baseUrl}${path}`, {
                    ...init,
                    headers: buildHeaders(token),
                    credentials: 'include',
                })
                return res
            }

            let res = await execute(tokenRef.current)

            if (res.status === 401) {
                const newToken = await refresh()
                if (!newToken) throw new Error('UNAUTHENTICATED')
                res = await execute(newToken)
            }

            if (!res.ok) throw new Error(`HTTP_${res.status}`)

            const contentType = res.headers.get('content-type')
            if (contentType?.includes('application/json')) {
                return res.json() as Promise<T>
            }
            return undefined as T
        },
        [baseUrl, refresh],
    )

    return (
        <ApiContext.Provider value={{ accessToken, setAccessToken, request }}>
            {children}
        </ApiContext.Provider>
    )
}

/**
 * Returns the API context value. Must be used inside an `<ApiProvider>`.
 */
export function useApi(): ApiContextValue {
    const ctx = useContext(ApiContext)
    if (!ctx) throw new Error('useApi must be called inside <ApiProvider>')
    return ctx
}
