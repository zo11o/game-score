import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastRoomUpdate } from '@/lib/room-events';
import { parseStringArrayJson } from '@/lib/round-state';
import { getAuthenticatedSession, unauthorizedResponse } from '@/lib/session';

class ToggleCardError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ToggleCardError';
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
    const { cardCode } = (await request.json()) as { cardCode?: string };

    if (!cardCode) {
      return NextResponse.json(
        { error: '缺少要翻面的牌' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { id },
        include: {
          members: true,
        },
      });

      if (!room) {
        throw new ToggleCardError('房间不存在', 404);
      }

      if (room.status === 'finished') {
        throw new ToggleCardError('房间已结束，无法继续翻牌', 400);
      }

      if (room.gameType !== 'poker_rounds') {
        throw new ToggleCardError('当前房型不支持翻牌', 400);
      }

      if (!room.members.some((member) => member.userId === session.user.id)) {
        throw new ToggleCardError('你还不是该房间成员', 403);
      }

      if (room.currentRoundNumber === null) {
        throw new ToggleCardError('当前还没有开始发牌', 400);
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
        throw new ToggleCardError('当前轮次不存在', 404);
      }

      const participantIds = parseStringArrayJson(round.participantUserIdsJson);
      if (!participantIds.includes(session.user.id)) {
        throw new ToggleCardError('你是本轮开始后加入的成员，当前轮无法翻牌', 403);
      }

      const targetCard = await tx.roomRoundCard.findFirst({
        where: {
          roundId: round.id,
          userId: session.user.id,
          cardCode,
        },
      });

      if (!targetCard) {
        throw new ToggleCardError('这张牌不属于你当前轮的手牌', 404);
      }

      const updatedCard = await tx.roomRoundCard.update({
        where: { id: targetCard.id },
        data: {
          isFaceUp: !targetCard.isFaceUp,
        },
      });

      await tx.room.update({
        where: { id: room.id },
        data: {
          lastActivityAt: new Date(),
        },
      });

      return {
        roomId: room.id,
        isFaceUp: updatedCard.isFaceUp,
      };
    });

    broadcastRoomUpdate(result.roomId);

    return NextResponse.json({
      success: true,
      isFaceUp: result.isFaceUp,
    });
  } catch (err) {
    if (err instanceof ToggleCardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error('Toggle card visibility error:', err);
    return NextResponse.json(
      { error: '翻牌失败，请重试' },
      { status: 500 }
    );
  }
}
