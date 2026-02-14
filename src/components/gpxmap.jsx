import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import * as toGeoJSON from '@mapbox/togeojson';
import html2canvas from 'html2canvas'; 
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
        const paddingValue = map.getSize().x * 0.075; // 7.5%
        map.fitBounds(geoJsonLayer.getBounds(), { padding: [paddingValue, paddingValue] });      
      }
    }
  }, [data, map]);

  return null;
};


const GpxMap = ({ src }) => {
  const [geoData, setGeoData] = useState(null);
  const [endpoints, setEndpoints] = useState({ start: null, end: null });
  const [rawStats, setRawStats] = useState({ distanceMeters: 0, elevationMeters: 0 });
  const [isMetric, setIsMetric] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // 1. Ref specifically for the Map container (to exclude stats)
  const mapContainerRef = useRef(null);

  // ... (Keep onEachFeature, useEffect for fetching, and stats calculation exactly the same)
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

  const displayDist = isMetric 
    ? (rawStats.distanceMeters / 1000).toFixed(2) + " km"
    : (rawStats.distanceMeters * 0.000621371).toFixed(2) + " mi";

  const displayEle = isMetric
    ? Math.round(rawStats.elevationMeters) + " m"
    : Math.round(rawStats.elevationMeters * 3.28084) + " ft";

  if (typeof window === 'undefined') return <div style={{ height: '400px', background: '#eee' }} />;

  const handleDownloadImage = async () => {
    if (mapContainerRef.current) {
      setIsDownloading(true);
      try {
        const canvas = await html2canvas(mapContainerRef.current, {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          // The "onclone" hook allows us to modify the temporary DOM used for the screenshot
          onclone: (clonedDoc) => {
            // 1. Hide the Zoom Controls (+/- buttons)
            const zoomControls = clonedDoc.querySelector('.leaflet-control-zoom');
            if (zoomControls) {
              zoomControls.style.display = 'none';
            }

            // 2. Hide the Leaflet Attribution (optional, but makes it cleaner)
            const attribution = clonedDoc.querySelector('.leaflet-control-attribution');
            if (attribution) {
              attribution.style.display = 'none';
            }

            // 3. Fix the Track Offset (Keep this from the previous fix)
            const mapPane = clonedDoc.querySelector('.leaflet-map-pane');
            if (mapPane) {
              mapPane.style.transform = 'none';
            }
          }
        });

        const link = document.createElement('a');
        link.download = `route-map-square.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error("Screenshot failed:", err);
      }
      setIsDownloading(false);
    }
  };
  // https://github.com/CartoDB/basemap-styles/tree/master
  const attribution = 'Positron: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  return (
    <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee', background: 'white' }}>
      
      {/* 2. Map Container: Added Ref here + aspectRatio: '1' */}
      <div 
        ref={mapContainerRef} 
        style={{ 
          width: '100%', 
          aspectRatio: '4 / 5',  
          position: 'relative'   // Helpful for stacking context
        }}
      >
          <MapContainer 
            center={[0, 0]} 
            zoom={2} 
            preferCanvas={true} 
            // Disable animations to prevent "ghosting" or offsets during capture
            zoomAnimation={false}
            fadeAnimation={false}
            markerZoomAnimation={false}
            style={{ height: '100%', width: '100%' }}        
            zoomSnap={0.1}     // Allows the map to stop at 12.1, 12.2, etc.
            zoomDelta={0.1}    // Makes manual zooming smoother
            wheelPxPerZoomLevel={60} // Adjusts scroll sensitivity for fractional zoom
          >
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
            crossOrigin="anonymous" 
            attribution={attribution}
          />
          {geoData && (
            <GeoJSON 
              data={geoData} 
              style={{ color: "#3498db", weight: 5 }} 
              onEachFeature={onEachFeature} 
            />
          )}
          {endpoints.start && <Marker position={endpoints.start} icon={startIcon}><Popup>Start</Popup></Marker>}
          {endpoints.end && <Marker position={endpoints.end} icon={endIcon}><Popup>Finish</Popup></Marker>}
          <FitBounds data={geoData} />
        </MapContainer>
      </div>

      {/* Stats Bar (Outside the ref, so it won't be in the screenshot) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr auto', 
        alignItems: 'center',
        padding: '12px 15px', 
        background: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        borderTop: '1px solid #eee'
      }}>
        <div style={{ textAlign: 'center', borderRight: '1px solid #eee' }}>
          <small style={{ display: 'block', color: '#888', textTransform: 'uppercase', fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>
            Distance
          </small>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#222', fontVariantNumeric: 'tabular-nums' }}>
            {displayDist}
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <small style={{ display: 'block', color: '#888', textTransform: 'uppercase', fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>
            Elevation Gain
          </small>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#222', fontVariantNumeric: 'tabular-nums' }}>
            {displayEle}
          </div>
        </div>

        <div style={{ paddingLeft: '15px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
           <button 
            onClick={() => setIsMetric(!isMetric)}
            style={{
              background: '#f8f9fa',
              border: '1px solid #dcdcdc',
              borderRadius: '6px',
              width: '100px',
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

          <button 
            onClick={handleDownloadImage}
            disabled={isDownloading}
            style={{
              background: '#3498db',
              border: 'none',
              borderRadius: '6px',
              width: '100px',
              padding: '6px 0',
              fontSize: '10px',
              cursor: 'pointer',
              fontWeight: '700',
              color: '#fff',
              textTransform: 'uppercase',
              opacity: isDownloading ? 0.7 : 1
            }}
          >
            {isDownloading ? 'Saving...' : '📸 Save Map'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GpxMap;
