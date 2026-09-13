# Apoorv's Chess — architecture

## Core flows

### Guest random match

1. Visitor presses **Random match**.
2. Firebase Anonymous Auth silently creates a guest identity; no signup UI is shown.
3. The identity enters `matchmaking/standard` in Realtime Database.
4. A transaction pairs two waiting identities and assigns one `gameId` and randomized colors.
5. Both clients subscribe only to `games/{gameId}`.

### Signed-in random match

Same flow, but the persistent user's chosen username is displayed instead of a generated guest name.

### Friend challenge

1. Permanent account searches the exact username through `usernames/{usernameLower}` in Firestore.
2. Challenge is mirrored to the recipient inbox and sender outbox in RTDB.
3. Recipient accepts; a game is created and both sides receive the same `gameId`.
4. Anonymous users cannot read/write challenge inboxes/outboxes under the supplied rules.

### Spectating

`/spectate/{gameId}` attaches a read-only realtime listener to the game. The RTDB rules intentionally make game reads public but keep writes limited to the white/black authenticated UIDs.

## Live game shape

```text
games/{gameId}
  id
  mode
  status
  resultReason
  white / black
    uid
    username
    guest
  fen
  turn
  moveNumber
  whiteMs / blackMs
  lastMoveAt
  moves/{moveId}
    ply
    san
    from / to / promotion
    fen
    byUid
    movedAt
    thinkMs
    whiteMs / blackMs
```

A move uses an RTDB transaction at the game node. This prevents two browser writes from overwriting each other and ensures each game is an independent contention domain. Completed/current move logs are mirrored into Firestore under `gameLogs/{gameId}/moves/{moveId}`.

## Scaling model

Live traffic is split by `gameId`: a match subscribes to one small RTDB subtree rather than a global game feed. Spectators subscribe to that same subtree. This supports many simultaneous matches without game-to-game write contention.

The only shared contention point is `matchmaking/standard`. For high traffic, shard matchmaking by time control + rating bucket + queue shard while leaving game rooms unchanged.

## Bot levels

- Level 1: random legal move.
- Level 2: capture-biased move selection with noise.
- Level 3: one-ply evaluation.
- Level 4: two-ply alpha-beta minimax.
- Level 5: three-ply alpha-beta minimax with capture ordering.

The bot runs entirely in the browser, so it does not consume backend capacity.

## Production hardening path

For casual chess, the included Firebase approach is functional. For rated chess, money, tournaments or anti-cheat requirements, move validation and clocks should become server-authoritative. The clean migration is a Cloudflare Worker + Durable Object per game that validates moves with `chess.js`, then mirrors the authoritative state/logs to Firebase for history and spectators.
