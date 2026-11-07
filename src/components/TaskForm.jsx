import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { Sword, Trash2, X } from 'lucide-react'
import { PRIORITIES } from '../lib/game'
import MapPicker from './MapPicker'

const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

// Bottom-sheet for creating / editing a quest
export default function TaskForm({ initial, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [priority, setPriority] = useState(initial?.priority || 'normal')
  const [due, setDue] = useState(toLocalInput(initial?.due_at))
  const [loc, setLoc] = useState(initial?.lat != null ? { lat: initial.lat, lng: initial.lng, place_name: initial.place_name } : null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const editing = Boolean(initial?.id)

  // the map page fills in the place name after the sheet opens
  useEffect(() => {
    if (editing || initial?.lat == null) return
    setLoc((l) => (l && l.lat === initial.lat && l.lng === initial.lng ? { ...l, place_name: initial.place_name } : l))
  }, [initial?.place_name]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setErr('Give your quest a name!'); return }
    setBusy(true)
    setErr('')
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_at: due ? new Date(due).toISOString() : null,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        place_name: loc?.place_name ?? null,
      })
      onClose()
    } catch (ex) {
      setErr(ex.message)
      setBusy(false)
    }
  }

  return createPortal(
    <div className="backdrop" onClick={onClose}>
      <form className="sheet stack" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="sheet-handle" />
        <div className="row between">
          <h2 className="title" style={{ fontSize: 28 }}>{editing ? 'Edit Quest' : 'New Quest'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="field">
          <label className="label" htmlFor="qt">Quest name</label>
          <input id="qt" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Buy groceries" autoFocus={!editing} maxLength={120} />
        </div>

        <div className="field">
          <label className="label" htmlFor="qd">Details</label>
          <textarea id="qd" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="field">
          <span className="label">Difficulty</span>
          <div className="seg">
            {Object.entries(PRIORITIES).map(([k, p]) => {
              const Icon = p.icon
              return (
                <button type="button" key={k} className={priority === k ? 'on' : ''} onClick={() => setPriority(k)}>
                  <Icon size={18} style={{ display: 'block', margin: '0 auto 2px' }} />
                  {p.label}<br /><span className="tiny">+{p.xp} XP</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="qdue">Due</label>
          <input id="qdue" type="datetime-local" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>

        <div className="field">
          <div className="row between">
            <span className="label">Location</span>
            {loc && <button type="button" className="btn btn-sm" onClick={() => setLoc(null)}>Remove pin</button>}
          </div>
          <MapPicker value={loc} onChange={setLoc} />
        </div>

        {err && <div className="error">{err}</div>}

        <button className="btn btn-primary btn-block" disabled={busy}>{!busy && <Sword size={18} />}{busy ? 'Saving…' : editing ? 'Save Quest' : 'Accept Quest!'}</button>
        {editing && onDelete && (
          <button type="button" className="btn btn-block" onClick={async () => { if (confirm('Abandon this quest?')) { await onDelete(initial); onClose() } }}>
            <Trash2 size={16} /> Abandon quest
          </button>
        )}
      </form>
    </div>,
    document.body,
  )
}
