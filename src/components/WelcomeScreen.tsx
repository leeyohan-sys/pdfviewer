type WelcomeScreenProps = {
  busy: boolean
  onOpenFile: (file: File) => void
  onNewDocument: (count: number, landscape: boolean) => void
}

export function WelcomeScreen({
  busy,
  onOpenFile,
  onNewDocument,
}: WelcomeScreenProps) {
  return (
    <div
      className="welcome"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file && file.type === 'application/pdf') onOpenFile(file)
      }}
    >
      <div className="welcome-card">
        <p className="eyebrow">브라우저 PDF 편집기</p>
        <h1>페이지마다 가로·세로를 바꾸고, 바로 편집하세요</h1>
        <p className="welcome-copy">
          PDF를 열거나 빈 문서를 만든 뒤 텍스트, 형광펜, 도형, 이미지를 올리고
          페이지 단위로 방향을 바꿀 수 있습니다.
        </p>
        <div className="welcome-actions">
          <label className="btn btn-primary">
            PDF 열기
            <input
              type="file"
              accept="application/pdf"
              hidden
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onOpenFile(file)
                event.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => onNewDocument(1, false)}
          >
            새 문서 (세로)
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => onNewDocument(1, true)}
          >
            새 문서 (가로)
          </button>
        </div>
        <p className="welcome-hint">이 영역으로 PDF를 끌어다 놓아도 됩니다.</p>
      </div>
    </div>
  )
}
