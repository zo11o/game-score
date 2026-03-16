/*
  Warnings:

  - Added the required column `creatorId` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomNumber` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "roomNumber" INTEGER NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Room_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrate existing rooms: set creatorId to first member's userId, assign sequential room numbers
INSERT INTO "new_Room" ("id", "name", "password", "status", "createdAt", "lastActivityAt", "roomNumber", "creatorId")
SELECT
    r."id",
    r."name",
    r."password",
    r."status",
    r."createdAt",
    r."lastActivityAt",
    ROW_NUMBER() OVER (ORDER BY r."createdAt") as "roomNumber",
    COALESCE(
        (SELECT rm."userId" FROM "RoomMember" rm WHERE rm."roomId" = r."id" LIMIT 1),
        (SELECT u."id" FROM "User" u LIMIT 1)
    ) as "creatorId"
FROM "Room" r;

DROP TABLE "Room";
ALTER TABLE "new_Room" RENAME TO "Room";
CREATE UNIQUE INDEX "Room_roomNumber_key" ON "Room"("roomNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
