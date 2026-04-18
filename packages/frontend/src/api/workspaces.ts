import type { ApiRequest } from '../contexts/useApi'

export type WorkspaceFileKind = 'XML' | 'XSLT'

export interface WorkspaceSummary {
    id: number
    name: string
    updatedAt: string
}

export interface WorkspaceFileMeta {
    name: string
    kind: WorkspaceFileKind
    size: number
    updatedAt: string
}

export interface WorkspaceDetails extends WorkspaceSummary {
    files: WorkspaceFileMeta[]
}

export interface WorkspaceFile {
    name: string
    kind: WorkspaceFileKind
    content: string
    updatedAt: string
}

export interface TransformResult {
    transformedXml: string
}

const json = (body: unknown): RequestInit => ({
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
})

// Encode each segment so special chars are escaped, but preserve "/" as
// separators so the backend wildcard route sees the subfolder structure.
const encodePath = (path: string) =>
    path.split('/').map(encodeURIComponent).join('/')

export const listWorkspaces = (request: ApiRequest): Promise<WorkspaceSummary[]> =>
    request<WorkspaceSummary[]>('/workspaces')

export const createWorkspace = (
    request: ApiRequest,
    name: string
): Promise<WorkspaceSummary> =>
    request<WorkspaceSummary>('/workspaces', { method: 'POST', ...json({ name }) })

export const getWorkspace = (
    request: ApiRequest,
    id: number
): Promise<WorkspaceDetails> =>
    request<WorkspaceDetails>(`/workspaces/${String(id)}`)

export const renameWorkspace = (
    request: ApiRequest,
    id: number,
    name: string
): Promise<WorkspaceSummary> =>
    request<WorkspaceSummary>(`/workspaces/${String(id)}`, {
        method: 'PATCH',
        ...json({ name }),
    })

export const deleteWorkspace = async (request: ApiRequest, id: number): Promise<void> => {
    await request<unknown>(`/workspaces/${String(id)}`, { method: 'DELETE' })
}

export const getFile = (
    request: ApiRequest,
    workspaceId: number,
    name: string
): Promise<WorkspaceFile> =>
    request<WorkspaceFile>(
        `/workspaces/${String(workspaceId)}/files/${encodePath(name)}`
    )

export const saveFile = (
    request: ApiRequest,
    workspaceId: number,
    name: string,
    content: string
): Promise<{ name: string; updatedAt: string }> =>
    request<{ name: string; updatedAt: string }>(
        `/workspaces/${String(workspaceId)}/files/${encodePath(name)}`,
        { method: 'PUT', ...json({ content }) }
    )

export const deleteFile = async (
    request: ApiRequest,
    workspaceId: number,
    name: string
): Promise<void> => {
    await request<unknown>(
        `/workspaces/${String(workspaceId)}/files/${encodePath(name)}`,
        { method: 'DELETE' }
    )
}

export interface WorkspaceTransformBody {
    xsltFile: string
    xmlFile?: string
    xmlContent?: string
}

export const transformInWorkspace = (
    request: ApiRequest,
    workspaceId: number,
    body: WorkspaceTransformBody
): Promise<TransformResult> =>
    request<TransformResult>(`/workspaces/${String(workspaceId)}/transform`, {
        method: 'POST',
        ...json(body),
    })
