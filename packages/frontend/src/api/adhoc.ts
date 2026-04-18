import type { ApiRequest } from '../contexts/useApi'

export interface AdhocState {
    xml: string
    xslt: string
}

export const getAdhoc = (request: ApiRequest): Promise<AdhocState> =>
    request<AdhocState>('/adhoc')

export const saveAdhoc = async (
    request: ApiRequest,
    partial: { xml?: string; xslt?: string }
): Promise<void> => {
    await request<unknown>('/adhoc', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
    })
}
