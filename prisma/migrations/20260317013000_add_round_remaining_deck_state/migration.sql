ALTER TABLE "RoomRound" ADD COLUMN "remainingDeckJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "RoomRound" ADD COLUMN "participantUserIdsJson" TEXT NOT NULL DEFAULT '[]';
