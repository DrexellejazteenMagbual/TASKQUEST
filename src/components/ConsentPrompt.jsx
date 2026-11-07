import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, MapPin, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { NavigatorSays } from './Mascot'
import { useNavigator } from '../lib/navigator'
import { getCurrentPosition } from '../lib/location'

// Shown right after login / sign-up. The user chooses whether to share
// location and allow camera requests; the browser permission prompts are
// triggered here too, so later requests don't surprise them.
export default function ConsentPrompt() {
  const { user, profile, updateProfile, doneConsent } = useAuth()
  const [location, setLocation] = useState(profile.location_consent)
  const [camera, setCamera] = useState(profile.camera_consent)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const nav = useNavigator()

  const askLocation = () => getCurrentPosition().catch(() => null)

  const askCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      stream.getTracks().forEach((t) => t.stop()) // permission only, camera is closed immediately
      return true
    } catch {
      return false
    }
  }

  const save = async (loc, cam) => {
    setBusy(true)
    setNote('')
    const patch = { location_consent: loc, camera_consent: cam }
    const blocked = []

    if (loc) {
      const pos = await askLocation()
      if (pos) Object.assign(patch, { last_lat: pos.lat, last_lng: pos.lng, last_seen: new Date().toISOString() })
      else { patch.location_consent = false; blocked.push('location') }
    } else {
      Object.assign(patch, { last_lat: null, last_lng: null })
    }

    if (cam && !(await askCamera())) { patch.camera_consent = false; blocked.push('camera') }

    try {
      await updateProfile(patch)
    } catch (e) {
      setNote(e.message); setBusy(false); return
    }
    if (blocked.length) {
      setLocation(patch.location_consent)
      setCamera(patch.camera_consent)
      setNote(`Your browser blocked ${blocked.join(' and ')} access. Allow it in the browser's site settings, or continue without it.`)
      setBusy(false)
      return
    }
    // record presence even when location is off
    await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
    doneConsent()
  }

  return createPortal(
    <div className="backdrop">
      <div className="sheet stack">
        <div className="sheet-handle" />
        <NavigatorSays size={72}>{nav.lines.consent}</NavigatorSays>
        <h2 className="title title-row" style={{ fontSize: 28 }}><ShieldCheck size={28} strokeWidth={2.6} /> Permissions</h2>
        <p className="small" style={{ margin: 0 }}>
          The guild admin can see users who share their location and can ask them for a photo.
          You decide, and you can change this anytime in <b>Profile → Privacy &amp; consent</b>.
        </p>

        <div className="card" style={{ padding: '4px 14px' }}>
          <label className="switch">
            <span>
              <b className="small"><MapPin size={14} className="ico-inline" /> Share my location</b>
              <div className="tiny muted">Your position is updated every 30 seconds while the app is open.</div>
            </span>
            <input type="checkbox" checked={location} onChange={(e) => setLocation(e.target.checked)} />
          </label>
          <label className="switch">
            <span>
              <b className="small"><Camera size={14} className="ico-inline" /> Allow camera requests</b>
              <div className="tiny muted">The admin can ask for one photo. You approve and take every photo yourself.</div>
            </span>
            <input type="checkbox" checked={camera} onChange={(e) => setCamera(e.target.checked)} />
          </label>
        </div>

        {note && <div className="error">{note}</div>}

        <button className="btn btn-primary btn-block" disabled={busy} onClick={() => save(location, camera)}>
          {busy ? 'Waiting for browser permission…' : 'Continue'}
        </button>
        <button className="btn btn-block" disabled={busy} onClick={() => save(false, false)}>
          Don't share anything
        </button>
      </div>
    </div>,
    document.body,
  )
}
