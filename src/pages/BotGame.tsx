import { Chess } from 'chess.js'
import { useEffect, useMemo, useState } from 'react'
import { ChessBoard } from '../components/ChessBoard'
import { chooseBotMove } from '../lib/bot'

const NAMES = ['','Casual','Learner','Club','Expert','Apoorv Engine']

export default function BotGame() {
  const [level, setLevel] = useState(3)
  const [fen, setFen] = useState(() => new Chess().fen())
  const [history, setHistory] = useState<{san:string;from:string;to:string}[]>([])
  const [thinking, setThinking] = useState(false)
  const game = useMemo(() => new Chess(fen), [fen])

  const reset = () => { setFen(new Chess().fen()); setHistory([]); setThinking(false) }

  const move = (from: string, to: string) => {
    if (thinking || game.turn() !== 'w' || game.isGameOver()) return
    const next = new Chess(fen)
    try {
      const m = next.move({ from, to, promotion: 'q' })
      if (!m) return
      setHistory((h) => [...h, { san: m.san, from: m.from, to: m.to }])
      setFen(next.fen())
    } catch { /* invalid move */ }
  }

  useEffect(() => {
    const current = new Chess(fen)
    if (current.turn() !== 'b' || current.isGameOver()) return
    setThinking(true)
    const t = window.setTimeout(() => {
      const picked = chooseBotMove(current.fen(), level)
      if (picked) {
        const m = current.move(picked)
        setHistory((h) => [...h, { san: m.san, from: m.from, to: m.to }])
        setFen(current.fen())
      }
      setThinking(false)
    }, level >= 5 ? 350 : 220)
    return () => window.clearTimeout(t)
  }, [fen, level])

  const status = game.isCheckmate() ? (game.turn() === 'w' ? 'Bot wins by checkmate' : 'You win by checkmate') : game.isDraw() ? 'Draw' : thinking ? 'Bot is thinking…' : game.turn() === 'w' ? 'Your move' : 'Bot to move'

  return <main className="game-page">
    <div className="game-shell">
      <section className="board-column">
        <div className="player-bar"><div><span className="status-dot" /><strong>{NAMES[level]}</strong><span className="pill">bot · L{level}</span></div></div>
        <ChessBoard fen={fen} onMove={move} disabled={thinking || game.isGameOver()} lastMove={history.at(-1)} />
        <div className="player-bar active"><div><span className="status-dot" /><strong>You</strong></div></div>
      </section>
      <aside className="game-sidebar card">
        <h2>Bot game</h2>
        <p className="muted">{status}</p>
        <label>Difficulty
          <select value={level} onChange={(e) => { setLevel(Number(e.target.value)); reset() }}>
            {[1,2,3,4,5].map((n) => <option key={n} value={n}>Level {n} — {NAMES[n]}</option>)}
          </select>
        </label>
        <button className="button full" onClick={reset}>New game</button>
        <div className="move-list"><div className="move-header">Moves</div>{history.map((m, i) => <div className="move-row compact" key={i}><span>{i + 1}</span><span>{m.san}</span></div>)}</div>
      </aside>
    </div>
  </main>
}
