import { API_URL } from '../config/apiConfig'

class PageService {
  async getAllPages() {
    try {
      const response = await fetch(`${API_URL}/pages`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        const err = new Error('Failed to fetch pages')
        err.status = response.status
        throw err
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching pages:', error)
      throw error
    }
  }

  async getPage(id) {
    try {
      const response = await fetch(`${API_URL}/pages/${id}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch page')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching page:', error)
      throw error
    }
  }

  async createPage(pageData) {
    try {
      const response = await fetch(`${API_URL}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(pageData)
      })

      if (!response.ok) {
        throw new Error('Failed to create page')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating page:', error)
      throw error
    }
  }

  async updatePage(id, pageData) {
    try {
      const response = await fetch(`${API_URL}/pages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(pageData)
      })

      if (!response.ok) {
        throw new Error('Failed to update page')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating page:', error)
      throw error
    }
  }

  async deletePage(id) {
    try {
      const response = await fetch(`${API_URL}/pages/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete page')
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting page:', error)
      throw error
    }
  }

  async addEditor(pageId, userId) {
    try {
      const response = await fetch(`${API_URL}/pages/${pageId}/editors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add editor')
      }

      return await response.json()
    } catch (error) {
      console.error('Error adding editor:', error)
      throw error
    }
  }

  async removeEditor(pageId, userId) {
    try {
      const response = await fetch(`${API_URL}/pages/${pageId}/editors/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove editor')
      }

      return await response.json()
    } catch (error) {
      console.error('Error removing editor:', error)
      throw error
    }
  }
}

export default new PageService()
