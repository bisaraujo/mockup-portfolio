import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, ImageOverlay, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import mapService from '../services/mapService';
import './Maps.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom pin icon
const customIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `<svg width="32" height="40" viewBox="0 0 32 40">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
      </filter>
    </defs>
    <path 
      d="M16 0C7.163 0 0 7.163 0 16c0 13 16 24 16 24s16-11 16-24C32 7.163 24.837 0 16 0z" 
      fill="#e74c3c"
      filter="url(#shadow)"
    />
    <circle cx="16" cy="16" r="6" fill="white" />
  </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40]
});

// Component to manage map view and track viewport changes
function MapController({ bounds, savedViewport, onViewportChange, mapId }) {
  const map = useMap();
  const [hasRestoredView, setHasRestoredView] = useState(false);
  
  // Restore saved viewport or fit bounds on map change
  useEffect(() => {
    if (savedViewport && !hasRestoredView) {
      // Restore saved viewport position
      map.setView(savedViewport.center, savedViewport.zoom, { animate: false });
      setHasRestoredView(true);
    } else if (bounds && !savedViewport) {
      // No saved viewport, fit to bounds
      map.fitBounds(bounds);
    }
  }, [bounds, map, savedViewport, hasRestoredView]);
  
  // Reset hasRestoredView when map changes
  useEffect(() => {
    setHasRestoredView(false);
  }, [mapId]);
  
  // Track viewport changes
  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      onViewportChange({ center: [center.lat, center.lng], zoom });
    },
    zoomend: () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      onViewportChange({ center: [center.lat, center.lng], zoom });
    }
  });
  
  return null;
}

export default function Maps() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMapMenu, setShowMapMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({});
  const [mapViewports, setMapViewports] = useState({});

  useEffect(() => {
    loadMaps();
  }, []);

  // Detect image dimensions when map changes
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
    
    // Save selected map to localStorage whenever it changes
    if (selectedMap) {
      localStorage.setItem('lastViewedMapId', selectedMap.id);
    }
  }, [selectedMap]);

  const loadMaps = async () => {
    try {
      const data = await mapService.getAllMaps();
      setMaps(data);
      
      // Try to restore last viewed map from localStorage
      const savedMapId = localStorage.getItem('lastViewedMapId');
      const savedViewports = localStorage.getItem('mapViewports');
      
      if (savedViewports) {
        try {
          setMapViewports(JSON.parse(savedViewports));
        } catch (e) {
          console.error('Erro ao ler viewports salvos:', e);
        }
      }
      
      if (savedMapId && data.length > 0) {
        const lastMap = data.find(m => m.id === savedMapId);
        if (lastMap) {
          setSelectedMap(lastMap);
        } else {
          setSelectedMap(data[0]);
        }
      } else if (data.length > 0 && !selectedMap) {
        setSelectedMap(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar mapas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapSelect = (map) => {
    setSelectedMap(map);
    setShowMapMenu(false);
    setSearchTerm('');
    // Save selected map to localStorage
    localStorage.setItem('lastViewedMapId', map.id);
  };
  
  const handleViewportChange = (viewport) => {
    if (!selectedMap) return;
    
    // Update viewports state
    const newViewports = {
      ...mapViewports,
      [selectedMap.id]: viewport
    };
    setMapViewports(newViewports);
    
    // Save to localStorage (debounced by React's batch updates)
    localStorage.setItem('mapViewports', JSON.stringify(newViewports));
  };

  const handlePinNavigation = (linkedPageId) => {
    if (linkedPageId) {
      navigate(`/page/${linkedPageId}`);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const filteredPins = selectedMap?.pins?.filter(pin =>
    pin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pin.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate bounds for the map based on image dimensions
  const getMapBounds = (map) => {
    if (!map) return [[0, 0], [1000, 1000]]; // Fallback square bounds
    
    // Use stored dimensions, detected dimensions, or fallback
    let height = map.height;
    let width = map.width;
    
    if (!height || !width) {
      const detected = imageDimensions[map.id];
      if (detected) {
        height = detected.height;
        width = detected.width;
      } else {
        // Fallback to square bounds while image loads
        height = 1000;
        width = 1000;
      }
    }
    
    return [[0, 0], [height, width]];
  };

  if (loading) {
    return (
      <div className="maps-page-container">
        <div className="loading-message">Carregando mapas...</div>
      </div>
    );
  }

    if (maps.length === 0) {
    return (
      <div className="maps-page-container">
        <div className="maps-header">
          <h1>Mapas</h1>
        </div>
        <div className="no-maps">
          <div className="empty-state">
            <span className="empty-icon">Vazio</span>
            <h2>Nenhum mapa disponivel ainda</h2>
            {isAdmin && <p>Crie seu primeiro mapa para comecar!</p>}
          </div>
        </div>
      </div>
    );
  }

  const bounds = getMapBounds(selectedMap);

  return (
    <div className={`maps-page-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Top Banner with Map Title */}
      {selectedMap && !isFullscreen && (
        <div className="map-title-banner">
          <h1>{selectedMap.name}</h1>
          {selectedMap.description && (
            <p className="map-description">{selectedMap.description}</p>
          )}
        </div>
      )}

      {/* Search Bar - Top Left */}
      <div className="map-search-bar">
        <input
          type="text"
          placeholder="Buscar locais..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button 
            className="clear-search"
            onClick={() => setSearchTerm('')}
            title="Limpar busca"
          >
            X
          </button>
        )}
      </div>

      {/* Hamburger Menu Button - Left Side */}
      <div className="map-menu-button-container">
        <button 
          className="map-menu-button"
          onClick={() => setShowMapMenu(!showMapMenu)}
          title="Menu de mapas"
        >
          Menu
        </button>
      </div>

      {/* Maps Selection Side Menu */}
      {showMapMenu && (
        <>
          <div className="menu-overlay" onClick={() => setShowMapMenu(false)} />
          <div className="maps-side-menu">
            <div className="side-menu-header">
              <h2>Mapas disponiveis</h2>
              <button className="btn-close-menu" onClick={() => setShowMapMenu(false)}>X</button>
            </div>
            <div className="side-menu-content">
              {maps.map(map => (
                <button
                  key={map.id}
                  className={`map-menu-item ${selectedMap?.id === map.id ? 'active' : ''}`}
                  onClick={() => handleMapSelect(map)}
                >
                  <span className="map-menu-icon">Mapa</span>
                  <div className="map-menu-info">
                    <span className="map-menu-name">{map.name}</span>
                    {map.description && (
                      <span className="map-menu-desc">{map.description}</span>
                    )}
                  </div>
                </button>
              ))}
              
            </div>
          </div>
        </>
      )}

      {/* Fullscreen/Settings Button */}
      <div className="map-controls-container">
        <button 
          className="map-control-button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Sair' : 'Tela cheia'}
        >
          {isFullscreen ? 'Sair' : 'Tela cheia'}
        </button>
      </div>

      {/* Map Viewer */}
      {selectedMap && (
        <div className="map-viewer-container">
          <MapContainer
            crs={L.CRS.Simple}
            bounds={bounds}
            style={{ height: '100%', width: '100%', background: '#1a1a1e' }}
            minZoom={-2}
            maxZoom={2}
            zoomControl={true}
            attributionControl={false}
          >
            <MapController 
              bounds={bounds} 
              savedViewport={mapViewports[selectedMap.id]}
              onViewportChange={handleViewportChange}
              mapId={selectedMap.id}
            />
            
            {/* Image Overlay */}
            <ImageOverlay
              url={selectedMap.imageUrl}
              bounds={bounds}
            />

            {/* Markers/Pins */}
            {(searchTerm ? filteredPins : selectedMap.pins || []).map(pin => (
              <Marker
                key={pin.id}
                position={[pin.y, pin.x]}
                icon={customIcon}
              >
                <Popup className="custom-popup">
                  <div className="pin-popup-content">
                    <h3 className="pin-popup-title">{pin.name}</h3>
                    
                    {pin.description && (
                      <p className="pin-popup-description">{pin.description}</p>
                    )}
                    
                    {pin.linkedPageId && (
                      <button 
                        className="btn-view-page"
                        onClick={() => handlePinNavigation(pin.linkedPageId)}
                      >
                        Abrir nota
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Painel de resultados da busca */}
      {searchTerm && filteredPins.length > 0 && (
        <div className="search-results-panel">
          <div className="search-results-header">
            <h3>Resultados da busca ({filteredPins.length})</h3>
            <button onClick={() => setSearchTerm('')} className="btn-close-search">X</button>
          </div>
          <div className="search-results-list">
            {filteredPins.map(pin => (
              <div key={pin.id} className="search-result-item">
                <h4>{pin.name}</h4>
                {pin.description && <p>{pin.description}</p>}
                {pin.linkedPageId && (
                  <button 
                    className="btn-view-small"
                    onClick={() => handlePinNavigation(pin.linkedPageId)}
                  >
                    Abrir
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedMap && !loading && (
        <div className="no-map-selected">
          <p>Selecione um mapa no menu para comecar</p>
        </div>
      )}
    </div>
  );
}

