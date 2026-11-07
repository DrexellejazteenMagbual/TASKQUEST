import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Marker } from 'react-leaflet'
import { Camera, ChevronLeft, MapPin, Send, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PRIORITIES, computeStats, dayKey, levelInfo, withUnlocks } from '../lib/game'
import { THEMES } from '../lib/themes'
import { timeAgo } from '../lib/geo'
import { BaseMap, InvalidateSize, taskPin } from '../components/MapKit'
import { useToast } from '../components/Toast'
import { Bars, Clock, Gauge, Panel, Readout, Wave, hudAvatarPin, pad, useHudMode } from '../components/Hud'
import { isOnline } from './Admin'

const fmt = (d) => new Date(d).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })

export default function AdminUser() {
  useHudMode()
  const { id } = useParams()
  const { user: me } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [u, setU] = useState(null)
  const [tasks, setTasks] = useState([])
  const [requests, setRequests] = useState([])
  const [snaps, setSnaps] = useState([])
  const [questFilter, setQuestFilter] = useState('all')
  const [msg, setMsg] = useState('')

  const loadCamera = useCallback(async () => {
    const [{ data: r }, { data: s }] = await Promise.all([
      supabase.from('camera_requests').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('camera_snapshots').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
    ])
    setRequests(r || [])
    const withUrls = await Promise.all((s || []).map(async (x) => {
      const { data } = await supabase.storage.from('snapshots').createSignedUrl(x.path, 3600)
      return { ...x, url: data?.signedUrl }
    }))
    setSnaps(withUrls)
  }, [id])

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', id).single().then(({ data }) => setU(data))
    supabase.from('tasks').select('*').eq('user_id', id).order('created_at', { ascending: false }).then(({ data }) => setTasks(data || []))
    loadCamera()
    const ch = supabase.channel(`admin-user-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'camera_requests', filter: `user_id=eq.${id}` }, loadCamera)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'camera_snapshots', filter: `user_id=eq.${id}` }, () => {
        loadCamera()
        toast.show('New snapshot received', Camera)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${id}` }, (p) => setU(p.new))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, loadCamera, toast])

  const requestPhoto = async () => {
    const { error } = await supabase.from('camera_requests').insert({ user_id: id, requested_by: me.id, message: msg.trim() || null })
    if (error) toast.show(error.message)
    else { toast.show('Request sent, waiting for the user to approve', Send); setMsg('') }
  }

  const deleteSnap = async (s) => {
    if (!confirm('Delete this snapshot?')) return
    await supabase.storage.from('snapshots').remove([s.path])
    await supabase.from('camera_snapshots').delete().eq('id', s.id)
    setSnaps((x) => x.filter((y) => y.id !== s.id))
  }

  const toggleAdmin = async () => {
    const role = u.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`Make ${u.username} ${role === 'admin' ? 'an admin' : 'a normal user'}?`)) return
    const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select().single()
    if (error) toast.show(error.message)
    else setU(data)
  }

  const week = useMemo(() => {
    const out = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const k = dayKey(d)
      out.push({
        label: d.toLocaleDateString([], { weekday: 'short' }).toUpperCase().slice(0, 3),
        a: tasks.filter((t) => dayKey(t.created_at) === k).length,
        b: tasks.filter((t) => t.completed_at && dayKey(t.completed_at) === k).length,
      })
    }
    return out
  }, [tasks])

  if (!u) return <div className="hud-page"><div className="hud-empty">DECRYPTING USER FILE…</div></div>

  const s = computeStats(tasks, u)
  const ach = withUnlocks(s)
  const lvl = levelInfo(u.xp)
  const rate = s.total ? Math.round((s.done / s.total) * 100) : 0
  const pending = requests.find((r) => r.status === 'pending')
  const live = isOnline(u)
  const quests = tasks.filter((t) => questFilter === 'all' || (questFilter === 'open' ? t.status !== 'done' : t.status === 'done'))

  return (
    <div className="hud-page">
      <header className="hud-header">
        <div>
          <button className="hud-btn sm" onClick={() => nav('/admin')} style={{ marginBottom: 8 }}><ChevronLeft size={14} /> Command center</button>
          <h1 className="hud-h1">USER_FILE</h1>
          <div className="hud-sub">ID {u.id.slice(0, 8).toUpperCase()} / ROLE {u.role.toUpperCase()} / <Clock /></div>
        </div>
        <div className="hud-unit">{u.username.toUpperCase()}</div>
      </header>

      <div className="hud-grid">
        {/* identity */}
        <Panel title="Identity" code={live ? 'ONLINE' : `SEEN ${timeAgo(u.last_seen).toUpperCase()}`} className="s-4">
          <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
            <div className="hud-avatar">{u.avatar_url ? <img src={u.avatar_url} alt="" /> : u.username[0].toUpperCase()}</div>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="c-yellow glow" style={{ fontFamily: 'var(--h-display)', fontSize: 18 }}>{u.display_name || u.username}</div>
              <div className="c-dim" style={{ fontSize: 11 }}>@{u.username}</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                <span className={live ? 'c-green' : 'c-dim'}>{live ? '● ONLINE' : '○ OFFLINE'}</span>
              </div>
            </div>
          </div>
          {u.bio && <p style={{ fontSize: 12, margin: '10px 0 0' }} className="c-dim">“{u.bio}”</p>}
          <table className="hud-kv" style={{ marginTop: 10 }}>
            <tbody>
              <tr><td>Joined</td><td>{fmt(u.created_at)}</td></tr>
              <tr><td>Theme</td><td>{THEMES[u.theme]?.name || u.theme}</td></tr>
              <tr><td>Location sharing</td><td className={u.location_consent ? 'c-green' : 'c-red'}>{u.location_consent ? 'GRANTED' : 'DENIED'}</td></tr>
              <tr><td>Camera requests</td><td className={u.camera_consent ? 'c-green' : 'c-red'}>{u.camera_consent ? 'GRANTED' : 'DENIED'}</td></tr>
            </tbody>
          </table>
          {u.id !== me.id && (
            <button className={`hud-btn ${u.role === 'admin' ? 'red' : ''}`} style={{ width: '100%', marginTop: 12 }} onClick={toggleAdmin}>
              {u.role === 'admin' ? <><ShieldOff size={14} /> Revoke admin</> : <><ShieldCheck size={14} /> Grant admin</>}
            </button>
          )}
        </Panel>

        {/* progression */}
        <Panel title="Power_Level" code={lvl.title.toUpperCase()} className="s-4" accent="yellow">
          <div className="row" style={{ gap: 14 }}>
            <Gauge pct={lvl.pct} label={`LV ${pad(lvl.level, 2)}`} size={120} />
            <div className="hud-readouts grow">
              <Readout label="Total XP" value={u.xp} color="c-yellow" />
              <Readout label="Next LV" value={lvl.needed - lvl.current} unit="XP" />
              <Readout label="Streak" value={pad(s.streak, 2)} unit="D" color="c-orange" />
              <Readout label="Clear rate" value={rate} unit="%" color="c-green" />
            </div>
          </div>
          <div className="hud-xp" style={{ marginTop: 12 }}><div style={{ width: `${lvl.pct}%` }} /></div>
        </Panel>

        {/* stats */}
        <Panel title="Quest_Metrics" code="ALL TIME" className="s-4">
          <div className="hud-readouts">
            <Readout label="Quests" value={pad(s.total)} />
            <Readout label="Cleared" value={pad(s.done)} color="c-green" />
            <Readout label="Open" value={pad(s.open)} color="c-yellow" />
            <Readout label="Overdue" value={pad(s.overdue)} color={s.overdue ? 'c-red' : ''} />
            <Readout label="Bosses" value={pad(s.bossDone)} color="c-orange" />
            <Readout label="Pinned" value={pad(s.pinned)} />
          </div>
        </Panel>

        {/* location */}
        <Panel title="Location" code={u.location_consent && u.last_lat != null ? `${u.last_lat.toFixed(4)}, ${u.last_lng.toFixed(4)}` : 'NO SIGNAL'} className="s-7" accent="yellow">
          {u.location_consent && u.last_lat != null ? (
            <>
              <div className="hud-map">
                <BaseMap center={{ lat: u.last_lat, lng: u.last_lng }} zoom={15} dark>
                  <InvalidateSize />
                  <Marker position={[u.last_lat, u.last_lng]} icon={hudAvatarPin(u, live)} />
                  {tasks.filter((t) => t.lat != null && t.status !== 'done').map((t) => (
                    <Marker key={t.id} position={[t.lat, t.lng]} icon={taskPin(t.priority, { size: 28 })} />
                  ))}
                </BaseMap>
                <div className="crosshair" />
              </div>
              <div className="c-dim" style={{ fontSize: 11, marginTop: 6 }}>LAST FIX {timeAgo(u.last_seen).toUpperCase()} · OPEN QUEST PINS SHOWN</div>
            </>
          ) : (
            <div className="hud-empty"><MapPin size={26} />USER HAS NOT ENABLED LOCATION SHARING</div>
          )}
        </Panel>

        {/* activity */}
        <Panel title="Activity_Flow" code="7 DAYS" className="s-5">
          <Bars data={week} height={150} legend={['Created', 'Cleared']} />
          <table className="hud-kv" style={{ marginTop: 10 }}>
            <tbody>
              {Object.entries(PRIORITIES).map(([k, p]) => (
                <tr key={k}><td>{p.label.toUpperCase()}</td><td>{pad(tasks.filter((t) => t.priority === k).length)}</td></tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* camera */}
        <Panel title="Optical_Feed" code={u.camera_consent ? 'CONSENT GRANTED' : 'LOCKED'} className="s-6" accent="orange">
          {!u.camera_consent ? (
            <div className="hud-empty"><Camera size={26} />USER HAS NOT ALLOWED CAMERA REQUESTS</div>
          ) : (
            <div className="row wrap" style={{ gap: 8 }}>
              <input className="hud-input grow" style={{ minWidth: 180 }} placeholder="OPTIONAL MESSAGE TO USER…" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={140} />
              <button className="hud-btn yellow" onClick={requestPhoto} disabled={Boolean(pending)}>
                <Send size={14} /> {pending ? 'Awaiting user…' : 'Request snapshot'}
              </button>
            </div>
          )}
          <div className="hud-snaps" style={{ marginTop: 12 }}>
            {snaps.map((sn) => (
              <figure key={sn.id}>
                {sn.url && <a href={sn.url} target="_blank" rel="noreferrer"><img src={sn.url} alt="Snapshot" /></a>}
                <figcaption>
                  <span>{fmt(sn.created_at)}</span>
                  <button className="hud-btn sm red" style={{ padding: '2px 6px' }} onClick={() => deleteSnap(sn)} aria-label="Delete snapshot"><Trash2 size={12} /></button>
                </figcaption>
              </figure>
            ))}
          </div>
          {snaps.length === 0 && u.camera_consent && <div className="hud-empty">NO SNAPSHOTS ON FILE</div>}
          {requests.length > 0 && (
            <div className="hud-feed" style={{ marginTop: 10, maxHeight: 120 }}>
              {requests.map((r) => (
                <div key={r.id}>
                  <time>{fmt(r.created_at)}</time>
                  <span className={`tag ${r.status === 'approved' ? 'c-green' : r.status === 'denied' ? 'c-red' : 'c-orange'}`}>[{r.status.toUpperCase()}]</span>
                  <span>{r.message || 'snapshot request'}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* achievements */}
        <Panel title="Achievements" code={`${ach.filter((a) => a.unlocked).length}/${ach.length}`} className="s-6">
          <div className="hud-chips">
            {ach.map(({ code, name, desc, unlocked, icon: Icon }) => (
              <span key={code} className={`hud-chip ${unlocked ? 'c-yellow' : 'c-dim'}`} title={desc} style={{ opacity: unlocked ? 1 : 0.45 }}>
                <Icon size={12} /> {name}
              </span>
            ))}
          </div>
        </Panel>

        {/* quest log */}
        <Panel title="Quest_Log" code={`${quests.length} ENTRIES`} className="s-12">
          <div className="hud-tabs" style={{ marginBottom: 10 }}>
            {['all', 'open', 'cleared'].map((f) => (
              <button key={f} className={questFilter === f ? 'on' : ''} onClick={() => setQuestFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="hud-table-wrap">
            <table className="hud-table">
              <thead>
                <tr><th>Quest</th><th>Class</th><th>Status</th><th>XP</th><th>Due</th><th>Location</th><th>Created</th></tr>
              </thead>
              <tbody>
                {quests.map((t) => {
                  const p = PRIORITIES[t.priority] || PRIORITIES.normal
                  const over = t.status !== 'done' && t.due_at && new Date(t.due_at) < new Date()
                  return (
                    <tr key={t.id} style={{ cursor: 'default' }}>
                      <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</td>
                      <td><span className="hud-tag" style={{ color: p.color }}>{p.label}</span></td>
                      <td className={t.status === 'done' ? 'c-green' : over ? 'c-red' : 'c-yellow'}>{t.status === 'done' ? 'CLEARED' : over ? 'OVERDUE' : 'ACTIVE'}</td>
                      <td className="c-yellow">{t.xp_reward}</td>
                      <td className="c-dim">{t.due_at ? fmt(t.due_at) : '—'}</td>
                      <td className="c-dim" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.place_name || '—'}</td>
                      <td className="c-dim">{fmt(t.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {quests.length === 0 && <div className="hud-empty">NO QUESTS ON RECORD</div>}
          </div>
        </Panel>

        <div style={{ gridColumn: '1 / -1' }}><Wave level={live ? 0.9 : 0.25} /></div>
      </div>
    </div>
  )
}
