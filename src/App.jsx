import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import WikiPage from './pages/WikiPage'
import CreatePage from './pages/CreatePage'
import SearchResults from './pages/SearchResults'
import Login from './pages/Login'
import UserManagement from './pages/UserManagement'
import BackupManager from './pages/BackupManager'
import EventPage from './pages/CharacterPage'
import EventManager from './pages/CreateCharacter'
import Maps from './pages/Maps'
import MapEditor from './pages/MapEditor'
import imageService from './services/imageService'
import pageService from './services/pageService'
import { characterService } from './services/characterService'
import './styles/App.css'
import './styles/light-theme.css'

function AppContent() {
  const [pages, setPages] = useState([])
  const [events, setEvents] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 896)
  const [theme, setTheme] = useState('dark')
  const [storedImages, setStoredImages] = useState([])
  const { isAuthenticated, logout, isAdmin } = useAuth()

  useEffect(() => {
    // Load theme preference (support legacy 'fantasy' key)
    const savedTheme = localStorage.getItem('plannerTheme') || localStorage.getItem('wikiTheme')
    if (savedTheme) {
      const mapped = savedTheme === 'fantasy' ? 'light' : savedTheme
      setTheme(mapped)
      // The CSS targets the legacy `.fantasy-theme` body selector — keep compatibility
      document.body.className = mapped === 'light' ? 'fantasy-theme' : ''
    } else {
      // Default to the modern dark style
      document.body.className = ''
    }
  }, [])

  useEffect(() => {
    // Load events from server (legacy characters API)
    const loadEvents = async () => {
      try {
        const serverEvents = await characterService.getCharacters()
        setEvents(serverEvents)
      } catch (error) {
        console.error('Erro ao carregar eventos do servidor:', error)
      }
    }
    loadEvents()
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      setPages([])
      setStoredImages([])
      return
    }

    // Load stored images from server
    const loadImages = async () => {
      try {
        const images = await imageService.getImages()
        setStoredImages(images)
      } catch (error) {
        console.error('Erro ao carregar imagens:', error)
      }
    }
    loadImages()

    // Load notes from server
    const loadPages = async () => {
      try {
        const serverPages = await pageService.getAllPages()
        setPages(serverPages)
        // Cache for offline access
        localStorage.setItem('plannerPages', JSON.stringify(serverPages))
      } catch (error) {
        console.error('Erro ao carregar notas do servidor:', error)
        if (error.status === 401) {
          logout()
          return
        }

        // Fallback to local cache
        const savedPages = localStorage.getItem('plannerPages') || localStorage.getItem('wikiPages')
        if (savedPages) {
          try {
            const parsed = JSON.parse(savedPages)
            const filtered = isAdmin ? parsed : parsed.filter((p) => p.visibility !== 'hidden')
            setPages(filtered)
          } catch (err) {
            console.error('Falha ao processar notas em cache:', err)
          }
        }
      }
    }
    loadPages()
  }, [isAuthenticated, isAdmin, logout])

  const addPage = async (newPage) => {
    try {
      const createdPage = await pageService.createPage(newPage)
      const updatedPages = [...pages, createdPage]
      setPages(updatedPages)
      localStorage.setItem('plannerPages', JSON.stringify(updatedPages))
      return createdPage
    } catch (error) {
      console.error('Erro ao criar nota:', error)
      alert('Nao foi possivel criar a nota. Tente novamente.')
      throw error
    }
  }

  const updatePage = async (id, updatedPageData) => {
    try {
      const updatedPage = await pageService.updatePage(id, updatedPageData)
      const updatedPages = pages.map((page) => (page.id === id ? updatedPage : page))
      setPages(updatedPages)
      localStorage.setItem('plannerPages', JSON.stringify(updatedPages))
    } catch (error) {
      console.error('Erro ao atualizar nota:', error)
      alert('Nao foi possivel atualizar a nota. Tente novamente.')
      throw error
    }
  }

  const deletePage = async (id) => {
    try {
      await pageService.deletePage(id)
      const updatedPages = pages.filter((page) => page.id !== id)
      setPages(updatedPages)
      localStorage.setItem('plannerPages', JSON.stringify(updatedPages))
    } catch (error) {
      console.error('Erro ao excluir nota:', error)
      alert('Nao foi possivel excluir a nota. Tente novamente.')
      throw error
    }
  }

  const addImage = async (file) => {
    try {
      const imageData = await imageService.uploadImage(file)
      setStoredImages((prev) => [...prev, imageData])
      return imageData
    } catch (error) {
      console.error('Erro ao enviar imagem:', error)
      if (error.message.includes('5MB')) {
        alert('O arquivo e muito grande. O tamanho maximo e 5MB.')
      } else {
        alert('Nao foi possivel enviar a imagem. Tente novamente.')
      }
      throw error
    }
  }

  const deleteImage = async (imageId) => {
    try {
      const image = storedImages.find((img) => img.id === imageId)
      if (!image) return

      // Extract filename from URL or use filename directly
      const filename = image.filename || image.url.split('/').pop()
      await imageService.deleteImage(filename)

      setStoredImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch (error) {
      console.error('Erro ao excluir imagem:', error)
      alert('Nao foi possivel excluir a imagem. Tente novamente.')
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('plannerTheme', newTheme)
    // Use legacy class name so the CSS rules apply
    document.body.className = newTheme === 'light' ? 'fantasy-theme' : ''
  }

  // Server enforces visibility and returns filtered data.
  const visiblePages = pages

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <div className="app">
              <Header
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                toggleTheme={toggleTheme}
                currentTheme={theme}
              />
              <div className="main-container">
                <Sidebar
                  pages={visiblePages}
                  events={events}
                  isOpen={sidebarOpen}
                  onClose={() => setSidebarOpen(false)}
                  isAdmin={isAdmin}
                />
                <div className={`content-wrapper ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
                  <Routes>
                    <Route path="/" element={<HomePage pages={visiblePages} events={events} />} />
                    <Route
                      path="/page/:id"
                      element={
                        <ProtectedRoute>
                          <WikiPage
                            pages={visiblePages}
                            updatePage={updatePage}
                            deletePage={deletePage}
                            storedImages={storedImages}
                            addImage={addImage}
                            deleteImage={deleteImage}
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/create"
                      element={
                        <ProtectedRoute adminOnly={true}>
                          <CreatePage
                            addPage={addPage}
                            storedImages={storedImages}
                            addImage={addImage}
                            deleteImage={deleteImage}
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/users"
                      element={
                        <ProtectedRoute adminOnly={true}>
                          <UserManagement />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/search" element={<SearchResults pages={visiblePages} events={events} />} />
                    <Route
                      path="/event/:id"
                      element={<EventPage storedImages={storedImages} addImage={addImage} deleteImage={deleteImage} />}
                    />
                    <Route
                      path="/character/:id"
                      element={<EventPage storedImages={storedImages} addImage={addImage} deleteImage={deleteImage} />}
                    />
                    <Route
                      path="/events"
                      element={<EventManager storedImages={storedImages} addImage={addImage} deleteImage={deleteImage} />}
                    />
                    <Route
                      path="/create-character"
                      element={<EventManager storedImages={storedImages} addImage={addImage} deleteImage={deleteImage} />}
                    />
                    <Route
                      path="/maps"
                      element={
                        <ProtectedRoute>
                          <Maps />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/maps/editor"
                      element={
                        <ProtectedRoute adminOnly={true}>
                          <MapEditor storedImages={storedImages} addImage={addImage} deleteImage={deleteImage} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/backup"
                      element={
                        <ProtectedRoute adminOnly={true}>
                          <BackupManager />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </div>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
