import { useState } from 'react'
import './FolderPicker.css'

export default function FolderPicker({ onLoad }) {
  const [folderPath, setFolderPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLoad = async () => {
    if (!folderPath.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/images?folder=${encodeURIComponent(folderPath.trim())}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || '불러오기 실패')
      }
      const data = await res.json()
      onLoad(data.images)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLoad()
  }

  return (
    <div className="folder-picker">
      <div className="folder-input-row">
        <input
          type="text"
          placeholder="폴더 경로 입력 (예: C:\Users\Photos)"
          value={folderPath}
          onChange={(e) => setFolderPath(e.target.value)}
          onKeyDown={handleKeyDown}
          className="folder-input"
        />
        <button onClick={handleLoad} disabled={loading} className="load-btn">
          {loading ? '불러오는 중...' : '불러오기'}
        </button>
      </div>
      {error && <p className="error-msg">{error}</p>}
    </div>
  )
}
