import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    const scoreRecords = await prisma.score.findMany({
      where: { roomId: id },
      include: {
        from: { select: { id: true, name: true, avatar: true, email: true } },
        to: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    // 分数 = 收到的 - 给出的（转移制：给出去就扣减自己的）
    const userScores: Record<string, number> = {};
    scoreRecords.forEach((s) => {
      userScores[s.toUserId] = (userScores[s.toUserId] || 0) + s.points;
      userScores[s.fromUserId] = (userScores[s.fromUserId] || 0) - s.points;
    });

    const records = scoreRecords.map((s) => ({
      id: s.id,
      fromUserId: s.fromUserId,
      fromName: s.from.email === 'system@game-score.local' ? '系统' : s.from.name,
      fromAvatar: s.from.avatar,
      toUserId: s.toUserId,
      toName: s.to.name,
      toAvatar: s.to.avatar,
      points: s.points,
      timestamp: s.timestamp.getTime(),
    }));

    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        password: room.password,
        createdAt: room.createdAt.getTime(),
        users: room.members.map((m) => m.userId),
      },
      users: room.members.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        avatar: m.user.avatar,
      })),
      scores: userScores,
      records,
    });
  } catch (err) {
    console.error('Get room error:', err);
    return NextResponse.json(
      { error: '获取房间失败' },
      { status: 500 }
    );
  }
}
