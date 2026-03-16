import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateSystemUser, INITIAL_SCORE } from '@/lib/system-user';

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        members: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      rooms.map((r) => ({
        id: r.id,
        name: r.name,
        password: r.password,
        createdAt: r.createdAt.getTime(),
        users: r.members.map((m) => m.userId),
      }))
    );
  } catch (err) {
    console.error('Get rooms error:', err);
    return NextResponse.json(
      { error: '获取房间列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, password, userId } = await request.json();

    if (!name || !password || !userId) {
      return NextResponse.json(
        { error: '房间名称、密码和用户ID不能为空' },
        { status: 400 }
      );
    }

    const room = await prisma.room.create({
      data: {
        name,
        password,
        members: {
          create: { userId },
        },
      },
    });

    const systemUser = await getOrCreateSystemUser();
    await prisma.score.create({
      data: {
        roomId: room.id,
        fromUserId: systemUser.id,
        toUserId: userId,
        points: INITIAL_SCORE,
      },
    });

    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        password: room.password,
        createdAt: room.createdAt.getTime(),
        users: [userId],
      },
    });
  } catch (err) {
    console.error('Create room error:', err);
    return NextResponse.json(
      { error: '创建房间失败' },
      { status: 500 }
    );
  }
}
