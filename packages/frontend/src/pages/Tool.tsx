import { useState, useEffect, useRef, useCallback, lazy } from 'react'
import '../App.css'

type LeftTab = 'input' | 'stylesheet'
type RightTab = 'result' | 'error'
type Theme = 'light' | 'dark'

const CodeEditor = lazy(()=>import("../CodeEditor"))

export default function Tool() {
  'use no memo'

  const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>('input')
  const [activeRightTab, setActiveRightTab] = useState<RightTab>('result')
  const [inputValue, setInputValue] = useState('')
  const [stylesheetValue, setStylesheetValue] = useState('')
  const [resultValue] = useState('')
  const [errorValue] = useState('')
  const [theme, setTheme] = useState<Theme>('light')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leftWidth, setLeftWidth] = useState(50)
  const settingsRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const layoutRef = useRef<HTMLDivElement>(null)

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
        <button className="header-transform">Transform</button>
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
        <div className="panel" style={{ width: `${String(leftWidth)}%` }}>
          <div className="tabs">
            <button
              className={`tab ${activeLeftTab === 'input' ? 'tab--active' : ''}`}
              onClick={() => { setActiveLeftTab('input') }}
            >
              Input
            </button>
            <button
              className={`tab ${activeLeftTab === 'stylesheet' ? 'tab--active' : ''}`}
              onClick={() => { setActiveLeftTab('stylesheet') }}
            >
              XSL Stylesheet
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
