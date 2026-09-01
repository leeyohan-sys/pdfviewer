import { useEffect, useRef, useState } from 'react'
import { INK_COLORS } from '../lib'
import type { Tool } from '../types'
import type { usePdfEditor } from '../usePdfEditor'
import {
  IconEraser,
  IconHighlight,
  IconImage,
  IconNew,
  IconOpen,
  IconPen,
  IconRect,
  IconRedo,
  IconSave,
  IconSelect,
  IconSettings,
  IconText,
  IconUndo,
  IconView,
  IconZoomIn,
  IconZoomOut,
} from '../icons'

type Editor = ReturnType<typeof usePdfEditor>

function applyInkColor(editor: Editor, color: string) {
  editor.setInkColor(color)
  const selected = editor.selectedAnnotation
  if (selected?.type === 'pen') {
    editor.updateAnnotation(selected.id, (annotation) =>
      annotation.type === 'pen' ? { ...annotation, color } : annotation,
    )
  }
}

const TOOLS: { id: Tool; label: string; icon: typeof IconSelect }[] = [
  { id: 'select', label: '선택', icon: IconSelect },
  { id: 'text', label: '텍스트', icon: IconText },
  { id: 'pen', label: '펜', icon: IconPen },
  { id: 'eraser', label: '지우개', icon: IconEraser },
  { id: 'highlight', label: '형광펜', icon: IconHighlight },
  { id: 'rect', label: '도형', icon: IconRect },
  { id: 'image', label: '이미지', icon: IconImage },
]

type ToolbarProps = {
  editor: Editor
  settingsOpen: boolean
  onToggleSettings: () => void
  onOpenViewer: () => void
}

export function Toolbar({
  editor,
  settingsOpen,
  onToggleSettings,
  onOpenViewer,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [colorOpen, setColorOpen] = useState(false)

  useEffect(() => {
    if (editor.tool !== 'pen') setColorOpen(false)
  }, [editor.tool])

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-mark">PDF</span>
        <div className="brand-text">
          <strong>편집기</strong>
          <span>{editor.fileName || '문서 없음'}</span>
        </div>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          className="tool-btn"
          title="열기"
          onClick={() => fileInputRef.current?.click()}
        >
          <IconOpen />
          <span>열기</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="visually-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void editor.openFile(file)
            event.target.value = ''
          }}
        />
        <button
          type="button"
          className="tool-btn"
          onClick={() => void editor.newDocument(1, false)}
        >
          <IconNew />
          <span>새 문서</span>
        </button>
        <button
          type="button"
          className="tool-btn"
          disabled={editor.pages.length === 0 || editor.busy}
          onClick={() => void editor.save()}
        >
          <IconSave />
          <span>저장</span>
        </button>
        <button
          type="button"
          className="tool-btn"
          disabled={editor.pages.length === 0}
          onClick={onOpenViewer}
          title="뷰어"
        >
          <IconView />
          <span>뷰어</span>
        </button>
      </div>

      <div className="toolbar-group tools">
        {TOOLS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={`tool-btn ${editor.tool === item.id ? 'active' : ''}`}
              onClick={() => {
                if (item.id === 'pen') {
                  if (editor.tool === 'pen') {
                    setColorOpen((value) => !value)
                  } else {
                    editor.setTool('pen')
                    setColorOpen(true)
                  }
                  return
                }
                setColorOpen(false)
                editor.setTool(item.id)
                if (item.id === 'image') imageInputRef.current?.click()
              }}
              title={item.label}
              aria-expanded={item.id === 'pen' ? colorOpen : undefined}
            >
              <span className="tool-icon-wrap">
                <Icon />
                {item.id === 'pen' ? (
                  <span
                    className="tool-color-dot"
                    style={{ background: editor.inkColor }}
                  />
                ) : null}
              </span>
              <span className="tool-label">{item.label}</span>
            </button>
          )
        })}
      </div>

      {colorOpen ? (
        <div className="toolbar-group color-bar" role="group" aria-label="펜 색">
          {INK_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`swatch ${editor.inkColor === color ? 'on' : ''}`}
              style={{ background: color }}
              aria-label={`펜 색 ${color}`}
              title={`펜 색 ${color}`}
              onClick={() => {
                applyInkColor(editor, color)
                setColorOpen(false)
              }}
            />
          ))}
          <label className="swatch color-picker" title="다른 색 고르기">
            <span className="visually-hidden">다른 색 고르기</span>
            <input
              type="color"
              value={editor.inkColor}
              onChange={(event) => {
                applyInkColor(editor, event.target.value)
                setColorOpen(false)
              }}
            />
          </label>
        </div>
      ) : null}

      <div className="toolbar-group">
        <button
          type="button"
          className="icon-btn"
          disabled={!editor.canUndo}
          onClick={editor.undo}
          title="실행 취소"
        >
          <IconUndo />
        </button>
        <button
          type="button"
          className="icon-btn"
          disabled={!editor.canRedo}
          onClick={editor.redo}
          title="다시 실행"
        >
          <IconRedo />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => editor.setZoom((value) => Math.max(0.4, Number((value - 0.1).toFixed(1))))}
          title="축소"
        >
          <IconZoomOut />
        </button>
        <span className="zoom-label">{Math.round(editor.zoom * 100)}%</span>
        <button
          type="button"
          className="icon-btn"
          onClick={() => editor.setZoom((value) => Math.min(4, Number((value + 0.1).toFixed(1))))}
          title="확대"
        >
          <IconZoomIn />
        </button>
        <button
          type="button"
          className={`icon-btn settings-toggle ${settingsOpen ? 'active' : ''}`}
          disabled={editor.pages.length === 0}
          onClick={onToggleSettings}
          title="페이지·색 설정"
        >
          <IconSettings />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          className="visually-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => {
              editor.setPendingImage(String(reader.result))
              editor.setTool('image')
            }
            reader.readAsDataURL(file)
          }}
        />
      </div>
    </header>
  )
}
