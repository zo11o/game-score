ALTER TABLE "Room" ADD COLUMN "gameType" TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE "Room" ADD COLUMN "currentRoundNumber" INTEGER;

CREATE TABLE "Session" (
  "token" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RoomRound" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "roundNumber" INTEGER NOT NULL,
  "startedByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoomRound_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RoomRound_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RoomRoundCard" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roundId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "cardCode" TEXT NOT NULL,
  "dealtOrder" INTEGER NOT NULL,
  CONSTRAINT "RoomRoundCard_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "RoomRound" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RoomRoundCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX "RoomRound_roomId_roundNumber_key" ON "RoomRound"("roomId", "roundNumber");
CREATE INDEX "RoomRound_roomId_idx" ON "RoomRound"("roomId");
CREATE UNIQUE INDEX "RoomRoundCard_roundId_cardCode_key" ON "RoomRoundCard"("roundId", "cardCode");
CREATE INDEX "RoomRoundCard_roundId_userId_dealtOrder_idx" ON "RoomRoundCard"("roundId", "userId", "dealtOrder");
