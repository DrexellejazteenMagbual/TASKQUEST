import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Marker, Popup } from 'react-leaflet'
import { Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PRIORITIES, dayKey, levelInfo } from '../lib/game'
import { DEFAULT_CENTER, timeAgo } from '../lib/geo'
import { BaseMap, FitBounds, InvalidateSize } from '../components/MapKit'
import { Bars, Clock, Gauge, Panel, Radar, Readout, SegBar, Wave, hudAvatarPin, pad, useHudMode } from '../components/Hud'

export const isOnline = (p) => Boolean(p.last_seen) && Date.now() - new Date(p.last_seen).getTime() < 3 * 60 * 1000
const hhmm = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

export default function Admin() {
  useHudMode()
  const { profile: me } = useAuth()
  const nav = useNavigate()
  const [users, setUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [camreqs, setCamreqs] = useState([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [, tick] = useState(0)

  const load = useCallback(async () => {
    const [{ data: u }, { data: t }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('id,user_id,title,status,priority,created_at,completed_at,lat'),
      supabase.from('camera_requests').select('id,user_id,status,created_at,responded_at').order('created_at', { ascending: false }).limit(30),
    ])
    setUsers(u || [])
    setTasks(t || [])
    setCamreqs(c || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const poll = setInterval(load, 30000) // quests aren't on realtime, so refresh every 30 s
    const clock = setInterval(() => tick((n) => n + 1), 15000) // re-evaluate online status
    const ch = supabase.channel('admin-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        setUsers((list) => {
          if (payload.eventType === 'DELETE') return list.filter((x) => x.id !== payload.old.id)
          const exists = list.some((x) => x.id === payload.new.id)
          return exists ? list.map((x) => (x.id === payload.new.id ? payload.new : x)) : [payload.new, ...list]
        })
      })
      .subscribe()
    return () => { clearInterval(poll); clearInterval(clock); supabase.removeChannel(ch) }
  }, [load])

  const byId = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const online = users.filter(isOnline)
  const located = users.filter((u) => u.location_consent && u.last_lat != null)
  const done = tasks.filter((t) => t.status === 'done')
  const rate = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0
  const onlinePct = users.length ? Math.round((online.length / users.length) * 100) : 0

  // last 14 days: created vs cleared
  const flow = useMemo(() => {
    const out = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const k = dayKey(d)
      out.push({
        label: d.getDate().toString(),
        a: tasks.filter((t) => dayKey(t.created_at) === k).length,
        b: tasks.filter((t) => t.completed_at && dayKey(t.completed_at) === k).length,
      })
    }
    return out
  }, [tasks])

  const mix = Object.entries(PRIORITIES).map(([k, p]) => ({ k, label: p.label, n: tasks.filter((t) => t.priority === k).length }))
  const mixMax = Math.max(1, ...mix.map((m) => m.n))

  // live activity stream built from the latest records
  const feed = useMemo(() => {
    const ev = []
    const name = (id) => byId[id]?.username || 'unknown'
    tasks.forEach((t) => {
      ev.push({ at: t.created_at, tag: 'NEW', c: 'c-cyan', text: `${name(t.user_id)} :: quest "${t.title}"` })
      if (t.completed_at) ev.push({ at: t.completed_at, tag: 'CLEAR', c: 'c-green', text: `${name(t.user_id)} :: cleared "${t.title}"` })
    })
    users.forEach((u) => ev.push({ at: u.created_at, tag: 'JOIN', c: 'c-yellow', text: `${u.username} :: account created` }))
    camreqs.forEach((r) => ev.push({
      at: r.responded_at || r.created_at, tag: 'CAM',
      c: r.status === 'approved' ? 'c-green' : r.status === 'denied' ? 'c-red' : 'c-orange',
      text: `${name(r.user_id)} :: camera ${r.status}`,
    }))
    return ev.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 40)
  }, [tasks, users, camreqs, byId])

  const rows = useMemo(() => users
    .filter((u) => `${u.username} ${u.display_name}`.toLowerCase().includes(q.toLowerCase()))
    .filter((u) => filter === 'all'
      || (filter === 'online' && isOnline(u))
      || (filter === 'located' && u.location_consent && u.last_lat != null)
      || (filter === 'admin' && u.role === 'admin')),
  [users, q, filter])

  const leaders = [...users].sort((a, b) => b.xp - a.xp).slice(0, 6)

  return (
    <div className="hud-page">
      <header className="hud-header">
        <div>
          <h1 className="hud-h1">COMMAND_CENTER</h1>
          <div className="hud-sub">TASKQUEST / ADMIN NODE / OPERATOR: {me.username} / <Clock /></div>
        </div>
        <div className="hud-unit">UNIT-{pad(users.length)}</div>
      </header>

      {loading ? <div className="hud-empty">INITIALISING DATA LINK…</div> : (
        <div className="hud-grid">
          {/* left column */}
          <Panel title="System_Status" code={`${online.length}/${users.length} LIVE`} className="s-3">
            <div className="hud-lines">
              {users.slice(0, 7).map((u) => (
                <div key={u.id} className="hud-line" onClick={() => nav(`/admin/user/${u.id}`)}>
                  <span className={`led ${isOnline(u) ? 'on' : ''}`} />
                  <span className="ellipsis">{u.username}</span>
                  <span className="num">LV{pad(levelInfo(u.xp).level, 2)}</span>
                </div>
              ))}
              {users.length === 0 && <div className="hud-empty">NO USERS</div>}
            </div>
          </Panel>

          {/* map */}
          <Panel title="Location" code={`${located.length} TRACKED`} className="s-6 r-2" accent="yellow">
            <div className="hud-map tall">
              <BaseMap center={DEFAULT_CENTER} zoom={10} dark>
                <InvalidateSize />
                <FitBounds points={located.map((u) => [u.last_lat, u.last_lng])} trigger={located.length} />
                {located.map((u) => (
                  <Marker key={`${u.id}-${isOnline(u)}-${u.avatar_url}`} position={[u.last_lat, u.last_lng]} icon={hudAvatarPin(u, isOnline(u))}>
                    <Popup>
                      <div className="hud-mono" style={{ minWidth: 160 }}>
                        <div className="c-yellow">{u.display_name || u.username}</div>
                        <div className="c-dim" style={{ fontSize: 11 }}>{u.last_lat.toFixed(4)}, {u.last_lng.toFixed(4)}</div>
                        <div className="c-dim" style={{ fontSize: 11 }}>SEEN {timeAgo(u.last_seen).toUpperCase()}</div>
                        <button className="hud-btn sm" style={{ marginTop: 6 }} onClick={() => nav(`/admin/user/${u.id}`)}>Open file</button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </BaseMap>
              <div className="crosshair" />
            </div>
          </Panel>

          {/* right column */}
          <Panel title="Core_Link" code="USERS ONLINE" className="s-3">
            <Radar value={pad(online.length)} label={`of ${users.length} users`} size={190} />
          </Panel>

          <Panel title="User_Data" code="TOTALS" className="s-3">
            <div className="hud-readouts">
              <Readout label="Users" value={pad(users.length)} />
              <Readout label="Quests" value={pad(tasks.length)} color="c-yellow" />
              <Readout label="Cleared" value={pad(done.length)} color="c-green" />
              <Readout label="Pinned" value={pad(tasks.filter((t) => t.lat != null).length)} />
            </div>
          </Panel>

          <Panel title="Signal_Strength" code="ONLINE %" className="s-3" accent="yellow">
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="c-dim" style={{ fontSize: 11 }}>LOC {located.length} · CAM {users.filter((u) => u.camera_consent).length}</span>
              <b className="c-yellow glow" style={{ fontFamily: 'var(--h-display)', fontSize: 28 }}>{onlinePct}</b>
            </div>
            <SegBar pct={onlinePct} />
          </Panel>

          {/* middle row */}
          <Panel title="Data_Stream" code="LIVE FEED" className="s-4">
            <div className="hud-feed">
              {feed.map((e, i) => (
                <div key={i}>
                  <time>{hhmm(e.at)}</time>
                  <span className={`tag ${e.c}`}>[{e.tag}]</span>
                  <span>{e.text}</span>
                </div>
              ))}
              {feed.length === 0 && <div className="hud-empty">AWAITING SIGNAL…</div>}
            </div>
          </Panel>

          <Panel title="Packet_Data_Flow" code="14 DAYS" className="s-5" accent="yellow">
            <Bars data={flow} height={160} legend={['Created', 'Cleared']} />
          </Panel>

          <Panel title="Diagnostic_Data" code="CLEAR RATE" className="s-3">
            <Gauge pct={rate} label="quests cleared" color={rate >= 50 ? 'green' : 'yellow'} size={130} />
            <table className="hud-kv" style={{ marginTop: 8 }}>
              <tbody>
                {mix.map((m) => (
                  <tr key={m.k}>
                    <td>{m.label.toUpperCase()}</td>
                    <td style={{ width: '45%' }}>
                      <div className="hud-xp"><div style={{ width: `${(m.n / mixMax) * 100}%` }} /></div>
                    </td>
                    <td>{pad(m.n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {/* users table */}
          <Panel title="Server_Data" code={`${rows.length} RECORDS`} className="s-8">
            <div className="row wrap" style={{ gap: 8, marginBottom: 10 }}>
              <div className="row grow" style={{ gap: 6, minWidth: 180 }}>
                <Search size={14} className="c-dim" />
                <input className="hud-input" placeholder="SEARCH USER…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="hud-tabs">
                {['all', 'online', 'located', 'admin'].map((f) => (
                  <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>
                ))}
              </div>
            </div>
            <div className="hud-table-wrap">
              <table className="hud-table">
                <thead>
                  <tr><th>User</th><th>Status</th><th>LV</th><th>XP</th><th>Quests</th><th>Consent</th><th>Last seen</th></tr>
                </thead>
                <tbody>
                  {rows.map((u) => {
                    const ts = tasks.filter((t) => t.user_id === u.id)
                    return (
                      <tr key={u.id} onClick={() => nav(`/admin/user/${u.id}`)}>
                        <td>
                          <span className="who">
                            {u.avatar_url ? <img src={u.avatar_url} alt="" /> : <span className="ph">{u.username[0].toUpperCase()}</span>}
                            {u.username}{u.role === 'admin' && <span className="hud-tag c-yellow">ADM</span>}
                          </span>
                        </td>
                        <td className={isOnline(u) ? 'c-green' : 'c-dim'}>{isOnline(u) ? '● ONLINE' : '○ OFFLINE'}</td>
                        <td className="c-cyan">{pad(levelInfo(u.xp).level, 2)}</td>
                        <td className="c-yellow">{u.xp}</td>
                        <td>{ts.filter((t) => t.status === 'done').length}/{ts.length}</td>
                        <td>
                          <span className={u.location_consent ? 'c-green' : 'c-dim'}>LOC</span>{' '}
                          <span className={u.camera_consent ? 'c-green' : 'c-dim'}>CAM</span>
                        </td>
                        <td className="c-dim">{timeAgo(u.last_seen)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {rows.length === 0 && <div className="hud-empty">NO MATCHING RECORDS</div>}
            </div>
          </Panel>

          <Panel title="Rank_Index" code="TOP XP" className="s-4" accent="orange">
            <table className="hud-kv">
              <tbody>
                {leaders.map((u, i) => (
                  <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/admin/user/${u.id}`)}>
                    <td className="c-orange" style={{ width: 28 }}>#{i + 1}</td>
                    <td>{u.username}</td>
                    <td className="c-dim" style={{ textAlign: 'left' }}>{levelInfo(u.xp).title}</td>
                    <td>{u.xp} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <div style={{ gridColumn: '1 / -1' }}>
            <Wave level={Math.min(1, 0.3 + online.length / 10)} />
          </div>
        </div>
      )}
    </div>
  )
}
