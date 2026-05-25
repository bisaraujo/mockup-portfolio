import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { characterService } from '../services/characterService';
import { useAuth } from '../contexts/AuthContext';
import HTMLEditor from '../components/HTMLEditor';
import ImageSelector from '../components/ImageSelector';
import { parseWikiLinks } from '../utils/wikiLinks';
import { sanitizeRenderedHtml } from '../utils/sanitizeHtml';
import { makeCustomCssHighPriority } from '../utils/customCssPriority';
import { API_BASE, API_URL } from '../config/apiConfig';
import './WikiPage.css';
import './CharacterPage.css';

export default function CharacterPage({ storedImages = [], addImage = async () => {}, deleteImage = async () => {} }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [character, setCharacter] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('page');
  const [showImageSelector, setShowImageSelector] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [customCSS, setCustomCSS] = useState('');
  const [folderPath, setFolderPath] = useState('Eventos');
  const [sidebar, setSidebar] = useState({ image: '', quote: '', infoFields: [] });
  
  // Diary state
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [newDiaryEntry, setNewDiaryEntry] = useState('');
  
  // Inventory state
  const [inventory, setInventory] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('');
  const [newItemAmount, setNewItemAmount] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventorySortBy, setInventorySortBy] = useState('name');
  const [inventorySortDir, setInventorySortDir] = useState('asc');

  // Coin counters
  const [cp, setCp] = useState(0);
  const [sp, setSp] = useState(0);
  const [gp, setGp] = useState(0);
  const [ep, setEp] = useState(0);
  
  // DM Notes state
  const [dmNotes, setDmNotes] = useState('');
  
  // Character sheet state
  const [characterSheetUrl, setCharacterSheetUrl] = useState('');

  // Scrapbook state
  const [scrapbook, setScrapbook] = useState([]);
  const [enlargedImage, setEnlargedImage] = useState(null);

  // HP states
  const [maxHp, setMaxHp] = useState(0);
  const [currentHp, setCurrentHp] = useState(0);
  const [tempHpEnabled, setTempHpEnabled] = useState(false);
  const [tempHp, setTempHp] = useState(0);

  const isOwner = character && user && character.ownerId === user.id;
  const isAdmin = user && user.role === 'admin';
  const canEdit = isOwner || isAdmin;

  useEffect(() => {
    loadCharacter();
    loadPages();
  }, [id]);

  // Handle wiki link clicks inside character content
  useEffect(() => {
    const handleWikiLinkClick = (e) => {
      if (e.target.classList.contains('wiki-link')) {
        e.preventDefault();
        let pageId = e.target.getAttribute('data-page-id');
        if (!pageId) {
          const href = e.target.getAttribute('href') || '';
          const match = href.match(/^\/page\/([^/?#]+)/);
          pageId = match ? match[1] : null;
        }
        if (pageId) {
          navigate(`/page/${pageId}`);
        }
      }
    };

    document.addEventListener('click', handleWikiLinkClick);
    return () => {
      document.removeEventListener('click', handleWikiLinkClick);
    };
  }, [navigate]);

  const loadCharacter = async () => {
    try {
      const data = await characterService.getCharacter(id);
      setCharacter(data);
      setName(data.name);
      setTitle(data.title || '');
      setContent(data.content || '');
      setCustomCSS(data.customCSS || '');
      setFolderPath(data.folderPath || 'Eventos');
      setSidebar(data.sidebar || { image: '', quote: '', infoFields: [] });
      setDiaryEntries(data.diary || []);
      setInventory(data.inventory || []);
      setDmNotes(data.dmNotes || '');
      setCharacterSheetUrl(data.characterSheet || '');
      setScrapbook(data.scrapbook || []);
      // HP values (optional fields on character)
      setMaxHp(data.maxHp || 0);
      setCurrentHp(typeof data.currentHp === 'number' ? data.currentHp : (data.currentHp || 0));
      setTempHpEnabled(Boolean(data.tempHpEnabled));
      setTempHp(data.tempHp || 0);
      // Coins (stored as data.coins or top-level fields)
      const coins = data.coins || {};
      setCp(typeof coins.cp === 'number' ? coins.cp : (typeof data.cp === 'number' ? data.cp : (coins.cp || 0)));
      setSp(typeof coins.sp === 'number' ? coins.sp : (typeof data.sp === 'number' ? data.sp : (coins.sp || 0)));
      setGp(typeof coins.gp === 'number' ? coins.gp : (typeof data.gp === 'number' ? data.gp : (coins.gp || 0)));
      setEp(typeof coins.ep === 'number' ? coins.ep : (typeof data.ep === 'number' ? data.ep : (coins.ep || 0)));
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
      alert('Nao foi possivel carregar o evento');
    } finally {
      setLoading(false);
    }
  };

  const loadPages = async () => {
    try {
      const response = await fetch(`${API_URL}/pages`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setPages(data);
      }
    } catch (error) {
      console.error('Erro ao carregar paginas:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const imageData = await addImage(file);
        setSidebar({ ...sidebar, image: imageData.url });
      } catch (error) {
        console.error('Erro ao enviar imagem:', error);
      }
    }
    e.target.value = '';
  };

  const handleSelectStoredImage = (imageUrl) => {
    setSidebar({ ...sidebar, image: imageUrl });
  };

  const handleSave = async () => {
    try {
      await characterService.updateCharacter(id, {
        name,
        title,
        content,
        customCSS,
        folderPath,
        sidebar
        , maxHp, currentHp, tempHpEnabled, tempHp
      });
      setEditing(false);
      await loadCharacter();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      alert('Nao foi possivel salvar o evento');
    }
  };

  // HP helpers — persist immediately
  const saveHp = async (fields) => {
    try {
      await characterService.updateCharacter(id, fields);
    } catch (err) {
      console.error('Falha ao salvar HP:', err);
    }
  };

  const changeCurrentHp = (delta) => {
    setCurrentHp((prev) => {
      const next = Math.max(0, Number(prev || 0) + delta);
      saveHp({ currentHp: next });
      return next;
    });
  };

  const changeTempHp = (delta) => {
    setTempHp((prev) => {
      const next = Math.max(0, Number(prev || 0) + delta);
      saveHp({ tempHp: next });
      return next;
    });
  };

  // Coin helpers — persist immediately
  const getCoinsObj = (override = {}) => ({
    cp: typeof override.cp === 'number' ? override.cp : cp,
    sp: typeof override.sp === 'number' ? override.sp : sp,
    gp: typeof override.gp === 'number' ? override.gp : gp,
    ep: typeof override.ep === 'number' ? override.ep : ep,
  });

  const saveCoins = async (override = {}) => {
    try {
      await characterService.updateCharacter(id, { coins: getCoinsObj(override) });
    } catch (err) {
      console.error('Falha ao salvar valores:', err);
    }
  };

  const changeCoin = (type, value) => {
    const v = Math.max(0, Number(value || 0));
    if (type === 'cp') setCp(v);
    if (type === 'sp') setSp(v);
    if (type === 'gp') setGp(v);
    if (type === 'ep') setEp(v);
    saveCoins({ [type]: v });
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza de que deseja excluir este evento?')) return;
    
    try {
      await characterService.deleteCharacter(id);
      navigate('/');
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      alert('Nao foi possivel excluir o evento');
    }
  };

  const handleAddDiaryEntry = async () => {
    if (!newDiaryEntry.trim()) return;
    
    try {
      if (canEdit) {
        const entry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          content: newDiaryEntry
        };
        const updatedDiary = [...diaryEntries, entry];
        await characterService.updateDiary(id, updatedDiary);
        setDiaryEntries(updatedDiary);
      } else {
        const result = await characterService.addPublicDiaryEntry(id, newDiaryEntry);
        if (Array.isArray(result?.diary)) {
          setDiaryEntries(result.diary);
        } else if (result?.entry) {
          setDiaryEntries([...diaryEntries, result.entry]);
        }
      }
      setNewDiaryEntry('');
    } catch (error) {
      console.error('Erro ao adicionar entrada da Comentario:', error);
      alert('Nao foi possivel adicionar a anotacao');
    }
  };

  const handleDeleteDiaryEntry = async (entryId) => {
    const updatedDiary = diaryEntries.filter(e => e.id !== entryId);
    
    try {
      await characterService.updateDiary(id, updatedDiary);
      setDiaryEntries(updatedDiary);
    } catch (error) {
      console.error('Erro ao excluir entrada da Comentario:', error);
      alert('Nao foi possivel excluir a anotacao');
    }
  };

  const handleAddInventoryItem = async () => {
    if (!newItemName.trim()) return;
    
    try {
      const newItem = await characterService.addInventoryItem(id, {
        name: newItemName,
        type: newItemType,
        amount: newItemAmount
      });
      
      setInventory([...inventory, newItem]);
      setNewItemName('');
      setNewItemType('');
      setNewItemAmount(1);
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      alert('Nao foi possivel adicionar o item');
    }
  };

  const handleUpdateInventoryItem = async (itemId, updates) => {
    try {
      const updatedItem = await characterService.updateInventoryItem(id, itemId, updates);
      setInventory(inventory.map(item => item.id === itemId ? updatedItem : item));
      setEditingItem(null);
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      alert('Nao foi possivel atualizar o item');
    }
  };

  const handleDeleteInventoryItem = async (itemId) => {
    try {
      await characterService.deleteInventoryItem(id, itemId);
      setInventory(inventory.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      alert('Nao foi possivel excluir o item');
    }
  };
  

  // Derived inventory list: filtered + sorted
  const displayedInventory = inventory
    .filter((item) => {
      if (!inventorySearch) return true;
      const q = inventorySearch.toLowerCase();
      return (item.name || '').toLowerCase().includes(q) || (item.type || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const dir = inventorySortDir === 'asc' ? 1 : -1;
      if (inventorySortBy === 'amount') {
        return (Number(a.amount || 0) - Number(b.amount || 0)) * dir;
      }
      const A = ((a[inventorySortBy] || '') + '').toLowerCase();
      const B = ((b[inventorySortBy] || '') + '').toLowerCase();
      if (A < B) return -1 * dir;
      if (A > B) return 1 * dir;
      return 0;
    });

  const handleSaveDMNotes = async () => {
    try {
      await characterService.updateDMNotes(id, dmNotes);
      alert('Notas internas salvas com sucesso');
    } catch (error) {
      console.error('Erro ao salvar notas internas:', error);
      alert('Nao foi possivel salvar as notas internas');
    }
  };

  const handleCharacterSheetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      alert('Envie um arquivo PDF');
      return;
    }
    
    try {
      const result = await characterService.uploadCharacterSheet(id, file);
      setCharacterSheetUrl(result.characterSheet);
      alert('ATA enviado com sucesso');
    } catch (error) {
      console.error('Erro ao enviar ATA:', error);
      alert('Nao foi possivel enviar o ATA');
    }
  };

  const handleScrapbookImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const imageData = await addImage(file);
      const newScrapbookEntry = {
        id: Date.now().toString(),
        url: imageData.url,
        caption: '',
        uploadedAt: new Date().toISOString()
      };
      
      const updatedScrapbook = [...scrapbook, newScrapbookEntry];
      await characterService.updateScrapbook(id, updatedScrapbook);
      setScrapbook(updatedScrapbook);
      e.target.value = '';
    } catch (error) {
      console.error('Erro ao enviar imagem da galeria:', error);
      alert('Nao foi possivel enviar a imagem');
    }
  };

  const handleSelectScrapbookImage = async (imageUrl) => {
    const newScrapbookEntry = {
      id: Date.now().toString(),
      url: imageUrl,
      caption: '',
      uploadedAt: new Date().toISOString()
    };
    
    try {
      const updatedScrapbook = [...scrapbook, newScrapbookEntry];
      await characterService.updateScrapbook(id, updatedScrapbook);
      setScrapbook(updatedScrapbook);
    } catch (error) {
      console.error('Erro ao adicionar imagem da galeria:', error);
      alert('Nao foi possivel adicionar a imagem');
    }
  };

  const handleUpdateCaption = async (imageId, caption) => {
    const updatedScrapbook = scrapbook.map(entry => 
      entry.id === imageId ? { ...entry, caption } : entry
    );
    
    try {
      await characterService.updateScrapbook(id, updatedScrapbook);
      setScrapbook(updatedScrapbook);
    } catch (error) {
      console.error('Erro ao atualizar legenda:', error);
      alert('Nao foi possivel atualizar a legenda');
    }
  };

  const handleDeleteScrapbookImage = async (imageId) => {
    if (!window.confirm('Remover esta imagem da galeria?')) return;
    
    const updatedScrapbook = scrapbook.filter(entry => entry.id !== imageId);
    
    try {
      await characterService.updateScrapbook(id, updatedScrapbook);
      setScrapbook(updatedScrapbook);
    } catch (error) {
      console.error('Erro ao excluir imagem da galeria:', error);
      alert('Nao foi possivel remover a imagem');
    }
  };

  const handleDownloadImage = (imageUrl, caption) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = caption || `imagem-galeria-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="wiki-page">Carregando...</div>;
  }

  if (!character) {
    return <div className="wiki-page">Evento nao encontrado</div>;
  }

  return (
    <div className="wiki-page character-page">
      <style>{makeCustomCssHighPriority(character.customCSS, '.custom-css-scope-character')}</style>
      <div className="custom-css-scope-character">
      
      <div className="character-header">
        <h1>{character.name}</h1>
        <p className="character-owner">Coordenador: {character.ownerName}</p>
        {canEdit && (
          <div className="character-actions">
            {!editing && <button onClick={() => setEditing(true)}>Editar evento</button>}
            <button onClick={handleDelete} className="delete-btn">Excluir evento</button>
          </div>
        )}
      </div>

      <div className="character-tabs">
        <button 
          className={activeTab === 'page' ? 'active' : ''}
          onClick={() => setActiveTab('page')}
        >
          Visao geral
        </button>
        <>
          <button 
            className={activeTab === 'diary' ? 'active' : ''}
            onClick={() => setActiveTab('diary')}
          >
            Comentario
          </button>
          <button 
            className={activeTab === 'inventory' ? 'active' : ''}
            onClick={() => setActiveTab('inventory')}
          >
            Checklist
          </button>
          <button 
            className={activeTab === 'scrapbook' ? 'active' : ''}
            onClick={() => setActiveTab('scrapbook')}
          >
            Galeria
          </button>
          <button 
            className={activeTab === 'sheet' ? 'active' : ''}
            onClick={() => setActiveTab('sheet')}
          >
            ATA
          </button>
        </>
        {isAdmin && (
          <button 
            className={activeTab === 'dm-notes' ? 'active' : ''}
            onClick={() => setActiveTab('dm-notes')}
          >
            Notas internas
          </button>
        )}
      </div>

      {activeTab === 'page' && (
        <div className="character-tab-content">
          {editing ? (
            <div className="edit-mode">
              <div className="edit-header">
                <h2 className="edit-title">Editando: {character.name}</h2>
              </div>

              <div className="edit-form">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">Nome do evento</label>
                  <input 
                    type="text"
                    id="name"
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    placeholder="Nome do evento"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="title" className="form-label">Titulo</label>
                  <input 
                    type="text"
                    id="title"
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    className="form-input"
                    placeholder="Subtitulo do evento"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="folderPath" className="form-label">Caminho da pasta</label>
                  <input 
                    type="text"
                    id="folderPath"
                    value={folderPath} 
                    onChange={(e) => setFolderPath(e.target.value)}
                    className="form-input"
                    placeholder="ex.: Eventos/2026/T3"
                  />
                  <small className="form-hint">Opcional: organize em pastas (use / para separar). Deixe vazio para a raiz.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="content" className="form-label">Conteudo (HTML habilitado)</label>
                  <HTMLEditor value={content} onChange={(e) => setContent(e.target.value)} />
                </div>

                <div className="form-group">
                  <label htmlFor="customCSS" className="form-label">CSS customizado (opcional)</label>
                  <textarea 
                    id="customCSS"
                    value={customCSS} 
                    onChange={(e) => setCustomCSS(e.target.value)}
                    className="form-textarea css-editor"
                    placeholder="Adicione CSS customizado apenas para esta pagina de evento...&#10;Exemplo:&#10;.page-title { color: #0f4f7f; }&#10;.content-box { border-radius: 16px; }"
                    rows={8}
                  />
                  <span className="form-hint">Este CSS sera aplicado apenas nesta pagina de evento</span>
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
                      value={sidebar.image} 
                      onChange={(e) => setSidebar({ ...sidebar, image: e.target.value })}
                      className="form-input"
                      placeholder="Digite a URL da imagem..."
                    />
                    {sidebar.image && (
                      <div className="image-preview">
                        <img src={sidebar.image} alt="Pre-visualizacao" />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="sidebar-quote" className="form-label">Citacao/nota da barra lateral</label>
                    <textarea 
                      id="sidebar-quote"
                      value={sidebar.quote} 
                      onChange={(e) => setSidebar({ ...sidebar, quote: e.target.value })}
                      className="form-textarea"
                      placeholder="Adicione uma citacao ou nota..."
                      rows={2}
                    />
                    <span className="form-hint">Citacao ou nota opcional exibida abaixo da imagem</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Campos de informacao</label>
                    {sidebar.infoFields?.map((field, index) => (
                      <div key={index} className="info-field-row">
                        <input 
                          type="text" 
                          value={field.label} 
                          onChange={(e) => {
                            const newFields = [...sidebar.infoFields];
                            newFields[index].label = e.target.value;
                            setSidebar({ ...sidebar, infoFields: newFields });
                          }}
                          className="form-input info-field-label"
                          placeholder="Rotulo (ex.: Data, Local, Responsavel)"
                        />
                        <input 
                          type="text" 
                          value={field.value} 
                          onChange={(e) => {
                            const newFields = [...sidebar.infoFields];
                            newFields[index].value = e.target.value;
                            setSidebar({ ...sidebar, infoFields: newFields });
                          }}
                          className="form-input info-field-value"
                          placeholder="Valor"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newFields = sidebar.infoFields.filter((_, i) => i !== index);
                            setSidebar({ ...sidebar, infoFields: newFields });
                          }}
                          className="btn btn-delete-small"
                        >
                          X
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSidebar({ 
                          ...sidebar, 
                          infoFields: [...(sidebar.infoFields || []), { label: '', value: '' }]
                        });
                      }}
                      className="btn btn-secondary btn-add-field"
                    >
                      + Adicionar campo de informacao
                    </button>
                  </div>
                </div>

                <div className="edit-actions">
                  <button onClick={handleSave} className="btn btn-primary">
                    Salvar alteracoes
                  </button>
                  <button onClick={() => setEditing(false)} className="btn btn-secondary">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="content-box">
              {(sidebar.image || sidebar.quote || (sidebar.infoFields && sidebar.infoFields.length > 0)) && (
                <div className="page-sidebar">
                  {sidebar.image && (
                    <div className="sidebar-image">
                      <img src={sidebar.image} alt={character.name} />
                    </div>
                  )}
                  {sidebar.quote && (
                    <div className="sidebar-quote">
                      {sidebar.quote}
                    </div>
                  )}
                  {sidebar.infoFields && sidebar.infoFields.length > 0 && (
                    <div className="sidebar-info">
                      {sidebar.infoFields.map((field, index) => (
                        <div key={index} className="sidebar-info-item">
                          <div className="sidebar-info-label">{field.label}</div>
                          <div className="sidebar-info-value">{field.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div>
                {character.title && <h2>{character.title}</h2>}
                <div 
                  className="page-content"
                  dangerouslySetInnerHTML={{ __html: sanitizeRenderedHtml(parseWikiLinks(character.content, pages)) }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'diary' && (
        <div className="character-tab-content diary-tab">
          <h2>Comentario</h2>
          
          <div className="diary-entry-form">
            <textarea 
              value={newDiaryEntry}
              onChange={(e) => setNewDiaryEntry(e.target.value)}
              placeholder="Adicione uma anotacao na Comentario..."
              rows={4}
            />
            <button onClick={handleAddDiaryEntry}>Adicionar anotacao</button>
          </div>

          <div className="diary-entries">
            {diaryEntries.map((entry) => (
              <div key={entry.id} className="diary-entry">
                <div className="diary-entry-header">
                  <span className="diary-date">
                    {new Date(entry.date).toLocaleDateString()}
                  </span>
                  {canEdit && <button onClick={() => handleDeleteDiaryEntry(entry.id)}>Excluir</button>}
                </div>
                <p>{entry.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="character-tab-content inventory-tab">
          <h2>Checklist</h2>

          <div className="inventory-controls">
            <input
              type="text"
              placeholder="Buscar itens do checklist..."
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              className="form-input"
              style={{ marginRight: '8px' }}
            />
            <div className="sort-group">
              <label style={{ marginRight: '6px' }}>Ordenar por:</label>
              <select className="sort-select" value={inventorySortBy} onChange={(e) => setInventorySortBy(e.target.value)}>
                <option value="name">Nome</option>
                <option value="type">Tipo</option>
                <option value="amount">Quantidade</option>
              </select>
              <button
                type="button"
                onClick={() => setInventorySortDir(inventorySortDir === 'asc' ? 'desc' : 'asc')}
                className="sort-direction-btn"
                title="Alternar direcao de ordenacao"
              >
                {inventorySortDir === 'asc' ? '?' : '?'}
              </button>
            </div>
          </div>

          <div className="coin-row">
            <label className="coin-label">Orcamento</label>
            <div className="coin-controls">
              <div className="coin-item">
                <label>Local</label>
                <input type="number" min="0" className="coin-input" value={cp} onChange={(e) => changeCoin('cp', Number(e.target.value))} disabled={!canEdit} />
              </div>
              <div className="coin-item">
                <label>Alimentacao</label>
                <input type="number" min="0" className="coin-input" value={sp} onChange={(e) => changeCoin('sp', Number(e.target.value))} disabled={!canEdit} />
              </div>
              <div className="coin-item">
                <label>Equipe</label>
                <input type="number" min="0" className="coin-input" value={gp} onChange={(e) => changeCoin('gp', Number(e.target.value))} disabled={!canEdit} />
              </div>
              <div className="coin-item">
                <label>Outros</label>
                <input type="number" min="0" className="coin-input" value={ep} onChange={(e) => changeCoin('ep', Number(e.target.value))} disabled={!canEdit} />
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="inventory-form">
              <input 
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Item do checklist"
              />
              <input 
                type="text"
                value={newItemType}
                onChange={(e) => setNewItemType(e.target.value)}
                placeholder="Categoria (ex.: Logistica, Marketing)"
              />
              <input 
                type="number"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(parseInt(e.target.value))}
                placeholder="Quantidade"
                min="1"
              />
              <button onClick={handleAddInventoryItem}>Adicionar item</button>
            </div>
          )}

          <table className="inventory-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoria</th>
                <th>Qtd</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {displayedInventory.map((item) => (
                <tr key={item.id}>
                  <td>
                    {canEdit && editingItem === item.id ? (
                      <input 
                        type="text"
                        defaultValue={item.name}
                        onBlur={(e) => handleUpdateInventoryItem(item.id, { name: e.target.value })}
                      />
                    ) : item.name}
                  </td>
                  <td>
                    {canEdit && editingItem === item.id ? (
                      <input 
                        type="text"
                        defaultValue={item.type}
                        onBlur={(e) => handleUpdateInventoryItem(item.id, { type: e.target.value })}
                      />
                    ) : item.type}
                  </td>
                  <td>
                    {canEdit && editingItem === item.id ? (
                      <input 
                        type="number"
                        defaultValue={item.amount}
                        onBlur={(e) => handleUpdateInventoryItem(item.id, { amount: parseInt(e.target.value) })}
                      />
                    ) : item.amount}
                  </td>
                  <td>
                    {canEdit && editingItem === item.id ? (
                      <button onClick={() => setEditingItem(null)}>Concluir</button>
                    ) : (
                      canEdit ? (
                        <>
                          <button onClick={() => setEditingItem(item.id)}>Editar</button>
                          <button onClick={() => handleDeleteInventoryItem(item.id)}>Excluir</button>
                        </>
                      ) : (
                        <span>Somente visualizacao</span>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sheet' && (() => {
        const sheetProxyUrl = `${API_BASE}/api/characters/${id}/character-sheet`
        return (
          <div className="character-tab-content sheet-tab">
            <h2>ATA</h2>

            {characterSheetUrl ? (
              <div>


                <div className="sheet-viewer">
                  <a href={sheetProxyUrl} target="_blank" rel="noopener noreferrer" >
                    Ver ATA (PDF)
                  </a>
                  <iframe
                    src={sheetProxyUrl}
                    className="sheet-iframe"
                    title="ATA"
                  />
                </div>
              </div>
            ) : (
              <p className="form-hint">Nenhum ATA foi enviado ainda.</p>
            )}

            {canEdit && (
              <div className="sheet-upload">
                <input 
                  type="file"
                  accept="application/pdf"
                  onChange={handleCharacterSheetUpload}
                />
                <p>Envie o ATA em PDF</p>
              </div>
            )}

            

           
          </div>
        )
      })()}

      {activeTab === 'scrapbook' && (
        <div className="character-tab-content scrapbook-tab">
          <h2>Galeria</h2>
          <p className="scrapbook-description">Envie e organize imagens relacionadas a este evento</p>
          
          {canEdit && <div className="scrapbook-upload">
            <input 
              type="file"
              id="scrapbook-image-upload"
              accept="image/*"
              onChange={handleScrapbookImageUpload}
              style={{ display: 'none' }}
            />
            <label htmlFor="scrapbook-image-upload" className="btn btn-primary">
              Enviar nova imagem
            </label>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowImageSelector(true)}
            >
              Ver imagens armazenadas
            </button>
          </div>}

          <div className="scrapbook-gallery">
            {scrapbook.length === 0 ? (
              <p className="scrapbook-empty">Nenhuma imagem ainda. Envie sua primeira imagem!</p>
            ) : (
              scrapbook.map((entry) => (
                <div key={entry.id} className="scrapbook-item">
                  <div 
                    className="scrapbook-image"
                    onClick={() => setEnlargedImage(entry)}
                    style={{ cursor: 'pointer' }}
                    title="Clique para ampliar"
                  >
                    <img src={entry.url} alt={entry.caption || 'Imagem da galeria'} />
                  </div>
                  <div className="scrapbook-caption">
                    <input 
                      type="text"
                      value={entry.caption}
                      readOnly={!canEdit}
                      onChange={(e) => handleUpdateCaption(entry.id, e.target.value)}
                      placeholder="Adicionar legenda..."
                    />
                  </div>
                  <div className="scrapbook-meta">
                    <span className="scrapbook-date">
                      {new Date(entry.uploadedAt).toLocaleDateString()}
                    </span>
                    <div className="scrapbook-actions">
                      <button 
                        onClick={() => handleDownloadImage(entry.url, entry.caption)}
                        className="btn-download"
                        title="Baixar imagem"
                      >
                        Baixar
                      </button>
                      {canEdit && (
                        <button 
                          onClick={() => handleDeleteScrapbookImage(entry.id)}
                          className="btn-delete-small"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'dm-notes' && isAdmin && (
        <div className="character-tab-content dm-notes-tab">
          <h2>Notas internas</h2>
          <p className="dm-notes-warning">Visivel apenas para administradores</p>
          
          <textarea 
            value={dmNotes}
            onChange={(e) => setDmNotes(e.target.value)}
            placeholder="Notas internas sobre este evento..."
            rows={10}
          />
          <button onClick={handleSaveDMNotes}>Salvar notas internas</button>
        </div>
      )}

      {showImageSelector && (
        <ImageSelector
          storedImages={storedImages}
          onSelect={(imageUrl) => {
            if (activeTab === 'scrapbook') {
              handleSelectScrapbookImage(imageUrl);
            } else {
              handleSelectStoredImage(imageUrl);
            }
            setShowImageSelector(false);
          }}
          onClose={() => setShowImageSelector(false)}
          deleteImage={deleteImage}
        />
      )}

      {enlargedImage && (
        <div className="image-lightbox-overlay" onClick={() => setEnlargedImage(null)}>
          <div className="image-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="lightbox-close"
              onClick={() => setEnlargedImage(null)}
              title="Fechar"
            >
              X
            </button>
            <img 
              src={enlargedImage.url} 
              alt={enlargedImage.caption || 'Imagem da galeria'} 
              className="lightbox-image"
            />
            {enlargedImage.caption && (
              <div className="lightbox-caption">{enlargedImage.caption}</div>
            )}
            <div className="lightbox-actions">
              <button 
                className="btn btn-primary"
                onClick={() => handleDownloadImage(enlargedImage.url, enlargedImage.caption)}
              >
                Baixar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

