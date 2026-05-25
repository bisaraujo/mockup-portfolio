import { API_URL } from '../config/apiConfig'

class MapService {
  async getAllMaps() {
    try {
      const response = await fetch(`${API_URL}/maps`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch maps')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching maps:', error)
      throw error
    }
  }

  async getMap(id) {
    try {
      const response = await fetch(`${API_URL}/maps/${id}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch map')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching map:', error)
      throw error
    }
  }

  async createMap(mapData) {
    try {
      const response = await fetch(`${API_URL}/maps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(mapData)
      })

      if (!response.ok) {
        throw new Error('Failed to create map')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating map:', error)
      throw error
    }
  }

  async updateMap(id, mapData) {
    try {
      const response = await fetch(`${API_URL}/maps/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(mapData)
      })

      if (!response.ok) {
        throw new Error('Failed to update map')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating map:', error)
      throw error
    }
  }

  async deleteMap(id) {
    try {
      const response = await fetch(`${API_URL}/maps/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete map')
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting map:', error)
      throw error
    }
  }

  async addPin(mapId, pinData) {
    try {
      const response = await fetch(`${API_URL}/maps/${mapId}/pins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(pinData)
      })

      if (!response.ok) {
        throw new Error('Failed to add pin')
      }

      return await response.json()
    } catch (error) {
      console.error('Error adding pin:', error)
      throw error
    }
  }

  async updatePin(mapId, pinId, pinData) {
    try {
      const response = await fetch(`${API_URL}/maps/${mapId}/pins/${pinId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(pinData)
      })

      if (!response.ok) {
        throw new Error('Failed to update pin')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating pin:', error)
      throw error
    }
  }

  async deletePin(mapId, pinId) {
    try {
      const response = await fetch(`${API_URL}/maps/${mapId}/pins/${pinId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete pin')
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting pin:', error)
      throw error
    }
  }
}

export default new MapService()
