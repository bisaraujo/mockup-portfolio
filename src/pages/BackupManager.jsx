import { useState } from 'react'
import './BackupManager.css'

const API_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : ''
const CLEAR_CONFIRM_TEXT = 'APAGAR TUDO'

const BackupManager = () => {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreFile, setRestoreFile] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)
  const [showClearConfirm1, setShowClearConfirm1] = useState(false)
  const [showClearConfirm2, setShowClearConfirm2] = useState(false)
  const [clearConfirmText, setClearConfirmText] = useState('')

  const handleCreateBackup = async () => {
    try {
      setIsCreatingBackup(true)
      setMessage({ type: '', text: '' })

      const response = await fetch(`${API_URL}/api/backup/create`, {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Falha ao criar backup')
      }

      const blob = await response.blob()

      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'backup-wiki.zip'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMessage({ type: 'success', text: 'Backup criado e baixado com sucesso.' })
    } catch (error) {
      console.error('Erro ao criar backup:', error)
      setMessage({ type: 'error', text: 'Falha ao criar backup. Tente novamente.' })
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.zip')) {
      setMessage({ type: 'error', text: 'Selecione um arquivo de backup valido (.zip).' })
      setRestoreFile(null)
      return
    }

    setRestoreFile(file)
    setMessage({ type: '', text: '' })
  }

  const handleRestoreClick = () => {
    if (!restoreFile) {
      setMessage({ type: 'error', text: 'Selecione um arquivo de backup primeiro.' })
      return
    }
    setShowRestoreConfirm(true)
  }

  const handleRestoreConfirm = async () => {
    try {
      setIsRestoring(true)
      setShowRestoreConfirm(false)
      setMessage({ type: '', text: '' })

      const formData = new FormData()
      formData.append('backup', restoreFile)

      const response = await fetch(`${API_URL}/api/backup/restore`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      let data
      const contentType = response.headers.get('content-type')

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        console.error('Resposta nao JSON:', text.substring(0, 500))
        throw new Error('Erro do servidor: formato de resposta invalido.')
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Falha ao restaurar backup.')
      }

      setMessage({
        type: 'success',
        text: `Backup restaurado com sucesso. Restaurado: ${data.restoredData.pages} paginas, ${data.restoredData.users} usuarios, ${data.restoredData.characters} eventos, ${data.restoredData.maps} mapas e ${data.restoredData.images} imagens.`
      })
      setRestoreFile(null)

      setTimeout(() => {
        if (window.confirm('Backup restaurado. Deseja recarregar a pagina para ver as alteracoes?')) {
          window.location.reload()
        }
      }, 1500)
    } catch (error) {
      console.error('Erro ao restaurar backup:', error)
      setMessage({ type: 'error', text: error.message || 'Falha ao restaurar backup. Tente novamente.' })
    } finally {
      setIsRestoring(false)
    }
  }

  const handleRestoreCancel = () => {
    setShowRestoreConfirm(false)
  }

  const handleClearAllClick = () => {
    setMessage({ type: '', text: '' })
    setShowClearConfirm1(true)
  }

  const handleClearConfirm1 = () => {
    setShowClearConfirm1(false)
    setShowClearConfirm2(true)
  }

  const handleClearConfirm2 = async () => {
    if (clearConfirmText.toUpperCase() !== CLEAR_CONFIRM_TEXT) {
      setMessage({ type: 'error', text: `Texto de confirmacao invalido. Digite "${CLEAR_CONFIRM_TEXT}" exatamente.` })
      return
    }

    try {
      setIsClearingAll(true)
      setShowClearConfirm2(false)
      setMessage({ type: '', text: '' })

      const response = await fetch(`${API_URL}/api/backup/clear-all`, {
        method: 'POST',
        credentials: 'include'
      })

      let data
      const contentType = response.headers.get('content-type')

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        console.error('Resposta nao JSON:', text.substring(0, 500))
        throw new Error('Erro do servidor: formato de resposta invalido.')
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Falha ao limpar dados.')
      }

      setMessage({
        type: 'success',
        text: `Todos os dados foram apagados. Um backup de seguranca foi criado. Removido: ${data.cleared.pages} paginas, ${data.cleared.characters} eventos, ${data.cleared.maps} mapas e ${data.cleared.images} imagens.`
      })
      setClearConfirmText('')

      setTimeout(() => {
        if (window.confirm('Os dados foram apagados. Deseja recarregar a pagina?')) {
          window.location.reload()
        }
      }, 2000)
    } catch (error) {
      console.error('Erro ao limpar dados:', error)
      setMessage({ type: 'error', text: error.message || 'Falha ao limpar dados. Tente novamente.' })
    } finally {
      setIsClearingAll(false)
    }
  }

  const handleClearCancel = () => {
    setShowClearConfirm1(false)
    setShowClearConfirm2(false)
    setClearConfirmText('')
  }

  return (
    <div className="backup-manager">
      <div className="backup-manager-header">
        <h1 className="backup-title">Backup e restauracao</h1>
        <p className="backup-subtitle">Gerencie os dados criando backups e restaurando copias anteriores.</p>
      </div>

      {message.text && (
        <div className={`backup-message ${message.type}`}>
          <span className="message-icon">{message.type === 'success' ? 'OK' : '!'}</span>
          <span className="message-text">{message.text}</span>
        </div>
      )}

      <div className="backup-sections">
        <div className="backup-section">
          <div className="section-header">
            <h2 className="section-title">Criar backup</h2>
            <span className="section-icon">BK</span>
          </div>
          <p className="section-description">
            Gera um backup completo com paginas, usuarios, eventos, mapas e imagens.
          </p>
          <div className="section-actions">
            <button className="btn btn-primary" onClick={handleCreateBackup} disabled={isCreatingBackup}>
              {isCreatingBackup ? (
                <>
                  <span className="spinner" />
                  Criando backup...
                </>
              ) : (
                <>Criar e baixar backup</>
              )}
            </button>
          </div>
          <div className="section-info">
            <strong>Inclui:</strong>
            <ul>
              <li>Todas as paginas e conteudos</li>
              <li>Contas de usuario (senhas criptografadas)</li>
              <li>Eventos e dados relacionados</li>
              <li>Mapas e marcadores</li>
              <li>Imagens enviadas</li>
            </ul>
          </div>
        </div>

        <div className="backup-section restore-section">
          <div className="section-header">
            <h2 className="section-title">Restaurar backup</h2>
            <span className="section-icon">RS</span>
          </div>
          <p className="section-description">
            Restaura os dados a partir de um arquivo de backup anterior.
          </p>
          <div className="section-warning">
            <span className="warning-icon">!</span>
            <strong>Aviso:</strong> a restauracao substitui os dados atuais. Um backup de seguranca sera criado antes.
          </div>
          <div className="section-actions">
            <div className="file-input-wrapper">
              <input
                type="file"
                id="backup-file"
                accept=".zip"
                onChange={handleFileSelect}
                disabled={isRestoring}
                className="file-input"
              />
              <label htmlFor="backup-file" className="btn btn-secondary">
                {restoreFile ? restoreFile.name : 'Escolher arquivo de backup'}
              </label>
            </div>
            <button className="btn btn-danger" onClick={handleRestoreClick} disabled={isRestoring || !restoreFile}>
              {isRestoring ? (
                <>
                  <span className="spinner" />
                  Restaurando...
                </>
              ) : (
                <>Restaurar backup</>
              )}
            </button>
          </div>
        </div>

        <div className="backup-section danger-section">
          <div className="section-header">
            <h2 className="section-title">Limpar todos os dados</h2>
            <span className="section-icon">X</span>
          </div>
          <p className="section-description">
            Exclui permanentemente o conteudo da wiki, mantendo apenas a conta de administrador.
          </p>
          <div className="section-danger">
            <span className="warning-icon">!</span>
            <strong>Perigo:</strong> esta acao apaga paginas, eventos, mapas, imagens e usuarios comuns.
          </div>
          <div className="section-actions">
            <button className="btn btn-destruc" onClick={handleClearAllClick} disabled={isClearingAll}>
              {isClearingAll ? (
                <>
                  <span className="spinner" />
                  Limpando dados...
                </>
              ) : (
                <>Limpar todos os dados</>
              )}
            </button>
          </div>
          <div className="section-info">
            <strong>O que sera removido:</strong>
            <ul>
              <li>Paginas e conteudos</li>
              <li>Eventos</li>
              <li>Mapas e marcadores</li>
              <li>Imagens enviadas</li>
              <li>Usuarios nao administradores</li>
            </ul>
            <strong>Protecoes:</strong>
            <ul>
              <li>Backup automatico antes da limpeza</li>
              <li>Confirmacao em duas etapas</li>
              <li>Conta admin preservada</li>
            </ul>
          </div>
        </div>
      </div>

      {showRestoreConfirm && (
        <div className="modal-overlay" onClick={handleRestoreCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar restauracao</h2>
            </div>
            <div className="modal-body">
              <p>Tem certeza de que deseja restaurar este backup?</p>
              <p className="modal-warning">
                <strong>Esta acao vai:</strong>
              </p>
              <ul>
                <li>Substituir paginas, usuarios, eventos, mapas e imagens atuais</li>
                <li>Criar um backup automatico dos dados atuais antes de restaurar</li>
                <li>Exigir nova restauracao para desfazer a operacao</li>
              </ul>
              <p>
                Arquivo selecionado: <strong>{restoreFile?.name}</strong>
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleRestoreCancel}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleRestoreConfirm}>
                Restaurar backup
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm1 && (
        <div className="modal-overlay" onClick={handleClearCancel}>
          <div className="modal-content modal-danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmacao de limpeza</h2>
            </div>
            <div className="modal-body">
              <p className="modal-danger-text">
                <strong>Esta e uma acao destrutiva.</strong>
              </p>
              <p>Voce esta prestes a excluir todo o conteudo da wiki:</p>
              <ul>
                <li>Todas as paginas</li>
                <li>Todos os eventos</li>
                <li>Todos os mapas</li>
                <li>Todas as imagens</li>
                <li>Todos os usuarios comuns</li>
              </ul>
              <p className="modal-warning">
                Um backup de seguranca sera criado no servidor antes da exclusao.
              </p>
              <p>
                <strong>Tem certeza de que deseja continuar?</strong>
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleClearCancel}>
                Cancelar (Recomendado)
              </button>
              <button className="btn btn-warning" onClick={handleClearConfirm1}>
                Sim, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm2 && (
        <div className="modal-overlay" onClick={handleClearCancel}>
          <div className="modal-content modal-danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmacao final</h2>
            </div>
            <div className="modal-body">
              <p className="modal-danger-text">
                <strong>Ultima chance de cancelar.</strong>
              </p>
              <p>Esta acao nao pode ser desfeita pela interface.</p>
              <p className="modal-warning">
                Para confirmar, digite <strong>{CLEAR_CONFIRM_TEXT}</strong> abaixo:
              </p>
              <input
                type="text"
                className="confirm-input"
                placeholder={`Digite ${CLEAR_CONFIRM_TEXT} aqui`}
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleClearCancel}>
                Cancelar (Recomendado)
              </button>
              <button
                className="btn btn-destruc"
                onClick={handleClearConfirm2}
                disabled={clearConfirmText.toUpperCase() !== CLEAR_CONFIRM_TEXT}
              >
                Excluir todos os dados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BackupManager
