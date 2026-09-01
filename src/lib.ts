import type { Annotation, BoxAnnotation, Point, Tool } from './types'

export function uid(prefix: string): string {
  const cryptoObj = globalThis.crypto
  if (typeof cryptoObj?.randomUUID === 'function') {
    return `${prefix}_${cryptoObj.randomUUID()}`
  }
  if (typeof cryptoObj?.getRandomValues === 'function') {
    const bytes = cryptoObj.getRandomValues(new Uint8Array(16))
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${prefix}_${hex}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

export function clonePages<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

export function normalizeBox(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  const nextX = width < 0 ? x + width : x
  const nextY = height < 0 ? y + height : y
  return {
    x: nextX,
    y: nextY,
    width: Math.abs(width),
    height: Math.abs(height),
  }
}

export function isBoxAnnotation(annotation: Annotation): annotation is BoxAnnotation {
  return annotation.type !== 'pen'
}

export function hitTest(
  annotation: Annotation,
  point: Point,
): boolean {
  if (annotation.type === 'pen') {
    const threshold = Math.max(4, annotation.strokeWidth * 2)
    for (let i = 1; i < annotation.points.length; i += 1) {
      const a = annotation.points[i - 1]
      const b = annotation.points[i]
      if (distanceToSegment(point, a, b) <= threshold) return true
    }
    return false
  }

  return (
    point.x >= annotation.x &&
    point.x <= annotation.x + annotation.width &&
    point.y >= annotation.y &&
    point.y <= annotation.y + annotation.height
  )
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = dx * dx + dy * dy
  if (length === 0) return Math.hypot(point.x - a.x, point.y - a.y)
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / length
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}

function boxIntersectsCircle(annotation: BoxAnnotation, point: Point, radius: number): boolean {
  const nearestX = Math.max(annotation.x, Math.min(point.x, annotation.x + annotation.width))
  const nearestY = Math.max(annotation.y, Math.min(point.y, annotation.y + annotation.height))
  return Math.hypot(point.x - nearestX, point.y - nearestY) <= radius
}

function splitPenStroke(points: Point[], eraser: Point, radius: number): Point[][] {
  const segments: Point[][] = []
  let current: Point[] = []

  for (const point of points) {
    const erased = Math.hypot(point.x - eraser.x, point.y - eraser.y) <= radius
    const edgeErased =
      current.length > 0 &&
      !erased &&
      distanceToSegment(eraser, current[current.length - 1], point) <= radius

    if (erased || edgeErased) {
      if (current.length >= 2) segments.push(current)
      current = erased ? [] : [point]
    } else {
      current.push(point)
    }
  }

  if (current.length >= 2) segments.push(current)
  return segments
}

export function eraseAnnotations(
  annotations: Annotation[],
  point: Point,
  radius: number,
): Annotation[] {
  const next: Annotation[] = []
  for (const annotation of annotations) {
    if (annotation.type === 'pen') {
      const segments = splitPenStroke(
        annotation.points,
        point,
        radius + annotation.strokeWidth / 2,
      )
      segments.forEach((points, index) => {
        next.push({
          ...annotation,
          id: index === 0 ? annotation.id : uid('ann'),
          points,
        })
      })
    } else if (boxIntersectsCircle(annotation, point, radius)) {
      continue
    } else {
      next.push(annotation)
    }
  }
  return next
}

export function toolCursor(tool: Tool): string {
  if (tool === 'select') return 'default'
  if (tool === 'text') return 'text'
  if (tool === 'eraser') return 'none'
  return 'crosshair'
}

export const INK_COLORS = [
  '#111827',
  '#dc2626',
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#ea580c',
  '#ffffff',
] as const

export const HIGHLIGHT_COLORS = [
  '#facc15',
  '#4ade80',
  '#60a5fa',
  '#f472b6',
  '#fb923c',
] as const
