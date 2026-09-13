import { Chess, type Square } from 'chess.js'
import { useMemo, useState } from 'react'

const PIECES: Record<string, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
}

interface Props {
  fen: string
  orientation?: 'white' | 'black'
  disabled?: boolean
  onMove?: (from: string, to: string) => void | Promise<void>
  lastMove?: { from: string; to: string }
}

export function ChessBoard({ fen, orientation = 'white', disabled, onMove, lastMove }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const game = useMemo(() => new Chess(fen), [fen])
  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>()
    try { return new Set(game.moves({ square: selected as Square, verbose: true }).map((m) => m.to)) }
    catch { return new Set<string>() }
  }, [game, selected])

  const ranks = orientation === 'white' ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8]
  const files = orientation === 'white' ? ['a','b','c','d','e','f','g','h'] : ['h','g','f','e','d','c','b','a']

  const choose = async (square: string) => {
    if (disabled) return
    if (selected && legalTargets.has(square)) {
      const from = selected
      setSelected(null)
      await onMove?.(from, square)
      return
    }
    const piece = game.get(square as Square)
    if (piece) setSelected(square)
    else setSelected(null)
  }

  return (
    <div className="board" aria-label="Chess board">
      {ranks.flatMap((rank) => files.map((file) => {
        const square = `${file}${rank}` as Square
        const piece = game.get(square)
        const light = ((file.charCodeAt(0) - 97) + rank) % 2 === 1
        const isSelected = selected === square
        const target = legalTargets.has(square)
        const wasMove = lastMove?.from === square || lastMove?.to === square
        return (
          <button
            key={square}
            className={`square ${light ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${wasMove ? 'last' : ''}`}
            onClick={() => choose(square)}
            draggable={!disabled && Boolean(piece)}
            onDragStart={(e) => { setSelected(square); e.dataTransfer.setData('text/plain', square) }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const from = e.dataTransfer.getData('text/plain'); setSelected(null); onMove?.(from, square) }}
            aria-label={square}
          >
            {target && <span className={`target ${piece ? 'capture' : ''}`} />}
            {piece && <span className={`piece piece-${piece.color}`}>{PIECES[`${piece.color}${piece.type}`]}</span>}
            {(file === files[0]) && <span className="rank-label">{rank}</span>}
            {(rank === ranks[ranks.length - 1]) && <span className="file-label">{file}</span>}
          </button>
        )
      }))}
    </div>
  )
}
