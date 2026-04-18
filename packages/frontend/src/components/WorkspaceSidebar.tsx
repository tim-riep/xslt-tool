import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useState,
} from 'react'
import { useApi } from '../contexts/useApi'
import {
    createWorkspace,
    deleteFile,
    deleteWorkspace,
    getFile,
    getWorkspace,
    listWorkspaces,
    renameWorkspace,
    saveFile,
    type WorkspaceDetails,
    type WorkspaceFileKind,
    type WorkspaceSummary,
} from '../api/workspaces'
import './WorkspaceSidebar.css'

export interface ActiveFile {
    workspaceId: number
    name: string
}

export interface WorkspaceSidebarHandle {
    refreshActive: () => void
}

interface Props {
    activeXml: ActiveFile | null
    activeXslt: ActiveFile | null
    onOpenFile: (file: {
        workspaceId: number
        name: string
        kind: WorkspaceFileKind
        content: string
    }) => void
    onActiveFileDeleted: (workspaceId: number, name: string) => void
    onSwitchToAdhoc: () => void
    dirtyXml: boolean
    dirtyXslt: boolean
}

const fromBase64 = (b64: string) => {
    const binary = atob(b64)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
}

const toBase64 = (str: string) => {
    const bytes = new TextEncoder().encode(str)
    let binary = ''
    bytes.forEach(b => { binary += String.fromCharCode(b) })
    return btoa(binary)
}

function inferKind(filename: string): WorkspaceFileKind | null {
    const lower = filename.toLowerCase()
    if (lower.endsWith('.xml')) return 'XML'
    if (lower.endsWith('.xsl') || lower.endsWith('.xslt')) return 'XSLT'
    return null
}

