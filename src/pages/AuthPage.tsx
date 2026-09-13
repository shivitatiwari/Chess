import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { signup, login, loginGoogle } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      if (mode === 'signup') await signup(email, password, username)
      else await login(email, password)
      navigate('/multiplayer')
    } catch (e) { setError(e instanceof Error ? e.message : 'Authentication failed.') }
    finally { setBusy(false) }
  }

  const google = async () => {
    setBusy(true); setError('')
    try { await loginGoogle(); navigate('/multiplayer') }
    catch (e) { setError(e instanceof Error ? e.message : 'Google sign-in failed.') }
    finally { setBusy(false) }
  }

  return <main className="narrow">
    <div className="card auth-card">
      <div className="tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button></div>
      <h2>{mode === 'login' ? 'Welcome back' : 'Create your player'}</h2>
      <form onSubmit={submit}>
        {mode === 'signup' && <label>Username<input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="apoorv_knight" /></label>}
        <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label>Password<input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="button primary full" disabled={busy}>{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <div className="divider"><span>or</span></div>
      <button className="button full" onClick={google} disabled={busy}>Continue with Google</button>
      {error && <div className="error">{error}</div>}
    </div>
  </main>
}
