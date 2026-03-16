import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastRoomDraw, broadcastRoomUpdate } from '@/lib/room-events';
import { parseStringArrayJson, stringifyStringArray } from '@/lib/round-state';
import { getAuthenticatedSession, unauthorizedResponse } from '@/lib/session';

class DrawCardError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DrawCardError';
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
        throw new DrawCardError('房间不存在', 404);
      }

      if (room.status === 'finished') {
        throw new DrawCardError('房间已结束，无法继续抽牌', 400);
      }

      if (room.gameType !== 'poker_rounds') {
        throw new DrawCardError('当前房型不支持抽牌', 400);
      }

      if (!room.members.some((member) => member.userId === session.user.id)) {
        throw new DrawCardError('你还不是该房间成员', 403);
      }

      if (room.currentRoundNumber === null) {
        throw new DrawCardError('当前还没有开始发牌', 400);
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
        throw new DrawCardError('当前轮次不存在', 404);
      }

      const participantIds = parseStringArrayJson(round.participantUserIdsJson);
      if (!participantIds.includes(session.user.id)) {
        throw new DrawCardError('你是本轮开始后加入的成员，请等待下一轮', 403);
      }

      const remainingDeck = parseStringArrayJson(round.remainingDeckJson);
      if (remainingDeck.length === 0) {
        throw new DrawCardError('本轮剩余牌堆已空', 400);
      }

      const [nextCard, ...nextRemainingDeck] = remainingDeck;
      const existingCardCount = await tx.roomRoundCard.count({
        where: {
          roundId: round.id,
          userId: session.user.id,
        },
      });

      await tx.roomRoundCard.create({
        data: {
          roundId: round.id,
          userId: session.user.id,
          cardCode: nextCard,
          dealtOrder: existingCardCount,
        },
      });

      await tx.roomRound.update({
        where: { id: round.id },
        data: {
          remainingDeckJson: stringifyStringArray(nextRemainingDeck),
        },
      });

      await tx.room.update({
        where: { id: room.id },
        data: {
          lastActivityAt: new Date(),
        },
      });

      return {
        drawId: randomUUID(),
        roomId: room.id,
        roundNumber: round.roundNumber,
        toUserId: session.user.id,
      };
    });

    broadcastRoomDraw(result);
    broadcastRoomUpdate(result.roomId);

    return NextResponse.json({
      success: true,
      drawId: result.drawId,
      roundNumber: result.roundNumber,
    });
  } catch (err) {
    if (err instanceof DrawCardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error('Draw card error:', err);
    return NextResponse.json(
      { error: '抽牌失败，请重试' },
      { status: 500 }
    );
  }
}
