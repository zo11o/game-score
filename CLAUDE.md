# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A real-time multiplayer game scoring application with Retro-Futurism design. Users can create/join rooms, give scores to each other, and play poker rounds with card dealing mechanics. Built with Next.js 16 (App Router), TypeScript, Prisma + SQLite, and Socket.IO for real-time synchronization.

## Development Commands

```bash
# Install dependencies
npm install

# Development (REQUIRED for WebSocket support)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm lint

# Database operations
npx prisma generate          # Generate Prisma client
npx prisma migrate deploy    # Apply migrations
npx prisma migrate dev       # Create new migration
npx prisma studio            # Open database GUI
```

## Critical Architecture Notes

### Custom Server with WebSocket

**IMPORTANT**: This app uses a custom Node.js server (`server.js`) that integrates Next.js with Socket.IO for real-time features. Always use `npm run dev` or `npm start` - never use `next dev` or `next start` directly, as WebSocket functionality will not work.

The server:
- Auto-runs `prisma generate` and `prisma migrate deploy` on startup
- Exposes Socket.IO on the same port as Next.js (default 3000)
- Stores the Socket.IO instance in `global.__SOCKET_IO__` for API routes to access

### Real-Time Broadcasting Pattern

API routes broadcast updates via `lib/room-events.ts`:
- `broadcastRoomUpdate(roomId)` - triggers clients to refetch room data
- `broadcastRoomDraw(event)` - notifies specific user about card draw

Client components use `lib/use-room-socket.ts` hook to:
- Join room channels on mount
- Listen for `room-update` and `room-draw` events
- Auto-refetch data when events arrive

### Session-Based Authentication

Uses cookie-based sessions (not JWT). Session management in `lib/session.ts`:
- `createSession(userId)` - creates session token and DB record
- `getAuthenticatedSession(request)` - validates session from cookie
- `applySessionCookie(response, session)` - sets HTTP-only cookie
- `unauthorizedResponse()` - returns 401 with cleared cookie

All protected API routes must call `getAuthenticatedSession()` first.

### Database Schema (Prisma + SQLite)

Key models in `prisma/schema.prisma`:
- **User**: email (unique), passwordHash, name, avatar
- **Room**: name, password, status (active/finished), roomNumber (unique), creatorId, gameType (classic/poker_rounds), currentRoundNumber
- **RoomMember**: junction table for room membership
- **Session**: token (PK), userId, expiresAt
- **Score**: fromUserId, toUserId, points, timestamp
- **RoomRound**: roundNumber, remainingDeckJson, participantUserIdsJson
- **RoomRoundCard**: userId, cardCode, dealtOrder

Database file location: `prisma/dev.db` (relative to prisma directory due to schema location)

### Game Types

Two game modes defined in `lib/types.ts`:
1. **classic** - simple score giving between users
2. **poker_rounds** - card dealing with 54-card deck (52 cards + 2 jokers)

Poker rounds use `lib/cards.ts` for deck management:
- `FULL_DECK_CODES` - array of 54 card codes (e.g., "AS", "10H", "BJ", "RJ")
- `shuffleDeck()` - cryptographically secure shuffle using `randomInt`
- `serializeCard()` - converts card code to PlayingCard object with suit/rank/label

### API Route Structure

All routes return JSON. Common patterns:
- Auth routes: `/api/auth/{login,register,logout}`
- Room CRUD: `/api/rooms` (GET/POST), `/api/rooms/[id]` (GET)
- Room actions: `/api/rooms/[id]/{join,finish}` (POST)
- Poker rounds: `/api/rooms/[id]/rounds` (POST), `/api/rooms/[id]/rounds/draw` (POST)
- Scores: `/api/scores` (POST)
- User history: `/api/users/[id]/history` (GET)

Response format for room details (`lib/room-response.ts`):
```typescript
{
  room: Room,
  users: User[],
  scores: Record<userId, totalPoints>,
  records: ScoreRecord[],
  currentRound: CurrentRound | null
}
```

### Testing Setup

Uses Vitest with jsdom environment. Config in `vitest.config.mts`:
- Path alias `@/` points to project root
- Setup file: `vitest.setup.ts` (configures Testing Library)
- Run with `NODE_OPTIONS=--experimental-require-module` flag

Test files in `__tests__/` mirror app structure:
- `__tests__/lib/` - utility/type tests
- `__tests__/app/` - page component tests

### Type System

Shared types in `lib/types.ts` match API response shapes exactly. Key types:
- `User`, `Room`, `Score` - core domain models
- `GameType` - 'classic' | 'poker_rounds'
- `RoomDetailsResponse` - complete room state
- `PlayingCard`, `RoundHand`, `CurrentRound` - poker game state
- `RoomDrawEvent` - WebSocket event payload

### Environment Variables

Required in `.env`:
```
DATABASE_URL="file:./dev.db"
```

Optional:
```
NODE_ENV=production
HOSTNAME=localhost
PORT=3000
```

## Code Conventions

- Use TypeScript strict mode
- Prisma client imported from `@/lib/prisma`
- Password hashing uses bcrypt (10 rounds) via `@/lib/auth`
- All timestamps stored as DateTime in DB, converted to Unix ms in API responses
- Card codes format: rank + suit code (e.g., "AS" = Ace of Spades, "10H" = 10 of Hearts)
- Room numbers are auto-incremented unique integers for user-friendly display
- WebSocket room channels named as `room:${roomId}`

## Common Pitfalls

- Don't use `next dev` - WebSocket won't work without custom server
- Don't forget to call `broadcastRoomUpdate()` after mutating room state
- Session cookies are HTTP-only - client can't read them directly
- Prisma migrations must be applied before server starts (handled automatically)
- Card dealing requires checking `gameType === 'poker_rounds'`
- Room status must be 'active' for most operations (check before mutations)
