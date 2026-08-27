import { useRef } from 'react'
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
  IconText,
  IconUndo,
  IconZoomIn,
  IconZoomOut,
} from '../icons'

type Editor = ReturnType<typeof usePdfEditor>

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
}

export function Toolbar({ editor }: ToolbarProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)

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
        <label className="tool-btn" title="열기">
          <IconOpen />
          <span>열기</span>
          <input
            type="file"
            accept="application/pdf"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void editor.openFile(file)
              event.target.value = ''
            }}
          />
        </label>
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
                editor.setTool(item.id)
                if (item.id === 'image') imageInputRef.current?.click()
              }}
              title={item.label}
            >
              <Icon />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

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
          onClick={() => editor.setZoom((value) => Math.min(2.5, Number((value + 0.1).toFixed(1))))}
          title="확대"
        >
          <IconZoomIn />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg"
          hidden
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
