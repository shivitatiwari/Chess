import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChessBoard } from '../components/ChessBoard'
import { MoveList, PlayerBar } from '../components/GamePanel'
import { subscribeGame } from '../lib/multiplayer'
import type { LiveGame } from '../types'

export default function Spectate() {
  const { gameId } = useParams()
  const [game, setGame] = useState<LiveGame | null>(null)
  const [, setTick] = useState(0)
  useEffect(() => gameId ? subscribeGame(gameId, setGame) : undefined, [gameId])
  useEffect(() => {
    if (!game || game.status !== 'active') return
    const timer = window.setInterval(() => setTick((n) => n + 1), 250)
    return () => window.clearInterval(timer)
  }, [game?.status])
  if (!game) return <main className="center-stage"><div className="loader"/><p>Waiting for game…</p></main>
  const last = Object.values(game.moves ?? {}).sort((a,b) => b.ply-a.ply)[0]
  const elapsed = game.status === 'active' ? Math.max(0, Date.now() - game.lastMoveAt) : 0
  const whiteMs = Math.max(0, game.whiteMs - (game.turn === 'w' ? elapsed : 0))
  const blackMs = Math.max(0, game.blackMs - (game.turn === 'b' ? elapsed : 0))
  return <main className="game-page"><div className="spectator-banner">SPECTATOR MODE · read only</div><div className="game-shell"><section className="board-column"><PlayerBar name={game.black.username} guest={game.black.guest} clock={blackMs} active={game.turn === 'b' && game.status === 'active'} /><ChessBoard fen={game.fen} disabled lastMove={last}/><PlayerBar name={game.white.username} guest={game.white.guest} clock={whiteMs} active={game.turn === 'w' && game.status === 'active'} /></section><aside className="game-sidebar card"><span className="eyebrow">WATCHING LIVE</span><h2>{game.white.username} vs {game.black.username}</h2><p className="muted">{game.status === 'active' ? `${game.turn === 'w' ? 'White' : 'Black'} to move` : `${game.status.replace('_',' ')} · ${game.resultReason ?? ''}`}</p><MoveList game={game}/></aside></div></main>
}
