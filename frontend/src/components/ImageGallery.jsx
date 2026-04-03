import './ImageGallery.css'

export default function ImageGallery({ images, onSelect }) {
  if (images.length === 0) {
    return <p className="gallery-empty">폴더를 선택하면 이미지가 표시됩니다.</p>
  }

  return (
    <div className="gallery-grid">
      {images.map((img) => (
        <div key={img.id} className="gallery-item" onClick={() => onSelect(img)}>
          <img
            src={`/api/images/${img.id}/thumbnail?size=200`}
            alt={img.filename}
            className="gallery-thumb"
            loading="lazy"
          />
          <p className="gallery-filename">{img.filename}</p>
        </div>
      ))}
    </div>
  )
}
