import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { PageViewport, RenderTask } from 'pdfjs-dist'
import { AnnotationShape } from './Viewer'
import { getPdfPage, renderPage, totalRotation, visualPageSize } from '../pdf/engine'
import type { PageState, PdfSource } from '../types'
import { IconClose } from '../icons'
import { enterFullscreen, isFullscreen } from '../fullscreen'
import { allowScreenSleep, keepScreenAwake } from '../wakeLock'
import type { usePdfEditor } from '../usePdfEditor'

type Editor = ReturnType<typeof usePdfEditor>

const MIN_SCALE = 0.6
const MAX_SCALE = 4

type PerformanceViewerProps = {
  editor: Editor
  onClose: () => void
}

export function PerformanceViewer({ editor, onClose }: PerformanceViewerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [baseWidth, setBaseWidth] = useState(0)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null)
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(
    null,
  )
  const pendingScroll = useRef<{ left: number; top: number } | null>(null)
  const lastTap = useRef(0)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    void keepScreenAwake()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
      void allowScreenSleep()
    }
  }, [onClose])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const update = () => setBaseWidth(scroller.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const next = pendingScroll.current
    if (!scroller || !next) return
    scroller.scrollLeft = next.left
    scroller.scrollTop = next.top
    pendingScroll.current = null
  }, [scale])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      applyZoom(scale * (event.deltaY < 0 ? 1.08 : 0.92), event.clientX, event.clientY)
    }
    scroller.addEventListener('wheel', onWheel, { passive: false })
    return () => scroller.removeEventListener('wheel', onWheel)
  }, [scale])

  const applyZoom = (nextScale: number, clientX: number, clientY: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
    if (Math.abs(clamped - scale) < 0.001) return
    const rect = scroller.getBoundingClientRect()
    const ratio = clamped / scale
    pendingScroll.current = {
      left: (scroller.scrollLeft + clientX - rect.left) * ratio - (clientX - rect.left),
      top: (scroller.scrollTop + clientY - rect.top) * ratio - (clientY - rect.top),
    }
    setScale(clamped)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isFullscreen()) void enterFullscreen()
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    try {
      scrollerRef.current?.setPointerCapture(event.pointerId)
    } catch {
      // ignore
    }

    if (pointersRef.current.size === 2) {
      const points = [...pointersRef.current.values()]
      pinchRef.current = {
        distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
        scale,
      }
      panRef.current = null
      return
    }

    if (event.isPrimary && event.pointerType !== 'mouse') {
      const now = Date.now()
      if (now - lastTap.current < 280) {
        const next = scale > 1.15 ? 1 : 2
        applyZoom(next, event.clientX, event.clientY)
        lastTap.current = 0
      } else {
        lastTap.current = now
      }
    }

    const scroller = scrollerRef.current
    if (!scroller) return
    panRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: scroller.scrollLeft,
      top: scroller.scrollTop,
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      event.preventDefault()
      const points = [...pointersRef.current.values()]
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      if (pinchRef.current.distance < 8) return
      const midX = (points[0].x + points[1].x) / 2
      const midY = (points[0].y + points[1].y) / 2
      applyZoom((distance / pinchRef.current.distance) * pinchRef.current.scale, midX, midY)
      return
    }

    if (panRef.current && pointersRef.current.size === 1) {
      const scroller = scrollerRef.current
      if (!scroller) return
      scroller.scrollLeft = panRef.current.left - (event.clientX - panRef.current.x)
      scroller.scrollTop = panRef.current.top - (event.clientY - panRef.current.y)
    }
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 1) {
      const point = [...pointersRef.current.values()][0]
      const scroller = scrollerRef.current
      if (point && scroller) {
        panRef.current = {
          x: point.x,
          y: point.y,
          left: scroller.scrollLeft,
          top: scroller.scrollTop,
        }
      }
    } else {
      panRef.current = null
    }
  }

  return (
    <div className="performance">
      <button
        type="button"
        className="performance-close"
        onClick={onClose}
        aria-label="편집 화면으로"
      >
        <IconClose />
      </button>
      <div
        ref={scrollerRef}
        className="performance-scroller"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="performance-sheet"
          style={{ width: Math.max(baseWidth * scale, 1) }}
        >
          {editor.pages.map((page) => (
            <PerformancePage
              key={page.id}
              page={page}
              source={editor.sources.find((item) => item.id === page.sourceId)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function PerformancePage({
  page,
  source,
}: {
  page: PageState
  source?: PdfSource
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<{ current: RenderTask | null }>({ current: null })
  const [viewport, setViewport] = useState<PageViewport | null>(null)
  const [layoutNonce, setLayoutNonce] = useState(0)
  const visual = visualPageSize(
    page.width,
    page.height,
    page.baseRotation,
    page.extraRotation,
  )

  useEffect(() => {
    const stack = stackRef.current
    if (!stack) return
    const observer = new ResizeObserver(() => {
      setLayoutNonce((value) => value + 1)
    })
    observer.observe(stack)
    return () => observer.disconnect()
  }, [page.id])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const stack = stackRef.current
    if (!canvas || !stack) return
    if (stack.clientWidth < 8) {
      const frame = window.requestAnimationFrame(() => {
        setLayoutNonce((value) => value + 1)
      })
      return () => window.cancelAnimationFrame(frame)
    }

    let cancelled = false
    const extraRotation = page.extraRotation
    const scale = stack.clientWidth / visual.width

    void (async () => {
      try {
        const pdfPage = await getPdfPage(page.sourceId, page.sourceIndex, source?.bytes)
        if (cancelled || !canvas.isConnected) return
        const rotation = totalRotation(pdfPage.rotate, extraRotation)
        const nextViewport = pdfPage.getViewport({ scale, rotation })
        setViewport(nextViewport)
        await renderPage(
          pdfPage,
          canvas,
          extraRotation,
          scale,
          renderTaskRef.current,
        )
      } catch (error) {
        console.error(error)
      }
    })()

    return () => {
      cancelled = true
      try {
        renderTaskRef.current.current?.cancel()
      } catch {
        // ignore
      }
    }
  }, [
    layoutNonce,
    page.extraRotation,
    page.id,
    page.sourceId,
    page.sourceIndex,
    source?.bytes,
    visual.width,
  ])

  return (
    <div
      ref={stackRef}
      className="performance-page"
      style={{ aspectRatio: `${visual.width} / ${visual.height}` }}
    >
      <canvas ref={canvasRef} className="page-canvas" />
      {viewport ? (
        <svg
          className="performance-ann"
          width="100%"
          height="100%"
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
          preserveAspectRatio="none"
        >
          {page.annotations.map((annotation) => (
            <AnnotationShape
              key={annotation.id}
              annotation={annotation}
              viewport={viewport}
              selected={false}
            />
          ))}
        </svg>
      ) : null}
    </div>
  )
}
