import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationMapPicker.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks
function LocationMarker({ onLocationSelect, markerType }) {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng, markerType);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={markerType === 'start' ? startIcon : endIcon}>
      <Popup>{markerType === 'start' ? 'Start Location' : 'Destination'}</Popup>
    </Marker>
  );
}

function LocationMapPicker({ onLocationChange }) {
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [startSearchResults, setStartSearchResults] = useState([]);
  const [endSearchResults, setEndSearchResults] = useState([]);
  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectingMarker, setSelectingMarker] = useState(null); // 'start' or 'end'
  const mapRef = useRef(null);

  // Geocode address to coordinates using Nominatim (OpenStreetMap)
  const geocodeAddress = async (address, isStart = true) => {
    if (address.length < 3) {
      isStart ? setStartSearchResults([]) : setEndSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=in`
      );
      const data = await response.json();
      isStart ? setStartSearchResults(data) : setEndSearchResults(data);
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat, lon, isStart = true) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
      isStart ? setStartAddress(address) : setEndAddress(address);
      return address;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      const fallback = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
      isStart ? setStartAddress(fallback) : setEndAddress(fallback);
      return fallback;
    }
  };

  // Calculate route using OSRM
  const calculateRoute = async (start, end) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoute(coords);
        setDistance((route.distance / 1000).toFixed(2)); // Convert to km
        setDuration(Math.round(route.duration / 60)); // Convert to minutes

        // Notify parent component
        if (onLocationChange) {
          onLocationChange({
            startLocation: start,
            endLocation: end,
            startAddress,
            endAddress,
            distance: (route.distance / 1000).toFixed(2),
            duration: Math.round(route.duration / 60),
            route: coords
          });
        }
      }
    } catch (error) {
      console.error('Route calculation error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle location selection from map click
  const handleLocationSelect = async (latlng, type) => {
    const location = { lat: latlng.lat, lng: latlng.lng };
    
    if (type === 'start') {
      setStartLocation(location);
      await reverseGeocode(latlng.lat, latlng.lng, true);
      setStartSearchResults([]);
    } else {
      setEndLocation(location);
      await reverseGeocode(latlng.lat, latlng.lng, false);
      setEndSearchResults([]);
    }

    setSelectingMarker(null);
  };

  // Handle search result selection
  const handleSearchSelect = async (result, isStart) => {
    const location = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    
    if (isStart) {
      setStartLocation(location);
      setStartAddress(result.display_name);
      setStartSearchResults([]);
    } else {
      setEndLocation(location);
      setEndAddress(result.display_name);
      setEndSearchResults([]);
    }

    // Pan map to selected location
    if (mapRef.current) {
      mapRef.current.flyTo([location.lat, location.lng], 13);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (startAddress && startSearchResults.length === 0 && !startLocation) {
        geocodeAddress(startAddress, true);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [startAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (endAddress && endSearchResults.length === 0 && !endLocation) {
        geocodeAddress(endAddress, false);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [endAddress]);

  // Calculate route when both locations are set
  useEffect(() => {
    if (startLocation && endLocation) {
      calculateRoute(startLocation, endLocation);
    } else {
      setRoute(null);
      setDistance(null);
      setDuration(null);
    }
    // eslint-disable-next-line
  }, [startLocation, endLocation]);

  return (
    <div className="location-map-picker">
      <div className="map-controls">
        <div className="location-input-group">
          <div className="input-wrapper">
            <label>Pickup Location</label>
            <input
              type="text"
              placeholder="Search or click on map..."
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
              className="location-input"
            />
            <button 
              type="button"
              className={`map-select-btn ${selectingMarker === 'start' ? 'active' : ''}`}
              onClick={() => setSelectingMarker(selectingMarker === 'start' ? null : 'start')}
            >
              {selectingMarker === 'start' ? '✓ Click Map' : 'Select on Map'}
            </button>
            {startSearchResults.length > 0 && (
              <div className="search-results">
                {startSearchResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="search-result-item"
                    onClick={() => handleSearchSelect(result, true)}
                  >
                    📍 {result.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="input-wrapper">
            <label>Drop-off Location</label>
            <input
              type="text"
              placeholder="Search or click on map..."
              value={endAddress}
              onChange={(e) => setEndAddress(e.target.value)}
              className="location-input"
            />
            <button 
              type="button"
              className={`map-select-btn ${selectingMarker === 'end' ? 'active' : ''}`}
              onClick={() => setSelectingMarker(selectingMarker === 'end' ? null : 'end')}
            >
              {selectingMarker === 'end' ? '✓ Click Map' : 'Select on Map'}
            </button>
            {endSearchResults.length > 0 && (
              <div className="search-results">
                {endSearchResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="search-result-item"
                    onClick={() => handleSearchSelect(result, false)}
                  >
                    📍 {result.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {distance && duration && (
          <div className="route-info">
            <div className="info-card">
              <span className="info-label">Distance</span>
              <span className="info-value">{distance} km</span>
            </div>
            <div className="info-card">
              <span className="info-label">Estimated Time</span>
              <span className="info-value">{duration} mins</span>
            </div>
            {loading && <div className="loading-indicator">Calculating route...</div>}
          </div>
        )}
      </div>

      <div className="map-container">
        <MapContainer
          center={[20.5937, 78.9629]} // Center of India
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {selectingMarker && (
            <LocationMarker
              onLocationSelect={handleLocationSelect}
              markerType={selectingMarker}
            />
          )}

          {startLocation && (
            <Marker position={[startLocation.lat, startLocation.lng]} icon={startIcon}>
              <Popup>
                <strong>Pickup Location</strong>
                <br />
                {startAddress}
              </Popup>
            </Marker>
          )}

          {endLocation && (
            <Marker position={[endLocation.lat, endLocation.lng]} icon={endIcon}>
              <Popup>
                <strong>Drop-off Location</strong>
                <br />
                {endAddress}
              </Popup>
            </Marker>
          )}

          {route && <Polyline positions={route} color="#0A84FF" weight={4} opacity={0.7} />}
        </MapContainer>

        {selectingMarker && (
          <div className="map-instruction">
            👆 Click on the map to select {selectingMarker === 'start' ? 'pickup' : 'drop-off'} location
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationMapPicker;
