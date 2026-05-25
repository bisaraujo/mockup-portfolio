export const API_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001')
  : ''

export const API_URL = `${API_BASE}/api`
