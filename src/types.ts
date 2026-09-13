export type PlayerColor = 'w' | 'b'
export type GameMode = 'random' | 'friend'
export type GameStatus = 'active' | 'white_win' | 'black_win' | 'draw' | 'aborted'

export interface PlayerInfo {
  uid: string
  username: string
  guest: boolean
}

export interface MoveLog {
  id: string
  ply: number
  san: string
  from: string
  to: string
  promotion?: string
  fen: string
  byUid: string
  movedAt: number
  thinkMs: number
  whiteMs: number
  blackMs: number
}

export interface LiveGame {
  id: string
  mode: GameMode
  status: GameStatus
  resultReason?: string
  createdAt: number
  updatedAt: number
  lastMoveAt: number
  fen: string
  turn: PlayerColor
  moveNumber: number
  whiteMs: number
  blackMs: number
  initialMs: number
  incrementMs: number
  white: PlayerInfo
  black: PlayerInfo
  moves?: Record<string, MoveLog>
}

export interface UserProfile {
  uid: string
  username: string
  usernameLower: string
  createdAt: number
}

export interface Challenge {
  id: string
  fromUid: string
  fromUsername: string
  toUid: string
  toUsername: string
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  createdAt: number
  gameId?: string
}
