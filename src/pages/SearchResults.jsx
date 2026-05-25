import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { sanitizeRenderedHtml } from '../utils/sanitizeHtml'
import './SearchResults.css'

function SearchResults({ pages, events = [], characters = [] }) {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState([])

  const eventItems = events.length ? events : characters

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const searchQuery = query.toLowerCase()

    const filteredPages = pages
      .filter((page) => {
        const titleMatch = page.title.toLowerCase().includes(searchQuery)
        const folderPathMatch = (page.folderPath || '').toLowerCase().includes(searchQuery)

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = page.content
        const contentText = tempDiv.textContent || tempDiv.innerText || ''
        const contentMatch = contentText.toLowerCase().includes(searchQuery)

        return titleMatch || folderPathMatch || contentMatch
      })
      .map((page) => ({ ...page, type: 'page', title: page.title }))

    const filteredEvents = eventItems
      .filter((event) => {
        const nameMatch = (event.name || '').toLowerCase().includes(searchQuery)
        const titleMatch = (event.title || '').toLowerCase().includes(searchQuery)
        const folderPathMatch = (event.folderPath || '').toLowerCase().includes(searchQuery)

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = event.content || ''
        const contentText = tempDiv.textContent || tempDiv.innerText || ''
        const contentMatch = contentText.toLowerCase().includes(searchQuery)

        return nameMatch || titleMatch || folderPathMatch || contentMatch
      })
      .map((event) => ({ ...event, type: 'event', title: event.name || event.title }))

    setResults([...filteredPages, ...filteredEvents])
  }, [query, pages, eventItems])

  const stripHtml = (html) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html || ''
    return tmp.textContent || tmp.innerText || ''
  }

  const highlightMatch = (text, highlight) => {
    if (!highlight.trim()) return text
    const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  return (
    <div className="search-results">
      <div className="search-header">
        <h1 className="search-title">Resultados da busca</h1>
        {query && (
          <p className="search-query">
            Mostrando resultados para: <strong>"{query}"</strong>
          </p>
        )}
        <p className="search-count">
          {results.length} {results.length === 1 ? 'resultado' : 'resultados'} encontrados
        </p>
      </div>

      {results.length > 0 ? (
        <div className="results-list">
          {results.map((item) => {
            const isEvent = item.type === 'event'
            const itemPath = isEvent ? `/event/${item.id}` : `/page/${item.id}`
            const content = stripHtml(item.content || '')
            const excerpt = content.substring(0, 200)

            return (
              <Link to={itemPath} key={`${item.type}-${item.id}`} className="result-item">
                <div className="result-header">
                  <h2
                    className="result-title"
                    dangerouslySetInnerHTML={{ __html: sanitizeRenderedHtml(highlightMatch(item.title || '', query)) }}
                  />
                  {item.folderPath && (
                    <div className="result-meta">
                      <span className="result-category">{item.folderPath}</span>
                      <span className="result-type">{isEvent ? 'Evento' : 'Nota'}</span>
                    </div>
                  )}
                </div>
                <p
                  className="result-excerpt"
                  dangerouslySetInnerHTML={{ __html: sanitizeRenderedHtml(highlightMatch(excerpt, query) + '...') }}
                />
                <span className="result-date">Criado em: {new Date(item.createdAt).toLocaleDateString()}</span>
              </Link>
            )
          })}
        </div>
      ) : query ? (
        <div className="no-results">
          <p className="no-results-text">Nenhum evento ou nota correspondeu a sua busca.</p>
          <p className="no-results-hint">Tente termos mais amplos ou revise a ortografia.</p>
        </div>
      ) : (
        <div className="no-results">
          <p className="no-results-text">Digite uma palavra-chave para encontrar eventos e notas.</p>
        </div>
      )}
    </div>
  )
}

export default SearchResults
