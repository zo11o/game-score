import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateSystemUser, INITIAL_SCORE } from '@/lib/system-user';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, password } = await request.json();

    if (!userId || !password) {
      return NextResponse.json(
        { error: '用户ID和密码不能为空' },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!room) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    if (room.password !== password) {
      return NextResponse.json({ error: '密码错误' }, { status: 400 });
    }

    const alreadyJoined = room.members.some((m) => m.userId === userId);
    if (alreadyJoined) {
      return NextResponse.json({ joined: true });
    }

    await prisma.roomMember.create({
      data: { roomId: id, userId },
    });

    const systemUser = await getOrCreateSystemUser();
    await prisma.score.create({
      data: {
        roomId: id,
        fromUserId: systemUser.id,
        toUserId: userId,
        points: INITIAL_SCORE,
      },
    });

    return NextResponse.json({ joined: true });
  } catch (err) {
    console.error('Join room error:', err);
    return NextResponse.json(
      { error: '加入房间失败' },
      { status: 500 }
    );
  }
}
