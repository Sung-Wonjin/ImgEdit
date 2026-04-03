import { useEffect, useRef, useState } from 'react'
import './ImageEditor.css'

const DEFAULT_ADJUST = { brightness: 1.0, contrast: 1.0 }

export default function ImageEditor({ image, onClose }) {
  const canvasRef = useRef(null)
  const [originalImg, setOriginalImg] = useState(null)
  const [adjust, setAdjust] = useState(DEFAULT_ADJUST)
  const [rotation, setRotation] = useState(0)
  const [cropMode, setCropMode] = useState(false)
  const [cropRect, setCropRect] = useState(null)
  const [dragStart, setDragStart] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // 이미지 로드
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = `/api/images/${image.id}`
    img.onload = () => {
      setOriginalImg(img)
      setCropRect(null)
      setRotation(0)
      setAdjust(DEFAULT_ADJUST)
    }
  }, [image.id])

  // Canvas 렌더링
  useEffect(() => {
    if (!originalImg || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const rad = (rotation * Math.PI) / 180
    const sin = Math.abs(Math.sin(rad))
    const cos = Math.abs(Math.cos(rad))
    const w = originalImg.width * cos + originalImg.height * sin
    const h = originalImg.width * sin + originalImg.height * cos

    canvas.width = w
    canvas.height = h

    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.rotate(rad)
    ctx.filter = `brightness(${adjust.brightness}) contrast(${adjust.contrast})`
    ctx.drawImage(originalImg, -originalImg.width / 2, -originalImg.height / 2)
    ctx.restore()

    // Crop 영역 표시
    if (cropMode && cropRect) {
      ctx.save()
      ctx.strokeStyle = '#e94560'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h)
      ctx.restore()
    }
  }, [originalImg, rotation, adjust, cropMode, cropRect])

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handleMouseDown = (e) => {
    if (!cropMode) return
    setDragStart(getCanvasPos(e))
    setCropRect(null)
  }

  const handleMouseMove = (e) => {
    if (!cropMode || !dragStart) return
    const pos = getCanvasPos(e)
    setCropRect({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x),
      h: Math.abs(pos.y - dragStart.y),
    })
  }

  const handleMouseUp = () => {
    setDragStart(null)
  }

  const applyCrop = async () => {
    if (!cropRect || cropRect.w < 5 || cropRect.h < 5) return
    const res = await fetch('/api/editor/crop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_path: image.path,
        x: Math.round(cropRect.x),
        y: Math.round(cropRect.y),
        width: Math.round(cropRect.w),
        height: Math.round(cropRect.h),
      }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      setOriginalImg(img)
      setCropRect(null)
      setCropMode(false)
    }
    img.src = url
  }

  const handleSave = async (overwrite) => {
    const canvas = canvasRef.current
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    const base64 = dataUrl.split(',')[1]
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/editor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_path: image.path,
          image_data: base64,
          overwrite,
          output_path: '',
        }),
      })
      const data = await res.json()
      setSaveMsg(`저장 완료: ${data.saved_path}`)
    } catch {
      setSaveMsg('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="editor-wrapper">
      <div className="editor-toolbar">
        <button onClick={onClose} className="btn-back">← 갤러리로</button>
        <span className="editor-filename">{image.filename}</span>
      </div>

      <div className="editor-body">
        <div className="canvas-area">
          <canvas
            ref={canvasRef}
            className={`editor-canvas ${cropMode ? 'crop-cursor' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>

        <aside className="editor-controls">
          <section className="control-section">
            <h3>회전</h3>
            <div className="btn-row">
              <button onClick={() => setRotation((r) => r - 90)} className="btn">-90°</button>
              <button onClick={() => setRotation((r) => r + 90)} className="btn">+90°</button>
            </div>
          </section>

          <section className="control-section">
            <h3>밝기 ({Math.round(adjust.brightness * 100)}%)</h3>
            <input
              type="range" min="0.2" max="2" step="0.05"
              value={adjust.brightness}
              onChange={(e) => setAdjust((a) => ({ ...a, brightness: parseFloat(e.target.value) }))}
            />
          </section>

          <section className="control-section">
            <h3>대비 ({Math.round(adjust.contrast * 100)}%)</h3>
            <input
              type="range" min="0.2" max="2" step="0.05"
              value={adjust.contrast}
              onChange={(e) => setAdjust((a) => ({ ...a, contrast: parseFloat(e.target.value) }))}
            />
          </section>

          <section className="control-section">
            <h3>자르기</h3>
            <button
              onClick={() => { setCropMode((v) => !v); setCropRect(null) }}
              className={`btn ${cropMode ? 'btn-active' : ''}`}
            >
              {cropMode ? '자르기 취소' : '자르기 모드'}
            </button>
            {cropMode && cropRect && (
              <button onClick={applyCrop} className="btn btn-apply">적용</button>
            )}
          </section>

          <section className="control-section">
            <h3>초기화</h3>
            <button
              onClick={() => { setRotation(0); setAdjust(DEFAULT_ADJUST); setCropRect(null); setCropMode(false) }}
              className="btn"
            >
              초기화
            </button>
          </section>

          <section className="control-section save-section">
            <button onClick={() => handleSave(false)} disabled={saving} className="btn btn-save">
              다른 이름으로 저장
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="btn btn-save btn-overwrite">
              원본 덮어쓰기
            </button>
            {saveMsg && <p className="save-msg">{saveMsg}</p>}
          </section>
        </aside>
      </div>
    </div>
  )
}
