import {
  IconCopy,
  IconPage,
  IconRotateLeft,
  IconRotateRight,
  IconTrash,
} from '../icons'
import { HIGHLIGHT_COLORS, INK_COLORS } from '../lib'
import type { usePdfEditor } from '../usePdfEditor'

type Editor = ReturnType<typeof usePdfEditor>

type PropertiesPanelProps = {
  editor: Editor
  orientation: 'portrait' | 'landscape' | null
  onClose: () => void
}

export function PropertiesPanel({ editor, orientation, onClose }: PropertiesPanelProps) {
  const page = editor.currentPage
  const selected = editor.selectedAnnotation

  return (
    <aside className="props">
      <div className="props-sheet-head">
        <h2>페이지 설정</h2>
        <button type="button" className="props-close" onClick={onClose}>
          닫기
        </button>
      </div>
      {page ? (
        <>
          <p className="props-label">방향</p>
          <div className="orient-toggle large">
            <button
              type="button"
              className={orientation === 'portrait' ? 'on' : ''}
              onClick={() => editor.setPageOrientation(page.id, 'portrait')}
            >
              세로
            </button>
            <button
              type="button"
              className={orientation === 'landscape' ? 'on' : ''}
              onClick={() => editor.setPageOrientation(page.id, 'landscape')}
            >
              가로
            </button>
          </div>
          <div className="prop-actions">
            <button type="button" onClick={() => editor.rotatePage(page.id, -90)}>
              <IconRotateLeft />
              왼쪽 90°
            </button>
            <button type="button" onClick={() => editor.rotatePage(page.id, 90)}>
              <IconRotateRight />
              오른쪽 90°
            </button>
            <button type="button" onClick={() => editor.duplicatePage(page.id)}>
              <IconCopy />
              복제
            </button>
            <button type="button" onClick={() => editor.deletePage(page.id)}>
              <IconTrash />
              삭제
            </button>
            <button
              type="button"
              onClick={() => void editor.addBlankPage(orientation === 'landscape')}
            >
              <IconPage />
              빈 페이지 추가
            </button>
          </div>
        </>
      ) : (
        <p className="muted">열린 문서가 없습니다.</p>
      )}

      <h2>도구 옵션</h2>
      <p className="props-label">펜 색</p>
      <div className="swatches">
        {INK_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`swatch ${editor.inkColor === color ? 'on' : ''}`}
            style={{ background: color }}
            onClick={() => editor.setInkColor(color)}
            aria-label={color}
          />
        ))}
      </div>
      <p className="props-label">형광펜 색</p>
      <div className="swatches">
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`swatch ${editor.highlightColor === color ? 'on' : ''}`}
            style={{ background: color }}
            onClick={() => editor.setHighlightColor(color)}
            aria-label={color}
          />
        ))}
      </div>
      <label className="slider-label">
        글자 크기 {editor.fontSize}pt
        <input
          type="range"
          min={10}
          max={48}
          value={editor.fontSize}
          onChange={(event) => editor.setFontSize(Number(event.target.value))}
        />
      </label>
      <label className="slider-label">
        선 굵기 {editor.strokeWidth}pt
        <input
          type="range"
          min={1}
          max={10}
          value={editor.strokeWidth}
          onChange={(event) => editor.setStrokeWidth(Number(event.target.value))}
        />
      </label>
      <label className="slider-label">
        지우개 크기 {editor.eraserSize}pt
        <input
          type="range"
          min={6}
          max={48}
          value={editor.eraserSize}
          onChange={(event) => editor.setEraserSize(Number(event.target.value))}
        />
      </label>

      {selected?.type === 'text' ? (
        <>
          <h2>선택한 텍스트</h2>
          <textarea
            className="text-edit"
            value={selected.text}
            onChange={(event) =>
              editor.updateAnnotation(selected.id, (annotation) =>
                annotation.type === 'text'
                  ? { ...annotation, text: event.target.value }
                  : annotation,
              )
            }
          />
        </>
      ) : null}

      {selected ? (
        <button
          type="button"
          className="btn danger"
          onClick={editor.deleteSelected}
        >
          선택 항목 삭제
        </button>
      ) : null}
    </aside>
  )
}
