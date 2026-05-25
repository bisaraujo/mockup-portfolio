import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, ImageOverlay, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import mapService from '../services/mapService';
import pageService from '../services/pageService';
import ImageSelector from '../components/ImageSelector';
import './MapEditor.css';

// Icone personalizado do marcador
const customIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `<svg width="32" height="40" viewBox="0 0 32 40">
    <path 
      d="M16 0C7.163 0 0 7.163 0 16c0 13 16 24 16 24s16-11 16-24C32 7.163 24.837 0 16 0z" 
      fill="#4a9eff"
    />
    <circle cx="16" cy="16" r="6" fill="white" />
  </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40]
});

// Componente que trata cliques no mapa ao adicionar marcadores
function MapClickHandler({ addingPinMode, onMapClick }) {
  useMapEvents({
    click(e) {
      console.log('MapClickHandler - clique detectado', { addingPinMode, latlng: e.latlng });
      if (addingPinMode) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

export default function MapEditor({ storedImages = [], addImage = async () => {}, deleteImage = async () => {} }) {
  const navigate = useNavigate();
  const [maps, setMaps] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [editingPin, setEditingPin] = useState(null);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [isCreatingMap, setIsCreatingMap] = useState(false);
  const [isEditingMapDetails, setIsEditingMapDetails] = useState(false);
  const [addingPinMode, setAddingPinMode] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [tempPinPosition, setTempPinPosition] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({});
  const [editImageLoadError, setEditImageLoadError] = useState(false);
  
  const [mapForm, setMapForm] = useState({
    name: '',
    imageUrl: '',
    description: '',
    width: null,
    height: null
  });

  const [editMapForm, setEditMapForm] = useState({
    name: '',
    imageUrl: '',
    description: '',
    width: null,
    height: null
  });

  const [pinForm, setPinForm] = useState({
    name: '',
    description: '',
    linkedPageId: '',
    x: 0,
    y: 0
  });

  useEffect(() => {
    loadMaps();
    loadPages();
  }, []);

  const loadMaps = async () => {
    try {
      const data = await mapService.getAllMaps();
      setMaps(data);
    } catch (error) {
      console.error('Erro ao carregar mapas:', error);
    }
  };

  const loadPages = async () => {
    try {
      const data = await pageService.getAllPages();
      setPages(data);
    } catch (error) {
      console.error('Erro ao carregar paginas:', error);
    }
  };

  // Obtem as dimensoes da imagem
  const getImageDimensions = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        resolve({ width: null, height: null }); // Sem valor padrao: usa a imagem real
      };
      img.src = url;
    });
  };

  const handleCreateMap = async (e) => {
    e.preventDefault();
    
    if (!mapForm.name || !mapForm.imageUrl) {
      alert('Informe um nome e uma imagem para o mapa');
      return;
    }

    try {
      // Obtem dimensoes da imagem
      const dimensions = await getImageDimensions(mapForm.imageUrl);
      
      const newMap = await mapService.createMap({
        ...mapForm,
        width: dimensions.width,
        height: dimensions.height
      });
      
      setMaps([...maps, newMap]);
      setMapForm({ name: '', imageUrl: '', description: '', width: null, height: null });
      setIsCreatingMap(false);
      setSelectedMap(newMap);
    } catch (error) {
      console.error('Erro ao criar mapa:', error);
      alert('Nao foi possivel criar o mapa');
    }
  };

  const handleUpdateMap = async () => {
    if (!selectedMap) return;

    try {
      const updated = await mapService.updateMap(selectedMap.id, selectedMap);
      setMaps(maps.map(m => m.id === updated.id ? updated : m));
      alert('Mapa atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar mapa:', error);
      alert('Nao foi possivel atualizar o mapa');
    }
  };

  const startEditingMapDetails = () => {
    if (!selectedMap) return;
    setEditMapForm({
      name: selectedMap.name,
      imageUrl: selectedMap.imageUrl,
      description: selectedMap.description || '',
      width: selectedMap.width,
      height: selectedMap.height
    });
    setEditImageLoadError(false);
    setIsEditingMapDetails(true);
  };

  const handleUpdateMapDetails = async (e) => {
    e.preventDefault();
    
    if (!editMapForm.name || !editMapForm.imageUrl) {
      alert('Informe um nome e uma imagem para o mapa');
      return;
    }

    try {
      // Se a imagem mudou, recalcula as dimensoes
      let dimensions = { width: editMapForm.width, height: editMapForm.height };
      if (editMapForm.imageUrl !== selectedMap.imageUrl) {
        dimensions = await getImageDimensions(editMapForm.imageUrl);
      }

      const updated = await mapService.updateMap(selectedMap.id, {
        ...editMapForm,
        width: dimensions.width,
        height: dimensions.height,
        pins: selectedMap.pins // Mantem os marcadores existentes
      });
      
      setMaps(maps.map(m => m.id === updated.id ? updated : m));
      setSelectedMap(updated);
      setIsEditingMapDetails(false);
      alert('Detalhes do mapa atualizados com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar detalhes do mapa:', error);
      alert('Nao foi possivel atualizar os detalhes do mapa');
    }
  };

  const handleDeleteMap = async (mapId) => {
    if (!confirm('Tem certeza de que deseja excluir este mapa? Esta acao nao pode ser desfeita.')) {
      return;
    }

    try {
      await mapService.deleteMap(mapId);
      setMaps(maps.filter(m => m.id !== mapId));
      if (selectedMap?.id === mapId) {
        setSelectedMap(null);
      }
    } catch (error) {
      console.error('Erro ao excluir mapa:', error);
      alert('Nao foi possivel excluir o mapa');
    }
  };

  const handleMapClick = (latlng) => {
    if (!addingPinMode || !selectedMap) return;

    console.log('Clique no mapa em:', latlng);
    
    // latlng.lat e coordenada Y, latlng.lng e coordenada X em CRS.Simple
    const newX = Math.round(latlng.lng * 100) / 100;
    const newY = Math.round(latlng.lat * 100) / 100;
    
    console.log('Definindo coordenadas do marcador:', { x: newX, y: newY });
    
    setPinForm({
      ...pinForm,
      x: newX,
      y: newY
    });
    
    // Define posicao temporaria do marcador para pre-visualizacao
    setTempPinPosition({ x: newX, y: newY });
    
    setAddingPinMode(false);
    
    // Rola ate o formulario do marcador
    setTimeout(() => {
      const pinForm = document.querySelector('.pin-editor-panel');
      if (pinForm) {
        pinForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleAddPin = async (e) => {
    e.preventDefault();
    
    if (!selectedMap || !pinForm.name) {
      alert('Informe um nome para o marcador');
      return;
    }

    console.log('Adicionando marcador com dados:', pinForm);

    try {
      const newPin = await mapService.addPin(selectedMap.id, pinForm);
      console.log('Marcador adicionado com sucesso:', newPin);
      
      const updatedMap = {
        ...selectedMap,
        pins: [...(selectedMap.pins || []), newPin]
      };
      setSelectedMap(updatedMap);
      setMaps(maps.map(m => m.id === updatedMap.id ? updatedMap : m));
      setPinForm({ name: '', description: '', linkedPageId: '', x: 0, y: 0 });
      setTempPinPosition(null);
      
      // Exibe mensagem de sucesso
      alert('Marcador adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar marcador:', error);
      alert('Nao foi possivel adicionar o marcador: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    
    if (!selectedMap || !editingPin) return;

    try {
      const updated = await mapService.updatePin(selectedMap.id, editingPin.id, pinForm);
      const updatedPins = selectedMap.pins.map(p => p.id === updated.id ? updated : p);
      const updatedMap = { ...selectedMap, pins: updatedPins };
      
      setSelectedMap(updatedMap);
      setMaps(maps.map(m => m.id === updatedMap.id ? updatedMap : m));
      setEditingPin(null);
      setPinForm({ name: '', description: '', linkedPageId: '', x: 0, y: 0 });
    } catch (error) {
      console.error('Erro ao atualizar marcador:', error);
      alert('Nao foi possivel atualizar o marcador');
    }
  };

  const handleDeletePin = async (pinId) => {
    if (!selectedMap || !confirm('Excluir este marcador?')) return;

    try {
      await mapService.deletePin(selectedMap.id, pinId);
      const updatedPins = selectedMap.pins.filter(p => p.id !== pinId);
      const updatedMap = { ...selectedMap, pins: updatedPins };
      
      setSelectedMap(updatedMap);
      setMaps(maps.map(m => m.id === updatedMap.id ? updatedMap : m));
      if (editingPin?.id === pinId) {
        setEditingPin(null);
        setPinForm({ name: '', description: '', linkedPageId: '', x: 0, y: 0 });
      }
    } catch (error) {
      console.error('Erro ao excluir marcador:', error);
      alert('Nao foi possivel excluir o marcador');
    }
  };

  const startEditingPin = (pin) => {
    setEditingPin(pin);
    setPinForm({
      name: pin.name,
      description: pin.description || '',
      linkedPageId: pin.linkedPageId || '',
      x: pin.x,
      y: pin.y
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const imageData = await addImage(file);
        setMapForm({ ...mapForm, imageUrl: imageData.url });
        setImageLoadError(false);
      } catch (error) {
        console.error('Erro ao enviar imagem:', error);
      }
    }
    e.target.value = '';
  };

  const handleEditImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const imageData = await addImage(file);
        setEditMapForm({ ...editMapForm, imageUrl: imageData.url });
        setEditImageLoadError(false);
      } catch (error) {
        console.error('Erro ao enviar imagem:', error);
      }
    }
    e.target.value = '';
  };

  const handleSelectStoredImage = (imageUrl, isEditMode = false) => {
    if (isEditMode) {
      setEditMapForm({ ...editMapForm, imageUrl });
      setEditImageLoadError(false);
    } else {
      setMapForm({ ...mapForm, imageUrl });
      setImageLoadError(false);
    }
    setShowImageSelector(false);
  };

  // Detecta dimensoes do mapa selecionado quando necessario
  useEffect(() => {
    if (selectedMap && selectedMap.imageUrl && !selectedMap.width && !selectedMap.height) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions(prev => ({
          ...prev,
          [selectedMap.id]: { width: img.naturalWidth, height: img.naturalHeight }
        }));
      };
      img.src = selectedMap.imageUrl;
    }
  }, [selectedMap]);

  const getMapBounds = (map) => {
    if (!map) return [[0, 0], [1000, 1000]];
    
    // Usa dimensoes salvas, detectadas ou fallback
    let height = map.height;
    let width = map.width;
    
    if (!height || !width) {
      const detected = imageDimensions[map.id];
      if (detected) {
        height = detected.height;
        width = detected.width;
      } else {
        // Fallback para limites quadrados enquanto a imagem carrega
        height = 1000;
        width = 1000;
      }
    }
    
    return [[0, 0], [height, width]];
  };

  return (
    <div className="map-editor-container">
      <div className="map-editor-header">
        <h1>Editor de mapas</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/')} className="btn btn-secondary">
            Voltar
          </button>
          <button onClick={() => setIsCreatingMap(true)} className="btn btn-primary">
            + Criar novo mapa
          </button>
        </div>
      </div>

      {isCreatingMap && (
        <div className="modal-overlay" onClick={() => setIsCreatingMap(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Criar novo mapa</h2>
              <button className="btn-close" onClick={() => setIsCreatingMap(false)}>X</button>
            </div>
            <form onSubmit={handleCreateMap} className="modal-form">
              <div className="form-group">
                <label className="form-label">Nome do mapa *</label>
                <input
                  type="text"
                  value={mapForm.name}
                  onChange={(e) => setMapForm({ ...mapForm, name: e.target.value })}
                  className="form-input"
                  placeholder="ex.: Mapa mundial, Mapa da cidade"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Imagem do mapa *</label>
                <div className="image-upload-container">
                  <input
                    type="file"
                    id="map-image-file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="file-input"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="map-image-file" className="btn btn-secondary upload-btn">
                    Enviar imagem
                  </label>
                  <button 
                    type="button"
                    className="btn btn-secondary upload-btn"
                    onClick={() => setShowImageSelector(true)}
                  >
                    Ver armazenadas
                  </button>
                </div>
                <input
                  type="text"
                  value={mapForm.imageUrl}
                  onChange={(e) => setMapForm({ ...mapForm, imageUrl: e.target.value })}
                  className="form-input"
                  placeholder="Ou informe a URL da imagem..."
                  required
                />
                {mapForm.imageUrl && !imageLoadError && (
                  <div className="image-preview">
                    <img 
                      src={mapForm.imageUrl} 
                      alt="Pre-visualizacao" 
                      onError={() => setImageLoadError(true)}
                    />
                  </div>
                )}
                {imageLoadError && (
                  <p className="error-message">Nao foi possivel carregar a imagem. Verifique a URL.</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Descricao</label>
                <textarea
                  value={mapForm.description}
                  onChange={(e) => setMapForm({ ...mapForm, description: e.target.value })}
                  className="form-textarea"
                  placeholder="Descricao opcional do mapa..."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Criar mapa</button>
                <button type="button" onClick={() => setIsCreatingMap(false)} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de edicao de detalhes do mapa */}
      {isEditingMapDetails && (
        <div className="modal-overlay" onClick={() => setIsEditingMapDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar detalhes do mapa</h2>
              <button className="btn-close" onClick={() => setIsEditingMapDetails(false)}>X</button>
            </div>
            <form onSubmit={handleUpdateMapDetails} className="modal-form">
              <div className="form-group">
                <label className="form-label">Nome do mapa *</label>
                <input
                  type="text"
                  value={editMapForm.name}
                  onChange={(e) => setEditMapForm({ ...editMapForm, name: e.target.value })}
                  className="form-input"
                  placeholder="ex.: Mapa mundial, Mapa da cidade"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Imagem do mapa *</label>
                <div className="image-upload-container">
                  <input
                    type="file"
                    id="edit-map-image-file"
                    accept="image/*"
                    onChange={handleEditImageUpload}
                    className="file-input"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="edit-map-image-file" className="btn btn-secondary upload-btn">
                    Enviar imagem
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary upload-btn"
                    onClick={() => setShowImageSelector(true)}
                  >
                    Ver armazenadas
                  </button>
                </div>
                <input
                  type="text"
                  value={editMapForm.imageUrl}
                  onChange={(e) => setEditMapForm({ ...editMapForm, imageUrl: e.target.value })}
                  className="form-input"
                  placeholder="Ou informe a URL da imagem..."
                  required
                />
                {editMapForm.imageUrl && !editImageLoadError && (
                  <div className="image-preview">
                    <img 
                      src={editMapForm.imageUrl} 
                      alt="Pre-visualizacao" 
                      onError={() => setEditImageLoadError(true)}
                    />
                  </div>
                )}
                {editImageLoadError && (
                  <p className="error-message">Nao foi possivel carregar a imagem. Verifique a URL.</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Descricao</label>
                <textarea
                  value={editMapForm.description}
                  onChange={(e) => setEditMapForm({ ...editMapForm, description: e.target.value })}
                  className="form-textarea"
                  placeholder="Descricao opcional do mapa..."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Atualizar mapa</button>
                <button type="button" onClick={() => setIsEditingMapDetails(false)} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="editor-layout">
        <div className="maps-sidebar">
          <h2>Seus mapas</h2>
          {maps.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum mapa criado ainda.</p>
              <p className="hint-text">Crie seu primeiro mapa!</p>
            </div>
          ) : (
            <div className="maps-list">
              {maps.map(map => (
                <div 
                  key={map.id} 
                  className={`map-list-item ${selectedMap?.id === map.id ? 'active' : ''}`}
                  onClick={() => setSelectedMap(map)}
                >
                  <img src={map.imageUrl} alt={map.name} className="map-thumbnail" />
                  <div className="map-info">
                    <h3>{map.name}</h3>
                    <p className="pin-count"> {map.pins?.length || 0} marcadores</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMap(map.id);
                    }}
                    className="btn-delete-map"
                    title="Excluir mapa"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="editor-main">
          {selectedMap ? (
            <>
              <div className="editor-toolbar">
                <h2>Editando: {selectedMap.name}</h2>
                <div className="toolbar-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={startEditingMapDetails}
                  >
                    Editar detalhes do mapa
                  </button>
                  <button
                    className={`btn ${addingPinMode ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => setAddingPinMode(!addingPinMode)}
                  >
                    {addingPinMode ? 'Clique no mapa para posicionar o marcador' : '+ Adicionar marcador'}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleUpdateMap}
                  >
                    Salvar alteracoes
                  </button>
                </div>
              </div>

              {addingPinMode && (
                <div className="instruction-banner">
                  Clique em qualquer ponto do mapa para posicionar seu marcador
                </div>
              )}

              <div className="map-editor-view">
                <MapContainer
                  crs={L.CRS.Simple}
                  bounds={getMapBounds(selectedMap)}
                  style={{ 
                    height: '600px', 
                    width: '100%', 
                    background: '#1a1a1e',
                    border: '2px solid #3a3a3e',
                    borderRadius: '0.5rem',
                    cursor: addingPinMode ? 'crosshair' : 'grab'
                  }}
                  minZoom={-2}
                  maxZoom={2}
                  zoomControl={true}
                  attributionControl={false}
                >
                  <MapClickHandler addingPinMode={addingPinMode} onMapClick={handleMapClick} />
                  
                  <ImageOverlay
                    url={selectedMap.imageUrl}
                    bounds={getMapBounds(selectedMap)}
                  />

                  {selectedMap.pins?.map(pin => (
                    <Marker
                      key={pin.id}
                      position={[pin.y, pin.x]}
                      icon={customIcon}
                      eventHandlers={{
                        click: () => startEditingPin(pin)
                      }}
                    >
                      <Popup>
                        <div className="editor-popup">
                          <strong>{pin.name}</strong>
                          <br />
                          <small>Clique para editar</small>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  
                  {/* Pre-visualizacao temporaria do marcador */}
                  {tempPinPosition && (
                    <Marker
                      position={[tempPinPosition.y, tempPinPosition.x]}
                      icon={L.divIcon({
                        className: 'temp-pin',
                        html: `<svg width="32" height="40" viewBox="0 0 32 40" style="opacity: 0.6;">
                          <path 
                            d="M16 0C7.163 0 0 7.163 0 16c0 13 16 24 16 24s16-11 16-24C32 7.163 24.837 0 16 0z" 
                            fill="#ffd700"
                          />
                          <circle cx="16" cy="16" r="6" fill="white" />
                        </svg>`,
                        iconSize: [32, 40],
                        iconAnchor: [16, 40],
                        popupAnchor: [0, -40]
                      })}
                    >
                      <Popup>
                        <div className="editor-popup">
                          <strong>Pre-visualizacao do novo marcador</strong>
                          <br />
                          <small>Preencha os detalhes abaixo</small>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>

                {addingPinMode && (
                  <div className="instruction-banner">
                    Clique em qualquer ponto do mapa para posicionar um novo marcador
                  </div>
                )}
              </div>

              <div className="pin-editor-panel">
                <h3>{editingPin ? 'Editar marcador' : 'Adicionar novo marcador'}</h3>
                {tempPinPosition && !editingPin && (
                  <div className="pin-placed-notification">
                    Marcador posicionado em ({tempPinPosition.x.toFixed(2)}, {tempPinPosition.y.toFixed(2)})
                  </div>
                )}
                <form onSubmit={editingPin ? handleUpdatePin : handleAddPin} className="pin-form">
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label className="form-label">Nome do marcador *</label>
                      <input
                        type="text"
                        value={pinForm.name}
                        onChange={(e) => setPinForm({ ...pinForm, name: e.target.value })}
                        className="form-input"
                        placeholder="Nome do local"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Coordenadas (X, Y)</label>
                      <div className="position-inputs">
                        <input
                          type="number"
                          step="0.01"
                          value={pinForm.x}
                          onChange={(e) => setPinForm({ ...pinForm, x: parseFloat(e.target.value) || 0 })}
                          className="form-input"
                          placeholder="X"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={pinForm.y}
                          onChange={(e) => setPinForm({ ...pinForm, y: parseFloat(e.target.value) || 0 })}
                          className="form-input"
                          placeholder="Y"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Descricao</label>
                    <textarea
                      value={pinForm.description}
                      onChange={(e) => setPinForm({ ...pinForm, description: e.target.value })}
                      className="form-textarea"
                      placeholder="Breve descricao deste local..."
                      rows="2"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Link para pagina de nota</label>
                    <select
                      value={pinForm.linkedPageId}
                      onChange={(e) => setPinForm({ ...pinForm, linkedPageId: e.target.value })}
                      className="form-input"
                    >
                      <option value="">Sem link</option>
                      {pages.map(page => (
                        <option key={page.id} value={page.id}>
                          {page.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      {editingPin ? 'Atualizar marcador' : 'Adicionar marcador'}
                    </button>
                    {editingPin && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPin(null);
                            setPinForm({ name: '', description: '', linkedPageId: '', x: 0, y: 0 });
                          }}
                          className="btn btn-secondary"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePin(editingPin.id)}
                          className="btn btn-danger"
                        >
                          Excluir marcador
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <span className="empty-icon">Sem dados</span>
              <h2>Selecione um mapa para editar</h2>
              <p>Escolha um mapa na barra lateral esquerda ou crie um novo</p>
            </div>
          )}
        </div>
      </div>

      {showImageSelector && (
        <ImageSelector
          storedImages={storedImages}
          onSelect={(url) => handleSelectStoredImage(url, isEditingMapDetails)}
          onClose={() => setShowImageSelector(false)}
          deleteImage={deleteImage}
        />
      )}
    </div>
  );
}
