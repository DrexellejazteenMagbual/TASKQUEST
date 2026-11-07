import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import Mascot from './Mascot'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [burst, setBurst] = useState(null)
  const t1 = useRef()
  const t2 = useRef()

  // show(message) or show(message, IconComponent)
  const show = useCallback((msg, icon = null) => {
    clearTimeout(t1.current)
    setToast({ msg, icon })
    t1.current = setTimeout(() => setToast(null), 2600)
  }, [])

  // big anime-style "LEVEL UP!" splash
  const celebrate = useCallback((text) => {
    clearTimeout(t2.current)
    setBurst(text)
    t2.current = setTimeout(() => setBurst(null), 1700)
  }, [])

  const value = useMemo(() => ({ show, celebrate }), [show, celebrate])
  const Icon = toast?.icon || Sparkles

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {toast && <div className="toast"><Icon size={18} strokeWidth={2.6} />{toast.msg}</div>}
      {burst && <div className="burst"><div className="burst-wrap"><Mascot size={130} /><div>{burst}</div></div></div>}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
