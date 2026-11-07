import { useMemo, useState } from 'react'
import { Flame, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useTasks } from '../lib/useTasks'
import { streakDays } from '../lib/game'
import TaskCard from '../components/TaskCard'
import TaskForm from '../components/TaskForm'
import XPBar from '../components/XPBar'
import Avatar from '../components/Avatar'
import Mascot, { NavigatorSays } from '../components/Mascot'
import { useNavigator } from '../lib/navigator'

const FILTERS = { active: 'Active', today: 'Today', done: 'Cleared', all: 'All' }

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning, operator' : h < 18 ? 'Good afternoon, operator' : 'Good evening, operator'
}

export default function Quests() {
  const { profile } = useAuth()
  const { tasks, loading, add, edit, remove, toggle } = useTasks()
  const [filter, setFilter] = useState('active')
  const [form, setForm] = useState(null) // null | {} | task
  const nav = useNavigate()

  const shown = useMemo(() => {
    const today = new Date().toDateString()
    const list = tasks.filter((t) => {
      if (filter === 'active') return t.status !== 'done'
      if (filter === 'done') return t.status === 'done'
      if (filter === 'today') return t.due_at && new Date(t.due_at).toDateString() === today
      return true
    })
    // open quests first, then by due date
    const due = (t) => (t.due_at ? new Date(t.due_at).getTime() : 8.64e15)
    return list.sort((a, b) => (a.status === 'done') - (b.status === 'done') || due(a) - due(b))
  }, [tasks, filter])

  const open = tasks.filter((t) => t.status !== 'done').length
  const guide = useNavigator()
  const overdueCount = tasks.filter((t) => t.status !== 'done' && t.due_at && new Date(t.due_at) < new Date()).length
  const firstName = profile.display_name || profile.username
  const navLine = loading ? 'Syncing quest data…'
    : overdueCount > 0 ? guide.lines.overdue(overdueCount)
    : tasks.length > 0 && open === 0 ? guide.lines.allDone
    : tasks.length === 0 ? guide.lines.empty
    : guide.lines.greet(firstName)
  const streak = streakDays(tasks)

  return (
    <div className="page page-wide">
      <div className="row between">
        <div>
          <div className="muted small bold">{greeting()},</div>
          <h1 className="title">{profile.display_name || profile.username}</h1>
        </div>
        <button onClick={() => nav('/profile')} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} aria-label="Profile">
          <Avatar profile={profile} size={54} />
        </button>
      </div>

      <div className="mt"><NavigatorSays size={76}>{navLine}</NavigatorSays></div>

      <div className="card mt"><XPBar xp={profile.xp} /></div>

      <div className="grid2 mt">
        <div className="card stat"><b>{open}</b><span className="small bold">Open quests</span></div>
        <div className="card stat"><b className="title-row" style={{ justifyContent: 'center' }}>{streak}<Flame size={24} color="var(--h-orange)" /></b><span className="small bold">Day streak</span></div>
      </div>

      <h2 className="h2">Quest_Board</h2>
      <div className="tabs">
        {Object.entries(FILTERS).map(([k, v]) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{v}</button>
        ))}
      </div>

      <div className="stack mt quest-list">
        {loading && <div className="spinner" />}
        {!loading && shown.length === 0 && (
          <div className="empty card">
            <div style={{ display: 'grid', placeItems: 'center' }}><Mascot size={96} /></div>
            <p className="bold" style={{ margin: '8px 0 4px' }}>{filter === 'done' ? 'No cleared quests yet' : 'The quest board is empty!'}</p>
            <p className="small muted" style={{ margin: 0 }}>Tap the + button to accept a new quest.</p>
          </div>
        )}
        {shown.map((t) => (
          <TaskCard key={t.id} task={t} onToggle={toggle} onEdit={t.is_public ? undefined : setForm} onMap={(task) => nav(`/map?task=${task.id}`)} />
        ))}
      </div>

      <button className="fab" onClick={() => setForm({})} aria-label="New quest"><Plus size={32} strokeWidth={3} /></button>

      {form && (
        <TaskForm
          initial={form}
          onClose={() => setForm(null)}
          onSave={(data) => (form.id ? edit(form.id, data) : add(data))}
          onDelete={form.is_public ? null : remove}
        />
      )}
    </div>
  )
}
