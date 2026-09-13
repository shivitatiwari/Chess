# Apoorv's Chess

A responsive React + Firebase chess app built for Cloudflare Pages.

## Features

- Single-player chess with **5 bot levels**.
- Random realtime multiplayer for signed-in users and guests.
- Email/password and Google account sign-in with unique usernames.
- Username-based friend challenges (permanent accounts only).
- Live spectator URLs (`/spectate/:gameId`) that require no account.
- Per-move logs containing SAN, origin/destination, FEN, player, move time and both clocks.
- Realtime game rooms in Firebase Realtime Database and durable game archives in Firestore.
- Responsive board with click-to-move and drag/drop.
- 10-minute multiplayer clocks, checkmate/draw detection and resignation.

## Stack

- React + TypeScript + Vite
- `chess.js` for legal move generation and game rules
- Firebase Auth (Email/Password, Google, Anonymous guest sessions)
- Firebase Realtime Database for live games, matchmaking and challenges
- Firestore for user/username records and game log archives
- Cloudflare Pages for hosting

## Firebase setup

1. Create a Firebase project.
2. In **Authentication → Sign-in method**, enable Email/Password, Google and Anonymous. Anonymous Auth is used only to let a visitor enter random matchmaking without a signup flow.
3. Create Firestore and Realtime Database.
4. Copy `.env.example` to `.env.local` and fill all `VITE_FIREBASE_*` values.
5. Install Firebase CLI and deploy the included rules:

```bash
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules,database
```

## Local development

```bash
npm install
npm run dev
```

Production check:

```bash
npm run typecheck
npm run build
```

## Cloudflare Pages

Connect `shivitatiwari/Chess` to Cloudflare Pages with:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`

Add every variable from `.env.example` to **Settings → Environment variables** for Production and Preview.

For SPA routing, add a Pages redirect rule if your Pages project does not already fall back to `index.html`:

Create `public/_redirects` containing `/* /index.html 200` (already included in this repository).

## Data model

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Security note

Firebase rules restrict live game writes to the two seats and friend challenge data to the involved users. Chess legality is enforced in the client with `chess.js`; if the app becomes competitive/rated, move validation should be moved to an authoritative Cloudflare Worker/Durable Object before enabling ratings or prizes.
