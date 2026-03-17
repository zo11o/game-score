ALTER TABLE "RoomRound" ADD COLUMN "lookedUserIdsJson" TEXT NOT NULL DEFAULT '[]';

UPDATE "RoomRound"
SET "lookedUserIdsJson" = COALESCE("participantUserIdsJson", '[]')
WHERE "lookedUserIdsJson" = '[]';
