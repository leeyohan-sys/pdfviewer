import { useCallback, useState } from 'react'
import { PageSidebar } from './components/PageSidebar'
import { PropertiesPanel } from './components/PropertiesPanel'
import { Toolbar } from './components/Toolbar'
import { Viewer } from './components/Viewer'
import { WelcomeScreen } from './components/WelcomeScreen'
import { usePdfEditor } from './usePdfEditor'
import type { Orientation } from './types'

export default function App() {
  const editor = usePdfEditor()
  const [orientation, setOrientation] = useState<Orientation | null>(null)
  const onOrientationChange = useCallback((next: Orientation) => {
    setOrientation(next)
  }, [])

  return (
    <div
      className="app"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file && /\.pdf$/i.test(file.name)) void editor.openFile(file)
      }}
    >
      <Toolbar editor={editor} />
      {editor.pages.length === 0 ? (
        <WelcomeScreen
          busy={editor.busy}
          onOpenFile={(file) => void editor.openFile(file)}
          onNewDocument={(count, landscape) => void editor.newDocument(count, landscape)}
        />
      ) : (
        <div className="workspace">
          <PageSidebar editor={editor} />
          <Viewer editor={editor} onOrientationChange={onOrientationChange} />
          <PropertiesPanel editor={editor} orientation={orientation} />
        </div>
      )}
      {editor.status ? <div className="status">{editor.status}</div> : null}
      {editor.busy ? <div className="busy-mask" aria-hidden="true" /> : null}
    </div>
  )
}
