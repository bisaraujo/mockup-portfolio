import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import authService from '../services/authService'
import './UserManagement.css'

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { user: currentUser } = useAuth()

  // Create user form
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('user')
  const [creating, setCreating] = useState(false)

  // Change password form
  const [changingPasswordFor, setChangingPasswordFor] = useState(null)
  const [newPasswordValue, setNewPasswordValue] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const userData = await authService.getAllUsers()
      setUsers(userData)
    } catch (err) {
      setError('Falha ao carregar usuarios')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setCreating(true)

    try {
      if (!newUsername || !newPassword) {
        throw new Error('Usuário e senha são obrigatórios')
      }

      await authService.register(newUsername, newPassword, newRole)
      setSuccess(`Usuário "${newUsername}" criado com sucesso`)
      setNewUsername('')
      setNewPassword('')
      setNewRole('user')
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Falha ao criar usuário')
    } finally {
      setCreating(false)
    }
  }

  const handleChangePassword = async (userId) => {
    setError('')
    setSuccess('')
    setChangingPassword(true)

    try {
      if (!newPasswordValue) {
        throw new Error('A nova senha é obrigatória')
      }

      await authService.changePassword(userId, newPasswordValue)
      const username = users.find(u => u.id === userId)?.username
      setSuccess(`Senha alterada para o usuário "${username}"`)
      setChangingPasswordFor(null)
      setNewPasswordValue('')
    } catch (err) {
      setError(err.message || 'Falha ao alterar senha')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Tem certeza de que deseja excluir o usuário "${username}"?`)) {
      return
    }

    setError('')
    setSuccess('')

    try {
      await authService.deleteUser(userId)
      setSuccess(`Usuário "${username}" excluído com sucesso`)
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Falha ao excluir usuário')
    }
  }

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading">Carregando usuários...</div>
      </div>
    )
  }

  return (
    <div className="user-management">
      <h1>Gerenciamento de usuários</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="management-section">
        <h2>Criar novo usuário</h2>
        <form onSubmit={handleCreateUser} className="create-user-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Usuário</label>
              <input
                type="text"
                id="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                disabled={creating}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <input
                type="password"
                id="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={creating}
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Perfil</label>
              <select
                id="role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                disabled={creating}
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="form-group">
              <label>&nbsp;</label>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Criando...' : 'Criar usuário'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="management-section">
        <h2>Usuários existentes</h2>
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.username}</strong>
                    {user.id === currentUser?.id && <span className="badge">Você</span>}
                  </td>
                  <td>
                    <span className={`role-badge ${user.role}`}>{user.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                  </td>
                  <td>
                    {user.createdAt 
                      ? new Date(user.createdAt).toLocaleDateString()
                      : 'N/D'
                    }
                  </td>
                  <td>
                    <div className="action-buttons">
                      {changingPasswordFor === user.id ? (
                        <div className="password-change-inline">
                          <input
                            type="password"
                            placeholder="Nova senha"
                            value={newPasswordValue}
                            onChange={(e) => setNewPasswordValue(e.target.value)}
                            disabled={changingPassword}
                          />
                          <button
                            onClick={() => handleChangePassword(user.id)}
                            className="btn btn-small btn-primary"
                            disabled={changingPassword}
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => {
                              setChangingPasswordFor(null)
                              setNewPasswordValue('')
                            }}
                            className="btn btn-small"
                            disabled={changingPassword}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setChangingPasswordFor(user.id)}
                            className="btn btn-small"
                          >
                            Alterar senha
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              className="btn btn-small btn-danger"
                            >
                              Excluir
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default UserManagement
