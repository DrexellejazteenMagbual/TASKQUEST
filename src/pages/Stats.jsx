import { useMemo } from 'react'
import { useAuth } from '../lib/auth'
import { useTasks } from '../lib/useTasks'
import { PRIORITIES, computeStats, dayKey, levelInfo } from '../lib/game'
import { Bars, Gauge, Panel, Readout, Wave, pad } from '../components/Hud'

export function buildAnalytics(tasks) {
  const week = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = dayKey(d)
    const cleared = tasks.filter((t) => t.completed_at && dayKey(t.completed_at) === key)
    week.push({
      label: d.toLocaleDateString([], { weekday: 'short' }).toUpperCase().slice(0, 3),
      a: tasks.filter((t) => dayKey(t.created_at) === key).length,
      b: cleared.length,
      xp: cleared.reduce((s, t) => s + t.xp_reward, 0),
    })
  }
  const hours = Array(24).fill(0)
  tasks.forEach((t) => { if (t.completed_at) hours[new Date(t.completed_at).getHours()]++ })
  const peak = Math.max(...hours)
  return { week, hours, bestHour: peak > 0 ? hours.indexOf(peak) : null }
}

export default function Stats() {
  const { profile } = useAuth()
  const { tasks, loading } = useTasks()
  const s = computeStats(tasks, profile)
  const a = useMemo(() => buildAnalytics(tasks), [tasks])
  const lvl = levelInfo(profile.xp)
  const rate = s.total ? Math.round((s.done / s.total) * 100) : 0
  const weekXp = a.week.reduce((x, d) => x + d.xp, 0)
  const mixMax = Math.max(1, ...Object.keys(PRIORITIES).map((k) => tasks.filter((t) => t.priority === k).length))
  const hourMax = Math.max(1, ...a.hours)

  return (
    <div className="page page-wide">
      <h1 className="title">Adventure_Log</h1>
      <div className="hud-sub" style={{ marginBottom: 14 }}>Personal analytics / operator {profile.username}</div>

      {loading ? <div className="spinner" /> : (
        <div className="hud-grid">
          <Panel title="Core_Metrics" code="ALL TIME" className="s-12">
            <div className="hud-readouts four">
              <Readout label="Cleared" value={pad(s.done)} color="c-green" />
              <Readout label="Clear rate" value={rate} unit="%" />
              <Readout label="Streak" value={pad(s.streak, 2)} unit="D" color="c-orange" />
              <Readout label="Overdue" value={pad(s.overdue)} color={s.overdue ? 'c-red' : ''} />
            </div>
          </Panel>

          <Panel title="Weekly_Flow" code={`+${weekXp} XP`} className="s-8" accent="yellow">
            <Bars data={a.week} height={200} legend={['Created', 'Cleared']} />
          </Panel>

          <Panel title="Power_Level" code={lvl.title.toUpperCase()} className="s-4">
            <Gauge pct={lvl.pct} label={`LV ${pad(lvl.level, 2)}`} size={150} />
            <table className="hud-kv" style={{ marginTop: 10 }}>
              <tbody>
                <tr><td>Total XP</td><td>{profile.xp}</td></tr>
                <tr><td>To next level</td><td>{lvl.needed - lvl.current} XP</td></tr>
              </tbody>
            </table>
          </Panel>

          <Panel title="Quest_Mix" code="BY DIFFICULTY" className="s-6">
            <table className="hud-kv">
              <tbody>
                {Object.entries(PRIORITIES).map(([k, p]) => {
                  const n = tasks.filter((t) => t.priority === k).length
                  const Icon = p.icon
                  return (
                    <tr key={k}>
                      <td style={{ color: p.color, width: 100 }}><Icon size={13} className="ico-inline" /> {p.label.toUpperCase()}</td>
                      <td><div className="hud-xp"><div style={{ width: `${(n / mixMax) * 100}%`, background: p.color, boxShadow: `0 0 8px ${p.color}` }} /></div></td>
                      <td style={{ width: 44 }}>{pad(n)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Panel>

          <Panel title="Diagnostics" code="INSIGHTS" className="s-6" accent="orange">
            <table className="hud-kv">
              <tbody>
                <tr><td>Quests pinned on map</td><td>{s.pinned} / {s.total}</td></tr>
                <tr><td>Cleared before due</td><td>{s.early}</td></tr>
                <tr><td>Bosses defeated</td><td>{s.bossDone}</td></tr>
                <tr><td>Open quests</td><td>{s.open}</td></tr>
                <tr><td>Peak hour</td><td>{a.bestHour !== null ? `${String(a.bestHour).padStart(2, '0')}:00` : '—'}</td></tr>
              </tbody>
            </table>
            <div className="hud-bars" style={{ height: 56, marginTop: 10, gap: 1 }} title="Quests cleared by hour of day">
              {a.hours.map((n, h) => (
                <div key={h} className="bar-col"><div className="bar b" style={{ height: `${(n / hourMax) * 100}%` }} /></div>
              ))}
            </div>
            <div className="hud-bar-labels"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
          </Panel>

          <div style={{ gridColumn: '1 / -1' }}><Wave level={Math.min(1, 0.2 + s.streak / 7)} /></div>
        </div>
      )}
    </div>
  )
}
