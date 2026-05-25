import { useState } from 'react'
import './ImageSelector.css'

function ImageSelector({ storedImages = [], onSelect, onClose, deleteImage }) {
  const [selectedImageId, setSelectedImageId] = useState(null)

  const handleSelect = () => {
    if (selectedImageId) {
      const selectedImage = storedImages.find((img) => img.id === selectedImageId)
      if (selectedImage) {
        onSelect(selectedImage.url)
        onClose()
      }
    }
  }

  const handleDelete = (id, e) => {
    e.stopPropagation()
    if (window.confirm('Excluir esta imagem do armazenamento?')) {
      deleteImage(id)
      if (selectedImageId === id) {
        setSelectedImageId(null)
      }
    }
  }

  return (
    <div className="image-selector-overlay" onClick={onClose}>
      <div className="image-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="image-selector-header">
          <h3>Selecionar imagem armazenada</h3>
          <button className="close-btn" onClick={onClose}>X</button>
        </div>

        <div className="image-selector-content">
          {storedImages.length === 0 ? (
            <div className="no-images">
              <p>Nenhuma imagem armazenada ainda. Envie uma imagem para comecar.</p>
            </div>
          ) : (
            <div className="image-grid">
              {storedImages.map((image) => (
                <div
                  key={image.id}
                  className={`image-item ${selectedImageId === image.id ? 'selected' : ''}`}
                  onClick={() => setSelectedImageId(image.id)}
                >
                  <img src={image.url || image.data} alt={image.name} />
                  <div className="image-info">
                    <span className="image-name">{image.name}</span>
                    <button
                      className="btn-delete-image"
                      onClick={(e) => handleDelete(image.id, e)}
                      title="Excluir imagem"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="image-selector-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSelect}
            disabled={!selectedImageId}
          >
            Selecionar imagem
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImageSelector
