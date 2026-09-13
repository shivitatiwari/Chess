import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { findRandomMatch } from '../lib/multiplayer'

export default function Home() {
  const { user, profile, ensureGuest } = useAuth()
  const navigate = useNavigate()
  const [finding, setFinding] = useState(false)
  const [error, setError] = useState('')

  const random = async () => {
    setFinding(true); setError('')
    try {
      const current = user ?? await ensureGuest()
      const id = await findRandomMatch(current, profile)
      navigate(`/play/${id}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Matchmaking failed.') }
    finally { setFinding(false) }
  }

  return <main>
    <section className="hero">
      <div className="eyebrow">PLAY · THINK · WIN</div>
      <h1>Chess without the clutter.</h1>
      <p>Five bot levels, instant random multiplayer, username challenges, live spectators and complete move + clock logs.</p>
      <div className="hero-actions">
        <button className="button primary" onClick={random} disabled={finding}>{finding ? 'Finding opponent…' : 'Random match'}</button>
        <Link className="button" to="/bot">Play a bot</Link>
      </div>
      {error && <div className="error">{error}</div>}
    </section>
    <section className="feature-grid">
      <article><span>01</span><h3>5 bot levels</h3><p>From random beginner play to deeper alpha-beta search.</p></article>
      <article><span>02</span><h3>Live multiplayer</h3><p>Every game gets an isolated realtime room and move ledger.</p></article>
      <article><span>03</span><h3>Challenge friends</h3><p>Signed-in users can find opponents directly by username.</p></article>
      <article><span>04</span><h3>Spectate</h3><p>Copy a read-only link and let anyone follow the game live.</p></article>
    </section>
  </main>
}
