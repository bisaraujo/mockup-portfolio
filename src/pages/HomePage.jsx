import { Link } from 'react-router-dom'
import { useState } from 'react'
import { buildFolderTree } from '../utils/folderTree'
import './HomePage.css'

function HomePage({ pages, events = [], characters = [] }) {
  const [expandedFolders, setExpandedFolders] = useState({})

  const eventItems = events.length ? events : characters
  const folderTree = buildFolderTree(pages, eventItems)

  const stripHtml = (html) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html || ''
    return tmp.textContent || tmp.innerText || ''
  }

  const isInHiddenFolder = (item) => {
    const folder = (item.folderPath || '').trim().toLowerCase()
    return folder.split('/').includes('hidden')
  }

  const recentEvents = eventItems
    .filter((item) => !isInHiddenFolder(item))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4)

  const recentNotes = pages
    .filter((item) => !isInHiddenFolder(item))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4)

  const recentActivity = [
    ...pages.map((item) => ({ ...item, type: 'page', title: item.title })),
    ...eventItems.map((item) => ({ ...item, type: 'event', title: item.name || item.title }))
  ]
    .filter((item) => !isInHiddenFolder(item))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)

  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }))
  }

  const getItemPath = (item) => (item.type === 'event' ? `/event/${item.id}` : `/page/${item.id}`)

  const renderFolder = (folderName, folderData, fullPath, level = 0) => {
    if (!folderName || folderName.trim().toLowerCase() === 'hidden') return null

    const isExpanded = expandedFolders[fullPath]
    const totalItems = folderData.pages.length
    const subfolderCount = Object.keys(folderData.folders).length

    return (
      <div key={fullPath} className="folder-panel" style={{ marginLeft: `${level * 1.1}rem` }}>
        <button type="button" className="folder-toggle" onClick={() => toggleFolder(fullPath)}>
          <span className="folder-arrow">{isExpanded ? 'v' : '>'}</span>
          <span>{folderName}</span>
          <span className="folder-count">{totalItems} itens{subfolderCount > 0 ? `, ${subfolderCount} pastas` : ''}</span>
        </button>

        {isExpanded && (
          <div className="folder-items">
            {folderData.pages.map((item) => (
              <Link to={getItemPath(item)} key={`${item.type}-${item.id}`} className="folder-item-link">
                <div>
                  <h5>
                    {item.title}
                    <span className={`type-chip ${item.type === 'event' ? 'event' : 'note'}`}>
                      {item.type === 'event' ? 'Evento' : 'Nota'}
                    </span>
                  </h5>
                  <p>{stripHtml(item.content).slice(0, 90) || 'Sem descrição ainda.'}</p>
                </div>
                <span className="folder-item-arrow">Abrir</span>
              </Link>
            ))}

            {Object.keys(folderData.folders)
              .sort()
              .map((subfolderName) =>
                renderFolder(subfolderName, folderData.folders[subfolderName], `${fullPath}/${subfolderName}`, level + 1)
              )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="home-page">
      <section className="home-hero">
        <p className="hero-kicker">Pagina da Escola</p>
        <h1>Bem Vindos ao Gonzaguinha</h1>
        <p>
          Acompanhe cada evento da nossa instituicao.
        </p>
        <div className="hero-actions">
          <Link to="/events" className="hero-link primary">
            Abrir eventos
          </Link>
        </div>
      </section>


      <section className="section-block">
        <div className="section-head">
          <h2>Eventos recentes</h2>
          <Link to="/events">Gerenciar tudo</Link>
        </div>
        <div className="card-grid">
          {recentEvents.length > 0 ? (
            recentEvents.map((event) => (
              <Link to={`/event/${event.id}`} key={`event-${event.id}`} className="hub-card">
                <h3>{event.name}</h3>
                <p>{stripHtml(event.content).slice(0, 140) || 'Sem descrição ainda.'}</p>
                <div className="card-meta">
                  <span>{event.folderPath || 'Sem pasta'}</span>
                  <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="empty-panel">Nenhum evento ainda. Crie o primeiro na página de Eventos.</div>
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>Atividade recente</h2>
        </div>
        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map((item) => (
              <Link to={getItemPath(item)} key={`${item.type}-${item.id}`} className="activity-item">
                <span className={`type-chip ${item.type === 'event' ? 'event' : 'note'}`}>
                  {item.type === 'event' ? 'Evento' : 'Nota'}
                </span>
                <div className="activity-text">
                  <h4>{item.title || item.name}</h4>
                  <p>{stripHtml(item.content).slice(0, 120) || 'Sem descrição disponível.'}</p>
                </div>
                <span className="activity-date">{new Date(item.createdAt).toLocaleDateString()}</span>
              </Link>
            ))
          ) : (
            <div className="empty-panel">Sem atividade ainda.</div>
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>Navegar por pasta</h2>
        </div>
        <div className="folder-browser">
          {folderTree.pages.length > 0 && (
            <div className="folder-panel">
              <div className="folder-toggle static">
                <span>Geral</span>
                <span className="folder-count">{folderTree.pages.length} itens</span>
              </div>
              <div className="folder-items">
                {folderTree.pages.map((item) => (
                  <Link to={getItemPath(item)} key={`${item.type}-${item.id}`} className="folder-item-link">
                    <div>
                      <h5>
                        {item.title}
                        <span className={`type-chip ${item.type === 'event' ? 'event' : 'note'}`}>
                          {item.type === 'event' ? 'Evento' : 'Nota'}
                        </span>
                      </h5>
                      <p>{stripHtml(item.content).slice(0, 90) || 'Sem descrição ainda.'}</p>
                    </div>
                    <span className="folder-item-arrow">Abrir</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {Object.keys(folderTree.folders)
            .sort()
            .map((folderName) => renderFolder(folderName, folderTree.folders[folderName], folderName))}
        </div>
      </section>


            
      <section className="metrics-grid">
        <article className="metric-card">
          <span className="metric-label">Eventos</span>
          <strong>{eventItems.length}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Notas de planejamento</span>
          <strong>{pages.length}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Pastas de nível superior</span>
          <strong>{Object.keys(folderTree.folders).length}</strong>
        </article>
      </section>


    </div>
  )
}

export default HomePage
