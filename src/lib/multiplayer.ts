import { Chess } from 'chess.js'
import {
  get, onValue, push, ref, remove, runTransaction, set, update,
  type Unsubscribe,
} from 'firebase/database'
import { doc, setDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { firestore, realtime } from './firebase'
import type { Challenge, LiveGame, MoveLog, PlayerColor, PlayerInfo, UserProfile } from '../types'

const START_FEN = new Chess().fen()
const MATCH_MS = 10 * 60 * 1000
const QUEUE_TTL = 2 * 60 * 1000

export function playerInfo(user: User, profile: UserProfile | null): PlayerInfo {
  return {
    uid: user.uid,
    username: user.isAnonymous ? `Guest-${user.uid.slice(0, 5)}` : (profile?.username ?? `Player-${user.uid.slice(0, 5)}`),
    guest: user.isAnonymous,
  }
}

async function ensureGame(gameId: string, a: PlayerInfo, b: PlayerInfo, mode: 'random' | 'friend', whiteUid?: string) {
  const now = Date.now()
  const firstWhite = whiteUid ?? (Math.random() > 0.5 ? a.uid : b.uid)
  const white = firstWhite === a.uid ? a : b
  const black = firstWhite === a.uid ? b : a
  const gameRef = ref(realtime, `games/${gameId}`)
  await runTransaction(gameRef, (current) => {
    if (current) return current
    return {
      id: gameId, mode, status: 'active', createdAt: now, updatedAt: now, lastMoveAt: now,
      fen: START_FEN, turn: 'w', moveNumber: 0, whiteMs: MATCH_MS, blackMs: MATCH_MS,
      initialMs: MATCH_MS, incrementMs: 0, white, black, moves: {},
    } satisfies LiveGame
  })
  await setDoc(doc(firestore, 'gameLogs', gameId), {
    id: gameId, mode, createdAt: now, white, black, status: 'active',
  }, { merge: true })
  return gameId
}

interface QueueState {
  waiting?: Record<string, { player: PlayerInfo; joinedAt: number }>
  paired?: Record<string, { gameId: string; opponent: PlayerInfo; whiteUid: string; pairedAt: number }>
}

export async function findRandomMatch(user: User, profile: UserProfile | null): Promise<string> {
  const me = playerInfo(user, profile)
  const queueRef = ref(realtime, 'matchmaking/standard')
  const candidateGameId = push(ref(realtime, 'games')).key!
  const now = Date.now()

  const result = await runTransaction(queueRef, (raw: QueueState | null) => {
    const state: QueueState = raw ?? { waiting: {}, paired: {} }
    state.waiting ??= {}
    state.paired ??= {}
    const already = state.paired[user.uid]
    if (already) return state

    for (const [uid, entry] of Object.entries(state.waiting)) {
      if (now - entry.joinedAt > QUEUE_TTL) delete state.waiting[uid]
    }

    const opponentEntry = Object.entries(state.waiting)
      .filter(([uid]) => uid !== user.uid)
      .sort((a, b) => a[1].joinedAt - b[1].joinedAt)[0]

    if (!opponentEntry) {
      state.waiting[user.uid] = { player: me, joinedAt: now }
      return state
    }

    const [opponentUid, opponent] = opponentEntry
    delete state.waiting[opponentUid]
    delete state.waiting[user.uid]
    const whiteUid = Math.random() > 0.5 ? user.uid : opponentUid
    const pair = { gameId: candidateGameId, opponent: opponent.player, whiteUid, pairedAt: now }
    state.paired[user.uid] = pair
    state.paired[opponentUid] = { gameId: candidateGameId, opponent: me, whiteUid, pairedAt: now }
    return state
  })

  const pair = (result.snapshot.val() as QueueState)?.paired?.[user.uid]
  if (pair) {
    await ensureGame(pair.gameId, me, pair.opponent, 'random', pair.whiteUid)
    await remove(ref(realtime, `matchmaking/standard/paired/${user.uid}`))
    return pair.gameId
  }

  return new Promise((resolve, reject) => {
    const mine = ref(realtime, `matchmaking/standard/paired/${user.uid}`)
    const timeout = window.setTimeout(() => {
      unsub()
      remove(ref(realtime, `matchmaking/standard/waiting/${user.uid}`)).catch(() => {})
      reject(new Error('No opponent found yet. Try again.'))
    }, 60_000)
    const unsub = onValue(mine, async (snap) => {
      const next = snap.val()
      if (!next?.gameId) return
      window.clearTimeout(timeout)
      unsub()
      await ensureGame(next.gameId, me, next.opponent, 'random', next.whiteUid)
      await remove(ref(realtime, `matchmaking/standard/paired/${user.uid}`))
      resolve(next.gameId)
    })
  })
}

export async function sendChallenge(user: User, profile: UserProfile, targetUsername: string) {
  const clean = targetUsername.trim().toLowerCase()
  const usernameSnap = await import('firebase/firestore').then(({ getDoc }) => getDoc(doc(firestore, 'usernames', clean)))
  if (!usernameSnap.exists()) throw new Error('No player found with that username.')
  const target = usernameSnap.data() as { uid: string; username: string }
  if (target.uid === user.uid) throw new Error('You cannot challenge yourself.')
  const id = push(ref(realtime, 'challenges')).key!
  const challenge: Challenge = {
    id, fromUid: user.uid, fromUsername: profile.username,
    toUid: target.uid, toUsername: target.username,
    status: 'pending', createdAt: Date.now(),
  }
  await update(ref(realtime), {
    [`challengeInbox/${target.uid}/${id}`]: challenge,
    [`challengeOutbox/${user.uid}/${id}`]: challenge,
  })
  return id
}

export function subscribeInbox(uid: string, cb: (items: Challenge[]) => void): Unsubscribe {
  return onValue(ref(realtime, `challengeInbox/${uid}`), (snap) => {
    const raw = snap.val() ?? {}
    cb(Object.values(raw).filter((x): x is Challenge => Boolean(x && typeof x === 'object')).sort((a, b) => b.createdAt - a.createdAt))
  })
}

export function subscribeOutbox(uid: string, cb: (items: Challenge[]) => void): Unsubscribe {
  return onValue(ref(realtime, `challengeOutbox/${uid}`), (snap) => {
    const raw = snap.val() ?? {}
    cb(Object.values(raw).filter((x): x is Challenge => Boolean(x && typeof x === 'object')).sort((a, b) => b.createdAt - a.createdAt))
  })
}

export async function respondChallenge(challenge: Challenge, accept: boolean, user: User, profile: UserProfile) {
  if (challenge.toUid !== user.uid) throw new Error('This challenge is not for you.')
  if (!accept) {
    await update(ref(realtime), {
      [`challengeInbox/${user.uid}/${challenge.id}/status`]: 'declined',
      [`challengeOutbox/${challenge.fromUid}/${challenge.id}/status`]: 'declined',
    })
    return null
  }
  const gameId = push(ref(realtime, 'games')).key!
  const updated: Partial<Challenge> = { status: 'accepted', gameId }
  await update(ref(realtime), {
    [`challengeInbox/${user.uid}/${challenge.id}/status`]: updated.status,
    [`challengeInbox/${user.uid}/${challenge.id}/gameId`]: gameId,
    [`challengeOutbox/${challenge.fromUid}/${challenge.id}/status`]: updated.status,
    [`challengeOutbox/${challenge.fromUid}/${challenge.id}/gameId`]: gameId,
  })
  const me = playerInfo(user, profile)
  const other: PlayerInfo = { uid: challenge.fromUid, username: challenge.fromUsername, guest: false }
  await ensureGame(gameId, me, other, 'friend')
  return gameId
}

export function subscribeGame(gameId: string, cb: (game: LiveGame | null) => void): Unsubscribe {
  return onValue(ref(realtime, `games/${gameId}`), (snap) => cb(snap.exists() ? snap.val() as LiveGame : null))
}

function outcome(game: Chess): { status: LiveGame['status']; reason: string } | null {
  if (game.isCheckmate()) return { status: game.turn() === 'w' ? 'black_win' : 'white_win', reason: 'checkmate' }
  if (game.isDraw()) return { status: 'draw', reason: game.isStalemate() ? 'stalemate' : 'draw' }
  return null
}

export async function makeMultiplayerMove(gameId: string, uid: string, from: string, to: string, promotion = 'q') {
  const gameRef = ref(realtime, `games/${gameId}`)
  const moveId = push(ref(realtime, `games/${gameId}/moves`)).key!
  let committedLog: MoveLog | null = null

  const tx = await runTransaction(gameRef, (current: LiveGame | null) => {
    if (!current || current.status !== 'active') return
    const color: PlayerColor | null = current.white.uid === uid ? 'w' : current.black.uid === uid ? 'b' : null
    if (!color || current.turn !== color) return

    const chess = new Chess(current.fen)
    let move
    try { move = chess.move({ from, to, promotion }) } catch { return }
    if (!move) return

    const now = Date.now()
    const elapsed = Math.max(0, Math.min(60_000, now - current.lastMoveAt))
    const whiteMs = color === 'w' ? Math.max(0, current.whiteMs - elapsed) : current.whiteMs
    const blackMs = color === 'b' ? Math.max(0, current.blackMs - elapsed) : current.blackMs
    let status = current.status
    let reason = current.resultReason
    if ((color === 'w' && whiteMs <= 0) || (color === 'b' && blackMs <= 0)) {
      status = color === 'w' ? 'black_win' : 'white_win'
      reason = 'timeout'
    } else {
      const end = outcome(chess)
      if (end) { status = end.status; reason = end.reason }
    }

    const log: MoveLog = {
      id: moveId, ply: current.moveNumber + 1, san: move.san, from: move.from, to: move.to,
      promotion: move.promotion, fen: chess.fen(), byUid: uid, movedAt: now, thinkMs: elapsed,
      whiteMs, blackMs,
    }
    committedLog = log
    return {
      ...current, status, resultReason: reason, updatedAt: now, lastMoveAt: now,
      fen: chess.fen(), turn: chess.turn(), moveNumber: current.moveNumber + 1,
      whiteMs, blackMs, moves: { ...(current.moves ?? {}), [moveId]: log },
    }
  })

  if (!tx.committed || !committedLog) throw new Error('Move rejected. The position may have changed.')
  const finalGame = tx.snapshot.val() as LiveGame
  await setDoc(doc(firestore, 'gameLogs', gameId, 'moves', moveId), committedLog)
  await setDoc(doc(firestore, 'gameLogs', gameId), {
    status: finalGame.status, resultReason: finalGame.resultReason ?? null,
    updatedAt: finalGame.updatedAt, finalFen: finalGame.fen,
  }, { merge: true })
  return committedLog
}

export async function claimTimeout(gameId: string, uid: string) {
  const gameRef = ref(realtime, `games/${gameId}`)
  await runTransaction(gameRef, (current: LiveGame | null) => {
    if (!current || current.status !== 'active') return current
    if (uid !== current.white.uid && uid !== current.black.uid) return
    const now = Date.now()
    const elapsed = Math.max(0, now - current.lastMoveAt)
    const remaining = current.turn === 'w' ? current.whiteMs - elapsed : current.blackMs - elapsed
    if (remaining > 0) return current
    return {
      ...current,
      whiteMs: current.turn === 'w' ? 0 : current.whiteMs,
      blackMs: current.turn === 'b' ? 0 : current.blackMs,
      status: current.turn === 'w' ? 'black_win' : 'white_win',
      resultReason: 'timeout',
      updatedAt: now,
    }
  })
}

export async function resignGame(gameId: string, uid: string) {
  const gameRef = ref(realtime, `games/${gameId}`)
  await runTransaction(gameRef, (current: LiveGame | null) => {
    if (!current || current.status !== 'active') return current
    if (uid !== current.white.uid && uid !== current.black.uid) return
    return {
      ...current,
      status: uid === current.white.uid ? 'black_win' : 'white_win',
      resultReason: 'resignation', updatedAt: Date.now(),
    }
  })
}

export async function getGameOnce(gameId: string) {
  const snap = await get(ref(realtime, `games/${gameId}`))
  return snap.exists() ? snap.val() as LiveGame : null
}
