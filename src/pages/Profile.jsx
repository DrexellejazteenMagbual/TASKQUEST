import { useRef, useState } from 'react'
import { Camera, LoaderCircle, LogOut, MapPin, Save, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTasks } from '../lib/useTasks'
import { computeStats, withUnlocks } from '../lib/game'
import { THEMES } from '../lib/themes'
import Avatar from '../components/Avatar'
import XPBar from '../components/XPBar'
import { useToast } from '../components/Toast'
import { Panel } from '../components/Hud'
import { NAVIGATORS, setNavigator, useNavigator } from '../lib/navigator'

export default function Profile() {
  const { user, profile, updateProfile, signOut, isAdmin } = useAuth()
  const { tasks } = useTasks()
  const toast = useToast()
  const fileRef = useRef(null)
  const [name, setName] = useState(profile.display_name || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [uploading, setUploading] = useState(false)
  const guide = useNavigator()

  const achievements = withUnlocks(computeStats(tasks, profile))
  const unlocked = achievements.filter((a) => a.unlocked).length

  const save = async () => {
    try {
      await updateProfile({ display_name: name.trim() || profile.username, bio: bio.trim() || null })
      toast.show('Profile saved', Save)
    } catch (e) { toast.show(e.message) }
  }

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.show('Image must be under 5 MB'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateProfile({ avatar_url: data.publicUrl })
      toast.show('New look unlocked!', Camera)
    } catch (ex) { toast.show(ex.message) }
    setUploading(false)
    e.target.value = ''
  }

  const setConsent = async (key, val) => {
    if (key === 'location_consent' && val) {
      // ask the browser for permission right away
      navigator.geolocation?.getCurrentPosition(() => {}, () => toast.show('Location permission was blocked in the browser'))
    }
    const patch = { [key]: val }
    if (key === 'location_consent' && !val) Object.assign(patch, { last_lat: null, last_lng: null })
    await updateProfile(patch)
  }

  return (
    <div className="page page-wide">
      <h1 className="title">Operator_Profile</h1>
      <div className="hud-sub" style={{ marginBottom: 14 }}>Identity, achievements and interface settings</div>

      <div className="hud-grid">
        {/* identity */}
        <Panel title="Identity" code={isAdmin ? 'ADMIN' : 'OPERATOR'} className="s-4">
          <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
            <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', position: 'relative' }} aria-label="Change profile picture">
              <Avatar profile={profile} size={120} />
              <span className="icon-btn" style={{ position: 'absolute', right: -6, bottom: 0, width: 36, height: 36 }}>{uploading ? <LoaderCircle size={16} className="spin" /> : <Camera size={16} />}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
            <div>
              <div className="c-yellow glow" style={{ fontFamily: 'var(--h-display)', fontSize: 22, letterSpacing: 2 }}>{profile.display_name || profile.username}</div>
              <div className="small muted">@{profile.username} {isAdmin && <span className="chip c-yellow" style={{ marginLeft: 4 }}><ShieldCheck size={12} /> Admin</span>}</div>
            </div>
            <div style={{ width: '100%' }}><XPBar xp={profile.xp} /></div>
          </div>
        </Panel>

        {/* details */}
        <Panel title="Operator_Details" code="EDITABLE" className="s-4" accent="yellow">
          <div className="stack">
            <div className="field">
              <label className="label" htmlFor="dn">Display name</label>
              <input id="dn" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor="bio">Bio</label>
              <textarea id="bio" className="input" value={bio} maxLength={200} onChange={(e) => setBio(e.target.value)} placeholder="Your story…" />
            </div>
            <button className="btn btn-primary" onClick={save}><Save size={16} /> Save</button>
          </div>
        </Panel>

        {/* consent */}
        <Panel title="Privacy_Consent" code="YOU DECIDE" className="s-4" accent="orange">
          <label className="switch">
            <span>
              <b className="small"><MapPin size={14} className="ico-inline" /> Share my location with admin</b>
              <div className="tiny muted">Your live position is visible to the admin while the app is open.</div>
            </span>
            <input type="checkbox" checked={profile.location_consent} onChange={(e) => setConsent('location_consent', e.target.checked)} />
          </label>
          <label className="switch">
            <span>
              <b className="small"><Camera size={14} className="ico-inline" /> Allow camera requests</b>
              <div className="tiny muted">The admin can ask for a photo. You approve every request yourself.</div>
            </span>
            <input type="checkbox" checked={profile.camera_consent} onChange={(e) => setConsent('camera_consent', e.target.checked)} />
          </label>
          <button className="btn btn-block mt" onClick={signOut}><LogOut size={16} /> Log out</button>
        </Panel>

        {/* system navigator */}
        <Panel title="System_Navigator" code={guide.role.toUpperCase()} className="s-4" accent="yellow">
          <div className="nav-pick">
            {Object.values(NAVIGATORS).map((n) => (
              <button key={n.key} className={guide.key === n.key ? 'on' : ''} onClick={() => setNavigator(n.key)} aria-pressed={guide.key === n.key}>
                <img src={n.full} alt="" draggable="false" />
                <b>{n.name}</b>
                <small>{n.role}</small>
              </button>
            ))}
          </div>
          <p className="tiny muted" style={{ margin: '8px 0 0' }}>Your navigator guides you on the login screen, quest board and level-ups.</p>
        </Panel>

        {/* achievements */}
        <Panel title="Achievements" code={`${unlocked}/${achievements.length} UNLOCKED`} className="s-4">
          <div className="ach-grid">
            {achievements.map(({ icon: Icon, ...a }) => (
              <div key={a.code} className={`ach ${a.unlocked ? 'unlocked' : 'locked'}`} title={a.desc}>
                <span className="ico"><Icon size={22} strokeWidth={2} /></span>
                <div className="tiny bold">{a.name}</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* theme */}
        <Panel title="Interface_Scheme" code="COLOUR" className="s-4">
          <div className="stack" style={{ gap: 8 }}>
            {Object.entries(THEMES).map(([k, t]) => (
              <button key={k} className={`theme-swatch ${profile.theme === k ? 'on' : ''}`} onClick={() => updateProfile({ theme: k })}>
                <t.icon size={22} color={t.main} strokeWidth={2} />
                <span className="grow" style={{ textAlign: 'left' }}>
                  <b className="small" style={{ display: 'block' }}>{t.name}</b>
                </span>
                <span className="swatch-dots">
                  <i style={{ background: t.main }} /><i style={{ background: t.alt }} />
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
