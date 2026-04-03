import {
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react'
import { ApiContext } from './useApi'

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
    useLayoutEffect(() => {
        onUnauthenticatedRef.current = onUnauthenticated
    })

    const setAccessToken = useCallback((token: string) => {
        tokenRef.current = token
        setAccessTokenState(token)
    }, [])

    const logout = useCallback(() => {
        tokenRef.current = null
        setAccessTokenState(null)
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

    const login = useCallback(async (mail: string, password: string): Promise<void> => {
        const res = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grant_type: 'user_credentials', mail, password }),
            credentials: 'include',
        })

        if (!res.ok) throw new Error(`HTTP_${String(res.status)}`)

        const data = (await res.json()) as { access_token: string }
        setAccessToken(data.access_token)
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

            if (!res.ok)
            {
                const json = await res.json() as unknown as {
                    errorMessage?:string
                }

                if(json["errorMessage"]) {
                    throw new Error(json.errorMessage)
                }

                throw new Error(`HTTP_${String(res.status)}`)
            }

            const contentType = res.headers.get('content-type')
            if (contentType?.includes('application/json')) {
                return res.json() as Promise<T>
            }
            return undefined as T
        },
        [baseUrl, refresh],
    )

    return (
        <ApiContext.Provider value={{ accessToken, login, logout, request }}>
            {children}
        </ApiContext.Provider>
    )
}
