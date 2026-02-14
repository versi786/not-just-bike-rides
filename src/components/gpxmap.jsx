import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import * as toGeoJSON from '@mapbox/togeojson';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons missing in Webpack/Gatsby builds
// (Leaflet's default icon paths are tricky with bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
  iconUrl: require('leaflet/dist/images/marker-icon.png').default,
  shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
});

// Custom Marker Icons using CSS
const startIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background-color: #2ecc71; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const endIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background-color: #e74c3c; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Helper component to auto-zoom the map to fit the track
const FitBounds = ({ data }) => {
  const map = useMap();

  useEffect(() => {
    if (data) {
      const geoJsonLayer = L.geoJSON(data);
      if (geoJsonLayer.getLayers().length > 0) {
        map.fitBounds(geoJsonLayer.getBounds(), { padding: [22, 22] });
      }
    }
  }, [data, map]);

  return null;
};

const GpxMap = ({ src, height = "400px" }) => {
  const [geoData, setGeoData] = useState(null);
  const [endpoints, setEndpoints] = useState({ start: null, end: null });
  const [rawStats, setRawStats] = useState({ distanceMeters: 0, elevationMeters: 0 });
  const [isMetric, setIsMetric] = useState(false);

  // 1. Re-add the feature handler for the track line/waypoints
  const onEachFeature = (feature, layer) => {
    if (feature.properties && (feature.properties.name || feature.properties.desc)) {
      const { name, desc } = feature.properties;
      layer.bindPopup(`
        <div style="font-family: sans-serif; font-size: 14px;">
          <strong>${name || 'Waypoint'}</strong>
          ${desc ? `<p style="margin: 4px 0 0;">${desc}</p>` : ''}
        </div>
      `);
    }
  };

  useEffect(() => {
    if (!src) return;
    fetch(src)
      .then(r => r.text())
      .then(str => {
        const gpx = new DOMParser().parseFromString(str, "text/xml");
        const converted = toGeoJSON.gpx(gpx);
        setGeoData(converted);

        const track = converted.features.find(f => f.geometry.type === 'LineString');
        if (track) {
          const coords = track.geometry.coordinates;
          let dist = 0;
          let ele = 0;

          for (let i = 0; i < coords.length - 1; i++) {
            const p1 = coords[i];
            const p2 = coords[i + 1];
            dist += L.latLng(p1[1], p1[0]).distanceTo(L.latLng(p2[1], p2[0]));
            if (p2[2] && p1[2]) {
              const diff = p2[2] - p1[2];
              if (diff > 0) ele += diff;
            }
          }

          setEndpoints({
            start: [coords[0][1], coords[0][0]],
            end: [coords[coords.length - 1][1], coords[coords.length - 1][0]]
          });
          setRawStats({ distanceMeters: dist, elevationMeters: ele });
        }
      });
  }, [src]);

  // Conversions
  const displayDist = isMetric 
    ? (rawStats.distanceMeters / 1000).toFixed(2) + " km"
    : (rawStats.distanceMeters * 0.000621371).toFixed(2) + " mi";

  const displayEle = isMetric
    ? Math.round(rawStats.elevationMeters) + " m"
    : Math.round(rawStats.elevationMeters * 3.28084) + " ft";

  if (typeof window === 'undefined') return <div style={{ height, background: '#eee' }} />;

  return (
    <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee' }}>
      <div style={{ height }}>
        <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {geoData && (
            <GeoJSON 
              data={geoData} 
              style={{ color: "#3498db", weight: 5 }} 
              onEachFeature={onEachFeature} // Attached here for track/waypoints
            />
          )}

          {/* 2. Added Popups explicitly to the custom Start/End Markers */}
          {endpoints.start && (
            <Marker position={endpoints.start} icon={startIcon}>
              <Popup>Start Point</Popup>
            </Marker>
          )}
          {endpoints.end && (
            <Marker position={endpoints.end} icon={endIcon}>
              <Popup>Finish Line</Popup>
            </Marker>
          )}

          <FitBounds data={geoData} />
        </MapContainer>
      </div>

      {/* Status Bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr auto', // Two equal columns and one auto for the button
        alignItems: 'center',
        padding: '12px 15px', 
        background: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        borderTop: '1px solid #eee'
      }}>
        {/* Distance Group */}
        <div style={{ textAlign: 'center', borderRight: '1px solid #eee' }}>
          <small style={{ display: 'block', color: '#888', textTransform: 'uppercase', fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>
            Distance
          </small>
          <div style={{ 
            fontWeight: '700', 
            fontSize: '16px', 
            color: '#222',
            fontVariantNumeric: 'tabular-nums' // Prevents numbers from shifting
          }}>
            {displayDist}
          </div>
        </div>
        
        {/* Elevation Group */}
        <div style={{ textAlign: 'center' }}>
          <small style={{ display: 'block', color: '#888', textTransform: 'uppercase', fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>
            Elevation Gain
          </small>
          <div style={{ 
            fontWeight: '700', 
            fontSize: '16px', 
            color: '#222',
            fontVariantNumeric: 'tabular-nums' // Prevents numbers from shifting
          }}>
            {displayEle}
          </div>
        </div>

        {/* Toggle Button Group */}
        <div style={{ paddingLeft: '15px' }}>
          <button 
            onClick={() => setIsMetric(!isMetric)}
            style={{
              background: '#f8f9fa',
              border: '1px solid #dcdcdc',
              borderRadius: '6px',
              width: '100px', // Fixed width for the button so it doesn't resize when text changes
              padding: '6px 0',
              fontSize: '10px',
              cursor: 'pointer',
              fontWeight: '700',
              color: '#666',
              textTransform: 'uppercase'
            }}
          >
            {isMetric ? 'Metric' : 'Imperial'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GpxMap;
