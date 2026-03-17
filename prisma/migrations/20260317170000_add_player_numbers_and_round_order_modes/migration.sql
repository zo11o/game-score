PRAGMA foreign_keys=OFF;

ALTER TABLE "Room" ADD COLUMN "roundOrderMode" TEXT NOT NULL DEFAULT 'rotate_by_player_number';

ALTER TABLE "RoomRound" ADD COLUMN "turnOrderUserIdsJson" TEXT NOT NULL DEFAULT '[]';

UPDATE "RoomRound"
SET "turnOrderUserIdsJson" = COALESCE("participantUserIdsJson", '[]')
WHERE "turnOrderUserIdsJson" = '[]';

CREATE TABLE "new_RoomMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerNumber" INTEGER NOT NULL,
    CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_RoomMember" ("id", "roomId", "userId", "playerNumber")
SELECT
    "id",
    "roomId",
    "userId",
    ROW_NUMBER() OVER (PARTITION BY "roomId" ORDER BY "id" ASC) AS "playerNumber"
FROM "RoomMember";

DROP TABLE "RoomMember";
ALTER TABLE "new_RoomMember" RENAME TO "RoomMember";

CREATE UNIQUE INDEX "RoomMember_roomId_userId_key" ON "RoomMember"("roomId", "userId");
CREATE UNIQUE INDEX "RoomMember_roomId_playerNumber_key" ON "RoomMember"("roomId", "playerNumber");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
