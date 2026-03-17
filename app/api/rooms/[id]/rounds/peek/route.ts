import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseStringArrayJson, stringifyStringArray } from '@/lib/round-state';
import { broadcastRoomUpdate } from '@/lib/room-events';
import { getAuthenticatedSession, unauthorizedResponse } from '@/lib/session';

class PeekHandError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PeekHandError';
    this.status = status;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { id },
        include: {
          members: true,
        },
      });

      if (!room) {
        throw new PeekHandError('房间不存在', 404);
      }

      if (room.status === 'finished') {
        throw new PeekHandError('房间已结束，无法继续看牌', 400);
      }

      if (room.gameType !== 'poker_rounds') {
        throw new PeekHandError('当前房型不支持看牌', 400);
      }

      if (!room.members.some((member) => member.userId === session.user.id)) {
        throw new PeekHandError('你还不是该房间成员', 403);
      }

      if (room.currentRoundNumber === null) {
        throw new PeekHandError('当前还没有开始发牌', 400);
      }

      const round = await tx.roomRound.findUnique({
        where: {
          roomId_roundNumber: {
            roomId: room.id,
            roundNumber: room.currentRoundNumber,
          },
        },
      });

      if (!round) {
        throw new PeekHandError('当前轮次不存在', 404);
      }

      const participantIds = parseStringArrayJson(round.participantUserIdsJson);
      if (!participantIds.includes(session.user.id)) {
        throw new PeekHandError('你是本轮开始后加入的成员，当前轮无法看牌', 403);
      }

      const lookedUserIds = parseStringArrayJson(round.lookedUserIdsJson);
      if (!lookedUserIds.includes(session.user.id)) {
        await tx.roomRound.update({
          where: { id: round.id },
          data: {
            lookedUserIdsJson: stringifyStringArray([...lookedUserIds, session.user.id]),
          },
        });
      }

      await tx.room.update({
        where: { id: room.id },
        data: {
          lastActivityAt: new Date(),
        },
      });

      return {
        roomId: room.id,
        roundNumber: round.roundNumber,
      };
    });

    broadcastRoomUpdate(result.roomId);

    return NextResponse.json({
      success: true,
      roundNumber: result.roundNumber,
    });
  } catch (err) {
    if (err instanceof PeekHandError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error('Peek hand error:', err);
    return NextResponse.json(
      { error: '看牌失败，请重试' },
      { status: 500 }
    );
  }
}
