import { Link } from 'react-router-dom'
import { useState } from 'react'
import { buildFolderTree } from '../utils/folderTree'
import './Sidebar.css'

function Sidebar({ pages, events = [], characters = [], isOpen, onClose, isAdmin = false }) {
  const [expandedFolders, setExpandedFolders] = useState({})

  const eventItems = events.length ? events : characters

  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }))
  }

  const folderTree = buildFolderTree(pages, eventItems)
  const folderCount = Object.keys(folderTree.folders).length

  const getItemPath = (item) => (item.type === 'event' ? `/event/${item.id}` : `/page/${item.id}`)
  const getItemLabel = (item) => (item.type === 'event' ? '[Evento]' : '[Nota]')

  const renderFolderTree = (folderData, parentPath = '', level = 0) => {
    return (
      <>
        {folderData.pages.map((item) => (
          <li key={`${item.type}-${item.id}`} style={{ paddingLeft: `${level * 1}rem` }}>
            <Link to={getItemPath(item)} className="sidebar-link page-link">
              <span className="item-kind">{getItemLabel(item)}</span> {item.title}
            </Link>
          </li>
        ))}
        {Object.keys(folderData.folders)
          .sort()
          .map((folderName) => {
            const normalized = String(folderName ?? '').trim().toLowerCase()
            if (!isAdmin && normalized === 'hidden') return null

            const folder = folderData.folders[folderName]
            const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName
            const isExpanded = expandedFolders[folderPath]

            return (
              <li key={folderName} style={{ paddingLeft: `${level * 1}rem` }}>
                <div
                  className="category-name"
                  onClick={() => toggleFolder(folderPath)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <span className="folder-icon">{isExpanded ? 'v' : '>'}</span>
                  {folderName}
                </div>
                {isExpanded && <ul className="sidebar-list">{renderFolderTree(folder, folderPath, level + 1)}</ul>}
              </li>
            )
          })}
      </>
    )
  }

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-content">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Navegar</h3>
            <ul className="sidebar-list">
              <li>
                <Link to="/" className="sidebar-link">
                  Painel
                </Link>
              </li>
              <li>
                <Link to="/events" className="sidebar-link">
                  Eventos
                </Link>
              </li>
              
            </ul>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Pastas</h3>
            <ul className="sidebar-list">{renderFolderTree(folderTree)}</ul>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Resumo</h3>
            <div className="stat-item">
              <span className="stat-label">Notas de planejamento:</span>
              <span className="stat-value">{pages.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Eventos:</span>
              <span className="stat-value">{eventItems.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pastas:</span>
              <span className="stat-value">{folderCount}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
