import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ImageSelector from '../components/ImageSelector'
import './CreatePage.css'
import { useAuth } from '../contexts/AuthContext'

function CreatePage({ addPage, storedImages = [], addImage = async () => {}, deleteImage = async () => {} }) {
  const navigate = useNavigate()
  const [showImageSelector, setShowImageSelector] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    folderPath: '',
    visibility: 'public',
    ownerId: '',
    allowedUsers: [],
    customCSS: '',
    sidebar: {
      image: '',
      quote: '',
      infoFields: []
    }
  })
  const { isAdmin } = useAuth()
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedAllowedUser, setSelectedAllowedUser] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.title.trim() && formData.content.trim()) {
      try {
        await addPage(formData)
        navigate('/')
      } catch (error) {
        console.error('Falha ao criar nota:', error)
      }
    } else {
      alert('Preencha os campos de titulo e conteudo antes de criar a nota.')
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSidebarChange = (field, value) => {
    setFormData({
      ...formData,
      sidebar: {
        ...formData.sidebar,
        [field]: value
      }
    })
  }

  useEffect(() => {
    const loadUsers = async () => {
      if (!isAdmin) return
      try {
        const users = await import('../services/authService').then((m) => m.default.getAllUsers())
        setAvailableUsers(users)
      } catch (error) {
        console.error('Erro ao carregar usuarios:', error)
      }
    }
    loadUsers()
  }, [isAdmin])

  const handleAddAllowedUser = () => {
    if (!selectedAllowedUser) return
    if (formData.allowedUsers.includes(selectedAllowedUser)) return
    setFormData((prev) => ({ ...prev, allowedUsers: [...prev.allowedUsers, selectedAllowedUser] }))
    setSelectedAllowedUser('')
  }

  const handleRemoveAllowedUser = (userId) => {
    setFormData((prev) => ({ ...prev, allowedUsers: prev.allowedUsers.filter((u) => u !== userId) }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        const imageData = await addImage(file)
        handleSidebarChange('image', imageData.url)
      } catch (error) {
        console.error('Erro ao enviar imagem:', error)
      }
    }
    e.target.value = ''
  }

  const handleSelectStoredImage = (imageUrl) => {
    handleSidebarChange('image', imageUrl)
  }

  const handleInfoFieldChange = (index, field, value) => {
    const newInfoFields = [...formData.sidebar.infoFields]
    newInfoFields[index] = {
      ...newInfoFields[index],
      [field]: value
    }
    setFormData({
      ...formData,
      sidebar: {
        ...formData.sidebar,
        infoFields: newInfoFields
      }
    })
  }

  const addInfoField = () => {
    setFormData({
      ...formData,
      sidebar: {
        ...formData.sidebar,
        infoFields: [...formData.sidebar.infoFields, { label: '', value: '' }]
      }
    })
  }

  const removeInfoField = (index) => {
    const newInfoFields = formData.sidebar.infoFields.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      sidebar: {
        ...formData.sidebar,
        infoFields: newInfoFields
      }
    })
  }

  return (
    <div className="create-page">
      <div className="create-header">
        <h1 className="create-title">Criar nota de planejamento</h1>
        <p className="create-subtitle">Adicione uma nova nota ao seu espaco de eventos</p>
      </div>

      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label htmlFor="title" className="form-label">Titulo da nota *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="form-input"
            placeholder="Digite o titulo da nota..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="folderPath" className="form-label">Caminho da pasta</label>
          <input
            type="text"
            id="folderPath"
            name="folderPath"
            value={formData.folderPath}
            onChange={handleChange}
            className="form-input"
            placeholder="ex.: Eventos/2026/T3 ou Fornecedores/Buffet"
          />
          <span className="form-hint">Opcional: organize em pastas (use / para separar). Deixe vazio para a raiz.</span>
        </div>

        {isAdmin && (
          <div className="form-group">
            <label htmlFor="visibility" className="form-label">Visibilidade</label>
            <select
              id="visibility"
              name="visibility"
              value={formData.visibility}
              onChange={handleChange}
              className="form-input"
            >
              <option value="public">Publica (visivel para todos os usuarios autenticados)</option>
              <option value="hidden">Oculta (somente administradores)</option>
              <option value="private">Privada (reservado)</option>
            </select>
            <span className="form-hint">Somente administradores podem definir visibilidade. Notas ocultas nao aparecem para usuarios comuns.</span>
          </div>
        )}

        {isAdmin && (
          <div className="form-group">
            <label className="form-label">Usuarios permitidos (para notas privadas)</label>
            <div className="add-allowed-user">
              <select
                value={selectedAllowedUser}
                onChange={(e) => setSelectedAllowedUser(e.target.value)}
                className="form-input"
              >
                <option value="">Selecione um usuario para conceder acesso...</option>
                {availableUsers
                  .filter((u) => !formData.allowedUsers.includes(u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
              </select>
              <button type="button" onClick={handleAddAllowedUser} className="btn btn-primary">Adicionar</button>
            </div>

            {formData.allowedUsers && formData.allowedUsers.length > 0 && (
              <ul className="allowed-users-list">
                {formData.allowedUsers.map((uid) => {
                  const u = availableUsers.find((x) => x.id === uid)
                  return (
                    <li key={uid} className="allowed-user-item">
                      <span>{u ? u.username : uid}</span>
                      <button type="button" className="btn btn-small btn-danger" onClick={() => handleRemoveAllowedUser(uid)}>Remover</button>
                    </li>
                  )
                })}
              </ul>
            )}
            <small className="form-hint">Conceda acesso individual para notas privadas.</small>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="content" className="form-label">Conteudo da nota * </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            className="form-textarea"
            placeholder="Escreva sua nota de planejamento aqui... Use tags HTML para formatar."
            rows={8}
          />
        </div>

        <div className="form-group">
          <label htmlFor="customCSS" className="form-label">CSS customizado (opcional)</label>
          <textarea
            id="customCSS"
            name="customCSS"
            value={formData.customCSS}
            onChange={handleChange}
            className="form-textarea css-editor"
            rows="8"
            placeholder="Adicione CSS customizado somente para esta nota...&#10;Exemplo:&#10;.page-title { color: #0f4f7f; }&#10;.content-box { border-radius: 16px; }"
          />
          <span className="form-hint">Este CSS sera aplicado apenas nesta nota</span>
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
              value={formData.sidebar.image}
              onChange={(e) => handleSidebarChange('image', e.target.value)}
              className="form-input"
              placeholder="Digite a URL da imagem..."
            />
            {formData.sidebar.image && (
              <div className="image-preview">
                <img src={formData.sidebar.image} alt="Pre-visualizacao" />
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="sidebar-quote" className="form-label">Citacao/nota da barra lateral</label>
            <textarea
              id="sidebar-quote"
              value={formData.sidebar.quote}
              onChange={(e) => handleSidebarChange('quote', e.target.value)}
              className="form-textarea"
              rows="2"
              placeholder="Adicione uma citacao ou nota..."
            />
            <span className="form-hint">Citacao ou nota opcional exibida abaixo da imagem</span>
          </div>

          <div className="form-group">
            <label className="form-label">Campos de informacao</label>
            {formData.sidebar.infoFields.map((field, index) => (
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
              + Adicionar campo de informacao
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Criar nota
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Cancelar
          </button>
        </div>
      </form>

      <div className="tips-section">
        <h3 className="tips-title">Dicas para escrever notas de planejamento claras:</h3>
        <ul className="tips-list">
          <li>Use um titulo especifico com data, local ou fase do evento</li>
          <li>Use titulos e listas para dividir a logistica em secoes</li>
          <li>Use links para conectar notas e recursos relacionados</li>
          <li>Adicione caminhos de pasta para facilitar a busca da equipe</li>
          <li>Inclua imagens para plantas, materiais ou cronogramas</li>
        </ul>
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

export default CreatePage
