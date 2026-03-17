import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
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

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!room) {
      return errorResponse('房间不存在', 404);
    }

    if (!room.members.some((member) => member.userId === session.user.id)) {
      return errorResponse('你无权结束该房间', 403);
    }

    if (room.status === 'finished') {
      return errorResponse('房间已结束', 400);
    }

    await prisma.room.update({
      where: { id },
      data: {
        status: 'finished',
        lastActivityAt: new Date(),
      },
    });

    broadcastRoomUpdate(id);

    return successResponse({ success: true }, '结束房间成功');
  } catch (err) {
    console.error('Finish room error:', err);
    return errorResponse('结束房间失败', 500);
  }
}
