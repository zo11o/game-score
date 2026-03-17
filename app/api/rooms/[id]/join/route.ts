import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { getOrCreateSystemUser, INITIAL_SCORE } from '@/lib/system-user';
import { broadcastRoomUpdate } from '@/lib/room-events';
import { getAuthenticatedSession, unauthorizedResponse } from '@/lib/session';

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
    const { password } = await request.json();

    const room = await prisma.room.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!room) {
      return errorResponse('房间不存在', 404);
    }

    if (room.status === 'finished') {
      return errorResponse('房间已结束，无法加入', 400);
    }

    const alreadyJoined = room.members.some((m) => m.userId === session.user.id);
    if (alreadyJoined) {
      return successResponse({ joined: true }, '已在房间中');
    }

    if (!password) {
      return errorResponse('密码不能为空', 400);
    }

    if (room.password !== password) {
      return errorResponse('密码错误', 400);
    }

    const systemUser = await getOrCreateSystemUser();
    await prisma.$transaction(async (tx) => {
      const latestMember = await tx.roomMember.findFirst({
        where: { roomId: id },
        orderBy: { playerNumber: 'desc' },
        select: { playerNumber: true },
      });

      await tx.roomMember.create({
        data: {
          roomId: id,
          userId: session.user.id,
          playerNumber: (latestMember?.playerNumber ?? 0) + 1,
        },
      });

      await tx.score.create({
        data: {
          roomId: id,
          fromUserId: systemUser.id,
          toUserId: session.user.id,
          points: INITIAL_SCORE,
        },
      });

      await tx.room.update({
        where: { id },
        data: {
          lastActivityAt: new Date(),
        },
      });
    });

    broadcastRoomUpdate(id);

    return successResponse({ joined: true }, '加入房间成功');
  } catch (err) {
    console.error('Join room error:', err);
    return errorResponse('加入房间失败', 500);
  }
}
