// Mapbox: raster tiles (for Leaflet), Directions API and Geocoding v6
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
export const DEFAULT_CENTER = { lng: 121.0244, lat: 14.5547 } // Manila, used when GPS is unavailable

export const tileUrl = (dark) =>
  `https://api.mapbox.com/styles/v1/mapbox/${dark ? 'dark-v11' : 'streets-v12'}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`

export const TILE_ATTRIBUTION =
  '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const API = 'https://api.mapbox.com'

export async function getRoute(from, to, mode = 'driving') {
  const profile = mode === 'driving' ? 'driving-traffic' : mode
  const url = `${API}/directions/v5/mapbox/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
  const res = await fetch(url)
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || 'Routing service unavailable')
  const r = json.routes && json.routes[0]
  if (!r) throw new Error('No route found')
  return {
    // Leaflet wants [lat, lng]
    latlngs: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: r.distance,
    duration: r.duration,
  }
}

export async function reverseGeocode({ lat, lng }) {
  try {
    const res = await fetch(`${API}/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&limit=1&access_token=${MAPBOX_TOKEN}`)
    const j = await res.json()
    const p = j.features?.[0]?.properties
    return p ? [p.name, p.place_formatted].filter(Boolean).join(', ') : null
  } catch {
    return null
  }
}

export async function searchPlaces(q, near) {
  const prox = near ? `&proximity=${near.lng},${near.lat}` : ''
  const res = await fetch(`${API}/search/geocode/v6/forward?q=${encodeURIComponent(q)}&limit=5${prox}&access_token=${MAPBOX_TOKEN}`)
  const j = await res.json()
  return (j.features || []).map((f) => ({
    id: f.id,
    name: f.properties.name,
    full: f.properties.full_address || f.properties.place_formatted || f.properties.name,
    lat: f.properties.coordinates.latitude,
    lng: f.properties.coordinates.longitude,
  }))
}

// fast, cached location lives in ./location.js
export { getCurrentPosition } from './location'

export const fmtDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`)

export function fmtDuration(s) {
  const m = Math.round(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`
}

export function timeAgo(date) {
  if (!date) return 'never'
  const s = (Date.now() - new Date(date).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}
