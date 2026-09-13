import { Chess, type Move } from 'chess.js'

const VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 }

function evaluate(game: Chess) {
  if (game.isCheckmate()) return game.turn() === 'w' ? -999999 : 999999
  if (game.isDraw()) return 0
  let score = 0
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue
      const val = VALUES[piece.type] ?? 0
      score += piece.color === 'w' ? val : -val
    }
  }
  return score
}

function orderedMoves(game: Chess): Move[] {
  return game.moves({ verbose: true }).sort((a, b) => {
    const av = a.captured ? VALUES[a.captured] : 0
    const bv = b.captured ? VALUES[b.captured] : 0
    return bv - av
  })
}

function minimax(game: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || game.isGameOver()) return evaluate(game)
  const maximizing = game.turn() === 'w'
  if (maximizing) {
    let best = -Infinity
    for (const move of orderedMoves(game)) {
      game.move(move)
      best = Math.max(best, minimax(game, depth - 1, alpha, beta))
      game.undo()
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  }
  let best = Infinity
  for (const move of orderedMoves(game)) {
    game.move(move)
    best = Math.min(best, minimax(game, depth - 1, alpha, beta))
    game.undo()
    beta = Math.min(beta, best)
    if (beta <= alpha) break
  }
  return best
}

export function chooseBotMove(fen: string, level: number): Move | null {
  const game = new Chess(fen)
  const moves = game.moves({ verbose: true })
  if (!moves.length) return null
  if (level <= 1) return moves[Math.floor(Math.random() * moves.length)]

  if (level === 2) {
    const scored = moves.map((m) => ({ m, score: (m.captured ? VALUES[m.captured] : 0) + Math.random() * 100 }))
    scored.sort((a, b) => b.score - a.score)
    return scored[0].m
  }

  const depth = level === 3 ? 1 : level === 4 ? 2 : 3
  const maximizing = game.turn() === 'w'
  let bestMove = moves[0]
  let bestScore = maximizing ? -Infinity : Infinity
  for (const move of orderedMoves(game)) {
    game.move(move)
    const score = minimax(game, depth - 1, -Infinity, Infinity)
    game.undo()
    if ((maximizing && score > bestScore) || (!maximizing && score < bestScore)) {
      bestScore = score
      bestMove = move
    }
  }
  return bestMove
}
