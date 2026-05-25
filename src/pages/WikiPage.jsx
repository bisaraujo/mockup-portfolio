import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ImageSelector from '../components/ImageSelector'
import pageService from '../services/pageService'
import authService from '../services/authService'
import { parseWikiLinks } from '../utils/wikiLinks'
import { sanitizeRenderedHtml } from '../utils/sanitizeHtml'
import { makeCustomCssHighPriority } from '../utils/customCssPriority'
import './WikiPage.css'

function WikiPage({ pages, updatePage, deletePage, storedImages = [], addImage = async () => {}, deleteImage = async () => {} }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin, user: currentUser } = useAuth()
  const [page, setPage] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showImageSelector, setShowImageSelector] = useState(false)
  const [showEditorManagement, setShowEditorManagement] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [editorMessage, setEditorMessage] = useState('')
  const [editData, setEditData] = useState({
    title: '',
    content: '',
    folderPath: '',
    customCSS: '',
    visibility: 'public',
    sidebar: {
      image: '',
      quote: '',
      infoFields: []
    }
  })

  useEffect(() => {
    const foundPage = pages.find(p => p.id === id)
    if (foundPage) {
      setPage(foundPage)
      setEditData({
        title: foundPage.title,
        content: foundPage.content,
        folderPath: foundPage.folderPath || '',
        visibility: foundPage.visibility || 'public',
        ownerId: foundPage.ownerId || '',
        allowedUsers: foundPage.allowedUsers || [],
        customCSS: foundPage.customCSS || '',
        sidebar: foundPage.sidebar || {
          image: '',
          quote: '',
          infoFields: []
        }
      })
    }
  }, [id, pages])

  // Handle wiki link clicks
  useEffect(() => {
    const handleWikiLinkClick = (e) => {
      if (e.target.classList.contains('wiki-link')) {
        e.preventDefault()
        let pageId = e.target.getAttribute('data-page-id')
        if (!pageId) {
          const href = e.target.getAttribute('href') || ''
          const match = href.match(/^\/page\/([^/?#]+)/)
          pageId = match ? match[1] : null
        }
        if (pageId) {
          navigate(`/page/${pageId}`)
        }
      }
    }

    document.addEventListener('click', handleWikiLinkClick)
    return () => {
      document.removeEventListener('click', handleWikiLinkClick)
    }
  }, [navigate])

  // Load available users for editor management (admin only)
  useEffect(() => {
    const loadUsers = async () => {
      if (isAdmin) {
        try {
          const users = await authService.getAllUsers()
          setAvailableUsers(users)
        } catch (error) {
          console.error('Erro ao carregar usuários:', error)
        }
      }
    }
    loadUsers()
  }, [isAdmin])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      await updatePage(id, editData)
      setIsEditing(false)
    } catch (error) {
      // Error already handled in App.jsx
      console.error('Falha ao salvar nota:', error)
    }
  }

  const handleCancel = () => {
    setEditData({
      title: page.title,
      content: page.content,
      folderPath: page.folderPath || '',
      customCSS: page.customCSS || '',
      sidebar: page.sidebar || {
        image: '',
        quote: '',
        infoFields: []
      }
    })
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (window.confirm('Tem certeza de que deseja excluir esta nota?')) {
      try {
        await deletePage(id)
        navigate('/')
      } catch (error) {
        // Error already handled in App.jsx
        console.error('Falha ao excluir nota:', error)
      }
    }
  }

  const handleAddEditor = async () => {
    if (!selectedUserId) {
      setEditorMessage('Selecione um usuário para adicionar como editor')
      return
    }

    try {
      await pageService.addEditor(id, selectedUserId)
      setEditorMessage('Editor adicionado com sucesso')
      setSelectedUserId('')
      
      // Refresh page data
      const updatedPages = [...pages]
      const pageIndex = updatedPages.findIndex(p => p.id === id)
      if (pageIndex !== -1) {
        if (!updatedPages[pageIndex].editors) {
          updatedPages[pageIndex].editors = []
        }
        if (!updatedPages[pageIndex].editors.includes(selectedUserId)) {
          updatedPages[pageIndex].editors.push(selectedUserId)
        }
        setPage(updatedPages[pageIndex])
      }
      
      setTimeout(() => setEditorMessage(''), 3000)
    } catch (error) {
      setEditorMessage(error.message || 'Falha ao adicionar editor')
      setTimeout(() => setEditorMessage(''), 3000)
    }
  }

  const handleAddAllowedUser = (userId) => {
    if (!userId) return
    if (!editData.allowedUsers) editData.allowedUsers = []
    if (editData.allowedUsers.includes(userId)) return
    setEditData(prev => ({ ...prev, allowedUsers: [...(prev.allowedUsers||[]), userId] }))
  }

  const handleRemoveAllowedUser = (userId) => {
    setEditData(prev => ({ ...prev, allowedUsers: (prev.allowedUsers || []).filter(u => u !== userId) }))
  }

  const handleRemoveEditor = async (userId) => {
    try {
      await pageService.removeEditor(id, userId)
      setEditorMessage('Editor removido com sucesso')
      
      // Refresh page data
      const updatedPages = [...pages]
      const pageIndex = updatedPages.findIndex(p => p.id === id)
      if (pageIndex !== -1 && updatedPages[pageIndex].editors) {
        updatedPages[pageIndex].editors = updatedPages[pageIndex].editors.filter(
          editorId => editorId !== userId
        )
        setPage(updatedPages[pageIndex])
      }
      
      setTimeout(() => setEditorMessage(''), 3000)
    } catch (error) {
      setEditorMessage(error.message || 'Falha ao remover editor')
      setTimeout(() => setEditorMessage(''), 3000)
    }
  }

  const handleChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value
    })
  }

  const handleSidebarChange = (field, value) => {
    setEditData({
      ...editData,
      sidebar: {
        ...editData.sidebar,
        [field]: value
      }
    })
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        // Upload image to server
        const imageData = await addImage(file)
        // Use the server URL
        handleSidebarChange('image', imageData.url)
      } catch (error) {
        console.error('Erro ao enviar imagem:', error)
        // Error already handled in addImage
      }
    }
    // Reset file input
    e.target.value = ''
  }

  const handleSelectStoredImage = (imageUrl) => {
    handleSidebarChange('image', imageUrl)
  }

  const handleInfoFieldChange = (index, field, value) => {
    const newInfoFields = [...editData.sidebar.infoFields]
    newInfoFields[index] = {
      ...newInfoFields[index],
      [field]: value
    }
    setEditData({
      ...editData,
      sidebar: {
        ...editData.sidebar,
        infoFields: newInfoFields
      }
    })
  }

  const addInfoField = () => {
    setEditData({
      ...editData,
      sidebar: {
        ...editData.sidebar,
        infoFields: [
          ...editData.sidebar.infoFields,
          { label: '', value: '' }
        ]
      }
    })
  }

  const removeInfoField = (index) => {
    const newInfoFields = editData.sidebar.infoFields.filter((_, i) => i !== index)
    setEditData({
      ...editData,
      sidebar: {
        ...editData.sidebar,
        infoFields: newInfoFields
      }
    })
  }

  if (!page) {
    return (
      <div className="wiki-page">
        <div className="not-found">
          <h1>Nota não encontrada</h1>
          <p>A nota que você procura não existe.</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Ir para o painel
          </button>
        </div>
      </div>
    )
  }

  // Check if current user can edit this page
  const canEdit = isAdmin || (page.editors && page.editors.includes(currentUser?.id))
  const canDelete = isAdmin // Only admins can delete pages

  return (
    <div className="wiki-page" data-page-id={id}>
      {page.customCSS && (
        <style>{makeCustomCssHighPriority(page.customCSS, '.custom-css-scope-page')}</style>
      )}
      <div className="custom-css-scope-page">
        {!isEditing ? (
          <>
          <div className="page-header">
            <div className="page-header-content">
              <h1 className="page-title">{page.title}</h1>
              <div className="page-meta">
                {page.folderPath && (
                  <span className="page-category">{page.folderPath}</span>
                )}
                {page.ownerId && (
                  <span className="page-owner">Dono: {page.ownerName || page.ownerId}</span>
                )}
                <span className="page-date">
                  Criado em: {new Date(page.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            {(canEdit || canDelete) && (
              <div className="page-actions">
                {canEdit && (
                  <button onClick={handleEdit} className="btn btn-edit">
                    Editar
                  </button>
                )}
                {canDelete && (
                  <button onClick={handleDelete} className="btn btn-delete">
                    Excluir
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="page-content">
            <div className="content-box main-content">
              {page.sidebar && (page.sidebar.image || page.sidebar.quote || (page.sidebar.infoFields && page.sidebar.infoFields.length > 0)) && (
                <div className="page-sidebar">
                  {page.sidebar.image && (
                    <div className="sidebar-image">
                      <img src={page.sidebar.image} alt={page.title} />
                    </div>
                  )}
                  
                  {page.sidebar.quote && (
                    <div className="sidebar-quote">
                      {page.sidebar.quote}
                    </div>
                  )}
                  
                  {page.sidebar.infoFields && page.sidebar.infoFields.length > 0 && (
                    <div className="sidebar-info">
                      {page.sidebar.infoFields.map((field, index) => (
                        <div key={index} className="sidebar-info-item">
                          <div className="sidebar-info-label">{field.label}</div>
                          <div className="sidebar-info-value">{field.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div dangerouslySetInnerHTML={{ __html: sanitizeRenderedHtml(parseWikiLinks(page.content, pages)) }} />
            </div>
          </div>

          <div className="page-footer">
            <div className="footer-section">
              <h3 className="footer-title">Informações da nota</h3>
              <div className="info-grid">
                {page.folderPath && (
                  <div className="info-item">
                    <span className="info-label">Coleção:</span>
                    <span className="info-value">{page.folderPath}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">Criado em:</span>
                  <span className="info-value">
                    {new Date(page.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Secao de gerenciamento de editores (somente admin) */}
          {isAdmin && (
            <div className="page-footer">
              <div className="footer-section">
                <h3 className="footer-title">Editores da nota</h3>
                <button 
                  onClick={() => setShowEditorManagement(!showEditorManagement)}
                  className="btn btn-secondary"
                  style={{ marginBottom: '1rem' }}
                >
                  {showEditorManagement ? 'Ocultar' : 'Gerenciar'} editores
                </button>

                {showEditorManagement && (
                  <div className="editor-management">
                    {editorMessage && (
                      <div className={`editor-message ${editorMessage.includes('sucesso') ? 'success' : 'error'}`}>
                        {editorMessage}
                      </div>
                    )}

                    <div className="add-editor-form">
                      <select 
                        value={selectedUserId} 
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="editor-select"
                      >
                        <option value="">Selecione um usuário para adicionar como editor...</option>
                        {availableUsers
                          .filter(u => u.role !== 'admin' && (!page.editors || !page.editors.includes(u.id)))
                          .map(user => (
                            <option key={user.id} value={user.id}>
                              {user.username}
                            </option>
                          ))
                        }
                      </select>
                      <button onClick={handleAddEditor} className="btn btn-primary">
                        Adicionar editor
                      </button>
                    </div>

                    <div className="current-editors">
                      <h4>Editores atuais:</h4>
                      {page.editors && page.editors.length > 0 ? (
                        <ul className="editor-list">
                          {page.editors.map(editorId => {
                            const editor = availableUsers.find(u => u.id === editorId)
                            return editor ? (
                              <li key={editorId} className="editor-item">
                                <span>{editor.username}</span>
                                <button 
                                  onClick={() => handleRemoveEditor(editorId)}
                                  className="btn btn-small btn-danger"
                                >
                                  Remover
                                </button>
                              </li>
                            ) : null
                          })}
                        </ul>
                      ) : (
                        <p className="no-editors">Nenhum editor atribuído. Somente administradores podem editar esta nota.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="edit-mode">
          <div className="edit-header">
            <h2 className="edit-title">Editando: {page.title}</h2>
          </div>

          <div className="edit-form">
            <div className="form-group">
              <label htmlFor="title" className="form-label">Título</label>
              <input
                type="text"
                id="title"
                name="title"
                value={editData.title}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="folderPath" className="form-label">Caminho da pasta</label>
              <input
                type="text"
                id="folderPath"
                name="folderPath"
                value={editData.folderPath}
                onChange={handleChange}
                className="form-input"
                placeholder="ex.: Eventos/2026/T3 ou Fornecedores/Buffet"
              />
              <small className="form-hint">Opcional: organize em pastas (use / para separar). Deixe vazio para a raiz.</small>
            </div>

            {isAdmin && (
              <div className="form-group">
                <label htmlFor="visibility" className="form-label">Visibilidade</label>
                <select
                  id="visibility"
                  name="visibility"
                  value={editData.visibility}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="public">Publica (visivel para todos os usuários autenticados)</option>
                  <option value="hidden">Oculta (somente administradores)</option>
                  <option value="private">Privada (reservado)</option>
                </select>
                <small className="form-hint">Somente administradores podem alterar a visibilidade.</small>
              </div>
            )}

            {isAdmin && (
              <div className="form-group">
                <label className="form-label">Usuários permitidos (para notas privadas)</label>
                <div className="add-allowed-user">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Selecione um usuário para conceder acesso...</option>
                    {availableUsers
                      .filter(u => u.role !== 'admin' && !(editData.allowedUsers || []).includes(u.id))
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => handleAddAllowedUser(selectedUserId)} className="btn btn-primary">Adicionar</button>
                </div>

                {(editData.allowedUsers || []).length > 0 && (
                  <ul className="allowed-users-list">
                    {editData.allowedUsers.map(uid => {
                      const u = availableUsers.find(x => x.id === uid)
                      return (
                        <li key={uid} className="allowed-user-item">
                          <span>{u ? u.username : uid}</span>
                          <button type="button" className="btn btn-small btn-danger" onClick={() => handleRemoveAllowedUser(uid)}>Remover</button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div className="form-group">
                  <label className="form-label">Dono</label>
                  <select
                    value={editData.ownerId || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, ownerId: e.target.value }))}
                    className="form-input"
                  >
                    <option value="">(Deixe em branco para manter o dono atual)</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                  <small className="form-hint">Atribua um dono diferente para esta nota.</small>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="content" className="form-label">Conteúdo</label>
              <textarea
                id="content"
                name="content"
                value={editData.content}
                onChange={handleChange}
                className="form-textarea"
                rows="10"
                placeholder="Edite sua nota de planejamento..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="customCSS" className="form-label">CSS customizado (opcional)</label>
              <textarea
                id="customCSS"
                name="customCSS"
                value={editData.customCSS}
                onChange={handleChange}
                className="form-textarea css-editor"
                rows="8"
                placeholder="Adicione CSS customizado somente para esta nota...&#10;Exemplo:&#10;.page-title { color: #0f4f7f; }&#10;.content-box { border-radius: 16px; }"
              />
              <span className="form-hint">Este CSS será aplicado apenas nesta nota</span>
            </div>

            <div className="sidebar-editor-section">
              <h3 className="section-title">Barra lateral (opcional)</h3>
              
              <div className="form-group">
                <label htmlFor="sidebar-image" className="form-label">Imagem da barra lateral</label>
                <div className="image-upload-container">
                  <input
                    type="file"
                    id="sidebar-image-file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="file-input"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="sidebar-image-file" className="btn btn-secondary upload-btn">
                    Enviar imagem
                  </label>
                  <button 
                    type="button"
                    className="btn btn-secondary upload-btn"
                    onClick={() => setShowImageSelector(true)}
                  >
                    Ver armazenadas
                  </button>
                  <span className="form-hint">ou informe a URL abaixo</span>
                </div>
                <input
                  type="text"
                  id="sidebar-image"
                  value={editData.sidebar.image}
                  onChange={(e) => handleSidebarChange('image', e.target.value)}
                  className="form-input"
                  placeholder="Digite a URL da imagem..."
                />
                {editData.sidebar.image && (
                  <div className="image-preview">
                    <img src={editData.sidebar.image} alt="Pré-visualização" />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="sidebar-quote" className="form-label">Citação/nota da barra lateral</label>
                <textarea
                  id="sidebar-quote"
                  value={editData.sidebar.quote}
                  onChange={(e) => handleSidebarChange('quote', e.target.value)}
                  className="form-textarea"
                  rows="2"
                  placeholder="Adicione uma citacao ou nota..."
                />
                <span className="form-hint">Citação ou nota opcional exibida abaixo da imagem</span>
              </div>

              <div className="form-group">
                <label className="form-label">Campos de informação</label>
                {editData.sidebar.infoFields.map((field, index) => (
                  <div key={index} className="info-field-row">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleInfoFieldChange(index, 'label', e.target.value)}
                      className="form-input info-field-label"
                      placeholder="Rotulo (ex.: Data, Local, Responsavel)"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => handleInfoFieldChange(index, 'value', e.target.value)}
                      className="form-input info-field-value"
                      placeholder="Valor"
                    />
                    <button
                      type="button"
                      onClick={() => removeInfoField(index)}
                      className="btn btn-delete-small"
                    >
                      X
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addInfoField}
                  className="btn btn-secondary btn-add-field"
                >
                  + Adicionar campo de informação
                </button>
              </div>
            </div>

            <div className="edit-actions">
              <button onClick={handleSave} className="btn btn-primary">
                Salvar alterações
              </button>
              <button onClick={handleCancel} className="btn btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {showImageSelector && (
        <ImageSelector
          storedImages={storedImages}
          onSelect={handleSelectStoredImage}
          onClose={() => setShowImageSelector(false)}
          deleteImage={deleteImage}
        />
      )}
    </div>
  )
}

export default WikiPage



