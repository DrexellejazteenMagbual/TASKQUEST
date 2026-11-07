import { useEffect, useState } from 'react'
import { Marker } from 'react-leaflet'
import { LocateFixed, MapPin, Search } from 'lucide-react'
import { DEFAULT_CENTER, getCurrentPosition, reverseGeocode, searchPlaces } from '../lib/geo'
import { getLastKnown } from '../lib/location'
import { useAuth } from '../lib/auth'
import { isDarkTheme } from '../lib/themes'
import { BaseMap, FlyTo, InvalidateSize, MapClick, starPin } from './MapKit'

// Small map used inside the quest form: tap to drop a pin, or search a place
export default function MapPicker({ value, onChange }) {
  const { profile } = useAuth()
  const [focus, setFocus] = useState(null) // where the map should fly to
  const [near, setNear] = useState(getLastKnown())
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    getCurrentPosition().then((p) => { setNear(p); if (!value) setFocus(p) }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (lat, lng, name) => {
    onChange({ lat, lng, place_name: name ?? 'Locating…' })
    if (!name) {
      const n = await reverseGeocode({ lat, lng })
      onChange({ lat, lng, place_name: n || `${lat.toFixed(5)}, ${lng.toFixed(5)}` })
    }
  }

  const search = async (e) => {
    e.preventDefault()
    if (!q.trim()) return
    try { setResults(await searchPlaces(q, near)) } catch { setResults([]) }
  }

  const useMine = async () => {
    try {
      const p = await getCurrentPosition({ maxAge: 5000 })
      setFocus({ lat: p.lat, lng: p.lng })
      pick(p.lat, p.lng)
    } catch { /* permission denied */ }
  }

  const start = value || getLastKnown() || DEFAULT_CENTER

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 6 }}>
        <input
          className="input" placeholder="Search a place…" value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') search(e) }}
        />
        <button className="icon-btn" type="button" onClick={search} aria-label="Search"><Search size={18} /></button>
        <button className="icon-btn" type="button" onClick={useMine} aria-label="Use my location"><LocateFixed size={18} /></button>
      </div>
      {results.length > 0 && (
        <div className="search-results">
          {results.map((r) => (
            <button key={r.id} type="button" onClick={() => {
              setFocus({ lat: r.lat, lng: r.lng })
              pick(r.lat, r.lng, r.full)
              setResults([])
            }}>
              <b>{r.name}</b><div className="tiny muted">{r.full}</div>
            </button>
          ))}
        </div>
      )}
      <div className="picker">
        <BaseMap center={start} zoom={value || getLastKnown() ? 15 : 12} dark={isDarkTheme(profile?.theme)}>
          <InvalidateSize />
          <MapClick onClick={(ll) => pick(ll.lat, ll.lng)} />
          <FlyTo center={focus} zoom={16} />
          {value && <Marker position={[value.lat, value.lng]} icon={starPin()} />}
        </BaseMap>
      </div>
      <div className="tiny muted">
        {value
          ? <><MapPin size={12} className="ico-inline" /> {value.place_name}</>
          : 'Tap the map to pin where this quest happens (optional).'}
      </div>
    </div>
  )
}
