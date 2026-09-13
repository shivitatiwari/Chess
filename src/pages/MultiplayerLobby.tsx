import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { findRandomMatch, respondChallenge, sendChallenge, subscribeInbox, subscribeOutbox } from '../lib/multiplayer'
import type { Challenge } from '../types'

export default function MultiplayerLobby() {
  const { user, profile, ensureGuest, claimUsername } = useAuth()
  const navigate = useNavigate()
  const [target, setTarget] = useState('')
  const [username, setUsername] = useState('')
  const [inbox, setInbox] = useState<Challenge[]>([])
  const [outbox, setOutbox] = useState<Challenge[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || user.isAnonymous) return
    const a = subscribeInbox(user.uid, setInbox)
    const b = subscribeOutbox(user.uid, setOutbox)
    return () => { a(); b() }
  }, [user])

  useEffect(() => {
    const accepted = outbox.find((c) => c.status === 'accepted' && c.gameId)
    if (accepted?.gameId) navigate(`/play/${accepted.gameId}`)
  }, [outbox, navigate])

  const random = async () => {
    setBusy(true); setError('')
    try { const u = user ?? await ensureGuest(); navigate(`/play/${await findRandomMatch(u, profile)}`) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not match.') }
    finally { setBusy(false) }
  }

  const challenge = async () => {
    if (!user || user.isAnonymous || !profile) return
    setBusy(true); setError('')
    try { await sendChallenge(user, profile, target); setTarget('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Challenge failed.') }
    finally { setBusy(false) }
  }

  if (user && !user.isAnonymous && !profile) return <main className="narrow"><div className="card"><h2>Pick your username</h2><p className="muted">Friend challenges use unique usernames.</p><label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="apoorv_knight" /></label><button className="button primary full" onClick={async () => { try { await claimUsername(username) } catch (e) { setError(e instanceof Error ? e.message : 'Could not save username.') } }}>Save username</button>{error && <div className="error">{error}</div>}</div></main>

  return <main className="lobby-page">
    <section className="lobby-grid">
      <div className="card lobby-card"><div className="big-icon">⚡</div><h2>Random match</h2><p>Instant 10-minute chess. Guests are allowed — no signup screen required.</p><button className="button primary full" onClick={random} disabled={busy}>{busy ? 'Matching…' : 'Find opponent'}</button></div>
      <div className={`card lobby-card ${(!user || user.isAnonymous) ? 'locked' : ''}`}><div className="big-icon">♟</div><h2>Challenge a friend</h2><p>Enter an exact username. Both players must have signed-in accounts.</p>{user && !user.isAnonymous && profile ? <div className="inline-form"><input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="username"/><button className="button" onClick={challenge} disabled={!target || busy}>Challenge</button></div> : <button className="button full" onClick={() => navigate('/auth')}>Sign in to challenge</button>}</div>
    </section>
    {user && !user.isAnonymous && <section className="challenge-section card"><h3>Challenges</h3>{!inbox.filter(c => c.status === 'pending').length && <p className="muted">No incoming challenges.</p>}{inbox.filter(c => c.status === 'pending').map((c) => <div className="challenge-row" key={c.id}><div><strong>@{c.fromUsername}</strong><span className="muted"> wants a game</span></div><div><button className="button small" onClick={async () => { if (!user || !profile) return; const id = await respondChallenge(c, true, user, profile); if (id) navigate(`/play/${id}`) }}>Accept</button><button className="text-button" onClick={() => user && profile && respondChallenge(c, false, user, profile)}>Decline</button></div></div>)}</section>}
    {error && <div className="error centered">{error}</div>}
  </main>
}
