import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Marker, Polyline } from 'react-leaflet'
import {
  Bike, Car, Check, Eye, EyeOff, Footprints, LocateFixed, MapPin, MapPinned,
  Pencil, Route, Sparkles, Undo2, X,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useTasks } from '../lib/useTasks'
import { isDarkTheme } from '../lib/themes'
import { DEFAULT_CENTER, fmtDistance, fmtDuration, getCurrentPosition, getRoute, reverseGeocode } from '../lib/geo'
import { getLastKnown, useMyLocation } from '../lib/location'
import TaskForm from '../components/TaskForm'
import { PriorityChip } from '../components/TaskCard'
import { useToast } from '../components/Toast'
import { BaseMap, FitBounds, FlyTo, MapClick, meIcon, taskPin } from '../components/MapKit'

const MODES = {
  driving: { label: 'Drive', icon: Car },
  walking: { label: 'Walk', icon: Footprints },
  cycling: { label: 'Bike', icon: Bike },
}

export default function MapPage() {
  const { profile } = useAuth()
  const { tasks, add, edit, remove, toggle } = useTasks()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const me = useMyLocation() // cached instantly, refined live
  const centered = useRef(false)
  const centeredAccuracy = useRef(null)
  const [selectedId, setSelectedId] = useState(params.get('task'))
  const [addMode, setAddMode] = useState(false)
  const [form, setForm] = useState(null)
  const [mode, setMode] = useState('driving')
  const [route, setRoute] = useState(null)
  const [routing, setRouting] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [focus, setFocus] = useState(null)

  const pinned = useMemo(
    () => tasks.filter((t) => t.lat != null && (showDone || t.status !== 'done' || t.id === selectedId)),
    [tasks, showDone, selectedId],
  )
  const selected = tasks.find((t) => t.id === selectedId)

  // centre on the user once, as soon as the first position is known
  useEffect(() => {
    if (!me || params.get('task')) return
    const shouldRefineCenter = centered.current
      && Number.isFinite(centeredAccuracy.current)
      && Number.isFinite(me.accuracy)
      && me.accuracy < centeredAccuracy.current * 0.5
    if (centered.current && !shouldRefineCenter) return
    centered.current = true
    centeredAccuracy.current = me.accuracy
    setFocus({ lat: me.lat, lng: me.lng, zoom: 14 })
  }, [me]) // eslint-disable-line react-hooks/exhaustive-deps

  // fly to a task opened via ?task= once tasks are loaded
  useEffect(() => {
    if (selected) setFocus({ lat: selected.lat, lng: selected.lng, zoom: 16 })
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const select = (t) => {
    setSelectedId(t?.id ?? null)
    setRoute(null)
    setParams(t ? { task: t.id } : {}, { replace: true })
  }

  const doRoute = async (m = mode) => {
    if (!selected) return
    setRouting(true)
    try {
      const from = me || (await getCurrentPosition())
      setRoute(await getRoute(from, { lat: selected.lat, lng: selected.lng }, m))
    } catch (e) {
      toast.show(e.code === 1 ? 'Allow location access to get a route' : e.message)
    }
    setRouting(false)
  }

  const onMapClick = async ({ lat, lng }) => {
    if (!addMode) { if (selected) select(null); return }
    setAddMode(false)
    setForm({ lat, lng, place_name: 'Locating…' })
    const name = await reverseGeocode({ lat, lng })
    setForm((f) => (f && !f.id ? { ...f, place_name: name || `${lat.toFixed(5)}, ${lng.toFixed(5)}` } : f))
  }

  const locate = async () => {
    try { const p = await getCurrentPosition({ maxAge: 5000 }); setFocus({ lat: p.lat, lng: p.lng, zoom: 16 }) }
    catch { toast.show('Allow location access in your browser') }
  }

  const routeColor = getComputedStyle(document.documentElement).getPropertyValue('--h-cyan').trim() || '#3ef0ff'
  const start = selected ? { lat: selected.lat, lng: selected.lng } : getLastKnown() || DEFAULT_CENTER

  return (
    <div className="page-full">
      <div className="map-wrap" style={addMode ? { cursor: 'crosshair' } : null}>
        <BaseMap center={start} zoom={selected ? 15 : 12} dark={isDarkTheme(profile.theme)}>
          <MapClick onClick={onMapClick} />
          <FlyTo center={focus} zoom={focus?.zoom} />
          {route && <FitBounds points={route.latlngs} padding={[50, 50]} paddingBottomRight={[50, 280]} trigger={route} />}

          {route && (
            <>
              <Polyline positions={route.latlngs} pathOptions={{ color: '#2a1430', weight: 9, opacity: 1, lineCap: 'round' }} />
              <Polyline positions={route.latlngs} pathOptions={{ color: routeColor, weight: 5, opacity: 1, lineCap: 'round' }} />
            </>
          )}

          {me && <Marker position={[me.lat, me.lng]} icon={meIcon()} interactive={false} />}

          {pinned.map((t) => (
            <Marker
              key={`${t.id}-${t.status}-${t.id === selectedId}`}
              position={[t.lat, t.lng]}
              icon={taskPin(t.priority, { done: t.status === 'done', selected: t.id === selectedId })}
              eventHandlers={{ click: () => select(t) }}
            />
          ))}
        </BaseMap>

        <div className="map-top">
          <div className="card grow row" style={{ padding: '8px 12px' }}>
            <MapPinned size={18} />
            <b className="grow ellipsis">{addMode ? 'Tap the map to place a quest' : `${pinned.length} quest${pinned.length === 1 ? '' : 's'} on map`}</b>
            <button className="btn btn-sm" onClick={() => setShowDone((s) => !s)}>
              {showDone ? <EyeOff size={14} /> : <Eye size={14} />}{showDone ? 'Hide cleared' : 'Show cleared'}
            </button>
          </div>
        </div>

        <button className="icon-btn map-ctrl" style={{ top: 74 }} onClick={locate} aria-label="My location"><LocateFixed size={18} /></button>

        {!selected && (
          <button className="fab" style={{ background: addMode ? 'var(--accent)' : undefined }} onClick={() => setAddMode((a) => !a)} aria-label="Add quest on map">
            {addMode ? <X size={28} strokeWidth={3} /> : <MapPin size={28} strokeWidth={2.6} />}
          </button>
        )}

        {selected && (
          <div className="map-bottom">
            <div className="card stack" style={{ gap: 10 }}>
              <div className="row between">
                <div className="grow" style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 17 }}>{selected.title}</b>
                  <div className="tiny muted ellipsis"><MapPin size={12} className="ico-inline" /> {selected.place_name}</div>
                </div>
                <button className="icon-btn" onClick={() => select(null)} aria-label="Close"><X size={18} /></button>
              </div>
              <div className="row wrap" style={{ gap: 6 }}>
                <PriorityChip priority={selected.priority} />
                <span className="chip"><Sparkles size={13} /> {selected.xp_reward} XP</span>
                {route && <span className="chip"><Route size={13} /> {fmtDistance(route.distance)} · {fmtDuration(route.duration)}</span>}
              </div>
              <div className="seg">
                {Object.entries(MODES).map(([k, { label, icon: Icon }]) => (
                  <button key={k} className={mode === k ? 'on' : ''} onClick={() => { setMode(k); if (route) doRoute(k) }}>
                    <Icon size={16} className="ico-inline" /> {label}
                  </button>
                ))}
              </div>
              <div className="grid2">
                <button className="btn btn-accent" onClick={() => doRoute()} disabled={routing}><Route size={16} />{routing ? 'Routing…' : 'Route'}</button>
                <button className="btn btn-primary" onClick={() => toggle(selected)}>
                  {selected.status === 'done' ? <><Undo2 size={16} />Undo</> : <><Check size={16} strokeWidth={3} />Clear</>}
                </button>
              </div>
              <button className="btn btn-sm" onClick={() => setForm(selected)}><Pencil size={14} />Edit quest</button>
            </div>
          </div>
        )}
      </div>

      {form && (
        <TaskForm
          initial={form}
          onClose={() => setForm(null)}
          onSave={async (data) => {
            if (form.id) await edit(form.id, data)
            else { const t = await add(data); if (t.lat != null) select(t) }
          }}
          onDelete={form.is_public ? null : async (t) => { await remove(t); select(null) }}
        />
      )}
    </div>
  )
}
