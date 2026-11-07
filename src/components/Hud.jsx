// Sci-fi HUD building blocks for the admin console
import { useEffect, useState } from 'react'
import { htmlIcon } from './MapKit'

// HUD mode is now global (set in main.jsx); kept so existing calls still work
export function useHudMode() {}

export function Panel({ title, code, children, className = '', style, accent }) {
  return (
    <section className={`hud-panel ${accent ? `hud-${accent}` : ''} ${className}`} style={style}>
      {title && (
        <header className="hud-title">
          <span>{title}<i>_</i></span>
          {code && <small>{code}</small>}
        </header>
      )}
      {children}
    </section>
  )
}

export function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  return <span className="hud-clock">{now.toLocaleTimeString([], { hour12: false })}</span>
}

// Concentric spinning rings with a value in the middle
export function Radar({ value, label, size = 200 }) {
  const c = size / 2
  return (
    <svg className="hud-radar" viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }}>
      <g className="spin-slow" style={{ transformOrigin: `${c}px ${c}px` }}>
        <circle cx={c} cy={c} r={c - 4} className="ring dim" strokeDasharray="2 6" />
        <circle cx={c} cy={c} r={c - 14} className="ring" strokeDasharray="60 20 10 20" />
      </g>
      <g className="spin-rev" style={{ transformOrigin: `${c}px ${c}px` }}>
        <circle cx={c} cy={c} r={c - 28} className="ring yellow" strokeDasharray="90 40 4 40" strokeWidth="3" />
        <circle cx={c} cy={c} r={c - 40} className="ring orange" strokeDasharray="4 8" />
      </g>
      <g className="spin-fast" style={{ transformOrigin: `${c}px ${c}px` }}>
        <circle cx={c} cy={c} r={c - 52} className="ring" strokeDasharray="30 150" strokeWidth="4" />
      </g>
      <circle cx={c} cy={c} r={c - 62} className="ring dim" />
      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1={c} y1={6} x2={c} y2={16} className="tick" transform={`rotate(${a} ${c} ${c})`} />
      ))}
      <text x={c} y={c + 4} className="radar-value">{value}</text>
      <text x={c} y={c + 24} className="radar-label">{label}</text>
    </svg>
  )
}

// Ring gauge 0..100
export function Gauge({ pct, label, color = 'cyan', size = 120 }) {
  const r = size / 2 - 10
  const len = 2 * Math.PI * r
  const c = size / 2
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} className="hud-gauge">
      <circle cx={c} cy={c} r={r} className="ring dim" strokeWidth="8" />
      <circle
        cx={c} cy={c} r={r} className={`ring ${color}`} strokeWidth="8"
        strokeDasharray={`${(len * pct) / 100} ${len}`} transform={`rotate(-90 ${c} ${c})`}
        style={{ transition: 'stroke-dasharray .8s' }}
      />
      <circle cx={c} cy={c} r={r - 12} className="ring dim" strokeDasharray="2 4" />
      <text x={c} y={c + 6} className="gauge-value">{pct}%</text>
      {label && <text x={c} y={c + 22} className="radar-label">{label}</text>}
    </svg>
  )
}

// Vertical bar chart: data = [{ label, a, b? }]
export function Bars({ data, height = 150, legend }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b ?? 0]))
  return (
    <div>
      <div className="hud-bars" style={{ height }}>
        {[0.25, 0.5, 0.75].map((g) => <div key={g} className="grid-line" style={{ bottom: `${g * 100}%` }} />)}
        {data.map((d) => (
          <div key={d.label} className="bar-col" title={`${d.label}: ${d.a}${d.b != null ? ` / ${d.b}` : ''}`}>
            <div className="bar a" style={{ height: `${(d.a / max) * 100}%` }} />
            {d.b != null && <div className="bar b" style={{ height: `${(d.b / max) * 100}%` }} />}
          </div>
        ))}
      </div>
      <div className="hud-bar-labels">{data.map((d) => <span key={d.label}>{d.label}</span>)}</div>
      {legend && (
        <div className="hud-legend">
          <span><i className="a" />{legend[0]}</span>
          {legend[1] && <span><i className="b" />{legend[1]}</span>}
        </div>
      )}
    </div>
  )
}

// Signal-strength style segmented bar
export function SegBar({ pct, segments = 20 }) {
  const on = Math.round((pct / 100) * segments)
  return (
    <div className="hud-seg">
      {Array.from({ length: segments }, (_, i) => <i key={i} className={i < on ? (i > segments * 0.75 ? 'hot' : 'on') : ''} />)}
    </div>
  )
}

// Decorative animated waveform (amplitude follows `level` 0..1)
export function Wave({ bars = 90, level = 0.5 }) {
  return (
    <div className="hud-wave" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <i key={i} style={{ animationDelay: `${(i * 37) % 1000}ms`, '--amp': `${20 + ((i * 53) % 80) * level}%` }} />
      ))}
    </div>
  )
}

// Big number with label, HUD style
export function Readout({ label, value, unit, color }) {
  return (
    <div className="hud-readout">
      <small>{label}</small>
      <b className={color}>{value}{unit && <em>{unit}</em>}</b>
    </div>
  )
}

export const hudDot = (online) =>
  htmlIcon(<div className={`hud-dot ${online ? 'online' : ''}`}><span /></div>, { size: [22, 22] })

export function hudAvatarPin(u, online) {
  return htmlIcon(
    <div className={`hud-pin ${online ? 'online' : ''}`}>
      {u.avatar_url ? <img src={u.avatar_url} alt="" /> : (u.display_name || u.username || '?')[0].toUpperCase()}
    </div>,
    { size: [40, 40] },
  )
}

export const pad = (n, w = 3) => String(n).padStart(w, '0')
