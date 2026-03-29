import { useState } from 'react'
import CodeEditor from './CodeEditor'
import './App.css'

type LeftTab = 'input' | 'stylesheet'

export default function App() {
  const [activeTab, setActiveTab] = useState<LeftTab>('input')
  const [inputValue, setInputValue] = useState('')
  const [stylesheetValue, setStylesheetValue] = useState('')
  const [resultValue] = useState('')

  return (
    <div className="app">
      <header className="header">
        <span className="header-title">XSLT Transformer</span>
        <button className="header-transform">Transform</button>
        <button className="header-settings" aria-label="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      <div className="layout">
        <div className="panel panel-left">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'input' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('input')}
            >
              Input
            </button>
            <button
              className={`tab ${activeTab === 'stylesheet' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('stylesheet')}
            >
              XSL Stylesheet
            </button>
          </div>
          <div className="editor-area">
            <div style={{ display: activeTab === 'input' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
              <CodeEditor value={inputValue} onChange={setInputValue} />
            </div>
            <div style={{ display: activeTab === 'stylesheet' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
              <CodeEditor value={stylesheetValue} onChange={setStylesheetValue} />
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="panel panel-right">
          <div className="tabs">
            <button className="tab tab--active">Result</button>
          </div>
          <div className="editor-area">
            <CodeEditor value={resultValue} readOnly />
          </div>
        </div>
      </div>
    </div>
  )
}
