import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMapReadOnly.css';

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

// Component to fit map bounds to route
function FitBounds({ startCoords, endCoords, route }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.length > 0) {
      // Create bounds from all route points
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (startCoords && endCoords) {
      // Fallback to just start and end markers
      const bounds = L.latLngBounds([
        [startCoords.lat, startCoords.lng],
        [endCoords.lat, endCoords.lng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, startCoords, endCoords, route]);

  return null;
}

function RouteMapReadOnly({ pickupLocation, dropLocation, distance, pickupCoordinates, dropCoordinates }) {
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  // Geocode address to coordinates
  const geocodeAddress = async (address) => {
    try {
      // Try with India country code first
      let response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=in`
      );
      let data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      
      // If no results, try without country code
      console.log('Retrying geocoding without country filter...');
      response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      
      // If still no results, try with just the main parts (first 2-3 parts)
      const parts = address.split(',').slice(0, 3).join(',').trim();
      if (parts !== address) {
        console.log('Retrying with simplified address:', parts);
        response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(parts)}&limit=1`
        );
        data = await response.json();
        
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Calculate route using OSRM
  const calculateRoute = async (start, end) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoute(coords);
      }
    } catch (error) {
      console.error('Route calculation error:', error);
    }
  };

  useEffect(() => {
    const loadMapData = async () => {
      setLoading(true);
      
      let start = pickupCoordinates;
      let end = dropCoordinates;

      // If coordinates not stored, try geocoding
      if (!start) {
        console.log('Geocoding pickup location:', pickupLocation);
        start = await geocodeAddress(pickupLocation);
        console.log('Start coordinates:', start);
      }
      
      if (!end) {
        console.log('Geocoding drop location:', dropLocation);
        end = await geocodeAddress(dropLocation);
        console.log('End coordinates:', end);
      }

      if (start && end) {
        setStartCoords(start);
        setEndCoords(end);
        await calculateRoute(start, end);
      } else {
        console.error('Failed to get coordinates. Start:', start, 'End:', end);
      }

      setLoading(false);
    };

    if (pickupLocation && dropLocation) {
      loadMapData();
    }
    // eslint-disable-next-line
  }, [pickupLocation, dropLocation, pickupCoordinates, dropCoordinates]);

  if (loading) {
    return (
      <div className="route-map-loading">
        <div className="spinner"></div>
        <p>Loading route map...</p>
      </div>
    );
  }

  if (!startCoords || !endCoords) {
    return (
      <div className="route-map-error">
        <p>Unable to display map for this route</p>
      </div>
    );
  }

  return (
    <div className="route-map-readonly">
      <div className="map-info-banner">
        <div className="map-info-item">
          <span className="info-icon">🟢</span>
          <span className="info-text">{pickupLocation}</span>
        </div>
        <div className="map-divider">→</div>
        <div className="map-info-item">
          <span className="info-icon">🔴</span>
          <span className="info-text">{dropLocation}</span>
        </div>
      </div>

      <div className="map-container-readonly">
        <MapContainer
          center={startCoords ? [startCoords.lat, startCoords.lng] : [20.5937, 78.9629]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
          scrollWheelZoom={false}
          boxZoom={false}
          keyboard={false}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds startCoords={startCoords} endCoords={endCoords} route={route} />

          <Marker position={[startCoords.lat, startCoords.lng]} icon={startIcon} />
          <Marker position={[endCoords.lat, endCoords.lng]} icon={endIcon} />

          {route && <Polyline positions={route} color="#0A84FF" weight={5} opacity={0.8} />}
        </MapContainer>

        <div className="map-readonly-overlay">
          <span>📍 Route Preview</span>
        </div>
      </div>
    </div>
  );
}

export default RouteMapReadOnly;
