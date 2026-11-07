import { Check, Globe2, Hourglass, MapPin, Navigation, Sparkles, TriangleAlert } from 'lucide-react'
import { PRIORITIES } from '../lib/game'

const fmtDue = (d) => new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export function PriorityChip({ priority }) {
  const p = PRIORITIES[priority] || PRIORITIES.normal
  const Icon = p.icon
  return <span className="chip" style={{ color: p.color }}><Icon size={13} strokeWidth={2.6} /> {p.label}</span>
}

export default function TaskCard({ task, onToggle, onEdit, onMap, readOnly = false }) {
  const p = PRIORITIES[task.priority] || PRIORITIES.normal
  const done = task.status === 'done'
  const overdue = !done && task.due_at && new Date(task.due_at) < new Date()

  return (
    <div className={`card quest ${done ? 'done' : ''}`}>
      <div className="q-stripe" style={{ background: p.color, boxShadow: `0 0 10px ${p.color}` }} />
      {!readOnly && (
        <button className="q-check" onClick={() => onToggle(task)} aria-label={done ? 'Mark as not done' : 'Complete quest'}>
          {done && <Check size={20} strokeWidth={3.2} />}
        </button>
      )}
      <div className="grow" onClick={() => onEdit?.(task)} style={{ cursor: onEdit ? 'pointer' : 'default' }}>
        <p className="q-title">{task.title}</p>
        {task.description && <div className="small muted" style={{ marginBottom: 6 }}>{task.description}</div>}
        <div className="row wrap" style={{ gap: 6 }}>
          <PriorityChip priority={task.priority} />
          {task.is_public && <span className="chip"><Globe2 size={13} /> Public</span>}
          <span className="chip"><Sparkles size={13} /> {task.xp_reward} XP</span>
          {task.due_at && (
            <span className="chip" style={overdue ? { color: 'var(--h-red)' } : null}>
              {overdue ? <TriangleAlert size={13} /> : <Hourglass size={13} />} {fmtDue(task.due_at)}
            </span>
          )}
        </div>
        {task.place_name && (
          <div className="tiny muted ellipsis" style={{ marginTop: 6 }}>
            <MapPin size={12} className="ico-inline" /> {task.place_name}
          </div>
        )}
      </div>
      {task.lat != null && onMap && (
        <button className="icon-btn" onClick={() => onMap(task)} aria-label="Show on map"><Navigation size={18} /></button>
      )}
    </div>
  )
}
