// Small Leaflet helpers shared by every map in the app
import { useEffect } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { Check, Star } from 'lucide-react'
import { TILE_ATTRIBUTION, tileUrl } from '../lib/geo'
import { PRIORITIES } from '../lib/game'

// Base map: Mapbox tiles + zoom control bottom-right
export function BaseMap({ center, zoom = 13, dark = false, children, mapRef, style }) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      zoomControl={false}
      ref={mapRef}
      style={{ width: '100%', height: '100%', ...style }}
    >
      <TileLayer
        key={dark ? 'dark' : 'light'}
        url={tileUrl(dark)}
        attribution={TILE_ATTRIBUTION}
        tileSize={512}
        zoomOffset={-1}
        maxZoom={20}
      />
      <ZoomControl position="bottomright" />
      {children}
    </MapContainer>
  )
}

// Turn a React element (e.g. a Lucide icon) into a Leaflet divIcon
export function htmlIcon(element, { size = [38, 38], anchor, className = '' } = {}) {
  return L.divIcon({
    html: renderToStaticMarkup(element),
    className: `lf-icon ${className}`,
    iconSize: size,
    iconAnchor: anchor || [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2],
  })
}

// ---------- ready-made markers ----------
export function taskPin(priority, { done = false, selected = false, size = 38 } = {}) {
  const p = PRIORITIES[priority] || PRIORITIES.normal
  const Icon = done ? Check : p.icon
  const s = selected ? Math.round(size * 1.25) : size
  return htmlIcon(
    <div className={`pin ${done ? 'done' : ''}`} style={{ background: p.color, width: s, height: s }}>
      <Icon size={Math.round(s * 0.45)} strokeWidth={2.6} />
    </div>,
    { size: [s, s], anchor: [s / 2, s * 1.2] },
  )
}

export function starPin(size = 38) {
  return htmlIcon(
    <div className="pin" style={{ background: 'var(--primary)', width: size, height: size }}>
      <Star size={Math.round(size * 0.45)} strokeWidth={2.6} fill="#fff" />
    </div>,
    { size: [size, size], anchor: [size / 2, size * 1.2] },
  )
}

export const meIcon = () => htmlIcon(<div className="me-dot" />, { size: [18, 18] })

export function userPin(u, online = false) {
  return htmlIcon(
    <div className="user-pin" style={{ borderColor: online ? '#22c55e' : '#2a1430' }}>
      {u.avatar_url ? <img src={u.avatar_url} alt="" /> : (u.display_name || u.username || '?')[0].toUpperCase()}
    </div>,
    { size: [44, 44] },
  )
}

export function MapClick({ onClick }) {
  useMapEvents({ click: (e) => onClick?.(e.latlng) })
  return null
}

export function FlyTo({ center, zoom = 15 }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo([center.lat, center.lng], zoom, { duration: 0.8 })
  }, [center?.lat, center?.lng]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// Fit the view to a list of [lat, lng] points
export function FitBounds({ points, padding = [50, 50], paddingBottomRight, maxZoom = 15, trigger }) {
  const map = useMap()
  useEffect(() => {
    if (!points || points.length === 0) return
    if (points.length === 1) { map.flyTo(points[0], 14, { duration: 0.8 }); return }
    map.flyToBounds(L.latLngBounds(points), { padding, paddingBottomRight, maxZoom, duration: 0.8 })
  }, [trigger]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// Leaflet needs a size recalculation when its container appears late (tabs, sheets)
export function InvalidateSize() {
  const map = useMap()
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 250); return () => clearTimeout(t) }, [map])
  return null
}
