import { NextRequest, NextResponse } from 'next/server';
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
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const pointsNum = Number(points);
    if (pointsNum <= 0) {
      return NextResponse.json(
        { error: '分数必须大于 0' },
        { status: 400 }
      );
    }

    if (session.user.id === toUserId) {
      return NextResponse.json(
        { error: '不能给自己打分' },
        { status: 400 }
      );
    }

    // 检查房间状态
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    if (room.status === 'finished') {
      return NextResponse.json({ error: '房间已结束，无法继续打分' }, { status: 400 });
    }

    const memberIds = new Set(room.members.map((member) => member.userId));
    if (!memberIds.has(session.user.id) || !memberIds.has(toUserId)) {
      return NextResponse.json(
        { error: '只能给房间内成员打分' },
        { status: 403 }
      );
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

    return NextResponse.json({
      score: {
        id: score.id,
        roomId: score.roomId,
        fromUserId: score.fromUserId,
        toUserId: score.toUserId,
        points: score.points,
        timestamp: score.timestamp.getTime(),
      },
    });
  } catch (err) {
    console.error('Add score error:', err);
    return NextResponse.json(
      { error: '添加分数失败' },
      { status: 500 }
    );
  }
}
