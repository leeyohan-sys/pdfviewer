import { PDFDocument, rgb, degrees } from 'pdf-lib'
import type { Annotation, PageState, PdfSource } from '../types'
import { totalRotation } from './engine'

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const n = Number.parseInt(normalized, 16)
  return rgb(
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255,
  )
}

async function rasterizeText(
  text: string,
  fontSize: number,
  color: string,
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const scale = 3
  const fontPx = fontSize * scale
  const font = `${fontPx}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`
  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) throw new Error('캔버스를 만들 수 없습니다.')
  measure.font = font

  const lines = text.split('\n')
  const lineHeight = fontPx * 1.35
  let maxWidth = 1
  for (const line of lines) {
    maxWidth = Math.max(maxWidth, measure.measureText(line).width)
  }

  const pad = 2 * scale
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(maxWidth + pad * 2))
  canvas.height = Math.max(1, Math.ceil(lines.length * lineHeight + pad * 2))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('캔버스를 만들 수 없습니다.')
  ctx.font = font
  ctx.fillStyle = color
  ctx.textBaseline = 'top'
  lines.forEach((line, index) => {
    ctx.fillText(line, pad, pad + index * lineHeight)
  })

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result)
      else reject(new Error('텍스트 이미지를 만들지 못했습니다.'))
    }, 'image/png')
  })

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: canvas.width / scale,
    height: canvas.height / scale,
  }
}

async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  const response = await fetch(dataUrl)
  return new Uint8Array(await response.arrayBuffer())
}

async function drawAnnotations(
  pdf: PDFDocument,
  pageIndex: number,
  annotations: Annotation[],
): Promise<void> {
  const page = pdf.getPage(pageIndex)

  for (const annotation of annotations) {
    if (annotation.type === 'highlight') {
      page.drawRectangle({
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
        color: hexToRgb(annotation.color),
        opacity: 0.38,
        borderWidth: 0,
      })
    } else if (annotation.type === 'rect') {
      page.drawRectangle({
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
        color: annotation.fill ? hexToRgb(annotation.color) : undefined,
        opacity: annotation.fill ? 0.18 : 1,
        borderColor: hexToRgb(annotation.color),
        borderWidth: 1.5,
      })
    } else if (annotation.type === 'pen' && annotation.points.length > 1) {
      const path = annotation.points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
        .join(' ')
      page.drawSvgPath(path, {
        borderColor: hexToRgb(annotation.color),
        borderWidth: annotation.strokeWidth,
        borderOpacity: 1,
      })
    } else if (annotation.type === 'text' && annotation.text.trim()) {
      const image = await rasterizeText(
        annotation.text,
        annotation.fontSize,
        annotation.color,
      )
      const embedded = await pdf.embedPng(image.bytes)
      page.drawImage(embedded, {
        x: annotation.x,
        y: annotation.y + annotation.height - image.height,
        width: image.width,
        height: image.height,
      })
    } else if (annotation.type === 'image') {
      const bytes = await dataUrlToBytes(annotation.dataUrl)
      const embedded = annotation.dataUrl.includes('image/jpeg')
        ? await pdf.embedJpg(bytes)
        : await pdf.embedPng(bytes)
      page.drawImage(embedded, {
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
      })
    }
  }
}

export async function exportEditedPdf(
  sources: PdfSource[],
  pages: PageState[],
): Promise<Uint8Array> {
  const loaded = new Map<string, PDFDocument>()
  for (const source of sources) {
    loaded.set(source.id, await PDFDocument.load(source.bytes))
  }

  const output = await PDFDocument.create()

  for (const page of pages) {
    const sourceDoc = loaded.get(page.sourceId)
    if (!sourceDoc) continue
    const [copied] = await output.copyPages(sourceDoc, [page.sourceIndex])
    const rotation = totalRotation(copied.getRotation().angle, page.extraRotation)
    copied.setRotation(degrees(rotation))
    output.addPage(copied)
    await drawAnnotations(output, output.getPageCount() - 1, page.annotations)
  }

  return output.save()
}
