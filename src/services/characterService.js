import { API_URL } from '../config/apiConfig'

export const characterService = {
  // Get all characters
  async getCharacters() {
    const response = await fetch(`${API_URL}/characters`, {
      credentials: 'include'
    })
    if (!response.ok) throw new Error('Failed to fetch characters')
    return response.json()
  },

  // Get specific character
  async getCharacter(id) {
    const response = await fetch(`${API_URL}/characters/${id}`, {
      credentials: 'include'
    })
    if (!response.ok) throw new Error('Failed to fetch character')
    return response.json()
  },

  // Create new character
  async createCharacter(characterData) {
    const response = await fetch(`${API_URL}/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(characterData)
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = err.error || err.message || `Failed to create character (${response.status})`
      throw new Error(msg)
    }
    return response.json()
  },

  // Update character
  async updateCharacter(id, updates) {
    const response = await fetch(`${API_URL}/characters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error('Failed to update character')
    return response.json()
  },

  // Delete character
  async deleteCharacter(id) {
    const response = await fetch(`${API_URL}/characters/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!response.ok) throw new Error('Failed to delete character')
    return response.json()
  },

  // Update diary
  async updateDiary(id, diary) {
    const response = await fetch(`${API_URL}/characters/${id}/diary`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ diary })
    })
    if (!response.ok) throw new Error('Failed to update diary')
    return response.json()
  },

  // Add public diary entry (no auth required)
  async addPublicDiaryEntry(id, content, author = '') {
    const response = await fetch(`${API_URL}/characters/${id}/diary/public`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content, author })
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = err.error || err.message || 'Failed to add diary entry'
      throw new Error(msg)
    }
    return response.json()
  },

  // Add inventory item
  async addInventoryItem(id, item) {
    const response = await fetch(`${API_URL}/characters/${id}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(item)
    })
    if (!response.ok) throw new Error('Failed to add item')
    return response.json()
  },

  // Update inventory item
  async updateInventoryItem(characterId, itemId, updates) {
    const response = await fetch(`${API_URL}/characters/${characterId}/inventory/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error('Failed to update item')
    return response.json()
  },

  // Delete inventory item
  async deleteInventoryItem(characterId, itemId) {
    const response = await fetch(`${API_URL}/characters/${characterId}/inventory/${itemId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!response.ok) throw new Error('Failed to delete item')
    return response.json()
  },

  // Update DM notes (admin only)
  async updateDMNotes(id, dmNotes) {
    const response = await fetch(`${API_URL}/characters/${id}/dm-notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ dmNotes })
    })
    if (!response.ok) throw new Error('Failed to update DM notes')
    return response.json()
  },

  // Upload character sheet PDF
  async uploadCharacterSheet(id, file) {
    const formData = new FormData()
    formData.append('characterSheet', file)

    const response = await fetch(`${API_URL}/characters/${id}/character-sheet`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })
    if (!response.ok) throw new Error('Failed to upload character sheet')
    return response.json()
  },

  // Update scrapbook
  async updateScrapbook(id, scrapbook) {
    const response = await fetch(`${API_URL}/characters/${id}/scrapbook`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ scrapbook })
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Scrapbook update failed:', response.status, errorData)
      throw new Error(errorData.error || 'Failed to update scrapbook')
    }
    return response.json()
  }
}
