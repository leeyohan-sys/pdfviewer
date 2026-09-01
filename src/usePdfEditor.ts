import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBlankSource } from './pdf/createBlank'
import {
  destroyPdfDocument,
  isPdfBytes,
  loadPdfDocument,
  visualPageSize,
} from './pdf/engine'
import { exportEditedPdf } from './pdf/exportPdf'
import { clonePages, uid } from './lib'
import type {
  Annotation,
  EditorSnapshot,
  Orientation,
  PageState,
  PdfSource,
  Tool,
} from './types'

const HISTORY_LIMIT = 50

function snapshotOf(pages: PageState[], currentPageId: string): EditorSnapshot {
  return {
    pages: clonePages(pages),
    currentPageId,
  }
}

export function usePdfEditor() {
  const [sources, setSources] = useState<PdfSource[]>([])
  const [pages, setPages] = useState<PageState[]>([])
  const [currentPageId, setCurrentPageId] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [zoom, setZoom] = useState(1)
  const [inkColor, setInkColor] = useState('#111827')
  const [highlightColor, setHighlightColor] = useState('#facc15')
  const [fontSize, setFontSize] = useState(16)
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [eraserSize, setEraserSize] = useState(18)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [fileName, setFileName] = useState('')
  const [pendingImage, setPendingImage] = useState<string | null>(null)

  const undoStack = useRef<EditorSnapshot[]>([])
  const redoStack = useRef<EditorSnapshot[]>([])
  const skipHistory = useRef(false)
  const sourcesRef = useRef<PdfSource[]>([])
  const openTicket = useRef(0)
  const [, setHistoryTick] = useState(0)
  sourcesRef.current = sources

  const currentPage = useMemo(
    () => pages.find((page) => page.id === currentPageId) ?? null,
    [pages, currentPageId],
  )

  const pushHistory = useCallback((nextPages: PageState[], pageId: string) => {
    undoStack.current = [
      ...undoStack.current,
      snapshotOf(nextPages, pageId),
    ].slice(-HISTORY_LIMIT)
    redoStack.current = []
    setHistoryTick((value) => value + 1)
  }, [])

  const commit = useCallback(
    (updater: (current: PageState[]) => PageState[], pageId = currentPageId) => {
      setPages((current) => {
        if (!skipHistory.current) pushHistory(current, currentPageId)
        skipHistory.current = false
        return updater(current)
      })
      if (pageId !== currentPageId) setCurrentPageId(pageId)
    },
    [currentPageId, pushHistory],
  )

  const adoptDocument = useCallback(
    (source: PdfSource, nextPages: PageState[], name: string) => {
      const previousIds = sourcesRef.current
        .map((item) => item.id)
        .filter((id) => id !== source.id)
      undoStack.current = []
      redoStack.current = []
      setSources([source])
      setPages(nextPages)
      setCurrentPageId(nextPages[0]?.id ?? '')
      setSelectedId(null)
      setTool('select')
      setZoom(1)
      setFileName(name)
      setPendingImage(null)
      window.setTimeout(() => {
        for (const id of previousIds) void destroyPdfDocument(id)
      }, 80)
    },
    [],
  )

  const openBytes = useCallback(
    async (bytes: Uint8Array, name: string) => {
      const ticket = (openTicket.current += 1)
      setBusy(true)
      setStatus('문서를 여는 중…')
      try {
        if (!isPdfBytes(bytes)) {
          setStatus('PDF 파일이 아니거나 손상된 파일입니다.')
          return
        }
        const source: PdfSource = {
          id: uid('src'),
          name,
          bytes,
        }
        const pdf = await loadPdfDocument(source.id, source.bytes)
        if (ticket !== openTicket.current) {
          await destroyPdfDocument(source.id)
          return
        }
        const nextPages: PageState[] = []
        for (let index = 0; index < pdf.numPages; index += 1) {
          const pdfPage = await pdf.getPage(index + 1)
          const viewport = pdfPage.getViewport({ scale: 1, rotation: 0 })
          nextPages.push({
            id: uid('page'),
            sourceId: source.id,
            sourceIndex: index,
            width: viewport.width,
            height: viewport.height,
            baseRotation: pdfPage.rotate,
            extraRotation: 0,
            annotations: [],
          })
        }
        if (ticket !== openTicket.current) {
          await destroyPdfDocument(source.id)
          return
        }
        adoptDocument(source, nextPages, name)
        setStatus('')
      } catch (error) {
        console.error(error)
        const detail = error instanceof Error && error.message ? ` ${error.message}` : ''
        setStatus(`PDF를 열지 못했습니다.${detail}`)
      } finally {
        if (ticket === openTicket.current) setBusy(false)
      }
    },
    [adoptDocument],
  )

  const openFile = useCallback(
    async (file: File) => {
      let bytes: Uint8Array
      try {
        bytes = new Uint8Array(await file.arrayBuffer())
      } catch {
        bytes = await new Promise<Uint8Array>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            resolve(new Uint8Array(reader.result as ArrayBuffer))
          }
          reader.onerror = () => {
            reject(reader.error ?? new Error('파일을 읽지 못했습니다.'))
          }
          reader.readAsArrayBuffer(file)
        })
      }
      await openBytes(bytes, file.name || '문서.pdf')
    },
    [openBytes],
  )

  const newDocument = useCallback(
    async (count = 1, landscape = false) => {
      const ticket = (openTicket.current += 1)
      setBusy(true)
      setStatus('새 문서를 만드는 중…')
      try {
        const { source, pages: nextPages } = await createBlankSource(
          count,
          landscape,
        )
        if (ticket !== openTicket.current) {
          await destroyPdfDocument(source.id)
          return
        }
        adoptDocument(source, nextPages, source.name)
        setStatus('')
      } catch (error) {
        console.error(error)
        setStatus('새 문서를 만들지 못했습니다.')
      } finally {
        if (ticket === openTicket.current) setBusy(false)
      }
    },
    [adoptDocument],
  )

  const addBlankPage = useCallback(
    async (landscape: boolean) => {
      setBusy(true)
      try {
        const insertAt = currentPage
          ? pages.findIndex((page) => page.id === currentPage.id) + 1
          : pages.length
        const { source, pages: created } = await createBlankSource(
          1,
          landscape,
          '빈 페이지.pdf',
        )
        commit((current) => {
          const next = [...current]
          next.splice(insertAt, 0, created[0])
          return next
        }, created[0].id)
        setSources((current) => [...current, source])
      } finally {
        setBusy(false)
      }
    },
    [commit, currentPage, pages],
  )

  const updatePage = useCallback(
    (pageId: string, updater: (page: PageState) => PageState) => {
      commit((current) =>
        current.map((page) => (page.id === pageId ? updater(page) : page)),
      )
    },
    [commit],
  )

  const rotatePage = useCallback((pageId: string, delta: number) => {
    commit((current) =>
      current.map((page) =>
        page.id === pageId
          ? {
              ...page,
              extraRotation: (page.extraRotation + delta + 360) % 360,
            }
          : page,
      ),
    )
  }, [commit])

  const setPageOrientation = useCallback(
    (pageId: string, orientation: Orientation) => {
      const page = pages.find((item) => item.id === pageId)
      if (!page) return
      const visual = visualPageSize(
        page.width,
        page.height,
        page.baseRotation,
        page.extraRotation,
      )
      const currentlyLandscape = visual.width > visual.height
      const wantLandscape = orientation === 'landscape'
      if (currentlyLandscape === wantLandscape) return
      rotatePage(pageId, 90)
    },
    [pages, rotatePage],
  )

  const deletePage = useCallback(
    (pageId: string) => {
      if (pages.length <= 1) {
        setStatus('마지막 페이지는 삭제할 수 없습니다.')
        return
      }
      const index = pages.findIndex((page) => page.id === pageId)
      commit((current) => current.filter((page) => page.id !== pageId))
      const remaining = pages.filter((page) => page.id !== pageId)
      const next = remaining[Math.max(0, index - 1)] ?? remaining[0]
      setCurrentPageId(next.id)
      setSelectedId(null)
    },
    [commit, pages],
  )

  const duplicatePage = useCallback(
    (pageId: string) => {
      const index = pages.findIndex((page) => page.id === pageId)
      if (index < 0) return
      const sourcePage = pages[index]
      const copy: PageState = {
        ...clonePages(sourcePage),
        id: uid('page'),
        annotations: sourcePage.annotations.map((annotation) => ({
          ...clonePages(annotation),
          id: uid('ann'),
        })),
      }
      commit((current) => {
        const next = [...current]
        next.splice(index + 1, 0, copy)
        return next
      }, copy.id)
    },
    [commit, pages],
  )

  const movePage = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return
      commit((current) => {
        const from = current.findIndex((page) => page.id === fromId)
        const to = current.findIndex((page) => page.id === toId)
        if (from < 0 || to < 0) return current
        const next = [...current]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      })
    },
    [commit],
  )

  const addAnnotation = useCallback(
    (annotation: Annotation) => {
      if (!currentPage) return
      updatePage(currentPage.id, (page) => ({
        ...page,
        annotations: [...page.annotations, annotation],
      }))
      setSelectedId(annotation.id)
    },
    [currentPage, updatePage],
  )

  const updateAnnotation = useCallback(
    (annotationId: string, updater: (annotation: Annotation) => Annotation) => {
      if (!currentPage) return
      updatePage(currentPage.id, (page) => ({
        ...page,
        annotations: page.annotations.map((annotation) =>
          annotation.id === annotationId ? updater(annotation) : annotation,
        ),
      }))
    },
    [currentPage, updatePage],
  )

  const updateAnnotationLive = useCallback(
    (annotationId: string, updater: (annotation: Annotation) => Annotation) => {
      skipHistory.current = true
      setPages((current) =>
        current.map((page) =>
          page.id === currentPageId
            ? {
                ...page,
                annotations: page.annotations.map((annotation) =>
                  annotation.id === annotationId ? updater(annotation) : annotation,
                ),
              }
            : page,
        ),
      )
    },
    [currentPageId],
  )

  const replaceAnnotationsLive = useCallback(
    (pageId: string, annotations: Annotation[]) => {
      setPages((current) =>
        current.map((page) =>
          page.id === pageId ? { ...page, annotations } : page,
        ),
      )
    },
    [],
  )

  const beginLiveEdit = useCallback(() => {
    pushHistory(pages, currentPageId)
  }, [currentPageId, pages, pushHistory])

  const deleteSelected = useCallback(() => {
    if (!currentPage || !selectedId) return
    updatePage(currentPage.id, (page) => ({
      ...page,
      annotations: page.annotations.filter((annotation) => annotation.id !== selectedId),
    }))
    setSelectedId(null)
  }, [currentPage, selectedId, updatePage])

  const undo = useCallback(() => {
    const previous = undoStack.current.pop()
    if (!previous) return
    redoStack.current.push(snapshotOf(pages, currentPageId))
    setPages(previous.pages)
    setCurrentPageId(previous.currentPageId)
    setSelectedId(null)
    setHistoryTick((value) => value + 1)
  }, [currentPageId, pages])

  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(snapshotOf(pages, currentPageId))
    setPages(next.pages)
    setCurrentPageId(next.currentPageId)
    setSelectedId(null)
    setHistoryTick((value) => value + 1)
  }, [currentPageId, pages])

  const save = useCallback(async () => {
    if (pages.length === 0) return
    setBusy(true)
    setStatus('PDF를 저장하는 중…')
    try {
      const bytes = await exportEditedPdf(sources, pages)
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const base = fileName.replace(/\.pdf$/i, '') || 'edited'
      const downloadName = `${base}-편집.pdf`
      let shared = false
      try {
        const file = new File([blob], downloadName, { type: 'application/pdf' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: downloadName })
          shared = true
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          setStatus('')
          return
        }
      }
      if (!shared) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = downloadName
        link.click()
        URL.revokeObjectURL(url)
      }
      setStatus(shared ? '공유했습니다.' : '저장했습니다.')
    } catch (error) {
      console.error(error)
      setStatus('저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }, [fileName, pages, sources])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      } else if (meta && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        const target = event.target as HTMLElement | null
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return
        }
        deleteSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteSelected, redo, save, undo])

  const selectedAnnotation = currentPage?.annotations.find(
    (annotation) => annotation.id === selectedId,
  ) ?? null

  return {
    sources,
    pages,
    currentPage,
    currentPageId,
    setCurrentPageId,
    selectedId,
    setSelectedId,
    selectedAnnotation,
    tool,
    setTool,
    zoom,
    setZoom,
    inkColor,
    setInkColor,
    highlightColor,
    setHighlightColor,
    fontSize,
    setFontSize,
    strokeWidth,
    setStrokeWidth,
    eraserSize,
    setEraserSize,
    busy,
    status,
    fileName,
    pendingImage,
    setPendingImage,
    openFile,
    newDocument,
    addBlankPage,
    rotatePage,
    setPageOrientation,
    deletePage,
    duplicatePage,
    movePage,
    addAnnotation,
    updateAnnotation,
    updateAnnotationLive,
    replaceAnnotationsLive,
    beginLiveEdit,
    deleteSelected,
    undo,
    redo,
    save,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  }
}
