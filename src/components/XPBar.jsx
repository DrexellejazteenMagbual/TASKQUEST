import { levelInfo } from '../lib/game'

export default function XPBar({ xp, compact = false }) {
  const l = levelInfo(xp)
  return (
    <div className="row">
      <div className="lvl-badge" style={compact ? { width: 46, height: 46, fontSize: 20 } : null}>
        <div><small>LV</small>{l.level}</div>
      </div>
      <div className="grow">
        <div className="row between small">
          <b className="ellipsis">{l.title}</b>
          <span className="muted tiny">{l.current} / {l.needed} XP</span>
        </div>
        <div className="xpbar" style={{ marginTop: 5 }}><div style={{ width: `${l.pct}%` }} /></div>
      </div>
    </div>
  )
}
