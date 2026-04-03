import { useState } from 'react'
import FolderPicker from './components/FolderPicker'
import ImageGallery from './components/ImageGallery'
import ImageEditor from './components/ImageEditor'
import './App.css'

export default function App() {
  const [images, setImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)

  const handleFolderLoad = (imageList) => {
    setImages(imageList)
    setSelectedImage(null)
  }

  const handleSelectImage = (image) => {
    setSelectedImage(image)
  }

  const handleCloseEditor = () => {
    setSelectedImage(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>ImgEdit</h1>
      </header>
      <main className="app-main">
        <FolderPicker onLoad={handleFolderLoad} />
        {selectedImage ? (
          <ImageEditor image={selectedImage} onClose={handleCloseEditor} />
        ) : (
          <ImageGallery images={images} onSelect={handleSelectImage} />
        )}
      </main>
    </div>
  )
}
