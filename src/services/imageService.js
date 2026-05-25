import { API_BASE, API_URL } from '../config/apiConfig'

// Resolve image URL: Cloudinary returns absolute URLs, local dev returns relative paths
const resolveUrl = (url) => url.startsWith('http') ? url : `${API_BASE}${url}`

class ImageService {
  async uploadImage(file) {
    const formData = new FormData()
    formData.append('image', file)

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      return {
        id: data.id,
        name: data.name,
        url: resolveUrl(data.url),
        uploadedAt: data.uploadedAt
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  async getImages() {
    try {
      const response = await fetch(`${API_URL}/images`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch images')
      }

      const images = await response.json()
      return images.map(img => ({
        ...img,
        url: resolveUrl(img.url)
      }))
    } catch (error) {
      console.error('Error fetching images:', error)
      return []
    }
  }

  async deleteImage(filename) {
    try {
      const response = await fetch(`${API_URL}/images/${filename}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete image')
      }

      return true
    } catch (error) {
      console.error('Delete error:', error)
      throw error
    }
  }
}

export default new ImageService()
