import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { characterService } from '../services/characterService'
import ImageSelector from '../components/ImageSelector'
import './CreatePage.css'
import './CreateCharacter.css'
import { useAuth } from '../contexts/AuthContext'

export default function CreateCharacter({ storedImages = [], addImage = async () => {}, deleteImage = async () => {} }) {
  const navigate = useNavigate()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImageSelector, setShowImageSelector] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    content: '',
    folderPath: 'Eventos',
    sidebar: {
      image: '',
      quote: '',
      infoFields: []
    }
  })
  const { isAuthenticated } = useAuth()

  const loadEvents = async () => {
    try {
      const allEvents = await characterService.getCharacters()
      setEvents(allEvents)
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    // Prevent showing the form to unauthenticated users (e.g. direct /create-character URL)
    if (showForm && !isAuthenticated) {
      navigate('/login')
    }
  }, [showForm, isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isAuthenticated) {
      alert('Você precisa entrar para criar eventos')
      navigate('/login')
      return
    }

    if (!formData.name.trim()) {
      alert('Digite um nome para o evento')
      return
    }

    try {
      const newEvent = await characterService.createCharacter(formData)
      navigate(`/event/${newEvent.id}`)
    } catch (error) {
      console.error('Erro ao criar evento:', error)
      alert(error.message || 'Nao foi possivel criar o evento')
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
    setShowImageSelector(false)
  }

  if (loading) {
    return <div className="create-page">Carregando...</div>
  }

  if (!showForm && events.length > 0) {
    return (
      <div className="create-page">
        <div className="create-header">
          <h1 className="create-title">Todos os eventos</h1>
          <p className="create-subtitle">Navegue e gerencie todos os perfis de evento</p>
        </div>

        <div className="characters-list">
          {events.map((event) => (
            <div key={event.id} className="character-card">
              {event.sidebar?.image && <img src={event.sidebar.image} alt={event.name} />}
              <div className="character-info">
                <h3>{event.name}</h3>
                {event.title && <p className="character-title">{event.title}</p>}
                <Link to={`/event/${event.id}`} className="view-btn">
                  Ver evento
                </Link>
              </div>
            </div>
          ))}
        </div>

        {isAuthenticated && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary create-new-btn">
            + Criar novo evento
          </button>
        )}
      </div>
    )
  }

  // If there are no events and the visitor is not authenticated, do not render the creation form.
  if (!isAuthenticated && !showForm && events.length === 0) {
    return (
      <div className="create-page">
        <div className="create-header">
          <h1 className="create-title">Nenhum evento</h1>
          <p className="create-subtitle">Faça login para criar o primeiro evento.</p>
        </div>
        <Link to="/login" className="btn btn-primary">
          Entrar
        </Link>
      </div>
    )
  }

  return (
    <div className="create-page">
      <div className="create-header">
        <h1 className="create-title">{events.length > 0 ? 'Criar outro evento' : 'Criar novo evento'}</h1>
        <p className="create-subtitle">Adicione um novo perfil de evento ao seu espaco</p>
      </div>

      {events.length > 0 && (
        <button onClick={() => setShowForm(false)} className="btn btn-secondary back-btn">
          Voltar para eventos
        </button>
      )}

      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Nome do evento *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-input"
            placeholder="Digite o nome do evento..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="title" className="form-label">
            Tipo de evento
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="form-input"
            placeholder="ex.: Workshop, Meetup, Conferencia"
          />
        </div>

        <div className="form-group">
          <label htmlFor="content" className="form-label">
            Detalhes do evento
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            className="form-textarea"
            placeholder="Escreva os detalhes, agenda e destaques do evento..."
            rows={8}
          />
        </div>

        <div className="form-group">
          <label htmlFor="folderPath" className="form-label">
            Caminho da pasta
          </label>
          <input
            type="text"
            id="folderPath"
            name="folderPath"
            value={formData.folderPath}
            onChange={handleChange}
            className="form-input"
            placeholder="ex.: Eventos/2026/T3"
          />
          <span className="form-hint">Opcional: organize em pastas (use / para separar)</span>
        </div>

        <div className="sidebar-editor-section">
          <h3 className="section-title">Barra lateral (opcional)</h3>

          <div className="form-group">
            <label htmlFor="sidebar-image" className="form-label">
              Imagem de capa do evento
            </label>
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
              <button type="button" className="btn btn-secondary upload-btn" onClick={() => setShowImageSelector(true)}>
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
            <label htmlFor="sidebar-quote" className="form-label">
              Nota principal
            </label>
            <textarea
              id="sidebar-quote"
              value={formData.sidebar.quote}
              onChange={(e) => handleSidebarChange('quote', e.target.value)}
              className="form-textarea"
              placeholder="Adicione um resumo importante deste evento..."
              rows={3}
            />
            <span className="form-hint">Nota opcional exibida abaixo da imagem do evento</span>
          </div>

          <div className="form-group">
            <label className="form-label">Informacoes rapidas</label>
            {formData.sidebar.infoFields.map((field, index) => (
              <div key={index} className="info-field-row">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => handleInfoFieldChange(index, 'label', e.target.value)}
                  className="form-input info-field-label"
                  placeholder="Rotulo (ex.: Data, Host, Local)"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => handleInfoFieldChange(index, 'value', e.target.value)}
                  className="form-input info-field-value"
                  placeholder="Valor"
                />
                <button type="button" onClick={() => removeInfoField(index)} className="btn btn-danger btn-small">
                  Remover
                </button>
              </div>
            ))}
            <button type="button" onClick={addInfoField} className="btn btn-secondary">
              + Adicionar campo de informacao
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Criar evento
          </button>
          <button type="button" onClick={() => navigate('/')} className="btn btn-secondary">
            Cancelar
          </button>
        </div>
      </form>

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
