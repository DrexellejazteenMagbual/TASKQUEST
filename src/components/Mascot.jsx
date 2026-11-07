// The user's selected system navigator as a HUD portrait.
// Used everywhere the app shows its companion character.
import { useNavigator } from '../lib/navigator'

export default function Mascot({ size = 84 }) {
  const nav = useNavigator()
  return (
    <div className="nav-portrait" style={{ width: size, height: size }} title={`${nav.name} · ${nav.role}`}>
      <svg viewBox="0 0 100 100" className="nav-portrait-rings" aria-hidden="true">
        <g className="spin-slow" style={{ transformOrigin: '50px 50px' }}>
          <circle cx="50" cy="50" r="48" className="ring dim" strokeDasharray="2 5" />
        </g>
        <g className="spin-rev" style={{ transformOrigin: '50px 50px' }}>
          <circle cx="50" cy="50" r="45" className="ring yellow" strokeDasharray="40 30" strokeWidth="1.6" />
        </g>
      </svg>
      <img src={nav.portrait} alt={nav.name} draggable="false" />
    </div>
  )
}

// Full-body hologram for large screens
export function NavigatorHero({ className = '' }) {
  const nav = useNavigator()
  return (
    <figure className={`nav-hero ${className}`}>
      <img src={nav.full} alt={`${nav.name}, ${nav.role}`} draggable="false" />
      <figcaption>
        <b>{nav.name}</b>
        <span>{nav.role}</span>
      </figcaption>
    </figure>
  )
}

// Portrait + speech line in a HUD box
export function NavigatorSays({ children, size = 64 }) {
  const nav = useNavigator()
  return (
    <div className="nav-says">
      <Mascot size={size} />
      <div className="speech grow">
        <b className="nav-says-name">{nav.name}</b>
        <span>{children}</span>
      </div>
    </div>
  )
}
