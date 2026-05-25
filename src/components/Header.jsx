import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './Header.css'

function Header({ toggleSidebar, toggleTheme, currentTheme }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, isAdmin } = useAuth()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setMobileSearchOpen(false)
      setMobileNavOpen(false)
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = async () => {
    try {
      setMobileNavOpen(false)
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Erro ao sair:', error)
    }
  }

  const handleNavClick = () => setMobileNavOpen(false)

  if (location.pathname === '/login') return null

  return (
    <header className="header">
      <div className="header-content">
        <button className="menu-button" onClick={toggleSidebar} aria-label="Alternar barra lateral">
          Menu
        </button>

        <Link to="/" className="logo" onClick={handleNavClick}>
          <img src="/assets/luxia.svg" className="logo-img" alt="Logo do organizador" />
          <span className="logo-text">Escola Gonzaguinha</span>
        </Link>

        <form className="search-form desktop-search" onSubmit={handleSearch}>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar eventos e notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-button">
            Buscar
          </button>
        </form>

        <nav className="header-nav desktop-nav">
          <Link to="/" className="nav-link">
            Painel
          </Link>
          <Link to="/events" className="nav-link">
            Eventos
          </Link>
          
          <button className="theme-switcher nav-link" onClick={toggleTheme}>
            {currentTheme === 'light' ? 'Usar tema moderno' : 'Usar tema claro'}
          </button>
          {isAdmin && (
            <>
              <Link to="/create-character" className="nav-link create-btn">
                + Novo evento
              </Link>
              <Link to="/users" className="nav-link">
                Usuarios
              </Link>
              <Link to="/backup" className="nav-link">
                Backup
              </Link>
            </>
          )}
          {user && (
            <div className="user-info">
              <span className="user-name">
                {user.username}
                {user.role === 'admin' && ' (Administrador)'}
              </span>
              <button onClick={handleLogout} className="nav-link logout-btn">
                Sair
              </button>
            </div>
          )}
        </nav>

        <div className="mobile-actions">
          <button
            className="mobile-icon-btn"
            onClick={() => {
              setMobileSearchOpen((v) => !v)
              setMobileNavOpen(false)
            }}
            aria-label="Buscar"
          >
            Buscar
          </button>
          <button
            className="mobile-icon-btn"
            onClick={() => {
              setMobileNavOpen((v) => !v)
              setMobileSearchOpen(false)
            }}
            aria-label="Menu"
          >
            {mobileNavOpen ? 'Fechar' : 'Mais'}
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <form className="mobile-search-bar" onSubmit={handleSearch}>
          <input
            autoFocus
            type="text"
            className="search-input"
            placeholder="Buscar eventos e notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-button">
            Buscar
          </button>
        </form>
      )}

      {mobileNavOpen && (
        <nav className="mobile-nav-drawer">
          <Link to="/" className="mobile-nav-link" onClick={handleNavClick}>
            Painel
          </Link>
          <Link to="/events" className="mobile-nav-link" onClick={handleNavClick}>
            Eventos
          </Link>
          
          <button
            className="mobile-nav-link theme-row"
            onClick={() => {
              toggleTheme()
              handleNavClick()
            }}
          >
            {currentTheme === 'light' ? 'Usar tema moderno' : 'Usar tema claro'}
          </button>
          {isAdmin && (
            <>
              <div className="mobile-nav-divider" />
              <Link to="/create-character" className="mobile-nav-link admin-link" onClick={handleNavClick}>
                Novo evento
              </Link>
              <Link to="/users" className="mobile-nav-link admin-link" onClick={handleNavClick}>
                Usuarios
              </Link>
              <Link to="/backup" className="mobile-nav-link admin-link" onClick={handleNavClick}>
                Backup
              </Link>
            </>
          )}
          {user && (
            <>
              <div className="mobile-nav-divider" />
              <div className="mobile-nav-user">
                Conectado como <strong>{user.username}</strong>
                {user.role === 'admin' && <span className="mobile-admin-badge">Administrador</span>}
              </div>
              <button className="mobile-nav-link logout-row" onClick={handleLogout}>
                Sair
              </button>
            </>
          )}
        </nav>
      )}
    </header>
  )
}

export default Header
