import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './index.css'
import './hud.css'
import './hud-skin.css'
import App from './App'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './components/Toast'
import { isConfigured } from './lib/supabase'
import SetupNeeded from './pages/SetupNeeded'
import PwaPrompts from './components/PwaPrompts'
import { applyTheme } from './lib/themes'

// the whole app uses the sci-fi HUD design
document.body.classList.add('hud-mode')
applyTheme('sakura')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PwaPrompts />
    {isConfigured ? (
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    ) : (
      <SetupNeeded />
    )}
  </React.StrictMode>,
)
