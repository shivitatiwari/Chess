import type { LiveGame, MoveLog } from '../types'

export function formatClock(ms: number) {
  const safe = Math.max(0, ms)
  const minutes = Math.floor(safe / 60000)
  const seconds = Math.floor((safe % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function PlayerBar({ name, clock, active, guest }: { name: string; clock?: number; active?: boolean; guest?: boolean }) {
  return <div className={`player-bar ${active ? 'active' : ''}`}>
    <div><span className="status-dot" /><strong>{name}</strong>{guest && <span className="pill">guest</span>}</div>
    {clock !== undefined && <div className="clock">{formatClock(clock)}</div>}
  </div>
}

export function MoveList({ game }: { game: LiveGame }) {
  const moves = Object.values(game.moves ?? {}).sort((a: MoveLog, b: MoveLog) => a.ply - b.ply)
  const rows: { n: number; w?: MoveLog; b?: MoveLog }[] = []
  for (const move of moves) {
    const index = Math.floor((move.ply - 1) / 2)
    rows[index] ??= { n: index + 1 }
    if (move.ply % 2 === 1) rows[index].w = move
    else rows[index].b = move
  }
  return <div className="move-list">
    <div className="move-header">Moves</div>
    {!rows.length && <div className="muted empty">No moves yet.</div>}
    {rows.map((row) => <div className="move-row" key={row.n}>
      <span>{row.n}.</span><span>{row.w?.san ?? ''}</span><span>{row.b?.san ?? ''}</span>
    </div>)}
  </div>
}
