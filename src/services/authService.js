import { API_URL } from '../config/apiConfig'

class AuthService {
  async login(username, password) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Login failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Error logging in:', error)
      throw error
    }
  }

  async logout() {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Error logging out:', error)
      throw error
    }
  }

  async getMe() {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Not authenticated')
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting user:', error)
      throw error
    }
  }

  async register(username, password, role = 'user') {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password, role })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Registration failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Error registering:', error)
      throw error
    }
  }

  async getAllUsers() {
    try {
      const response = await fetch(`${API_URL}/auth/users`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching users:', error)
      throw error
    }
  }

  async changePassword(userId, newPassword) {
    try {
      const response = await fetch(`${API_URL}/auth/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ password: newPassword })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change password')
      }

      return await response.json()
    } catch (error) {
      console.error('Error changing password:', error)
      throw error
    }
  }

  async deleteUser(userId) {
    try {
      const response = await fetch(`${API_URL}/auth/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete user')
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }
}

export default new AuthService()
