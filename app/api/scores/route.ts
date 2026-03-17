import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { broadcastRoomUpdate } from '@/lib/room-events';
import { getAuthenticatedSession, unauthorizedResponse } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return unauthorizedResponse();
    }

    const { roomId, toUserId, points } = await request.json();

    if (!roomId || !toUserId || points == null) {
      return errorResponse('缺少必要参数', 400);
    }

    const pointsNum = Number(points);
    if (pointsNum <= 0) {
      return errorResponse('分数必须大于 0', 400);
    }

    if (session.user.id === toUserId) {
      return errorResponse('不能给自己打分', 400);
    }

    // 检查房间状态
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: true,
      },
    });

    if (!room) {
      return errorResponse('房间不存在', 404);
    }

    if (room.status === 'finished') {
      return errorResponse('房间已结束，无法继续打分', 400);
    }

    const memberIds = new Set(room.members.map((member) => member.userId));
    if (!memberIds.has(session.user.id) || !memberIds.has(toUserId)) {
      return errorResponse('只能给房间内成员打分', 403);
    }

    // 创建分数记录并更新房间最后活动时间
    const score = await prisma.score.create({
      data: {
        roomId,
        fromUserId: session.user.id,
        toUserId,
        points: pointsNum,
      },
    });

    await prisma.room.update({
      where: { id: roomId },
      data: {
        lastActivityAt: new Date(),
      },
    });

    broadcastRoomUpdate(roomId);

    return successResponse({
      score: {
        id: score.id,
        roomId: score.roomId,
        fromUserId: score.fromUserId,
        toUserId: score.toUserId,
        points: score.points,
        timestamp: score.timestamp.getTime(),
      },
    }, '添加分数成功');
  } catch (err) {
    console.error('Add score error:', err);
    return errorResponse('添加分数失败', 500);
  }
}
