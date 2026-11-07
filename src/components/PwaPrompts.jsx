import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Download, RefreshCw, X } from 'lucide-react'

// "Install app" banner (Android / desktop Chrome & Edge) + "update available" banner
export default function PwaPrompts() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  const [installEvt, setInstallEvt] = useState(null)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('tq:install-dismissed') === '1' } catch { return false }
  })

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvt(e) }
    const onInstalled = () => setInstallEvt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem('tq:install-dismissed', '1') } catch { /* ignore */ }
  }

  const install = async () => {
    installEvt.prompt()
    await installEvt.userChoice
    setInstallEvt(null)
  }

  let banner = null
  if (needRefresh) {
    banner = (
      <div className="pwa-banner">
        <RefreshCw size={20} />
        <span className="grow small bold">A new version of TaskQuest is ready.</span>
        <button className="btn btn-sm btn-primary" onClick={() => updateServiceWorker(true)}>Update</button>
        <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setNeedRefresh(false)} aria-label="Later"><X size={16} /></button>
      </div>
    )
  } else if (installEvt && !dismissed) {
    banner = (
      <div className="pwa-banner">
        <img src="/pwa-64x64.png" alt="" width="36" height="36" style={{ borderRadius: 10, border: '2px solid var(--ink)' }} />
        <span className="grow small bold">Install TaskQuest on your device</span>
        <button className="btn btn-sm btn-primary" onClick={install}><Download size={14} /> Install</button>
        <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={dismiss} aria-label="Not now"><X size={16} /></button>
      </div>
    )
  }
  return banner ? createPortal(banner, document.body) : null
}
