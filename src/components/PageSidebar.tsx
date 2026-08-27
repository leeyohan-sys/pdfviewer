import { useEffect, useRef } from 'react'
import type { Orientation, PageState } from '../types'
import { getPdfPage, renderPage, visualPageSize } from '../pdf/engine'
import type { usePdfEditor } from '../usePdfEditor'

type Editor = ReturnType<typeof usePdfEditor>

type PageSidebarProps = {
  editor: Editor
}

export function PageSidebar({ editor }: PageSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <h2>페이지</h2>
        <span>{editor.pages.length}장</span>
      </div>
      <div className="page-list">
        {editor.pages.map((page, index) => (
          <PageThumb
            key={page.id}
            page={page}
            index={index}
            selected={page.id === editor.currentPageId}
            sourceBytes={
              editor.sources.find((item) => item.id === page.sourceId)?.bytes
            }
            onSelect={() => editor.setCurrentPageId(page.id)}
            onMove={(targetId) => editor.movePage(page.id, targetId)}
            onOrientation={(orientation) => {
              editor.setPageOrientation(page.id, orientation)
            }}
          />
        ))}
      </div>
    </aside>
  )
}

type PageThumbProps = {
  page: PageState
  index: number
  selected: boolean
  sourceBytes?: Uint8Array
  onSelect: () => void
  onMove: (targetId: string) => void
  onOrientation: (orientation: Orientation) => void
}

function PageThumb({
  page,
  index,
  selected,
  sourceBytes,
  onSelect,
  onMove,
  onOrientation,
}: PageThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const visual = visualPageSize(
    page.width,
    page.height,
    page.baseRotation,
    page.extraRotation,
  )
  const orientation: Orientation =
    visual.width > visual.height ? 'landscape' : 'portrait'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false

    void (async () => {
      try {
        const pdfPage = await getPdfPage(
          page.sourceId,
          page.sourceIndex,
          sourceBytes,
        )
        if (cancelled) return
        const scale = 118 / Math.max(visual.width, 1)
        await renderPage(pdfPage, canvas, page.extraRotation, scale)
      } catch (error) {
        console.error(error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [page.extraRotation, page.sourceId, page.sourceIndex, sourceBytes, visual.width])

  return (
    <article
      className={`page-thumb ${selected ? 'selected' : ''}`}
      draggable
      onClick={onSelect}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/page-id', page.id)
        event.dataTransfer.effectAllowed = 'move'
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(event) => {
        event.preventDefault()
        const fromId = event.dataTransfer.getData('text/page-id')
        if (fromId) onMove(fromId)
      }}
    >
      <div
        className="thumb-canvas-wrap"
        style={{ aspectRatio: `${visual.width} / ${visual.height}` }}
      >
        <canvas ref={canvasRef} />
      </div>
      <div className="thumb-meta">
        <span>{index + 1}페이지</span>
        <span className="thumb-badge">
          {orientation === 'landscape' ? '가로' : '세로'}
        </span>
      </div>
      <div
        className="orient-toggle"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={orientation === 'portrait' ? 'on' : ''}
          onClick={() => onOrientation('portrait')}
        >
          세로
        </button>
        <button
          type="button"
          className={orientation === 'landscape' ? 'on' : ''}
          onClick={() => onOrientation('landscape')}
        >
          가로
        </button>
      </div>
    </article>
  )
}
