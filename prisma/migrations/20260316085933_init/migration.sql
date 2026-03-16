-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RoomMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Score_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Score_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Score_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMember_roomId_userId_key" ON "RoomMember"("roomId", "userId");
