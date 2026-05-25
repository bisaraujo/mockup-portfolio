import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        color: '#e0e0e0'
      }}>
        Carregando...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        color: '#e94560'
      }}>
        <h2>Acesso negado</h2>
        <p>Voce precisa de privilegios de administrador para acessar esta pagina.</p>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
