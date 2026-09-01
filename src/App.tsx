import { useCallback, useEffect, useState } from 'react'
import { PageSidebar } from './components/PageSidebar'
import { PerformanceViewer } from './components/PerformanceViewer'
import { PropertiesPanel } from './components/PropertiesPanel'
import { Toolbar } from './components/Toolbar'
import { Viewer } from './components/Viewer'
import { WelcomeScreen } from './components/WelcomeScreen'
import { enterFullscreen, exitFullscreen } from './fullscreen'
import { allowScreenSleep, keepScreenAwake } from './wakeLock'
import { usePdfEditor } from './usePdfEditor'
import type { Orientation } from './types'

export default function App() {
  const editor = usePdfEditor()
  const [orientation, setOrientation] = useState<Orientation | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(true)
  const onOrientationChange = useCallback((next: Orientation) => {
    setOrientation(next)
  }, [])

  useEffect(() => {
    if (editor.pages.length === 0) setViewerOpen(false)
  }, [editor.pages.length])

  return (
    <div
      className={`app${settingsOpen ? ' settings-open' : ''}${viewerOpen ? ' app-performance' : ''}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file && /\.pdf$/i.test(file.name)) void editor.openFile(file)
      }}
    >
      {viewerOpen && editor.pages.length > 0 ? (
        <PerformanceViewer
          editor={editor}
          onClose={() => {
            void exitFullscreen()
            void allowScreenSleep()
            setViewerOpen(false)
          }}
        />
      ) : (
        <>
          <Toolbar
            editor={editor}
            settingsOpen={settingsOpen}
            onToggleSettings={() => setSettingsOpen((value) => !value)}
            onOpenViewer={() => {
              void enterFullscreen()
              void keepScreenAwake()
              setSettingsOpen(false)
              setViewerOpen(true)
            }}
          />
          {editor.pages.length === 0 ? (
            <WelcomeScreen
              busy={editor.busy}
              onOpenFile={(file) => void editor.openFile(file)}
              onNewDocument={(count, landscape) => void editor.newDocument(count, landscape)}
            />
          ) : (
            <div className={`workspace${pagesOpen ? '' : ' pages-collapsed'}`}>
              <PageSidebar
                editor={editor}
                collapsed={!pagesOpen}
                onToggle={() => setPagesOpen((value) => !value)}
              />
              <Viewer editor={editor} onOrientationChange={onOrientationChange} />
              <PropertiesPanel
                editor={editor}
                orientation={orientation}
                onClose={() => setSettingsOpen(false)}
              />
            </div>
          )}
          {settingsOpen ? (
            <button
              type="button"
              className="settings-backdrop"
              aria-label="설정 닫기"
              onClick={() => setSettingsOpen(false)}
            />
          ) : null}
          {editor.status ? <div className="status">{editor.status}</div> : null}
        </>
      )}
      {editor.busy ? <div className="busy-mask" aria-hidden="true" /> : null}
    </div>
  )
}
