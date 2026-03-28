import { useState } from 'react'
import './App.css'

type LeftTab = 'input' | 'stylesheet'

export default function App() {
  const [activeTab, setActiveTab] = useState<LeftTab>('input')

  return (
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
          {activeTab === 'input' ? (
            <textarea className="editor" placeholder="XML Input..." spellCheck={false} />
          ) : (
            <textarea className="editor" placeholder="XSL Stylesheet..." spellCheck={false} />
          )}
        </div>
      </div>

      <div className="divider" />

      <div className="panel panel-right">
        <div className="tabs">
          <button className="tab tab--active">Result</button>
        </div>
        <div className="editor-area">
          <textarea className="editor" placeholder="Result..." readOnly spellCheck={false} />
        </div>
      </div>
    </div>
  )
}
