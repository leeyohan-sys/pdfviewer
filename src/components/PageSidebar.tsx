import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconPage,
  IconRotateLeft,
  IconRotateRight,
  IconTrash,
} from '../icons'
import type { Orientation, PageState } from '../types'
import { getPdfPage, renderPage, visualPageSize } from '../pdf/engine'
import type { usePdfEditor } from '../usePdfEditor'

type Editor = ReturnType<typeof usePdfEditor>

type PageSidebarProps = {
  editor: Editor
  collapsed: boolean
  onToggle: () => void
}

export function PageSidebar({ editor, collapsed, onToggle }: PageSidebarProps) {
  const [menu, setMenu] = useState<{ pageId: string; x: number; y: number } | null>(
    null,
  )
  const menuPage = menu
    ? editor.pages.find((page) => page.id === menu.pageId)
    : undefined

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {collapsed ? (
        <button
          type="button"
          className="sidebar-toggle sidebar-toggle-peek"
          aria-label="페이지 목록 보기"
          aria-expanded={false}
          onClick={onToggle}
        >
          <IconChevronRight size={16} />
        </button>
      ) : null}
      <div className="sidebar-body">
        <div className="sidebar-head">
          <div className="sidebar-head-text">
            <h2>페이지</h2>
            <span>{editor.pages.length}장</span>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label="페이지 목록 숨기기"
            aria-expanded={!collapsed}
            onClick={onToggle}
          >
            <IconChevronLeft size={16} />
          </button>
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
              onOpenMenu={(x, y) => {
                editor.setCurrentPageId(page.id)
                setMenu({ pageId: page.id, x, y })
              }}
            />
          ))}
        </div>
      </div>
      {menu && menuPage ? (
        <PageContextMenu
          editor={editor}
          page={menuPage}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
        />
      ) : null}
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
  onOpenMenu: (x: number, y: number) => void
}

function PageThumb({
  page,
  index,
  selected,
  sourceBytes,
  onSelect,
  onMove,
  onOrientation,
  onOpenMenu,
}: PageThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const longPressRef = useRef<number | null>(null)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const menuOpenedRef = useRef(false)

  const cancelLongPress = () => {
    if (longPressRef.current !== null) {
      window.clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
    startPointRef.current = null
  }

  useEffect(() => () => cancelLongPress(), [])
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
      onClick={(event) => {
        if (menuOpenedRef.current) {
          event.preventDefault()
          menuOpenedRef.current = false
          return
        }
        onSelect()
      }}
      onPointerDown={(event) => {
        if (!event.isPrimary) return
        menuOpenedRef.current = false
        startPointRef.current = { x: event.clientX, y: event.clientY }
        const { clientX, clientY } = event
        longPressRef.current = window.setTimeout(() => {
          longPressRef.current = null
          menuOpenedRef.current = true
          onOpenMenu(clientX, clientY)
        }, 480)
      }}
      onPointerMove={(event) => {
        const start = startPointRef.current
        if (!start) return
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) {
          cancelLongPress()
        }
      }}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onContextMenu={(event) => {
        event.preventDefault()
        cancelLongPress()
        menuOpenedRef.current = true
        onOpenMenu(event.clientX, event.clientY)
      }}
      onDragStart={(event) => {
        if (menuOpenedRef.current) {
          event.preventDefault()
          return
        }
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

type PageContextMenuProps = {
  editor: Editor
  page: PageState
  x: number
  y: number
  onClose: () => void
}

function PageContextMenu({ editor, page, x, y, onClose }: PageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })
  const visual = visualPageSize(
    page.width,
    page.height,
    page.baseRotation,
    page.extraRotation,
  )
  const landscape = visual.width > visual.height

  useLayoutEffect(() => {
    const node = menuRef.current
    if (!node) return
    const box = node.getBoundingClientRect()
    setPos({
      x: Math.max(8, Math.min(x, window.innerWidth - box.width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - box.height - 8)),
    })
  }, [x, y])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <button
        type="button"
        className="page-menu-backdrop"
        aria-label="메뉴 닫기"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        className="page-menu"
        role="menu"
        style={{ left: pos.x, top: pos.y }}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            editor.rotatePage(page.id, -90)
            onClose()
          }}
        >
          <IconRotateLeft />
          왼쪽 90°
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            editor.rotatePage(page.id, 90)
            onClose()
          }}
        >
          <IconRotateRight />
          오른쪽 90°
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            editor.duplicatePage(page.id)
            onClose()
          }}
        >
          <IconCopy />
          복제
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            editor.deletePage(page.id)
            onClose()
          }}
        >
          <IconTrash />
          삭제
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            void editor.addBlankPage(landscape)
            onClose()
          }}
        >
          <IconPage />
          빈 페이지 추가
        </button>
      </div>
    </>
  )
}
