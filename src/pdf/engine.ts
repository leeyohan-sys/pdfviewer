import {
  getDocument,
  GlobalWorkerOptions,
  RenderingCancelledException,
} from 'pdfjs-dist'
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerSrc

const pdfCache = new Map<string, PDFDocumentProxy>()

export function copyBytes(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}

export async function loadPdfDocument(
  sourceId: string,
  bytes: Uint8Array,
): Promise<PDFDocumentProxy> {
  const existing = pdfCache.get(sourceId)
  if (existing) return existing

  const data = copyBytes(bytes)
  const pdf = await getDocument({
    data,
    useSystemFonts: true,
  }).promise
  pdfCache.set(sourceId, pdf)
  return pdf
}

export async function destroyPdfDocument(sourceId: string): Promise<void> {
  const pdf = pdfCache.get(sourceId)
  if (!pdf) return
  pdfCache.delete(sourceId)
  await pdf.loadingTask.destroy()
}

export async function destroyAllPdfDocuments(): Promise<void> {
  const ids = [...pdfCache.keys()]
  await Promise.all(ids.map((id) => destroyPdfDocument(id)))
}

export async function getPdfPage(
  sourceId: string,
  sourceIndex: number,
  bytes?: Uint8Array,
): Promise<PDFPageProxy> {
  let pdf = pdfCache.get(sourceId)
  if (!pdf && bytes) {
    pdf = await loadPdfDocument(sourceId, bytes)
  }
  if (!pdf) {
    throw new Error('PDF가 로드되지 않았습니다.')
  }
  return pdf.getPage(sourceIndex + 1)
}

export function totalRotation(pageRotate: number, extraRotation: number): number {
  return ((pageRotate + extraRotation) % 360 + 360) % 360
}

export function visualPageSize(
  width: number,
  height: number,
  baseRotation: number,
  extraRotation: number,
): { width: number; height: number } {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 595.28
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 841.89
  const rotation = totalRotation(baseRotation || 0, extraRotation || 0)
  if (rotation === 90 || rotation === 270) {
    return { width: safeHeight, height: safeWidth }
  }
  return { width: safeWidth, height: safeHeight }
}

export async function renderPage(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  extraRotation: number,
  scale: number,
  renderTaskRef?: { current: RenderTask | null },
): Promise<void> {
  const rotation = totalRotation(page.rotate, extraRotation)
  const viewport = page.getViewport({ scale, rotation })
  const outputScale = window.devicePixelRatio || 1

  canvas.width = Math.floor(viewport.width * outputScale)
  canvas.height = Math.floor(viewport.height * outputScale)
  canvas.style.width = '100%'
  canvas.style.height = '100%'

  if (renderTaskRef?.current) {
    try {
      renderTaskRef.current.cancel()
    } catch {
      // ignore
    }
    renderTaskRef.current = null
  }

  if (!canvas.isConnected) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const task = page.render({
    canvas,
    canvasContext: ctx,
    viewport,
    transform:
      outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
  })

  if (renderTaskRef) renderTaskRef.current = task

  try {
    await task.promise
  } catch (error) {
    if (error instanceof RenderingCancelledException) return
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'RenderingCancelledException'
    ) {
      return
    }
    console.error('PDF 페이지 렌더링에 실패했습니다.', error)
  } finally {
    if (renderTaskRef?.current === task) renderTaskRef.current = null
  }
}
