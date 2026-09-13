import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChessBoard } from '../components/ChessBoard'
import { MoveList, PlayerBar } from '../components/GamePanel'
import { useAuth } from '../context/AuthContext'
import { claimTimeout, makeMultiplayerMove, resignGame, subscribeGame } from '../lib/multiplayer'
import type { LiveGame as LiveGameType } from '../types'

function resultText(game: LiveGameType) {
  if (game.status === 'active') return game.turn === 'w' ? 'White to move' : 'Black to move'
  if (game.status === 'draw') return `Draw · ${game.resultReason ?? ''}`
  return `${game.status === 'white_win' ? game.white.username : game.black.username} wins · ${game.resultReason ?? ''}`
}

export default function LiveGame() {
  const { gameId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [game, setGame] = useState<LiveGameType | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => gameId ? subscribeGame(gameId, setGame) : undefined, [gameId])
  useEffect(() => {
    if (!game || game.status !== 'active') return
    const timer = window.setInterval(() => setTick((n) => n + 1), 250)
    return () => window.clearInterval(timer)
  }, [game?.status])
  useEffect(() => {
    if (!gameId || !game || !user || game.status !== 'active') return
    const elapsed = Math.max(0, Date.now() - game.lastMoveAt)
    const remaining = game.turn === 'w' ? game.whiteMs - elapsed : game.blackMs - elapsed
    if (remaining <= 0) void claimTimeout(gameId, user.uid)
  }, [gameId, game, user, tick])

  const color = useMemo(() => {
    if (!user || !game) return null
    if (game.white.uid === user.uid) return 'w'
    if (game.black.uid === user.uid) return 'b'
    return null
  }, [user, game])

  if (!gameId) return null
  if (!game) return <main className="center-stage"><div className="loader" /> <p>Loading game…</p></main>
  if (!color) return <main className="center-stage"><div className="card"><h2>This is not your seat.</h2><p className="muted">Open the spectator view instead.</p><button className="button" onClick={() => navigate(`/spectate/${gameId}`)}>Spectate game</button></div></main>

  const lastMove = Object.values(game.moves ?? {}).sort((a,b) => b.ply-a.ply)[0]
  const myTurn = game.status === 'active' && game.turn === color
  const move = async (from: string, to: string) => {
    if (!myTurn || !user) return
    try { await makeMultiplayerMove(gameId, user.uid, from, to) }
    catch (e) { setError(e instanceof Error ? e.message : 'Move failed.') }
  }
  const share = async () => {
    const url = `${window.location.origin}/spectate/${gameId}`
    await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1500)
  }
  const elapsed = game.status === 'active' ? Math.max(0, Date.now() - game.lastMoveAt) : 0
  const liveWhiteMs = Math.max(0, game.whiteMs - (game.turn === 'w' ? elapsed : 0))
  const liveBlackMs = Math.max(0, game.blackMs - (game.turn === 'b' ? elapsed : 0))
  const top = color === 'w' ? game.black : game.white
  const bottom = color === 'w' ? game.white : game.black
  const topMs = color === 'w' ? liveBlackMs : liveWhiteMs
  const bottomMs = color === 'w' ? liveWhiteMs : liveBlackMs

  return <main className="game-page"><div className="game-shell">
    <section className="board-column">
      <PlayerBar name={top.username} guest={top.guest} clock={topMs} active={game.turn !== color && game.status === 'active'} />
      <ChessBoard fen={game.fen} orientation={color === 'w' ? 'white' : 'black'} disabled={!myTurn} onMove={move} lastMove={lastMove} />
      <PlayerBar name={bottom.username} guest={bottom.guest} clock={bottomMs} active={myTurn} />
    </section>
    <aside className="game-sidebar card"><div className="game-side-head"><div><span className="eyebrow">LIVE GAME</span><h2>{resultText(game)}</h2></div><button className="button small" onClick={share}>{copied ? 'Copied' : 'Copy spectator link'}</button></div><MoveList game={game} /><div className="side-actions"><button className="danger-button" disabled={game.status !== 'active'} onClick={() => user && resignGame(gameId, user.uid)}>Resign</button></div>{error && <div className="error">{error}</div>}</aside>
  </div></main>
}
