import { useState, useEffect, useRef, useCallback, lazy } from 'react'
import '../App.css'
import { useApi } from '../contexts/useApi'
import { getAdhoc, saveAdhoc } from '../api/adhoc'
import {
    saveFile as saveWorkspaceFile,
    transformInWorkspace,
    type WorkspaceFileKind,
} from '../api/workspaces'
import WorkspaceSidebar, {
    type ActiveFile,
    type WorkspaceSidebarHandle,
} from '../components/WorkspaceSidebar'

type LeftTab = 'input' | 'stylesheet'
type RightTab = 'result' | 'error'
type Theme = 'light' | 'dark'

const CodeEditor = lazy(() => import('../CodeEditor'))

const ADHOC_DEBOUNCE_MS = 1500

const toBase64 = (str: string) => {
    const bytes = new TextEncoder().encode(str)
    let binary = ''
    bytes.forEach(b => { binary += String.fromCharCode(b) })
    return btoa(binary)
}

const fromBase64 = (str: string) => {
    if (!str) return ''
    const binary = atob(str)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
}

export default function Tool() {
    'use no memo'

    const { request, logout } = useApi()
    const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>('input')
    const [activeRightTab, setActiveRightTab] = useState<RightTab>('result')
    const [inputValue, setInputValue] = useState('')
    const [stylesheetValue, setStylesheetValue] = useState('')
    const [xmlLoaded, setXmlLoaded] = useState('')
    const [xsltLoaded, setXsltLoaded] = useState('')
    const [activeXmlFile, setActiveXmlFile] = useState<ActiveFile | null>(null)
    const [activeXsltFile, setActiveXsltFile] = useState<ActiveFile | null>(null)
    const [resultValue, setResultValue] = useState('')
    const [errorValue, setErrorValue] = useState('')
    const [transforming, setTransforming] = useState(false)
    const [saving, setSaving] = useState(false)
    const [theme, setTheme] = useState<Theme>('light')
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [leftWidth, setLeftWidth] = useState(50)
    const settingsRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const layoutRef = useRef<HTMLDivElement>(null)
    const sidebarRef = useRef<WorkspaceSidebarHandle>(null)

    const xmlDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
    const xsltDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

    const xmlDirty = xmlLoaded !== inputValue
    const xsltDirty = xsltLoaded !== stylesheetValue
    const canSave =
        (activeXmlFile !== null && xmlDirty) ||
        (activeXsltFile !== null && xsltDirty)

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setSettingsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => { document.removeEventListener('mousedown', handleClickOutside) }
    }, [])

    // Load auto-saved adhoc content on first mount.
    useEffect(() => {
        void (async () => {
            try {
                const adhoc = await getAdhoc(request)
                const xml = fromBase64(adhoc.xml)
                const xslt = fromBase64(adhoc.xslt)
                setInputValue(xml)
                setXmlLoaded(xml)
                setStylesheetValue(xslt)
                setXsltLoaded(xslt)
            } catch {
                // Non-fatal: fresh user, or backend unavailable.
            }
        })()
    }, [request])

    // Debounced auto-save — only for panes that aren't bound to a workspace file.
    useEffect(() => {
        if (activeXmlFile !== null) return
        if (inputValue === xmlLoaded) return
        if (xmlDebounce.current) clearTimeout(xmlDebounce.current)
        const pending = inputValue
        xmlDebounce.current = setTimeout(() => {
            void saveAdhoc(request, { xml: toBase64(pending) })
                .then(() => { setXmlLoaded(pending) })
                .catch(() => { /* best-effort */ })
        }, ADHOC_DEBOUNCE_MS)
        return () => {
            if (xmlDebounce.current) clearTimeout(xmlDebounce.current)
        }
    }, [inputValue, xmlLoaded, activeXmlFile, request])

    useEffect(() => {
        if (activeXsltFile !== null) return
        if (stylesheetValue === xsltLoaded) return
        if (xsltDebounce.current) clearTimeout(xsltDebounce.current)
        const pending = stylesheetValue
        xsltDebounce.current = setTimeout(() => {
            void saveAdhoc(request, { xslt: toBase64(pending) })
                .then(() => { setXsltLoaded(pending) })
                .catch(() => { /* best-effort */ })
        }, ADHOC_DEBOUNCE_MS)
        return () => {
            if (xsltDebounce.current) clearTimeout(xsltDebounce.current)
        }
    }, [stylesheetValue, xsltLoaded, activeXsltFile, request])

    const handleOpenFile = useCallback((file: {
        workspaceId: number
        name: string
        kind: WorkspaceFileKind
        content: string
    }) => {
        if (file.kind === 'XML') {
            if (xmlDebounce.current) clearTimeout(xmlDebounce.current)
            setInputValue(file.content)
            setXmlLoaded(file.content)
            setActiveXmlFile({ workspaceId: file.workspaceId, name: file.name })
            setActiveLeftTab('input')
        } else {
            if (xsltDebounce.current) clearTimeout(xsltDebounce.current)
            setStylesheetValue(file.content)
            setXsltLoaded(file.content)
            setActiveXsltFile({ workspaceId: file.workspaceId, name: file.name })
            setActiveLeftTab('stylesheet')
        }
    }, [])

    const handleActiveFileDeleted = useCallback((workspaceId: number, name: string) => {
        if (activeXmlFile?.workspaceId === workspaceId && activeXmlFile.name === name) {
            setActiveXmlFile(null)
        }
        if (activeXsltFile?.workspaceId === workspaceId && activeXsltFile.name === name) {
            setActiveXsltFile(null)
        }
    }, [activeXmlFile, activeXsltFile])

    const handleSwitchToAdhoc = useCallback(() => {
        if (xmlDebounce.current) clearTimeout(xmlDebounce.current)
        if (xsltDebounce.current) clearTimeout(xsltDebounce.current)
        setActiveXmlFile(null)
        setActiveXsltFile(null)
        void (async () => {
            try {
                const adhoc = await getAdhoc(request)
                const xml = fromBase64(adhoc.xml)
                const xslt = fromBase64(adhoc.xslt)
                setInputValue(xml)
                setXmlLoaded(xml)
                setStylesheetValue(xslt)
                setXsltLoaded(xslt)
            } catch {
                // Leave panes as-is on error.
            }
        })()
    }, [request])

    const handleSave = useCallback(async () => {
        if (!canSave) return
        setSaving(true)
        try {
            const tasks: Promise<unknown>[] = []
            if (activeXmlFile && xmlDirty) {
                tasks.push(
                    saveWorkspaceFile(request, activeXmlFile.workspaceId, activeXmlFile.name, toBase64(inputValue))
                        .then(() => { setXmlLoaded(inputValue) })
                )
            }
            if (activeXsltFile && xsltDirty) {
                tasks.push(
                    saveWorkspaceFile(request, activeXsltFile.workspaceId, activeXsltFile.name, toBase64(stylesheetValue))
                        .then(() => { setXsltLoaded(stylesheetValue) })
                )
            }
            await Promise.all(tasks)
            sidebarRef.current?.refreshActive()
        } catch (err) {
            setErrorValue(err instanceof Error ? err.message : String(err))
            setActiveRightTab('error')
        } finally {
            setSaving(false)
        }
    }, [canSave, activeXmlFile, activeXsltFile, xmlDirty, xsltDirty, inputValue, stylesheetValue, request])

    const handleTransform = useCallback(async () => {
        setTransforming(true)
        setResultValue('')
        setErrorValue('')
        try {
            // When the XSLT is a workspace file, we always go through the
            // workspace-scoped endpoint so <xsl:import>/<xsl:include> resolve
            // against sibling files on disk. Dirty XSLT is saved first so the
            // compiler sees the latest source.
            if (activeXsltFile) {
                if (xsltDirty) {
                    await saveWorkspaceFile(
                        request,
                        activeXsltFile.workspaceId,
                        activeXsltFile.name,
                        toBase64(stylesheetValue)
                    )
                    setXsltLoaded(stylesheetValue)
                    sidebarRef.current?.refreshActive()
                }

                const sameWs = activeXmlFile?.workspaceId === activeXsltFile.workspaceId
                const body: {
                    xsltFile: string
                    xmlFile?: string
                    xmlContent?: string
                } = { xsltFile: activeXsltFile.name }
                if (activeXmlFile && sameWs && !xmlDirty) {
                    body.xmlFile = activeXmlFile.name
                } else {
                    body.xmlContent = toBase64(inputValue)
                }

                const res = await transformInWorkspace(
                    request,
                    activeXsltFile.workspaceId,
                    body
                )
                setResultValue(fromBase64(res.transformedXml))
                setActiveRightTab('result')
                return
            }

            const res = await request<{ transformedXml: string }>('/transform/adhoc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    xml: toBase64(inputValue),
                    stylesheet: toBase64(stylesheetValue),
                }),
            })
            setResultValue(fromBase64(res.transformedXml))
            setActiveRightTab('result')
        } catch (err) {
            setErrorValue(err instanceof Error ? err.message : String(err))
            setActiveRightTab('error')
        } finally {
            setTransforming(false)
        }
    }, [request, inputValue, stylesheetValue, activeXmlFile, activeXsltFile, xmlDirty, xsltDirty])

    const onDividerMouseDown = useCallback(() => {
        isDragging.current = true
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
    }, [])

    useEffect(() => {
        function onMouseMove(e: MouseEvent) {
            if (!isDragging.current || !layoutRef.current) return
            const rect = layoutRef.current.getBoundingClientRect()
            const newWidth = ((e.clientX - rect.left) / rect.width) * 100
            setLeftWidth(Math.min(Math.max(newWidth, 20), 80))
        }

        function onMouseUp() {
            isDragging.current = false
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
        return () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }
    }, [])

    return (
        <div className="app">
            <header className="header">
                <span className="header-title">XSLT Transformer</span>
                <button
                    className="header-save"
                    onClick={() => { void handleSave() }}
                    disabled={!canSave || saving}
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                    className="header-transform"
                    onClick={() => { void handleTransform() }}
                    disabled={transforming}
                >
                    {transforming ? 'Transforming…' : 'Transform'}
                </button>
                <button className="header-logout" onClick={logout}>
                    Logout
                </button>
                <div className="settings-wrapper" ref={settingsRef}>
                    <button
                        className="header-settings"
                        aria-label="Settings"
                        onClick={() => { setSettingsOpen((o) => !o) }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </button>
                    {settingsOpen && (
                        <div className="settings-dropdown">
                            <p className="settings-label">Theme</p>
                            <div className="settings-theme-buttons">
                                <button
                                    className={`settings-theme-btn ${theme === 'light' ? 'settings-theme-btn--active' : ''}`}
                                    onClick={() => { setTheme('light') }}
                                >
                                    Light
                                </button>
                                <button
                                    className={`settings-theme-btn ${theme === 'dark' ? 'settings-theme-btn--active' : ''}`}
                                    onClick={() => { setTheme('dark') }}
                                >
                                    Dark
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <div className="layout" ref={layoutRef}>
                <WorkspaceSidebar
                    ref={sidebarRef}
                    activeXml={activeXmlFile}
                    activeXslt={activeXsltFile}
                    onOpenFile={handleOpenFile}
                    onActiveFileDeleted={handleActiveFileDeleted}
                    onSwitchToAdhoc={handleSwitchToAdhoc}
                    dirtyXml={xmlDirty}
                    dirtyXslt={xsltDirty}
                />
                <div className="panel" style={{ width: `${String(leftWidth)}%` }}>
                    <div className="tabs">
                        <button
                            className={`tab ${activeLeftTab === 'input' ? 'tab--active' : ''}`}
                            onClick={() => { setActiveLeftTab('input') }}
                        >
                            Input{activeXmlFile ? ` — ${activeXmlFile.name}${xmlDirty ? ' *' : ''}` : ''}
                        </button>
                        <button
                            className={`tab ${activeLeftTab === 'stylesheet' ? 'tab--active' : ''}`}
                            onClick={() => { setActiveLeftTab('stylesheet') }}
                        >
                            XSL Stylesheet{activeXsltFile ? ` — ${activeXsltFile.name}${xsltDirty ? ' *' : ''}` : ''}
                        </button>
                    </div>
                    <div className="editor-area">
                        <div style={{ display: activeLeftTab === 'input' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
                            <CodeEditor value={inputValue} onChange={setInputValue} />
                        </div>
                        <div style={{ display: activeLeftTab === 'stylesheet' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
                            <CodeEditor value={stylesheetValue} onChange={setStylesheetValue} />
                        </div>
                    </div>
                </div>

                <div className="divider" onMouseDown={onDividerMouseDown} />

                <div className="panel" style={{ width: `${String(100 - leftWidth)}%` }}>
                    <div className="tabs">
                        <button
                            className={`tab ${activeRightTab === 'result' ? 'tab--active' : ''}`}
                            onClick={() => { setActiveRightTab('result') }}
                        >
                            Result
                        </button>
                        <button
                            className={`tab ${activeRightTab === 'error' ? 'tab--active' : ''}`}
                            onClick={() => { setActiveRightTab('error') }}
                        >
                            Error
                        </button>
                    </div>
                    <div className="editor-area">
                        <div style={{ display: activeRightTab === 'result' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
                            <CodeEditor value={resultValue} readOnly />
                        </div>
                        <div style={{ display: activeRightTab === 'error' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
                            <CodeEditor value={errorValue} readOnly />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
