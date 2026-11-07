import { NavLink } from 'react-router-dom'
import { ChartColumn, Map, ScrollText, Shield, UserRound } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function BottomNav() {
  const { isAdmin } = useAuth()
  const items = [
    { to: '/', icon: ScrollText, label: 'Quests', end: true },
    { to: '/map', icon: Map, label: 'Map' },
    { to: '/stats', icon: ChartColumn, label: 'Stats' },
    { to: '/profile', icon: UserRound, label: 'Profile' },
  ]
  if (isAdmin) items.push({ to: '/admin', icon: Shield, label: 'Admin' })

  return (
    <nav className="nav">
      <div className="nav-brand"><img src="/pwa-64x64.png" alt="TaskQuest" /><b>TaskQuest</b></div>
      {items.map(({ to, icon: Icon, label, end }) => (
        <NavLink key={to} to={to} end={end}>
          <Icon size={24} strokeWidth={2.4} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
