import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { NavigatorHero, NavigatorSays } from '../components/Mascot'
import { NAVIGATORS, setNavigator, useNavigator } from '../lib/navigator'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const nav = useNavigator()

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (mode === 'register' && password !== confirmPw) { setErr('Passwords do not match'); return }
    if (password.length < 6) { setErr('Password must be at least 6 characters'); return }
    setBusy(true)
    try {
      if (mode === 'login') await signIn(username, password)
      else await signUp(username, password)
    } catch (ex) {
      setErr(ex.message)
    }
    setBusy(false)
  }

  return (
    <div className="login-wrap">
    <NavigatorHero />
    <div className="hero">
      <div style={{ marginBottom: 14 }}>
        <NavigatorSays size={84}>{mode === 'login' ? nav.lines.login : nav.lines.register}</NavigatorSays>
      </div>
      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="label">System navigator</span>
        <div className="nav-toggle" role="group" aria-label="Choose navigator">
          {Object.values(NAVIGATORS).map((n) => (
            <button key={n.key} type="button" className={nav.key === n.key ? 'on' : ''} onClick={() => setNavigator(n.key)}>{n.name}</button>
          ))}
        </div>
      </div>
      <h1 className="title">TaskQuest</h1>
      <p className="muted bold" style={{ margin: '6px 0 18px' }}>Turn your to-dos into quests on a map.</p>

      <form className="card stack" onSubmit={submit}>
        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr('') }}>Log in</button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr('') }}>Create account</button>
        </div>
        <div className="field">
          <label className="label" htmlFor="u">Username</label>
          <input
            id="u" className="input" autoComplete="username" autoCapitalize="none" value={username}
            onChange={(e) => setUsername(e.target.value)} required
            placeholder={mode === 'login' ? 'Your username' : '3–20 letters, numbers or _'}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="p">Password</label>
          <input id="p" type="password" className="input" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {mode === 'register' && (
          <div className="field">
            <label className="label" htmlFor="p2">Confirm password</label>
            <input id="p2" type="password" className="input" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
          </div>
        )}
        {err && <div className="error">{err}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Connecting…' : mode === 'login' ? 'Access system ▶' : 'Create operator ▶'}
        </button>
      </form>
    </div>
    </div>
  )
}
