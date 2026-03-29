import { useEffect, useLayoutEffect, useRef } from 'react'
import { EditorView, lineNumbers, keymap, drawSelection } from '@codemirror/view'
import { Compartment, EditorState } from '@codemirror/state'
import { xml } from '@codemirror/lang-xml'
import { foldGutter, foldKeymap, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'

interface CodeEditorProps {
  value?: string
  onChange?: (value: string) => void
  readOnly?: boolean
}

export default function CodeEditor({ value = '', onChange, readOnly = false }: CodeEditorProps) {
  'use no memo'

  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const editableCompartment = useRef(new Compartment())
  const initialValue = useRef(value)
  const initialReadOnly = useRef(readOnly)

  useLayoutEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    if (!containerRef.current) return

    const extensions = [
      lineNumbers(),
      foldGutter(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
      xml(),
      editableCompartment.current.of(EditorView.editable.of(!initialReadOnly.current)),
      EditorView.theme({
        '&': { height: '100%', fontSize: '13px', background: 'var(--bg)' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, Consolas, monospace' },
        '.cm-content': { padding: '8px 0' },
        '.cm-gutters': { background: 'var(--code-bg)', borderRight: '1px solid var(--border)', color: 'var(--text)' },
        '.cm-activeLineGutter': { background: 'var(--accent-bg)' },
        '.cm-activeLine': { background: 'var(--accent-bg)' },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current?.(update.state.doc.toString())
        }
      }),
    ]

    const view = new EditorView({
      state: EditorState.create({ doc: initialValue.current, extensions }),
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
    }
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: editableCompartment.current.reconfigure(EditorView.editable.of(!readOnly)),
    })
  }, [readOnly])

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
}
