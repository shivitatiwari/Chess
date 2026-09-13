import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Header() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  return <header className="site-header">
    <Link to="/" className="brand"><span className="brand-mark">♞</span><span>Apoorv's Chess</span></Link>
    <nav>
      <Link to="/bot">Bot</Link>
      <Link to="/multiplayer">Multiplayer</Link>
      {user && !user.isAnonymous ? <>
        <span className="user-chip">@{profile?.username ?? 'set-username'}</span>
        <button className="text-button" onClick={async () => { await signOut(); navigate('/') }}>Sign out</button>
      </> : <Link className="button small" to="/auth">Sign in</Link>}
    </nav>
  </header>
}
