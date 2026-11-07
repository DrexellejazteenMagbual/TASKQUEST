import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import BottomNav from './components/BottomNav'
import LocationReporter from './components/LocationReporter'
import CameraRequestListener from './components/CameraRequestListener'
import ConsentPrompt from './components/ConsentPrompt'
import Login from './pages/Login'
import Quests from './pages/Quests'
import MapPage from './pages/MapPage'
import Stats from './pages/Stats'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import AdminUser from './pages/AdminUser'

export default function App() {
  const { user, profile, loading, isAdmin, askConsent } = useAuth()

  if (loading) return <div className="spinner" />
  if (!user) return <Login />
  if (!profile) return <div className="spinner" />

  return (
    <div className="app">
      <LocationReporter />
      <CameraRequestListener />
      <Routes>
        <Route path="/" element={<Quests />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/profile" element={<Profile />} />
        {isAdmin && <Route path="/admin" element={<Admin />} />}
        {isAdmin && <Route path="/admin/user/:id" element={<AdminUser />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
      {askConsent && !isAdmin && <ConsentPrompt />}
    </div>
  )
}
