import { PDFDocument } from 'pdf-lib'
import { uid } from '../lib'
import { loadPdfDocument } from './engine'
import type { PageState, PdfSource } from '../types'

const A4_PORTRAIT: [number, number] = [595.28, 841.89]
const A4_LANDSCAPE: [number, number] = [841.89, 595.28]

export async function createBlankSource(
  count: number,
  landscape: boolean,
  name = '새 문서.pdf',
): Promise<{ source: PdfSource; pages: PageState[] }> {
  const doc = await PDFDocument.create()
  const size = landscape ? A4_LANDSCAPE : A4_PORTRAIT
  for (let i = 0; i < count; i += 1) {
    doc.addPage(size)
  }

  const bytes = await doc.save()
  const source: PdfSource = {
    id: uid('src'),
    name,
    bytes,
  }
  await loadPdfDocument(source.id, source.bytes)

  const pages: PageState[] = Array.from({ length: count }, (_, index) => ({
    id: uid('page'),
    sourceId: source.id,
    sourceIndex: index,
    width: size[0],
    height: size[1],
    baseRotation: 0,
    extraRotation: 0,
    annotations: [],
  }))

  return { source, pages }
}
