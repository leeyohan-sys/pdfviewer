import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { PageViewport, RenderTask } from 'pdfjs-dist'
import type {
  Annotation,
  BoxAnnotation,
  HighlightAnnotation,
  ImageAnnotation,
  PenAnnotation,
  Point,
  RectAnnotation,
  TextAnnotation,
} from '../types'
import { getPdfPage, renderPage, totalRotation, visualPageSize } from '../pdf/engine'
import { eraseAnnotations, hitTest, normalizeBox, toolCursor, uid } from '../lib'
import type { usePdfEditor } from '../usePdfEditor'

type Editor = ReturnType<typeof usePdfEditor>

type ViewerProps = {
  editor: Editor
  onOrientationChange: (orientation: 'portrait' | 'landscape') => void
}

type Draft =
  | { type: 'highlight' | 'rect'; start: Point; current: Point }
  | { type: 'pen'; points: Point[] }
  | null

export function Viewer({ editor, onOrientationChange }: ViewerProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<{ current: RenderTask | null }>({
    current: null,
  })
  const viewportRef = useRef<PageViewport | null>(null)
  const [viewport, setViewport] = useState<PageViewport | null>(null)
  const [layoutNonce, setLayoutNonce] = useState(0)
  const [draft, setDraft] = useState<Draft>(null)
  const draftRef = useRef<Draft>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const dragRef = useRef<{
    id: string
    last: Point
    started: boolean
  } | null>(null)
  const erasingRef = useRef(false)
  const eraseAnnotationsRef = useRef<Annotation[] | null>(null)
  const [eraserCursor, setEraserCursor] = useState<{
    x: number
    y: number
    radius: number
  } | null>(null)

  const page = editor.currentPage
  const visual = page
    ? visualPageSize(
        page.width,
        page.height,
        page.baseRotation,
        page.extraRotation,
      )
    : null

  useEffect(() => {
    if (!visual) return
    onOrientationChange(visual.width > visual.height ? 'landscape' : 'portrait')
  }, [onOrientationChange, visual?.height, visual?.width])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let lastWidth = stage.clientWidth
    const observer = new ResizeObserver(() => {
      const width = stage.clientWidth
      if (width !== lastWidth) {
        lastWidth = width
        setLayoutNonce((value) => value + 1)
      }
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [page?.id])

  useLayoutEffect(() => {
    if (!page || !visual) return
    const canvas = canvasRef.current
    const stack = stackRef.current
    if (!canvas || !stack || stack.clientWidth < 8) return

    let cancelled = false
    const source = editor.sources.find((item) => item.id === page.sourceId)
    const extraRotation = page.extraRotation
    const cssWidth = Math.max(stack.clientWidth, 1)
    const scale = cssWidth / visual.width

    void (async () => {
      try {
        const pdfPage = await getPdfPage(
          page.sourceId,
          page.sourceIndex,
          source?.bytes,
        )
        if (cancelled || !canvas.isConnected) return
        const rotation = totalRotation(pdfPage.rotate, extraRotation)
        const nextViewport = pdfPage.getViewport({ scale, rotation })
        viewportRef.current = nextViewport
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
    editor.sources,
    editor.zoom,
    layoutNonce,
    page?.extraRotation,
    page?.id,
    page?.sourceId,
    page?.sourceIndex,
    visual?.width,
    visual?.height,
  ])

  const toPdf = (event: { clientX: number; clientY: number }): Point | null => {
    const overlay = overlayRef.current
    const vp = viewportRef.current
    if (!overlay || !vp) return null
    const rect = overlay.getBoundingClientRect()
    const [x, y] = vp.convertToPdfPoint(
      event.clientX - rect.left,
      event.clientY - rect.top,
    )
    return { x, y }
  }

  const updateEraserCursor = (point: Point) => {
    const vp = viewportRef.current
    if (editor.tool !== 'eraser' || !vp) {
      setEraserCursor(null)
      return
    }
    const origin = vp.convertToViewportPoint(point.x, point.y)
    const edge = vp.convertToViewportPoint(point.x + editor.eraserSize, point.y)
    setEraserCursor({
      x: origin[0],
      y: origin[1],
      radius: Math.max(6, Math.hypot(edge[0] - origin[0], edge[1] - origin[1])),
    })
  }

  useEffect(() => {
    if (editor.tool !== 'eraser') setEraserCursor(null)
  }, [editor.tool])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!page || event.button !== 0) return
    const point = toPdf(event)
    if (!point) return
    overlayRef.current?.setPointerCapture(event.pointerId)

    if (editor.tool === 'select') {
      const hit = [...page.annotations].reverse().find((annotation) => hitTest(annotation, point))
      editor.setSelectedId(hit?.id ?? null)
      if (hit) {
        dragRef.current = { id: hit.id, last: point, started: false }
      }
      return
    }

    if (editor.tool === 'text') {
      const annotation: TextAnnotation = {
        id: uid('ann'),
        type: 'text',
        x: point.x,
        y: point.y - editor.fontSize * 1.35,
        width: 180,
        height: editor.fontSize * 1.6,
        text: '텍스트',
        fontSize: editor.fontSize,
        color: editor.inkColor,
      }
      editor.addAnnotation(annotation)
      setEditingId(annotation.id)
      editor.setTool('select')
      return
    }

    if (editor.tool === 'image') {
      const dataUrl = editor.pendingImage
      if (!dataUrl) return
      const annotation: ImageAnnotation = {
        id: uid('ann'),
        type: 'image',
        x: point.x,
        y: point.y - 120,
        width: 160,
        height: 120,
        dataUrl,
      }
      editor.addAnnotation(annotation)
      editor.setPendingImage(null)
      editor.setTool('select')
      return
    }

    if (editor.tool === 'pen') {
      const next: Draft = { type: 'pen', points: [point] }
      draftRef.current = next
      setDraft(next)
      return
    }

    if (editor.tool === 'eraser' && page) {
      editor.beginLiveEdit()
      erasingRef.current = true
      updateEraserCursor(point)
      const next = eraseAnnotations(page.annotations, point, editor.eraserSize)
      eraseAnnotationsRef.current = next
      editor.replaceAnnotationsLive(page.id, next)
      editor.setSelectedId(null)
      return
    }

    if (editor.tool === 'highlight' || editor.tool === 'rect') {
      const next: Draft = { type: editor.tool, start: point, current: point }
      draftRef.current = next
      setDraft(next)
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const point = toPdf(event)
    if (!point) return

    if (editor.tool === 'eraser') updateEraserCursor(point)

    if (erasingRef.current && page && eraseAnnotationsRef.current) {
      const next = eraseAnnotations(
        eraseAnnotationsRef.current,
        point,
        editor.eraserSize,
      )
      eraseAnnotationsRef.current = next
      editor.replaceAnnotationsLive(page.id, next)
      return
    }

    if (dragRef.current) {
      if (!dragRef.current.started) {
        editor.beginLiveEdit()
        dragRef.current.started = true
      }
      const dx = point.x - dragRef.current.last.x
      const dy = point.y - dragRef.current.last.y
      dragRef.current.last = point
      editor.updateAnnotationLive(dragRef.current.id, (annotation) => {
        if (annotation.type === 'pen') {
          return {
            ...annotation,
            points: annotation.points.map((item) => ({
              x: item.x + dx,
              y: item.y + dy,
            })),
          }
        }
        return { ...annotation, x: annotation.x + dx, y: annotation.y + dy }
      })
      return
    }

    if (draftRef.current) {
      const current = draftRef.current
      const next: Draft =
        current.type === 'pen'
          ? { ...current, points: [...current.points, point] }
          : { ...current, current: point }
      draftRef.current = next
      setDraft(next)
    }
  }

  const onPointerUp = () => {
    dragRef.current = null
    erasingRef.current = false
    eraseAnnotationsRef.current = null
    const current = draftRef.current
    draftRef.current = null
    setDraft(null)
    if (!current || !page) return
    if (current.type === 'pen' && current.points.length > 1) {
      const annotation: PenAnnotation = {
        id: uid('ann'),
        type: 'pen',
        points: current.points,
        color: editor.inkColor,
        strokeWidth: editor.strokeWidth,
      }
      editor.addAnnotation(annotation)
    } else if (current.type === 'highlight' || current.type === 'rect') {
      const box = normalizeBox(
        current.start.x,
        current.start.y,
        current.current.x - current.start.x,
        current.current.y - current.start.y,
      )
      if (box.width > 4 && box.height > 4) {
        if (current.type === 'highlight') {
          const annotation: HighlightAnnotation = {
            id: uid('ann'),
            type: 'highlight',
            ...box,
            color: editor.highlightColor,
          }
          editor.addAnnotation(annotation)
        } else {
          const annotation: RectAnnotation = {
            id: uid('ann'),
            type: 'rect',
            ...box,
            color: editor.inkColor,
            fill: false,
          }
          editor.addAnnotation(annotation)
        }
      }
    }
  }

  return (
    <section className="stage" ref={stageRef}>
      {editor.pendingImage && editor.tool === 'image' ? (
        <p className="stage-hint">이미지를 넣을 위치를 페이지에서 클릭하세요.</p>
      ) : null}
      {editor.tool === 'eraser' ? (
        <p className="stage-hint">드래그해서 펜 선을 지우고, 텍스트·도형·이미지는 닿으면 통째로 삭제됩니다.</p>
      ) : null}
      {page && visual ? (
        <div
          ref={stackRef}
          className="page-stack"
          style={{
            maxWidth: `${Math.round(visual.width * editor.zoom)}px`,
            aspectRatio: `${visual.width} / ${visual.height}`,
          }}
        >
          <canvas ref={canvasRef} className="page-canvas" />
          {viewport ? (
          <div
            ref={overlayRef}
            className="page-overlay"
            style={{ cursor: toolCursor(editor.tool) }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerEnter={(event) => {
              if (editor.tool !== 'eraser') return
              const point = toPdf(event)
              if (point) updateEraserCursor(point)
            }}
            onPointerLeave={() => {
              if (!erasingRef.current) setEraserCursor(null)
            }}
            onDoubleClick={(event) => {
              const point = toPdf(event)
              if (!point) return
              const hit = [...page.annotations]
                .reverse()
                .find(
                  (annotation) =>
                    annotation.type === 'text' && hitTest(annotation, point),
                )
              if (hit) setEditingId(hit.id)
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${viewport.width} ${viewport.height}`}
              preserveAspectRatio="none"
            >
              {(page.annotations as Annotation[]).map((annotation) => (
                <AnnotationShape
                  key={annotation.id}
                  annotation={annotation}
                  viewport={viewport}
                  selected={annotation.id === editor.selectedId}
                />
              ))}
              {draft ? <DraftShape draft={draft} viewport={viewport} editor={editor} /> : null}
              {eraserCursor && editor.tool === 'eraser' ? (
                <circle
                  className="eraser-cursor"
                  cx={eraserCursor.x}
                  cy={eraserCursor.y}
                  r={eraserCursor.radius}
                  pointerEvents="none"
                />
              ) : null}
            </svg>
            {editingId
              ? page.annotations
                  .filter((annotation): annotation is TextAnnotation => annotation.type === 'text' && annotation.id === editingId)
                  .map((annotation) => (
                    <TextEditor
                      key={annotation.id}
                      annotation={annotation}
                      viewport={viewport}
                      onChange={(text) =>
                        editor.updateAnnotation(annotation.id, (item) =>
                          item.type === 'text' ? { ...item, text } : item,
                        )
                      }
                      onClose={() => setEditingId(null)}
                    />
                  ))
              : null}
          </div>
          ) : null}
        </div>
      ) : (
        <p className="stage-empty">페이지를 불러오는 중…</p>
      )}
    </section>
  )
}

function toView(viewport: PageViewport, x: number, y: number): Point {
  const [vx, vy] = viewport.convertToViewportPoint(x, y)
  return { x: vx, y: vy }
}

function boxFrame(viewport: PageViewport, annotation: BoxAnnotation) {
  const topLeft = toView(viewport, annotation.x, annotation.y + annotation.height)
  const topRight = toView(viewport, annotation.x + annotation.width, annotation.y + annotation.height)
  const bottomLeft = toView(viewport, annotation.x, annotation.y)
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y),
    height: Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y),
    angle:
      (Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x) * 180) / Math.PI,
  }
}

function AnnotationShape({
  annotation,
  viewport,
  selected,
}: {
  annotation: Annotation
  viewport: PageViewport
  selected: boolean
}) {
  if (annotation.type === 'pen') {
    const d = annotation.points
      .map((point, index) => {
        const view = toView(viewport, point.x, point.y)
        return `${index === 0 ? 'M' : 'L'} ${view.x} ${view.y}`
      })
      .join(' ')
    return (
      <path
        d={d}
        fill="none"
        stroke={annotation.color}
        strokeWidth={annotation.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={selected ? 'ann selected' : 'ann'}
      />
    )
  }

  const frame = boxFrame(viewport, annotation)
  if (annotation.type === 'highlight') {
    return (
      <g transform={`translate(${frame.x} ${frame.y}) rotate(${frame.angle})`}>
        <rect
          width={frame.width}
          height={frame.height}
          fill={annotation.color}
          opacity={0.38}
          className={selected ? 'ann selected' : 'ann'}
        />
      </g>
    )
  }
  if (annotation.type === 'rect') {
    return (
      <g transform={`translate(${frame.x} ${frame.y}) rotate(${frame.angle})`}>
        <rect
          width={frame.width}
          height={frame.height}
          fill="none"
          stroke={annotation.color}
          strokeWidth={1.6}
          className={selected ? 'ann selected' : 'ann'}
        />
      </g>
    )
  }
  if (annotation.type === 'image') {
    return (
      <g transform={`translate(${frame.x} ${frame.y}) rotate(${frame.angle})`}>
        <image
          href={annotation.dataUrl}
          width={frame.width}
          height={frame.height}
          preserveAspectRatio="none"
        />
        {selected ? (
          <rect
            width={frame.width}
            height={frame.height}
            fill="none"
            stroke="#5b8def"
            strokeWidth={1.5}
          />
        ) : null}
      </g>
    )
  }

  return (
    <g transform={`translate(${frame.x} ${frame.y}) rotate(${frame.angle})`}>
      <text
        x={4}
        y={annotation.fontSize}
        fill={annotation.color}
        fontSize={annotation.fontSize}
        fontFamily='"Malgun Gothic", "Apple SD Gothic Neo", sans-serif'
      >
        {annotation.text.split('\n').map((line, index) => (
          <tspan key={index} x={4} dy={index === 0 ? 0 : annotation.fontSize * 1.35}>
            {line}
          </tspan>
        ))}
      </text>
      {selected ? (
        <rect
          width={Math.max(frame.width, 24)}
          height={Math.max(frame.height, annotation.fontSize * 1.4)}
          fill="none"
          stroke="#5b8def"
          strokeDasharray="4 3"
        />
      ) : null}
    </g>
  )
}

function DraftShape({
  draft,
  viewport,
  editor,
}: {
  draft: Exclude<Draft, null>
  viewport: PageViewport
  editor: Editor
}) {
  if (draft.type === 'pen') {
    const d = draft.points
      .map((point, index) => {
        const view = toView(viewport, point.x, point.y)
        return `${index === 0 ? 'M' : 'L'} ${view.x} ${view.y}`
      })
      .join(' ')
    return (
      <path
        d={d}
        fill="none"
        stroke={editor.inkColor}
        strokeWidth={editor.strokeWidth}
        strokeLinecap="round"
      />
    )
  }

  const box = normalizeBox(
    draft.start.x,
    draft.start.y,
    draft.current.x - draft.start.x,
    draft.current.y - draft.start.y,
  )
  const fake: BoxAnnotation =
    draft.type === 'highlight'
      ? { id: 'draft', type: 'highlight', ...box, color: editor.highlightColor }
      : { id: 'draft', type: 'rect', ...box, color: editor.inkColor, fill: false }
  return <AnnotationShape annotation={fake} viewport={viewport} selected={false} />
}

function TextEditor({
  annotation,
  viewport,
  onChange,
  onClose,
}: {
  annotation: TextAnnotation
  viewport: PageViewport
  onChange: (text: string) => void
  onClose: () => void
}) {
  const frame = boxFrame(viewport, annotation)
  return (
    <textarea
      className="inline-text"
      style={{
        left: frame.x,
        top: frame.y,
        width: Math.max(120, frame.width),
        height: Math.max(32, frame.height),
        transform: `rotate(${frame.angle}deg)`,
        fontSize: annotation.fontSize,
        color: annotation.color,
      }}
      autoFocus
      value={annotation.text}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onClose}
      onPointerDown={(event) => event.stopPropagation()}
    />
  )
}
