export type Tool =
  | 'select'
  | 'text'
  | 'pen'
  | 'eraser'
  | 'highlight'
  | 'rect'
  | 'image'

export type Orientation = 'portrait' | 'landscape'

export type Point = {
  x: number
  y: number
}

export type TextAnnotation = {
  id: string
  type: 'text'
  x: number
  y: number
  width: number
  height: number
  text: string
  fontSize: number
  color: string
}

export type PenAnnotation = {
  id: string
  type: 'pen'
  points: Point[]
  color: string
  strokeWidth: number
}

export type HighlightAnnotation = {
  id: string
  type: 'highlight'
  x: number
  y: number
  width: number
  height: number
  color: string
}

export type RectAnnotation = {
  id: string
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  color: string
  fill: boolean
}

export type ImageAnnotation = {
  id: string
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  dataUrl: string
}

export type Annotation =
  | TextAnnotation
  | PenAnnotation
  | HighlightAnnotation
  | RectAnnotation
  | ImageAnnotation

export type BoxAnnotation = Exclude<Annotation, PenAnnotation>

export type PdfSource = {
  id: string
  name: string
  bytes: Uint8Array
}

export type PageState = {
  id: string
  sourceId: string
  sourceIndex: number
  width: number
  height: number
  baseRotation: number
  extraRotation: number
  annotations: Annotation[]
}

export type EditorSnapshot = {
  pages: PageState[]
  currentPageId: string
}