const WorkspaceSidebar = forwardRef<WorkspaceSidebarHandle, Props>(function WorkspaceSidebar(
    { activeXml, activeXslt, onOpenFile, onActiveFileDeleted, onSwitchToAdhoc, dirtyXml, dirtyXslt },
    ref
) {
    const { request } = useApi()
    const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
    const [expandedId, setExpandedId] = useState<number | null>(null)
    const [details, setDetails] = useState<Record<number, WorkspaceDetails | undefined>>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadWorkspaces = useCallback(async () => {
        try {
            setLoading(true)
            const data = await listWorkspaces(request)
            setWorkspaces(data)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setLoading(false)
        }
    }, [request])

    const loadDetails = useCallback(async (id: number) => {
        try {
            const data = await getWorkspace(request, id)
            setDetails(prev => ({ ...prev, [id]: data }))
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        }
    }, [request])

    useEffect(() => { void loadWorkspaces() }, [loadWorkspaces])

    useImperativeHandle(ref, () => ({
        refreshActive: () => {
            if (expandedId !== null) void loadDetails(expandedId)
        }
    }), [expandedId, loadDetails])

    const handleExpand = useCallback((id: number) => {
        setExpandedId(prev => (prev === id ? null : id))
        if (!details[id]) void loadDetails(id)
    }, [details, loadDetails])

    const handleCreateWorkspace = useCallback(async () => {
        const name = window.prompt('Name of the new workspace?')?.trim()
        if (!name) return
        try {
            const created = await createWorkspace(request, name)
            setWorkspaces(prev => [created, ...prev])
            setExpandedId(created.id)
            await loadDetails(created.id)
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        }
    }, [request, loadDetails])

    const handleRenameWorkspace = useCallback(async (id: number, current: string) => {
        const name = window.prompt('Rename workspace', current)?.trim()
        if (!name || name === current) return
        try {
            const updated = await renameWorkspace(request, id, name)
            setWorkspaces(prev => prev.map(w => (w.id === id ? { ...w, name: updated.name } : w)))
            setDetails(prev => {
                const entry = prev[id]
                if (!entry) return prev
                return { ...prev, [id]: { ...entry, name: updated.name } }
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        }
    }, [request])

    const handleDeleteWorkspace = useCallback(async (id: number, name: string) => {
        if (!window.confirm(`Delete workspace "${name}" and all its files?`)) return
        try {
            await deleteWorkspace(request, id)
            setWorkspaces(prev => prev.filter(w => w.id !== id))
            setDetails(prev => {
                const next: Record<number, WorkspaceDetails | undefined> = {}
                for (const key of Object.keys(prev)) {
                    const keyNum = Number(key)
                    if (keyNum === id) continue
                    next[keyNum] = prev[keyNum]
                }
                return next
            })
            if (expandedId === id) setExpandedId(null)
            if (activeXml?.workspaceId === id) onActiveFileDeleted(id, activeXml.name)
            if (activeXslt?.workspaceId === id) onActiveFileDeleted(id, activeXslt.name)
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        }
    }, [request, expandedId, activeXml, activeXslt, onActiveFileDeleted])

    const handleOpenFile = useCallback(async (workspaceId: number, name: string, kind: WorkspaceFileKind) => {
        try {
            const file = await getFile(request, workspaceId, name)
            onOpenFile({
                workspaceId,
                name,
                kind,
                content: fromBase64(file.content),
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        }
    }, [request, onOpenFile])

    const handleAddFile = useCallback(async (workspaceId: number, kind: WorkspaceFileKind) => {
        const suggested = kind === 'XML' ? 'input.xml' : 'stylesheet.xsl'
        const raw = window.prompt(`New ${kind} filename`, suggested)?.trim()
        if (!raw) return
        const detectedKind = inferKind(raw)
        if (detectedKind !== kind) {
            setError(`Expected a ${kind === 'XML' ? '.xml' : '.xsl / .xslt'} file`)
            return
        }
        try {
            await saveFile(request, workspaceId, raw, toBase64(''))
            await loadDetails(workspaceId)
            await handleOpenFile(workspaceId, raw, kind)
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        }
    }, [request, loadDetails, handleOpenFile])

    const handleDeleteFile = useCallback(async (workspaceId: number, name: string) => {
        if (!window.confirm(`Delete "${name}"?`)) return
        try {
            await deleteFile(request, workspaceId, name)
            await loadDetails(workspaceId)
            if (
                (activeXml?.workspaceId === workspaceId && activeXml.name === name) ||
                (activeXslt?.workspaceId === workspaceId && activeXslt.name === name)
            ) {
                onActiveFileDeleted(workspaceId, name)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        }
    }, [request, loadDetails, activeXml, activeXslt, onActiveFileDeleted])

    const isAdhocMode = activeXml === null && activeXslt === null

    return (
        <aside className="ws-sidebar">
            <div className="ws-sidebar-header">
                <span className="ws-sidebar-title">Workspaces</span>
                <button
                    className="ws-sidebar-action"
                    onClick={() => { void handleCreateWorkspace() }}
                    title="New workspace"
                >
                    +
                </button>
            </div>
            <button
                className={`ws-adhoc ${isAdhocMode ? 'ws-adhoc--active' : ''}`}
                onClick={onSwitchToAdhoc}
                title="Switch to adhoc scratch (auto-saved per user)"
            >
                <span className="ws-adhoc-icon">✎</span>
                <span className="ws-adhoc-label">Adhoc / Scratch</span>
                {isAdhocMode && <span className="ws-adhoc-badge">active</span>}
            </button>
            {loading && workspaces.length === 0 && (
                <p className="ws-sidebar-muted">Loading…</p>
            )}
            {!loading && workspaces.length === 0 && (
                <p className="ws-sidebar-muted">No workspaces yet.</p>
            )}
            {error && (
                <p className="ws-sidebar-error" onClick={() => { setError(null) }}>{error}</p>
            )}
            <ul className="ws-list">
                {workspaces.map(ws => {
                    const isExpanded = expandedId === ws.id
                    const detail = details[ws.id]
                    const xmlFiles = detail?.files.filter(f => f.kind === 'XML') ?? []
                    const xsltFiles = detail?.files.filter(f => f.kind === 'XSLT') ?? []
                    return (
                        <li key={ws.id} className="ws-item">
                            <div className="ws-row">
                                <button
                                    className="ws-row-main"
                                    onClick={() => { handleExpand(ws.id) }}
                                >
                                    <span className={`ws-caret ${isExpanded ? 'ws-caret--open' : ''}`}>▶</span>
                                    <span className="ws-name">{ws.name}</span>
                                </button>
                                <button
                                    className="ws-row-action"
                                    onClick={() => { void handleRenameWorkspace(ws.id, ws.name) }}
                                    title="Rename"
                                >
                                    ✎
                                </button>
                                <button
                                    className="ws-row-action ws-row-action--danger"
                                    onClick={() => { void handleDeleteWorkspace(ws.id, ws.name) }}
                                    title="Delete"
                                >
                                    ×
                                </button>
                            </div>
                            {isExpanded && (
                                <div className="ws-files">
                                    <FileGroup
                                        label="XML"
                                        kind="XML"
                                        files={xmlFiles}
                                        workspaceId={ws.id}
                                        active={activeXml}
                                        dirty={dirtyXml}
                                        onOpen={handleOpenFile}
                                        onAdd={handleAddFile}
                                        onDelete={handleDeleteFile}
                                    />
                                    <FileGroup
                                        label="XSLT"
                                        kind="XSLT"
                                        files={xsltFiles}
                                        workspaceId={ws.id}
                                        active={activeXslt}
                                        dirty={dirtyXslt}
                                        onOpen={handleOpenFile}
                                        onAdd={handleAddFile}
                                        onDelete={handleDeleteFile}
                                    />
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </aside>
    )
})

interface FileGroupProps {
    label: string
    kind: WorkspaceFileKind
    files: { name: string }[]
    workspaceId: number
    active: ActiveFile | null
    dirty: boolean
    onOpen: (workspaceId: number, name: string, kind: WorkspaceFileKind) => void | Promise<void>
    onAdd: (workspaceId: number, kind: WorkspaceFileKind) => void | Promise<void>
    onDelete: (workspaceId: number, name: string) => void | Promise<void>
}

function FileGroup({ label, kind, files, workspaceId, active, dirty, onOpen, onAdd, onDelete }: FileGroupProps) {
    return (
        <div className="ws-group">
            <div className="ws-group-header">
                <span className="ws-group-label">{label}</span>
                <button
                    className="ws-sidebar-action ws-sidebar-action--small"
                    onClick={() => { void onAdd(workspaceId, kind) }}
                    title={`New ${label} file`}
                >
                    +
                </button>
            </div>
            {files.length === 0 && <p className="ws-sidebar-muted ws-sidebar-muted--small">empty</p>}
            <ul className="ws-file-list">
                {files.map(file => {
                    const isActive = active?.workspaceId === workspaceId && active.name === file.name
                    return (
                        <li key={file.name} className={`ws-file ${isActive ? 'ws-file--active' : ''}`}>
                            <button
                                className="ws-file-main"
                                onClick={() => { void onOpen(workspaceId, file.name, kind) }}
                                title={file.name}
                            >
                                {file.name}
                                {isActive && dirty && <span className="ws-file-dirty" title="Unsaved changes">●</span>}
                            </button>
                            <button
                                className="ws-row-action ws-row-action--danger"
                                onClick={() => { void onDelete(workspaceId, file.name) }}
                                title="Delete"
                            >
                                ×
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default WorkspaceSidebar
